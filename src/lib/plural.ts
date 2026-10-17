/**
 * Helper único de pluralização em português para a aplicação Rotina.
 * Garante concordância correta em todos os textos (evita erros como "1 dias", "1 treinos").
 */

export type PluralUnit =
  | 'dia'
  | 'treino'
  | 'conquista'
  | 'projeto'
  | 'tarefa'
  | 'meta'
  | 'pagina'
  | 'serie'
  | 'semana'
  | 'minuto'
  | 'palavra'
  | 'anotacao'
  | 'vez'

const PLURAL_MAP: Record<PluralUnit, { singular: string; plural: string }> = {
  dia: { singular: 'dia', plural: 'dias' },
  treino: { singular: 'treino', plural: 'treinos' },
  conquista: { singular: 'conquista', plural: 'conquistas' },
  projeto: { singular: 'projeto', plural: 'projetos' },
  tarefa: { singular: 'tarefa', plural: 'tarefas' },
  meta: { singular: 'meta', plural: 'metas' },
  pagina: { singular: 'página', plural: 'páginas' },
  serie: { singular: 'série', plural: 'séries' },
  semana: { singular: 'semana', plural: 'semanas' },
  minuto: { singular: 'minuto', plural: 'minutos' },
  palavra: { singular: 'palavra', plural: 'palavras' },
  anotacao: { singular: 'anotação', plural: 'anotações' },
  vez: { singular: 'vez', plural: 'vezes' },
}

/**
 * Retorna apenas o substantivo correto (singular se count === 1 ou count === -1; plural caso contrário).
 */
export function pluralWord(count: number, unit: PluralUnit): string {
  const abs = Math.abs(count)
  const entry = PLURAL_MAP[unit]
  if (!entry) return unit
  return abs === 1 ? entry.singular : entry.plural
}

/**
 * Retorna o número formatado seguido do substantivo com concordância correta.
 * Ex.: pluralize(1, 'dia') => "1 dia"
 *      pluralize(2, 'dia') => "2 dias"
 *      pluralize(1, 'treino') => "1 treino"
 */
export function pluralize(count: number, unit: PluralUnit): string {
  return `${count} ${pluralWord(count, unit)}`
}
