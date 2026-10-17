import {
  TaskModule,
  TaskModuleData,
  TaskEscritaData,
  TaskLeituraData,
  TaskTreinoData,
  TaskEstudosData,
  TaskTrabalhoData,
} from '@/lib/types'

export function validateAndCleanModuleData(module: TaskModule, raw: any): TaskModuleData | null {
  if (!raw || typeof raw !== 'object' || module === 'geral') {
    return module === 'geral' ? { module: 'geral', data: {} } : null
  }

  // Se o objeto recebido tiver o wrapper { module, data }, extrai raw.data
  const input = raw.data && raw.module === module ? raw.data : raw

  if (module === 'escrita') {
    const tipo = input.tipo === 'ideia' ? 'ideia' : 'diario'
    const tema =
      typeof input.tema === 'string' && input.tema.trim()
        ? input.tema.trim().slice(0, 80)
        : undefined
    const metaMinutos =
      typeof input.metaMinutos === 'number' && input.metaMinutos > 0
        ? Math.floor(input.metaMinutos)
        : undefined

    const cleaned: TaskEscritaData = {
      tipo,
      ...(tema ? { tema } : {}),
      ...(metaMinutos !== undefined ? { metaMinutos } : {}),
    }

    return { module: 'escrita', data: cleaned }
  }

  if (module === 'leitura') {
    const bookId =
      typeof input.bookId === 'string' && input.bookId.trim() ? input.bookId.trim() : undefined
    const metaPaginas =
      typeof input.metaPaginas === 'number' && input.metaPaginas > 0
        ? Math.floor(input.metaPaginas)
        : undefined
    const metaMinutos =
      typeof input.metaMinutos === 'number' && input.metaMinutos > 0
        ? Math.floor(input.metaMinutos)
        : undefined
    const atePagina =
      typeof input.atePagina === 'number' && input.atePagina > 0
        ? Math.floor(input.atePagina)
        : undefined

    const cleaned: TaskLeituraData = {
      ...(bookId ? { bookId } : {}),
      ...(metaPaginas !== undefined ? { metaPaginas } : {}),
      ...(metaMinutos !== undefined ? { metaMinutos } : {}),
      ...(atePagina !== undefined ? { atePagina } : {}),
    }

    return { module: 'leitura', data: cleaned }
  }

  if (module === 'treino') {
    const validTipos = ['musculacao', 'cardio', 'outros']
    const tipo = validTipos.includes(input.tipo) ? input.tipo : 'musculacao'
    const cleaned: TaskTreinoData = { tipo }

    if (tipo === 'musculacao') {
      const sub = input.musculacao || {}
      const subtipo = sub.subtipo === 'calistenia' ? 'calistenia' : 'academia'
      const diaOuGrupo = typeof sub.diaOuGrupo === 'string' ? sub.diaOuGrupo.trim() : ''
      cleaned.musculacao = { subtipo, diaOuGrupo }
    } else if (tipo === 'cardio') {
      const card = input.cardio || {}
      const modalidade = ['corrida', 'caminhada', 'bicicleta'].includes(card.modalidade)
        ? card.modalidade
        : 'corrida'
      const intensidade = ['leve', 'moderada', 'intensa'].includes(card.intensidade)
        ? card.intensidade
        : 'moderada'
      const metaDistancia =
        typeof card.metaDistancia === 'number' && card.metaDistancia > 0
          ? Number(card.metaDistancia.toFixed(2))
          : undefined
      const metaTempo =
        typeof card.metaTempo === 'number' && card.metaTempo > 0
          ? Math.floor(card.metaTempo)
          : undefined

      cleaned.cardio = {
        modalidade,
        intensidade,
        ...(metaDistancia !== undefined ? { metaDistancia } : {}),
        ...(metaTempo !== undefined ? { metaTempo } : {}),
      }
    } else if (tipo === 'outros') {
      const out = input.outros || {}
      const esporte = typeof out.esporte === 'string' ? out.esporte.trim() : ''
      const duracao =
        typeof out.duracao === 'number' && out.duracao > 0 ? Math.floor(out.duracao) : undefined
      cleaned.outros = {
        esporte,
        ...(duracao !== undefined ? { duracao } : {}),
      }
    }

    return { module: 'treino', data: cleaned }
  }

  if (module === 'estudos') {
    const vinculoTipo = ['faculdade', 'curso', 'certificacao', 'outros'].includes(input.vinculoTipo)
      ? input.vinculoTipo
      : undefined
    const courseId =
      typeof input.courseId === 'string' && input.courseId.trim()
        ? input.courseId.trim()
        : undefined
    const estudoAutonomoNome =
      typeof input.estudoAutonomoNome === 'string' && input.estudoAutonomoNome.trim()
        ? input.estudoAutonomoNome.trim()
        : undefined
    const validAtividades = ['assistir_aula', 'ler', 'exercicios', 'revisar', 'entrega_prova']
    const tipoAtividade = validAtividades.includes(input.tipoAtividade)
      ? input.tipoAtividade
      : 'assistir_aula'
    const metaMinutos =
      typeof input.metaMinutos === 'number' && input.metaMinutos > 0
        ? Math.floor(input.metaMinutos)
        : undefined
    const tema =
      typeof input.tema === 'string' && input.tema.trim()
        ? input.tema.trim().slice(0, 80)
        : undefined

    const cleaned: TaskEstudosData = {
      ...(vinculoTipo ? { vinculoTipo } : {}),
      ...(courseId ? { courseId } : {}),
      ...(estudoAutonomoNome ? { estudoAutonomoNome } : {}),
      tipoAtividade,
      ...(metaMinutos !== undefined ? { metaMinutos } : {}),
      ...(tema ? { tema } : {}),
    }

    return { module: 'estudos', data: cleaned }
  }

  if (module === 'trabalho') {
    const projectId =
      typeof input.projectId === 'string' && input.projectId.trim()
        ? input.projectId.trim()
        : undefined
    const validTipos = ['tarefa', 'reuniao', 'entrega']
    const tipo = validTipos.includes(input.tipo) ? input.tipo : 'tarefa'
    const sugerirConquista = Boolean(input.sugerirConquista)

    const cleaned: TaskTrabalhoData = {
      ...(projectId ? { projectId } : {}),
      tipo,
      sugerirConquista,
    }

    return { module: 'trabalho', data: cleaned }
  }

  return null
}

export function hasFilledModuleData(
  module: TaskModule,
  escrita: TaskEscritaData,
  leitura: TaskLeituraData,
  treino: TaskTreinoData,
  estudos: TaskEstudosData,
  trabalho: TaskTrabalhoData,
): boolean {
  if (module === 'escrita') {
    return Boolean(escrita.tema || (escrita.metaMinutos && escrita.metaMinutos > 0))
  }
  if (module === 'leitura') {
    return Boolean(
      leitura.bookId ||
      (leitura.metaPaginas && leitura.metaPaginas > 0) ||
      (leitura.metaMinutos && leitura.metaMinutos > 0) ||
      (leitura.atePagina && leitura.atePagina > 0),
    )
  }
  if (module === 'treino') {
    if (treino.tipo === 'musculacao') {
      return Boolean(treino.musculacao?.diaOuGrupo)
    }
    if (treino.tipo === 'cardio') {
      return Boolean(
        (treino.cardio?.metaDistancia && treino.cardio.metaDistancia > 0) ||
        (treino.cardio?.metaTempo && treino.cardio.metaTempo > 0),
      )
    }
    if (treino.tipo === 'outros') {
      return Boolean(
        treino.outros?.esporte || (treino.outros?.duracao && treino.outros.duracao > 0),
      )
    }
  }
  if (module === 'estudos') {
    return Boolean(
      estudos.vinculoTipo ||
      estudos.courseId ||
      estudos.estudoAutonomoNome ||
      estudos.tema ||
      (estudos.metaMinutos && estudos.metaMinutos > 0),
    )
  }
  if (module === 'trabalho') {
    return Boolean(trabalho.projectId || trabalho.sugerirConquista || trabalho.tipo !== 'tarefa')
  }
  return false
}
