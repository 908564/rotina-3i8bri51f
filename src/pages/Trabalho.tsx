import React, { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Briefcase,
  FolderKanban,
  Sparkles,
  History,
  FileText,
  Plus,
  Search,
  CheckCircle2,
  Circle,
  Clock,
  Tag,
  Copy,
  ChevronRight,
  Filter,
  Check,
  Calendar,
  ExternalLink,
  Edit2,
  Trash2,
} from 'lucide-react'
import { Project, Achievement, Experience, WorkNote, ProjectStatus } from '@/lib/types'
import { trabalhoRepository } from '@/lib/repositories/trabalhoRepository'
import { useApp } from '@/lib/context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { ProjectDetailView } from '@/components/ProjectDetailView'
import { ProjectFormModal } from '@/components/ProjectFormModal'
import { AchievementFormModal } from '@/components/AchievementFormModal'
import { ExperienceFormModal } from '@/components/ExperienceFormModal'
import { WorkNoteFormModal } from '@/components/WorkNoteFormModal'
import { cn } from '@/lib/utils'
import { parseLocalDate } from '@/lib/dateUtils'

type WorkTab = 'projetos' | 'conquistas' | 'experiencia' | 'anotacoes'

export default function TrabalhoPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab') as WorkTab | null
  const projectParam = searchParams.get('project')
  const newParam = searchParams.get('new') // 'note' | 'achievement' | 'project'

  const { dataVersion, notifyDataChanged } = useApp()
  const { toast } = useToast()

  // Aba ativa: projetos | conquistas | experiencia | anotacoes
  const [activeTab, setActiveTab] = useState<WorkTab>(
    tabParam === 'conquistas' ||
      tabParam === 'experiencia' ||
      tabParam === 'anotacoes' ||
      tabParam === 'projetos'
      ? tabParam
      : 'projetos',
  )

  // Dados carregados do repositório
  const [projects, setProjects] = useState<Project[]>([])
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [experiences, setExperiences] = useState<Experience[]>([])
  const [workNotes, setWorkNotes] = useState<WorkNote[]>([])

  // Projeto selecionado (para tela de detalhe)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(projectParam)

  // Modais de Formulário
  const [projectModalOpen, setProjectModalOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)

  const [achievementModalOpen, setAchievementModalOpen] = useState(false)
  const [editingAchievement, setEditingAchievement] = useState<Achievement | null>(null)

  const [experienceModalOpen, setExperienceModalOpen] = useState(false)
  const [editingExperience, setEditingExperience] = useState<Experience | null>(null)

  const [workNoteModalOpen, setWorkNoteModalOpen] = useState(false)
  const [editingWorkNote, setEditingWorkNote] = useState<WorkNote | null>(null)

  // Filtros de Projetos
  const [projectStatusFilter, setProjectStatusFilter] = useState<'todos' | ProjectStatus>('todos')
  const [projectSearch, setProjectSearch] = useState('')

  // Filtros de Conquistas
  const [achievementSkillFilter, setAchievementSkillFilter] = useState<string>('todos')
  const [achievementPeriodFilter, setAchievementPeriodFilter] = useState<string>('todos')
  const [selectedAchievementIds, setSelectedAchievementIds] = useState<Set<string>>(new Set())

  // Filtros de Anotações
  const [noteSearch, setNoteSearch] = useState('')

  // Carregar todos os dados
  const loadAllData = useCallback(async () => {
    const [pList, aList, eList, nList] = await Promise.all([
      trabalhoRepository.getProjects(),
      trabalhoRepository.getAchievements(),
      trabalhoRepository.getExperiences(),
      trabalhoRepository.getWorkNotes(),
    ])
    setProjects(pList)
    setAchievements(aList)
    setExperiences(eList)
    setWorkNotes(nList)
  }, [])

  useEffect(() => {
    loadAllData()
  }, [loadAllData, dataVersion])

  // Trata parâmetros de URL da tela Hoje ou de links diretos
  useEffect(() => {
    if (projectParam) {
      setSelectedProjectId(projectParam)
      setActiveTab('projetos')
    }
  }, [projectParam])

  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam)
    }
  }, [tabParam])

  useEffect(() => {
    if (newParam === 'note') {
      setActiveTab('anotacoes')
      setEditingWorkNote(null)
      setWorkNoteModalOpen(true)
      setSearchParams({ tab: 'anotacoes' }, { replace: true })
    } else if (newParam === 'achievement') {
      setActiveTab('conquistas')
      setEditingAchievement(null)
      setAchievementModalOpen(true)
      setSearchParams({ tab: 'conquistas' }, { replace: true })
    } else if (newParam === 'project') {
      setActiveTab('projetos')
      setEditingProject(null)
      setProjectModalOpen(true)
      setSearchParams({ tab: 'projetos' }, { replace: true })
    }
  }, [newParam, setSearchParams])

  const changeTab = (tab: WorkTab) => {
    setActiveTab(tab)
    setSelectedProjectId(null)
    setSearchParams({ tab }, { replace: true })
  }

  // ========================
  // AÇÕES: PROJETOS
  // ========================
  const handleSaveProject = async (data: any) => {
    await trabalhoRepository.saveProject(data)
    await loadAllData()
    notifyDataChanged()
    toast({
      title: 'Projeto salvo com sucesso! ✓',
    })
  }

  const handleDeleteProject = async (id: string) => {
    if (confirm('Deseja realmente excluir este projeto?')) {
      await trabalhoRepository.deleteProject(id)
      setSelectedProjectId(null)
      await loadAllData()
      notifyDataChanged()
      toast({
        title: 'Projeto excluído',
      })
    }
  }

  // ========================
  // AÇÕES: CONQUISTAS
  // ========================
  const handleSaveAchievement = async (data: any) => {
    await trabalhoRepository.saveAchievement(data)
    await loadAllData()
    notifyDataChanged()
    toast({
      title: 'Conquista registrada com sucesso! 🏆',
    })
  }

  const handleDeleteAchievement = async (id: string) => {
    if (confirm('Excluir esta conquista?')) {
      await trabalhoRepository.deleteAchievement(id)
      setSelectedAchievementIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      await loadAllData()
      notifyDataChanged()
      toast({
        title: 'Conquista removida',
      })
    }
  }

  const toggleSelectAchievement = (id: string) => {
    setSelectedAchievementIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleSelectAllAchievements = () => {
    if (selectedAchievementIds.size === filteredAchievements.length) {
      setSelectedAchievementIds(new Set())
    } else {
      setSelectedAchievementIds(new Set(filteredAchievements.map((a) => a.id)))
    }
  }

  // "Copiar para currículo": formata em tópicos prontos para LinkedIn / CV
  const handleCopyToResume = async () => {
    const selected = achievements.filter((a) => selectedAchievementIds.has(a.id))
    if (selected.length === 0) {
      toast({
        title: 'Selecione ao menos uma conquista',
        description: 'Marque os itens da lista para formatar seu currículo.',
      })
      return
    }

    // Formato com tópicos (bullet points): Ação + Impacto + Contexto
    const lines = selected.map((a) => {
      const dateYear = a.date ? ` (${a.date.split('-')[0]})` : ''
      return `• ${a.title}: ${a.impact}${a.description ? ` — ${a.description}` : ''}${dateYear}`
    })

    const text = lines.join('\n\n')

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('Área de transferência não suportada neste navegador.')
      }
      await navigator.clipboard.writeText(text)
      toast({
        title: `${selected.length} conquistas copiadas! 📋`,
        description: 'Texto formatado em tópicos copiado para a área de transferência.',
      })
    } catch (err: any) {
      toast({
        title: 'Não foi possível copiar o texto',
        description: err?.message || 'Permissão negada ou recurso não suportado neste navegador.',
        variant: 'destructive',
      })
    }
  }

  // ========================
  // AÇÕES: EXPERIÊNCIA
  // ========================
  const handleSaveExperience = async (data: any) => {
    await trabalhoRepository.saveExperience(data)
    await loadAllData()
    notifyDataChanged()
    toast({
      title: 'Experiência profissional salva! ✓',
    })
  }

  const handleDeleteExperience = async (id: string) => {
    if (confirm('Excluir esta experiência da sua trajetória?')) {
      await trabalhoRepository.deleteExperience(id)
      await loadAllData()
      notifyDataChanged()
      toast({
        title: 'Experiência excluída',
      })
    }
  }

  // ========================
  // AÇÕES: ANOTAÇÕES
  // ========================
  const handleSaveWorkNote = async (data: any) => {
    await trabalhoRepository.saveWorkNote(data)
    await loadAllData()
    notifyDataChanged()
    toast({
      title: 'Anotação salva com sucesso! ✓',
    })
  }

  const handleDeleteWorkNote = async (id: string) => {
    if (confirm('Deseja excluir esta anotação?')) {
      await trabalhoRepository.deleteWorkNote(id)
      await loadAllData()
      notifyDataChanged()
      toast({
        title: 'Anotação excluída',
      })
    }
  }

  // ========================
  // FILTRAGENS
  // ========================
  const filteredProjects = projects.filter((p) => {
    const matchesStatus = projectStatusFilter === 'todos' || p.status === projectStatusFilter
    const q = projectSearch.toLowerCase().trim()
    const matchesSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.tags.some((t) => t.toLowerCase().includes(q))
    return matchesStatus && matchesSearch
  })

  // Coleta lista única de todas as competências das conquistas para filtro
  const allAchievementSkills = Array.from(
    new Set(achievements.flatMap((a) => a.tags || [])),
  ).filter(Boolean)

  const filteredAchievements = achievements.filter((a) => {
    // Filtro por competência
    const matchesSkill =
      achievementSkillFilter === 'todos' || a.tags?.includes(achievementSkillFilter)

    // Filtro por período (todos, ano atual, ano anterior, etc.)
    let matchesPeriod = true
    if (achievementPeriodFilter === 'ano_atual') {
      const currentYear = new Date().getFullYear().toString()
      matchesPeriod = a.date.startsWith(currentYear)
    } else if (achievementPeriodFilter === 'ano_passado') {
      const lastYear = (new Date().getFullYear() - 1).toString()
      matchesPeriod = a.date.startsWith(lastYear)
    }

    return matchesSkill && matchesPeriod
  })

  const filteredWorkNotes = workNotes.filter((n) => {
    const q = noteSearch.toLowerCase().trim()
    if (!q) return true
    return (
      n.title.toLowerCase().includes(q) ||
      n.body.toLowerCase().includes(q) ||
      n.tags.some((t) => t.toLowerCase().includes(q))
    )
  })

  // Se estiver visualizando detalhes de um projeto
  const selectedProject = projects.find((p) => p.id === selectedProjectId)

  const projectStatusConfig: Record<ProjectStatus, { label: string; class: string }> = {
    planejado: { label: 'Planejado', class: 'bg-muted text-muted-foreground' },
    em_andamento: { label: 'Em andamento', class: 'bg-[#0284C7]/15 text-[#0284C7]' },
    concluido: { label: 'Concluído', class: 'bg-[#3D9C73]/15 text-[#3D9C73]' },
    pausado: { label: 'Pausado', class: 'bg-amber-500/15 text-amber-500' },
  }

  return (
    <div className="pt-2 pb-16 space-y-6 max-w-4xl mx-auto">
      {/* SELECIONOU UM PROJETO: EXIBE TELA DE DETALHE COMPLETA */}
      {selectedProject ? (
        <ProjectDetailView
          project={selectedProject}
          experiences={experiences}
          onBack={() => {
            setSelectedProjectId(null)
            setSearchParams({ tab: 'projetos' })
          }}
          onEdit={() => {
            setEditingProject(selectedProject)
            setProjectModalOpen(true)
          }}
          onProjectUpdated={() => {
            loadAllData()
            notifyDataChanged()
          }}
          onDelete={() => handleDeleteProject(selectedProject.id)}
        />
      ) : (
        <>
          {/* CABEÇALHO DO MÓDULO */}
          <div className="flex items-center justify-between pb-2 border-b border-border/60">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#0284C7]/15 text-[#0284C7] flex items-center justify-center">
                <Briefcase className="w-4 h-4" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">Trabalho</h1>
            </div>

            {/* PONTO ÚNICO DE ENTRADA: Botão de ação contextual à aba ativa */}
            {activeTab === 'projetos' && (
              <Button
                onClick={() => {
                  setEditingProject(null)
                  setProjectModalOpen(true)
                }}
                className="min-h-[44px] h-10 px-4 rounded-xl bg-[#0284C7] hover:bg-[#0284C7]/90 text-white font-semibold text-xs shadow-sm flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Novo Projeto
              </Button>
            )}

            {activeTab === 'conquistas' && (
              <Button
                onClick={() => {
                  setEditingAchievement(null)
                  setAchievementModalOpen(true)
                }}
                className="min-h-[44px] h-10 px-4 rounded-xl bg-[#0284C7] hover:bg-[#0284C7]/90 text-white font-semibold text-xs shadow-sm flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Registrar Conquista
              </Button>
            )}

            {activeTab === 'experiencia' && (
              <Button
                onClick={() => {
                  setEditingExperience(null)
                  setExperienceModalOpen(true)
                }}
                className="min-h-[44px] h-10 px-4 rounded-xl bg-[#0284C7] hover:bg-[#0284C7]/90 text-white font-semibold text-xs shadow-sm flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Adicionar Experiência
              </Button>
            )}

            {activeTab === 'anotacoes' && (
              <Button
                onClick={() => {
                  setEditingWorkNote(null)
                  setWorkNoteModalOpen(true)
                }}
                className="min-h-[44px] h-10 px-4 rounded-xl bg-[#0284C7] hover:bg-[#0284C7]/90 text-white font-semibold text-xs shadow-sm flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Nova Anotação
              </Button>
            )}
          </div>

          {/* AS 4 ABAS DO MÓDULO: Projetos, Conquistas, Experiência, Anotações */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-border/40">
            {[
              { key: 'projetos', label: 'Projetos', icon: FolderKanban, count: projects.length },
              {
                key: 'conquistas',
                label: 'Conquistas',
                icon: Sparkles,
                count: achievements.length,
              },
              {
                key: 'experiencia',
                label: 'Experiência',
                icon: History,
                count: experiences.length,
              },
              { key: 'anotacoes', label: 'Anotações', icon: FileText, count: workNotes.length },
            ].map((tab) => {
              const Icon = tab.icon
              const isSelected = activeTab === tab.key
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => changeTab(tab.key as WorkTab)}
                  className={cn(
                    'flex items-center gap-2 px-3.5 py-2.5 min-h-[44px] rounded-xl text-xs font-semibold whitespace-nowrap transition-all select-none',
                    isSelected
                      ? 'bg-[#0284C7] text-white shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  <span
                    className={cn(
                      'text-[10px] px-1.5 py-0.2 rounded-full font-bold',
                      isSelected ? 'bg-white/25 text-white' : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {tab.count}
                  </span>
                </button>
              )
            })}
          </div>

          {/* ========================================================
              ABA 1: PROJETOS
             ======================================================== */}
          {activeTab === 'projetos' && (
            <div className="space-y-4 animate-fade-in">
              {/* Barra de Filtros e Busca */}
              <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
                {/* Pills de Status */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                  {[
                    { key: 'todos', label: 'Todos' },
                    { key: 'em_andamento', label: 'Em andamento' },
                    { key: 'planejado', label: 'Planejado' },
                    { key: 'concluido', label: 'Concluído' },
                    { key: 'pausado', label: 'Pausado' },
                  ].map((pill) => (
                    <button
                      key={pill.key}
                      type="button"
                      onClick={() => setProjectStatusFilter(pill.key as any)}
                      className={cn(
                        'px-3 py-1.5 min-h-[38px] rounded-full text-xs font-semibold whitespace-nowrap transition-all select-none',
                        projectStatusFilter === pill.key
                          ? 'bg-[#0284C7] text-white shadow-sm'
                          : 'bg-muted/70 text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {pill.label}
                    </button>
                  ))}
                </div>

                {/* Busca */}
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Buscar projeto ou tag..."
                    value={projectSearch}
                    onChange={(e) => setProjectSearch(e.target.value)}
                    className="pl-8 h-9 text-xs rounded-xl bg-card border-border"
                  />
                </div>
              </div>

              {/* Lista de Projetos */}
              {filteredProjects.length === 0 ? (
                <div className="p-12 text-center rounded-2xl border border-dashed border-border bg-card/40 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#0284C7]/10 text-[#0284C7] flex items-center justify-center mx-auto">
                    <FolderKanban className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-foreground">Nenhum projeto encontrado</h3>
                    <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                      {projectSearch || projectStatusFilter !== 'todos'
                        ? 'Tente ajustar os filtros ou termo de busca.'
                        : 'Cadastre projetos para gerenciar tarefas, registrar notas diárias e medir objetivos.'}
                    </p>
                  </div>
                  <Button
                    onClick={() => {
                      setEditingProject(null)
                      setProjectModalOpen(true)
                    }}
                    className="min-h-[44px] h-10 px-4 rounded-xl bg-[#0284C7] hover:bg-[#0284C7]/90 text-white text-xs font-semibold"
                  >
                    <Plus className="w-4 h-4 mr-1" /> Criar Primeiro Projeto
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {filteredProjects.map((p) => {
                    const completedTasks = p.tasks.filter((t) => t.completed).length
                    const totalTasks = p.tasks.length
                    const progress =
                      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

                    return (
                      <Card
                        key={p.id}
                        onClick={() => setSelectedProjectId(p.id)}
                        className="rounded-2xl border-border bg-card shadow-subtle cursor-pointer transition-all hover:border-[#0284C7]/50 hover:-translate-y-0.5 group overflow-hidden"
                      >
                        <div className="h-1.5 w-full bg-[#0284C7]" />
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1 min-w-0">
                              <span
                                className={cn(
                                  'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md inline-block',
                                  projectStatusConfig[p.status].class,
                                )}
                              >
                                {projectStatusConfig[p.status].label}
                              </span>
                              <h3 className="text-sm font-bold text-foreground line-clamp-1 group-hover:text-[#0284C7] transition-colors">
                                {p.name}
                              </h3>
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {p.description}
                              </p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-[#0284C7] transition-colors shrink-0 mt-1" />
                          </div>

                          {/* Período */}
                          {(p.startDate || p.endDate) && (
                            <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-[#0284C7]" />
                              <span>
                                {p.startDate || 'Início'} {p.endDate ? `até ${p.endDate}` : ''}
                              </span>
                            </div>
                          )}

                          {/* Checklist simples */}
                          <div className="pt-1 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground">
                            <span>
                              {totalTasks === 0
                                ? 'Sem tarefas'
                                : `${completedTasks}/${totalTasks} tarefas (${progress}%)`}
                            </span>
                            <span>{p.notes.length} anotações</span>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ========================================================
              ABA 2: CONQUISTAS (Foco LinkedIn e Currículo)
             ======================================================== */}
          {activeTab === 'conquistas' && (
            <div className="space-y-4 animate-fade-in">
              {/* Barra de Ações Rápidas de Seleção e Exportação */}
              <div className="p-3.5 rounded-2xl bg-card border border-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-subtle">
                <div className="flex items-center gap-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="select-all"
                      checked={
                        filteredAchievements.length > 0 &&
                        selectedAchievementIds.size === filteredAchievements.length
                      }
                      onCheckedChange={handleSelectAllAchievements}
                    />
                    <label
                      htmlFor="select-all"
                      className="text-xs font-semibold cursor-pointer select-none text-foreground"
                    >
                      Selecionar todas ({selectedAchievementIds.size}/{filteredAchievements.length})
                    </label>
                  </div>
                </div>

                <Button
                  onClick={handleCopyToResume}
                  disabled={selectedAchievementIds.size === 0}
                  className="min-h-[44px] h-10 px-4 rounded-xl bg-[#0284C7] hover:bg-[#0284C7]/90 text-white font-semibold text-xs shadow-sm flex items-center gap-1.5"
                >
                  <Copy className="w-4 h-4" /> Copiar para currículo ({selectedAchievementIds.size})
                </Button>
              </div>

              {/* Filtros por competência e período */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-semibold text-muted-foreground">Período:</span>
                  {[
                    { key: 'todos', label: 'Todos' },
                    { key: 'ano_atual', label: 'Ano Atual' },
                    { key: 'ano_passado', label: 'Ano Anterior' },
                  ].map((p) => (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => setAchievementPeriodFilter(p.key)}
                      className={cn(
                        'px-2.5 py-1 text-xs rounded-lg transition-colors border',
                        achievementPeriodFilter === p.key
                          ? 'border-[#0284C7] bg-[#0284C7]/10 text-[#0284C7] font-bold'
                          : 'border-border/60 text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {allAchievementSkills.length > 0 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    <span className="text-[11px] font-semibold text-muted-foreground mr-1">
                      Competência:
                    </span>
                    <button
                      type="button"
                      onClick={() => setAchievementSkillFilter('todos')}
                      className={cn(
                        'px-2.5 py-1 text-xs rounded-lg transition-colors border whitespace-nowrap',
                        achievementSkillFilter === 'todos'
                          ? 'border-[#0284C7] bg-[#0284C7]/10 text-[#0284C7] font-bold'
                          : 'border-border/60 text-muted-foreground hover:text-foreground',
                      )}
                    >
                      Todas ({allAchievementSkills.length})
                    </button>
                    {allAchievementSkills.map((sk) => (
                      <button
                        key={sk}
                        type="button"
                        onClick={() => setAchievementSkillFilter(sk)}
                        className={cn(
                          'px-2.5 py-1 text-xs rounded-lg transition-colors border whitespace-nowrap',
                          achievementSkillFilter === sk
                            ? 'border-[#0284C7] bg-[#0284C7]/10 text-[#0284C7] font-bold'
                            : 'border-border/60 text-muted-foreground hover:text-foreground',
                        )}
                      >
                        #{sk}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Lista em Ordem Cronológica */}
              {filteredAchievements.length === 0 ? (
                <div className="p-12 text-center rounded-2xl border border-dashed border-border bg-card/40 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#0284C7]/10 text-[#0284C7] flex items-center justify-center mx-auto">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-foreground">
                      Nenhuma conquista registrada
                    </h3>
                    <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                      Registre marcos, métricas de impacto e resultados para usar no seu LinkedIn e
                      currículo.
                    </p>
                  </div>
                  <Button
                    onClick={() => {
                      setEditingAchievement(null)
                      setAchievementModalOpen(true)
                    }}
                    className="min-h-[44px] h-10 px-4 rounded-xl bg-[#0284C7] text-white text-xs font-semibold"
                  >
                    <Plus className="w-4 h-4 mr-1" /> Registrar Primeira Conquista
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredAchievements.map((ach) => {
                    const isSelected = selectedAchievementIds.has(ach.id)
                    const relatedProject = projects.find((p) => p.id === ach.projectId)
                    const relatedExp = experiences.find((e) => e.id === ach.experienceId)

                    return (
                      <div
                        key={ach.id}
                        className={cn(
                          'p-4 rounded-2xl border transition-all space-y-3 bg-card shadow-subtle',
                          isSelected
                            ? 'border-[#0284C7] ring-1 ring-[#0284C7] bg-[#0284C7]/5'
                            : 'border-border hover:border-border/80',
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleSelectAchievement(ach.id)}
                              className="mt-1"
                              aria-label={`Selecionar conquista ${ach.title}`}
                            />
                            <div className="space-y-1 min-w-0">
                              <h3 className="text-sm font-bold text-foreground">{ach.title}</h3>
                              <p className="text-xs text-[#0284C7] font-semibold bg-[#0284C7]/10 p-2 rounded-lg leading-relaxed">
                                Impacto: {ach.impact}
                              </p>
                              {ach.description && (
                                <p className="text-xs text-muted-foreground leading-relaxed pt-1">
                                  {ach.description}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Ações */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingAchievement(ach)
                                setAchievementModalOpen(true)
                              }}
                              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground hover:text-[#0284C7]"
                              aria-label="Editar conquista"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteAchievement(ach.id)}
                              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground hover:text-destructive"
                              aria-label="Excluir conquista"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Metadados: Data, Projeto, Experiência e Tags */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/50 text-[11px] text-muted-foreground">
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="flex items-center gap-1 font-medium">
                              <Calendar className="w-3.5 h-3.5 text-[#0284C7]" />
                              {parseLocalDate(ach.date).toLocaleDateString('pt-BR', {
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>

                            {relatedProject && (
                              <span className="font-medium text-foreground">
                                Projeto: {relatedProject.name}
                              </span>
                            )}
                            {relatedExp && (
                              <span className="font-medium text-foreground">
                                {relatedExp.company}
                              </span>
                            )}
                          </div>

                          {ach.tags && ach.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {ach.tags.map((t) => (
                                <Badge
                                  key={t}
                                  variant="secondary"
                                  className="text-[10px] px-2 py-0.2 rounded-md bg-muted text-muted-foreground border-0 font-medium"
                                >
                                  #{t}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ========================================================
              ABA 3: EXPERIÊNCIA (Linha do Tempo Profissional)
             ======================================================== */}
          {activeTab === 'experiencia' && (
            <div className="space-y-4 animate-fade-in">
              {experiences.length === 0 ? (
                <div className="p-12 text-center rounded-2xl border border-dashed border-border bg-card/40 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#0284C7]/10 text-[#0284C7] flex items-center justify-center mx-auto">
                    <History className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-foreground">
                      Nenhuma experiência cadastrada
                    </h3>
                    <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                      Organize sua trajetória profissional da mais recente para a mais antiga e
                      vincule projetos e conquistas a cada fase.
                    </p>
                  </div>
                  <Button
                    onClick={() => {
                      setEditingExperience(null)
                      setExperienceModalOpen(true)
                    }}
                    className="min-h-[44px] h-10 px-4 rounded-xl bg-[#0284C7] text-white text-xs font-semibold"
                  >
                    <Plus className="w-4 h-4 mr-1" /> Adicionar Primeira Experiência
                  </Button>
                </div>
              ) : (
                <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-2 sm:before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-[#0284C7]/30">
                  {experiences.map((exp) => {
                    // Projetos vinculados a esta experiência
                    const linkedProjects = projects.filter((p) => p.experienceId === exp.id)
                    // Conquistas vinculadas a esta experiência
                    const linkedAchievements = achievements.filter((a) => a.experienceId === exp.id)

                    return (
                      <div key={exp.id} className="relative group">
                        {/* Dot da timeline */}
                        <div
                          className={cn(
                            'absolute -left-6 sm:-left-8 top-1.5 w-4 h-4 rounded-full border-2 border-background transition-transform group-hover:scale-125',
                            exp.isCurrent
                              ? 'bg-[#0284C7] ring-4 ring-[#0284C7]/20'
                              : 'bg-muted-foreground',
                          )}
                        />

                        <Card className="rounded-2xl border-border bg-card shadow-subtle overflow-hidden">
                          <CardContent className="p-5 space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="text-base font-bold text-foreground">
                                    {exp.role}
                                  </h3>
                                  {exp.isCurrent && (
                                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#0284C7]/15 text-[#0284C7]">
                                      Atual
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs font-semibold text-muted-foreground">
                                  {exp.company}
                                </p>
                              </div>

                              <div className="flex items-center justify-between sm:justify-end gap-2">
                                <span className="text-xs text-muted-foreground font-medium">
                                  {exp.startDate} — {exp.isCurrent ? 'Atual' : exp.endDate || 'Fim'}
                                </span>
                                <div className="flex items-center">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingExperience(exp)
                                      setExperienceModalOpen(true)
                                    }}
                                    className="min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground hover:text-[#0284C7]"
                                    aria-label="Editar experiência"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteExperience(exp.id)}
                                    className="min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground hover:text-destructive"
                                    aria-label="Excluir experiência"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>

                            {exp.description && (
                              <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
                                {exp.description}
                              </p>
                            )}

                            {/* Skills */}
                            {exp.skills && exp.skills.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                {exp.skills.map((s) => (
                                  <Badge
                                    key={s}
                                    variant="secondary"
                                    className="text-[11px] rounded-lg bg-[#0284C7]/10 text-[#0284C7] border-0 font-medium px-2 py-0.5"
                                  >
                                    #{s}
                                  </Badge>
                                ))}
                              </div>
                            )}

                            {/* PROJETOS E CONQUISTAS VINCULADOS A ESTA EXPERIÊNCIA */}
                            {(linkedProjects.length > 0 || linkedAchievements.length > 0) && (
                              <div className="pt-3 border-t border-border/60 space-y-2.5">
                                {linkedProjects.length > 0 && (
                                  <div className="space-y-1.5">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                      Projetos Desenvolvidos ({linkedProjects.length})
                                    </span>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                      {linkedProjects.map((lp) => (
                                        <div
                                          key={lp.id}
                                          onClick={() => setSelectedProjectId(lp.id)}
                                          className="p-2.5 rounded-xl bg-muted/40 border border-border/70 hover:border-[#0284C7] cursor-pointer transition-colors text-xs flex items-center justify-between"
                                        >
                                          <span className="font-semibold text-foreground line-clamp-1">
                                            {lp.name}
                                          </span>
                                          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {linkedAchievements.length > 0 && (
                                  <div className="space-y-1.5 pt-1">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#0284C7]">
                                      Conquistas Principais ({linkedAchievements.length})
                                    </span>
                                    <div className="space-y-1.5">
                                      {linkedAchievements.map((la) => (
                                        <div
                                          key={la.id}
                                          className="p-2.5 rounded-xl bg-[#0284C7]/5 border border-[#0284C7]/20 text-xs space-y-0.5"
                                        >
                                          <span className="font-bold text-foreground">
                                            {la.title}
                                          </span>
                                          <p className="text-[11px] text-[#0284C7] font-medium">
                                            Impacto: {la.impact}
                                          </p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ========================================================
              ABA 4: ANOTAÇÕES DE TRABALHO (Separadas da Escrita Pessoal)
             ======================================================== */}
          {activeTab === 'anotacoes' && (
            <div className="space-y-4 animate-fade-in">
              {/* Barra de Busca de Notas */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Buscar no título, texto ou tags das notas de trabalho..."
                  value={noteSearch}
                  onChange={(e) => setNoteSearch(e.target.value)}
                  className="pl-9 h-10 rounded-xl bg-card border-border text-xs sm:text-sm"
                />
              </div>

              {filteredWorkNotes.length === 0 ? (
                <div className="p-12 text-center rounded-2xl border border-dashed border-border bg-card/40 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#0284C7]/10 text-[#0284C7] flex items-center justify-center mx-auto">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-foreground">
                      Nenhuma anotação de trabalho
                    </h3>
                    <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                      {noteSearch
                        ? 'Nenhuma nota encontrada para esta busca.'
                        : 'Mantenha atas de reuniões, rascunhos de propostas e ideias profissionais organizadas aqui.'}
                    </p>
                  </div>
                  <Button
                    onClick={() => {
                      setEditingWorkNote(null)
                      setWorkNoteModalOpen(true)
                    }}
                    className="min-h-[44px] h-10 px-4 rounded-xl bg-[#0284C7] text-white text-xs font-semibold"
                  >
                    <Plus className="w-4 h-4 mr-1" /> Criar Primeira Anotação
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {filteredWorkNotes.map((note) => (
                    <Card
                      key={note.id}
                      className="rounded-2xl border-border bg-card shadow-subtle overflow-hidden flex flex-col justify-between"
                    >
                      <CardContent className="p-4 space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-0.5">
                            <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-[#0284C7]" />
                              {parseLocalDate(note.date).toLocaleDateString('pt-BR', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                            <h3 className="text-sm font-bold text-foreground line-clamp-1">
                              {note.title}
                            </h3>
                          </div>

                          <div className="flex items-center">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingWorkNote(note)
                                setWorkNoteModalOpen(true)
                              }}
                              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground hover:text-[#0284C7]"
                              aria-label="Editar anotação"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteWorkNote(note.id)}
                              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground hover:text-destructive"
                              aria-label="Excluir anotação"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <p className="text-xs text-muted-foreground line-clamp-4 leading-relaxed whitespace-pre-line font-sans">
                          {note.body}
                        </p>

                        {note.tags && note.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-2 border-t border-border/50">
                            {note.tags.map((t) => (
                              <Badge
                                key={t}
                                variant="secondary"
                                className="text-[10px] px-2 py-0.2 rounded-md bg-[#0284C7]/10 text-[#0284C7] border-0 font-medium"
                              >
                                #{t}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* MODAIS DE FORMULÁRIO */}
      <ProjectFormModal
        open={projectModalOpen}
        onClose={() => setProjectModalOpen(false)}
        onSave={handleSaveProject}
        editingProject={editingProject}
        experiences={experiences}
      />

      <AchievementFormModal
        open={achievementModalOpen}
        onClose={() => setAchievementModalOpen(false)}
        onSave={handleSaveAchievement}
        editingAchievement={editingAchievement}
        projects={projects}
        experiences={experiences}
      />

      <ExperienceFormModal
        open={experienceModalOpen}
        onClose={() => setExperienceModalOpen(false)}
        onSave={handleSaveExperience}
        editingExperience={editingExperience}
      />

      <WorkNoteFormModal
        open={workNoteModalOpen}
        onClose={() => setWorkNoteModalOpen(false)}
        onSave={handleSaveWorkNote}
        editingNote={editingWorkNote}
      />
    </div>
  )
}
