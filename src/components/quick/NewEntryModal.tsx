import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { useApp } from '@/lib/context'
import { useNavigate } from 'react-router-dom'
import {
  PenLine,
  BookOpen,
  Dumbbell,
  GraduationCap,
  Briefcase,
  Trophy,
  CheckSquare,
  ChevronRight,
} from 'lucide-react'
interface NewEntryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onOpenQuickPages: () => void
  onOpenQuickStudy: () => void
  onOpenQuickWorkout: () => void
  onOpenQuickAchievement: () => void
  onOpenNewTask?: () => void
}

export const NewEntryModal: React.FC<NewEntryModalProps> = ({
  open,
  onOpenChange,
  onOpenQuickPages,
  onOpenQuickStudy,
  onOpenQuickWorkout,
  onOpenQuickAchievement,
  onOpenNewTask,
}) => {
  const { settings } = useApp()
  const navigate = useNavigate()
  const active = settings.activeModules

  const items = [
    {
      id: 'nova_tarefa',
      active: true,
      label: 'Nova tarefa',
      subtitle: 'Para hoje, semana ou sem data',
      icon: CheckSquare,
      color: '#E8883A',
      bg: '#FDF4EC',
      action: () => {
        onOpenChange(false)
        onOpenNewTask?.()
      },
    },
    {
      id: 'escrita',
      active: active.escrita,
      label: 'Escrever anotação',
      subtitle: 'Registros, diário ou pensamentos de hoje',
      icon: PenLine,
      color: '#7B83E6',
      bg: '#E1E3FA',
      action: () => {
        onOpenChange(false)
        navigate('/escrita?focus=1')
      },
    },
    {
      id: 'leitura',
      active: active.leitura,
      label: 'Registrar páginas',
      subtitle: 'Páginas ou minutos nos seus livros',
      icon: BookOpen,
      color: '#1F7F6E',
      bg: '#D6EEE9',
      action: () => {
        onOpenChange(false)
        onOpenQuickPages()
      },
    },
    {
      id: 'treino',
      active: active.treino,
      label: 'Registrar série / treino',
      subtitle: 'Marque suas séries planejadas do dia',
      icon: Dumbbell,
      color: '#B8503E',
      bg: '#F3DDD7',
      action: () => {
        onOpenChange(false)
        onOpenQuickWorkout()
      },
    },
    {
      id: 'estudos',
      active: active.estudos,
      label: 'Registrar tempo de estudo',
      subtitle: 'Minutos dedicados ao seu curso ou faculdade',
      icon: GraduationCap,
      color: '#6A4BB0',
      bg: '#E9E1F7',
      action: () => {
        onOpenChange(false)
        onOpenQuickStudy()
      },
    },
    {
      id: 'trabalho_conquista',
      active: active.trabalho,
      label: 'Registrar conquista',
      subtitle: 'Entregas, resultados e vitórias profissionais',
      icon: Trophy,
      color: '#D97706',
      bg: '#FEF3C7',
      action: () => {
        onOpenChange(false)
        onOpenQuickAchievement()
      },
    },
    {
      id: 'trabalho_nota',
      active: active.trabalho,
      label: 'Nova anotação de trabalho',
      subtitle: 'Reunião, decisão ou contexto profissional',
      icon: Briefcase,
      color: '#3F5A70',
      bg: '#DCE6EE',
      action: () => {
        onOpenChange(false)
        navigate('/trabalho?tab=anotacoes&new=1')
      },
    },
  ].filter((item) => item.active)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fixed bottom-0 top-auto translate-y-0 sm:max-w-md w-full bg-card rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 border border-border pb-8 sm:pb-6">
        <DialogHeader className="text-left space-y-1">
          <DialogTitle className="text-lg font-bold">Novo Registro</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Escolha o que deseja registrar agora em 1 toque.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 pt-2">
          {items.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                type="button"
                onClick={item.action}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-muted/40 hover:bg-muted/80 border border-border transition-all active:scale-[0.99] text-left group"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: item.bg, color: item.color }}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                      {item.label}
                    </h4>
                    <p className="text-[11px] text-muted-foreground leading-tight">
                      {item.subtitle}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
              </button>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
