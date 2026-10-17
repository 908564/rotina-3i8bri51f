import { idb } from '../indexedDb'
import { getTodayDateKey, getLocalDayOfWeek, parseLocalDate } from '../dateUtils'
import { settingsRepository } from './settingsRepository'
import { daySummaryRepository } from './daySummaryRepository'
import { estudosRepository } from './estudosRepository'
import { leituraRepository, getBookGoalForDate } from './leituraRepository'
import {
  EscritaNote,
  TreinoPlanoSemanal,
  TreinoLog,
  ReadingGoalsProgress,
  Livro,
  Course,
  StudySession,
  StudyGoal,
  Achievement,
  WorkNote,
  DaySummary,
} from '../types'

export interface TodayGoalItem {
  id: 'treino' | 'leitura' | 'escrita' | 'estudos'
  name: string
  active: boolean
  hasGoalToday: boolean
  isCompleted: boolean
  displayValue: string // e.g. "6/21", "25/30", "Feita", "45/60 min"
  displayTarget?: number
  displayCurrent?: number
  progressPercent: number
  legend: string // "séries de hoje", "páginas de hoje", "anotação do dia", "minutos de hoje"
  sublegend?: string // ex: "X/Y min na semana" quando estudos não tem meta diária mas tem semanal
}

export type NextStepActionType =
  | 'treino'
  | 'leitura'
  | 'estudos'
  | 'escrita'
  | 'all_completed'
  | 'setup_routine'

export interface NextStepInfo {
  type: NextStepActionType
  label: string
  title: string
  subtitle: string
  actionText: string
  payload?: any
}

export interface FastTodayData {
  dateStr: string
  dayOfWeek: number
  goalsTotal: number // M
  goalsDone: number // N
  streak: number
  headlineTitle: string
  headlineSubtitle: string
  nextStep: NextStepInfo
  goals: {
    treino?: TodayGoalItem
    leitura?: TodayGoalItem
    escrita?: TodayGoalItem
    estudos?: TodayGoalItem
  }
  treino: {
    plan?: TreinoPlanoSemanal
    log?: TreinoLog
    isRestDay: boolean
    isCompleted: boolean
    completedSetsCount: number
    totalSetsCount: number
    firstPendingSetIndex: number
  }
  leitura: {
    activeBook?: Livro
    todayPages: number
    todayMinutes: number
    targetPages: number
    targetMinutes: number
    isCompleted: boolean
    allActiveBooks: Livro[]
  }
  escrita: {
    hasNoteToday: boolean
    note?: EscritaNote
  }
  estudos: {
    activeCourses: Course[]
    todayMinutes: number
    targetDailyMinutes: number
    targetWeeklyMinutes: number
    weekMinutes: number
    isCompleted: boolean
    lastCourse?: Course
  }
  trabalho: {
    todayAchievementsCount: number
  }
}

/**
 * Consulta otimizada dos dados da tela Hoje em lote.
 * Carrega registros pertinentes de forma agregada por data / índices.
 */
export async function getFastTodayData(
  todayDateKey: string = getTodayDateKey(),
): Promise<FastTodayData> {
  const settings = settingsRepository.getSettings()
  const activeModules = settings.activeModules
  const dayOfWeek = getLocalDayOfWeek(parseLocalDate(todayDateKey))

  // Consultas paralelas em lojas IndexedDB
  const [
    allPlans,
    allLogs,
    livros,
    leituraHistoricos,
    escritaNotes,
    courses,
    studySessions,
    studyGoals,
    achievements,
  ] = await Promise.all([
    activeModules.treino
      ? idb.getAll<TreinoPlanoSemanal>(idb.STORE_TREINO_PLANO)
      : Promise.resolve([]),
    activeModules.treino ? idb.getAll<TreinoLog>(idb.STORE_TREINO_LOG) : Promise.resolve([]),
    activeModules.leitura ? idb.getAll<Livro>(idb.STORE_LIVROS) : Promise.resolve([]),
    activeModules.leitura ? idb.getAll<any>(idb.STORE_LEITURA_HISTORICO) : Promise.resolve([]),
    activeModules.escrita ? idb.getAll<EscritaNote>(idb.STORE_ESCRITA) : Promise.resolve([]),
    activeModules.estudos ? idb.getAll<Course>(idb.STORE_COURSES) : Promise.resolve([]),
    activeModules.estudos
      ? idb.getAll<StudySession>(idb.STORE_STUDY_SESSIONS)
      : Promise.resolve([]),
    activeModules.estudos ? idb.getAll<StudyGoal>(idb.STORE_STUDY_GOALS) : Promise.resolve([]),
    activeModules.trabalho ? idb.getAll<Achievement>(idb.STORE_ACHIEVEMENTS) : Promise.resolve([]),
  ])

  // ========================
  // 1. TREINO
  // ========================
  const plan = allPlans.find((p) => p.dayOfWeek === dayOfWeek)
  const log = allLogs.find((l) => l.day === todayDateKey)
  const isRestDay = !plan || !plan.exercises || plan.exercises.length === 0
  const totalPlannedSets = isRestDay
    ? 0
    : plan.exercises.reduce((sum, e) => sum + (e.series || 0), 0)
  const completedSetsCount =
    log && log.completedSets ? log.completedSets.filter((s) => s.concluido).length : 0
  const isTreinoCompleted =
    !isRestDay && totalPlannedSets > 0 && completedSetsCount >= totalPlannedSets

  // Descobre a primeira série pendente
  let firstPendingSetIndex = 0
  if (plan && plan.exercises) {
    let globalSetCounter = 0
    let found = false
    for (const ex of plan.exercises) {
      for (let sIdx = 0; sIdx < ex.series; sIdx++) {
        const isDone = log?.completedSets?.some(
          (cs) => cs.exercicioNome === ex.nome && cs.serieIndex === sIdx && cs.concluido,
        )
        if (!isDone) {
          firstPendingSetIndex = globalSetCounter
          found = true
          break
        }
        globalSetCounter++
      }
      if (found) break
    }
  }

  // ========================
  // 2. LEITURA
  // ========================
  const lendoLivros = livros.filter((l) => l.status === 'lendo')
  const activeBook = lendoLivros[0] || livros[0]
  const todayLeituraLogs = leituraHistoricos.filter((h) => h.dateRead === todayDateKey)
  const todayPages = todayLeituraLogs.reduce((acc, h) => acc + (h.pagesAdded || 0), 0)
  const todayReadingMinutes = todayLeituraLogs.reduce((acc, h) => acc + (h.minutes || 0), 0)

  // Metas diárias dos livros "lendo"
  let dailyPagesTarget = 0
  let dailyReadingMinutesTarget = 0
  for (const book of lendoLivros) {
    const goal = getBookGoalForDate(book, todayDateKey)
    if (goal) {
      if (goal.dailyPages && goal.dailyPages > 0) dailyPagesTarget += goal.dailyPages
      if (goal.dailyMinutes && goal.dailyMinutes > 0) dailyReadingMinutesTarget += goal.dailyMinutes
    }
  }

  const hasLeituraGoalToday = Boolean(dailyPagesTarget > 0 || dailyReadingMinutesTarget > 0)
  let isLeituraCompleted = false
  if (hasLeituraGoalToday) {
    const pagesOk = dailyPagesTarget === 0 || todayPages >= dailyPagesTarget
    const minutesOk =
      dailyReadingMinutesTarget === 0 || todayReadingMinutes >= dailyReadingMinutesTarget
    isLeituraCompleted = pagesOk && minutesOk
  }

  // ========================
  // 3. ESCRITA
  // ========================
  const todayNote = escritaNotes.find((n) => n.date === todayDateKey)
  const hasWritingText = Boolean(todayNote && todayNote.body && todayNote.body.trim().length > 0)
  const hasEscritaGoalToday = Boolean(activeModules.escrita)
  const isEscritaCompleted = hasWritingText

  // ========================
  // 4. ESTUDOS
  // ========================
  const emAndamentoCourses = courses.filter((c) => c.status === 'em_andamento')
  const todayStudySessions = studySessions.filter((s) => s.date === todayDateKey)
  const todayStudyMinutes = todayStudySessions.reduce((acc, s) => acc + (s.minutes || 0), 0)

  // Soma de metas diárias de cursos em andamento
  let totalDailyStudyTarget = 0
  let totalWeeklyStudyTarget = 0
  for (const c of emAndamentoCourses) {
    const g = studyGoals.find((goal) => goal.courseId === c.id)
    if (g) {
      const daily = estudosRepository.getEffectiveDailyGoalForDate(g, todayDateKey)
      const weekly = estudosRepository.getEffectiveWeeklyGoalForDate(g, todayDateKey)
      if (daily && daily > 0) totalDailyStudyTarget += daily
      if (weekly && weekly > 0) totalWeeklyStudyTarget += weekly
    }
  }

  // Semana de estudos (últimos 7 dias)
  const weekStartKey = new Date(Date.now() - 6 * 86400000).toISOString().substring(0, 10)
  const weekStudyMinutes = studySessions
    .filter((s) => s.date >= weekStartKey && s.date <= todayDateKey)
    .reduce((acc, s) => acc + (s.minutes || 0), 0)

  const hasEstudosGoalToday = totalDailyStudyTarget > 0
  const isEstudosCompleted = hasEstudosGoalToday && todayStudyMinutes >= totalDailyStudyTarget

  // Curso mais recente estudado ou em andamento
  let lastCourse: Course | undefined = undefined
  if (todayStudySessions.length > 0) {
    const lastSession = todayStudySessions[todayStudySessions.length - 1]
    lastCourse = courses.find((c) => c.id === lastSession.courseId)
  }
  if (!lastCourse) {
    lastCourse = emAndamentoCourses[0] || courses[0]
  }

  // ========================
  // 5. TRABALHO
  // ========================
  const todayAchievements = achievements.filter((a) => a.date === todayDateKey)

  // ========================
  // REGRAS DE METAS (M e N)
  // ========================
  let goalsTotal = 0
  let goalsDone = 0

  // Treino
  const treinoHasGoal = Boolean(activeModules.treino && !isRestDay && totalPlannedSets > 0)
  if (treinoHasGoal) {
    goalsTotal++
    if (isTreinoCompleted) goalsDone++
  }

  // Leitura
  const leituraHasGoal = Boolean(activeModules.leitura && hasLeituraGoalToday)
  if (leituraHasGoal) {
    goalsTotal++
    if (isLeituraCompleted) goalsDone++
  }

  // Escrita
  const escritaHasGoal = Boolean(activeModules.escrita)
  if (escritaHasGoal) {
    goalsTotal++
    if (isEscritaCompleted) goalsDone++
  }

  // Estudos
  const estudosHasGoal = Boolean(activeModules.estudos && hasEstudosGoalToday)
  if (estudosHasGoal) {
    goalsTotal++
    if (isEstudosCompleted) goalsDone++
  }

  // ========================
  // ATUALIZAÇÃO DO DAY_SUMMARIES DE HOJE
  // ========================
  const todaySummary = await daySummaryRepository.updateTodaySummary(
    goalsTotal,
    goalsDone,
    todayDateKey,
  )
  const streak = await daySummaryRepository.calculateStreak(todayDateKey, todaySummary)

  // ========================
  // MENSAGEM DO ANEL
  // ========================
  let headlineTitle = ''
  let headlineSubtitle = ''
  if (goalsTotal === 0) {
    headlineTitle = 'Defina sua primeira meta'
    headlineSubtitle = 'Escolha um módulo abaixo para começar.'
  } else if (goalsDone === 0) {
    headlineTitle = 'Vamos começar?'
    headlineSubtitle = 'Seu próximo passo está logo abaixo.'
  } else if (goalsDone < goalsTotal) {
    const diff = goalsTotal - goalsDone
    headlineTitle = 'Quase lá'
    headlineSubtitle =
      diff === 1 ? 'Falta 1 meta para fechar o dia.' : `Faltam ${diff} metas para fechar o dia.`
  } else {
    headlineTitle = 'Dia completo!'
    headlineSubtitle = 'Você cumpriu todas as metas de hoje.'
  }

  // ========================
  // PRÓXIMO PASSO
  // 1) Treino planejado para hoje e incompleto.
  // 2) Leitura com meta incompleta (livro com mais páginas restantes ou o último lido).
  // 3) Estudos com meta diária incompleta (curso com mais minutos restantes ou o de sessão mais recente); se não houver meta diária mas existir curso em andamento sem sessão hoje, sugerir "Estudar agora" apenas se nenhuma outra meta estiver pendente.
  // 4) Escrita sem anotação hoje.
  // 5) Todas as metas concluídas: card "Dia completo" com resumo de uma linha e botão "Ver resumo da semana".
  // 6) M = 0: card "Monte sua rotina" com 3 atalhos: "Cadastrar um livro", "Montar treino da semana", "Criar curso".
  // ========================
  let nextStep: NextStepInfo

  if (activeModules.treino && treinoHasGoal && !isTreinoCompleted) {
    const remainingSets = Math.max(0, totalPlannedSets - completedSetsCount)
    const exCount = plan?.exercises.length || 0
    nextStep = {
      type: 'treino',
      label: 'PRÓXIMO PASSO',
      title: plan?.workoutName || 'Treino de hoje',
      subtitle: `${exCount} exercícios · ${remainingSets} ${remainingSets === 1 ? 'série restante' : 'séries restantes'}`,
      actionText: completedSetsCount > 0 ? 'Continuar treino' : 'Começar treino',
      payload: { firstPendingSetIndex },
    }
  } else if (activeModules.leitura && leituraHasGoal && !isLeituraCompleted) {
    // Escolhe livro com mais páginas restantes ou o ativo
    let bestBook = activeBook
    if (lendoLivros.length > 1) {
      bestBook = [...lendoLivros].sort((a, b) => {
        const remA = (a.totalPages || 0) - a.currentPage
        const remB = (b.totalPages || 0) - b.currentPage
        return remB - remA
      })[0]
    }
    const bookTitle = bestBook?.title || 'Leitura diária'
    const pagesLeft = Math.max(0, dailyPagesTarget - todayPages)
    const subtitle =
      pagesLeft > 0
        ? `${pagesLeft} páginas restantes para atingir sua meta`
        : 'Meta de leitura em andamento'
    nextStep = {
      type: 'leitura',
      label: 'PRÓXIMO PASSO',
      title: bookTitle,
      subtitle,
      actionText: 'Registrar leitura',
      payload: { bookId: bestBook?.id },
    }
  } else if (activeModules.estudos && estudosHasGoal && !isEstudosCompleted) {
    // Cursos em andamento com meta diária
    const targetLeft = Math.max(0, totalDailyStudyTarget - todayStudyMinutes)
    nextStep = {
      type: 'estudos',
      label: 'PRÓXIMO PASSO',
      title: lastCourse?.name || 'Sessão de estudos',
      subtitle: `${targetLeft} min restantes hoje · ${lastCourse?.institution || 'Curso'}`,
      actionText: 'Estudar agora',
      payload: { courseId: lastCourse?.id },
    }
  } else if (activeModules.escrita && escritaHasGoal && !isEscritaCompleted) {
    nextStep = {
      type: 'escrita',
      label: 'PRÓXIMO PASSO',
      title: 'Anotação diária',
      subtitle: 'Registre seus pensamentos, aprendizados ou reflexões de hoje',
      actionText: 'Escrever agora',
    }
  } else if (
    activeModules.estudos &&
    !hasEstudosGoalToday &&
    emAndamentoCourses.length > 0 &&
    todayStudyMinutes === 0 &&
    goalsDone === goalsTotal &&
    goalsTotal > 0
  ) {
    // Regra 3 (segunda parte): se não houver meta diária mas existir curso em andamento sem sessão hoje,
    // sugerir "Estudar agora" apenas se nenhuma outra meta estiver pendente.
    nextStep = {
      type: 'estudos',
      label: 'PRÓXIMO PASSO',
      title: lastCourse?.name || 'Sessão de estudos',
      subtitle: `${lastCourse?.institution || 'Em andamento'} · Nenhuma sessão hoje`,
      actionText: 'Estudar agora',
      payload: { courseId: lastCourse?.id },
    }
  } else if (goalsTotal > 0 && goalsDone >= goalsTotal) {
    // 5) Todas as metas concluídas
    const parts: string[] = []
    if (activeModules.treino && treinoHasGoal) parts.push('treino')
    if (activeModules.leitura && leituraHasGoal) parts.push('leitura')
    if (activeModules.escrita && escritaHasGoal) parts.push('escrita')
    if (activeModules.estudos && estudosHasGoal) parts.push('estudo')
    const summaryLine =
      parts.length > 0
        ? `${parts.join(', ').replace(/, ([^,]*)$/, ' e $1')} feitos hoje`
        : 'Todas as metas foram cumpridas'
    nextStep = {
      type: 'all_completed',
      label: 'PARABÉNS',
      title: 'Dia completo',
      subtitle: summaryLine.charAt(0).toUpperCase() + summaryLine.slice(1),
      actionText: 'Ver resumo da semana',
    }
  } else {
    // 6) M = 0
    nextStep = {
      type: 'setup_routine',
      label: 'PRIMEIROS PASSOS',
      title: 'Monte sua rotina',
      subtitle: 'Defina suas metas diárias para acompanhar seu dia com clareza.',
      actionText: 'Começar agora',
    }
  }

  // ========================
  // MINI-CARTÕES (Grade 2x2)
  // ========================
  const goalCards: FastTodayData['goals'] = {}

  if (activeModules.treino) {
    const isCompleted = isTreinoCompleted
    const pct =
      totalPlannedSets > 0
        ? Math.min(100, Math.round((completedSetsCount / totalPlannedSets) * 100))
        : 0
    goalCards.treino = {
      id: 'treino',
      name: 'Treino',
      active: true,
      hasGoalToday: treinoHasGoal,
      isCompleted,
      displayValue: isRestDay ? 'Descanso' : `${completedSetsCount}/${totalPlannedSets}`,
      displayTarget: totalPlannedSets,
      displayCurrent: completedSetsCount,
      progressPercent: isRestDay ? 100 : pct,
      legend: isRestDay ? 'dia livre' : 'séries de hoje',
    }
  }

  if (activeModules.leitura) {
    const isCompleted = isLeituraCompleted
    let displayVal = `${todayPages} pág`
    let pct = 0
    if (dailyPagesTarget > 0) {
      displayVal = `${todayPages}/${dailyPagesTarget}`
      pct = Math.min(100, Math.round((todayPages / dailyPagesTarget) * 100))
    } else if (dailyReadingMinutesTarget > 0) {
      displayVal = `${todayReadingMinutes}/${dailyReadingMinutesTarget} min`
      pct = Math.min(100, Math.round((todayReadingMinutes / dailyReadingMinutesTarget) * 100))
    }
    goalCards.leitura = {
      id: 'leitura',
      name: 'Leitura',
      active: true,
      hasGoalToday: leituraHasGoal,
      isCompleted,
      displayValue: displayVal,
      progressPercent: pct,
      legend: 'páginas de hoje',
    }
  }

  if (activeModules.escrita) {
    goalCards.escrita = {
      id: 'escrita',
      name: 'Escrita',
      active: true,
      hasGoalToday: true,
      isCompleted: isEscritaCompleted,
      displayValue: isEscritaCompleted ? 'Feita' : 'Pendente',
      progressPercent: isEscritaCompleted ? 100 : 0,
      legend: 'anotação do dia',
    }
  }

  if (activeModules.estudos) {
    let displayVal = `${todayStudyMinutes} min`
    let pct = 0
    let sublegend: string | undefined = undefined

    if (totalDailyStudyTarget > 0) {
      displayVal = `${todayStudyMinutes}/${totalDailyStudyTarget} min`
      pct = Math.min(100, Math.round((todayStudyMinutes / totalDailyStudyTarget) * 100))
    } else if (totalWeeklyStudyTarget > 0) {
      // Sem meta diária definida, cartão mostra apenas os minutos de hoje, sem barra de meta e legenda X/Y min na semana
      displayVal = `${todayStudyMinutes} min`
      pct = 0
      sublegend = `${weekStudyMinutes}/${totalWeeklyStudyTarget} min na semana`
    }

    goalCards.estudos = {
      id: 'estudos',
      name: 'Estudos',
      active: true,
      hasGoalToday: totalDailyStudyTarget > 0,
      isCompleted: isEstudosCompleted,
      displayValue: displayVal,
      progressPercent: pct,
      legend: 'minutos de hoje',
      sublegend,
    }
  }

  return {
    dateStr: todayDateKey,
    dayOfWeek,
    goalsTotal,
    goalsDone,
    streak,
    headlineTitle,
    headlineSubtitle,
    nextStep,
    goals: goalCards,
    treino: {
      plan,
      log,
      isRestDay,
      isCompleted: isTreinoCompleted,
      completedSetsCount,
      totalSetsCount: totalPlannedSets,
      firstPendingSetIndex,
    },
    leitura: {
      activeBook,
      todayPages,
      todayMinutes: todayReadingMinutes,
      targetPages: dailyPagesTarget,
      targetMinutes: dailyReadingMinutesTarget,
      isCompleted: isLeituraCompleted,
      allActiveBooks: lendoLivros,
    },
    escrita: {
      hasNoteToday: isEscritaCompleted,
      note: todayNote,
    },
    estudos: {
      activeCourses: emAndamentoCourses,
      todayMinutes: todayStudyMinutes,
      targetDailyMinutes: totalDailyStudyTarget,
      targetWeeklyMinutes: totalWeeklyStudyTarget,
      weekMinutes: weekStudyMinutes,
      isCompleted: isEstudosCompleted,
      lastCourse,
    },
    trabalho: {
      todayAchievementsCount: todayAchievements.length,
    },
  }
}
