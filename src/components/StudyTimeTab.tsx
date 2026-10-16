import React, { useState } from 'react'
import { Course, StudySession, CourseGoalProgress } from '@/lib/types'
import { estudosRepository } from '@/lib/repositories/estudosRepository'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Clock,
  Plus,
  Target,
  Calendar,
  Trash2,
  TrendingUp,
  Sparkles,
  CheckCircle2,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface StudyTimeTabProps {
  course: Course
  sessions: StudySession[]
  goalProgress: CourseGoalProgress | null
  onRefresh: () => void
}

export const StudyTimeTab: React.FC<StudyTimeTabProps> = ({
  course,
  sessions,
  goalProgress,
  onRefresh,
}) => {
  const { toast } = useToast()

  // Modal de registrar sessão de tempo
  const [sessionModalOpen, setSessionModalOpen] = useState(false)
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0])
  const [sessionMinutes, setSessionMinutes] = useState('45')
  const [sessionNotes, setSessionNotes] = useState('')
  const [savingSession, setSavingSession] = useState(false)

  // Modal de meta semanal (único ponto de entrada para definir/editar meta deste curso)
  const [goalModalOpen, setGoalModalOpen] = useState(false)
  const [goalMinutesInput, setGoalMinutesInput] = useState(
    goalProgress?.weeklyMinutesTarget ? String(goalProgress.weeklyMinutesTarget) : '180',
  )
  const [savingGoal, setSavingGoal] = useState(false)

  const handleOpenAddSessionToday = () => {
    setSessionDate(new Date().toISOString().split('T')[0])
    setSessionMinutes('45')
    setSessionNotes('')
    setSessionModalOpen(true)
  }

  const handleSaveSession = async (e: React.FormEvent) => {
    e.preventDefault()
    const mins = Number(sessionMinutes)
    if (!sessionDate || isNaN(mins) || mins <= 0) {
      toast({
        title: 'Dados inválidos',
        description: 'Informe uma data e um valor positivo em minutos.',
        variant: 'destructive',
      })
      return
    }

    setSavingSession(true)
    try {
      await estudosRepository.saveSession({
        courseId: course.id,
        date: sessionDate,
        minutes: mins,
        notes: sessionNotes.trim() ? sessionNotes.trim() : undefined,
      })

      toast({
        title: 'Sessão registrada! ⏱️',
        description: `${mins} minutos adicionados ao curso ${course.name}.`,
      })

      setSessionModalOpen(false)
      onRefresh()
    } finally {
      setSavingSession(false)
    }
  }

  const handleDeleteSession = async (sessionId: string) => {
    await estudosRepository.deleteSession(sessionId)
    toast({ title: 'Sessão de tempo removida' })
    onRefresh()
  }

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault()
    const mins = Number(goalMinutesInput)
    if (isNaN(mins) || mins <= 0) {
      toast({
        title: 'Meta inválida',
        description: 'Defina um número positivo de minutos semanais.',
        variant: 'destructive',
      })
      return
    }

    setSavingGoal(true)
    try {
      await estudosRepository.saveCourseGoal(course.id, mins)
      toast({
        title: 'Meta semanal atualizada! 🎯',
        description: `Meta de ${mins} min/semana salva com histórico de alterações.`,
      })
      setGoalModalOpen(false)
      onRefresh()
    } finally {
      setSavingGoal(false)
    }
  }

  const handleRemoveGoal = async () => {
    await estudosRepository.removeCourseGoal(course.id)
    toast({
      title: 'Meta removida',
      description: 'Este curso continuará sem meta semanal.',
    })
    setGoalModalOpen(false)
    onRefresh()
  }

  // Estatísticas do curso
  const weekMinutes = goalProgress?.weekMinutes || 0
  const monthMinutes = goalProgress?.monthMinutes || 0
  const hasGoal = Boolean(goalProgress?.hasGoal && goalProgress.weeklyMinutesTarget)
  const target = goalProgress?.weeklyMinutesTarget || 0
  const weekProgressPercent =
    target > 0 ? Math.min(100, Math.round((weekMinutes / target) * 100)) : 0

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Botão rápido + Tempo estudado hoje */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#8B5CF6]/10 border border-[#8B5CF6]/20">
        <div className="space-y-0.5">
          <span className="text-xs font-bold uppercase tracking-wider text-[#8B5CF6]">
            Registro de Tempo
          </span>
          <h3 className="text-sm font-bold text-foreground">
            Acompanhe suas horas dedicadas a este curso
          </h3>
          <p className="text-xs text-muted-foreground">
            Hoje:{' '}
            <span className="font-semibold text-foreground">
              {goalProgress?.todayMinutes || 0} min
            </span>{' '}
            • Semana: <span className="font-semibold text-foreground">{weekMinutes} min</span>
          </p>
        </div>

        <Button
          onClick={handleOpenAddSessionToday}
          className="min-h-[44px] h-11 px-5 rounded-xl bg-[#8B5CF6] hover:bg-[#8B5CF6]/90 text-white font-semibold text-xs shadow-sm flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" /> + Tempo estudado hoje
        </Button>
      </div>

      {/* Cards de Totais: Semana e Mês */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="rounded-xl border-border bg-card p-3.5 space-y-1">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            Total da Semana
          </span>
          <div className="text-xl sm:text-2xl font-black text-foreground">
            {weekMinutes} <span className="text-xs font-medium text-muted-foreground">min</span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {(weekMinutes / 60).toFixed(1)}h nos últimos 7 dias
          </p>
        </Card>

        <Card className="rounded-xl border-border bg-card p-3.5 space-y-1">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            Total do Mês
          </span>
          <div className="text-xl sm:text-2xl font-black text-foreground">
            {monthMinutes} <span className="text-xs font-medium text-muted-foreground">min</span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {(monthMinutes / 60).toFixed(1)}h nos últimos 30 dias
          </p>
        </Card>
      </div>

      {/* SEÇÃO: META DE ESTUDO (ÚNICO PONTO DE ENTRADA, SEM BOTÕES DUPLICADOS) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border shadow-subtle space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-[#8B5CF6]" />
            <h4 className="text-sm font-bold text-foreground">Meta de Estudo</h4>
          </div>

          {hasGoal && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setGoalMinutesInput(String(target))
                setGoalModalOpen(true)
              }}
              className="text-xs h-8 text-[#8B5CF6] hover:bg-[#8B5CF6]/10 font-semibold"
            >
              Editar meta
            </Button>
          )}
        </div>

        {hasGoal ? (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground">
                Progresso Semanal: {weekMinutes} / {target} min
              </span>
              <span className="text-[#8B5CF6] font-bold text-xs">{weekProgressPercent}%</span>
            </div>

            <Progress
              value={weekProgressPercent}
              className="h-2 bg-muted [&>div]:bg-[#8B5CF6] rounded-full"
            />

            <p className="text-[11px] text-muted-foreground">
              {weekMinutes >= target ? (
                <span className="text-[#3D9C73] font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Meta semanal atingida para este curso!
                </span>
              ) : (
                <span>
                  Faltam {target - weekMinutes} minutos para completar sua meta esta semana.
                </span>
              )}
            </p>
          </div>
        ) : (
          <div className="rounded-xl bg-muted/30 border border-dashed border-border/80 p-3.5 space-y-2">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Você ainda não definiu uma meta semanal para este curso. Estabeleça minutos semanais
              para acompanhar sua evolução de forma consistente.
            </p>
            <Button
              onClick={() => {
                setGoalMinutesInput('180')
                setGoalModalOpen(true)
              }}
              variant="outline"
              size="sm"
              className="h-9 px-3.5 rounded-xl border-border text-xs font-semibold text-[#8B5CF6] hover:bg-[#8B5CF6]/10"
            >
              <Target className="w-3.5 h-3.5 mr-1" /> Definir meta
            </Button>
          </div>
        )}
      </div>

      {/* Histórico das Sessões deste curso */}
      <div className="space-y-3 pt-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" /> Histórico de Sessões
        </h4>

        {sessions.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">
            Nenhuma sessão de tempo registrada para este curso ainda.
          </p>
        ) : (
          <div className="space-y-2">
            {sessions.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between p-3 rounded-xl bg-card border border-border/70 hover:border-border transition-colors text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground">{s.minutes} minutos</span>
                    <span className="text-[11px] text-muted-foreground">• {s.date}</span>
                  </div>
                  {s.notes && (
                    <p className="text-[11px] text-muted-foreground italic line-clamp-1">
                      "{s.notes}"
                    </p>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteSession(s.id)}
                  className="h-8 w-8 text-muted-foreground hover:text-destructive rounded-lg"
                  title="Excluir registro"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL REGISTRAR TEMPO */}
      <Dialog open={sessionModalOpen} onOpenChange={setSessionModalOpen}>
        <DialogContent className="sm:max-w-md bg-card rounded-2xl p-5 sm:p-6 border border-border">
          <DialogHeader className="text-left space-y-1">
            <div className="flex items-center gap-2 text-[#8B5CF6]">
              <Clock className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-wider">Registrar Sessão</span>
            </div>
            <DialogTitle className="text-lg font-bold">Tempo Estudado</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveSession} className="space-y-4 pt-1">
            {/* Minutos */}
            <div className="space-y-1.5">
              <Label htmlFor="session-mins" className="text-xs font-semibold">
                Tempo dedicado (em minutos) *
              </Label>
              <Input
                id="session-mins"
                type="number"
                min="1"
                placeholder="Ex.: 45"
                value={sessionMinutes}
                onChange={(e) => setSessionMinutes(e.target.value)}
                className="rounded-xl text-xs sm:text-sm bg-background font-bold"
                autoFocus
              />
              <div className="flex gap-2 pt-1">
                {[15, 30, 45, 60, 90, 120].map((quick) => (
                  <button
                    key={quick}
                    type="button"
                    onClick={() => setSessionMinutes(String(quick))}
                    className="px-2.5 py-1 text-[11px] rounded-lg border border-border hover:bg-muted text-muted-foreground font-medium"
                  >
                    +{quick}m
                  </button>
                ))}
              </div>
            </div>

            {/* Data */}
            <div className="space-y-1.5">
              <Label htmlFor="session-date" className="text-xs font-semibold">
                Data do estudo *
              </Label>
              <Input
                id="session-date"
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                className="rounded-xl text-xs bg-background"
              />
            </div>

            {/* Observações opcionais */}
            <div className="space-y-1.5">
              <Label htmlFor="session-notes" className="text-xs font-semibold">
                O que você estudou? (opcional)
              </Label>
              <Input
                id="session-notes"
                placeholder="Ex.: Aula 3 sobre Hooks, leitura do artigo..."
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
                className="rounded-xl text-xs sm:text-sm bg-background"
              />
            </div>

            <DialogFooter className="pt-2 flex flex-row gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSessionModalOpen(false)}
                disabled={savingSession}
                className="h-10 rounded-xl text-xs px-4"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={savingSession}
                className="h-10 rounded-xl text-xs px-5 bg-[#8B5CF6] hover:bg-[#8B5CF6]/90 text-white font-semibold"
              >
                {savingSession ? 'Salvando...' : 'Salvar Registro'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL DEFINIR / EDITAR META SEMANAL */}
      <Dialog open={goalModalOpen} onOpenChange={setGoalModalOpen}>
        <DialogContent className="sm:max-w-md bg-card rounded-2xl p-5 sm:p-6 border border-border">
          <DialogHeader className="text-left space-y-1">
            <div className="flex items-center gap-2 text-[#8B5CF6]">
              <Target className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-wider">
                {hasGoal ? 'Editar Meta' : 'Definir Meta'}
              </span>
            </div>
            <DialogTitle className="text-lg font-bold">Meta Semanal de Estudo</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveGoal} className="space-y-4 pt-1">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Defina quantos minutos por semana você deseja dedicar a este curso. Alterações nesta
              meta não recalculam o histórico passado (guardamos a vigência de cada período).
            </p>

            <div className="space-y-1.5">
              <Label htmlFor="goal-mins" className="text-xs font-semibold">
                Meta semanal (minutos) *
              </Label>
              <Input
                id="goal-mins"
                type="number"
                min="1"
                placeholder="Ex.: 180 (3 horas)"
                value={goalMinutesInput}
                onChange={(e) => setGoalMinutesInput(e.target.value)}
                className="rounded-xl text-xs sm:text-sm bg-background font-bold"
                autoFocus
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  { m: 120, label: '2h / semana' },
                  { m: 180, label: '3h / semana' },
                  { m: 300, label: '5h / semana' },
                  { m: 600, label: '10h / semana' },
                ].map((preset) => (
                  <button
                    key={preset.m}
                    type="button"
                    onClick={() => setGoalMinutesInput(String(preset.m))}
                    className="px-2.5 py-1 text-[11px] rounded-lg border border-border hover:bg-muted text-muted-foreground font-medium"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <DialogFooter className="pt-2 flex flex-row gap-2 justify-between items-center">
              {hasGoal ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleRemoveGoal}
                  disabled={savingGoal}
                  className="h-10 text-destructive hover:bg-destructive/10 text-xs px-3 rounded-xl"
                >
                  Remover meta
                </Button>
              ) : (
                <div />
              )}

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setGoalModalOpen(false)}
                  disabled={savingGoal}
                  className="h-10 rounded-xl text-xs px-4"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={savingGoal}
                  className="h-10 rounded-xl text-xs px-5 bg-[#8B5CF6] hover:bg-[#8B5CF6]/90 text-white font-semibold"
                >
                  {savingGoal ? 'Salvando...' : 'Salvar Meta'}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
