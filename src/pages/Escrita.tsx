import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Search,
  X,
  Plus,
  PenLine,
  Check,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'
import { escritaRepository } from '@/lib/repositories/escritaRepository'
import { EscritaNote } from '@/lib/types'
import { useApp } from '@/lib/context'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { CalendarModal } from '@/components/CalendarModal'
import { cn } from '@/lib/utils'
import {
  getTodayDateKey,
  formatDateDisplay,
  addDaysToDateKey,
  subDaysFromDateKey,
} from '@/lib/dateUtils'
import { useAutosave } from '@/hooks/useAutosave'
import { toast } from '@/hooks/use-toast'
import { ModuleTasksView } from '@/components/ModuleTasksView'

function getTodayDateStr(): string {
  return getTodayDateKey()
}

interface NoteFormState {
  title: string
  body: string
  tags: string[]
}

export default function EscritaPage() {
  const { externalDataVersion, notifyDataChanged } = useApp()
  const [currentDate, setCurrentDate] = useState<string>(getTodayDateStr())
  const [title, setTitle] = useState<string>('')
  const [body, setBody] = useState<string>('')
  const [tags, setTags] = useState<string[]>([])
  const [newTagInput, setNewTagInput] = useState<string>('')
  const [showTagInput, setShowTagInput] = useState<boolean>(false)

  const [searchMode, setSearchMode] = useState<boolean>(false)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [searchResults, setSearchResults] = useState<EscritaNote[]>([])
  const [calendarOpen, setCalendarOpen] = useState<boolean>(false)
  const [allNotesDates, setAllNotesDates] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<'diario' | 'tarefas'>('diario')

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const isInitialMount = useRef<boolean>(true)
  const loadRequestIdRef = useRef<number>(0)
  const currentDateRef = useRef<string>(currentDate)
  currentDateRef.current = currentDate

  // Refs para ler os valores correntes sem re-renders
  const titleRef = useRef<string>(title)
  const bodyRef = useRef<string>(body)
  const tagsRef = useRef<string[]>(tags)
  titleRef.current = title
  bodyRef.current = body
  tagsRef.current = tags

  // Função para salvar a nota no repositório
  const handleSaveNote = useCallback(
    async (targetDate: string, val: NoteFormState) => {
      const savedNote = await escritaRepository.saveNote(targetDate, {
        title: val.title,
        body: val.body,
        tags: val.tags,
      })

      // Atualiza localmente o Set de datas do calendário e lista de recentes
      const hasContent = val.body.trim().length > 0
      setAllNotesDates((prev) => {
        const next = new Set(prev)
        if (hasContent) {
          next.add(targetDate)
        } else {
          next.delete(targetDate)
        }
        return next
      })

      // Notifica outros módulos de que dados mudaram, sem disparar recarga nesta tela
      notifyDataChanged()
      return savedNote
    },
    [notifyDataChanged],
  )

  const autosaveValue = useMemo<NoteFormState>(() => ({ title, body, tags }), [title, body, tags])

  const {
    status: saveStatus,
    flush,
    isDirty,
    retry: retrySave,
    errorMessage,
    scheduleSave,
    cancel: cancelAutosave,
  } = useAutosave<string, NoteFormState>({
    key: currentDate,
    value: autosaveValue,
    delay: 400,
    save: async (key, val) => {
      await handleSaveNote(key, val)
    },
    onError: (err, count) => {
      if (count >= 3) {
        toast({
          title: 'Erro ao salvar anotação',
          description: 'Não foi possível gravar suas alterações após várias tentativas.',
          variant: 'destructive',
        })
      }
    },
  })

  // Carrega todas as datas com notas (somente ao montar ou após dados externos)
  const refreshAllNotesDates = useCallback(async () => {
    const list = await escritaRepository.getNotes()
    const datesSet = new Set(list.filter((n) => n.body.trim().length > 0).map((n) => n.date))
    setAllNotesDates(datesSet)
  }, [])

  // Carrega nota da data atual
  const loadNoteForDate = useCallback(
    async (date: string, force = false) => {
      const reqId = ++loadRequestIdRef.current
      const note = await escritaRepository.getNoteByDate(date)

      // Se outra requisição mais nova foi disparada ou a data mudou, descarta resposta
      if (reqId !== loadRequestIdRef.current) return
      if (currentDateRef.current !== date && !force) return

      // Fonte da verdade: se o usuário já digitou e está dirty, não sobrescrever
      if (isDirty && !force) {
        return
      }

      if (note) {
        setTitle(note.title || '')
        setBody(note.body || '')
        setTags(note.tags || [])
      } else {
        setTitle('')
        setBody('')
        setTags([])
      }
    },
    [isDirty],
  )

  // Recarga apenas na montagem inicial e quando currentDate mudar
  const prevDateRef = useRef<string>(currentDate)
  useEffect(() => {
    if (prevDateRef.current !== currentDate) {
      prevDateRef.current = currentDate
      cancelAutosave()
      loadNoteForDate(currentDate)
    }
  }, [currentDate, cancelAutosave, loadNoteForDate])

  // Carga inicial
  useEffect(() => {
    loadNoteForDate(currentDate, true)
    refreshAllNotesDates()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Atualiza com eventos externos (backup importado, limpar tudo, carregar exemplos)
  useEffect(() => {
    if (externalDataVersion > 0) {
      if (!isDirty) {
        loadNoteForDate(currentDate, true)
      }
      refreshAllNotesDates()
    }
  }, [externalDataVersion, currentDate, isDirty, loadNoteForDate, refreshAllNotesDates])

  // Foco automático no corpo de texto se estiver no dia atual ou se vier da rota com ?focus=1
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      const urlParams = new URLSearchParams(window.location.search)
      const shouldFocus = urlParams.get('focus') === '1' || currentDate === getTodayDateStr()
      if (shouldFocus) {
        setTimeout(() => {
          textareaRef.current?.focus()
        }, 150)
      }
    }
  }, [currentDate])

  // Manipuladores de alteração
  const handleTitleChange = (val: string) => {
    setTitle(val)
    scheduleSave()
  }

  const handleBodyChange = (val: string) => {
    setBody(val)
    scheduleSave()
  }

  const handleAddTag = () => {
    const trimmed = newTagInput.trim().replace(/^#/, '')
    if (trimmed && tags.length < 5 && !tags.includes(trimmed)) {
      const nextTags = [...tags, trimmed]
      setTags(nextTags)
      setNewTagInput('')
      setShowTagInput(false)
      scheduleSave()
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    const nextTags = tags.filter((t) => t !== tagToRemove)
    setTags(nextTags)
    scheduleSave()
  }

  // Flush com listeners estáveis (visibilitychange, pagehide)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        flush()
      }
    }
    const handlePageHide = () => {
      flush()
    }

    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('pagehide', handlePageHide)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('pagehide', handlePageHide)
    }
  }, [flush])

  // Flush no desmonte do componente
  useEffect(() => {
    return () => {
      flush()
    }
  }, [flush])

  // Navegação de dias com flush imediato da data anterior
  const handlePrevDay = async () => {
    await flush()
    setCurrentDate(subDaysFromDateKey(currentDate, 1))
  }

  const handleNextDay = async () => {
    await flush()
    setCurrentDate(addDaysToDateKey(currentDate, 1))
  }

  const handleSelectDate = async (newD: string) => {
    await flush()
    setCurrentDate(newD)
  }

  const handleGoToToday = async () => {
    await flush()
    setCurrentDate(getTodayDateStr())
  }

  // Busca instantânea
  const handleSearchChange = async (q: string) => {
    setSearchQuery(q)
    if (!q.trim()) {
      setSearchResults([])
      return
    }
    const res = await escritaRepository.searchNotes(q)
    setSearchResults(res)
  }

  const isToday = currentDate === getTodayDateStr()

  return (
    <div className="pt-2 pb-8 max-w-4xl mx-auto flex flex-col md:flex-row gap-6">
      {/* PAINEL PRINCIPAL DO EDITOR */}
      <div className="flex-1 space-y-4">
        {/* CABEÇALHO */}
        <div className="flex items-center justify-between pb-2 border-b border-border/60">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#7C8CFF]/15 text-[#7C8CFF] flex items-center justify-center">
              <PenLine className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Escrita</h1>
          </div>

          {/* Abas Diário / Tarefas */}
          <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border">
            <button
              type="button"
              onClick={() => setActiveTab('diario')}
              className={cn(
                'px-3 py-1 text-xs font-bold rounded-lg transition-all',
                activeTab === 'diario'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Diário
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

          <div className="flex items-center gap-2">
            {/* Indicador de Salvamento */}
            <div className="text-xs flex items-center gap-1 min-w-[70px] justify-end">
              {saveStatus === 'saving' && (
                <span className="text-muted-foreground flex items-center gap-1 animate-pulse">
                  <Loader2 className="w-3 h-3 animate-spin" /> Salvando...
                </span>
              )}
              {saveStatus === 'saved' && (
                <span className="text-[#3D9C73] flex items-center gap-1 font-medium animate-fade-in">
                  <Check className="w-3.5 h-3.5" /> Salvo ✓
                </span>
              )}
              {saveStatus === 'error' && (
                <div className="flex items-center gap-1">
                  <span
                    className="text-destructive flex items-center gap-1 text-[11px] font-medium"
                    title={errorMessage}
                  >
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{errorMessage || 'Erro ao salvar'}</span>
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={retrySave}
                    className="h-6 px-1.5 text-[11px] text-destructive hover:bg-destructive/10"
                    title="Tentar salvar agora"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" /> Tentar agora
                  </Button>
                </div>
              )}
            </div>

            {/* Botão de Busca */}
            <Button
              variant="ghost"
              size="icon"
              onClick={async () => {
                if (!searchMode) {
                  await flush()
                }
                setSearchMode(!searchMode)
                if (searchMode) setSearchQuery('')
              }}
              className="h-9 w-9 rounded-full text-foreground hover:bg-muted"
              aria-label="Buscar anotações"
            >
              {searchMode ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* SE ABA TAREFAS */}
        {activeTab === 'tarefas' ? (
          <div className="space-y-4 pt-2">
            <ModuleTasksView module="escrita" />
          </div>
        ) : searchMode ? (
          <div className="space-y-4 animate-fade-in">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar no título, texto ou tags..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9 h-11 rounded-xl bg-card border-border"
                autoFocus
              />
            </div>

            {searchQuery.trim() && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">
                  {searchResults.length}{' '}
                  {searchResults.length === 1 ? 'anotação encontrada' : 'anotações encontradas'}
                </p>

                {searchResults.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    Nenhuma anotação encontrada para "{searchQuery}".
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                    {searchResults.map((note) => (
                      <div
                        key={note.id}
                        onClick={async () => {
                          await flush()
                          setCurrentDate(note.date)
                          setSearchMode(false)
                        }}
                        className="p-3.5 rounded-xl bg-card border border-border hover:border-[#7C8CFF]/50 cursor-pointer transition-all space-y-1 shadow-subtle"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-foreground">
                            {formatDateDisplay(note.date)}
                          </span>
                          {note.tags && note.tags.length > 0 && (
                            <div className="flex gap-1">
                              {note.tags.map((t) => (
                                <span
                                  key={t}
                                  className="px-1.5 py-0.5 rounded bg-[#7C8CFF]/15 text-[#7C8CFF] text-[10px] font-medium"
                                >
                                  #{t}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        {note.title && (
                          <p className="text-xs font-semibold text-foreground line-clamp-1">
                            {note.title}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground line-clamp-2">{note.body}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* MODO DIÁRIO NORMAL */
          <div className="space-y-4">
            {/* NAVEGAÇÃO DE DIAS */}
            <div className="flex items-center justify-between bg-card p-2 rounded-2xl border border-border shadow-subtle">
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePrevDay}
                className="h-10 w-10 min-h-[44px] min-w-[44px] rounded-full text-foreground hover:bg-muted"
                aria-label="Dia anterior"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>

              <button
                type="button"
                onClick={async () => {
                  await flush()
                  setCalendarOpen(true)
                }}
                className="flex items-center gap-2 px-3 py-1.5 min-h-[44px] rounded-xl hover:bg-muted/70 transition-colors"
                aria-label="Abrir calendário"
              >
                <Calendar className="w-4 h-4 text-[#7C8CFF]" />
                <span className="text-sm font-semibold text-foreground">
                  {formatDateDisplay(currentDate)}
                </span>
                {isToday && (
                  <span className="text-[10px] uppercase tracking-wider font-bold bg-[#7C8CFF]/15 text-[#7C8CFF] px-2 py-0.5 rounded-full">
                    Hoje
                  </span>
                )}
              </button>

              <Button
                variant="ghost"
                size="icon"
                onClick={handleNextDay}
                className="h-10 w-10 min-h-[44px] min-w-[44px] rounded-full text-foreground hover:bg-muted"
                aria-label="Próximo dia"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>

            {/* CAMPO DE TÍTULO OPCIONAL */}
            <Input
              type="text"
              placeholder="Título (opcional)"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              onBlur={() => flush()}
              className="text-lg font-bold border-0 border-b border-transparent focus:border-border rounded-none px-1 h-10 bg-transparent focus-visible:ring-0 placeholder:text-muted-foreground/50 transition-colors"
            />

            {/* CORPO DO TEXTO (AUTOFOCUS QUANDO HOJE) */}
            <div className="relative">
              <Textarea
                ref={textareaRef}
                value={body}
                onChange={(e) => handleBodyChange(e.target.value)}
                onBlur={() => flush()}
                placeholder="Como foi seu dia? Escreva livremente seus pensamentos..."
                className="w-full min-h-[260px] sm:min-h-[320px] p-4 text-base sm:text-lg leading-relaxed bg-card rounded-2xl border-border resize-none focus-visible:ring-1 focus-visible:ring-[#7C8CFF] shadow-subtle placeholder:text-muted-foreground/60 transition-all font-sans"
              />
            </div>

            {/* SEÇÃO DE TAGS (CHIPS) */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#7C8CFF]/15 text-[#7C8CFF] text-xs font-medium"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-destructive focus:outline-none"
                    aria-label={`Remover tag ${tag}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}

              {tags.length < 5 &&
                (showTagInput ? (
                  <div className="flex items-center gap-1">
                    <Input
                      type="text"
                      placeholder="Nova tag"
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddTag()
                        }
                      }}
                      className="h-8 w-24 text-xs rounded-lg px-2"
                      autoFocus
                    />
                    <Button
                      size="sm"
                      onClick={handleAddTag}
                      className="h-8 px-2 bg-[#7C8CFF] text-white text-xs rounded-lg"
                    >
                      Ok
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowTagInput(false)}
                      className="h-8 px-2 text-xs"
                    >
                      ✕
                    </Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowTagInput(true)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 min-h-[36px] rounded-full border border-dashed border-border text-xs text-muted-foreground hover:text-foreground hover:border-[#7C8CFF] transition-colors"
                  >
                    <Plus className="w-3 h-3" /> Tag
                  </button>
                ))}
            </div>

            <p className="text-[11px] text-muted-foreground pt-2">
              Seus pensamentos de hoje ficam salvos automaticamente enquanto você digita.
            </p>
          </div>
        )}
      </div>

      {/* PAINEL LATERAL DE CALENDÁRIO EM TABLET/DESKTOP (≥768px) */}
      <div className="hidden md:block w-72 shrink-0 space-y-4">
        <div className="bg-card border border-border rounded-2xl p-4 shadow-subtle space-y-3 sticky top-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#7C8CFF]" />
              Calendário
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleGoToToday}
              className="text-[11px] h-7 px-2 text-[#7C8CFF] font-semibold"
            >
              Hoje
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Dias com anotações salvas recebem um ponto colorido. Toque em qualquer data para revisar
            ou escrever.
          </p>

          <Button
            onClick={async () => {
              await flush()
              setCalendarOpen(true)
            }}
            variant="outline"
            className="w-full h-10 rounded-xl text-xs font-semibold border-border hover:bg-muted flex items-center justify-center gap-2"
          >
            <Calendar className="w-3.5 h-3.5 text-[#7C8CFF]" />
            Abrir calendário completo
          </Button>

          {/* Atalho com últimas 4 anotações */}
          <div className="pt-2 border-t border-border/60 space-y-2">
            <span className="text-[11px] font-semibold text-muted-foreground">Recentes:</span>
            {Array.from(allNotesDates)
              .sort((a, b) => b.localeCompare(a))
              .slice(0, 4)
              .map((dStr) => (
                <button
                  key={dStr}
                  type="button"
                  onClick={() => handleSelectDate(dStr)}
                  className={cn(
                    'w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors',
                    dStr === currentDate
                      ? 'bg-[#7C8CFF]/15 text-[#7C8CFF] font-semibold'
                      : 'hover:bg-muted text-muted-foreground',
                  )}
                >
                  <span>{formatDateDisplay(dStr)}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#7C8CFF]" />
                </button>
              ))}
          </div>
        </div>
      </div>

      {/* MODAL DE CALENDÁRIO (MOBILE + ATALHO) */}
      <CalendarModal
        open={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        selectedDate={currentDate}
        datesWithNotes={allNotesDates}
        onSelectDate={handleSelectDate}
      />
    </div>
  )
}
