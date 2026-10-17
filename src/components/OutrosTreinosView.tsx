import React, { useState, useEffect } from 'react'
import { ActivityPlan, ActivityLog } from '@/lib/types'
import { treinoRepository } from '@/lib/repositories/treinoRepository'
import { getTodayDateKey, getLocalDayOfWeek } from '@/lib/dateUtils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Plus, Trash2, Edit2, CheckCircle2, Activity, Play, RotateCcw } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

interface OutrosTreinosViewProps {
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

const DEFAULT_SPORTS = [
  'Muay thai',
  'Jiu-jitsu',
  'Futebol',
  'Vôlei',
  'Natação',
  'Tênis',
  'Yoga',
  'Basquete',
]

export const OutrosTreinosView: React.FC<OutrosTreinosViewProps> = ({ onPlanChanged }) => {
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
  const [planSport, setPlanSport] = useState<string>('Muay thai')
  const [planCustomSport, setPlanCustomSport] = useState<string>('')
  const [planTime, setPlanTime] = useState<string>('19:00')
  const [planDuration, setPlanDuration] = useState<string>('')

  // Log modal
  const [logModalOpen, setLogModalOpen] = useState(false)
  const [selectedPlanForLog, setSelectedPlanForLog] = useState<ActivityPlan | null>(null)
  const [logSport, setLogSport] = useState<string>('')
  const [logDuration, setLogDuration] = useState<string>('60')
  const [logIntensity, setLogIntensity] = useState<string>('Moderada')
  const [logNotes, setLogNotes] = useState<string>('')

  const loadData = async () => {
    setLoading(true)
    const [pList, lList] = await Promise.all([
      treinoRepository.getActivityPlans('outros'),
      treinoRepository.getActivityLogs('outros'),
    ])
    setPlans(pList)
    setLogs(lList)
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  // Coleta histórico de esportes usados para sugestões
  const sportSuggestions = Array.from(
    new Set([
      ...DEFAULT_SPORTS,
      ...plans.map((p) => p.sport || p.modality || '').filter(Boolean),
      ...logs.map((l) => l.sport || l.modality || '').filter(Boolean),
    ]),
  )

  const handleOpenPlanModal = (plan?: ActivityPlan) => {
    if (plan) {
      setEditingPlan(plan)
      setPlanWeekday(plan.weekday ?? todayWeekday)
      const sp = plan.sport || plan.modality || 'Muay thai'
      if (DEFAULT_SPORTS.includes(sp)) {
        setPlanSport(sp)
        setPlanCustomSport('')
      } else {
        setPlanSport('Outro')
        setPlanCustomSport(sp)
      }
      setPlanTime(plan.time || '19:00')
      setPlanDuration(plan.targetMinutes ? String(plan.targetMinutes) : '')
    } else {
      setEditingPlan(null)
      setPlanWeekday(todayWeekday)
      setPlanSport('Muay thai')
      setPlanCustomSport('')
      setPlanTime('19:00')
      setPlanDuration('')
    }
    setPlanModalOpen(true)
  }

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault()
    const finalSport = planSport === 'Outro' ? planCustomSport.trim() : planSport
    if (!finalSport) {
      toast({ title: 'Informe o nome do esporte', variant: 'destructive' })
      return
    }
    if (!planTime.trim()) {
      toast({ title: 'Horário é obrigatório para planejar', variant: 'destructive' })
      return
    }

    const durationNum = planDuration ? parseInt(planDuration, 10) : null

    await treinoRepository.saveActivityPlan({
      id: editingPlan?.id,
      type: 'outros',
      weekday: planWeekday,
      sport: finalSport,
      modality: finalSport,
      time: planTime.trim(),
      targetMinutes: durationNum,
      active: true,
      title: `${finalSport} (${DAYS_NAMES[planWeekday]})`,
    })

    setPlanModalOpen(false)
    toast({ title: 'Sessão salva com sucesso!' })
    await loadData()
    onPlanChanged?.()
  }

  const handleDeletePlan = async (id: string) => {
    if (confirm('Deseja excluir esta sessão planejada?')) {
      await treinoRepository.deleteActivityPlan(id)
      toast({ title: 'Sessão removida' })
      await loadData()
      onPlanChanged?.()
    }
  }

  const handleOpenLogModal = (plan?: ActivityPlan) => {
    setSelectedPlanForLog(plan || null)
    setLogSport(plan?.sport || plan?.modality || 'Muay thai')
    setLogDuration(plan?.targetMinutes ? String(plan.targetMinutes) : '60')
    setLogIntensity('Moderada')
    setLogNotes('')
    setLogModalOpen(true)
  }

  const handleSaveLog = async (e: React.FormEvent) => {
    e.preventDefault()
    const dur = parseInt(logDuration, 10) || 0

    await treinoRepository.saveActivityLog({
      type: 'outros',
      planId: selectedPlanForLog?.id || null,
      date: todayStr,
      sport: logSport,
      modality: logSport,
      minutes: dur,
      intensity: logIntensity,
      notes: logNotes.trim() || null,
      done: true,
      durationMinutes: dur,
      value: dur,
      source: 'manual',
    })

    setLogModalOpen(false)
    toast({
      title: 'Treino registrado como Feito! ✓',
      description: `${logSport} • ${dur} min`,
    })
    await loadData()
    onPlanChanged?.()
  }

  // Estatísticas por esporte (sessões, minutos totais)
  const sportsStats: Record<string, { sessions: number; minutes: number }> = {}
  logs.forEach((l) => {
    const sp = l.sport || l.modality || 'Outros'
    if (!sportsStats[sp]) sportsStats[sp] = { sessions: 0, minutes: 0 }
    sportsStats[sp].sessions += 1
    sportsStats[sp].minutes += Number(l.minutes) || 0
  })

  return (
    <div className="space-y-6">
      {/* CABEÇALHO DO PLANO */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-foreground">Esportes e Lutas Planejados</h3>
          <p className="text-xs text-muted-foreground">
            Defina dias da semana, horários e duração de artes marciais e esportes.
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
            Nenhuma sessão de esporte ou luta planejada ainda.
          </p>
          <Button
            onClick={() => handleOpenPlanModal()}
            variant="outline"
            className="h-9 rounded-xl text-xs"
          >
            <Plus className="w-3.5 h-3.5 mr-1 text-[#F07B6A]" /> Adicionar Muay thai, Jiu-jitsu,
            Futebol, etc.
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {plans.map((p) => {
            const isToday = p.weekday === todayWeekday
            const spName = p.sport || p.modality || 'Esporte'
            const todayLogForPlan = logs.find(
              (l) => l.date === todayStr && (l.planId === p.id || l.sport === spName),
            )
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
                    <h4 className="text-sm font-bold text-foreground mt-1">{spName}</h4>
                    <span className="text-[11px] text-muted-foreground block font-medium">
                      Horário: {p.time || '19:00'}
                      {p.targetMinutes ? ` • ${p.targetMinutes} min` : ''}
                    </span>
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

                {isToday && (
                  <div className="pt-2">
                    {isDone ? (
                      <div className="p-2 rounded-xl bg-[#3D9C73]/10 text-[#3D9C73] text-xs font-bold flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" /> Feito hoje ✓
                        </span>
                      </div>
                    ) : (
                      <Button
                        onClick={() => handleOpenLogModal(p)}
                        className="w-full h-9 rounded-xl bg-[#F07B6A] hover:bg-[#F07B6A]/90 text-white font-semibold text-xs flex items-center justify-center gap-1"
                      >
                        <Play className="w-3.5 h-3.5 fill-white" /> Marcar como Feito
                      </Button>
                    )}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* HISTÓRICO POR ESPORTE (SESSÕES, MINUTOS TOTAIS) */}
      <div className="space-y-3 pt-2">
        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#F07B6A]" /> Histórico por Esporte
        </h3>

        {Object.keys(sportsStats).length === 0 ? (
          <div className="p-6 text-center rounded-2xl border border-dashed border-border bg-card/40 text-xs text-muted-foreground">
            Nenhuma sessão esportiva registrada ainda.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(sportsStats).map(([sp, stat]) => (
              <Card
                key={sp}
                className="p-3.5 rounded-2xl border-border bg-card shadow-subtle space-y-1"
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block truncate">
                  {sp}
                </span>
                <div className="text-lg font-black text-foreground">
                  {stat.sessions} {stat.sessions === 1 ? 'sessão' : 'sessões'}
                </div>
                <span className="text-[10px] text-muted-foreground block">
                  {stat.minutes} min totais
                </span>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* REGISTROS RECENTES */}
      <div className="space-y-3 pt-2">
        <h3 className="text-base font-bold text-foreground">Últimos Registros</h3>
        {logs.length === 0 ? (
          <p className="text-xs text-muted-foreground">Sem registros ainda.</p>
        ) : (
          <div className="space-y-2">
            {logs.slice(0, 10).map((l) => (
              <div
                key={l.id}
                className="p-3 rounded-xl bg-card border border-border flex items-center justify-between text-xs shadow-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground">{l.sport || l.modality}</span>
                    <span className="text-muted-foreground">
                      {new Date(l.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </span>
                    <span className="text-[10px] bg-[#3D9C73]/15 text-[#3D9C73] font-bold px-1.5 py-0.2 rounded">
                      Feito ✓
                    </span>
                  </div>
                  <div className="text-muted-foreground flex items-center gap-2">
                    {l.minutes && <span>{l.minutes} min</span>}
                    {l.intensity && <span>• {l.intensity}</span>}
                    {l.notes && <span>• "{l.notes}"</span>}
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
            ))}
          </div>
        )}
      </div>

      {/* MODAL CONFIGURAR PLANO */}
      <Dialog open={planModalOpen} onOpenChange={setPlanModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle>
              {editingPlan ? 'Editar Sessão' : 'Nova Sessão de Esporte/Luta'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Informe o esporte, dia da semana e horário do treino.
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
              <label className="text-xs font-semibold">Esporte / Luta</label>
              <div className="flex flex-wrap gap-1.5 pb-1">
                {sportSuggestions.slice(0, 8).map((sp) => (
                  <button
                    key={sp}
                    type="button"
                    onClick={() => {
                      setPlanSport(sp)
                      setPlanCustomSport('')
                    }}
                    className={cn(
                      'px-2.5 py-1 text-xs rounded-lg border font-medium transition-all',
                      planSport === sp
                        ? 'border-[#F07B6A] bg-[#F07B6A]/10 text-[#F07B6A] font-bold'
                        : 'border-border text-muted-foreground',
                    )}
                  >
                    {sp}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setPlanSport('Outro')}
                  className={cn(
                    'px-2.5 py-1 text-xs rounded-lg border font-medium transition-all',
                    planSport === 'Outro'
                      ? 'border-[#F07B6A] bg-[#F07B6A]/10 text-[#F07B6A] font-bold'
                      : 'border-border text-muted-foreground',
                  )}
                >
                  Outro
                </button>
              </div>

              {planSport === 'Outro' && (
                <Input
                  type="text"
                  placeholder="Nome do esporte (ex.: Judô, Natação)"
                  value={planCustomSport}
                  onChange={(e) => setPlanCustomSport(e.target.value)}
                  className="h-10 rounded-xl text-xs mt-1"
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold">Horário (obrigatório)</label>
                <Input
                  type="time"
                  required
                  value={planTime}
                  onChange={(e) => setPlanTime(e.target.value)}
                  className="h-10 rounded-xl text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold">Duração prevista (min)</label>
                <Input
                  type="number"
                  placeholder="Ex.: 60"
                  value={planDuration}
                  onChange={(e) => setPlanDuration(e.target.value)}
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
            <DialogTitle>Registrar Treino Feito</DialogTitle>
            <DialogDescription className="text-xs">
              {logSport} • Confirme os dados da sessão realizada hoje.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveLog} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold">Duração real (min)</label>
                <Input
                  type="number"
                  placeholder="Ex.: 60"
                  value={logDuration}
                  onChange={(e) => setLogDuration(e.target.value)}
                  className="h-10 rounded-xl text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold">Intensidade (opcional)</label>
                <select
                  value={logIntensity}
                  onChange={(e) => setLogIntensity(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs"
                >
                  <option value="Leve">Leve</option>
                  <option value="Moderada">Moderada</option>
                  <option value="Intensa">Intensa</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold">Observações</label>
              <Input
                type="text"
                placeholder="Rendimento, rounds, sensação..."
                value={logNotes}
                onChange={(e) => setLogNotes(e.target.value)}
                className="h-10 rounded-xl text-xs"
              />
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
                Salvar como Feito
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
