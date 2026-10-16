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
  Course,
  StudyPage,
  StudyCertificate,
  StudySession,
  StudyGoal,
  Project,
  Achievement,
  Experience,
  WorkNote,
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
    const courses = await idb.getAll<Course>(idb.STORE_COURSES)
    const study_pages = await idb.getAll<StudyPage>(idb.STORE_STUDY_PAGES)
    const study_certificates = await idb.getAll<StudyCertificate>(idb.STORE_STUDY_CERTIFICATES)
    const study_sessions = await idb.getAll<StudySession>(idb.STORE_STUDY_SESSIONS)
    const study_goals = await idb.getAll<StudyGoal>(idb.STORE_STUDY_GOALS)
    const projects = await idb.getAll<Project>(idb.STORE_PROJECTS)
    const achievements = await idb.getAll<Achievement>(idb.STORE_ACHIEVEMENTS)
    const experiences = await idb.getAll<Experience>(idb.STORE_EXPERIENCES)
    const work_notes = await idb.getAll<WorkNote>(idb.STORE_WORK_NOTES)

    return {
      schemaVersion: 4,
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
        courses,
        study_pages,
        study_certificates,
        study_sessions,
        study_goals,
        projects,
        achievements,
        experiences,
        work_notes,
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
      await idb.clear(idb.STORE_COURSES)
      await idb.clear(idb.STORE_STUDY_PAGES)
      await idb.clear(idb.STORE_STUDY_CERTIFICATES)
      await idb.clear(idb.STORE_STUDY_SESSIONS)
      await idb.clear(idb.STORE_STUDY_GOALS)
      await idb.clear(idb.STORE_PROJECTS)
      await idb.clear(idb.STORE_ACHIEVEMENTS)
      await idb.clear(idb.STORE_EXPERIENCES)
      await idb.clear(idb.STORE_WORK_NOTES)

      // Grava dados das coleções migrando livros antigos (schemaVersion 1 -> 2 -> 3 -> 4)
      for (const item of valid.collections.escrita_notes) {
        await idb.put(idb.STORE_ESCRITA, item)
      }
      for (const item of valid.collections.livros) {
        // Preserva ou normaliza campos de meta
        const migratedLivro: Livro = {
          ...item,
          goal: item.goal || undefined,
          goalHistory: Array.isArray(item.goalHistory) ? item.goalHistory : [],
        }
        await idb.put(idb.STORE_LIVROS, migratedLivro)
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

      // Restaura coleções de estudos se presentes (v3) ou arrays vazios se v1/v2
      if (Array.isArray(valid.collections.courses)) {
        for (const item of valid.collections.courses) {
          await idb.put(idb.STORE_COURSES, item)
        }
      }
      if (Array.isArray(valid.collections.study_pages)) {
        for (const item of valid.collections.study_pages) {
          await idb.put(idb.STORE_STUDY_PAGES, item)
        }
      }
      if (Array.isArray(valid.collections.study_certificates)) {
        for (const item of valid.collections.study_certificates) {
          await idb.put(idb.STORE_STUDY_CERTIFICATES, item)
        }
      }
      if (Array.isArray(valid.collections.study_sessions)) {
        for (const item of valid.collections.study_sessions) {
          await idb.put(idb.STORE_STUDY_SESSIONS, item)
        }
      }
      if (Array.isArray(valid.collections.study_goals)) {
        for (const item of valid.collections.study_goals) {
          await idb.put(idb.STORE_STUDY_GOALS, item)
        }
      }

      // Restaura coleções de trabalho se presentes (v4) ou ignora compatível com v1/v2/v3
      if (Array.isArray(valid.collections.projects)) {
        for (const item of valid.collections.projects) {
          await idb.put(idb.STORE_PROJECTS, item)
        }
      }
      if (Array.isArray(valid.collections.achievements)) {
        for (const item of valid.collections.achievements) {
          await idb.put(idb.STORE_ACHIEVEMENTS, item)
        }
      }
      if (Array.isArray(valid.collections.experiences)) {
        for (const item of valid.collections.experiences) {
          await idb.put(idb.STORE_EXPERIENCES, item)
        }
      }
      if (Array.isArray(valid.collections.work_notes)) {
        for (const item of valid.collections.work_notes) {
          await idb.put(idb.STORE_WORK_NOTES, item)
        }
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
        await idb.clear(idb.STORE_COURSES)
        await idb.clear(idb.STORE_STUDY_PAGES)
        await idb.clear(idb.STORE_STUDY_CERTIFICATES)
        await idb.clear(idb.STORE_STUDY_SESSIONS)
        await idb.clear(idb.STORE_STUDY_GOALS)
        await idb.clear(idb.STORE_PROJECTS)
        await idb.clear(idb.STORE_ACHIEVEMENTS)
        await idb.clear(idb.STORE_EXPERIENCES)
        await idb.clear(idb.STORE_WORK_NOTES)

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
        if (previousSnapshot.collections.courses) {
          for (const item of previousSnapshot.collections.courses)
            await idb.put(idb.STORE_COURSES, item)
        }
        if (previousSnapshot.collections.study_pages) {
          for (const item of previousSnapshot.collections.study_pages)
            await idb.put(idb.STORE_STUDY_PAGES, item)
        }
        if (previousSnapshot.collections.study_certificates) {
          for (const item of previousSnapshot.collections.study_certificates)
            await idb.put(idb.STORE_STUDY_CERTIFICATES, item)
        }
        if (previousSnapshot.collections.study_sessions) {
          for (const item of previousSnapshot.collections.study_sessions)
            await idb.put(idb.STORE_STUDY_SESSIONS, item)
        }
        if (previousSnapshot.collections.study_goals) {
          for (const item of previousSnapshot.collections.study_goals)
            await idb.put(idb.STORE_STUDY_GOALS, item)
        }
        if (previousSnapshot.collections.projects) {
          for (const item of previousSnapshot.collections.projects)
            await idb.put(idb.STORE_PROJECTS, item)
        }
        if (previousSnapshot.collections.achievements) {
          for (const item of previousSnapshot.collections.achievements)
            await idb.put(idb.STORE_ACHIEVEMENTS, item)
        }
        if (previousSnapshot.collections.experiences) {
          for (const item of previousSnapshot.collections.experiences)
            await idb.put(idb.STORE_EXPERIENCES, item)
        }
        if (previousSnapshot.collections.work_notes) {
          for (const item of previousSnapshot.collections.work_notes)
            await idb.put(idb.STORE_WORK_NOTES, item)
        }
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
    await idb.clear(idb.STORE_COURSES)
    await idb.clear(idb.STORE_STUDY_PAGES)
    await idb.clear(idb.STORE_STUDY_CERTIFICATES)
    await idb.clear(idb.STORE_STUDY_SESSIONS)
    await idb.clear(idb.STORE_STUDY_GOALS)
    await idb.clear(idb.STORE_PROJECTS)
    await idb.clear(idb.STORE_ACHIEVEMENTS)
    await idb.clear(idb.STORE_EXPERIENCES)
    await idb.clear(idb.STORE_WORK_NOTES)

    // Reseta configurações básicas preservando tema
    const current = settingsRepository.getSettings()
    settingsRepository.saveSettings({
      ...current,
      hasSeenOnboarding: true,
    })
  },
}
