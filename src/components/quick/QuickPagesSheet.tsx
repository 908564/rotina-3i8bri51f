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
import { leituraRepository } from '@/lib/repositories/leituraRepository'
import { Livro } from '@/lib/types'
import { getTodayDateKey } from '@/lib/dateUtils'
import { BookOpen, Check, Clock } from 'lucide-react'

interface QuickPagesSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (message: string) => void
  preferredBookId?: string
}

export const QuickPagesSheet: React.FC<QuickPagesSheetProps> = ({
  open,
  onOpenChange,
  onSuccess,
  preferredBookId,
}) => {
  const [books, setBooks] = useState<Livro[]>([])
  const [selectedBookId, setSelectedBookId] = useState<string>('')
  const [mode, setMode] = useState<'pages' | 'minutes'>('pages')
  const [amount, setAmount] = useState<string>('10')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      leituraRepository.getLivros().then((list) => {
        const lendo = list.filter((b) => b.status === 'lendo')
        setBooks(lendo.length > 0 ? lendo : list)
        if (preferredBookId && list.some((b) => b.id === preferredBookId)) {
          setSelectedBookId(preferredBookId)
        } else if (lendo.length > 0) {
          setSelectedBookId(lendo[0].id)
        } else if (list.length > 0) {
          setSelectedBookId(list[0].id)
        }
      })
    }
  }, [open, preferredBookId])

  const handleAdd = (delta: number) => {
    const cur = parseInt(amount, 10) || 0
    setAmount(String(Math.max(1, cur + delta)))
  }

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault()
    const val = parseInt(amount, 10)
    if (!val || val <= 0 || !selectedBookId) return

    setSaving(true)
    try {
      const today = getTodayDateKey()
      if (mode === 'pages') {
        await leituraRepository.addReadingSession({
          bookId: selectedBookId,
          pagesAdded: val,
          dateRead: today,
        })
        onSuccess(`+${val} páginas registradas`)
      } else {
        await leituraRepository.addReadingSession({
          bookId: selectedBookId,
          pagesAdded: 0,
          minutes: val,
          dateRead: today,
        })
        onSuccess(`+${val} min de leitura registrados`)
      }
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  const selectedBook = books.find((b) => b.id === selectedBookId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fixed bottom-0 top-auto translate-y-0 sm:max-w-md w-full bg-card rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 border border-border pb-8 sm:pb-6">
        <DialogHeader className="text-left space-y-1">
          <div className="flex items-center gap-2 text-[#1F7F6E]">
            <BookOpen className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Leitura Rápida</span>
          </div>
          <DialogTitle className="text-lg font-bold">Registrar Leitura</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Adicione páginas ou minutos lidos hoje em 1 toque.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleConfirm} className="space-y-4 pt-2">
          {books.length > 1 && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Livro</Label>
              <select
                aria-label="Selecionar livro"
                value={selectedBookId}
                onChange={(e) => setSelectedBookId(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-border bg-background text-xs sm:text-sm font-medium focus:ring-2 focus:ring-[#4FB3A0] focus:outline-none"
              >
                {books.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title} {b.currentPage ? `(pág ${b.currentPage})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedBook && books.length === 1 && (
            <p className="text-xs font-semibold text-foreground">
              Livro: <span className="text-[#1F7F6E]">{selectedBook.title}</span>
            </p>
          )}

          {/* Seletor Páginas vs Minutos */}
          <div className="flex rounded-xl bg-muted/60 p-1 border border-border">
            <button
              type="button"
              onClick={() => setMode('pages')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                mode === 'pages' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
              }`}
            >
              Páginas
            </button>
            <button
              type="button"
              onClick={() => setMode('minutes')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                mode === 'minutes' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
              }`}
            >
              Minutos
            </button>
          </div>

          {/* Campo Numérico Grande */}
          <div className="space-y-2 text-center pt-1">
            <Input
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-16 text-3xl font-extrabold text-center rounded-2xl bg-background border-border"
              autoFocus
            />

            {/* Atalhos +5 / +10 / +20 */}
            <div className="flex gap-2 justify-center pt-1">
              {[5, 10, 20].map((delta) => (
                <button
                  key={delta}
                  type="button"
                  onClick={() => handleAdd(delta)}
                  className="px-4 py-2 rounded-xl border border-border bg-muted/40 hover:bg-muted text-xs font-bold text-foreground transition-all active:scale-95"
                >
                  +{delta} {mode === 'pages' ? 'pág' : 'min'}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              disabled={saving || !selectedBookId || !amount}
              className="w-full h-12 rounded-xl text-sm font-bold bg-[#4FB3A0] hover:bg-[#3FA18E] text-white transition-all shadow-subtle active:scale-[0.99]"
            >
              {saving ? 'Registrando...' : 'Confirmar registro'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
