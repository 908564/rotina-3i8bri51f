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

  // Sheets
  const [quickPagesOpen, setQuickPagesOpen] = useState(false)
  const [quickStudyOpen, setQuickStudyOpen] = useState(false)
  const [quickWorkoutOpen, setQuickWorkoutOpen] = useState(false)
  const [quickAchievementOpen, setQuickAchievementOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  const navigate = useNavigate()
  const { toast } = useToast()

  const refreshData = useCallback(async () => {
    try {
      const res = await hojeRepository.getFastTodayData()
      setData(res)
    } finally {
      setLoading(false)
    }
  }, [])

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

              {/* Ao lado do anel: pílula de sequência, título e frase de apoio */}
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#E8883A]/10 border border-[#E8883A]/20 text-[#E8883A] text-xs font-bold">
                  <Flame className="w-3.5 h-3.5 fill-[#E8883A]" />
                  <span>
                    {data?.streak || 0} {data?.streak === 1 ? 'dia seguido' : 'dias seguidos'}
                  </span>
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
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => navigate(path)}
                      className="p-3.5 rounded-2xl bg-muted/40 hover:bg-muted/70 border border-border text-left transition-all active:scale-[0.98] group flex flex-col justify-between min-h-[96px]"
                    >
                      <div>
                        <span className="text-xs font-bold block" style={{ color: textColor }}>
                          {card.name}
                        </span>
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
                        <span className="text-[10px] text-muted-foreground block font-medium">
                          {card.sublegend || card.legend}
                        </span>
                      </div>
                    </button>
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
    </div>
  )
}
