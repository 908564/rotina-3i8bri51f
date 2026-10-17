import { idb } from '../indexedDb'
import { recordOutboxInTx } from '../sync/outboxHelper'
import {
  Task,
  TaskModule,
  TaskPriority,
  TaskStatus,
  TaskLink,
  TaskSubtask,
  Project,
} from '../types'
import { getTodayDateKey, parseLocalDate, addDaysToDateKey } from '../dateUtils'

// Memory cache for quick badge count lookup
let cachedBadgeCount: number | null = null
const badgeListeners = new Set<(count: number) => void>()

export function onTaskBadgeCountChanged(listener: (count: number) => void): () => void {
  badgeListeners.add(listener)
  if (cachedBadgeCount !== null) {
    listener(cachedBadgeCount)
  }
  return () => {
    badgeListeners.delete(listener)
  }
}

function notifyBadgeChanged(count: number) {
  cachedBadgeCount = count
  badgeListeners.forEach((fn) => {
    try {
      fn(count)
    } catch {
      // Ignore listener errors
    }
  })
}

export const taskRepository = {
  /**
   * Obtém todas as tarefas não deletadas (deletedAt === null)
   */
  async getTasks(): Promise<Task[]> {
    const all = await idb.getAll<Task>(idb.STORE_TASKS)
    return all.filter((t) => !t.deletedAt)
  },

  /**
   * Obtém tarefas ativas filtradas por módulo
   */
  async getTasksByModule(module: TaskModule): Promise<Task[]> {
    const all = await this.getTasks()
    return all.filter((t) => t.module === module)
  },

  async getTaskById(id: string): Promise<Task | undefined> {
    const task = await idb.get<Task>(idb.STORE_TASKS, id)
    if (!task || task.deletedAt) return undefined
    return task
  },

  /**
   * Salva ou atualiza uma tarefa no IndexedDB e registra no outbox de sincronização
   */
  async saveTask(data: {
    id?: string
    title: string
    module: TaskModule
    link?: TaskLink | null
    dueDate?: string | null
    dueTime?: string | null
    reminder?: boolean
    priority?: TaskPriority
    status?: TaskStatus
    completedAt?: string | null
    subtasks?: TaskSubtask[]
    moduleData?: any
  }): Promise<Task> {
    const nowIso = new Date().toISOString()
    const existing = data.id ? await idb.get<Task>(idb.STORE_TASKS, data.id) : null

    const titleTrimmed = data.title.trim().substring(0, 140)
    if (!titleTrimmed) {
      throw new Error('Título da tarefa não pode ser vazio.')
    }

    const cleanSubtasks: TaskSubtask[] = (data.subtasks || existing?.subtasks || [])
      .slice(0, 20)
      .map((st) => ({
        id: st.id || crypto.randomUUID(),
        title: st.title.trim().substring(0, 140),
        done: Boolean(st.done),
      }))
      .filter((st) => st.title.length > 0)

    const nextStatus = data.status || existing?.status || 'open'
    let nextCompletedAt: string | null = null
    if (nextStatus === 'done') {
      nextCompletedAt = data.completedAt || existing?.completedAt || nowIso
    }

    const task: Task = {
      id: data.id || existing?.id || crypto.randomUUID(),
      title: titleTrimmed,
      module: data.module || existing?.module || 'geral',
      link: data.link !== undefined ? data.link : existing?.link || null,
      dueDate: data.dueDate !== undefined ? data.dueDate : existing?.dueDate || null,
      dueTime: data.dueTime !== undefined ? data.dueTime : existing?.dueTime || null,
      reminder: data.reminder !== undefined ? data.reminder : existing?.reminder || false,
      priority: data.priority || existing?.priority || 'normal',
      status: nextStatus,
      completedAt: nextCompletedAt,
      subtasks: cleanSubtasks,
      moduleData: data.moduleData !== undefined ? data.moduleData : existing?.moduleData || null,
      createdAt: existing?.createdAt || nowIso,
      updatedAt: nowIso,
      deletedAt: null,
    }

    await idb.runTransaction([idb.STORE_TASKS, idb.STORE_SYNC_OUTBOX], 'readwrite', (tx) => {
      tx.objectStore(idb.STORE_TASKS).put(task)
      recordOutboxInTx(tx, 'task', task.id, 'upsert', task)
    })

    await this.refreshBadgeCount()
    return task
  },

  /**
   * Conclui ou reabre uma tarefa
   */
  async toggleTaskStatus(id: string): Promise<Task | undefined> {
    const task = await idb.get<Task>(idb.STORE_TASKS, id)
    if (!task || task.deletedAt) return undefined

    const nextStatus: TaskStatus = task.status === 'open' ? 'done' : 'open'
    const nowIso = new Date().toISOString()
    const nextCompletedAt = nextStatus === 'done' ? nowIso : null

    const updatedTask: Task = {
      ...task,
      status: nextStatus,
      completedAt: nextCompletedAt,
      updatedAt: nowIso,
    }

    await idb.runTransaction([idb.STORE_TASKS, idb.STORE_SYNC_OUTBOX], 'readwrite', (tx) => {
      tx.objectStore(idb.STORE_TASKS).put(updatedTask)
      recordOutboxInTx(tx, 'task', updatedTask.id, 'upsert', updatedTask)
    })

    await this.refreshBadgeCount()
    return updatedTask
  },

  /**
   * Exclusão lógica (tombstone com deletedAt)
   */
  async deleteTask(id: string): Promise<void> {
    const task = await idb.get<Task>(idb.STORE_TASKS, id)
    if (!task) return

    const nowIso = new Date().toISOString()
    const tombstone: Task = {
      ...task,
      deletedAt: nowIso,
      updatedAt: nowIso,
    }

    await idb.runTransaction([idb.STORE_TASKS, idb.STORE_SYNC_OUTBOX], 'readwrite', (tx) => {
      tx.objectStore(idb.STORE_TASKS).put(tombstone)
      recordOutboxInTx(tx, 'task', id, 'delete')
    })

    await this.refreshBadgeCount()
  },

  /**
   * Busca tarefas vinculadas a um item (ex: livro, curso, projeto, treino)
   */
  async getTasksByLink(
    linkType: 'book' | 'course' | 'project' | 'workoutDay',
    linkId: string,
  ): Promise<Task[]> {
    const all = await this.getTasks()
    return all.filter((t) => t.link && t.link.type === linkType && t.link.id === linkId)
  },

  /**
   * Regra de integridade: quando um livro, curso ou projeto é excluído ou arquivado,
   * suas tarefas NÃO são apagadas. O vínculo é removido (link = null) e a tarefa permanece no mesmo módulo.
   */
  async unlinkByEntity(
    linkType: 'book' | 'course' | 'project' | 'workoutDay',
    linkId: string,
  ): Promise<void> {
    const linked = await this.getTasksByLink(linkType, linkId)
    if (linked.length === 0) return

    const nowIso = new Date().toISOString()
    await idb.runTransaction([idb.STORE_TASKS, idb.STORE_SYNC_OUTBOX], 'readwrite', (tx) => {
      const store = tx.objectStore(idb.STORE_TASKS)
      for (const t of linked) {
        const unlinked: Task = {
          ...t,
          link: null,
          updatedAt: nowIso,
        }
        store.put(unlinked)
        recordOutboxInTx(tx, 'task', unlinked.id, 'upsert', unlinked)
      }
    })
  },

  /**
   * Migração de ProjectTask para Task (idempotente e sem perda de dados)
   */
  async migrateProjectTasks(): Promise<number> {
    const projects = await idb.getAll<Project>(idb.STORE_PROJECTS)
    if (!projects || projects.length === 0) return 0

    const existingTasks = await idb.getAll<Task>(idb.STORE_TASKS)
    const existingIds = new Set(existingTasks.map((t) => t.id))
    let migratedCount = 0
    const nowIso = new Date().toISOString()

    await idb.runTransaction([idb.STORE_TASKS, idb.STORE_SYNC_OUTBOX], 'readwrite', (tx) => {
      const taskStore = tx.objectStore(idb.STORE_TASKS)
      for (const p of projects) {
        if (!Array.isArray(p.tasks) || p.tasks.length === 0) continue
        for (const pt of p.tasks) {
          if (!pt.id || existingIds.has(pt.id)) continue
          const taskObj: Task = {
            id: pt.id,
            title: (pt.title || 'Tarefa do projeto').substring(0, 140),
            module: 'trabalho',
            link: { type: 'project', id: p.id },
            dueDate: null,
            dueTime: null,
            reminder: false,
            priority: 'normal',
            status: pt.completed ? 'done' : 'open',
            completedAt: pt.completed ? pt.completedAt || p.updated || nowIso : null,
            subtasks: [],
            createdAt: p.created || nowIso,
            updatedAt: p.updated || nowIso,
            deletedAt: null,
          }
          taskStore.put(taskObj)
          recordOutboxInTx(tx, 'task', taskObj.id, 'upsert', taskObj)
          existingIds.add(taskObj.id)
          migratedCount++
        }
      }
    })

    if (migratedCount > 0) {
      await this.refreshBadgeCount()
    }
    return migratedCount
  },

  /**
   * Ordena tarefas de um mesmo dia:
   * 1. Com horário (por horário asc: 09:00 antes de 14:00)
   * 2. Depois sem horário: prioridade high -> normal -> low
   * 3. Depois por createdAt asc
   */
  sortTasks(tasks: Task[]): Task[] {
    const priorityWeight: Record<TaskPriority, number> = {
      high: 3,
      normal: 2,
      low: 1,
    }

    return [...tasks].sort((a, b) => {
      // 1. Horário
      const hasTimeA = Boolean(a.dueTime)
      const hasTimeB = Boolean(b.dueTime)
      if (hasTimeA && hasTimeB) {
        const timeCmp = a.dueTime!.localeCompare(b.dueTime!)
        if (timeCmp !== 0) return timeCmp
      } else if (hasTimeA && !hasTimeB) {
        return -1
      } else if (!hasTimeA && hasTimeB) {
        return 1
      }

      // 2. Prioridade
      const pDiff = (priorityWeight[b.priority] || 2) - (priorityWeight[a.priority] || 2)
      if (pDiff !== 0) return pDiff

      // 3. Ordem de criação
      return (a.createdAt || '').localeCompare(b.createdAt || '')
    })
  },

  /**
   * Filtra tarefas por módulos ativos.
   * Regra: "Geral" está sempre disponível.
   * Módulo inativo oculta suas tarefas.
   */
  filterByActiveModules(tasks: Task[], activeModules?: Record<string, boolean>): Task[] {
    if (!activeModules) return tasks
    return tasks.filter((t) => {
      if (t.module === 'geral') return true
      return activeModules[t.module] !== false
    })
  },

  /**
   * Calcula o selo da barra: tarefas abertas de hoje + atrasadas (módulos ativos + geral).
   */
  async getPendingTodayAndOverdueCount(activeModules?: Record<string, boolean>): Promise<number> {
    const all = await this.getTasks()
    const active = this.filterByActiveModules(all, activeModules)
    const today = getTodayDateKey()

    const pending = active.filter((t) => {
      if (t.status !== 'open') return false
      if (!t.dueDate) return false
      return t.dueDate <= today
    })

    const count = pending.length
    cachedBadgeCount = count
    return count
  },

  /**
   * Atualiza a contagem em cache e notifica ouvintes
   */
  async refreshBadgeCount(activeModules?: Record<string, boolean>): Promise<number> {
    const count = await this.getPendingTodayAndOverdueCount(activeModules)
    notifyBadgeChanged(count)
    return count
  },

  getCachedBadgeCount(): number | null {
    return cachedBadgeCount
  },
}
