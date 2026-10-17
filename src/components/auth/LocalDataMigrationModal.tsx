import React, { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { backupRepository } from '@/lib/repositories/backupRepository'
import { idb } from '@/lib/indexedDb'
import { recordOutboxStandalone } from '@/lib/sync/outboxHelper'
import { syncEngine } from '@/lib/sync/syncEngine'
import { useToast } from '@/hooks/use-toast'
import { CloudUpload, Database, Loader2, CheckCircle2 } from 'lucide-react'

interface LocalDataSummary {
  total: number
  notes: number
  books: number
  workouts: number
  courses: number
  projects: number
}

interface LocalDataMigrationModalProps {
  userId: string
  onDone: () => void
  onDismiss: () => void
}

export const LocalDataMigrationModal: React.FC<LocalDataMigrationModalProps> = ({
  userId,
  onDone,
  onDismiss,
}) => {
  const [summary, setSummary] = useState<LocalDataSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const { toast } = useToast()

  React.useEffect(() => {
    async function loadCounts() {
      const [notes, books, workoutPlans, workoutLogs, courses, projects] = await Promise.all([
        idb.getAll(idb.STORE_ESCRITA),
        idb.getAll(idb.STORE_LIVROS),
        idb.getAll(idb.STORE_TREINO_PLANO),
        idb.getAll(idb.STORE_TREINO_LOG),
        idb.getAll(idb.STORE_COURSES),
        idb.getAll(idb.STORE_PROJECTS),
      ])

      const total =
        notes.length +
        books.length +
        workoutPlans.length +
        workoutLogs.length +
        courses.length +
        projects.length

      setSummary({
        total,
        notes: notes.length,
        books: books.length,
        workouts: workoutPlans.length + workoutLogs.length,
        courses: courses.length,
        projects: projects.length,
      })
    }

    loadCounts()
  }, [])

  const handleMigrate = async () => {
    setLoading(true)
    try {
      // 1. Gera backup automático em JSON antes de enviar para a nuvem
      const payload = await backupRepository.exportAll()
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `rotina_backup_seguranca_${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)

      // 2. Coloca todos os registros locais existentes no outbox
      const [
        notes,
        books,
        bookNotes,
        readingHist,
        plans,
        workoutLogs,
        courses,
        studyPages,
        studyCerts,
        studySessions,
        studyGoals,
        projects,
        achievements,
        experiences,
        workNotes,
        daySummaries,
      ] = await Promise.all([
        idb.getAll<any>(idb.STORE_ESCRITA),
        idb.getAll<any>(idb.STORE_LIVROS),
        idb.getAll<any>(idb.STORE_LIVRO_ANOTACOES),
        idb.getAll<any>(idb.STORE_LEITURA_HISTORICO),
        idb.getAll<any>(idb.STORE_TREINO_PLANO),
        idb.getAll<any>(idb.STORE_TREINO_LOG),
        idb.getAll<any>(idb.STORE_COURSES),
        idb.getAll<any>(idb.STORE_STUDY_PAGES),
        idb.getAll<any>(idb.STORE_STUDY_CERTIFICATES),
        idb.getAll<any>(idb.STORE_STUDY_SESSIONS),
        idb.getAll<any>(idb.STORE_STUDY_GOALS),
        idb.getAll<any>(idb.STORE_PROJECTS),
        idb.getAll<any>(idb.STORE_ACHIEVEMENTS),
        idb.getAll<any>(idb.STORE_EXPERIENCES),
        idb.getAll<any>(idb.STORE_WORK_NOTES),
        idb.getAll<any>(idb.STORE_DAY_SUMMARIES),
      ])

      const enqueuePromises: Promise<void>[] = []
      notes.forEach((item) =>
        enqueuePromises.push(recordOutboxStandalone('note', item.id, 'upsert', item)),
      )
      books.forEach((item) =>
        enqueuePromises.push(recordOutboxStandalone('book', item.id, 'upsert', item)),
      )
      bookNotes.forEach((item) =>
        enqueuePromises.push(recordOutboxStandalone('bookNote', item.id, 'upsert', item)),
      )
      readingHist.forEach((item) =>
        enqueuePromises.push(recordOutboxStandalone('readingLog', item.id, 'upsert', item)),
      )
      plans.forEach((item) =>
        enqueuePromises.push(recordOutboxStandalone('workoutPlanDay', item.id, 'upsert', item)),
      )
      workoutLogs.forEach((item) =>
        enqueuePromises.push(recordOutboxStandalone('workoutLog', item.id, 'upsert', item)),
      )
      courses.forEach((item) =>
        enqueuePromises.push(recordOutboxStandalone('course', item.id, 'upsert', item)),
      )
      studyPages.forEach((item) =>
        enqueuePromises.push(recordOutboxStandalone('studyPage', item.id, 'upsert', item)),
      )
      studyCerts.forEach((item) =>
        enqueuePromises.push(recordOutboxStandalone('certificate', item.id, 'upsert', item)),
      )
      studySessions.forEach((item) =>
        enqueuePromises.push(recordOutboxStandalone('studySession', item.id, 'upsert', item)),
      )
      studyGoals.forEach((item) =>
        enqueuePromises.push(recordOutboxStandalone('studyGoal', item.id, 'upsert', item)),
      )
      projects.forEach((item) =>
        enqueuePromises.push(recordOutboxStandalone('project', item.id, 'upsert', item)),
      )
      achievements.forEach((item) =>
        enqueuePromises.push(recordOutboxStandalone('achievement', item.id, 'upsert', item)),
      )
      experiences.forEach((item) =>
        enqueuePromises.push(recordOutboxStandalone('experience', item.id, 'upsert', item)),
      )
      workNotes.forEach((item) =>
        enqueuePromises.push(recordOutboxStandalone('workNote', item.id, 'upsert', item)),
      )
      daySummaries.forEach((item) =>
        enqueuePromises.push(recordOutboxStandalone('daySummary', item.date, 'upsert', item)),
      )

      await Promise.all(enqueuePromises)
      setProgress(50)

      // 3. Dispara sincronização
      await syncEngine.sync()
      setProgress(100)

      toast({
        title: 'Migração concluída!',
        description: 'Seus dados locais foram enviados com sucesso para sua conta.',
      })
      onDone()
    } catch (err: any) {
      toast({
        title: 'Erro na migração',
        description: err?.message || 'Falha ao sincronizar dados locais.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  if (!summary || summary.total === 0) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <Card className="w-full max-w-md rounded-2xl bg-card border-border shadow-xl">
        <CardContent className="p-6 sm:p-8 space-y-6">
          <div className="w-12 h-12 rounded-2xl bg-[#F59E4C]/10 text-[#F59E4C] flex items-center justify-center mx-auto">
            <CloudUpload className="w-6 h-6" />
          </div>

          <div className="text-center space-y-2">
            <h2 className="text-xl font-bold text-foreground">
              Enviar dados locais para sua conta?
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Encontramos <strong>{summary.total} registros</strong> salvos neste aparelho. Deseja
              enviá-los para sua conta para sincronizar entre todos os seus dispositivos?
            </p>
          </div>

          <div className="bg-muted/40 rounded-xl p-3 text-xs space-y-1.5 border border-border/50">
            <div className="font-semibold text-foreground pb-1 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-[#F59E4C]" />
              Resumo por módulo:
            </div>
            <div className="grid grid-cols-2 gap-2 text-muted-foreground">
              <div>
                Escrita: <strong className="text-foreground">{summary.notes}</strong>
              </div>
              <div>
                Leitura: <strong className="text-foreground">{summary.books}</strong>
              </div>
              <div>
                Treino: <strong className="text-foreground">{summary.workouts}</strong>
              </div>
              <div>
                Estudos: <strong className="text-foreground">{summary.courses}</strong>
              </div>
              <div>
                Trabalho: <strong className="text-foreground">{summary.projects}</strong>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground text-center">
            Um backup de segurança do seu banco local será baixado automaticamente antes do envio.
          </p>

          <div className="space-y-2 pt-1">
            <Button
              onClick={handleMigrate}
              disabled={loading}
              className="w-full h-12 rounded-xl text-sm font-semibold bg-[#F59E4C] hover:bg-[#F59E4C]/90 text-white"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Enviando ({progress}%)...
                </span>
              ) : (
                'Enviar e sincronizar'
              )}
            </Button>
            <Button
              variant="ghost"
              onClick={onDismiss}
              disabled={loading}
              className="w-full h-11 rounded-xl text-xs text-muted-foreground"
            >
              Agora não
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
