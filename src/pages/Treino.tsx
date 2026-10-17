import React, { useState, useEffect, useCallback } from 'react'
import {
  Dumbbell,
  Plus,
  Edit2,
  Calendar,
  TrendingUp,
  CheckCircle2,
  Play,
  RotateCcw,
} from 'lucide-react'
import { TreinoPlanoSemanal, TreinoLog } from '@/lib/types'
import { treinoRepository } from '@/lib/repositories/treinoRepository'
import { useApp } from '@/lib/context'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { WorkoutEditorModal } from '@/components/WorkoutEditorModal'
import { DayWorkoutLogView } from '@/components/DayWorkoutLogView'
import { ExerciseEvolutionModal } from '@/components/ExerciseEvolutionModal'
import { CardioView } from '@/components/CardioView'
import { OutrosTreinosView } from '@/components/OutrosTreinosView'
import { ModuleTasksView } from '@/components/ModuleTasksView'
import { ModuleStreakCard } from '@/components/ModuleStreakCard'
import { ActivityPlan, ActivityLog } from '@/lib/types'
import { cn } from '@/lib/utils'
import { getTodayDateKey, getLocalDayOfWeek } from '@/lib/dateUtils'
import { Check, Clock, Flame, Footprints, Bike } from 'lucide-react'

const DAYS_OF_WEEK = [
  { dayIndex: 1, label: 'Seg', full: 'Segunda-feira' },
  { dayIndex: 2, label: 'Ter', full: 'Terça-feira' },
  { dayIndex: 3, label: 'Qua', full: 'Quarta-feira' },
  { dayIndex: 4, label: 'Qui', full: 'Quinta-feira' },
  { dayIndex: 5, label: 'Sex', full: 'Sexta-feira' },
  { dayIndex: 6, label: 'Sáb', full: 'Sábado' },
  { dayIndex: 0, label: 'Dom', full: 'Domingo' },
]

export default function TreinoPage() {
  const { dataVersion, notifyDataChanged } = useApp()
  const [plans, setPlans] = useState<TreinoPlanoSemanal[]>([])
  const [logs, setLogs] = useState<TreinoLog[]>([])
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState<number>(() => {
    return getLocalDayOfWeek()
  })

  // Controle segmentado no topo: Musculação · Cardio · Outros · Tarefas
  const [treinoTab, setTreinoTab] = useState<'musculacao' | 'cardio' | 'outros' | 'tarefas'>(
    'musculacao',
  )

  // Sessões multimodais (Cardio e Outros)
  const [cardioPlans, setCardioPlans] = useState<ActivityPlan[]>([])
  const [cardioLogs, setCardioLogs] = useState<ActivityLog[]>([])
  const [outrosPlans, setOutrosPlans] = useState<ActivityPlan[]>([])
  const [outrosLogs, setOutrosLogs] = useState<ActivityLog[]>([])

  // Modais e visualizações
  const [editorModalOpen, setEditorModalOpen] = useState(false)
  const [isLoggingWorkout, setIsLoggingWorkout] = useState(false)
  const [evolutionExercise, setEvolutionExercise] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    const [p, l, cp, cl, op, ol] = await Promise.all([
      treinoRepository.getWeeklyPlans(),
      treinoRepository.getLogs(),
      treinoRepository.getActivityPlans('cardio'),
      treinoRepository.getActivityLogs('cardio'),
      treinoRepository.getActivityPlans('outros'),
      treinoRepository.getActivityLogs('outros'),
    ])
    setPlans(p)
    setLogs(l)
    setCardioPlans(cp)
    setCardioLogs(cl)
    setOutrosPlans(op)
    setOutrosLogs(ol)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData, dataVersion])

  const currentPlan = plans.find((p) => p.dayOfWeek === selectedDayOfWeek)

  const todayStr = getTodayDateKey()
  const todayDayOfWeek = getLocalDayOfWeek()
  const isTodaySelected = selectedDayOfWeek === todayDayOfWeek

  // Verifica se o treino selecionado foi concluído hoje
  const todayLog = logs.find((l) => l.day === todayStr)
  const isSelectedWorkoutCompleted =
    isTodaySelected &&
    currentPlan &&
    todayLog &&
    todayLog.completedSets &&
    todayLog.completedSets.length > 0 &&
    todayLog.completedSets.every((s) => s.concluido)

  const isTablet = typeof window !== 'undefined' && window.innerWidth >= 768

  return (
    <div className="pt-2 pb-12 space-y-6">
      {/* SE ESTIVER NO MODO REGISTRO DE TREINO */}
      {isLoggingWorkout && currentPlan ? (
        <DayWorkoutLogView
          plan={currentPlan}
          dateStr={todayStr}
          onBack={() => setIsLoggingWorkout(false)}
          onSaved={() => {
            setIsLoggingWorkout(false)
            loadData()
            notifyDataChanged()
          }}
        />
      ) : (
        /* VISÃO PRINCIPAL DO PLANO SEMANAL */
        <div className="space-y-6">
          {/* OFENSIVA POR MÓDULO (PARTE 6.1) */}
          <ModuleStreakCard
            module="treino"
            isGoalPending={
              !isSelectedWorkoutCompleted &&
              Boolean(currentPlan && currentPlan.exercises.length > 0)
            }
            todayStatusText={
              isSelectedWorkoutCompleted
                ? 'Treinos de hoje concluídos! Excelente consistência.'
                : currentPlan && currentPlan.exercises.length > 0
                  ? 'Complete seu treino planejado para manter sua ofensiva.'
                  : 'Dia de descanso planejado. Não quebra sua sequência!'
            }
          />

          {/* CABEÇALHO */}
          <div className="flex items-center justify-between pb-2 border-b border-border/60">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#F07B6A]/15 text-[#F07B6A] flex items-center justify-center">
                <Dumbbell className="w-4 h-4" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">Treino</h1>
            </div>

            {treinoTab === 'musculacao' && (
              <Button
                onClick={() => setEditorModalOpen(true)}
                className="min-h-[44px] h-10 px-4 rounded-xl bg-[#F07B6A] hover:bg-[#F07B6A]/90 text-white font-semibold text-xs shadow-sm flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                {currentPlan ? 'Editar Treino' : 'Configurar Dia'}
              </Button>
            )}
          </div>

          {/* 4.1 ESTRUTURA: CONTROLE SEGMENTADO NO TOPO DA TELA TREINO */}
          <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-2xl border border-border">
            {[
              { key: 'musculacao', label: 'Musculação' },
              { key: 'cardio', label: 'Cardio' },
              { key: 'outros', label: 'Outros (Luta/Esportes)' },
              { key: 'tarefas', label: 'Tarefas' },
            ].map((tab) => {
              const isSelected = treinoTab === tab.key
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setTreinoTab(tab.key as any)}
                  className={cn(
                    'flex-1 py-2 text-xs font-bold rounded-xl transition-all',
                    isSelected
                      ? 'bg-card text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* CARTÃO "HOJE" COM TODAS AS SESSÕES PLANEJADAS DO DIA (QUALQUER TIPO), EM ORDEM DE HORÁRIO */}
          {(() => {
            const todayMusc = plans.find(
              (p) => p.dayOfWeek === todayDayOfWeek && p.exercises.length > 0,
            )
            const todayCardio = cardioPlans.filter(
              (p) => p.weekday === todayDayOfWeek && p.active !== false,
            )
            const todayOutros = outrosPlans.filter(
              (p) => p.weekday === todayDayOfWeek && p.active !== false,
            )

            const allTodaySessions: {
              id: string
              type: 'musculacao' | 'cardio' | 'outros'
              title: string
              time?: string | null
              done: boolean
              detail: string
              variant?: string
            }[] = []

            if (todayMusc) {
              const isMuscDone = Boolean(
                todayLog &&
                todayLog.completedSets &&
                todayLog.completedSets.length > 0 &&
                todayLog.completedSets.every((s) => s.concluido),
              )
              allTodaySessions.push({
                id: todayMusc.id,
                type: 'musculacao',
                title: todayMusc.workoutName,
                time: null, // musculação flexível
                done: isMuscDone,
                detail: `${todayMusc.exercises.length} exercícios (${todayMusc.variant === 'calistenia' ? 'Calistenia' : 'Academia'})`,
                variant: todayMusc.variant || 'academia',
              })
            }

            todayCardio.forEach((c) => {
              const cLog = cardioLogs.find((l) => l.date === todayStr && l.planId === c.id)
              allTodaySessions.push({
                id: c.id,
                type: 'cardio',
                title: c.modality || 'Cardio',
                time: c.time || null,
                done: Boolean(cLog?.done),
                detail: `${c.targetKm ? `${c.targetKm} km` : ''}${c.targetKm && c.targetMinutes ? ' • ' : ''}${c.targetMinutes ? `${c.targetMinutes} min` : ''}`,
              })
            })

            todayOutros.forEach((o) => {
              const oLog = outrosLogs.find(
                (l) => l.date === todayStr && (l.planId === o.id || l.sport === o.sport),
              )
              allTodaySessions.push({
                id: o.id,
                type: 'outros',
                title: o.sport || o.modality || 'Esporte',
                time: o.time || null,
                done: Boolean(oLog?.done),
                detail: `${o.targetMinutes ? `${o.targetMinutes} min • ` : ''}${o.time ? `às ${o.time}` : ''}`,
              })
            })

            if (allTodaySessions.length === 0) return null

            // Ordena por horário (os que têm horário primeiro, depois os sem horário)
            allTodaySessions.sort((a, b) => {
              if (a.time && b.time) return a.time.localeCompare(b.time)
              if (a.time && !b.time) return -1
              if (!a.time && b.time) return 1
              return 0
            })

            const totalSessions = allTodaySessions.length
            const doneSessions = allTodaySessions.filter((s) => s.done).length

            return (
              <Card className="rounded-2xl border-border bg-card shadow-subtle p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#F07B6A]">
                      Sessões Planejadas para Hoje
                    </span>
                    <span className="text-[10px] font-bold bg-[#F07B6A]/15 text-[#F07B6A] px-2 py-0.5 rounded-full">
                      {doneSessions}/{totalSessions} concluídas
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">{todayStr}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {allTodaySessions.map((sess) => (
                    <div
                      key={sess.id}
                      onClick={() => {
                        if (sess.type === 'musculacao') {
                          setSelectedDayOfWeek(todayDayOfWeek)
                          setTreinoTab('musculacao')
                          setIsLoggingWorkout(true)
                        } else if (sess.type === 'cardio') {
                          setTreinoTab('cardio')
                        } else {
                          setTreinoTab('outros')
                        }
                      }}
                      className={cn(
                        'p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all hover:border-[#F07B6A]/50 shadow-xs',
                        sess.done
                          ? 'bg-[#3D9C73]/10 border-[#3D9C73]/30'
                          : 'bg-background border-border',
                      )}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-muted text-muted-foreground">
                            {sess.type}
                          </span>
                          {sess.time && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                              <Clock className="w-3 h-3 text-[#F07B6A]" /> {sess.time}
                            </span>
                          )}
                        </div>
                        <h4 className="text-xs sm:text-sm font-bold text-foreground line-clamp-1">
                          {sess.title}
                        </h4>
                        <span className="text-[11px] text-muted-foreground block truncate">
                          {sess.detail}
                        </span>
                      </div>

                      {sess.done ? (
                        <div className="w-8 h-8 rounded-full bg-[#3D9C73] text-white flex items-center justify-center shrink-0">
                          <Check className="w-4 h-4 stroke-[3]" />
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          className="h-8 px-2.5 rounded-lg bg-[#F07B6A] text-white text-[11px] font-semibold shrink-0"
                        >
                          Fazer
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )
          })()}

          {/* RENDERIZAÇÃO CONFORME A ABA ATIVA */}
          {treinoTab === 'tarefas' && (
            <div className="space-y-4 pt-1">
              <ModuleTasksView module="treino" />
            </div>
          )}

          {treinoTab === 'cardio' && (
            <div className="space-y-4 pt-1">
              <CardioView onPlanChanged={loadData} />
            </div>
          )}

          {treinoTab === 'outros' && (
            <div className="space-y-4 pt-1">
              <OutrosTreinosView onPlanChanged={loadData} />
            </div>
          )}

          {treinoTab === 'musculacao' && (
            <>
              {/* STRIP SEMANAL (SEG A DOM) */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">
                  Plano da Semana
                </span>

                <div className="grid grid-cols-7 gap-1.5 bg-card p-2 rounded-2xl border border-border shadow-subtle">
                  {DAYS_OF_WEEK.map((d) => {
                    const dayPlan = plans.find((p) => p.dayOfWeek === d.dayIndex)
                    const isSelected = selectedDayOfWeek === d.dayIndex
                    const isToday = todayDayOfWeek === d.dayIndex
                    const hasWorkout = Boolean(dayPlan && dayPlan.exercises.length > 0)

                    return (
                      <button
                        key={d.dayIndex}
                        type="button"
                        onClick={() => setSelectedDayOfWeek(d.dayIndex)}
                        className={cn(
                          'flex flex-col items-center justify-center py-2.5 rounded-xl transition-all min-h-[58px] relative select-none',
                          isSelected
                            ? 'bg-[#F07B6A] text-white font-bold shadow-xs'
                            : isToday
                              ? 'border border-[#F07B6A] text-foreground font-semibold bg-accent/20'
                              : 'hover:bg-muted/60 text-foreground',
                        )}
                      >
                        <span className="text-[11px] font-semibold">{d.label}</span>
                        <span
                          className={cn(
                            'text-[10px] truncate max-w-[42px] px-0.5 mt-0.5',
                            isSelected ? 'text-white/90' : 'text-muted-foreground',
                          )}
                        >
                          {hasWorkout ? 'Treino' : 'Folga'}
                        </span>

                        {/* Dot colorido se tem treino planejado */}
                        {hasWorkout && (
                          <span
                            className={cn(
                              'w-1.5 h-1.5 rounded-full mt-1',
                              isSelected ? 'bg-white' : 'bg-[#F07B6A]',
                            )}
                          />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* DETALHE DO DIA SELECIONADO (LAYOUT RESPONSIVO TABLET COM 2 COLUNAS) */}
              <div className={cn('gap-6', isTablet ? 'grid grid-cols-12 items-start' : 'block')}>
                {/* COLUNA PRINCIPAL */}
                <div className={cn(isTablet ? 'col-span-8' : 'w-full', 'space-y-4')}>
                  {currentPlan && currentPlan.exercises.length > 0 ? (
                    <Card className="rounded-2xl border-border bg-card shadow-subtle p-5 space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                              {DAYS_OF_WEEK.find((d) => d.dayIndex === selectedDayOfWeek)?.full}
                            </span>
                            {isTodaySelected && (
                              <span className="text-[10px] font-bold bg-[#F07B6A]/15 text-[#F07B6A] px-2 py-0.5 rounded-full">
                                Hoje
                              </span>
                            )}
                          </div>
                          <h2 className="text-xl font-extrabold text-foreground tracking-tight mt-0.5">
                            {currentPlan.workoutName}
                          </h2>
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditorModalOpen(true)}
                            className="h-9 w-9 rounded-full text-foreground hover:bg-muted"
                            aria-label="Editar treino"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* LISTA DE EXERCÍCIOS PLANEJADOS */}
                      <div className="space-y-2 pt-1">
                        <span className="text-xs font-semibold text-muted-foreground block">
                          Toque em um exercício para ver a evolução de carga:
                        </span>

                        <div className="space-y-2">
                          {currentPlan.exercises.map((ex, idx) => (
                            <div
                              key={ex.id || idx}
                              onClick={() => setEvolutionExercise(ex.nome)}
                              className="flex items-center justify-between p-3 rounded-xl bg-background border border-border hover:border-[#F07B6A]/50 cursor-pointer transition-all shadow-xs group"
                            >
                              <div className="space-y-0.5">
                                <span className="text-xs sm:text-sm font-bold text-foreground group-hover:text-[#F07B6A] transition-colors flex items-center gap-1.5">
                                  {ex.nome}
                                  <TrendingUp className="w-3.5 h-3.5 text-muted-foreground group-hover:text-[#F07B6A] transition-colors" />
                                </span>
                                <span className="text-[11px] text-muted-foreground block">
                                  {ex.series} séries × {ex.repeticoes} reps
                                </span>
                              </div>

                              <div className="text-right">
                                <span className="text-xs font-bold text-foreground">
                                  {ex.carga ? `${ex.carga} kg` : 'Sem carga'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* BOTÃO REGISTRAR TREINO */}
                      <div className="pt-2">
                        {isSelectedWorkoutCompleted ? (
                          <div className="p-3.5 rounded-xl bg-[#3D9C73]/10 border border-[#3D9C73]/20 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs font-bold text-[#3D9C73]">
                              <CheckCircle2 className="w-4 h-4" /> Treino concluído hoje ✓
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setIsLoggingWorkout(true)}
                              className="text-xs h-8 rounded-lg gap-1 border-border"
                            >
                              <RotateCcw className="w-3.5 h-3.5" /> Reabrir
                            </Button>
                          </div>
                        ) : (
                          <Button
                            onClick={() => setIsLoggingWorkout(true)}
                            className="w-full min-h-[48px] rounded-xl bg-[#F07B6A] hover:bg-[#F07B6A]/90 text-white font-bold text-sm shadow-sm active:scale-98 transition-all flex items-center justify-center gap-2"
                          >
                            <Play className="w-4 h-4 fill-white" />
                            Registrar Treino de Hoje
                          </Button>
                        )}
                      </div>
                    </Card>
                  ) : (
                    /* DIA DE DESCANSO OU VAZIO */
                    <div className="p-8 text-center rounded-2xl border border-dashed border-border bg-card/40 space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-[#F07B6A]/10 text-[#F07B6A] flex items-center justify-center mx-auto">
                        <Dumbbell className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-sm font-bold text-foreground">
                          Dia de Descanso ou Sem Treino
                        </h3>
                        <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                          Nenhum exercício planejado para{' '}
                          {DAYS_OF_WEEK.find((d) => d.dayIndex === selectedDayOfWeek)?.full}.
                        </p>
                      </div>
                      <Button
                        onClick={() => setEditorModalOpen(true)}
                        className="h-9 px-4 rounded-xl bg-[#F07B6A] text-white text-xs font-semibold"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar treino para este dia
                      </Button>
                    </div>
                  )}
                </div>

                {/* PAINEL LATERAL EM TABLET (RESUMO DA SEMANA E HISTÓRICO DE LOGS) */}
                {isTablet && (
                  <div className="col-span-4 space-y-4 sticky top-6">
                    <Card className="rounded-2xl border-border bg-card shadow-subtle p-4 space-y-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[#F07B6A]" /> Histórico de Treinos
                      </h3>
                      {logs.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          Nenhum treino registrado ainda.
                        </p>
                      ) : (
                        <div className="space-y-2 max-h-72 overflow-y-auto">
                          {logs.slice(0, 5).map((l) => (
                            <div
                              key={l.id}
                              className="p-2.5 rounded-lg bg-background border border-border text-xs space-y-0.5"
                            >
                              <div className="flex items-center justify-between font-bold text-foreground">
                                <span>{l.workoutName}</span>
                                <span className="text-[10px] text-muted-foreground">
                                  {new Date(l.day + 'T12:00:00').toLocaleDateString('pt-BR')}
                                </span>
                              </div>
                              <span className="text-[11px] text-[#3D9C73]">
                                {l.completedSets.filter((s) => s.concluido).length} séries feitas
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </Card>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* MODAL DO EDITOR DE TREINO */}
      <WorkoutEditorModal
        open={editorModalOpen}
        onClose={() => setEditorModalOpen(false)}
        dayOfWeek={selectedDayOfWeek}
        existingPlan={currentPlan}
        onSaved={() => {
          loadData()
          notifyDataChanged()
        }}
      />

      {/* MODAL DE EVOLUÇÃO DE CARGA DO EXERCÍCIO */}
      {evolutionExercise && (
        <ExerciseEvolutionModal
          open={Boolean(evolutionExercise)}
          onClose={() => setEvolutionExercise(null)}
          exerciseName={evolutionExercise}
        />
      )}
    </div>
  )
}
