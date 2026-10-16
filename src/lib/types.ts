/**
 * Tipos de domínio para a aplicação Rotina.
 * Todos os registros possuem id (UUID), created (ISO) e updated (ISO).
 */

export type ModuleKey = 'escrita' | 'leitura' | 'treino'

export interface AppSettings {
  theme: 'claro' | 'escuro' | 'sistema'
  activeModules: Record<ModuleKey, boolean>
  hasSeenOnboarding: boolean
  userName: string
}

// ========================
// 1) ESCRITA
// ========================
export interface EscritaNote {
  id: string
  date: string // YYYY-MM-DD
  title: string
  body: string
  tags: string[]
  created: string
  updated: string
}

// ========================
// 2) LEITURA
// ========================
export type BookStatus = 'quero_ler' | 'lendo' | 'concluido'

export interface LivroMeta {
  dailyPages?: number
  dailyMinutes?: number
  weeklyPages?: number
  weeklyMinutes?: number
  monthlyPages?: number
  monthlyMinutes?: number
  targetDate?: string // YYYY-MM-DD (data-alvo para terminar o livro)
}

export interface LivroMetaHistorico {
  id: string
  bookId: string
  effectiveDate: string // YYYY-MM-DD (data a partir da qual esta meta passou a valer)
  meta: LivroMeta
  created: string
}

export interface Livro {
  id: string
  title: string
  author: string
  totalPages?: number
  currentPage: number
  status: BookStatus
  coverPhoto?: string // Data URL (Base64 JPEG comprimido)
  goal?: LivroMeta
  goalHistory?: LivroMetaHistorico[]
  created: string
  updated: string
}

export interface LivroAnotacao {
  id: string
  bookId: string
  page?: number
  text: string
  created: string
  updated: string
}

export interface LeituraHistorico {
  id: string
  bookId: string
  dateRead: string // YYYY-MM-DD
  pagesAdded: number
  currentPage: number
  minutes?: number
  // Meta vigente no dia do registro (opcional para histórico retrocompatível)
  effectiveGoal?: LivroMeta
  created: string
  updated: string
}

export interface BookGoalProgress {
  book: Livro
  dailyPagesTarget?: number
  dailyMinutesTarget?: number
  todayPages: number
  todayMinutes: number
  weeklyPagesTarget?: number
  weeklyMinutesTarget?: number
  weekPages: number
  weekMinutes: number
  monthlyPagesTarget?: number
  monthlyMinutesTarget?: number
  monthPages: number
  monthMinutes: number
  hasAnyGoal: boolean
}

export interface ReadingGoalsProgress {
  hasGoals: boolean // Indica se pelo menos um livro ativo ('lendo') possui meta definida
  dailyPagesTarget: number // Soma das metas diárias em páginas dos livros 'lendo'
  dailyMinutesTarget: number // Soma das metas diárias em minutos dos livros 'lendo'
  todayPages: number
  todayMinutes: number
  weeklyPagesTarget: number // Soma das metas semanais em páginas (apenas livros com essa meta definida)
  weeklyMinutesTarget: number
  weekPages: number
  weekMinutes: number
  monthlyPagesTarget: number // Soma das metas mensais em páginas (apenas livros com essa meta definida)
  monthlyMinutesTarget: number
  monthPages: number
  monthMinutes: number
  streak: number
  booksProgress: BookGoalProgress[]
}

// ========================
// 3) TREINO
// ========================
export interface PlannedExercise {
  id: string
  nome: string
  series: number
  repeticoes: string | number
  carga: number // em kg
}

export interface TreinoPlanoSemanal {
  id: string
  dayOfWeek: number // 0=Domingo, 1=Segunda, ..., 6=Sábado
  workoutName: string
  exercises: PlannedExercise[]
  created: string
  updated: string
}

export interface CompletedSet {
  exercicioNome: string
  serieIndex: number
  carga: number
  repeticoes: number
  concluido: boolean
}

export interface TreinoLog {
  id: string
  day: string // YYYY-MM-DD
  workoutName: string
  completedSets: CompletedSet[]
  created: string
  updated: string
}

export interface ExerciseHistoryPoint {
  date: string
  carga: number
  repeticoes: number
  serieIndex: number
}

// ========================
// EXTENSIBILIDADE FUTURA (FASE 2 - PLACEHOLDERS)
// ========================
/*
  Placeholder para refeições e checklist de hábitos com pontuação automática:
  export interface Refeicao {
    id: string
    date: string
    tipo: 'cafe' | 'almoco' | 'lanche' | 'jantar'
    descricao: string
    calorias?: number
    created: string
    updated: string
  }

  export interface HabitoChecklist {
    id: string
    titulo: string
    pontos: number
    frequencia: 'diaria' | 'semanal'
    created: string
    updated: string
  }
*/

// ========================
// BACKUP / EXPORT / IMPORT
// ========================
export interface ExportDataPayload {
  schemaVersion: number
  exportedAt: string
  appName: 'Rotina'
  settings: AppSettings
  collections: {
    escrita_notes: EscritaNote[]
    livros: Livro[]
    livro_anotacoes: LivroAnotacao[]
    leitura_historico: LeituraHistorico[]
    treino_plano_semanal: TreinoPlanoSemanal[]
    treino_log: TreinoLog[]
  }
}
