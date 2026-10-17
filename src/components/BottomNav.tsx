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
        className="fixed bottom-0 left-0 right-0 z-40 bg-[#F6F3EE]/95 dark:bg-[#1C1814]/95 backdrop-blur-md border-t border-[#EAE4DB]/80 dark:border-[#38332B] h-[72px] pb-[env(safe-area-inset-bottom,0px)]"
      >
        <div className="max-w-[440px] md:max-w-xl mx-auto flex items-center justify-between h-full px-6">
          {/* 1. HOJE */}
          <NavLink
            to="/"
            end
            className="flex items-center justify-center flex-1 h-full select-none focus:outline-none transition-transform active:scale-95"
          >
            <Home
              className={`w-[22px] h-[22px] stroke-[1.8] ${
                isTodayActive
                  ? 'text-[#E8883A]'
                  : 'text-[#6B645C] hover:text-[#1F1B16] dark:text-[#A8A199]'
              }`}
            />
          </NavLink>

          {/* 2. MÓDULOS */}
          <NavLink
            to="/modulos"
            className="flex items-center justify-center flex-1 h-full select-none focus:outline-none transition-transform active:scale-95"
          >
            <LayoutGrid
              className={`w-[22px] h-[22px] stroke-[1.8] ${
                isInsideModule
                  ? 'text-[#E8883A]'
                  : 'text-[#6B645C] hover:text-[#1F1B16] dark:text-[#A8A199]'
              }`}
            />
          </NavLink>

          {/* 3. [+] CENTRAL (Botão circular escuro de 52px) */}
          <div className="flex items-center justify-center flex-1 h-full">
            <button
              type="button"
              onClick={() => setNewEntryModalOpen(true)}
              aria-label="Novo registro"
              className="w-[48px] h-[48px] rounded-full bg-[#1F1B16] dark:bg-[#F6F3EE] text-white dark:text-[#1F1B16] flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E8883A]"
            >
              <Plus className="w-5 h-5 stroke-[2.2]" />
            </button>
          </div>

          {/* 4. RESUMO */}
          <NavLink
            to="/resumo"
            className="flex items-center justify-center flex-1 h-full select-none focus:outline-none transition-transform active:scale-95"
          >
            <BarChart2
              className={`w-[22px] h-[22px] stroke-[1.8] ${
                isResumoActive
                  ? 'text-[#E8883A]'
                  : 'text-[#6B645C] hover:text-[#1F1B16] dark:text-[#A8A199]'
              }`}
            />
          </NavLink>

          {/* 5. MAIS */}
          <NavLink
            to="/mais"
            className="flex items-center justify-center flex-1 h-full select-none focus:outline-none transition-transform active:scale-95"
          >
            <MoreHorizontal
              className={`w-[22px] h-[22px] stroke-[1.8] ${
                isMaisActive
                  ? 'text-[#E8883A]'
                  : 'text-[#6B645C] hover:text-[#1F1B16] dark:text-[#A8A199]'
              }`}
            />
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
