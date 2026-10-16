import React, { useState, useEffect, useRef, useCallback } from 'react'
import { StudyPage, StudyBlock, StudyBlockType } from '@/lib/types'
import { estudosRepository } from '@/lib/repositories/estudosRepository'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  ArrowLeft,
  Plus,
  Trash2,
  Heading,
  Heading2,
  Pilcrow,
  List,
  ListOrdered,
  CheckSquare,
  Minus,
  GripVertical,
  Check,
  ChevronUp,
  ChevronDown,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface StudyBlockEditorProps {
  pageId?: string
  courseId: string
  onBack: () => void
  onSaved?: (page: StudyPage) => void
}

const BLOCK_DEFINITIONS: {
  type: StudyBlockType
  label: string
  icon: React.ElementType
}[] = [
  { type: 'heading', label: 'Título grande', icon: Heading },
  { type: 'subheading', label: 'Subtítulo', icon: Heading2 },
  { type: 'paragraph', label: 'Parágrafo de texto', icon: Pilcrow },
  { type: 'bullet_list', label: 'Lista com marcadores', icon: List },
  { type: 'numbered_list', label: 'Lista numerada', icon: ListOrdered },
  { type: 'checklist', label: 'Checklist com marcação', icon: CheckSquare },
  { type: 'divider', label: 'Divisor de seção', icon: Minus },
]

export const StudyBlockEditor: React.FC<StudyBlockEditorProps> = ({
  pageId,
  courseId,
  onBack,
  onSaved,
}) => {
  const [title, setTitle] = useState('')
  const [blocks, setBlocks] = useState<StudyBlock[]>([
    {
      id: crypto.randomUUID(),
      type: 'paragraph',
      content: '',
    },
  ])
  const [currentPageId, setCurrentPageId] = useState<string | undefined>(pageId)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)

  // Referência para timer do debounce do autosave
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isInitialMount = useRef(true)

  // Carrega página existente
  useEffect(() => {
    let active = true
    async function load() {
      if (pageId) {
        const p = await estudosRepository.getPageById(pageId)
        if (p && active) {
          setTitle(p.title)
          setBlocks(
            p.blocks && p.blocks.length > 0
              ? p.blocks
              : [{ id: crypto.randomUUID(), type: 'paragraph', content: '' }],
          )
          setCurrentPageId(p.id)
          estudosRepository.setLastOpenedPage({
            pageId: p.id,
            courseId: p.courseId,
            title: p.title,
          })
        }
      }
    }
    load()
    return () => {
      active = false
    }
  }, [pageId])

  // Função central de salvamento
  const performSave = useCallback(
    async (overrideTitle?: string, overrideBlocks?: StudyBlock[]) => {
      const actualTitle =
        (overrideTitle !== undefined ? overrideTitle : title).trim() || 'Sem título'
      const actualBlocks = overrideBlocks !== undefined ? overrideBlocks : blocks

      setIsSaving(true)
      try {
        const saved = await estudosRepository.savePage({
          id: currentPageId,
          courseId,
          title: actualTitle,
          blocks: actualBlocks,
        })
        setCurrentPageId(saved.id)
        setIsDirty(false)
        const now = new Date()
        setLastSavedTime(
          now.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }),
        )
        if (onSaved) onSaved(saved)
      } finally {
        setIsSaving(false)
      }
    },
    [title, blocks, currentPageId, courseId, onSaved],
  )

  // Autosave com debounce de 600ms após qualquer alteração
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }

    if (!isDirty) return

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
    }

    saveTimerRef.current = setTimeout(() => {
      performSave()
    }, 600)

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [title, blocks, isDirty, performSave])

  // Desmonte salva se ainda estiver pendente
  useEffect(() => {
    return () => {
      if (isDirty) {
        performSave()
      }
    }
  }, [isDirty, performSave])

  const handleTitleChange = (val: string) => {
    setTitle(val)
    setIsDirty(true)
  }

  const handleUpdateBlockContent = (id: string, content: string) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, content } : b)))
    setIsDirty(true)
  }

  const handleToggleCheck = (id: string, checked: boolean) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, checked } : b)))
    setIsDirty(true)
  }

  const handleAddBlock = (type: StudyBlockType, indexAfter?: number) => {
    const newBlock: StudyBlock = {
      id: crypto.randomUUID(),
      type,
      content: '',
      checked: type === 'checklist' ? false : undefined,
    }

    setBlocks((prev) => {
      if (indexAfter === undefined) {
        return [...prev, newBlock]
      }
      const next = [...prev]
      next.splice(indexAfter + 1, 0, newBlock)
      return next
    })
    setIsDirty(true)
  }

  const handleDeleteBlock = (id: string) => {
    setBlocks((prev) => {
      const next = prev.filter((b) => b.id !== id)
      if (next.length === 0) {
        return [{ id: crypto.randomUUID(), type: 'paragraph', content: '' }]
      }
      return next
    })
    setIsDirty(true)
  }

  const handleMoveBlock = (index: number, direction: 'up' | 'down') => {
    setBlocks((prev) => {
      const targetIndex = direction === 'up' ? index - 1 : index + 1
      if (targetIndex < 0 || targetIndex >= prev.length) return prev
      const next = [...prev]
      const [moved] = next.splice(index, 1)
      next.splice(targetIndex, 0, moved)
      return next
    })
    setIsDirty(true)
  }

  const handleChangeBlockType = (id: string, newType: StudyBlockType) => {
    setBlocks((prev) =>
      prev.map((b) => {
        if (b.id !== id) return b
        return {
          ...b,
          type: newType,
          checked: newType === 'checklist' ? b.checked || false : undefined,
        }
      }),
    )
    setIsDirty(true)
  }

  return (
    <div className="space-y-4 animate-fade-in pb-20">
      {/* Barra superior de navegação e autosave */}
      <div className="flex items-center justify-between pb-3 border-b border-border/70 sticky top-0 bg-background/95 backdrop-blur-sm z-20 py-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (isDirty) performSave()
            onBack()
          }}
          className="min-h-[44px] px-2 rounded-xl text-muted-foreground hover:text-foreground text-xs"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Voltar ao curso
        </Button>

        <div className="flex items-center gap-2">
          <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            {isSaving ? (
              <span className="flex items-center gap-1 text-[#8B5CF6] font-medium">
                <span className="w-2 h-2 rounded-full bg-[#8B5CF6] animate-pulse" />
                Salvando...
              </span>
            ) : lastSavedTime ? (
              <span className="flex items-center gap-1 text-[#3D9C73]">
                <Check className="w-3 h-3 stroke-[2.5]" /> Salvo às {lastSavedTime}
              </span>
            ) : isDirty ? (
              <span className="text-amber-500 text-[10px]">Alterações pendentes</span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Título da página */}
      <div className="space-y-1">
        <input
          type="text"
          placeholder="Título da anotação..."
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          className="w-full text-xl sm:text-2xl font-bold bg-transparent border-none outline-none focus:ring-0 placeholder:text-muted-foreground/60 text-foreground"
        />
        <div className="h-0.5 w-12 bg-[#8B5CF6]/50 rounded-full" />
      </div>

      {/* Lista de Blocos */}
      <div className="space-y-3 pt-2">
        {blocks.map((block, index) => {
          return (
            <div
              key={block.id}
              className="group relative flex items-start gap-1.5 sm:gap-2 transition-all p-1.5 rounded-xl hover:bg-muted/30"
            >
              {/* Menu de ações do bloco (reordenar / alterar tipo / excluir) */}
              <div className="flex items-center gap-0.5 pt-1.5 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                {/* Reordenar */}
                <div className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => handleMoveBlock(index, 'up')}
                    disabled={index === 0}
                    className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-20 min-h-[22px] min-w-[22px]"
                    title="Mover para cima"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveBlock(index, 'down')}
                    disabled={index === blocks.length - 1}
                    className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-20 min-h-[22px] min-w-[22px]"
                    title="Mover para baixo"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Dropdown do tipo de bloco */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground min-h-[32px] min-w-[32px] flex items-center justify-center"
                      title="Alterar tipo ou adicionar"
                    >
                      <GripVertical className="w-3.5 h-3.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    className="w-52 rounded-xl p-1 bg-card border-border"
                  >
                    <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Transformar bloco em:
                    </div>
                    {BLOCK_DEFINITIONS.map((def) => {
                      const Icon = def.icon
                      return (
                        <DropdownMenuItem
                          key={def.type}
                          onClick={() => handleChangeBlockType(block.id, def.type)}
                          className={cn(
                            'text-xs flex items-center gap-2 cursor-pointer rounded-lg',
                            block.type === def.type && 'font-bold text-[#8B5CF6]',
                          )}
                        >
                          <Icon className="w-4 h-4" />
                          <span>{def.label}</span>
                        </DropdownMenuItem>
                      )
                    })}
                    <div className="my-1 border-t border-border/60" />
                    <DropdownMenuItem
                      onClick={() => handleDeleteBlock(block.id)}
                      className="text-xs text-destructive flex items-center gap-2 cursor-pointer rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Excluir bloco</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Conteúdo específico por tipo de bloco */}
              <div className="flex-1 min-w-0">
                {block.type === 'heading' && (
                  <input
                    type="text"
                    value={block.content}
                    placeholder="Título principal..."
                    onChange={(e) => handleUpdateBlockContent(block.id, e.target.value)}
                    className="w-full text-lg sm:text-xl font-bold bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/50 py-1"
                  />
                )}

                {block.type === 'subheading' && (
                  <input
                    type="text"
                    value={block.content}
                    placeholder="Subtítulo..."
                    onChange={(e) => handleUpdateBlockContent(block.id, e.target.value)}
                    className="w-full text-base font-semibold bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/50 py-1"
                  />
                )}

                {block.type === 'paragraph' && (
                  <Textarea
                    value={block.content}
                    placeholder="Escreva seu parágrafo ou reflexão..."
                    onChange={(e) => handleUpdateBlockContent(block.id, e.target.value)}
                    rows={1}
                    className="w-full text-sm bg-transparent border-none shadow-none focus-visible:ring-0 resize-none p-1 placeholder:text-muted-foreground/50 min-h-[38px]"
                    style={{ height: 'auto' }}
                    onInput={(e: any) => {
                      e.target.style.height = 'auto'
                      e.target.style.height = `${e.target.scrollHeight}px`
                    }}
                  />
                )}

                {block.type === 'bullet_list' && (
                  <div className="flex items-start gap-2 pt-1">
                    <span className="w-2 h-2 rounded-full bg-[#8B5CF6] shrink-0 mt-2" />
                    <input
                      type="text"
                      value={block.content}
                      placeholder="Item com marcador..."
                      onChange={(e) => handleUpdateBlockContent(block.id, e.target.value)}
                      className="w-full text-sm bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/50"
                    />
                  </div>
                )}

                {block.type === 'numbered_list' && (
                  <div className="flex items-start gap-2 pt-1">
                    <span className="text-xs font-bold text-[#8B5CF6] shrink-0 mt-0.5">
                      {index + 1}.
                    </span>
                    <input
                      type="text"
                      value={block.content}
                      placeholder="Item numerado..."
                      onChange={(e) => handleUpdateBlockContent(block.id, e.target.value)}
                      className="w-full text-sm bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/50"
                    />
                  </div>
                )}

                {block.type === 'checklist' && (
                  <div className="flex items-start gap-2 pt-1">
                    <Checkbox
                      checked={block.checked || false}
                      onCheckedChange={(checked) => handleToggleCheck(block.id, Boolean(checked))}
                      className="mt-1 data-[state=checked]:bg-[#8B5CF6] data-[state=checked]:border-[#8B5CF6]"
                    />
                    <input
                      type="text"
                      value={block.content}
                      placeholder="Item do checklist..."
                      onChange={(e) => handleUpdateBlockContent(block.id, e.target.value)}
                      className={cn(
                        'w-full text-sm bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/50',
                        block.checked && 'line-through text-muted-foreground',
                      )}
                    />
                  </div>
                )}

                {block.type === 'divider' && (
                  <div className="py-3">
                    <hr className="border-t border-border" />
                  </div>
                )}
              </div>

              {/* Botão rápido para inserir bloco abaixo */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="p-1 rounded-md text-muted-foreground/60 hover:text-[#8B5CF6] min-h-[32px] min-w-[32px] flex items-center justify-center opacity-70 sm:opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Inserir bloco logo abaixo"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-48 rounded-xl p-1 bg-card border-border"
                >
                  <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Inserir abaixo:
                  </div>
                  {BLOCK_DEFINITIONS.map((def) => {
                    const Icon = def.icon
                    return (
                      <DropdownMenuItem
                        key={def.type}
                        onClick={() => handleAddBlock(def.type, index)}
                        className="text-xs flex items-center gap-2 cursor-pointer rounded-lg"
                      >
                        <Icon className="w-4 h-4 text-[#8B5CF6]" />
                        <span>{def.label}</span>
                      </DropdownMenuItem>
                    )
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        })}
      </div>

      {/* Barra de inserção de novo bloco ao final */}
      <div className="pt-4 flex flex-wrap items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-10 px-4 rounded-xl text-xs font-semibold border-border gap-2 text-foreground hover:bg-muted"
            >
              <Plus className="w-4 h-4 text-[#8B5CF6]" /> Adicionar bloco
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52 rounded-xl p-1 bg-card border-border">
            {BLOCK_DEFINITIONS.map((def) => {
              const Icon = def.icon
              return (
                <DropdownMenuItem
                  key={def.type}
                  onClick={() => handleAddBlock(def.type)}
                  className="text-xs flex items-center gap-2 cursor-pointer rounded-lg"
                >
                  <Icon className="w-4 h-4 text-[#8B5CF6]" />
                  <span>{def.label}</span>
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        <span className="text-[11px] text-muted-foreground">
          {blocks.length} {blocks.length === 1 ? 'bloco' : 'blocos'} • Salvamento automático ativo
        </span>
      </div>
    </div>
  )
}
