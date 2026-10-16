import { idb } from '../indexedDb'
import { TreinoPlanoSemanal, TreinoLog, ExerciseHistoryPoint } from '../types'

export const treinoRepository = {
  // Planos semanais (0=Dom, 1=Seg... 6=Sab)
  async getWeeklyPlans(): Promise<TreinoPlanoSemanal[]> {
    const list = await idb.getAll<TreinoPlanoSemanal>(idb.STORE_TREINO_PLANO)
    return list.sort((a, b) => a.dayOfWeek - b.dayOfWeek)
  },

  async getPlanByDayOfWeek(dayOfWeek: number): Promise<TreinoPlanoSemanal | undefined> {
    const db = await idb.getDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(idb.STORE_TREINO_PLANO, 'readonly')
      const store = tx.objectStore(idb.STORE_TREINO_PLANO)
      const index = store.index('dayOfWeek')
      const request = index.get(dayOfWeek)
      request.onsuccess = () => resolve(request.result as TreinoPlanoSemanal | undefined)
      request.onerror = () => reject(request.error)
    })
  },

  async savePlan(
    plan: Omit<TreinoPlanoSemanal, 'id' | 'created' | 'updated'> & { id?: string },
  ): Promise<TreinoPlanoSemanal> {
    const existing = await this.getPlanByDayOfWeek(plan.dayOfWeek)
    const now = new Date().toISOString()
    const saved: TreinoPlanoSemanal = {
      id: plan.id || (existing ? existing.id : crypto.randomUUID()),
      dayOfWeek: plan.dayOfWeek,
      workoutName: plan.workoutName.trim(),
      exercises: plan.exercises,
      created: existing ? existing.created : now,
      updated: now,
    }
    await idb.put(idb.STORE_TREINO_PLANO, saved)
    return saved
  },

  async deletePlan(id: string): Promise<void> {
    await idb.delete(idb.STORE_TREINO_PLANO, id)
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
      created: existing ? existing.created : now,
      updated: now,
    }
    await idb.put(idb.STORE_TREINO_LOG, saved)
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
}
