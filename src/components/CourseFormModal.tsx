import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Course, CourseType, CourseStatus } from '@/lib/types'
import { getTodayDateKey } from '@/lib/dateUtils'
import {
  GraduationCap,
  Award,
  BookOpen,
  Laptop,
  Sparkles,
  Link as LinkIcon,
  Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface CourseFormModalProps {
  open: boolean
  onClose: () => void
  editingCourse: Course | null
  onSave: (course: {
    id?: string
    name: string
    type: CourseType
    institution: string
    status: CourseStatus
    progress?: number
    workloadHours?: number
    startDate: string
    endDate?: string
    courseUrl?: string
    color?: string
    icon?: string
  }) => Promise<void>
}

const COLOR_PRESETS = [
  '#8B5CF6', // Roxo (Padrão Estudos)
  '#06B6D4', // Ciano
  '#F59E0B', // Âmbar
  '#10B981', // Esmeralda
  '#EC4899', // Rosa
  '#3B82F6', // Azul
]

export const CourseFormModal: React.FC<CourseFormModalProps> = ({
  open,
  onClose,
  editingCourse,
  onSave,
}) => {
  const [name, setName] = useState('')
  const [type, setType] = useState<CourseType>('curso')
  const [institution, setInstitution] = useState('')
  const [status, setStatus] = useState<CourseStatus>('em_andamento')
  const [progress, setProgress] = useState<string>('0')
  const [workloadHours, setWorkloadHours] = useState<string>('')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [courseUrl, setCourseUrl] = useState<string>('')
  const [color, setColor] = useState<string>('#8B5CF6')
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (editingCourse) {
      setName(editingCourse.name)
      setType(editingCourse.type)
      setInstitution(editingCourse.institution)
      setStatus(editingCourse.status)
      setProgress(editingCourse.progress !== undefined ? String(editingCourse.progress) : '')
      setWorkloadHours(editingCourse.workloadHours ? String(editingCourse.workloadHours) : '')
      setStartDate(editingCourse.startDate || '')
      setEndDate(editingCourse.endDate || '')
      setCourseUrl(editingCourse.courseUrl || '')
      setColor(editingCourse.color || '#8B5CF6')
    } else {
      setName('')
      setType('curso')
      setInstitution('')
      setStatus('em_andamento')
      setProgress('0')
      setWorkloadHours('')
      setStartDate(getTodayDateKey())
      setEndDate('')
      setCourseUrl('')
      setColor('#8B5CF6')
    }
    setErrors({})
  }, [editingCourse, open])

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!name.trim()) errs.name = 'Nome é obrigatório'
    if (!institution.trim()) errs.institution = 'Instituição ou plataforma é obrigatória'
    if (!startDate) errs.startDate = 'Data de início é obrigatória'
    if (progress && (Number(progress) < 0 || Number(progress) > 100)) {
      errs.progress = 'Progresso deve ser entre 0 e 100%'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setSaving(true)
    try {
      await onSave({
        id: editingCourse?.id,
        name: name.trim(),
        type,
        institution: institution.trim(),
        status,
        progress: progress !== '' ? Math.max(0, Math.min(100, Number(progress))) : undefined,
        workloadHours: workloadHours ? Number(workloadHours) : undefined,
        startDate,
        endDate: endDate ? endDate : undefined,
        courseUrl: courseUrl.trim() ? courseUrl.trim() : undefined,
        color,
        icon:
          type === 'faculdade' ? 'GraduationCap' : type === 'certificacao' ? 'Award' : 'BookOpen',
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto bg-card rounded-2xl p-5 sm:p-6 border border-border">
        <DialogHeader className="text-left space-y-1">
          <div className="flex items-center gap-2 text-[#8B5CF6]">
            <GraduationCap className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">
              {editingCourse ? 'Editar Curso' : 'Novo Curso'}
            </span>
          </div>
          <DialogTitle className="text-lg font-bold">
            {editingCourse ? 'Atualizar informações' : 'Cadastrar na sua rotina'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Nome */}
          <div className="space-y-1.5">
            <Label htmlFor="course-name" className="text-xs font-semibold">
              Nome do curso / matéria *
            </Label>
            <Input
              id="course-name"
              placeholder="Ex.: Engenharia de Software, React Pro, AWS Solutions..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={cn(
                'rounded-xl text-xs sm:text-sm bg-background',
                errors.name && 'border-destructive',
              )}
              autoFocus
            />
            {errors.name && <p className="text-[11px] text-destructive">{errors.name}</p>}
          </div>

          {/* Tipo de estudo */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Tipo *</Label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'faculdade', label: 'Faculdade', icon: GraduationCap },
                { key: 'curso', label: 'Curso', icon: BookOpen },
                { key: 'certificacao', label: 'Certificação', icon: Award },
              ].map((t) => {
                const Icon = t.icon
                const isSelected = type === t.key
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setType(t.key as CourseType)}
                    className={cn(
                      'flex flex-col items-center justify-center gap-1 p-2.5 rounded-xl border text-xs font-medium min-h-[48px] transition-all',
                      isSelected
                        ? 'border-[#8B5CF6] bg-[#8B5CF6]/15 text-[#8B5CF6] font-bold shadow-xs'
                        : 'border-border bg-background text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{t.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Instituição / Plataforma */}
          <div className="space-y-1.5">
            <Label htmlFor="course-inst" className="text-xs font-semibold">
              Instituição / Plataforma *
            </Label>
            <Input
              id="course-inst"
              placeholder="Ex.: USP, FIAP, Alura, Udemy, Coursera, AWS..."
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              className={cn(
                'rounded-xl text-xs sm:text-sm bg-background',
                errors.institution && 'border-destructive',
              )}
            />
            {errors.institution && (
              <p className="text-[11px] text-destructive">{errors.institution}</p>
            )}
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Status *</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {[
                { key: 'em_andamento', label: 'Em andamento' },
                { key: 'concluido', label: 'Concluído' },
                { key: 'pausado', label: 'Pausado' },
                { key: 'quero_fazer', label: 'Quero fazer' },
              ].map((s) => {
                const isSelected = status === s.key
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setStatus(s.key as CourseStatus)}
                    className={cn(
                      'px-2 py-2 rounded-xl border text-[11px] font-medium min-h-[40px] transition-all text-center',
                      isSelected
                        ? 'border-[#8B5CF6] bg-[#8B5CF6]/15 text-[#8B5CF6] font-bold'
                        : 'border-border bg-background text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {s.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Progresso % e Carga Horária */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="course-prog" className="text-xs font-semibold">
                Progresso atual (%)
              </Label>
              <Input
                id="course-prog"
                type="number"
                min="0"
                max="100"
                placeholder="Ex.: 45"
                value={progress}
                onChange={(e) => setProgress(e.target.value)}
                className="rounded-xl text-xs sm:text-sm bg-background"
              />
              {errors.progress && <p className="text-[11px] text-destructive">{errors.progress}</p>}
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="course-workload"
                className="text-xs font-semibold flex items-center gap-1"
              >
                <Clock className="w-3.5 h-3.5 text-muted-foreground" /> Carga horária (h)
              </Label>
              <Input
                id="course-workload"
                type="number"
                min="0"
                placeholder="Ex.: 60"
                value={workloadHours}
                onChange={(e) => setWorkloadHours(e.target.value)}
                className="rounded-xl text-xs sm:text-sm bg-background"
              />
            </div>
          </div>

          {/* Datas de Início e Término */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="course-start" className="text-xs font-semibold">
                Data de Início *
              </Label>
              <Input
                id="course-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={cn(
                  'rounded-xl text-xs bg-background',
                  errors.startDate && 'border-destructive',
                )}
              />
              {errors.startDate && (
                <p className="text-[11px] text-destructive">{errors.startDate}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="course-end" className="text-xs font-semibold">
                Previsão de Término
              </Label>
              <Input
                id="course-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-xl text-xs bg-background"
              />
            </div>
          </div>

          {/* Link do curso */}
          <div className="space-y-1.5">
            <Label htmlFor="course-link" className="text-xs font-semibold flex items-center gap-1">
              <LinkIcon className="w-3.5 h-3.5 text-muted-foreground" /> Link / Portal do Curso
            </Label>
            <Input
              id="course-link"
              type="url"
              placeholder="https://exemplo.com/curso"
              value={courseUrl}
              onChange={(e) => setCourseUrl(e.target.value)}
              className="rounded-xl text-xs sm:text-sm bg-background"
            />
          </div>

          {/* Cor de destaque */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Cor de Identificação</Label>
            <div className="flex items-center gap-2">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    'w-7 h-7 rounded-full transition-transform active:scale-95 border-2',
                    color === c
                      ? 'border-foreground scale-110 shadow-sm'
                      : 'border-transparent opacity-80 hover:opacity-100',
                  )}
                  style={{ backgroundColor: c }}
                  aria-label={`Selecionar cor ${c}`}
                />
              ))}
            </div>
          </div>

          <DialogFooter className="pt-2 flex flex-row gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving}
              className="h-10 rounded-xl text-xs px-4"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="h-10 rounded-xl text-xs px-5 bg-[#8B5CF6] hover:bg-[#8B5CF6]/90 text-white font-semibold"
            >
              {saving ? 'Salvando...' : editingCourse ? 'Salvar Alterações' : 'Cadastrar Curso'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
