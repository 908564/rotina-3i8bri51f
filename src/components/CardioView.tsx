import React, { useState, useEffect } from 'react'
import { ActivityPlan, ActivityLog, CardioModality, CardioIntensity, TimerState } from '@/lib/types'
import { treinoRepository } from '@/lib/repositories/treinoRepository'
import { calculatePace, calculateSpeed, isCardioSessionDone } from '@/lib/cardioCalculations'
import { getTodayDateKey, getLocalDayOfWeek } from '@/lib/dateUtils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Play,
  Pause,
  Square,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  Flame,
  Award,
  Timer,
  ChevronRight,
  TrendingUp,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

interface CardioViewProps {
  onPlanChanged?: () => void
}

const DAYS_NAMES = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
]

const MODALITIES: CardioModality[] = ['Corrida', 'Caminhada', 'Bicicleta']
const INTENSITIES: CardioIntensity[] = ['Leve', 'Moderada', 'Intensa']

export const CardioView: React.FC<CardioViewProps> = ({ onPlanChanged }) => {
  const { toast } = useToast()
  const todayStr = getTodayDateKey()
  const todayWeekday = getLocalDayOfWeek()

  const [plans, setPlans] = useState<ActivityPlan[]>([])
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)

  // Plan modal
  const [planModalOpen, setPlanModalOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<ActivityPlan | null>(null)
  const [planWeekday, setPlanWeekday] = useState<number>(todayWeekday)
  const [planModality, setPlanModality] = useState<CardioModality>('Corrida')
  const [planTargetKm, setPlanTargetKm] = useState<string>('')
  const [planTargetMinutes, setPlanTargetMinutes] = useState<string>('')
  const [planIntensity, setPlanIntensity] = useState<CardioIntensity>('Moderada')
  const [planTime, setPlanTime] = useState<string>('')

  // Log modal (Registro de sessão)
  const [logModalOpen, setLogModalOpen] = useState(false)
  const [selectedPlanForLog, setSelectedPlanForLog] = useState<ActivityPlan | null>(null)
  const [logKm, setLogKm] = useState<string>('')
  const [logMinutes, setLogMinutes] = useState<string>('')
  const [logIntensity, setLogIntensity] = useState<CardioIntensity>('Moderada')
  const [logNotes, setLogNotes] = useState<string>('')
  const [logDoneManual, setLogDoneManual] = useState<boolean>(false)

  // Cronômetro local (timer_state)
  const [timerRunning, setTimerRunning] = useState(false)
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [timerIntervalId, setTimerIntervalId] = useState<any>(null)

  const loadData = async () => {
    setLoading(true)
    const [pList, lList] = await Promise.all([
      treinoRepository.getActivityPlans('cardio'),
      treinoRepository.getActivityLogs('cardio'),
    ])
    setPlans(pList)
    setLogs(lList)

    // Carrega timer salvo se houver
    const savedTimer = await treinoRepository.getTimerState('cardio_active')
    if (savedTimer) {
      if (savedTimer.status === 'running' && savedTimer.startedAt) {
        const diff = Math.floor((Date.now() - new Date(savedTimer.startedAt).getTime()) / 1000)
        const total = (savedTimer.elapsedSeconds || 0) + Math.max(0, diff)
        setTimerSeconds(total)
        setTimerRunning(true)
      } else {
        setTimerSeconds(savedTimer.elapsedSeconds || 0)
        setTimerRunning(savedTimer.status === 'running')
      }
    }
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  // Timer interval
  useEffect(() => {
    if (timerRunning) {
      const id = setInterval(() => {
        setTimerSeconds((prev) => prev + 1)
      }, 1000)
      setTimerIntervalId(id)
      return () => clearInterval(id)
    } else {
      if (timerIntervalId) clearInterval(timerIntervalId)
    }
  }, [timerRunning])

  const handleStartTimer = async () => {
    const nowIso = new Date().toISOString()
    setTimerRunning(true)
    await treinoRepository.saveTimerState({
      id: 'cardio_active',
      module: 'treino',
      status: 'running',
      startedAt: nowIso,
      elapsedSeconds: timerSeconds,
      createdAt: nowIso,
      updatedAt: nowIso,
    })
  }

  const handlePauseTimer = async () => {
    setTimerRunning(false)
    const nowIso = new Date().toISOString()
    await treinoRepository.saveTimerState({
      id: 'cardio_active',
      module: 'treino',
      status: 'paused',
      elapsedSeconds: timerSeconds,
      createdAt: nowIso,
      updatedAt: nowIso,
    })
  }

  const handleStopTimer = async () => {
    setTimerRunning(false)
    const mins = Math.max(1, Math.round(timerSeconds / 60))
    setLogMinutes(String(mins))
    await treinoRepository.clearTimerState('cardio_active')
    toast({
      title: 'Tempo registrado!',
      description: `${mins} min preenchidos no formulário.`,
    })
  }

  const handleResetTimer = async () => {
    setTimerRunning(false)
    setTimerSeconds(0)
    await treinoRepository.clearTimerState('cardio_active')
  }

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`
  }

  // Abrir modal de criação/edição de plano
  const handleOpenPlanModal = (plan?: ActivityPlan) => {
    if (plan) {
      setEditingPlan(plan)
      setPlanWeekday(plan.weekday ?? todayWeekday)
      setPlanModality((plan.modality as CardioModality) || 'Corrida')
      setPlanTargetKm(plan.targetKm ? String(plan.targetKm) : '')
      setPlanTargetMinutes(plan.targetMinutes ? String(plan.targetMinutes) : '')
      setPlanIntensity((plan.intensity as CardioIntensity) || 'Moderada')
      setPlanTime(plan.time || '')
    } else {
      setEditingPlan(null)
      setPlanWeekday(todayWeekday)
      setPlanModality('Corrida')
      setPlanTargetKm('')
      setPlanTargetMinutes('')
      setPlanIntensity('Moderada')
      setPlanTime('')
    }
    setPlanModalOpen(true)
  }

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetKmNum = planTargetKm ? parseFloat(planTargetKm.replace(',', '.')) : null
    const targetMinNum = planTargetMinutes ? parseInt(planTargetMinutes, 10) : null

    await treinoRepository.saveActivityPlan({
      id: editingPlan?.id,
      type: 'cardio',
      weekday: planWeekday,
      modality: planModality,
      targetKm: targetKmNum,
      targetMinutes: targetMinNum,
      intensity: planIntensity,
      time: planTime.trim() || null,
      active: true,
      title: `${planModality} (${DAYS_NAMES[planWeekday]})`,
    })

    setPlanModalOpen(false)
    toast({ title: 'Sessão de cardio salva!' })
    await loadData()
    onPlanChanged?.()
  }

  const handleDeletePlan = async (id: string) => {
    if (confirm('Deseja excluir esta sessão planejada?')) {
      await treinoRepository.deleteActivityPlan(id)
      toast({ title: 'Plano de cardio removido' })
      await loadData()
      onPlanChanged?.()
    }
  }

  // Abrir modal de registro de log
  const handleOpenLogModal = (plan?: ActivityPlan) => {
    setSelectedPlanForLog(plan || null)
    setLogKm(plan?.targetKm ? String(plan.targetKm) : '')
    setLogMinutes(plan?.targetMinutes ? String(plan.targetMinutes) : '')
    setLogIntensity((plan?.intensity as CardioIntensity) || 'Moderada')
    setLogNotes('')
    setLogDoneManual(false)
    setLogModalOpen(true)
  }

  const handleSaveLog = async (e: React.FormEvent) => {
    e.preventDefault()
    const kmNum = logKm ? parseFloat(logKm.replace(',', '.')) : null
    const minNum = logMinutes ? parseInt(logMinutes, 10) : null

    const modality = selectedPlanForLog?.modality || 'Corrida'
    const targetKm = selectedPlanForLog?.targetKm
    const targetMin = selectedPlanForLog?.targetMinutes

    const autoDone = isCardioSessionDone(targetKm, targetMin, kmNum, minNum, logDoneManual)

    await treinoRepository.saveActivityLog({
      type: 'cardio',
      planId: selectedPlanForLog?.id || null,
      date: todayStr,
      modality,
      km: kmNum,
      minutes: minNum,
      intensity: logIntensity,
      notes: logNotes.trim() || null,
      done: autoDone,
      value: kmNum || minNum || 1,
      durationMinutes: minNum || 0,
      source: 'manual',
    })

    setLogModalOpen(false)
    toast({
      title: autoDone ? 'Cardio concluído! 🎉' : 'Sessão de cardio salva!',
      description: autoDone ? 'Todas as metas foram atingidas!' : 'Progresso salvo com sucesso.',
    })
    await loadData()
    onPlanChanged?.()
  }

  // Estatísticas e evolução
  const currentMonthPrefix = todayStr.substring(0, 7) // AAAA-MM
  const logsThisMonth = logs.filter((l) => l.date.startsWith(currentMonthPrefix))
  const totalKmMonth = logsThisMonth.reduce((acc, l) => acc + (Number(l.km) || 0), 0)
  const totalMinMonth = logsThisMonth.reduce((acc, l) => acc + (Number(l.minutes) || 0), 0)

  // Recordes
  let recordKm = 0
  let bestPaceMin = 999
  let bestPaceStr: string | null = null

  logs.forEach((l) => {
    const km = Number(l.km) || 0
    const min = Number(l.minutes) || 0
    if (km > recordKm) recordKm = km
    if (km > 0 && min > 0) {
      const pace = min / km
      if (pace < bestPaceMin) {
        bestPaceMin = pace
        bestPaceStr = calculatePace(km, min)
      }
    }
  })

  // Dias da semana com planos
  const weeklyPlansGrouped: Record<number, ActivityPlan[]> = {}
  plans.forEach((p) => {
    const day = p.weekday ?? 0
    if (!weeklyPlansGrouped[day]) weeklyPlansGrouped[day] = []
    weeklyPlansGrouped[day].push(p)
  })

  return (
    <div className="space-y-6">
      {/* CARD DO CRONÔMETRO (LOCAL-ONLY) */}
      <Card className="rounded-2xl border-border bg-card shadow-subtle p-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F07B6A]/15 text-[#F07B6A] flex items-center justify-center">
              <Timer className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                Cronômetro de Cardio (sem GPS)
              </span>
              <div className="text-2xl font-mono font-bold text-foreground">
                {formatTimer(timerSeconds)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!timerRunning ? (
              <Button
                type="button"
                onClick={handleStartTimer}
                className="h-10 px-4 rounded-xl bg-[#F07B6A] hover:bg-[#F07B6A]/90 text-white font-semibold text-xs flex items-center gap-1.5"
              >
                <Play className="w-4 h-4 fill-white" /> Iniciar
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handlePauseTimer}
                className="h-10 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs flex items-center gap-1.5"
              >
                <Pause className="w-4 h-4" /> Pausar
              </Button>
            )}

            {timerSeconds > 0 && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleStopTimer}
                  className="h-10 px-3 rounded-xl border-border text-xs font-semibold flex items-center gap-1"
                >
                  <Square className="w-3.5 h-3.5" /> Usar tempo
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleResetTimer}
                  className="h-10 px-2 rounded-xl text-xs text-muted-foreground"
                >
                  Zerar
                </Button>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* PLANO SEMANAL DE CARDIO */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-foreground">Plano Semanal de Cardio</h3>
            <p className="text-xs text-muted-foreground">
              Configure dias, modalidades e metas de distância ou tempo.
            </p>
          </div>
          <Button
            onClick={() => handleOpenPlanModal()}
            className="h-9 px-3 rounded-xl bg-[#F07B6A] hover:bg-[#F07B6A]/90 text-white font-semibold text-xs flex items-center gap-1"
          >
            <Plus className="w-4 h-4" /> Nova Sessão
          </Button>
        </div>

        {plans.length === 0 ? (
          <div className="p-8 text-center rounded-2xl border border-dashed border-border bg-card/40 space-y-2">
            <p className="text-xs text-muted-foreground">
              Nenhuma sessão de cardio configurada ainda.
            </p>
            <Button
              onClick={() => handleOpenPlanModal()}
              variant="outline"
              className="h-9 rounded-xl text-xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1 text-[#F07B6A]" /> Adicionar Sessão de Corrida,
              Caminhada ou Bike
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {plans.map((p) => {
              const isToday = p.weekday === todayWeekday
              const todayLogForPlan = logs.find((l) => l.date === todayStr && l.planId === p.id)
              const isDone = Boolean(todayLogForPlan?.done)

              return (
                <Card
                  key={p.id}
                  className={cn(
                    'rounded-2xl border-border bg-card shadow-subtle p-4 space-y-3 relative overflow-hidden',
                    isToday && 'ring-2 ring-[#F07B6A]',
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#F07B6A]/10 text-[#F07B6A]">
                          {DAYS_NAMES[p.weekday ?? 0]}
                        </span>
                        {isToday && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#F07B6A] text-white">
                            Hoje
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-foreground mt-1">{p.modality}</h4>
                      {p.time && (
                        <span className="text-[11px] text-muted-foreground block">
                          Horário: {p.time}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenPlanModal(p)}
                        className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePlan(p.id)}
                        className="p-1.5 text-muted-foreground hover:text-destructive rounded-lg"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Metas */}
                  <div className="flex flex-wrap gap-2 text-xs pt-1 border-t border-border/60">
                    {p.targetKm && (
                      <span className="font-semibold text-foreground">Meta: {p.targetKm} km</span>
                    )}
                    {p.targetMinutes && (
                      <span className="font-semibold text-foreground">
                        Meta: {p.targetMinutes} min
                      </span>
                    )}
                    {p.intensity && <span className="text-muted-foreground">({p.intensity})</span>}
                  </div>

                  {/* Ação de registro de hoje */}
                  {isToday && (
                    <div className="pt-2">
                      {isDone ? (
                        <div className="p-2 rounded-xl bg-[#3D9C73]/10 text-[#3D9C73] text-xs font-bold flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4" /> Concluído hoje
                          </span>
                          <button
                            type="button"
                            onClick={() => handleOpenLogModal(p)}
                            className="underline text-[11px]"
                          >
                            Editar
                          </button>
                        </div>
                      ) : (
                        <Button
                          onClick={() => handleOpenLogModal(p)}
                          className="w-full h-9 rounded-xl bg-[#F07B6A] hover:bg-[#F07B6A]/90 text-white font-semibold text-xs"
                        >
                          <Play className="w-3.5 h-3.5 mr-1 fill-white" /> Registrar Sessão de Hoje
                        </Button>
                      )}
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* EVOLUÇÃO E RECORDES */}
      <div className="space-y-3 pt-2">
        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[#F07B6A]" /> Evolução e Recordes
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="p-3.5 rounded-2xl border-border bg-card shadow-subtle space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              Total Mês (km)
            </span>
            <div className="text-lg font-black text-foreground">
              {totalKmMonth.toFixed(1).replace('.', ',')} km
            </div>
            <span className="text-[10px] text-muted-foreground">{totalMinMonth} min totais</span>
          </Card>

          <Card className="p-3.5 rounded-2xl border-border bg-card shadow-subtle space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              Maior Distância
            </span>
            <div className="text-lg font-black text-foreground">
              {recordKm > 0 ? `${recordKm.toFixed(1).replace('.', ',')} km` : '—'}
            </div>
            <span className="text-[10px] text-muted-foreground">Recorde pessoal</span>
          </Card>

          <Card className="p-3.5 rounded-2xl border-border bg-card shadow-subtle space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              Melhor Ritmo
            </span>
            <div className="text-lg font-black text-foreground">{bestPaceStr || '—'}</div>
            <span className="text-[10px] text-muted-foreground">min/km</span>
          </Card>

          <Card className="p-3.5 rounded-2xl border-border bg-card shadow-subtle space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              Sessões Feitas
            </span>
            <div className="text-lg font-black text-foreground">{logs.length}</div>
            <span className="text-[10px] text-muted-foreground">histórico total</span>
          </Card>
        </div>
      </div>

      {/* HISTÓRICO DE LOGS DE CARDIO */}
      <div className="space-y-3 pt-2">
        <h3 className="text-base font-bold text-foreground">Histórico de Sessões</h3>
        {logs.length === 0 ? (
          <div className="p-6 text-center rounded-2xl border border-dashed border-border bg-card/40 text-xs text-muted-foreground">
            Nenhuma sessão de cardio registrada ainda. Complete sua primeira corrida, caminhada ou
            pedalada!
          </div>
        ) : (
          <div className="space-y-2">
            {logs.slice(0, 10).map((l) => {
              const km = Number(l.km) || 0
              const min = Number(l.minutes) || 0
              const isBike = l.modality === 'Bicicleta'
              const metricStr = isBike ? calculateSpeed(km, min) : calculatePace(km, min)

              return (
                <div
                  key={l.id}
                  className="p-3 rounded-xl bg-card border border-border flex items-center justify-between text-xs shadow-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground">{l.modality}</span>
                      <span className="text-muted-foreground">
                        {new Date(l.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </span>
                      {l.done && (
                        <span className="text-[10px] bg-[#3D9C73]/15 text-[#3D9C73] font-bold px-1.5 py-0.2 rounded">
                          Feito
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      {km > 0 && <span>{km} km</span>}
                      {min > 0 && <span>{min} min</span>}
                      {metricStr && (
                        <span className="font-semibold text-foreground">({metricStr})</span>
                      )}
                      {l.intensity && <span>• {l.intensity}</span>}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={async () => {
                      if (confirm('Excluir este registro?')) {
                        await treinoRepository.deleteActivityLog(l.id)
                        await loadData()
                        onPlanChanged?.()
                      }
                    }}
                    className="p-1.5 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* MODAL CONFIGURAR PLANO */}
      <Dialog open={planModalOpen} onOpenChange={setPlanModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle>{editingPlan ? 'Editar Sessão' : 'Nova Sessão de Cardio'}</DialogTitle>
            <DialogDescription className="text-xs">
              Defina a modalidade, dia da semana e metas para o treino.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSavePlan} className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold">Dia da Semana</label>
              <select
                value={planWeekday}
                onChange={(e) => setPlanWeekday(Number(e.target.value))}
                className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs font-medium"
              >
                {DAYS_NAMES.map((name, idx) => (
                  <option key={idx} value={idx}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold">Modalidade</label>
              <div className="grid grid-cols-3 gap-2">
                {MODALITIES.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPlanModality(m)}
                    className={cn(
                      'h-10 rounded-xl border text-xs font-bold transition-all',
                      planModality === m
                        ? 'border-[#F07B6A] bg-[#F07B6A]/10 text-[#F07B6A]'
                        : 'border-border text-muted-foreground',
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold">Meta de Distância (km)</label>
                <Input
                  type="text"
                  placeholder="Ex.: 5.0"
                  value={planTargetKm}
                  onChange={(e) => setPlanTargetKm(e.target.value)}
                  className="h-10 rounded-xl text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold">Meta de Tempo (min)</label>
                <Input
                  type="number"
                  placeholder="Ex.: 30"
                  value={planTargetMinutes}
                  onChange={(e) => setPlanTargetMinutes(e.target.value)}
                  className="h-10 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold">Intensidade</label>
                <select
                  value={planIntensity}
                  onChange={(e) => setPlanIntensity(e.target.value as CardioIntensity)}
                  className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs"
                >
                  {INTENSITIES.map((i) => (
                    <option key={i} value={i}>
                      {i}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold">Horário (opcional)</label>
                <Input
                  type="time"
                  value={planTime}
                  onChange={(e) => setPlanTime(e.target.value)}
                  className="h-10 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPlanModalOpen(false)}
                className="flex-1 h-10 rounded-xl text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1 h-10 rounded-xl bg-[#F07B6A] hover:bg-[#F07B6A]/90 text-white font-semibold text-xs"
              >
                Salvar Sessão
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL REGISTRAR LOG */}
      <Dialog open={logModalOpen} onOpenChange={setLogModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle>Registrar Cardio</DialogTitle>
            <DialogDescription className="text-xs">
              Informe a distância real e o tempo gasto para calcular o ritmo e velocidade.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveLog} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold">Distância real (km)</label>
                <Input
                  type="text"
                  placeholder="Ex.: 5.2"
                  value={logKm}
                  onChange={(e) => setLogKm(e.target.value)}
                  className="h-10 rounded-xl text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold">Tempo real (min)</label>
                <Input
                  type="number"
                  placeholder="Ex.: 28"
                  value={logMinutes}
                  onChange={(e) => setLogMinutes(e.target.value)}
                  className="h-10 rounded-xl text-xs"
                />
              </div>
            </div>

            {/* Cálculo automático de ritmo / velocidade em tempo real */}
            {(() => {
              const km = parseFloat(logKm.replace(',', '.')) || 0
              const min = parseInt(logMinutes, 10) || 0
              const isBike = selectedPlanForLog?.modality === 'Bicicleta'
              const calculated = isBike ? calculateSpeed(km, min) : calculatePace(km, min)

              if (!calculated) return null
              return (
                <div className="p-3 rounded-xl bg-accent/20 border border-border text-xs flex items-center justify-between font-bold">
                  <span className="text-muted-foreground">
                    {isBike ? 'Velocidade calculada:' : 'Ritmo médio calculado:'}
                  </span>
                  <span className="text-[#F07B6A] text-sm">{calculated}</span>
                </div>
              )
            })()}

            <div className="space-y-1">
              <label className="text-xs font-semibold">Intensidade percebida</label>
              <select
                value={logIntensity}
                onChange={(e) => setLogIntensity(e.target.value as CardioIntensity)}
                className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs"
              >
                {INTENSITIES.map((i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold">Observações (opcional)</label>
              <Input
                type="text"
                placeholder="Como foi o treino? Clima, sensação..."
                value={logNotes}
                onChange={(e) => setLogNotes(e.target.value)}
                className="h-10 rounded-xl text-xs"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="manualDoneCheck"
                checked={logDoneManual}
                onChange={(e) => setLogDoneManual(e.target.checked)}
                className="w-4 h-4 rounded text-[#F07B6A]"
              />
              <label htmlFor="manualDoneCheck" className="text-xs text-foreground cursor-pointer">
                Marcar manualmente como sessão concluída
              </label>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLogModalOpen(false)}
                className="flex-1 h-10 rounded-xl text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1 h-10 rounded-xl bg-[#F07B6A] hover:bg-[#F07B6A]/90 text-white font-semibold text-xs"
              >
                Salvar Registro
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
