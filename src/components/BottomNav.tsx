import React, { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Home, ListTodo, LayoutGrid, Plus, MoreHorizontal } from 'lucide-react'
import { NewEntryModal } from '@/components/quick/NewEntryModal'
import { QuickPagesSheet } from '@/components/quick/QuickPagesSheet'
import { QuickStudySheet } from '@/components/quick/QuickStudySheet'
import { QuickWorkoutSheet } from '@/components/quick/QuickWorkoutSheet'
import { QuickAchievementSheet } from '@/components/quick/QuickAchievementSheet'
import { taskRepository, onTaskBadgeCountChanged } from '@/lib/repositories/taskRepository'
import { openTaskModal } from '@/lib/taskModalEvents'
import { useToast } from '@/hooks/use-toast'
import { useApp } from '@/lib/context'
import { setTaskCompletionHandler } from '@/lib/taskCompletionDispatcher'
import { useNavigate } from 'react-router-dom'

export const BottomNav: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { notifyDataChanged, settings } = useApp()

  // Modais de registro rápido ativados a partir do [+] central
  const [newEntryModalOpen, setNewEntryModalOpen] = useState(false)
  const [quickPagesOpen, setQuickPagesOpen] = useState(false)
  const [quickPagesBookId, setQuickPagesBookId] = useState<string | undefined>()
  const [quickStudyOpen, setQuickStudyOpen] = useState(false)
  const [quickWorkoutOpen, setQuickWorkoutOpen] = useState(false)
  const [quickAchievementOpen, setQuickAchievementOpen] = useState(false)
  const [taskBadgeCount, setTaskBadgeCount] = useState<number>(0)

  // Atualização em tempo real do selo de Tarefas (tarefas abertas de hoje + atrasadas)
  useEffect(() => {
    taskRepository
      .refreshBadgeCount(settings.activeModules)
      .then((count) => setTaskBadgeCount(count))
    const unsubscribe = onTaskBadgeCountChanged((count) => {
      setTaskBadgeCount(count)
    })
    return () => unsubscribe()
  }, [settings.activeModules])

  // Configuração do setTaskCompletionHandler para atender tarefas com moduleData concluídas
  useEffect(() => {
    setTaskCompletionHandler((task) => {
      if (!task.moduleData || !task.moduleData.data) return
      const mod = task.moduleData.module
      const data: any = task.moduleData.data

      if (mod === 'leitura') {
        if (data.bookId) setQuickPagesBookId(data.bookId)
        setQuickPagesOpen(true)
      } else if (mod === 'treino') {
        if (data.tipo === 'cardio' || data.tipo === 'outros') {
          navigate('/treino')
        } else {
          setQuickWorkoutOpen(true)
        }
      } else if (mod === 'estudos') {
        setQuickStudyOpen(true)
      } else if (mod === 'trabalho') {
        setQuickAchievementOpen(true)
      } else if (mod === 'escrita') {
        navigate('/escrita?focus=1')
      }
    })

    return () => {
      setTaskCompletionHandler(null)
    }
  }, [navigate])

  const handleQuickSuccess = (msg: string) => {
    toast({ title: msg })
    notifyDataChanged()
    taskRepository.refreshBadgeCount(settings.activeModules)
  }

  // Verifica se a rota atual é de um módulo
  // "Dentro de qualquer módulo, o item destacado continua sendo 'Módulos'; dentro da tela de Tarefas, o destacado é 'Tarefas'."
  const isInsideModule = [
    '/escrita',
    '/leitura',
    '/treino',
    '/estudos',
    '/trabalho',
    '/modulos',
  ].some((path) => location.pathname.startsWith(path))

  const isTodayActive = location.pathname === '/'
  const isTarefasActive = location.pathname.startsWith('/tarefas')
  const isMaisActive = location.pathname.startsWith('/mais')

  return (
    <>
      <nav
        aria-label="Navegação Principal"
        className="fixed bottom-0 left-0 right-0 z-40 bg-[#F6F3EE]/95 dark:bg-[#1C1814]/95 backdrop-blur-md border-t border-[#EAE4DB]/80 dark:border-[#38332B] h-[84px] pb-[env(safe-area-inset-bottom,0px)]"
      >
        <div className="max-w-[440px] md:max-w-xl mx-auto flex items-center justify-between h-full px-4">
          {/* 1. HOJE */}
          <NavLink
            to="/"
            end
            aria-label="Hoje"
            className="flex flex-col items-center justify-center flex-1 h-full min-h-[48px] select-none focus:outline-none transition-transform active:scale-95 group"
          >
            <div className="w-8 h-8 rounded-full flex items-center justify-center">
              <Home
                className={`w-[22px] h-[22px] stroke-[1.8] ${
                  isTodayActive
                    ? 'text-[#E8883A]'
                    : 'text-[#6B645C] group-hover:text-[#1F1B16] dark:text-[#A8A199]'
                }`}
              />
            </div>
            <span
              className={`text-[11px] font-medium tracking-tight mt-0.5 ${
                isTodayActive
                  ? 'text-[#E8883A] font-semibold'
                  : 'text-[#6B645C] dark:text-[#A8A199]'
              }`}
            >
              Hoje
            </span>
          </NavLink>

          {/* 2. TAREFAS (com selo laranja com o número de tarefas pendentes de hoje + atrasadas; "9+" acima de 9; sem pendências, sem selo) */}
          <NavLink
            to="/tarefas"
            aria-label={taskBadgeCount > 0 ? `Tarefas, ${taskBadgeCount} pendentes` : 'Tarefas'}
            className="flex flex-col items-center justify-center flex-1 h-full min-h-[48px] select-none focus:outline-none transition-transform active:scale-95 group relative"
          >
            <div className="w-8 h-8 rounded-full flex items-center justify-center relative">
              <ListTodo
                className={`w-[22px] h-[22px] stroke-[1.8] ${
                  isTarefasActive
                    ? 'text-[#E8883A]'
                    : 'text-[#6B645C] group-hover:text-[#1F1B16] dark:text-[#A8A199]'
                }`}
              />
              {taskBadgeCount > 0 && (
                <span
                  className="absolute -top-1 -right-2 min-w-[18px] h-[18px] px-1 bg-[#E8883A] text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-[#F6F3EE] dark:border-[#1C1814] shadow-xs pointer-events-none"
                  aria-hidden="true"
                >
                  {taskBadgeCount > 9 ? '9+' : taskBadgeCount}
                </span>
              )}
            </div>
            <span
              className={`text-[11px] font-medium tracking-tight mt-0.5 ${
                isTarefasActive
                  ? 'text-[#E8883A] font-semibold'
                  : 'text-[#6B645C] dark:text-[#A8A199]'
              }`}
            >
              Tarefas
            </span>
          </NavLink>

          {/* 3. [+] CENTRAL ("Novo registro") */}
          <div className="flex flex-col items-center justify-center flex-1 h-full">
            <button
              type="button"
              onClick={() => setNewEntryModalOpen(true)}
              aria-label="Novo registro"
              className="w-[48px] h-[48px] min-h-[48px] min-w-[48px] rounded-full bg-[#1F1B16] dark:bg-[#F6F3EE] text-white dark:text-[#1F1B16] flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E8883A]"
            >
              <Plus className="w-5 h-5 stroke-[2.2]" />
            </button>
            <span className="text-[11px] font-medium tracking-tight mt-0.5 opacity-0 select-none pointer-events-none">
              Novo
            </span>
          </div>

          {/* 4. MÓDULOS */}
          <NavLink
            to="/modulos"
            aria-label="Módulos"
            className="flex flex-col items-center justify-center flex-1 h-full min-h-[48px] select-none focus:outline-none transition-transform active:scale-95 group"
          >
            <div className="w-8 h-8 rounded-full flex items-center justify-center">
              <LayoutGrid
                className={`w-[22px] h-[22px] stroke-[1.8] ${
                  isInsideModule
                    ? 'text-[#E8883A]'
                    : 'text-[#6B645C] group-hover:text-[#1F1B16] dark:text-[#A8A199]'
                }`}
              />
            </div>
            <span
              className={`text-[11px] font-medium tracking-tight mt-0.5 ${
                isInsideModule
                  ? 'text-[#E8883A] font-semibold'
                  : 'text-[#6B645C] dark:text-[#A8A199]'
              }`}
            >
              Módulos
            </span>
          </NavLink>

          {/* 5. MAIS */}
          <NavLink
            to="/mais"
            aria-label="Mais opções"
            className="flex flex-col items-center justify-center flex-1 h-full min-h-[48px] select-none focus:outline-none transition-transform active:scale-95 group"
          >
            <div className="w-8 h-8 rounded-full flex items-center justify-center">
              <MoreHorizontal
                className={`w-[22px] h-[22px] stroke-[1.8] ${
                  isMaisActive
                    ? 'text-[#E8883A]'
                    : 'text-[#6B645C] group-hover:text-[#1F1B16] dark:text-[#A8A199]'
                }`}
              />
            </div>
            <span
              className={`text-[11px] font-medium tracking-tight mt-0.5 ${
                isMaisActive ? 'text-[#E8883A] font-semibold' : 'text-[#6B645C] dark:text-[#A8A199]'
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
        onOpenNewTask={() => openTaskModal()}
      />
      <QuickPagesSheet
        open={quickPagesOpen}
        onOpenChange={(op) => {
          setQuickPagesOpen(op)
          if (!op) setQuickPagesBookId(undefined)
        }}
        preferredBookId={quickPagesBookId}
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
