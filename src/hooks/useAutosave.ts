import { useRef, useState, useCallback, useEffect } from 'react'

export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export interface UseAutosaveOptions<K, V> {
  key: K
  value: V
  save: (key: K, value: V) => Promise<void>
  delay?: number // default 400ms
  onError?: (error: unknown, retryCount: number) => void
}

export interface UseAutosaveReturn {
  status: AutosaveStatus
  flush: () => Promise<void>
  isDirty: boolean
  retry: () => Promise<void>
  errorMessage?: string
  scheduleSave: () => void
  cancel: () => void
}

const RETRY_DELAYS = [1000, 2000, 4000]

export function useAutosave<K, V>({
  key,
  value,
  save,
  delay = 400,
  onError,
}: UseAutosaveOptions<K, V>): UseAutosaveReturn {
  const [status, setStatus] = useState<AutosaveStatus>('idle')
  const [isDirtyState, setIsDirtyState] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined)

  // Armazenamento em refs para não depender de re-renders nem invalidar listeners
  const keyRef = useRef<K>(key)
  const valueRef = useRef<V>(value)
  const saveFnRef = useRef(save)
  const onErrorRef = useRef(onError)
  const delayRef = useRef(delay)

  const dirtyRef = useRef<boolean>(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inFlightRef = useRef<boolean>(false)
  const queuedAfterFlightRef = useRef<boolean>(false)
  const retryCountRef = useRef<number>(0)
  const isMountedRef = useRef<boolean>(true)

  // Chave gravada associada ao valor pendente
  const pendingKeyRef = useRef<K>(key)

  // Atualiza referências estáveis
  keyRef.current = key
  valueRef.current = value
  saveFnRef.current = save
  onErrorRef.current = onError
  delayRef.current = delay

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  const clearRetryTimer = () => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current)
      retryTimerRef.current = null
    }
  }

  const clearSavedTimer = () => {
    if (savedTimerRef.current) {
      clearTimeout(savedTimerRef.current)
      savedTimerRef.current = null
    }
  }

  // Execução do ciclo de gravação
  const executeSave = useCallback(async () => {
    if (!dirtyRef.current) {
      return
    }

    if (inFlightRef.current) {
      queuedAfterFlightRef.current = true
      return
    }

    inFlightRef.current = true
    clearTimer()
    clearRetryTimer()
    clearSavedTimer()

    const targetKey = pendingKeyRef.current
    const targetValue = valueRef.current

    // Limpa dirty assumindo que este lote foi enviado
    dirtyRef.current = false
    setIsDirtyState(false)
    setStatus('saving')
    setErrorMessage(undefined)

    try {
      await saveFnRef.current(targetKey, targetValue)
      retryCountRef.current = 0

      if (!isMountedRef.current) {
        inFlightRef.current = false
        return
      }

      inFlightRef.current = false

      // Se o usuário digitou ou queuedAfterFlight foi marcado durante a requisição
      if (dirtyRef.current || queuedAfterFlightRef.current) {
        queuedAfterFlightRef.current = false
        // Continua em saving e salva de novo imediatamente
        executeSave()
      } else {
        setStatus('saved')
        savedTimerRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            setStatus((prev) => (prev === 'saved' ? 'idle' : prev))
          }
        }, 2000)
      }
    } catch (err) {
      inFlightRef.current = false

      if (!isMountedRef.current) {
        return
      }

      // Re-marca dirty para que o valor não seja considerado salvo
      dirtyRef.current = true
      setIsDirtyState(true)

      const currentRetry = retryCountRef.current
      onErrorRef.current?.(err, currentRetry)

      if (currentRetry < RETRY_DELAYS.length) {
        const retryDelay = RETRY_DELAYS[currentRetry]
        retryCountRef.current = currentRetry + 1
        setStatus('error')
        setErrorMessage('Erro ao salvar — tentando de novo')

        clearRetryTimer()
        retryTimerRef.current = setTimeout(() => {
          if (isMountedRef.current && dirtyRef.current) {
            executeSave()
          }
        }, retryDelay)
      } else {
        // Excedeu as 3 tentativas
        setStatus('error')
        setErrorMessage('Erro ao salvar — tente novamente')
      }
    }
  }, [])

  // Quando value muda externamente ou pelo usuário:
  // Detectado via chamada direta de scheduleSave
  const scheduleSave = useCallback(() => {
    pendingKeyRef.current = keyRef.current
    dirtyRef.current = true
    setIsDirtyState(true)
    setStatus('saving')
    setErrorMessage(undefined)

    clearTimer()
    clearRetryTimer()
    clearSavedTimer()

    timerRef.current = setTimeout(() => {
      executeSave()
    }, delayRef.current)
  }, [executeSave])

  const cancel = useCallback(() => {
    clearTimer()
    clearRetryTimer()
    clearSavedTimer()
    dirtyRef.current = false
    setIsDirtyState(false)
    setStatus('idle')
    setErrorMessage(undefined)
  }, [])

  // flush(): cancela timer pendente e grava imediatamente o que estiver pendente
  const flush = useCallback(async () => {
    clearTimer()
    clearRetryTimer()
    if (dirtyRef.current || inFlightRef.current || queuedAfterFlightRef.current) {
      if (inFlightRef.current) {
        queuedAfterFlightRef.current = true
        // Aguarda a gravação atual concluir
        while (inFlightRef.current) {
          await new Promise((resolve) => setTimeout(resolve, 30))
        }
        if (dirtyRef.current || queuedAfterFlightRef.current) {
          queuedAfterFlightRef.current = false
          await executeSave()
        }
      } else {
        await executeSave()
      }
    }
  }, [executeSave])

  const retry = useCallback(async () => {
    retryCountRef.current = 0
    await flush()
  }, [flush])

  // Trata desmonte do hook
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      clearTimer()
      clearRetryTimer()
      clearSavedTimer()
    }
  }, [])

  return {
    status,
    flush,
    isDirty: isDirtyState,
    retry,
    errorMessage,
    scheduleSave,
    cancel,
  }
}
