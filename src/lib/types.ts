/**
 * Tipos de domínio para a aplicação Rotina.
 * Todos os registros possuem id (UUID), created (ISO) e updated (ISO).
 */

export type ModuleKey = 'escrita' | 'leitura' | 'treino' | 'estudos' | 'trabalho'
export type TaskModule = 'escrita' | 'leitura' | 'treino' | 'estudos' | 'trabalho' | 'geral'
export type TaskPriority = 'low' | 'normal' | 'high'
export type TaskStatus = 'open' | 'done'

export interface TaskLink {
  type: 'book' | 'course' | 'project' | 'workoutDay'
  id: string
}

export interface TaskSubtask {
  id: string
  title: string
  done: boolean
}

// Sub-dados específicos por módulo para tarefas
export interface TaskEscritaData {
  tipo: 'diario' | 'ideia'
  tema?: string // até 80 caracteres
  metaMinutos?: number // opcional
}

export interface TaskLeituraData {
  bookId?: string
  metaPaginas?: number
  metaMinutos?: number
  atePagina?: number
}

export type TreinoTipo = 'musculacao' | 'cardio' | 'outros'

export interface TaskTreinoMusculacaoData {
  subtipo: 'academia' | 'calistenia'
  diaOuGrupo: string // dia do plano ou grupo muscular
}

export interface TaskTreinoCardioData {
  modalidade: 'corrida' | 'caminhada' | 'bicicleta'
  metaDistancia?: number // km, decimal
  metaTempo?: number // min
  intensidade: 'leve' | 'moderada' | 'intensa'
}

export interface TaskTreinoOutrosData {
  esporte: string
  duracao?: number // min opcional
}

export interface TaskTreinoData {
  tipo: TreinoTipo
  musculacao?: TaskTreinoMusculacaoData
  cardio?: TaskTreinoCardioData
  outros?: TaskTreinoOutrosData
}

export type EstudosVinculoTipo = 'faculdade' | 'curso' | 'certificacao' | 'outros'
export type EstudosAtividadeTipo =
  | 'assistir_aula'
  | 'ler'
  | 'exercicios'
  | 'revisar'
  | 'entrega_prova'

export interface TaskEstudosData {
  vinculoTipo?: EstudosVinculoTipo
  courseId?: string // quando vinculado a curso existente
  estudoAutonomoNome?: string // quando "outros" (estudo autônomo)
  tipoAtividade: EstudosAtividadeTipo
  metaMinutos?: number // opcional
  tema?: string // até 80 caracteres
}

export type TrabalhoTipo = 'tarefa' | 'reuniao' | 'entrega'

export interface TaskTrabalhoData {
  projectId?: string
  tipo: TrabalhoTipo
  sugerirConquista: boolean // interruptor "Sugerir registrar conquista ao concluir"
}

export type TaskModuleData =
  | { module: 'escrita'; data: TaskEscritaData }
  | { module: 'leitura'; data: TaskLeituraData }
  | { module: 'treino'; data: TaskTreinoData }
  | { module: 'estudos'; data: TaskEstudosData }
  | { module: 'trabalho'; data: TaskTrabalhoData }
  | { module: 'geral'; data?: Record<string, never> }

export interface Task {
  id: string
  title: string // 1-140 caracteres
  module: TaskModule
  link: TaskLink | null
  dueDate: string | null // AAAA-MM-DD
  dueTime: string | null // HH:mm
  reminder: boolean
  priority: TaskPriority
  status: TaskStatus
  completedAt: string | null // timestamp ISO
  subtasks: TaskSubtask[] // máx 20
  moduleData?: TaskModuleData | null
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface AppSettings {
  theme: 'claro' | 'escuro' | 'sistema'
  activeModules: Record<ModuleKey, boolean>
  hasSeenOnboarding: boolean
  firstTimeWelcomeDismissed: boolean
  userName: string
  reminders?: ReminderSettings
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
export type WorkoutVariant = 'academia' | 'calistenia'

export interface PlannedExercise {
  id: string
  nome: string
  series: number
  repeticoes: string | number // ex: 10, "10-12", ou em calistenia "30s"
  carga: number // em kg (0 se peso corporal, > 0 se carga adicional)
  unitType?: 'reps' | 'seconds' // calistenia: repetições ou isometria
  isBodyweight?: boolean // calistenia: peso do corpo
}

export interface TreinoPlanoSemanal {
  id: string
  dayOfWeek: number // 0=Domingo, 1=Segunda, ..., 6=Sábado
  workoutName: string
  exercises: PlannedExercise[]
  variant?: WorkoutVariant // academia | calistenia (padrão: academia)
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
  variant?: WorkoutVariant
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
// 4) ESTUDOS
// ========================
export type CourseType = 'faculdade' | 'curso' | 'certificacao'
export type CourseStatus = 'em_andamento' | 'concluido' | 'pausado' | 'quero_fazer'

export interface Course {
  id: string
  name: string
  type: CourseType
  institution: string
  status: CourseStatus
  progress?: number // 0 a 100 (%)
  workloadHours?: number // carga horária opcional em horas
  startDate: string // YYYY-MM-DD
  endDate?: string // YYYY-MM-DD opcional
  courseUrl?: string // link do curso opcional
  color?: string // cor hexadecimal opcional (#8B5CF6, etc.)
  icon?: string // nome de ícone opcional
  created: string
  updated: string
}

export type StudyBlockType =
  | 'heading'
  | 'subheading'
  | 'paragraph'
  | 'bullet_list'
  | 'numbered_list'
  | 'checklist'
  | 'divider'

export interface StudyBlock {
  id: string
  type: StudyBlockType
  content: string // texto do bloco
  checked?: boolean // para checklist
}

export interface StudyPage {
  id: string
  courseId: string
  title: string
  blocks: StudyBlock[]
  created: string
  updated: string
}

export interface StudyCertificate {
  id: string
  courseId: string
  title: string
  issueDate?: string // YYYY-MM-DD opcional
  fileData: string // Data URL (Base64 data:application/pdf;base64,... ou data:image/jpeg;base64,...)
  fileType: 'pdf' | 'image'
  fileName: string
  fileSize?: number
  created: string
  updated: string
}

export interface StudySession {
  id: string
  courseId: string
  date: string // YYYY-MM-DD
  minutes: number
  notes?: string
  created: string
  updated: string
}

export interface StudyGoalHistory {
  id: string
  courseId: string
  effectiveDate: string // YYYY-MM-DD
  weeklyMinutes?: number
  dailyMinutes?: number
  created: string
}

export interface StudyGoal {
  id: string
  courseId: string
  weeklyMinutes?: number
  dailyMinutes?: number
  history: StudyGoalHistory[]
  created: string
  updated: string
}

export interface CourseGoalProgress {
  course: Course
  weeklyMinutesTarget?: number
  dailyMinutesTarget?: number
  weekMinutes: number
  monthMinutes: number
  todayMinutes: number
  hasGoal: boolean
  hasDailyGoal: boolean
}

// ========================
// DAY SUMMARIES (RESUMO DIÁRIO IMUTÁVEL PARA SEQUÊNCIA)
// ========================
export interface DaySummary {
  date: string // YYYY-MM-DD (chave primária)
  goalsTotal: number
  goalsDone: number
  closed: boolean // true se goalsTotal > 0 && goalsDone === goalsTotal
  createdAt: string
  updatedAt: string
}

// ========================
// NOVOS ARMAZENAMENTOS LOCAIS (PARTE 0)
// ========================

export type ModuleDayKey = 'leitura' | 'treino' | 'escrita' | 'estudos'
export type ModuleDaySource = 'auto' | 'manual' | 'timer'

export interface ModuleDay {
  id: string // UUID
  date: string // AAAA-MM-DD
  module: ModuleDayKey // leitura | treino | escrita | estudos
  goalDefined: boolean
  done: boolean
  source: ModuleDaySource // auto | manual | timer
  value?: number // resumo numérico do dia (páginas, minutos, séries etc.)
  doneAt?: string | null // ISO timestamp
  createdAt: string // ISO timestamp
  updatedAt: string // ISO timestamp
}

export interface Idea {
  id: string // UUID
  title: string
  body?: string
  tags?: string[]
  status?: 'aberta' | 'em_andamento' | 'arquivada'
  createdAt: string
  updatedAt: string
}

export type ActivityPlanType = 'musculacao' | 'cardio' | 'outros'
export type CardioModality = 'Corrida' | 'Caminhada' | 'Bicicleta'
export type CardioIntensity = 'Leve' | 'Moderada' | 'Intensa'

export interface ActivityPlan {
  id: string // UUID
  module?: ModuleKey // compatibilidade
  weekday?: number // 0=Domingo..6=Sábado
  type?: ActivityPlanType // musculacao | cardio | outros
  modality?: string // 'Corrida' | 'Caminhada' | 'Bicicleta' ou nome do esporte
  sport?: string // alias/nome do esporte
  time?: string | null // HH:MM
  targetKm?: number | null // km decimal
  targetMinutes?: number | null // minutos inteiros
  intensity?: CardioIntensity | string | null // Leve, Moderada, Intensa
  active?: boolean // true/false
  title?: string // compatibilidade
  targetValue?: number
  unit?: string
  frequency?: 'diaria' | 'semanal'
  metadata?: Record<string, any>
  createdAt: string
  updatedAt: string
}

export interface ActivityLog {
  id: string // UUID
  module?: ModuleKey // compatibilidade
  planId?: string | null
  date: string // AAAA-MM-DD
  type?: ActivityPlanType // musculacao | cardio | outros
  modality?: string // 'Corrida' | 'Caminhada' | 'Bicicleta' ou nome do esporte
  sport?: string // alias do esporte
  km?: number | null // km realizado
  minutes?: number | null // minutos reais
  intensity?: CardioIntensity | string | null // percepção
  notes?: string | null
  done?: boolean
  value?: number // compatibilidade
  durationMinutes?: number // compatibilidade
  source?: 'auto' | 'manual' | 'timer'
  createdAt: string
  updatedAt: string
}

export interface Medal {
  id: string // UUID
  code?: string // alias de key para retrocompatibilidade
  key: string // chave canônica da medalha, ex: 'goal_leitura', 'streak_3_leitura', 'first_book'
  title: string
  description: string
  module?: ModuleKey | 'geral'
  date?: string // YYYY-MM-DD para medalhas diárias tipo "Meta do dia"
  earnedAt: string // ISO timestamp
  createdAt: string
  updatedAt: string
}

export interface ReminderModuleConfig {
  enabled: boolean
  time: string // 'HH:mm'
}

export interface ReminderSettings {
  enabled: boolean // interruptor geral
  celebrationsEnabled: boolean // se celebrações estão ativas
  leitura: ReminderModuleConfig
  treino: ReminderModuleConfig & { relativeToSession?: boolean }
  escrita: ReminderModuleConfig
  tasks: boolean // lembretes de tarefas que têm horário e "Lembrar" ligado
}

// Timer state: SOMENTE LOCAL, sem sincronização nem backup
export interface TimerState {
  id: string // 'active' ou UUID
  module: ModuleKey
  status: 'running' | 'paused' | 'stopped'
  startedAt?: string
  elapsedSeconds: number
  targetSeconds?: number
  metadata?: Record<string, any>
  createdAt: string
  updatedAt: string
}

export interface ReadingTimerState {
  status: 'running' | 'paused' | 'stopped'
  startedAt?: string
  elapsedSeconds: number
  bookId?: string
  bookTitle?: string
  targetMinutes?: number
  pausedAt?: string
}

// ========================
// 5) TRABALHO
// ========================
export type ProjectStatus = 'planejado' | 'em_andamento' | 'concluido' | 'pausado'

export interface ProjectTask {
  id: string
  title: string
  completed: boolean
  completedAt?: string // ISO timestamp preenchido ao marcar, limpo ao desmarcar
}

export interface ProjectNote {
  id: string
  date: string // YYYY-MM-DD
  text: string
  created: string
  updated: string
}

export interface Project {
  id: string
  name: string
  description: string
  objective?: string
  status: ProjectStatus
  startDate?: string // YYYY-MM-DD
  endDate?: string // YYYY-MM-DD
  tags: string[] // competências/tags
  tasks: ProjectTask[]
  notes: ProjectNote[]
  experienceId?: string // vínculo opcional com experiência
  created: string
  updated: string
}

export interface Achievement {
  id: string
  title: string
  description: string
  date: string // YYYY-MM-DD
  impact: string // ex: "reduziu o tempo de implantação em 30%"
  projectId?: string // vínculo opcional com projeto
  experienceId?: string // vínculo opcional com experiência
  tags: string[] // competências
  created: string
  updated: string
}

export interface Experience {
  id: string
  role: string // cargo
  company: string // empresa
  startDate: string // YYYY-MM
  endDate?: string // YYYY-MM ou undefined se atual
  isCurrent: boolean
  description: string
  skills: string[] // competências
  created: string
  updated: string
}

export interface WorkNote {
  id: string
  title: string
  date: string // YYYY-MM-DD
  body: string
  tags: string[]
  created: string
  updated: string
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
// ========================
// SYNC TYPES (ETAPA 1)
// ========================
export type SyncEntity =
  | 'note'
  | 'book'
  | 'bookNote'
  | 'readingLog'
  | 'readingGoal'
  | 'exercise'
  | 'workoutPlanDay'
  | 'workoutLog'
  | 'course'
  | 'studyPage'
  | 'certificate'
  | 'studySession'
  | 'studyGoal'
  | 'project'
  | 'projectNote'
  | 'projectTask'
  | 'achievement'
  | 'experience'
  | 'workNote'
  | 'daySummary'
  | 'settings'
  | 'task'
  | 'idea'
  | 'activityPlan'
  | 'activityLog'
  | 'moduleDay'
  | 'medal'

export type SyncOperation = 'upsert' | 'delete'

export interface SyncOutboxItem {
  id: string // UUID do item no outbox
  entity: SyncEntity
  clientId: string // id do objeto de domínio
  operation: SyncOperation
  data?: any // payload para upsert
  attempts: number
  timestamp: string // ISO timestamp da alteração
  lastError?: string
}

export interface SyncMetaState {
  key: string // normalmente 'default'
  lastPulledAt: string | null
  userId: string | null
  status: 'idle' | 'syncing' | 'offline' | 'error'
  lastError?: string
  lastSyncedAt?: string | null
}

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
    courses?: Course[]
    study_pages?: StudyPage[]
    study_certificates?: StudyCertificate[]
    study_sessions?: StudySession[]
    study_goals?: StudyGoal[]
    projects?: Project[]
    achievements?: Achievement[]
    experiences?: Experience[]
    work_notes?: WorkNote[]
    day_summaries?: DaySummary[]
    tasks?: Task[]
    ideas?: Idea[]
    activity_plans?: ActivityPlan[]
    activity_logs?: ActivityLog[]
    module_days?: ModuleDay[]
    medals?: Medal[]
  }
}
