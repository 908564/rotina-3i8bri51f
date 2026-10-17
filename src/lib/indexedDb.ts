import { DB_VERSION } from './version'
import {
  AppSettings,
  EscritaNote,
  Livro,
  LivroAnotacao,
  LeituraHistorico,
  TreinoPlanoSemanal,
  TreinoLog,
  ExportDataPayload,
} from './types'

const DB_NAME = 'rotina_db'

const STORE_ESCRITA = 'escrita_notes'
const STORE_LIVROS = 'livros'
const STORE_LIVRO_ANOTACOES = 'livro_anotacoes'
const STORE_LEITURA_HISTORICO = 'leitura_historico'
const STORE_TREINO_PLANO = 'treino_plano_semanal'
const STORE_TREINO_LOG = 'treino_log'
const STORE_COURSES = 'courses'
const STORE_STUDY_PAGES = 'study_pages'
const STORE_STUDY_CERTIFICATES = 'study_certificates'
const STORE_STUDY_SESSIONS = 'study_sessions'
const STORE_STUDY_GOALS = 'study_goals'
const STORE_PROJECTS = 'projects'
const STORE_ACHIEVEMENTS = 'achievements'
const STORE_EXPERIENCES = 'experiences'
const STORE_WORK_NOTES = 'work_notes'
const STORE_DAY_SUMMARIES = 'day_summaries'

let dbPromise: Promise<IDBDatabase> | null = null

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      if (!db.objectStoreNames.contains(STORE_ESCRITA)) {
        const store = db.createObjectStore(STORE_ESCRITA, { keyPath: 'id' })
        store.createIndex('date', 'date', { unique: true })
      }

      if (!db.objectStoreNames.contains(STORE_LIVROS)) {
        db.createObjectStore(STORE_LIVROS, { keyPath: 'id' })
      }

      if (!db.objectStoreNames.contains(STORE_LIVRO_ANOTACOES)) {
        const store = db.createObjectStore(STORE_LIVRO_ANOTACOES, { keyPath: 'id' })
        store.createIndex('bookId', 'bookId', { unique: false })
      }

      if (!db.objectStoreNames.contains(STORE_LEITURA_HISTORICO)) {
        const store = db.createObjectStore(STORE_LEITURA_HISTORICO, { keyPath: 'id' })
        store.createIndex('bookId', 'bookId', { unique: false })
        store.createIndex('dateRead', 'dateRead', { unique: false })
      }

      if (!db.objectStoreNames.contains(STORE_TREINO_PLANO)) {
        const store = db.createObjectStore(STORE_TREINO_PLANO, { keyPath: 'id' })
        store.createIndex('dayOfWeek', 'dayOfWeek', { unique: true })
      }

      if (!db.objectStoreNames.contains(STORE_TREINO_LOG)) {
        const store = db.createObjectStore(STORE_TREINO_LOG, { keyPath: 'id' })
        store.createIndex('day', 'day', { unique: false })
      }

      // v2: ESTUDOS
      if (!db.objectStoreNames.contains(STORE_COURSES)) {
        db.createObjectStore(STORE_COURSES, { keyPath: 'id' })
      }

      if (!db.objectStoreNames.contains(STORE_STUDY_PAGES)) {
        const store = db.createObjectStore(STORE_STUDY_PAGES, { keyPath: 'id' })
        store.createIndex('courseId', 'courseId', { unique: false })
      }

      if (!db.objectStoreNames.contains(STORE_STUDY_CERTIFICATES)) {
        const store = db.createObjectStore(STORE_STUDY_CERTIFICATES, { keyPath: 'id' })
        store.createIndex('courseId', 'courseId', { unique: false })
      }

      if (!db.objectStoreNames.contains(STORE_STUDY_SESSIONS)) {
        const store = db.createObjectStore(STORE_STUDY_SESSIONS, { keyPath: 'id' })
        store.createIndex('courseId', 'courseId', { unique: false })
        store.createIndex('date', 'date', { unique: false })
      }

      if (!db.objectStoreNames.contains(STORE_STUDY_GOALS)) {
        const store = db.createObjectStore(STORE_STUDY_GOALS, { keyPath: 'id' })
        store.createIndex('courseId', 'courseId', { unique: true })
      }

      // v3: TRABALHO
      if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
        const store = db.createObjectStore(STORE_PROJECTS, { keyPath: 'id' })
        store.createIndex('status', 'status', { unique: false })
      }

      if (!db.objectStoreNames.contains(STORE_ACHIEVEMENTS)) {
        const store = db.createObjectStore(STORE_ACHIEVEMENTS, { keyPath: 'id' })
        store.createIndex('date', 'date', { unique: false })
        store.createIndex('projectId', 'projectId', { unique: false })
        store.createIndex('experienceId', 'experienceId', { unique: false })
      }

      if (!db.objectStoreNames.contains(STORE_EXPERIENCES)) {
        db.createObjectStore(STORE_EXPERIENCES, { keyPath: 'id' })
      }

      if (!db.objectStoreNames.contains(STORE_WORK_NOTES)) {
        const store = db.createObjectStore(STORE_WORK_NOTES, { keyPath: 'id' })
        store.createIndex('date', 'date', { unique: false })
      }

      // v4: DAY SUMMARIES
      if (!db.objectStoreNames.contains(STORE_DAY_SUMMARIES)) {
        db.createObjectStore(STORE_DAY_SUMMARIES, { keyPath: 'date' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

  return dbPromise
}

// Utilitários de transação genéricos
async function getAllFromStore<T>(storeName: string): Promise<T[]> {
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly')
    const store = tx.objectStore(storeName)
    const request = store.getAll()
    request.onsuccess = () => resolve(request.result as T[])
    request.onerror = () => reject(request.error)
  })
}

async function getFromStore<T>(storeName: string, key: IDBValidKey): Promise<T | undefined> {
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly')
    const store = tx.objectStore(storeName)
    const request = store.get(key)
    request.onsuccess = () => resolve(request.result as T | undefined)
    request.onerror = () => reject(request.error)
  })
}

export function isQuotaExceededError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const err = error as { name?: string; message?: string; code?: number }
  return (
    err.name === 'QuotaExceededError' ||
    err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    err.code === 22 ||
    (typeof err.message === 'string' && /quota/i.test(err.message))
  )
}

// Listener para notificação global de QuotaExceededError
type QuotaErrorListener = () => void
const quotaErrorListeners = new Set<QuotaErrorListener>()

export function onQuotaExceeded(listener: QuotaErrorListener): () => void {
  quotaErrorListeners.add(listener)
  return () => {
    quotaErrorListeners.delete(listener)
  }
}

export function notifyQuotaExceeded(): void {
  quotaErrorListeners.forEach((fn) => {
    try {
      fn()
    } catch {
      // Ignora falhas nos listeners
    }
  })
}

async function putInStore<T>(storeName: string, value: T): Promise<void> {
  const db = await getDB()
  return new Promise((resolve, reject) => {
    let resolved = false
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    const request = store.put(value)

    request.onerror = () => {
      const err = request.error || tx.error
      if (isQuotaExceededError(err)) {
        notifyQuotaExceeded()
      }
      try {
        tx.abort()
      } catch {
        // Ignora se já estiver inativa
      }
      if (!resolved) {
        resolved = true
        reject(err)
      }
    }

    tx.oncomplete = () => {
      if (!resolved) {
        resolved = true
        resolve()
      }
    }

    tx.onerror = () => {
      const err = tx.error || request.error
      if (isQuotaExceededError(err)) {
        notifyQuotaExceeded()
      }
      if (!resolved) {
        resolved = true
        reject(err)
      }
    }

    tx.onabort = () => {
      const err = tx.error || new Error('Transação abortada')
      if (isQuotaExceededError(err)) {
        notifyQuotaExceeded()
      }
      if (!resolved) {
        resolved = true
        reject(err)
      }
    }
  })
}

async function deleteFromStore(storeName: string, key: IDBValidKey): Promise<void> {
  const db = await getDB()
  return new Promise((resolve, reject) => {
    let resolved = false
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    const request = store.delete(key)

    request.onerror = () => {
      const err = request.error || tx.error
      try {
        tx.abort()
      } catch {
        // Ignora
      }
      if (!resolved) {
        resolved = true
        reject(err)
      }
    }

    tx.oncomplete = () => {
      if (!resolved) {
        resolved = true
        resolve()
      }
    }

    tx.onerror = () => {
      const err = tx.error || request.error
      if (!resolved) {
        resolved = true
        reject(err)
      }
    }

    tx.onabort = () => {
      const err = tx.error || new Error('Transação abortada')
      if (!resolved) {
        resolved = true
        reject(err)
      }
    }
  })
}

async function clearStore(storeName: string): Promise<void> {
  const db = await getDB()
  return new Promise((resolve, reject) => {
    let resolved = false
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    const request = store.clear()

    request.onerror = () => {
      const err = request.error || tx.error
      try {
        tx.abort()
      } catch {
        // Ignora
      }
      if (!resolved) {
        resolved = true
        reject(err)
      }
    }

    tx.oncomplete = () => {
      if (!resolved) {
        resolved = true
        resolve()
      }
    }

    tx.onerror = () => {
      const err = tx.error || request.error
      if (!resolved) {
        resolved = true
        reject(err)
      }
    }

    tx.onabort = () => {
      const err = tx.error || new Error('Transação abortada')
      if (!resolved) {
        resolved = true
        reject(err)
      }
    }
  })
}

/**
 * Executa uma operação atômica em uma transação IndexedDB cobrindo uma ou mais stores.
 * Se a função callback lançar exceção ou abortar, todas as mutações da transação sofrem rollback.
 */
async function runTransaction<T>(
  storeNames: string | string[],
  mode: IDBTransactionMode,
  callback: (tx: IDBTransaction) => Promise<T> | T,
): Promise<T> {
  const db = await getDB()
  const names = Array.isArray(storeNames) ? storeNames : [storeNames]

  return new Promise<T>((resolve, reject) => {
    let result: T
    let callbackCompleted = false

    const tx = db.transaction(names, mode)

    tx.oncomplete = () => {
      if (callbackCompleted) {
        resolve(result)
      }
    }

    tx.onerror = () => {
      const err = tx.error || new Error('Transação IndexedDB falhou')
      if (isQuotaExceededError(err)) {
        notifyQuotaExceeded()
      }
      reject(err)
    }

    tx.onabort = () => {
      const err = tx.error || new Error('Transação IndexedDB abortada')
      if (isQuotaExceededError(err)) {
        notifyQuotaExceeded()
      }
      reject(err)
    }

    Promise.resolve()
      .then(() => callback(tx))
      .then((res) => {
        result = res
        callbackCompleted = true
      })
      .catch((err) => {
        try {
          tx.abort()
        } catch {
          // Já pode estar inativa/abortada
        }
        reject(err)
      })
  })
}

export const idb = {
  STORE_ESCRITA,
  STORE_LIVROS,
  STORE_LIVRO_ANOTACOES,
  STORE_LEITURA_HISTORICO,
  STORE_TREINO_PLANO,
  STORE_TREINO_LOG,
  STORE_COURSES,
  STORE_STUDY_PAGES,
  STORE_STUDY_CERTIFICATES,
  STORE_STUDY_SESSIONS,
  STORE_STUDY_GOALS,
  STORE_PROJECTS,
  STORE_ACHIEVEMENTS,
  STORE_EXPERIENCES,
  STORE_WORK_NOTES,
  STORE_DAY_SUMMARIES,
  getAll: getAllFromStore,
  get: getFromStore,
  put: putInStore,
  delete: deleteFromStore,
  clear: clearStore,
  runTransaction,
  getDB,
  isQuotaExceededError,
  notifyQuotaExceeded,
  onQuotaExceeded,
}
