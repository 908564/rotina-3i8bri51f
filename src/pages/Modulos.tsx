import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  PenLine,
  BookOpen,
  Dumbbell,
  GraduationCap,
  Briefcase,
  ChevronRight,
  Sparkles,
} from 'lucide-react'
import { useApp } from '@/lib/context'
import { hojeRepository, FastTodayData } from '@/lib/repositories/hojeRepository'
import { taskRepository } from '@/lib/repositories/taskRepository'
import { Button } from '@/components/ui/button'

export const ModulosPage: React.FC = () => {
  const { settings } = useApp()
  const [data, setData] = useState<FastTodayData | null>(null)
  const [pendingTasksByModule, setPendingTasksByModule] = useState<Record<string, number>>({})
  const navigate = useNavigate()

  useEffect(() => {
    hojeRepository.getFastTodayData().then(setData)
    taskRepository.getTasks().then((tasks) => {
      const counts: Record<string, number> = {}
      for (const t of tasks) {
        if (t.status === 'open') {
          counts[t.module] = (counts[t.module] || 0) + 1
        }
      }
      setPendingTasksByModule(counts)
    })
  }, [])

  const active = settings.activeModules

  const modulesList = [
    {
      id: 'escrita',
      active: active.escrita,
      name: 'Escrita',
      description: 'Diário e anotações pessoais',
      path: '/escrita',
      statusText: data?.escrita.hasNoteToday ? 'Anotação de hoje feita ✓' : 'Sem anotação hoje',
      color: '#7B83E6',
      textColor: '#4C54C2',
      bg: '#E1E3FA',
      icon: PenLine,
    },
    {
      id: 'leitura',
      active: active.leitura,
      name: 'Leitura',
      description: 'Livros, páginas lidas e metas',
      path: '/leitura',
      statusText: data?.goals.leitura?.displayValue
        ? `${data.goals.leitura.displayValue} hoje`
        : 'Acompanhe seus livros',
      color: '#4FB3A0',
      textColor: '#1F7F6E',
      bg: '#D6EEE9',
      icon: BookOpen,
    },
    {
      id: 'treino',
      active: active.treino,
      name: 'Treino',
      description: 'Rotina semanal e registro de séries',
      path: '/treino',
      statusText: data?.goals.treino?.displayValue
        ? `${data.goals.treino.displayValue} ${data.goals.treino.legend}`
        : 'Plano de treino',
      color: '#E07A68',
      textColor: '#B8503E',
      bg: '#F3DDD7',
      icon: Dumbbell,
    },
    {
      id: 'estudos',
      active: active.estudos,
      name: 'Estudos',
      description: 'Cursos, faculdade e tempo dedicado',
      path: '/estudos',
      statusText: data?.goals.estudos?.displayValue
        ? `${data.goals.estudos.displayValue} hoje`
        : 'Cursos e anotações',
      color: '#8F6FD0',
      textColor: '#6A4BB0',
      bg: '#E9E1F7',
      icon: GraduationCap,
    },
    {
      id: 'trabalho',
      active: active.trabalho,
      name: 'Trabalho',
      description: 'Projetos, conquistas e notas de carreira',
      path: '/trabalho',
      statusText:
        data && data.trabalho.todayAchievementsCount > 0
          ? `${data.trabalho.todayAchievementsCount} conquista(s) hoje`
          : 'Projetos e conquistas',
      color: '#5A7184',
      textColor: '#3F5A70',
      bg: '#DCE6EE',
      icon: Briefcase,
    },
  ].filter((m) => m.active)

  return (
    <div className="pt-2 pb-16 animate-fade-in space-y-6 max-w-2xl mx-auto">
      <header className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">Módulos</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Acesse cada área da sua rotina diária ou gerencie o que está ativo.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {modulesList.map((m) => {
          const Icon = m.icon
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => navigate(m.path)}
              className="p-5 rounded-2xl bg-card border border-border hover:border-border/80 hover:bg-muted/30 transition-all active:scale-[0.98] text-left flex flex-col justify-between min-h-[140px] shadow-subtle group"
            >
              <div className="flex items-center justify-between w-full">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: m.bg, color: m.color }}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
              </div>

              <div className="mt-4 space-y-0.5">
                <h3
                  className="text-base font-bold text-foreground leading-tight"
                  style={{ color: m.textColor }}
                >
                  {m.name}
                </h3>
                <p className="text-xs text-muted-foreground line-clamp-1">{m.description}</p>
                <div className="pt-1.5 flex flex-wrap items-center gap-1.5">
                  <span className="inline-block text-[11px] font-semibold text-foreground/80 bg-muted/60 px-2 py-0.5 rounded-md">
                    {m.statusText}
                  </span>
                  {pendingTasksByModule[m.id] > 0 && (
                    <span className="inline-block text-[11px] font-bold text-[#8A5A00] bg-[#FBEBD3] px-2 py-0.5 rounded-md">
                      {pendingTasksByModule[m.id]} tarefa{pendingTasksByModule[m.id] > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      <div className="pt-4 text-center">
        <Button
          variant="outline"
          onClick={() => navigate('/mais')}
          className="text-xs rounded-xl h-10 px-4 border-border font-semibold"
        >
          Gerenciar módulos ativos em Mais
        </Button>
      </div>
    </div>
  )
}
export default ModulosPage
