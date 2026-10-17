import React, { useState, useEffect, useCallback } from 'react'
import {
  ChevronLeft,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  Bookmark,
  Clock,
  BookOpen,
  Target,
  Sparkles,
  Check,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Livro, LivroAnotacao, LeituraHistorico, LivroMeta, Task } from '@/lib/types'
import { getBookGoalForDate, leituraRepository } from '@/lib/repositories/leituraRepository'
import { taskRepository } from '@/lib/repositories/taskRepository'
import { readingTimerService } from '@/lib/readingTimerService'
import { ReadingTimerModal } from '@/components/ReadingTimerModal'
import { CelebrationOverlay } from '@/components/CelebrationOverlay'
import { celebrationService } from '@/lib/celebrationService'
import { medalsRepository } from '@/lib/repositories/medalsRepository'
import { settingsRepository } from '@/lib/repositories/settingsRepository'
import { cn } from '@/lib/utils'
import { openTaskModal } from '@/lib/taskModalEvents'
import { getTodayDateKey, getDaysAgoKey } from '@/lib/dateUtils'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { ListTodo } from 'lucide-react'
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
import { EditBookGoalModal } from '@/components/GoalEditorModal'
import { ModuleTasksView } from '@/components/ModuleTasksView'
import { useToast } from '@/hooks/use-toast'

interface BookDetailViewProps {
  bookId: string
  onBack: () => void
  onEditBook: (book: Livro) => void
  onBookDeleted: () => void
  onUpdated: () => void
  focusGoals?: boolean
}

export const BookDetailView: React.FC<BookDetailViewProps> = ({
  bookId,
  onBack,
  onEditBook,
  onBookDeleted,
  onUpdated,
  focusGoals = false,
}) => {
  const [book, setBook] = useState<Livro | null>(null)
  const [anotacoes, setAnotacoes] = useState<LivroAnotacao[]>([])
  const [historico, setHistorico] = useState<LeituraHistorico[]>([])
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const navigate = useNavigate()
  const [goalModalOpen, setGoalModalOpen] = useState(false)
  const [noteModalOpen, setNoteModalOpen] = useState(false)
  const [deleteBookDialogOpen, setDeleteBookDialogOpen] = useState(false)
  const [bookTasks, setBookTasks] = useState<Task[]>([])

  // Estado para anotação em edição/criação
  const [editingNote, setEditingNote] = useState<LivroAnotacao | null>(null)
  const [noteText, setNoteText] = useState('')
  const [notePage, setNotePage] = useState('')

  // 5.1 Check-in diário e 5.2 Cronômetro
  const [dayCheckin, setDayCheckin] = useState<{ isDone: boolean; isManual: boolean }>({
    isDone: false,
    isManual: false,
  })
  const [timerModalOpen, setTimerModalOpen] = useState(false)

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
    const chk = await leituraRepository.getDayCheckinStatus()
    setDayCheckin(chk)
  }, [bookId, onBack])

  // Celebração da Parte 6
  const [celebrationOpen, setCelebrationOpen] = useState(false)
  const [celebrationStreak, setCelebrationStreak] = useState(1)
  const [celebrationMedal, setCelebrationMedal] = useState<any>(null)

  const triggerCelebrationIfEligible = async () => {
    try {
      const today = getTodayDateKey()
      if (celebrationService.hasCelebratedToday('leitura', today)) return
      const s = settingsRepository.getSettings()
      if (s.reminders && s.reminders.celebrationsEnabled === false) return

      const { moduleDaysRepository } = await import('@/lib/repositories/moduleDaysRepository')
      const streak = await moduleDaysRepository.calculateModuleStreak('leitura', today)
      const dailyMedal = await medalsRepository.getByKeyAndDate('daily_goal_leitura', today)

      celebrationService.markCelebratedToday('leitura', today)
      setCelebrationStreak(streak || 1)
      setCelebrationMedal(dailyMedal || null)
      setCelebrationOpen(true)
    } catch {
      /* intentionally ignored */
    }
  }

  const handleToggleManualCheckin = async () => {
    const nextState = !dayCheckin.isDone
    await leituraRepository.setManualCheckin(getTodayDateKey(), nextState)
    toast({
      title: nextState ? 'Leitura de hoje concluída! ✓' : 'Check-in desfeito',
      description: nextState
        ? 'Marcada como feita via check-in manual.'
        : 'O estado do dia foi recalculado.',
    })
    if (nextState) {
      triggerCelebrationIfEligible()
    }
    await loadData()
    onUpdated()
  }

  const handleStartTimer = async () => {
    if (!book) return
    const g = getBookGoalForDate(book, getTodayDateKey())
    await readingTimerService.startTimer({
      bookId: book.id,
      bookTitle: book.title,
      targetMinutes: g?.dailyMinutes,
    })
    setTimerModalOpen(true)
  }

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    if (focusGoals && book) {
      const timer = setTimeout(() => {
        const el = document.getElementById('book-goals-section')
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [focusGoals, book])

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

  const handleSaveGoal = async (meta?: LivroMeta) => {
    await leituraRepository.updateLivroMeta(bookId, meta)
    toast({
      title: meta ? 'Meta atualizada!' : 'Meta removida',
      description: meta
        ? 'As metas deste livro foram salvas com sucesso.'
        : 'O livro agora opera sem metas de leitura.',
    })
    await loadData()
    onUpdated()
  }

  if (!book) return null

  const progressPercent = book.totalPages
    ? Math.min(100, Math.round((book.currentPage / book.totalPages) * 100))
    : 0

  // Progresso de hoje, semana e mês deste livro específico
  const todayStr = getTodayDateKey()
  const sevenDaysAgoStr = getDaysAgoKey(6)
  const thirtyDaysAgoStr = getDaysAgoKey(29)

  const todayEntries = historico.filter((h) => h.dateRead === todayStr)
  const weekEntries = historico.filter(
    (h) => h.dateRead >= sevenDaysAgoStr && h.dateRead <= todayStr,
  )
  const monthEntries = historico.filter(
    (h) => h.dateRead >= thirtyDaysAgoStr && h.dateRead <= todayStr,
  )

  const todayBookPages = todayEntries.reduce((s, h) => s + (h.pagesAdded || 0), 0)
  const todayBookMinutes = todayEntries.reduce((s, h) => s + (h.minutes || 0), 0)
  const weekBookPages = weekEntries.reduce((s, h) => s + (h.pagesAdded || 0), 0)
  const weekBookMinutes = weekEntries.reduce((s, h) => s + (h.minutes || 0), 0)
  const monthBookPages = monthEntries.reduce((s, h) => s + (h.pagesAdded || 0), 0)
  const monthBookMinutes = monthEntries.reduce((s, h) => s + (h.minutes || 0), 0)

  const goal = book.goal
  const hasGoal = Boolean(
    goal &&
    (goal.dailyPages ||
      goal.dailyMinutes ||
      goal.weeklyPages ||
      goal.weeklyMinutes ||
      goal.monthlyPages ||
      goal.monthlyMinutes ||
      goal.targetDate),
  )

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
          <div className="pt-2 flex flex-wrap gap-2.5">
            <Button
              onClick={() => setQuickAddOpen(true)}
              className="flex-1 sm:flex-initial min-h-[44px] px-6 rounded-xl bg-[#34BEAA] hover:bg-[#34BEAA]/90 text-white font-semibold text-sm shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" /> Registrar leitura hoje
            </Button>
            <Button
              onClick={handleStartTimer}
              variant="outline"
              className="flex-1 sm:flex-initial min-h-[44px] px-5 rounded-xl border-[#34BEAA]/40 text-[#1F7F6E] dark:text-[#34BEAA] hover:bg-[#34BEAA]/10 font-bold text-sm shadow-xs flex items-center justify-center gap-2"
            >
              <Clock className="w-4 h-4" /> Iniciar leitura
            </Button>
          </div>
        </div>
      </div>

      {/* 5.1: CONTROLE DE ESTADO DE HOJE DO LIVRO */}
      <div className="p-4 rounded-2xl bg-card border border-border shadow-subtle flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Hoje:
          </span>
          <span
            className={cn(
              'text-[11px] font-bold px-2.5 py-0.5 rounded-full',
              dayCheckin.isDone
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                : 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
            )}
          >
            {dayCheckin.isDone ? 'Feito ✓' : 'Pendente'}
          </span>
          {dayCheckin.isManual && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
              Check-in manual
            </span>
          )}
        </div>

        {dayCheckin.isDone ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleManualCheckin}
            className="text-xs h-8 text-muted-foreground hover:text-foreground"
          >
            Desfazer
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleManualCheckin}
            className="text-xs h-8 rounded-xl border-[#34BEAA]/40 text-[#34BEAA] hover:bg-[#34BEAA]/10 font-semibold"
          >
            Marcar leitura de hoje como feita
          </Button>
        )}
      </div>

      {/* SEÇÃO: PROGRESSO DAS METAS DESTE LIVRO (SEMANAL E MENSAL POR LIVRO) */}
      <div
        id="book-goals-section"
        className={`p-4 rounded-2xl bg-card border shadow-subtle space-y-3 transition-all duration-700 ${
          focusGoals ? 'border-[#34BEAA] ring-2 ring-[#34BEAA]/40 shadow-md' : 'border-border'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-[#34BEAA]" />
            <h3 className="text-sm font-bold text-foreground">Metas e Progresso do Livro</h3>
            <span
              className={cn(
                'text-[10px] font-bold px-2 py-0.5 rounded-full ml-1',
                dayCheckin.isDone
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                  : 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
              )}
            >
              {dayCheckin.isDone ? 'Feito' : 'Pendente'}
            </span>
          </div>
          {hasGoal && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setGoalModalOpen(true)}
              className="text-xs h-8 text-[#34BEAA] hover:bg-[#34BEAA]/10 font-semibold"
            >
              Editar meta
            </Button>
          )}
        </div>

        {hasGoal ? (
          <div className="space-y-3">
            {/* Cards de progresso do livro: Hoje, Semana, Mês */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              {/* Hoje */}
              <div className="p-3 rounded-xl bg-muted/30 border border-border space-y-1.5">
                <div className="flex items-center justify-between text-muted-foreground font-medium">
                  <span>Hoje</span>
                  {goal?.dailyPages && (
                    <span className="font-bold text-[#34BEAA]">
                      {Math.round((todayBookPages / goal.dailyPages) * 100)}%
                    </span>
                  )}
                </div>
                <div className="font-bold text-foreground">
                  {todayBookPages}
                  {goal?.dailyPages ? ` / ${goal.dailyPages} pág.` : ' pág.'}
                </div>
                {goal?.dailyMinutes && (
                  <div className="text-[11px] text-muted-foreground">
                    {todayBookMinutes} / {goal.dailyMinutes} min
                  </div>
                )}
                {goal?.dailyPages && (
                  <Progress
                    value={Math.min(100, (todayBookPages / goal.dailyPages) * 100)}
                    className="h-1.5 bg-muted [&>div]:bg-[#34BEAA] rounded-full mt-1"
                  />
                )}
              </div>

              {/* Semana */}
              <div className="p-3 rounded-xl bg-muted/30 border border-border space-y-1.5">
                <div className="flex items-center justify-between text-muted-foreground font-medium">
                  <span>Semana (7 dias)</span>
                  {goal?.weeklyPages && (
                    <span className="font-bold text-[#34BEAA]">
                      {Math.round((weekBookPages / goal.weeklyPages) * 100)}%
                    </span>
                  )}
                </div>
                <div className="font-bold text-foreground">
                  {weekBookPages}
                  {goal?.weeklyPages ? ` / ${goal.weeklyPages} pág.` : ' pág.'}
                </div>
                {goal?.weeklyMinutes && (
                  <div className="text-[11px] text-muted-foreground">
                    {weekBookMinutes} / {goal.weeklyMinutes} min
                  </div>
                )}
                {goal?.weeklyPages && (
                  <Progress
                    value={Math.min(100, (weekBookPages / goal.weeklyPages) * 100)}
                    className="h-1.5 bg-muted [&>div]:bg-[#34BEAA] rounded-full mt-1"
                  />
                )}
              </div>

              {/* Mês */}
              <div className="p-3 rounded-xl bg-muted/30 border border-border space-y-1.5">
                <div className="flex items-center justify-between text-muted-foreground font-medium">
                  <span>Mês (30 dias)</span>
                  {goal?.monthlyPages && (
                    <span className="font-bold text-[#34BEAA]">
                      {Math.round((monthBookPages / goal.monthlyPages) * 100)}%
                    </span>
                  )}
                </div>
                <div className="font-bold text-foreground">
                  {monthBookPages}
                  {goal?.monthlyPages ? ` / ${goal.monthlyPages} pág.` : ' pág.'}
                </div>
                {goal?.monthlyMinutes && (
                  <div className="text-[11px] text-muted-foreground">
                    {monthBookMinutes} / {goal.monthlyMinutes} min
                  </div>
                )}
                {goal?.monthlyPages && (
                  <Progress
                    value={Math.min(100, (monthBookPages / goal.monthlyPages) * 100)}
                    className="h-1.5 bg-muted [&>div]:bg-[#34BEAA] rounded-full mt-1"
                  />
                )}
              </div>
            </div>

            {/* Data-alvo do livro */}
            {goal?.targetDate && (
              <div className="p-2.5 rounded-xl bg-[#34BEAA]/10 border border-[#34BEAA]/20 flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-foreground font-medium">
                  <Calendar className="w-3.5 h-3.5 text-[#34BEAA]" /> Terminar até:{' '}
                  {new Date(goal.targetDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                </span>
                {book.totalPages && book.totalPages > book.currentPage && (
                  <span className="text-[11px] text-muted-foreground font-medium">
                    Restam {book.totalPages - book.currentPage} páginas
                  </span>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-muted/20 border border-dashed border-border text-center space-y-2">
            <p className="text-xs text-muted-foreground">
              Nenhuma meta definida para este livro. Você pode ler no seu ritmo ou estipular metas
              diárias, semanais, mensais e data-alvo.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setGoalModalOpen(true)}
              className="text-xs h-8 rounded-lg border-[#34BEAA]/40 text-[#34BEAA] hover:bg-[#34BEAA]/10"
            >
              Definir meta para este livro
            </Button>
          </div>
        )}
      </div>

      {/* SEÇÃO: TAREFAS DESTE LIVRO */}
      {(() => {
        const pendingTasks = bookTasks.filter((t) => t.status === 'open')
        const displayedTasks = bookTasks.slice(0, 3)

        return (
          <div className="space-y-3 p-4 rounded-2xl bg-card border border-border shadow-subtle">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ListTodo className="w-4 h-4 text-[#1F7F6E]" />
                <h3 className="text-base font-bold text-foreground">Tarefas deste livro</h3>
                {pendingTasks.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#D6EEE9] text-[#1F7F6E]">
                    {pendingTasks.length} pendente{pendingTasks.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  localStorage.setItem('rotina_tarefas_module_filter', 'leitura')
                  navigate('/tarefas')
                }}
                className="text-xs font-semibold text-[#1F7F6E] hover:underline"
              >
                Ver todas
              </button>
            </div>

            {displayedTasks.length > 0 ? (
              <div className="space-y-2">
                {displayedTasks.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => openTaskModal({ taskId: t.id })}
                    className="p-2.5 rounded-xl border border-border/70 flex items-center justify-between gap-2 hover:bg-muted/30 cursor-pointer"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.stopPropagation()
                          await taskRepository.toggleTaskStatus(t.id)
                          loadData()
                        }}
                        className="w-5 h-5 rounded-full border-2 border-[#1F7F6E] flex items-center justify-center shrink-0"
                      >
                        {t.status === 'done' && <Check className="w-3 h-3 text-[#1F7F6E]" />}
                      </button>
                      <span
                        className={`text-xs font-medium truncate ${
                          t.status === 'done'
                            ? 'line-through text-muted-foreground'
                            : 'text-foreground'
                        }`}
                      >
                        {t.title}
                      </span>
                    </div>
                    {t.dueDate && (
                      <span className="text-[10px] text-muted-foreground shrink-0 font-medium">
                        {t.dueDate}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-2">
                Nenhuma tarefa vinculada a este livro.
              </p>
            )}

            <button
              type="button"
              onClick={() =>
                openTaskModal({
                  module: 'leitura',
                  link: { type: 'book', id: book.id },
                })
              }
              className="w-full h-10 rounded-xl border border-dashed border-[#1F7F6E]/40 hover:border-[#1F7F6E] text-xs font-bold text-[#1F7F6E] flex items-center justify-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Tarefa para este livro
            </button>
          </div>
        )
      })()}

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

      {/* SEÇÃO: TAREFAS VINCULADAS A ESTE LIVRO */}
      <div className="space-y-3 pt-2">
        <ModuleTasksView
          module="leitura"
          contextLink={{ type: 'book', id: book.id }}
          contextTitle={book.title}
        />
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
                className="p-3 rounded-xl bg-card border border-border flex items-center justify-between text-xs shadow-subtle gap-2"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    {h.pagesAdded > 0 && (
                      <span className="font-semibold text-foreground">+{h.pagesAdded} páginas</span>
                    )}
                    {h.minutes !== undefined && h.minutes > 0 && (
                      <span className="text-[11px] text-[#34BEAA] font-bold">
                        ({h.minutes} min)
                      </span>
                    )}
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
                  className="h-8 text-[11px] text-destructive hover:bg-destructive/10 shrink-0"
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
        onSaved={() => {
          loadData()
          onUpdated()
        }}
      />

      {/* MODAL DO CRONÔMETRO DE LEITURA */}
      <ReadingTimerModal
        open={timerModalOpen}
        onClose={() => setTimerModalOpen(false)}
        onFinished={() => {
          triggerCelebrationIfEligible()
          loadData()
          onUpdated()
        }}
      />

      {/* OVERLAY DE CELEBRAÇÃO (PARTE 6.2) */}
      <CelebrationOverlay
        open={celebrationOpen}
        onClose={() => setCelebrationOpen(false)}
        streakDays={celebrationStreak}
        moduleName="Leitura"
        earnedMedal={celebrationMedal}
      />

      {/* MODAL DE EDIÇÃO DE META DESTE LIVRO */}
      <EditBookGoalModal
        open={goalModalOpen}
        onClose={() => setGoalModalOpen(false)}
        bookTitle={book.title}
        totalPages={book.totalPages}
        currentPage={book.currentPage}
        currentGoal={book.goal}
        onSave={handleSaveGoal}
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
