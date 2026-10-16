import React, { useState, useEffect } from 'react'
import { Project, ProjectStatus, Experience } from '@/lib/types'
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
import { X, Plus } from 'lucide-react'

interface ProjectFormModalProps {
  open: boolean
  onClose: () => void
  onSave: (data: {
    id?: string
    name: string
    description: string
    objective?: string
    status: ProjectStatus
    startDate?: string
    endDate?: string
    tags: string[]
    experienceId?: string
  }) => Promise<void>
  editingProject?: Project | null
  experiences: Experience[]
}

export const ProjectFormModal: React.FC<ProjectFormModalProps> = ({
  open,
  onClose,
  onSave,
  editingProject,
  experiences,
}) => {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [objective, setObjective] = useState('')
  const [status, setStatus] = useState<ProjectStatus>('em_andamento')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [experienceId, setExperienceId] = useState<string>('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (editingProject) {
      setName(editingProject.name)
      setDescription(editingProject.description)
      setObjective(editingProject.objective || '')
      setStatus(editingProject.status)
      setStartDate(editingProject.startDate || '')
      setEndDate(editingProject.endDate || '')
      setExperienceId(editingProject.experienceId || '')
      setTags(editingProject.tags || [])
    } else {
      setName('')
      setDescription('')
      setObjective('')
      setStatus('em_andamento')
      setStartDate(new Date().toISOString().split('T')[0])
      setEndDate('')
      setExperienceId('')
      setTags([])
    }
    setTagInput('')
  }, [editingProject, open])

  const handleAddTag = () => {
    const trimmed = tagInput.trim().replace(/^#/, '')
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed])
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !description.trim()) return

    setSaving(true)
    try {
      await onSave({
        id: editingProject?.id,
        name: name.trim(),
        description: description.trim(),
        objective: objective.trim() || undefined,
        status,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        tags,
        experienceId: experienceId || undefined,
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
          <DialogTitle className="text-lg font-bold text-foreground">
            {editingProject ? 'Editar Projeto' : 'Novo Projeto'}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Acompanhe o ciclo de vida, entregas e objetivos estratégicos de seus projetos.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* NOME */}
          <div className="space-y-1.5">
            <Label htmlFor="proj-name" className="text-xs font-semibold">
              Nome do Projeto *
            </Label>
            <Input
              id="proj-name"
              placeholder="Ex.: Redesenho da Plataforma Web"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-xl text-xs sm:text-sm bg-background border-border h-10"
              required
            />
          </div>

          {/* STATUS */}
          <div className="space-y-1.5">
            <Label htmlFor="proj-status" className="text-xs font-semibold">
              Status *
            </Label>
            <select
              id="proj-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as ProjectStatus)}
              className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs sm:text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-[#0284C7]"
            >
              <option value="planejado">Planejado</option>
              <option value="em_andamento">Em andamento</option>
              <option value="concluido">Concluído</option>
              <option value="pausado">Pausado</option>
            </select>
          </div>

          {/* DESCRIÇÃO CURTA */}
          <div className="space-y-1.5">
            <Label htmlFor="proj-desc" className="text-xs font-semibold">
              Descrição Curta *
            </Label>
            <Textarea
              id="proj-desc"
              rows={3}
              placeholder="Descreva em poucas linhas o escopo do projeto..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="rounded-xl text-xs sm:text-sm bg-background border-border"
              required
            />
          </div>

          {/* OBJETIVO */}
          <div className="space-y-1.5">
            <Label htmlFor="proj-obj" className="text-xs font-semibold">
              Objetivo Estratégico (opcional)
            </Label>
            <Input
              id="proj-obj"
              placeholder="Ex.: Reduzir o tempo de checkout em 20%"
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              className="rounded-xl text-xs sm:text-sm bg-background border-border h-10"
            />
          </div>

          {/* PERÍODO: DATAS */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="proj-start" className="text-xs font-semibold">
                Data de Início
              </Label>
              <Input
                id="proj-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-xl text-xs bg-background border-border h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="proj-end" className="text-xs font-semibold">
                Previsão / Fim
              </Label>
              <Input
                id="proj-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-xl text-xs bg-background border-border h-10"
              />
            </div>
          </div>

          {/* VÍNCULO COM EXPERIÊNCIA */}
          {experiences.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="proj-exp" className="text-xs font-semibold">
                Experiência Vinculada (opcional)
              </Label>
              <select
                id="proj-exp"
                value={experienceId}
                onChange={(e) => setExperienceId(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs sm:text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-[#0284C7]"
              >
                <option value="">Nenhuma / Autônomo</option>
                {experiences.map((exp) => (
                  <option key={exp.id} value={exp.id}>
                    {exp.role} — {exp.company}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* TAGS / COMPETÊNCIAS */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Competências e Tecnologias (Tags)</Label>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Ex.: React, Scrum, Gestão..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddTag()
                  }
                }}
                className="rounded-xl text-xs bg-background border-border h-9"
              />
              <Button
                type="button"
                onClick={handleAddTag}
                className="min-h-[44px] h-9 px-3 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Tag
              </Button>
            </div>

            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1.5">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-[#0284C7]/10 text-[#0284C7] text-xs font-semibold"
                  >
                    #{t}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(t)}
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
              disabled={saving || !name.trim() || !description.trim()}
              className="min-h-[44px] h-10 rounded-xl text-xs px-5 bg-[#0284C7] hover:bg-[#0284C7]/90 text-white font-semibold"
            >
              {saving ? 'Salvando...' : editingProject ? 'Salvar Alterações' : 'Cadastrar Projeto'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
