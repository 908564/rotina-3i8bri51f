import React, { useState, useEffect } from 'react'
import { Experience } from '@/lib/types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { X, Plus, Briefcase } from 'lucide-react'
import { getLocalMonthKey } from '@/lib/dateUtils'

interface ExperienceFormModalProps {
  open: boolean
  onClose: () => void
  onSave: (data: {
    id?: string
    role: string
    company: string
    startDate: string
    endDate?: string
    isCurrent: boolean
    description: string
    skills: string[]
  }) => Promise<void>
  editingExperience?: Experience | null
}

export const ExperienceFormModal: React.FC<ExperienceFormModalProps> = ({
  open,
  onClose,
  onSave,
  editingExperience,
}) => {
  const [role, setRole] = useState('')
  const [company, setCompany] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [isCurrent, setIsCurrent] = useState(false)
  const [description, setDescription] = useState('')
  const [skills, setSkills] = useState<string[]>([])
  const [skillInput, setSkillInput] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (editingExperience) {
      setRole(editingExperience.role)
      setCompany(editingExperience.company)
      setStartDate(editingExperience.startDate)
      setEndDate(editingExperience.endDate || '')
      setIsCurrent(editingExperience.isCurrent)
      setDescription(editingExperience.description)
      setSkills(editingExperience.skills || [])
    } else {
      setRole('')
      setCompany('')
      setStartDate(getLocalMonthKey()) // YYYY-MM no fuso local
      setEndDate('')
      setIsCurrent(true)
      setDescription('')
      setSkills([])
    }
    setSkillInput('')
  }, [editingExperience, open])

  const handleAddSkill = () => {
    const trimmed = skillInput.trim().replace(/^#/, '')
    if (trimmed && !skills.includes(trimmed)) {
      setSkills([...skills, trimmed])
      setSkillInput('')
    }
  }

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter((s) => s !== skillToRemove))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!role.trim() || !company.trim() || !startDate) return

    setSaving(true)
    try {
      await onSave({
        id: editingExperience?.id,
        role: role.trim(),
        company: company.trim(),
        startDate,
        endDate: isCurrent ? undefined : endDate || undefined,
        isCurrent,
        description: description.trim(),
        skills,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg bg-card rounded-2xl p-5 sm:p-6 border border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-left space-y-1">
          <div className="flex items-center gap-1.5 text-[#0284C7]">
            <Briefcase className="w-4 h-4" />
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Trajetória Profissional
            </span>
          </div>
          <DialogTitle className="text-lg font-bold text-foreground">
            {editingExperience ? 'Editar Experiência' : 'Adicionar Experiência'}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Mantenha seu histórico de carreira atualizado para vincular conquistas e projetos.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* CARGO */}
          <div className="space-y-1.5">
            <Label htmlFor="exp-role" className="text-xs font-semibold">
              Cargo / Função *
            </Label>
            <Input
              id="exp-role"
              placeholder="Ex.: Desenvolvedor Frontend Sênior"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="rounded-xl text-xs sm:text-sm bg-background border-border h-10"
              required
            />
          </div>

          {/* EMPRESA */}
          <div className="space-y-1.5">
            <Label htmlFor="exp-company" className="text-xs font-semibold">
              Empresa / Organização *
            </Label>
            <Input
              id="exp-company"
              placeholder="Ex.: TechFlow Soluções Digitais"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="rounded-xl text-xs sm:text-sm bg-background border-border h-10"
              required
            />
          </div>

          {/* ATUALMENTE NESTA POSIÇÃO? */}
          <div className="flex items-center space-x-2 pt-1 pb-1">
            <Checkbox
              id="exp-current"
              checked={isCurrent}
              onCheckedChange={(c) => setIsCurrent(Boolean(c))}
            />
            <Label htmlFor="exp-current" className="text-xs font-semibold cursor-pointer">
              Trabalho nesta posição atualmente
            </Label>
          </div>

          {/* PERÍODO (ANO-MÊS) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="exp-start" className="text-xs font-semibold">
                Mês de Início *
              </Label>
              <Input
                id="exp-start"
                type="month"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-xl text-xs bg-background border-border h-10"
                required
              />
            </div>

            {!isCurrent && (
              <div className="space-y-1.5">
                <Label htmlFor="exp-end" className="text-xs font-semibold">
                  Mês de Término
                </Label>
                <Input
                  id="exp-end"
                  type="month"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="rounded-xl text-xs bg-background border-border h-10"
                />
              </div>
            )}
          </div>

          {/* DESCRIÇÃO DE ATIVIDADES */}
          <div className="space-y-1.5">
            <Label htmlFor="exp-desc" className="text-xs font-semibold">
              Descrição das Responsabilidades e Contexto
            </Label>
            <Textarea
              id="exp-desc"
              rows={3}
              placeholder="Descreva suas principais atribuições, liderança de squads, tecnologias adotadas..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="rounded-xl text-xs sm:text-sm bg-background border-border"
            />
          </div>

          {/* COMPETÊNCIAS / SKILLS */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Competências e Tecnologias Utilizadas</Label>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Ex.: React, TypeScript, Gestão de Squad..."
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddSkill()
                  }
                }}
                className="rounded-xl text-xs bg-background border-border h-9"
              />
              <Button
                type="button"
                onClick={handleAddSkill}
                className="min-h-[44px] h-9 px-3 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Skill
              </Button>
            </div>

            {skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1.5">
                {skills.map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-[#0284C7]/10 text-[#0284C7] text-xs font-semibold"
                  >
                    #{s}
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(s)}
                      className="hover:text-destructive focus:outline-none"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* BOTÕES */}
          <div className="pt-2 flex justify-end gap-2 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving}
              className="min-h-[44px] h-10 rounded-xl text-xs px-4"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saving || !role.trim() || !company.trim() || !startDate}
              className="min-h-[44px] h-10 rounded-xl text-xs px-5 bg-[#0284C7] hover:bg-[#0284C7]/90 text-white font-semibold"
            >
              {saving
                ? 'Salvando...'
                : editingExperience
                  ? 'Salvar Alterações'
                  : 'Adicionar Experiência'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
