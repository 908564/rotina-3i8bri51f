import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronLeft,
  Award,
  Lock,
  Sparkles,
  Flame,
  BookOpen,
  Dumbbell,
  PenLine,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  medalsRepository,
  MEDAL_CATALOG,
  MedalCatalogItem,
} from '@/lib/repositories/medalsRepository'
import { Medal } from '@/lib/types'
import { cn } from '@/lib/utils'

export function MedalhasView({ onBack }: { onBack: () => void }) {
  const [earnedMedals, setEarnedMedals] = useState<Medal[]>([])
  const [dailyCounts, setDailyCounts] = useState<{
    leitura: number
    treino: number
    escrita: number
  }>({ leitura: 0, treino: 0, escrita: 0 })
  const [filterModule, setFilterModule] = useState<'todos' | 'leitura' | 'treino' | 'escrita'>(
    'todos',
  )

  const loadData = async () => {
    const [all, lCount, tCount, eCount] = await Promise.all([
      medalsRepository.getAll(),
      medalsRepository.countDailyGoalsForModule('leitura'),
      medalsRepository.countDailyGoalsForModule('treino'),
      medalsRepository.countDailyGoalsForModule('escrita'),
    ])
    setEarnedMedals(all)
    setDailyCounts({
      leitura: lCount,
      treino: tCount,
      escrita: eCount,
    })
  }

  useEffect(() => {
    loadData()
  }, [])

  // Mapeia se cada item do catálogo foi ganho
  const catalogWithStatus = MEDAL_CATALOG.map((catItem) => {
    // Para medalha diária, ganha se tiver pelo menos 1 registro
    const earnedList = earnedMedals.filter((m) => m.key === catItem.key || m.code === catItem.key)
    const isEarned = earnedList.length > 0
    let count = 0
    if (catItem.isDaily) {
      if (catItem.module === 'leitura') count = dailyCounts.leitura
      if (catItem.module === 'treino') count = dailyCounts.treino
      if (catItem.module === 'escrita') count = dailyCounts.escrita
    }

    return {
      ...catItem,
      isEarned,
      earnedCount: count,
      latestEarned: earnedList[0],
    }
  })

  const filtered = catalogWithStatus.filter((c) => {
    if (filterModule === 'todos') return true
    return c.module === filterModule
  })

  const totalEarnedCount = catalogWithStatus.filter((c) => c.isEarned).length

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* BARRA SUPERIOR */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="text-xs h-9 px-2 rounded-xl text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
        </Button>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 text-xs font-bold">
          <Award className="w-3.5 h-3.5" />
          <span>
            {totalEarnedCount} de {MEDAL_CATALOG.length} conquistadas
          </span>
        </div>
      </div>

      {/* HEADER */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-500 flex items-center justify-center">
            <Award className="w-4 h-4" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Medalhas</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Conquiste marcos diários e ofensivas contínuas nos seus hábitos.
        </p>
      </div>

      {/* FILTRO POR MÓDULO */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {[
          { key: 'todos', label: 'Todas' },
          { key: 'leitura', label: 'Leitura' },
          { key: 'treino', label: 'Treino' },
          { key: 'escrita', label: 'Escrita' },
        ].map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilterModule(f.key as any)}
            className={cn(
              'px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all select-none',
              filterModule === f.key
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-muted/70 text-muted-foreground hover:text-foreground',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* GRADE DE MEDALHAS (GANHAS E BLOQUEADAS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {filtered.map((item) => {
          let ModuleIcon = Award
          let moduleColor = 'text-amber-500 bg-amber-500/15'
          if (item.module === 'leitura') {
            ModuleIcon = BookOpen
            moduleColor = 'text-[#34BEAA] bg-[#34BEAA]/15'
          } else if (item.module === 'treino') {
            ModuleIcon = Dumbbell
            moduleColor = 'text-[#E07A68] bg-[#E07A68]/15'
          } else if (item.module === 'escrita') {
            ModuleIcon = PenLine
            moduleColor = 'text-[#7B83E6] bg-[#7B83E6]/15'
          }

          return (
            <div
              key={item.key}
              className={cn(
                'p-4 rounded-2xl border transition-all flex items-start gap-3.5 relative overflow-hidden',
                item.isEarned
                  ? 'bg-card border-amber-500/30 shadow-subtle'
                  : 'bg-muted/20 border-border/80 opacity-70',
              )}
            >
              <div
                className={cn(
                  'w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform',
                  item.isEarned
                    ? 'bg-gradient-to-br from-amber-500/20 to-orange-500/20 text-amber-500 border border-amber-500/30 shadow-xs'
                    : 'bg-muted text-muted-foreground border border-border',
                )}
              >
                {item.isEarned ? (
                  <Award className="w-6 h-6 fill-amber-500/20" />
                ) : (
                  <Lock className="w-5 h-5 text-muted-foreground" />
                )}
              </div>

              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h4
                    className={cn(
                      'text-sm font-bold truncate',
                      item.isEarned ? 'text-foreground' : 'text-muted-foreground',
                    )}
                  >
                    {item.title}
                  </h4>
                  {item.isEarned && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0">
                      Ganho ✓
                    </span>
                  )}
                </div>

                <p className="text-xs text-muted-foreground leading-snug">{item.description}</p>

                {/* Critério se estiver bloqueada */}
                {!item.isEarned && (
                  <div className="pt-1.5 flex items-center gap-1.5 text-[11px] font-medium text-foreground/80">
                    <span className="text-muted-foreground">Como desbloquear:</span> {item.criteria}
                  </div>
                )}

                {/* Contador se for diária */}
                {item.isDaily && item.isEarned && item.earnedCount > 0 && (
                  <div className="pt-1 flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                    <Sparkles className="w-3 h-3" />
                    <span>
                      Concluída em {item.earnedCount} {item.earnedCount === 1 ? 'dia' : 'dias'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
