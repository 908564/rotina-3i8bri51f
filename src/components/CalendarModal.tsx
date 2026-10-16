import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'
import { getTodayDateKey, parseLocalDate, isToday as checkIsToday } from '@/lib/dateUtils'

interface CalendarModalProps {
  open: boolean
  onClose: () => void
  selectedDate: string // YYYY-MM-DD
  datesWithNotes: Set<string>
  onSelectDate: (date: string) => void
}

export const CalendarModal: React.FC<CalendarModalProps> = ({
  open,
  onClose,
  selectedDate,
  datesWithNotes,
  onSelectDate,
}) => {
  const [viewDate, setViewDate] = useState(() => {
    const d = parseLocalDate(selectedDate)
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()

  const monthName = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(
    viewDate,
  )
  const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1)

  const handlePrevMonth = () => {
    setViewDate(new Date(year, month - 1, 1))
  }

  const handleNextMonth = () => {
    setViewDate(new Date(year, month + 1, 1))
  }

  const handleTodayShortcut = () => {
    const today = getTodayDateKey()
    onSelectDate(today)
    onClose()
  }

  // Gera dias do mês
  const firstDayOfWeek = new Date(year, month, 1).getDay() // 0=Dom
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const dayCells = []
  // Espaços vazios antes do 1º dia
  for (let i = 0; i < firstDayOfWeek; i++) {
    dayCells.push(null)
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const mm = String(month + 1).padStart(2, '0')
    const dd = String(d).padStart(2, '0')
    dayCells.push(`${year}-${mm}-${dd}`)
  }

  const weekHeaders = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-md bg-card rounded-2xl p-6 border border-border">
        <DialogHeader className="flex flex-row items-center justify-between pb-2">
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-[#7C8CFF]" />
            Calendário de Anotações
          </DialogTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleTodayShortcut}
            className="text-xs h-8 px-2.5 text-[#7C8CFF] font-semibold hover:bg-[#7C8CFF]/10 rounded-lg"
          >
            Ir para Hoje
          </Button>
        </DialogHeader>

        {/* Mês atual e navegação */}
        <div className="flex items-center justify-between py-2 border-y border-border/60">
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePrevMonth}
            className="h-9 w-9 rounded-full text-foreground hover:bg-muted"
            aria-label="Mês anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-bold tracking-tight text-foreground">
            {capitalizedMonth}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNextMonth}
            className="h-9 w-9 rounded-full text-foreground hover:bg-muted"
            aria-label="Próximo mês"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Grid de dias da semana */}
        <div className="grid grid-cols-7 gap-1 text-center pt-2">
          {weekHeaders.map((w) => (
            <span key={w} className="text-[11px] font-semibold text-muted-foreground py-1">
              {w}
            </span>
          ))}

          {dayCells.map((dateStr, idx) => {
            if (!dateStr) {
              return <div key={`empty-${idx}`} className="h-10" />
            }

            const dayNum = parseInt(dateStr.split('-')[2])
            const isSelected = dateStr === selectedDate
            const hasNote = datesWithNotes.has(dateStr)
            const isToday = checkIsToday(dateStr)

            return (
              <button
                key={dateStr}
                type="button"
                onClick={() => {
                  onSelectDate(dateStr)
                  onClose()
                }}
                className={`relative h-10 w-full min-h-[40px] rounded-xl flex flex-col items-center justify-center transition-all ${
                  isSelected
                    ? 'bg-[#7C8CFF] text-white font-bold shadow-sm'
                    : isToday
                      ? 'border border-[#7C8CFF] text-foreground font-semibold bg-accent/30'
                      : 'text-foreground hover:bg-muted active:scale-95'
                }`}
              >
                <span className="text-xs leading-none">{dayNum}</span>
                {hasNote && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full mt-1 ${
                      isSelected ? 'bg-white' : 'bg-[#7C8CFF]'
                    }`}
                  />
                )}
              </button>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
