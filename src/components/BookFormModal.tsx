import React, { useState, useRef, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Camera,
  Image as ImageIcon,
  Trash2,
  BookOpen,
  Target,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Livro, LivroMeta } from '@/lib/types'
import { compressBookCover } from '@/lib/imageCompressor'
import { useToast } from '@/hooks/use-toast'
import { GoalEditorFields } from './GoalEditorModal'

interface BookFormModalProps {
  open: boolean
  onClose: () => void
  editingBook?: Livro | null
  onSave: (bookData: {
    id?: string
    title: string
    author: string
    totalPages?: number
    currentPage: number
    status: Livro['status']
    coverPhoto?: string
    goal?: LivroMeta
  }) => Promise<void>
}

export const BookFormModal: React.FC<BookFormModalProps> = ({
  open,
  onClose,
  editingBook,
  onSave,
}) => {
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [totalPages, setTotalPages] = useState<string>('')
  const [currentPage, setCurrentPage] = useState<string>('0')
  const [status, setStatus] = useState<Livro['status']>('quero_ler')
  const [coverPhoto, setCoverPhoto] = useState<string | undefined>(undefined)
  const [goal, setGoal] = useState<LivroMeta>({})
  const [showGoalSection, setShowGoalSection] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (editingBook) {
      setTitle(editingBook.title)
      setAuthor(editingBook.author)
      setTotalPages(editingBook.totalPages ? String(editingBook.totalPages) : '')
      setCurrentPage(String(editingBook.currentPage || 0))
      setStatus(editingBook.status)
      setCoverPhoto(editingBook.coverPhoto)
      setGoal(editingBook.goal || {})
      setShowGoalSection(Boolean(editingBook.goal && Object.keys(editingBook.goal).length > 0))
    } else {
      setTitle('')
      setAuthor('')
      setTotalPages('')
      setCurrentPage('0')
      setStatus('quero_ler')
      setCoverPhoto(undefined)
      setGoal({})
      setShowGoalSection(false)
    }
    setErrors({})
  }, [editingBook, open])

  const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const compressed = await compressBookCover(file)
      setCoverPhoto(compressed)
      toast({
        title: 'Capa processada!',
        description: 'Imagem comprimida e salva com sucesso.',
      })
    } catch {
      toast({
        title: 'Erro na imagem',
        description: 'Não foi possível processar a imagem. Tente novamente.',
        variant: 'destructive',
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: Record<string, string> = {}

    if (!title.trim()) newErrors.title = 'Título é obrigatório.'
    if (!author.trim()) newErrors.author = 'Autor é obrigatório.'

    const parsedTotal = totalPages ? parseInt(totalPages) : undefined
    const parsedCurrent = parseInt(currentPage) || 0

    if (parsedTotal !== undefined && parsedTotal < 1) {
      newErrors.totalPages = 'O total deve ser no mínimo 1 página.'
    }
    if (parsedTotal !== undefined && parsedCurrent > parsedTotal) {
      newErrors.currentPage = 'A página atual não pode ser maior que o total.'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    // Limpa chaves vazias da meta
    const cleanedGoal: LivroMeta = {}
    if (goal.dailyPages && goal.dailyPages > 0) cleanedGoal.dailyPages = goal.dailyPages
    if (goal.dailyMinutes && goal.dailyMinutes > 0) cleanedGoal.dailyMinutes = goal.dailyMinutes
    if (goal.weeklyPages && goal.weeklyPages > 0) cleanedGoal.weeklyPages = goal.weeklyPages
    if (goal.weeklyMinutes && goal.weeklyMinutes > 0) cleanedGoal.weeklyMinutes = goal.weeklyMinutes
    if (goal.monthlyPages && goal.monthlyPages > 0) cleanedGoal.monthlyPages = goal.monthlyPages
    if (goal.monthlyMinutes && goal.monthlyMinutes > 0)
      cleanedGoal.monthlyMinutes = goal.monthlyMinutes
    if (goal.targetDate) cleanedGoal.targetDate = goal.targetDate
    const finalGoal = Object.keys(cleanedGoal).length > 0 ? cleanedGoal : undefined

    setSubmitting(true)
    try {
      await onSave({
        id: editingBook?.id,
        title: title.trim(),
        author: author.trim(),
        totalPages: parsedTotal,
        currentPage: parsedCurrent,
        status,
        coverPhoto,
        goal: finalGoal,
      })
      onClose()
    } catch {
      toast({
        title: 'Erro ao salvar',
        description: 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-lg bg-card rounded-2xl p-6 border border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-left space-y-1">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#34BEAA]" />
            {editingBook ? 'Editar Livro' : 'Adicionar Novo Livro'}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {editingBook
              ? 'Atualize as informações do livro na sua biblioteca.'
              : 'Cadastre o título, autor, páginas e tire foto da capa.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* UPLOAD DA CAPA COM PREVIEW E OPÇÕES */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground">Foto da Capa</label>
            <div className="flex items-center gap-4">
              {coverPhoto ? (
                <div className="relative w-20 h-28 rounded-xl overflow-hidden border border-border shadow-sm group">
                  <img
                    src={coverPhoto}
                    alt="Capa do livro"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setCoverPhoto(undefined)}
                    className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Remover capa"
                  >
                    <Trash2 className="w-5 h-5 text-red-400" />
                  </button>
                </div>
              ) : (
                <div className="w-20 h-28 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground/60 text-[10px] text-center p-2 bg-muted/20">
                  <ImageIcon className="w-6 h-6 mb-1 text-muted-foreground" />
                  Sem capa
                </div>
              )}

              <div className="flex flex-col gap-2">
                {/* Inputs ocultos nativos */}
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleImageFile}
                />
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageFile}
                />

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => cameraInputRef.current?.click()}
                  className="text-xs h-9 rounded-xl border-border justify-start gap-2"
                >
                  <Camera className="w-3.5 h-3.5 text-[#34BEAA]" /> Tirar foto da capa
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => galleryInputRef.current?.click()}
                  className="text-xs h-9 rounded-xl border-border justify-start gap-2"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-[#34BEAA]" /> Escolher da galeria
                </Button>
                {coverPhoto && (
                  <button
                    type="button"
                    onClick={() => setCoverPhoto(undefined)}
                    className="text-[11px] text-destructive hover:underline text-left mt-0.5"
                  >
                    Remover foto
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* CAMPOS DE TEXTO */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">
              Título <span className="text-destructive">*</span>
            </label>
            <Input
              type="text"
              placeholder="Ex.: Hábitos Atômicos"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-11 rounded-xl bg-background border-border"
            />
            {errors.title && <p className="text-[11px] text-destructive italic">{errors.title}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">
              Autor <span className="text-destructive">*</span>
            </label>
            <Input
              type="text"
              placeholder="Ex.: James Clear"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="h-11 rounded-xl bg-background border-border"
            />
            {errors.author && (
              <p className="text-[11px] text-destructive italic">{errors.author}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Total de páginas</label>
              <Input
                type="number"
                min={1}
                placeholder="Ex.: 320"
                value={totalPages}
                onChange={(e) => setTotalPages(e.target.value)}
                className="h-11 rounded-xl bg-background border-border"
              />
              {errors.totalPages && (
                <p className="text-[11px] text-destructive italic">{errors.totalPages}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Página atual</label>
              <Input
                type="number"
                min={0}
                placeholder="0"
                value={currentPage}
                onChange={(e) => setCurrentPage(e.target.value)}
                className="h-11 rounded-xl bg-background border-border"
              />
              {errors.currentPage && (
                <p className="text-[11px] text-destructive italic">{errors.currentPage}</p>
              )}
            </div>
          </div>

          {/* SEÇÃO OPCIONAL: METAS DE LEITURA DO LIVRO */}
          <div className="rounded-2xl border border-border bg-card/50 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowGoalSection(!showGoalSection)}
              className="w-full p-3.5 flex items-center justify-between text-left hover:bg-muted/40 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-[#34BEAA]" />
                <div>
                  <span className="text-xs font-bold text-foreground">Meta de leitura</span>
                  <span className="ml-1.5 text-[10px] text-muted-foreground uppercase font-medium">
                    Opcional
                  </span>
                </div>
              </div>
              {showGoalSection ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </button>

            {showGoalSection && (
              <div className="p-4 pt-1 border-t border-border/60">
                <GoalEditorFields
                  goal={goal}
                  totalPages={totalPages ? parseInt(totalPages) : undefined}
                  currentPage={currentPage ? parseInt(currentPage) : 0}
                  onChange={setGoal}
                />
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 h-11 rounded-xl text-xs font-semibold"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="flex-1 h-11 rounded-xl text-xs font-semibold bg-[#34BEAA] hover:bg-[#34BEAA]/90 text-white shadow-sm"
            >
              {submitting ? 'Salvando...' : editingBook ? 'Salvar Alterações' : 'Adicionar Livro'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
