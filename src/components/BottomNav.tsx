import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  Home,
  PenLine,
  BookOpen,
  Dumbbell,
  GraduationCap,
  Briefcase,
  MoreHorizontal,
} from 'lucide-react'
import { useApp } from '@/lib/context'
import { cn } from '@/lib/utils'

import { ModuleKey } from '@/lib/types'

interface NavItemConfig {
  to: string
  label: string
  icon: React.ElementType
  colorClass: string
  pillBg: string
  moduleKey?: ModuleKey
}

export const BottomNav: React.FC = () => {
  const { settings } = useApp()

  const allItems: NavItemConfig[] = [
    {
      to: '/',
      label: 'Hoje',
      icon: Home,
      colorClass: 'text-[#F59E4C]',
      pillBg: 'bg-[#F59E4C]/15 text-[#F59E4C]',
    },
    {
      to: '/escrita',
      label: 'Escrita',
      icon: PenLine,
      colorClass: 'text-[#7C8CFF]',
      pillBg: 'bg-[#7C8CFF]/15 text-[#7C8CFF]',
      moduleKey: 'escrita',
    },
    {
      to: '/leitura',
      label: 'Leitura',
      icon: BookOpen,
      colorClass: 'text-[#34BEAA]',
      pillBg: 'bg-[#34BEAA]/15 text-[#34BEAA]',
      moduleKey: 'leitura',
    },
    {
      to: '/treino',
      label: 'Treino',
      icon: Dumbbell,
      colorClass: 'text-[#F07B6A]',
      pillBg: 'bg-[#F07B6A]/15 text-[#F07B6A]',
      moduleKey: 'treino',
    },
    {
      to: '/estudos',
      label: 'Estudos',
      icon: GraduationCap,
      colorClass: 'text-[#8B5CF6]',
      pillBg: 'bg-[#8B5CF6]/15 text-[#8B5CF6]',
      moduleKey: 'estudos',
    },
    {
      to: '/trabalho',
      label: 'Trabalho',
      icon: Briefcase,
      colorClass: 'text-[#0284C7]',
      pillBg: 'bg-[#0284C7]/15 text-[#0284C7]',
      moduleKey: 'trabalho',
    },
    {
      to: '/mais',
      label: 'Mais',
      icon: MoreHorizontal,
      colorClass: 'text-foreground',
      pillBg: 'bg-muted text-foreground',
    },
  ]

  // Filtra itens desativados nas configurações
  const visibleItems = allItems.filter(
    (item) => !item.moduleKey || settings.activeModules[item.moduleKey],
  )

  return (
    <nav
      aria-label="Navegação Principal"
      className="fixed bottom-0 left-0 right-0 z-40 bg-background/85 backdrop-blur-md border-t border-border/80 pb-[env(safe-area-inset-bottom,0px)]"
    >
      <div className="max-w-md md:max-w-lg mx-auto flex items-center justify-around h-16 px-2">
        {visibleItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center flex-1 h-full min-h-[44px] min-w-[44px] transition-transform active:scale-95 select-none focus:outline-none',
                  isActive
                    ? 'font-semibold'
                    : 'text-muted-foreground font-normal hover:text-foreground',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <div
                    className={cn(
                      'flex items-center justify-center w-10 h-7 rounded-full transition-all duration-150',
                      isActive ? item.pillBg : 'bg-transparent text-muted-foreground',
                    )}
                  >
                    <Icon className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <span
                    className={cn(
                      'text-[11px] tracking-tight mt-0.5 leading-none transition-colors',
                      isActive ? 'text-foreground font-medium' : 'text-muted-foreground',
                    )}
                  >
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
