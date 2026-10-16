import React, { useState, useEffect } from 'react'
import { WorkNote } from '@/lib/types'
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
import { X, Plus, FileText } from 'lucide-react'

interface WorkNoteFormModalProps {
  open: boolean
  onClose: () => void
  onSave: (data: {
    id?: string
    title: string
    date: string
    body: string
    tags: string[]
  }) => Promise<void>
  editingNote?: WorkNote | null
}

export const WorkNoteFormModal: React.FC<WorkNoteFormModalProps> = ({
  open,
  onClose,
  onSave,
  editingNote,
}) => {
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [body, setBody] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (editingNote) {
      setTitle(editingNote.title)
      setDate(editingNote.date)
      setBody(editingNote.body)
      setTags(editingNote.tags || [])
    } else {
      setTitle('')
      setDate(new Date().toISOString().split('T')[0])
      setBody('')
      setTags([])
    }
    setTagInput('')
  }, [editingNote, open])

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
    if (!title.trim() && !body.trim()) return

    setSaving(true)
    try {
      await onSave({
        id: editingNote?.id,
        title: title.trim() || 'Sem título',
        date,
        body: body.trim(),
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
            <FileText className="w-4 h-4" />
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Notas de Trabalho
            </span>
          </div>
          <DialogTitle className="text-lg font-bold text-foreground">
            {editingNote ? 'Editar Anotação' : 'Nova Anotação de Trabalho'}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Anote atas de reunião, rascunhos de propostas, checklists e ideias profissionais.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* TÍTULO */}
          <div className="space-y-1.5">
            <Label htmlFor="wn-title" className="text-xs font-semibold">
              Título da Nota
            </Label>
            <Input
              id="wn-title"
              placeholder="Ex.: Ata de Reunião com Stakeholders"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded-xl text-xs sm:text-sm bg-background border-border h-10"
              autoFocus
            />
          </div>

          {/* DATA */}
          <div className="space-y-1.5">
            <Label htmlFor="wn-date" className="text-xs font-semibold">
              Data da Nota *
            </Label>
            <Input
              id="wn-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-xl text-xs bg-background border-border h-10"
              required
            />
          </div>

          {/* CORPO DO TEXTO */}
          <div className="space-y-1.5">
            <Label htmlFor="wn-body" className="text-xs font-semibold">
              Conteúdo da Anotação *
            </Label>
            <Textarea
              id="wn-body"
              rows={6}
              placeholder="Escreva livremente os pontos discutidos, decisões, prazos e lembretes..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="rounded-xl text-xs sm:text-sm bg-background border-border leading-relaxed font-sans"
              required
            />
          </div>

          {/* TAGS */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Tags e Categorias</Label>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Ex.: Reunião, Ideias, 1:1..."
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
              disabled={saving || (!title.trim() && !body.trim())}
              className="min-h-[44px] h-10 rounded-xl text-xs px-5 bg-[#0284C7] hover:bg-[#0284C7]/90 text-white font-semibold"
            >
              {saving ? 'Salvando...' : editingNote ? 'Salvar Alterações' : 'Salvar Anotação'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
