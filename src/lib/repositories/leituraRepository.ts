import { idb } from '../indexedDb'
import { getTodayDateKey, getDaysAgoKey, subDaysFromDateKey } from '../dateUtils'
import {
  Livro,
  LivroMeta,
  LivroMetaHistorico,
  LivroAnotacao,
  LeituraHistorico,
  ReadingGoalsProgress,
  BookGoalProgress,
} from '../types'

// Helper para obter meta vigente de um livro em uma determinada data (YYYY-MM-DD)
export function getBookGoalForDate(book: Livro, targetDate: string): LivroMeta | undefined {
  if (!book.goalHistory || book.goalHistory.length === 0) {
    return book.goal
  }

  // Ordena por effectiveDate ascendente
  const sorted = [...book.goalHistory].sort((a, b) =>
    a.effectiveDate.localeCompare(b.effectiveDate),
  )

  // Encontra a última alteração com effectiveDate <= targetDate
  let matched: LivroMeta | undefined = undefined
  for (const entry of sorted) {
    if (entry.effectiveDate <= targetDate) {
      matched = entry.meta
    } else {
      break
    }
  }

  // Se a primeira alteração foi depois da targetDate, mas o livro tem goal, ou antes
  if (matched !== undefined) {
    return matched
  }

  // Se não achou nenhuma com effectiveDate <= targetDate, usa a mais antiga registrada ou a atual
  return sorted[0]?.meta || book.goal
}

export const leituraRepository = {
  // Livros
  async getLivros(): Promise<Livro[]> {
    const list = await idb.getAll<Livro>(idb.STORE_LIVROS)
    return list.sort((a, b) => b.updated.localeCompare(a.updated))
  },

  async getLivroById(id: string): Promise<Livro | undefined> {
    return idb.get<Livro>(idb.STORE_LIVROS, id)
  },

  async saveLivro(
    data: Omit<Livro, 'id' | 'created' | 'updated'> & { id?: string },
  ): Promise<Livro> {
    const now = new Date().toISOString()
    const today = getTodayDateKey()
    let existing: Livro | undefined
    if (data.id) {
      existing = await this.getLivroById(data.id)
    }

    let status = data.status
    if (data.currentPage === 0 && (!data.totalPages || data.currentPage < data.totalPages)) {
      if (!existing && !data.status) status = 'quero_ler'
    } else if (data.totalPages && data.currentPage >= data.totalPages) {
      status = 'concluido'
    } else if (data.currentPage > 0) {
      status = 'lendo'
    }

    // Gerenciar histórico de metas caso a meta tenha sido informada ou alterada
    let goalHistory = existing?.goalHistory ? [...existing.goalHistory] : []
    const newGoal = data.goal

    if (newGoal) {
      // Checar se mudou em relação à meta anterior
      const prevGoal = existing?.goal
      const hasChanged =
        !prevGoal ||
        prevGoal.dailyPages !== newGoal.dailyPages ||
        prevGoal.dailyMinutes !== newGoal.dailyMinutes ||
        prevGoal.weeklyPages !== newGoal.weeklyPages ||
        prevGoal.weeklyMinutes !== newGoal.weeklyMinutes ||
        prevGoal.monthlyPages !== newGoal.monthlyPages ||
        prevGoal.monthlyMinutes !== newGoal.monthlyMinutes ||
        prevGoal.targetDate !== newGoal.targetDate

      if (hasChanged) {
        const historyEntry: LivroMetaHistorico = {
          id: crypto.randomUUID(),
          bookId: data.id || '',
          effectiveDate: today,
          meta: { ...newGoal },
          created: now,
        }
        goalHistory.push(historyEntry)
      }
    }

    const livroId = data.id || crypto.randomUUID()
    // Atualiza bookId nas entradas do histórico caso seja um livro novo
    goalHistory = goalHistory.map((gh) => ({ ...gh, bookId: livroId }))

    const livro: Livro = {
      id: livroId,
      title: data.title.trim(),
      author: data.author.trim(),
      totalPages: data.totalPages ? Number(data.totalPages) : undefined,
      currentPage: Math.max(0, Number(data.currentPage) || 0),
      status: status || 'quero_ler',
      coverPhoto: data.coverPhoto,
      goal: data.goal,
      goalHistory,
      created: existing ? existing.created : now,
      updated: now,
    }

    await idb.put(idb.STORE_LIVROS, livro)
    return livro
  },

  async updateLivroMeta(bookId: string, meta?: LivroMeta): Promise<Livro> {
    const livro = await this.getLivroById(bookId)
    if (!livro) throw new Error('Livro não encontrado')

    const now = new Date().toISOString()
    const today = getTodayDateKey()

    const goalHistory = livro.goalHistory ? [...livro.goalHistory] : []

    if (meta) {
      const historyEntry: LivroMetaHistorico = {
        id: crypto.randomUUID(),
        bookId,
        effectiveDate: today,
        meta: { ...meta },
        created: now,
      }
      goalHistory.push(historyEntry)
    }

    const updatedLivro: Livro = {
      ...livro,
      goal: meta,
      goalHistory,
      updated: now,
    }

    await idb.put(idb.STORE_LIVROS, updatedLivro)
    return updatedLivro
  },

  async deleteLivro(id: string): Promise<void> {
    // Coleta registros filhos para exclusão atômica em bloco
    const [anotacoes, historico] = await Promise.all([
      this.getAnotacoesByBook(id),
      this.getHistoricoByBook(id),
    ])

    await idb.runTransaction(
      [idb.STORE_LIVROS, idb.STORE_LIVRO_ANOTACOES, idb.STORE_LEITURA_HISTORICO],
      'readwrite',
      (tx) => {
        tx.objectStore(idb.STORE_LIVROS).delete(id)

        const anotacoesStore = tx.objectStore(idb.STORE_LIVRO_ANOTACOES)
        for (const a of anotacoes) {
          anotacoesStore.delete(a.id)
        }

        const histStore = tx.objectStore(idb.STORE_LEITURA_HISTORICO)
        for (const h of historico) {
          histStore.delete(h.id)
        }
      },
    )
  },

  // Anotações
  async getAnotacoesByBook(bookId: string): Promise<LivroAnotacao[]> {
    const all = await idb.getAll<LivroAnotacao>(idb.STORE_LIVRO_ANOTACOES)
    return all.filter((a) => a.bookId === bookId).sort((a, b) => b.created.localeCompare(a.created))
  },

  async saveAnotacao(data: {
    id?: string
    bookId: string
    page?: number
    text: string
  }): Promise<LivroAnotacao> {
    const now = new Date().toISOString()
    let existing: LivroAnotacao | undefined
    if (data.id) {
      existing = await idb.get<LivroAnotacao>(idb.STORE_LIVRO_ANOTACOES, data.id)
    }

    const anotacao: LivroAnotacao = {
      id: data.id || crypto.randomUUID(),
      bookId: data.bookId,
      page: data.page !== undefined && data.page !== null ? Number(data.page) : undefined,
      text: data.text.trim(),
      created: existing ? existing.created : now,
      updated: now,
    }

    await idb.put(idb.STORE_LIVRO_ANOTACOES, anotacao)
    return anotacao
  },

  async deleteAnotacao(id: string): Promise<void> {
    await idb.delete(idb.STORE_LIVRO_ANOTACOES, id)
  },

  // Histórico
  async getHistoricoByBook(bookId: string): Promise<LeituraHistorico[]> {
    const all = await idb.getAll<LeituraHistorico>(idb.STORE_LEITURA_HISTORICO)
    return all.filter((h) => h.bookId === bookId).sort((a, b) => b.created.localeCompare(a.created))
  },

  async getAllHistorico(): Promise<LeituraHistorico[]> {
    return idb.getAll<LeituraHistorico>(idb.STORE_LEITURA_HISTORICO)
  },

  async addReadingSession(params: {
    bookId: string
    pagesAdded?: number
    minutes?: number
    dateRead?: string
  }): Promise<{ history: LeituraHistorico; book: Livro }> {
    const livro = await this.getLivroById(params.bookId)
    if (!livro) throw new Error('Livro não encontrado')

    const pagesAdded = Math.max(0, Number(params.pagesAdded) || 0)
    const minutes =
      params.minutes !== undefined ? Math.max(0, Number(params.minutes) || 0) : undefined

    if (pagesAdded === 0 && (!minutes || minutes === 0)) {
      throw new Error('Informe ao menos páginas lidas ou minutos.')
    }

    const newCurrentPage = livro.currentPage + pagesAdded
    const finalPage = livro.totalPages ? Math.min(livro.totalPages, newCurrentPage) : newCurrentPage

    const now = new Date()
    const dateStr = params.dateRead || getTodayDateKey()

    // Salva a meta vigente do livro nesta data
    const effectiveGoal = getBookGoalForDate(livro, dateStr)

    const historyEntry: LeituraHistorico = {
      id: crypto.randomUUID(),
      bookId: params.bookId,
      dateRead: dateStr,
      pagesAdded,
      currentPage: finalPage,
      minutes,
      effectiveGoal,
      created: now.toISOString(),
      updated: now.toISOString(),
    }

    await idb.put(idb.STORE_LEITURA_HISTORICO, historyEntry)

    // Atualiza o livro (status avança automaticamente)
    let newStatus = livro.status
    if (finalPage > 0 && livro.status === 'quero_ler') {
      newStatus = 'lendo'
    }
    if (livro.totalPages && finalPage >= livro.totalPages) {
      newStatus = 'concluido'
    }

    const updatedLivro: Livro = {
      ...livro,
      currentPage: finalPage,
      status: newStatus,
      updated: now.toISOString(),
    }
    await idb.put(idb.STORE_LIVROS, updatedLivro)

    return { history: historyEntry, book: updatedLivro }
  },

  async deleteHistoricoEntry(id: string): Promise<void> {
    const entry = await idb.get<LeituraHistorico>(idb.STORE_LEITURA_HISTORICO, id)
    if (!entry) return
    await idb.delete(idb.STORE_LEITURA_HISTORICO, id)

    // Recalcular página do livro a partir dos registros restantes
    const remaining = await this.getHistoricoByBook(entry.bookId)
    const livro = await this.getLivroById(entry.bookId)
    if (livro) {
      const recalculatedPage = remaining.reduce((acc, curr) => acc + curr.pagesAdded, 0)
      const finalPage = livro.totalPages
        ? Math.min(livro.totalPages, recalculatedPage)
        : recalculatedPage
      let status = livro.status
      if (finalPage === 0) status = 'quero_ler'
      else if (livro.totalPages && finalPage >= livro.totalPages) status = 'concluido'
      else status = 'lendo'

      await idb.put(idb.STORE_LIVROS, {
        ...livro,
        currentPage: finalPage,
        status,
        updated: new Date().toISOString(),
      })
    }
  },

  // Metas dinâmicas consolidadas e por livro
  async getGoalsProgress(): Promise<ReadingGoalsProgress> {
    const allBooks = await this.getLivros()
    const allHistory = await this.getAllHistorico()
    const today = getTodayDateKey()
    const sevenDaysAgoStr = getDaysAgoKey(6)
    const thirtyDaysAgoStr = getDaysAgoKey(29)

    // Livros com status 'lendo'
    const readingBooks = allBooks.filter((b) => b.status === 'lendo')

    // Mapa de livros por id para consulta rápida
    const booksById = new Map<string, Livro>()
    allBooks.forEach((b) => booksById.set(b.id, b))

    // Progresso individual por livro
    const booksProgress: BookGoalProgress[] = readingBooks.map((book) => {
      const bookHistory = allHistory.filter((h) => h.bookId === book.id)

      const todayEntries = bookHistory.filter((h) => h.dateRead === today)
      const weekEntries = bookHistory.filter(
        (h) => h.dateRead >= sevenDaysAgoStr && h.dateRead <= today,
      )
      const monthEntries = bookHistory.filter(
        (h) => h.dateRead >= thirtyDaysAgoStr && h.dateRead <= today,
      )

      const todayP = todayEntries.reduce((s, h) => s + (h.pagesAdded || 0), 0)
      const todayM = todayEntries.reduce((s, h) => s + (h.minutes || 0), 0)

      const weekP = weekEntries.reduce((s, h) => s + (h.pagesAdded || 0), 0)
      const weekM = weekEntries.reduce((s, h) => s + (h.minutes || 0), 0)

      const monthP = monthEntries.reduce((s, h) => s + (h.pagesAdded || 0), 0)
      const monthM = monthEntries.reduce((s, h) => s + (h.minutes || 0), 0)

      const goal = book.goal
      const hasAnyGoal = Boolean(
        goal &&
        (goal.dailyPages ||
          goal.dailyMinutes ||
          goal.weeklyPages ||
          goal.weeklyMinutes ||
          goal.monthlyPages ||
          goal.monthlyMinutes),
      )

      return {
        book,
        dailyPagesTarget: goal?.dailyPages,
        dailyMinutesTarget: goal?.dailyMinutes,
        todayPages: todayP,
        todayMinutes: todayM,
        weeklyPagesTarget: goal?.weeklyPages,
        weeklyMinutesTarget: goal?.weeklyMinutes,
        weekPages: weekP,
        weekMinutes: weekM,
        monthlyPagesTarget: goal?.monthlyPages,
        monthlyMinutesTarget: goal?.monthlyMinutes,
        monthPages: monthP,
        monthMinutes: monthM,
        hasAnyGoal,
      }
    })

    // Totais consolidados apenas dos livros "lendo"
    let dailyPagesTarget = 0
    let dailyMinutesTarget = 0
    let weeklyPagesTarget = 0
    let weeklyMinutesTarget = 0
    let monthlyPagesTarget = 0
    let monthlyMinutesTarget = 0

    let hasAnyDefinedGoal = false

    readingBooks.forEach((book) => {
      if (book.goal) {
        if (book.goal.dailyPages) {
          dailyPagesTarget += book.goal.dailyPages
          hasAnyDefinedGoal = true
        }
        if (book.goal.dailyMinutes) {
          dailyMinutesTarget += book.goal.dailyMinutes
          hasAnyDefinedGoal = true
        }
        if (book.goal.weeklyPages) {
          weeklyPagesTarget += book.goal.weeklyPages
          hasAnyDefinedGoal = true
        }
        if (book.goal.weeklyMinutes) {
          weeklyMinutesTarget += book.goal.weeklyMinutes
          hasAnyDefinedGoal = true
        }
        if (book.goal.monthlyPages) {
          monthlyPagesTarget += book.goal.monthlyPages
          hasAnyDefinedGoal = true
        }
        if (book.goal.monthlyMinutes) {
          monthlyMinutesTarget += book.goal.monthlyMinutes
          hasAnyDefinedGoal = true
        }
      }
    })

    // Páginas e minutos totais lidos hoje, semana e mês (entre os livros "lendo" ou gerais)
    // O progresso de leitura deve contabilizar todos os registros de livros ativos
    const todayPages = booksProgress.reduce((s, bp) => s + bp.todayPages, 0)
    const todayMinutes = booksProgress.reduce((s, bp) => s + bp.todayMinutes, 0)
    const weekPages = booksProgress.reduce((s, bp) => s + bp.weekPages, 0)
    const weekMinutes = booksProgress.reduce((s, bp) => s + bp.weekMinutes, 0)
    const monthPages = booksProgress.reduce((s, bp) => s + bp.monthPages, 0)
    const monthMinutes = booksProgress.reduce((s, bp) => s + bp.monthMinutes, 0)

    // ==========================================
    // CÁLCULO DO STREAK (SEQUÊNCIA DE DIAS)
    // ==========================================
    // Regra:
    // A sequência de dias seguidos (streak) conta os dias em que a meta diária total
    // (soma dos livros "lendo" que têm meta) foi atingida.
    // Dias sem nenhum livro com meta não quebram nem aumentam a sequência.
    // Se a meta de um livro for alterada, o histórico dos dias passados NÃO deve ser recalculado:
    // cada dia mantém a meta que estava valendo naquela data.
    // Agrupamos registros por data:
    const historyByDate: Record<string, LeituraHistorico[]> = {}
    allHistory.forEach((h) => {
      if (!historyByDate[h.dateRead]) historyByDate[h.dateRead] = []
      historyByDate[h.dateRead].push(h)
    })

    // Função para calcular a meta vigente no dia dStr
    // e se o dia atingiu a meta ou se é neutro (sem metas)
    const evaluateDayGoal = (dStr: string): { hasTarget: boolean; isMet: boolean } => {
      // Para o dia em questão, quais eram as metas diárias vigentes dos livros que estavam em leitura?
      // Usamos a meta gravada no histórico do dia (se houver) OU consultamos getBookGoalForDate(livro, dStr).
      // Livros concluídos antes da data ou não lendo:
      // Consideramos os livros que possuem histórico ou que estão ativos.
      // Mais precisamente: para cada livro que estava ativo ou teve leitura nesse dia, pegamos a meta válida em dStr.
      // Se houver livros atualmente 'lendo' ou livros com effectiveGoal naquele dia:
      let targetPages = 0
      let targetMinutes = 0
      let hadAnyTarget = false

      // Livros 'lendo' atualmente:
      for (const book of readingBooks) {
        const goalAtDate = getBookGoalForDate(book, dStr)
        if (goalAtDate?.dailyPages) {
          targetPages += goalAtDate.dailyPages
          hadAnyTarget = true
        }
        if (goalAtDate?.dailyMinutes) {
          targetMinutes += goalAtDate.dailyMinutes
          hadAnyTarget = true
        }
      }

      // Se nenhum livro lendo tinha meta em dStr, checamos os effectiveGoals registrados no histórico desse dia
      const dayRecords = historyByDate[dStr] || []
      if (!hadAnyTarget && dayRecords.length > 0) {
        for (const rec of dayRecords) {
          if (rec.effectiveGoal?.dailyPages) {
            targetPages += rec.effectiveGoal.dailyPages
            hadAnyTarget = true
          }
          if (rec.effectiveGoal?.dailyMinutes) {
            targetMinutes += rec.effectiveGoal.dailyMinutes
            hadAnyTarget = true
          }
        }
      }

      if (!hadAnyTarget) {
        return { hasTarget: false, isMet: false }
      }

      const totalReadPages = dayRecords.reduce((s, r) => s + (r.pagesAdded || 0), 0)
      const totalReadMinutes = dayRecords.reduce((s, r) => s + (r.minutes || 0), 0)

      // Se tem meta de páginas E minutos, ou apenas páginas, ou apenas minutos:
      // O critério de cumprimento diário:
      // Se tiver meta de páginas, atingiu páginas? Se tiver minutos, atingiu minutos?
      // Se tiver ambas, o usuário cumpre atingindo páginas OU minutos (ou ambas se ambas definidas e atingidas).
      // Na prática habitual: se tiver meta de pág e/ou min, cumpre se totalReadPages >= targetPages (se targetPages > 0)
      // OU totalReadMinutes >= targetMinutes (se targetMinutes > 0).
      let met = true
      if (targetPages > 0 && totalReadPages < targetPages) {
        // Se também tinha meta de minutos e atingiu minutos, considera atingida a meta diária
        if (targetMinutes > 0 && totalReadMinutes >= targetMinutes) {
          met = true
        } else {
          met = false
        }
      } else if (targetMinutes > 0 && totalReadMinutes < targetMinutes) {
        if (targetPages > 0 && totalReadPages >= targetPages) {
          met = true
        } else {
          met = false
        }
      }

      return { hasTarget: true, isMet: met }
    }

    let streak = 0
    let cursorDateStr = today

    // Avalia o dia de hoje
    const todayEval = evaluateDayGoal(today)
    if (todayEval.hasTarget && todayEval.isMet) {
      streak++
      cursorDateStr = subDaysFromDateKey(cursorDateStr, 1)
    } else {
      // Se hoje ainda não atingiu ou não tem meta, começamos a checar a partir de ontem
      cursorDateStr = subDaysFromDateKey(cursorDateStr, 1)
    }

    // Varre para trás até 365 dias
    let daysChecked = 0
    while (daysChecked < 365) {
      daysChecked++
      const dayEval = evaluateDayGoal(cursorDateStr)

      if (!dayEval.hasTarget) {
        // "Dias sem nenhum livro com meta não quebram nem aumentam a sequência."
        cursorDateStr = subDaysFromDateKey(cursorDateStr, 1)
        continue
      }

      if (dayEval.isMet) {
        streak++
        cursorDateStr = subDaysFromDateKey(cursorDateStr, 1)
      } else {
        // Quebrou a sequência
        break
      }
    }

    return {
      hasGoals: hasAnyDefinedGoal,
      dailyPagesTarget,
      dailyMinutesTarget,
      todayPages,
      todayMinutes,
      weeklyPagesTarget,
      weeklyMinutesTarget,
      weekPages,
      weekMinutes,
      monthlyPagesTarget,
      monthlyMinutesTarget,
      monthPages,
      monthMinutes,
      streak,
      booksProgress,
    }
  },
}
