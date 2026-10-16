import { idb } from '../indexedDb'
import { settingsRepository } from './settingsRepository'
import { BACKUP_SCHEMA_VERSION } from '../version'
import {
  ExportDataPayload,
  EscritaNote,
  Livro,
  LivroAnotacao,
  LeituraHistorico,
  TreinoPlanoSemanal,
  TreinoLog,
  Course,
  StudyPage,
  StudyCertificate,
  StudySession,
  StudyGoal,
  Project,
  Achievement,
  Experience,
  WorkNote,
  AppSettings,
  ModuleKey,
} from '../types'

/** Limite máximo padrão para arquivo de backup (50 MB) */
export const MAX_BACKUP_FILE_BYTES = 50 * 1024 * 1024

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export interface ValidationSummary {
  validPayload: ExportDataPayload
  ignoredCount: number
  ignoredDetails: { collection: string; reason: string }[]
}

export interface ImportResult {
  importedCount: number
  ignoredCount: number
}

function isValidIsoDate(value: unknown): boolean {
  if (typeof value !== 'string') return false
  const time = Date.parse(value)
  return !Number.isNaN(time)
}

function isValidUuid(value: unknown): boolean {
  if (typeof value !== 'string') return false
  return UUID_REGEX.test(value)
}

function hasBaseAuditFields(item: any): boolean {
  if (!item || typeof item !== 'object') return false
  return isValidUuid(item.id) && isValidIsoDate(item.created) && isValidIsoDate(item.updated)
}

// ============================================================================
// Sanitizadores específicos por coleção: montam explicitamente campos conhecidos
// descartando qualquer chave extra ou desconhecida
// ============================================================================

function sanitizeEscritaNote(item: any): EscritaNote | null {
  if (!hasBaseAuditFields(item)) return null
  if (typeof item.date !== 'string' || typeof item.title !== 'string') return null

  return {
    id: item.id,
    date: item.date,
    title: item.title,
    body: typeof item.body === 'string' ? item.body : '',
    tags: Array.isArray(item.tags) ? item.tags.filter((t: any) => typeof t === 'string') : [],
    created: item.created,
    updated: item.updated,
  }
}

function sanitizeLivro(item: any): Livro | null {
  if (!hasBaseAuditFields(item)) return null
  if (typeof item.title !== 'string' || typeof item.author !== 'string') return null

  const validStatus = ['quero_ler', 'lendo', 'concluido'].includes(item.status)
    ? item.status
    : 'quero_ler'

  // Sanitiza meta opcional
  let goal: Livro['goal'] = undefined
  if (item.goal && typeof item.goal === 'object') {
    goal = {
      dailyPages: typeof item.goal.dailyPages === 'number' ? item.goal.dailyPages : undefined,
      dailyMinutes: typeof item.goal.dailyMinutes === 'number' ? item.goal.dailyMinutes : undefined,
      weeklyPages: typeof item.goal.weeklyPages === 'number' ? item.goal.weeklyPages : undefined,
      weeklyMinutes:
        typeof item.goal.weeklyMinutes === 'number' ? item.goal.weeklyMinutes : undefined,
      monthlyPages: typeof item.goal.monthlyPages === 'number' ? item.goal.monthlyPages : undefined,
      monthlyMinutes:
        typeof item.goal.monthlyMinutes === 'number' ? item.goal.monthlyMinutes : undefined,
      targetDate: typeof item.goal.targetDate === 'string' ? item.goal.targetDate : undefined,
    }
  }

  // Sanitiza goalHistory
  const goalHistory = Array.isArray(item.goalHistory)
    ? item.goalHistory
        .filter((gh: any) => gh && typeof gh === 'object' && typeof gh.effectiveDate === 'string')
        .map((gh: any) => ({
          id: isValidUuid(gh.id) ? gh.id : crypto.randomUUID(),
          bookId: item.id,
          effectiveDate: gh.effectiveDate,
          meta: gh.meta && typeof gh.meta === 'object' ? { ...gh.meta } : {},
          created: isValidIsoDate(gh.created) ? gh.created : item.created,
        }))
    : []

  return {
    id: item.id,
    title: item.title,
    author: item.author,
    totalPages: typeof item.totalPages === 'number' ? item.totalPages : undefined,
    currentPage: typeof item.currentPage === 'number' ? Math.max(0, item.currentPage) : 0,
    status: validStatus,
    coverPhoto: typeof item.coverPhoto === 'string' ? item.coverPhoto : undefined,
    goal,
    goalHistory,
    created: item.created,
    updated: item.updated,
  }
}

function sanitizeLivroAnotacao(item: any): LivroAnotacao | null {
  if (!hasBaseAuditFields(item)) return null
  if (!isValidUuid(item.bookId) || typeof item.text !== 'string') return null

  return {
    id: item.id,
    bookId: item.bookId,
    page: typeof item.page === 'number' ? item.page : undefined,
    text: item.text,
    created: item.created,
    updated: item.updated,
  }
}

function sanitizeLeituraHistorico(item: any): LeituraHistorico | null {
  if (!hasBaseAuditFields(item)) return null
  if (!isValidUuid(item.bookId) || typeof item.dateRead !== 'string') return null

  return {
    id: item.id,
    bookId: item.bookId,
    dateRead: item.dateRead,
    pagesAdded: typeof item.pagesAdded === 'number' ? item.pagesAdded : 0,
    currentPage: typeof item.currentPage === 'number' ? item.currentPage : 0,
    minutes: typeof item.minutes === 'number' ? item.minutes : undefined,
    effectiveGoal:
      item.effectiveGoal && typeof item.effectiveGoal === 'object'
        ? { ...item.effectiveGoal }
        : undefined,
    created: item.created,
    updated: item.updated,
  }
}

function sanitizeTreinoPlanoSemanal(item: any): TreinoPlanoSemanal | null {
  if (!hasBaseAuditFields(item)) return null
  if (typeof item.dayOfWeek !== 'number' || typeof item.workoutName !== 'string') return null

  const exercises = Array.isArray(item.exercises)
    ? item.exercises
        .filter((e: any) => e && typeof e === 'object' && typeof e.nome === 'string')
        .map((e: any) => ({
          id: typeof e.id === 'string' ? e.id : crypto.randomUUID(),
          nome: String(e.nome),
          series: typeof e.series === 'number' ? e.series : 3,
          repeticoes: e.repeticoes !== undefined ? e.repeticoes : '10-12',
          carga: typeof e.carga === 'number' ? e.carga : 0,
        }))
    : []

  return {
    id: item.id,
    dayOfWeek: item.dayOfWeek,
    workoutName: item.workoutName,
    exercises,
    created: item.created,
    updated: item.updated,
  }
}

function sanitizeTreinoLog(item: any): TreinoLog | null {
  if (!hasBaseAuditFields(item)) return null
  if (typeof item.day !== 'string' || typeof item.workoutName !== 'string') return null

  const completedSets = Array.isArray(item.completedSets)
    ? item.completedSets
        .filter((s: any) => s && typeof s === 'object')
        .map((s: any) => ({
          exercicioNome: String(s.exercicioNome || ''),
          serieIndex: typeof s.serieIndex === 'number' ? s.serieIndex : 0,
          carga: typeof s.carga === 'number' ? s.carga : 0,
          repeticoes: typeof s.repeticoes === 'number' ? s.repeticoes : 0,
          concluido: Boolean(s.concluido),
        }))
    : []

  return {
    id: item.id,
    day: item.day,
    workoutName: item.workoutName,
    completedSets,
    created: item.created,
    updated: item.updated,
  }
}

function sanitizeCourse(item: any): Course | null {
  if (!hasBaseAuditFields(item)) return null
  if (typeof item.name !== 'string' || typeof item.startDate !== 'string') return null

  const validTypes = ['faculdade', 'curso', 'certificacao'].includes(item.type)
    ? item.type
    : 'curso'
  const validStatus = ['em_andamento', 'concluido', 'pausado', 'quero_fazer'].includes(item.status)
    ? item.status
    : 'em_andamento'

  return {
    id: item.id,
    name: item.name,
    type: validTypes,
    institution: typeof item.institution === 'string' ? item.institution : '',
    status: validStatus,
    progress:
      typeof item.progress === 'number' ? Math.max(0, Math.min(100, item.progress)) : undefined,
    workloadHours: typeof item.workloadHours === 'number' ? item.workloadHours : undefined,
    startDate: item.startDate,
    endDate: typeof item.endDate === 'string' ? item.endDate : undefined,
    courseUrl: typeof item.courseUrl === 'string' ? item.courseUrl : undefined,
    color: typeof item.color === 'string' ? item.color : undefined,
    icon: typeof item.icon === 'string' ? item.icon : undefined,
    created: item.created,
    updated: item.updated,
  }
}

function sanitizeStudyPage(item: any): StudyPage | null {
  if (!hasBaseAuditFields(item)) return null
  if (!isValidUuid(item.courseId) || typeof item.title !== 'string') return null

  const blocks = Array.isArray(item.blocks)
    ? item.blocks
        .filter((b: any) => b && typeof b === 'object' && typeof b.type === 'string')
        .map((b: any) => ({
          id: typeof b.id === 'string' ? b.id : crypto.randomUUID(),
          type: b.type,
          content: typeof b.content === 'string' ? b.content : '',
          checked: typeof b.checked === 'boolean' ? b.checked : undefined,
        }))
    : []

  return {
    id: item.id,
    courseId: item.courseId,
    title: item.title,
    blocks,
    created: item.created,
    updated: item.updated,
  }
}

function sanitizeStudyCertificate(item: any): StudyCertificate | null {
  if (!hasBaseAuditFields(item)) return null
  if (
    !isValidUuid(item.courseId) ||
    typeof item.title !== 'string' ||
    typeof item.fileData !== 'string' ||
    typeof item.fileName !== 'string'
  ) {
    return null
  }

  const fileType = item.fileType === 'pdf' ? 'pdf' : 'image'

  return {
    id: item.id,
    courseId: item.courseId,
    title: item.title,
    issueDate: typeof item.issueDate === 'string' ? item.issueDate : undefined,
    fileData: item.fileData,
    fileType,
    fileName: item.fileName,
    fileSize: typeof item.fileSize === 'number' ? item.fileSize : undefined,
    created: item.created,
    updated: item.updated,
  }
}

function sanitizeStudySession(item: any): StudySession | null {
  if (!hasBaseAuditFields(item)) return null
  if (
    !isValidUuid(item.courseId) ||
    typeof item.date !== 'string' ||
    typeof item.minutes !== 'number'
  ) {
    return null
  }

  return {
    id: item.id,
    courseId: item.courseId,
    date: item.date,
    minutes: Math.max(1, Math.round(item.minutes)),
    notes: typeof item.notes === 'string' ? item.notes : undefined,
    created: item.created,
    updated: item.updated,
  }
}

function sanitizeStudyGoal(item: any): StudyGoal | null {
  if (!hasBaseAuditFields(item)) return null
  if (!isValidUuid(item.courseId) || typeof item.weeklyMinutes !== 'number') return null

  const history = Array.isArray(item.history)
    ? item.history
        .filter((h: any) => h && typeof h === 'object' && typeof h.effectiveDate === 'string')
        .map((h: any) => ({
          id: isValidUuid(h.id) ? h.id : crypto.randomUUID(),
          courseId: item.courseId,
          effectiveDate: h.effectiveDate,
          weeklyMinutes: typeof h.weeklyMinutes === 'number' ? h.weeklyMinutes : item.weeklyMinutes,
          created: isValidIsoDate(h.created) ? h.created : item.created,
        }))
    : []

  return {
    id: item.id,
    courseId: item.courseId,
    weeklyMinutes: item.weeklyMinutes,
    history,
    created: item.created,
    updated: item.updated,
  }
}

function sanitizeProject(item: any): Project | null {
  if (!hasBaseAuditFields(item)) return null
  if (typeof item.name !== 'string') return null

  const validStatus = ['planejado', 'em_andamento', 'concluido', 'pausado'].includes(item.status)
    ? item.status
    : 'planejado'

  const tasks = Array.isArray(item.tasks)
    ? item.tasks
        .filter((t: any) => t && typeof t === 'object' && typeof t.title === 'string')
        .map((t: any) => ({
          id: typeof t.id === 'string' ? t.id : crypto.randomUUID(),
          title: t.title,
          completed: Boolean(t.completed),
        }))
    : []

  const notes = Array.isArray(item.notes)
    ? item.notes
        .filter(
          (n: any) =>
            n &&
            typeof n === 'object' &&
            typeof n.date === 'string' &&
            typeof n.text === 'string' &&
            isValidIsoDate(n.created) &&
            isValidIsoDate(n.updated),
        )
        .map((n: any) => ({
          id: isValidUuid(n.id) ? n.id : crypto.randomUUID(),
          date: n.date,
          text: n.text,
          created: n.created,
          updated: n.updated,
        }))
    : []

  return {
    id: item.id,
    name: item.name,
    description: typeof item.description === 'string' ? item.description : '',
    objective: typeof item.objective === 'string' ? item.objective : undefined,
    status: validStatus,
    startDate: typeof item.startDate === 'string' ? item.startDate : undefined,
    endDate: typeof item.endDate === 'string' ? item.endDate : undefined,
    tags: Array.isArray(item.tags) ? item.tags.filter((t: any) => typeof t === 'string') : [],
    tasks,
    notes,
    experienceId: isValidUuid(item.experienceId) ? item.experienceId : undefined,
    created: item.created,
    updated: item.updated,
  }
}

function sanitizeAchievement(item: any): Achievement | null {
  if (!hasBaseAuditFields(item)) return null
  if (
    typeof item.title !== 'string' ||
    typeof item.date !== 'string' ||
    typeof item.impact !== 'string'
  ) {
    return null
  }

  return {
    id: item.id,
    title: item.title,
    description: typeof item.description === 'string' ? item.description : '',
    date: item.date,
    impact: item.impact,
    projectId: isValidUuid(item.projectId) ? item.projectId : undefined,
    experienceId: isValidUuid(item.experienceId) ? item.experienceId : undefined,
    tags: Array.isArray(item.tags) ? item.tags.filter((t: any) => typeof t === 'string') : [],
    created: item.created,
    updated: item.updated,
  }
}

function sanitizeExperience(item: any): Experience | null {
  if (!hasBaseAuditFields(item)) return null
  if (
    typeof item.role !== 'string' ||
    typeof item.company !== 'string' ||
    typeof item.startDate !== 'string'
  ) {
    return null
  }

  return {
    id: item.id,
    role: item.role,
    company: item.company,
    startDate: item.startDate,
    endDate: typeof item.endDate === 'string' ? item.endDate : undefined,
    isCurrent: Boolean(item.isCurrent),
    description: typeof item.description === 'string' ? item.description : '',
    skills: Array.isArray(item.skills) ? item.skills.filter((s: any) => typeof s === 'string') : [],
    created: item.created,
    updated: item.updated,
  }
}

function sanitizeWorkNote(item: any): WorkNote | null {
  if (!hasBaseAuditFields(item)) return null
  if (typeof item.title !== 'string' || typeof item.date !== 'string') return null

  return {
    id: item.id,
    title: item.title,
    date: item.date,
    body: typeof item.body === 'string' ? item.body : '',
    tags: Array.isArray(item.tags) ? item.tags.filter((t: any) => typeof t === 'string') : [],
    created: item.created,
    updated: item.updated,
  }
}

function sanitizeSettings(item: any): AppSettings | undefined {
  if (!item || typeof item !== 'object') return undefined
  const validThemes = ['claro', 'escuro', 'sistema'].includes(item.theme) ? item.theme : 'sistema'
  const activeModules: Record<ModuleKey, boolean> = {
    escrita: Boolean(item.activeModules?.escrita ?? true),
    leitura: Boolean(item.activeModules?.leitura ?? true),
    treino: Boolean(item.activeModules?.treino ?? true),
    estudos: Boolean(item.activeModules?.estudos ?? true),
    trabalho: Boolean(item.activeModules?.trabalho ?? true),
  }

  return {
    theme: validThemes,
    activeModules,
    hasSeenOnboarding: Boolean(item.hasSeenOnboarding ?? true),
    userName: typeof item.userName === 'string' ? item.userName : '',
  }
}

export const backupRepository = {
  async exportAll(): Promise<ExportDataPayload> {
    const settings = settingsRepository.getSettings()
    const escrita_notes = await idb.getAll<EscritaNote>(idb.STORE_ESCRITA)
    const livros = await idb.getAll<Livro>(idb.STORE_LIVROS)
    const livro_anotacoes = await idb.getAll<LivroAnotacao>(idb.STORE_LIVRO_ANOTACOES)
    const leitura_historico = await idb.getAll<LeituraHistorico>(idb.STORE_LEITURA_HISTORICO)
    const treino_plano_semanal = await idb.getAll<TreinoPlanoSemanal>(idb.STORE_TREINO_PLANO)
    const treino_log = await idb.getAll<TreinoLog>(idb.STORE_TREINO_LOG)
    const courses = await idb.getAll<Course>(idb.STORE_COURSES)
    const study_pages = await idb.getAll<StudyPage>(idb.STORE_STUDY_PAGES)
    const study_certificates = await idb.getAll<StudyCertificate>(idb.STORE_STUDY_CERTIFICATES)
    const study_sessions = await idb.getAll<StudySession>(idb.STORE_STUDY_SESSIONS)
    const study_goals = await idb.getAll<StudyGoal>(idb.STORE_STUDY_GOALS)
    const projects = await idb.getAll<Project>(idb.STORE_PROJECTS)
    const achievements = await idb.getAll<Achievement>(idb.STORE_ACHIEVEMENTS)
    const experiences = await idb.getAll<Experience>(idb.STORE_EXPERIENCES)
    const work_notes = await idb.getAll<WorkNote>(idb.STORE_WORK_NOTES)

    return {
      schemaVersion: BACKUP_SCHEMA_VERSION,
      appName: 'Rotina',
      exportedAt: new Date().toISOString(),
      settings,
      collections: {
        escrita_notes,
        livros,
        livro_anotacoes,
        leitura_historico,
        treino_plano_semanal,
        treino_log,
        courses,
        study_pages,
        study_certificates,
        study_sessions,
        study_goals,
        projects,
        achievements,
        experiences,
        work_notes,
      },
    }
  },

  /**
   * Valida item a item o payload recebido, sanitiza cada registro para conter
   * APENAS campos conhecidos e descarta registros inválidos reportando quantos foram ignorados.
   */
  async validatePayload(payload: unknown): Promise<ValidationSummary> {
    if (!payload || typeof payload !== 'object') {
      throw new Error('Formato de arquivo inválido: o arquivo não contém um objeto JSON.')
    }

    const p = payload as Partial<ExportDataPayload>
    if (!p.collections || typeof p.collections !== 'object') {
      throw new Error('Estrutura de dados corrompida: bloco "collections" ausente.')
    }

    const cols = p.collections
    if (
      !Array.isArray(cols.escrita_notes) ||
      !Array.isArray(cols.livros) ||
      !Array.isArray(cols.livro_anotacoes) ||
      !Array.isArray(cols.leitura_historico) ||
      !Array.isArray(cols.treino_plano_semanal) ||
      !Array.isArray(cols.treino_log)
    ) {
      throw new Error(
        'Estrutura de coleções incompleta: coleções fundamentais ausentes ou corrompidas.',
      )
    }

    const ignoredDetails: { collection: string; reason: string }[] = []
    let ignoredCount = 0

    const processCollection = <T>(
      items: unknown[] | undefined,
      collectionName: string,
      sanitizer: (item: any) => T | null,
    ): T[] => {
      if (!Array.isArray(items)) return []
      const validItems: T[] = []
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        const sanitized = sanitizer(item)
        if (sanitized) {
          validItems.push(sanitized)
        } else {
          ignoredCount++
          ignoredDetails.push({
            collection: collectionName,
            reason: `Item ${i} descartado: id (UUID), created ou updated inválidos/ausentes ou dados incompatíveis.`,
          })
        }
      }
      return validItems
    }

    const sanitizedEscrita = processCollection(
      cols.escrita_notes,
      'escrita_notes',
      sanitizeEscritaNote,
    )
    const sanitizedLivros = processCollection(cols.livros, 'livros', sanitizeLivro)
    const sanitizedLivroAnotacoes = processCollection(
      cols.livro_anotacoes,
      'livro_anotacoes',
      sanitizeLivroAnotacao,
    )
    const sanitizedLeituraHistorico = processCollection(
      cols.leitura_historico,
      'leitura_historico',
      sanitizeLeituraHistorico,
    )
    const sanitizedTreinoPlano = processCollection(
      cols.treino_plano_semanal,
      'treino_plano_semanal',
      sanitizeTreinoPlanoSemanal,
    )
    const sanitizedTreinoLog = processCollection(cols.treino_log, 'treino_log', sanitizeTreinoLog)

    const sanitizedCourses = processCollection(cols.courses, 'courses', sanitizeCourse)
    const sanitizedStudyPages = processCollection(
      cols.study_pages,
      'study_pages',
      sanitizeStudyPage,
    )
    const sanitizedStudyCertificates = processCollection(
      cols.study_certificates,
      'study_certificates',
      sanitizeStudyCertificate,
    )
    const sanitizedStudySessions = processCollection(
      cols.study_sessions,
      'study_sessions',
      sanitizeStudySession,
    )
    const sanitizedStudyGoals = processCollection(
      cols.study_goals,
      'study_goals',
      sanitizeStudyGoal,
    )

    const sanitizedProjects = processCollection(cols.projects, 'projects', sanitizeProject)
    const sanitizedAchievements = processCollection(
      cols.achievements,
      'achievements',
      sanitizeAchievement,
    )
    const sanitizedExperiences = processCollection(
      cols.experiences,
      'experiences',
      sanitizeExperience,
    )
    const sanitizedWorkNotes = processCollection(cols.work_notes, 'work_notes', sanitizeWorkNote)

    const validPayload: ExportDataPayload = {
      schemaVersion: BACKUP_SCHEMA_VERSION,
      appName: 'Rotina',
      exportedAt: typeof p.exportedAt === 'string' ? p.exportedAt : new Date().toISOString(),
      settings: sanitizeSettings(p.settings) || settingsRepository.getSettings(),
      collections: {
        escrita_notes: sanitizedEscrita,
        livros: sanitizedLivros,
        livro_anotacoes: sanitizedLivroAnotacoes,
        leitura_historico: sanitizedLeituraHistorico,
        treino_plano_semanal: sanitizedTreinoPlano,
        treino_log: sanitizedTreinoLog,
        courses: sanitizedCourses,
        study_pages: sanitizedStudyPages,
        study_certificates: sanitizedStudyCertificates,
        study_sessions: sanitizedStudySessions,
        study_goals: sanitizedStudyGoals,
        projects: sanitizedProjects,
        achievements: sanitizedAchievements,
        experiences: sanitizedExperiences,
        work_notes: sanitizedWorkNotes,
      },
    }

    return {
      validPayload,
      ignoredCount,
      ignoredDetails,
    }
  },

  /**
   * Importa o backup com atomicidade garantida:
   * 1. Valida e sanitiza todos os registros em memória.
   * 2. Executa toda a limpeza e regravação dentro de UMA ÚNICA transação IndexedDB.
   * 3. Se qualquer erro ocorrer, a transação sofre rollback no motor IDB sem deixar órfãos.
   */
  async importAll(payload: unknown): Promise<ImportResult> {
    const { validPayload, ignoredCount } = await this.validatePayload(payload)
    const c = validPayload.collections

    const allStores = [
      idb.STORE_ESCRITA,
      idb.STORE_LIVROS,
      idb.STORE_LIVRO_ANOTACOES,
      idb.STORE_LEITURA_HISTORICO,
      idb.STORE_TREINO_PLANO,
      idb.STORE_TREINO_LOG,
      idb.STORE_COURSES,
      idb.STORE_STUDY_PAGES,
      idb.STORE_STUDY_CERTIFICATES,
      idb.STORE_STUDY_SESSIONS,
      idb.STORE_STUDY_GOALS,
      idb.STORE_PROJECTS,
      idb.STORE_ACHIEVEMENTS,
      idb.STORE_EXPERIENCES,
      idb.STORE_WORK_NOTES,
    ]

    let totalImported = 0

    // Toda a operação roda em UMA ÚNICA transação IndexedDB
    await idb.runTransaction(allStores, 'readwrite', (tx) => {
      // 1. Limpa todas as 15 stores
      for (const storeName of allStores) {
        tx.objectStore(storeName).clear()
      }

      // 2. Insere registros sanitizados
      const storeEscrita = tx.objectStore(idb.STORE_ESCRITA)
      for (const item of c.escrita_notes) {
        storeEscrita.put(item)
        totalImported++
      }

      const storeLivros = tx.objectStore(idb.STORE_LIVROS)
      for (const item of c.livros) {
        storeLivros.put(item)
        totalImported++
      }

      const storeLivroAnotacoes = tx.objectStore(idb.STORE_LIVRO_ANOTACOES)
      for (const item of c.livro_anotacoes) {
        storeLivroAnotacoes.put(item)
        totalImported++
      }

      const storeLeituraHist = tx.objectStore(idb.STORE_LEITURA_HISTORICO)
      for (const item of c.leitura_historico) {
        storeLeituraHist.put(item)
        totalImported++
      }

      const storeTreinoPlano = tx.objectStore(idb.STORE_TREINO_PLANO)
      for (const item of c.treino_plano_semanal) {
        storeTreinoPlano.put(item)
        totalImported++
      }

      const storeTreinoLog = tx.objectStore(idb.STORE_TREINO_LOG)
      for (const item of c.treino_log) {
        storeTreinoLog.put(item)
        totalImported++
      }

      if (c.courses) {
        const storeCourses = tx.objectStore(idb.STORE_COURSES)
        for (const item of c.courses) {
          storeCourses.put(item)
          totalImported++
        }
      }

      if (c.study_pages) {
        const storePages = tx.objectStore(idb.STORE_STUDY_PAGES)
        for (const item of c.study_pages) {
          storePages.put(item)
          totalImported++
        }
      }

      if (c.study_certificates) {
        const storeCerts = tx.objectStore(idb.STORE_STUDY_CERTIFICATES)
        for (const item of c.study_certificates) {
          storeCerts.put(item)
          totalImported++
        }
      }

      if (c.study_sessions) {
        const storeSessions = tx.objectStore(idb.STORE_STUDY_SESSIONS)
        for (const item of c.study_sessions) {
          storeSessions.put(item)
          totalImported++
        }
      }

      if (c.study_goals) {
        const storeGoals = tx.objectStore(idb.STORE_STUDY_GOALS)
        for (const item of c.study_goals) {
          storeGoals.put(item)
          totalImported++
        }
      }

      if (c.projects) {
        const storeProjects = tx.objectStore(idb.STORE_PROJECTS)
        for (const item of c.projects) {
          storeProjects.put(item)
          totalImported++
        }
      }

      if (c.achievements) {
        const storeAchievements = tx.objectStore(idb.STORE_ACHIEVEMENTS)
        for (const item of c.achievements) {
          storeAchievements.put(item)
          totalImported++
        }
      }

      if (c.experiences) {
        const storeExperiences = tx.objectStore(idb.STORE_EXPERIENCES)
        for (const item of c.experiences) {
          storeExperiences.put(item)
          totalImported++
        }
      }

      if (c.work_notes) {
        const storeWorkNotes = tx.objectStore(idb.STORE_WORK_NOTES)
        for (const item of c.work_notes) {
          storeWorkNotes.put(item)
          totalImported++
        }
      }
    })

    // Salva configurações após sucesso da transação de banco
    if (validPayload.settings) {
      settingsRepository.saveSettings(validPayload.settings)
    }

    return {
      importedCount: totalImported,
      ignoredCount,
    }
  },

  async clearAll(): Promise<void> {
    const allStores = [
      idb.STORE_ESCRITA,
      idb.STORE_LIVROS,
      idb.STORE_LIVRO_ANOTACOES,
      idb.STORE_LEITURA_HISTORICO,
      idb.STORE_TREINO_PLANO,
      idb.STORE_TREINO_LOG,
      idb.STORE_COURSES,
      idb.STORE_STUDY_PAGES,
      idb.STORE_STUDY_CERTIFICATES,
      idb.STORE_STUDY_SESSIONS,
      idb.STORE_STUDY_GOALS,
      idb.STORE_PROJECTS,
      idb.STORE_ACHIEVEMENTS,
      idb.STORE_EXPERIENCES,
      idb.STORE_WORK_NOTES,
    ]

    await idb.runTransaction(allStores, 'readwrite', (tx) => {
      for (const store of allStores) {
        tx.objectStore(store).clear()
      }
    })

    // Reseta configurações básicas preservando tema
    const current = settingsRepository.getSettings()
    settingsRepository.saveSettings({
      ...current,
      hasSeenOnboarding: true,
    })
  },
}
