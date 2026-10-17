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
  Briefcase,
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
    badgeBg: '#E9F5ED',
    badgeText: '#2D8653',
  },
  leitura: {
    fill: '#4FB3A0',
    text: '#1F7F6E',
    tint: '#D6EEE9',
    badgeBg: '#E9F5ED',
    badgeText: '#2D8653',
  },
  escrita: {
    fill: '#7B83E6',
    text: '#4C54C2',
    tint: '#E1E3FA',
    badgeBg: '#EFEBE4',
    badgeText: '#6B645C',
  },
  estudos: {
    fill: '#8F6FD0',
    text: '#6A4BB0',
    tint: '#E9E1F7',
    badgeBg: '#E9F5ED',
    badgeText: '#2D8653',
  },
  trabalho: {
    fill: '#5A7184',
    text: '#3F5A70',
    tint: '#DCE6EE',
    badgeBg: '#E9F5ED',
    badgeText: '#2D8653',
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
    <div className="pt-3 pb-20 px-2 sm:px-4 max-w-[440px] md:max-w-[760px] mx-auto animate-fade-in font-sans">
      {/* 1) CABEÇALHO */}
      <header className="flex items-start justify-between gap-3 pt-1 pb-4">
        <div className="space-y-1">
          <h1 className="text-[32px] sm:text-[34px] font-[800] tracking-tight text-[#1F1B16] dark:text-[#F6F3EE] leading-[1.1]">
            Resumo
          </h1>
          <p className="text-[14px] font-normal text-[#6B645C] dark:text-[#A8A199] leading-tight">
            {summaryData ? formatWeekSubtitle(summaryData.range) : 'Carregando semana...'}
          </p>
        </div>

        {/* Botões de navegação circular de 44px com fundo branco / dark-[#241F1A] e borda fina */}
        <div className="flex items-center gap-2.5 pt-0.5">
          <button
            type="button"
            onClick={handlePrevWeek}
            disabled={!summaryData?.canGoPrev || loading}
            aria-label="Semana anterior"
            className={cn(
              'w-11 h-11 rounded-full flex items-center justify-center transition-all bg-white dark:bg-[#241F1A] text-[#1F1B16] dark:text-[#F6F3EE] shadow-[0_1px_3px_rgba(0,0,0,0.06)]',
              (!summaryData?.canGoPrev || loading) &&
                'opacity-30 cursor-not-allowed hover:bg-white dark:hover:bg-[#241F1A]',
              summaryData?.canGoPrev &&
                !loading &&
                'hover:bg-[#F6F3EE] dark:hover:bg-[#2F2922] active:scale-95',
            )}
          >
            <ChevronLeft className="w-[18px] h-[18px] stroke-[2.2]" />
          </button>

          <button
            type="button"
            onClick={handleNextWeek}
            disabled={!summaryData?.canGoNext || loading}
            aria-label="Próxima semana"
            className={cn(
              'w-11 h-11 rounded-full flex items-center justify-center transition-all bg-white dark:bg-[#241F1A] text-[#1F1B16] dark:text-[#F6F3EE] shadow-[0_1px_3px_rgba(0,0,0,0.06)]',
              (!summaryData?.canGoNext || loading) &&
                'opacity-30 cursor-not-allowed hover:bg-white dark:hover:bg-[#241F1A]',
              summaryData?.canGoNext &&
                !loading &&
                'hover:bg-[#F6F3EE] dark:hover:bg-[#2F2922] active:scale-95',
            )}
          >
            <ChevronRight className="w-[18px] h-[18px] stroke-[2.2]" />
          </button>
        </div>
      </header>

      {/* CASO: NENHUM MÓDULO ATIVO */}
      {activeModulesCount === 0 ? (
        <div className="p-8 rounded-[28px] bg-white dark:bg-[#241F1A] border border-[#EAE4DB] dark:border-[#38332B] text-center space-y-4 my-6 shadow-sm">
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
        <div className="space-y-4">
          {/* 2) CARD DA SEMANA (Canto 28px, fundo branco, padding espaçoso) */}
          <div className="bg-white dark:bg-[#241F1A] border border-[#EAE4DB] dark:border-[#38332B] rounded-[28px] p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-4">
            {/* Linha 1: Título e legenda à esquerda; pílula de sequência à direita */}
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <h2 className="text-[20px] sm:text-[22px] font-[800] text-[#1F1B16] dark:text-[#F6F3EE] tracking-tight leading-tight">
                  {summaryData.weekTitle}
                </h2>
                <p className="text-[13px] font-normal text-[#6B645C] dark:text-[#A8A199] leading-tight">
                  {summaryData.weekSubtitle}
                </p>
              </div>

              {/* Pílula de sequência (fogo pequeno + "12 dias", cor bege suave #F4EDE4, texto marrom escuro #7D4C1F) */}
              {summaryData.streak > 0 && (
                <div
                  aria-label={`Sequência de ${summaryData.streak} dias`}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F5EDE4] dark:bg-[#342417] text-[#8C5325] dark:text-[#E8883A] text-[12px] font-[700] shrink-0"
                >
                  <Flame className="w-3.5 h-3.5 stroke-[2] fill-transparent text-[#8C5325] dark:text-[#E8883A]" />
                  <span>{summaryData.streak} dias</span>
                </div>
              )}
            </div>

            {/* Tira com 7 colunas iguais em formato de cápsula arredondada */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2 pt-1">
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

          {/* 3) CARD ESCURO "DESTAQUE DA SEMANA" (#1F1B16 com cantos 28px) */}
          {summaryData.highlight && !summaryData.hasNoGoalsWeek && (
            <div className="rounded-[28px] p-5 sm:p-6 bg-[#1F1B16] text-white dark:bg-[#201C18] dark:border dark:border-[#38332B] shadow-sm space-y-2.5 transition-all">
              <span className="text-[11px] font-[800] uppercase tracking-wider text-[#E8883A] block">
                DESTAQUE DA SEMANA
              </span>
              <p className="text-[17px] sm:text-[18px] font-[800] text-white leading-[1.3] tracking-tight">
                {summaryData.highlight.title}
              </p>
              <p className="text-[13px] font-normal text-[#CFC8BE] leading-relaxed pt-0.5">
                {summaryData.highlight.subtitle}
              </p>
            </div>
          )}

          {/* 4) SEÇÃO "POR MÓDULO" */}
          <div className="space-y-3 pt-1">
            {/* Rótulo da seção */}
            <div className="flex items-center justify-between text-xs px-1">
              <span className="font-[800] text-[14px] text-[#1F1B16] dark:text-[#F6F3EE] tracking-tight">
                Por módulo
              </span>
              <span className="text-[12px] font-normal text-[#6B645C] dark:text-[#A8A199]">
                variação vs. semana anterior
              </span>
            </div>

            {/* Grade de 2 colunas para Treino, Leitura, Escrita e Estudos */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
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
                    <div key={mod.key} className={isLastOdd ? 'col-span-2' : ''}>
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
              <WorkWideCard metrics={summaryData.modules.trabalho} />
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}

/**
 * Coluna da tira de 7 dias com indicador de meta.
 * Cápsulas arredondadas (rounded-[20px]), Seg/Ter/... em 11px, dia em 14px 800,
 * Indicadores circulares:
 * - Fechado: círculo laranja #E8883A com checkmark escuro
 * - Parcial: arco circular grosso com stroke-linecap round
 * - Sem metas: fundo neutro suave com contorno sutil ou pontilhado
 * - Futuro: anel pontilhado suave
 */
const DayIndicatorColumn: React.FC<{ col: DayBarIndicator }> = ({ col }) => {
  return (
    <div
      tabIndex={0}
      aria-label={col.ariaLabel}
      className={cn(
        'flex flex-col items-center justify-between py-2 px-0.5 rounded-[20px] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E8883A] min-h-[96px]',
        col.isToday
          ? 'bg-[#FDF0E2] dark:bg-[#342417] border border-[#F0C79A] dark:border-[#7A4B23]'
          : 'bg-[#F9F7F4] dark:bg-[#1C1814] border border-transparent',
      )}
    >
      <div className="flex flex-col items-center text-center">
        <span className="text-[11px] font-[500] text-[#6B645C] dark:text-[#A8A199] leading-tight">
          {col.dayLetter}
        </span>
        <span className="text-[14px] sm:text-[15px] font-[800] text-[#1F1B16] dark:text-[#F6F3EE] leading-tight mt-0.5">
          {col.dayNumber}
        </span>
      </div>

      {/* Indicador no fundo da cápsula */}
      <div className="w-[32px] h-[32px] flex items-center justify-center mt-1">
        {col.status === 'fechado' && (
          <div className="w-[28px] h-[28px] rounded-full bg-[#E8883A] text-[#1F1B16] flex items-center justify-center transition-transform">
            <Check className="w-4 h-4 stroke-[3]" />
          </div>
        )}

        {col.status === 'parcial' && (
          <div className="relative w-[28px] h-[28px] flex items-center justify-center">
            <svg className="w-[28px] h-[28px] -rotate-90" viewBox="0 0 32 32">
              <circle
                cx="16"
                cy="16"
                r="12"
                stroke="currentColor"
                strokeWidth="3.5"
                fill="none"
                className="text-[#EAE4DB] dark:text-[#38332B]"
              />
              <circle
                cx="16"
                cy="16"
                r="12"
                stroke="#E8883A"
                strokeWidth="3.5"
                strokeDasharray={2 * Math.PI * 12}
                strokeDashoffset={2 * Math.PI * 12 * (1 - (col.fraction || 0.6))}
                strokeLinecap="round"
                fill="none"
                className="transition-all duration-300 motion-reduce:transition-none"
              />
            </svg>
          </div>
        )}

        {col.status === 'sem_metas' && (
          <div className="w-[26px] h-[26px] rounded-full border border-dashed border-[#D5CEC4] dark:border-[#524B42] flex items-center justify-center" />
        )}

        {col.status === 'futuro' && (
          <div className="w-[26px] h-[26px] rounded-full border border-dashed border-[#D5CEC4] dark:border-[#524B42] flex items-center justify-center" />
        )}
      </div>
    </div>
  )
}

/**
 * Cartão de Módulo (Treino, Leitura, Escrita, Estudos)
 */
interface ModuleCardProps {
  moduleKey: keyof typeof MODULE_COLORS
  title: string
  icon: any
  metrics: ModuleWeekMetrics
}

const ModuleCard: React.FC<ModuleCardProps> = ({ moduleKey, title, icon: Icon, metrics }) => {
  const colors = MODULE_COLORS[moduleKey]

  return (
    <div className="bg-white dark:bg-[#241F1A] border border-[#EAE4DB] dark:border-[#38332B] rounded-[24px] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between min-h-[195px] space-y-3">
      {/* LINHA 1: Ícone + nome à esquerda, pílula de variação à direita */}
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <div
            style={{ backgroundColor: colors.tint, color: colors.text }}
            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
          >
            <Icon className="w-3.5 h-3.5 stroke-[2.2]" />
          </div>
          <span style={{ color: colors.text }} className="text-[13px] font-[800] truncate">
            {title}
          </span>
        </div>

        {/* Pílula de variação (ex.: +1, +12, Igual, +45) */}
        {metrics.variation && (
          <span
            className={cn(
              'text-[11px] font-[700] px-2 py-0.5 rounded-full select-none shrink-0 leading-tight',
              metrics.variation.type === 'up' && 'bg-[#EBF7EE] text-[#2D8653]',
              metrics.variation.type === 'equal' && 'bg-[#EFEBE4] text-[#6B645C]',
              metrics.variation.type === 'down' && 'bg-[#FBEBD3] text-[#8A5A00]',
            )}
          >
            {metrics.variation.label}
          </span>
        )}
      </div>

      {/* LINHA 2: Valor grande + unidade, e legenda embaixo */}
      <div className="space-y-0.5">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[28px] sm:text-[30px] font-[800] text-[#1F1B16] dark:text-[#F6F3EE] leading-none tracking-tight">
            {metrics.displayValue}
          </span>
          {metrics.unit && (
            <span className="text-[13px] font-[500] text-[#6B645C] dark:text-[#A8A199]">
              {metrics.unit}
            </span>
          )}
        </div>
        <p className="text-[12px] font-[400] text-[#6B645C] dark:text-[#A8A199] leading-tight line-clamp-1">
          {metrics.legend}
        </p>
      </div>

      {/* LINHA 3: Minigráfico de 7 barras com iniciais S T Q Q S S D */}
      <div className="pt-1">
        <div className="flex items-end justify-between gap-1 h-[42px]">
          {metrics.dailyBars.map((bar) => {
            let heightPx = 5
            const isZeroOrFuture = bar.isFuture || bar.value === 0

            if (!isZeroOrFuture && metrics.maxDailyValue > 0) {
              const ratio = bar.value / metrics.maxDailyValue
              // Barra ativa varia de 8px a 36px
              heightPx = Math.round(8 + ratio * 28)
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
                  className="w-[8px] sm:w-[9px] rounded-full transition-all duration-300 motion-reduce:transition-none"
                />
                <span
                  className={cn(
                    'text-[10px] sm:text-[11px] mt-1 select-none leading-none',
                    bar.isToday
                      ? 'font-[800] text-[#1F1B16] dark:text-[#F6F3EE]'
                      : 'font-[400] text-[#9A9187] dark:text-[#80766B]',
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

/**
 * Faixa Larga de Trabalho (estilo fiel ao mockup do Claude)
 * Ícone pasta/maleta à esquerda com fundo tint, título "Trabalho",
 * legenda "1 projeto em andamento · 3 tarefas feitas" embaixo.
 * À direita: valor grande "2 conquistas" e pílula "+1" alinhada à direita.
 */
const WorkWideCard: React.FC<{ metrics: ModuleWeekMetrics }> = ({ metrics }) => {
  const colors = MODULE_COLORS.trabalho

  return (
    <div className="bg-white dark:bg-[#241F1A] border border-[#EAE4DB] dark:border-[#38332B] rounded-[24px] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex items-center justify-between gap-3">
      {/* Lado Esquerdo: Ícone de maleta em círculo suave + Texto */}
      <div className="flex items-center gap-3 min-w-0">
        <div
          style={{ backgroundColor: colors.tint, color: colors.text }}
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
        >
          <Briefcase className="w-5 h-5 stroke-[2]" />
        </div>
        <div className="space-y-0.5 min-w-0">
          <span className="text-[14px] font-[800] text-[#3F5A70] dark:text-[#DCE6EE] block">
            Trabalho
          </span>
          <p className="text-[12px] font-[400] text-[#6B645C] dark:text-[#A8A199] leading-tight truncate">
            {metrics.legend}
          </p>
        </div>
      </div>

      {/* Lado Direito: "2 conquistas" em cima, pílula de variação "+1" embaixo */}
      <div className="flex flex-col items-end shrink-0 space-y-1">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[22px] sm:text-[24px] font-[800] text-[#1F1B16] dark:text-[#F6F3EE] leading-none">
            {metrics.displayValue}
          </span>
          {metrics.unit && (
            <span className="text-[13px] font-[500] text-[#1F1B16] dark:text-[#F6F3EE]">
              {metrics.unit}
            </span>
          )}
        </div>

        {metrics.variation && (
          <span
            className={cn(
              'text-[11px] font-[700] px-2 py-0.5 rounded-full select-none leading-tight',
              metrics.variation.type === 'up' && 'bg-[#EBF7EE] text-[#2D8653]',
              metrics.variation.type === 'equal' && 'bg-[#EFEBE4] text-[#6B645C]',
              metrics.variation.type === 'down' && 'bg-[#FBEBD3] text-[#8A5A00]',
            )}
          >
            {metrics.variation.label}
          </span>
        )}
      </div>
    </div>
  )
}

export default ResumoPage
