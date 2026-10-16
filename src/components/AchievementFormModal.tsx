import React, { useState, useEffect } from 'react'
import { Achievement, Project, Experience } from '@/lib/types'
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
import { X, Plus, Sparkles } from 'lucide-react'

interface AchievementFormModalProps {
  open: boolean
  onClose: () => void
  onSave: (data: {
    id?: string
    title: string
    description: string
    date: string
    impact: string
    projectId?: string
    experienceId?: string
    tags: string[]
  }) => Promise<void>
  editingAchievement?: Achievement | null
  projects: Project[]
  experiences: Experience[]
}

export const AchievementFormModal: React.FC<AchievementFormModalProps> = ({
  open,
  onClose,
  onSave,
  editingAchievement,
  projects,
  experiences,
}) => {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState('')
  const [impact, setImpact] = useState('')
  const [projectId, setProjectId] = useState('')
  const [experienceId, setExperienceId] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (editingAchievement) {
      setTitle(editingAchievement.title)
      setDescription(editingAchievement.description)
      setDate(editingAchievement.date)
      setImpact(editingAchievement.impact)
      setProjectId(editingAchievement.projectId || '')
      setExperienceId(editingAchievement.experienceId || '')
      setTags(editingAchievement.tags || [])
    } else {
      setTitle('')
      setDescription('')
      setDate(new Date().toISOString().split('T')[0])
      setImpact('')
      setProjectId('')
      setExperienceId('')
      setTags([])
    }
    setTagInput('')
  }, [editingAchievement, open])

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
    if (!title.trim() || !impact.trim()) return

    setSaving(true)
    try {
      await onSave({
        id: editingAchievement?.id,
        title: title.trim(),
        description: description.trim(),
        date,
        impact: impact.trim(),
        projectId: projectId || undefined,
        experienceId: experienceId || undefined,
        tags,
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
            <Sparkles className="w-4 h-4" />
            <span className="text-[11px] font-bold uppercase tracking-wider">
              LinkedIn & Currículo
            </span>
          </div>
          <DialogTitle className="text-lg font-bold text-foreground">
            {editingAchievement ? 'Editar Conquista' : 'Registrar Conquista'}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Destaque realizações de impacto com métricas reais prontas para compartilhar.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* TÍTULO */}
          <div className="space-y-1.5">
            <Label htmlFor="ach-title" className="text-xs font-semibold">
              Título da Conquista *
            </Label>
            <Input
              id="ach-title"
              placeholder="Ex.: Redução do tempo de deploy em 30%"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded-xl text-xs sm:text-sm bg-background border-border h-10"
              required
            />
          </div>

          {/* IMPACTO / RESULTADO */}
          <div className="space-y-1.5">
            <Label
              htmlFor="ach-impact"
              className="text-xs font-semibold flex items-center justify-between"
            >
              <span>Resultado / Impacto alcançado *</span>
              <span className="text-[10px] text-muted-foreground font-normal">
                Verbo de ação + métrica
              </span>
            </Label>
            <Textarea
              id="ach-impact"
              rows={2}
              placeholder="Ex.: reduziu o tempo de implantação em 30% e zerou incidentes de release durante 6 meses"
              value={impact}
              onChange={(e) => setImpact(e.target.value)}
              className="rounded-xl text-xs sm:text-sm bg-background border-border"
              required
            />
          </div>

          {/* DESCRIÇÃO / CONTEXTO */}
          <div className="space-y-1.5">
            <Label htmlFor="ach-desc" className="text-xs font-semibold">
              Contexto / Como você fez
            </Label>
            <Textarea
              id="ach-desc"
              rows={3}
              placeholder="Descreva brevemente a estratégia ou tecnologia adotada..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="rounded-xl text-xs sm:text-sm bg-background border-border"
            />
          </div>

          {/* DATA */}
          <div className="space-y-1.5">
            <Label htmlFor="ach-date" className="text-xs font-semibold">
              Data da Conquista *
            </Label>
            <Input
              id="ach-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-xl text-xs bg-background border-border h-10"
              required
            />
          </div>

          {/* PROJETO RELACIONADO (OPCIONAL) */}
          <div className="space-y-1.5">
            <Label htmlFor="ach-proj" className="text-xs font-semibold">
              Projeto Relacionado (opcional)
            </Label>
            <select
              id="ach-proj"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs sm:text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-[#0284C7]"
            >
              <option value="">Nenhum</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* EXPERIÊNCIA PROFISSIONAL RELACIONADA (OPCIONAL) */}
          <div className="space-y-1.5">
            <Label htmlFor="ach-exp" className="text-xs font-semibold">
              Experiência / Empresa (opcional)
            </Label>
            <select
              id="ach-exp"
              value={experienceId}
              onChange={(e) => setExperienceId(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs sm:text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-[#0284C7]"
            >
              <option value="">Nenhuma / Outra</option>
              {experiences.map((exp) => (
                <option key={exp.id} value={exp.id}>
                  {exp.role} — {exp.company}
                </option>
              ))}
            </select>
          </div>

          {/* COMPETÊNCIAS / TAGS */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Competências e Palavras-chave</Label>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Ex.: CI/CD, React, Liderança..."
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
              disabled={saving || !title.trim() || !impact.trim()}
              className="min-h-[44px] h-10 rounded-xl text-xs px-5 bg-[#0284C7] hover:bg-[#0284C7]/90 text-white font-semibold"
            >
              {saving
                ? 'Salvando...'
                : editingAchievement
                  ? 'Salvar Alterações'
                  : 'Registrar Conquista'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
