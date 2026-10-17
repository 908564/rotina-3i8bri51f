import { getTodayDateKey } from './dateUtils'

const CELEBRATION_PREFIX = 'rotina_celebration_'

export const celebrationService = {
  /**
   * Verifica se a celebração já foi exibida hoje para este módulo.
   * Regra 6.2: uma vez por dia e por módulo.
   */
  hasCelebratedToday(module: string, date: string = getTodayDateKey()): boolean {
    if (typeof localStorage === 'undefined') return false
    return localStorage.getItem(`${CELEBRATION_PREFIX}${module}_${date}`) === 'true'
  },

  /**
   * Marca que a celebração foi realizada hoje para este módulo.
   */
  markCelebratedToday(module: string, date: string = getTodayDateKey()): void {
    if (typeof localStorage === 'undefined') return
    try {
      localStorage.setItem(`${CELEBRATION_PREFIX}${module}_${date}`, 'true')
    } catch {
      // Ignora erro de cota de localStorage
    }
  },

  /**
   * Reseta flag de celebração (útil em testes ou ao desfazer check-in).
   */
  resetCelebration(module: string, date: string = getTodayDateKey()): void {
    if (typeof localStorage === 'undefined') return
    try {
      localStorage.removeItem(`${CELEBRATION_PREFIX}${module}_${date}`)
    } catch {
      /* intentionally ignored */
    }
  },
}
