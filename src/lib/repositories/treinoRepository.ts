import { idb } from '../indexedDb'
import { recordOutboxInTx } from '../sync/outboxHelper'
import {
  TreinoPlanoSemanal,
  TreinoLog,
  ExerciseHistoryPoint,
  ActivityPlan,
  ActivityLog,
  TimerState,
} from '../types'

export const treinoRepository = {
  // Planos semanais de musculação (0=Dom, 1=Seg... 6=Sab)
  async getWeeklyPlans(): Promise<TreinoPlanoSemanal[]> {
    const list = await idb.getAll<TreinoPlanoSemanal>(idb.STORE_TREINO_PLANO)
    return (list || [])
      .map((p) => ({
        ...p,
        variant: p.variant || 'academia',
      }))
      .sort((a, b) => Number(a.dayOfWeek) - Number(b.dayOfWeek))
  },

  async getPlanByDayOfWeek(dayOfWeek: number): Promise<TreinoPlanoSemanal | undefined> {
    const targetDay = Number(dayOfWeek)
    try {
      // Busca através da lista completa (máx. 7 registros), garantindo resiliência
      // contra inconsistências de tipos (string vs number) e evitando DOMExceptions caso o índice falhe
      const all = await this.getWeeklyPlans()
      return all.find((p) => Number(p.dayOfWeek) === targetDay)
    } catch (err) {
      console.warn('Erro ao carregar plano de treino por dia da semana:', err)
      return undefined
    }
  },

  async savePlan(
    plan: Omit<TreinoPlanoSemanal, 'id' | 'created' | 'updated'> & { id?: string },
  ): Promise<TreinoPlanoSemanal> {
    const targetDay = Number(plan.dayOfWeek)
    const all = await this.getWeeklyPlans()
    const existing = all.find((p) => Number(p.dayOfWeek) === targetDay)
    const now = new Date().toISOString()

    // Determinamos o ID resolvido:
    // Se já existe um plano para este dia da semana no IndexedDB, DEVEMOS usar existing.id
    // para atualizar o registro in-place. Se usássemos um novo ID (ou plan.id diferente),
    // a store do IndexedDB tentaria uma inserção que colide com a restrição única
    // do índice 'dayOfWeek', lançando DOMException: ConstraintError ("Erro ao salvar").
    const resolvedId = existing
      ? existing.id
      : plan.id ||
        (typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `plan_${Date.now()}_${Math.random().toString(36).slice(2)}`)

    // Se plan.id foi fornecido explicitamente mas for diferente de existing.id, removemos o registro residual com plan.id
    if (plan.id && existing && plan.id !== existing.id) {
      try {
        await idb.delete(idb.STORE_TREINO_PLANO, plan.id)
      } catch {
        // ignora se não existir
      }
    }

    // Se por acaso houvesse registros duplicados históricos para o mesmo dayOfWeek, limpa os extras
    const duplicates = all.filter((p) => Number(p.dayOfWeek) === targetDay && p.id !== resolvedId)
    for (const dup of duplicates) {
      try {
        await idb.delete(idb.STORE_TREINO_PLANO, dup.id)
      } catch {
        // ignora
      }
    }

    const saved: TreinoPlanoSemanal = {
      id: resolvedId,
      dayOfWeek: targetDay,
      workoutName: plan.workoutName.trim(),
      exercises: plan.exercises,
      variant: plan.variant || 'academia',
      created: existing ? existing.created : now,
      updated: now,
    }

    await idb.runTransaction([idb.STORE_TREINO_PLANO, idb.STORE_SYNC_OUTBOX], 'readwrite', (tx) => {
      tx.objectStore(idb.STORE_TREINO_PLANO).put(saved)
      recordOutboxInTx(tx, 'workoutPlanDay', saved.id, 'upsert', saved)
    })
    return saved
  },

  async deletePlan(id: string): Promise<void> {
    await idb.runTransaction([idb.STORE_TREINO_PLANO, idb.STORE_SYNC_OUTBOX], 'readwrite', (tx) => {
      tx.objectStore(idb.STORE_TREINO_PLANO).delete(id)
      recordOutboxInTx(tx, 'workoutPlanDay', id, 'delete')
    })
  },

  // Logs de treino
  async getLogs(): Promise<TreinoLog[]> {
    const list = await idb.getAll<TreinoLog>(idb.STORE_TREINO_LOG)
    return list.sort((a, b) => b.day.localeCompare(a.day))
  },

  async getLogByDate(day: string): Promise<TreinoLog | undefined> {
    const all = await this.getLogs()
    return all.find((l) => l.day === day)
  },

  async saveLog(
    log: Omit<TreinoLog, 'id' | 'created' | 'updated'> & { id?: string },
  ): Promise<TreinoLog> {
    const existing = await this.getLogByDate(log.day)
    const now = new Date().toISOString()
    const saved: TreinoLog = {
      id: log.id || (existing ? existing.id : crypto.randomUUID()),
      day: log.day,
      workoutName: log.workoutName,
      completedSets: log.completedSets,
      variant: log.variant || 'academia',
      created: existing ? existing.created : now,
      updated: now,
    }
    await idb.runTransaction([idb.STORE_TREINO_LOG, idb.STORE_SYNC_OUTBOX], 'readwrite', (tx) => {
      tx.objectStore(idb.STORE_TREINO_LOG).put(saved)
      recordOutboxInTx(tx, 'workoutLog', saved.id, 'upsert', saved)
    })
    return saved
  },

  // Consulta de referência do último treino de um exercício específico
  async getLastExerciseLoad(
    exercicioNome: string,
  ): Promise<{ carga: number; repeticoes: number } | null> {
    const logs = await this.getLogs()
    const nomeNormalized = exercicioNome.trim().toLowerCase()

    for (const log of logs) {
      const matchSet = log.completedSets.find(
        (s) =>
          s.exercicioNome.trim().toLowerCase() === nomeNormalized && s.concluido && s.carga > 0,
      )
      if (matchSet) {
        return { carga: matchSet.carga, repeticoes: matchSet.repeticoes }
      }
    }
    return null
  },

  // Evolução de um exercício ao longo do tempo (derivada dos logs)
  async getExerciseEvolution(exercicioNome: string): Promise<{
    history: ExerciseHistoryPoint[]
    maxWeight: number
    totalSessions: number
  }> {
    const logs = await this.getLogs()
    const nomeNormalized = exercicioNome.trim().toLowerCase()

    const history: ExerciseHistoryPoint[] = []
    let maxWeight = 0

    // Ordenar logs cronologicamente (mais antigo primeiro) para o gráfico
    const sortedLogs = [...logs].sort((a, b) => a.day.localeCompare(b.day))

    for (const log of sortedLogs) {
      const sets = log.completedSets.filter(
        (s) => s.exercicioNome.trim().toLowerCase() === nomeNormalized && s.concluido,
      )
      if (sets.length > 0) {
        // Encontrar a carga máxima dessa sessão
        const sessionMax = Math.max(...sets.map((s) => s.carga))
        const bestSet = sets.find((s) => s.carga === sessionMax) || sets[0]

        if (sessionMax > maxWeight) {
          maxWeight = sessionMax
        }

        history.push({
          date: log.day,
          carga: sessionMax,
          repeticoes: bestSet.repeticoes,
          serieIndex: bestSet.serieIndex,
        })
      }
    }

    return {
      history,
      maxWeight,
      totalSessions: history.length,
    }
  },

  // ==========================================
  // CARDIO E OUTROS: ACTIVITY PLANS
  // ==========================================
  async getActivityPlans(type?: 'cardio' | 'outros'): Promise<ActivityPlan[]> {
    const all = await idb.getAll<ActivityPlan>(idb.STORE_ACTIVITY_PLANS)
    const filtered = (all || []).filter((p) => {
      if (type && p.type !== type) return false
      return true
    })
    return filtered.sort((a, b) => Number(a.weekday ?? 0) - Number(b.weekday ?? 0))
  },

  async getActivityPlansByWeekday(weekday: number): Promise<ActivityPlan[]> {
    const all = await idb.getAll<ActivityPlan>(idb.STORE_ACTIVITY_PLANS)
    return (all || []).filter((p) => Number(p.weekday) === Number(weekday) && p.active !== false)
  },

  async saveActivityPlan(
    plan: Omit<ActivityPlan, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
  ): Promise<ActivityPlan> {
    const now = new Date().toISOString()
    const id =
      plan.id ||
      (typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `act_plan_${Date.now()}`)
    const saved: ActivityPlan = {
      ...plan,
      id,
      active: plan.active !== false,
      createdAt: (plan as any).createdAt || now,
      updatedAt: now,
    }
    await idb.runTransaction(
      [idb.STORE_ACTIVITY_PLANS, idb.STORE_SYNC_OUTBOX],
      'readwrite',
      (tx) => {
        tx.objectStore(idb.STORE_ACTIVITY_PLANS).put(saved)
        recordOutboxInTx(tx, 'activityPlan', saved.id, 'upsert', saved)
      },
    )
    return saved
  },

  async deleteActivityPlan(id: string): Promise<void> {
    await idb.runTransaction(
      [idb.STORE_ACTIVITY_PLANS, idb.STORE_SYNC_OUTBOX],
      'readwrite',
      (tx) => {
        tx.objectStore(idb.STORE_ACTIVITY_PLANS).delete(id)
        recordOutboxInTx(tx, 'activityPlan', id, 'delete')
      },
    )
  },

  // ==========================================
  // CARDIO E OUTROS: ACTIVITY LOGS
  // ==========================================
  async getActivityLogs(type?: 'cardio' | 'outros'): Promise<ActivityLog[]> {
    const all = await idb.getAll<ActivityLog>(idb.STORE_ACTIVITY_LOGS)
    const filtered = (all || []).filter((l) => {
      if (type && l.type !== type) return false
      return true
    })
    return filtered.sort((a, b) => b.date.localeCompare(a.date))
  },

  async getActivityLogsByDate(date: string): Promise<ActivityLog[]> {
    const all = await idb.getAll<ActivityLog>(idb.STORE_ACTIVITY_LOGS)
    return (all || []).filter((l) => l.date === date)
  },

  async saveActivityLog(
    log: Omit<ActivityLog, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
  ): Promise<ActivityLog> {
    const now = new Date().toISOString()
    const id =
      log.id ||
      (typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `act_log_${Date.now()}`)
    const saved: ActivityLog = {
      ...log,
      id,
      createdAt: (log as any).createdAt || now,
      updatedAt: now,
    }
    await idb.runTransaction(
      [idb.STORE_ACTIVITY_LOGS, idb.STORE_SYNC_OUTBOX],
      'readwrite',
      (tx) => {
        tx.objectStore(idb.STORE_ACTIVITY_LOGS).put(saved)
        recordOutboxInTx(tx, 'activityLog', saved.id, 'upsert', saved)
      },
    )
    return saved
  },

  async deleteActivityLog(id: string): Promise<void> {
    await idb.runTransaction(
      [idb.STORE_ACTIVITY_LOGS, idb.STORE_SYNC_OUTBOX],
      'readwrite',
      (tx) => {
        tx.objectStore(idb.STORE_ACTIVITY_LOGS).delete(id)
        recordOutboxInTx(tx, 'activityLog', id, 'delete')
      },
    )
  },

  // ==========================================
  // TIMER STATE (STORE LOCAL-ONLY)
  // ==========================================
  async getTimerState(id: string = 'cardio_active'): Promise<TimerState | undefined> {
    return idb.get<TimerState>(idb.STORE_TIMER_STATE, id)
  },

  async saveTimerState(state: TimerState): Promise<void> {
    await idb.put(idb.STORE_TIMER_STATE, state)
  },

  async clearTimerState(id: string = 'cardio_active'): Promise<void> {
    await idb.delete(idb.STORE_TIMER_STATE, id)
  },
}
