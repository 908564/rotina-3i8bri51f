import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { escritaRepository } from '@/lib/repositories/escritaRepository'
import { EscritaNote } from '@/lib/types'
import { Search, Calendar, FileText, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface SearchNotesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const SearchNotesModal: React.FC<SearchNotesModalProps> = ({ open, onOpenChange }) => {
  const [query, setQuery] = useState('')
  const [notes, setNotes] = useState<EscritaNote[]>([])
  const [results, setResults] = useState<EscritaNote[]>([])
  const navigate = useNavigate()

  useEffect(() => {
    if (open) {
      escritaRepository.getNotes().then((all) => {
        setNotes(all)
        setResults(all.slice(0, 8))
      })
      setQuery('')
    }
  }, [open])

  useEffect(() => {
    const q = query.trim().toLowerCase()
    if (!q) {
      setResults(notes.slice(0, 8))
      return
    }

    const filtered = notes.filter((n) => {
      const matchTitle = n.title?.toLowerCase().includes(q)
      const matchBody = n.body?.toLowerCase().includes(q)
      const matchDate = n.date?.includes(q)
      return matchTitle || matchBody || matchDate
    })
    setResults(filtered.slice(0, 20))
  }, [query, notes])

  const handleSelectNote = (date: string) => {
    onOpenChange(false)
    navigate(`/escrita?date=${date}`)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md w-full bg-card rounded-2xl p-5 sm:p-6 border border-border max-h-[80vh] flex flex-col">
        <DialogHeader className="text-left space-y-1 shrink-0">
          <DialogTitle className="text-lg font-bold">Buscar Anotações</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Pesquise suas anotações por palavra-chave ou data.
          </DialogDescription>
        </DialogHeader>

        <div className="relative shrink-0 pt-2">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Digite para buscar..."
            className="pl-9 h-11 rounded-xl bg-background border-border text-sm"
            autoFocus
          />
        </div>

        <div className="overflow-y-auto flex-1 space-y-1.5 pt-3 pr-1">
          {results.length > 0 ? (
            results.map((note) => (
              <button
                key={note.id}
                type="button"
                onClick={() => handleSelectNote(note.date)}
                className="w-full text-left p-3 rounded-xl hover:bg-muted/70 transition-all border border-transparent hover:border-border flex items-center justify-between group"
              >
                <div className="space-y-0.5 min-w-0 pr-2">
                  <div className="flex items-center gap-1.5 text-[11px] text-[#7B83E6] font-semibold">
                    <Calendar className="w-3 h-3" />
                    <span>{note.date}</span>
                  </div>
                  <h4 className="text-xs font-bold text-foreground truncate">
                    {note.title || 'Anotação sem título'}
                  </h4>
                  <p className="text-[11px] text-muted-foreground line-clamp-1">
                    {note.body ? note.body.substring(0, 80) : 'Sem conteúdo'}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform shrink-0" />
              </button>
            ))
          ) : (
            <div className="text-center py-8 text-xs text-muted-foreground">
              {query ? 'Nenhuma anotação encontrada.' : 'Nenhuma anotação registrada ainda.'}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
