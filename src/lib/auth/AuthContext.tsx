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
  ) => Promise<{ error: any; inviteRequired?: boolean }>
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
      const authData = await pb.collection('users').authWithPassword(email.trim(), password)
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

  const signUp = async (email: string, password: string, name = '') => {
    try {
      const trimmedEmail = email.trim()
      // Cria usuário
      await pb.collection('users').create({
        email: trimmedEmail,
        password,
        passwordConfirm: password,
        name: name.trim(),
      })

      // Tenta enviar e-mail de verificação (best effort)
      try {
        await pb.collection('users').requestVerification(trimmedEmail)
      } catch {
        /* intentionally ignored */
      }

      // Realiza login
      await pb.collection('users').authWithPassword(trimmedEmail, password)
      return { error: null }
    } catch (error: any) {
      // Se a falha for pela regra de convite
      const msg = error?.message || ''
      const isInviteRejection =
        error?.status === 400 || error?.status === 403 || /invite/i.test(msg) || /rule/i.test(msg)
      return { error, inviteRequired: isInviteRejection }
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
      await pb.collection('users').requestPasswordReset(email.trim())
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
      await pb.collection('users').requestVerification(email.trim())
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
