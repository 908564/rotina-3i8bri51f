import { AppSettings } from '../types'

const SETTINGS_KEY = 'rotina_settings'

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
  userName: '',
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
      }
    } catch {
      return { ...defaultSettings }
    }
  },

  saveSettings(settings: AppSettings): void {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
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
