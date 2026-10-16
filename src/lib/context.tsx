import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { AppSettings, ModuleKey } from './types'
import { settingsRepository } from './repositories/settingsRepository'
import { loadSampleData } from './repositories/sampleData'
import { backupRepository } from './repositories/backupRepository'

interface AppContextValue {
  settings: AppSettings
  updateSettings: (partial: Partial<AppSettings>) => void
  toggleModule: (module: ModuleKey, active: boolean) => void
  setTheme: (theme: AppSettings['theme']) => void
  loadSamples: () => Promise<void>
  clearAllData: () => Promise<void>
  dataVersion: number
  notifyDataChanged: () => void
}

const AppContext = createContext<AppContextValue | null>(null)

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(() => settingsRepository.getSettings())
  const [dataVersion, setDataVersion] = useState(0)

  const notifyDataChanged = useCallback(() => {
    setDataVersion((v) => v + 1)
  }, [])

  // Atualiza classe HTML para dark mode baseado no tema
  useEffect(() => {
    const root = document.documentElement
    const applyTheme = (isDark: boolean) => {
      if (isDark) {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
    }

    if (settings.theme === 'escuro') {
      applyTheme(true)
    } else if (settings.theme === 'claro') {
      applyTheme(false)
    } else {
      // Sistema
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      applyTheme(mediaQuery.matches)

      const handler = (e: MediaQueryListEvent) => applyTheme(e.matches)
      mediaQuery.addEventListener('change', handler)
      return () => mediaQuery.removeEventListener('change', handler)
    }
  }, [settings.theme])

  const updateSettings = useCallback((partial: Partial<AppSettings>) => {
    const updated = settingsRepository.updateSettings(partial)
    setSettings(updated)
  }, [])

  const toggleModule = useCallback((module: ModuleKey, active: boolean) => {
    setSettings((prev) => {
      const nextModules = { ...prev.activeModules, [module]: active }
      const updated = settingsRepository.updateSettings({ activeModules: nextModules })
      return updated
    })
  }, [])

  const setTheme = useCallback(
    (theme: AppSettings['theme']) => {
      updateSettings({ theme })
    },
    [updateSettings],
  )

  const loadSamples = useCallback(async () => {
    await loadSampleData()
    const updated = settingsRepository.getSettings()
    setSettings(updated)
    notifyDataChanged()
  }, [notifyDataChanged])

  const clearAllData = useCallback(async () => {
    await backupRepository.clearAll()
    const updated = settingsRepository.getSettings()
    setSettings(updated)
    notifyDataChanged()
  }, [notifyDataChanged])

  return (
    <AppContext.Provider
      value={{
        settings,
        updateSettings,
        toggleModule,
        setTheme,
        loadSamples,
        clearAllData,
        dataVersion,
        notifyDataChanged,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return ctx
}
