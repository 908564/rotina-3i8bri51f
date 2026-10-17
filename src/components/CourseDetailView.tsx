import React, { useState, useEffect, useCallback } from 'react'
import {
  ChevronLeft,
  GraduationCap,
  Award,
  BookOpen,
  Edit2,
  Trash2,
  Plus,
  Search,
  Clock,
  Calendar,
  FileText,
  ExternalLink,
  Target,
} from 'lucide-react'
import { Course, StudyPage, StudyCertificate, StudySession, CourseGoalProgress } from '@/lib/types'
import { estudosRepository } from '@/lib/repositories/estudosRepository'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { StudyBlockEditor } from './StudyBlockEditor'
import { StudyCertificatesTab } from './StudyCertificatesTab'
import { StudyTimeTab } from './StudyTimeTab'
import { ModuleTasksView } from '@/components/ModuleTasksView'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

interface CourseDetailViewProps {
  courseId: string
  initialPageId?: string
  onBack: () => void
  onEditCourse: (course: Course) => void
  onCourseDeleted: () => void
  onUpdated: () => void
}

export const CourseDetailView: React.FC<CourseDetailViewProps> = ({
  courseId,
  initialPageId,
  onBack,
  onEditCourse,
  onCourseDeleted,
  onUpdated,
}) => {
  const { toast } = useToast()
  const [course, setCourse] = useState<Course | null>(null)
  const [pages, setPages] = useState<StudyPage[]>([])
  const [certificates, setCertificates] = useState<StudyCertificate[]>([])
  const [sessions, setSessions] = useState<StudySession[]>([])
  const [goalProgress, setGoalProgress] = useState<CourseGoalProgress | null>(null)

  // Sub-visão: editor de página de anotação aberto
  const [openedPageId, setOpenedPageId] = useState<string | null>(initialPageId || null)
  const [isCreatingNewPage, setIsCreatingNewPage] = useState(false)

  // Diálogo de exclusão de curso
  const [deleteCourseDialogOpen, setDeleteCourseDialogOpen] = useState(false)
  const [deletePageId, setDeletePageId] = useState<string | null>(null)

  const [activeTab, setActiveTab] = useState<'anotacoes' | 'certificados' | 'tempo' | 'tarefas'>(
    'anotacoes',
  )

  const loadData = useCallback(async () => {
    const c = await estudosRepository.getCourseById(courseId)
    if (!c) {
      onBack()
      return
    }
    setCourse(c)
    const [pList, cList, sList, gp] = await Promise.all([
      estudosRepository.getPagesByCourse(courseId),
      estudosRepository.getCertificatesByCourse(courseId),
      estudosRepository.getSessionsByCourse(courseId),
      estudosRepository.getCourseGoalProgress(courseId),
    ])
    setPages(pList)
    setCertificates(cList)
    setSessions(sList)
    setGoalProgress(gp)
  }, [courseId, onBack])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleDeleteCourse = async () => {
    await estudosRepository.deleteCourse(courseId)
    toast({
      title: 'Curso excluído',
      description: 'O curso e todos os seus registros foram removidos.',
    })
    onCourseDeleted()
  }

  const handleDeletePage = async (pageId: string) => {
    await estudosRepository.deletePage(pageId)
    toast({ title: 'Página de anotação excluída' })
    setDeletePageId(null)
    loadData()
    onUpdated()
  }

  if (!course) return null

  // Se estiver com o editor de blocos aberto, renderiza o editor completo
  if (openedPageId || isCreatingNewPage) {
    return (
      <StudyBlockEditor
        courseId={courseId}
        pageId={openedPageId || undefined}
        onBack={() => {
          setOpenedPageId(null)
          setIsCreatingNewPage(false)
          loadData()
          onUpdated()
        }}
        onSaved={() => {
          loadData()
          onUpdated()
        }}
      />
    )
  }

  const typeLabel =
    course.type === 'faculdade'
      ? 'Faculdade'
      : course.type === 'certificacao'
        ? 'Certificação'
        : 'Curso'

  const statusLabel =
    course.status === 'em_andamento'
      ? 'Em andamento'
      : course.status === 'concluido'
        ? 'Concluído'
        : course.status === 'pausado'
          ? 'Pausado'
          : 'Quero fazer'

  const statusBadgeClass =
    course.status === 'concluido'
      ? 'bg-[#3D9C73]/15 text-[#3D9C73]'
      : course.status === 'em_andamento'
        ? 'bg-[#8B5CF6]/15 text-[#8B5CF6]'
        : course.status === 'pausado'
          ? 'bg-amber-500/15 text-amber-500'
          : 'bg-muted text-muted-foreground'

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* BARRA SUPERIOR DE AÇÕES */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="text-xs h-9 px-2 rounded-xl text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> Voltar aos Estudos
        </Button>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEditCourse(course)}
            className="h-9 w-9 rounded-full text-foreground hover:bg-muted"
            aria-label="Editar curso"
          >
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDeleteCourseDialogOpen(true)}
            className="h-9 w-9 rounded-full text-destructive hover:bg-destructive/10"
            aria-label="Excluir curso"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* CABEÇALHO DO CURSO */}
      <div className="p-5 sm:p-6 rounded-2xl bg-card border border-border shadow-subtle space-y-4">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
          <div className="space-y-2 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md"
                style={{
                  backgroundColor: `${course.color || '#8B5CF6'}20`,
                  color: course.color || '#8B5CF6',
                }}
              >
                {typeLabel}
              </span>
              <span
                className={cn(
                  'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md',
                  statusBadgeClass,
                )}
              >
                {statusLabel}
              </span>
              {course.workloadHours && (
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> {course.workloadHours}h totais
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {course.name}
            </h2>

            <p className="text-xs sm:text-sm font-medium text-muted-foreground">
              {course.institution}
              {course.startDate ? ` • Início em ${course.startDate}` : ''}
              {course.endDate ? ` • Término: ${course.endDate}` : ''}
            </p>
          </div>

          {course.courseUrl && (
            <a
              href={course.courseUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-xs font-semibold text-[#8B5CF6] hover:bg-[#8B5CF6]/10 transition-colors shrink-0"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Acessar portal
            </a>
          )}
        </div>

        {/* Barra de Progresso do Curso (se configurado) */}
        {course.progress !== undefined && (
          <div className="space-y-1.5 pt-2 border-t border-border/60">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">Progresso do curso</span>
              <span className="font-bold text-[#8B5CF6]">{course.progress}%</span>
            </div>
            <Progress
              value={course.progress}
              className="h-2 bg-muted [&>div]:bg-[#8B5CF6] rounded-full"
            />
          </div>
        )}
      </div>

      {/* ABAS DO CURSO: ANOTAÇÕES, CERTIFICADOS, TEMPO */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as any)}
        className="space-y-4"
      >
        <TabsList className="grid grid-cols-4 h-12 p-1 rounded-2xl bg-muted/60 border border-border">
          <TabsTrigger
            value="anotacoes"
            className="rounded-xl text-xs font-bold data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-subtle gap-1.5"
          >
            <BookOpen className="w-4 h-4" /> <span className="hidden sm:inline">Anotações</span>
            <span className="sm:hidden">Notas</span>
          </TabsTrigger>
          <TabsTrigger
            value="certificados"
            className="rounded-xl text-xs font-bold data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-subtle gap-1.5"
          >
            <Award className="w-4 h-4" /> <span className="hidden sm:inline">Certificados</span>
            <span className="sm:hidden">Cert.</span>
          </TabsTrigger>
          <TabsTrigger
            value="tempo"
            className="rounded-xl text-xs font-bold data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-subtle gap-1.5"
          >
            <Clock className="w-4 h-4" /> Horas
          </TabsTrigger>
          <TabsTrigger
            value="tarefas"
            className="rounded-xl text-xs font-bold data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-subtle gap-1.5"
          >
            <CheckSquare className="w-4 h-4" /> Tarefas
          </TabsTrigger>
        </TabsList>
        {/* 1. ABA ANOTAÇÕES */}
        <TabsContent value="anotacoes" className="space-y-4 m-0 focus-visible:outline-none">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Cadernos e anotações por aula, módulo ou assunto.
            </p>
            <Button
              onClick={() => {
                setOpenedPageId(null)
                setIsCreatingNewPage(true)
              }}
              className="min-h-[44px] h-10 px-4 rounded-xl bg-[#8B5CF6] hover:bg-[#8B5CF6]/90 text-white font-semibold text-xs shadow-sm flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Nova página
            </Button>
          </div>

          {pages.length === 0 ? (
            <div className="p-8 sm:p-10 text-center rounded-2xl border border-dashed border-border bg-card/40 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#8B5CF6]/10 text-[#8B5CF6] flex items-center justify-center mx-auto">
                <FileText className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-foreground">Nenhuma anotação criada</h4>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                  Crie páginas com títulos, listas, checklists e fórmulas para registrar seus
                  aprendizados.
                </p>
              </div>
              <Button
                onClick={() => {
                  setOpenedPageId(null)
                  setIsCreatingNewPage(true)
                }}
                variant="outline"
                className="h-10 px-4 rounded-xl border-border text-xs font-semibold"
              >
                <Plus className="w-3.5 h-3.5 mr-1 text-[#8B5CF6]" /> Criar primeira página
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {pages.map((p) => {
                const blocksCount = p.blocks?.length || 0
                const updatedDateStr = new Date(p.updated).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })

                return (
                  <Card
                    key={p.id}
                    className="rounded-2xl border-border bg-card shadow-subtle hover:border-[#8B5CF6]/40 transition-all cursor-pointer group"
                    onClick={() => {
                      setOpenedPageId(p.id)
                      setIsCreatingNewPage(false)
                    }}
                  >
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-bold text-foreground line-clamp-1 group-hover:text-[#8B5CF6] transition-colors">
                            {p.title || 'Sem título'}
                          </h4>
                          <p className="text-[11px] text-muted-foreground">
                            Editado em {updatedDateStr}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeletePageId(p.id)
                          }}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive rounded-lg shrink-0 opacity-60 hover:opacity-100"
                          title="Excluir página"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>

                      {/* Prévia do primeiro parágrafo/bloco */}
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {p.blocks?.find((b) => b.content.trim())?.content ||
                          'Página vazia. Toque para escrever...'}
                      </p>

                      <div className="pt-1 flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>{blocksCount} blocos</span>
                        <span className="text-[#8B5CF6] font-medium group-hover:underline">
                          Abrir editor →
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* 2. ABA CERTIFICADOS */}
        <TabsContent value="certificados" className="space-y-4 m-0 focus-visible:outline-none">
          <StudyCertificatesTab
            courseId={courseId}
            certificates={certificates}
            onRefresh={() => {
              loadData()
              onUpdated()
            }}
          />
        </TabsContent>

        {/* 3. ABA TEMPO */}
        <TabsContent value="tempo" className="space-y-4 m-0 focus-visible:outline-none">
          <StudyTimeTab
            course={course}
            sessions={sessions}
            goalProgress={goalProgress}
            onRefresh={() => {
              loadData()
              onUpdated()
            }}
          />
        </TabsContent>

        {/* 4. ABA TAREFAS */}
        <TabsContent value="tarefas" className="space-y-4 m-0 focus-visible:outline-none pt-2">
          <ModuleTasksView
            module="estudos"
            contextLink={{ type: 'course', id: course.id }}
            contextTitle={course.name}
          />
        </TabsContent>
      </Tabs>

      {/* DIÁLOGO DE EXCLUSÃO DO CURSO */}
      <AlertDialog open={deleteCourseDialogOpen} onOpenChange={setDeleteCourseDialogOpen}>
        <AlertDialogContent className="rounded-2xl bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Excluir curso?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              Esta ação removerá permanentemente o curso "{course.name}", incluindo todas as suas
              páginas de anotações, certificados e histórico de tempo estudado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl text-xs">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCourse}
              className="rounded-xl text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sim, excluir curso
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* DIÁLOGO DE EXCLUSÃO DE PÁGINA */}
      <AlertDialog
        open={Boolean(deletePageId)}
        onOpenChange={(val) => !val && setDeletePageId(null)}
      >
        <AlertDialogContent className="rounded-2xl bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir anotação?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              Esta página de anotação será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl text-xs">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletePageId && handleDeletePage(deletePageId)}
              className="rounded-xl text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
