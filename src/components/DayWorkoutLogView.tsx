import React, { useState, useEffect } from 'react'
import { ChevronLeft, Check, CheckCircle2, Sparkles, Dumbbell, RotateCcw } from 'lucide-react'
import { TreinoPlanoSemanal, TreinoLog, CompletedSet } from '@/lib/types'
import { treinoRepository } from '@/lib/repositories/treinoRepository'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

interface DayWorkoutLogViewProps {
  plan: TreinoPlanoSemanal
  dateStr: string // YYYY-MM-DD
  onBack: () => void
  onSaved: () => void
}

interface EditableSetState {
  exercicioNome: string
  serieIndex: number
  carga: number
  repeticoes: number
  concluido: boolean
  lastReference?: string // Ex: "Último treino: 40kg × 12"
}

export const DayWorkoutLogView: React.FC<DayWorkoutLogViewProps> = ({
  plan,
  dateStr,
  onBack,
  onSaved,
}) => {
  const [setsState, setSetsState] = useState<EditableSetState[]>([])
  const [loading, setLoading] = useState(true)
  const [completedCelebration, setCompletedCelebration] = useState(false)
  const { toast } = useToast()

  // Inicializa séries a partir do plano e dos logs já salvos (se existirem)
  useEffect(() => {
    async function init() {
      setLoading(true)
      const existingLog = await treinoRepository.getLogByDate(dateStr)

      const initialSets: EditableSetState[] = []

      for (const ex of plan.exercises) {
        // Busca a referência do último treino desse exercício
        const lastLoad = await treinoRepository.getLastExerciseLoad(ex.nome)
        const lastRefText = lastLoad
          ? `Último treino: ${lastLoad.carga}kg × ${lastLoad.repeticoes}`
          : undefined

        const defaultReps =
          typeof ex.repeticoes === 'number'
            ? ex.repeticoes
            : parseInt(String(ex.repeticoes).split('-')[0]) || 10

        for (let s = 1; s <= ex.series; s++) {
          // Verifica se já havia registro no log de hoje
          const loggedSet = existingLog?.completedSets.find(
            (c) => c.exercicioNome.toLowerCase() === ex.nome.toLowerCase() && c.serieIndex === s,
          )

          initialSets.push({
            exercicioNome: ex.nome,
            serieIndex: s,
            carga: loggedSet ? loggedSet.carga : lastLoad ? lastLoad.carga : ex.carga || 0,
            repeticoes: loggedSet ? loggedSet.repeticoes : defaultReps,
            concluido: loggedSet ? loggedSet.concluido : false,
            lastReference: lastRefText,
          })
        }
      }

      setSetsState(initialSets)
      setLoading(false)
    }

    init()
  }, [plan, dateStr])

  const toggleSetCompleted = (index: number) => {
    setSetsState((prev) =>
      prev.map((set, i) => (i === index ? { ...set, concluido: !set.concluido } : set)),
    )
  }

  const updateSetValues = (index: number, field: 'carga' | 'repeticoes', val: number) => {
    setSetsState((prev) => prev.map((set, i) => (i === index ? { ...set, [field]: val } : set)))
  }

  const handleFinishWorkout = async () => {
    const completedList: CompletedSet[] = setsState.map((s) => ({
      exercicioNome: s.exercicioNome,
      serieIndex: s.serieIndex,
      carga: s.carga,
      repeticoes: s.repeticoes,
      concluido: s.concluido,
    }))

    const completedCount = completedList.filter((s) => s.concluido).length
    const totalCount = completedList.length

    await treinoRepository.saveLog({
      day: dateStr,
      workoutName: plan.workoutName,
      completedSets: completedList,
    })

    if (completedCount > 0) {
      setCompletedCelebration(true)
      toast({
        title: 'Treino concluído! 🎉',
        description: `${completedCount} de ${totalCount} séries concluídas. Excelente consistência!`,
      })
    } else {
      toast({
        title: 'Treino salvo',
        description: 'Parciais salvas com sucesso.',
      })
      onSaved()
    }
  }

  const totalSets = setsState.length
  const completedSets = setsState.filter((s) => s.concluido).length

  // Agrupa séries por exercício
  const exercisesGrouped: Record<
    string,
    { exercise: string; sets: { item: EditableSetState; globalIndex: number }[] }
  > = {}
  setsState.forEach((item, idx) => {
    if (!exercisesGrouped[item.exercicioNome]) {
      exercisesGrouped[item.exercicioNome] = {
        exercise: item.exercicioNome,
        sets: [],
      }
    }
    exercisesGrouped[item.exercicioNome].sets.push({ item, globalIndex: idx })
  })

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* CELEBRAÇÃO QUANDO CONCLUIR */}
      {completedCelebration && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fade-in">
          <div className="w-20 h-20 rounded-full bg-[#F07B6A] text-white flex items-center justify-center shadow-xl animate-bounce mb-4">
            <Sparkles className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-foreground">Treino Concluído!</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs">
            {completedSets} de {totalSets} séries concluídas hoje. Grande consistência!
          </p>
          <Button
            onClick={() => {
              setCompletedCelebration(false)
              onSaved()
            }}
            className="mt-6 px-8 h-12 rounded-xl bg-[#F07B6A] hover:bg-[#F07B6A]/90 text-white font-bold text-sm shadow-md"
          >
            Continuar
          </Button>
        </div>
      )}

      {/* CABEÇALHO */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="text-xs h-9 px-2 rounded-xl text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
        </Button>

        <span className="text-xs font-bold text-[#F07B6A] bg-[#F07B6A]/10 px-3 py-1 rounded-full">
          {completedSets} / {totalSets} séries
        </span>
      </div>

      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
          {plan.workoutName}
        </h1>
        <p className="text-xs text-muted-foreground">
          Ajuste as cargas e toque no círculo (≥44px) para marcar cada série como concluída.
        </p>
      </div>

      {/* BLOCOS DE EXERCÍCIOS */}
      <div className="space-y-4">
        {Object.values(exercisesGrouped).map((group) => {
          const firstSet = group.sets[0]?.item
          return (
            <div
              key={group.exercise}
              className="bg-card rounded-2xl border border-border p-4 shadow-subtle space-y-3"
            >
              <div className="flex items-center justify-between border-b border-border/60 pb-2">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Dumbbell className="w-4 h-4 text-[#F07B6A]" />
                    {group.exercise}
                  </h3>
                  {firstSet?.lastReference && (
                    <span className="text-[11px] text-muted-foreground font-medium">
                      {firstSet.lastReference}
                    </span>
                  )}
                </div>
              </div>

              {/* LISTA DE SÉRIES */}
              <div className="space-y-2">
                {group.sets.map(({ item, globalIndex }) => (
                  <div
                    key={item.serieIndex}
                    className={cn(
                      'flex items-center justify-between p-2.5 rounded-xl border transition-all duration-150',
                      item.concluido
                        ? 'bg-[#F07B6A]/10 border-[#F07B6A]/30'
                        : 'bg-background border-border',
                    )}
                  >
                    <span className="text-xs font-bold text-muted-foreground w-14">
                      Série {item.serieIndex}
                    </span>

                    <div className="flex items-center gap-3">
                      {/* CARGA */}
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          step="0.5"
                          value={item.carga}
                          onChange={(e) =>
                            updateSetValues(globalIndex, 'carga', parseFloat(e.target.value) || 0)
                          }
                          className="w-16 h-10 text-center text-sm font-bold bg-background rounded-lg"
                        />
                        <span className="text-[11px] text-muted-foreground">kg</span>
                      </div>

                      <span className="text-muted-foreground text-xs font-bold">×</span>

                      {/* REPS */}
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          value={item.repeticoes}
                          onChange={(e) =>
                            updateSetValues(
                              globalIndex,
                              'repeticoes',
                              parseInt(e.target.value) || 0,
                            )
                          }
                          className="w-14 h-10 text-center text-sm font-bold bg-background rounded-lg"
                        />
                        <span className="text-[11px] text-muted-foreground">reps</span>
                      </div>
                    </div>

                    {/* BOTÃO CIRCULAR DE CHECK ≥44px */}
                    <button
                      type="button"
                      onClick={() => toggleSetCompleted(globalIndex)}
                      className={cn(
                        'w-11 h-11 min-h-[44px] min-w-[44px] rounded-full flex items-center justify-center transition-all active:scale-95 shadow-xs select-none',
                        item.concluido
                          ? 'bg-[#F07B6A] text-white'
                          : 'border-2 border-border text-muted-foreground hover:border-[#F07B6A]',
                      )}
                      aria-label={`Marcar série ${item.serieIndex} como concluída`}
                    >
                      <Check className="w-5 h-5 stroke-[3]" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* BOTÃO CONCLUIR TREINO (FIXO OU NO FINAL) */}
      <div className="pt-4">
        <Button
          onClick={handleFinishWorkout}
          className="w-full min-h-[50px] rounded-2xl bg-[#F07B6A] hover:bg-[#F07B6A]/90 text-white font-bold text-base shadow-md active:scale-98 transition-all flex items-center justify-center gap-2"
        >
          <CheckCircle2 className="w-5 h-5" />
          Concluir Treino
        </Button>
        <p className="text-[11px] text-center text-muted-foreground mt-2">
          {completedSets === totalSets
            ? 'Todas as séries foram concluídas!'
            : `Salvamento com parciais (${completedSets} de ${totalSets} séries)`}
        </p>
      </div>
    </div>
  )
}
