import React, { useState } from 'react'
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
import { trabalhoRepository } from '@/lib/repositories/trabalhoRepository'
import { getTodayDateKey } from '@/lib/dateUtils'
import { Trophy } from 'lucide-react'

interface QuickAchievementSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (message: string) => void
}

export const QuickAchievementSheet: React.FC<QuickAchievementSheetProps> = ({
  open,
  onOpenChange,
  onSuccess,
}) => {
  const [title, setTitle] = useState('')
  const [impact, setImpact] = useState('')
  const [saving, setSaving] = useState(false)

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setSaving(true)
    try {
      const today = getTodayDateKey()
      await trabalhoRepository.saveAchievement({
        title: title.trim(),
        description: '',
        impact: impact.trim(),
        date: today,
        tags: [],
      })
      onSuccess('Conquista registrada com sucesso!')
      setTitle('')
      setImpact('')
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fixed bottom-0 top-auto translate-y-0 sm:max-w-md w-full bg-card rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 border border-border pb-8 sm:pb-6">
        <DialogHeader className="text-left space-y-1">
          <div className="flex items-center gap-2 text-[#3F5A70]">
            <Trophy className="w-5 h-5 text-amber-500" />
            <span className="text-xs font-bold uppercase tracking-wider">Trabalho</span>
          </div>
          <DialogTitle className="text-lg font-bold">Registrar Conquista</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Celebre uma vitória ou entrega concluída hoje em 2 toques.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleConfirm} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="ach-title" className="text-xs font-semibold">
              Título da conquista *
            </Label>
            <Input
              id="ach-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: Implantei o novo checkout em produção"
              className="h-11 rounded-xl bg-background border-border text-sm"
              autoFocus
              required
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <Label htmlFor="ach-impact" className="text-xs font-semibold text-muted-foreground">
                Resultado / Impacto
              </Label>
              <span className="text-[10px] text-muted-foreground uppercase">Opcional</span>
            </div>
            <Input
              id="ach-impact"
              value={impact}
              onChange={(e) => setImpact(e.target.value)}
              placeholder="Ex.: Aumentou a conversão em 15%"
              className="h-11 rounded-xl bg-background border-border text-sm"
            />
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              disabled={saving || !title.trim()}
              className="w-full h-12 rounded-xl text-sm font-bold bg-[#5A7184] hover:bg-[#4E6375] text-white transition-all shadow-subtle active:scale-[0.99]"
            >
              {saving ? 'Salvando...' : 'Salvar conquista'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
