import React, { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  GraduationCap,
  Plus,
  Search,
  BookOpen,
  Award,
  SlidersHorizontal,
  Clock,
  ChevronRight,
  FileText,
  Target,
  Sparkles,
} from 'lucide-react'
import { Course, CourseType, CourseStatus } from '@/lib/types'
import { estudosRepository } from '@/lib/repositories/estudosRepository'
import { useApp } from '@/lib/context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { CourseFormModal } from '@/components/CourseFormModal'
import { CourseDetailView } from '@/components/CourseDetailView'
import { ModuleTasksView } from '@/components/ModuleTasksView'
import { cn } from '@/lib/utils'

export default function EstudosPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const courseParam = searchParams.get('course')
  const pageParam = searchParams.get('page')

  const { dataVersion, notifyDataChanged } = useApp()
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(courseParam)
  const [selectedPageId, setSelectedPageId] = useState<string | undefined>(pageParam || undefined)

  // Filtros
  const [statusFilter, setStatusFilter] = useState<'todos' | CourseStatus>('todos')
  const [typeFilter, setTypeFilter] = useState<'todos' | CourseType>('todos')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'cursos' | 'tarefas'>('cursos')

  // Busca em texto de notas
  const [noteSearchResults, setNoteSearchResults] = useState<
    { page: any; course?: Course; matchedText: string }[]
  >([])
  const [searchingNotes, setSearchingNotes] = useState(false)

  // Modal de formulário de curso
  const [formModalOpen, setFormModalOpen] = useState(false)
  const [editingCourse, setEditingCourse] = useState<Course | null>(null)

  const loadData = useCallback(async () => {
    const list = await estudosRepository.getCourses()
    setCourses(list)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData, dataVersion])

  // Sincroniza se parâmetros da URL mudarem
  useEffect(() => {
    if (courseParam) {
      setSelectedCourseId(courseParam)
      setSelectedPageId(pageParam || undefined)
    }
  }, [courseParam, pageParam])

  // Busca em todas as anotações quando searchQuery tiver mais de 2 letras
  useEffect(() => {
    let active = true
    async function doSearch() {
      if (searchQuery.trim().length >= 2) {
        setSearchingNotes(true)
        const res = await estudosRepository.searchNotes(searchQuery.trim())
        if (active) {
          setNoteSearchResults(res)
          setSearchingNotes(false)
        }
      } else {
        setNoteSearchResults([])
      }
    }
    doSearch()
    return () => {
      active = false
    }
  }, [searchQuery])

  const handleOpenAdd = () => {
    setEditingCourse(null)
    setFormModalOpen(true)
  }

  const handleOpenEdit = (c: Course) => {
    setEditingCourse(c)
    setFormModalOpen(true)
  }

  const handleSaveCourse = async (courseData: {
    id?: string
    name: string
    type: CourseType
    institution: string
    status: CourseStatus
    progress?: number
    workloadHours?: number
    startDate: string
    endDate?: string
    courseUrl?: string
    color?: string
    icon?: string
  }) => {
    await estudosRepository.saveCourse(courseData)
    await loadData()
    notifyDataChanged()
  }

  // Filtragem dos cursos
  const filteredCourses = courses.filter((c) => {
    const matchesStatus = statusFilter === 'todos' || c.status === statusFilter
    const matchesType = typeFilter === 'todos' || c.type === typeFilter
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.institution.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesStatus && matchesType && matchesSearch
  })

  const isTablet = typeof window !== 'undefined' && window.innerWidth >= 768

  return (
    <div className="pt-2 pb-12 space-y-6">
      {/* SE ESTIVER NO MOBILE E SELECIONOU UM CURSO: TELA DE DETALHE COMPLETA */}
      {!isTablet && selectedCourseId ? (
        <CourseDetailView
          courseId={selectedCourseId}
          initialPageId={selectedPageId}
          onBack={() => {
            setSelectedCourseId(null)
            setSelectedPageId(undefined)
            if (searchParams.get('course')) {
              setSearchParams({})
            }
          }}
          onEditCourse={handleOpenEdit}
          onCourseDeleted={() => {
            setSelectedCourseId(null)
            setSelectedPageId(undefined)
            if (searchParams.get('course')) {
              setSearchParams({})
            }
            loadData()
            notifyDataChanged()
          }}
          onUpdated={() => {
            loadData()
            notifyDataChanged()
          }}
        />
      ) : (
        /* VISÃO PRINCIPAL (LISTA/GRADE DE CURSOS + DETALHE NO TABLET) */
        <div className="space-y-6">
          {/* CABEÇALHO */}
          <div className="flex items-center justify-between pb-2 border-b border-border/60">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#8B5CF6]/15 text-[#8B5CF6] flex items-center justify-center">
                <GraduationCap className="w-4 h-4" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">Estudos</h1>
            </div>

            {/* Abas Cursos / Tarefas */}
            <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border">
              <button
                type="button"
                onClick={() => setActiveTab('cursos')}
                className={cn(
                  'px-3 py-1 text-xs font-bold rounded-lg transition-all',
                  activeTab === 'cursos'
                    ? 'bg-card text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                Cursos
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('tarefas')}
                className={cn(
                  'px-3 py-1 text-xs font-bold rounded-lg transition-all',
                  activeTab === 'tarefas'
                    ? 'bg-card text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                Tarefas
              </button>
            </div>

            <Button
              onClick={handleOpenAdd}
              className="min-h-[44px] h-10 px-4 rounded-xl bg-[#8B5CF6] hover:bg-[#8B5CF6]/90 text-white font-semibold text-xs shadow-sm flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Novo Curso
            </Button>
          </div>
          {/* BARRA DE FILTROS E BUSCA */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
              {/* Pills de Status */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                {[
                  { key: 'todos', label: 'Todos' },
                  { key: 'em_andamento', label: 'Em andamento' },
                  { key: 'concluido', label: 'Concluído' },
                  { key: 'pausado', label: 'Pausado' },
                  { key: 'quero_fazer', label: 'Quero fazer' },
                ].map((pill) => (
                  <button
                    key={pill.key}
                    type="button"
                    onClick={() => setStatusFilter(pill.key as any)}
                    className={cn(
                      'px-3.5 py-1.5 min-h-[38px] rounded-full text-xs font-semibold whitespace-nowrap transition-all select-none',
                      statusFilter === pill.key
                        ? 'bg-[#8B5CF6] text-white shadow-sm'
                        : 'bg-muted/70 text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>

              {/* Busca por nome ou conteúdo */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Buscar curso ou anotação..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-9 text-xs rounded-xl bg-card border-border"
                />
              </div>
            </div>

            {/* Filtro secundário por tipo: Faculdade, Curso, Certificação */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <span className="text-[11px] font-medium text-muted-foreground mr-1">Tipo:</span>
              {[
                { key: 'todos', label: 'Todos os tipos' },
                { key: 'faculdade', label: 'Faculdade' },
                { key: 'curso', label: 'Curso' },
                { key: 'certificacao', label: 'Certificação' },
              ].map((pill) => (
                <button
                  key={pill.key}
                  type="button"
                  onClick={() => setTypeFilter(pill.key as any)}
                  className={cn(
                    'px-2.5 py-1 text-[11px] rounded-lg transition-colors border',
                    typeFilter === pill.key
                      ? 'border-[#8B5CF6] bg-[#8B5CF6]/10 text-[#8B5CF6] font-bold'
                      : 'border-border/60 bg-transparent text-muted-foreground hover:text-foreground',
                  )}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>

          {/* RESULTADOS DA BUSCA DE TEXTO DENTRO DAS ANOTAÇÕES (SE HOUVER) */}
          {searchQuery.trim().length >= 2 && noteSearchResults.length > 0 && (
            <div className="p-4 rounded-2xl bg-[#8B5CF6]/5 border border-[#8B5CF6]/20 space-y-2.5 animate-fade-in">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#8B5CF6] uppercase tracking-wider">
                <FileText className="w-3.5 h-3.5" />
                <span>
                  {noteSearchResults.length} anotações encontradas com "{searchQuery}"
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {noteSearchResults.map((res) => (
                  <div
                    key={res.page.id}
                    onClick={() => {
                      setSelectedCourseId(res.page.courseId)
                      setSelectedPageId(res.page.id)
                    }}
                    className="p-3 rounded-xl bg-card border border-border/70 hover:border-[#8B5CF6] cursor-pointer transition-colors space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground line-clamp-1">
                        {res.page.title}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {res.course?.name || 'Curso'}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground italic line-clamp-2">
                      "{res.matchedText}"
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'tarefas' ? (
            <div className="pt-2">
              <ModuleTasksView module="estudos" />
            </div>
          ) : (
            /* LAYOUT RESPONSIVO: TABLET 2 COLUNAS / MOBILE GRADE */
            <div className={cn('gap-6', isTablet ? 'grid grid-cols-12 items-start' : 'block')}>
              {/* COLUNA ESQUERDA: LISTA / GRADE DE CURSOS */}
              <div
                className={cn(
                  isTablet ? (selectedCourseId ? 'col-span-5' : 'col-span-12') : 'w-full',
                )}
              >
                {filteredCourses.length === 0 ? (
                  <div className="p-12 text-center rounded-2xl border border-dashed border-border bg-card/40 space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#8B5CF6]/10 text-[#8B5CF6] flex items-center justify-center mx-auto">
                      <GraduationCap className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-foreground">Nenhum curso encontrado</h3>
                      <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                        {searchQuery || statusFilter !== 'todos' || typeFilter !== 'todos'
                          ? 'Tente ajustar os filtros de busca para encontrar outros cursos.'
                          : 'Organize suas faculdades, cursos online e certificações profissionais.'}
                      </p>
                    </div>
                    <Button
                      onClick={handleOpenAdd}
                      className="h-9 px-4 rounded-xl bg-[#8B5CF6] text-white text-xs font-semibold"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> Cadastrar Primeiro Curso
                    </Button>
                  </div>
                ) : (
                  <div
                    className={cn(
                      'grid gap-3.5',
                      isTablet && selectedCourseId
                        ? 'grid-cols-1'
                        : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
                    )}
                  >
                    {filteredCourses.map((course) => {
                      const isSelected = selectedCourseId === course.id
                      const typeLabel =
                        course.type === 'faculdade'
                          ? 'Faculdade'
                          : course.type === 'certificacao'
                            ? 'Certificação'
                            : 'Curso'

                      const statusBadge =
                        course.status === 'concluido'
                          ? { label: 'Concluído', class: 'bg-[#3D9C73]/15 text-[#3D9C73]' }
                          : course.status === 'em_andamento'
                            ? { label: 'Em andamento', class: 'bg-[#8B5CF6]/15 text-[#8B5CF6]' }
                            : course.status === 'pausado'
                              ? { label: 'Pausado', class: 'bg-amber-500/15 text-amber-500' }
                              : { label: 'Quero fazer', class: 'bg-muted text-muted-foreground' }

                      return (
                        <Card
                          key={course.id}
                          onClick={() => {
                            setSelectedCourseId(course.id)
                            setSelectedPageId(undefined)
                          }}
                          className={cn(
                            'rounded-2xl border-border bg-card shadow-subtle cursor-pointer transition-all hover:border-[#8B5CF6]/50 hover:-translate-y-0.5 group overflow-hidden',
                            isSelected && 'ring-2 ring-[#8B5CF6]',
                          )}
                        >
                          {/* Faixa decorativa da cor do curso */}
                          <div
                            className="h-2 w-full"
                            style={{ backgroundColor: course.color || '#8B5CF6' }}
                          />

                          <CardContent className="p-4 space-y-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="space-y-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md"
                                    style={{
                                      backgroundColor: `${course.color || '#8B5CF6'}15`,
                                      color: course.color || '#8B5CF6',
                                    }}
                                  >
                                    {typeLabel}
                                  </span>
                                  <span
                                    className={cn(
                                      'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md',
                                      statusBadge.class,
                                    )}
                                  >
                                    {statusBadge.label}
                                  </span>
                                </div>
                                <h3 className="text-sm font-bold text-foreground line-clamp-1 group-hover:text-[#8B5CF6] transition-colors">
                                  {course.name}
                                </h3>
                                <p className="text-xs text-muted-foreground line-clamp-1">
                                  {course.institution}
                                </p>
                              </div>

                              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-[#8B5CF6] transition-colors shrink-0 mt-1" />
                            </div>

                            {/* Progresso do curso */}
                            {course.progress !== undefined && (
                              <div className="space-y-1 pt-1">
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="text-muted-foreground">Progresso</span>
                                  <span className="font-bold text-foreground">
                                    {course.progress}%
                                  </span>
                                </div>
                                <Progress
                                  value={course.progress}
                                  className="h-1.5 bg-muted [&>div]:bg-[#8B5CF6] rounded-full"
                                />
                              </div>
                            )}

                            {/* Carga horária ou datas */}
                            <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/60">
                              {course.workloadHours ? (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> {course.workloadHours}h
                                </span>
                              ) : (
                                <span>Início: {course.startDate}</span>
                              )}
                              <span className="font-medium text-[#8B5CF6]">Abrir curso →</span>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* COLUNA DIREITA NO TABLET (DETALHE DO CURSO SELECIONADO) */}
              {isTablet && selectedCourseId && (
                <div className="col-span-7 sticky top-6 bg-card border border-border rounded-2xl p-6 shadow-subtle">
                  <CourseDetailView
                    courseId={selectedCourseId}
                    initialPageId={selectedPageId}
                    onBack={() => {
                      setSelectedCourseId(null)
                      setSelectedPageId(undefined)
                      if (searchParams.get('course')) {
                        setSearchParams({})
                      }
                    }}
                    onEditCourse={handleOpenEdit}
                    onCourseDeleted={() => {
                      setSelectedCourseId(null)
                      setSelectedPageId(undefined)
                      if (searchParams.get('course')) {
                        setSearchParams({})
                      }
                      loadData()
                      notifyDataChanged()
                    }}
                    onUpdated={() => {
                      loadData()
                      notifyDataChanged()
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* MODAL DE CRIAÇÃO / EDIÇÃO DE CURSO */}
      <CourseFormModal
        open={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        editingCourse={editingCourse}
        onSave={handleSaveCourse}
      />
    </div>
  )
}
