import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Trash2, Dumbbell, GripVertical } from 'lucide-react'
import { TreinoPlanoSemanal, PlannedExercise } from '@/lib/types'
import { treinoRepository } from '@/lib/repositories/treinoRepository'
import { useToast } from '@/hooks/use-toast'

interface WorkoutEditorModalProps {
  open: boolean
  onClose: () => void
  dayOfWeek: number // 0=Dom, 1=Seg...
  existingPlan?: TreinoPlanoSemanal | null
  onSaved: () => void
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

export const WorkoutEditorModal: React.FC<WorkoutEditorModalProps> = ({
  open,
  onClose,
  dayOfWeek,
  existingPlan,
  onSaved,
}) => {
  const [workoutName, setWorkoutName] = useState('')
  const [exercises, setExercises] = useState<PlannedExercise[]>([])
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (!open) return

    let cancelled = false
    async function loadEffectivePlan() {
      if (existingPlan) {
        setWorkoutName(existingPlan.workoutName || '')
        setExercises(existingPlan.exercises ? [...existingPlan.exercises] : [])
        return
      }

      // Se existingPlan não foi passado (ou ainda não carregou), consulta o banco
      try {
        const found = await treinoRepository.getPlanByDayOfWeek(dayOfWeek)
        if (cancelled) return
        if (found) {
          setWorkoutName(found.workoutName || '')
          setExercises(found.exercises ? [...found.exercises] : [])
        } else {
          setWorkoutName(`${DAYS_NAMES[dayOfWeek]} — Novo Treino`)
          setExercises([
            {
              id: crypto.randomUUID(),
              nome: '',
              series: 3,
              repeticoes: '10-12',
              carga: 20,
            },
          ])
        }
      } catch {
        if (!cancelled) {
          setWorkoutName(`${DAYS_NAMES[dayOfWeek]} — Novo Treino`)
          setExercises([
            {
              id: crypto.randomUUID(),
              nome: '',
              series: 3,
              repeticoes: '10-12',
              carga: 20,
            },
          ])
        }
      }
    }

    loadEffectivePlan()

    return () => {
      cancelled = true
    }
  }, [existingPlan, dayOfWeek, open])

  const handleAddExercise = () => {
    setExercises((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        nome: '',
        series: 3,
        repeticoes: '10-12',
        carga: 0,
      },
    ])
  }

  const handleRemoveExercise = (id: string) => {
    setExercises((prev) => prev.filter((e) => e.id !== id))
  }

  const handleUpdateExercise = (id: string, field: keyof PlannedExercise, val: string | number) => {
    setExercises((prev) => prev.map((e) => (e.id === id ? { ...e, [field]: val } : e)))
  }

  const handleMoveUp = (index: number) => {
    if (index === 0) return
    setExercises((prev) => {
      const copy = [...prev]
      const temp = copy[index]
      copy[index] = copy[index - 1]
      copy[index - 1] = temp
      return copy
    })
  }

  const handleMoveDown = (index: number) => {
    if (index === exercises.length - 1) return
    setExercises((prev) => {
      const copy = [...prev]
      const temp = copy[index]
      copy[index] = copy[index + 1]
      copy[index + 1] = temp
      return copy
    })
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!workoutName.trim()) {
      toast({
        title: 'Nome do treino obrigatório',
        variant: 'destructive',
      })
      return
    }

    // Filtra exercícios que possuam nome preenchido
    const validExercises = exercises
      .map((e) => ({
        ...e,
        nome: e.nome.trim(),
        series: Math.max(1, Number(e.series) || 1),
        carga: Number(e.carga) || 0,
      }))
      .filter((e) => e.nome.length > 0)

    setLoading(true)
    try {
      await treinoRepository.savePlan({
        id: existingPlan?.id,
        dayOfWeek: Number(dayOfWeek),
        workoutName: workoutName.trim(),
        exercises: validExercises,
      })
      toast({
        title: 'Plano salvo!',
        description: `Treino de ${DAYS_NAMES[dayOfWeek]} atualizado com sucesso.`,
      })
      onSaved()
      onClose()
    } catch (err) {
      console.error('Falha ao salvar plano de treino:', err)
      toast({
        title: 'Erro ao salvar',
        description:
          err instanceof Error && err.message
            ? err.message
            : 'Não foi possível salvar o treino localmente.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-lg bg-card rounded-2xl p-6 border border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-left space-y-1">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Dumbbell className="w-5 h-5 text-[#F07B6A]" />
            {existingPlan ? 'Editar Treino' : 'Configurar Treino'}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {DAYS_NAMES[dayOfWeek]} • Monte sua lista de exercícios, séries e repetições.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4 pt-2">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Nome do Treino</label>
            <Input
              type="text"
              placeholder="Ex.: Peito e Tríceps"
              value={workoutName}
              onChange={(e) => setWorkoutName(e.target.value)}
              className="h-11 rounded-xl bg-background border-border font-medium"
            />
          </div>

          {/* LISTA DE EXERCÍCIOS */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground">Exercícios Planejados</label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleAddExercise}
                className="text-xs h-8 text-[#F07B6A] hover:bg-[#F07B6A]/10 font-semibold"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar Exercício
              </Button>
            </div>

            {exercises.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-border text-center text-xs text-muted-foreground">
                Nenhum exercício ainda. Clique em "Adicionar Exercício" acima.
              </div>
            ) : (
              <div className="space-y-2.5">
                {exercises.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-background border border-border space-y-2 shadow-xs"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col gap-0.5 text-muted-foreground">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveUp(idx)}
                          className="hover:text-foreground disabled:opacity-20 text-[10px]"
                          aria-label="Mover para cima"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          disabled={idx === exercises.length - 1}
                          onClick={() => handleMoveDown(idx)}
                          className="hover:text-foreground disabled:opacity-20 text-[10px]"
                          aria-label="Mover para baixo"
                        >
                          ▼
                        </button>
                      </div>

                      <Input
                        type="text"
                        placeholder="Nome do exercício (ex.: Supino reto)"
                        value={item.nome}
                        onChange={(e) => handleUpdateExercise(item.id, 'nome', e.target.value)}
                        className="h-9 text-xs rounded-lg flex-1"
                      />

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveExercise(item.id)}
                        className="h-9 w-9 rounded-lg text-muted-foreground hover:text-destructive"
                        aria-label="Remover exercício"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pl-6">
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Séries</span>
                        <Input
                          type="number"
                          min={1}
                          value={item.series}
                          onChange={(e) =>
                            handleUpdateExercise(item.id, 'series', parseInt(e.target.value) || 1)
                          }
                          className="h-8 text-xs rounded-lg"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Reps</span>
                        <Input
                          type="text"
                          value={item.repeticoes}
                          onChange={(e) =>
                            handleUpdateExercise(item.id, 'repeticoes', e.target.value)
                          }
                          placeholder="10-12"
                          className="h-8 text-xs rounded-lg"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block">Carga (kg)</span>
                        <Input
                          type="number"
                          step="0.5"
                          value={item.carga}
                          onChange={(e) =>
                            handleUpdateExercise(item.id, 'carga', parseFloat(e.target.value) || 0)
                          }
                          placeholder="0"
                          className="h-8 text-xs rounded-lg"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 h-11 rounded-xl text-xs font-semibold"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 h-11 rounded-xl text-xs font-semibold bg-[#F07B6A] hover:bg-[#F07B6A]/90 text-white shadow-sm"
            >
              {loading ? 'Salvando...' : 'Salvar Treino'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
