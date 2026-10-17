import React, { useState, useEffect } from 'react'
import { Flame, Check, Minus, Circle, AlertTriangle } from 'lucide-react'
import { moduleDaysRepository } from '@/lib/repositories/moduleDaysRepository'
import { ModuleDayKey } from '@/lib/types'
import {
  getTodayDateKey,
  subDaysFromDateKey,
  addDaysToDateKey,
  parseLocalDate,
} from '@/lib/dateUtils'
import { cn } from '@/lib/utils'

interface ModuleStreakCardProps {
  module: ModuleDayKey
  todayStatusText?: string // Mensagem de hoje ("Falta ler 12 páginas para manter sua ofensiva")
  isGoalPending?: boolean // Se a meta de hoje está pendente
  onStreakLoaded?: (currentStreak: number) => void
}

const DAY_LABELS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D']

type DayState = 'done' | 'missed' | 'rest' | 'future'

export function ModuleStreakCard({
  module,
  todayStatusText,
  isGoalPending = false,
  onStreakLoaded,
}: ModuleStreakCardProps) {
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [weekDays, setWeekDays] = useState<
    Array<{ date: string; label: string; state: DayState; isToday: boolean }>
  >([])
  const [isAtRisk, setIsAtRisk] = useState(false)

  const loadStreakData = async () => {
    const today = getTodayDateKey()
    const [currentStreak, best] = await Promise.all([
      moduleDaysRepository.calculateModuleStreak(module, today),
      moduleDaysRepository.calculateBestModuleStreak(module),
    ])
    setStreak(currentStreak)
    setBestStreak(best)
    onStreakLoaded?.(currentStreak)

    // Checa se está "Em risco": meta de hoje pendente depois das 18h
    const now = new Date()
    const isAfter18 = now.getHours() >= 18
    setIsAtRisk(Boolean(isGoalPending && isAfter18))

    // Calcula os 7 dias da semana corrente (Segunda a Domingo)
    const todayDate = parseLocalDate(today)
    // 0 = Dom, 1 = Seg, ..., 6 = Sab
    const dayOfWeek = todayDate.getDay()
    // Normaliza para Segunda = 0 ... Domingo = 6
    const diffToMonday = (dayOfWeek + 6) % 7
    const mondayStr = subDaysFromDateKey(today, diffToMonday)

    const allModuleDays = await moduleDaysRepository.getAll()
    const dayMap = new Map<string, any>()
    allModuleDays.filter((d) => d.module === module).forEach((d) => dayMap.set(d.date, d))

    const days: Array<{ date: string; label: string; state: DayState; isToday: boolean }> = []
    for (let i = 0; i < 7; i++) {
      const dKey = addDaysToDateKey(mondayStr, i)
      const isToday = dKey === today
      const isPast = dKey < today
      const isFuture = dKey > today

      let state: DayState = 'future'

      if (isFuture) {
        state = 'future'
      } else {
        const record = dayMap.get(dKey)
        if (!record || !record.goalDefined) {
          // Descanso / sem meta definida: ponto neutro
          state = 'rest'
        } else if (record.done) {
          state = 'done'
        } else {
          // Passado com meta não cumprida ou hoje pendente
          state = isToday ? (isGoalPending ? 'missed' : 'done') : 'missed'
        }
      }

      days.push({
        date: dKey,
        label: DAY_LABELS[i],
        state,
        isToday,
      })
    }

    setWeekDays(days)
  }

  useEffect(() => {
    loadStreakData()
  }, [module, todayStatusText, isGoalPending])

  return (
    <div className="p-4 rounded-2xl bg-card border border-border shadow-subtle space-y-3 animate-fade-in">
      {/* CABEÇALHO: CHAMA, DIAS E MELHOR */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              'w-9 h-9 rounded-xl flex items-center justify-center transition-colors',
              isAtRisk
                ? 'bg-amber-500/15 text-amber-500'
                : streak > 0
                  ? 'bg-orange-500/15 text-orange-500'
                  : 'bg-muted text-muted-foreground',
            )}
          >
            <Flame
              className={cn(
                'w-5 h-5 transition-colors',
                isAtRisk
                  ? 'text-amber-500 fill-amber-500 animate-pulse'
                  : streak > 0
                    ? 'text-orange-500 fill-orange-500'
                    : 'text-muted-foreground',
              )}
            />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-black tracking-tight text-foreground">
                {streak} {streak === 1 ? 'dia' : 'dias'}
              </span>

              {/* Tag "Em risco" (texto explícito, nunca só cor) */}
              {isAtRisk && (
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  <AlertTriangle className="w-3 h-3" /> Em risco
                </span>
              )}
            </div>
            <p className="text-[11px] font-medium text-muted-foreground">
              Melhor: {bestStreak} {bestStreak === 1 ? 'dia' : 'dias'}
            </p>
          </div>
        </div>
      </div>

      {/* TIRA DOS 7 DIAS (S T Q Q S S D) */}
      <div className="pt-1">
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {weekDays.map((d) => {
            return (
              <div key={d.date} className="flex flex-col items-center gap-1">
                <span
                  className={cn(
                    'text-[10px] font-bold',
                    d.isToday ? 'text-primary' : 'text-muted-foreground',
                  )}
                >
                  {d.label}
                </span>

                <div
                  className={cn(
                    'w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                    d.state === 'done' && 'bg-emerald-500 text-white shadow-xs',
                    d.state === 'missed' && 'bg-muted text-muted-foreground border border-border',
                    d.state === 'rest' && 'bg-muted/50 text-muted-foreground',
                    d.state === 'future' &&
                      'border-2 border-dashed border-border/80 text-transparent',
                    d.isToday && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
                  )}
                  title={`${d.date} - ${d.state}`}
                >
                  {d.state === 'done' && <Check className="w-4 h-4 stroke-[2.5]" />}
                  {d.state === 'missed' && <Minus className="w-3.5 h-3.5 stroke-[2.5]" />}
                  {d.state === 'rest' && <Circle className="w-2 h-2 fill-current" />}
                  {d.state === 'future' && null}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* SITUAÇÃO DE HOJE (MENSAGENS SEMPRE POSITIVAS) */}
      {todayStatusText && (
        <div className="pt-1 border-t border-border/50">
          <p className="text-xs font-medium text-muted-foreground leading-relaxed">
            {todayStatusText}
          </p>
        </div>
      )}
    </div>
  )
}
