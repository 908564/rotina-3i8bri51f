import React, { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Dumbbell, Trophy, Calendar, TrendingUp } from 'lucide-react'
import { treinoRepository } from '@/lib/repositories/treinoRepository'
import { ExerciseHistoryPoint } from '@/lib/types'

interface ExerciseEvolutionModalProps {
  open: boolean
  onClose: () => void
  exerciseName: string
}

export const ExerciseEvolutionModal: React.FC<ExerciseEvolutionModalProps> = ({
  open,
  onClose,
  exerciseName,
}) => {
  const [history, setHistory] = useState<ExerciseHistoryPoint[]>([])
  const [maxWeight, setMaxWeight] = useState<number>(0)
  const [totalSessions, setTotalSessions] = useState<number>(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!exerciseName || !open) return

    setLoading(true)
    treinoRepository
      .getExerciseEvolution(exerciseName)
      .then((res) => {
        setHistory(res.history)
        setMaxWeight(res.maxWeight)
        setTotalSessions(res.totalSessions)
      })
      .finally(() => setLoading(false))
  }, [exerciseName, open])

  // Cálculo para desenhar o gráfico SVG
  const minWeight = history.length > 0 ? Math.min(...history.map((h) => h.carga)) : 0
  const chartHeight = 120
  const chartWidth = 280

  // Coordenadas dos pontos no SVG
  const points = history.map((pt, i) => {
    const x =
      history.length === 1 ? chartWidth / 2 : (i / (history.length - 1)) * (chartWidth - 40) + 20
    const weightRange = maxWeight - minWeight || 1
    const y =
      chartHeight -
      ((pt.carga - Math.max(0, minWeight - 5)) / (weightRange + 10)) * (chartHeight - 30) -
      15
    return { x, y, pt }
  })

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ')

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-md bg-card rounded-2xl p-6 border border-border">
        <DialogHeader className="text-left space-y-1">
          <div className="flex items-center gap-2 text-[#F07B6A]">
            <TrendingUp className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Evolução de Carga</span>
          </div>
          <DialogTitle className="text-xl font-bold">{exerciseName}</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Acompanhe o ganho de força e histórico de treinos registrados.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* DESTAQUE DE RECORDE */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-gradient-to-r from-[#F07B6A]/15 to-transparent border border-[#F07B6A]/20">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-[#F07B6A] text-white flex items-center justify-center font-bold shadow-sm">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider block">
                  Carga Máxima
                </span>
                <span className="text-lg font-black text-foreground">
                  Recorde: {maxWeight} kg 🏆
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-muted-foreground block">Sessões</span>
              <span className="text-sm font-bold text-foreground">{totalSessions}</span>
            </div>
          </div>

          {/* GRÁFICO SIMPLES EM SVG COM GRADIENTE */}
          {history.length === 0 ? (
            <div className="p-8 text-center rounded-xl border border-dashed border-border text-xs text-muted-foreground">
              Registre treinos com este exercício para ver sua evolução aqui.
            </div>
          ) : (
            <div className="bg-background rounded-xl p-3 border border-border space-y-2">
              <div className="h-[140px] w-full flex items-center justify-center overflow-hidden">
                <svg
                  viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                  className="w-full h-full overflow-visible"
                >
                  <defs>
                    <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F07B6A" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#F07B6A" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Linhas de grade sutis */}
                  <line
                    x1="10"
                    y1={chartHeight - 15}
                    x2={chartWidth - 10}
                    y2={chartHeight - 15}
                    stroke="currentColor"
                    strokeOpacity="0.1"
                  />
                  <line
                    x1="10"
                    y1={chartHeight / 2}
                    x2={chartWidth - 10}
                    y2={chartHeight / 2}
                    stroke="currentColor"
                    strokeOpacity="0.1"
                  />

                  {/* Linha do gráfico */}
                  {points.length > 1 && (
                    <polyline
                      fill="none"
                      stroke="#F07B6A"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={polylinePoints}
                    />
                  )}

                  {/* Pontos */}
                  {points.map((p, idx) => (
                    <g key={idx}>
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r="5"
                        fill="#FFFFFF"
                        stroke="#F07B6A"
                        strokeWidth="2.5"
                      />
                      <text
                        x={p.x}
                        y={p.y - 8}
                        textAnchor="middle"
                        fontSize="9"
                        fontWeight="bold"
                        fill="currentColor"
                      >
                        {p.pt.carga}kg
                      </text>
                    </g>
                  ))}
                </svg>
              </div>
              <p className="text-[10px] text-center text-muted-foreground">
                Carga em quilogramas (kg) ao longo das sessões realizadas
              </p>
            </div>
          )}

          {/* LISTA HISTÓRICA DE SESSÕES */}
          <div className="space-y-2 max-h-48 overflow-y-auto">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
              Histórico de Sessões
            </span>
            {history
              .slice()
              .reverse()
              .map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-background border border-border text-xs"
                >
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {new Date(item.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <div className="font-bold text-foreground">
                    {item.carga} kg{' '}
                    <span className="text-muted-foreground font-normal">
                      ({item.repeticoes} reps)
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
