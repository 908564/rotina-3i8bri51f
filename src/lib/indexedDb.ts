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
const DB_VERSION = 2

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

async function putInStore<T>(storeName: string, value: T): Promise<void> {
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    const request = store.put(value)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

async function deleteFromStore(storeName: string, key: IDBValidKey): Promise<void> {
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    const request = store.delete(key)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

async function clearStore(storeName: string): Promise<void> {
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    const request = store.clear()
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
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
  getAll: getAllFromStore,
  get: getFromStore,
  put: putInStore,
  delete: deleteFromStore,
  clear: clearStore,
  getDB,
}
