import { describe, it, expect, beforeEach } from 'vitest'
import { idb } from '../lib/indexedDb'
import { treinoRepository } from '../lib/repositories/treinoRepository'
import { moduleDaysRepository } from '../lib/repositories/moduleDaysRepository'
import { hojeRepository } from '../lib/repositories/hojeRepository'
import { settingsRepository } from '../lib/repositories/settingsRepository'
import { calculatePace, calculateSpeed, isCardioSessionDone } from '../lib/cardioCalculations'
import {
  getLocalDateKey,
  getTodayDateKey,
  getLocalDayOfWeek,
  parseLocalDate,
  addDaysToDateKey,
  subDaysFromDateKey,
} from '../lib/dateUtils'
import { ActivityPlan, ActivityLog, TreinoPlanoSemanal } from '../lib/types'

describe('Treino Multimodal e Metas do Dia - Testes T-numbered', () => {
  beforeEach(async () => {
    const stores = [
      idb.STORE_TREINO_PLANO,
      idb.STORE_TREINO_LOG,
      idb.STORE_ACTIVITY_PLANS,
      idb.STORE_ACTIVITY_LOGS,
      idb.STORE_MODULE_DAYS,
      idb.STORE_DAY_SUMMARIES,
      idb.STORE_ESCRITA,
      idb.STORE_LIVROS,
      idb.STORE_LEITURA_HISTORICO,
      idb.STORE_COURSES,
      idb.STORE_STUDY_SESSIONS,
      idb.STORE_STUDY_GOALS,
    ]
    for (const s of stores) {
      try {
        await idb.clear(s)
      } catch {
        // ignora se ainda inicializando
      }
    }

    settingsRepository.saveSettings({
      theme: 'sistema',
      activeModules: {
        escrita: false,
        leitura: false,
        treino: true,
        estudos: false,
        trabalho: false,
      },
      hasSeenOnboarding: false,
      firstTimeWelcomeDismissed: false,
      userName: '',
    })
  })

  // T1: Fronteira de datas (meia-noite, virada de mês) na seleção das sessões de hoje
  it('T1: Fronteira de datas (meia-noite, virada de mês) na seleção das sessões de hoje sem erro de fuso', () => {
    // Meia-noite exata local
    const dMid = new Date(2025, 2, 31, 0, 0, 0, 0) // 31 de Março
    const keyMid = getLocalDateKey(dMid)
    expect(keyMid).toBe('2025-03-31')

    // Virada de mês: 31 de Março -> 1 de Abril
    const nextDayKey = addDaysToDateKey(keyMid, 1)
    expect(nextDayKey).toBe('2025-04-01')

    // Virada de ano: 31 de Dezembro -> 1 de Janeiro
    const dYearEnd = new Date(2025, 11, 31, 23, 59, 59, 999)
    const keyYearEnd = getLocalDateKey(dYearEnd)
    expect(keyYearEnd).toBe('2025-12-31')
    expect(addDaysToDateKey(keyYearEnd, 1)).toBe('2026-01-01')
    expect(subDaysFromDateKey('2026-01-01', 1)).toBe('2025-12-31')

    // Verificação de que getLocalDayOfWeek é consistente com o dia da semana local
    const parsedMid = parseLocalDate(keyMid)
    expect(parsedMid.getFullYear()).toBe(2025)
    expect(parsedMid.getMonth()).toBe(2)
    expect(parsedMid.getDate()).toBe(31)
  })

  // T2: Cálculo de ritmo min/km (calculatePace) com casos de borda (0 km, tempo zero, arredondamento, limites)
  it('T2: Cálculo de ritmo min/km com casos de borda (0 km, tempo zero, arredondamento)', () => {
    // Casos zero / nulo
    expect(calculatePace(0, 30)).toBeNull()
    expect(calculatePace(5, 0)).toBeNull()
    expect(calculatePace(-5, 30)).toBeNull()
    expect(calculatePace(5, -30)).toBeNull()

    // Ritmo normal: 5 km em 25 min -> 5'00"/km
    expect(calculatePace(5, 25)).toBe("5'00\"/km")

    // Ritmo com segundos: 10 km em 52 min -> 5.2 min/km -> 5'12"/km
    expect(calculatePace(10, 52)).toBe("5'12\"/km")

    // Arredondamento de segundos com zero à esquerda: 3 km em 15.1 min -> 5'02"/km
    expect(calculatePace(3, 15.1)).toBe("5'02\"/km")

    // Ritmo fora dos limites (> 120 min/km)
    expect(calculatePace(0.01, 100)).toBeNull()
  })

  // T3: Cálculo de velocidade km/h (calculateSpeed) com casos de borda (0 km, tempo zero, arredondamento, limites)
  it('T3: Cálculo de velocidade km/h com casos de borda (0 km, tempo zero, limites)', () => {
    // Casos zero / nulo
    expect(calculateSpeed(0, 60)).toBeNull()
    expect(calculateSpeed(10, 0)).toBeNull()
    expect(calculateSpeed(-10, 60)).toBeNull()
    expect(calculateSpeed(10, -60)).toBeNull()

    // Velocidade normal: 10 km em 60 min -> 10.0 km/h
    expect(calculateSpeed(10, 60)).toBe('10.0 km/h')

    // Velocidade fracionária: 12 km em 50 min -> 14.4 km/h
    expect(calculateSpeed(12, 50)).toBe('14.4 km/h')

    // Velocidade excessiva (> 150 km/h)
    expect(calculateSpeed(100, 10)).toBeNull()
  })

  // T4: isCardioSessionDone: só km, só tempo, ambos, manual, sem metas
  it('T4: isCardioSessionDone em todas as combinações (só km, só tempo, ambos, manual, sem metas)', () => {
    // 1. Sem metas configuradas
    expect(isCardioSessionDone(null, null, 5, 30, false)).toBe(false)
    expect(isCardioSessionDone(null, null, null, null, true)).toBe(true)

    // 2. Só meta de km
    expect(isCardioSessionDone(5, null, 4.9, 30, false)).toBe(false)
    expect(isCardioSessionDone(5, null, 5.0, 25, false)).toBe(true)
    expect(isCardioSessionDone(5, null, 6.2, 35, false)).toBe(true)

    // 3. Só meta de tempo
    expect(isCardioSessionDone(null, 30, 4, 29, false)).toBe(false)
    expect(isCardioSessionDone(null, 30, 4, 30, false)).toBe(true)
    expect(isCardioSessionDone(null, 30, 4, 45, false)).toBe(true)

    // 4. Ambas as metas: ambas devem ser atingidas
    expect(isCardioSessionDone(5, 30, 5.5, 28, false)).toBe(false) // km ok, tempo falta
    expect(isCardioSessionDone(5, 30, 4.8, 35, false)).toBe(false) // tempo ok, km falta
    expect(isCardioSessionDone(5, 30, 5.0, 30, false)).toBe(true) // ambos ok
    expect(isCardioSessionDone(5, 30, 7.0, 40, false)).toBe(true) // ambos superados

    // 5. Conclusão manual (manualDone === true) sempre conclui independente de metas
    expect(isCardioSessionDone(10, 60, 2, 10, true)).toBe(true)
  })

  // T5: Migração e persistência da variante calistenia / academia
  it('T5: Migração e fallback da variante academia/calistenia em planos e logs', async () => {
    // Plano sem variant definida assume 'academia' por default
    const savedPlan = await treinoRepository.savePlan({
      dayOfWeek: 1,
      workoutName: 'Treino A',
      exercises: [
        { id: 'ex1', nome: 'Barra Fixa', series: 4, repeticoes: '10', carga: 0, isBodyweight: true },
      ],
    } as any)
    expect(savedPlan.variant).toBe('academia')

    // Plano explicitamente 'calistenia'
    const calisteniaPlan = await treinoRepository.savePlan({
      dayOfWeek: 2,
      workoutName: 'Calistenia Superior',
      variant: 'calistenia',
      exercises: [
        {
          id: 'ex2',
          nome: 'Prancha',
          series: 3,
          repeticoes: '45s',
          carga: 0,
          unitType: 'seconds',
          isBodyweight: true,
        },
      ],
    })
    expect(calisteniaPlan.variant).toBe('calistenia')

    // Leitura via getWeeklyPlans garante fallback
    const allPlans = await treinoRepository.getWeeklyPlans()
    const p1 = allPlans.find((p) => Number(p.dayOfWeek) === 1)
    const p2 = allPlans.find((p) => Number(p.dayOfWeek) === 2)
    expect(p1?.variant).toBe('academia')
    expect(p2?.variant).toBe('calistenia')
  })

  // T6: Meta do dia de Treino com múltiplas sessões (uma pendente bloqueia a conclusão)
  it('T6: Meta do dia com múltiplas sessões: musculação + cardio + outros (uma pendente bloqueia conclusão)', async () => {
    const today = getTodayDateKey()
    const dow = getLocalDayOfWeek(parseLocalDate(today))

    // 1. Cria plano de musculação para hoje com 2 séries
    await treinoRepository.savePlan({
      dayOfWeek: dow,
      workoutName: 'Musculação A',
      variant: 'academia',
      exercises: [
        { id: 'e1', nome: 'Supino', series: 2, repeticoes: '10', carga: 40 },
      ],
    })

    // 2. Cria plano de cardio para hoje (5 km)
    const cardioPlan = await treinoRepository.saveActivityPlan({
      type: 'cardio',
      weekday: dow,
      modality: 'Corrida',
      targetKm: 5,
      active: true,
    })

    // 3. Cria plano de outros esportes para hoje (Natação)
    const outrosPlan = await treinoRepository.saveActivityPlan({
      type: 'outros',
      weekday: dow,
      sport: 'Natação',
      active: true,
    })

    // Estado inicial: 3 sessões planejadas, nenhuma concluída
    let todayData = await hojeRepository.getFastTodayData(today)
    expect(todayData.goalsTotal).toBe(1) // Treino tem meta hoje
    expect(todayData.goalsDone).toBe(0) // Nenhuma meta concluída
    expect(todayData.treino.isCompleted).toBe(false)
    expect(todayData.goals.treino?.displayValue).toBe('0/3') // 0 de 3 sessões
    expect(todayData.goals.treino?.legend).toContain('0/3 sessões')

    // Conclui apenas a musculação (2 séries feitas)
    await treinoRepository.saveLog({
      day: today,
      workoutName: 'Musculação A',
      completedSets: [
        { exercicioNome: 'Supino', serieIndex: 0, carga: 40, repeticoes: 10, concluido: true },
        { exercicioNome: 'Supino', serieIndex: 1, carga: 40, repeticoes: 10, concluido: true },
      ],
    })

    todayData = await hojeRepository.getFastTodayData(today)
    expect(todayData.treino.isCompleted).toBe(false) // Bloqueado pois cardio e outros estão pendentes!
    expect(todayData.goalsDone).toBe(0)
    expect(todayData.goals.treino?.displayValue).toBe('1/3')

    // Conclui o cardio (5 km registrados)
    await treinoRepository.saveActivityLog({
      type: 'cardio',
      planId: cardioPlan.id,
      date: today,
      modality: 'Corrida',
      km: 5.2,
      minutes: 28,
      done: true,
    })

    todayData = await hojeRepository.getFastTodayData(today)
    expect(todayData.treino.isCompleted).toBe(false) // Ainda bloqueado por Outros!
    expect(todayData.goalsDone).toBe(0)
    expect(todayData.goals.treino?.displayValue).toBe('2/3')
    expect(todayData.goals.treino?.legend).toContain('5,2 km') // Legenda com km em pt-BR

    // Conclui outros esportes (Natação marcada como feita)
    await treinoRepository.saveActivityLog({
      type: 'outros',
      planId: outrosPlan.id,
      date: today,
      sport: 'Natação',
      done: true,
    })

    // Agora TODAS as 3 sessões estão concluídas!
    todayData = await hojeRepository.getFastTodayData(today)
    expect(todayData.treino.isCompleted).toBe(true)
    expect(todayData.goalsDone).toBe(1)
    expect(todayData.goals.treino?.displayValue).toBe('3/3')

    // Verifica que o module_days registrou conclusão e o anel/streak foi derivado
    const mDay = await moduleDaysRepository.getByDateAndModule(today, 'treino')
    expect(mDay).toBeDefined()
    expect(mDay?.goalDefined).toBe(true)
    expect(mDay?.done).toBe(true)
  })

  // T7: Sessão única de musculação exibe "séries" em vez de "sessões"
  it('T7: Sessão única de musculação mantém "séries" na legenda e valor', async () => {
    const today = getTodayDateKey()
    const dow = getLocalDayOfWeek(parseLocalDate(today))

    await treinoRepository.savePlan({
      dayOfWeek: dow,
      workoutName: 'Pernas',
      variant: 'academia',
      exercises: [
        { id: 'e1', nome: 'Agachamento', series: 4, repeticoes: '12', carga: 60 },
      ],
    })

    const todayData = await hojeRepository.getFastTodayData(today)
    expect(todayData.goals.treino?.displayValue).toBe('0/4')
    expect(todayData.goals.treino?.legend).toContain('4 séries')
    expect(todayData.goals.treino?.legend).not.toContain('sessões')
  })
})
