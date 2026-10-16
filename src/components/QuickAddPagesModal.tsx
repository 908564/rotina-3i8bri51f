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
import { Plus, Minus, BookOpen, Clock, ChevronDown } from 'lucide-react'
import { leituraRepository } from '@/lib/repositories/leituraRepository'
import { Livro } from '@/lib/types'
import { useToast } from '@/hooks/use-toast'

interface QuickAddPagesModalProps {
  open: boolean
  onClose: () => void
  bookId?: string
  bookTitle?: string
  onSaved: () => void
}

const LAST_BOOK_KEY = 'rotina_last_reading_book_id'

export const QuickAddPagesModal: React.FC<QuickAddPagesModalProps> = ({
  open,
  onClose,
  bookId: initialBookId,
  bookTitle: initialBookTitle,
  onSaved,
}) => {
  const [allReadingBooks, setAllReadingBooks] = useState<Livro[]>([])
  const [selectedBookId, setSelectedBookId] = useState<string>('')
  const [pages, setPages] = useState<string>('10')
  const [minutes, setMinutes] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  // Carrega livros em status 'lendo'
  useEffect(() => {
    if (!open) return

    const loadBooks = async () => {
      const list = await leituraRepository.getLivros()
      const reading = list.filter((b) => b.status === 'lendo')
      setAllReadingBooks(reading)

      if (initialBookId) {
        setSelectedBookId(initialBookId)
      } else {
        // Se houver último livro lembrado no localStorage, usa ele se ainda estiver em reading
        const lastUsedId = localStorage.getItem(LAST_BOOK_KEY)
        if (lastUsedId && reading.some((b) => b.id === lastUsedId)) {
          setSelectedBookId(lastUsedId)
        } else if (reading.length > 0) {
          setSelectedBookId(reading[0].id)
        } else if (list.length > 0) {
          setSelectedBookId(list[0].id)
        } else {
          setSelectedBookId('')
        }
      }
    }

    loadBooks()
    setPages('10')
    setMinutes('')
  }, [open, initialBookId])

  const currentBook = allReadingBooks.find((b) => b.id === selectedBookId)

  const handleIncrementPages = (delta: number) => {
    const current = parseInt(pages) || 0
    setPages(String(Math.max(0, current + delta)))
  }

  const handleIncrementMinutes = (delta: number) => {
    const current = parseInt(minutes) || 0
    setMinutes(String(Math.max(0, current + delta)))
  }

  const handleSave = async () => {
    const effectiveBookId = selectedBookId || initialBookId
    if (!effectiveBookId) {
      toast({
        title: 'Nenhum livro selecionado',
        description: 'Cadastre ou selecione um livro antes de registrar leitura.',
        variant: 'destructive',
      })
      onClose()
      return
    }

    const numPages = pages ? parseInt(pages) : 0
    const numMinutes = minutes ? parseInt(minutes) : undefined

    if (numPages === 0 && (!numMinutes || numMinutes === 0)) {
      toast({
        title: 'Informe páginas ou minutos',
        description: 'Pelo menos um dos dois campos deve ser preenchido para registrar.',
        variant: 'destructive',
      })
      return
    }

    try {
      setLoading(true)
      const res = await leituraRepository.addReadingSession({
        bookId: effectiveBookId,
        pagesAdded: numPages,
        minutes: numMinutes,
      })

      // Lembra o último livro usado
      localStorage.setItem(LAST_BOOK_KEY, effectiveBookId)

      let desc = ''
      if (numPages > 0 && numMinutes && numMinutes > 0) {
        desc = `${numPages} páginas e ${numMinutes} min adicionados ✓ (Agora na pág. ${res.book.currentPage})`
      } else if (numPages > 0) {
        desc = `${numPages} páginas adicionadas ✓ (Agora na pág. ${res.book.currentPage})`
      } else {
        desc = `${numMinutes} minutos adicionados ✓`
      }

      toast({
        title: 'Leitura registrada!',
        description: desc,
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
            <span className="text-xs font-bold uppercase tracking-wider">Registro de Leitura</span>
          </div>
          <DialogTitle className="text-xl font-bold">Registrar leitura de hoje</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Informe páginas lidas e/ou minutos dedicados (pelo menos um obrigatório).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* SELETOR DE LIVRO (SE HOUVER MAIS DE UM LIVRO OU QUANDO ABERTO PELA TELA HOJE) */}
          {!initialBookId && allReadingBooks.length > 1 ? (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Qual livro você está lendo?
              </label>
              <div className="relative">
                <select
                  value={selectedBookId}
                  onChange={(e) => setSelectedBookId(e.target.value)}
                  className="w-full h-11 px-3.5 pr-8 rounded-xl bg-background border border-border text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-[#34BEAA]"
                >
                  {allReadingBooks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title} ({b.author})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 absolute right-3 top-3.5 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          ) : currentBook || initialBookTitle ? (
            <div className="p-3 rounded-xl bg-muted/40 border border-border/80 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#34BEAA]" />
                <span className="font-semibold text-foreground line-clamp-1">
                  {currentBook?.title || initialBookTitle}
                </span>
              </div>
              {currentBook?.currentPage !== undefined && (
                <span className="text-muted-foreground text-[11px]">
                  pág. {currentBook.currentPage}
                  {currentBook.totalPages ? ` de ${currentBook.totalPages}` : ''}
                </span>
              )}
            </div>
          ) : null}

          {/* 1. CONTROLE DE PÁGINAS */}
          <div className="p-4 rounded-xl bg-card border border-border space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-[#34BEAA]" /> Páginas lidas
              </span>
              <span className="text-[10px] text-muted-foreground">Opcional</span>
            </div>

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => handleIncrementPages(-5)}
                className="w-10 h-10 min-h-[44px] min-w-[44px] rounded-full border border-border bg-secondary flex items-center justify-center text-foreground hover:bg-muted active:scale-95 transition-all text-xs font-semibold"
                aria-label="Menos 5 páginas"
              >
                -5
              </button>
              <button
                type="button"
                onClick={() => handleIncrementPages(-1)}
                className="w-10 h-10 min-h-[44px] min-w-[44px] rounded-full border border-border bg-secondary flex items-center justify-center text-foreground hover:bg-muted active:scale-95 transition-all"
                aria-label="Menos 1 página"
              >
                <Minus className="w-4 h-4" />
              </button>

              <div className="flex flex-col items-center">
                <Input
                  type="number"
                  min={0}
                  value={pages}
                  placeholder="0"
                  onChange={(e) => setPages(e.target.value)}
                  className="w-20 h-14 text-center text-2xl font-bold bg-background border-2 border-[#34BEAA]/40 focus-visible:ring-[#34BEAA] rounded-xl"
                />
                <span className="text-[10px] text-muted-foreground mt-0.5">páginas</span>
              </div>

              <button
                type="button"
                onClick={() => handleIncrementPages(1)}
                className="w-10 h-10 min-h-[44px] min-w-[44px] rounded-full border border-border bg-secondary flex items-center justify-center text-foreground hover:bg-muted active:scale-95 transition-all"
                aria-label="Mais 1 página"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleIncrementPages(5)}
                className="w-10 h-10 min-h-[44px] min-w-[44px] rounded-full border border-border bg-secondary flex items-center justify-center text-foreground hover:bg-muted active:scale-95 transition-all text-xs font-semibold"
                aria-label="Mais 5 páginas"
              >
                +5
              </button>
            </div>

            <div className="flex gap-1.5 flex-wrap justify-center pt-1">
              {[0, 5, 10, 15, 20, 30].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setPages(String(num))}
                  className={`px-2.5 py-1 min-h-[38px] rounded-lg text-xs font-semibold transition-all ${
                    pages === String(num)
                      ? 'bg-[#34BEAA] text-white shadow-xs'
                      : 'bg-muted/70 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {num} pág.
                </button>
              ))}
            </div>
          </div>

          {/* 2. CONTROLE DE MINUTOS */}
          <div className="p-4 rounded-xl bg-card border border-border space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#34BEAA]" /> Minutos dedicados
              </span>
              <span className="text-[10px] text-muted-foreground">Opcional</span>
            </div>

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => handleIncrementMinutes(-10)}
                className="w-10 h-10 min-h-[44px] min-w-[44px] rounded-full border border-border bg-secondary flex items-center justify-center text-foreground hover:bg-muted active:scale-95 transition-all text-xs font-semibold"
                aria-label="Menos 10 minutos"
              >
                -10
              </button>
              <button
                type="button"
                onClick={() => handleIncrementMinutes(-5)}
                className="w-10 h-10 min-h-[44px] min-w-[44px] rounded-full border border-border bg-secondary flex items-center justify-center text-foreground hover:bg-muted active:scale-95 transition-all"
                aria-label="Menos 5 minutos"
              >
                <Minus className="w-4 h-4" />
              </button>

              <div className="flex flex-col items-center">
                <Input
                  type="number"
                  min={0}
                  value={minutes}
                  placeholder="0"
                  onChange={(e) => setMinutes(e.target.value)}
                  className="w-20 h-14 text-center text-2xl font-bold bg-background border-2 border-[#34BEAA]/40 focus-visible:ring-[#34BEAA] rounded-xl"
                />
                <span className="text-[10px] text-muted-foreground mt-0.5">minutos</span>
              </div>

              <button
                type="button"
                onClick={() => handleIncrementMinutes(5)}
                className="w-10 h-10 min-h-[44px] min-w-[44px] rounded-full border border-border bg-secondary flex items-center justify-center text-foreground hover:bg-muted active:scale-95 transition-all"
                aria-label="Mais 5 minutos"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleIncrementMinutes(10)}
                className="w-10 h-10 min-h-[44px] min-w-[44px] rounded-full border border-border bg-secondary flex items-center justify-center text-foreground hover:bg-muted active:scale-95 transition-all text-xs font-semibold"
                aria-label="Mais 10 minutos"
              >
                +10
              </button>
            </div>

            <div className="flex gap-1.5 flex-wrap justify-center pt-1">
              {[0, 10, 15, 20, 30, 45, 60].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setMinutes(num > 0 ? String(num) : '')}
                  className={`px-2.5 py-1 min-h-[38px] rounded-lg text-xs font-semibold transition-all ${
                    minutes === String(num)
                      ? 'bg-[#34BEAA] text-white shadow-xs'
                      : 'bg-muted/70 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {num} min
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-3">
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
            {loading ? 'Salvando...' : 'Registrar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
