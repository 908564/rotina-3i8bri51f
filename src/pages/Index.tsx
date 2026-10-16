import React, { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CalendarCheck,
  Dumbbell,
  BookOpen,
  PenLine,
  ChevronRight,
  Flame,
  Plus,
  Sparkles,
  CheckCircle2,
  Coffee,
  RotateCcw,
  Target,
} from 'lucide-react'
import { useApp } from '@/lib/context'
import { hojeRepository, TodayOverview } from '@/lib/repositories/hojeRepository'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { QuickAddPagesModal } from '@/components/QuickAddPagesModal'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'

export default function Index() {
  const { settings, updateSettings, loadSamples, dataVersion, notifyDataChanged } = useApp()
  const [overview, setOverview] = useState<TodayOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [readingDetailOpen, setReadingDetailOpen] = useState(false)
  const [selectBookForGoalOpen, setSelectBookForGoalOpen] = useState(false)
  const [readingBooks, setReadingBooks] = useState<
    { id: string; title: string; author: string; coverPhoto?: string }[]
  >([])
  const navigate = useNavigate()
  const { toast } = useToast()

  const loadData = async () => {
    try {
      const data = await hojeRepository.getTodayOverview()
      setOverview(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [dataVersion, settings.activeModules])

  // Saudação e data formatada por extenso em português
  const { greeting, formattedDate } = useMemo(() => {
    const now = new Date()
    const hour = now.getHours()
    let g = 'Bom dia'
    if (hour >= 12 && hour < 18) g = 'Boa tarde'
    else if (hour >= 18 || hour < 5) g = 'Boa noite'

    const formatter = new Intl.DateTimeFormat('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
    const d = formatter.format(now)
    // Capitaliza primeira letra do dia da semana
    const formatted = d.charAt(0).toUpperCase() + d.slice(1)

    return { greeting: g, formattedDate: formatted }
  }, [])

  const handleOpenSetGoal = async () => {
    try {
      const { leituraRepository } = await import('@/lib/repositories/leituraRepository')
      const allBooks = await leituraRepository.getLivros()
      const lendoBooks = allBooks.filter((b) => b.status === 'lendo')

      if (lendoBooks.length === 0) {
        // Se nenhum livro está "lendo", verifica se há algum livro na biblioteca
        if (allBooks.length === 1) {
          navigate(`/leitura?book=${allBooks[0].id}&focus=goals`)
        } else if (allBooks.length > 1) {
          setReadingBooks(allBooks)
          setSelectBookForGoalOpen(true)
        } else {
          navigate('/leitura')
        }
      } else if (lendoBooks.length === 1) {
        // Se há exatamente 1 livro "lendo", vai direto
        navigate(`/leitura?book=${lendoBooks[0].id}&focus=goals`)
      } else {
        // Se houver mais de um livro "lendo", abre o seletor
        setReadingBooks(lendoBooks)
        setSelectBookForGoalOpen(true)
      }
    } catch {
      navigate('/leitura')
    }
  }

  const handleSelectBookForGoal = (bookId: string) => {
    setSelectBookForGoalOpen(false)
    navigate(`/leitura?book=${bookId}&focus=goals`)
  }

  const handleDismissWelcome = () => {
    updateSettings({ hasSeenOnboarding: true })
  }

  const handleLoadSamples = async () => {
    try {
      await loadSamples()
      toast({
        title: 'Dados de exemplo carregados!',
        description: 'Seus treinos, leituras e anotações já estão prontos para explorar.',
      })
    } catch {
      toast({
        title: 'Erro ao carregar exemplos',
        variant: 'destructive',
      })
    }
  }

  const { activeModules } = settings

  return (
    <div className="pt-4 pb-12 animate-fade-in space-y-6">
      {/* 1. HERO DE BOAS-VINDAS (aparece no primeiro acesso se não viu onboarding) */}
      {!settings.hasSeenOnboarding && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#F59E4C]/20 via-[#F59E4C]/10 to-transparent border border-[#F59E4C]/30 p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#F59E4C] text-white flex items-center justify-center shadow-md shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="space-y-1.5 flex-1">
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                Boas-vindas ao Rotina!
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Seu aplicativo de produtividade pessoal offline. Organize sua escrita diária, meta
                de leitura e treinos em um só lugar.
              </p>
              <div className="flex flex-wrap gap-2 pt-3">
                <Button
                  onClick={handleLoadSamples}
                  className="bg-[#F59E4C] hover:bg-[#F59E4C]/90 text-white font-medium text-xs h-10 px-4 rounded-xl shadow-sm"
                >
                  Carregar dados de exemplo
                </Button>
                <Button
                  onClick={handleDismissWelcome}
                  variant="outline"
                  className="text-xs h-10 px-4 rounded-xl border-border hover:bg-muted"
                >
                  Começar do zero
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. CABEÇALHO COM SAUDAÇÃO E DATA */}
      <header className="space-y-1">
        <p className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
          {formattedDate}
        </p>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          {greeting}
          {settings.userName ? `, ${settings.userName}` : ''}
        </h1>
      </header>

      {/* 3. BARRA DE PROGRESSO GERAL DO DIA */}
      {overview && (
        <Card className="rounded-2xl border-border bg-card/60 backdrop-blur-sm shadow-subtle p-4">
          <div className="flex items-center justify-between text-xs font-medium mb-2">
            <span className="flex items-center gap-1.5 text-foreground font-semibold">
              <CalendarCheck className="w-4 h-4 text-[#F59E4C]" />
              Progresso do dia
            </span>
            <span className="text-[#F59E4C] font-bold text-sm">
              {overview.overallProgressPercent}%
            </span>
          </div>
          <Progress
            value={overview.overallProgressPercent}
            className="h-2.5 bg-muted [&>div]:bg-[#F59E4C] [&>div]:transition-all [&>div]:duration-500 rounded-full"
          />
          <p className="text-[11px] text-muted-foreground mt-2">
            Metas ativas de hoje:{' '}
            {[
              activeModules.treino && 'Treino',
              activeModules.leitura && 'Leitura',
              activeModules.escrita && 'Escrita',
            ]
              .filter(Boolean)
              .join(' • ') || 'Nenhum módulo ativo'}
          </p>
        </Card>
      )}

      {/* 4. CARDS DOS MÓDULOS ATIVOS */}
      <div className="space-y-4">
        {/* CARD TREINO */}
        {activeModules.treino && overview && (
          <Card className="rounded-2xl border-border shadow-subtle overflow-hidden transition-all hover:border-[#F07B6A]/40">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#F07B6A]/15 text-[#F07B6A] flex items-center justify-center shrink-0">
                    <Dumbbell className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold leading-tight">Treino de Hoje</h3>
                    <p className="text-xs text-muted-foreground">
                      {overview.workout.plan?.workoutName ||
                        (overview.workout.isRestDay ? 'Descanso planejado' : 'Sem treino')}
                    </p>
                  </div>
                </div>

                {overview.workout.isCompleted && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#3D9C73] bg-[#3D9C73]/10 px-2.5 py-1 rounded-full">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Concluído
                  </span>
                )}
              </div>

              {overview.workout.isRestDay ? (
                <div className="rounded-xl bg-muted/40 p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Coffee className="w-4 h-4 text-[#F07B6A]" />
                    <span>Dia de descanso 🎉 Aproveite para recuperar energia!</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/treino')}
                    className="text-xs h-8 text-[#F07B6A] hover:bg-[#F07B6A]/10"
                  >
                    Ver semana
                  </Button>
                </div>
              ) : overview.workout.isCompleted ? (
                <div className="rounded-xl bg-[#3D9C73]/10 p-3.5 flex items-center justify-between">
                  <div className="text-xs text-foreground">
                    <p className="font-semibold text-[#3D9C73]">Treino concluído ✓</p>
                    <p className="text-muted-foreground text-[11px]">
                      {overview.workout.completedSetsCount} de {overview.workout.totalSetsCount}{' '}
                      séries realizadas
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/treino')}
                    className="text-xs h-8 rounded-lg gap-1 border-border"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Reabrir
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {overview.workout.plan?.exercises.length || 0} exercícios planejados
                    </span>
                    <span>
                      {overview.workout.completedSetsCount} / {overview.workout.totalSetsCount}{' '}
                      séries
                    </span>
                  </div>

                  <Progress
                    value={
                      overview.workout.totalSetsCount > 0
                        ? (overview.workout.completedSetsCount / overview.workout.totalSetsCount) *
                          100
                        : 0
                    }
                    className="h-2 bg-muted [&>div]:bg-[#F07B6A] rounded-full"
                  />

                  <Button
                    onClick={() => navigate('/treino')}
                    className="w-full min-h-[44px] rounded-xl bg-[#F07B6A] hover:bg-[#F07B6A]/90 text-white font-semibold text-sm shadow-sm active:scale-98 transition-all flex items-center justify-center gap-2"
                  >
                    <Dumbbell className="w-4 h-4" />
                    Registrar treino
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* CARD LEITURA */}
        {activeModules.leitura && overview && (
          <Card className="rounded-2xl border-border shadow-subtle overflow-hidden transition-all hover:border-[#34BEAA]/40">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div
                  className="flex items-center gap-2.5 cursor-pointer flex-1"
                  onClick={() => setReadingDetailOpen(true)}
                >
                  <div className="w-9 h-9 rounded-xl bg-[#34BEAA]/15 text-[#34BEAA] flex items-center justify-center shrink-0">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold leading-tight">Meta de Leitura de Hoje</h3>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {overview.reading.goals.booksProgress.length > 0
                        ? `${overview.reading.goals.booksProgress.length} ${
                            overview.reading.goals.booksProgress.length === 1
                              ? 'livro em andamento'
                              : 'livros em andamento'
                          }`
                        : overview.reading.activeBook
                          ? overview.reading.activeBook.title
                          : 'Nenhum livro em andamento'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {overview.reading.goals.streak > 0 && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#F59E4C] bg-[#F59E4C]/10 px-2 py-0.5 rounded-full">
                      <Flame className="w-3.5 h-3.5 fill-[#F59E4C]" />
                      {overview.reading.goals.streak} dias
                    </span>
                  )}
                </div>
              </div>

              {overview.reading.allBooksCount === 0 ? (
                <div className="rounded-xl bg-muted/40 p-4 text-center space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Você ainda não tem livros cadastrados.
                  </p>
                  <Button
                    onClick={() => navigate('/leitura')}
                    className="h-9 rounded-xl bg-[#34BEAA] text-white text-xs font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar livro
                  </Button>
                </div>
              ) : !overview.reading.goals.hasGoals ||
                (overview.reading.goals.dailyPagesTarget === 0 &&
                  overview.reading.goals.dailyMinutesTarget === 0) ? (
                /* CONVITE PARA DEFINIR META SE NENHUM LIVRO TIVER META DEFINIDA */
                <div className="space-y-3">
                  <div className="rounded-xl bg-muted/30 border border-dashed border-border/80 p-3.5 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                      <Target className="w-4 h-4 text-[#34BEAA]" />
                      <span>Nenhuma meta de leitura definida</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Defina metas diárias personalizadas nos seus livros para acompanhar seu
                      progresso e construir uma sequência.
                    </p>
                    <div className="pt-1">
                      <Button
                        variant="link"
                        size="sm"
                        onClick={handleOpenSetGoal}
                        className="p-0 h-auto text-xs text-[#34BEAA] font-semibold hover:underline"
                      >
                        Definir meta em um livro →
                      </Button>
                    </div>
                  </div>

                  {/* Resumo do que já foi lido hoje mesmo sem meta */}
                  {(overview.reading.goals.todayPages > 0 ||
                    overview.reading.goals.todayMinutes > 0) && (
                    <div className="text-xs text-muted-foreground flex items-center justify-between px-1">
                      <span>Lido hoje:</span>
                      <span className="font-semibold text-foreground">
                        {overview.reading.goals.todayPages > 0 &&
                          `${overview.reading.goals.todayPages} páginas`}
                        {overview.reading.goals.todayPages > 0 &&
                          overview.reading.goals.todayMinutes > 0 &&
                          ' e '}
                        {overview.reading.goals.todayMinutes > 0 &&
                          `${overview.reading.goals.todayMinutes} min`}
                      </span>
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <Button
                      onClick={() => setQuickAddOpen(true)}
                      className="flex-1 min-h-[44px] rounded-xl bg-[#34BEAA] hover:bg-[#34BEAA]/90 text-white font-semibold text-sm shadow-sm active:scale-98 transition-all flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />+ Páginas lidas hoje
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => navigate('/leitura')}
                      className="min-h-[44px] px-3.5 rounded-xl border-border hover:bg-muted"
                      aria-label="Abrir biblioteca"
                    >
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              ) : (
                /* SOMA DAS METAS DIÁRIAS DOS LIVROS COM META */
                <div className="space-y-3">
                  <div
                    onClick={() => setReadingDetailOpen(true)}
                    className="cursor-pointer space-y-1.5 group"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-foreground group-hover:text-[#34BEAA] transition-colors">
                        {overview.reading.goals.dailyPagesTarget > 0 && (
                          <span>
                            {overview.reading.goals.todayPages}/
                            {overview.reading.goals.dailyPagesTarget} páginas
                          </span>
                        )}
                        {overview.reading.goals.dailyPagesTarget > 0 &&
                          overview.reading.goals.dailyMinutesTarget > 0 && <span> e </span>}
                        {overview.reading.goals.dailyMinutesTarget > 0 && (
                          <span>
                            {overview.reading.goals.todayMinutes}/
                            {overview.reading.goals.dailyMinutesTarget} min
                          </span>
                        )}
                      </span>
                      <span className="text-[11px] text-[#34BEAA] font-medium flex items-center gap-0.5">
                        Ver detalhe <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>

                    {/* Barra de progresso baseada em páginas (ou minutos se só tiver minutos) */}
                    <Progress
                      value={
                        overview.reading.goals.dailyPagesTarget > 0
                          ? Math.min(
                              100,
                              (overview.reading.goals.todayPages /
                                overview.reading.goals.dailyPagesTarget) *
                                100,
                            )
                          : overview.reading.goals.dailyMinutesTarget > 0
                            ? Math.min(
                                100,
                                (overview.reading.goals.todayMinutes /
                                  overview.reading.goals.dailyMinutesTarget) *
                                  100,
                              )
                            : 0
                      }
                      className="h-2 bg-muted [&>div]:bg-[#34BEAA] rounded-full"
                    />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Button
                      onClick={() => setQuickAddOpen(true)}
                      className="flex-1 min-h-[44px] rounded-xl bg-[#34BEAA] hover:bg-[#34BEAA]/90 text-white font-semibold text-sm shadow-sm active:scale-98 transition-all flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />+ Páginas lidas hoje
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => navigate('/leitura')}
                      className="min-h-[44px] px-3.5 rounded-xl border-border hover:bg-muted"
                      aria-label="Abrir biblioteca"
                    >
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* CARD ESCRITA */}
        {activeModules.escrita && overview && (
          <Card className="rounded-2xl border-border shadow-subtle overflow-hidden transition-all hover:border-[#7C8CFF]/40">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#7C8CFF]/15 text-[#7C8CFF] flex items-center justify-center shrink-0">
                    <PenLine className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold leading-tight">Anotação de Hoje</h3>
                    <p className="text-xs text-muted-foreground">Diário pessoal</p>
                  </div>
                </div>

                {overview.writing.todayNote &&
                  overview.writing.todayNote.body.trim().length > 0 && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#7C8CFF] bg-[#7C8CFF]/10 px-2 py-0.5 rounded-full">
                      Escrito ✓
                    </span>
                  )}
              </div>

              {overview.writing.todayNote && overview.writing.todayNote.body.trim().length > 0 ? (
                <div
                  onClick={() => navigate('/escrita')}
                  className="rounded-xl bg-muted/40 p-3.5 cursor-pointer hover:bg-muted/70 transition-colors space-y-1"
                >
                  {overview.writing.todayNote.title && (
                    <p className="text-xs font-semibold text-foreground line-clamp-1">
                      {overview.writing.todayNote.title}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground line-clamp-2 italic leading-relaxed">
                    "{overview.writing.todayNote.body}"
                  </p>
                  <p className="text-[11px] text-[#7C8CFF] font-medium pt-1">Abrir anotação →</p>
                </div>
              ) : (
                <div className="rounded-xl bg-muted/30 p-3.5 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Nada escrito hoje ainda.</span>
                  <Button
                    onClick={() => navigate('/escrita')}
                    className="min-h-[44px] h-10 px-4 rounded-xl bg-[#7C8CFF] hover:bg-[#7C8CFF]/90 text-white font-semibold text-xs shadow-sm"
                  >
                    Escrever agora
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* QUICK ADD MODAL */}
      <QuickAddPagesModal
        open={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        onSaved={() => {
          loadData()
          notifyDataChanged()
        }}
      />

      {/* MODAL DE SELEÇÃO DE LIVRO PARA DEFINIR META */}
      <Dialog open={selectBookForGoalOpen} onOpenChange={setSelectBookForGoalOpen}>
        <DialogContent className="sm:max-w-md bg-card rounded-2xl p-6 border border-border">
          <DialogHeader className="text-left space-y-1">
            <div className="flex items-center gap-2 text-[#34BEAA]">
              <Target className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-wider">Definir Meta</span>
            </div>
            <DialogTitle className="text-lg font-bold">Escolha o livro</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 pt-2 max-h-[60vh] overflow-y-auto">
            <p className="text-xs text-muted-foreground mb-3">
              Selecione em qual dos seus livros em andamento você deseja definir uma meta:
            </p>
            {readingBooks.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => handleSelectBookForGoal(b.id)}
                className="w-full text-left p-3 rounded-xl bg-muted/40 hover:bg-muted/80 border border-border transition-all flex items-center justify-between gap-3 group active:scale-[0.99]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {b.coverPhoto ? (
                    <img
                      src={b.coverPhoto}
                      alt={b.title}
                      className="w-10 h-14 object-cover rounded-md border border-border shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-14 rounded-md bg-[#34BEAA]/20 text-[#34BEAA] flex items-center justify-center font-bold text-base shrink-0">
                      {b.title.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground line-clamp-1 group-hover:text-[#34BEAA] transition-colors">
                      {b.title}
                    </p>
                    <p className="text-[11px] text-muted-foreground line-clamp-1">{b.author}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 group-hover:text-foreground transition-colors" />
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL DE DETALHE POR LIVRO DO PROGRESSO DE HOJE */}
      <Dialog open={readingDetailOpen} onOpenChange={setReadingDetailOpen}>
        <DialogContent className="sm:max-w-md bg-card rounded-2xl p-6 border border-border max-h-[85vh] overflow-y-auto">
          <DialogHeader className="text-left space-y-1">
            <div className="flex items-center gap-2 text-[#34BEAA]">
              <BookOpen className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-wider">Leitura de Hoje</span>
            </div>
            <DialogTitle className="text-xl font-bold">Progresso por Livro</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            {overview?.reading.goals.booksProgress &&
            overview.reading.goals.booksProgress.length > 0 ? (
              overview.reading.goals.booksProgress.map((bp) => {
                const hasBookDailyGoal =
                  (bp.dailyPagesTarget && bp.dailyPagesTarget > 0) ||
                  (bp.dailyMinutesTarget && bp.dailyMinutesTarget > 0)

                return (
                  <div
                    key={bp.book.id}
                    onClick={() => {
                      setReadingDetailOpen(false)
                      navigate(`/leitura?book=${bp.book.id}`)
                    }}
                    className="p-3.5 rounded-xl bg-muted/30 border border-border hover:bg-muted/60 transition-colors cursor-pointer space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-bold text-foreground line-clamp-1">
                          {bp.book.title}
                        </h4>
                        <p className="text-[11px] text-muted-foreground">{bp.book.author}</p>
                      </div>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        pág. {bp.book.currentPage}
                        {bp.book.totalPages ? ` / ${bp.book.totalPages}` : ''}
                      </span>
                    </div>

                    {hasBookDailyGoal ? (
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-foreground">
                            {bp.dailyPagesTarget
                              ? `${bp.todayPages}/${bp.dailyPagesTarget} pág.`
                              : `${bp.todayPages} pág.`}
                            {bp.dailyMinutesTarget
                              ? ` • ${bp.todayMinutes}/${bp.dailyMinutesTarget} min`
                              : bp.todayMinutes > 0
                                ? ` • ${bp.todayMinutes} min`
                                : ''}
                          </span>
                          {bp.dailyPagesTarget && (
                            <span className="text-[#34BEAA] font-bold text-[11px]">
                              {Math.round((bp.todayPages / bp.dailyPagesTarget) * 100)}%
                            </span>
                          )}
                        </div>
                        {bp.dailyPagesTarget && (
                          <Progress
                            value={Math.min(100, (bp.todayPages / bp.dailyPagesTarget) * 100)}
                            className="h-1.5 bg-muted [&>div]:bg-[#34BEAA] rounded-full"
                          />
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                        <span>Lido hoje: {bp.todayPages} pág.</span>
                        <span className="text-[11px] text-[#34BEAA] font-medium">
                          Sem meta diária
                        </span>
                      </div>
                    )}
                  </div>
                )
              })
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">
                Nenhum livro em andamento no momento.
              </p>
            )}

            <div className="pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setReadingDetailOpen(false)
                  navigate('/leitura')
                }}
                className="w-full h-11 rounded-xl text-xs font-semibold"
              >
                Gerenciar Biblioteca e Metas
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
