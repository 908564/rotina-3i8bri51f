import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import pb from '@/lib/pocketbase/client'
import { syncEngine } from '@/lib/sync/syncEngine'
import { SyncMetaState } from '@/lib/types'

export interface UserProfile {
  id: string
  email: string
  name: string
  verified: boolean
}

export interface AuthContextType {
  user: UserProfile | null
  isLoading: boolean
  syncMeta: SyncMetaState
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signUp: (
    email: string,
    password: string,
    name?: string,
  ) => Promise<{
    error: any
    errorCode?:
      | 'invite_required'
      | 'email_exists'
      | 'weak_password'
      | 'rate_limit'
      | 'network_error'
      | 'other'
    fieldErrors?: Record<string, string>
    verificationSent?: boolean
  }>
  signOut: (options?: { keepLocalData?: boolean }) => Promise<void>
  requestPasswordReset: (email: string) => Promise<{ error: any }>
  confirmPasswordReset: (token: string, password: string) => Promise<{ error: any }>
  requestVerification: (email: string) => Promise<{ error: any }>
  confirmVerification: (token: string) => Promise<{ error: any }>
  triggerSync: () => Promise<boolean>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    if (pb.authStore.isValid && pb.authStore.record) {
      const r = pb.authStore.record
      return {
        id: r.id,
        email: r.email,
        name: r.name || '',
        verified: Boolean(r.verified),
      }
    }
    return null
  })

  const [isLoading, setIsLoading] = useState(true)
  const [syncMeta, setSyncMeta] = useState<SyncMetaState>({
    key: 'default',
    lastPulledAt: null,
    userId: null,
    status: 'idle',
    lastSyncedAt: null,
  })

  const refreshUser = useCallback(async () => {
    if (!pb.authStore.isValid || !pb.authStore.record) {
      setUser(null)
      return
    }
    try {
      const refreshed = await pb.collection('users').authRefresh()
      const r = refreshed.record
      setUser({
        id: r.id,
        email: r.email,
        name: r.name || '',
        verified: Boolean(r.verified),
      })
    } catch (_) {
      // 401 ou token inválido: limpa sessão sem apagar dados locais
      pb.authStore.clear()
      setUser(null)
    }
  }, [])

  useEffect(() => {
    // Sincroniza estado inicial do usuário
    if (pb.authStore.isValid && pb.authStore.record) {
      refreshUser().finally(() => setIsLoading(false))
    } else {
      setIsLoading(false)
    }

    // Escuta mudanças de authStore do PocketBase
    const unsubPb = pb.authStore.onChange((token, model) => {
      if (model && pb.authStore.isValid) {
        setUser({
          id: model.id,
          email: model.email,
          name: model.name || '',
          verified: Boolean(model.verified),
        })
      } else {
        setUser(null)
      }
    })

    // Escuta estado do syncEngine
    const unsubSync = syncEngine.subscribe((meta) => {
      setSyncMeta(meta)
    })

    return () => {
      unsubPb()
      unsubSync()
    }
  }, [refreshUser])

  // Dispara sincronização debounced quando o usuário estiver autenticado e verificado
  useEffect(() => {
    if (user && user.verified) {
      syncEngine.triggerDebouncedSync(1000)
    }
  }, [user])

  const signIn = async (email: string, password: string) => {
    try {
      const normalizedEmail = email.trim().toLowerCase()
      const authData = await pb.collection('users').authWithPassword(normalizedEmail, password)
      const r = authData.record
      const nextUser: UserProfile = {
        id: r.id,
        email: r.email,
        name: r.name || '',
        verified: Boolean(r.verified),
      }
      setUser(nextUser)
      if (nextUser.verified) {
        syncEngine.triggerDebouncedSync(1000)
      }
      return { error: null }
    } catch (error: any) {
      return { error }
    }
  }

  const signUp = async (
    email: string,
    password: string,
    name = '',
  ): Promise<{
    error: any
    errorCode?:
      | 'invite_required'
      | 'email_exists'
      | 'weak_password'
      | 'rate_limit'
      | 'network_error'
      | 'other'
    fieldErrors?: Record<string, string>
    verificationSent?: boolean
  }> => {
    const normalizedEmail = email.trim().toLowerCase()
    let verificationSent = false

    try {
      // 1. Cria usuário
      await pb.collection('users').create({
        email: normalizedEmail,
        password,
        passwordConfirm: password,
        name: name.trim(),
      })

      // 2. Dispara e-mail de verificação (propagando sucesso/falha sem perder a conta criada)
      try {
        await pb.collection('users').requestVerification(normalizedEmail)
        verificationSent = true
      } catch {
        verificationSent = false
      }

      // 3. Realiza login
      try {
        const authData = await pb.collection('users').authWithPassword(normalizedEmail, password)
        const r = authData.record
        setUser({
          id: r.id,
          email: r.email,
          name: r.name || '',
          verified: Boolean(r.verified),
        })
      } catch {
        /* se login automático falhar, a conta continua criada */
      }

      return { error: null, verificationSent }
    } catch (error: any) {
      // Classificação precisa do erro do PocketBase
      const status = error?.status || 0
      const data = error?.response?.data || error?.data || {}
      const msg = error?.message || ''
      const rawData = JSON.stringify(data)

      const fieldErrors: Record<string, string> = {}
      if (typeof data === 'object' && data !== null) {
        for (const [key, val] of Object.entries(data)) {
          if (val && typeof val === 'object' && 'message' in val) {
            fieldErrors[key] = String((val as any).message)
          } else if (typeof val === 'string') {
            fieldErrors[key] = val
          }
        }
      }

      // 1. invite_required (403 ou código de convite)
      const isInvite =
        status === 403 ||
        data?.invite?.code === 'invite_required' ||
        /invite/i.test(rawData) ||
        /convidado/i.test(msg) ||
        /invite_required/i.test(msg)

      if (isInvite) {
        return {
          error,
          errorCode: 'invite_required',
          fieldErrors: {
            email: 'Cadastro disponível apenas para convidados no momento.',
            ...fieldErrors,
          },
          verificationSent: false,
        }
      }

      // 2. Limite de requisições (429)
      if (status === 429 || /too many/i.test(msg)) {
        return {
          error,
          errorCode: 'rate_limit',
          fieldErrors,
          verificationSent: false,
        }
      }

      // 3. Sem conexão (rede / offline)
      if (
        status === 0 ||
        error?.name === 'TypeError' ||
        /network|failed to fetch|offline|connection/i.test(msg)
      ) {
        return {
          error,
          errorCode: 'network_error',
          fieldErrors,
          verificationSent: false,
        }
      }

      // 4. E-mail já cadastrado
      const emailFieldMsg = data?.email?.message || ''
      const emailFieldCode = data?.email?.code || ''
      if (
        emailFieldCode === 'validation_not_unique' ||
        /already|unique|existe|cadastrado|taken/i.test(emailFieldMsg) ||
        /already|unique|existe/i.test(msg)
      ) {
        return {
          error,
          errorCode: 'email_exists',
          fieldErrors: {
            email: 'Este e-mail já tem conta. Entre ou recupere a senha.',
            ...fieldErrors,
          },
          verificationSent: false,
        }
      }

      // 5. Senha fraca / curta / comum
      const passFieldMsg = data?.password?.message || ''
      const passFieldCode = data?.password?.code || ''
      if (
        passFieldCode.includes('min') ||
        passFieldCode.includes('length') ||
        /min|10|tamanho|curta/i.test(passFieldMsg)
      ) {
        return {
          error,
          errorCode: 'weak_password',
          fieldErrors: {
            password: 'A senha deve conter no mínimo 10 caracteres.',
            ...fieldErrors,
          },
          verificationSent: false,
        }
      }

      return {
        error,
        errorCode: 'other',
        fieldErrors,
        verificationSent: false,
      }
    }
  }

  const signOut = async (options = { keepLocalData: true }) => {
    pb.authStore.clear()
    setUser(null)
    if (!options.keepLocalData) {
      await syncEngine.resetSyncState()
    }
  }

  const requestPasswordReset = async (email: string) => {
    try {
      await pb.collection('users').requestPasswordReset(email.trim().toLowerCase())
      return { error: null }
    } catch (error: any) {
      return { error }
    }
  }

  const confirmPasswordReset = async (token: string, password: string) => {
    try {
      await pb.collection('users').confirmPasswordReset(token, password, password)
      return { error: null }
    } catch (error: any) {
      return { error }
    }
  }

  const requestVerification = async (email: string) => {
    try {
      await pb.collection('users').requestVerification(email.trim().toLowerCase())
      return { error: null }
    } catch (error: any) {
      return { error }
    }
  }

  const confirmVerification = async (token: string) => {
    try {
      await pb.collection('users').confirmVerification(token)
      await refreshUser()
      return { error: null }
    } catch (error: any) {
      return { error }
    }
  }

  const triggerSync = async () => {
    return await syncEngine.sync()
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        syncMeta,
        signIn,
        signUp,
        signOut,
        requestPasswordReset,
        confirmPasswordReset,
        requestVerification,
        confirmVerification,
        triggerSync,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
