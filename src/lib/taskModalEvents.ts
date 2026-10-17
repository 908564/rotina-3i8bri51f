import { TaskModuleData } from './types'

export interface TaskModalContext {
  module?: 'escrita' | 'leitura' | 'treino' | 'estudos' | 'trabalho' | 'geral'
  link?: {
    type: 'book' | 'course' | 'project' | 'workoutDay'
    id: string
  }
  dueDate?: string | null
  taskId?: string // Quando fornecido, abre em modo edição
  moduleData?: TaskModuleData | null
  initialTitle?: string
}

let openModalHandler: ((context?: TaskModalContext) => void) | null = null

export function registerTaskModal(handler: (context?: TaskModalContext) => void): () => void {
  openModalHandler = handler
  return () => {
    if (openModalHandler === handler) {
      openModalHandler = null
    }
  }
}

export function openTaskModal(context?: TaskModalContext): void {
  if (openModalHandler) {
    openModalHandler(context)
  } else {
    // Fallback: evento customizado caso o componente ainda não tenha se registrado diretamente
    window.dispatchEvent(new CustomEvent('rotina:open-task-modal', { detail: context }))
  }
}
