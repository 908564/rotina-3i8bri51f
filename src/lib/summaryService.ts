import { idb } from '@/lib/indexedDb'
import {
  DaySummary,
  TreinoLog,
  TreinoPlanoSemanal,
  Livro,
  LeituraHistorico,
  EscritaNote,
  Course,
  StudySession,
  StudyGoal,
  Project,
  Achievement,
} from '@/lib/types'
import {
  getTodayDateKey,
  subDaysFromDateKey,
  addDaysToDateKey,
  parseLocalDate,
  getLocalDayOfWeek,
} from '@/lib/dateUtils'
import { daySummaryRepository } from '@/lib/repositories/daySummaryRepository'
import { estudosRepository } from '@/lib/repositories/estudosRepository'
import { pluralWord, pluralize } from '@/lib/plural'
import { WeekRange, getWeekRangeFromMonday, getMondayForDateKey } from '@/lib/weekUtils'

export type DayStatusType = 'fechado' | 'parcial' | 'sem_metas' | 'futuro'

export interface DayBarIndicator {
  date: string
  dayLetter: string // "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"
  dayNumber: number
  isToday: boolean
  status: DayStatusType
  goalsTotal: number
  goalsDone: number
  fraction: number // 0 to 1
  ariaLabel: string
}

export interface ModuleWeekMetrics {
  active: boolean
  displayValue: string // "4", "86", "—"
  unit: string // "treino(s)", "págs", "dia(s)", "min", "conquista(s)"
  legend: string
  dailyBars: {
    date: string
    dayInitial: string // 'S' | 'T' | 'Q' | 'Q' | 'S' | 'S' | 'D'
    value: number
    isToday: boolean
    isFuture: boolean
    ariaLabel: string
  }[]
  maxDailyValue: number
  variation?: {
    diff: number
    type: 'up' | 'down' | 'equal'
    label: string // "+12", "-20", "Igual"
  }
}

export interface WeekSummaryData {
  range: WeekRange
  todayStr: string
  canGoNext: boolean
  canGoPrev: boolean
  streak: number

  // Card da Semana
  daysIndicators: DayBarIndicator[]
  closedDaysCount: number // X
  elapsedDaysWithGoalsCount: number // Y
  hasNoGoalsWeek: boolean // Y === 0
  weekTitle: string
  weekSubtitle: string

  // Destaque
  highlight?: {
    title: string
    subtitle: string
  }

  // Módulos
  modules: {
    treino: ModuleWeekMetrics
    leitura: ModuleWeekMetrics
    escrita: ModuleWeekMetrics
    estudos: ModuleWeekMetrics
    trabalho: ModuleWeekMetrics
  }
}

const DAY_ABBRS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
const DAY_INITIALS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D']
const DAY_FULL_NAMES = [
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
  'Domingo',
]

/**
 * Determina o status do indicador diário a partir exclusivamente de DaySummary e da posição do dia.
 */
export function computeDayIndicatorStatus(
  dayStr: string,
  todayStr: string,
  summary?: DaySummary,
): { status: DayStatusType; fraction: number; ariaLabel: string } {
  const isFuture = dayStr > todayStr
  const dowSegIdx = (() => {
    const dow = getLocalDayOfWeek(parseLocalDate(dayStr)) // 0=Dom, 1=Seg..
    return dow === 0 ? 6 : dow - 1
  })()
  const dayName = DAY_FULL_NAMES[dowSegIdx]
  const dayNum = parseInt(dayStr.substring(8, 10), 10)

  if (isFuture) {
    return {
      status: 'futuro',
      fraction: 0,
      ariaLabel: `${dayName}, ${dayNum}: dia futuro`,
    }
  }

  const goalsTotal = summary?.goalsTotal ?? 0
  const goalsDone = summary?.goalsDone ?? 0

  if (goalsTotal === 0) {
    return {
      status: 'sem_metas',
      fraction: 0,
      ariaLabel: `${dayName}, ${dayNum}: sem metas`,
    }
  }

  if (goalsDone >= goalsTotal && summary?.closed) {
    return {
      status: 'fechado',
      fraction: 1,
      ariaLabel: `${dayName}, ${dayNum}: todas as metas concluídas`,
    }
  }

  const frac = goalsTotal > 0 ? goalsDone / goalsTotal : 0
  return {
    status: 'parcial',
    fraction: frac,
    ariaLabel: `${dayName}, ${dayNum}: ${goalsDone} de ${goalsTotal} metas concluídas`,
  }
}

/**
 * Calcula o título da semana com base na razão r = X / Y e nas regras de negócio:
 * Y = 0: estado vazio
 * r ≥ 80%: "Semana em bom ritmo"
 * 50–79%: "Semana consistente"
 * 1–49%: "Semana mais leve"
 * X = 0: "Sem metas fechadas"
 */
export function computeWeekTitleAndLegend(
  X: number,
  Y: number,
  isCurrentWeek: boolean,
): { title: string; subtitle: string } {
  if (Y === 0) {
    return {
      title: 'Sua semana começa aqui',
      subtitle: 'Defina uma meta ou faça seu primeiro registro',
    }
  }

  let title = ''
  if (X === 0) {
    title = 'Sem metas fechadas'
  } else {
    const ratio = X / Y
    if (ratio >= 0.8) {
      title = 'Semana em bom ritmo'
    } else if (ratio >= 0.5) {
      title = 'Semana consistente'
    } else {
      title = 'Semana mais leve'
    }
  }

  const daysWord = pluralWord(Y, 'dia')
  let subtitle = ''
  if (isCurrentWeek) {
    subtitle = `${X} de ${Y} ${daysWord} fechados até hoje`
  } else {
    subtitle = `${X} de ${Y} ${daysWord} fechados`
  }

  return { title, subtitle }
}

/**
 * Helper de formatação de minutos de estudo (a partir de 600 min exibe "Xh Ymin" ou "Xh").
 */
export function formatStudyTime(minutes: number): string {
  if (minutes < 600) {
    return `${minutes}`
  }
  const hours = Math.floor(minutes / 60)
  const remMinutes = minutes % 60
  if (remMinutes === 0) {
    return `${hours}h`
  }
  return `${hours}h ${remMinutes}min`
}

/**
 * Cache em memória para até 16 semanas. Invalidado se registros mudarem.
 */
interface CacheEntry {
  key: string // mondayStr
  data: WeekSummaryData
  timestamp: number
}
let weekCache: CacheEntry[] = []

export function clearWeekSummaryCache(): void {
  weekCache = []
}

/**
 * Carrega e computa o resumo da semana inteira de maneira agregada e performática.
 */
export async function getWeekSummary(
  targetMondayStr: string,
  activeModules: Record<string, boolean>,
): Promise<WeekSummaryData> {
  const todayStr = getTodayDateKey()
  const range = getWeekRangeFromMonday(targetMondayStr, todayStr)

  // As semanas anteriores necessárias para comparações e destaques (últimas 8 semanas a partir da selecionada)
  const mondays8: string[] = []
  for (let i = 0; i < 8; i++) {
    mondays8.push(subDaysFromDateKey(targetMondayStr, i * 7))
  }
  const oldestDateQueried = mondays8[7]
  const newestDateQueried = range.sunday

  // Garante que cada módulo esteja ativo por padrão se não for explicitamente desativado (false)
  const isTreinoActive = activeModules?.treino !== false
  const isLeituraActive = activeModules?.leitura !== false
  const isEscritaActive = activeModules?.escrita !== false
  const isEstudosActive = activeModules?.estudos !== false
  const isTrabalhoActive = activeModules?.trabalho !== false

  // Consultas paralelas agregadas com índices de data
  const [
    allSummaries,
    allLogs,
    allPlans,
    allLeituraHist,
    allNotes,
    allStudySessions,
    allStudyGoals,
    allProjects,
    allAchievements,
  ] = await Promise.all([
    idb.getAll<DaySummary>(idb.STORE_DAY_SUMMARIES),
    isTreinoActive ? idb.getAll<TreinoLog>(idb.STORE_TREINO_LOG) : Promise.resolve([]),
    isTreinoActive ? idb.getAll<TreinoPlanoSemanal>(idb.STORE_TREINO_PLANO) : Promise.resolve([]),
    isLeituraActive
      ? idb.getAll<LeituraHistorico>(idb.STORE_LEITURA_HISTORICO)
      : Promise.resolve([]),
    isEscritaActive ? idb.getAll<EscritaNote>(idb.STORE_ESCRITA) : Promise.resolve([]),
    isEstudosActive ? idb.getAll<StudySession>(idb.STORE_STUDY_SESSIONS) : Promise.resolve([]),
    isEstudosActive ? idb.getAll<StudyGoal>(idb.STORE_STUDY_GOALS) : Promise.resolve([]),
    isTrabalhoActive ? idb.getAll<Project>(idb.STORE_PROJECTS) : Promise.resolve([]),
    isTrabalhoActive ? idb.getAll<Achievement>(idb.STORE_ACHIEVEMENTS) : Promise.resolve([]),
  ])

  // Busca se há registros em semanas ANTERIORES à selecionada para habilitar/desabilitar botão ‹
  let hasOlderRecords = false
  const priorToThisMonday = targetMondayStr
  if (
    allSummaries.some((s) => s.date < priorToThisMonday && (s.goalsTotal > 0 || s.goalsDone > 0))
  ) {
    hasOlderRecords = true
  } else if (allLogs.some((l) => l.day < priorToThisMonday)) {
    hasOlderRecords = true
  } else if (allLeituraHist.some((h) => h.dateRead < priorToThisMonday)) {
    hasOlderRecords = true
  } else if (allNotes.some((n) => n.date < priorToThisMonday && n.body?.trim())) {
    hasOlderRecords = true
  } else if (allStudySessions.some((s) => s.date < priorToThisMonday)) {
    hasOlderRecords = true
  } else if (allAchievements.some((a) => a.date < priorToThisMonday)) {
    hasOlderRecords = true
  } else if (
    allProjects.some((p) =>
      p.tasks?.some((t) => t.completedAt && t.completedAt.substring(0, 10) < priorToThisMonday),
    )
  ) {
    hasOlderRecords = true
  }

  // O botão › fica desabilitado na semana atual
  const currentWeekMonday = getMondayForDateKey(todayStr)
  const canGoNext = targetMondayStr < currentWeekMonday
  const canGoPrev = hasOlderRecords

  // Mapa de resumos do dia
  const summaryMap = new Map<string, DaySummary>()
  for (const s of allSummaries) {
    summaryMap.set(s.date, s)
  }

  // ==========================================
  // CARD DA SEMANA (TIRA DE 7 DIAS)
  // ==========================================
  const daysIndicators: DayBarIndicator[] = range.days.map((dStr, idx) => {
    const sum = summaryMap.get(dStr)
    const { status, fraction, ariaLabel } = computeDayIndicatorStatus(dStr, todayStr, sum)
    const dayNumber = parseInt(dStr.substring(8, 10), 10)
    return {
      date: dStr,
      dayLetter: DAY_ABBRS[idx],
      dayNumber,
      isToday: dStr === todayStr,
      status,
      goalsTotal: sum?.goalsTotal ?? 0,
      goalsDone: sum?.goalsDone ?? 0,
      fraction,
      ariaLabel,
    }
  })

  // Cálculo de X e Y
  // X = dias fechados
  // Y = dias decorridos da semana com goalsTotal > 0 (na semana atual, de segunda até hoje; em passadas, todos os dias da semana com metas).
  let X = 0
  let Y = 0
  for (const item of daysIndicators) {
    const isPastOrToday = item.date <= todayStr
    if (range.isCurrentWeek) {
      if (isPastOrToday && item.goalsTotal > 0) {
        Y++
        if (item.status === 'fechado') X++
      }
    } else {
      if (item.goalsTotal > 0) {
        Y++
        if (item.status === 'fechado') X++
      }
    }
  }

  const { title: weekTitle, subtitle: weekSubtitle } = computeWeekTitleAndLegend(
    X,
    Y,
    range.isCurrentWeek,
  )

  // Sequência atual calculada (a MESMA da tela Hoje)
  const streak = await daySummaryRepository.calculateStreak(todayStr)

  // ==========================================
  // COMPARAÇÃO JUSTA COM A SEMANA ANTERIOR
  // ==========================================
  // Semana anterior imediata
  const prevMondayStr = subDaysFromDateKey(targetMondayStr, 7)
  const prevRange = getWeekRangeFromMonday(prevMondayStr, todayStr)

  // Número de dias a comparar:
  // Semana atual: de segunda até hoje (ex: seg a sex => 5 dias). Semana anterior usa os mesmos 5 dias.
  // Semanas passadas: 7 dias inteiros.
  let daysToCompareCount = 7
  if (range.isCurrentWeek) {
    const todayIndex = range.days.indexOf(todayStr)
    daysToCompareCount = todayIndex >= 0 ? todayIndex + 1 : 7
  }

  const currentComparableDays = range.days.slice(0, daysToCompareCount)
  const prevComparableDays = prevRange.days.slice(0, daysToCompareCount)

  // ==========================================
  // MÓDULO 1: TREINO
  // ==========================================
  // Treinos concluídos: um dia conta quando TODAS as séries planejadas do dia foram marcadas.
  // Barras: séries concluídas por dia.
  const planByDow = new Map<number, TreinoPlanoSemanal>()
  for (const p of allPlans) {
    planByDow.set(p.dayOfWeek, p)
  }

  const logByDay = new Map<string, TreinoLog>()
  for (const l of allLogs) {
    logByDay.set(l.day, l)
  }

  const isDayWorkoutCompleted = (dateStr: string): boolean => {
    const dow = getLocalDayOfWeek(parseLocalDate(dateStr))
    const p = planByDow.get(dow)
    if (!p || !p.exercises || p.exercises.length === 0) return false
    const totalSets = p.exercises.reduce((s, e) => s + (e.series || 0), 0)
    if (totalSets === 0) return false
    const log = logByDay.get(dateStr)
    const completedSets = log?.completedSets?.filter((cs) => cs.concluido).length || 0
    return completedSets >= totalSets
  }

  const getCompletedSetsForDay = (dateStr: string): number => {
    const log = logByDay.get(dateStr)
    return log?.completedSets?.filter((cs) => cs.concluido).length || 0
  }

  const currentWeekTreinoDone = range.days.filter((d) => isDayWorkoutCompleted(d)).length
  const currentComparableTreinoDone = currentComparableDays.filter((d) =>
    isDayWorkoutCompleted(d),
  ).length
  const prevComparableTreinoDone = prevComparableDays.filter((d) => isDayWorkoutCompleted(d)).length

  const treinoTotalSeriesWeek = range.days.reduce((acc, d) => acc + getCompletedSetsForDay(d), 0)

  const treinoDailyBars = range.days.map((d, idx) => {
    const val = getCompletedSetsForDay(d)
    const isFuture = d > todayStr
    const seriesWord = pluralWord(val, 'serie')
    return {
      date: d,
      dayInitial: DAY_INITIALS[idx],
      value: val,
      isToday: d === todayStr,
      isFuture,
      ariaLabel: `${DAY_ABBRS[idx]}: ${val} ${seriesWord}`,
    }
  })

  // ==========================================
  // MÓDULO 2: LEITURA
  // ==========================================
  // Páginas lidas na semana. Se só houver registro em minutos, mostrar minutos.
  // Barras: páginas por dia.
  const readingMapByDay = new Map<string, { pages: number; minutes: number }>()
  for (const h of allLeituraHist) {
    const existing = readingMapByDay.get(h.dateRead) || { pages: 0, minutes: 0 }
    readingMapByDay.set(h.dateRead, {
      pages: existing.pages + (h.pagesAdded || 0),
      minutes: existing.minutes + (h.minutes || 0),
    })
  }

  const currentWeekReadingPages = range.days.reduce(
    (acc, d) => acc + (readingMapByDay.get(d)?.pages || 0),
    0,
  )
  const currentWeekReadingMinutes = range.days.reduce(
    (acc, d) => acc + (readingMapByDay.get(d)?.minutes || 0),
    0,
  )
  const currentComparableReadingPages = currentComparableDays.reduce(
    (acc, d) => acc + (readingMapByDay.get(d)?.pages || 0),
    0,
  )
  const prevComparableReadingPages = prevComparableDays.reduce(
    (acc, d) => acc + (readingMapByDay.get(d)?.pages || 0),
    0,
  )

  // Dias decorridos da semana (Y da leitura)
  const readingElapsedDays = range.isCurrentWeek ? daysToCompareCount : 7
  const readingDaysWithRecords = range.days.slice(0, readingElapsedDays).filter((d) => {
    const rec = readingMapByDay.get(d)
    return rec && (rec.pages > 0 || rec.minutes > 0)
  }).length

  const leituraDailyBars = range.days.map((d, idx) => {
    const pages = readingMapByDay.get(d)?.pages || 0
    const isFuture = d > todayStr
    return {
      date: d,
      dayInitial: DAY_INITIALS[idx],
      value: pages,
      isToday: d === todayStr,
      isFuture,
      ariaLabel: `${DAY_ABBRS[idx]}: ${pages} páginas`,
    }
  })

  // ==========================================
  // MÓDULO 3: ESCRITA
  // ==========================================
  // Valor = dias com anotação (corpo com texto). Legenda = "Anotação em todos os dias" quando X = Y, senão "Anotação em X de Y dias".
  // Barras = palavras por dia.
  const writingMapByDay = new Map<string, { hasNote: boolean; wordCount: number }>()
  for (const n of allNotes) {
    if (n.body && n.body.trim().length > 0) {
      const words = n.body.trim().split(/\s+/).filter(Boolean).length
      const prev = writingMapByDay.get(n.date) || { hasNote: false, wordCount: 0 }
      writingMapByDay.set(n.date, {
        hasNote: true,
        wordCount: prev.wordCount + words,
      })
    }
  }

  const escritaElapsedDays = range.isCurrentWeek ? daysToCompareCount : 7
  const currentWeekWritingDays = range.days
    .slice(0, escritaElapsedDays)
    .filter((d) => writingMapByDay.get(d)?.hasNote).length

  const currentComparableWritingDays = currentComparableDays.filter(
    (d) => writingMapByDay.get(d)?.hasNote,
  ).length
  const prevComparableWritingDays = prevComparableDays.filter(
    (d) => writingMapByDay.get(d)?.hasNote,
  ).length

  const escritaDailyBars = range.days.map((d, idx) => {
    const rec = writingMapByDay.get(d)
    const words = rec?.wordCount || 0
    const isFuture = d > todayStr
    const wordsWord = pluralWord(words, 'palavra')
    return {
      date: d,
      dayInitial: DAY_INITIALS[idx],
      value: words,
      isToday: d === todayStr,
      isFuture,
      ariaLabel: `${DAY_ABBRS[idx]}: ${words} ${wordsWord}`,
    }
  })

  // ==========================================
  // MÓDULO 4: ESTUDOS
  // ==========================================
  // Valor = minutos estudados (a partir de 600 min mostrar "Xh Ymin"), unidade "min".
  // Legenda: "Meta batida em X de Y dias" quando existir meta diária, senão "Estudo em X de Y dias".
  // Barras = minutos por dia.
  const studyMapByDay = new Map<string, number>()
  for (const s of allStudySessions) {
    studyMapByDay.set(s.date, (studyMapByDay.get(s.date) || 0) + (s.minutes || 0))
  }

  const currentWeekStudyMinutes = range.days.reduce(
    (acc, d) => acc + (studyMapByDay.get(d) || 0),
    0,
  )
  const currentComparableStudyMinutes = currentComparableDays.reduce(
    (acc, d) => acc + (studyMapByDay.get(d) || 0),
    0,
  )
  const prevComparableStudyMinutes = prevComparableDays.reduce(
    (acc, d) => acc + (studyMapByDay.get(d) || 0),
    0,
  )

  const estudosElapsedDays = range.isCurrentWeek ? daysToCompareCount : 7

  // Verifica se há meta diária configurada em algum dia da semana selecionada
  let hasDailyStudyGoalInWeek = false
  let studyGoalMetDaysCount = 0
  let studyDaysWithRecord = 0

  for (let i = 0; i < estudosElapsedDays; i++) {
    const d = range.days[i]
    const dayMins = studyMapByDay.get(d) || 0
    if (dayMins > 0) studyDaysWithRecord++

    let target = 0
    for (const g of allStudyGoals) {
      const daily = estudosRepository.getEffectiveDailyGoalForDate(g, d)
      if (daily) target += daily
    }
    if (target > 0) {
      hasDailyStudyGoalInWeek = true
      if (dayMins >= target) {
        studyGoalMetDaysCount++
      }
    }
  }

  const estudosDailyBars = range.days.map((d, idx) => {
    const mins = studyMapByDay.get(d) || 0
    const isFuture = d > todayStr
    const minWord = pluralWord(mins, 'minuto')
    return {
      date: d,
      dayInitial: DAY_INITIALS[idx],
      value: mins,
      isToday: d === todayStr,
      isFuture,
      ariaLabel: `${DAY_ABBRS[idx]}: ${mins} ${minWord}`,
    }
  })

  // ==========================================
  // MÓDULO 5: TRABALHO (FAIXA LARGA)
  // ==========================================
  // Valor = conquistas registradas na semana (unidade "conquista(s)").
  // Legenda: "N projeto(s) em andamento · M tarefa(s) feita(s)".
  // Contar tarefas feitas na semana usando campo completedAt.
  const achievementsByDay = new Map<string, number>()
  for (const a of allAchievements) {
    achievementsByDay.set(a.date, (achievementsByDay.get(a.date) || 0) + 1)
  }

  const currentWeekAchievements = range.days.reduce(
    (acc, d) => acc + (achievementsByDay.get(d) || 0),
    0,
  )
  const currentComparableAchievements = currentComparableDays.reduce(
    (acc, d) => acc + (achievementsByDay.get(d) || 0),
    0,
  )
  const prevComparableAchievements = prevComparableDays.reduce(
    (acc, d) => acc + (achievementsByDay.get(d) || 0),
    0,
  )

  const inProgressProjectsCount = allProjects.filter((p) => p.status === 'em_andamento').length

  // Tarefas com completedAt caindo na semana selecionada
  let weekCompletedTasksCount = 0
  for (const p of allProjects) {
    for (const t of p.tasks || []) {
      if (t.completed && t.completedAt) {
        const taskDateKey = t.completedAt.substring(0, 10)
        if (taskDateKey >= range.monday && taskDateKey <= range.sunday) {
          weekCompletedTasksCount++
        }
      }
    }
  }

  const trabalhoDailyBars = range.days.map((d, idx) => {
    const achs = achievementsByDay.get(d) || 0
    const isFuture = d > todayStr
    const achWord = pluralWord(achs, 'conquista')
    return {
      date: d,
      dayInitial: DAY_INITIALS[idx],
      value: achs,
      isToday: d === todayStr,
      isFuture,
      ariaLabel: `${DAY_ABBRS[idx]}: ${achs} ${achWord}`,
    }
  })

  // ==========================================
  // ETIQUETAS DE VARIAÇÃO (SUBIU / IGUAL / CAIU)
  // Regra:
  // - Subiu: fundo #DDF1E4, texto #1E6B3E, "+12".
  // - Igual: fundo #F0E9DF, texto #6B645C, "Igual".
  // - Caiu: fundo #FBEBD3, texto #8A5A00, "−20" (com sinal menos).
  // NUNCA vermelho.
  // Ocultar a etiqueta quando a semana anterior não tiver registros daquele módulo, ou quando os dois valores forem zero.
  // ==========================================
  const buildVariation = (
    currentVal: number,
    prevVal: number,
    hasPrevRecords: boolean,
  ): ModuleWeekMetrics['variation'] => {
    if (!hasPrevRecords || (currentVal === 0 && prevVal === 0)) {
      return undefined
    }
    const diff = currentVal - prevVal
    if (diff > 0) {
      return { diff, type: 'up', label: `+${diff}` }
    }
    if (diff < 0) {
      return { diff, type: 'down', label: `−${Math.abs(diff)}` }
    }
    return { diff: 0, type: 'equal', label: 'Igual' }
  }

  // Verifica se a semana anterior teve algum registro de cada módulo nos dias comparáveis
  const prevTreinoHasRecords = prevComparableDays.some(
    (d) => getCompletedSetsForDay(d) > 0 || isDayWorkoutCompleted(d),
  )
  const prevLeituraHasRecords = prevComparableDays.some(
    (d) => (readingMapByDay.get(d)?.pages || 0) > 0 || (readingMapByDay.get(d)?.minutes || 0) > 0,
  )
  const prevEscritaHasRecords = prevComparableDays.some((d) => writingMapByDay.get(d)?.hasNote)
  const prevEstudosHasRecords = prevComparableDays.some((d) => (studyMapByDay.get(d) || 0) > 0)
  const prevTrabalhoHasRecords = prevComparableDays.some((d) => (achievementsByDay.get(d) || 0) > 0)

  // ==========================================
  // CONFIGURAÇÃO FINAL DE CADA MÓDULO
  // Regra: Números zerados viram "—" e legenda "Sem registros esta semana".
  // ==========================================

  // Treino
  const treinoActive = isTreinoActive
  const treinoHasRecords = currentWeekTreinoDone > 0 || treinoTotalSeriesWeek > 0
  const maxTreinoDaily = Math.max(...treinoDailyBars.map((b) => b.value), 0)
  const treinoMetrics: ModuleWeekMetrics = {
    active: treinoActive,
    displayValue: treinoHasRecords ? `${currentWeekTreinoDone}` : '—',
    unit: pluralWord(currentWeekTreinoDone, 'treino'),
    legend: treinoHasRecords
      ? `${pluralize(treinoTotalSeriesWeek, 'serie')} concluídas`
      : 'Sem registros esta semana',
    dailyBars: treinoDailyBars,
    maxDailyValue: maxTreinoDaily,
    variation: treinoHasRecords
      ? buildVariation(currentComparableTreinoDone, prevComparableTreinoDone, prevTreinoHasRecords)
      : undefined,
  }

  // Leitura
  const leituraActive = isLeituraActive
  const readingOnlyMinutes = currentWeekReadingPages === 0 && currentWeekReadingMinutes > 0
  const leituraHasRecords = currentWeekReadingPages > 0 || currentWeekReadingMinutes > 0
  const maxLeituraDaily = Math.max(...leituraDailyBars.map((b) => b.value), 0)
  const leituraDisplayVal = !leituraHasRecords
    ? '—'
    : readingOnlyMinutes
      ? `${currentWeekReadingMinutes}`
      : `${currentWeekReadingPages}`
  const leituraUnit = readingOnlyMinutes ? 'min' : 'págs'
  const leituraDaysWord = pluralWord(readingElapsedDays, 'dia')
  const leituraLegend = leituraHasRecords
    ? `Lido em ${readingDaysWithRecords} de ${readingElapsedDays} ${leituraDaysWord}`
    : 'Sem registros esta semana'
  const leituraMetrics: ModuleWeekMetrics = {
    active: leituraActive,
    displayValue: leituraDisplayVal,
    unit: leituraUnit,
    legend: leituraLegend,
    dailyBars: leituraDailyBars,
    maxDailyValue: maxLeituraDaily,
    variation: leituraHasRecords
      ? buildVariation(
          currentComparableReadingPages,
          prevComparableReadingPages,
          prevLeituraHasRecords,
        )
      : undefined,
  }

  // Escrita
  const escritaActive = isEscritaActive
  const escritaHasRecords = currentWeekWritingDays > 0
  const maxEscritaDaily = Math.max(...escritaDailyBars.map((b) => b.value), 0)
  const escritaDaysWord = pluralWord(escritaElapsedDays, 'dia')
  let escritaLegend = 'Sem registros esta semana'
  if (escritaHasRecords) {
    if (currentWeekWritingDays === escritaElapsedDays) {
      escritaLegend = 'Anotação em todos os dias'
    } else {
      escritaLegend = `Anotação em ${currentWeekWritingDays} de ${escritaElapsedDays} ${escritaDaysWord}`
    }
  }
  const escritaMetrics: ModuleWeekMetrics = {
    active: escritaActive,
    displayValue: escritaHasRecords ? `${currentWeekWritingDays}` : '—',
    unit: pluralWord(currentWeekWritingDays, 'dia'),
    legend: escritaLegend,
    dailyBars: escritaDailyBars,
    maxDailyValue: maxEscritaDaily,
    variation: escritaHasRecords
      ? buildVariation(
          currentComparableWritingDays,
          prevComparableWritingDays,
          prevEscritaHasRecords,
        )
      : undefined,
  }

  // Estudos
  const estudosActive = isEstudosActive
  const estudosHasRecords = currentWeekStudyMinutes > 0
  const maxEstudosDaily = Math.max(...estudosDailyBars.map((b) => b.value), 0)
  const estudosDaysWord = pluralWord(estudosElapsedDays, 'dia')
  let estudosLegend = 'Sem registros esta semana'
  if (estudosHasRecords) {
    if (hasDailyStudyGoalInWeek) {
      estudosLegend = `Meta batida em ${studyGoalMetDaysCount} de ${estudosElapsedDays} ${estudosDaysWord}`
    } else {
      estudosLegend = `Estudo em ${studyDaysWithRecord} de ${estudosElapsedDays} ${estudosDaysWord}`
    }
  }
  const estudosMetrics: ModuleWeekMetrics = {
    active: estudosActive,
    displayValue: estudosHasRecords ? formatStudyTime(currentWeekStudyMinutes) : '—',
    unit: currentWeekStudyMinutes >= 600 ? '' : 'min',
    legend: estudosLegend,
    dailyBars: estudosDailyBars,
    maxDailyValue: maxEstudosDaily,
    variation: estudosHasRecords
      ? buildVariation(
          currentComparableStudyMinutes,
          prevComparableStudyMinutes,
          prevEstudosHasRecords,
        )
      : undefined,
  }

  // Trabalho
  const trabalhoActive = isTrabalhoActive
  const trabalhoHasRecords = currentWeekAchievements > 0
  const maxTrabalhoDaily = Math.max(...trabalhoDailyBars.map((b) => b.value), 0)
  const projWord = pluralize(inProgressProjectsCount, 'projeto')
  const taskDoneText =
    weekCompletedTasksCount === 1 ? '1 tarefa feita' : `${weekCompletedTasksCount} tarefas feitas`
  const trabalhoLegend = `${projWord} em andamento · ${taskDoneText}`
  const trabalhoMetrics: ModuleWeekMetrics = {
    active: trabalhoActive,
    displayValue: trabalhoHasRecords ? `${currentWeekAchievements}` : '—',
    unit: pluralWord(currentWeekAchievements, 'conquista'),
    legend: trabalhoLegend,
    dailyBars: trabalhoDailyBars,
    maxDailyValue: maxTrabalhoDaily,
    variation: trabalhoHasRecords
      ? buildVariation(
          currentComparableAchievements,
          prevComparableAchievements,
          prevTrabalhoHasRecords,
        )
      : undefined,
  }

  // ==========================================
  // CARD ESCURO "DESTAQUE DA SEMANA"
  // Prioridades:
  // 1) Recorde (últimas 8 semanas): páginas lidas, séries concluídas ou minutos de estudo (exige ≥ 4 semanas de histórico).
  // 2) Melhor do mês (últimas 4 semanas): maior valor de uma dessas métricas ou de dias de leitura.
  // 3) Maior melhora vs. semana anterior: maior variação percentual positiva (mínimo +20% e valor base ≥ 1).
  // 4) Marco de sequência: 7, 14, 30, 50, 100 dias.
  // 5) Consistência: "Você fechou X de Y dias nesta semana." (só se X > 0)
  // 6) Fallback: "Cada registro conta. Comece pelo próximo passo na tela Hoje."
  // Linha de apoio:
  // Semana atual com metas pendentes hoje: "Hoje faltam X metas para fechar o dia." (singular quando faltar 1).
  // Metas de hoje todas concluídas: "Hoje você fechou todas as metas."
  // Semanas passadas: "Você fechou X de Y dias nessa semana."
  // Nunca gerar destaque negativo ou de cobrança.
  // Se Y = 0 (semana sem metas nem registros), o destaque é ocultado pelo item 7.
  // ==========================================

  // Linha de apoio
  let highlightSubtitle = ''
  if (range.isCurrentWeek) {
    const todaySummary = summaryMap.get(todayStr)
    const totalToday = todaySummary?.goalsTotal ?? 0
    const doneToday = todaySummary?.goalsDone ?? 0
    if (totalToday > 0 && doneToday >= totalToday && todaySummary?.closed) {
      highlightSubtitle = 'Hoje você fechou todas as metas.'
    } else if (totalToday > 0 && doneToday < totalToday) {
      const remaining = totalToday - doneToday
      const metaWord = pluralWord(remaining, 'meta')
      highlightSubtitle =
        remaining === 1
          ? 'Hoje falta 1 meta para fechar o dia.'
          : `Hoje faltam ${remaining} ${metaWord} para fechar o dia.`
    } else {
      highlightSubtitle = 'Cada pequeno hábito faz a diferença.'
    }
  } else {
    const daysWord = pluralWord(Y, 'dia')
    highlightSubtitle = `Você fechou ${X} de ${Y} ${daysWord} nessa semana.`
  }

  // Helper para computar métricas semanais das 8 semanas para destaques
  const computeHistoricalWeekTotals = () => {
    return mondays8.map((mStr) => {
      const wDays: string[] = []
      for (let i = 0; i < 7; i++) {
        wDays.push(addDaysToDateKey(mStr, i))
      }
      const pages = wDays.reduce((acc, d) => acc + (readingMapByDay.get(d)?.pages || 0), 0)
      const series = wDays.reduce((acc, d) => acc + getCompletedSetsForDay(d), 0)
      const studyMins = wDays.reduce((acc, d) => acc + (studyMapByDay.get(d) || 0), 0)
      const readingDays = wDays.filter((d) => (readingMapByDay.get(d)?.pages || 0) > 0).length
      return {
        monday: mStr,
        pages,
        series,
        studyMins,
        readingDays,
      }
    })
  }

  const historicalWeeks = computeHistoricalWeekTotals()
  // Conta semanas com qualquer registro para verificar se há histórico de ≥ 4 semanas
  const weeksWithAnyHistoryCount = historicalWeeks.filter(
    (w) => w.pages > 0 || w.series > 0 || w.studyMins > 0 || w.readingDays > 0,
  ).length

  let highlightTitle = ''

  // 1) Recorde nas últimas 8 semanas (exige ≥ 4 semanas com dados)
  if (!highlightTitle && weeksWithAnyHistoryCount >= 4) {
    const currentHist = historicalWeeks[0]
    const otherWeeks = historicalWeeks.slice(1)

    if (currentHist.pages > 0 && otherWeeks.every((w) => currentHist.pages > w.pages)) {
      highlightTitle = `Você leu ${currentHist.pages} páginas, seu melhor ritmo das últimas 8 semanas.`
    } else if (currentHist.series > 0 && otherWeeks.every((w) => currentHist.series > w.series)) {
      highlightTitle = `Você concluiu ${currentHist.series} séries, seu recorde das últimas 8 semanas.`
    } else if (
      currentHist.studyMins > 0 &&
      otherWeeks.every((w) => currentHist.studyMins > w.studyMins)
    ) {
      highlightTitle = `Você estudou ${formatStudyTime(currentHist.studyMins)} min, seu maior tempo das últimas 8 semanas.`
    }
  }

  // 2) Melhor do mês (últimas 4 semanas)
  if (!highlightTitle) {
    const monthWeeks = historicalWeeks.slice(0, 4)
    if (monthWeeks.length >= 2) {
      const currentHist = monthWeeks[0]
      const otherMonthWeeks = monthWeeks.slice(1)
      if (
        currentHist.readingDays > 0 &&
        otherMonthWeeks.every((w) => currentHist.readingDays > w.readingDays)
      ) {
        highlightTitle = `Você leu em ${currentHist.readingDays} de 7 dias, seu melhor ritmo do mês.`
      } else if (
        currentHist.pages > 0 &&
        otherMonthWeeks.every((w) => currentHist.pages > w.pages)
      ) {
        highlightTitle = `Você leu ${currentHist.pages} páginas, seu melhor ritmo do mês.`
      } else if (
        currentHist.series > 0 &&
        otherMonthWeeks.every((w) => currentHist.series > w.series)
      ) {
        highlightTitle = `Você concluiu ${currentHist.series} séries, seu melhor volume do mês.`
      } else if (
        currentHist.studyMins > 0 &&
        otherMonthWeeks.every((w) => currentHist.studyMins > w.studyMins)
      ) {
        highlightTitle = `Você estudou ${formatStudyTime(currentHist.studyMins)} min, seu melhor ritmo do mês.`
      }
    }
  }

  // 3) Maior melhora vs. semana anterior (mínimo +20% e base >= 1)
  if (!highlightTitle) {
    const improvements: { metric: string; pct: number; currentVal: number }[] = []

    if (prevComparableTreinoDone >= 1 && currentComparableTreinoDone > prevComparableTreinoDone) {
      const pct =
        ((currentComparableTreinoDone - prevComparableTreinoDone) / prevComparableTreinoDone) * 100
      if (pct >= 20)
        improvements.push({ metric: 'treinos', pct, currentVal: currentComparableTreinoDone })
    }
    if (
      prevComparableReadingPages >= 1 &&
      currentComparableReadingPages > prevComparableReadingPages
    ) {
      const pct =
        ((currentComparableReadingPages - prevComparableReadingPages) /
          prevComparableReadingPages) *
        100
      if (pct >= 20)
        improvements.push({
          metric: 'páginas lidas',
          pct,
          currentVal: currentComparableReadingPages,
        })
    }
    if (
      prevComparableStudyMinutes >= 1 &&
      currentComparableStudyMinutes > prevComparableStudyMinutes
    ) {
      const pct =
        ((currentComparableStudyMinutes - prevComparableStudyMinutes) /
          prevComparableStudyMinutes) *
        100
      if (pct >= 20)
        improvements.push({
          metric: 'minutos de estudo',
          pct,
          currentVal: currentComparableStudyMinutes,
        })
    }
    if (
      prevComparableWritingDays >= 1 &&
      currentComparableWritingDays > prevComparableWritingDays
    ) {
      const pct =
        ((currentComparableWritingDays - prevComparableWritingDays) / prevComparableWritingDays) *
        100
      if (pct >= 20)
        improvements.push({
          metric: 'dias de escrita',
          pct,
          currentVal: currentComparableWritingDays,
        })
    }

    if (improvements.length > 0) {
      improvements.sort((a, b) => b.pct - a.pct)
      const best = improvements[0]
      highlightTitle = `Evolução de +${Math.round(best.pct)}% em ${best.metric} comparado à semana anterior!`
    }
  }

  // 4) Marco de sequência (7, 14, 30, 50, 100 dias)
  if (!highlightTitle) {
    const milestones = [100, 50, 30, 14, 7]
    const reached = milestones.find((m) => streak >= m)
    if (reached) {
      highlightTitle = `Você chegou a ${streak} dias seguidos.`
    }
  }

  // 5) Consistência: "Você fechou X de Y dias nesta semana." (só se X > 0)
  if (!highlightTitle && X > 0) {
    const daysWord = pluralWord(Y, 'dia')
    highlightTitle = `Você fechou ${X} de ${Y} ${daysWord} nesta semana.`
  }

  // 6) Fallback
  if (!highlightTitle) {
    highlightTitle = 'Cada registro conta. Comece pelo próximo passo na tela Hoje.'
  }

  const resultData: WeekSummaryData = {
    range,
    todayStr,
    canGoNext,
    canGoPrev,
    streak,
    daysIndicators,
    closedDaysCount: X,
    elapsedDaysWithGoalsCount: Y,
    hasNoGoalsWeek: Y === 0,
    weekTitle,
    weekSubtitle,
    highlight:
      Y === 0
        ? undefined
        : {
            title: highlightTitle,
            subtitle: highlightSubtitle,
          },
    modules: {
      treino: treinoMetrics,
      leitura: leituraMetrics,
      escrita: escritaMetrics,
      estudos: estudosMetrics,
      trabalho: trabalhoMetrics,
    },
  }

  // Atualiza cache em memória
  weekCache = weekCache.filter((e) => e.key !== targetMondayStr)
  weekCache.unshift({ key: targetMondayStr, data: resultData, timestamp: Date.now() })
  if (weekCache.length > 16) {
    weekCache.pop()
  }

  return resultData
}
