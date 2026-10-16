import { idb } from '../indexedDb'
import { settingsRepository } from './settingsRepository'
import {
  ExportDataPayload,
  EscritaNote,
  Livro,
  LivroAnotacao,
  LeituraHistorico,
  TreinoPlanoSemanal,
  TreinoLog,
} from '../types'

export const backupRepository = {
  async exportAll(): Promise<ExportDataPayload> {
    const settings = settingsRepository.getSettings()
    const escrita_notes = await idb.getAll<EscritaNote>(idb.STORE_ESCRITA)
    const livros = await idb.getAll<Livro>(idb.STORE_LIVROS)
    const livro_anotacoes = await idb.getAll<LivroAnotacao>(idb.STORE_LIVRO_ANOTACOES)
    const leitura_historico = await idb.getAll<LeituraHistorico>(idb.STORE_LEITURA_HISTORICO)
    const treino_plano_semanal = await idb.getAll<TreinoPlanoSemanal>(idb.STORE_TREINO_PLANO)
    const treino_log = await idb.getAll<TreinoLog>(idb.STORE_TREINO_LOG)

    return {
      schemaVersion: 1,
      appName: 'Rotina',
      exportedAt: new Date().toISOString(),
      settings,
      collections: {
        escrita_notes,
        livros,
        livro_anotacoes,
        leitura_historico,
        treino_plano_semanal,
        treino_log,
      },
    }
  },

  async validatePayload(payload: unknown): Promise<ExportDataPayload> {
    if (!payload || typeof payload !== 'object') {
      throw new Error('Formato de arquivo inválido.')
    }

    const p = payload as Partial<ExportDataPayload>
    if (!p.collections || typeof p.collections !== 'object') {
      throw new Error('Estrutura de dados corrompida: coleções ausentes.')
    }

    const cols = p.collections
    if (
      !Array.isArray(cols.escrita_notes) ||
      !Array.isArray(cols.livros) ||
      !Array.isArray(cols.livro_anotacoes) ||
      !Array.isArray(cols.leitura_historico) ||
      !Array.isArray(cols.treino_plano_semanal) ||
      !Array.isArray(cols.treino_log)
    ) {
      throw new Error('Estrutura de coleções incompleta ou corrompida.')
    }

    return payload as ExportDataPayload
  },

  async importAll(payload: unknown): Promise<void> {
    const valid = await this.validatePayload(payload)

    // Snapshot atual para rollback caso alguma gravação falhe
    const previousSnapshot = await this.exportAll()

    try {
      // Limpa todas as stores
      await idb.clear(idb.STORE_ESCRITA)
      await idb.clear(idb.STORE_LIVROS)
      await idb.clear(idb.STORE_LIVRO_ANOTACOES)
      await idb.clear(idb.STORE_LEITURA_HISTORICO)
      await idb.clear(idb.STORE_TREINO_PLANO)
      await idb.clear(idb.STORE_TREINO_LOG)

      // Grava dados das coleções
      for (const item of valid.collections.escrita_notes) {
        await idb.put(idb.STORE_ESCRITA, item)
      }
      for (const item of valid.collections.livros) {
        await idb.put(idb.STORE_LIVROS, item)
      }
      for (const item of valid.collections.livro_anotacoes) {
        await idb.put(idb.STORE_LIVRO_ANOTACOES, item)
      }
      for (const item of valid.collections.leitura_historico) {
        await idb.put(idb.STORE_LEITURA_HISTORICO, item)
      }
      for (const item of valid.collections.treino_plano_semanal) {
        await idb.put(idb.STORE_TREINO_PLANO, item)
      }
      for (const item of valid.collections.treino_log) {
        await idb.put(idb.STORE_TREINO_LOG, item)
      }

      // Restaura configurações se existirem
      if (valid.settings) {
        settingsRepository.saveSettings(valid.settings)
      }
    } catch (err) {
      // Rollback completo
      try {
        await idb.clear(idb.STORE_ESCRITA)
        await idb.clear(idb.STORE_LIVROS)
        await idb.clear(idb.STORE_LIVRO_ANOTACOES)
        await idb.clear(idb.STORE_LEITURA_HISTORICO)
        await idb.clear(idb.STORE_TREINO_PLANO)
        await idb.clear(idb.STORE_TREINO_LOG)

        for (const item of previousSnapshot.collections.escrita_notes)
          await idb.put(idb.STORE_ESCRITA, item)
        for (const item of previousSnapshot.collections.livros)
          await idb.put(idb.STORE_LIVROS, item)
        for (const item of previousSnapshot.collections.livro_anotacoes)
          await idb.put(idb.STORE_LIVRO_ANOTACOES, item)
        for (const item of previousSnapshot.collections.leitura_historico)
          await idb.put(idb.STORE_LEITURA_HISTORICO, item)
        for (const item of previousSnapshot.collections.treino_plano_semanal)
          await idb.put(idb.STORE_TREINO_PLANO, item)
        for (const item of previousSnapshot.collections.treino_log)
          await idb.put(idb.STORE_TREINO_LOG, item)
        settingsRepository.saveSettings(previousSnapshot.settings)
      } catch {
        // Rollback secundário falhou
      }
      throw err
    }
  },

  async clearAll(): Promise<void> {
    await idb.clear(idb.STORE_ESCRITA)
    await idb.clear(idb.STORE_LIVROS)
    await idb.clear(idb.STORE_LIVRO_ANOTACOES)
    await idb.clear(idb.STORE_LEITURA_HISTORICO)
    await idb.clear(idb.STORE_TREINO_PLANO)
    await idb.clear(idb.STORE_TREINO_LOG)

    // Reseta configurações básicas preservando tema
    const current = settingsRepository.getSettings()
    settingsRepository.saveSettings({
      ...current,
      hasSeenOnboarding: true,
    })
  },
}
