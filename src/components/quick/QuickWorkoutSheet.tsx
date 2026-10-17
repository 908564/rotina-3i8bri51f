import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { treinoRepository } from '@/lib/repositories/treinoRepository'
import { TreinoPlanoSemanal, TreinoLog } from '@/lib/types'
import { getTodayDateKey, getLocalDayOfWeek } from '@/lib/dateUtils'
import { Dumbbell, Check, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface QuickWorkoutSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (message: string) => void
}

export const QuickWorkoutSheet: React.FC<QuickWorkoutSheetProps> = ({
  open,
  onOpenChange,
  onSuccess,
}) => {
  const navigate = useNavigate()
  const [plan, setPlan] = useState<TreinoPlanoSemanal | undefined>(undefined)
  const [log, setLog] = useState<TreinoLog | undefined>(undefined)
  const [loading, setLoading] = useState(false)

  const todayDateKey = getTodayDateKey()
  const dayOfWeek = getLocalDayOfWeek()

  const loadWorkout = async () => {
    setLoading(true)
    try {
      const p = await treinoRepository.getPlanByDayOfWeek(dayOfWeek)
      const l = await treinoRepository.getLogByDate(todayDateKey)
      setPlan(p)
      setLog(l)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) {
      loadWorkout()
    }
  }, [open])

  const handleToggleSet = async (
    exercicioNome: string,
    serieIndex: number,
    carga: number,
    repeticoes: number,
  ) => {
    const isDone = log?.completedSets?.some(
      (cs) => cs.exercicioNome === exercicioNome && cs.serieIndex === serieIndex && cs.concluido,
    )

    const existingSets = log?.completedSets ? [...log.completedSets] : []
    const setIdx = existingSets.findIndex(
      (s) => s.exercicioNome === exercicioNome && s.serieIndex === serieIndex,
    )

    if (setIdx >= 0) {
      existingSets[setIdx] = {
        ...existingSets[setIdx],
        concluido: !existingSets[setIdx].concluido,
        carga,
        repeticoes,
      }
    } else {
      existingSets.push({
        exercicioNome,
        serieIndex,
        carga,
        repeticoes,
        concluido: true,
      })
    }

    await treinoRepository.saveLog({
      day: todayDateKey,
      workoutName: plan?.workoutName || 'Treino do dia',
      completedSets: existingSets,
    })

    const updated = await treinoRepository.getLogByDate(todayDateKey)
    setLog(updated)

    if (!isDone) {
      onSuccess(`Série concluída! 💪`)
    }
  }

  const hasExercises = plan && plan.exercises && plan.exercises.length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fixed bottom-0 top-auto translate-y-0 sm:max-w-md w-full bg-card rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 border border-border pb-8 sm:pb-6 max-h-[85vh] flex flex-col">
        <DialogHeader className="text-left space-y-1 shrink-0">
          <div className="flex items-center gap-2 text-[#B8503E]">
            <Dumbbell className="w-5 h-5 text-[#E07A68]" />
            <span className="text-xs font-bold uppercase tracking-wider">Treino de Hoje</span>
          </div>
          <DialogTitle className="text-lg font-bold">
            {plan?.workoutName || 'Sem treino planejado'}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {hasExercises
              ? 'Marque suas séries em 1 toque diretamente abaixo.'
              : 'Nenhum treino está planejado para o dia de hoje.'}
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 space-y-4 py-2 pr-1">
          {hasExercises ? (
            plan.exercises.map((ex, exIdx) => (
              <div
                key={ex.id || exIdx}
                className="p-3.5 rounded-2xl bg-muted/40 border border-border space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">{ex.nome}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {ex.carga > 0 ? `${ex.carga}kg · ` : ''}
                    {ex.repeticoes} reps
                  </span>
                </div>

                {/* Botões grandes de séries */}
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: ex.series }).map((_, sIdx) => {
                    const isDone = log?.completedSets?.some(
                      (cs) =>
                        cs.exercicioNome === ex.nome && cs.serieIndex === sIdx && cs.concluido,
                    )

                    return (
                      <button
                        key={sIdx}
                        type="button"
                        onClick={() =>
                          handleToggleSet(
                            ex.nome,
                            sIdx,
                            ex.carga || 0,
                            typeof ex.repeticoes === 'number'
                              ? ex.repeticoes
                              : parseInt(ex.repeticoes, 10) || 10,
                          )
                        }
                        className={`min-w-[48px] h-12 px-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-1 transition-all active:scale-95 ${
                          isDone
                            ? 'bg-[#E07A68] border-[#E07A68] text-white shadow-subtle'
                            : 'bg-card border-border text-foreground hover:bg-muted'
                        }`}
                      >
                        {isDone ? <Check className="w-4 h-4 stroke-[3]" /> : `S${sIdx + 1}`}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-6 space-y-3">
              <p className="text-xs text-muted-foreground">
                Hoje é um dia sem treino planejado. Que tal configurar seu plano ou registrar um
                treino avulso?
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  onOpenChange(false)
                  navigate('/treino')
                }}
                className="h-11 rounded-xl text-xs font-bold border-border"
              >
                <Plus className="w-4 h-4 mr-1 text-[#E07A68]" /> Montar treino de hoje
              </Button>
            </div>
          )}
        </div>

        {hasExercises && (
          <div className="shrink-0 pt-2 border-t border-border flex justify-between items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onOpenChange(false)
                navigate('/treino')
              }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Abrir tela completa
            </Button>
            <Button
              onClick={() => onOpenChange(false)}
              className="h-10 px-5 rounded-xl text-xs font-bold bg-[#E07A68] hover:bg-[#D46B59] text-white"
            >
              Concluir
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
