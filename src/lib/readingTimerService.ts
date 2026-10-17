import { idb } from './indexedDb'
import { TimerState, ReadingTimerState } from './types'

const READING_TIMER_ID = 'reading_active'

export const readingTimerService = {
  async getTimerState(): Promise<ReadingTimerState | null> {
    const raw = await idb.get<TimerState>(idb.STORE_TIMER_STATE, READING_TIMER_ID)
    if (!raw) return null

    let totalSeconds = raw.elapsedSeconds || 0
    if (raw.status === 'running' && raw.startedAt) {
      const diff = Math.floor((Date.now() - new Date(raw.startedAt).getTime()) / 1000)
      totalSeconds += Math.max(0, diff)
    }

    return {
      status: raw.status,
      startedAt: raw.startedAt,
      elapsedSeconds: totalSeconds,
      bookId: raw.metadata?.bookId,
      bookTitle: raw.metadata?.bookTitle,
      targetMinutes: raw.metadata?.targetMinutes,
      pausedAt: raw.metadata?.pausedAt,
    }
  },

  async startTimer(params: {
    bookId: string
    bookTitle: string
    targetMinutes?: number
  }): Promise<void> {
    const nowIso = new Date().toISOString()
    const existing = await idb.get<TimerState>(idb.STORE_TIMER_STATE, READING_TIMER_ID)
    const elapsed = existing && existing.status === 'paused' ? existing.elapsedSeconds || 0 : 0

    const state: TimerState = {
      id: READING_TIMER_ID,
      module: 'leitura',
      status: 'running',
      startedAt: nowIso,
      elapsedSeconds: elapsed,
      targetSeconds: params.targetMinutes ? params.targetMinutes * 60 : undefined,
      metadata: {
        bookId: params.bookId,
        bookTitle: params.bookTitle,
        targetMinutes: params.targetMinutes,
      },
      createdAt: existing?.createdAt || nowIso,
      updatedAt: nowIso,
    }

    await idb.put(idb.STORE_TIMER_STATE, state)
    this.notifyChange()
  },

  async pauseTimer(): Promise<void> {
    const current = await idb.get<TimerState>(idb.STORE_TIMER_STATE, READING_TIMER_ID)
    if (!current || current.status !== 'running') return

    const nowIso = new Date().toISOString()
    let elapsed = current.elapsedSeconds || 0
    if (current.startedAt) {
      const diff = Math.floor((Date.now() - new Date(current.startedAt).getTime()) / 1000)
      elapsed += Math.max(0, diff)
    }

    const state: TimerState = {
      ...current,
      status: 'paused',
      startedAt: undefined,
      elapsedSeconds: elapsed,
      metadata: {
        ...(current.metadata || {}),
        pausedAt: nowIso,
      },
      updatedAt: nowIso,
    }

    await idb.put(idb.STORE_TIMER_STATE, state)
    this.notifyChange()
  },

  async resumeTimer(): Promise<void> {
    const current = await idb.get<TimerState>(idb.STORE_TIMER_STATE, READING_TIMER_ID)
    if (!current || current.status !== 'paused') return

    const nowIso = new Date().toISOString()
    const state: TimerState = {
      ...current,
      status: 'running',
      startedAt: nowIso,
      updatedAt: nowIso,
    }

    await idb.put(idb.STORE_TIMER_STATE, state)
    this.notifyChange()
  },

  async discardTimer(): Promise<void> {
    await idb.delete(idb.STORE_TIMER_STATE, READING_TIMER_ID)
    this.notifyChange()
  },

  /**
   * Finaliza o cronômetro, gravando LeituraHistorico (source = timer),
   * atualizando páginas se informado, e gravando module_days com source = timer.
   */
  async finishReadingSession(params: {
    bookId: string
    minutes: number
    pagesRead?: number
    date?: string
  }): Promise<void> {
    const { leituraRepository } = await import('./repositories/leituraRepository')
    const { moduleDaysRepository } = await import('./repositories/moduleDaysRepository')
    const { medalsRepository } = await import('./repositories/medalsRepository')
    const { getTodayDateKey } = await import('./dateUtils')

    const dateStr = params.date || getTodayDateKey()
    const livro = await leituraRepository.getLivroById(params.bookId)
    if (!livro) throw new Error('Livro não encontrado.')

    const pages = Math.max(0, Number(params.pagesRead) || 0)
    const minutes = Math.max(1, Math.round(Number(params.minutes) || 1))

    // 1. Grava no histórico de leitura
    const { history, book: updatedBook } = await leituraRepository.addReadingSession({
      bookId: params.bookId,
      pagesAdded: pages,
      minutes,
      dateRead: dateStr,
    })

    // 2. Atualiza module_days com source = 'timer'
    const existingDay = await moduleDaysRepository.getByDateAndModule(dateStr, 'leitura')
    const effectiveGoal = history.effectiveGoal
    const targetP = effectiveGoal?.dailyPages || 0
    const targetM = effectiveGoal?.dailyMinutes || 0
    const hasGoal = targetP > 0 || targetM > 0
    const totalVal = (existingDay?.value || 0) + (pages || minutes)
    const metPages = targetP > 0 && totalVal >= targetP
    const metMinutes = targetM > 0 && minutes >= targetM
    const isDone = hasGoal ? metPages || metMinutes : totalVal > 0

    await moduleDaysRepository.recordModuleDay({
      date: dateStr,
      module: 'leitura',
      goalDefined: hasGoal || Boolean(existingDay?.goalDefined),
      done: isDone,
      source: 'timer',
      value: totalVal,
    })

    if (isDone || updatedBook.status === 'concluido') {
      const streak = await moduleDaysRepository.calculateModuleStreak('leitura', dateStr)
      await medalsRepository.evaluateMedalsForModule('leitura', dateStr, streak)
    }

    // 3. Limpa o timer_state
    await idb.delete(idb.STORE_TIMER_STATE, READING_TIMER_ID)
    this.notifyChange()
  },

  // Observador de eventos local
  listeners: new Set<() => void>(),

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  },

  notifyChange(): void {
    this.listeners.forEach((l) => {
      try {
        l()
      } catch {
        /* intentionally ignored */
      }
    })
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('rotina_reading_timer_changed'))
    }
  },
}
