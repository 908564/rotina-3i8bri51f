import { idb } from '../indexedDb'
import {
  Project,
  Achievement,
  Experience,
  WorkNote,
  ProjectStatus,
  ProjectTask,
  ProjectNote,
} from '../types'

export const trabalhoRepository = {
  // ========================
  // 1) PROJETOS
  // ========================
  async getProjects(): Promise<Project[]> {
    const list = await idb.getAll<Project>(idb.STORE_PROJECTS)
    return list.sort((a, b) => {
      // Ordena por updatedAt decrescente
      return new Date(b.updated).getTime() - new Date(a.updated).getTime()
    })
  },

  async getProjectById(id: string): Promise<Project | undefined> {
    return idb.get<Project>(idb.STORE_PROJECTS, id)
  },

  async saveProject(data: {
    id?: string
    name: string
    description: string
    objective?: string
    status: ProjectStatus
    startDate?: string
    endDate?: string
    tags?: string[]
    tasks?: ProjectTask[]
    notes?: ProjectNote[]
    experienceId?: string
  }): Promise<Project> {
    const now = new Date().toISOString()
    const existing = data.id ? await this.getProjectById(data.id) : null

    const project: Project = {
      id: data.id || crypto.randomUUID(),
      name: data.name.trim(),
      description: data.description.trim(),
      objective: data.objective?.trim() || undefined,
      status: data.status,
      startDate: data.startDate || undefined,
      endDate: data.endDate || undefined,
      tags: data.tags || (existing ? existing.tags : []),
      tasks: data.tasks || (existing ? existing.tasks : []),
      notes: data.notes || (existing ? existing.notes : []),
      experienceId: data.experienceId !== undefined ? data.experienceId : existing?.experienceId,
      created: existing ? existing.created : now,
      updated: now,
    }

    await idb.put(idb.STORE_PROJECTS, project)
    return project
  },

  async deleteProject(id: string): Promise<void> {
    // Busca conquistas vinculadas ao projeto para desvincular ou manter integridade
    const achievements = await this.getAchievements()
    const linkedAchievements = achievements.filter((a) => a.projectId === id)

    await idb.runTransaction([idb.STORE_PROJECTS, idb.STORE_ACHIEVEMENTS], 'readwrite', (tx) => {
      // Deleta o projeto
      tx.objectStore(idb.STORE_PROJECTS).delete(id)

      // Limpa o vínculo projectId das conquistas associadas para não deixar referência inválida
      const achStore = tx.objectStore(idb.STORE_ACHIEVEMENTS)
      for (const ach of linkedAchievements) {
        const updatedAch: Achievement = {
          ...ach,
          projectId: undefined,
          updated: new Date().toISOString(),
        }
        achStore.put(updatedAch)
      }
    })
  },

  async toggleTask(projectId: string, taskId: string): Promise<Project | undefined> {
    const project = await this.getProjectById(projectId)
    if (!project) return undefined

    const updatedTasks = project.tasks.map((t) =>
      t.id === taskId ? { ...t, completed: !t.completed } : t,
    )

    const updatedProject: Project = {
      ...project,
      tasks: updatedTasks,
      updated: new Date().toISOString(),
    }
    await idb.put(idb.STORE_PROJECTS, updatedProject)
    return updatedProject
  },

  async addTask(projectId: string, title: string): Promise<Project | undefined> {
    const project = await this.getProjectById(projectId)
    if (!project || !title.trim()) return undefined

    const newTask: ProjectTask = {
      id: crypto.randomUUID(),
      title: title.trim(),
      completed: false,
    }

    const updatedProject: Project = {
      ...project,
      tasks: [...project.tasks, newTask],
      updated: new Date().toISOString(),
    }
    await idb.put(idb.STORE_PROJECTS, updatedProject)
    return updatedProject
  },

  async deleteTask(projectId: string, taskId: string): Promise<Project | undefined> {
    const project = await this.getProjectById(projectId)
    if (!project) return undefined

    const updatedProject: Project = {
      ...project,
      tasks: project.tasks.filter((t) => t.id !== taskId),
      updated: new Date().toISOString(),
    }
    await idb.put(idb.STORE_PROJECTS, updatedProject)
    return updatedProject
  },

  async saveProjectNote(
    projectId: string,
    noteData: { id?: string; date: string; text: string },
  ): Promise<Project | undefined> {
    const project = await this.getProjectById(projectId)
    if (!project) return undefined

    const now = new Date().toISOString()
    let updatedNotes: ProjectNote[]
    if (noteData.id) {
      updatedNotes = project.notes.map((n) =>
        n.id === noteData.id ? { ...n, date: noteData.date, text: noteData.text, updated: now } : n,
      )
    } else {
      const newNote: ProjectNote = {
        id: crypto.randomUUID(),
        date: noteData.date,
        text: noteData.text,
        created: now,
        updated: now,
      }
      updatedNotes = [newNote, ...project.notes]
    }

    const updatedProject: Project = {
      ...project,
      notes: updatedNotes,
      updated: now,
    }
    await idb.put(idb.STORE_PROJECTS, updatedProject)
    return updatedProject
  },

  async deleteProjectNote(projectId: string, noteId: string): Promise<Project | undefined> {
    const project = await this.getProjectById(projectId)
    if (!project) return undefined

    const updatedProject: Project = {
      ...project,
      notes: project.notes.filter((n) => n.id !== noteId),
      updated: new Date().toISOString(),
    }
    await idb.put(idb.STORE_PROJECTS, updatedProject)
    return updatedProject
  },

  // ========================
  // 2) CONQUISTAS
  // ========================
  async getAchievements(): Promise<Achievement[]> {
    const list = await idb.getAll<Achievement>(idb.STORE_ACHIEVEMENTS)
    // Ordem cronológica decrescente (mais recentes primeiro)
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  },

  async getAchievementById(id: string): Promise<Achievement | undefined> {
    return idb.get<Achievement>(idb.STORE_ACHIEVEMENTS, id)
  },

  async saveAchievement(data: {
    id?: string
    title: string
    description: string
    date: string
    impact: string
    projectId?: string
    experienceId?: string
    tags?: string[]
  }): Promise<Achievement> {
    const now = new Date().toISOString()
    const existing = data.id ? await this.getAchievementById(data.id) : null

    const achievement: Achievement = {
      id: data.id || crypto.randomUUID(),
      title: data.title.trim(),
      description: data.description.trim(),
      date: data.date,
      impact: data.impact.trim(),
      projectId: data.projectId || undefined,
      experienceId: data.experienceId || undefined,
      tags: data.tags || [],
      created: existing ? existing.created : now,
      updated: now,
    }

    await idb.put(idb.STORE_ACHIEVEMENTS, achievement)
    return achievement
  },

  async deleteAchievement(id: string): Promise<void> {
    await idb.delete(idb.STORE_ACHIEVEMENTS, id)
  },

  // ========================
  // 3) EXPERIÊNCIAS
  // ========================
  async getExperiences(): Promise<Experience[]> {
    const list = await idb.getAll<Experience>(idb.STORE_EXPERIENCES)
    // Ordenar da mais recente para a mais antiga (atuais primeiro, depois por data início decrescente)
    return list.sort((a, b) => {
      if (a.isCurrent && !b.isCurrent) return -1
      if (!a.isCurrent && b.isCurrent) return 1
      return b.startDate.localeCompare(a.startDate)
    })
  },

  async getExperienceById(id: string): Promise<Experience | undefined> {
    return idb.get<Experience>(idb.STORE_EXPERIENCES, id)
  },

  async saveExperience(data: {
    id?: string
    role: string
    company: string
    startDate: string
    endDate?: string
    isCurrent: boolean
    description: string
    skills?: string[]
  }): Promise<Experience> {
    const now = new Date().toISOString()
    const existing = data.id ? await this.getExperienceById(data.id) : null

    const exp: Experience = {
      id: data.id || crypto.randomUUID(),
      role: data.role.trim(),
      company: data.company.trim(),
      startDate: data.startDate,
      endDate: data.isCurrent ? undefined : data.endDate,
      isCurrent: data.isCurrent,
      description: data.description.trim(),
      skills: data.skills || [],
      created: existing ? existing.created : now,
      updated: now,
    }

    await idb.put(idb.STORE_EXPERIENCES, exp)
    return exp
  },

  async deleteExperience(id: string): Promise<void> {
    await idb.delete(idb.STORE_EXPERIENCES, id)
  },

  // ========================
  // 4) ANOTAÇÕES DE TRABALHO
  // ========================
  async getWorkNotes(): Promise<WorkNote[]> {
    const list = await idb.getAll<WorkNote>(idb.STORE_WORK_NOTES)
    return list.sort((a, b) => {
      const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime()
      if (dateDiff !== 0) return dateDiff
      return new Date(b.updated).getTime() - new Date(a.updated).getTime()
    })
  },

  async getWorkNoteById(id: string): Promise<WorkNote | undefined> {
    return idb.get<WorkNote>(idb.STORE_WORK_NOTES, id)
  },

  async saveWorkNote(data: {
    id?: string
    title: string
    date: string
    body: string
    tags?: string[]
  }): Promise<WorkNote> {
    const now = new Date().toISOString()
    const existing = data.id ? await this.getWorkNoteById(data.id) : null

    const note: WorkNote = {
      id: data.id || crypto.randomUUID(),
      title: data.title.trim() || 'Sem título',
      date: data.date,
      body: data.body,
      tags: data.tags || [],
      created: existing ? existing.created : now,
      updated: now,
    }

    await idb.put(idb.STORE_WORK_NOTES, note)
    return note
  },

  async deleteWorkNote(id: string): Promise<void> {
    await idb.delete(idb.STORE_WORK_NOTES, id)
  },

  async searchWorkNotes(query: string): Promise<WorkNote[]> {
    const q = query.toLowerCase().trim()
    if (!q) return []
    const all = await this.getWorkNotes()
    return all.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.body.toLowerCase().includes(q) ||
        n.tags.some((t) => t.toLowerCase().includes(q)),
    )
  },

  // ========================
  // 5) VISÃO PARA TELA HOJE
  // ========================
  async getTodayWorkOverview() {
    const projects = await this.getProjects()
    const inProgressProjects = projects.filter((p) => p.status === 'em_andamento')
    const inProgressWithPendingTasks = inProgressProjects.map((p) => {
      const pendingTasks = p.tasks.filter((t) => !t.completed)
      return {
        project: p,
        pendingTasks,
        completedCount: p.tasks.length - pendingTasks.length,
        totalTasks: p.tasks.length,
      }
    })

    return {
      totalProjectsCount: projects.length,
      inProgressCount: inProgressProjects.length,
      inProgressProjects: inProgressWithPendingTasks,
    }
  },
}
