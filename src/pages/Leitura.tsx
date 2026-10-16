import React, { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BookOpen, Plus, Flame, Search, BookMarked, SlidersHorizontal, Target } from 'lucide-react'
import { Livro, ReadingGoalsProgress, BookStatus } from '@/lib/types'
import { leituraRepository } from '@/lib/repositories/leituraRepository'
import { useApp } from '@/lib/context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { BookFormModal } from '@/components/BookFormModal'
import { BookDetailView } from '@/components/BookDetailView'
import { cn } from '@/lib/utils'

export default function LeituraPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const bookParam = searchParams.get('book')
  const focusParam = searchParams.get('focus') === 'goals'

  const { dataVersion, notifyDataChanged } = useApp()
  const [livros, setLivros] = useState<Livro[]>([])
  const [goals, setGoals] = useState<ReadingGoalsProgress | null>(null)
  const [selectedBookId, setSelectedBookId] = useState<string | null>(bookParam)
  const [focusGoals, setFocusGoals] = useState<boolean>(focusParam)
  const [statusFilter, setStatusFilter] = useState<'todos' | BookStatus>('todos')
  const [searchQuery, setSearchQuery] = useState('')

  // Modais
  const [formModalOpen, setFormModalOpen] = useState(false)
  const [editingBook, setEditingBook] = useState<Livro | null>(null)

  const loadData = useCallback(async () => {
    const list = await leituraRepository.getLivros()
    setLivros(list)
    const g = await leituraRepository.getGoalsProgress()
    setGoals(g)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData, dataVersion])

  // Sincroniza selectedBookId e focusGoals se a URL mudar
  useEffect(() => {
    if (bookParam) {
      setSelectedBookId(bookParam)
      if (focusParam) {
        setFocusGoals(true)
      }
    }
  }, [bookParam, focusParam])

  const handleOpenAdd = () => {
    setEditingBook(null)
    setFormModalOpen(true)
  }

  const handleOpenEdit = (b: Livro) => {
    setEditingBook(b)
    setFormModalOpen(true)
  }

  const handleSaveBook = async (bookData: {
    id?: string
    title: string
    author: string
    totalPages?: number
    currentPage: number
    status: Livro['status']
    coverPhoto?: string
    goal?: Livro['goal']
  }) => {
    await leituraRepository.saveLivro(bookData)
    await loadData()
    notifyDataChanged()
  }

  // Filtragem dos livros
  const filteredLivros = livros.filter((b) => {
    const matchesFilter = statusFilter === 'todos' || b.status === statusFilter
    const matchesSearch =
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.author.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesFilter && matchesSearch
  })

  // Se estiver em mobile e tiver livro selecionado, renderiza detalhe full screen
  const isTablet = typeof window !== 'undefined' && window.innerWidth >= 768

  return (
    <div className="pt-2 pb-12 space-y-6">
      {/* SE ESTIVER NO MOBILE E SELECIONOU LIVRO: VISÃO DE DETALHE */}
      {!isTablet && selectedBookId ? (
        <BookDetailView
          bookId={selectedBookId}
          focusGoals={focusGoals}
          onBack={() => {
            setSelectedBookId(null)
            setFocusGoals(false)
            if (searchParams.get('book')) {
              setSearchParams({})
            }
          }}
          onEditBook={handleOpenEdit}
          onBookDeleted={() => {
            setSelectedBookId(null)
            setFocusGoals(false)
            if (searchParams.get('book')) {
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
        /* VISÃO PRINCIPAL (BIBLIOTECA + DETALHE EM 2 COLUNAS NO TABLET) */
        <div className="space-y-6">
          {/* CABEÇALHO */}
          <div className="flex items-center justify-between pb-2 border-b border-border/60">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#34BEAA]/15 text-[#34BEAA] flex items-center justify-center">
                <BookOpen className="w-4 h-4" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">Leitura</h1>
            </div>

            <Button
              onClick={handleOpenAdd}
              className="min-h-[44px] h-10 px-4 rounded-xl bg-[#34BEAA] hover:bg-[#34BEAA]/90 text-white font-semibold text-xs shadow-sm flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Adicionar Livro
            </Button>
          </div>

          {/* GOALS STRIP (METAS DIÁRIA, SEMANAL, MENSAL CONSOLIDADAS + STREAK) */}
          {goals && (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[#34BEAA]" /> Resumo de Leitura
                </span>
                {goals.streak > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-[#F59E4C] bg-[#F59E4C]/10 px-2.5 py-0.5 rounded-full animate-fade-in">
                    <Flame className="w-4 h-4 fill-[#F59E4C]" />
                    Sequência: {goals.streak} {goals.streak === 1 ? 'dia' : 'dias'}
                  </span>
                )}
              </div>

              {goals.hasGoals &&
              (goals.dailyPagesTarget > 0 ||
                goals.dailyMinutesTarget > 0 ||
                goals.weeklyPagesTarget > 0 ||
                goals.weeklyMinutesTarget > 0 ||
                goals.monthlyPagesTarget > 0 ||
                goals.monthlyMinutesTarget > 0) ? (
                <div className="grid grid-cols-3 gap-2.5">
                  {/* Meta Diária Consolidada */}
                  <Card className="rounded-xl border-border bg-card shadow-subtle p-3 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground font-medium">Dia</span>
                      {goals.dailyPagesTarget > 0 && (
                        <span className="font-bold text-[#34BEAA]">
                          {Math.round((goals.todayPages / goals.dailyPagesTarget) * 100)}%
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-extrabold text-foreground">
                      {goals.todayPages}{' '}
                      <span className="text-[10px] font-normal text-muted-foreground">
                        {goals.dailyPagesTarget > 0 ? `/ ${goals.dailyPagesTarget} pág` : 'pág'}
                      </span>
                    </div>
                    {goals.dailyMinutesTarget > 0 && (
                      <div className="text-[10px] text-muted-foreground font-medium">
                        {goals.todayMinutes} / {goals.dailyMinutesTarget} min
                      </div>
                    )}
                    {goals.dailyPagesTarget > 0 && (
                      <Progress
                        value={Math.min(100, (goals.todayPages / goals.dailyPagesTarget) * 100)}
                        className="h-1.5 bg-muted [&>div]:bg-[#34BEAA] rounded-full"
                      />
                    )}
                  </Card>

                  {/* Meta Semanal Consolidada */}
                  <Card className="rounded-xl border-border bg-card shadow-subtle p-3 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground font-medium">Semana</span>
                      {goals.weeklyPagesTarget > 0 && (
                        <span className="font-bold text-[#34BEAA]">
                          {Math.round((goals.weekPages / goals.weeklyPagesTarget) * 100)}%
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-extrabold text-foreground">
                      {goals.weekPages}{' '}
                      <span className="text-[10px] font-normal text-muted-foreground">
                        {goals.weeklyPagesTarget > 0 ? `/ ${goals.weeklyPagesTarget} pág` : 'pág'}
                      </span>
                    </div>
                    {goals.weeklyMinutesTarget > 0 && (
                      <div className="text-[10px] text-muted-foreground font-medium">
                        {goals.weekMinutes} / {goals.weeklyMinutesTarget} min
                      </div>
                    )}
                    {goals.weeklyPagesTarget > 0 && (
                      <Progress
                        value={Math.min(100, (goals.weekPages / goals.weeklyPagesTarget) * 100)}
                        className="h-1.5 bg-muted [&>div]:bg-[#34BEAA] rounded-full"
                      />
                    )}
                  </Card>

                  {/* Meta Mensal Consolidada */}
                  <Card className="rounded-xl border-border bg-card shadow-subtle p-3 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground font-medium">Mês</span>
                      {goals.monthlyPagesTarget > 0 && (
                        <span className="font-bold text-[#34BEAA]">
                          {Math.round((goals.monthPages / goals.monthlyPagesTarget) * 100)}%
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-extrabold text-foreground">
                      {goals.monthPages}{' '}
                      <span className="text-[10px] font-normal text-muted-foreground">
                        {goals.monthlyPagesTarget > 0 ? `/ ${goals.monthlyPagesTarget} pág` : 'pág'}
                      </span>
                    </div>
                    {goals.monthlyMinutesTarget > 0 && (
                      <div className="text-[10px] text-muted-foreground font-medium">
                        {goals.monthMinutes} / {goals.monthlyMinutesTarget} min
                      </div>
                    )}
                    {goals.monthlyPagesTarget > 0 && (
                      <Progress
                        value={Math.min(100, (goals.monthPages / goals.monthlyPagesTarget) * 100)}
                        className="h-1.5 bg-muted [&>div]:bg-[#34BEAA] rounded-full"
                      />
                    )}
                  </Card>
                </div>
              ) : (
                /* SE NENHUM LIVRO POSSUI META DEFINIDA: NÃO EXIBE NÚMEROS FICTÍCIOS */
                <div className="p-3.5 rounded-xl bg-card border border-border flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-[#34BEAA]" />
                    <span className="text-muted-foreground">
                      Nenhuma meta definida nos livros em andamento.
                    </span>
                  </div>
                  <span className="text-muted-foreground font-medium">
                    Total lido: {goals.todayPages} pág. hoje
                  </span>
                </div>
              )}
            </div>
          )}

          {/* FILTROS E BUSCA */}
          <div className="space-y-3 pt-1">
            <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
              {/* Pills de Filtro */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                {[
                  { key: 'todos', label: 'Todos' },
                  { key: 'lendo', label: 'Lendo' },
                  { key: 'quero_ler', label: 'Quero ler' },
                  { key: 'concluido', label: 'Concluído' },
                ].map((pill) => (
                  <button
                    key={pill.key}
                    type="button"
                    onClick={() => setStatusFilter(pill.key as any)}
                    className={cn(
                      'px-3.5 py-1.5 min-h-[38px] rounded-full text-xs font-semibold whitespace-nowrap transition-all select-none',
                      statusFilter === pill.key
                        ? 'bg-[#34BEAA] text-white shadow-sm'
                        : 'bg-muted/70 text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>

              {/* Busca */}
              <div className="relative w-full sm:w-56">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Filtrar por título/autor..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-9 text-xs rounded-xl bg-card border-border"
                />
              </div>
            </div>
          </div>

          {/* LAYOUT RESPONSIVO: NO TABLET (≥768px), 2 COLUNAS (GRADE À ESQUERDA, DETALHE À DIREITA) */}
          <div className={cn('gap-6', isTablet ? 'grid grid-cols-12 items-start' : 'block')}>
            {/* COLUNA ESQUERDA (BIBLIOTECA EM GRADE) */}
            <div
              className={cn(isTablet ? (selectedBookId ? 'col-span-5' : 'col-span-12') : 'w-full')}
            >
              {filteredLivros.length === 0 ? (
                <div className="p-12 text-center rounded-2xl border border-dashed border-border bg-card/40 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#34BEAA]/10 text-[#34BEAA] flex items-center justify-center mx-auto">
                    <BookMarked className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-foreground">Nenhum livro encontrado</h3>
                    <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                      {searchQuery || statusFilter !== 'todos'
                        ? 'Tente ajustar os filtros de busca para encontrar outros livros.'
                        : 'Comece adicionando seu primeiro livro à sua biblioteca pessoal.'}
                    </p>
                  </div>
                  <Button
                    onClick={handleOpenAdd}
                    className="h-9 px-4 rounded-xl bg-[#34BEAA] text-white text-xs font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar Livro
                  </Button>
                </div>
              ) : (
                <div
                  className={cn(
                    'grid gap-3.5',
                    isTablet && selectedBookId
                      ? 'grid-cols-2'
                      : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4',
                  )}
                >
                  {filteredLivros.map((livro) => {
                    const isSelected = selectedBookId === livro.id
                    const progress = livro.totalPages
                      ? Math.min(100, Math.round((livro.currentPage / livro.totalPages) * 100))
                      : 0

                    return (
                      <Card
                        key={livro.id}
                        onClick={() => {
                          setSelectedBookId(livro.id)
                          setFocusGoals(false)
                        }}
                        className={cn(
                          'rounded-2xl border-border overflow-hidden cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 group bg-card',
                          isSelected && 'ring-2 ring-[#34BEAA]',
                        )}
                      >
                        {/* CAPA (1.55:1 ASPECT RATIO) */}
                        <div className="relative aspect-[1/1.45] w-full bg-muted/40 overflow-hidden">
                          {livro.coverPhoto ? (
                            <img
                              src={livro.coverPhoto}
                              alt={livro.title}
                              className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#34BEAA]/20 via-[#34BEAA]/10 to-transparent text-[#34BEAA] font-black text-4xl">
                              {livro.title.charAt(0).toUpperCase()}
                            </div>
                          )}

                          {/* BADGE DE STATUS */}
                          <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center pointer-events-none">
                            <span
                              className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full backdrop-blur-md shadow-xs ${
                                livro.status === 'concluido'
                                  ? 'bg-[#3D9C73]/90 text-white'
                                  : livro.status === 'lendo'
                                    ? 'bg-[#34BEAA]/90 text-white'
                                    : 'bg-black/60 text-white'
                              }`}
                            >
                              {livro.status === 'concluido'
                                ? 'Concluído'
                                : livro.status === 'lendo'
                                  ? 'Lendo'
                                  : 'Quero ler'}
                            </span>
                            {livro.totalPages && (
                              <span className="text-[10px] font-bold bg-black/60 backdrop-blur-md text-white px-1.5 py-0.5 rounded-md">
                                {progress}%
                              </span>
                            )}
                          </div>
                        </div>

                        {/* INFO */}
                        <CardContent className="p-3 space-y-1">
                          <h3 className="text-xs font-bold text-foreground line-clamp-2 leading-tight">
                            {livro.title}
                          </h3>
                          <p className="text-[11px] text-muted-foreground line-clamp-1">
                            {livro.author}
                          </p>
                          <div className="pt-1">
                            <Progress
                              value={progress}
                              className="h-1 bg-muted [&>div]:bg-[#34BEAA] rounded-full"
                            />
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </div>

            {/* COLUNA DIREITA EM TABLET (DETALHE DO LIVRO SELECIONADO) */}
            {isTablet && selectedBookId && (
              <div className="col-span-7 sticky top-6 bg-card border border-border rounded-2xl p-6 shadow-subtle">
                <BookDetailView
                  bookId={selectedBookId}
                  focusGoals={focusGoals}
                  onBack={() => {
                    setSelectedBookId(null)
                    setFocusGoals(false)
                    if (searchParams.get('book')) {
                      setSearchParams({})
                    }
                  }}
                  onEditBook={handleOpenEdit}
                  onBookDeleted={() => {
                    setSelectedBookId(null)
                    setFocusGoals(false)
                    if (searchParams.get('book')) {
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
        </div>
      )}

      {/* MODAL DE CRIAÇÃO / EDIÇÃO DE LIVRO */}
      <BookFormModal
        open={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        editingBook={editingBook}
        onSave={handleSaveBook}
      />
    </div>
  )
}
