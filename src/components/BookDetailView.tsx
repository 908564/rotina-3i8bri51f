import React, { useState, useEffect, useCallback } from 'react'
import {
  ChevronLeft,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  Bookmark,
  CheckCircle2,
  Clock,
  BookOpen,
} from 'lucide-react'
import { Livro, LivroAnotacao, LeituraHistorico } from '@/lib/types'
import { leituraRepository } from '@/lib/repositories/leituraRepository'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { QuickAddPagesModal } from '@/components/QuickAddPagesModal'
import { useToast } from '@/hooks/use-toast'

interface BookDetailViewProps {
  bookId: string
  onBack: () => void
  onEditBook: (book: Livro) => void
  onBookDeleted: () => void
  onUpdated: () => void
}

export const BookDetailView: React.FC<BookDetailViewProps> = ({
  bookId,
  onBack,
  onEditBook,
  onBookDeleted,
  onUpdated,
}) => {
  const [book, setBook] = useState<Livro | null>(null)
  const [anotacoes, setAnotacoes] = useState<LivroAnotacao[]>([])
  const [historico, setHistorico] = useState<LeituraHistorico[]>([])
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [noteModalOpen, setNoteModalOpen] = useState(false)
  const [deleteBookDialogOpen, setDeleteBookDialogOpen] = useState(false)

  // Estado para anotação em edição/criação
  const [editingNote, setEditingNote] = useState<LivroAnotacao | null>(null)
  const [noteText, setNoteText] = useState('')
  const [notePage, setNotePage] = useState('')

  const { toast } = useToast()

  const loadData = useCallback(async () => {
    const b = await leituraRepository.getLivroById(bookId)
    if (!b) {
      onBack()
      return
    }
    setBook(b)
    const notes = await leituraRepository.getAnotacoesByBook(bookId)
    setAnotacoes(notes)
    const hist = await leituraRepository.getHistoricoByBook(bookId)
    setHistorico(hist)
  }, [bookId, onBack])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleDeleteBook = async () => {
    await leituraRepository.deleteLivro(bookId)
    toast({
      title: 'Livro excluído',
      description: 'O livro e seus dados foram removidos.',
    })
    onBookDeleted()
  }

  const handleOpenNewNote = () => {
    setEditingNote(null)
    setNoteText('')
    setNotePage(book?.currentPage ? String(book.currentPage) : '')
    setNoteModalOpen(true)
  }

  const handleOpenEditNote = (n: LivroAnotacao) => {
    setEditingNote(n)
    setNoteText(n.text)
    setNotePage(n.page !== undefined ? String(n.page) : '')
    setNoteModalOpen(true)
  }

  const handleSaveNote = async () => {
    if (!noteText.trim()) return
    await leituraRepository.saveAnotacao({
      id: editingNote?.id,
      bookId,
      page: notePage ? parseInt(notePage) : undefined,
      text: noteText.trim(),
    })
    toast({
      title: editingNote ? 'Anotação atualizada' : 'Anotação salva',
      description: 'Sua nota do livro foi gravada com sucesso.',
    })
    setNoteModalOpen(false)
    loadData()
    onUpdated()
  }

  const handleDeleteNote = async (noteId: string) => {
    await leituraRepository.deleteAnotacao(noteId)
    toast({
      title: 'Anotação removida',
    })
    loadData()
    onUpdated()
  }

  const handleDeleteHistoryEntry = async (histId: string) => {
    await leituraRepository.deleteHistoricoEntry(histId)
    toast({
      title: 'Registro de leitura removido',
      description: 'O total de páginas foi recalculado.',
    })
    loadData()
    onUpdated()
  }

  if (!book) return null

  const progressPercent = book.totalPages
    ? Math.min(100, Math.round((book.currentPage / book.totalPages) * 100))
    : 0

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* BARRA SUPERIOR DE AÇÕES */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="text-xs h-9 px-2 rounded-xl text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> Voltar à Biblioteca
        </Button>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEditBook(book)}
            className="h-9 w-9 rounded-full text-foreground hover:bg-muted"
            aria-label="Editar livro"
          >
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDeleteBookDialogOpen(true)}
            className="h-9 w-9 rounded-full text-destructive hover:bg-destructive/10"
            aria-label="Excluir livro"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* HERO DO LIVRO */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 bg-card p-6 rounded-2xl border border-border shadow-subtle">
        {book.coverPhoto ? (
          <img
            src={book.coverPhoto}
            alt={book.title}
            className="w-32 h-44 object-cover rounded-xl shadow-md shrink-0 border border-border"
          />
        ) : (
          <div className="w-32 h-44 rounded-xl bg-gradient-to-br from-[#34BEAA]/20 to-[#34BEAA]/40 text-[#34BEAA] flex flex-col items-center justify-center font-bold text-4xl shadow-sm shrink-0 border border-[#34BEAA]/20">
            {book.title.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="flex-1 text-center sm:text-left space-y-3 w-full">
          <div>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
              <span
                className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                  book.status === 'concluido'
                    ? 'bg-[#3D9C73]/15 text-[#3D9C73]'
                    : book.status === 'lendo'
                      ? 'bg-[#34BEAA]/15 text-[#34BEAA]'
                      : 'bg-muted text-muted-foreground'
                }`}
              >
                {book.status === 'concluido'
                  ? 'Concluído'
                  : book.status === 'lendo'
                    ? 'Lendo'
                    : 'Quero ler'}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {book.title}
            </h2>
            <p className="text-sm font-medium text-muted-foreground">{book.author}</p>
          </div>

          {/* PROGRESSO */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground">
                Página atual: {book.currentPage} {book.totalPages ? `/ ${book.totalPages}` : ''}
              </span>
              <span className="font-bold text-[#34BEAA]">{progressPercent}%</span>
            </div>
            <Progress
              value={progressPercent}
              className="h-2.5 bg-muted [&>div]:bg-[#34BEAA] rounded-full"
            />
          </div>

          {/* BOTÃO PRINCIPAL DE AÇÃO */}
          <div className="pt-2">
            <Button
              onClick={() => setQuickAddOpen(true)}
              className="w-full sm:w-auto min-h-[44px] px-6 rounded-xl bg-[#34BEAA] hover:bg-[#34BEAA]/90 text-white font-semibold text-sm shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" /> + Páginas lidas hoje
            </Button>
          </div>
        </div>
      </div>

      {/* SEÇÃO: ANOTAÇÕES DO LIVRO */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-[#34BEAA]" /> Anotações do livro ({anotacoes.length})
          </h3>
          <Button
            size="sm"
            onClick={handleOpenNewNote}
            className="h-8 text-xs font-semibold rounded-lg bg-secondary text-foreground hover:bg-muted"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Nova Anotação
          </Button>
        </div>

        {anotacoes.length === 0 ? (
          <div className="p-6 rounded-xl border border-dashed border-border text-center text-xs text-muted-foreground">
            Nenhuma anotação feita para este livro. Anote reflexões, quotes ou aprendizados.
          </div>
        ) : (
          <div className="space-y-2.5">
            {anotacoes.map((note) => (
              <div
                key={note.id}
                className="p-4 rounded-xl bg-card border border-border shadow-subtle space-y-2 group"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    {note.page !== undefined && (
                      <span className="px-2 py-0.5 rounded bg-[#34BEAA]/10 text-[#34BEAA] font-bold text-[11px]">
                        pág. {note.page}
                      </span>
                    )}
                    <span className="text-muted-foreground text-[11px]">
                      {new Date(note.created).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => handleOpenEditNote(note)}
                      className="p-1 hover:text-[#34BEAA] text-muted-foreground transition-colors"
                      aria-label="Editar nota"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteNote(note.id)}
                      className="p-1 hover:text-destructive text-muted-foreground transition-colors"
                      aria-label="Excluir nota"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {note.text}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SEÇÃO: HISTÓRICO DE LEITURA */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#34BEAA]" /> Histórico de Sessões ({historico.length})
        </h3>

        {historico.length === 0 ? (
          <div className="p-6 rounded-xl border border-dashed border-border text-center text-xs text-muted-foreground">
            Complete seu primeiro registro de leitura para ver o histórico.
          </div>
        ) : (
          <div className="space-y-2">
            {historico.map((h) => (
              <div
                key={h.id}
                className="p-3 rounded-xl bg-card border border-border flex items-center justify-between text-xs shadow-subtle"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">+{h.pagesAdded} páginas</span>
                    <span className="text-muted-foreground">→ pág. {h.currentPage}</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(h.dateRead + 'T12:00:00').toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteHistoryEntry(h.id)}
                  className="h-8 text-[11px] text-destructive hover:bg-destructive/10"
                >
                  Excluir registro
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* QUICK ADD MODAL */}
      <QuickAddPagesModal
        open={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        bookId={book.id}
        bookTitle={book.title}
        onSaved={() => {
          loadData()
          onUpdated()
        }}
      />

      {/* MODAL DE ANOTAÇÃO */}
      <Dialog open={noteModalOpen} onOpenChange={setNoteModalOpen}>
        <DialogContent className="sm:max-w-md bg-card rounded-2xl p-6 border border-border">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {editingNote ? 'Editar Anotação' : 'Nova Anotação'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                Página de referência (opcional)
              </label>
              <Input
                type="number"
                placeholder="Ex.: 45"
                value={notePage}
                onChange={(e) => setNotePage(e.target.value)}
                className="h-10 rounded-xl"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Anotação</label>
              <Textarea
                placeholder="Escreva sua reflexão, citação ou resumo deste trecho..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                className="min-h-[120px] rounded-xl text-sm"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setNoteModalOpen(false)}
                className="flex-1 h-10 rounded-xl text-xs"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSaveNote}
                className="flex-1 h-10 rounded-xl text-xs bg-[#34BEAA] hover:bg-[#34BEAA]/90 text-white font-semibold"
              >
                Salvar Anotação
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO DE CONFIRMAÇÃO DE EXCLUSÃO DO LIVRO */}
      <AlertDialog open={deleteBookDialogOpen} onOpenChange={setDeleteBookDialogOpen}>
        <AlertDialogContent className="rounded-2xl bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir livro?</AlertDialogTitle>
            <AlertDialogDescription>
              As anotações e o histórico de leitura também serão removidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBook}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
            >
              Excluir Livro
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
