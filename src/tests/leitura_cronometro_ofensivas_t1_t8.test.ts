import { describe, it, expect, beforeEach } from 'vitest'
import { idb } from '../lib/indexedDb'
import { leituraRepository } from '../lib/repositories/leituraRepository'
import { moduleDaysRepository } from '../lib/repositories/moduleDaysRepository'
import { medalsRepository, MEDAL_CATALOG } from '../lib/repositories/medalsRepository'
import { readingTimerService } from '../lib/readingTimerService'
import { celebrationService } from '../lib/celebrationService'
import { settingsRepository } from '../lib/repositories/settingsRepository'
import { backupRepository } from '../lib/repositories/backupRepository'
import {
  getTodayDateKey,
  subDaysFromDateKey,
  addDaysToDateKey,
  getLocalDateKey,
} from '../lib/dateUtils'
import { Livro, TimerState } from '../lib/types'

describe('Parte 5/6: Leitura check-in, cronômetro, ofensivas, medalhas e lembretes (T1-T8)', () => {
  beforeEach(async () => {
    const stores = [
      idb.STORE_LIVROS,
      idb.STORE_LEITURA_HISTORICO,
      idb.STORE_MODULE_DAYS,
      idb.STORE_MEDALS,
      idb.STORE_DAY_SUMMARIES,
      idb.STORE_TIMER_STATE,
      idb.STORE_ESCRITA,
      idb.STORE_TREINO_PLANO,
      idb.STORE_TREINO_LOG,
    ]
    for (const s of stores) {
      try {
        await idb.clear(s)
      } catch {
        /* intentionally ignored */
      }
    }

    settingsRepository.saveSettings({
      theme: 'sistema',
      activeModules: {
        escrita: true,
        leitura: true,
        treino: true,
        estudos: true,
        trabalho: true,
      },
      hasSeenOnboarding: false,
      firstTimeWelcomeDismissed: false,
      userName: '',
      reminders: {
        enabled: true,
        celebrationsEnabled: true,
        leitura: { enabled: true, time: '20:00' },
        treino: { enabled: true, time: '18:00', relativeToSession: true },
        escrita: { enabled: true, time: '21:00' },
        tasks: true,
      },
    })
  })

  // T1: Check-in manual diário com desfazer
  it('T1: Check-in manual grava module_days (source=manual), concede medalha do dia e ao desfazer remove medalha', async () => {
    const today = getTodayDateKey()

    // 1. Executa check-in manual
    await leituraRepository.setManualCheckin(today, true)

    // Consulta status
    const status = await leituraRepository.getDayCheckinStatus(today)
    expect(status.isDone).toBe(true)
    expect(status.source).toBe('manual')
    expect(status.isManual).toBe(true)

    // Verifica module_days gravado
    const mDay = await moduleDaysRepository.getByDateAndModule(today, 'leitura')
    expect(mDay).toBeDefined()
    expect(mDay?.source).toBe('manual')
    expect(mDay?.done).toBe(true)
    expect(mDay?.goalDefined).toBe(true)

    // Verifica se a medalha "Meta do dia: Leitura" foi concedida
    const medal = await medalsRepository.getByKeyAndDate('daily_goal_leitura', today)
    expect(medal).toBeDefined()
    expect(medal?.key).toBe('daily_goal_leitura')

    // 2. Desfaz o check-in manual
    await leituraRepository.setManualCheckin(today, false)

    const statusAfter = await leituraRepository.getDayCheckinStatus(today)
    expect(statusAfter.isDone).toBe(false)
    expect(statusAfter.isManual).toBe(false)

    // Medalha diária deve ter sido revogada
    const medalAfter = await medalsRepository.getByKeyAndDate('daily_goal_leitura', today)
    expect(medalAfter).toBeUndefined()
  })

  // T2: Cronômetro de leitura: sobrevivência ao fechar app, pausar, retomar e gravação
  it('T2: Cronômetro sobrevive à recarga, calcula tempo decorrido, pausa, retoma e finaliza com source=timer', async () => {
    const today = getTodayDateKey()

    // Cria livro no acervo
    const book: Livro = {
      id: crypto.randomUUID(),
      title: 'Clean Code',
      author: 'Robert C. Martin',
      totalPages: 400,
      currentPage: 50,
      status: 'lendo',
      goal: { dailyPages: 20, dailyMinutes: 30 },
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    }
    await idb.put(idb.STORE_LIVROS, book)

    // 1. Inicia o timer
    await readingTimerService.startTimer({
      bookId: book.id,
      bookTitle: book.title,
      targetMinutes: 30,
    })

    let state = await readingTimerService.getTimerState()
    expect(state).not.toBeNull()
    expect(state?.status).toBe('running')
    expect(state?.bookId).toBe(book.id)

    // Simula sobrevivência ao fechamento do app com 120 segundos passados
    const pastTimeIso = new Date(Date.now() - 120 * 1000).toISOString()
    const rawTimer = await idb.get<TimerState>(idb.STORE_TIMER_STATE, 'reading_active')
    if (rawTimer) {
      rawTimer.startedAt = pastTimeIso
      await idb.put(idb.STORE_TIMER_STATE, rawTimer)
    }

    // Leitura do estado calcula tempo decorrido dinamicamente
    state = await readingTimerService.getTimerState()
    expect(state?.elapsedSeconds).toBeGreaterThanOrEqual(120)

    // 2. Pausar cronômetro
    await readingTimerService.pauseTimer()
    state = await readingTimerService.getTimerState()
    expect(state?.status).toBe('paused')
    expect(state?.elapsedSeconds).toBeGreaterThanOrEqual(120)

    // 3. Retomar cronômetro
    await readingTimerService.resumeTimer()
    state = await readingTimerService.getTimerState()
    expect(state?.status).toBe('running')

    // 4. Finaliza a sessão gravando leitura de 15 páginas em 25 minutos
    await readingTimerService.finishReadingSession({
      bookId: book.id,
      minutes: 25,
      pagesRead: 15,
      date: today,
    })

    // Timer state deve ser limpo
    const stateAfter = await readingTimerService.getTimerState()
    expect(stateAfter).toBeNull()

    // LeituraHistorico gravado
    const hist = await leituraRepository.getHistoricoByBook(book.id)
    expect(hist.length).toBe(1)
    expect(hist[0].pagesAdded).toBe(15)
    expect(hist[0].minutes).toBe(25)
    expect(hist[0].currentPage).toBe(65)

    // module_days atualizado com source = timer
    const mDay = await moduleDaysRepository.getByDateAndModule(today, 'leitura')
    expect(mDay).toBeDefined()
    expect(mDay?.source).toBe('timer')
    expect(mDay?.value).toBe(15)
  })

  // T3: Ofensiva de leitura por módulo: dias neutros não quebram, virada de dia e fuso
  it('T3: Ofensivas por módulo: dias neutros (sem metas) não quebram, e virada de dia respeita data local', async () => {
    const today = getTodayDateKey()
    const dMinus1 = subDaysFromDateKey(today, 1)
    const dMinus2 = subDaysFromDateKey(today, 2)
    const dMinus3 = subDaysFromDateKey(today, 3)

    // D-3: meta cumprida (done=true, goalDefined=true)
    await moduleDaysRepository.recordModuleDay(
      {
        date: dMinus3,
        module: 'leitura',
        goalDefined: true,
        done: true,
        source: 'auto',
        value: 20,
      },
      true,
    )

    // D-2: dia neutro / sem metas (goalDefined=false) -> NÃO QUEBRA NEM CONTA
    await moduleDaysRepository.recordModuleDay(
      {
        date: dMinus2,
        module: 'leitura',
        goalDefined: false,
        done: false,
        source: 'auto',
      },
      true,
    )

    // D-1: meta cumprida (done=true, goalDefined=true)
    await moduleDaysRepository.recordModuleDay(
      {
        date: dMinus1,
        module: 'leitura',
        goalDefined: true,
        done: true,
        source: 'auto',
        value: 25,
      },
      true,
    )

    // Hoje pendente ainda
    let streak = await moduleDaysRepository.calculateModuleStreak('leitura', today)
    // Streak até ontem = 2 dias (D-1 e D-3 contam, D-2 neutro pulado)
    expect(streak).toBe(2)

    // Cumpre a meta de hoje
    await moduleDaysRepository.recordModuleDay({
      date: today,
      module: 'leitura',
      goalDefined: true,
      done: true,
      source: 'auto',
      value: 30,
    })

    streak = await moduleDaysRepository.calculateModuleStreak('leitura', today)
    expect(streak).toBe(3)

    // Melhor ofensiva histórica
    const best = await moduleDaysRepository.calculateBestModuleStreak('leitura')
    expect(best).toBe(3)
  })

  // T4: Ofensiva do Treino com descanso planejado (dias neutros preservam sequência)
  it('T4: No Treino, dias de descanso planejados (goalDefined=false) preservam a sequência sem zerar', async () => {
    const today = getTodayDateKey()
    const dMinus1 = subDaysFromDateKey(today, 1) // ontem: descanso
    const dMinus2 = subDaysFromDateKey(today, 2) // anteontem: treino feito

    await moduleDaysRepository.recordModuleDay(
      {
        date: dMinus2,
        module: 'treino',
        goalDefined: true,
        done: true,
        source: 'auto',
      },
      true,
    )

    await moduleDaysRepository.recordModuleDay(
      {
        date: dMinus1,
        module: 'treino',
        goalDefined: false, // Descanso planejado
        done: false,
        source: 'auto',
      },
      true,
    )

    // Hoje cumpriu treino
    await moduleDaysRepository.recordModuleDay({
      date: today,
      module: 'treino',
      goalDefined: true,
      done: true,
      source: 'auto',
    })

    const streak = await moduleDaysRepository.calculateModuleStreak('treino', today)
    // Dia de descanso não quebrou: D-2 e Hoje somam 2 dias
    expect(streak).toBe(2)
  })

  // T5: Fuso horário e virada de dia (evita bug de UTC vs local)
  it('T5: getLocalDateKey e operações de data respeitam o fuso local mesmo às 23:59 e 00:01', () => {
    const lateNight = new Date(2025, 5, 15, 23, 59, 0)
    const earlyMorning = new Date(2025, 5, 16, 0, 1, 0)

    expect(getLocalDateKey(lateNight)).toBe('2025-06-15')
    expect(getLocalDateKey(earlyMorning)).toBe('2025-06-16')
    expect(addDaysToDateKey('2025-06-15', 1)).toBe('2025-06-16')
    expect(subDaysFromDateKey('2025-06-16', 1)).toBe('2025-06-15')
  })

  // T6: Catálogo de medalhas completo e concessão de ofensiva (3, 7, etc) e primeiro livro concluído
  it('T6: Catálogo de medalhas inclui marcos de ofensiva e primeiro livro concluído', async () => {
    const today = getTodayDateKey()

    // Verifica que catálogo tem as medalhas requeridas
    const keys = MEDAL_CATALOG.map((m) => m.key)
    expect(keys).toContain('daily_goal_leitura')
    expect(keys).toContain('daily_goal_treino')
    expect(keys).toContain('daily_goal_escrita')
    expect(keys).toContain('streak_3_leitura')
    expect(keys).toContain('streak_7_leitura')
    expect(keys).toContain('first_book_completed')

    // Conclui primeiro livro
    const bId = crypto.randomUUID()
    await idb.put(idb.STORE_LIVROS, {
      id: bId,
      title: 'Livro 1',
      author: 'Autor',
      status: 'concluido',
      currentPage: 100,
      totalPages: 100,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    })

    // Avalia medalhas com streak = 3
    const earned = await medalsRepository.evaluateMedalsForModule('leitura', today, 3)
    const earnedKeys = earned.map((m) => m.key)
    expect(earnedKeys).toContain('daily_goal_leitura')
    expect(earnedKeys).toContain('streak_3_leitura')
    expect(earnedKeys).toContain('first_book_completed')

    // Acumulador de metas do dia
    const totalDailyLeitura = await medalsRepository.countDailyGoalsForModule('leitura')
    expect(totalDailyLeitura).toBe(1)
  })

  // T7: Celebração executada uma vez por dia por módulo
  it('T7: celebrationService garante que celebração não se repita no mesmo dia/módulo', () => {
    const today = getTodayDateKey()
    celebrationService.resetCelebration('leitura', today)

    expect(celebrationService.hasCelebratedToday('leitura', today)).toBe(false)
    celebrationService.markCelebratedToday('leitura', today)
    expect(celebrationService.hasCelebratedToday('leitura', today)).toBe(true)

    // Outro módulo ainda não celebrou
    expect(celebrationService.hasCelebratedToday('treino', today)).toBe(false)
  })

  // T8: Backup inclui preferências de lembretes e celebrações sem perda
  it('T8: Backup exporta e importa configurações de lembretes e celebrações fielmente', async () => {
    const customReminders = {
      enabled: false,
      celebrationsEnabled: false,
      leitura: { enabled: true, time: '22:30' },
      treino: { enabled: false, time: '07:00', relativeToSession: false },
      escrita: { enabled: true, time: '23:15' },
      tasks: false,
    }

    settingsRepository.updateSettings({ reminders: customReminders })

    const backup = await backupRepository.exportAll()
    expect(backup.settings.reminders).toBeDefined()
    expect(backup.settings.reminders?.enabled).toBe(false)
    expect(backup.settings.reminders?.celebrationsEnabled).toBe(false)
    expect(backup.settings.reminders?.leitura.time).toBe('22:30')

    const validation = await backupRepository.validatePayload(backup)
    expect(validation.validPayload.settings.reminders?.leitura.time).toBe('22:30')
    expect(validation.validPayload.settings.reminders?.celebrationsEnabled).toBe(false)
  })
})
