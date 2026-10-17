import React, { useState, useEffect } from 'react'
import { readingTimerService } from '@/lib/readingTimerService'
import { ReadingTimerState } from '@/lib/types'
import { BookOpen } from 'lucide-react'

interface FloatingReadingTimerChipProps {
  onClick: () => void
}

export function FloatingReadingTimerChip({ onClick }: FloatingReadingTimerChipProps) {
  const [timerState, setTimerState] = useState<ReadingTimerState | null>(null)
  const [seconds, setSeconds] = useState(0)

  const sync = async () => {
    const s = await readingTimerService.getTimerState()
    setTimerState(s)
    if (s) {
      setSeconds(s.elapsedSeconds || 0)
    }
  }

  useEffect(() => {
    sync()
    const unsubscribe = readingTimerService.subscribe(sync)
    const onCustom = () => sync()
    window.addEventListener('rotina_reading_timer_changed', onCustom)

    return () => {
      unsubscribe()
      window.removeEventListener('rotina_reading_timer_changed', onCustom)
    }
  }, [])

  // Atualiza segundos a cada segundo se estiver rodando
  useEffect(() => {
    if (!timerState || timerState.status !== 'running') return

    const id = setInterval(() => {
      setSeconds((prev) => prev + 1)
    }, 1000)

    return () => clearInterval(id)
  }, [timerState])

  if (!timerState || timerState.status === 'stopped') {
    return null
  }

  const formatTimerShort = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed bottom-20 right-4 z-40 flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#1F7F6E] text-white shadow-lg hover:bg-[#1A6D5E] active:scale-95 transition-all animate-fade-in border border-white/20"
      aria-label="Cronômetro de leitura em andamento"
    >
      <span className="relative flex h-2 w-2">
        {timerState.status === 'running' && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
        )}
        <span
          className={`relative inline-flex rounded-full h-2 w-2 ${
            timerState.status === 'running' ? 'bg-emerald-400' : 'bg-amber-300'
          }`}
        />
      </span>
      <BookOpen className="w-3.5 h-3.5" />
      <span className="text-xs font-bold tracking-tight">Lendo {formatTimerShort(seconds)}</span>
    </button>
  )
}
