import { describe, it, expect, beforeEach } from 'vitest'
import { idb } from '../lib/indexedDb'
import { hojeRepository } from '../lib/repositories/hojeRepository'
import { settingsRepository } from '../lib/repositories/settingsRepository'
import { daySummaryRepository } from '../lib/repositories/daySummaryRepository'
import { estudosRepository } from '../lib/repositories/estudosRepository'
import { leituraRepository } from '../lib/repositories/leituraRepository'
import { treinoRepository } from '../lib/repositories/treinoRepository'
import { escritaRepository } from '../lib/repositories/escritaRepository'
import { getTodayDateKey, getLocalDayOfWeek, subDaysFromDateKey, parseLocalDate } from '../lib/dateUtils'

describe('Regras de Negócio da Tela Hoje, Metas, Sequência e Próximo Passo', () => {
  beforeEach(async () => {
    // Limpa todas as stores relevantes
    const stores = [
      idb.STORE_ESCRITA,
      idb.STORE_LIVROS,
      idb.STORE_LEITURA_HISTORICO,
      idb.STORE_TREINO_PLANO,
      idb.STORE_TREINO_LOG,
      idb.STORE_COURSES,
      idb.STORE_STUDY_SESSIONS,
      idb.STORE_STUDY_GOALS,
      idb.STORE_DAY_SUMMARIES,
      idb.STORE_ACHIEVEMENTS,
    ]
    for (const s of stores) {
      try {
        await idb.clear(s)
      } catch { /* intentionally ignored */ }
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
    })
  })

  // 1. Caso M = 0: App vazio, nenhuma meta diária definida em treino, leitura ou estudos, e escrita desativada temporariamente
  it('1. Caso M = 0: anel "0 metas", headline "Defina sua primeira meta" e card "Monte sua rotina"', async () => {
    // Desativa escrita para ter M = 0 estrito
    settingsRepository.updateSettings({
      activeModules: { escrita: false, leitura: true, treino: true, estudos: true, trabalho: true },
    })

    const data = await hojeRepository.getFastTodayData()
    expect(data.goalsTotal).toBe(0)
    expect(data.goalsDone).toBe(0)
    expect(data.headlineTitle).toBe('Defina sua primeira meta')
    expect(data.headlineSubtitle).toBe('Escolha um módulo abaixo para começar.')
    expect(data.nextStep.type).toBe('setup_routine')
    expect(data.nextStep.title).toBe('Monte sua rotina')
  })

  // 2. Caso N = 0 (M > 0): Metas existem mas nenhuma foi iniciada
  it('2. Caso N = 0 (M > 0): headline "Vamos começar?" e Próximo Passo sugerido', async () => {
    const today = getTodayDateKey()
    const dow = getLocalDayOfWeek(parseLocalDate(today))

    // Cria plano de treino para hoje com 3 séries
    await idb.put(idb.STORE_TREINO_PLANO, {
      id: crypto.randomUUID(),
      dayOfWeek: dow,
      workoutName: 'Treino A',
      exercises: [{ id: 'e1', nome: 'Flexão', series: 3, repeticoes: 10, carga: 0 }],
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    })

    const data = await hojeRepository.getFastTodayData()
    expect(data.goalsTotal).toBeGreaterThan(0)
    expect(data.goalsDone).toBe(0)
    expect(data.headlineTitle).toBe('Vamos começar?')
    expect(data.headlineSubtitle).toBe('Seu próximo passo está logo abaixo.')
    expect(data.nextStep.type).toBe('treino')
    expect(data.nextStep.actionText).toBe('Começar treino')
  })

  // 3. Caso Parcial (0 < N < M): Mensagem "Quase lá" e singular/plural de metas faltantes
  it('3. Caso Parcial: "Quase lá" e frase com contagem de metas faltantes', async () => {
    const today = getTodayDateKey()
    const dow = getLocalDayOfWeek(parseLocalDate(today))

    // Treino hoje com 1 série
    await idb.put(idb.STORE_TREINO_PLANO, {
      id: crypto.randomUUID(),
      dayOfWeek: dow,
      workoutName: 'Treino Peito',
      exercises: [{ id: 'e1', nome: 'Flexão', series: 1, repeticoes: 10, carga: 0 }],
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    })

    // Livro com meta diária de 20 páginas
    const bookId = crypto.randomUUID()
    await idb.put(idb.STORE_LIVROS, {
      id: bookId,
      title: 'Livro Teste',
      author: 'Autor',
      status: 'lendo',
      currentPage: 0,
      goal: { dailyPages: 20 },
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    })

    // Completa apenas a escrita (N=1, M=3 [treino, leitura, escrita])
    await escritaRepository.saveNote(today, { title: 'Dia', body: 'Hoje foi ótimo', tags: [] })

    const data = await hojeRepository.getFastTodayData()
    expect(data.goalsTotal).toBe(3)
    expect(data.goalsDone).toBe(1)
    expect(data.headlineTitle).toBe('Quase lá')
    expect(data.headlineSubtitle).toBe('Faltam 2 metas para fechar o dia.')

    // Agora completa treino também -> falta 1 meta
    await idb.put(idb.STORE_TREINO_LOG, {
      id: crypto.randomUUID(),
      day: today,
      workoutName: 'Treino Peito',
      completedSets: [{ exercicioNome: 'Flexão', serieIndex: 0, carga: 0, repeticoes: 10, concluido: true }],
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    })

    const data2 = await hojeRepository.getFastTodayData()
    expect(data2.goalsDone).toBe(2)
    expect(data2.headlineSubtitle).toBe('Falta 1 meta para fechar o dia.')
  })

  // 4. Caso Completo (N = M, M > 0): "Dia completo!" e card com resumo de uma linha
  it('4. Caso Completo: "Dia completo!" e card "Dia completo" com resumo e botão "Ver resumo da semana"', async () => {
    const today = getTodayDateKey()

    // Somente escrita ativa para teste simples de fechamento
    settingsRepository.updateSettings({
      activeModules: { escrita: true, leitura: false, treino: false, estudos: false, trabalho: false },
    })

    await escritaRepository.saveNote(today, { title: 'Nota', body: 'Concluído com sucesso', tags: [] })

    const data = await hojeRepository.getFastTodayData()
    expect(data.goalsTotal).toBe(1)
    expect(data.goalsDone).toBe(1)
    expect(data.headlineTitle).toBe('Dia completo!')
    expect(data.headlineSubtitle).toBe('Você cumpriu todas as metas de hoje.')
    expect(data.nextStep.type).toBe('all_completed')
    expect(data.nextStep.title).toBe('Dia completo')
    expect(data.nextStep.actionText).toBe('Ver resumo da semana')
  })

  // 5. Estudos COM meta diária vs SEM meta diária
  it('5. Estudos COM meta diária entra nas metas do dia (N/M min); SEM meta diária NÃO entra na contagem', async () => {
    const today = getTodayDateKey()

    // Cria curso em andamento
    const courseId = crypto.randomUUID()
    await idb.put(idb.STORE_COURSES, {
      id: courseId,
      name: 'Curso React',
      institution: 'Online',
      status: 'em_andamento',
      startDate: today,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    })

    // Desativa outros para focar em estudos
    settingsRepository.updateSettings({
      activeModules: { escrita: false, leitura: false, treino: false, estudos: true, trabalho: false },
    })

    // CASO A: Sem meta diária (apenas meta semanal de 120 min)
    await idb.put(idb.STORE_STUDY_GOALS, {
      id: crypto.randomUUID(),
      courseId,
      weeklyMinutes: 120,
      history: [{ id: 'h1', courseId, effectiveDate: today, weeklyMinutes: 120, created: new Date().toISOString() }],
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    })

    const dataSemMetaDiaria = await hojeRepository.getFastTodayData()
    expect(dataSemMetaDiaria.goalsTotal).toBe(0)
    expect(dataSemMetaDiaria.goals.estudos?.hasGoalToday).toBe(false)
    expect(dataSemMetaDiaria.goals.estudos?.displayValue).toBe('0 min')
    expect(dataSemMetaDiaria.goals.estudos?.sublegend).toContain('na semana')

    // CASO B: Com meta diária (45 min)
    await idb.put(idb.STORE_STUDY_GOALS, {
      id: crypto.randomUUID(),
      courseId,
      weeklyMinutes: 120,
      dailyMinutes: 45,
      history: [
        {
          id: 'h2',
          courseId,
          effectiveDate: today,
          weeklyMinutes: 120,
          dailyMinutes: 45,
          created: new Date().toISOString(),
        },
      ],
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    })

    const dataComMetaDiaria = await hojeRepository.getFastTodayData()
    expect(dataComMetaDiaria.goalsTotal).toBe(1)
    expect(dataComMetaDiaria.goals.estudos?.hasGoalToday).toBe(true)
    expect(dataComMetaDiaria.goals.estudos?.displayValue).toBe('0/45 min')

    // Registra 50 min de estudo -> meta de estudos concluída
    await idb.put(idb.STORE_STUDY_SESSIONS, {
      id: crypto.randomUUID(),
      courseId,
      date: today,
      minutes: 50,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    })

    const dataEstudosFeito = await hojeRepository.getFastTodayData()
    expect(dataEstudosFeito.goalsDone).toBe(1)
    expect(dataEstudosFeito.goals.estudos?.isCompleted).toBe(true)
    expect(dataEstudosFeito.goals.estudos?.displayValue).toBe('50/45 min')
  })

  // 6. Sequência (chama) e Resumo Imutável day_summaries
  it('6. Sequência não quebra em dias sem metas (M = 0) e alteração de meta hoje NÃO recalcula dias passados', async () => {
    const today = getTodayDateKey()
    const d1 = subDaysFromDateKey(today, 3) // Dia 1: fechado (M=2, N=2)
    const d2 = subDaysFromDateKey(today, 2) // Dia 2: sem metas (M=0)
    const d3 = subDaysFromDateKey(today, 1) // Dia 3: fechado (M=1, N=1)

    // Grava histórico em day_summaries
    await daySummaryRepository.save({
      date: d1,
      goalsTotal: 2,
      goalsDone: 2,
      closed: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    await daySummaryRepository.save({
      date: d2,
      goalsTotal: 0,
      goalsDone: 0,
      closed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    await daySummaryRepository.save({
      date: d3,
      goalsTotal: 1,
      goalsDone: 1,
      closed: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    // Sequência até ontem deve ser 2 dias seguidos (d3 e d1 contam, d2 sem metas não quebra nem aumenta)
    const streak = await daySummaryRepository.calculateStreak(today)
    expect(streak).toBe(2)

    // Mudança de meta hoje em estudos ou leitura: o dia passado d1 continua com seu resumo intacto
    const summaryD1 = await daySummaryRepository.getByDate(d1)
    expect(summaryD1?.goalsTotal).toBe(2)
    expect(summaryD1?.closed).toBe(true)
  })

  // 7. Ordem de prioridade do "Próximo passo"
  it('7. Ordem do Próximo Passo: Treino > Leitura > Estudos > Escrita', async () => {
    const today = getTodayDateKey()
    const dow = getLocalDayOfWeek(parseLocalDate(today))

    // Ativa treino incompleto, leitura incompleta, estudos incompleto e escrita vazia
    await idb.put(idb.STORE_TREINO_PLANO, {
      id: crypto.randomUUID(),
      dayOfWeek: dow,
      workoutName: 'Treino Prioridade',
      exercises: [{ id: 'e1', nome: 'Agachamento', series: 3, repeticoes: 10, carga: 20 }],
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    })

    await idb.put(idb.STORE_LIVROS, {
      id: crypto.randomUUID(),
      title: 'O Hobbit',
      author: 'Tolkien',
      status: 'lendo',
      currentPage: 10,
      totalPages: 300,
      goal: { dailyPages: 15 },
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    })

    const courseId = crypto.randomUUID()
    await idb.put(idb.STORE_COURSES, {
      id: courseId,
      name: 'Curso TypeScript',
      institution: 'Escola',
      status: 'em_andamento',
      startDate: today,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    })
    await idb.put(idb.STORE_STUDY_GOALS, {
      id: crypto.randomUUID(),
      courseId,
      dailyMinutes: 30,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    })

    // Passo 1: Treino pendente tem prioridade absoluta
    let data = await hojeRepository.getFastTodayData()
    expect(data.nextStep.type).toBe('treino')

    // Conclui treino -> agora prioridade é Leitura
    await idb.put(idb.STORE_TREINO_LOG, {
      id: crypto.randomUUID(),
      day: today,
      workoutName: 'Treino Prioridade',
      completedSets: [
        { exercicioNome: 'Agachamento', serieIndex: 0, carga: 20, repeticoes: 10, concluido: true },
        { exercicioNome: 'Agachamento', serieIndex: 1, carga: 20, repeticoes: 10, concluido: true },
        { exercicioNome: 'Agachamento', serieIndex: 2, carga: 20, repeticoes: 10, concluido: true },
      ],
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    })

    data = await hojeRepository.getFastTodayData()
    expect(data.nextStep.type).toBe('leitura')

    // Conclui leitura -> agora prioridade é Estudos
    await idb.put(idb.STORE_LEITURA_HISTORICO, {
      id: crypto.randomUUID(),
      bookId: 'any',
      dateRead: today,
      pagesAdded: 20,
      currentPage: 30,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    })

    data = await hojeRepository.getFastTodayData()
    expect(data.nextStep.type).toBe('estudos')

    // Conclui estudos -> agora prioridade é Escrita
    await idb.put(idb.STORE_STUDY_SESSIONS, {
      id: crypto.randomUUID(),
      courseId,
      date: today,
      minutes: 35,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    })

    data = await hojeRepository.getFastTodayData()
    expect(data.nextStep.type).toBe('escrita')

    // Conclui escrita -> tudo concluído!
    await escritaRepository.saveNote(today, { title: 'Fim', body: 'Dia fechado', tags: [] })
    data = await hojeRepository.getFastTodayData()
    expect(data.nextStep.type).toBe('all_completed')
  })
})
