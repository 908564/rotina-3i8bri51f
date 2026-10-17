import { AppSettings } from '../types'

const SETTINGS_KEY = 'rotina_settings'

export const defaultReminderSettings = {
  enabled: true,
  celebrationsEnabled: true,
  leitura: { enabled: true, time: '20:00' },
  treino: { enabled: true, time: '18:00', relativeToSession: true },
  escrita: { enabled: true, time: '21:00' },
  tasks: true,
}

export const defaultSettings: AppSettings = {
  theme: 'sistema',
  activeModules: {
    escrita: true,
    leitura: true,
    treino: true,
    estudos: true,
    trabalho: true,
  },
  hasSeenOnboarding: false,
  firstTimeWelcomeDismissed: false,
  userName: '',
  reminders: defaultReminderSettings,
}

export const settingsRepository = {
  getSettings(): AppSettings {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY)
      if (!raw) return { ...defaultSettings }
      const parsed = JSON.parse(raw)
      return {
        ...defaultSettings,
        ...parsed,
        activeModules: {
          ...defaultSettings.activeModules,
          ...(parsed.activeModules || {}),
        },
        reminders: {
          ...defaultReminderSettings,
          ...(parsed.reminders || {}),
          leitura: {
            ...defaultReminderSettings.leitura,
            ...(parsed.reminders?.leitura || {}),
          },
          treino: {
            ...defaultReminderSettings.treino,
            ...(parsed.reminders?.treino || {}),
          },
          escrita: {
            ...defaultReminderSettings.escrita,
            ...(parsed.reminders?.escrita || {}),
          },
        },
      }
    } catch {
      return { ...defaultSettings }
    }
  },

  saveSettings(settings: AppSettings): void {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    // Enfileira settings no outbox
    import('../sync/outboxHelper').then(({ recordOutboxStandalone }) => {
      recordOutboxStandalone('settings', 'app_settings', 'upsert', settings).catch(() => {})
    })
  },

  updateSettings(partial: Partial<AppSettings>): AppSettings {
    const current = this.getSettings()
    const updated = {
      ...current,
      ...partial,
      activeModules: {
        ...current.activeModules,
        ...(partial.activeModules || {}),
      },
    }
    this.saveSettings(updated)
    return updated
  },
}
