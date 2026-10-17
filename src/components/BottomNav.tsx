import React, { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Home, LayoutGrid, Plus, BarChart2, MoreHorizontal } from 'lucide-react'
import { NewEntryModal } from '@/components/quick/NewEntryModal'
import { QuickPagesSheet } from '@/components/quick/QuickPagesSheet'
import { QuickStudySheet } from '@/components/quick/QuickStudySheet'
import { QuickWorkoutSheet } from '@/components/quick/QuickWorkoutSheet'
import { QuickAchievementSheet } from '@/components/quick/QuickAchievementSheet'
import { useToast } from '@/hooks/use-toast'
import { useApp } from '@/lib/context'

export const BottomNav: React.FC = () => {
  const location = useLocation()
  const { toast } = useToast()
  const { notifyDataChanged } = useApp()

  // Modais de registro rápido ativados a partir do [+] central
  const [newEntryModalOpen, setNewEntryModalOpen] = useState(false)
  const [quickPagesOpen, setQuickPagesOpen] = useState(false)
  const [quickStudyOpen, setQuickStudyOpen] = useState(false)
  const [quickWorkoutOpen, setQuickWorkoutOpen] = useState(false)
  const [quickAchievementOpen, setQuickAchievementOpen] = useState(false)

  const handleQuickSuccess = (msg: string) => {
    toast({ title: msg })
    notifyDataChanged()
  }

  // Verifica se a rota atual é de um módulo
  // "Dentro de qualquer módulo, o item 'Módulos' fica destacado e o botão voltar retorna à grade."
  const isInsideModule = [
    '/escrita',
    '/leitura',
    '/treino',
    '/estudos',
    '/trabalho',
    '/modulos',
  ].some((path) => location.pathname.startsWith(path))

  const isTodayActive = location.pathname === '/'
  const isResumoActive = location.pathname.startsWith('/resumo')
  const isMaisActive = location.pathname.startsWith('/mais')

  return (
    <>
      <nav
        aria-label="Navegação Principal"
        className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border/80 h-[84px] pb-[env(safe-area-inset-bottom,0px)] shadow-lg"
      >
        <div className="max-w-[440px] md:max-w-xl mx-auto flex items-center justify-between h-full px-4">
          {/* 1. HOJE */}
          <NavLink
            to="/"
            end
            className="flex flex-col items-center justify-center flex-1 h-full min-h-[48px] min-w-[48px] select-none focus:outline-none transition-transform active:scale-95"
          >
            <div
              className={`flex items-center justify-center w-10 h-7 rounded-full transition-all ${
                isTodayActive
                  ? 'bg-[#E8883A]/15 text-[#B4540F] dark:text-[#E8883A]'
                  : 'text-muted-foreground'
              }`}
            >
              <Home className="w-5 h-5 stroke-[2.2]" />
            </div>
            <span
              className={`text-[11px] tracking-tight mt-1 leading-none ${
                isTodayActive
                  ? 'text-[#B4540F] dark:text-[#E8883A] font-bold'
                  : 'text-muted-foreground font-normal'
              }`}
            >
              Hoje
            </span>
          </NavLink>

          {/* 2. MÓDULOS */}
          <NavLink
            to="/modulos"
            className="flex flex-col items-center justify-center flex-1 h-full min-h-[48px] min-w-[48px] select-none focus:outline-none transition-transform active:scale-95"
          >
            <div
              className={`flex items-center justify-center w-10 h-7 rounded-full transition-all ${
                isInsideModule
                  ? 'bg-[#E8883A]/15 text-[#B4540F] dark:text-[#E8883A]'
                  : 'text-muted-foreground'
              }`}
            >
              <LayoutGrid className="w-5 h-5 stroke-[2.2]" />
            </div>
            <span
              className={`text-[11px] tracking-tight mt-1 leading-none ${
                isInsideModule
                  ? 'text-[#B4540F] dark:text-[#E8883A] font-bold'
                  : 'text-muted-foreground font-normal'
              }`}
            >
              Módulos
            </span>
          </NavLink>

          {/* 3. [+] CENTRAL (Botão circular escuro de 52px, elevado) */}
          <div className="flex flex-col items-center justify-center flex-1 h-full min-h-[48px] min-w-[48px]">
            <button
              type="button"
              onClick={() => setNewEntryModalOpen(true)}
              aria-label="Novo registro"
              className="w-[52px] h-[52px] rounded-full bg-[#1F1B16] dark:bg-[#E8883A] text-white dark:text-[#1F1B16] flex items-center justify-center shadow-lg -translate-y-2 hover:scale-105 active:scale-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E8883A]"
            >
              <Plus className="w-6 h-6 stroke-[2.5]" />
            </button>
          </div>

          {/* 4. RESUMO */}
          <NavLink
            to="/resumo"
            className="flex flex-col items-center justify-center flex-1 h-full min-h-[48px] min-w-[48px] select-none focus:outline-none transition-transform active:scale-95"
          >
            <div
              className={`flex items-center justify-center w-10 h-7 rounded-full transition-all ${
                isResumoActive
                  ? 'bg-[#E8883A]/15 text-[#B4540F] dark:text-[#E8883A]'
                  : 'text-muted-foreground'
              }`}
            >
              <BarChart2 className="w-5 h-5 stroke-[2.2]" />
            </div>
            <span
              className={`text-[11px] tracking-tight mt-1 leading-none ${
                isResumoActive
                  ? 'text-[#B4540F] dark:text-[#E8883A] font-bold'
                  : 'text-muted-foreground font-normal'
              }`}
            >
              Resumo
            </span>
          </NavLink>

          {/* 5. MAIS */}
          <NavLink
            to="/mais"
            className="flex flex-col items-center justify-center flex-1 h-full min-h-[48px] min-w-[48px] select-none focus:outline-none transition-transform active:scale-95"
          >
            <div
              className={`flex items-center justify-center w-10 h-7 rounded-full transition-all ${
                isMaisActive
                  ? 'bg-[#E8883A]/15 text-[#B4540F] dark:text-[#E8883A]'
                  : 'text-muted-foreground'
              }`}
            >
              <MoreHorizontal className="w-5 h-5 stroke-[2.2]" />
            </div>
            <span
              className={`text-[11px] tracking-tight mt-1 leading-none ${
                isMaisActive
                  ? 'text-[#B4540F] dark:text-[#E8883A] font-bold'
                  : 'text-muted-foreground font-normal'
              }`}
            >
              Mais
            </span>
          </NavLink>
        </div>
      </nav>

      {/* MODAIS DO [+] CENTRAL */}
      <NewEntryModal
        open={newEntryModalOpen}
        onOpenChange={setNewEntryModalOpen}
        onOpenQuickPages={() => setQuickPagesOpen(true)}
        onOpenQuickStudy={() => setQuickStudyOpen(true)}
        onOpenQuickWorkout={() => setQuickWorkoutOpen(true)}
        onOpenQuickAchievement={() => setQuickAchievementOpen(true)}
      />
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
    </>
  )
}
export default BottomNav
