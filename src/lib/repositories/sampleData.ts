import { idb } from '../indexedDb'
import { settingsRepository } from './settingsRepository'
import {
  EscritaNote,
  Livro,
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
  await idb.clear(idb.STORE_COURSES)
  await idb.clear(idb.STORE_STUDY_PAGES)
  await idb.clear(idb.STORE_STUDY_CERTIFICATES)
  await idb.clear(idb.STORE_STUDY_SESSIONS)
  await idb.clear(idb.STORE_STUDY_GOALS)
  await idb.clear(idb.STORE_PROJECTS)
  await idb.clear(idb.STORE_ACHIEVEMENTS)
  await idb.clear(idb.STORE_EXPERIENCES)
  await idb.clear(idb.STORE_WORK_NOTES)

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

  // 7. Módulo de Estudos: 3 cursos (Faculdade, Curso, Certificação)
  const course1Id = crypto.randomUUID() // Faculdade
  const course2Id = crypto.randomUUID() // Curso
  const course3Id = crypto.randomUUID() // Certificação

  const sampleCourses: Course[] = [
    {
      id: course1Id,
      name: 'Engenharia de Software',
      type: 'faculdade',
      institution: 'FIAP',
      status: 'em_andamento',
      progress: 65,
      workloadHours: 3200,
      startDate: '2023-02-01',
      endDate: '2026-12-15',
      courseUrl: 'https://fiap.com.br',
      color: '#8B5CF6',
      icon: 'GraduationCap',
      created: nowIso,
      updated: nowIso,
    },
    {
      id: course2Id,
      name: 'React & TypeScript Pro',
      type: 'curso',
      institution: 'Rocketseat',
      status: 'em_andamento',
      progress: 40,
      workloadHours: 60,
      startDate: daysAgo(30),
      courseUrl: 'https://rocketseat.com.br',
      color: '#06B6D4',
      icon: 'Code',
      created: nowIso,
      updated: nowIso,
    },
    {
      id: course3Id,
      name: 'AWS Certified Solutions Architect',
      type: 'certificacao',
      institution: 'Amazon Web Services',
      status: 'em_andamento',
      progress: 80,
      workloadHours: 80,
      startDate: daysAgo(60),
      endDate: daysAgo(-15),
      color: '#F59E0B',
      icon: 'Award',
      created: nowIso,
      updated: nowIso,
    },
  ]

  for (const c of sampleCourses) {
    await idb.put(idb.STORE_COURSES, c)
  }

  // Páginas de anotação com blocos variados
  const samplePage1: StudyPage = {
    id: crypto.randomUUID(),
    courseId: course1Id,
    title: 'Padrões de Arquitetura e Microsserviços',
    blocks: [
      {
        id: crypto.randomUUID(),
        type: 'heading',
        content: 'Conceitos Fundamentais de Microsserviços',
      },
      {
        id: crypto.randomUUID(),
        type: 'paragraph',
        content:
          'Microsserviços são uma abordagem arquitetural em que sistemas complexos são compostos por pequenos serviços autônomos organizados em torno de capacidades de negócio.',
      },
      {
        id: crypto.randomUUID(),
        type: 'subheading',
        content: 'Vantagens e Desafios',
      },
      {
        id: crypto.randomUUID(),
        type: 'bullet_list',
        content: 'Deploy independente e ciclo de vida desacoplado',
      },
      {
        id: crypto.randomUUID(),
        type: 'bullet_list',
        content: 'Escalabilidade granular de serviços de alta demanda',
      },
      {
        id: crypto.randomUUID(),
        type: 'bullet_list',
        content: 'Heterogeneidade tecnológica conforme necessidade',
      },
      {
        id: crypto.randomUUID(),
        type: 'divider',
        content: '',
      },
      {
        id: crypto.randomUUID(),
        type: 'subheading',
        content: 'Checklist para a Prova Semestral',
      },
      {
        id: crypto.randomUUID(),
        type: 'checklist',
        content: 'Revisar padrão Saga para transações distribuídas',
        checked: true,
      },
      {
        id: crypto.randomUUID(),
        type: 'checklist',
        content: 'Estudar Service Mesh (Istio / Envoy)',
        checked: false,
      },
      {
        id: crypto.randomUUID(),
        type: 'checklist',
        content: 'Praticar tracing distribuído com OpenTelemetry',
        checked: false,
      },
    ],
    created: nowIso,
    updated: nowIso,
  }

  const samplePage2: StudyPage = {
    id: crypto.randomUUID(),
    courseId: course2Id,
    title: 'Gerenciamento de Estado e Performance em React',
    blocks: [
      {
        id: crypto.randomUUID(),
        type: 'heading',
        content: 'Otimização com useMemo e useCallback',
      },
      {
        id: crypto.randomUUID(),
        type: 'paragraph',
        content:
          'Evite otimizações prematuras. Meça primeiro com o React DevTools Profiler antes de memorizar cálculos triviais.',
      },
      {
        id: crypto.randomUUID(),
        type: 'numbered_list',
        content: 'Identifique componentes que re-renderizam frequentemente.',
      },
      {
        id: crypto.randomUUID(),
        type: 'numbered_list',
        content: 'Extraia estado local para manter re-renders isolados na subárvore.',
      },
      {
        id: crypto.randomUUID(),
        type: 'numbered_list',
        content: 'Utilize referências estáveis para callbacks passados a filhos pesados.',
      },
    ],
    created: nowIso,
    updated: nowIso,
  }

  await idb.put(idb.STORE_STUDY_PAGES, samplePage1)
  await idb.put(idb.STORE_STUDY_PAGES, samplePage2)

  // Salva última página aberta
  try {
    localStorage.setItem(
      'rotina_last_opened_study_page',
      JSON.stringify({
        pageId: samplePage1.id,
        courseId: samplePage1.courseId,
        title: samplePage1.title,
      }),
    )
  } catch {
    // Ignora
  }

  // Certificado de exemplo (imagem em SVG Data-URL de alta qualidade gerado como certificado oficial)
  const sampleCertSvg = `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#1E1E2E"/>
          <stop offset="100%" stop-color="#2A2B3D"/>
        </linearGradient>
        <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#F59E0B"/>
          <stop offset="100%" stop-color="#D97706"/>
        </linearGradient>
      </defs>
      <rect width="800" height="600" fill="url(#bg)"/>
      <rect x="25" y="25" width="750" height="550" fill="none" stroke="url(#gold)" stroke-width="4" rx="16"/>
      <rect x="35" y="35" width="730" height="530" fill="none" stroke="#4B5563" stroke-width="1" rx="10"/>
      <circle cx="400" cy="110" r="40" fill="url(#gold)"/>
      <polygon points="400,85 407,102 425,102 411,113 416,130 400,120 384,130 389,113 375,102 393,102" fill="#1E1E2E"/>
      <text x="400" y="200" font-family="system-ui, sans-serif" font-size="28" font-weight="bold" fill="#F3F4F6" text-anchor="middle">CERTIFICADO DE CONCLUSÃO</text>
      <text x="400" y="240" font-family="system-ui, sans-serif" font-size="14" fill="#9CA3AF" text-anchor="middle">Certificamos com distinção que o estudante concluiu com êxito</text>
      <text x="400" y="290" font-family="system-ui, sans-serif" font-size="24" font-weight="bold" fill="url(#gold)" text-anchor="middle">AWS Certified Cloud Practitioner</text>
      <text x="400" y="340" font-family="system-ui, sans-serif" font-size="15" fill="#E5E7EB" text-anchor="middle">Emitido por Amazon Web Services Training &amp; Certification</text>
      <line x1="250" y1="440" x2="550" y2="440" stroke="#4B5563" stroke-width="1"/>
      <text x="400" y="470" font-family="system-ui, sans-serif" font-size="12" fill="#9CA3AF" text-anchor="middle">Credencial Verificada • Carga Horária: 40h</text>
      <text x="400" y="520" font-family="system-ui, sans-serif" font-size="11" fill="#6B7280" text-anchor="middle">Emitido em 15 de Outubro de 2024</text>
    </svg>`,
  )}`

  const sampleCert: StudyCertificate = {
    id: crypto.randomUUID(),
    courseId: course3Id,
    title: 'Certificado Cloud Practitioner Oficial',
    issueDate: '2024-10-15',
    fileData: sampleCertSvg,
    fileType: 'image',
    fileName: 'aws-cloud-practitioner.svg',
    fileSize: 125000,
    created: nowIso,
    updated: nowIso,
  }
  await idb.put(idb.STORE_STUDY_CERTIFICATES, sampleCert)

  // Metas semanais de estudo
  const sampleGoal1: StudyGoal = {
    id: crypto.randomUUID(),
    courseId: course1Id,
    weeklyMinutes: 240, // 4 horas por semana
    history: [
      {
        id: crypto.randomUUID(),
        courseId: course1Id,
        effectiveDate: daysAgo(21),
        weeklyMinutes: 240,
        created: nowIso,
      },
    ],
    created: nowIso,
    updated: nowIso,
  }

  const sampleGoal2: StudyGoal = {
    id: crypto.randomUUID(),
    courseId: course2Id,
    weeklyMinutes: 180, // 3 horas por semana
    history: [
      {
        id: crypto.randomUUID(),
        courseId: course2Id,
        effectiveDate: daysAgo(14),
        weeklyMinutes: 180,
        created: nowIso,
      },
    ],
    created: nowIso,
    updated: nowIso,
  }

  await idb.put(idb.STORE_STUDY_GOALS, sampleGoal1)
  await idb.put(idb.STORE_STUDY_GOALS, sampleGoal2)

  // Sessões de tempo
  const sampleSessions: StudySession[] = [
    {
      id: crypto.randomUUID(),
      courseId: course1Id,
      date: today,
      minutes: 60,
      notes: 'Capítulo sobre orquestração de contêineres e Kubernetes',
      created: nowIso,
      updated: nowIso,
    },
    {
      id: crypto.randomUUID(),
      courseId: course1Id,
      date: daysAgo(2),
      minutes: 90,
      notes: 'Exercícios práticos de modelagem de domínio com DDD',
      created: nowIso,
      updated: nowIso,
    },
    {
      id: crypto.randomUUID(),
      courseId: course2Id,
      date: today,
      minutes: 45,
      notes: 'Hooks avançados e controle de re-renderizações',
      created: nowIso,
      updated: nowIso,
    },
    {
      id: crypto.randomUUID(),
      courseId: course2Id,
      date: daysAgo(1),
      minutes: 60,
      notes: 'Construção de componentes genéricos em TypeScript',
      created: nowIso,
      updated: nowIso,
    },
    {
      id: crypto.randomUUID(),
      courseId: course3Id,
      date: daysAgo(3),
      minutes: 75,
      notes: 'Simulado oficial 1 - Redes VPC e segurança IAM',
      created: nowIso,
      updated: nowIso,
    },
  ]

  for (const s of sampleSessions) {
    await idb.put(idb.STORE_STUDY_SESSIONS, s)
  }

  // Lembra último curso para registro de tempo
  try {
    localStorage.setItem('rotina_last_course_time', course1Id)
  } catch {
    // Ignora
  }

  // ========================
  // 6. DADOS DE EXEMPLO DO MÓDULO TRABALHO
  // 2 projetos, 3 conquistas, 2 experiências e algumas anotações
  // ========================
  const exp1Id = crypto.randomUUID()
  const exp2Id = crypto.randomUUID()

  const sampleExperiences: Experience[] = [
    {
      id: exp1Id,
      role: 'Tech Lead / Arquiteto Frontend',
      company: 'TechFlow Soluções Digitais',
      startDate: '2023-03',
      isCurrent: true,
      description:
        'Liderança técnica da equipe de produto web e mobile, responsável pela modernização do design system, arquitetura offline-first e melhoria contínua de performance e acessibilidade.',
      skills: [
        'React',
        'TypeScript',
        'Tailwind CSS',
        'Arquitetura de Software',
        'Liderança Técnica',
      ],
      created: nowIso,
      updated: nowIso,
    },
    {
      id: exp2Id,
      role: 'Desenvolvedor Frontend Sênior',
      company: 'Nexus Software Labs',
      startDate: '2021-01',
      endDate: '2023-02',
      isCurrent: false,
      description:
        'Desenvolvimento de aplicações SPA de alta escalabilidade para o setor financeiro e logístico, integrando APIs GraphQL e REST com foco em robustez e cobertura de testes.',
      skills: ['React', 'Next.js', 'TypeScript', 'GraphQL', 'Jest', 'CI/CD'],
      created: nowIso,
      updated: nowIso,
    },
  ]

  for (const exp of sampleExperiences) {
    await idb.put(idb.STORE_EXPERIENCES, exp)
  }

  const proj1Id = crypto.randomUUID()
  const proj2Id = crypto.randomUUID()

  const sampleProjects: Project[] = [
    {
      id: proj1Id,
      name: 'Design System & Microfrontends',
      description:
        'Unificação visual e componentização dos sistemas legados da empresa em biblioteca compartilhada.',
      objective:
        'Reduzir duplicidade de código entre squads e acelerar entrega de novas telas em 40%.',
      status: 'em_andamento',
      startDate: daysAgo(45),
      endDate: daysAgo(-45),
      tags: ['Design System', 'React', 'Storybook', 'Acessibilidade'],
      experienceId: exp1Id,
      tasks: [
        { id: crypto.randomUUID(), title: 'Mapear tokens de cor e tipografia', completed: true },
        {
          id: crypto.randomUUID(),
          title: 'Publicar componentes base no Storybook',
          completed: true,
        },
        {
          id: crypto.randomUUID(),
          title: 'Testar compatibilidade com leitores de tela',
          completed: false,
        },
        {
          id: crypto.randomUUID(),
          title: 'Implementar pacote NPM interno com rollup',
          completed: false,
        },
      ],
      notes: [
        {
          id: crypto.randomUUID(),
          date: daysAgo(3),
          text: 'Alinhamento com o time de UX sobre os estados hover/active dos botões e contraste WCAG AA.',
          created: nowIso,
          updated: nowIso,
        },
        {
          id: crypto.randomUUID(),
          date: daysAgo(12),
          text: 'Definido suporte a tema claro e escuro utilizando CSS custom properties e Tailwind tokens.',
          created: nowIso,
          updated: nowIso,
        },
      ],
      created: nowIso,
      updated: nowIso,
    },
    {
      id: proj2Id,
      name: 'Otimização de Performance e Bundle Size',
      description:
        'Análise de chunks, lazy-loading e reestruturação de dependências pesadas na aplicação core.',
      objective: 'Atingir score de Core Web Vitals acima de 90 e LCP inferior a 1.8s.',
      status: 'concluido',
      startDate: daysAgo(90),
      endDate: daysAgo(10),
      tags: ['Performance', 'Vite', 'Core Web Vitals', 'Code Splitting'],
      experienceId: exp2Id,
      tasks: [
        {
          id: crypto.randomUUID(),
          title: 'Diagnóstico de pacotes pesados com rollup-visualizer',
          completed: true,
        },
        {
          id: crypto.randomUUID(),
          title: 'Substituição de bibliotecas de data por date-fns leve',
          completed: true,
        },
        {
          id: crypto.randomUUID(),
          title: 'Configurar dynamic imports nas rotas secundárias',
          completed: true,
        },
        {
          id: crypto.randomUUID(),
          title: 'Validação no Google Lighthouse e PageSpeed',
          completed: true,
        },
      ],
      notes: [
        {
          id: crypto.randomUUID(),
          date: daysAgo(15),
          text: 'Bundle principal reduzido de 1.4MB para 420KB após tree-shaking das dependências.',
          created: nowIso,
          updated: nowIso,
        },
      ],
      created: nowIso,
      updated: nowIso,
    },
  ]

  for (const proj of sampleProjects) {
    await idb.put(idb.STORE_PROJECTS, proj)
  }

  const sampleAchievements: Achievement[] = [
    {
      id: crypto.randomUUID(),
      title: 'Redução do tempo de carregamento inicial em 65%',
      description:
        'Liderei a refatoração do pipeline de build e divisão de código em módulos lazy-loaded.',
      date: daysAgo(20),
      impact:
        'reduziu o tempo de carregamento de 4.2s para 1.4s e elevou a retenção de usuários em 18%',
      projectId: proj2Id,
      experienceId: exp2Id,
      tags: ['Performance Web', 'Otimização', 'React', 'Métricas de Negócio'],
      created: nowIso,
      updated: nowIso,
    },
    {
      id: crypto.randomUUID(),
      title: 'Implantação de CI/CD automatizado com testes de regressão',
      description:
        'Estruturei pipelines de build, verificação de tipagem e testes unitários automatizados no GitHub Actions.',
      date: daysAgo(50),
      impact:
        'reduziu o tempo de implantação em 30% e zerou incidentes críticos em produção por 6 meses',
      projectId: proj1Id,
      experienceId: exp1Id,
      tags: ['DevOps', 'CI/CD', 'Qualidade de Software', 'GitHub Actions'],
      created: nowIso,
      updated: nowIso,
    },
    {
      id: crypto.randomUUID(),
      title: 'Padronização do Design System com 35+ componentes reutilizáveis',
      description:
        'Criei uma biblioteca de componentes de UI acessíveis e altamente tipados para 4 times simultâneos.',
      date: daysAgo(8),
      impact: 'acelerou o tempo de desenvolvimento de novas features em 40% em todos os squads',
      projectId: proj1Id,
      experienceId: exp1Id,
      tags: ['Design System', 'TypeScript', 'Acessibilidade', 'Produtividade'],
      created: nowIso,
      updated: nowIso,
    },
  ]

  for (const ach of sampleAchievements) {
    await idb.put(idb.STORE_ACHIEVEMENTS, ach)
  }

  const sampleWorkNotes: WorkNote[] = [
    {
      id: crypto.randomUUID(),
      title: 'Ideias para o 1:1 de alinhamento com a diretoria de produto',
      date: today,
      body: 'Pontos a apresentar: status da adoção do Design System, métricas de performance alcançadas no último trimestre e proposta de capacitação interna em testes E2E.',
      tags: ['Gestão', '1:1', 'Estratégia'],
      created: nowIso,
      updated: nowIso,
    },
    {
      id: crypto.randomUUID(),
      title: 'Checklist para lançamento de release v2.4',
      date: daysAgo(4),
      body: '1. Verificar migrations de banco\n2. Rodar suite de regressão em homologação\n3. Validar changelog e notas de versão para clientes\n4. Monitoramento com telemetria ativa nas primeiras 2h.',
      tags: ['Deploy', 'Release', 'Qualidade'],
      created: nowIso,
      updated: nowIso,
    },
  ]

  for (const wn of sampleWorkNotes) {
    await idb.put(idb.STORE_WORK_NOTES, wn)
  }

  // Atualiza configurações para marcar que o onboarding foi concluído
  settingsRepository.updateSettings({
    hasSeenOnboarding: true,
  })
}
