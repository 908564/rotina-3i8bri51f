import { idb } from '../indexedDb'
import { settingsRepository } from './settingsRepository'
import { EscritaNote, Livro, LeituraHistorico, TreinoPlanoSemanal, TreinoLog } from '../types'

// Função auxiliar para subtrair dias de hoje no formato YYYY-MM-DD
function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}

export async function loadSampleData(): Promise<void> {
  const today = daysAgo(0)
  const nowIso = new Date().toISOString()

  // 1. Limpa dados anteriores
  await idb.clear(idb.STORE_ESCRITA)
  await idb.clear(idb.STORE_LIVROS)
  await idb.clear(idb.STORE_LIVRO_ANOTACOES)
  await idb.clear(idb.STORE_LEITURA_HISTORICO)
  await idb.clear(idb.STORE_TREINO_PLANO)
  await idb.clear(idb.STORE_TREINO_LOG)

  // 2. Plano Semanal de Treino
  // 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sab
  const samplePlans: TreinoPlanoSemanal[] = [
    {
      id: crypto.randomUUID(),
      dayOfWeek: 1, // Segunda
      workoutName: 'Peito e Tríceps',
      exercises: [
        { id: crypto.randomUUID(), nome: 'Supino reto', series: 4, repeticoes: '10', carga: 40 },
        {
          id: crypto.randomUUID(),
          nome: 'Supino inclinado halteres',
          series: 3,
          repeticoes: '12',
          carga: 24,
        },
        { id: crypto.randomUUID(), nome: 'Crucifixo', series: 3, repeticoes: '12', carga: 14 },
        {
          id: crypto.randomUUID(),
          nome: 'Tríceps corda',
          series: 3,
          repeticoes: '15',
          carga: 27.5,
        },
      ],
      created: nowIso,
      updated: nowIso,
    },
    {
      id: crypto.randomUUID(),
      dayOfWeek: 2, // Terça
      workoutName: 'Costas e Bíceps',
      exercises: [
        { id: crypto.randomUUID(), nome: 'Puxada frontal', series: 4, repeticoes: '10', carga: 50 },
        { id: crypto.randomUUID(), nome: 'Remada baixa', series: 4, repeticoes: '12', carga: 45 },
        {
          id: crypto.randomUUID(),
          nome: 'Rosca direta barra',
          series: 3,
          repeticoes: '12',
          carga: 20,
        },
        { id: crypto.randomUUID(), nome: 'Rosca martelo', series: 4, repeticoes: '12', carga: 12 },
      ],
      created: nowIso,
      updated: nowIso,
    },
    {
      id: crypto.randomUUID(),
      dayOfWeek: 3, // Quarta
      workoutName: 'Ombro e Abdômen',
      exercises: [
        {
          id: crypto.randomUUID(),
          nome: 'Desenvolvimento militar',
          series: 4,
          repeticoes: '10',
          carga: 30,
        },
        {
          id: crypto.randomUUID(),
          nome: 'Elevação lateral',
          series: 4,
          repeticoes: '15',
          carga: 8,
        },
        { id: crypto.randomUUID(), nome: 'Encolhimento', series: 4, repeticoes: '12', carga: 25 },
        { id: crypto.randomUUID(), nome: 'Prancha', series: 3, repeticoes: '45s', carga: 0 },
      ],
      created: nowIso,
      updated: nowIso,
    },
    {
      id: crypto.randomUUID(),
      dayOfWeek: 4, // Quinta
      workoutName: 'Perna',
      exercises: [
        {
          id: crypto.randomUUID(),
          nome: 'Agachamento livre',
          series: 4,
          repeticoes: '10',
          carga: 60,
        },
        { id: crypto.randomUUID(), nome: 'Leg press', series: 4, repeticoes: '12', carga: 180 },
        {
          id: crypto.randomUUID(),
          nome: 'Cadeira extensora',
          series: 4,
          repeticoes: '12',
          carga: 45,
        },
        { id: crypto.randomUUID(), nome: 'Mesa flexora', series: 4, repeticoes: '12', carga: 35 },
      ],
      created: nowIso,
      updated: nowIso,
    },
    {
      id: crypto.randomUUID(),
      dayOfWeek: 5, // Sexta
      workoutName: 'Cardio e Core',
      exercises: [
        {
          id: crypto.randomUUID(),
          nome: 'Corrida 30min',
          series: 1,
          repeticoes: '30min',
          carga: 0,
        },
        { id: crypto.randomUUID(), nome: 'Prancha', series: 3, repeticoes: '45s', carga: 0 },
        { id: crypto.randomUUID(), nome: 'Abdominal infra', series: 3, repeticoes: '20', carga: 0 },
        {
          id: crypto.randomUUID(),
          nome: 'Prancha lateral',
          series: 3,
          repeticoes: '30s',
          carga: 0,
        },
      ],
      created: nowIso,
      updated: nowIso,
    },
  ]

  for (const plan of samplePlans) {
    await idb.put(idb.STORE_TREINO_PLANO, plan)
  }

  // 3. Logs de treino das últimas 3 semanas para os exercícios principais (ex.: Supino 40→42.5→45kg)
  const sampleWorkoutLogs: TreinoLog[] = [
    {
      id: crypto.randomUUID(),
      day: daysAgo(14),
      workoutName: 'Peito e Tríceps',
      completedSets: [
        { exercicioNome: 'Supino reto', serieIndex: 1, carga: 40, repeticoes: 10, concluido: true },
        { exercicioNome: 'Supino reto', serieIndex: 2, carga: 40, repeticoes: 10, concluido: true },
        { exercicioNome: 'Supino reto', serieIndex: 3, carga: 40, repeticoes: 10, concluido: true },
        { exercicioNome: 'Supino reto', serieIndex: 4, carga: 40, repeticoes: 10, concluido: true },
        {
          exercicioNome: 'Supino inclinado halteres',
          serieIndex: 1,
          carga: 22,
          repeticoes: 12,
          concluido: true,
        },
        { exercicioNome: 'Crucifixo', serieIndex: 1, carga: 12, repeticoes: 12, concluido: true },
      ],
      created: nowIso,
      updated: nowIso,
    },
    {
      id: crypto.randomUUID(),
      day: daysAgo(7),
      workoutName: 'Peito e Tríceps',
      completedSets: [
        {
          exercicioNome: 'Supino reto',
          serieIndex: 1,
          carga: 42.5,
          repeticoes: 10,
          concluido: true,
        },
        {
          exercicioNome: 'Supino reto',
          serieIndex: 2,
          carga: 42.5,
          repeticoes: 10,
          concluido: true,
        },
        {
          exercicioNome: 'Supino reto',
          serieIndex: 3,
          carga: 42.5,
          repeticoes: 9,
          concluido: true,
        },
        {
          exercicioNome: 'Supino reto',
          serieIndex: 4,
          carga: 42.5,
          repeticoes: 8,
          concluido: true,
        },
        {
          exercicioNome: 'Supino inclinado halteres',
          serieIndex: 1,
          carga: 24,
          repeticoes: 12,
          concluido: true,
        },
        { exercicioNome: 'Crucifixo', serieIndex: 1, carga: 14, repeticoes: 12, concluido: true },
      ],
      created: nowIso,
      updated: nowIso,
    },
    {
      id: crypto.randomUUID(),
      day: daysAgo(1),
      workoutName: 'Peito e Tríceps',
      completedSets: [
        { exercicioNome: 'Supino reto', serieIndex: 1, carga: 45, repeticoes: 10, concluido: true },
        { exercicioNome: 'Supino reto', serieIndex: 2, carga: 45, repeticoes: 10, concluido: true },
        { exercicioNome: 'Supino reto', serieIndex: 3, carga: 45, repeticoes: 10, concluido: true },
        { exercicioNome: 'Supino reto', serieIndex: 4, carga: 45, repeticoes: 9, concluido: true },
        {
          exercicioNome: 'Supino inclinado halteres',
          serieIndex: 1,
          carga: 24,
          repeticoes: 12,
          concluido: true,
        },
        {
          exercicioNome: 'Tríceps corda',
          serieIndex: 1,
          carga: 27.5,
          repeticoes: 15,
          concluido: true,
        },
      ],
      created: nowIso,
      updated: nowIso,
    },
    {
      id: crypto.randomUUID(),
      day: daysAgo(6),
      workoutName: 'Costas e Bíceps',
      completedSets: [
        {
          exercicioNome: 'Puxada frontal',
          serieIndex: 1,
          carga: 50,
          repeticoes: 10,
          concluido: true,
        },
        {
          exercicioNome: 'Remada baixa',
          serieIndex: 1,
          carga: 45,
          repeticoes: 12,
          concluido: true,
        },
        {
          exercicioNome: 'Rosca direta barra',
          serieIndex: 1,
          carga: 20,
          repeticoes: 12,
          concluido: true,
        },
      ],
      created: nowIso,
      updated: nowIso,
    },
    {
      id: crypto.randomUUID(),
      day: daysAgo(4),
      workoutName: 'Perna',
      completedSets: [
        {
          exercicioNome: 'Agachamento livre',
          serieIndex: 1,
          carga: 60,
          repeticoes: 10,
          concluido: true,
        },
        { exercicioNome: 'Leg press', serieIndex: 1, carga: 180, repeticoes: 12, concluido: true },
      ],
      created: nowIso,
      updated: nowIso,
    },
  ]

  for (const log of sampleWorkoutLogs) {
    await idb.put(idb.STORE_TREINO_LOG, log)
  }

  // 4. Livros com metas próprias individualizadas
  const book1Id = crypto.randomUUID()
  const book2Id = crypto.randomUUID()
  const book3Id = crypto.randomUUID()
  const book4Id = crypto.randomUUID()

  // Data-alvo estimada para daqui a 30 dias
  const targetDate1 = daysAgo(-30)
  const targetDate2 = daysAgo(-20)

  const sampleLivros: Livro[] = [
    {
      id: book1Id,
      title: 'O Poder do Hábito',
      author: 'Charles Duhigg',
      totalPages: 351,
      currentPage: 148,
      status: 'lendo',
      goal: {
        dailyPages: 15,
        dailyMinutes: 20,
        weeklyPages: 90,
        monthlyPages: 360,
        targetDate: targetDate1,
      },
      goalHistory: [
        {
          id: crypto.randomUUID(),
          bookId: book1Id,
          effectiveDate: daysAgo(14),
          meta: {
            dailyPages: 15,
            dailyMinutes: 20,
            weeklyPages: 90,
            monthlyPages: 360,
            targetDate: targetDate1,
          },
          created: nowIso,
        },
      ],
      created: nowIso,
      updated: nowIso,
    },
    {
      id: book2Id,
      title: 'A Sutil Arte de Ligar o F*da-se',
      author: 'Mark Manson',
      totalPages: 272,
      currentPage: 87,
      status: 'lendo',
      goal: {
        dailyPages: 10,
        dailyMinutes: 15,
        weeklyPages: 60,
        monthlyPages: 240,
        targetDate: targetDate2,
      },
      goalHistory: [
        {
          id: crypto.randomUUID(),
          bookId: book2Id,
          effectiveDate: daysAgo(14),
          meta: {
            dailyPages: 10,
            dailyMinutes: 15,
            weeklyPages: 60,
            monthlyPages: 240,
            targetDate: targetDate2,
          },
          created: nowIso,
        },
      ],
      created: nowIso,
      updated: nowIso,
    },
    {
      id: book3Id,
      title: 'Hábitos Atômicos',
      author: 'James Clear',
      totalPages: 320,
      currentPage: 320,
      status: 'concluido',
      goal: {
        dailyPages: 20,
        dailyMinutes: 25,
      },
      goalHistory: [
        {
          id: crypto.randomUUID(),
          bookId: book3Id,
          effectiveDate: daysAgo(30),
          meta: {
            dailyPages: 20,
            dailyMinutes: 25,
          },
          created: nowIso,
        },
      ],
      created: nowIso,
      updated: nowIso,
    },
    {
      id: book4Id,
      title: 'Rápido e Devagar',
      author: 'Daniel Kahneman',
      totalPages: 608,
      currentPage: 0,
      status: 'quero_ler',
      created: nowIso,
      updated: nowIso,
    },
  ]

  for (const b of sampleLivros) {
    await idb.put(idb.STORE_LIVROS, b)
  }

  // 5. Histórico de leitura dos últimos 7 dias: 15, 18, 25, 26, 25, 30, 25 páginas (atingindo a meta conjunta de 25 pág/dia)
  const historyPages = [15, 18, 25, 26, 25, 30, 25]
  let rollingPage = 20
  for (let i = 6; i >= 0; i--) {
    const pages = historyPages[6 - i]
    rollingPage += pages
    // Distribui entre book1 e book2 nos dias para demonstrar o cálculo
    const isBook1 = i % 2 === 0
    const bId = isBook1 ? book1Id : book2Id
    const currentBookGoal = isBook1 ? sampleLivros[0].goal : sampleLivros[1].goal

    const hist: LeituraHistorico = {
      id: crypto.randomUUID(),
      bookId: bId,
      dateRead: daysAgo(i),
      pagesAdded: pages,
      currentPage: rollingPage,
      minutes: Math.round(pages * 1.5),
      effectiveGoal: currentBookGoal,
      created: nowIso,
      updated: nowIso,
    }
    await idb.put(idb.STORE_LEITURA_HISTORICO, hist)
  }

  // 6. Uma anotação de escrita para hoje
  const sampleNote: EscritaNote = {
    id: crypto.randomUUID(),
    date: today,
    title: 'Foco renovado na rotina matinal',
    body: 'Hoje o dia começou muito produtivo. Consegui manter a leitura matinal em dia e o treino foi excelente, consegui progredir carga no supino com ótima execução. O importante é manter a constância e não deixar o ritmo cair.',
    tags: ['foco', 'rotina', 'treino', 'leitura'],
    created: nowIso,
    updated: nowIso,
  }
  await idb.put(idb.STORE_ESCRITA, sampleNote)

  // Atualiza configurações para marcar que o onboarding foi concluído
  settingsRepository.updateSettings({
    hasSeenOnboarding: true,
  })
}
