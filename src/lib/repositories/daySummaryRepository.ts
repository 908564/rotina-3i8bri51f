import { idb } from '../indexedDb'
import { DaySummary } from '../types'
import { subDaysFromDateKey, getTodayDateKey } from '../dateUtils'

export const daySummaryRepository = {
  async getByDate(date: string): Promise<DaySummary | undefined> {
    return idb.get<DaySummary>(idb.STORE_DAY_SUMMARIES, date)
  },

  async getAll(): Promise<DaySummary[]> {
    return idb.getAll<DaySummary>(idb.STORE_DAY_SUMMARIES)
  },

  /**
   * Grava ou atualiza o resumo do dia.
   * Se for dia passado e já existir, não sobrescreve se o objetivo for imutabilidade,
   * mas para o dia atual ou na inicialização grava com updatedAt.
   */
  async save(summary: DaySummary): Promise<void> {
    await idb.put(idb.STORE_DAY_SUMMARIES, summary)
  },

  /**
   * Atualiza o resumo do dia de hoje com os valores atuais de metas.
   * Chamado sempre que um registro do dia muda.
   */
  async updateTodaySummary(
    goalsTotal: number,
    goalsDone: number,
    todayStr: string = getTodayDateKey(),
  ): Promise<DaySummary> {
    const existing = await this.getByDate(todayStr)
    const nowIso = new Date().toISOString()
    const closed = goalsTotal > 0 && goalsDone >= goalsTotal

    const item: DaySummary = {
      date: todayStr,
      goalsTotal,
      goalsDone,
      closed,
      createdAt: existing?.createdAt || nowIso,
      updatedAt: nowIso,
    }

    await idb.put(idb.STORE_DAY_SUMMARIES, item)
    return item
  },

  /**
   * Calcula a sequência (chama): conta os dias seguidos em que M > 0 e N = M (closed === true).
   * Dias com M = 0 não quebram nem aumentam a sequência.
   * Lê do armazenamento imutável day_summaries.
   */
  async calculateStreak(
    todayStr: string = getTodayDateKey(),
    todaySummary?: DaySummary,
  ): Promise<number> {
    const allSummaries = await this.getAll()
    const summaryMap = new Map<string, DaySummary>()
    for (const s of allSummaries) {
      summaryMap.set(s.date, s)
    }

    // Se fornecido o resumo de hoje em memória, substitui no map
    if (todaySummary) {
      summaryMap.set(todaySummary.date, todaySummary)
    }

    let streak = 0
    let cursor = todayStr

    const currentToday = summaryMap.get(todayStr)
    if (currentToday && currentToday.goalsTotal > 0 && currentToday.closed) {
      streak++
      cursor = subDaysFromDateKey(cursor, 1)
    } else {
      // Se hoje ainda não fechou ou tem M = 0, começamos a checar a partir de ontem
      cursor = subDaysFromDateKey(cursor, 1)
    }

    // Varre para trás até 365 dias
    let checkedDays = 0
    while (checkedDays < 365) {
      checkedDays++
      const day = summaryMap.get(cursor)

      if (!day || day.goalsTotal === 0) {
        // "Dias com M = 0 não quebram nem aumentam a sequência."
        cursor = subDaysFromDateKey(cursor, 1)
        continue
      }

      if (day.closed) {
        streak++
        cursor = subDaysFromDateKey(cursor, 1)
      } else {
        // Dia com metas mas incompleto: quebrou a sequência
        break
      }
    }

    return streak
  },
}
