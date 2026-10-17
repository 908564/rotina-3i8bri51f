import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Flame, Award, Sparkles } from 'lucide-react'
import { Medal } from '@/lib/types'

interface CelebrationOverlayProps {
  open: boolean
  onClose: () => void
  streakDays: number
  moduleName: string
  earnedMedal?: Medal | null
}

export function CelebrationOverlay({
  open,
  onClose,
  streakDays,
  moduleName,
  earnedMedal,
}: CelebrationOverlayProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm bg-card rounded-3xl p-6 border border-border shadow-2xl text-center">
        <DialogHeader className="items-center text-center">
          {/* Chama animada (respeita prefers-reduced-motion via motion-reduce) */}
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-500/20 to-orange-500/30 flex items-center justify-center mb-2 mx-auto ring-4 ring-orange-500/10">
            <Flame className="w-10 h-10 text-orange-500 fill-orange-500 motion-safe:animate-bounce motion-reduce:animate-none" />
          </div>

          <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#E8883A] flex items-center gap-1 justify-center">
            <Sparkles className="w-3.5 h-3.5" /> Meta do dia conquistada!
          </span>

          <DialogTitle className="text-2xl font-black text-foreground tracking-tight mt-1">
            Ofensiva de {streakDays} {streakDays === 1 ? 'dia' : 'dias'}!
          </DialogTitle>

          <DialogDescription className="text-xs text-muted-foreground mt-1">
            Parabéns! Você cumpriu sua meta diária de {moduleName} e manteve sua consistência.
          </DialogDescription>
        </DialogHeader>

        {/* MEDALHA GANHA (SE HOUVER) */}
        {earnedMedal && (
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-3 text-left my-2 animate-fade-in">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Nova Medalha
              </span>
              <h4 className="text-xs font-bold text-foreground truncate">{earnedMedal.title}</h4>
              <p className="text-[11px] text-muted-foreground truncate">
                {earnedMedal.description}
              </p>
            </div>
          </div>
        )}

        <div className="pt-2">
          <Button
            type="button"
            onClick={onClose}
            className="w-full h-12 rounded-2xl bg-[#E8883A] hover:bg-[#D5792F] text-white font-bold text-sm shadow-sm"
          >
            Continuar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
