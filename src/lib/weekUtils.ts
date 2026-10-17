import {
  getLocalDateKey,
  parseLocalDate,
  subDaysFromDateKey,
  addDaysToDateKey,
  getLocalDayOfWeek,
  getTodayDateKey,
} from './dateUtils'

export interface WeekRange {
  monday: string // YYYY-MM-DD
  sunday: string // YYYY-MM-DD
  days: string[] // 7 datas de Seg a Dom (YYYY-MM-DD)
  isCurrentWeek: boolean
}

/**
 * Retorna as informações de semana (segunda a domingo) para uma data de referência ou para uma segunda-feira dada.
 */
export function getWeekRangeFromMonday(
  mondayStr: string,
  todayStr: string = getTodayDateKey(),
): WeekRange {
  const days: string[] = []
  for (let i = 0; i < 7; i++) {
    days.push(addDaysToDateKey(mondayStr, i))
  }
  const sunday = days[6]
  const isCurrentWeek = days.includes(todayStr)

  return {
    monday: mondayStr,
    sunday,
    days,
    isCurrentWeek,
  }
}

/**
 * Retorna a segunda-feira da semana que contém a data passada.
 * Segunda = 1; Terça = 2 ... Sábado = 6; Domingo = 0.
 * Para Domingo (0), a segunda-feira fica 6 dias atrás.
 * Para Segunda (1), a segunda-feira é hoje (0 dias atrás).
 * Para Terça a Sábado (2 a 6), diff = dayOfWeek - 1.
 */
export function getMondayForDateKey(dateKey: string): string {
  const dateObj = parseLocalDate(dateKey)
  const dow = getLocalDayOfWeek(dateObj) // 0=Dom, 1=Seg, ..., 6=Sab
  const daysSinceMonday = dow === 0 ? 6 : dow - 1
  return subDaysFromDateKey(dateKey, daysSinceMonday)
}

const MONTH_NAMES_SHORT = [
  'jan.',
  'fev.',
  'mar.',
  'abr.',
  'mai.',
  'jun.',
  'jul.',
  'ago.',
  'set.',
  'out.',
  'nov.',
  'dez.',
]

const MONTH_NAMES_FULL = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
]

/**
 * Formata o intervalo da semana conforme a especificação:
 * - Subtítulo: intervalo da semana ("12 a 18 de outubro · semana atual").
 * - Em semanas passadas, sem "semana atual".
 * - Se cruzar meses: "28 de set. a 4 de out.".
 * - Se cruzar anos: "28 de dez. de 2025 a 3 de jan. de 2026".
 */
export function formatWeekSubtitle(range: WeekRange): string {
  const [monY, monM, monD] = range.monday.split('-').map((n) => parseInt(n, 10))
  const [sunY, sunM, sunD] = range.sunday.split('-').map((n) => parseInt(n, 10))

  let intervalStr = ''
  if (monY !== sunY) {
    // Cruzando anos
    const m1 = MONTH_NAMES_SHORT[monM - 1]
    const m2 = MONTH_NAMES_SHORT[sunM - 1]
    intervalStr = `${monD} de ${m1} de ${monY} a ${sunD} de ${m2} de ${sunY}`
  } else if (monM !== sunM) {
    // Cruzando meses
    const m1 = MONTH_NAMES_SHORT[monM - 1]
    const m2 = MONTH_NAMES_SHORT[sunM - 1]
    intervalStr = `${monD} de ${m1} a ${sunD} de ${m2}`
  } else {
    // Mesmo mês
    const mFull = MONTH_NAMES_FULL[monM - 1]
    intervalStr = `${monD} a ${sunD} de ${mFull}`
  }

  if (range.isCurrentWeek) {
    return `${intervalStr} · semana atual`
  }
  return intervalStr
}
