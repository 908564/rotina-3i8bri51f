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
  DaySummary,
  Task,
  TaskLink,
  TaskSubtask,
  Idea,
  ActivityPlan,
  ActivityLog,
  ModuleDay,
  Medal,
} from '../types'

/** Limite máximo padrão para arquivo de backup (150 MB) */
export const MAX_BACKUP_FILE_BYTES = 150 * 1024 * 1024

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * Validação de data URL permitida para imagem (PNG, JPEG, WEBP, GIF em base64)
 */
const ALLOWED_IMAGE_DATA_URL_REGEX = /^data:image\/(png|jpeg|jpg|webp|gif);base64,/i

/**
 * Validação de data URL permitida para certificado (PDF ou imagem em base64)
 */
const ALLOWED_CERTIFICATE_DATA_URL_REGEX =
  /^data:(application\/pdf|image\/(png|jpeg|jpg|webp|gif));base64,/i

/**
 * Valida se a URL é HTTP ou HTTPS absoluta
 */
function isValidHttpUrl(url: unknown): boolean {
  if (typeof url !== 'string' || !url.trim()) return false
  try {
    const parsed = new URL(url.trim())
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

export interface ValidationSummary {
  validPayload: ExportDataPayload
  ignoredCount: number
  ignoredDetails: { collection: string; reason: string }[]
  hasAttachments: boolean
}

export interface ImportResult {
  importedCount: number
  ignoredCount: number
  hasAttachments: boolean
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

  // Validação de coverPhoto: aceitar apenas data URL de imagem permitida.
  // Se for string mas não casar com data URL permitida, descarta o valor (coverPhoto vira undefined).
  let coverPhoto: string | undefined = undefined
  if (typeof item.coverPhoto === 'string' && item.coverPhoto.trim()) {
    if (ALLOWED_IMAGE_DATA_URL_REGEX.test(item.coverPhoto.trim())) {
      coverPhoto = item.coverPhoto.trim()
    }
  }

  return {
    id: item.id,
    title: item.title,
    author: item.author,
    totalPages: typeof item.totalPages === 'number' ? item.totalPages : undefined,
    currentPage: typeof item.currentPage === 'number' ? Math.max(0, item.currentPage) : 0,
    status: validStatus,
    coverPhoto,
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

  // Valida courseUrl: aceitar apenas http:// ou https://. Descarta apenas o valor se inválido.
  let validCourseUrl: string | undefined = undefined
  if (typeof item.courseUrl === 'string' && item.courseUrl.trim()) {
    if (isValidHttpUrl(item.courseUrl)) {
      validCourseUrl = item.courseUrl.trim()
    }
  }

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
    courseUrl: validCourseUrl,
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

  const trimmedData = item.fileData.trim()
  // Regra 4: fileData de certificados no backup: aceitar apenas data URLs
  // começando com "data:application/pdf;base64," ou "data:image/(png|jpeg|webp|gif);base64,";
  // registros fora disso são ignorados e contados como inválidos.
  if (!ALLOWED_CERTIFICATE_DATA_URL_REGEX.test(trimmedData)) {
    return null
  }

  const isPdf = trimmedData.startsWith('data:application/pdf;')
  const fileType = isPdf ? 'pdf' : 'image'

  return {
    id: item.id,
    courseId: item.courseId,
    title: item.title,
    issueDate: typeof item.issueDate === 'string' ? item.issueDate : undefined,
    fileData: trimmedData,
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
  if (!isValidUuid(item.courseId)) return null

  const weeklyMinutes = typeof item.weeklyMinutes === 'number' ? item.weeklyMinutes : undefined
  const dailyMinutes = typeof item.dailyMinutes === 'number' ? item.dailyMinutes : undefined

  // Se não tem nem semanal nem diária, não é uma meta válida
  if (weeklyMinutes === undefined && dailyMinutes === undefined) return null

  const history = Array.isArray(item.history)
    ? item.history
        .filter((h: any) => h && typeof h === 'object' && typeof h.effectiveDate === 'string')
        .map((h: any) => ({
          id: isValidUuid(h.id) ? h.id : crypto.randomUUID(),
          courseId: item.courseId,
          effectiveDate: h.effectiveDate,
          weeklyMinutes: typeof h.weeklyMinutes === 'number' ? h.weeklyMinutes : weeklyMinutes,
          dailyMinutes: typeof h.dailyMinutes === 'number' ? h.dailyMinutes : dailyMinutes,
          created: isValidIsoDate(h.created) ? h.created : item.created,
        }))
    : []

  return {
    id: item.id,
    courseId: item.courseId,
    weeklyMinutes,
    dailyMinutes,
    history,
    created: item.created,
    updated: item.updated,
  }
}

function sanitizeDaySummary(item: any): DaySummary | null {
  if (!item || typeof item !== 'object') return null
  if (typeof item.date !== 'string' || !item.date.match(/^\d{4}-\d{2}-\d{2}$/)) return null
  if (!isValidIsoDate(item.createdAt) || !isValidIsoDate(item.updatedAt)) return null

  return {
    date: item.date,
    goalsTotal: typeof item.goalsTotal === 'number' ? Math.max(0, item.goalsTotal) : 0,
    goalsDone: typeof item.goalsDone === 'number' ? Math.max(0, item.goalsDone) : 0,
    closed: Boolean(item.closed),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }
}

function sanitizeTask(item: any): Task | null {
  if (!item || typeof item !== 'object') return null
  if (!isValidUuid(item.id) || !isValidIsoDate(item.createdAt) || !isValidIsoDate(item.updatedAt)) {
    return null
  }
  if (typeof item.title !== 'string' || !item.title.trim()) return null

  const validModules = ['geral', 'leitura', 'treino', 'escrita', 'estudos', 'trabalho']
  const module = validModules.includes(item.module) ? item.module : 'geral'

  const validPriorities = ['low', 'normal', 'high']
  // aceita retrocompatibilidade alta/media/baixa ou low/normal/high
  let priority = validPriorities.includes(item.priority) ? item.priority : 'normal'
  if (item.priority === 'alta') priority = 'high'
  else if (item.priority === 'baixa') priority = 'low'
  else if (item.priority === 'media') priority = 'normal'

  const validStatuses = ['open', 'done']
  let status = validStatuses.includes(item.status) ? item.status : 'open'
  if (item.status === 'concluida') status = 'done'
  else if (item.status === 'pendente') status = 'open'

  let link: TaskLink | null = null
  if (item.link && typeof item.link === 'object') {
    if (
      ['book', 'course', 'project', 'workoutDay'].includes(item.link.type) &&
      typeof item.link.id === 'string'
    ) {
      link = {
        type: item.link.type,
        id: item.link.id,
      }
    } else if (
      ['livro', 'curso', 'projeto', 'treino'].includes(item.link.type) &&
      typeof item.link.id === 'string'
    ) {
      const typeMap: Record<string, 'book' | 'course' | 'project' | 'workoutDay'> = {
        livro: 'book',
        curso: 'course',
        projeto: 'project',
        treino: 'workoutDay',
      }
      link = {
        type: typeMap[item.link.type] || 'book',
        id: item.link.id,
      }
    }
  }

  const subtasks: TaskSubtask[] = Array.isArray(item.subtasks)
    ? item.subtasks
        .filter((s: any) => s && typeof s === 'object' && typeof s.title === 'string')
        .slice(0, 20)
        .map((s: any) => ({
          id: typeof s.id === 'string' ? s.id : crypto.randomUUID(),
          title: s.title.slice(0, 100),
          done: Boolean(s.done ?? s.completed),
        }))
    : []

  // moduleData sanitization
  let moduleData: any = null
  if (item.moduleData && typeof item.moduleData === 'object' && item.moduleData.module) {
    const md = item.moduleData
    if (md.module === 'escrita' && md.data) {
      const tipo = ['diario', 'ideia'].includes(md.data.tipo) ? md.data.tipo : 'diario'
      moduleData = {
        module: 'escrita',
        data: {
          tipo,
          tema: typeof md.data.tema === 'string' ? md.data.tema.slice(0, 80) : undefined,
          metaMinutos:
            typeof md.data.metaMinutos === 'number' ? Math.max(0, md.data.metaMinutos) : undefined,
        },
      }
    } else if (md.module === 'leitura' && md.data) {
      moduleData = {
        module: 'leitura',
        data: {
          bookId: typeof md.data.bookId === 'string' ? md.data.bookId : undefined,
          metaPaginas:
            typeof md.data.metaPaginas === 'number' ? Math.max(0, md.data.metaPaginas) : undefined,
          metaMinutos:
            typeof md.data.metaMinutos === 'number' ? Math.max(0, md.data.metaMinutos) : undefined,
          atePagina:
            typeof md.data.atePagina === 'number' ? Math.max(0, md.data.atePagina) : undefined,
        },
      }
    } else if (md.module === 'treino' && md.data) {
      const tipo = ['musculacao', 'cardio', 'outros'].includes(md.data.tipo)
        ? md.data.tipo
        : 'musculacao'
      const treinoData: any = { tipo }
      if (tipo === 'musculacao' && md.data.musculacao) {
        treinoData.musculacao = {
          subtipo: ['academia', 'calistenia'].includes(md.data.musculacao.subtipo)
            ? md.data.musculacao.subtipo
            : 'academia',
          diaOuGrupo:
            typeof md.data.musculacao.diaOuGrupo === 'string' ? md.data.musculacao.diaOuGrupo : '',
        }
      } else if (tipo === 'cardio' && md.data.cardio) {
        treinoData.cardio = {
          modalidade: ['corrida', 'caminhada', 'bicicleta'].includes(md.data.cardio.modalidade)
            ? md.data.cardio.modalidade
            : 'corrida',
          metaDistancia:
            typeof md.data.cardio.metaDistancia === 'number'
              ? Math.max(0, md.data.cardio.metaDistancia)
              : undefined,
          metaTempo:
            typeof md.data.cardio.metaTempo === 'number'
              ? Math.max(0, md.data.cardio.metaTempo)
              : undefined,
          intensidade: ['leve', 'moderada', 'intensa'].includes(md.data.cardio.intensidade)
            ? md.data.cardio.intensidade
            : 'moderada',
        }
      } else if (tipo === 'outros' && md.data.outros) {
        treinoData.outros = {
          esporte: typeof md.data.outros.esporte === 'string' ? md.data.outros.esporte : '',
          duracao:
            typeof md.data.outros.duracao === 'number'
              ? Math.max(0, md.data.outros.duracao)
              : undefined,
        }
      }
      moduleData = { module: 'treino', data: treinoData }
    } else if (md.module === 'estudos' && md.data) {
      const validAtividades = ['assistir_aula', 'ler', 'exercicios', 'revisar', 'entrega_prova']
      moduleData = {
        module: 'estudos',
        data: {
          vinculoTipo: ['faculdade', 'curso', 'certificacao', 'outros'].includes(
            md.data.vinculoTipo,
          )
            ? md.data.vinculoTipo
            : undefined,
          courseId: typeof md.data.courseId === 'string' ? md.data.courseId : undefined,
          estudoAutonomoNome:
            typeof md.data.estudoAutonomoNome === 'string' ? md.data.estudoAutonomoNome : undefined,
          tipoAtividade: validAtividades.includes(md.data.tipoAtividade)
            ? md.data.tipoAtividade
            : 'assistir_aula',
          metaMinutos:
            typeof md.data.metaMinutos === 'number' ? Math.max(0, md.data.metaMinutos) : undefined,
          tema: typeof md.data.tema === 'string' ? md.data.tema.slice(0, 80) : undefined,
        },
      }
    } else if (md.module === 'trabalho' && md.data) {
      moduleData = {
        module: 'trabalho',
        data: {
          projectId: typeof md.data.projectId === 'string' ? md.data.projectId : undefined,
          tipo: ['tarefa', 'reuniao', 'entrega'].includes(md.data.tipo) ? md.data.tipo : 'tarefa',
          sugerirConquista: Boolean(md.data.sugerirConquista),
        },
      }
    } else if (md.module === 'geral') {
      moduleData = { module: 'geral', data: {} }
    }
  }

  return {
    id: item.id,
    title: item.title.slice(0, 140),
    module,
    link,
    dueDate: typeof item.dueDate === 'string' ? item.dueDate : null,
    dueTime: typeof item.dueTime === 'string' ? item.dueTime : null,
    reminder: Boolean(item.reminder),
    priority,
    status,
    completedAt:
      typeof item.completedAt === 'string' && isValidIsoDate(item.completedAt)
        ? item.completedAt
        : null,
    subtasks,
    moduleData,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    deletedAt:
      typeof item.deletedAt === 'string' && isValidIsoDate(item.deletedAt) ? item.deletedAt : null,
  }
}

function sanitizeIdea(item: any): Idea | null {
  if (!item || typeof item !== 'object') return null
  if (!isValidUuid(item.id) || !isValidIsoDate(item.createdAt) || !isValidIsoDate(item.updatedAt))
    return null
  if (typeof item.title !== 'string' || !item.title.trim()) return null

  return {
    id: item.id,
    title: item.title,
    body: typeof item.body === 'string' ? item.body : '',
    tags: Array.isArray(item.tags) ? item.tags.filter((t: any) => typeof t === 'string') : [],
    status: ['aberta', 'em_andamento', 'arquivada'].includes(item.status) ? item.status : 'aberta',
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }
}

function sanitizeActivityPlan(item: any): ActivityPlan | null {
  if (!item || typeof item !== 'object') return null
  if (!isValidUuid(item.id) || !isValidIsoDate(item.createdAt) || !isValidIsoDate(item.updatedAt))
    return null
  if (typeof item.title !== 'string' || !item.title.trim()) return null
  const validModules = ['escrita', 'leitura', 'treino', 'estudos', 'trabalho']
  const module = validModules.includes(item.module) ? item.module : 'leitura'

  return {
    id: item.id,
    module,
    title: item.title,
    targetValue: typeof item.targetValue === 'number' ? item.targetValue : undefined,
    unit: typeof item.unit === 'string' ? item.unit : undefined,
    frequency: ['diaria', 'semanal'].includes(item.frequency) ? item.frequency : undefined,
    metadata: item.metadata && typeof item.metadata === 'object' ? item.metadata : undefined,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }
}

function sanitizeActivityLog(item: any): ActivityLog | null {
  if (!item || typeof item !== 'object') return null
  if (!isValidUuid(item.id) || !isValidIsoDate(item.createdAt) || !isValidIsoDate(item.updatedAt))
    return null
  if (typeof item.date !== 'string' || !item.date.match(/^\d{4}-\d{2}-\d{2}$/)) return null
  const validModules = ['escrita', 'leitura', 'treino', 'estudos', 'trabalho']
  const module = validModules.includes(item.module) ? item.module : 'leitura'

  return {
    id: item.id,
    module,
    planId: isValidUuid(item.planId) ? item.planId : undefined,
    date: item.date,
    value: typeof item.value === 'number' ? item.value : undefined,
    durationMinutes: typeof item.durationMinutes === 'number' ? item.durationMinutes : undefined,
    notes: typeof item.notes === 'string' ? item.notes : undefined,
    source: ['auto', 'manual', 'timer'].includes(item.source) ? item.source : 'auto',
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }
}

function sanitizeModuleDay(item: any): ModuleDay | null {
  if (!item || typeof item !== 'object') return null
  if (!isValidUuid(item.id) || !isValidIsoDate(item.createdAt) || !isValidIsoDate(item.updatedAt))
    return null
  if (typeof item.date !== 'string' || !item.date.match(/^\d{4}-\d{2}-\d{2}$/)) return null

  const validModules = ['leitura', 'treino', 'escrita', 'estudos']
  if (!validModules.includes(item.module)) return null

  const validSources = ['auto', 'manual', 'timer']
  const source = validSources.includes(item.source) ? item.source : 'auto'

  return {
    id: item.id,
    date: item.date,
    module: item.module,
    goalDefined: Boolean(item.goalDefined),
    done: Boolean(item.done),
    source,
    value: typeof item.value === 'number' ? item.value : undefined,
    doneAt: typeof item.doneAt === 'string' && isValidIsoDate(item.doneAt) ? item.doneAt : null,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }
}

function sanitizeMedal(item: any): Medal | null {
  if (!item || typeof item !== 'object') return null
  if (!isValidUuid(item.id) || !isValidIsoDate(item.createdAt) || !isValidIsoDate(item.updatedAt))
    return null
  if (typeof item.code !== 'string' || !item.code.trim()) return null
  if (typeof item.title !== 'string' || !item.title.trim()) return null
  if (!isValidIsoDate(item.earnedAt)) return null

  return {
    id: item.id,
    code: item.code,
    title: item.title,
    description: typeof item.description === 'string' ? item.description : '',
    module: typeof item.module === 'string' ? item.module : undefined,
    earnedAt: item.earnedAt,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
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
          completedAt:
            typeof t.completedAt === 'string' && isValidIsoDate(t.completedAt)
              ? t.completedAt
              : undefined,
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
    firstTimeWelcomeDismissed: Boolean(item.firstTimeWelcomeDismissed ?? false),
    userName: typeof item.userName === 'string' ? item.userName : '',
  }
}

export const backupRepository = {
  async getCollectionCounts(): Promise<Record<string, number>> {
    const counts: Record<string, number> = {}
    const stores = [
      { key: 'escrita_notes', store: idb.STORE_ESCRITA },
      { key: 'livros', store: idb.STORE_LIVROS },
      { key: 'livro_anotacoes', store: idb.STORE_LIVRO_ANOTACOES },
      { key: 'leitura_historico', store: idb.STORE_LEITURA_HISTORICO },
      { key: 'treino_plano_semanal', store: idb.STORE_TREINO_PLANO },
      { key: 'treino_log', store: idb.STORE_TREINO_LOG },
      { key: 'courses', store: idb.STORE_COURSES },
      { key: 'study_pages', store: idb.STORE_STUDY_PAGES },
      { key: 'study_certificates', store: idb.STORE_STUDY_CERTIFICATES },
      { key: 'study_sessions', store: idb.STORE_STUDY_SESSIONS },
      { key: 'study_goals', store: idb.STORE_STUDY_GOALS },
      { key: 'projects', store: idb.STORE_PROJECTS },
      { key: 'achievements', store: idb.STORE_ACHIEVEMENTS },
      { key: 'experiences', store: idb.STORE_EXPERIENCES },
      { key: 'work_notes', store: idb.STORE_WORK_NOTES },
      { key: 'day_summaries', store: idb.STORE_DAY_SUMMARIES },
      { key: 'tasks', store: idb.STORE_TASKS },
      { key: 'ideas', store: idb.STORE_IDEAS },
      { key: 'activity_plans', store: idb.STORE_ACTIVITY_PLANS },
      { key: 'activity_logs', store: idb.STORE_ACTIVITY_LOGS },
      { key: 'module_days', store: idb.STORE_MODULE_DAYS },
      { key: 'medals', store: idb.STORE_MEDALS },
    ]

    for (const { key, store } of stores) {
      const items = await idb.getAll(store)
      counts[key] = items.length
    }
    return counts
  },

  async exportAll(options?: { omitAttachments?: boolean }): Promise<ExportDataPayload> {
    const settings = settingsRepository.getSettings()
    const escrita_notes = await idb.getAll<EscritaNote>(idb.STORE_ESCRITA)
    let livros = await idb.getAll<Livro>(idb.STORE_LIVROS)
    const livro_anotacoes = await idb.getAll<LivroAnotacao>(idb.STORE_LIVRO_ANOTACOES)
    const leitura_historico = await idb.getAll<LeituraHistorico>(idb.STORE_LEITURA_HISTORICO)
    const treino_plano_semanal = await idb.getAll<TreinoPlanoSemanal>(idb.STORE_TREINO_PLANO)
    const treino_log = await idb.getAll<TreinoLog>(idb.STORE_TREINO_LOG)
    const courses = await idb.getAll<Course>(idb.STORE_COURSES)
    const study_pages = await idb.getAll<StudyPage>(idb.STORE_STUDY_PAGES)
    let study_certificates = await idb.getAll<StudyCertificate>(idb.STORE_STUDY_CERTIFICATES)
    const study_sessions = await idb.getAll<StudySession>(idb.STORE_STUDY_SESSIONS)
    const study_goals = await idb.getAll<StudyGoal>(idb.STORE_STUDY_GOALS)
    const projects = await idb.getAll<Project>(idb.STORE_PROJECTS)
    const achievements = await idb.getAll<Achievement>(idb.STORE_ACHIEVEMENTS)
    const experiences = await idb.getAll<Experience>(idb.STORE_EXPERIENCES)
    const work_notes = await idb.getAll<WorkNote>(idb.STORE_WORK_NOTES)
    const day_summaries = await idb.getAll<DaySummary>(idb.STORE_DAY_SUMMARIES)
    const tasks = await idb.getAll<Task>(idb.STORE_TASKS)
    const ideas = await idb.getAll<Idea>(idb.STORE_IDEAS)
    const activity_plans = await idb.getAll<ActivityPlan>(idb.STORE_ACTIVITY_PLANS)
    const activity_logs = await idb.getAll<ActivityLog>(idb.STORE_ACTIVITY_LOGS)
    const module_days = await idb.getAll<ModuleDay>(idb.STORE_MODULE_DAYS)
    const medals = await idb.getAll<Medal>(idb.STORE_MEDALS)

    if (options?.omitAttachments) {
      livros = livros.map((book) => {
        const { coverPhoto, ...rest } = book
        return rest
      })
      // Em certificados, omite certificados com fileData vazio para não quebrar a validação na importação
      study_certificates = []
    }

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
        day_summaries,
        tasks,
        ideas,
        activity_plans,
        activity_logs,
        module_days,
        medals,
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
    const sanitizedDaySummaries = processCollection(
      cols.day_summaries,
      'day_summaries',
      sanitizeDaySummary,
    )

    const sanitizedTasks = processCollection(cols.tasks, 'tasks', sanitizeTask)
    const sanitizedIdeas = processCollection(cols.ideas, 'ideas', sanitizeIdea)
    const sanitizedActivityPlans = processCollection(
      cols.activity_plans,
      'activity_plans',
      sanitizeActivityPlan,
    )
    const sanitizedActivityLogs = processCollection(
      cols.activity_logs,
      'activity_logs',
      sanitizeActivityLog,
    )
    const sanitizedModuleDays = processCollection(
      cols.module_days,
      'module_days',
      sanitizeModuleDay,
    )
    const sanitizedMedals = processCollection(cols.medals, 'medals', sanitizeMedal)

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
        day_summaries: sanitizedDaySummaries,
        tasks: sanitizedTasks,
        ideas: sanitizedIdeas,
        activity_plans: sanitizedActivityPlans,
        activity_logs: sanitizedActivityLogs,
        module_days: sanitizedModuleDays,
        medals: sanitizedMedals,
      },
    }

    // Detecta se o payload contém anexos (capas de livros ou certificados com arquivo)
    const hasBookCovers = sanitizedLivros.some((b) => Boolean(b.coverPhoto))
    const hasCertFiles = sanitizedStudyCertificates.some((c) =>
      Boolean(c.fileData && c.fileData.trim()),
    )
    const hasAttachments = hasBookCovers || hasCertFiles

    return {
      validPayload,
      ignoredCount,
      ignoredDetails,
      hasAttachments,
    }
  },

  /**
   * Importa o backup com atomicidade garantida:
   * 1. Valida e sanitiza todos os registros em memória.
   * 2. Executa toda a limpeza e regravação dentro de UMA ÚNICA transação IndexedDB.
   * 3. Se qualquer erro ocorrer, a transação sofre rollback no motor IDB sem deixar órfãos.
   */
  async importAll(payload: unknown): Promise<ImportResult> {
    const { validPayload, ignoredCount, hasAttachments } = await this.validatePayload(payload)
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
      idb.STORE_DAY_SUMMARIES,
      idb.STORE_TASKS,
      idb.STORE_IDEAS,
      idb.STORE_ACTIVITY_PLANS,
      idb.STORE_ACTIVITY_LOGS,
      idb.STORE_MODULE_DAYS,
      idb.STORE_MEDALS,
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

      if (c.day_summaries) {
        const storeDaySummaries = tx.objectStore(idb.STORE_DAY_SUMMARIES)
        for (const item of c.day_summaries) {
          storeDaySummaries.put(item)
          totalImported++
        }
      }

      if (c.tasks) {
        const storeTasks = tx.objectStore(idb.STORE_TASKS)
        for (const item of c.tasks) {
          storeTasks.put(item)
          totalImported++
        }
      }

      if (c.ideas) {
        const storeIdeas = tx.objectStore(idb.STORE_IDEAS)
        for (const item of c.ideas) {
          storeIdeas.put(item)
          totalImported++
        }
      }

      if (c.activity_plans) {
        const storeActivityPlans = tx.objectStore(idb.STORE_ACTIVITY_PLANS)
        for (const item of c.activity_plans) {
          storeActivityPlans.put(item)
          totalImported++
        }
      }

      if (c.activity_logs) {
        const storeActivityLogs = tx.objectStore(idb.STORE_ACTIVITY_LOGS)
        for (const item of c.activity_logs) {
          storeActivityLogs.put(item)
          totalImported++
        }
      }

      if (c.module_days) {
        const storeModuleDays = tx.objectStore(idb.STORE_MODULE_DAYS)
        for (const item of c.module_days) {
          storeModuleDays.put(item)
          totalImported++
        }
      }

      if (c.medals) {
        const storeMedals = tx.objectStore(idb.STORE_MEDALS)
        for (const item of c.medals) {
          storeMedals.put(item)
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
      hasAttachments,
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
      idb.STORE_DAY_SUMMARIES,
      idb.STORE_TASKS,
      idb.STORE_IDEAS,
      idb.STORE_ACTIVITY_PLANS,
      idb.STORE_ACTIVITY_LOGS,
      idb.STORE_MODULE_DAYS,
      idb.STORE_MEDALS,
      idb.STORE_TIMER_STATE,
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
      firstTimeWelcomeDismissed: true,
    })

    // Remove todas as chaves de localStorage usadas pelo app
    try {
      if (typeof localStorage !== 'undefined') {
        const appLocalStorageKeys = [
          'rotina_last_book_id',
          'rotina_last_opened_page',
          'rotina_last_course_time',
          'rotina_active_tab',
          'rotina_active_course_tab',
          'rotina_active_trabalho_tab',
        ]
        appLocalStorageKeys.forEach((k) => localStorage.removeItem(k))

        // Também varre quaisquer chaves com prefixo rotina_ exceto as configurações ativas que acabamos de setar
        const keysToRemove: string[] = []
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && key.startsWith('rotina_') && key !== 'rotina_settings') {
            keysToRemove.push(key)
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k))
      }
    } catch {
      // Ignora erro de acesso a localStorage
    }
  },
}
