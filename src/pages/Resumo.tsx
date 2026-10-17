import React, { useEffect, useState } from 'react'
import {
  Calendar,
  CheckCircle2,
  TrendingUp,
  Dumbbell,
  BookOpen,
  PenLine,
  GraduationCap,
  Trophy,
  ArrowUp,
  ArrowDown,
  Minus,
} from 'lucide-react'
import { idb } from '@/lib/indexedDb'
import {
  DaySummary,
  TreinoLog,
  TreinoPlanoSemanal,
  Livro,
  EscritaNote,
  Course,
  StudySession,
  StudyGoal,
  Achievement,
} from '@/lib/types'
import {
  getTodayDateKey,
  subDaysFromDateKey,
  getLocalDayOfWeek,
  parseLocalDate,
} from '@/lib/dateUtils'
import { useApp } from '@/lib/context'
import { Card, CardContent } from '@/components/ui/card'
import { daySummaryRepository } from '@/lib/repositories/daySummaryRepository'
import { estudosRepository } from '@/lib/repositories/estudosRepository'

interface DayStatus {
  date: string
  dayLetter: string
  dayNumber: number
  isToday: boolean
  closed: boolean
  hasGoals: boolean
  goalsDone: number
  goalsTotal: number
}

interface WeekComparison {
  treinoDoneCount: number
  treinoPrevDoneCount: number
  treinoSetsCount: number
  treinoPrevSetsCount: number

  readingPages: number
  readingPrevPages: number
  readingMinutes: number
  readingPrevMinutes: number
  readingDaysCount: number
  readingPrevDaysCount: number

  writingDaysCount: number
  writingPrevDaysCount: number

  studyMinutes: number
  studyPrevMinutes: number
  studyGoalDaysCount: number
  studyPrevGoalDaysCount: number

  achievementsCount: number
  achievementsPrevCount: number
}

export const ResumoPage: React.FC = () => {
  const { settings } = useApp()
  const [days, setDays] = useState<DayStatus[]>([])
  const [comparison, setComparison] = useState<WeekComparison | null>(null)
  const [highlightPhrase, setHighlightPhrase] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadWeekData = async () => {
      setLoading(true)
      try {
        const todayStr = getTodayDateKey()
        const dayOfWeek = getLocalDayOfWeek(parseLocalDate(todayStr)) // 0=Dom, 1=Seg, ..., 6=Sab

        // Calcula a segunda-feira da semana atual
        // Segunda = 1; se domingo (0), diff = 6; senão diff = dayOfWeek - 1
        const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
        const mondayStr = subDaysFromDateKey(todayStr, daysSinceMonday)

        // As 7 datas da semana atual (seg a dom)
        const currentWeekDays: string[] = []
        for (let i = 0; i < 7; i++) {
          const d = new Date(mondayStr)
          d.setDate(d.getDate() + i)
          currentWeekDays.push(d.toISOString().substring(0, 10))
        }

        // As 7 datas da semana anterior
        const prevMondayStr = subDaysFromDateKey(mondayStr, 7)
        const prevWeekDays: string[] = []
        for (let i = 0; i < 7; i++) {
          const d = new Date(prevMondayStr)
          d.setDate(d.getDate() + i)
          prevWeekDays.push(d.toISOString().substring(0, 10))
        }

        const [
          allSummaries,
          allLogs,
          allPlans,
          allLeituraHist,
          allNotes,
          allStudySessions,
          allStudyGoals,
          allCourses,
          allAchievements,
        ] = await Promise.all([
          daySummaryRepository.getAll(),
          idb.getAll<TreinoLog>(idb.STORE_TREINO_LOG),
          idb.getAll<TreinoPlanoSemanal>(idb.STORE_TREINO_PLANO),
          idb.getAll<any>(idb.STORE_LEITURA_HISTORICO),
          idb.getAll<EscritaNote>(idb.STORE_ESCRITA),
          idb.getAll<StudySession>(idb.STORE_STUDY_SESSIONS),
          idb.getAll<StudyGoal>(idb.STORE_STUDY_GOALS),
          idb.getAll<Course>(idb.STORE_COURSES),
          idb.getAll<Achievement>(idb.STORE_ACHIEVEMENTS),
        ])

        const summaryMap = new Map<string, DaySummary>()
        for (const s of allSummaries) {
          summaryMap.set(s.date, s)
        }

        // Tira de 7 dias
        const dayLetters = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D']
        const weekStatusList: DayStatus[] = currentWeekDays.map((dStr, idx) => {
          const sum = summaryMap.get(dStr)
          const dayNum = parseInt(dStr.substring(8, 10), 10)
          return {
            date: dStr,
            dayLetter: dayLetters[idx],
            dayNumber: dayNum,
            isToday: dStr === todayStr,
            closed: Boolean(sum && sum.closed),
            hasGoals: Boolean(sum && sum.goalsTotal > 0),
            goalsDone: sum?.goalsDone || 0,
            goalsTotal: sum?.goalsTotal || 0,
          }
        })
        setDays(weekStatusList)

        // ========================
        // COMPARAÇÃO COM SEMANA ANTERIOR
        // ========================
        // 1. Treino
        const currentLogs = allLogs.filter((l) => currentWeekDays.includes(l.day))
        const prevLogs = allLogs.filter((l) => prevWeekDays.includes(l.day))

        const treinoDoneCount = currentLogs.filter(
          (l) => l.completedSets && l.completedSets.some((s) => s.concluido),
        ).length
        const treinoPrevDoneCount = prevLogs.filter(
          (l) => l.completedSets && l.completedSets.some((s) => s.concluido),
        ).length

        const treinoSetsCount = currentLogs.reduce(
          (sum, l) => sum + (l.completedSets?.filter((s) => s.concluido).length || 0),
          0,
        )
        const treinoPrevSetsCount = prevLogs.reduce(
          (sum, l) => sum + (l.completedSets?.filter((s) => s.concluido).length || 0),
          0,
        )

        // 2. Leitura
        const currentLeitura = allLeituraHist.filter((h) => currentWeekDays.includes(h.dateRead))
        const prevLeitura = allLeituraHist.filter((h) => prevWeekDays.includes(h.dateRead))

        const readingPages = currentLeitura.reduce((sum, h) => sum + (h.pagesAdded || 0), 0)
        const readingPrevPages = prevLeitura.reduce((sum, h) => sum + (h.pagesAdded || 0), 0)

        const readingMinutes = currentLeitura.reduce((sum, h) => sum + (h.minutes || 0), 0)
        const readingPrevMinutes = prevLeitura.reduce((sum, h) => sum + (h.minutes || 0), 0)

        const readingDaysCount = new Set(currentLeitura.map((h) => h.dateRead)).size
        const readingPrevDaysCount = new Set(prevLeitura.map((h) => h.dateRead)).size

        // 3. Escrita
        const currentNotes = allNotes.filter(
          (n) => currentWeekDays.includes(n.date) && n.body?.trim(),
        )
        const prevNotes = allNotes.filter((n) => prevWeekDays.includes(n.date) && n.body?.trim())
        const writingDaysCount = currentNotes.length
        const writingPrevDaysCount = prevNotes.length

        // 4. Estudos
        const currentStudy = allStudySessions.filter((s) => currentWeekDays.includes(s.date))
        const prevStudy = allStudySessions.filter((s) => prevWeekDays.includes(s.date))

        const studyMinutes = currentStudy.reduce((sum, s) => sum + (s.minutes || 0), 0)
        const studyPrevMinutes = prevStudy.reduce((sum, s) => sum + (s.minutes || 0), 0)

        // Dias com meta diária batida
        let studyGoalDaysCount = 0
        for (const day of currentWeekDays) {
          const dayMins = currentStudy
            .filter((s) => s.date === day)
            .reduce((sum, s) => sum + s.minutes, 0)
          let target = 0
          for (const g of allStudyGoals) {
            const daily = estudosRepository.getEffectiveDailyGoalForDate(g, day)
            if (daily) target += daily
          }
          if (target > 0 && dayMins >= target) {
            studyGoalDaysCount++
          }
        }

        let studyPrevGoalDaysCount = 0
        for (const day of prevWeekDays) {
          const dayMins = prevStudy
            .filter((s) => s.date === day)
            .reduce((sum, s) => sum + s.minutes, 0)
          let target = 0
          for (const g of allStudyGoals) {
            const daily = estudosRepository.getEffectiveDailyGoalForDate(g, day)
            if (daily) target += daily
          }
          if (target > 0 && dayMins >= target) {
            studyPrevGoalDaysCount++
          }
        }

        // 5. Trabalho
        const currentAch = allAchievements.filter((a) => currentWeekDays.includes(a.date))
        const prevAch = allAchievements.filter((a) => prevWeekDays.includes(a.date))
        const achievementsCount = currentAch.length
        const achievementsPrevCount = prevAch.length

        setComparison({
          treinoDoneCount,
          treinoPrevDoneCount,
          treinoSetsCount,
          treinoPrevSetsCount,
          readingPages,
          readingPrevPages,
          readingMinutes,
          readingPrevMinutes,
          readingDaysCount,
          readingPrevDaysCount,
          writingDaysCount,
          writingPrevDaysCount,
          studyMinutes,
          studyPrevMinutes,
          studyGoalDaysCount,
          studyPrevGoalDaysCount,
          achievementsCount,
          achievementsPrevCount,
        })

        // Frase de destaque gerada com os dados
        const highlights: string[] = []
        if (readingDaysCount > 0) highlights.push(`leu em ${readingDaysCount} de 7 dias`)
        if (treinoDoneCount > 0)
          highlights.push(`treinou ${treinoDoneCount} ${treinoDoneCount === 1 ? 'vez' : 'vezes'}`)
        if (writingDaysCount > 0 && highlights.length < 2)
          highlights.push(`escreveu em ${writingDaysCount} dias`)
        if (studyMinutes > 0 && highlights.length < 2)
          highlights.push(`estudou ${studyMinutes} min`)

        if (highlights.length > 0) {
          const phrase = `Você ${highlights.join(' e ')}.`
          setHighlightPhrase(phrase)
        } else {
          setHighlightPhrase(
            'Comece a registrar suas metas desta semana para ver sua evolução aqui!',
          )
        }
      } finally {
        setLoading(false)
      }
    }

    loadWeekData()
  }, [])

  const renderTrend = (current: number, prev: number, unit: string = '') => {
    if (prev === 0 && current === 0) {
      return (
        <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
          <Minus className="w-3 h-3" /> sem dados anteriores
        </span>
      )
    }
    const diff = current - prev
    if (diff > 0) {
      return (
        <span className="text-[11px] font-semibold text-[#3D9C73] flex items-center gap-0.5">
          <ArrowUp className="w-3 h-3" /> +{diff} {unit} vs. semana anterior
        </span>
      )
    }
    if (diff < 0) {
      return (
        <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-0.5">
          <ArrowDown className="w-3 h-3" /> {diff} {unit} vs. semana anterior
        </span>
      )
    }
    return (
      <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
        <Minus className="w-3 h-3" /> igual à semana anterior
      </span>
    )
  }

  const active = settings.activeModules

  return (
    <div className="pt-2 pb-16 animate-fade-in space-y-6 max-w-2xl mx-auto">
      <header className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
          Resumo da Semana
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Acompanhe seu ritmo de hábitos e metas dos últimos 7 dias.
        </p>
      </header>

      {/* TIRA DE 7 DIAS (SEG A DOM) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-subtle space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-muted-foreground px-1">
          <span>Esta semana</span>
          <span className="text-[11px] font-semibold">Segunda a Domingo</span>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {days.map((d) => {
            const fraction = d.goalsTotal > 0 ? d.goalsDone / d.goalsTotal : 0
            return (
              <div
                key={d.date}
                className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all ${
                  d.isToday
                    ? 'bg-[#E8883A]/10 border border-[#E8883A]/30'
                    : 'bg-muted/30 border border-transparent'
                }`}
              >
                <span className="text-[11px] font-bold text-muted-foreground">{d.dayLetter}</span>
                <span
                  className={`text-xs font-black my-1 ${d.isToday ? 'text-[#E8883A]' : 'text-foreground'}`}
                >
                  {d.dayNumber}
                </span>

                {/* Indicador de status: ponto preenchido nos fechados, anel parcial nos demais */}
                <div className="w-4 h-4 flex items-center justify-center">
                  {d.closed ? (
                    <div className="w-3 h-3 rounded-full bg-[#E8883A] shadow-sm" />
                  ) : fraction > 0 ? (
                    <div className="w-3 h-3 rounded-full border-2 border-[#E8883A] bg-transparent" />
                  ) : (
                    <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Frase de destaque */}
        <div className="pt-2 text-center text-xs font-semibold text-foreground/90 bg-muted/20 p-2.5 rounded-xl border border-border/50">
          {highlightPhrase}
        </div>
      </div>

      {/* CARTÕES POR MÓDULO COM TOTAIS SEMANA ATUAL VS ANTERIOR */}
      <div className="space-y-3.5">
        {/* Treino */}
        {active.treino && comparison && (
          <div className="p-4 rounded-2xl bg-card border border-border shadow-subtle space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#F3DDD7] text-[#B8503E] flex items-center justify-center">
                  <Dumbbell className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-foreground">Treino</h3>
              </div>
              <span className="text-base font-extrabold text-[#B8503E]">
                {comparison.treinoDoneCount}{' '}
                {comparison.treinoDoneCount === 1 ? 'treino' : 'treinos'}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/60">
              <span>{comparison.treinoSetsCount} séries concluídas</span>
              {renderTrend(comparison.treinoDoneCount, comparison.treinoPrevDoneCount, 'treinos')}
            </div>
          </div>
        )}

        {/* Leitura */}
        {active.leitura && comparison && (
          <div className="p-4 rounded-2xl bg-card border border-border shadow-subtle space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#D6EEE9] text-[#1F7F6E] flex items-center justify-center">
                  <BookOpen className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-foreground">Leitura</h3>
              </div>
              <span className="text-base font-extrabold text-[#1F7F6E]">
                {comparison.readingPages} págs
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/60">
              <span>
                {comparison.readingMinutes > 0 ? `${comparison.readingMinutes} min · ` : ''}
                {comparison.readingDaysCount} de 7 dias lidos
              </span>
              {renderTrend(comparison.readingPages, comparison.readingPrevPages, 'págs')}
            </div>
          </div>
        )}

        {/* Escrita */}
        {active.escrita && comparison && (
          <div className="p-4 rounded-2xl bg-card border border-border shadow-subtle space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#E1E3FA] text-[#4C54C2] flex items-center justify-center">
                  <PenLine className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-foreground">Escrita</h3>
              </div>
              <span className="text-base font-extrabold text-[#4C54C2]">
                {comparison.writingDaysCount} {comparison.writingDaysCount === 1 ? 'dia' : 'dias'}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/60">
              <span>Anotações diárias registradas</span>
              {renderTrend(comparison.writingDaysCount, comparison.writingPrevDaysCount, 'dias')}
            </div>
          </div>
        )}

        {/* Estudos */}
        {active.estudos && comparison && (
          <div className="p-4 rounded-2xl bg-card border border-border shadow-subtle space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#E9E1F7] text-[#6A4BB0] flex items-center justify-center">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-foreground">Estudos</h3>
              </div>
              <span className="text-base font-extrabold text-[#6A4BB0]">
                {comparison.studyMinutes} min
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/60">
              <span>
                {comparison.studyGoalDaysCount > 0
                  ? `Meta diária batida em ${comparison.studyGoalDaysCount} dias`
                  : 'Tempo total dedicado'}
              </span>
              {renderTrend(comparison.studyMinutes, comparison.studyPrevMinutes, 'min')}
            </div>
          </div>
        )}

        {/* Trabalho */}
        {active.trabalho && comparison && (
          <div className="p-4 rounded-2xl bg-card border border-border shadow-subtle space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#DCE6EE] text-[#3F5A70] flex items-center justify-center">
                  <Trophy className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-foreground">Trabalho</h3>
              </div>
              <span className="text-base font-extrabold text-[#3F5A70]">
                {comparison.achievementsCount}{' '}
                {comparison.achievementsCount === 1 ? 'conquista' : 'conquistas'}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/60">
              <span>Vitórias e entregas registradas</span>
              {renderTrend(
                comparison.achievementsCount,
                comparison.achievementsPrevCount,
                'conquistas',
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
export default ResumoPage
