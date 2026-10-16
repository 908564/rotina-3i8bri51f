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
import { Plus, Minus, BookOpen } from 'lucide-react'
import { leituraRepository } from '@/lib/repositories/leituraRepository'
import { useToast } from '@/hooks/use-toast'

interface QuickAddPagesModalProps {
  open: boolean
  onClose: () => void
  bookId?: string
  bookTitle?: string
  onSaved: () => void
}

export const QuickAddPagesModal: React.FC<QuickAddPagesModalProps> = ({
  open,
  onClose,
  bookId,
  bookTitle,
  onSaved,
}) => {
  const [pages, setPages] = useState<number>(10)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleIncrement = (delta: number) => {
    setPages((prev) => Math.max(1, prev + delta))
  }

  const handleSave = async () => {
    if (!bookId) {
      toast({
        title: 'Nenhum livro selecionado',
        description: 'Cadastre ou selecione um livro antes de registrar páginas.',
        variant: 'destructive',
      })
      onClose()
      return
    }

    try {
      setLoading(true)
      const res = await leituraRepository.addReadingSession({
        bookId,
        pagesAdded: Number(pages) || 1,
      })
      toast({
        title: 'Leitura registrada!',
        description: `${res.history.pagesAdded} páginas adicionadas ✓ (Agora na pág. ${res.book.currentPage})`,
      })
      onSaved()
      onClose()
    } catch {
      toast({
        title: 'Erro ao registrar leitura',
        description: 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-md bg-card rounded-2xl p-6 border border-border">
        <DialogHeader className="text-left space-y-1">
          <div className="flex items-center gap-2 text-[#34BEAA]">
            <BookOpen className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Registro Rápido</span>
          </div>
          <DialogTitle className="text-xl font-bold">
            {bookTitle ? `Ler "${bookTitle}"` : 'Páginas lidas hoje'}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Quantas páginas você leu nesta sessão?
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center my-6 space-y-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => handleIncrement(-5)}
              className="w-11 h-11 min-h-[44px] min-w-[44px] rounded-full border border-border bg-secondary flex items-center justify-center text-foreground hover:bg-muted active:scale-95 transition-all text-sm font-semibold"
              aria-label="Menos 5 páginas"
            >
              -5
            </button>
            <button
              type="button"
              onClick={() => handleIncrement(-1)}
              className="w-11 h-11 min-h-[44px] min-w-[44px] rounded-full border border-border bg-secondary flex items-center justify-center text-foreground hover:bg-muted active:scale-95 transition-all"
              aria-label="Menos 1 página"
            >
              <Minus className="w-4 h-4" />
            </button>

            <div className="flex flex-col items-center">
              <Input
                type="number"
                min={1}
                value={pages}
                onChange={(e) => setPages(Math.max(1, parseInt(e.target.value) || 0))}
                className="w-24 h-16 text-center text-3xl font-bold bg-background border-2 border-[#34BEAA]/50 focus-visible:ring-[#34BEAA] rounded-xl"
                autoFocus
              />
              <span className="text-xs text-muted-foreground mt-1">páginas</span>
            </div>

            <button
              type="button"
              onClick={() => handleIncrement(1)}
              className="w-11 h-11 min-h-[44px] min-w-[44px] rounded-full border border-border bg-secondary flex items-center justify-center text-foreground hover:bg-muted active:scale-95 transition-all"
              aria-label="Mais 1 página"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleIncrement(5)}
              className="w-11 h-11 min-h-[44px] min-w-[44px] rounded-full border border-border bg-secondary flex items-center justify-center text-foreground hover:bg-muted active:scale-95 transition-all text-sm font-semibold"
              aria-label="Mais 5 páginas"
            >
              +5
            </button>
          </div>

          <div className="flex gap-2 flex-wrap justify-center pt-2">
            {[5, 10, 15, 20, 30].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setPages(num)}
                className={`px-3 py-1.5 min-h-[44px] rounded-lg text-xs font-semibold transition-all ${
                  pages === num
                    ? 'bg-[#34BEAA] text-white shadow-sm'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                {num} pág.
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1 h-12 rounded-xl text-sm"
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            className="flex-1 h-12 rounded-xl text-sm bg-[#34BEAA] hover:bg-[#34BEAA]/90 text-white font-semibold shadow-md active:scale-95 transition-all"
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? 'Salvando...' : 'Adicionar Páginas'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
