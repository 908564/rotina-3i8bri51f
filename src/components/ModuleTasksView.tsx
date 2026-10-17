import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Task, TaskModule, Livro, Course, Project, TreinoPlanoSemanal } from '@/lib/types'
import { taskRepository } from '@/lib/repositories/taskRepository'
import { leituraRepository } from '@/lib/repositories/leituraRepository'
import { estudosRepository } from '@/lib/repositories/estudosRepository'
import { trabalhoRepository } from '@/lib/repositories/trabalhoRepository'
import { treinoRepository } from '@/lib/repositories/treinoRepository'
import { useApp } from '@/lib/context'
import { openTaskModal } from '@/lib/taskModalEvents'
import { MODULE_COLORS } from '@/components/TaskModal'
import { Button } from '@/components/ui/button'
import { Check, Plus, Clock, Flag, CheckSquare } from 'lucide-react'
import { parseLocalDate, daysBetween } from '@/lib/dateUtils'
import { getTodayDateKey } from '@/lib/dateUtils'

interface ModuleTasksViewProps {
  module: TaskModule
  // Se especificado, vincula novas tarefas automaticamente e pode filtrar apenas desse item se filterToEntity for true
  contextLink?: {
    type: 'book' | 'course' | 'project' | 'workoutDay'
    id: string
  }
  contextTitle?: string
  filterToEntity?: boolean
  className?: string
  onTaskCompleted?: (task: Task) => void
}

export function ModuleTasksView({
  module,
  contextLink,
  contextTitle,
  filterToEntity = false,
  className = '',
  onTaskCompleted,
}: ModuleTasksViewProps) {
  const { dataVersion } = useApp()
  const [tasks, setTasks] = useState<Task[]>([])
  const [books, setBooks] = useState<Livro[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [workoutPlans, setWorkoutPlans] = useState<TreinoPlanoSemanal[]>([])

  const todayKey = getTodayDateKey()

  const loadData = useCallback(async () => {
    try {
      const [allTasks, bList, cList, pList, wList] = await Promise.all([
        taskRepository.getTasksByModule(module),
        leituraRepository.getLivros(),
        estudosRepository.getCourses(),
        trabalhoRepository.getProjects(),
        treinoRepository.getWeeklyPlans(),
      ])

      setTasks(allTasks)
      setBooks(bList)
      setCourses(cList)
      setProjects(pList)
      setWorkoutPlans(wList)
    } catch {
      // Falha silenciosa
    }
  }, [module])

  useEffect(() => {
    loadData()
  }, [loadData, dataVersion])

  const booksMap = useMemo(() => new Map(books.map((b) => [b.id, b])), [books])
  const coursesMap = useMemo(() => new Map(courses.map((c) => [c.id, c])), [courses])
  const projectsMap = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects])

  const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

  const handleToggle = async (t: Task, e: React.MouseEvent) => {
    e.stopPropagation()
    const updated = await taskRepository.toggleTaskStatus(t.id)
    if (updated) {
      setTasks((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
      if (updated.status === 'done') {
        onTaskCompleted?.(updated)
      }
    }
  }

  const handleOpenNew = () => {
    openTaskModal({
      module,
      link: contextLink,
    })
  }

  // Se filterToEntity estiver ativo, filtra somente tarefas com aquele link
  const relevantTasks = useMemo(() => {
    if (filterToEntity && contextLink) {
      return tasks.filter(
        (t) => t.link && t.link.type === contextLink.type && t.link.id === contextLink.id,
      )
    }
    return tasks
  }, [tasks, filterToEntity, contextLink])

  // Agrupamento: "Sem vínculo" e por item
  const { unlinked, groupedByItem } = useMemo(() => {
    const unlinkedList: Task[] = []
    const itemMap = new Map<string, { title: string; tasks: Task[] }>()

    for (const t of relevantTasks) {
      if (!t.link) {
        unlinkedList.push(t)
        continue
      }

      let groupKey = `${t.link.type}:${t.link.id}`
      let groupTitle = 'Item vinculado'

      if (t.link.type === 'book') {
        const b = booksMap.get(t.link.id)
        groupTitle = b ? `Livro: ${b.title}` : 'Livro vinculado'
      } else if (t.link.type === 'course') {
        const c = coursesMap.get(t.link.id)
        groupTitle = c ? `Curso: ${c.name}` : 'Curso vinculado'
      } else if (t.link.type === 'project') {
        const p = projectsMap.get(t.link.id)
        groupTitle = p ? `Projeto: ${p.name}` : 'Projeto vinculado'
      } else if (t.link.type === 'workoutDay') {
        const dNum = parseInt(t.link.id, 10)
        const plan = workoutPlans.find((p) => p.dayOfWeek === dNum)
        const dName = dayNames[dNum] || 'Dia'
        groupTitle = plan ? `Treino: ${dName} (${plan.workoutName})` : `Treino: ${dName}`
      }

      if (!itemMap.has(groupKey)) {
        itemMap.set(groupKey, { title: groupTitle, tasks: [] })
      }
      itemMap.get(groupKey)!.tasks.push(t)
    }

    return {
      unlinked: taskRepository.sortTasks(unlinkedList),
      groupedByItem: Array.from(itemMap.entries()).map(([key, data]) => ({
        key,
        title: data.title,
        tasks: taskRepository.sortTasks(data.tasks),
      })),
    }
  }, [relevantTasks, booksMap, coursesMap, projectsMap, workoutPlans, dayNames])

  const conf = MODULE_COLORS[module] || MODULE_COLORS.geral

  const renderTaskRow = (task: Task) => {
    const isDone = task.status === 'done'
    const isOverdue = task.status === 'open' && Boolean(task.dueDate && task.dueDate < todayKey)

    let dateText = ''
    if (task.dueDate) {
      const diff = daysBetween(task.dueDate, todayKey)
      if (diff === 0) dateText = 'Hoje'
      else if (diff === -1) dateText = 'Amanhã'
      else if (diff === 1) dateText = 'Ontem'
      else if (diff > 1) dateText = `há ${diff} dias`
      else {
        const dObj = parseLocalDate(task.dueDate)
        const shortDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
        dateText = `${shortDays[dObj.getDay()]}, ${dObj.getDate()}`
      }
    }

    const subtasksDone = task.subtasks?.filter((st) => st.done).length || 0
    const subtasksTotal = task.subtasks?.length || 0

    return (
      <div
        key={task.id}
        role="button"
        tabIndex={0}
        onClick={() => openTaskModal({ taskId: task.id })}
        onKeyDown={(e) => {
          if (e.key === 'Enter') openTaskModal({ taskId: task.id })
        }}
        className={`w-full min-h-[58px] p-3 rounded-2xl bg-card border border-[#EAE4DB] dark:border-[#38332B] flex items-center gap-3 text-left transition-all hover:border-[#1F1B16]/20 dark:hover:border-white/20 active:scale-[0.99] cursor-pointer group shadow-subtle ${
          isDone ? 'opacity-60 bg-muted/20' : ''
        }`}
      >
        <button
          type="button"
          onClick={(e) => handleToggle(task, e)}
          aria-label={isDone ? 'Reabrir tarefa' : 'Concluir tarefa'}
          className="w-10 h-10 min-w-[40px] min-h-[40px] -ml-1 rounded-full flex items-center justify-center transition-transform active:scale-90"
        >
          <div
            className="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors"
            style={{
              borderColor: conf.text,
              backgroundColor: isDone ? conf.text : 'transparent',
            }}
          >
            {isDone && <Check className="w-3 h-3 text-white stroke-[3]" />}
          </div>
        </button>

        <div className="flex-1 min-w-0 space-y-0.5">
          <div className="flex items-center gap-2">
            <span
              className={`text-sm font-semibold text-[#1F1B16] dark:text-[#F6F3EE] leading-snug break-words ${
                isDone ? 'line-through text-[#6B645C]' : ''
              }`}
            >
              {task.title}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-[#6B645C] dark:text-[#A8A199]">
            {task.dueTime && (
              <span className="inline-flex items-center gap-0.5">
                <Clock className="w-3 h-3 text-[#E8883A]" />
                {task.dueTime}
              </span>
            )}

            {subtasksTotal > 0 && (
              <span>
                {subtasksDone}/{subtasksTotal}
              </span>
            )}

            {dateText && (
              <span
                className={
                  isOverdue ? 'text-[#8A5A00] font-bold' : 'text-[#6B645C] dark:text-[#A8A199]'
                }
              >
                • {dateText}
              </span>
            )}
          </div>
        </div>

        {task.priority === 'high' && (
          <div className="w-6 h-6 flex items-center justify-center shrink-0">
            <Flag className="w-3.5 h-3.5 text-red-500 fill-red-500" />
          </div>
        )}
      </div>
    )
  }

  const hasTasks = relevantTasks.length > 0

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="space-y-0.5">
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <CheckSquare className="w-4 h-4" style={{ color: conf.text }} />
            <span>Tarefas do módulo</span>
          </h3>
          <p className="text-xs text-muted-foreground">
            {contextTitle
              ? `Tarefas vinculadas a ${contextTitle}`
              : 'Gerencie e acompanhe o que precisa ser feito neste módulo.'}
          </p>
        </div>

        <Button
          onClick={handleOpenNew}
          className="min-h-[44px] h-10 px-4 rounded-xl text-white font-semibold text-xs shadow-sm flex items-center gap-1.5"
          style={{ backgroundColor: conf.fill }}
        >
          <Plus className="w-4 h-4" /> Nova Tarefa
        </Button>
      </div>

      {!hasTasks ? (
        <div className="p-8 text-center rounded-2xl border border-dashed border-border bg-card/40 space-y-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto"
            style={{ backgroundColor: conf.bg, color: conf.text }}
          >
            <CheckSquare className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-foreground">Nenhuma tarefa cadastrada</h4>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Adicione pendências e lembretes específicos para este módulo.
            </p>
          </div>
          <Button
            onClick={handleOpenNew}
            className="h-9 px-4 rounded-xl text-white text-xs font-semibold"
            style={{ backgroundColor: conf.fill }}
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Criar Tarefa
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Seção: Sem vínculo */}
          {unlinked.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Sem vínculo ({unlinked.length})
                </span>
              </div>
              <div className="space-y-2">{unlinked.map(renderTaskRow)}</div>
            </div>
          )}

          {/* Seções por item vinculado */}
          {groupedByItem.map((group) => (
            <div key={group.key} className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {group.title} ({group.tasks.length})
                </span>
              </div>
              <div className="space-y-2">{group.tasks.map(renderTaskRow)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
