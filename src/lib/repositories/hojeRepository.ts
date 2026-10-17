import { escritaRepository } from './escritaRepository'
import { leituraRepository } from './leituraRepository'
import { treinoRepository } from './treinoRepository'
import { estudosRepository } from './estudosRepository'
import { trabalhoRepository } from './trabalhoRepository'
import { settingsRepository } from './settingsRepository'
import { getTodayDateKey, getLocalDayOfWeek } from '../dateUtils'
import { getFastTodayData, FastTodayData } from './hojeAggregator'
import {
  EscritaNote,
  TreinoPlanoSemanal,
  TreinoLog,
  ReadingGoalsProgress,
  Livro,
  Course,
  Project,
  ProjectTask,
} from '../types'

export type { FastTodayData }

export interface TodayOverview {
  dateStr: string // YYYY-MM-DD
  dayOfWeek: number // 0-6
  overallProgressPercent: number
  workout: {
    plan?: TreinoPlanoSemanal
    log?: TreinoLog
    isRestDay: boolean
    isCompleted: boolean
    completedSetsCount: number
    totalSetsCount: number
  }
  reading: {
    goals: ReadingGoalsProgress
    activeBook?: Livro
    allBooksCount: number
  }
  writing: {
    todayNote?: EscritaNote
  }
  study?: {
    coursesCount: number
    todayMinutes: number
    weekMinutes: number
    lastCourse?: Course
    lastPage?: { pageId: string; courseId: string; title: string }
  }
  work?: {
    totalProjectsCount: number
    inProgressCount: number
    inProgressProjects: {
      project: Project
      pendingTasks: ProjectTask[]
      completedCount: number
      totalTasks: number
    }[]
  }
}

export const hojeRepository = {
  async getFastTodayData(dateStr?: string): Promise<FastTodayData> {
    return getFastTodayData(dateStr)
  },

  async getTodayOverview(): Promise<TodayOverview> {
    const dateStr = getTodayDateKey()
    const dayOfWeek = getLocalDayOfWeek()

    // 1) Treino de hoje
    const plan = await treinoRepository.getPlanByDayOfWeek(dayOfWeek)
    const log = await treinoRepository.getLogByDate(dateStr)

    let totalPlannedSets = 0
    if (plan && plan.exercises) {
      totalPlannedSets = plan.exercises.reduce((sum, e) => sum + (e.series || 0), 0)
    }

    let completedSetsCount = 0
    if (log && log.completedSets) {
      completedSetsCount = log.completedSets.filter((s) => s.concluido).length
    }

    const isRestDay = !plan || plan.exercises.length === 0
    const isCompleted = !isRestDay && totalPlannedSets > 0 && completedSetsCount >= totalPlannedSets

    // 2) Leitura
    const goals = await leituraRepository.getGoalsProgress()
    const livros = await leituraRepository.getLivros()
    const activeBook = livros.find((l) => l.status === 'lendo') || livros[0]

    // 3) Escrita
    const todayNote = await escritaRepository.getNoteByDate(dateStr)

    // 4) Estudos
    const studyOverview = await estudosRepository.getTodayStudyOverview()

    // 5) Trabalho
    const workOverview = await trabalhoRepository.getTodayWorkOverview()

    // 6) Progresso geral do dia
    // Combina leitura diária (hoje / 20) e treino de hoje (completas / planejadas)
    let componentsCount = 0
    let totalScore = 0

    const settings = settingsRepository.getSettings()

    if (settings.activeModules.treino && !isRestDay && totalPlannedSets > 0) {
      componentsCount++
      const workoutRatio = Math.min(1, completedSetsCount / totalPlannedSets)
      totalScore += workoutRatio
    }

    if (settings.activeModules.leitura) {
      // Se houver metas definidas para livros lendo, calcula ratio real. Se não tiver metas definidas, não penaliza o progresso geral
      if (goals.hasGoals && (goals.dailyPagesTarget > 0 || goals.dailyMinutesTarget > 0)) {
        componentsCount++
        let readingRatio = 0
        if (goals.dailyPagesTarget > 0) {
          readingRatio = Math.max(
            readingRatio,
            Math.min(1, goals.todayPages / goals.dailyPagesTarget),
          )
        }
        if (goals.dailyMinutesTarget > 0) {
          readingRatio = Math.max(
            readingRatio,
            Math.min(1, goals.todayMinutes / goals.dailyMinutesTarget),
          )
        }
        totalScore += readingRatio
      }
    }

    if (settings.activeModules.escrita) {
      componentsCount++
      const writingRatio = todayNote && todayNote.body.trim().length > 0 ? 1 : 0
      totalScore += writingRatio
    }

    if (settings.activeModules.estudos && studyOverview.coursesCount > 0) {
      // Se houver estudos ativos com minutos hoje
      if (studyOverview.todayMinutes > 0) {
        componentsCount++
        totalScore += Math.min(1, studyOverview.todayMinutes / 30)
      }
    }

    const overallProgressPercent =
      componentsCount > 0 ? Math.round((totalScore / componentsCount) * 100) : 0

    return {
      dateStr,
      dayOfWeek,
      overallProgressPercent,
      workout: {
        plan,
        log,
        isRestDay,
        isCompleted,
        completedSetsCount,
        totalSetsCount: totalPlannedSets,
      },
      reading: {
        goals,
        activeBook,
        allBooksCount: livros.length,
      },
      writing: {
        todayNote,
      },
      study: studyOverview,
      work: workOverview,
    }
  },
}
