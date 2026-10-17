import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Flame,
  Search,
  Sparkles,
  ChevronRight,
  Play,
  PenLine,
  BookOpen,
  Dumbbell,
  GraduationCap,
  Trophy,
  ArrowRight,
  Plus,
} from 'lucide-react'
import { useApp } from '@/lib/context'
import { hojeRepository, FastTodayData } from '@/lib/repositories/hojeRepository'
import { ProgressRing } from '@/components/ProgressRing'
import { leituraRepository } from '@/lib/repositories/leituraRepository'
import { getTodayDateKey } from '@/lib/dateUtils'
import { readingTimerService } from '@/lib/readingTimerService'
import { ReadingTimerModal } from '@/components/ReadingTimerModal'
import { FloatingReadingTimerChip } from '@/components/FloatingReadingTimerChip'
import { settingsRepository } from '@/lib/repositories/settingsRepository'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useAuth } from '@/lib/auth/AuthContext'
import { AuthModal } from '@/components/auth/AuthModal'
import { LocalDataMigrationModal } from '@/components/auth/LocalDataMigrationModal'
import { QuickPagesSheet } from '@/components/quick/QuickPagesSheet'
import { QuickStudySheet } from '@/components/quick/QuickStudySheet'
import { QuickWorkoutSheet } from '@/components/quick/QuickWorkoutSheet'
import { QuickAchievementSheet } from '@/components/quick/QuickAchievementSheet'
import { SearchNotesModal } from '@/components/SearchNotesModal'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'

export default function Index() {
  const { settings, updateSettings, loadSamples, dataVersion, notifyDataChanged } = useApp()
  const [data, setData] = useState<FastTodayData | null>(null)
  const [loading, setLoading] = useState(true)

  // Auth & Sincronização na nuvem
  const { user } = useAuth()
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [migrationModalOpen, setMigrationModalOpen] = useState(false)

  useEffect(() => {
    // Se o usuário acabou de logar e ainda não dispensou a migração
    if (user && !localStorage.getItem(`rotina_migration_prompted_${user.id}`)) {
      setMigrationModalOpen(true)
    }
  }, [user])

  // Sheets
  const [quickPagesOpen, setQuickPagesOpen] = useState(false)
  const [quickStudyOpen, setQuickStudyOpen] = useState(false)
  const [quickWorkoutOpen, setQuickWorkoutOpen] = useState(false)
  const [quickAchievementOpen, setQuickAchievementOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  // 5.1 & 5.2: Leitura no Hoje
  const [readingTimerOpen, setReadingTimerOpen] = useState(false)
  const [leituraCheckin, setLeituraCheckin] = useState<{ isDone: boolean; isManual: boolean }>({
    isDone: false,
    isManual: false,
  })
  const [selectBookForTimerOpen, setSelectBookForTimerOpen] = useState(false)
  const [readingBooksList, setReadingBooksList] = useState<any[]>([])

  // 6.4 Banner de Lembretes pendentes no Hoje
  const [reminderBanner, setReminderBanner] = useState<{
    title: string
    message: string
    path: string
  } | null>(null)

  const navigate = useNavigate()
  const { toast } = useToast()

  const refreshData = useCallback(async () => {
    try {
      const [res, chk, rBooks] = await Promise.all([
        hojeRepository.getFastTodayData(),
        leituraRepository.getDayCheckinStatus(),
        leituraRepository.getReadingBooks(),
      ])
      setData(res)
      setLeituraCheckin(chk)
      setReadingBooksList(rBooks)

      // 6.4 Banner de Lembretes pendentes no Hoje
      try {
        const s = settingsRepository.getSettings()
        const rem = s.reminders
        if (rem && rem.enabled) {
          const now = new Date()
          const currentMins = now.getHours() * 60 + now.getMinutes()
          const parseTimeMins = (t: string) => {
            const [h, m] = (t || '').split(':').map(Number)
            return (h || 0) * 60 + (m || 0)
          }

          let pendingBanner: { title: string; message: string; path: string } | null = null

          if (
            rem.leitura.enabled &&
            !chk.isDone &&
            currentMins >= parseTimeMins(rem.leitura.time)
          ) {
            pendingBanner = {
              title: 'Lembrete de Leitura 📖',
              message:
                'Sua meta diária de leitura ainda está pendente hoje. Reserve um tempo para ler!',
              path: '/leitura',
            }
          } else if (rem.treino.enabled && currentMins >= parseTimeMins(rem.treino.time)) {
            const trCard = res.goals.treino
            if (trCard && trCard.hasGoalToday && trCard.progressPercent < 100) {
              pendingBanner = {
                title: 'Lembrete de Treino 💪',
                message: 'Não se esqueça do seu treino planejado para hoje!',
                path: '/treino',
              }
            }
          } else if (rem.escrita.enabled && currentMins >= parseTimeMins(rem.escrita.time)) {
            const escCard = res.goals.escrita
            if (escCard && escCard.hasGoalToday && escCard.progressPercent < 100) {
              pendingBanner = {
                title: 'Lembrete de Escrita ✍️',
                message: 'Como foi seu dia? Registre suas reflexões e pensamentos no diário.',
                path: '/escrita?focus=1',
              }
            }
          }

          setReminderBanner(pendingBanner)
        }
      } catch {
        /* intentionally ignored */
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const handleToggleLeituraManual = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const next = !leituraCheckin.isDone
    await leituraRepository.setManualCheckin(getTodayDateKey(), next)
    toast({
      title: next ? 'Leitura concluída! ✓' : 'Check-in desfeito',
      description: next ? 'Check-in manual registrado.' : 'Progresso recalculado.',
    })
    refreshData()
  }

  const handleStartReadingTimer = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (readingBooksList.length === 0) {
      navigate('/leitura')
    } else if (readingBooksList.length === 1) {
      const b = readingBooksList[0]
      readingTimerService.startTimer({
        bookId: b.id,
        bookTitle: b.title,
        targetMinutes: b.goal?.dailyMinutes,
      })
      setReadingTimerOpen(true)
    } else {
      setSelectBookForTimerOpen(true)
    }
  }

  const handleChooseBookToRead = (book: any) => {
    readingTimerService.startTimer({
      bookId: book.id,
      bookTitle: book.title,
      targetMinutes: book.goal?.dailyMinutes,
    })
    setSelectBookForTimerOpen(false)
    setReadingTimerOpen(true)
  }

  useEffect(() => {
    refreshData()
  }, [refreshData, dataVersion, settings.activeModules])

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
    const d = formatter.format(now).toUpperCase()

    return { greeting: g, formattedDate: d }
  }, [])

  const handleDismissWelcome = () => {
    updateSettings({ firstTimeWelcomeDismissed: true, hasSeenOnboarding: true })
  }

  const handleLoadSamples = async () => {
    try {
      await loadSamples()
      updateSettings({ firstTimeWelcomeDismissed: true, hasSeenOnboarding: true })
      toast({
        title: 'Dados de exemplo carregados! 🎉',
        description: 'Seus treinos, leituras e anotações já estão prontos.',
      })
      refreshData()
      notifyDataChanged()
    } catch {
      toast({
        title: 'Erro ao carregar exemplos',
        variant: 'destructive',
      })
    }
  }

  const handleQuickSuccess = (msg: string) => {
    toast({
      title: msg,
    })
    refreshData()
    notifyDataChanged()
  }

  // Ação do card "PRÓXIMO PASSO"
  const handleNextStepAction = () => {
    if (!data) return
    const { nextStep } = data

    if (nextStep.type === 'treino') {
      navigate('/treino')
    } else if (nextStep.type === 'leitura') {
      setQuickPagesOpen(true)
    } else if (nextStep.type === 'estudos') {
      setQuickStudyOpen(true)
    } else if (nextStep.type === 'escrita') {
      navigate('/escrita?focus=1')
    } else if (nextStep.type === 'all_completed') {
      navigate('/resumo')
    } else if (nextStep.type === 'setup_routine') {
      // Abre o primeiro módulo ativo para montar rotina
      if (settings.activeModules.leitura) navigate('/leitura')
      else if (settings.activeModules.treino) navigate('/treino')
      else if (settings.activeModules.estudos) navigate('/estudos')
      else navigate('/mais')
    }
  }

  const activeModules = settings.activeModules

  // Filtra cartões de metas ativos
  const activeGoalCards = useMemo(() => {
    if (!data) return []
    const cards = []
    if (activeModules.treino && data.goals.treino) cards.push(data.goals.treino)
    if (activeModules.leitura && data.goals.leitura) cards.push(data.goals.leitura)
    if (activeModules.escrita && data.goals.escrita) cards.push(data.goals.escrita)
    if (activeModules.estudos && data.goals.estudos) cards.push(data.goals.estudos)
    return cards
  }, [data, activeModules])

  return (
    <div className="pt-2 pb-16 animate-fade-in space-y-6 max-w-[1100px] mx-auto">
      {/* 1. HERO DE BOAS-VINDAS (somente se não foi dispensado) */}
      {!settings.firstTimeWelcomeDismissed && !settings.hasSeenOnboarding && (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#E8883A]/20 via-[#E8883A]/10 to-card border border-[#E8883A]/30 p-5 sm:p-6 shadow-subtle">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#E8883A] text-white flex items-center justify-center shadow-md shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="space-y-1.5 flex-1">
              <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-foreground">
                Boas-vindas ao Rotina!
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Organize seu dia em 2 segundos: veja como está o seu progresso, saiba o que fazer
                agora e registre em 1 toque.
              </p>
              <div className="flex flex-wrap gap-2 pt-3">
                <Button
                  onClick={handleLoadSamples}
                  className="bg-[#E8883A] hover:bg-[#D5792F] text-white font-bold text-xs h-10 px-4 rounded-xl shadow-subtle"
                >
                  Carregar dados de exemplo
                </Button>
                <Button
                  onClick={handleDismissWelcome}
                  variant="outline"
                  className="text-xs h-10 px-4 rounded-xl border-border hover:bg-muted font-semibold"
                >
                  Começar do zero
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6.4 BANNER DE LEMBRETE DO HOJE (QUANDO HORÁRIO PASSOU E META PENDENTE) */}
      {reminderBanner && (
        <div className="p-4 rounded-2xl bg-[#E8883A]/10 border border-[#E8883A]/30 flex items-start justify-between gap-3 animate-fade-in">
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-[#B4540F] dark:text-[#E8883A]">
              {reminderBanner.title}
            </h4>
            <p className="text-xs text-foreground/80">{reminderBanner.message}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              size="sm"
              onClick={() => navigate(reminderBanner.path)}
              className="h-8 text-xs font-bold rounded-xl bg-[#E8883A] hover:bg-[#E8883A]/90 text-white"
            >
              Abrir
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setReminderBanner(null)}
              className="h-8 w-8 p-0 rounded-full text-muted-foreground hover:text-foreground"
            >
              ✕
            </Button>
          </div>
        </div>
      )}

      {/* 2. CABEÇALHO */}
      {/* data por extenso em caixa alta pequena, saudação grande e botão circular de busca (44px) */}
      <header className="flex items-center justify-between gap-4">
        <div className="space-y-0.5">
          <p className="text-[11px] font-bold tracking-wider text-muted-foreground">
            {formattedDate}
          </p>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            {greeting}
            {settings.userName ? `, ${settings.userName}` : ''}
          </h1>
        </div>

        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          aria-label="Buscar nas anotações"
          className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-card hover:bg-muted border border-border shadow-subtle flex items-center justify-center text-foreground transition-all active:scale-95 shrink-0 focus-visible:ring-2 focus-visible:ring-[#E8883A]"
        >
          <Search className="w-5 h-5 text-foreground" />
        </button>
      </header>

      {/* LAYOUT PRINCIPAL: 1 coluna no mobile (<768px), 2 colunas no tablet (≥768px) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* COLUNA ESQUERDA (NO TABLET) / PRIMEIRO BLOCO (NO MOBILE) */}
        <div className="md:col-span-6 space-y-6">
          {/* CARD "SEU DIA" (branco, borda fina #EAE4DB, cantos 24px) */}
          <div className="rounded-[24px] bg-card border border-[#EAE4DB] dark:border-border p-5 sm:p-6 shadow-subtle space-y-6">
            <div className="flex items-center gap-5">
              {/* Anel de progresso com N/M no centro e metas embaixo */}
              <ProgressRing
                completed={data?.goalsDone || 0}
                total={data?.goalsTotal || 0}
                size={110}
                strokeWidth={10}
              />

              {/* Ao lado do anel: pílula de sequência, título, frase de apoio e link Ver resumo */}
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#E8883A]/10 border border-[#E8883A]/20 text-[#E8883A] text-xs font-bold">
                    <Flame className="w-3.5 h-3.5 fill-[#E8883A]" />
                    <span>
                      {data?.streak || 0} {data?.streak === 1 ? 'dia seguido' : 'dias seguidos'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/resumo')}
                    className="text-[11px] font-semibold text-[#B4540F] dark:text-[#E8883A] hover:underline"
                  >
                    Ver resumo da semana
                  </button>
                </div>

                <h3 className="text-base sm:text-lg font-bold text-foreground leading-snug">
                  {data?.headlineTitle || 'Seu dia'}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {data?.headlineSubtitle || 'Acompanhe suas metas de hoje.'}
                </p>
              </div>
            </div>

            {/* GRADE DE MINI-CARTÕES (Treino, Leitura, Escrita, Estudos) */}
            {activeGoalCards.length > 0 ? (
              <div
                className={`grid gap-3 ${
                  activeGoalCards.length === 3
                    ? 'grid-cols-2 [&>*:last-child]:col-span-2'
                    : 'grid-cols-2'
                }`}
              >
                {activeGoalCards.map((card) => {
                  let color = '#E8883A'
                  let textColor = '#B4540F'
                  let path = '/'

                  if (card.id === 'treino') {
                    color = '#E07A68'
                    textColor = '#B8503E'
                    path = '/treino'
                  } else if (card.id === 'leitura') {
                    color = '#4FB3A0'
                    textColor = '#1F7F6E'
                    path = '/leitura'
                  } else if (card.id === 'escrita') {
                    color = '#7B83E6'
                    textColor = '#4C54C2'
                    path = '/escrita'
                  } else if (card.id === 'estudos') {
                    color = '#8F6FD0'
                    textColor = '#6A4BB0'
                    path = '/estudos'
                  }

                  return (
                    <div
                      key={card.id}
                      onClick={() => navigate(path)}
                      className="p-3.5 rounded-2xl bg-muted/40 hover:bg-muted/70 border border-border text-left transition-all active:scale-[0.98] group flex flex-col justify-between min-h-[96px] cursor-pointer"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold block" style={{ color: textColor }}>
                            {card.name}
                          </span>
                          {/* 5.1 Estado Pendente / Feito no card Leitura */}
                          {card.id === 'leitura' && (
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                                leituraCheckin.isDone
                                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                  : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                              }`}
                            >
                              {leituraCheckin.isDone ? 'Feito ✓' : 'Pendente'}
                            </span>
                          )}
                        </div>
                        <div className="text-lg font-black text-foreground mt-0.5 tracking-tight">
                          {card.displayValue}
                        </div>
                      </div>

                      <div className="space-y-1.5 mt-2">
                        {/* Barra fina de progresso (somente se tem meta) */}
                        {card.hasGoalToday && (
                          <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-300 motion-reduce:transition-none"
                              style={{
                                width: `${card.progressPercent}%`,
                                backgroundColor: color,
                              }}
                            />
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground block font-medium truncate">
                            {card.sublegend || card.legend}
                          </span>
                        </div>

                        {/* 5.1 & 5.2 Ações rápidas no card de leitura da tela Hoje */}
                        {card.id === 'leitura' && (
                          <div className="flex items-center gap-1.5 pt-1 mt-1 border-t border-border/50">
                            <button
                              type="button"
                              onClick={handleStartReadingTimer}
                              className="text-[10px] font-bold px-2 py-1 rounded-lg bg-[#34BEAA]/15 text-[#1F7F6E] dark:text-[#34BEAA] hover:bg-[#34BEAA]/25 flex items-center gap-1"
                            >
                              <Play className="w-2.5 h-2.5 fill-current" /> Iniciar
                            </button>
                            <button
                              type="button"
                              onClick={handleToggleLeituraManual}
                              className="text-[10px] font-bold px-2 py-1 rounded-lg bg-muted text-muted-foreground hover:text-foreground"
                            >
                              {leituraCheckin.isDone ? 'Desfazer' : 'Check-in'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-4 text-xs text-muted-foreground">
                Nenhum módulo ativo no momento. Ative em Mais.
              </div>
            )}
          </div>
        </div>

        {/* COLUNA DIREITA (NO TABLET) / SEGUNDO BLOCO (NO MOBILE) */}
        <div className="md:col-span-6 space-y-6">
          {/* CARD ESCURO "PRÓXIMO PASSO" (cantos 24px, #1F1B16, botão #F0A15C) */}
          {data?.nextStep && (
            <div className="rounded-[24px] bg-[#1F1B16] dark:bg-card dark:border dark:border-border text-white p-5 sm:p-6 shadow-md space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#F0A15C]">
                  {data.nextStep.label}
                </span>
              </div>

              <div>
                <h3 className="text-lg sm:text-xl font-bold tracking-tight text-white leading-tight">
                  {data.nextStep.title}
                </h3>
                <p className="text-xs text-neutral-300 dark:text-muted-foreground mt-1 leading-relaxed">
                  {data.nextStep.subtitle}
                </p>
              </div>

              {data.nextStep.type === 'setup_routine' ? (
                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  {activeModules.leitura && (
                    <Button
                      onClick={() => navigate('/leitura')}
                      variant="outline"
                      className="h-10 text-xs font-bold bg-white/10 hover:bg-white/20 text-white border-white/20 rounded-xl"
                    >
                      Cadastrar um livro
                    </Button>
                  )}
                  {activeModules.treino && (
                    <Button
                      onClick={() => navigate('/treino')}
                      variant="outline"
                      className="h-10 text-xs font-bold bg-white/10 hover:bg-white/20 text-white border-white/20 rounded-xl"
                    >
                      Montar treino
                    </Button>
                  )}
                  {activeModules.estudos && (
                    <Button
                      onClick={() => navigate('/estudos')}
                      variant="outline"
                      className="h-10 text-xs font-bold bg-white/10 hover:bg-white/20 text-white border-white/20 rounded-xl"
                    >
                      Criar curso
                    </Button>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleNextStepAction}
                  className="w-full h-12 min-h-[48px] rounded-2xl bg-[#F0A15C] hover:bg-[#E5924B] text-[#1F1B16] font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-white"
                >
                  <Play className="w-4 h-4 fill-[#1F1B16]" />
                  <span>{data.nextStep.actionText}</span>
                </button>
              )}
            </div>
          )}

          {/* REGISTRO RÁPIDO (Linha com 4 botões iguais, min 76px altura, 44px+ toque) */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-1">
              Registro Rápido
            </span>

            <div className="grid grid-cols-4 gap-2 sm:gap-3">
              {activeModules.leitura && (
                <button
                  type="button"
                  onClick={() => setQuickPagesOpen(true)}
                  className="min-h-[76px] p-2 rounded-2xl bg-card border border-border hover:bg-muted/60 transition-all active:scale-95 flex flex-col items-center justify-center gap-1.5 text-center group"
                >
                  <div className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-[#D6EEE9] dark:bg-[#4FB3A0]/20 text-[#1F7F6E] flex items-center justify-center text-lg">
                    📕
                  </div>
                  <span className="text-[11px] font-bold text-foreground">Páginas</span>
                </button>
              )}

              {activeModules.estudos && (
                <button
                  type="button"
                  onClick={() => setQuickStudyOpen(true)}
                  className="min-h-[76px] p-2 rounded-2xl bg-card border border-border hover:bg-muted/60 transition-all active:scale-95 flex flex-col items-center justify-center gap-1.5 text-center group"
                >
                  <div className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-[#E9E1F7] dark:bg-[#8F6FD0]/20 text-[#6A4BB0] flex items-center justify-center text-lg">
                    📚
                  </div>
                  <span className="text-[11px] font-bold text-foreground">Estudo</span>
                </button>
              )}

              {activeModules.treino && (
                <button
                  type="button"
                  onClick={() => setQuickWorkoutOpen(true)}
                  className="min-h-[76px] p-2 rounded-2xl bg-card border border-border hover:bg-muted/60 transition-all active:scale-95 flex flex-col items-center justify-center gap-1.5 text-center group"
                >
                  <div className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-[#F3DDD7] dark:bg-[#E07A68]/20 text-[#B8503E] flex items-center justify-center text-lg">
                    💪
                  </div>
                  <span className="text-[11px] font-bold text-foreground">Série</span>
                </button>
              )}

              {activeModules.trabalho && (
                <button
                  type="button"
                  onClick={() => setQuickAchievementOpen(true)}
                  className="min-h-[76px] p-2 rounded-2xl bg-card border border-border hover:bg-muted/60 transition-all active:scale-95 flex flex-col items-center justify-center gap-1.5 text-center group"
                >
                  <div className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-[#FEF3C7] dark:bg-amber-500/20 text-[#B45309] flex items-center justify-center text-lg">
                    🏆
                  </div>
                  <span className="text-[11px] font-bold text-foreground">Conquista</span>
                </button>
              )}
            </div>
          </div>

          {/* CARTÃO "COMO FOI SEU DIA?" (Escrita) */}
          {activeModules.escrita && (
            <button
              type="button"
              onClick={() => navigate('/escrita?focus=1')}
              className="w-full p-4 rounded-2xl bg-card border border-border hover:bg-muted/50 transition-all active:scale-[0.99] flex items-center justify-between text-left group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-[#E1E3FA] dark:bg-[#7B83E6]/20 text-[#4C54C2] flex items-center justify-center shrink-0">
                  <PenLine className="w-5 h-5 text-[#7B83E6]" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                    Como foi seu dia?
                  </h4>
                  <p className="text-xs text-muted-foreground">Toque e escreva em segundos</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
            </button>
          )}
        </div>
      </div>

      {/* CHIP FLUTUANTE DE LEITURA (5.2) */}
      <FloatingReadingTimerChip onClick={() => setReadingTimerOpen(true)} />

      {/* DIÁLOGO DE SELEÇÃO DE LIVRO PARA CRONÔMETRO (SE MAIS DE UM LENDO) */}
      <Dialog open={selectBookForTimerOpen} onOpenChange={setSelectBookForTimerOpen}>
        <DialogContent className="sm:max-w-md bg-card rounded-3xl p-6 border border-border shadow-xl">
          <div className="space-y-3">
            <h3 className="text-base font-bold text-foreground">Qual livro você vai ler agora?</h3>
            <div className="space-y-2 pt-1 max-h-60 overflow-y-auto">
              {readingBooksList.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => handleChooseBookToRead(b)}
                  className="w-full p-3 rounded-2xl bg-muted/40 hover:bg-muted/80 border border-border flex items-center justify-between text-left transition-colors"
                >
                  <div className="truncate pr-2">
                    <h4 className="text-xs font-bold text-foreground truncate">{b.title}</h4>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {b.author || 'Sem autor'}
                    </p>
                  </div>
                  <Play className="w-4 h-4 text-[#34BEAA] shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL DO CRONÔMETRO DE LEITURA */}
      <ReadingTimerModal
        open={readingTimerOpen}
        onClose={() => setReadingTimerOpen(false)}
        onFinished={refreshData}
      />

      {/* MODAIS / FOLHAS RÁPIDAS */}
      <QuickPagesSheet
        open={quickPagesOpen}
        onOpenChange={setQuickPagesOpen}
        onSuccess={handleQuickSuccess}
      />
      <QuickStudySheet
        open={quickStudyOpen}
        onOpenChange={setQuickStudyOpen}
        onSuccess={handleQuickSuccess}
      />
      <QuickWorkoutSheet
        open={quickWorkoutOpen}
        onOpenChange={setQuickWorkoutOpen}
        onSuccess={handleQuickSuccess}
      />
      <QuickAchievementSheet
        open={quickAchievementOpen}
        onOpenChange={setQuickAchievementOpen}
        onSuccess={handleQuickSuccess}
      />
      <SearchNotesModal open={searchOpen} onOpenChange={setSearchOpen} />

      {/* MODAL DE AUTENTICAÇÃO */}
      {authModalOpen && (
        <AuthModal
          initialMode="welcome"
          onClose={() => setAuthModalOpen(false)}
          onSuccess={() => setAuthModalOpen(false)}
        />
      )}

      {/* MODAL DE MIGRAÇÃO DE DADOS LOCAIS */}
      {migrationModalOpen && user && (
        <LocalDataMigrationModal
          userId={user.id}
          onDone={() => {
            localStorage.setItem(`rotina_migration_prompted_${user.id}`, 'true')
            setMigrationModalOpen(false)
            refreshData()
          }}
          onDismiss={() => {
            localStorage.setItem(`rotina_migration_prompted_${user.id}`, 'true')
            setMigrationModalOpen(false)
          }}
        />
      )}
    </div>
  )
}
