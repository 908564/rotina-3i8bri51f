import { idb } from '../indexedDb'
import { Medal, ModuleKey } from '../types'
import { recordOutboxInTx } from '../sync/outboxHelper'

export interface MedalCatalogItem {
  key: string
  title: string
  description: string
  module: ModuleKey | 'geral'
  criteria: string
  isDaily?: boolean
  requiredDays?: number
}

// Catálogo fixo especificado em 6.3:
// - "Meta do dia" por módulo (Leitura, Treino, Escrita; acumula um contador de dias)
// - ofensivas de 3, 7, 14, 30, 60 e 100 dias por módulo (Leitura, Treino, Escrita)
// - "Primeiro livro concluído" (Leitura)
export const MEDAL_CATALOG: MedalCatalogItem[] = [
  // 1. Meta do dia
  {
    key: 'daily_goal_leitura',
    title: 'Meta do dia: Leitura',
    description: 'Concluiu a meta diária de leitura.',
    module: 'leitura',
    criteria: 'Atingir a meta de páginas/minutos ou fazer check-in de leitura no dia.',
    isDaily: true,
  },
  {
    key: 'daily_goal_treino',
    title: 'Meta do dia: Treino',
    description: 'Concluiu todas as sessões de treino planejadas para o dia.',
    module: 'treino',
    criteria: 'Concluir seus treinos planejados (musculação/cardio/outros) do dia.',
    isDaily: true,
  },
  {
    key: 'daily_goal_escrita',
    title: 'Meta do dia: Escrita',
    description: 'Registrou sua anotação ou reflexão diária.',
    module: 'escrita',
    criteria: 'Salvar uma anotação no diário no dia de hoje.',
    isDaily: true,
  },

  // 2. Ofensivas Leitura
  {
    key: 'streak_3_leitura',
    title: 'Leitor Focado (3 dias)',
    description: '3 dias consecutivos lendo com meta cumprida.',
    module: 'leitura',
    criteria: 'Manter uma ofensiva de 3 dias de leitura.',
    requiredDays: 3,
  },
  {
    key: 'streak_7_leitura',
    title: 'Semana Literária (7 dias)',
    description: '7 dias consecutivos lendo sem parar.',
    module: 'leitura',
    criteria: 'Manter uma ofensiva de 7 dias de leitura.',
    requiredDays: 7,
  },
  {
    key: 'streak_14_leitura',
    title: 'Hábito Firme (14 dias)',
    description: 'Duas semanas consecutivas cumprindo a meta de leitura.',
    module: 'leitura',
    criteria: 'Manter uma ofensiva de 14 dias de leitura.',
    requiredDays: 14,
  },
  {
    key: 'streak_30_leitura',
    title: 'Devorador de Livros (30 dias)',
    description: '30 dias seguidos de leitura.',
    module: 'leitura',
    criteria: 'Manter uma ofensiva de 30 dias de leitura.',
    requiredDays: 30,
  },
  {
    key: 'streak_60_leitura',
    title: 'Mestre da Leitura (60 dias)',
    description: '60 dias consecutivos de leitura.',
    module: 'leitura',
    criteria: 'Manter uma ofensiva de 60 dias de leitura.',
    requiredDays: 60,
  },
  {
    key: 'streak_100_leitura',
    title: 'Centenário da Leitura (100 dias)',
    description: '100 dias ininterruptos de leitura.',
    module: 'leitura',
    criteria: 'Manter uma ofensiva de 100 dias de leitura.',
    requiredDays: 100,
  },

  // 3. Ofensivas Treino
  {
    key: 'streak_3_treino',
    title: 'Aquecendo (3 dias)',
    description: '3 dias consecutivos de treinos concluídos.',
    module: 'treino',
    criteria: 'Manter uma ofensiva de 3 dias de treino.',
    requiredDays: 3,
  },
  {
    key: 'streak_7_treino',
    title: 'Semana de Atleta (7 dias)',
    description: '7 dias consecutivos de treinos concluídos.',
    module: 'treino',
    criteria: 'Manter uma ofensiva de 7 dias de treino.',
    requiredDays: 7,
  },
  {
    key: 'streak_14_treino',
    title: 'Disciplina de Ferro (14 dias)',
    description: '14 dias consecutivos de treinos concluídos.',
    module: 'treino',
    criteria: 'Manter uma ofensiva de 14 dias de treino.',
    requiredDays: 14,
  },
  {
    key: 'streak_30_treino',
    title: 'Máquina Imparável (30 dias)',
    description: '30 dias consecutivos de treinos concluídos.',
    module: 'treino',
    criteria: 'Manter uma ofensiva de 30 dias de treino.',
    requiredDays: 30,
  },
  {
    key: 'streak_60_treino',
    title: 'Consistência Pura (60 dias)',
    description: '60 dias consecutivos de treinos concluídos.',
    module: 'treino',
    criteria: 'Manter uma ofensiva de 60 dias de treino.',
    requiredDays: 60,
  },
  {
    key: 'streak_100_treino',
    title: 'Lenda do Treino (100 dias)',
    description: '100 dias ininterruptos de treino.',
    module: 'treino',
    criteria: 'Manter uma ofensiva de 100 dias de treino.',
    requiredDays: 100,
  },

  // 4. Ofensivas Escrita
  {
    key: 'streak_3_escrita',
    title: 'Primeiras Linhas (3 dias)',
    description: '3 dias consecutivos registrando suas ideias.',
    module: 'escrita',
    criteria: 'Manter uma ofensiva de 3 dias de escrita.',
    requiredDays: 3,
  },
  {
    key: 'streak_7_escrita',
    title: 'Fluxo Contínuo (7 dias)',
    description: '7 dias consecutivos escrevendo diariamente.',
    module: 'escrita',
    criteria: 'Manter uma ofensiva de 7 dias de escrita.',
    requiredDays: 7,
  },
  {
    key: 'streak_14_escrita',
    title: 'Mente Clara (14 dias)',
    description: '14 dias consecutivos registrando pensamentos.',
    module: 'escrita',
    criteria: 'Manter uma ofensiva de 14 dias de escrita.',
    requiredDays: 14,
  },
  {
    key: 'streak_30_escrita',
    title: 'Autor Dedicado (30 dias)',
    description: '30 dias seguidos de anotações e reflexões.',
    module: 'escrita',
    criteria: 'Manter uma ofensiva de 30 dias de escrita.',
    requiredDays: 30,
  },
  {
    key: 'streak_60_escrita',
    title: 'Cronista da Própria Vida (60 dias)',
    description: '60 dias seguidos de escrita.',
    module: 'escrita',
    criteria: 'Manter uma ofensiva de 60 dias de escrita.',
    requiredDays: 60,
  },
  {
    key: 'streak_100_escrita',
    title: 'Mestre da Pena (100 dias)',
    description: '100 dias ininterruptos de diário e escrita.',
    module: 'escrita',
    criteria: 'Manter uma ofensiva de 100 dias de escrita.',
    requiredDays: 100,
  },

  // 5. Marco especial
  {
    key: 'first_book_completed',
    title: 'Primeiro Livro Concluído',
    description: 'Completou a leitura do seu primeiro livro na biblioteca!',
    module: 'leitura',
    criteria: 'Concluir a leitura de pelo menos um livro.',
  },
]

export const medalsRepository = {
  async getAll(): Promise<Medal[]> {
    const list = await idb.getAll<Medal>(idb.STORE_MEDALS)
    // Normaliza key / code
    return list.map((m) => ({
      ...m,
      key: m.key || m.code || 'unknown',
      code: m.code || m.key || 'unknown',
    }))
  },

  async getByKeyAndDate(key: string, date?: string): Promise<Medal | undefined> {
    const all = await this.getAll()
    return all.find((m) => {
      const matchKey = m.key === key || m.code === key
      if (date) {
        return matchKey && m.date === date
      }
      return matchKey
    })
  },

  async grantMedal(params: {
    key: string
    module?: ModuleKey | 'geral'
    date?: string // se fornecido, única por (key, date)
    title?: string
    description?: string
  }): Promise<{ medal: Medal; isNew: boolean }> {
    const existing = await this.getByKeyAndDate(params.key, params.date)
    if (existing) {
      return { medal: existing, isNew: false }
    }

    const catalog = MEDAL_CATALOG.find((c) => c.key === params.key)
    const title = params.title || catalog?.title || params.key
    const description = params.description || catalog?.description || ''
    const module = params.module || catalog?.module || 'geral'

    const nowIso = new Date().toISOString()
    const item: Medal = {
      id: crypto.randomUUID(),
      key: params.key,
      code: params.key,
      title,
      description,
      module,
      date: params.date,
      earnedAt: nowIso,
      createdAt: nowIso,
      updatedAt: nowIso,
    }

    await idb.runTransaction([idb.STORE_MEDALS, idb.STORE_SYNC_OUTBOX], 'readwrite', (tx) => {
      tx.objectStore(idb.STORE_MEDALS).put(item)
      recordOutboxInTx(tx, 'medal', item.id, 'upsert', item)
    })

    return { medal: item, isNew: true }
  },

  /**
   * Remove a medalha "Meta do dia" de uma data se o dia deixar de estar concluído.
   * Regra 6.3: medalhas de marco já conquistadas permanecem intactas.
   */
  async revokeDailyMedal(key: string, date: string): Promise<boolean> {
    const existing = await this.getByKeyAndDate(key, date)
    if (!existing) return false

    await idb.runTransaction([idb.STORE_MEDALS, idb.STORE_SYNC_OUTBOX], 'readwrite', (tx) => {
      tx.objectStore(idb.STORE_MEDALS).delete(existing.id)
      recordOutboxInTx(tx, 'medal', existing.id, 'delete')
    })

    return true
  },

  /**
   * Avalia e concede as medalhas cabíveis para um módulo e data especificados:
   * - Meta do dia do módulo
   * - Ofensivas de 3, 7, 14, 30, 60, 100 dias
   * - Primeiro livro concluído
   * Retorna a lista de medalhas novas ganhas nesta avaliação.
   */
  async evaluateMedalsForModule(
    module: 'leitura' | 'treino' | 'escrita',
    date: string,
    currentStreak: number,
  ): Promise<Medal[]> {
    const newlyEarned: Medal[] = []

    // 1. Meta do dia
    const dailyKey = `daily_goal_${module}`
    const dailyResult = await this.grantMedal({
      key: dailyKey,
      module,
      date,
    })
    if (dailyResult.isNew) {
      newlyEarned.push(dailyResult.medal)
    }

    // 2. Ofensivas (3, 7, 14, 30, 60, 100)
    const streakMilestones = [3, 7, 14, 30, 60, 100]
    for (const ms of streakMilestones) {
      if (currentStreak >= ms) {
        const streakKey = `streak_${ms}_${module}`
        const res = await this.grantMedal({
          key: streakKey,
          module,
        })
        if (res.isNew) {
          newlyEarned.push(res.medal)
        }
      }
    }

    // 3. Primeiro livro concluído (se módulo for leitura)
    if (module === 'leitura') {
      const books = await idb.getAll<any>(idb.STORE_LIVROS)
      const hasCompletedBook = books.some((b) => b.status === 'concluido' || b.status === 'lido')
      if (hasCompletedBook) {
        const res = await this.grantMedal({
          key: 'first_book_completed',
          module: 'leitura',
        })
        if (res.isNew) {
          newlyEarned.push(res.medal)
        }
      }
    }

    return newlyEarned
  },

  /**
   * Conta quantos dias foram concluídos para o módulo especificado (acumulador da "Meta do dia").
   */
  async countDailyGoalsForModule(module: 'leitura' | 'treino' | 'escrita'): Promise<number> {
    const all = await this.getAll()
    const dailyKey = `daily_goal_${module}`
    return all.filter((m) => (m.key === dailyKey || m.code === dailyKey) && Boolean(m.date)).length
  },
}
