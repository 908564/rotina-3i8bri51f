import { idb } from '../indexedDb'
import { ModuleDay, ModuleDayKey, ModuleDaySource, DaySummary } from '../types'
export type { ModuleDayKey } from '../types'
import { recordOutboxInTx } from '../sync/outboxHelper'
import { subDaysFromDateKey, getTodayDateKey } from '../dateUtils'

export const moduleDaysRepository = {
  async getAll(): Promise<ModuleDay[]> {
    return idb.getAll<ModuleDay>(idb.STORE_MODULE_DAYS)
  },

  async getByDate(date: string): Promise<ModuleDay[]> {
    const all = await this.getAll()
    return all.filter((md) => md.date === date)
  },

  async getByDateAndModule(date: string, module: ModuleDayKey): Promise<ModuleDay | undefined> {
    const all = await this.getAll()
    return all.find((md) => md.date === date && md.module === module)
  },

  /**
   * Grava ou atualiza um registro de dia para um módulo.
   * REGRA CRUCIAL: registros de dias PASSADOS (date < today) são congelados/imutáveis!
   * NUNCA sobrescreve ou recalcula um dia passado já congelado ao virar o dia.
   * Se forceFrozenOverride não for especificado e date < today && existing, rejeita ou não altera.
   */
  async recordModuleDay(
    data: {
      date: string
      module: ModuleDayKey
      goalDefined: boolean
      done: boolean
      source?: ModuleDaySource
      value?: number
      doneAt?: string | null
    },
    forceOverridePast: boolean = false,
  ): Promise<ModuleDay | null> {
    const today = getTodayDateKey()
    const isPast = data.date < today

    const existing = await this.getByDateAndModule(data.date, data.module)

    // Se for passado e já existir registro, congelado! Não alterar o passado.
    if (isPast && existing && !forceOverridePast) {
      return existing
    }

    const nowIso = new Date().toISOString()
    const item: ModuleDay = {
      id: existing?.id || crypto.randomUUID(),
      date: data.date,
      module: data.module,
      goalDefined: data.goalDefined,
      done: data.done,
      source: data.source || (existing?.source ?? 'auto'),
      value: data.value !== undefined ? data.value : existing?.value,
      doneAt: data.done ? data.doneAt || existing?.doneAt || nowIso : null,
      createdAt: existing?.createdAt || nowIso,
      updatedAt: nowIso,
    }

    await idb.runTransaction([idb.STORE_MODULE_DAYS, idb.STORE_SYNC_OUTBOX], 'readwrite', (tx) => {
      tx.objectStore(idb.STORE_MODULE_DAYS).put(item)
      recordOutboxInTx(tx, 'moduleDay', item.id, 'upsert', item)
    })

    // Ao atualizar registros do dia, atualiza também a derivação de day_summaries
    await this.deriveDaySummaryForDate(data.date)

    return item
  },

  /**
   * Deriva day_summaries a partir de module_days para a data especificada.
   * goalsTotal = soma de module_days com goalDefined === true
   * goalsDone = soma de module_days com goalDefined === true && done === true
   * closed = goalsTotal > 0 && goalsDone >= goalsTotal
   */
  async deriveDaySummaryForDate(date: string): Promise<DaySummary> {
    const records = await this.getByDate(date)
    const goalRecords = records.filter((r) => r.goalDefined)
    const goalsTotal = goalRecords.length
    const goalsDone = goalRecords.filter((r) => r.done).length
    const closed = goalsTotal > 0 && goalsDone >= goalsTotal

    const existingSummary = await idb.get<DaySummary>(idb.STORE_DAY_SUMMARIES, date)
    const nowIso = new Date().toISOString()

    const summary: DaySummary = {
      date,
      goalsTotal,
      goalsDone,
      closed,
      createdAt: existingSummary?.createdAt || nowIso,
      updatedAt: nowIso,
    }

    await idb.runTransaction(
      [idb.STORE_DAY_SUMMARIES, idb.STORE_SYNC_OUTBOX],
      'readwrite',
      (tx) => {
        tx.objectStore(idb.STORE_DAY_SUMMARIES).put(summary)
        recordOutboxInTx(tx, 'daySummary', summary.date, 'upsert', summary)
      },
    )

    return summary
  },

  /**
   * Calcula ofensiva (streak) de um módulo específico.
   * Regra: conta dias seguidos em que goalDefined && done === true.
   * Dias em que o módulo não teve meta definida (goalDefined = false) não quebram nem aumentam a sequência.
   * Lê exclusivamente de module_days.
   */
  async calculateModuleStreak(
    module: ModuleDayKey,
    todayStr: string = getTodayDateKey(),
    todayModuleDay?: ModuleDay,
  ): Promise<number> {
    const all = await this.getAll()
    const moduleDays = all.filter((md) => md.module === module)
    const dayMap = new Map<string, ModuleDay>()
    for (const md of moduleDays) {
      dayMap.set(md.date, md)
    }

    if (todayModuleDay && todayModuleDay.module === module) {
      dayMap.set(todayModuleDay.date, todayModuleDay)
    }

    let streak = 0
    let cursor = todayStr

    const currentToday = dayMap.get(todayStr)
    if (currentToday && currentToday.goalDefined && currentToday.done) {
      streak++
      cursor = subDaysFromDateKey(cursor, 1)
    } else {
      cursor = subDaysFromDateKey(cursor, 1)
    }

    let checkedDays = 0
    while (checkedDays < 365) {
      checkedDays++
      const md = dayMap.get(cursor)

      if (!md || !md.goalDefined) {
        // Sem meta definida para o módulo no dia: não quebra nem conta
        cursor = subDaysFromDateKey(cursor, 1)
        continue
      }

      if (md.done) {
        streak++
        cursor = subDaysFromDateKey(cursor, 1)
      } else {
        // Dia com meta definida mas incompleto: quebrou a ofensiva
        break
      }
    }

    return streak
  },

  /**
   * Calcula o melhor streak histórico para o módulo.
   */
  async calculateBestModuleStreak(module: ModuleDayKey): Promise<number> {
    const all = await this.getAll()
    const moduleDays = all.filter((md) => md.module === module)
    if (moduleDays.length === 0) return 0

    // Ordena do dia mais antigo para o mais recente
    moduleDays.sort((a, b) => a.date.localeCompare(b.date))
    let maxStreak = 0
    let currentStreak = 0

    for (const rec of moduleDays) {
      if (!rec.goalDefined) {
        // Neutro: descanso no treino ou sem meta não zera nem soma
        continue
      }
      if (rec.done) {
        currentStreak++
        if (currentStreak > maxStreak) {
          maxStreak = currentStreak
        }
      } else {
        currentStreak = 0
      }
    }

    const current = await this.calculateModuleStreak(module)
    return Math.max(maxStreak, current)
  },

  /**
   * Migração retrocompatível do histórico:
   * Se existirem registros em day_summaries ou nos históricos individuais (leitura_historico, treino_log, escrita_notes, study_sessions)
   * que ainda não existam em module_days, povoa module_days preservando todo o histórico sem perda.
   */
  async migrateHistoricalData(): Promise<void> {
    const existingModuleDays = await this.getAll()
    const existingSet = new Set(existingModuleDays.map((md) => `${md.date}_${md.module}`))

    // 1. Coleta histórico de escrita
    const notes = await idb.getAll<any>(idb.STORE_ESCRITA)
    for (const note of notes) {
      const date = note.date
      const key = `${date}_escrita`
      if (date && !existingSet.has(key)) {
        await this.recordModuleDay(
          {
            date,
            module: 'escrita',
            goalDefined: true,
            done: true,
            source: 'auto',
            value: 1,
            doneAt: note.created || `${date}T12:00:00.000Z`,
          },
          true,
        )
        existingSet.add(key)
      }
    }

    // 2. Coleta histórico de leitura
    const readingLogs = await idb.getAll<any>(idb.STORE_LEITURA_HISTORICO)
    const readingByDate = new Map<string, number>()
    for (const log of readingLogs) {
      if (log.dateRead) {
        const cur = readingByDate.get(log.dateRead) || 0
        readingByDate.set(log.dateRead, cur + (log.pagesAdded || 0))
      }
    }
    for (const [date, pages] of readingByDate.entries()) {
      const key = `${date}_leitura`
      if (!existingSet.has(key)) {
        await this.recordModuleDay(
          {
            date,
            module: 'leitura',
            goalDefined: true,
            done: pages > 0,
            source: 'auto',
            value: pages,
            doneAt: `${date}T12:00:00.000Z`,
          },
          true,
        )
        existingSet.add(key)
      }
    }

    // 3. Coleta histórico de treino
    const workoutLogs = await idb.getAll<any>(idb.STORE_TREINO_LOG)
    for (const wl of workoutLogs) {
      const date = wl.day
      const key = `${date}_treino`
      if (date && !existingSet.has(key)) {
        const completedSets = (wl.completedSets || []).filter((s: any) => s.concluido).length
        await this.recordModuleDay(
          {
            date,
            module: 'treino',
            goalDefined: true,
            done: completedSets > 0,
            source: 'auto',
            value: completedSets,
            doneAt: wl.created || `${date}T12:00:00.000Z`,
          },
          true,
        )
        existingSet.add(key)
      }
    }

    // 4. Coleta histórico de estudos
    const studySessions = await idb.getAll<any>(idb.STORE_STUDY_SESSIONS)
    const studyByDate = new Map<string, number>()
    for (const ss of studySessions) {
      if (ss.date) {
        const cur = studyByDate.get(ss.date) || 0
        studyByDate.set(ss.date, cur + (ss.minutes || 0))
      }
    }
    for (const [date, minutes] of studyByDate.entries()) {
      const key = `${date}_estudos`
      if (!existingSet.has(key)) {
        await this.recordModuleDay(
          {
            date,
            module: 'estudos',
            goalDefined: true,
            done: minutes > 0,
            source: 'auto',
            value: minutes,
            doneAt: `${date}T12:00:00.000Z`,
          },
          true,
        )
        existingSet.add(key)
      }
    }

    // 5. Para qualquer day_summaries antigo existente sem module_days, garantir derivação consistente
    const summaries = await idb.getAll<DaySummary>(idb.STORE_DAY_SUMMARIES)
    for (const s of summaries) {
      const mDays = await this.getByDate(s.date)
      if (mDays.length === 0 && s.goalsTotal > 0) {
        // Se tinha metas fechadas, recria registro para não quebrar a sequência histórica
        if (s.closed) {
          await this.recordModuleDay(
            {
              date: s.date,
              module: 'leitura', // módulo placeholder consistente
              goalDefined: true,
              done: true,
              source: 'auto',
              value: 1,
            },
            true,
          )
        }
      }
    }
  },
}
