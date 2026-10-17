import React, { useState, useEffect, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Play,
  Pause,
  Check,
  Trash2,
  BookOpen,
  Eye,
  AlertCircle,
  Clock,
  Sparkles,
} from 'lucide-react'
import { readingTimerService } from '@/lib/readingTimerService'
import { ReadingTimerState } from '@/lib/types'
import { toast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

interface ReadingTimerModalProps {
  open: boolean
  onClose: () => void
  onFinished?: () => void
}

export function ReadingTimerModal({ open, onClose, onFinished }: ReadingTimerModalProps) {
  const [timerState, setTimerState] = useState<ReadingTimerState | null>(null)
  const [seconds, setSeconds] = useState(0)
  const [wakeLockActive, setWakeLockActive] = useState(false)
  const [wakeLockSupported, setWakeLockSupported] = useState(false)
  const wakeLockSentinelRef = useRef<any>(null)

  // Registro de finalização
  const [finishMode, setFinishMode] = useState(false)
  const [minutesInput, setMinutesInput] = useState('')
  const [pagesInput, setPagesInput] = useState('')
  const [isDiscardConfirmOpen, setIsDiscardConfirmOpen] = useState(false)
  const [goalReachedNotified, setGoalReachedNotified] = useState(false)

  // Carrega estado
  const syncState = async () => {
    const s = await readingTimerService.getTimerState()
    setTimerState(s)
    if (s) {
      setSeconds(s.elapsedSeconds || 0)
    }
  }

  useEffect(() => {
    if (open) {
      syncState()
      setFinishMode(false)
      setIsDiscardConfirmOpen(false)
      setGoalReachedNotified(false)
    }
  }, [open])

  // Suporte a Wake Lock
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
      setWakeLockSupported(true)
    }
  }, [])

  // Gerenciamento de Wake Lock
  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator && (navigator as any).wakeLock) {
        const sentinel = await (navigator as any).wakeLock.request('screen')
        wakeLockSentinelRef.current = sentinel
        setWakeLockActive(true)
        sentinel.addEventListener('release', () => {
          setWakeLockActive(false)
        })
      }
    } catch {
      setWakeLockActive(false)
    }
  }

  const releaseWakeLock = async () => {
    try {
      if (wakeLockSentinelRef.current) {
        await wakeLockSentinelRef.current.release()
        wakeLockSentinelRef.current = null
      }
    } catch {
      /* intentionally ignored */
    }
    setWakeLockActive(false)
  }

  const toggleWakeLock = async () => {
    if (wakeLockActive) {
      await releaseWakeLock()
    } else {
      await requestWakeLock()
    }
  }

  // Intervalo do contador em tempo real
  useEffect(() => {
    if (!open || !timerState || timerState.status !== 'running') {
      return
    }

    const interval = setInterval(() => {
      setSeconds((prev) => {
        const next = prev + 1

        // Notificação discreta ao atingir a meta em minutos
        if (
          timerState.targetMinutes &&
          timerState.targetMinutes > 0 &&
          next >= timerState.targetMinutes * 60 &&
          !goalReachedNotified
        ) {
          setGoalReachedNotified(true)
          toast({
            title: 'Meta de leitura atingida! 📖',
            description: `Você completou os ${timerState.targetMinutes} minutos planejados para hoje.`,
          })
        }

        return next
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [open, timerState, goalReachedNotified])

  // Libera Wake Lock ao fechar
  useEffect(() => {
    return () => {
      releaseWakeLock()
    }
  }, [])

  const handlePause = async () => {
    await readingTimerService.pauseTimer()
    await syncState()
  }

  const handleResume = async () => {
    await readingTimerService.resumeTimer()
    await syncState()
  }

  const handleOpenFinish = () => {
    // Pausa se estiver rodando
    if (timerState?.status === 'running') {
      handlePause()
    }

    // Se tiver menos de 1 minuto, pede confirmação para descartar
    if (seconds < 60) {
      setIsDiscardConfirmOpen(true)
      return
    }

    const calculatedMins = Math.max(1, Math.round(seconds / 60))
    setMinutesInput(String(calculatedMins))
    setPagesInput('')
    setFinishMode(true)
  }

  const handleDiscard = async () => {
    await releaseWakeLock()
    await readingTimerService.discardTimer()
    setIsDiscardConfirmOpen(false)
    onClose()
  }

  const handleSaveFinished = async () => {
    if (!timerState?.bookId) return

    const mins = Math.max(1, parseInt(minutesInput, 10) || 1)
    const pages = pagesInput ? Math.max(0, parseInt(pagesInput, 10) || 0) : undefined

    await releaseWakeLock()
    await readingTimerService.finishReadingSession({
      bookId: timerState.bookId,
      minutes: mins,
      pagesRead: pages,
    })

    toast({
      title: 'Leitura registrada! 🎉',
      description: `${mins} min ${pages ? `e ${pages} pág.` : ''} salvos com sucesso.`,
    })

    onClose()
    onFinished?.()
  }

  // Formatação de tempo grande
  const formatTimeBig = (totalSec: number) => {
    const hours = Math.floor(totalSec / 3600)
    const minutes = Math.floor((totalSec % 3600) / 60)
    const secs = totalSec % 60

    const pad = (n: number) => String(n).padStart(2, '0')
    if (hours > 0) {
      return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`
    }
    return `${pad(minutes)}:${pad(secs)}`
  }

  // Anel de progresso contra meta em minutos
  const targetSec = timerState?.targetMinutes ? timerState.targetMinutes * 60 : 0
  const progressPct = targetSec > 0 ? Math.min(100, Math.round((seconds / targetSec) * 100)) : 0

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md bg-card rounded-3xl p-6 border border-border shadow-xl">
        <DialogHeader className="text-center sm:text-left">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#34BEAA] flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" /> Sessão de Leitura
            </span>
            {timerState?.status === 'running' && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 animate-pulse">
                Em andamento
              </span>
            )}
            {timerState?.status === 'paused' && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
                Pausado
              </span>
            )}
          </div>
          <DialogTitle className="text-lg font-bold text-foreground truncate mt-1">
            {timerState?.bookTitle || 'Livro em leitura'}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            O tempo é salvo continuamente e resiste ao fechar o app.
          </DialogDescription>
        </DialogHeader>

        {finishMode ? (
          /* FORMULÁRIO DE REGISTRO DA LEITURA */
          <div className="space-y-4 pt-2">
            <div className="p-3.5 rounded-2xl bg-muted/40 border border-border space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#34BEAA]" /> Minutos lidos (editável)
                </label>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={minutesInput}
                  onChange={(e) => setMinutesInput(e.target.value)}
                  className="h-11 rounded-xl text-base font-bold"
                  placeholder="Minutos"
                  autoFocus
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-[#34BEAA]" /> Páginas lidas nesta sessão
                  (opcional)
                </label>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={pagesInput}
                  onChange={(e) => setPagesInput(e.target.value)}
                  className="h-11 rounded-xl text-base font-bold"
                  placeholder="Ex: 15"
                />
                <p className="text-[10px] text-muted-foreground">
                  As páginas lidas avançam automaticamente a página atual do livro.
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setFinishMode(false)}
                className="flex-1 h-12 rounded-xl text-xs font-semibold"
              >
                Voltar
              </Button>
              <Button
                type="button"
                onClick={handleSaveFinished}
                className="flex-1 h-12 rounded-xl text-xs font-bold bg-[#34BEAA] hover:bg-[#34BEAA]/90 text-white shadow-sm"
              >
                <Check className="w-4 h-4 mr-1.5" /> Salvar Leitura
              </Button>
            </div>
          </div>
        ) : (
          /* CRONÔMETRO VISUAL */
          <div className="space-y-6 pt-2">
            {/* CÍRCULO / DISPLAY DE TEMPO */}
            <div className="flex flex-col items-center justify-center py-4 relative">
              {/* Anel SVG se houver meta de minutos */}
              <div className="relative w-48 h-48 flex items-center justify-center">
                {targetSec > 0 && (
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="44"
                      className="stroke-muted"
                      strokeWidth="6"
                      fill="transparent"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="44"
                      className="stroke-[#34BEAA] transition-all duration-500 ease-out"
                      strokeWidth="6"
                      strokeDasharray={276.46}
                      strokeDashoffset={276.46 - (276.46 * progressPct) / 100}
                      strokeLinecap="round"
                      fill="transparent"
                    />
                  </svg>
                )}

                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-4xl font-black font-mono tracking-tight text-foreground">
                    {formatTimeBig(seconds)}
                  </span>
                  {timerState?.targetMinutes && timerState.targetMinutes > 0 ? (
                    <span className="text-[11px] font-bold text-muted-foreground mt-1">
                      Meta: {timerState.targetMinutes} min ({progressPct}%)
                    </span>
                  ) : (
                    <span className="text-[11px] text-muted-foreground mt-1">Tempo corrido</span>
                  )}
                </div>
              </div>
            </div>

            {/* AVISO DISCRETO DE META ATINGIDA */}
            {goalReachedNotified && (
              <div className="p-2.5 rounded-xl bg-[#34BEAA]/10 border border-[#34BEAA]/30 flex items-center gap-2 text-xs font-bold text-[#1F7F6E] dark:text-[#34BEAA] justify-center">
                <Sparkles className="w-4 h-4" /> Meta do dia alcançada! Continue no seu ritmo.
              </div>
            )}

            {/* BOTÃO WAKE LOCK (MANTER TELA LIGADA) */}
            {wakeLockSupported && (
              <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/40 border border-border">
                <div className="flex items-center gap-2">
                  <Eye
                    className={cn(
                      'w-4 h-4',
                      wakeLockActive ? 'text-[#34BEAA]' : 'text-muted-foreground',
                    )}
                  />
                  <span className="text-xs font-semibold text-foreground">
                    Manter a tela ligada
                  </span>
                </div>
                <button
                  type="button"
                  onClick={toggleWakeLock}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all',
                    wakeLockActive
                      ? 'bg-[#34BEAA] text-white shadow-xs'
                      : 'bg-muted text-muted-foreground hover:text-foreground',
                  )}
                >
                  {wakeLockActive ? 'Ligada ✓' : 'Ativar'}
                </button>
              </div>
            )}

            {/* CONTROLES DO CRONÔMETRO */}
            <div className="space-y-2">
              <div className="flex gap-2">
                {timerState?.status === 'running' ? (
                  <Button
                    type="button"
                    onClick={handlePause}
                    className="flex-1 h-12 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Pause className="w-4 h-4" /> Pausar
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={handleResume}
                    className="flex-1 h-12 rounded-xl text-xs font-bold bg-[#34BEAA] hover:bg-[#34BEAA]/90 text-white flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Play className="w-4 h-4 fill-white" /> Retomar
                  </Button>
                )}

                <Button
                  type="button"
                  onClick={handleOpenFinish}
                  className="flex-1 h-12 rounded-xl text-xs font-bold bg-foreground hover:bg-foreground/90 text-background flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Check className="w-4 h-4" /> Finalizar
                </Button>
              </div>

              <div className="flex justify-center pt-1">
                <button
                  type="button"
                  onClick={() => setIsDiscardConfirmOpen(true)}
                  className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Descartar sessão
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DIÁLOGO DE CONFIRMAÇÃO DE DESCARTE (MENOS DE 1 MIN OU VOLUNTÁRIO) */}
        {isDiscardConfirmOpen && (
          <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 space-y-3 mt-3 animate-fade-in">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-destructive">Descartar esta leitura?</h4>
                <p className="text-[11px] text-muted-foreground">
                  {seconds < 60
                    ? 'Esta sessão durou menos de 1 minuto. Deseja descartá-la sem registrar?'
                    : 'Todo o tempo acumulado nesta sessão será cancelado.'}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsDiscardConfirmOpen(false)}
                className="h-8 text-xs"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleDiscard}
                className="h-8 text-xs font-bold"
              >
                Sim, descartar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
