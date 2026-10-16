import React, { useState, useRef } from 'react'
import {
  Settings,
  Moon,
  Sun,
  Laptop,
  ToggleLeft,
  ToggleRight,
  Download,
  Upload,
  MessageSquare,
  Share2,
  Trash2,
  Sparkles,
  Info,
  CheckCircle2,
  AlertTriangle,
  Copy,
} from 'lucide-react'
import { useApp } from '@/lib/context'
import { backupRepository } from '@/lib/repositories/backupRepository'
import { ModuleKey } from '@/lib/types'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
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
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

export default function MaisPage() {
  const { settings, setTheme, toggleModule, loadSamples, clearAllData, notifyDataChanged } =
    useApp()

  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false)
  const [feedbackText, setFeedbackText] = useState('')
  const [clearDataDialogOpen, setClearDataDialogOpen] = useState(false)
  const [moduleConfirmState, setModuleConfirmState] = useState<{
    module: ModuleKey
    pendingActive: boolean
  } | null>(null)

  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  // 1. TEMA
  const handleThemeChange = (newTheme: 'claro' | 'escuro' | 'sistema') => {
    setTheme(newTheme)
    toast({
      title: 'Tema atualizado',
      description: `Modo ${newTheme} ativado.`,
    })
  }

  // 2. TOGGLE DE MÓDULOS (com aviso se for desativar)
  const handleToggleClick = (modKey: ModuleKey, currentState: boolean) => {
    if (currentState) {
      // Ao desativar, exibe aviso confirmando que os dados ficam preservados
      setModuleConfirmState({ module: modKey, pendingActive: false })
    } else {
      toggleModule(modKey, true)
      notifyDataChanged()
      toast({
        title: 'Módulo ativado',
        description: `O módulo agora está visível no app.`,
      })
    }
  }

  const confirmDeactivateModule = () => {
    if (moduleConfirmState) {
      toggleModule(moduleConfirmState.module, false)
      notifyDataChanged()
      toast({
        title: 'Módulo ocultado',
        description: 'Seus dados permanecem salvos localmente.',
      })
      setModuleConfirmState(null)
    }
  }

  // 3. EXPORTAR JSON
  const handleExportData = async () => {
    try {
      const data = await backupRepository.exportAll()
      const jsonStr = JSON.stringify(data, null, 2)
      const blob = new Blob([jsonStr], { type: 'application/json' })
      const url = URL.createObjectURL(blob)

      const link = document.createElement('a')
      const dateStr = new Date().toISOString().split('T')[0]
      link.href = url
      link.download = `rotina_backup_${dateStr}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast({
        title: 'Backup exportado com sucesso! ✓',
        description: 'Arquivo JSON gerado com todos os dados e imagens.',
      })
    } catch {
      toast({
        title: 'Erro ao exportar backup',
        variant: 'destructive',
      })
    }
  }

  // 4. IMPORTAR JSON (com validação e rollback completo se falhar)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImporting(true)
    try {
      const text = await file.text()
      const json = JSON.parse(text)
      await backupRepository.importAll(json)

      toast({
        title: 'Dados restaurados com sucesso ✓',
        description: 'Todas as suas anotações, leituras e treinos foram recuperados.',
      })
      notifyDataChanged()
      setTimeout(() => {
        window.location.reload()
      }, 800)
    } catch (err: any) {
      toast({
        title: 'Falha ao restaurar dados',
        description: err.message || 'Arquivo inválido ou corrompido. Nenhum dado foi alterado.',
        variant: 'destructive',
      })
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // 5. CARREGAR DADOS DE EXEMPLO
  const handleLoadSamples = async () => {
    try {
      await loadSamples()
      toast({
        title: 'Dados de exemplo carregados! 🎉',
        description: 'Plano semanal, histórico de leituras e anotação prontos.',
      })
    } catch {
      toast({
        title: 'Erro ao carregar exemplos',
        variant: 'destructive',
      })
    }
  }

  // 6. LIMPAR TUDO (DUPLA CONFIRMAÇÃO)
  const handleClearAll = async () => {
    try {
      await clearAllData()
      setClearDataDialogOpen(false)
      toast({
        title: 'Todos os dados foram apagados',
        description: 'O aplicativo foi reinicializado do zero.',
      })
    } catch {
      toast({
        title: 'Erro ao limpar dados',
        variant: 'destructive',
      })
    }
  }

  // 7. FEEDBACK & COMPARTILHAR
  const handleCopyFeedback = async () => {
    if (!feedbackText.trim()) return
    await navigator.clipboard.writeText(feedbackText.trim())
    toast({
      title: 'Texto copiado! 📋',
      description: 'Cole em seu aplicativo de mensagens favorito.',
    })
    setFeedbackModalOpen(false)
    setFeedbackText('')
  }

  const handleShareApp = async () => {
    const url = window.location.origin
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Rotina — App de Produtividade',
          text: 'Conheça o Rotina: meu aplicativo de produtividade pessoal offline.',
          url,
        })
        return
      } catch {
        // Fallback para clipboard
      }
    }
    await navigator.clipboard.writeText(url)
    toast({
      title: 'Link copiado! 📋',
      description: 'Envie o link para testers instalarem em seus celulares.',
    })
  }

  const modulesList: { key: ModuleKey; label: string; desc: string; color: string }[] = [
    {
      key: 'escrita',
      label: 'Escrita',
      desc: 'Diário e anotações pessoais diárias com busca e tags.',
      color: '#7C8CFF',
    },
    {
      key: 'leitura',
      label: 'Leitura',
      desc: 'Biblioteca de livros, metas de páginas e anotações.',
      color: '#34BEAA',
    },
    {
      key: 'treino',
      label: 'Treino',
      desc: 'Plano semanal, logs de séries e evolução de carga.',
      color: '#F07B6A',
    },
    {
      key: 'estudos',
      label: 'Estudos',
      desc: 'Cursos, faculdade, certificações, anotações em blocos e certificados.',
      color: '#8B5CF6',
    },
    {
      key: 'trabalho',
      label: 'Trabalho',
      desc: 'Projetos, conquistas para currículo/LinkedIn, experiências e anotações.',
      color: '#0284C7',
    },
  ]

  return (
    <div className="pt-2 pb-16 space-y-6 max-w-2xl mx-auto">
      {/* CABEÇALHO */}
      <div className="flex items-center gap-2.5 pb-2 border-b border-border/60">
        <div className="w-8 h-8 rounded-lg bg-muted text-foreground flex items-center justify-center">
          <Settings className="w-4 h-4" />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">Mais</h1>
      </div>

      {/* 1. SEÇÃO APARÊNCIA */}
      <Card className="rounded-2xl border-border bg-card shadow-subtle overflow-hidden">
        <CardContent className="p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Aparência
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { key: 'claro', label: 'Claro', icon: Sun },
              { key: 'escuro', label: 'Escuro', icon: Moon },
              { key: 'sistema', label: 'Sistema', icon: Laptop },
            ].map((t) => {
              const Icon = t.icon
              const isSelected = settings.theme === t.key
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => handleThemeChange(t.key as any)}
                  className={cn(
                    'flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border text-xs font-semibold transition-all min-h-[50px]',
                    isSelected
                      ? 'border-[#F59E4C] bg-[#F59E4C]/10 text-[#F59E4C] shadow-xs'
                      : 'border-border bg-background text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{t.label}</span>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* 2. SEÇÃO MÓDULOS ATIVOS */}
      <Card className="rounded-2xl border-border bg-card shadow-subtle overflow-hidden">
        <CardContent className="p-4 sm:p-5 space-y-3">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
              Módulos Ativos
            </span>
            <p className="text-xs text-muted-foreground mt-0.5">
              Personalize a navegação ativando ou ocultando os módulos de sua rotina.
            </p>
          </div>

          <div className="space-y-3 pt-1">
            {modulesList.map((m) => {
              const isActive = settings.activeModules[m.key]
              return (
                <div
                  key={m.key}
                  className="flex items-center justify-between p-3 rounded-xl bg-background border border-border"
                >
                  <div className="space-y-0.5 pr-2">
                    <span className="text-sm font-bold text-foreground flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: m.color }}
                      />
                      {m.label}
                    </span>
                    <p className="text-[11px] text-muted-foreground leading-tight">{m.desc}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleClick(m.key, isActive)}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center transition-transform active:scale-95"
                    aria-label={`Alternar módulo ${m.label}`}
                  >
                    {isActive ? (
                      <ToggleRight className="w-8 h-8 text-[#F59E4C]" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-muted-foreground/60" />
                    )}
                  </button>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* 3. SEÇÃO BACKUP E DADOS */}
      <Card className="rounded-2xl border-border bg-card shadow-subtle overflow-hidden">
        <CardContent className="p-4 sm:p-5 space-y-3">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
              Backup e Armazenamento
            </span>
            <p className="text-xs text-muted-foreground mt-0.5">
              Todos os seus dados estão salvos 100% no seu aparelho via IndexedDB.
            </p>
          </div>

          {/* Input oculto para importação */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={handleFileChange}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <Button
              variant="outline"
              onClick={handleExportData}
              className="min-h-[44px] h-11 rounded-xl text-xs font-semibold justify-start border-border gap-2"
            >
              <Download className="w-4 h-4 text-[#F59E4C]" /> Exportar dados (JSON)
            </Button>
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="min-h-[44px] h-11 rounded-xl text-xs font-semibold justify-start border-border gap-2"
            >
              <Upload className="w-4 h-4 text-[#34BEAA]" />{' '}
              {importing ? 'Restaurando...' : 'Importar dados (Restaurar)'}
            </Button>
          </div>

          <div className="pt-2 border-t border-border/60 flex flex-col sm:flex-row gap-2">
            <Button
              onClick={handleLoadSamples}
              variant="ghost"
              className="h-10 text-xs font-semibold rounded-xl text-[#F59E4C] hover:bg-[#F59E4C]/10 justify-start gap-2"
            >
              <Sparkles className="w-4 h-4" /> Carregar dados de exemplo
            </Button>
            <Button
              onClick={handleShareApp}
              variant="ghost"
              className="h-10 text-xs font-semibold rounded-xl text-foreground hover:bg-muted justify-start gap-2"
            >
              <Share2 className="w-4 h-4" /> Compartilhar com testers
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 4. FEEDBACK E SUPORTE */}
      <Card className="rounded-2xl border-border bg-card shadow-subtle overflow-hidden">
        <CardContent className="p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-sm font-bold text-foreground flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#7C8CFF]" />
                Enviar Feedback
              </span>
              <p className="text-xs text-muted-foreground">
                Sugestões, melhorias ou relatos de bugs para o app.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setFeedbackModalOpen(true)}
              className="h-9 px-3 rounded-xl bg-secondary text-foreground hover:bg-muted text-xs font-semibold"
            >
              Escrever
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 5. ZONA DE PERIGO (LIMPAR TUDO) */}
      <Card className="rounded-2xl border-destructive/30 bg-destructive/5 shadow-subtle overflow-hidden">
        <CardContent className="p-4 sm:p-5 flex items-center justify-between">
          <div className="space-y-0.5 pr-2">
            <span className="text-sm font-bold text-destructive flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Limpar todos os dados
            </span>
            <p className="text-xs text-muted-foreground">
              Apaga permanentemente todos os treinos, leituras e anotações deste dispositivo.
            </p>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setClearDataDialogOpen(true)}
            className="min-h-[40px] px-3.5 rounded-xl text-xs font-bold shrink-0"
          >
            Limpar tudo
          </Button>
        </CardContent>
      </Card>

      {/* SOBRE / PWA INFORMAÇÕES */}
      <div className="text-center text-xs text-muted-foreground space-y-1 pt-2">
        <p className="font-semibold text-foreground">Rotina v1.0.0 • Mobile-first SPA Offline</p>
        <p>Feito para celular e tablet com armazenamento 100% local no seu aparelho.</p>
      </div>

      {/* MODAL DE CONFIRMAÇÃO PARA DESATIVAR MÓDULO */}
      <AlertDialog
        open={Boolean(moduleConfirmState)}
        onOpenChange={(val) => !val && setModuleConfirmState(null)}
      >
        <AlertDialogContent className="rounded-2xl bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Ocultar módulo?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs leading-relaxed text-muted-foreground">
              Seus dados do módulo não serão apagados, apenas ocultos do app. Você pode reativá-lo a
              qualquer momento nesta tela de configurações.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl text-xs">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeactivateModule}
              className="rounded-xl text-xs bg-[#F59E4C] hover:bg-[#F59E4C]/90 text-white"
            >
              Confirmar e Ocultar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* MODAL DE DUPLA CONFIRMAÇÃO PARA LIMPAR TUDO */}
      <AlertDialog open={clearDataDialogOpen} onOpenChange={setClearDataDialogOpen}>
        <AlertDialogContent className="rounded-2xl bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Tem certeza absoluta?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground space-y-2">
              <span>
                Esta ação é irreversível. Todos os seus registros de treinos, notas do diário e
                livros serão removidos permanentemente deste aparelho.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl text-xs">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearAll}
              className="rounded-xl text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold"
            >
              Sim, apagar tudo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* MODAL DE FEEDBACK COM COPIAR PARA CLIPBOARD */}
      <Dialog open={feedbackModalOpen} onOpenChange={setFeedbackModalOpen}>
        <DialogContent className="sm:max-w-md bg-card rounded-2xl p-6 border border-border">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-[#7C8CFF]" />
              Enviar Feedback
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Escreva sua mensagem. Ao clicar em copiar, você pode colá-la em seu mensageiro ou
              e-mail.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <Textarea
              rows={5}
              placeholder="Descreva sua experiência, sugestão de recurso ou problema encontrado..."
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              className="rounded-xl text-xs sm:text-sm bg-background border-border"
            />

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setFeedbackModalOpen(false)}
                className="flex-1 h-10 rounded-xl text-xs"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCopyFeedback}
                className="flex-1 h-10 rounded-xl text-xs bg-[#7C8CFF] hover:bg-[#7C8CFF]/90 text-white font-semibold gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" /> Copiar Texto
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
