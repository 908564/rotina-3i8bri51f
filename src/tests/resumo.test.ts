import { describe, it, expect, beforeEach } from 'vitest'
import { pluralWord, pluralize } from '../lib/plural'
import {
  computeWeekTitleAndLegend,
  computeDayIndicatorStatus,
  getWeekSummary,
  clearWeekSummaryCache,
  formatStudyTime,
} from '../lib/summaryService'
import { getWeekRangeFromMonday, getMondayForDateKey, formatWeekSubtitle } from '../lib/weekUtils'
import { trabalhoRepository } from '../lib/repositories/trabalhoRepository'
import { backupRepository } from '../lib/repositories/backupRepository'
import { daySummaryRepository } from '../lib/repositories/daySummaryRepository'
import { idb } from '../lib/indexedDb'
import { getTodayDateKey, subDaysFromDateKey, addDaysToDateKey } from '../lib/dateUtils'
import { DaySummary, Project } from '../lib/types'

describe('Nova Tela Resumo - Testes Automatizados de Regras de Negócio', () => {
  beforeEach(async () => {
    clearWeekSummaryCache()
    // Limpa stores relevantes
    const stores = [
      idb.STORE_DAY_SUMMARIES,
      idb.STORE_PROJECTS,
      idb.STORE_ACHIEVEMENTS,
      idb.STORE_TREINO_LOG,
      idb.STORE_TREINO_PLANO,
      idb.STORE_LIVROS,
      idb.STORE_LEITURA_HISTORICO,
      idb.STORE_ESCRITA,
      idb.STORE_COURSES,
      idb.STORE_STUDY_SESSIONS,
      idb.STORE_STUDY_GOALS,
    ]
    for (const s of stores) {
      try {
        await idb.clear(s)
      } catch {
        // ignora
      }
    }
  })

  // 1. Helper de Plural em Português
  it('1. Helper de Plural: concordância correta (1 vs N) e correção de "1 dias"', () => {
    expect(pluralize(1, 'dia')).toBe('1 dia')
    expect(pluralize(2, 'dia')).toBe('2 dias')
    expect(pluralize(0, 'dia')).toBe('0 dias')
    expect(pluralize(1, 'treino')).toBe('1 treino')
    expect(pluralize(3, 'treino')).toBe('3 treinos')
    expect(pluralize(1, 'conquista')).toBe('1 conquista')
    expect(pluralize(4, 'conquista')).toBe('4 conquistas')
    expect(pluralize(1, 'projeto')).toBe('1 projeto')
    expect(pluralize(2, 'projeto')).toBe('2 projetos')
    expect(pluralize(1, 'tarefa')).toBe('1 tarefa')
    expect(pluralize(5, 'tarefa')).toBe('5 tarefas')
    expect(pluralize(1, 'meta')).toBe('1 meta')
    expect(pluralize(2, 'meta')).toBe('2 metas')
    expect(pluralWord(1, 'dia')).toBe('dia')
    expect(pluralWord(2, 'dia')).toBe('dias')
  })

  // 2. Cálculo de X/Y e Título por razão
  it('2. Cálculo de X/Y e título por razão (r >= 80%, 50-79%, 1-49%, X=0, Y=0)', () => {
    // Y = 0 -> estado vazio
    const emptyCase = computeWeekTitleAndLegend(0, 0, true)
    expect(emptyCase.title).toBe('Sua semana começa aqui')
    expect(emptyCase.subtitle).toBe('Defina uma meta ou faça seu primeiro registro')

    // X = 0 (Y > 0) -> "Sem metas fechadas"
    const zeroClosed = computeWeekTitleAndLegend(0, 4, true)
    expect(zeroClosed.title).toBe('Sem metas fechadas')
    expect(zeroClosed.subtitle).toBe('0 de 4 dias fechados até hoje')

    // r >= 80% (4/5 = 80%) -> "Semana em bom ritmo"
    const rhythm = computeWeekTitleAndLegend(4, 5, true)
    expect(rhythm.title).toBe('Semana em bom ritmo')
    expect(rhythm.subtitle).toBe('4 de 5 dias fechados até hoje')

    // 50-79% (3/5 = 60%) -> "Semana consistente"
    const consistent = computeWeekTitleAndLegend(3, 5, true)
    expect(consistent.title).toBe('Semana consistente')
    expect(consistent.subtitle).toBe('3 de 5 dias fechados até hoje')

    // 1-49% (1/5 = 20%) -> "Semana mais leve"
    const light = computeWeekTitleAndLegend(1, 5, false)
    expect(light.title).toBe('Semana mais leve')
    expect(light.subtitle).toBe('1 de 5 dias fechados')

    // Singular correto de dia quando Y = 1
    const singleDay = computeWeekTitleAndLegend(1, 1, true)
    expect(singleDay.subtitle).toBe('1 de 1 dia fechado até hoje')
  })

  // 3. Indicadores da tira a partir exclusivamente de day_summaries
  it('3. Estados dos indicadores da tira (FECHADO, PARCIAL, SEM METAS, FUTURO) a partir de day_summaries', () => {
    const today = '2025-05-14' // Quarta-feira fictícia
    const futureDate = '2025-05-15'
    const pastDate = '2025-05-13'

    // Futuro
    const fut = computeDayIndicatorStatus(futureDate, today, undefined)
    expect(fut.status).toBe('futuro')

    // Sem metas no passado (goalsTotal = 0)
    const noGoals = computeDayIndicatorStatus(pastDate, today, {
      date: pastDate,
      goalsTotal: 0,
      goalsDone: 0,
      closed: false,
      createdAt: '',
      updatedAt: '',
    })
    expect(noGoals.status).toBe('sem_metas')

    // Fechado (goalsTotal > 0 && goalsDone >= goalsTotal && closed === true)
    const closed = computeDayIndicatorStatus(pastDate, today, {
      date: pastDate,
      goalsTotal: 3,
      goalsDone: 3,
      closed: true,
      createdAt: '',
      updatedAt: '',
    })
    expect(closed.status).toBe('fechado')
    expect(closed.fraction).toBe(1)

    // Parcial (goalsTotal > 0 && goalsDone < goalsTotal)
    const partial = computeDayIndicatorStatus(pastDate, today, {
      date: pastDate,
      goalsTotal: 5,
      goalsDone: 3,
      closed: false,
      createdAt: '',
      updatedAt: '',
    })
    expect(partial.status).toBe('parcial')
    expect(partial.fraction).toBe(0.6)
  })

  // 4. Regra de completedAt em tarefas de projeto
  it('4. completedAt em ProjectTask: preenchido ao marcar, limpo ao desmarcar, contagem na semana e preservação no backup', async () => {
    // Cria projeto com 2 tarefas
    const project = await trabalhoRepository.saveProject({
      name: 'Projeto App',
      description: 'Desc',
      status: 'em_andamento',
      tasks: [
        { id: 't1', title: 'Tarefa 1', completed: false },
        { id: 't2', title: 'Tarefa 2', completed: false },
      ],
    })

    expect(project.tasks[0].completedAt).toBeUndefined()

    // 1. Marca Tarefa 1
    const updated1 = await trabalhoRepository.toggleTask(project.id, 't1')
    expect(updated1?.tasks.find((t) => t.id === 't1')?.completed).toBe(true)
    const completedAt1 = updated1?.tasks.find((t) => t.id === 't1')?.completedAt
    expect(completedAt1).toBeDefined()
    expect(typeof completedAt1).toBe('string')

    // 2. Desmarca Tarefa 1 -> completedAt limpo
    const updated2 = await trabalhoRepository.toggleTask(project.id, 't1')
    expect(updated2?.tasks.find((t) => t.id === 't1')?.completed).toBe(false)
    expect(updated2?.tasks.find((t) => t.id === 't1')?.completedAt).toBeUndefined()

    // Marca Tarefa 2 com data desta semana
    await trabalhoRepository.toggleTask(project.id, 't2')

    // 3. Backup preserva o campo completedAt
    const backup = await backupRepository.exportAll()
    const projInBackup = backup.collections.projects?.find((p) => p.id === project.id)
    expect(projInBackup?.tasks.find((t) => t.id === 't2')?.completedAt).toBeDefined()

    // 4. Validação de importação preserva completedAt
    const validated = await backupRepository.validatePayload(backup)
    const projInValidated = validated.validPayload.collections.projects?.find((p) => p.id === project.id)
    expect(projInValidated?.tasks.find((t) => t.id === 't2')?.completedAt).toBeDefined()
  })

  // 5. Comparação Justa de Variação (mesmo número de dias na semana atual)
  it('5. Comparação justa na semana atual: usa o mesmo intervalo de dias da semana anterior', async () => {
    const today = getTodayDateKey()
    const monday = getMondayForDateKey(today)

    // Cria leituras na semana anterior nos mesmos dias e em dias extras
    const prevMonday = subDaysFromDateKey(monday, 7)
    // Registro na segunda passada: 20 páginas
    await idb.put(idb.STORE_LEITURA_HISTORICO, {
      id: crypto.randomUUID(),
      bookId: 'b1',
      dateRead: prevMonday,
      pagesAdded: 20,
      currentPage: 20,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    })
    // Registro no domingo passado (dia 7): 100 páginas (não deve entrar se hoje for segunda ou terça)
    const prevSunday = addDaysToDateKey(prevMonday, 6)
    await idb.put(idb.STORE_LEITURA_HISTORICO, {
      id: crypto.randomUUID(),
      bookId: 'b1',
      dateRead: prevSunday,
      pagesAdded: 100,
      currentPage: 120,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    })

    // Registro na semana atual hoje: 30 páginas
    await idb.put(idb.STORE_LEITURA_HISTORICO, {
      id: crypto.randomUUID(),
      bookId: 'b1',
      dateRead: today,
      pagesAdded: 30,
      currentPage: 150,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    })

    const summary = await getWeekSummary(monday, {
      leitura: true,
      treino: false,
      escrita: false,
      estudos: false,
      trabalho: false,
    })

    // Se hoje for anterior a domingo, os 100 do domingo passado NÃO devem distorcer a comparação justa
    expect(summary.modules.leitura.displayValue).toBe('30')
    expect(summary.modules.leitura.variation).toBeDefined()
    expect(summary.modules.leitura.variation?.type).not.toBeUndefined()
  })

  // 6. Subtítulo de intervalo da semana
  it('6. Subtítulo de intervalo da semana: trata mesmo mês, cruzamento de meses e semana atual', () => {
    const today = getTodayDateKey()
    // Caso 1: semana atual
    const currentMonday = getMondayForDateKey(today)
    const currentRange = getWeekRangeFromMonday(currentMonday, today)
    const subCurrent = formatWeekSubtitle(currentRange)
    expect(subCurrent).toContain('semana atual')

    // Caso 2: semana passada cruzando meses (ex: 28 de set. a 4 de out.)
    const crossMonthRange = getWeekRangeFromMonday('2025-09-29', today) // 29 de set a 5 de out de 2025
    const subCross = formatWeekSubtitle(crossMonthRange)
    expect(subCross).toContain('set.')
    expect(subCross).toContain('out.')
    expect(subCross).not.toContain('semana atual')
  })

  // 7. Formatação de minutos de estudo
  it('7. Formatação de minutos de estudos: exibe minutos diretos < 600 e Xh Ymin >= 600', () => {
    expect(formatStudyTime(120)).toBe('120')
    expect(formatStudyTime(599)).toBe('599')
    expect(formatStudyTime(600)).toBe('10h')
    expect(formatStudyTime(645)).toBe('10h 45min')
  })

  // 8. Ordem de prioridade do Destaque da Semana
  it('8. Ordem de prioridade do Destaque da Semana: nunca negativo, escolhe a primeira aplicável', async () => {
    const today = getTodayDateKey()
    const monday = getMondayForDateKey(today)

    // Se X > 0 e não há histórico anterior suficiente -> deve cair em consistência (regra 5)
    await daySummaryRepository.save({
      date: monday,
      goalsTotal: 2,
      goalsDone: 2,
      closed: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    const summary = await getWeekSummary(monday, {
      treino: true,
      leitura: true,
      escrita: true,
      estudos: true,
      trabalho: true,
    })

    expect(summary.highlight).toBeDefined()
    expect(summary.highlight?.title).toContain('Você fechou')
    expect(summary.highlight?.title).not.toMatch(/pior|ruim|fracasso|não conseguiu/i)
  })
})
