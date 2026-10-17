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
import { Label } from '@/components/ui/label'
import { estudosRepository } from '@/lib/repositories/estudosRepository'
import { Course, CourseGoalProgress } from '@/lib/types'
import { getTodayDateKey } from '@/lib/dateUtils'
import { GraduationCap } from 'lucide-react'

interface QuickStudySheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (message: string) => void
  preferredCourseId?: string
}

export const QuickStudySheet: React.FC<QuickStudySheetProps> = ({
  open,
  onOpenChange,
  onSuccess,
  preferredCourseId,
}) => {
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState<string>('')
  const [minutes, setMinutes] = useState<string>('30')
  const [goalProgress, setGoalProgress] = useState<CourseGoalProgress | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      estudosRepository.getCourses().then((list) => {
        const emAndamento = list.filter((c) => c.status === 'em_andamento')
        const pool = emAndamento.length > 0 ? emAndamento : list
        setCourses(pool)

        let initialId = ''
        if (preferredCourseId && pool.some((c) => c.id === preferredCourseId)) {
          initialId = preferredCourseId
        } else if (pool.length > 0) {
          initialId = pool[0].id
        }
        setSelectedCourseId(initialId)
      })
    }
  }, [open, preferredCourseId])

  useEffect(() => {
    if (selectedCourseId) {
      estudosRepository.getCourseGoalProgress(selectedCourseId).then((prog) => {
        setGoalProgress(prog)
      })
    } else {
      setGoalProgress(null)
    }
  }, [selectedCourseId])

  const handleAdd = (delta: number) => {
    const cur = parseInt(minutes, 10) || 0
    setMinutes(String(Math.max(1, cur + delta)))
  }

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault()
    const val = parseInt(minutes, 10)
    if (!val || val <= 0 || !selectedCourseId) return

    setSaving(true)
    try {
      const today = getTodayDateKey()
      await estudosRepository.saveSession({
        courseId: selectedCourseId,
        date: today,
        minutes: val,
      })
      onSuccess(`+${val} min de estudo`)
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  const selectedCourse = courses.find((c) => c.id === selectedCourseId)
  const hasDailyGoal = Boolean(goalProgress?.hasDailyGoal && goalProgress.dailyMinutesTarget)
  const todayMins = goalProgress?.todayMinutes || 0
  const dailyTarget = goalProgress?.dailyMinutesTarget || 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fixed bottom-0 top-auto translate-y-0 sm:max-w-md w-full bg-card rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 border border-border pb-8 sm:pb-6">
        <DialogHeader className="text-left space-y-1">
          <div className="flex items-center gap-2 text-[#6A4BB0]">
            <GraduationCap className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Estudo Rápido</span>
          </div>
          <DialogTitle className="text-lg font-bold">Registrar Sessão de Estudo</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Adicione os minutos dedicados hoje ao seu curso.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleConfirm} className="space-y-4 pt-2">
          {courses.length > 1 && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Curso</Label>
              <select
                aria-label="Selecionar curso"
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-border bg-background text-xs sm:text-sm font-medium focus:ring-2 focus:ring-[#8F6FD0] focus:outline-none"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.institution})
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedCourse && courses.length === 1 && (
            <p className="text-xs font-semibold text-foreground">
              Curso: <span className="text-[#6A4BB0]">{selectedCourse.name}</span>
            </p>
          )}

          {/* Progresso do dia dentro da folha quando houver meta diária */}
          {hasDailyGoal && (
            <div className="rounded-xl bg-[#E9E1F7]/50 dark:bg-[#8F6FD0]/10 border border-[#8F6FD0]/20 p-2.5 text-center text-xs font-semibold text-[#6A4BB0]">
              Progresso hoje: {todayMins} / {dailyTarget} min
            </div>
          )}

          {/* Campo Numérico Grande */}
          <div className="space-y-2 text-center pt-1">
            <Input
              type="number"
              min="1"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              className="h-16 text-3xl font-extrabold text-center rounded-2xl bg-background border-border"
              autoFocus
            />

            {/* Atalhos +15 / +30 / +60 */}
            <div className="flex gap-2 justify-center pt-1">
              {[15, 30, 60].map((delta) => (
                <button
                  key={delta}
                  type="button"
                  onClick={() => handleAdd(delta)}
                  className="px-4 py-2 rounded-xl border border-border bg-muted/40 hover:bg-muted text-xs font-bold text-foreground transition-all active:scale-95"
                >
                  +{delta} min
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              disabled={saving || !selectedCourseId || !minutes}
              className="w-full h-12 rounded-xl text-sm font-bold bg-[#8F6FD0] hover:bg-[#7D5DBD] text-white transition-all shadow-subtle active:scale-[0.99]"
            >
              {saving ? 'Registrando...' : 'Confirmar estudo'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
