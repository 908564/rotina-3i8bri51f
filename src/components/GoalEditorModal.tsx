import React, { useState, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Target, Calendar, Sparkles, BookOpen, Clock, HelpCircle } from 'lucide-react'
import { LivroMeta } from '@/lib/types'

interface GoalEditorFieldsProps {
  goal: LivroMeta
  totalPages?: number
  currentPage?: number
  onChange: (updated: LivroMeta) => void
}

export const GoalEditorFields: React.FC<GoalEditorFieldsProps> = ({
  goal,
  totalPages,
  currentPage = 0,
  onChange,
}) => {
  const [dailyPages, setDailyPages] = useState<string>(
    goal.dailyPages !== undefined ? String(goal.dailyPages) : '',
  )
  const [dailyMinutes, setDailyMinutes] = useState<string>(
    goal.dailyMinutes !== undefined ? String(goal.dailyMinutes) : '',
  )
  const [weeklyPages, setWeeklyPages] = useState<string>(
    goal.weeklyPages !== undefined ? String(goal.weeklyPages) : '',
  )
  const [weeklyMinutes, setWeeklyMinutes] = useState<string>(
    goal.weeklyMinutes !== undefined ? String(goal.weeklyMinutes) : '',
  )
  const [monthlyPages, setMonthlyPages] = useState<string>(
    goal.monthlyPages !== undefined ? String(goal.monthlyPages) : '',
  )
  const [monthlyMinutes, setMonthlyMinutes] = useState<string>(
    goal.monthlyMinutes !== undefined ? String(goal.monthlyMinutes) : '',
  )
  const [targetDate, setTargetDate] = useState<string>(goal.targetDate || '')

  useEffect(() => {
    setDailyPages(goal.dailyPages !== undefined ? String(goal.dailyPages) : '')
    setDailyMinutes(goal.dailyMinutes !== undefined ? String(goal.dailyMinutes) : '')
    setWeeklyPages(goal.weeklyPages !== undefined ? String(goal.weeklyPages) : '')
    setWeeklyMinutes(goal.weeklyMinutes !== undefined ? String(goal.weeklyMinutes) : '')
    setMonthlyPages(goal.monthlyPages !== undefined ? String(goal.monthlyPages) : '')
    setMonthlyMinutes(goal.monthlyMinutes !== undefined ? String(goal.monthlyMinutes) : '')
    setTargetDate(goal.targetDate || '')
  }, [goal])

  const notifyChange = (partial: Partial<LivroMeta>) => {
    const updated: LivroMeta = {
      dailyPages:
        partial.dailyPages !== undefined
          ? partial.dailyPages
          : dailyPages
            ? parseInt(dailyPages)
            : undefined,
      dailyMinutes:
        partial.dailyMinutes !== undefined
          ? partial.dailyMinutes
          : dailyMinutes
            ? parseInt(dailyMinutes)
            : undefined,
      weeklyPages:
        partial.weeklyPages !== undefined
          ? partial.weeklyPages
          : weeklyPages
            ? parseInt(weeklyPages)
            : undefined,
      weeklyMinutes:
        partial.weeklyMinutes !== undefined
          ? partial.weeklyMinutes
          : weeklyMinutes
            ? parseInt(weeklyMinutes)
            : undefined,
      monthlyPages:
        partial.monthlyPages !== undefined
          ? partial.monthlyPages
          : monthlyPages
            ? parseInt(monthlyPages)
            : undefined,
      monthlyMinutes:
        partial.monthlyMinutes !== undefined
          ? partial.monthlyMinutes
          : monthlyMinutes
            ? parseInt(monthlyMinutes)
            : undefined,
      targetDate: partial.targetDate !== undefined ? partial.targetDate : targetDate || undefined,
    }
    onChange(updated)
  }

  // Cálculo da data-alvo sugerida
  const targetDateCalculation = useMemo(() => {
    if (!targetDate) return null
    if (!totalPages || totalPages <= 0) return null

    const remainingPages = Math.max(0, totalPages - currentPage)
    if (remainingPages === 0) return { remainingPages: 0, daysLeft: 0, suggestedPagesPerDay: 0 }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const target = new Date(targetDate + 'T00:00:00')

    const diffTime = target.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays <= 0) {
      return {
        remainingPages,
        daysLeft: 0,
        suggestedPagesPerDay: remainingPages,
        isPast: true,
      }
    }

    const suggested = Math.ceil(remainingPages / diffDays)
    return {
      remainingPages,
      daysLeft: diffDays,
      suggestedPagesPerDay: suggested,
      isPast: false,
    }
  }, [targetDate, totalPages, currentPage])

  const handleApplySuggested = () => {
    if (targetDateCalculation && targetDateCalculation.suggestedPagesPerDay > 0) {
      const val = targetDateCalculation.suggestedPagesPerDay
      setDailyPages(String(val))
      notifyChange({ dailyPages: val })
    }
  }

  return (
    <div className="space-y-4 pt-1">
      <div className="p-3.5 rounded-xl bg-muted/40 border border-border/80 space-y-1">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <Target className="w-3.5 h-3.5 text-[#34BEAA]" />
          Metas de leitura deste livro
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Todos os campos são opcionais. Se nenhuma meta for definida, o livro funciona normalmente
          apenas com registro de leitura, sem cobrança.
        </p>
      </div>

      {/* 1. DATA-ALVO E SUGESTÃO INTELIGENTE */}
      <div className="space-y-2 p-3.5 rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-[#34BEAA]" /> Data-alvo para terminar o livro
          </label>
          <span className="text-[10px] text-muted-foreground uppercase font-medium">Opcional</span>
        </div>
        <Input
          type="date"
          value={targetDate}
          onChange={(e) => {
            const val = e.target.value
            setTargetDate(val)
            notifyChange({ targetDate: val || undefined })
          }}
          className="h-10 rounded-xl bg-background border-border text-xs"
        />

        {/* Banner de cálculo sugerido */}
        {targetDateCalculation && (
          <div className="mt-2.5 p-3 rounded-xl bg-[#34BEAA]/10 border border-[#34BEAA]/20 space-y-2 text-xs">
            {targetDateCalculation.isPast ? (
              <p className="text-[11px] text-destructive">
                A data informada é hoje ou já passou. Restam {targetDateCalculation.remainingPages}{' '}
                páginas.
              </p>
            ) : (
              <>
                <div className="flex items-center justify-between text-[11px] text-foreground">
                  <span>
                    Faltam <strong>{targetDateCalculation.remainingPages} páginas</strong> em{' '}
                    <strong>{targetDateCalculation.daysLeft} dias</strong>
                  </span>
                  <span className="font-bold text-[#34BEAA] text-xs">
                    ~{targetDateCalculation.suggestedPagesPerDay} pág./dia
                  </span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleApplySuggested}
                  className="w-full h-8 text-[11px] rounded-lg border-[#34BEAA]/40 hover:bg-[#34BEAA]/15 text-[#34BEAA] font-semibold gap-1.5"
                >
                  <Sparkles className="w-3 h-3" /> Usar {targetDateCalculation.suggestedPagesPerDay}{' '}
                  páginas como meta diária
                </Button>
              </>
            )}
          </div>
        )}

        {targetDate && (!totalPages || totalPages <= 0) && (
          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            <HelpCircle className="w-3 h-3" /> Preencha o total de páginas acima para calcular a
            sugestão diária.
          </p>
        )}
      </div>

      {/* 2. META DIÁRIA (PÁGINAS E/OU MINUTOS) */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-foreground">Meta Diária (opcional)</label>
        <div className="grid grid-cols-2 gap-2.5">
          <div className="relative">
            <BookOpen className="w-3.5 h-3.5 absolute left-3 top-3 text-muted-foreground" />
            <Input
              type="number"
              min={1}
              placeholder="Ex.: 15 pág."
              value={dailyPages}
              onChange={(e) => {
                const val = e.target.value
                setDailyPages(val)
                notifyChange({ dailyPages: val ? parseInt(val) : undefined })
              }}
              className="pl-8 h-10 rounded-xl bg-background border-border text-xs"
            />
          </div>
          <div className="relative">
            <Clock className="w-3.5 h-3.5 absolute left-3 top-3 text-muted-foreground" />
            <Input
              type="number"
              min={1}
              placeholder="Ex.: 20 min"
              value={dailyMinutes}
              onChange={(e) => {
                const val = e.target.value
                setDailyMinutes(val)
                notifyChange({ dailyMinutes: val ? parseInt(val) : undefined })
              }}
              className="pl-8 h-10 rounded-xl bg-background border-border text-xs"
            />
          </div>
        </div>
      </div>

      {/* 3. META SEMANAL (PÁGINAS OU MINUTOS) */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-foreground">Meta Semanal (opcional)</label>
        <div className="grid grid-cols-2 gap-2.5">
          <div className="relative">
            <BookOpen className="w-3.5 h-3.5 absolute left-3 top-3 text-muted-foreground" />
            <Input
              type="number"
              min={1}
              placeholder="Ex.: 80 pág./sem"
              value={weeklyPages}
              onChange={(e) => {
                const val = e.target.value
                setWeeklyPages(val)
                notifyChange({ weeklyPages: val ? parseInt(val) : undefined })
              }}
              className="pl-8 h-10 rounded-xl bg-background border-border text-xs"
            />
          </div>
          <div className="relative">
            <Clock className="w-3.5 h-3.5 absolute left-3 top-3 text-muted-foreground" />
            <Input
              type="number"
              min={1}
              placeholder="Ex.: 120 min/sem"
              value={weeklyMinutes}
              onChange={(e) => {
                const val = e.target.value
                setWeeklyMinutes(val)
                notifyChange({ weeklyMinutes: val ? parseInt(val) : undefined })
              }}
              className="pl-8 h-10 rounded-xl bg-background border-border text-xs"
            />
          </div>
        </div>
      </div>

      {/* 4. META MENSAL (PÁGINAS OU MINUTOS) */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-foreground">Meta Mensal (opcional)</label>
        <div className="grid grid-cols-2 gap-2.5">
          <div className="relative">
            <BookOpen className="w-3.5 h-3.5 absolute left-3 top-3 text-muted-foreground" />
            <Input
              type="number"
              min={1}
              placeholder="Ex.: 300 pág./mês"
              value={monthlyPages}
              onChange={(e) => {
                const val = e.target.value
                setMonthlyPages(val)
                notifyChange({ monthlyPages: val ? parseInt(val) : undefined })
              }}
              className="pl-8 h-10 rounded-xl bg-background border-border text-xs"
            />
          </div>
          <div className="relative">
            <Clock className="w-3.5 h-3.5 absolute left-3 top-3 text-muted-foreground" />
            <Input
              type="number"
              min={1}
              placeholder="Ex.: 450 min/mês"
              value={monthlyMinutes}
              onChange={(e) => {
                const val = e.target.value
                setMonthlyMinutes(val)
                notifyChange({ monthlyMinutes: val ? parseInt(val) : undefined })
              }}
              className="pl-8 h-10 rounded-xl bg-background border-border text-xs"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

interface EditBookGoalModalProps {
  open: boolean
  onClose: () => void
  bookTitle: string
  totalPages?: number
  currentPage?: number
  currentGoal?: LivroMeta
  onSave: (meta?: LivroMeta) => Promise<void>
}

export const EditBookGoalModal: React.FC<EditBookGoalModalProps> = ({
  open,
  onClose,
  bookTitle,
  totalPages,
  currentPage,
  currentGoal,
  onSave,
}) => {
  const [goal, setGoal] = useState<LivroMeta>(currentGoal || {})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setGoal(currentGoal || {})
  }, [currentGoal, open])

  const handleSave = async () => {
    setSubmitting(true)
    try {
      // Limpa chaves indefinidas / vazias
      const cleaned: LivroMeta = {}
      if (goal.dailyPages && goal.dailyPages > 0) cleaned.dailyPages = goal.dailyPages
      if (goal.dailyMinutes && goal.dailyMinutes > 0) cleaned.dailyMinutes = goal.dailyMinutes
      if (goal.weeklyPages && goal.weeklyPages > 0) cleaned.weeklyPages = goal.weeklyPages
      if (goal.weeklyMinutes && goal.weeklyMinutes > 0) cleaned.weeklyMinutes = goal.weeklyMinutes
      if (goal.monthlyPages && goal.monthlyPages > 0) cleaned.monthlyPages = goal.monthlyPages
      if (goal.monthlyMinutes && goal.monthlyMinutes > 0)
        cleaned.monthlyMinutes = goal.monthlyMinutes
      if (goal.targetDate) cleaned.targetDate = goal.targetDate

      const hasAny = Object.keys(cleaned).length > 0
      await onSave(hasAny ? cleaned : undefined)
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  const handleClear = async () => {
    setSubmitting(true)
    try {
      await onSave(undefined)
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-lg bg-card rounded-2xl p-6 border border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-left space-y-1">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Target className="w-5 h-5 text-[#34BEAA]" />
            Editar Meta do Livro
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground line-clamp-1">
            {bookTitle}
          </DialogDescription>
        </DialogHeader>

        <GoalEditorFields
          goal={goal}
          totalPages={totalPages}
          currentPage={currentPage}
          onChange={setGoal}
        />

        <div className="flex gap-2.5 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleClear}
            className="h-11 rounded-xl text-xs text-destructive hover:bg-destructive/10"
          >
            Remover Metas
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1 h-11 rounded-xl text-xs font-semibold"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={submitting}
            onClick={handleSave}
            className="flex-1 h-11 rounded-xl text-xs font-semibold bg-[#34BEAA] hover:bg-[#34BEAA]/90 text-white shadow-sm"
          >
            {submitting ? 'Salvando...' : 'Salvar Metas'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
