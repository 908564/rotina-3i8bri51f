import React, { useState, useEffect } from 'react'
import {
  ChevronLeft,
  Bell,
  Sparkles,
  Clock,
  BookOpen,
  Dumbbell,
  PenLine,
  ListTodo,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { settingsRepository } from '@/lib/repositories/settingsRepository'
import { ReminderSettings } from '@/lib/types'
import { toast } from '@/hooks/use-toast'

interface LembretesCelebracoesViewProps {
  onBack: () => void
}

export function LembretesCelebracoesView({ onBack }: LembretesCelebracoesViewProps) {
  const [settings, setSettings] = useState<ReminderSettings>({
    enabled: true,
    celebrationsEnabled: true,
    leitura: { enabled: true, time: '20:00' },
    treino: { enabled: true, time: '18:00', relativeToSession: true },
    escrita: { enabled: true, time: '21:00' },
    tasks: true,
  })

  useEffect(() => {
    const s = settingsRepository.getSettings()
    if (s.reminders) {
      setSettings(s.reminders)
    }
  }, [])

  const saveReminders = async (newReminders: ReminderSettings) => {
    setSettings(newReminders)
    await settingsRepository.updateSettings({ reminders: newReminders })
  }

  const handleToggleGeneral = async (enabled: boolean) => {
    if (enabled && typeof Notification !== 'undefined' && Notification.permission === 'default') {
      try {
        await Notification.requestPermission()
      } catch {
        /* intentionally ignored */
      }
    }
    await saveReminders({ ...settings, enabled })
  }

  const handleToggleCelebrations = async (celebrationsEnabled: boolean) => {
    await saveReminders({ ...settings, celebrationsEnabled })
    toast({
      title: celebrationsEnabled ? 'Celebrações ativadas' : 'Celebrações desativadas',
      description: celebrationsEnabled
        ? 'Você verá a animação ao cumprir suas metas diárias.'
        : 'As celebrações visuais foram silenciadas.',
    })
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* BARRA SUPERIOR */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="text-xs h-9 px-2 rounded-xl text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
        </Button>
      </div>

      {/* HEADER */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#E8883A]/15 text-[#E8883A] flex items-center justify-center">
            <Bell className="w-4 h-4" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Lembretes e Celebrações
          </h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Ajuste horários de lembretes suaves e o comportamento de celebrações diárias.
        </p>
      </div>

      {/* AVISO LEGAL DISCRETO */}
      <div className="p-3.5 rounded-2xl bg-muted/40 border border-border flex items-start gap-2.5 text-xs text-muted-foreground">
        <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          Pode não chegar com o app fechado. Os lembretes são enviados localmente e exibidos em
          banner ao abrir o app se a meta ainda estiver pendente.
        </p>
      </div>

      {/* INTERRUPTOR GERAL */}
      <div className="p-4 rounded-2xl bg-card border border-border shadow-subtle flex items-center justify-between">
        <div>
          <h4 className="text-sm font-bold text-foreground">Lembretes diários</h4>
          <p className="text-xs text-muted-foreground">
            Ativar ou desativar todos os lembretes do aplicativo
          </p>
        </div>
        <Switch checked={settings.enabled} onCheckedChange={handleToggleGeneral} />
      </div>

      {/* CELEBRAÇÕES */}
      <div className="p-4 rounded-2xl bg-card border border-border shadow-subtle flex items-center justify-between">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-[#E8883A]" />
            <h4 className="text-sm font-bold text-foreground">Animação de Celebração</h4>
          </div>
          <p className="text-xs text-muted-foreground">
            Exibir a folha de conquista e chama ao bater a meta do dia
          </p>
        </div>
        <Switch checked={settings.celebrationsEnabled} onCheckedChange={handleToggleCelebrations} />
      </div>

      {/* CONFIGURAÇÃO POR MÓDULO */}
      <div className="space-y-3">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
          Lembretes por Módulo
        </span>

        {/* Leitura */}
        <div className="p-4 rounded-2xl bg-card border border-border shadow-subtle space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#34BEAA]/15 text-[#34BEAA] flex items-center justify-center">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">Leitura</h4>
                <p className="text-xs text-muted-foreground">Horário padrão: 20:00</p>
              </div>
            </div>
            <Switch
              disabled={!settings.enabled}
              checked={settings.leitura.enabled}
              onCheckedChange={(val) =>
                saveReminders({
                  ...settings,
                  leitura: { ...settings.leitura, enabled: val },
                })
              }
            />
          </div>

          {settings.leitura.enabled && (
            <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs">
              <span className="text-muted-foreground font-medium flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Horário do lembrete:
              </span>
              <Input
                type="time"
                value={settings.leitura.time}
                onChange={(e) =>
                  saveReminders({
                    ...settings,
                    leitura: { ...settings.leitura, time: e.target.value },
                  })
                }
                className="w-28 h-9 text-xs rounded-xl"
              />
            </div>
          )}
        </div>

        {/* Treino */}
        <div className="p-4 rounded-2xl bg-card border border-border shadow-subtle space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#E07A68]/15 text-[#E07A68] flex items-center justify-center">
                <Dumbbell className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">Treino</h4>
                <p className="text-xs text-muted-foreground">1 hora antes da sessão ou 18:00</p>
              </div>
            </div>
            <Switch
              disabled={!settings.enabled}
              checked={settings.treino.enabled}
              onCheckedChange={(val) =>
                saveReminders({
                  ...settings,
                  treino: { ...settings.treino, enabled: val },
                })
              }
            />
          </div>

          {settings.treino.enabled && (
            <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs">
              <span className="text-muted-foreground font-medium flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Horário padrão:
              </span>
              <Input
                type="time"
                value={settings.treino.time}
                onChange={(e) =>
                  saveReminders({
                    ...settings,
                    treino: { ...settings.treino, time: e.target.value },
                  })
                }
                className="w-28 h-9 text-xs rounded-xl"
              />
            </div>
          )}
        </div>

        {/* Escrita */}
        <div className="p-4 rounded-2xl bg-card border border-border shadow-subtle space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#7B83E6]/15 text-[#7B83E6] flex items-center justify-center">
                <PenLine className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">Escrita</h4>
                <p className="text-xs text-muted-foreground">Horário padrão: 21:00</p>
              </div>
            </div>
            <Switch
              disabled={!settings.enabled}
              checked={settings.escrita.enabled}
              onCheckedChange={(val) =>
                saveReminders({
                  ...settings,
                  escrita: { ...settings.escrita, enabled: val },
                })
              }
            />
          </div>

          {settings.escrita.enabled && (
            <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs">
              <span className="text-muted-foreground font-medium flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Horário do lembrete:
              </span>
              <Input
                type="time"
                value={settings.escrita.time}
                onChange={(e) =>
                  saveReminders({
                    ...settings,
                    escrita: { ...settings.escrita, time: e.target.value },
                  })
                }
                className="w-28 h-9 text-xs rounded-xl"
              />
            </div>
          )}
        </div>

        {/* Lembretes de Tarefas */}
        <div className="p-4 rounded-2xl bg-card border border-border shadow-subtle flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-muted text-muted-foreground flex items-center justify-center">
              <ListTodo className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-foreground">Tarefas com Horário</h4>
              <p className="text-xs text-muted-foreground">
                Lembrar tarefas que têm horário agendado
              </p>
            </div>
          </div>
          <Switch
            disabled={!settings.enabled}
            checked={settings.tasks}
            onCheckedChange={(val) => saveReminders({ ...settings, tasks: val })}
          />
        </div>
      </div>
    </div>
  )
}
