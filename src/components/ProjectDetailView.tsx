import React, { useState } from 'react'
import {
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  Plus,
  Trash2,
  ChevronLeft,
  Edit2,
  Tag,
  Check,
  Loader2,
} from 'lucide-react'
import { Project, ProjectStatus, Experience } from '@/lib/types'
import { trabalhoRepository } from '@/lib/repositories/trabalhoRepository'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { getTodayDateKey, parseLocalDate } from '@/lib/dateUtils'

interface ProjectDetailViewProps {
  project: Project
  experiences: Experience[]
  onBack: () => void
  onEdit: () => void
  onProjectUpdated: () => void
  onDelete: () => void
}

export const ProjectDetailView: React.FC<ProjectDetailViewProps> = ({
  project,
  experiences,
  onBack,
  onEdit,
  onProjectUpdated,
  onDelete,
}) => {
  const { toast } = useToast()
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [addingTask, setAddingTask] = useState(false)

  // Anotações
  const [noteDate, setNoteDate] = useState(getTodayDateKey())
  const [noteText, setNoteText] = useState('')
  const [noteSaveStatus, setNoteSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)

  const linkedExperience = experiences.find((e) => e.id === project.experienceId)

  // Status badge config
  const statusConfig: Record<ProjectStatus, { label: string; class: string }> = {
    planejado: { label: 'Planejado', class: 'bg-muted text-muted-foreground' },
    em_andamento: { label: 'Em andamento', class: 'bg-[#0284C7]/15 text-[#0284C7]' },
    concluido: { label: 'Concluído', class: 'bg-[#3D9C73]/15 text-[#3D9C73]' },
    pausado: { label: 'Pausado', class: 'bg-amber-500/15 text-amber-500' },
  }

  const handleToggleTask = async (taskId: string) => {
    await trabalhoRepository.toggleTask(project.id, taskId)
    onProjectUpdated()
  }

  const handleAddTask = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!newTaskTitle.trim()) return

    setAddingTask(true)
    await trabalhoRepository.addTask(project.id, newTaskTitle.trim())
    setNewTaskTitle('')
    setAddingTask(false)
    onProjectUpdated()
  }

  const handleDeleteTask = async (taskId: string) => {
    await trabalhoRepository.deleteTask(project.id, taskId)
    onProjectUpdated()
  }

  const handleSaveNote = async () => {
    if (!noteText.trim()) return

    setNoteSaveStatus('saving')
    try {
      await trabalhoRepository.saveProjectNote(project.id, {
        id: editingNoteId || undefined,
        date: noteDate,
        text: noteText.trim(),
      })
      setNoteSaveStatus('saved')
      setNoteText('')
      setEditingNoteId(null)
      setNoteDate(getTodayDateKey())
      onProjectUpdated()
      toast({
        title: 'Anotação salva ✓',
        description: 'Nota vinculada ao projeto com sucesso.',
      })
      setTimeout(() => setNoteSaveStatus('idle'), 2000)
    } catch {
      setNoteSaveStatus('idle')
      toast({
        title: 'Erro ao salvar anotação',
        variant: 'destructive',
      })
    }
  }

  const handleEditNote = (note: { id: string; date: string; text: string }) => {
    setEditingNoteId(note.id)
    setNoteDate(note.date)
    setNoteText(note.text)
  }

  const handleDeleteNote = async (noteId: string) => {
    await trabalhoRepository.deleteProjectNote(project.id, noteId)
    if (editingNoteId === noteId) {
      setEditingNoteId(null)
      setNoteText('')
    }
    onProjectUpdated()
  }

  const completedTasksCount = project.tasks.filter((t) => t.completed).length
  const totalTasksCount = project.tasks.length
  const progressPercent =
    totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0

  return (
    <div className="space-y-6 animate-fade-in">
      {/* BARRA SUPERIOR DE AÇÕES */}
      <div className="flex items-center justify-between pb-2 border-b border-border/60">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="min-h-[44px] px-2 text-xs font-semibold gap-1 hover:bg-muted"
        >
          <ChevronLeft className="w-4 h-4" /> Voltar aos Projetos
        </Button>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
            className="min-h-[44px] h-9 px-3 rounded-xl text-xs font-semibold border-border gap-1.5"
          >
            <Edit2 className="w-3.5 h-3.5 text-[#0284C7]" /> Editar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="min-h-[44px] h-9 px-3 rounded-xl text-xs font-semibold text-destructive hover:bg-destructive/10"
            aria-label="Excluir projeto"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* CABEÇALHO DO PROJETO */}
      <Card className="rounded-2xl border-border bg-card shadow-subtle overflow-hidden">
        <div className="h-2 w-full bg-[#0284C7]" />
        <CardContent className="p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span
              className={cn(
                'text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md',
                statusConfig[project.status].class,
              )}
            >
              {statusConfig[project.status].label}
            </span>

            {(project.startDate || project.endDate) && (
              <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                <Calendar className="w-3.5 h-3.5 text-[#0284C7]" />
                {project.startDate || 'Início'} — {project.endDate || 'Em andamento'}
              </span>
            )}
          </div>

          <div className="space-y-1.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {project.name}
            </h1>
            <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
              {project.description}
            </p>
          </div>

          {project.objective && (
            <div className="p-3.5 rounded-xl bg-[#0284C7]/5 border border-[#0284C7]/20 space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#0284C7]">
                Objetivo
              </span>
              <p className="text-xs text-foreground font-medium leading-relaxed">
                {project.objective}
              </p>
            </div>
          )}

          {linkedExperience && (
            <div className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Experiência vinculada: </span>
              {linkedExperience.role} na {linkedExperience.company}
            </div>
          )}

          {/* TAGS / COMPETÊNCIAS */}
          {project.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {project.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="rounded-lg text-[11px] bg-[#0284C7]/10 text-[#0284C7] font-semibold border-0 px-2 py-0.5"
                >
                  <Tag className="w-3 h-3 mr-1" />
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* SEÇÃO 1: CHECKLIST DE TAREFAS */}
      <Card className="rounded-2xl border-border bg-card shadow-subtle overflow-hidden">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h2 className="text-sm font-bold text-foreground">Tarefas do Projeto</h2>
              <p className="text-xs text-muted-foreground">
                {totalTasksCount === 0
                  ? 'Nenhuma tarefa cadastrada'
                  : `${completedTasksCount} de ${totalTasksCount} concluídas (${progressPercent}%)`}
              </p>
            </div>
          </div>

          {/* Campo para adicionar tarefa */}
          <form onSubmit={handleAddTask} className="flex gap-2">
            <Input
              type="text"
              placeholder="Nova tarefa a fazer..."
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              className="h-10 text-xs sm:text-sm rounded-xl bg-background border-border"
            />
            <Button
              type="submit"
              disabled={!newTaskTitle.trim() || addingTask}
              className="min-h-[44px] h-10 px-4 rounded-xl bg-[#0284C7] hover:bg-[#0284C7]/90 text-white font-semibold text-xs shrink-0"
            >
              <Plus className="w-4 h-4 mr-1" /> Adicionar
            </Button>
          </form>

          {/* Lista de tarefas */}
          {project.tasks.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4 border border-dashed border-border rounded-xl">
              Nenhuma tarefa pendente. Adicione itens para acompanhar seu progresso.
            </p>
          ) : (
            <div className="space-y-2">
              {project.tasks.map((task) => (
                <div
                  key={task.id}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-xl border transition-all',
                    task.completed
                      ? 'bg-muted/40 border-border/60 text-muted-foreground'
                      : 'bg-background border-border text-foreground hover:border-[#0284C7]/50',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => handleToggleTask(task.id)}
                    className="flex items-center gap-3 text-left flex-1 min-h-[44px] py-1 cursor-pointer select-none"
                    aria-label={task.completed ? 'Desmarcar tarefa' : 'Marcar tarefa'}
                  >
                    {task.completed ? (
                      <CheckCircle2 className="w-5 h-5 text-[#3D9C73] shrink-0" />
                    ) : (
                      <Circle className="w-5 h-5 text-muted-foreground shrink-0" />
                    )}
                    <span
                      className={cn(
                        'text-xs sm:text-sm font-medium',
                        task.completed && 'line-through text-muted-foreground',
                      )}
                    >
                      {task.title}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteTask(task.id)}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
                    aria-label="Excluir tarefa"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* SEÇÃO 2: ANOTAÇÕES DO PROJETO */}
      <Card className="rounded-2xl border-border bg-card shadow-subtle overflow-hidden">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h2 className="text-sm font-bold text-foreground">Anotações do Projeto</h2>
              <p className="text-xs text-muted-foreground">
                Diário de bordo, decisões arquiteturais e notas de reuniões deste projeto.
              </p>
            </div>

            {noteSaveStatus === 'saved' && (
              <span className="text-xs text-[#3D9C73] font-semibold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Salvo ✓
              </span>
            )}
            {noteSaveStatus === 'saving' && (
              <span className="text-xs text-muted-foreground flex items-center gap-1 animate-pulse">
                <Loader2 className="w-3 h-3 animate-spin" /> Salvando...
              </span>
            )}
          </div>

          {/* Editor de anotação rápida */}
          <div className="p-4 rounded-xl bg-muted/30 border border-border space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
              <span className="text-xs font-semibold text-foreground">
                {editingNoteId ? 'Editar anotação' : 'Nova anotação'}
              </span>
              <Input
                type="date"
                value={noteDate}
                onChange={(e) => setNoteDate(e.target.value)}
                className="h-9 w-full sm:w-44 text-xs rounded-xl bg-background border-border"
              />
            </div>

            <Textarea
              rows={3}
              placeholder="O que aconteceu no projeto hoje? Decisões técnicas, feedbacks, impedimentos..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              className="text-xs sm:text-sm rounded-xl bg-background border-border"
            />

            <div className="flex justify-end gap-2 pt-1">
              {editingNoteId && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingNoteId(null)
                    setNoteText('')
                    setNoteDate(getTodayDateKey())
                  }}
                  className="min-h-[44px] h-9 rounded-xl text-xs"
                >
                  Cancelar
                </Button>
              )}
              <Button
                type="button"
                onClick={handleSaveNote}
                disabled={!noteText.trim() || noteSaveStatus === 'saving'}
                className="min-h-[44px] h-9 px-4 rounded-xl bg-[#0284C7] hover:bg-[#0284C7]/90 text-white font-semibold text-xs"
              >
                {editingNoteId ? 'Atualizar Nota' : 'Salvar Anotação'}
              </Button>
            </div>
          </div>

          {/* Lista de anotações registradas */}
          {project.notes.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6 border border-dashed border-border rounded-xl">
              Nenhuma anotação registrada ainda neste projeto.
            </p>
          ) : (
            <div className="space-y-3">
              {project.notes.map((note) => (
                <div
                  key={note.id}
                  className="p-4 rounded-xl bg-background border border-border space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#0284C7]" />
                      {parseLocalDate(note.date).toLocaleDateString('pt-BR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleEditNote(note)}
                        className="min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground hover:text-[#0284C7]"
                        aria-label="Editar anotação"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteNote(note.id)}
                        className="min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground hover:text-destructive"
                        aria-label="Excluir anotação"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs sm:text-sm text-foreground/90 whitespace-pre-line leading-relaxed">
                    {note.text}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
