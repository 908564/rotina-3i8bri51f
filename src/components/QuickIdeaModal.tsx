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
import { Textarea } from '@/components/ui/textarea'
import { Lightbulb, Plus, X } from 'lucide-react'
import { idb } from '@/lib/indexedDb'
import { Idea } from '@/lib/types'
import { recordOutboxStandalone } from '@/lib/sync/outboxHelper'

interface QuickIdeaModalProps {
  open: boolean
  onClose: () => void
  initialTitle?: string
  onSaved?: (idea: Idea) => void
}

export function QuickIdeaModal({ open, onClose, initialTitle = '', onSaved }: QuickIdeaModalProps) {
  const [title, setTitle] = useState(initialTitle)
  const [body, setBody] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setTitle(initialTitle)
      setBody('')
      setTags([])
      setTagInput('')
    }
  }, [open, initialTitle])

  const handleAddTag = () => {
    const trimmed = tagInput.trim().replace(/^#/, '')
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed])
      setTagInput('')
    }
  }

  const handleRemoveTag = (t: string) => {
    setTags(tags.filter((item) => item !== t))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || saving) return

    setSaving(true)
    try {
      const now = new Date().toISOString()
      const newIdea: Idea = {
        id: crypto.randomUUID(),
        title: title.trim(),
        body: body.trim(),
        tags,
        status: 'aberta',
        createdAt: now,
        updatedAt: now,
      }

      await idb.put<Idea>(idb.STORE_IDEAS, newIdea)
      await recordOutboxStandalone('idea', newIdea.id, 'upsert', newIdea)

      onSaved?.(newIdea)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md bg-card rounded-2xl p-5 sm:p-6 border border-border">
        <DialogHeader className="text-left space-y-1">
          <div className="flex items-center gap-1.5 text-[#7B83E6]">
            <Lightbulb className="w-4 h-4" />
            <span className="text-[11px] font-bold uppercase tracking-wider">Ideia de Escrita</span>
          </div>
          <DialogTitle className="text-lg font-bold text-foreground">
            Registrar Nova Ideia
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Guarde reflexões, esboços ou inspirações para desenvolver mais tarde.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="idea-title" className="text-xs font-semibold">
              Título da Ideia *
            </Label>
            <Input
              id="idea-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Sobre o que é esta ideia?"
              className="rounded-xl text-xs sm:text-sm bg-background border-border h-10"
              required
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="idea-body" className="text-xs font-semibold">
              Anotações adicionais (opcional)
            </Label>
            <Textarea
              id="idea-body"
              rows={3}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Pontos centrais, insights ou referências..."
              className="rounded-xl text-xs sm:text-sm bg-background border-border"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Tags</Label>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Ex.: livro, ensaio, rotina"
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
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-[#7B83E6]/15 text-[#7B83E6] text-xs font-semibold"
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
              disabled={saving || !title.trim()}
              className="min-h-[44px] h-10 rounded-xl text-xs px-5 bg-[#7B83E6] hover:bg-[#6870D6] text-white font-semibold"
            >
              {saving ? 'Salvando...' : 'Salvar Ideia'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
