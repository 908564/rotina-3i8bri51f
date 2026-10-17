import pb from '../pocketbase/client'
import { idb } from '../indexedDb'
import {
  SyncEntity,
  SyncOutboxItem,
  SyncMetaState,
  EscritaNote,
  Livro,
  LivroAnotacao,
  LeituraHistorico,
  TreinoPlanoSemanal,
  TreinoLog,
  Course,
  StudyPage,
  StudyCertificate,
  StudySession,
  StudyGoal,
  Project,
  Achievement,
  Experience,
  WorkNote,
  DaySummary,
  AppSettings,
} from '../types'
import { settingsRepository } from '../repositories/settingsRepository'

const META_KEY = 'default'
const PUSH_BATCH_SIZE = 25
const PULL_PAGE_SIZE = 200

export type SyncStatus = 'idle' | 'syncing' | 'offline' | 'error'

export interface SyncEngineListener {
  (state: SyncMetaState): void
}

class SyncEngine {
  private listeners: Set<SyncEngineListener> = new Set()
  private debounceTimer: any = null
  private isRunning = false
  private currentBackoffMs = 1000
  private maxBackoffMs = 60000

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.currentBackoffMs = 1000
        this.triggerDebouncedSync(500)
      })
      window.addEventListener('offline', () => {
        this.updateState({ status: 'offline' })
      })
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.triggerDebouncedSync(1000)
        }
      })
    }
  }

  public subscribe(listener: SyncEngineListener): () => void {
    this.listeners.add(listener)
    this.getMeta().then((meta) => listener(meta))
    return () => this.listeners.delete(listener)
  }

  public async getMeta(): Promise<SyncMetaState> {
    const meta = await idb.get<SyncMetaState>(idb.STORE_SYNC_META, META_KEY)
    if (meta) return meta
    const initial: SyncMetaState = {
      key: META_KEY,
      lastPulledAt: null,
      userId: pb.authStore.record?.id || null,
      status: typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'idle',
      lastSyncedAt: null,
    }
    await idb.put(idb.STORE_SYNC_META, initial)
    return initial
  }

  private async updateState(partial: Partial<SyncMetaState>): Promise<SyncMetaState> {
    const current = await this.getMeta()
    const updated: SyncMetaState = {
      ...current,
      ...partial,
      userId: pb.authStore.record?.id || current.userId,
    }
    await idb.put(idb.STORE_SYNC_META, updated)
    this.listeners.forEach((fn) => {
      try {
        fn(updated)
      } catch {
        /* intentionally ignored */
      }
    })
    return updated
  }

  public triggerDebouncedSync(delayMs = 3000): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer)
    this.debounceTimer = setTimeout(() => {
      this.sync().catch(() => {})
    }, delayMs)
  }

  public async sync(): Promise<boolean> {
    if (this.isRunning) return false

    // Se estiver deslogado ou não verificado, não sincroniza
    const user = pb.authStore.record
    if (!pb.authStore.isValid || !user) {
      await this.updateState({ status: 'idle' })
      return false
    }

    if (!user.verified) {
      await this.updateState({
        status: 'error',
        lastError: 'E-mail não verificado. Verifique seu e-mail para ativar a sincronização.',
      })
      return false
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      await this.updateState({ status: 'offline' })
      return false
    }

    this.isRunning = true
    await this.updateState({ status: 'syncing', lastError: undefined })

    try {
      // 1. Limpa tombstones expiradas (> 90 dias) no backend se houver oportunidade
      // 2. Push do Outbox
      await this.pushOutbox(user.id)

      // 3. Pull das alterações remotas
      await this.pullRemote(user.id)

      const now = new Date().toISOString()
      await this.updateState({
        status: 'idle',
        lastSyncedAt: now,
        lastError: undefined,
      })
      this.currentBackoffMs = 1000
      this.isRunning = false
      return true
    } catch (err: any) {
      this.isRunning = false
      const errorMsg = err?.message || 'Falha ao sincronizar'
      await this.updateState({
        status: typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'error',
        lastError: errorMsg,
      })

      // Se foi erro de rede ou 5xx, agenda retentativa com backoff exponencial
      const isNetwork = !navigator.onLine || err?.status >= 500 || err?.status === 0
      if (isNetwork) {
        const nextDelay = this.currentBackoffMs
        this.currentBackoffMs = Math.min(this.currentBackoffMs * 2, this.maxBackoffMs)
        this.triggerDebouncedSync(nextDelay)
      }

      return false
    }
  }

  /**
   * PUSH: Envia até PUSH_BATCH_SIZE itens por vez
   */
  private async pushOutbox(userId: string): Promise<void> {
    const allOutbox = await idb.getAll<SyncOutboxItem>(idb.STORE_SYNC_OUTBOX)
    if (!allOutbox || allOutbox.length === 0) return

    // Ordena por timestamp
    const sorted = [...allOutbox].sort((a, b) => a.timestamp.localeCompare(b.timestamp))
    const batch = sorted.slice(0, PUSH_BATCH_SIZE)

    for (const item of batch) {
      try {
        await this.pushItem(userId, item)
        // Remove do outbox com sucesso
        await idb.delete(idb.STORE_SYNC_OUTBOX, item.id)
      } catch (err: any) {
        // Se 400 ou conflito que consiga contornar
        item.attempts = (item.attempts || 0) + 1
        item.lastError = err?.message || 'Erro no envio'
        await idb.put(idb.STORE_SYNC_OUTBOX, item)
        throw err // Interrompe o lote para tentar com backoff
      }
    }

    // Se ainda restarem itens no outbox, continua enviando
    const remaining = await idb.getAll<SyncOutboxItem>(idb.STORE_SYNC_OUTBOX)
    if (remaining.length > 0) {
      await this.pushOutbox(userId)
    }
  }

  private async pushItem(userId: string, item: SyncOutboxItem): Promise<void> {
    const nowIso = new Date().toISOString()

    // 1. Tratamento para arquivos se for certificado com anexo ou capa de livro grande
    if (item.entity === 'certificate' && item.operation === 'upsert' && item.data?.fileData) {
      await this.syncUploadFileIfAny(userId, item.clientId, item.data)
    }

    // 2. Busca se o registro já existe no sync_records
    let existingRecord: any = null
    try {
      existingRecord = await pb
        .collection('sync_records')
        .getFirstListItem(`user="${userId}" && clientId="${item.clientId}"`)
    } catch (_) {
      existingRecord = null
    }

    if (item.operation === 'delete') {
      const payload = {
        user: userId,
        entity: item.entity,
        clientId: item.clientId,
        deletedAt: nowIso,
        clientUpdatedAt: item.timestamp,
        data: null,
      }
      if (existingRecord) {
        await pb.collection('sync_records').update(existingRecord.id, payload)
      } else {
        await pb.collection('sync_records').create(payload)
      }
      return
    }

    // Upsert
    const clientUpdatedAt = item.data?.updated || item.timestamp || nowIso
    const payload = {
      user: userId,
      entity: item.entity,
      clientId: item.clientId,
      deletedAt: null,
      clientUpdatedAt,
      data: item.data || {},
    }

    if (existingRecord) {
      await pb.collection('sync_records').update(existingRecord.id, payload)
    } else {
      try {
        await pb.collection('sync_records').create(payload)
      } catch (err: any) {
        // Corrida: pode ter sido criado paralelamente por outro aparelho
        try {
          const secondCheck = await pb
            .collection('sync_records')
            .getFirstListItem(`user="${userId}" && clientId="${item.clientId}"`)
          if (secondCheck) {
            await pb.collection('sync_records').update(secondCheck.id, payload)
            return
          }
        } catch {
          /* intentionally ignored */
        }
        throw err
      }
    }
  }

  private async syncUploadFileIfAny(
    userId: string,
    clientId: string,
    cert: StudyCertificate,
  ): Promise<void> {
    if (!cert.fileData || !cert.fileData.startsWith('data:')) return
    try {
      // Converte Data URL para Blob
      const [header, base64] = cert.fileData.split(',')
      const mime = header.match(/:(.*?);/)?.[1] || 'application/pdf'
      const binary = atob(base64)
      const array = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) {
        array[i] = binary.charCodeAt(i)
      }
      const blob = new Blob([array], { type: mime })
      const fileName = cert.fileName || 'arquivo'

      const formData = new FormData()
      formData.append('user', userId)
      formData.append('clientId', clientId)
      formData.append('fileType', cert.fileType || (mime.includes('pdf') ? 'pdf' : 'image'))
      formData.append('file', blob, fileName)

      let existingFileRecord: any = null
      try {
        existingFileRecord = await pb
          .collection('sync_files')
          .getFirstListItem(`user="${userId}" && clientId="${clientId}"`)
      } catch (_) {
        existingFileRecord = null
      }

      if (existingFileRecord) {
        await pb.collection('sync_files').update(existingFileRecord.id, formData)
      } else {
        await pb.collection('sync_files').create(formData)
      }
    } catch (err) {
      console.warn('Falha ao subir arquivo para sync_files:', err)
    }
  }

  /**
   * PULL: Busca registros modificados desde lastPulledAt
   */
  private async pullRemote(userId: string): Promise<void> {
    const meta = await this.getMeta()
    let lastPulledAt = meta.lastPulledAt
    let page = 1
    let hasMore = true
    let newestRemoteUpdated = lastPulledAt

    while (hasMore) {
      let filter = `user="${userId}"`
      if (lastPulledAt) {
        filter += ` && updated > "${lastPulledAt}"`
      }

      const res = await pb.collection('sync_records').getList(page, PULL_PAGE_SIZE, {
        filter,
        sort: 'updated',
      })

      if (res.items.length === 0) {
        hasMore = false
        break
      }

      for (const item of res.items) {
        await this.applyRemoteRecord(item)
        if (!newestRemoteUpdated || item.updated > newestRemoteUpdated) {
          newestRemoteUpdated = item.updated
        }
      }

      if (page >= res.totalPages) {
        hasMore = false
      } else {
        page++
      }
    }

    if (newestRemoteUpdated) {
      await this.updateState({ lastPulledAt: newestRemoteUpdated })
    }
  }

  /**
   * Aplica um registro do sync_records no banco local com resolução de conflitos
   */
  private async applyRemoteRecord(record: any): Promise<void> {
    const entity = record.entity as SyncEntity
    const clientId = record.clientId as string
    const deletedAt = record.deletedAt as string | null
    const clientUpdatedAt = record.clientUpdatedAt as string
    const data = record.data

    const storeName = this.getStoreNameForEntity(entity)
    if (!storeName) return

    // 1. Se foi deletado remotamente
    if (deletedAt) {
      await idb.delete(storeName, clientId)
      return
    }

    if (!data) return

    // 2. Se for texto longo com conflito potencial
    const isLongTextEntity = ['note', 'bookNote', 'studyPage', 'workNote', 'projectNote'].includes(
      entity,
    )

    // Verifica se temos uma alteração local não enviada para este clientId no outbox
    const pendingOutbox = await idb.getAll<SyncOutboxItem>(idb.STORE_SYNC_OUTBOX)
    const pendingLocal = pendingOutbox.find((o) => o.clientId === clientId)

    const localRecord: any = await idb.get(storeName, clientId)

    if (isLongTextEntity && pendingLocal && localRecord) {
      // Regra de conflito para textos longos:
      // se local tem alterações não enviadas E o remoto mudou:
      // mantém o com clientUpdatedAt mais recente como principal e salva o outro como "Cópia de conflito (data/hora)"
      const localTime = new Date(localRecord.updated || pendingLocal.timestamp).getTime()
      const remoteTime = new Date(clientUpdatedAt || record.updated).getTime()
      const nowFormat = new Date().toLocaleString('pt-BR')

      if (remoteTime > localTime) {
        // Remoto é mais recente: vira o principal. O local é salvo como cópia de conflito
        await this.saveConflictCopy(entity, localRecord, nowFormat)
        await idb.put(storeName, data)
      } else {
        // Local é mais recente: permanece o principal. O remoto é salvo como cópia de conflito
        await this.saveConflictCopy(entity, data, nowFormat)
      }
      return
    }

    // Regra padrão: clientUpdatedAt mais recente vence
    if (localRecord && localRecord.updated) {
      const localTime = new Date(localRecord.updated).getTime()
      const remoteTime = new Date(clientUpdatedAt || record.updated).getTime()
      if (localTime > remoteTime && !pendingLocal) {
        // Local é mais recente e já foi enviado (ou não precisa ser sobrescrito)
        return
      }
    }

    // Aplica no banco local
    if (entity === 'settings') {
      settingsRepository.saveSettings(data as AppSettings)
    } else {
      await idb.put(storeName, data)
    }
  }

  private async saveConflictCopy(
    entity: SyncEntity,
    recordData: any,
    timeStr: string,
  ): Promise<void> {
    try {
      const copy = { ...recordData, id: crypto.randomUUID(), updated: new Date().toISOString() }
      if (entity === 'note') {
        copy.title = `${copy.title || 'Nota'} (Cópia de conflito ${timeStr})`
        await idb.put(idb.STORE_ESCRITA, copy)
      } else if (entity === 'studyPage') {
        copy.title = `${copy.title || 'Página'} (Cópia de conflito ${timeStr})`
        await idb.put(idb.STORE_STUDY_PAGES, copy)
      } else if (entity === 'workNote') {
        copy.title = `${copy.title || 'Nota'} (Cópia de conflito ${timeStr})`
        await idb.put(idb.STORE_WORK_NOTES, copy)
      } else if (entity === 'bookNote') {
        copy.text = `[Cópia de conflito ${timeStr}]\n${copy.text || ''}`
        await idb.put(idb.STORE_LIVRO_ANOTACOES, copy)
      }
    } catch (err) {
      console.warn('Erro ao salvar cópia de conflito:', err)
    }
  }

  private getStoreNameForEntity(entity: SyncEntity): string | null {
    switch (entity) {
      case 'note':
        return idb.STORE_ESCRITA
      case 'book':
        return idb.STORE_LIVROS
      case 'bookNote':
        return idb.STORE_LIVRO_ANOTACOES
      case 'readingLog':
        return idb.STORE_LEITURA_HISTORICO
      case 'workoutPlanDay':
        return idb.STORE_TREINO_PLANO
      case 'workoutLog':
        return idb.STORE_TREINO_LOG
      case 'course':
        return idb.STORE_COURSES
      case 'studyPage':
        return idb.STORE_STUDY_PAGES
      case 'certificate':
        return idb.STORE_STUDY_CERTIFICATES
      case 'studySession':
        return idb.STORE_STUDY_SESSIONS
      case 'studyGoal':
        return idb.STORE_STUDY_GOALS
      case 'project':
        return idb.STORE_PROJECTS
      case 'achievement':
        return idb.STORE_ACHIEVEMENTS
      case 'experience':
        return idb.STORE_EXPERIENCES
      case 'workNote':
        return idb.STORE_WORK_NOTES
      case 'daySummary':
        return idb.STORE_DAY_SUMMARIES
      case 'settings':
        return null // Especial
      default:
        return null
    }
  }

  /**
   * Limpa todo o estado do motor de sincronização (ao trocar de conta ou sair)
   */
  public async resetSyncState(): Promise<void> {
    await idb.clear(idb.STORE_SYNC_OUTBOX)
    await idb.clear(idb.STORE_SYNC_META)
    await this.updateState({
      lastPulledAt: null,
      userId: null,
      status: 'idle',
      lastSyncedAt: null,
      lastError: undefined,
    })
  }
}

export const syncEngine = new SyncEngine()
