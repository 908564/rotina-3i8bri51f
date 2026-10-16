import { idb } from '../indexedDb'
import {
  Course,
  StudyPage,
  StudyCertificate,
  StudySession,
  StudyGoal,
  StudyGoalHistory,
  CourseGoalProgress,
} from '../types'

const LAST_OPENED_PAGE_KEY = 'rotina_last_opened_study_page'
const LAST_COURSE_TIME_KEY = 'rotina_last_course_time'

export const estudosRepository = {
  // ========================
  // 1) CURSOS
  // ========================
  async getCourses(): Promise<Course[]> {
    const list = await idb.getAll<Course>(idb.STORE_COURSES)
    return list.sort((a, b) => b.updated.localeCompare(a.updated))
  },

  async getCourseById(id: string): Promise<Course | undefined> {
    return idb.get<Course>(idb.STORE_COURSES, id)
  },

  async saveCourse(
    course: Omit<Course, 'id' | 'created' | 'updated'> & { id?: string },
  ): Promise<Course> {
    const nowIso = new Date().toISOString()
    const isNew = !course.id
    const id = course.id || crypto.randomUUID()

    const existing = !isNew ? await this.getCourseById(id) : undefined

    const fullCourse: Course = {
      ...course,
      id,
      progress:
        course.progress !== undefined ? Math.max(0, Math.min(100, course.progress)) : undefined,
      created: existing?.created || nowIso,
      updated: nowIso,
    }

    await idb.put(idb.STORE_COURSES, fullCourse)
    return fullCourse
  },

  async deleteCourse(id: string): Promise<void> {
    await idb.delete(idb.STORE_COURSES, id)

    // Remove páginas associadas
    const pages = await this.getPagesByCourse(id)
    for (const p of pages) {
      await idb.delete(idb.STORE_STUDY_PAGES, p.id)
    }

    // Remove certificados associados
    const certs = await this.getCertificatesByCourse(id)
    for (const c of certs) {
      await idb.delete(idb.STORE_STUDY_CERTIFICATES, c.id)
    }

    // Remove sessões associadas
    const sessions = await this.getSessionsByCourse(id)
    for (const s of sessions) {
      await idb.delete(idb.STORE_STUDY_SESSIONS, s.id)
    }

    // Remove meta associada
    const goal = await this.getGoalByCourse(id)
    if (goal) {
      await idb.delete(idb.STORE_STUDY_GOALS, goal.id)
    }

    // Limpa última página se era desse curso
    const lastPage = this.getLastOpenedPage()
    if (lastPage && lastPage.courseId === id) {
      localStorage.removeItem(LAST_OPENED_PAGE_KEY)
    }
  },

  // ========================
  // 2) PÁGINAS DE ANOTAÇÃO COM BLOCOS
  // ========================
  async getPagesByCourse(courseId: string): Promise<StudyPage[]> {
    const all = await idb.getAll<StudyPage>(idb.STORE_STUDY_PAGES)
    return all
      .filter((p) => p.courseId === courseId)
      .sort((a, b) => b.updated.localeCompare(a.updated))
  },

  async getAllPages(): Promise<StudyPage[]> {
    return idb.getAll<StudyPage>(idb.STORE_STUDY_PAGES)
  },

  async getPageById(id: string): Promise<StudyPage | undefined> {
    return idb.get<StudyPage>(idb.STORE_STUDY_PAGES, id)
  },

  async savePage(
    page: Omit<StudyPage, 'id' | 'created' | 'updated'> & { id?: string },
  ): Promise<StudyPage> {
    const nowIso = new Date().toISOString()
    const id = page.id || crypto.randomUUID()
    const existing = page.id ? await this.getPageById(page.id) : undefined

    const fullPage: StudyPage = {
      ...page,
      id,
      created: existing?.created || nowIso,
      updated: nowIso,
    }

    await idb.put(idb.STORE_STUDY_PAGES, fullPage)

    // Atualiza timestamp do curso
    const course = await this.getCourseById(page.courseId)
    if (course) {
      await idb.put(idb.STORE_COURSES, { ...course, updated: nowIso })
    }

    // Marca como última aberta
    this.setLastOpenedPage({
      pageId: fullPage.id,
      courseId: fullPage.courseId,
      title: fullPage.title,
    })

    return fullPage
  },

  async deletePage(id: string): Promise<void> {
    const page = await this.getPageById(id)
    await idb.delete(idb.STORE_STUDY_PAGES, id)

    const lastPage = this.getLastOpenedPage()
    if (lastPage && lastPage.pageId === id) {
      localStorage.removeItem(LAST_OPENED_PAGE_KEY)
    }

    if (page) {
      const course = await this.getCourseById(page.courseId)
      if (course) {
        await idb.put(idb.STORE_COURSES, { ...course, updated: new Date().toISOString() })
      }
    }
  },

  setLastOpenedPage(info: { pageId: string; courseId: string; title: string }) {
    try {
      localStorage.setItem(LAST_OPENED_PAGE_KEY, JSON.stringify(info))
    } catch {
      // Ignora se localStorage indisponível
    }
  },

  getLastOpenedPage(): { pageId: string; courseId: string; title: string } | null {
    try {
      const raw = localStorage.getItem(LAST_OPENED_PAGE_KEY)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  },

  // Busca de texto em blocos de anotação de todos os cursos
  async searchNotes(
    query: string,
  ): Promise<{ page: StudyPage; course?: Course; matchedText: string }[]> {
    if (!query.trim()) return []
    const q = query.toLowerCase()
    const [allPages, courses] = await Promise.all([this.getAllPages(), this.getCourses()])
    const courseMap = new Map<string, Course>(courses.map((c) => [c.id, c]))

    const results: { page: StudyPage; course?: Course; matchedText: string }[] = []

    for (const page of allPages) {
      const titleMatch = page.title.toLowerCase().includes(q)
      let matchedText = ''

      if (titleMatch) {
        matchedText = `Título: ${page.title}`
      } else {
        for (const b of page.blocks) {
          if (b.content && b.content.toLowerCase().includes(q)) {
            matchedText = b.content
            break
          }
        }
      }

      if (matchedText) {
        results.push({
          page,
          course: courseMap.get(page.courseId),
          matchedText,
        })
      }
    }

    return results
  },

  // ========================
  // 3) CERTIFICADOS
  // ========================
  async getCertificatesByCourse(courseId: string): Promise<StudyCertificate[]> {
    const all = await idb.getAll<StudyCertificate>(idb.STORE_STUDY_CERTIFICATES)
    return all
      .filter((c) => c.courseId === courseId)
      .sort((a, b) => b.created.localeCompare(a.created))
  },

  async getCertificateById(id: string): Promise<StudyCertificate | undefined> {
    return idb.get<StudyCertificate>(idb.STORE_STUDY_CERTIFICATES, id)
  },

  async saveCertificate(
    cert: Omit<StudyCertificate, 'id' | 'created' | 'updated'> & { id?: string },
  ): Promise<StudyCertificate> {
    const nowIso = new Date().toISOString()
    const id = cert.id || crypto.randomUUID()
    const existing = cert.id ? await this.getCertificateById(cert.id) : undefined

    const fullCert: StudyCertificate = {
      ...cert,
      id,
      created: existing?.created || nowIso,
      updated: nowIso,
    }

    await idb.put(idb.STORE_STUDY_CERTIFICATES, fullCert)
    return fullCert
  },

  async updateCertificateTitle(
    id: string,
    newTitle: string,
  ): Promise<StudyCertificate | undefined> {
    const existing = await this.getCertificateById(id)
    if (!existing) return undefined
    const updated: StudyCertificate = {
      ...existing,
      title: newTitle.trim(),
      updated: new Date().toISOString(),
    }
    await idb.put(idb.STORE_STUDY_CERTIFICATES, updated)
    return updated
  },

  async deleteCertificate(id: string): Promise<void> {
    await idb.delete(idb.STORE_STUDY_CERTIFICATES, id)
  },

  // ========================
  // 4) SESSÕES DE TEMPO
  // ========================
  async getSessionsByCourse(courseId: string): Promise<StudySession[]> {
    const all = await idb.getAll<StudySession>(idb.STORE_STUDY_SESSIONS)
    return all.filter((s) => s.courseId === courseId).sort((a, b) => b.date.localeCompare(a.date))
  },

  async getAllSessions(): Promise<StudySession[]> {
    return idb.getAll<StudySession>(idb.STORE_STUDY_SESSIONS)
  },

  async saveSession(
    session: Omit<StudySession, 'id' | 'created' | 'updated'> & { id?: string },
  ): Promise<StudySession> {
    const nowIso = new Date().toISOString()
    const id = session.id || crypto.randomUUID()

    const fullSession: StudySession = {
      ...session,
      id,
      minutes: Math.max(1, Math.round(session.minutes)),
      created: nowIso,
      updated: nowIso,
    }

    await idb.put(idb.STORE_STUDY_SESSIONS, fullSession)

    // Lembra o último curso usado no registro rápido
    try {
      localStorage.setItem(LAST_COURSE_TIME_KEY, session.courseId)
    } catch {
      // Ignora
    }

    return fullSession
  },

  async deleteSession(id: string): Promise<void> {
    await idb.delete(idb.STORE_STUDY_SESSIONS, id)
  },

  getLastCourseUsedForTime(): string | null {
    try {
      return localStorage.getItem(LAST_COURSE_TIME_KEY)
    } catch {
      return null
    }
  },

  // ========================
  // 5) METAS SEMANAIS DE ESTUDO
  // ========================
  async getGoalByCourse(courseId: string): Promise<StudyGoal | undefined> {
    const all = await idb.getAll<StudyGoal>(idb.STORE_STUDY_GOALS)
    return all.find((g) => g.courseId === courseId)
  },

  async getAllGoals(): Promise<StudyGoal[]> {
    return idb.getAll<StudyGoal>(idb.STORE_STUDY_GOALS)
  },

  async saveCourseGoal(courseId: string, weeklyMinutes: number): Promise<StudyGoal> {
    const nowIso = new Date().toISOString()
    const today = nowIso.split('T')[0]
    const existing = await this.getGoalByCourse(courseId)

    const historyEntry: StudyGoalHistory = {
      id: crypto.randomUUID(),
      courseId,
      effectiveDate: today,
      weeklyMinutes,
      created: nowIso,
    }

    if (existing) {
      const updated: StudyGoal = {
        ...existing,
        weeklyMinutes,
        history: [...(existing.history || []), historyEntry],
        updated: nowIso,
      }
      await idb.put(idb.STORE_STUDY_GOALS, updated)
      return updated
    }

    const newGoal: StudyGoal = {
      id: crypto.randomUUID(),
      courseId,
      weeklyMinutes,
      history: [historyEntry],
      created: nowIso,
      updated: nowIso,
    }

    await idb.put(idb.STORE_STUDY_GOALS, newGoal)
    return newGoal
  },

  async removeCourseGoal(courseId: string): Promise<void> {
    const existing = await this.getGoalByCourse(courseId)
    if (existing) {
      await idb.delete(idb.STORE_STUDY_GOALS, existing.id)
    }
  },

  // Obtém meta histórica vigente em uma data específica
  getEffectiveWeeklyGoalForDate(goal: StudyGoal, date: string): number {
    if (!goal.history || goal.history.length === 0) return goal.weeklyMinutes

    const sorted = [...goal.history].sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate))
    let effective = goal.weeklyMinutes
    for (const h of sorted) {
      if (h.effectiveDate <= date) {
        effective = h.weeklyMinutes
      } else {
        break
      }
    }
    return effective
  },

  // ========================
  // 6) PROGRESSO CONSOLIDADO (HOJE, SEMANA, MÊS)
  // ========================
  async getCourseGoalProgress(courseId: string): Promise<CourseGoalProgress | null> {
    const course = await this.getCourseById(courseId)
    if (!course) return null

    const goal = await this.getGoalByCourse(courseId)
    const sessions = await this.getSessionsByCourse(courseId)

    const todayStr = new Date().toISOString().split('T')[0]

    // 7 dias incluindo hoje
    const d7 = new Date()
    d7.setDate(d7.getDate() - 6)
    const weekStartStr = d7.toISOString().split('T')[0]

    // 30 dias incluindo hoje
    const d30 = new Date()
    d30.setDate(d30.getDate() - 29)
    const monthStartStr = d30.toISOString().split('T')[0]

    const todayMinutes = sessions
      .filter((s) => s.date === todayStr)
      .reduce((sum, s) => sum + s.minutes, 0)

    const weekMinutes = sessions
      .filter((s) => s.date >= weekStartStr && s.date <= todayStr)
      .reduce((sum, s) => sum + s.minutes, 0)

    const monthMinutes = sessions
      .filter((s) => s.date >= monthStartStr && s.date <= todayStr)
      .reduce((sum, s) => sum + s.minutes, 0)

    return {
      course,
      hasGoal: Boolean(goal && goal.weeklyMinutes > 0),
      weeklyMinutesTarget: goal?.weeklyMinutes,
      todayMinutes,
      weekMinutes,
      monthMinutes,
    }
  },

  // Resumo para o card Hoje
  async getTodayStudyOverview(): Promise<{
    coursesCount: number
    todayMinutes: number
    weekMinutes: number
    lastCourse?: Course
    lastPage?: { pageId: string; courseId: string; title: string }
  }> {
    const [courses, sessions] = await Promise.all([this.getCourses(), this.getAllSessions()])

    const todayStr = new Date().toISOString().split('T')[0]
    const d7 = new Date()
    d7.setDate(d7.getDate() - 6)
    const weekStartStr = d7.toISOString().split('T')[0]

    const todayMinutes = sessions
      .filter((s) => s.date === todayStr)
      .reduce((sum, s) => sum + s.minutes, 0)

    const weekMinutes = sessions
      .filter((s) => s.date >= weekStartStr && s.date <= todayStr)
      .reduce((sum, s) => sum + s.minutes, 0)

    // Último curso usado ou primeiro curso em andamento
    const lastCourseId = this.getLastCourseUsedForTime()
    const lastCourse =
      (lastCourseId && courses.find((c) => c.id === lastCourseId)) ||
      courses.find((c) => c.status === 'em_andamento') ||
      courses[0]

    const lastPageInfo = this.getLastOpenedPage()
    let lastPage: { pageId: string; courseId: string; title: string } | undefined

    if (lastPageInfo) {
      // Confirma que a página e o curso ainda existem
      const pageExists = await this.getPageById(lastPageInfo.pageId)
      if (pageExists) {
        lastPage = lastPageInfo
      }
    }

    return {
      coursesCount: courses.length,
      todayMinutes,
      weekMinutes,
      lastCourse,
      lastPage,
    }
  },
}
