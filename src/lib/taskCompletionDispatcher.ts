import React from 'react'
import { Task } from '@/lib/types'
import { toast } from '@/hooks/use-toast'
import { ToastAction } from '@/components/ui/toast'

export type QuickRegisterHandler = (task: Task) => void

let registerHandler: QuickRegisterHandler | null = null

export function setTaskCompletionHandler(handler: QuickRegisterHandler | null) {
  registerHandler = handler
}

export function handleTaskCompletionWithToast(task: Task) {
  const hasModuleData = Boolean(
    task.moduleData &&
      task.moduleData.module &&
      task.moduleData.module !== 'geral' &&
      task.moduleData.data,
  )

  if (hasModuleData && registerHandler) {
    toast({
      title: 'Tarefa concluída!',
      description: `"${task.title}"`,
      duration: 6000,
      action: (
        <ToastAction
          altText="Registrar agora"
          onClick={() => {
            registerHandler?.(task)
          }}
          className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
        >
          Registrar agora
        </ToastAction>
      ),
    })
  } else {
    toast({
      title: 'Tarefa concluída',
      description: `"${task.title}"`,
      duration: 4000,
    })
  }
}
