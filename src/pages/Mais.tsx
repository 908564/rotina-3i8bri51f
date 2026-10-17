import React, { useState, useRef, useEffect } from 'react'
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
  ShieldCheck,
  ShieldAlert,
  Database,
  FileDown,
} from 'lucide-react'
import { useApp } from '@/lib/context'
import {
  backupRepository,
  MAX_BACKUP_FILE_BYTES,
  ValidationSummary,
} from '@/lib/repositories/backupRepository'
import { getTodayDateKey } from '@/lib/dateUtils'
import { ModuleKey } from '@/lib/types'
import { APP_VERSION } from '@/lib/version'
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
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth/AuthContext'
import { AuthModal } from '@/components/auth/AuthModal'
import {
  Cloud,
  CloudOff,
  RefreshCw,
  LogOut,
  User as UserIcon,
  BarChart2,
  ChevronRight,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import pb from '@/lib/pocketbase/client'

export default function MaisPage() {
  const navigate = useNavigate()
  const {
    settings,
    setTheme,
    toggleModule,
    loadSamples,
    clearAllData,
    notifyDataChanged,
    notifyExternalDataChanged,
  } = useApp()

  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false)
  const [feedbackText, setFeedbackText] = useState('')
  const [clearDataDialogOpen, setClearDataDialogOpen] = useState(false)
  const [moduleConfirmState, setModuleConfirmState] = useState<{
    module: ModuleKey
    pendingActive: boolean
  } | null>(null)

  // Conta & Sincronização na nuvem
  const { user, syncMeta, triggerSync, signOut } = useAuth()
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authModalMode, setAuthModalMode] = useState<'welcome' | 'signin' | 'signup' | 'forgot'>(
    'signin',
  )
  const [syncingManual, setSyncingManual] = useState(false)
  const [signOutDialogOpen, setSignOutDialogOpen] = useState(false)
  const [signOutKeepLocal, setSignOutKeepLocal] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleteKeepLocal, setDeleteKeepLocal] = useState(true)
  const [deletingAccount, setDeletingAccount] = useState(false)

  // Storage info (cota e persistência)
  const [isPersisted, setIsPersisted] = useState<boolean | null>(null)
  const [storageEstimate, setStorageEstimate] = useState<{
    usageMb: string
    quotaMb: string
    percent: number
  } | null>(null)

  // Importação e confirmação segura
  const [pendingImportPayload, setPendingImportPayload] = useState<unknown | null>(null)
  const [pendingValidation, setPendingValidation] = useState<ValidationSummary | null>(null)
  const [currentCounts, setCurrentCounts] = useState<Record<string, number>>({})
  const [importConfirmOpen, setImportConfirmOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const checkStorage = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.storage) {
        if (navigator.storage.persisted) {
          const persisted = await navigator.storage.persisted()
          setIsPersisted(persisted)
        }
        if (navigator.storage.estimate) {
          const estimate = await navigator.storage.estimate()
          const usageBytes = estimate.usage || 0
          const quotaBytes = estimate.quota || 1
          const usageMb = (usageBytes / (1024 * 1024)).toFixed(1)
          const quotaMb = (quotaBytes / (1024 * 1024)).toFixed(0)
          const percent = Math.min(100, Math.round((usageBytes / quotaBytes) * 100))
          setStorageEstimate({ usageMb, quotaMb, percent })
        }
      }
    } catch {
      // Ignora erro se API não estiver acessível
    }
  }

  useEffect(() => {
    checkStorage()
  }, [])

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

  // 3. EXPORTAR JSON (com ou sem anexos)
  const downloadBackupBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleExportData = async (omitAttachments = false) => {
    try {
      const data = await backupRepository.exportAll({ omitAttachments })
      const jsonStr = JSON.stringify(data, null, 2)
      const blob = new Blob([jsonStr], { type: 'application/json' })
      const sizeBytes = blob.size
      const sizeFormatted =
        sizeBytes < 1024 * 1024
          ? `${(sizeBytes / 1024).toFixed(1)} KB`
          : `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`

      const dateStr = getTodayDateKey()
      const suffix = omitAttachments ? '_sem_anexos' : ''
      downloadBackupBlob(blob, `rotina_backup_${dateStr}${suffix}.json`)

      toast({
        title: 'Backup exportado com sucesso! ✓',
        description: `Tamanho do arquivo: ${sizeFormatted}. ${
          omitAttachments
            ? 'Certificados e capas foram omitidos.'
            : 'Todos os dados e anexos incluídos.'
        }`,
      })
    } catch {
      toast({
        title: 'Erro ao exportar backup',
        variant: 'destructive',
      })
    }
  }

  // 4. IMPORTAR JSON (pré-validação e abertura de diálogo de confirmação com resumo)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 4.1 Checar tamanho do arquivo antes de parsear (limite: 150 MB)
    if (file.size > MAX_BACKUP_FILE_BYTES) {
      const maxMb = Math.round(MAX_BACKUP_FILE_BYTES / (1024 * 1024))
      const fileMb = (file.size / (1024 * 1024)).toFixed(1)
      toast({
        title: 'Arquivo muito grande',
        description: `O arquivo selecionado possui ${fileMb} MB, excedendo o limite máximo de ${maxMb} MB para restauração.`,
        variant: 'destructive',
      })
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    try {
      const text = await file.text()
      let json: unknown
      try {
        json = JSON.parse(text)
      } catch {
        throw new Error('O arquivo não é um JSON válido. Verifique se o arquivo está corrompido.')
      }

      // Valida payload e obtém contagens
      const summary = await backupRepository.validatePayload(json)
      const counts = await backupRepository.getCollectionCounts()

      setPendingImportPayload(json)
      setPendingValidation(summary)
      setCurrentCounts(counts)
      setImportConfirmOpen(true)
    } catch (err: any) {
      toast({
        title: 'Falha ao ler arquivo de backup',
        description:
          err.message || 'Arquivo inválido ou corrompido. Nenhum dado existente foi alterado.',
        variant: 'destructive',
      })
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Baixa cópia de segurança antes de substituir
  const handleDownloadSafetyCopy = async () => {
    try {
      const currentData = await backupRepository.exportAll()
      const jsonStr = JSON.stringify(currentData, null, 2)
      const blob = new Blob([jsonStr], { type: 'application/json' })
      const dateStr = getTodayDateKey()
      downloadBackupBlob(blob, `rotina_copia_seguranca_pre_restauracao_${dateStr}.json`)
      toast({
        title: 'Cópia de segurança baixada! 💾',
        description: 'Seus dados atuais foram salvos antes da restauração.',
      })
    } catch {
      toast({
        title: 'Não foi possível baixar cópia de segurança',
        variant: 'destructive',
      })
    }
  }

  // Executa a substituição dos dados pelo backup
  const handleConfirmImport = async () => {
    if (!pendingImportPayload) return
    setImporting(true)
    try {
      // Baixa automaticamente a cópia de segurança antes de substituir
      try {
        const currentData = await backupRepository.exportAll()
        const jsonStr = JSON.stringify(currentData, null, 2)
        const blob = new Blob([jsonStr], { type: 'application/json' })
        const dateStr = getTodayDateKey()
        downloadBackupBlob(blob, `rotina_copia_seguranca_automatica_${dateStr}.json`)
      } catch {
        // Prossegue se o download automático for bloqueado pelo navegador
      }

      const result = await backupRepository.importAll(pendingImportPayload)

      const ignoredMsg =
        result.ignoredCount > 0
          ? ` (${result.ignoredCount} registro${result.ignoredCount > 1 ? 's' : ''} inválido${result.ignoredCount > 1 ? 's' : ''} desconsiderado${result.ignoredCount > 1 ? 's' : ''})`
          : ''

      const noAttachmentsMsg = !result.hasAttachments
        ? ' Este backup não contém anexos (certificados e capas de livros não foram restaurados).'
        : ''

      toast({
        title: 'Dados restaurados com sucesso! ✓',
        description: `${result.importedCount} registros recuperados${ignoredMsg}.${noAttachmentsMsg} Recarregando tela...`,
      })

      setImportConfirmOpen(false)
      setPendingImportPayload(null)
      setPendingValidation(null)
      notifyExternalDataChanged()
      checkStorage()

      setTimeout(() => {
        window.location.reload()
      }, 1200)
    } catch (err: any) {
      toast({
        title: 'Falha ao restaurar dados',
        description:
          err.message || 'Arquivo inválido ou corrompido. Nenhum dado existente foi alterado.',
        variant: 'destructive',
      })
    } finally {
      setImporting(false)
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
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('Área de transferência não suportada.')
      }
      await navigator.clipboard.writeText(feedbackText.trim())
      toast({
        title: 'Texto copiado! 📋',
        description: 'Cole em seu aplicativo de mensagens favorito.',
      })
      setFeedbackModalOpen(false)
      setFeedbackText('')
    } catch (err: any) {
      toast({
        title: 'Erro ao copiar texto',
        description: err?.message || 'Permissão negada ao acessar a área de transferência.',
        variant: 'destructive',
      })
    }
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
        // Fallback para clipboard se compartilhamento for cancelado ou não suportado
      }
    }
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('Área de transferência não suportada.')
      }
      await navigator.clipboard.writeText(url)
      toast({
        title: 'Link copiado! 📋',
        description: 'Envie o link para testers instalarem em seus celulares.',
      })
    } catch (err: any) {
      toast({
        title: 'Erro ao copiar link',
        description: err?.message || 'Não foi possível copiar o link para a área de transferência.',
        variant: 'destructive',
      })
    }
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

      {/* ENTRADA DIRETA PARA RESUMO DA SEMANA */}
      <Card className="rounded-2xl border-border bg-card shadow-subtle overflow-hidden">
        <CardContent className="p-3 sm:p-4">
          <button
            type="button"
            onClick={() => navigate('/resumo')}
            className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-muted/50 transition-colors text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#E8883A]/15 text-[#E8883A] flex items-center justify-center shrink-0">
                <BarChart2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-foreground group-hover:text-[#E8883A] transition-colors">
                  Resumo da semana
                </h2>
                <p className="text-xs text-muted-foreground">
                  Visão consolidada de hábitos, progresso dos 7 dias e histórico semanal
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
          </button>
        </CardContent>
      </Card>

      {/* SEÇÃO CONTA & SINCRONIZAÇÃO NA NUVEM */}
      <Card className="rounded-2xl border-border bg-card shadow-subtle overflow-hidden">
        <CardContent className="p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Cloud className="w-3.5 h-3.5 text-[#F59E4C]" /> Conta & Sincronização
            </span>
            {user && (
              <span
                className={cn(
                  'text-[10px] px-2 py-0.5 rounded-full font-bold',
                  user.verified
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    : 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
                )}
              >
                {user.verified ? 'Verificado' : 'Aguardando confirmação'}
              </span>
            )}
          </div>

          {user ? (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-background border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <UserIcon className="w-3.5 h-3.5 text-muted-foreground" />
                    {user.name || 'Usuário Rotina'}
                  </div>
                  <div className="text-xs text-muted-foreground">{user.email}</div>
                </div>

                <div className="text-left sm:text-right">
                  <div className="text-[11px] text-muted-foreground">
                    {syncMeta.status === 'syncing' ? (
                      <span className="text-[#F59E4C] flex items-center gap-1">
                        <RefreshCw className="w-3 h-3 animate-spin" /> Sincronizando...
                      </span>
                    ) : syncMeta.status === 'offline' ? (
                      <span className="text-muted-foreground flex items-center gap-1">
                        <CloudOff className="w-3 h-3" /> Offline: alterações salvas no aparelho
                      </span>
                    ) : syncMeta.lastSyncedAt ? (
                      `Sincronizado às ${new Date(syncMeta.lastSyncedAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}`
                    ) : (
                      'Aguardando sincronização'
                    )}
                  </div>
                  {syncMeta.lastError && (
                    <div className="text-[10px] text-red-500 mt-0.5 max-w-[220px] truncate">
                      {syncMeta.lastError}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Button
                  onClick={async () => {
                    setSyncingManual(true)
                    await triggerSync()
                    setSyncingManual(false)
                    toast({ title: 'Sincronização', description: 'Processo concluído.' })
                  }}
                  disabled={syncingManual || syncMeta.status === 'syncing'}
                  className="h-11 rounded-xl text-xs font-semibold bg-[#F59E4C] hover:bg-[#F59E4C]/90 text-white"
                >
                  <RefreshCw
                    className={cn(
                      'w-4 h-4 mr-1.5',
                      (syncingManual || syncMeta.status === 'syncing') && 'animate-spin',
                    )}
                  />
                  Sincronizar agora
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setSignOutDialogOpen(true)}
                  className="h-11 rounded-xl text-xs font-semibold border-border"
                >
                  <LogOut className="w-4 h-4 mr-1.5" />
                  Sair da conta
                </Button>
              </div>

              <div className="pt-1 flex items-center justify-between text-xs border-t border-border/60">
                <button
                  type="button"
                  onClick={() => {
                    setAuthModalMode('forgot')
                    setAuthModalOpen(true)
                  }}
                  className="text-muted-foreground hover:text-foreground text-[11px] underline"
                >
                  Alterar senha
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteConfirmText('')
                    setDeleteDialogOpen(true)
                  }}
                  className="text-red-500 hover:text-red-600 text-[11px] font-semibold"
                >
                  Excluir minha conta
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Você está no <strong>modo sem conta</strong> (dados salvos apenas neste aparelho).
                Crie ou entre na sua conta para sincronizar entre seus aparelhos.
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  onClick={() => {
                    setAuthModalMode('signin')
                    setAuthModalOpen(true)
                  }}
                  className="h-11 flex-1 rounded-xl text-xs font-semibold bg-[#F59E4C] hover:bg-[#F59E4C]/90 text-white"
                >
                  Entrar na conta
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setAuthModalMode('signup')
                    setAuthModalOpen(true)
                  }}
                  className="h-11 flex-1 rounded-xl text-xs font-semibold border-border"
                >
                  Criar conta (convidados)
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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

      {/* 3. SEÇÃO BACKUP E ARMAZENAMENTO */}
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

          {/* Status de Persistência e Cota de Armazenamento */}
          <div className="p-3 rounded-xl bg-background border border-border space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1.5">
                {isPersisted ? (
                  <ShieldCheck className="w-4 h-4 text-[#3D9C73]" />
                ) : (
                  <ShieldAlert className="w-4 h-4 text-amber-500" />
                )}
                Armazenamento protegido:
              </span>
              <span
                className={cn(
                  'font-bold px-2 py-0.5 rounded-full text-[11px]',
                  isPersisted ? 'bg-[#3D9C73]/15 text-[#3D9C73]' : 'bg-muted text-muted-foreground',
                )}
              >
                {isPersisted === null ? 'Verificando...' : isPersisted ? 'Sim' : 'Não'}
              </span>
            </div>

            {storageEstimate && (
              <div className="space-y-1 pt-1 border-t border-border/60">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-[#F59E4C]" />
                    Espaço usado pelo app:
                  </span>
                  <span className="font-semibold text-foreground text-xs">
                    {storageEstimate.usageMb} MB / {storageEstimate.quotaMb} MB (
                    {storageEstimate.percent}%)
                  </span>
                </div>

                {/* Alerta se uso passar de 80% da cota */}
                {storageEstimate.percent > 80 && (
                  <div className="mt-2 p-2 rounded-lg bg-destructive/10 border border-destructive/30 flex items-start gap-2 text-destructive text-xs">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      Atenção: o app está usando mais de 80% do espaço disponível. Exporte um backup
                      e libere espaço para evitar falhas de gravação.
                    </span>
                  </div>
                )}
              </div>
            )}
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
              onClick={() => handleExportData(false)}
              className="min-h-[44px] h-11 rounded-xl text-xs font-semibold justify-start border-border gap-2"
            >
              <Download className="w-4 h-4 text-[#F59E4C]" /> Exportar completo (JSON)
            </Button>
            <Button
              variant="outline"
              onClick={() => handleExportData(true)}
              className="min-h-[44px] h-11 rounded-xl text-xs font-semibold justify-start border-border gap-2"
            >
              <FileDown className="w-4 h-4 text-[#7C8CFF]" /> Exportar sem anexos
            </Button>
          </div>

          <div className="pt-1">
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="w-full min-h-[44px] h-11 rounded-xl text-xs font-semibold justify-start border-border gap-2"
            >
              <Upload className="w-4 h-4 text-[#34BEAA]" />{' '}
              {importing ? 'Processando arquivo...' : 'Importar dados (Restaurar backup)'}
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
      <div className="text-center text-xs text-muted-foreground space-y-1.5 pt-2">
        <p className="font-semibold text-foreground">
          Rotina v{APP_VERSION} • Mobile-first SPA Local-first
        </p>
        <p>Armazenamento local no aparelho com sincronização na nuvem.</p>
        <div className="space-x-2 text-[11px]">
          <a href="/termos" target="_blank" className="hover:underline">
            Termos de Uso
          </a>
          <span>•</span>
          <a href="/privacidade" target="_blank" className="hover:underline">
            Privacidade
          </a>
        </div>
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

      {/* MODAL DE CONFIRMAÇÃO DE IMPORTAÇÃO SEGURA */}
      <AlertDialog open={importConfirmOpen} onOpenChange={setImportConfirmOpen}>
        <AlertDialogContent className="rounded-2xl bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base sm:text-lg flex items-center gap-2 text-foreground">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
              Substituir dados atuais?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground space-y-3 pt-1 text-left">
              <span className="block font-medium text-foreground">
                Isso substitui todos os dados atuais deste dispositivo pelos dados do arquivo.
              </span>

              {/* Aviso se o backup não contém anexos */}
              {pendingValidation && !pendingValidation.hasAttachments && (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs">
                  ⚠️ <strong>Atenção:</strong> este arquivo de backup não contém anexos (fotos de
                  capa ou certificados). Anexos atuais não serão restaurados se substituídos.
                </div>
              )}

              {/* Tabela resumo comparativo */}
              {pendingValidation && (
                <div className="border border-border rounded-xl overflow-hidden bg-background">
                  <div className="px-3 py-2 bg-muted/50 border-b border-border flex justify-between font-bold text-[11px] text-foreground">
                    <span>Coleção</span>
                    <span className="flex gap-6">
                      <span className="w-14 text-right">Atual</span>
                      <span className="w-14 text-right text-[#34BEAA]">Backup</span>
                    </span>
                  </div>
                  <div className="divide-y divide-border/60 text-[11px] max-h-48 overflow-y-auto">
                    {[
                      { key: 'escrita_notes', label: 'Escrita / Diário' },
                      { key: 'livros', label: 'Livros' },
                      { key: 'livro_anotacoes', label: 'Anotações de Leitura' },
                      { key: 'leitura_historico', label: 'Histórico de Leitura' },
                      { key: 'treino_plano_semanal', label: 'Planos de Treino' },
                      { key: 'treino_log', label: 'Logs de Treino' },
                      { key: 'courses', label: 'Cursos e Matérias' },
                      { key: 'study_pages', label: 'Páginas de Estudo' },
                      { key: 'study_certificates', label: 'Certificados' },
                      { key: 'study_sessions', label: 'Sessões de Estudo' },
                      { key: 'projects', label: 'Projetos (Trabalho)' },
                      { key: 'achievements', label: 'Conquistas' },
                      { key: 'experiences', label: 'Experiências' },
                      { key: 'work_notes', label: 'Notas de Trabalho' },
                    ].map((col) => {
                      const cur = currentCounts[col.key] || 0
                      const backupCol =
                        (pendingValidation.validPayload.collections as any)[col.key] || []
                      const bkp = backupCol.length
                      return (
                        <div
                          key={col.key}
                          className="px-3 py-1.5 flex justify-between items-center"
                        >
                          <span className="text-muted-foreground">{col.label}</span>
                          <span className="flex gap-6 font-semibold">
                            <span className="w-14 text-right text-foreground">{cur}</span>
                            <span className="w-14 text-right text-[#34BEAA]">{bkp}</span>
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Botão de segurança */}
              <div className="pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDownloadSafetyCopy}
                  className="w-full h-9 rounded-xl text-xs font-semibold border-border gap-2 text-foreground"
                >
                  <Download className="w-3.5 h-3.5 text-[#F59E4C]" /> Baixar cópia atual primeiro
                </Button>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
            <AlertDialogCancel
              disabled={importing}
              onClick={() => {
                setImportConfirmOpen(false)
                setPendingImportPayload(null)
                setPendingValidation(null)
              }}
              className="rounded-xl text-xs"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={importing}
              onClick={handleConfirmImport}
              className="rounded-xl text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold"
            >
              {importing ? 'Substituindo...' : 'Substituir dados'}
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

      {/* MODAL DE AUTENTICAÇÃO */}
      {authModalOpen && (
        <AuthModal
          initialMode={authModalMode}
          onClose={() => setAuthModalOpen(false)}
          onSuccess={() => setAuthModalOpen(false)}
        />
      )}

      {/* DIÁLOGO DE SAIR DA CONTA */}
      <AlertDialog open={signOutDialogOpen} onOpenChange={setSignOutDialogOpen}>
        <AlertDialogContent className="rounded-2xl bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Sair da sua conta?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground space-y-3">
              <span>Você pode continuar usando o app sem conta neste aparelho.</span>
              <div className="flex items-start gap-2 pt-2 text-foreground">
                <input
                  type="checkbox"
                  id="keep-local-signout"
                  checked={signOutKeepLocal}
                  onChange={(e) => setSignOutKeepLocal(e.target.checked)}
                  className="mt-0.5 accent-[#F59E4C]"
                />
                <label htmlFor="keep-local-signout" className="text-xs cursor-pointer">
                  Manter meus dados salvos neste aparelho (padrão)
                </label>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl text-xs">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                await signOut({ keepLocalData: signOutKeepLocal })
                setSignOutDialogOpen(false)
                toast({ title: 'Sessão encerrada', description: 'Você saiu da sua conta.' })
              }}
              className="rounded-xl text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold"
            >
              Sair
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* DIÁLOGO DE EXCLUIR CONTA */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-2xl bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Excluir minha conta
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground space-y-3">
              <span>
                Esta ação é irreversível. Todos os seus registros e arquivos na nuvem serão
                excluídos permanentemente.
              </span>
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-semibold text-foreground block">
                  Digite <strong>EXCLUIR</strong> para confirmar:
                </label>
                <Input
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="EXCLUIR"
                  className="h-10 text-xs rounded-xl font-mono uppercase"
                />
              </div>
              <div className="flex items-start gap-2 pt-1 text-foreground">
                <input
                  type="checkbox"
                  id="keep-local-delete"
                  checked={deleteKeepLocal}
                  onChange={(e) => setDeleteKeepLocal(e.target.checked)}
                  className="mt-0.5 accent-[#F59E4C]"
                />
                <label htmlFor="keep-local-delete" className="text-xs cursor-pointer">
                  Manter cópia local dos dados neste aparelho (como usuário sem conta)
                </label>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl text-xs">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteConfirmText !== 'EXCLUIR' || deletingAccount}
              onClick={async () => {
                setDeletingAccount(true)
                try {
                  if (user?.id) {
                    await pb.collection('users').delete(user.id)
                  }
                  await signOut({ keepLocalData: deleteKeepLocal })
                  if (!deleteKeepLocal) {
                    await handleClearAll()
                  }
                  setDeleteDialogOpen(false)
                  toast({
                    title: 'Conta excluída',
                    description: 'Sua conta e registros na nuvem foram removidos.',
                  })
                } catch (err: any) {
                  toast({
                    title: 'Falha ao excluir conta',
                    description: err?.message || 'Erro ao remover conta.',
                    variant: 'destructive',
                  })
                } finally {
                  setDeletingAccount(false)
                }
              }}
              className="rounded-xl text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold"
            >
              {deletingAccount ? 'Excluindo...' : 'Excluir definitivamente'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
