import { idb } from '../indexedDb'
import { Livro, LivroAnotacao, LeituraHistorico, ReadingGoalsProgress } from '../types'

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

    const livro: Livro = {
      id: data.id || crypto.randomUUID(),
      title: data.title.trim(),
      author: data.author.trim(),
      totalPages: data.totalPages ? Number(data.totalPages) : undefined,
      currentPage: Math.max(0, Number(data.currentPage) || 0),
      status: status || 'quero_ler',
      coverPhoto: data.coverPhoto,
      created: existing ? existing.created : now,
      updated: now,
    }

    await idb.put(idb.STORE_LIVROS, livro)
    return livro
  },

  async deleteLivro(id: string): Promise<void> {
    await idb.delete(idb.STORE_LIVROS, id)

    // Remove anotações e histórico associados
    const anotacoes = await this.getAnotacoesByBook(id)
    for (const a of anotacoes) {
      await idb.delete(idb.STORE_LIVRO_ANOTACOES, a.id)
    }
    const historico = await this.getHistoricoByBook(id)
    for (const h of historico) {
      await idb.delete(idb.STORE_LEITURA_HISTORICO, h.id)
    }
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
    pagesAdded: number
    dateRead?: string
    minutes?: number
  }): Promise<{ history: LeituraHistorico; book: Livro }> {
    const livro = await this.getLivroById(params.bookId)
    if (!livro) throw new Error('Livro não encontrado')

    const pagesAdded = Math.max(1, Number(params.pagesAdded))
    const newCurrentPage = livro.currentPage + pagesAdded
    const finalPage = livro.totalPages ? Math.min(livro.totalPages, newCurrentPage) : newCurrentPage

    const now = new Date()
    const dateStr = params.dateRead || now.toISOString().split('T')[0]

    const historyEntry: LeituraHistorico = {
      id: crypto.randomUUID(),
      bookId: params.bookId,
      dateRead: dateStr,
      pagesAdded,
      currentPage: finalPage,
      minutes: params.minutes,
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

  // Metas (20 pág/dia, 100 pág/semana, 430 pág/mês) e Streak
  async getGoalsProgress(): Promise<ReadingGoalsProgress> {
    const allHistory = await this.getAllHistorico()
    const today = new Date().toISOString().split('T')[0]

    // Páginas de hoje
    const todayPages = allHistory
      .filter((h) => h.dateRead === today)
      .reduce((sum, h) => sum + (h.pagesAdded || 0), 0)

    // Janela de 7 dias (semana móvel)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0]

    const weekPages = allHistory
      .filter((h) => h.dateRead >= sevenDaysAgoStr && h.dateRead <= today)
      .reduce((sum, h) => sum + (h.pagesAdded || 0), 0)

    // Janela de 30 dias (mês móvel)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29)
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0]

    const monthPages = allHistory
      .filter((h) => h.dateRead >= thirtyDaysAgoStr && h.dateRead <= today)
      .reduce((sum, h) => sum + (h.pagesAdded || 0), 0)

    // Calcular streak (dias consecutivos atingindo meta diária de 20 páginas)
    const pagesByDate: Record<string, number> = {}
    allHistory.forEach((h) => {
      pagesByDate[h.dateRead] = (pagesByDate[h.dateRead] || 0) + (h.pagesAdded || 0)
    })

    let streak = 0
    const cursor = new Date()
    // Checar hoje: se hoje atingiu a meta, conta hoje. Se ainda não atingiu mas ontem atingiu, começa a contar de ontem
    const todayMet = (pagesByDate[today] || 0) >= 20
    if (todayMet) {
      streak++
      cursor.setDate(cursor.getDate() - 1)
    } else {
      // Começar a checar de ontem
      cursor.setDate(cursor.getDate() - 1)
    }

    while (true) {
      const dStr = cursor.toISOString().split('T')[0]
      if ((pagesByDate[dStr] || 0) >= 20) {
        streak++
        cursor.setDate(cursor.getDate() - 1)
      } else {
        break
      }
    }

    return {
      dailyTarget: 20,
      weeklyTarget: 100,
      monthlyTarget: 430,
      todayPages,
      weekPages,
      monthPages,
      streak,
    }
  },
}
