/**
 * Utilitários centrais de data para o aplicativo Rotina.
 *
 * Garante que todas as operações com datas diárias (YYYY-MM-DD) sejam
 * executadas no fuso horário local do usuário (ex.: Horário de Brasília UTC-3),
 * evitando bugs onde toISOString() avança o dia entre 21h e 23h59.
 */

/**
 * Retorna a chave de data no formato "YYYY-MM-DD" baseada no horário LOCAL.
 * Se nenhuma data for fornecida, utiliza a data/hora local atual.
 */
export function getLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Retorna a chave do dia de hoje no fuso local: "YYYY-MM-DD".
 */
export function getTodayDateKey(): string {
  return getLocalDateKey(new Date())
}

/**
 * Retorna a chave do mês no formato "YYYY-MM" baseada no horário local.
 */
export function getLocalMonthKey(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

/**
 * Converte de forma segura uma string "YYYY-MM-DD" para um objeto Date local
 * posicionado às 12:00:00 (meio-dia) para evitar deslocamento de fuso em qualquer fuso do Brasil/Mundo.
 */
export function parseLocalDate(dateStr: string): Date {
  const [yearStr, monthStr, dayStr] = dateStr.split('-')
  const year = parseInt(yearStr, 10)
  const month = parseInt(monthStr, 10) - 1
  const day = parseInt(dayStr, 10)
  return new Date(year, month, day, 12, 0, 0, 0)
}

/**
 * Adiciona ou subtrai N dias a partir de uma data ou chave "YYYY-MM-DD",
 * retornando a nova chave "YYYY-MM-DD" no fuso local.
 */
export function addDaysToDateKey(dateOrKey: Date | string, days: number): string {
  const d =
    typeof dateOrKey === 'string' ? parseLocalDate(dateOrKey) : new Date(dateOrKey.getTime())
  d.setDate(d.getDate() + days)
  return getLocalDateKey(d)
}

/**
 * Subtrai N dias a partir de uma data ou chave "YYYY-MM-DD".
 */
export function subDaysFromDateKey(dateOrKey: Date | string, days: number): string {
  return addDaysToDateKey(dateOrKey, -days)
}

/**
 * Retorna a chave "YYYY-MM-DD" correspondente a N dias atrás em relação a hoje local.
 */
export function getDaysAgoKey(days: number): string {
  return subDaysFromDateKey(new Date(), days)
}

/**
 * Compara se a chave de data "YYYY-MM-DD" corresponde ao dia de hoje local.
 */
export function isToday(dateStr: string): boolean {
  return dateStr === getTodayDateKey()
}

/**
 * Calcula a diferença em dias corridos entre duas datas ("YYYY-MM-DD" ou Date).
 * Retorna (to - from) em dias inteiros.
 */
export function daysBetween(from: Date | string, to: Date | string): number {
  const fromDate =
    typeof from === 'string'
      ? parseLocalDate(from)
      : new Date(from.getFullYear(), from.getMonth(), from.getDate(), 12)
  const toDate =
    typeof to === 'string'
      ? parseLocalDate(to)
      : new Date(to.getFullYear(), to.getMonth(), to.getDate(), 12)

  const diffTime = toDate.getTime() - fromDate.getTime()
  return Math.round(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Retorna o dia da semana atual no fuso local (0 = Domingo, 1 = Segunda, ...).
 */
export function getLocalDayOfWeek(date: Date = new Date()): number {
  return date.getDay()
}

/**
 * Formata uma chave "YYYY-MM-DD" para exibição em português do Brasil.
 * Ex: "24 de outubro, qui."
 */
export function formatDateDisplay(dateStr: string): string {
  const date = parseLocalDate(dateStr)
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'long',
    weekday: 'short',
  })
  return formatter.format(date)
}
