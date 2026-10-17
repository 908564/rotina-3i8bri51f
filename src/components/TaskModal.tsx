import React, { useState, useEffect, useRef } from 'react'
import {
  X,
  Check,
  Flag,
  Plus,
  Trash2,
  Calendar,
  Clock,
  Bell,
  BookOpen,
  GraduationCap,
  Briefcase,
  Dumbbell,
  GripVertical,
  CheckSquare,
  PenLine,
} from 'lucide-react'
import {
  Task,
  TaskModule,
  TaskPriority,
  TaskLink,
  TaskSubtask,
  Livro,
  Course,
  Project,
  TaskEscritaData,
  TaskLeituraData,
  TaskTreinoData,
  TaskEstudosData,
  TaskTrabalhoData,
} from '@/lib/types'
import { taskRepository } from '@/lib/repositories/taskRepository'
import { leituraRepository } from '@/lib/repositories/leituraRepository'
import { estudosRepository } from '@/lib/repositories/estudosRepository'
import { trabalhoRepository } from '@/lib/repositories/trabalhoRepository'
import { treinoRepository } from '@/lib/repositories/treinoRepository'
import { useToast } from '@/hooks/use-toast'
import { useApp } from '@/lib/context'
import { getTodayDateKey, addDaysToDateKey, getLocalDateKey } from '@/lib/dateUtils'
import { registerTaskModal, TaskModalContext } from '@/lib/taskModalEvents'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ModuleSectionForm } from '@/components/ModuleSectionForm'
import { BookFormModal } from '@/components/BookFormModal'
import { validateAndCleanModuleData, hasFilledModuleData } from '@/lib/moduleDataValidation'

export const MODULE_COLORS: Record<
  TaskModule,
  {
    label: string
    fill: string
    text: string
    bg: string
    icon: React.ComponentType<{ className?: string }>
  }
> = {
  escrita: { label: 'Escrita', fill: '#7B83E6', text: '#4C54C2', bg: '#E1E3FA', icon: PenLine },
  leitura: { label: 'Leitura', fill: '#4FB3A0', text: '#1F7F6E', bg: '#D6EEE9', icon: BookOpen },
  treino: { label: 'Treino', fill: '#E07A68', text: '#B8503E', bg: '#F3DDD7', icon: Dumbbell },
  estudos: {
    label: 'Estudos',
    fill: '#8F6FD0',
    text: '#6A4BB0',
    bg: '#E9E1F7',
    icon: GraduationCap,
  },
  trabalho: { label: 'Trabalho', fill: '#5A7184', text: '#3F5A70', bg: '#DCE6EE', icon: Briefcase },
  geral: { label: 'Geral', fill: '#8A8279', text: '#5B544C', bg: '#ECE6DC', icon: CheckSquare },
}

export function TaskModal() {
  const { toast } = useToast()
  const { settings, notifyDataChanged } = useApp()
  const activeModules = settings.activeModules

  const [isOpen, setIsOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  // Campos do formulário
  const [title, setTitle] = useState('')
  const [module, setModule] = useState<TaskModule>('geral')
  const [link, setLink] = useState<TaskLink | null>(null)
  const [dueDate, setDueDate] = useState<string | null>(getTodayDateKey())
  const [dueTime, setDueTime] = useState<string | null>(null)
  const [reminder, setReminder] = useState(false)
  const [priority, setPriority] = useState<TaskPriority>('normal')
  const [subtasks, setSubtasks] = useState<TaskSubtask[]>([])
  const [showDatePicker, setShowDatePicker] = useState(false)

  // Diálogos de confirmação
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [confirmSwitchModuleOpen, setConfirmSwitchModuleOpen] = useState(false)
  const [pendingModule, setPendingModule] = useState<TaskModule | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [quickBookModalOpen, setQuickBookModalOpen] = useState(false)

  // ModuleData por módulo
  const [escritaData, setEscritaData] = useState<TaskEscritaData>({ tipo: 'diario' })
  const [leituraData, setLeituraData] = useState<TaskLeituraData>({})
  const [treinoData, setTreinoData] = useState<TaskTreinoData>({
    tipo: 'musculacao',
    musculacao: { subtipo: 'academia', diaOuGrupo: '' },
  })
  const [estudosData, setEstudosData] = useState<TaskEstudosData>({
    tipoAtividade: 'assistir_aula',
  })
  const [trabalhoData, setTrabalhoData] = useState<TaskTrabalhoData>({
    tipo: 'tarefa',
    sugerirConquista: false,
  })

  // Itens para vínculo e histórico de esportes
  const [books, setBooks] = useState<Livro[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [workoutDays, setWorkoutDays] = useState<{ dayOfWeek: number; name: string }[]>([])
  const [sportSuggestions, setSportSuggestions] = useState<string[]>([])

  const titleInputRef = useRef<HTMLInputElement>(null)

  // Carrega opções de vínculo e histórico
  useEffect(() => {
    async function loadEntities() {
      try {
        const [b, c, p, w, logs] = await Promise.all([
          leituraRepository.getLivros(),
          estudosRepository.getCourses(),
          trabalhoRepository.getProjects(),
          treinoRepository.getWeeklyPlans(),
          treinoRepository.getAllLogs?.() || [],
        ])
        // Livros 'lendo' primeiro
        const sortedBooks = [...b].sort((x, y) => {
          if (x.status === 'lendo' && y.status !== 'lendo') return -1
          if (x.status !== 'lendo' && y.status === 'lendo') return 1
          return x.title.localeCompare(y.title)
        })
        setBooks(sortedBooks)
        setCourses(c)
        setProjects(p)

        const dayNames = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']
        const daysWithPlan = (w || [])
          .filter((d) => d.exercises && d.exercises.length > 0)
          .map((d) => ({
            dayOfWeek: d.dayOfWeek,
            name: `${dayNames[d.dayOfWeek - 1] || 'Dia'} ${d.workoutName ? `(${d.workoutName})` : ''}`,
          }))
        setWorkoutDays(daysWithPlan)

        // Sugestões de esportes
        const sports = Array.from(
          new Set(logs.map((l: any) => l.sportName || l.workoutName).filter(Boolean)),
        ).slice(0, 6)
        setSportSuggestions(sports as string[])
      } catch {
        // Fallback silencioso
      }
    }
    loadEntities()
  }, [])

  // Calcula domingo da semana atual
  const getSundayDateKey = (): string => {
    const today = new Date()
    const currentDayOfWeek = today.getDay() // 0 = Dom, 1 = Seg...
    const daysUntilSunday = (7 - currentDayOfWeek) % 7
    return addDaysToDateKey(getTodayDateKey(), daysUntilSunday)
  }

  // Abertura via registry ou evento
  const openWithContext = async (ctx?: TaskModalContext) => {
    setIsSubmitting(false)
    setShowDatePicker(false)

    if (ctx?.taskId) {
      const existing = await taskRepository.getTaskById(ctx.taskId)
      if (existing) {
        setEditingTask(existing)
        setTitle(existing.title)
        setModule(existing.module)
        setLink(existing.link)
        setDueDate(existing.dueDate)
        setDueTime(existing.dueTime)
        setReminder(existing.reminder)
        setPriority(existing.priority)
        setSubtasks(existing.subtasks || [])

        // Popula moduleData existente
        if (existing.moduleData && existing.moduleData.module === existing.module) {
          const md = existing.moduleData.data || {}
          if (existing.module === 'escrita') {
            setEscritaData({
              tipo: md.tipo || 'diario',
              tema: md.tema,
              metaMinutos: md.metaMinutos,
            })
          } else if (existing.module === 'leitura') {
            setLeituraData({
              bookId: md.bookId,
              metaPaginas: md.metaPaginas,
              metaMinutos: md.metaMinutos,
              atePagina: md.atePagina,
            })
          } else if (existing.module === 'treino') {
            setTreinoData(md)
          } else if (existing.module === 'estudos') {
            setEstudosData(md)
          } else if (existing.module === 'trabalho') {
            setTrabalhoData(md)
          }
        } else {
          // Defaults limpos
          setEscritaData({ tipo: 'diario' })
          setLeituraData({})
          setTreinoData({ tipo: 'musculacao', musculacao: { subtipo: 'academia', diaOuGrupo: '' } })
          setEstudosData({ tipoAtividade: 'assistir_aula' })
          setTrabalhoData({ tipo: 'tarefa', sugerirConquista: false })
        }

        setIsOpen(true)
        setTimeout(() => titleInputRef.current?.focus(), 150)
        return
      }
    }

    // Criação nova
    setEditingTask(null)
    setTitle(ctx?.initialTitle || '')
    const targetModule = ctx?.module || 'geral'
    setModule(targetModule)
    setLink(ctx?.link || null)
    setDueDate(ctx?.dueDate !== undefined ? ctx.dueDate : getTodayDateKey())
    setDueTime(null)
    setReminder(false)
    setPriority('normal')
    setSubtasks([])

    // Inicializa moduleData do contexto (se fornecido) ou limpo
    if (ctx?.moduleData && ctx.moduleData.module === targetModule) {
      const md = ctx.moduleData.data || {}
      if (targetModule === 'escrita') setEscritaData(md)
      else if (targetModule === 'leitura') setLeituraData(md)
      else if (targetModule === 'treino') setTreinoData(md)
      else if (targetModule === 'estudos') setEstudosData(md)
      else if (targetModule === 'trabalho') setTrabalhoData(md)
    } else {
      setEscritaData({ tipo: 'diario' })
      setLeituraData(ctx?.link?.type === 'book' ? { bookId: ctx.link.id } : {})
      setTreinoData({ tipo: 'musculacao', musculacao: { subtipo: 'academia', diaOuGrupo: '' } })
      setEstudosData({
        tipoAtividade: 'assistir_aula',
        courseId: ctx?.link?.type === 'course' ? ctx.link.id : undefined,
      })
      setTrabalhoData({
        tipo: 'tarefa',
        projectId: ctx?.link?.type === 'project' ? ctx.link.id : undefined,
        sugerirConquista: false,
      })
    }

    setIsOpen(true)
    setTimeout(() => titleInputRef.current?.focus(), 150)
  }

  useEffect(() => {
    const unregister = registerTaskModal(openWithContext)
    const handleCustom = (e: Event) => {
      const ce = e as CustomEvent<TaskModalContext>
      openWithContext(ce.detail)
    }
    window.addEventListener('rotina:open-task-modal', handleCustom)
    return () => {
      unregister()
      window.removeEventListener('rotina:open-task-modal', handleCustom)
    }
  }, [activeModules])

  // Troca de módulo limpa os campos do módulo anterior e pergunta confirmação se houver dados preenchidos
  const handleSelectModule = (mod: TaskModule) => {
    if (mod === module) return

    const hasData = hasFilledModuleData(
      module,
      escritaData,
      leituraData,
      treinoData,
      estudosData,
      trabalhoData,
    )

    if (hasData) {
      setPendingModule(mod)
      setConfirmSwitchModuleOpen(true)
    } else {
      executeModuleSwitch(mod)
    }
  }

  const executeModuleSwitch = (mod: TaskModule) => {
    setModule(mod)
    setLink(null)
    // Limpa campos do módulo anterior
    setEscritaData({ tipo: 'diario' })
    setLeituraData({})
    setTreinoData({ tipo: 'musculacao', musculacao: { subtipo: 'academia', diaOuGrupo: '' } })
    setEstudosData({ tipoAtividade: 'assistir_aula' })
    setTrabalhoData({ tipo: 'tarefa', sugerirConquista: false })
    setPendingModule(null)
    setConfirmSwitchModuleOpen(false)
  }

  // Fechamento com verificação de descarte
  const handleRequestClose = () => {
    if (title.trim().length > 0 && !editingTask) {
      setConfirmDiscardOpen(true)
    } else {
      setIsOpen(false)
    }
  }

  const handleDiscard = () => {
    setConfirmDiscardOpen(false)
    setIsOpen(false)
  }

  // Pedir permissão de notificação só ao ativar o lembrete
  const handleToggleReminder = async (checked: boolean) => {
    if (checked) {
      if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
        try {
          await Notification.requestPermission()
        } catch {
          // Ignore
        }
      }
    }
    setReminder(checked)
  }

  // Subtarefas
  const handleAddSubtask = () => {
    if (subtasks.length >= 20) return
    setSubtasks([...subtasks, { id: crypto.randomUUID(), title: '', done: false }])
  }

  const handleUpdateSubtask = (id: string, updates: Partial<TaskSubtask>) => {
    setSubtasks(subtasks.map((st) => (st.id === id ? { ...st, ...updates } : st)))
  }

  const handleDeleteSubtask = (id: string) => {
    setSubtasks(subtasks.filter((st) => st.id !== id))
  }

  // Salvar
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!title.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      await taskRepository.saveTask({
        id: editingTask?.id,
        title: title.trim(),
        module,
        link,
        dueDate,
        dueTime: dueTime || null,
        reminder: Boolean(reminder && dueTime),
        priority,
        subtasks,
      })

      setIsOpen(false)
      notifyDataChanged()
      toast({
        title: editingTask ? 'Tarefa atualizada' : 'Tarefa criada',
      })
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar tarefa',
        description: err?.message || 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Excluir
  const handleDelete = async () => {
    if (!editingTask) return
    try {
      await taskRepository.deleteTask(editingTask.id)
      setConfirmDeleteOpen(false)
      setIsOpen(false)
      notifyDataChanged()
      toast({ title: 'Tarefa excluída' })
    } catch {
      toast({ title: 'Erro ao excluir tarefa', variant: 'destructive' })
    }
  }

  if (!isOpen) return null

  // Filtra módulos disponíveis na grade 3x2: só módulos ativos (+ Geral)
  const availableModules: TaskModule[] = (
    ['escrita', 'leitura', 'treino', 'estudos', 'trabalho', 'geral'] as TaskModule[]
  ).filter((m) => {
    if (m === 'geral') return true
    return activeModules[m] !== false
  })

  const todayKey = getTodayDateKey()
  const tomorrowKey = addDaysToDateKey(todayKey, 1)
  const sundayKey = getSundayDateKey()

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 transition-opacity backdrop-blur-[2px]"
        onClick={handleRequestClose}
      />

      {/* Painel/Folha: Em tablet (≥768px), modal centralizado de 480px. Em mobile, folha inferior */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-dialog-title"
        className="fixed z-50 inset-x-0 bottom-0 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:max-w-[480px] w-full bg-[#FFFFFF] dark:bg-[#1E1A16] rounded-t-[28px] md:rounded-[24px] shadow-2xl border border-[#EAE4DB] dark:border-[#38332B] flex flex-col max-h-[90vh] md:max-h-[85vh] animate-in fade-in slide-in-from-bottom-4 duration-200"
      >
        {/* Alça no mobile */}
        <div className="w-12 h-1.5 bg-[#EAE4DB] dark:bg-[#38332B] rounded-full mx-auto mt-3 md:hidden shrink-0" />

        {/* Cabeçalho */}
        <div className="px-5 pt-3 pb-2 flex items-center justify-between shrink-0">
          <h2
            id="task-dialog-title"
            className="text-lg font-bold text-[#1F1B16] dark:text-[#F6F3EE] tracking-tight"
          >
            {editingTask ? 'Editar tarefa' : 'Nova tarefa'}
          </h2>
          <button
            type="button"
            onClick={handleRequestClose}
            aria-label="Fechar"
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center text-[#6B645C] hover:text-[#1F1B16] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo rolável */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto px-5 py-2 space-y-5">
          {/* TÍTULO com sublinhado laranja e contador visível a partir de 120 caracteres */}
          <div className="space-y-1">
            <input
              ref={titleInputRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 140))}
              placeholder="O que você precisa fazer?"
              maxLength={140}
              className="w-full text-base sm:text-lg font-semibold bg-transparent border-0 border-b-2 border-[#E8883A] rounded-none px-0 py-2 text-[#1F1B16] dark:text-[#F6F3EE] placeholder:text-[#6B645C]/60 focus:outline-none focus:ring-0"
            />
            {title.length >= 120 && (
              <div className="flex justify-end">
                <span className="text-[11px] font-bold text-[#B4540F] dark:text-[#E8883A]">
                  {title.length} / 140
                </span>
              </div>
            )}
          </div>

          {/* MÓDULO (Grade 3x2) */}
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#6B645C] dark:text-[#A8A199]">
              Módulo
            </span>
            <div className="grid grid-cols-3 gap-2">
              {availableModules.map((modKey) => {
                const conf = MODULE_COLORS[modKey]
                const Icon = conf.icon
                const isSelected = module === modKey
                return (
                  <button
                    key={modKey}
                    type="button"
                    onClick={() => handleSelectModule(modKey)}
                    className="h-12 min-h-[48px] rounded-xl flex items-center justify-center gap-2 px-2 text-xs font-bold transition-all relative border"
                    style={{
                      borderColor: isSelected ? conf.text : '#EAE4DB',
                      borderWidth: isSelected ? '2px' : '1px',
                      backgroundColor: isSelected ? conf.bg : 'transparent',
                      color: isSelected ? conf.text : '#6B645C',
                    }}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{conf.label}</span>
                    {isSelected && (
                      <span
                        className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-white text-[9px]"
                        style={{ backgroundColor: conf.text }}
                      >
                        ✓
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* CAMPO DE VÍNCULO (Opcional, muda conforme o módulo) */}
          {module === 'leitura' && books.length > 0 && (
            <div className="space-y-1.5 p-3 rounded-2xl bg-[#F6F3EE] dark:bg-[#25201B] border border-[#EAE4DB] dark:border-[#38332B]">
              <label
                htmlFor="task-book-select"
                className="text-xs font-bold text-[#1F1B16] dark:text-[#F6F3EE] flex items-center gap-1.5"
              >
                <BookOpen className="w-3.5 h-3.5 text-[#1F7F6E]" />
                Livro (opcional)
              </label>
              <select
                id="task-book-select"
                value={link?.type === 'book' ? link.id : ''}
                onChange={(e) =>
                  setLink(e.target.value ? { type: 'book', id: e.target.value } : null)
                }
                className="w-full h-11 px-3 text-xs font-medium rounded-xl border border-[#EAE4DB] dark:border-[#38332B] bg-white dark:bg-[#1E1A16] text-[#1F1B16] dark:text-[#F6F3EE] focus:outline-none"
              >
                <option value="">Nenhum livro vinculado</option>
                {books.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title} {b.status === 'lendo' ? '• (Lendo agora)' : ''}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-[#6B645C] dark:text-[#A8A199]">
                Aparece também na tela do livro/curso/projeto.
              </p>
            </div>
          )}

          {module === 'estudos' && courses.length > 0 && (
            <div className="space-y-1.5 p-3 rounded-2xl bg-[#F6F3EE] dark:bg-[#25201B] border border-[#EAE4DB] dark:border-[#38332B]">
              <label
                htmlFor="task-course-select"
                className="text-xs font-bold text-[#1F1B16] dark:text-[#F6F3EE] flex items-center gap-1.5"
              >
                <GraduationCap className="w-3.5 h-3.5 text-[#6A4BB0]" />
                Curso (opcional)
              </label>
              <select
                id="task-course-select"
                value={link?.type === 'course' ? link.id : ''}
                onChange={(e) =>
                  setLink(e.target.value ? { type: 'course', id: e.target.value } : null)
                }
                className="w-full h-11 px-3 text-xs font-medium rounded-xl border border-[#EAE4DB] dark:border-[#38332B] bg-white dark:bg-[#1E1A16] text-[#1F1B16] dark:text-[#F6F3EE] focus:outline-none"
              >
                <option value="">Nenhum curso vinculado</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-[#6B645C] dark:text-[#A8A199]">
                Aparece também na tela do livro/curso/projeto.
              </p>
            </div>
          )}

          {module === 'trabalho' && projects.length > 0 && (
            <div className="space-y-1.5 p-3 rounded-2xl bg-[#F6F3EE] dark:bg-[#25201B] border border-[#EAE4DB] dark:border-[#38332B]">
              <label
                htmlFor="task-project-select"
                className="text-xs font-bold text-[#1F1B16] dark:text-[#F6F3EE] flex items-center gap-1.5"
              >
                <Briefcase className="w-3.5 h-3.5 text-[#3F5A70]" />
                Projeto (opcional)
              </label>
              <select
                id="task-project-select"
                value={link?.type === 'project' ? link.id : ''}
                onChange={(e) =>
                  setLink(e.target.value ? { type: 'project', id: e.target.value } : null)
                }
                className="w-full h-11 px-3 text-xs font-medium rounded-xl border border-[#EAE4DB] dark:border-[#38332B] bg-white dark:bg-[#1E1A16] text-[#1F1B16] dark:text-[#F6F3EE] focus:outline-none"
              >
                <option value="">Nenhum projeto vinculado</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-[#6B645C] dark:text-[#A8A199]">
                Aparece também na tela do livro/curso/projeto.
              </p>
            </div>
          )}

          {module === 'treino' && workoutDays.length > 0 && (
            <div className="space-y-1.5 p-3 rounded-2xl bg-[#F6F3EE] dark:bg-[#25201B] border border-[#EAE4DB] dark:border-[#38332B]">
              <label
                htmlFor="task-workout-select"
                className="text-xs font-bold text-[#1F1B16] dark:text-[#F6F3EE] flex items-center gap-1.5"
              >
                <Dumbbell className="w-3.5 h-3.5 text-[#B8503E]" />
                Dia do treino (opcional)
              </label>
              <select
                id="task-workout-select"
                value={link?.type === 'workoutDay' ? link.id : ''}
                onChange={(e) =>
                  setLink(e.target.value ? { type: 'workoutDay', id: e.target.value } : null)
                }
                className="w-full h-11 px-3 text-xs font-medium rounded-xl border border-[#EAE4DB] dark:border-[#38332B] bg-white dark:bg-[#1E1A16] text-[#1F1B16] dark:text-[#F6F3EE] focus:outline-none"
              >
                <option value="">Nenhum dia de treino vinculado</option>
                {workoutDays.map((wd) => (
                  <option key={wd.dayOfWeek} value={String(wd.dayOfWeek)}>
                    {wd.name}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-[#6B645C] dark:text-[#A8A199]">
                Aparece também no dia do treino com plano.
              </p>
            </div>
          )}

          {/* QUANDO (Chips: Hoje, Amanhã, Esta semana, Data) */}
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#6B645C] dark:text-[#A8A199]">
              Quando
            </span>
            <div className="flex flex-wrap gap-2">
              {/* Chip Hoje */}
              <button
                type="button"
                onClick={() => setDueDate(dueDate === todayKey ? null : todayKey)}
                className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                  dueDate === todayKey
                    ? 'bg-[#1F1B16] text-white dark:bg-[#F6F3EE] dark:text-[#1F1B16] border-transparent'
                    : 'bg-card text-[#1F1B16] dark:text-[#F6F3EE] border-[#EAE4DB] dark:border-[#38332B]'
                }`}
              >
                Hoje
              </button>

              {/* Chip Amanhã */}
              <button
                type="button"
                onClick={() => setDueDate(dueDate === tomorrowKey ? null : tomorrowKey)}
                className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                  dueDate === tomorrowKey
                    ? 'bg-[#1F1B16] text-white dark:bg-[#F6F3EE] dark:text-[#1F1B16] border-transparent'
                    : 'bg-card text-[#1F1B16] dark:text-[#F6F3EE] border-[#EAE4DB] dark:border-[#38332B]'
                }`}
              >
                Amanhã
              </button>

              {/* Chip Esta semana */}
              <button
                type="button"
                onClick={() => setDueDate(dueDate === sundayKey ? null : sundayKey)}
                className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                  dueDate === sundayKey
                    ? 'bg-[#1F1B16] text-white dark:bg-[#F6F3EE] dark:text-[#1F1B16] border-transparent'
                    : 'bg-card text-[#1F1B16] dark:text-[#F6F3EE] border-[#EAE4DB] dark:border-[#38332B]'
                }`}
              >
                Até domingo
              </button>

              {/* Chip Data personalizada */}
              <button
                type="button"
                onClick={() => setShowDatePicker(!showDatePicker)}
                className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                  dueDate &&
                  dueDate !== todayKey &&
                  dueDate !== tomorrowKey &&
                  dueDate !== sundayKey
                    ? 'bg-[#1F1B16] text-white dark:bg-[#F6F3EE] dark:text-[#1F1B16] border-transparent'
                    : 'bg-card text-[#1F1B16] dark:text-[#F6F3EE] border-[#EAE4DB] dark:border-[#38332B]'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>
                  {dueDate &&
                  dueDate !== todayKey &&
                  dueDate !== tomorrowKey &&
                  dueDate !== sundayKey
                    ? dueDate
                    : 'Data'}
                </span>
              </button>
            </div>

            {showDatePicker && (
              <div className="pt-2">
                <input
                  type="date"
                  value={dueDate || ''}
                  onChange={(e) => {
                    setDueDate(e.target.value || null)
                    setShowDatePicker(false)
                  }}
                  className="w-full h-11 px-3 text-xs font-medium rounded-xl border border-[#EAE4DB] dark:border-[#38332B] bg-white dark:bg-[#1E1A16] text-[#1F1B16] dark:text-[#F6F3EE]"
                />
              </div>
            )}
            {!dueDate && (
              <span className="text-[11px] text-[#6B645C] dark:text-[#A8A199] italic block">
                Tarefa sem data definida (irá para a seção "Sem data" na semana).
              </span>
            )}
          </div>

          {/* HORÁRIO E LEMBRETE */}
          <div className="space-y-3 p-3.5 rounded-2xl bg-[#F6F3EE] dark:bg-[#25201B] border border-[#EAE4DB] dark:border-[#38332B]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#1F1B16] dark:text-[#F6F3EE] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#E8883A]" />
                Horário e lembrete
              </span>
              {dueTime && (
                <button
                  type="button"
                  onClick={() => {
                    setDueTime(null)
                    setReminder(false)
                  }}
                  className="text-[11px] font-semibold text-[#B4540F] hover:underline"
                >
                  Limpar horário
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 items-center">
              <div>
                <input
                  type="time"
                  value={dueTime || ''}
                  onChange={(e) => setDueTime(e.target.value || null)}
                  className="w-full h-11 px-3 text-xs font-medium rounded-xl border border-[#EAE4DB] dark:border-[#38332B] bg-white dark:bg-[#1E1A16] text-[#1F1B16] dark:text-[#F6F3EE]"
                />
              </div>

              <div className="flex items-center justify-between px-3 h-11 rounded-xl bg-white dark:bg-[#1E1A16] border border-[#EAE4DB] dark:border-[#38332B]">
                <label
                  htmlFor="task-reminder-toggle"
                  className="text-xs font-semibold text-[#1F1B16] dark:text-[#F6F3EE] flex items-center gap-1.5 cursor-pointer"
                >
                  <Bell className="w-3.5 h-3.5 text-[#E8883A]" />
                  Lembrar
                </label>
                <input
                  id="task-reminder-toggle"
                  type="checkbox"
                  disabled={!dueTime}
                  checked={reminder && Boolean(dueTime)}
                  onChange={(e) => handleToggleReminder(e.target.checked)}
                  className="w-5 h-5 rounded accent-[#E8883A] cursor-pointer disabled:opacity-40"
                />
              </div>
            </div>

            {reminder && dueTime && (
              <p className="text-[11px] text-[#6B645C] dark:text-[#A8A199] leading-tight">
                Lembrete de melhor esforço: destaque "Agora" no app e notificação local. Pode não
                chegar com o app fechado.
              </p>
            )}
          </div>

          {/* PRIORIDADE */}
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#6B645C] dark:text-[#A8A199]">
              Prioridade
            </span>
            <div className="grid grid-cols-3 gap-2">
              {(['low', 'normal', 'high'] as TaskPriority[]).map((p) => {
                const label = p === 'low' ? 'Baixa' : p === 'normal' ? 'Normal' : 'Alta'
                const isSelected = priority === p
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`h-11 min-h-[44px] rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                      isSelected
                        ? 'bg-[#1F1B16] text-white dark:bg-[#F6F3EE] dark:text-[#1F1B16] border-transparent'
                        : 'bg-card text-[#1F1B16] dark:text-[#F6F3EE] border-[#EAE4DB] dark:border-[#38332B]'
                    }`}
                  >
                    {p === 'high' && (
                      <Flag
                        className={`w-3.5 h-3.5 ${isSelected ? 'text-[#E8883A]' : 'text-red-500'}`}
                      />
                    )}
                    <span>{label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* SUBTAREFAS */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#6B645C] dark:text-[#A8A199]">
                Subtarefas ({subtasks.length}/20)
              </span>
              {subtasks.length < 20 && (
                <button
                  type="button"
                  onClick={handleAddSubtask}
                  className="text-xs font-bold text-[#B4540F] dark:text-[#E8883A] hover:underline flex items-center gap-1 min-h-[44px] py-2"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar subtarefa
                </button>
              )}
            </div>

            <div className="space-y-2">
              {subtasks.map((st, idx) => (
                <div
                  key={st.id}
                  className="flex items-center gap-2 p-2 rounded-xl border border-[#EAE4DB] dark:border-[#38332B] bg-card"
                >
                  <button
                    type="button"
                    onClick={() => handleUpdateSubtask(st.id, { done: !st.done })}
                    className="w-6 h-6 min-w-[24px] rounded-full border-2 border-[#1F1B16] dark:border-[#F6F3EE] flex items-center justify-center transition-colors"
                    aria-label={st.done ? 'Desmarcar subtarefa' : 'Marcar subtarefa'}
                  >
                    {st.done && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </button>
                  <input
                    type="text"
                    value={st.title}
                    onChange={(e) =>
                      handleUpdateSubtask(st.id, { title: e.target.value.slice(0, 140) })
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddSubtask()
                      }
                    }}
                    placeholder={`Subtarefa ${idx + 1}`}
                    maxLength={140}
                    className={`flex-1 text-xs font-medium bg-transparent border-none focus:outline-none ${
                      st.done ? 'line-through text-[#6B645C]' : 'text-[#1F1B16] dark:text-[#F6F3EE]'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => handleDeleteSubtask(st.id)}
                    aria-label="Excluir subtarefa"
                    className="w-9 h-9 min-w-[36px] flex items-center justify-center text-[#6B645C] hover:text-red-500"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </form>

        {/* Rodapé fixo com botões */}
        <div className="p-5 pt-3 border-t border-[#EAE4DB] dark:border-[#38332B] shrink-0 space-y-2 bg-[#FFFFFF] dark:bg-[#1E1A16] rounded-b-[24px]">
          <button
            type="button"
            onClick={handleSave}
            disabled={!title.trim() || isSubmitting}
            className="w-full h-[52px] min-h-[52px] rounded-2xl bg-[#1F1B16] dark:bg-[#F6F3EE] hover:bg-[#332D26] text-white dark:text-[#1F1B16] font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <Check className="w-5 h-5 stroke-[2.5]" />
            <span>{editingTask ? 'Salvar' : 'Criar tarefa'}</span>
          </button>

          {editingTask && (
            <button
              type="button"
              onClick={() => setConfirmDeleteOpen(true)}
              className="w-full h-11 text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors"
            >
              Excluir tarefa
            </button>
          )}
        </div>
      </div>

      {/* Diálogo descartar */}
      <AlertDialog open={confirmDiscardOpen} onOpenChange={setConfirmDiscardOpen}>
        <AlertDialogContent className="rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Descartar tarefa?</AlertDialogTitle>
            <AlertDialogDescription>
              Você já começou a preencher os dados desta tarefa. As informações digitadas serão
              perdidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Continuar editando</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDiscard}
              className="rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              Descartar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Diálogo excluir */}
      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent className="rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tarefa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá a tarefa de todas as listas. Tem certeza?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
