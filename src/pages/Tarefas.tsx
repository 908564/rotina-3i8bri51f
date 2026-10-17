import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Search,
  Check,
  Flag,
  Plus,
  Circle,
  Clock,
  BookOpen,
  GraduationCap,
  Briefcase,
  Dumbbell,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react'
import { Task, TaskModule, Livro, Course, Project } from '@/lib/types'
import { taskRepository } from '@/lib/repositories/taskRepository'
import { leituraRepository } from '@/lib/repositories/leituraRepository'
import { estudosRepository } from '@/lib/repositories/estudosRepository'
import { trabalhoRepository } from '@/lib/repositories/trabalhoRepository'
import { openTaskModal } from '@/lib/taskModalEvents'
import { MODULE_COLORS } from '@/components/TaskModal'
import { useToast } from '@/hooks/use-toast'
import { useApp } from '@/lib/context'
import {
  getTodayDateKey,
  addDaysToDateKey,
  daysBetween,
  parseLocalDate,
  formatDateDisplay,
  getLocalDayOfWeek,
} from '@/lib/dateUtils'
import { ToastAction } from '@/components/ui/toast'

const STORAGE_FILTER_KEY = 'rotina_tarefas_module_filter'
const STORAGE_TAB_KEY = 'rotina_tarefas_active_tab'

export default function TarefasPage() {
  const { toast } = useToast()
  const { settings } = useApp()
  const activeModules = settings.activeModules

  // Persistência de Filtro e Aba
  const [activeModuleFilter, setActiveModuleFilter] = useState<string>(() => {
    return localStorage.getItem(STORAGE_FILTER_KEY) || 'todas'
  })
  const [activeTab, setActiveTab] = useState<'hoje' | 'semana' | 'concluidas'>(() => {
    const saved = localStorage.getItem(STORAGE_TAB_KEY)
    if (saved === 'hoje' || saved === 'semana' || saved === 'concluidas') return saved
    return 'hoje'
  })

  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  // Cache de entidades vinculadas para exibição de nomes
  const [booksMap, setBooksMap] = useState<Map<string, Livro>>(new Map())
  const [coursesMap, setCoursesMap] = useState<Map<string, Course>>(new Map())
  const [projectsMap, setProjectsMap] = useState<Map<string, Project>>(new Map())

  const loadData = useCallback(async () => {
    try {
      const [allTasks, bList, cList, pList] = await Promise.all([
        taskRepository.getTasks(),
        leituraRepository.getLivros(),
        estudosRepository.getCourses(),
        trabalhoRepository.getProjects(),
      ])
      setTasks(allTasks)
      setBooksMap(new Map(bList.map((b) => [b.id, b])))
      setCoursesMap(new Map(cList.map((c) => [c.id, c])))
      setProjectsMap(new Map(pList.map((p) => [p.id, p])))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleSetModuleFilter = (mod: string) => {
    setActiveModuleFilter(mod)
    localStorage.setItem(STORAGE_FILTER_KEY, mod)
  }

  const handleSetTab = (tab: 'hoje' | 'semana' | 'concluidas') => {
    setActiveTab(tab)
    localStorage.setItem(STORAGE_TAB_KEY, tab)
  }

  // Alternar conclusão da tarefa com toast de 5s e botão Desfazer
  const handleToggleTask = async (task: Task, e: React.MouseEvent) => {
    e.stopPropagation()
    const updated = await taskRepository.toggleTaskStatus(task.id)
    if (!updated) return

    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))

    if (updated.status === 'done') {
      toast({
        title: 'Tarefa concluída',
        description: `"${task.title}"`,
        duration: 5000,
        action: (
          <ToastAction
            altText="Desfazer conclusão"
            onClick={async () => {
              const undone = await taskRepository.toggleTaskStatus(task.id)
              if (undone) {
                setTasks((prev) => prev.map((t) => (t.id === undone.id ? undone : t)))
              }
            }}
          >
            Desfazer
          </ToastAction>
        ),
      })
    }
  }

  // Filtra por módulos ativos do app
  const visibleTasks = useMemo(() => {
    return taskRepository.filterByActiveModules(tasks, activeModules)
  }, [tasks, activeModules])

  // Filtro de módulo selecionado na barra de chips
  const moduleFilteredTasks = useMemo(() => {
    if (activeModuleFilter === 'todas') return visibleTasks
    return visibleTasks.filter((t) => t.module === activeModuleFilter)
  }, [visibleTasks, activeModuleFilter])

  // Filtro de busca (título e subtarefas)
  const searchedTasks = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return moduleFilteredTasks
    return moduleFilteredTasks.filter((t) => {
      if (t.title.toLowerCase().includes(q)) return true
      return t.subtasks?.some((st) => st.title.toLowerCase().includes(q))
    })
  }, [moduleFilteredTasks, searchQuery])

  // Contagens para o card de resumo
  const todayKey = getTodayDateKey()
  const summaryMetrics = useMemo(() => {
    // Y = tarefas abertas com prazo hoje + atrasadas abertas + tarefas concluídas hoje
    const overdueOpen = visibleTasks.filter(
      (t) => t.status === 'open' && t.dueDate && t.dueDate < todayKey,
    )
    const todayOpen = visibleTasks.filter((t) => t.status === 'open' && t.dueDate === todayKey)
    const doneToday = visibleTasks.filter((t) => {
      if (t.status !== 'done') return false
      if (!t.completedAt) return false
      const doneKey = t.completedAt.substring(0, 10)
      return doneKey === todayKey
    })

    const totalY = overdueOpen.length + todayOpen.length + doneToday.length
    const doneX = doneToday.length
    const overdueCount = overdueOpen.length

    return {
      doneX,
      totalY,
      overdueCount,
      percent: totalY > 0 ? Math.round((doneX / totalY) * 100) : 100,
    }
  }, [visibleTasks, todayKey])

  // Classificação para Abas
  // 1. Aba Hoje: Atrasadas (âmbar, abertas de datas passadas) e Hoje (prazo hoje)
  const overdueTasks = useMemo(() => {
    const list = searchedTasks.filter(
      (t) => t.status === 'open' && t.dueDate && t.dueDate < todayKey,
    )
    return taskRepository.sortTasks(list)
  }, [searchedTasks, todayKey])

  const todayTasks = useMemo(() => {
    const list = searchedTasks.filter((t) => {
      if (t.dueDate !== todayKey) return false
      // Se estiver na aba hoje, mostra tarefas de hoje (abertas e concluídas hoje)
      return true
    })
    return taskRepository.sortTasks(list)
  }, [searchedTasks, todayKey])

  // 2. Aba Semana: De amanhã até domingo, agrupadas por dia, depois SEM DATA
  const { weekDaysGrouped, noDateTasks } = useMemo(() => {
    // Calcula os próximos dias até o domingo da semana atual
    const todayObj = parseLocalDate(todayKey)
    const dayOfWeek = todayObj.getDay() // 0 = Dom, 1 = Seg...
    const daysUntilSunday = (7 - dayOfWeek) % 7

    const days: { dateKey: string; label: string; tasks: Task[] }[] = []

    for (let i = 1; i <= Math.max(1, daysUntilSunday); i++) {
      const dKey = addDaysToDateKey(todayKey, i)
      const dayTasks = searchedTasks.filter((t) => t.dueDate === dKey && t.status === 'open')
      const sorted = taskRepository.sortTasks(dayTasks)

      // Formatação "AMANHÃ · QUA, 21" ou "QUI, 22"
      const dObj = parseLocalDate(dKey)
      const weekDaysShort = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB']
      const dayNum = dObj.getDate()
      const dayName = weekDaysShort[dObj.getDay()]

      let label = `${dayName}, ${dayNum}`
      if (i === 1) {
        label = `AMANHÃ · ${dayName}, ${dayNum}`
      }

      days.push({
        dateKey: dKey,
        label,
        tasks: sorted,
      })
    }

    const noDate = searchedTasks.filter((t) => !t.dueDate && t.status === 'open')
    return {
      weekDaysGrouped: days,
      noDateTasks: taskRepository.sortTasks(noDate),
    }
  }, [searchedTasks, todayKey])

  // 3. Aba Concluídas: últimos 30 dias, agrupadas pelo dia da conclusão
  const completedGrouped = useMemo(() => {
    const thirtyDaysAgoKey = addDaysToDateKey(todayKey, -30)
    const list = searchedTasks.filter((t) => {
      if (t.status !== 'done') return false
      const doneKey = t.completedAt ? t.completedAt.substring(0, 10) : ''
      return doneKey >= thirtyDaysAgoKey
    })

    const groups: Record<string, Task[]> = {}
    for (const t of list) {
      const dKey = t.completedAt ? t.completedAt.substring(0, 10) : todayKey
      if (!groups[dKey]) groups[dKey] = []
      groups[dKey].push(t)
    }

    const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a))
    return sortedDates.map((dKey) => ({
      dateKey: dKey,
      label: formatDateLabel(dKey, todayKey),
      tasks: taskRepository.sortTasks(groups[dKey]),
    }))
  }, [searchedTasks, todayKey])

  // Helper de texto de data relativa
  function formatDateLabel(dKey: string, today: string): string {
    const diff = daysBetween(dKey, today)
    if (diff === 0) return 'Hoje'
    if (diff === 1) return 'Ontem'
    if (diff > 1 && diff <= 7) return `há ${diff} dias`
    return formatDateDisplay(dKey)
  }

  // Nome da entidade vinculada
  function getLinkName(link: Task['link']): string | null {
    if (!link) return null
    if (link.type === 'book') {
      return booksMap.get(link.id)?.title || 'Livro'
    }
    if (link.type === 'course') {
      return coursesMap.get(link.id)?.title || 'Curso'
    }
    if (link.type === 'project') {
      return projectsMap.get(link.id)?.name || 'Projeto'
    }
    if (link.type === 'workoutDay') {
      return 'Treino do dia'
    }
    return null
  }

  // Contagens para os chips de módulo
  const availableChips = useMemo(() => {
    const list: { key: string; label: string; color: string }[] = [
      { key: 'todas', label: 'Todas', color: '#1F1B16' },
    ]
    const moduleOrder: TaskModule[] = [
      'escrita',
      'leitura',
      'treino',
      'estudos',
      'trabalho',
      'geral',
    ]
    for (const m of moduleOrder) {
      if (m === 'geral' || activeModules[m] !== false) {
        list.push({
          key: m,
          label: MODULE_COLORS[m].label,
          color: MODULE_COLORS[m].fill,
        })
      }
    }
    return list
  }, [activeModules])

  const countHoje = overdueTasks.length + todayTasks.filter((t) => t.status === 'open').length
  const countSemana = weekDaysGrouped.reduce((s, g) => s + g.tasks.length, 0) + noDateTasks.length

  const handleOpenNewTask = (dateKey?: string | null) => {
    const preselectedMod =
      activeModuleFilter !== 'todas' ? (activeModuleFilter as TaskModule) : 'geral'
    openTaskModal({
      module: preselectedMod,
      dueDate: dateKey !== undefined ? dateKey : todayKey,
    })
  }

  // Componente da Linha de Tarefa
  const TaskRow = ({ task }: { task: Task }) => {
    const isDone = task.status === 'done'
    const isOverdue = task.status === 'open' && Boolean(task.dueDate && task.dueDate < todayKey)
    const conf = MODULE_COLORS[task.module] || MODULE_COLORS.geral
    const linkName = getLinkName(task.link)

    // Formatação de data da linha
    let dateText = ''
    if (task.dueDate) {
      const diff = daysBetween(task.dueDate, todayKey)
      if (diff === 0) dateText = 'Hoje'
      else if (diff === -1) dateText = 'Amanhã'
      else if (diff === 1) dateText = 'Ontem'
      else if (diff > 1) dateText = `há ${diff} dias`
      else {
        const dObj = parseLocalDate(task.dueDate)
        const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
        dateText = `${weekDays[dObj.getDay()]}, ${dObj.getDate()}`
      }
    }

    const subtasksDone = task.subtasks?.filter((st) => st.done).length || 0
    const subtasksTotal = task.subtasks?.length || 0

    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => openTaskModal({ taskId: task.id })}
        onKeyDown={(e) => {
          if (e.key === 'Enter') openTaskModal({ taskId: task.id })
        }}
        className={`w-full min-h-[64px] p-3.5 sm:p-4 rounded-[18px] bg-card border border-[#EAE4DB] dark:border-[#38332B] flex items-center gap-3.5 text-left transition-all hover:border-[#1F1B16]/20 dark:hover:border-white/20 active:scale-[0.99] cursor-pointer group shadow-subtle ${
          isDone ? 'opacity-60 bg-muted/20' : ''
        }`}
      >
        {/* Caixa de seleção circular de 24px com área de toque de 44px */}
        <button
          type="button"
          onClick={(e) => handleToggleTask(task, e)}
          aria-label={isDone ? 'Reabrir tarefa' : 'Concluir tarefa'}
          className="w-11 h-11 min-w-[44px] min-h-[44px] -ml-2 rounded-full flex items-center justify-center transition-transform active:scale-90"
        >
          <div
            className="w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors"
            style={{
              borderColor: conf.text,
              backgroundColor: isDone ? conf.text : 'transparent',
            }}
          >
            {isDone && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
          </div>
        </button>

        {/* Título e Metadados */}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <span
              className={`text-[15px] font-semibold text-[#1F1B16] dark:text-[#F6F3EE] leading-snug break-words ${
                isDone ? 'line-through text-[#6B645C]' : ''
              }`}
            >
              {task.title}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            {/* Chip do módulo (ponto + nome) */}
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold"
              style={{ backgroundColor: conf.bg, color: conf.text }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: conf.text }} />
              {conf.label}
            </span>

            {/* Horário */}
            {task.dueTime && (
              <span className="inline-flex items-center gap-0.5 text-[#6B645C] dark:text-[#A8A199] text-[11px] font-medium">
                <Clock className="w-3 h-3 text-[#E8883A]" />
                {task.dueTime}
              </span>
            )}

            {/* Subtarefas */}
            {subtasksTotal > 0 && (
              <span className="text-[#6B645C] dark:text-[#A8A199] text-[11px] font-medium">
                {subtasksDone}/{subtasksTotal}
              </span>
            )}

            {/* Livro/Curso/Projeto vinculado */}
            {linkName && (
              <span className="text-[#6B645C] dark:text-[#A8A199] text-[11px] font-medium truncate max-w-[120px] sm:max-w-[180px]">
                • {linkName}
              </span>
            )}

            {/* Data relativa */}
            {dateText && (
              <span
                className={`text-[11px] font-medium ${
                  isOverdue ? 'text-[#8A5A00] font-bold' : 'text-[#6B645C] dark:text-[#A8A199]'
                }`}
              >
                • {dateText}
              </span>
            )}
          </div>
        </div>

        {/* Bandeira de prioridade alta à direita */}
        {task.priority === 'high' && (
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
            aria-label="Prioridade alta"
          >
            <Flag className="w-4 h-4 text-red-500 fill-red-500" />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="pt-2 pb-24 space-y-5 max-w-[1100px] mx-auto">
      {/* CABEÇALHO */}
      <header className="flex items-center justify-between gap-4 pb-1">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1F1B16] dark:text-[#F6F3EE]">
            Tarefas
          </h1>
          <p className="text-xs sm:text-sm text-[#6B645C] dark:text-[#A8A199]">
            Tudo o que você precisa fazer, por módulo
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsSearching(!isSearching)}
          aria-label="Buscar tarefas"
          className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-card hover:bg-muted border border-[#EAE4DB] dark:border-[#38332B] flex items-center justify-center text-[#1F1B16] dark:text-[#F6F3EE] transition-all active:scale-95 shrink-0"
        >
          <Search className="w-5 h-5" />
        </button>
      </header>

      {/* CAMPO DE BUSCA (QUANDO ABERTO) */}
      {isSearching && (
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B645C]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Pesquisar em título e subtarefas..."
            className="w-full h-11 pl-10 pr-4 text-xs font-medium rounded-2xl border border-[#EAE4DB] dark:border-[#38332B] bg-card text-[#1F1B16] dark:text-[#F6F3EE] placeholder:text-[#6B645C]/60 focus:outline-none"
            autoFocus
          />
        </div>
      )}

      {/* CARD DE RESUMO (branco, cantos 20px, barra laranja, pílula âmbar) */}
      <div className="rounded-[20px] bg-card border border-[#EAE4DB] dark:border-[#38332B] p-4 sm:p-5 shadow-subtle space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="space-y-0.5">
            <span className="text-sm sm:text-base font-bold text-[#1F1B16] dark:text-[#F6F3EE]">
              {summaryMetrics.doneX} de {summaryMetrics.totalY} concluídas hoje
            </span>
          </div>

          {summaryMetrics.overdueCount > 0 && (
            <span className="px-2.5 py-1 rounded-full bg-[#FBEBD3] text-[#8A5A00] text-xs font-bold flex items-center gap-1 shrink-0">
              <AlertTriangle className="w-3.5 h-3.5" />
              {summaryMetrics.overdueCount} atrasada{summaryMetrics.overdueCount > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Barra de progresso laranja */}
        <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-[#E8883A] transition-all duration-300"
            style={{ width: `${summaryMetrics.percent}%` }}
          />
        </div>
      </div>

      {/* FILTROS POR MÓDULO (Linha rolável de chips com ponto na cor do módulo) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {availableChips.map((chip) => {
          const isSelected = activeModuleFilter === chip.key
          return (
            <button
              key={chip.key}
              type="button"
              onClick={() => handleSetModuleFilter(chip.key)}
              className={`h-9 min-h-[36px] px-3.5 rounded-full text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all border ${
                isSelected
                  ? 'bg-[#1F1B16] text-white dark:bg-[#F6F3EE] dark:text-[#1F1B16] border-transparent'
                  : 'bg-card text-[#1F1B16] dark:text-[#F6F3EE] border-[#EAE4DB] dark:border-[#38332B] hover:bg-muted/40'
              }`}
            >
              {chip.key !== 'todas' && (
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: chip.color }}
                />
              )}
              <span>{chip.label}</span>
            </button>
          )
        })}
      </div>

      {/* ABAS (Controle segmentado: Hoje · Semana · Concluídas) */}
      <div className="grid grid-cols-3 p-1 rounded-2xl bg-muted/50 border border-[#EAE4DB] dark:border-[#38332B]">
        <button
          type="button"
          onClick={() => handleSetTab('hoje')}
          className={`h-10 min-h-[40px] rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'hoje'
              ? 'bg-card text-[#1F1B16] dark:text-[#F6F3EE] shadow-xs'
              : 'text-[#6B645C] hover:text-[#1F1B16]'
          }`}
        >
          <span>Hoje</span>
          {countHoje > 0 && (
            <span className="w-5 h-5 rounded-full bg-[#E8883A]/15 text-[#E8883A] text-[10px] font-bold flex items-center justify-center">
              {countHoje}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => handleSetTab('semana')}
          className={`h-10 min-h-[40px] rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'semana'
              ? 'bg-card text-[#1F1B16] dark:text-[#F6F3EE] shadow-xs'
              : 'text-[#6B645C] hover:text-[#1F1B16]'
          }`}
        >
          <span>Semana</span>
          {countSemana > 0 && (
            <span className="w-5 h-5 rounded-full bg-[#E8883A]/15 text-[#E8883A] text-[10px] font-bold flex items-center justify-center">
              {countSemana}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => handleSetTab('concluidas')}
          className={`h-10 min-h-[40px] rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'concluidas'
              ? 'bg-card text-[#1F1B16] dark:text-[#F6F3EE] shadow-xs'
              : 'text-[#6B645C] hover:text-[#1F1B16]'
          }`}
        >
          <span>Concluídas</span>
        </button>
      </div>

      {/* CONTEÚDO DAS ABAS */}
      <div className="space-y-6">
        {/* ===================== ABA HOJE ===================== */}
        {activeTab === 'hoje' && (
          <div className="space-y-6">
            {/* Seção ATRASADAS */}
            {overdueTasks.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center gap-1.5 px-1">
                  <span className="w-2 h-2 rounded-full bg-[#8A5A00]" />
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#8A5A00]">
                    Atrasadas ({overdueTasks.length})
                  </h3>
                </div>
                <div className="space-y-2.5">
                  {overdueTasks.map((task) => (
                    <TaskRow key={task.id} task={task} />
                  ))}
                </div>
              </div>
            )}

            {/* Seção HOJE */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-1.5 px-1">
                <span className="w-2 h-2 rounded-full bg-[#E8883A]" />
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#1F1B16] dark:text-[#F6F3EE]">
                  Hoje ({todayTasks.length})
                </h3>
              </div>

              {todayTasks.length > 0 ? (
                <div className="space-y-2.5">
                  {todayTasks.map((task) => (
                    <TaskRow key={task.id} task={task} />
                  ))}
                </div>
              ) : overdueTasks.length === 0 ? (
                <div className="p-8 rounded-2xl bg-card border border-[#EAE4DB] dark:border-[#38332B] text-center space-y-2">
                  <span className="text-2xl">✨</span>
                  <h3 className="text-sm font-bold text-[#1F1B16] dark:text-[#F6F3EE]">
                    Tudo feito por hoje
                  </h3>
                  <p className="text-xs text-[#6B645C]">
                    Você completou todas as tarefas planejadas para esta data. Excelente trabalho!
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* ===================== ABA SEMANA ===================== */}
        {activeTab === 'semana' && (
          <div className="space-y-6">
            {weekDaysGrouped.map((dayGroup) => (
              <div key={dayGroup.dateKey} className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => handleOpenNewTask(dayGroup.dateKey)}
                  className="w-full flex items-center justify-between text-left group px-1"
                >
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#6B645C] group-hover:text-[#1F1B16] dark:text-[#A8A199] transition-colors">
                    {dayGroup.label} ({dayGroup.tasks.length})
                  </h3>
                  <span className="text-[11px] font-bold text-[#B4540F] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                    <Plus className="w-3 h-3" /> Nova para este dia
                  </span>
                </button>

                {dayGroup.tasks.length > 0 ? (
                  <div className="space-y-2.5">
                    {dayGroup.tasks.map((task) => (
                      <TaskRow key={task.id} task={task} />
                    ))}
                  </div>
                ) : (
                  <div className="p-3 text-center border border-dashed border-[#EAE4DB] dark:border-[#38332B] rounded-xl text-xs text-[#6B645C]">
                    Nenhuma tarefa para este dia. Toque para agendar.
                  </div>
                )}
              </div>
            ))}

            {/* Seção SEM DATA */}
            <div className="space-y-2.5 pt-2 border-t border-[#EAE4DB] dark:border-[#38332B]">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#6B645C] dark:text-[#A8A199]">
                  Sem data ({noDateTasks.length})
                </h3>
              </div>

              {noDateTasks.length > 0 ? (
                <div className="space-y-2.5">
                  {noDateTasks.map((task) => (
                    <TaskRow key={task.id} task={task} />
                  ))}
                </div>
              ) : (
                <div className="p-3 text-center border border-dashed border-[#EAE4DB] dark:border-[#38332B] rounded-xl text-xs text-[#6B645C]">
                  Nenhuma tarefa sem data.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===================== ABA CONCLUÍDAS ===================== */}
        {activeTab === 'concluidas' && (
          <div className="space-y-6">
            {completedGrouped.length > 0 ? (
              completedGrouped.map((group) => (
                <div key={group.dateKey} className="space-y-2.5">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#6B645C] dark:text-[#A8A199] px-1">
                    {group.label} ({group.tasks.length})
                  </h3>
                  <div className="space-y-2.5">
                    {group.tasks.map((task) => (
                      <TaskRow key={task.id} task={task} />
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 rounded-2xl bg-card border border-[#EAE4DB] dark:border-[#38332B] text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-[#6B645C] mx-auto" />
                <h3 className="text-sm font-bold text-[#1F1B16] dark:text-[#F6F3EE]">
                  Nenhuma tarefa concluída
                </h3>
                <p className="text-xs text-[#6B645C]">
                  Conclua tarefas tocando na caixa circular para vê-las listadas aqui nos últimos 30
                  dias.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Botão tracejado "Adicionar tarefa" no fim da lista */}
        <button
          type="button"
          onClick={() => handleOpenNewTask()}
          className="w-full h-14 min-h-[56px] rounded-2xl border-2 border-dashed border-[#EAE4DB] dark:border-[#38332B] hover:border-[#E8883A] text-[#6B645C] hover:text-[#B4540F] dark:hover:text-[#E8883A] font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>
            Adicionar tarefa{' '}
            {activeModuleFilter !== 'todas'
              ? `de ${MODULE_COLORS[activeModuleFilter as TaskModule]?.label || ''}`
              : ''}
          </span>
        </button>

        {/* ESTADOS VAZIOS GLOBAIS */}
        {visibleTasks.length === 0 && (
          <div className="p-8 rounded-2xl bg-card border border-[#EAE4DB] dark:border-[#38332B] text-center space-y-3">
            <h3 className="text-base font-bold text-[#1F1B16] dark:text-[#F6F3EE]">
              Nenhuma tarefa por aqui. Que tal criar a primeira?
            </h3>
            <button
              type="button"
              onClick={() => handleOpenNewTask()}
              className="h-11 px-5 rounded-xl bg-[#1F1B16] dark:bg-[#F6F3EE] text-white dark:text-[#1F1B16] text-xs font-bold inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Criar tarefa
            </button>
          </div>
        )}

        {visibleTasks.length > 0 && moduleFilteredTasks.length === 0 && (
          <div className="p-8 rounded-2xl bg-card border border-[#EAE4DB] dark:border-[#38332B] text-center space-y-2">
            <h3 className="text-sm font-bold text-[#1F1B16] dark:text-[#F6F3EE]">
              Sem tarefas de{' '}
              {MODULE_COLORS[activeModuleFilter as TaskModule]?.label || activeModuleFilter}
            </h3>
            <p className="text-xs text-[#6B645C]">
              Crie uma tarefa para este módulo usando o botão acima.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
