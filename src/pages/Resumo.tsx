import React, { useEffect, useState, useTransition, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronLeft,
  ChevronRight,
  Flame,
  Check,
  Dumbbell,
  BookOpen,
  PenLine,
  GraduationCap,
  Trophy,
  ArrowRight,
  Sliders,
} from 'lucide-react'
import { useApp } from '@/lib/context'
import { getTodayDateKey, subDaysFromDateKey, addDaysToDateKey } from '@/lib/dateUtils'
import { getMondayForDateKey, formatWeekSubtitle } from '@/lib/weekUtils'
import {
  getWeekSummary,
  clearWeekSummaryCache,
  WeekSummaryData,
  DayBarIndicator,
  ModuleWeekMetrics,
} from '@/lib/summaryService'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

// Paleta de tokens do aplicativo e módulos
const MODULE_COLORS = {
  treino: {
    fill: '#E07A68',
    text: '#B8503E',
    tint: '#F3DDD7',
    darkFill: '#E07A68',
    darkText: '#F3DDD7',
    darkTint: '#3E2420',
  },
  leitura: {
    fill: '#4FB3A0',
    text: '#1F7F6E',
    tint: '#D6EEE9',
    darkFill: '#4FB3A0',
    darkText: '#D6EEE9',
    darkTint: '#1B3833',
  },
  escrita: {
    fill: '#7B83E6',
    text: '#4C54C2',
    tint: '#E1E3FA',
    darkFill: '#7B83E6',
    darkText: '#E1E3FA',
    darkTint: '#272B4C',
  },
  estudos: {
    fill: '#8F6FD0',
    text: '#6A4BB0',
    tint: '#E9E1F7',
    darkFill: '#8F6FD0',
    darkText: '#E9E1F7',
    darkTint: '#312349',
  },
  trabalho: {
    fill: '#5A7184',
    text: '#3F5A70',
    tint: '#DCE6EE',
    darkFill: '#5A7184',
    darkText: '#DCE6EE',
    darkTint: '#232E37',
  },
}

export const ResumoPage: React.FC = () => {
  const { settings, dataVersion } = useApp()
  const navigate = useNavigate()
  const [, startTransition] = useTransition()

  // Data atual local (YYYY-MM-DD)
  const todayStr = getTodayDateKey()
  const currentMonday = getMondayForDateKey(todayStr)

  // Segunda-feira da semana selecionada
  const [selectedMonday, setSelectedMonday] = useState<string>(currentMonday)
  const [summaryData, setSummaryData] = useState<WeekSummaryData | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  // Ao mudar dataVersion (ex.: salvou algo, importou backup), invalida cache
  useEffect(() => {
    clearWeekSummaryCache()
  }, [dataVersion])

  const loadData = useCallback(
    async (mondayStr: string) => {
      setLoading(true)
      try {
        const data = await getWeekSummary(mondayStr, settings.activeModules)
        startTransition(() => {
          setSummaryData(data)
        })
      } finally {
        setLoading(false)
      }
    },
    [settings.activeModules],
  )

  useEffect(() => {
    loadData(selectedMonday)
  }, [selectedMonday, loadData])

  const handlePrevWeek = () => {
    if (!summaryData?.canGoPrev) return
    const prevMonday = subDaysFromDateKey(selectedMonday, 7)
    setSelectedMonday(prevMonday)
  }

  const handleNextWeek = () => {
    if (!summaryData?.canGoNext) return
    const nextMonday = addDaysToDateKey(selectedMonday, 7)
    setSelectedMonday(nextMonday)
  }

  const activeModulesCount = Object.values(settings.activeModules).filter(Boolean).length

  return (
    <div className="pt-2 pb-24 px-4 sm:px-6 max-w-[1100px] mx-auto animate-fade-in font-sans">
      {/* 1) CABEÇALHO */}
      <header className="flex items-center justify-between gap-4 pb-4">
        <div className="space-y-1">
          <h1 className="text-[30px] font-extrabold tracking-tight text-[#1F1B16] dark:text-[#F6F3EE] leading-tight">
            Resumo
          </h1>
          <p className="text-sm font-medium text-[#6B645C] dark:text-[#A8A199]">
            {summaryData ? formatWeekSubtitle(summaryData.range) : 'Carregando semana...'}
          </p>
        </div>

        {/* Botões de navegação circular de 44px */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrevWeek}
            disabled={!summaryData?.canGoPrev || loading}
            aria-label="Semana anterior"
            className={cn(
              'w-11 h-11 rounded-full flex items-center justify-center transition-all border border-[#EAE4DB] dark:border-[#38332B] bg-white dark:bg-[#2A241D] text-[#1F1B16] dark:text-[#F6F3EE]',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E8883A] shadow-sm',
              (!summaryData?.canGoPrev || loading) &&
                'opacity-35 cursor-not-allowed hover:bg-white dark:hover:bg-[#2A241D]',
              summaryData?.canGoPrev &&
                !loading &&
                'hover:bg-[#F6F3EE] dark:hover:bg-[#342D24] active:scale-95',
            )}
          >
            <ChevronLeft className="w-5 h-5 stroke-[2.4]" />
          </button>

          <button
            type="button"
            onClick={handleNextWeek}
            disabled={!summaryData?.canGoNext || loading}
            aria-label="Próxima semana"
            className={cn(
              'w-11 h-11 rounded-full flex items-center justify-center transition-all border border-[#EAE4DB] dark:border-[#38332B] bg-white dark:bg-[#2A241D] text-[#1F1B16] dark:text-[#F6F3EE]',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E8883A] shadow-sm',
              (!summaryData?.canGoNext || loading) &&
                'opacity-35 cursor-not-allowed hover:bg-white dark:hover:bg-[#2A241D]',
              summaryData?.canGoNext &&
                !loading &&
                'hover:bg-[#F6F3EE] dark:hover:bg-[#342D24] active:scale-95',
            )}
          >
            <ChevronRight className="w-5 h-5 stroke-[2.4]" />
          </button>
        </div>
      </header>

      {/* CASO: NENHUM MÓDULO ATIVO */}
      {activeModulesCount === 0 ? (
        <div className="p-8 rounded-[24px] bg-white dark:bg-[#241F1A] border border-[#EAE4DB] dark:border-[#38332B] text-center space-y-4 my-6 shadow-sm">
          <p className="text-base font-semibold text-[#1F1B16] dark:text-[#F6F3EE]">
            Ative um módulo para acompanhar sua semana
          </p>
          <Button
            onClick={() => navigate('/mais')}
            className="min-h-[44px] px-6 rounded-xl bg-[#E8883A] hover:bg-[#D97726] text-white font-bold"
          >
            <Sliders className="w-4 h-4 mr-2" /> Gerenciar módulos em Mais
          </Button>
        </div>
      ) : summaryData ? (
        /* LAYOUT RESPONSIVO: MOBILE (COLUNA ÚNICA) VS TABLET/DESKTOP (DUAS COLUNAS) */
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 mt-2 items-start">
          {/* COLUNA ESQUERDA (NO TABLET: 5 colunas / 12) */}
          <div className="md:col-span-5 space-y-5">
            {/* 2) CARD DA SEMANA */}
            <div className="bg-white dark:bg-[#241F1A] border border-[#EAE4DB] dark:border-[#38332B] rounded-[24px] p-4 shadow-sm space-y-4">
              {/* Linha 1: Título e legenda à esquerda; pílula de sequência à direita */}
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-0.5">
                  <h2 className="text-base sm:text-lg font-extrabold text-[#1F1B16] dark:text-[#F6F3EE] tracking-tight">
                    {summaryData.weekTitle}
                  </h2>
                  <p className="text-xs sm:text-sm font-medium text-[#6B645C] dark:text-[#A8A199]">
                    {summaryData.weekSubtitle}
                  </p>
                </div>

                {/* Pílula de sequência (ocultar se for 0) */}
                {summaryData.streak > 0 && (
                  <div
                    aria-label={`Sequência de ${summaryData.streak} dias`}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#E8883A]/10 dark:bg-[#E8883A]/20 border border-[#E8883A]/30 text-[#E8883A] text-xs font-black shrink-0"
                  >
                    <Flame className="w-3.5 h-3.5 fill-[#E8883A] text-[#E8883A]" />
                    <span>{summaryData.streak} dias</span>
                  </div>
                )}
              </div>

              {/* Tira com 7 colunas iguais */}
              <div className="grid grid-cols-7 gap-1.5 pt-1">
                {summaryData.daysIndicators.map((col) => (
                  <DayIndicatorColumn key={col.date} col={col} />
                ))}
              </div>

              {/* Caso vazio na semana (Y = 0) */}
              {summaryData.hasNoGoalsWeek && (
                <div className="pt-2">
                  <Button
                    onClick={() => navigate('/')}
                    className="w-full min-h-[44px] rounded-xl bg-[#E8883A] hover:bg-[#D97726] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2"
                  >
                    Ir para a tela Hoje <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* 3) CARD ESCURO "DESTAQUE DA SEMANA" (#1F1B16) */}
            {summaryData.highlight && !summaryData.hasNoGoalsWeek && (
              <div className="rounded-[24px] p-5 shadow-sm space-y-2 bg-[#1F1B16] text-white dark:bg-[#2A241D] dark:border dark:border-[#38332B] transition-all">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#E8883A] block">
                  DESTAQUE DA SEMANA
                </span>
                <p className="text-[17px] font-extrabold text-white leading-snug">
                  {summaryData.highlight.title}
                </p>
                <p className="text-[13px] font-normal text-[#CFC8BE] leading-relaxed pt-0.5">
                  {summaryData.highlight.subtitle}
                </p>
              </div>
            )}
          </div>

          {/* COLUNA DIREITA (NO TABLET: 7 colunas / 12) */}
          <div className="md:col-span-7 space-y-4">
            {/* Rótulo da seção de módulos */}
            <div className="flex items-center justify-between text-xs px-1">
              <span className="font-bold uppercase tracking-wider text-[#1F1B16] dark:text-[#F6F3EE]">
                Por módulo
              </span>
              <span className="text-[11px] font-medium text-[#6B645C] dark:text-[#A8A199]">
                variação vs. semana anterior
              </span>
            </div>

            {/* Grade de 2 colunas para Treino, Leitura, Escrita e Estudos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {(() => {
                type ModKey = keyof typeof MODULE_COLORS
                const allRegular: {
                  key: ModKey
                  metrics: ModuleWeekMetrics
                  title: string
                  icon: any
                }[] = [
                  {
                    key: 'treino',
                    metrics: summaryData.modules.treino,
                    title: 'Treino',
                    icon: Dumbbell,
                  },
                  {
                    key: 'leitura',
                    metrics: summaryData.modules.leitura,
                    title: 'Leitura',
                    icon: BookOpen,
                  },
                  {
                    key: 'escrita',
                    metrics: summaryData.modules.escrita,
                    title: 'Escrita',
                    icon: PenLine,
                  },
                  {
                    key: 'estudos',
                    metrics: summaryData.modules.estudos,
                    title: 'Estudos',
                    icon: GraduationCap,
                  },
                ]
                const regularModules = allRegular.filter((m) => m.metrics.active)
                const isOdd = regularModules.length % 2 !== 0

                return regularModules.map((mod, idx) => {
                  const isLastOdd = isOdd && idx === regularModules.length - 1
                  return (
                    <div key={mod.key} className={isLastOdd ? 'sm:col-span-2' : ''}>
                      <ModuleCard
                        moduleKey={mod.key}
                        title={mod.title}
                        icon={mod.icon}
                        metrics={mod.metrics}
                      />
                    </div>
                  )
                })
              })()}
            </div>

            {/* Trabalho em faixa larga embaixo */}
            {summaryData.modules.trabalho.active && (
              <ModuleCard
                moduleKey="trabalho"
                title="Trabalho"
                icon={Trophy}
                metrics={summaryData.modules.trabalho}
                isWide
              />
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}

/**
 * Coluna da tira de 7 dias com indicador de meta
 */
const DayIndicatorColumn: React.FC<{ col: DayBarIndicator }> = ({ col }) => {
  return (
    <div
      tabIndex={0}
      aria-label={col.ariaLabel}
      className={cn(
        'flex flex-col items-center justify-center py-2.5 px-1 rounded-[14px] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E8883A]',
        col.isToday
          ? 'bg-[#FDF0E2] dark:bg-[#342417] border border-[#F0C79A] dark:border-[#7A4B23]'
          : 'bg-[#F9F7F4] dark:bg-[#1C1814] border border-transparent',
      )}
    >
      <span className="text-[11px] font-bold text-[#6B645C] dark:text-[#A8A199] leading-none mb-1">
        {col.dayLetter}
      </span>
      <span className="text-[15px] font-extrabold text-[#1F1B16] dark:text-[#F6F3EE] leading-none mb-2">
        {col.dayNumber}
      </span>

      {/* Indicador de 30px */}
      <div className="w-[30px] h-[30px] flex items-center justify-center">
        {col.status === 'fechado' && (
          <div className="w-[30px] h-[30px] rounded-full bg-[#E8883A] text-[#1F1B16] flex items-center justify-center shadow-xs transition-transform duration-300">
            <Check className="w-4 h-4 stroke-[3]" />
          </div>
        )}

        {col.status === 'parcial' && (
          <div className="relative w-[30px] h-[30px] flex items-center justify-center">
            <svg className="w-[30px] h-[30px] -rotate-90" viewBox="0 0 30 30">
              <circle
                cx="15"
                cy="15"
                r="12"
                stroke="currentColor"
                strokeWidth="2.5"
                fill="none"
                className="text-[#EAE4DB] dark:text-[#38332B]"
              />
              <circle
                cx="15"
                cy="15"
                r="12"
                stroke="#E8883A"
                strokeWidth="2.5"
                strokeDasharray={2 * Math.PI * 12}
                strokeDashoffset={2 * Math.PI * 12 * (1 - col.fraction)}
                strokeLinecap="round"
                fill="none"
                className="transition-all duration-300 motion-reduce:transition-none"
              />
            </svg>
            <span className="absolute text-[8px] font-black text-[#1F1B16] dark:text-[#F6F3EE]">
              {col.goalsDone}/{col.goalsTotal}
            </span>
          </div>
        )}

        {col.status === 'sem_metas' && (
          <div className="w-2 h-2 rounded-full bg-[#D1CAC0] dark:bg-[#524B42]" />
        )}

        {col.status === 'futuro' && (
          <div className="w-[26px] h-[26px] rounded-full border border-dashed border-[#CFC8BE] dark:border-[#524B42]" />
        )}
      </div>
    </div>
  )
}

/**
 * Cartão de Módulo (Treino, Leitura, Escrita, Estudos ou Trabalho)
 */
interface ModuleCardProps {
  moduleKey: keyof typeof MODULE_COLORS
  title: string
  icon: any
  metrics: ModuleWeekMetrics
  isWide?: boolean
}

const ModuleCard: React.FC<ModuleCardProps> = ({
  moduleKey,
  title,
  icon: Icon,
  metrics,
  isWide,
}) => {
  const colors = MODULE_COLORS[moduleKey]

  return (
    <div className="bg-white dark:bg-[#241F1A] border border-[#EAE4DB] dark:border-[#38332B] rounded-[20px] p-3.5 shadow-sm space-y-2.5">
      {/* LINHA 1: Ícone + nome à esquerda, etiqueta de variação à direita */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div
            style={{ backgroundColor: colors.tint, color: colors.text }}
            className="w-[26px] h-[26px] rounded-full flex items-center justify-center shrink-0"
          >
            <Icon className="w-3.5 h-3.5" />
          </div>
          <span style={{ color: colors.text }} className="text-[13px] font-bold tracking-tight">
            {title}
          </span>
        </div>

        {/* Etiqueta de variação */}
        {metrics.variation && (
          <span
            className={cn(
              'text-[11px] font-bold px-2 py-0.5 rounded-full select-none shrink-0',
              metrics.variation.type === 'up' && 'bg-[#DDF1E4] text-[#1E6B3E]',
              metrics.variation.type === 'equal' && 'bg-[#F0E9DF] text-[#6B645C]',
              metrics.variation.type === 'down' && 'bg-[#FBEBD3] text-[#8A5A00]',
            )}
          >
            {metrics.variation.label}
          </span>
        )}
      </div>

      {/* LINHA 2: Valor grande (28px, 800) + unidade (13px, cinza) */}
      <div className="flex items-baseline gap-1.5 pt-0.5">
        <span className="text-[28px] font-extrabold text-[#1F1B16] dark:text-[#F6F3EE] leading-none tracking-tight">
          {metrics.displayValue}
        </span>
        {metrics.unit && (
          <span className="text-[13px] font-medium text-[#6B645C] dark:text-[#A8A199]">
            {metrics.unit}
          </span>
        )}
      </div>

      {/* LINHA 3: Legenda (12px, cinza, altura mínima de 2 linhas) */}
      <div className="min-h-[2rem] flex items-center">
        <p className="text-[12px] font-medium text-[#6B645C] dark:text-[#A8A199] leading-snug line-clamp-2">
          {metrics.legend}
        </p>
      </div>

      {/* LINHA 4: Minigráfico de 7 barras com a inicial do dia embaixo */}
      <div className={cn('pt-1', isWide ? 'max-w-md' : 'w-full')}>
        <div className="flex items-end justify-between gap-1.5 h-[44px]">
          {metrics.dailyBars.map((bar) => {
            // Altura da barra: mínimo 4px, máximo 40px
            let heightPx = 4
            const isZeroOrFuture = bar.isFuture || bar.value === 0

            if (!isZeroOrFuture && metrics.maxDailyValue > 0) {
              const ratio = bar.value / metrics.maxDailyValue
              heightPx = Math.round(4 + ratio * 36)
            }

            return (
              <div
                key={bar.date}
                className="flex-1 flex flex-col items-center justify-end group focus:outline-none"
                tabIndex={0}
                aria-label={bar.ariaLabel}
              >
                <div
                  style={{
                    height: `${heightPx}px`,
                    backgroundColor: isZeroOrFuture ? colors.tint : colors.fill,
                  }}
                  className="w-[10px] rounded-[5px] transition-all duration-300 motion-reduce:transition-none"
                />
                <span
                  className={cn(
                    'text-[11px] mt-1 select-none',
                    bar.isToday
                      ? 'font-black text-[#1F1B16] dark:text-[#F6F3EE]'
                      : 'font-normal text-[#6B645C] dark:text-[#A8A199]',
                  )}
                >
                  {bar.dayInitial}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default ResumoPage
