import React, { useState, useRef } from 'react'
import { StudyCertificate } from '@/lib/types'
import { estudosRepository } from '@/lib/repositories/estudosRepository'
import { compressBookCover } from '@/lib/imageCompressor'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Award,
  Upload,
  FileText,
  Trash2,
  Edit2,
  ExternalLink,
  Eye,
  Camera,
  Download,
  AlertCircle,
  FileCheck,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface StudyCertificatesTabProps {
  courseId: string
  certificates: StudyCertificate[]
  onRefresh: () => void
}

export const StudyCertificatesTab: React.FC<StudyCertificatesTabProps> = ({
  courseId,
  certificates,
  onRefresh,
}) => {
  const { toast } = useToast()
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [viewingCert, setViewingCert] = useState<StudyCertificate | null>(null)
  const [editingCert, setEditingCert] = useState<StudyCertificate | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [deleteCertId, setDeleteCertId] = useState<string | null>(null)

  // Estados do formulário de upload
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadIssueDate, setUploadIssueDate] = useState('')
  const [selectedFileData, setSelectedFileData] = useState<string | null>(null)
  const [selectedFileType, setSelectedFileType] = useState<'pdf' | 'image'>('image')
  const [selectedFileName, setSelectedFileName] = useState('')
  const [selectedFileSize, setSelectedFileSize] = useState<number>(0)
  const [isProcessing, setIsProcessing] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelected = async (file: File) => {
    setIsProcessing(true)
    try {
      setSelectedFileName(file.name)
      setSelectedFileSize(file.size)

      if (!uploadTitle) {
        // Sugere título a partir do nome do arquivo
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')
        setUploadTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1))
      }

      if (file.type === 'application/pdf') {
        setSelectedFileType('pdf')
        // Lê PDF como base64 Data URL
        const reader = new FileReader()
        reader.onload = (e) => {
          setSelectedFileData(e.target?.result as string)
          setIsProcessing(false)
        }
        reader.onerror = () => {
          toast({
            title: 'Erro ao ler arquivo PDF',
            variant: 'destructive',
          })
          setIsProcessing(false)
        }
        reader.readAsDataURL(file)
      } else if (file.type.startsWith('image/')) {
        setSelectedFileType('image')
        // Comprime imagem para economizar espaço no IndexedDB
        const compressed = await compressBookCover(file)
        setSelectedFileData(compressed)
        setIsProcessing(false)
      } else {
        toast({
          title: 'Formato não suportado',
          description: 'Selecione um arquivo PDF ou imagem (PNG, JPG, JPEG).',
          variant: 'destructive',
        })
        setIsProcessing(false)
      }
    } catch {
      toast({
        title: 'Erro no processamento do arquivo',
        variant: 'destructive',
      })
      setIsProcessing(false)
    }
  }

  const handleSaveUpload = async () => {
    if (!uploadTitle.trim() || !selectedFileData) {
      toast({
        title: 'Dados incompletos',
        description: 'Informe o título e selecione um arquivo válido.',
        variant: 'destructive',
      })
      return
    }

    try {
      await estudosRepository.saveCertificate({
        courseId,
        title: uploadTitle.trim(),
        issueDate: uploadIssueDate || undefined,
        fileData: selectedFileData,
        fileType: selectedFileType,
        fileName: selectedFileName || 'certificado',
        fileSize: selectedFileSize,
      })

      toast({
        title: 'Certificado anexado! 📜',
        description: 'Arquivo salvo com sucesso no armazenamento local.',
      })

      setUploadModalOpen(false)
      setUploadTitle('')
      setUploadIssueDate('')
      setSelectedFileData(null)
      onRefresh()
    } catch {
      toast({
        title: 'Falha ao salvar certificado',
        variant: 'destructive',
      })
    }
  }

  const handleUpdateTitle = async () => {
    if (!editingCert || !newTitle.trim()) return
    await estudosRepository.updateCertificateTitle(editingCert.id, newTitle.trim())
    toast({ title: 'Título atualizado com sucesso' })
    setEditingCert(null)
    onRefresh()
  }

  const handleDelete = async () => {
    if (!deleteCertId) return
    await estudosRepository.deleteCertificate(deleteCertId)
    toast({ title: 'Certificado excluído' })
    setDeleteCertId(null)
    onRefresh()
  }

  const handleOpenFile = (cert: StudyCertificate) => {
    setViewingCert(cert)
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Cabeçalho da aba */}
      <div className="flex items-center justify-between pb-1">
        <div>
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Award className="w-4 h-4 text-[#8B5CF6]" />
            Certificados e Diplomas
          </h3>
          <p className="text-xs text-muted-foreground">
            Armazenados localmente para consulta offline a qualquer momento.
          </p>
        </div>

        <Button
          onClick={() => {
            setUploadTitle('')
            setUploadIssueDate('')
            setSelectedFileData(null)
            setSelectedFileName('')
            setUploadModalOpen(true)
          }}
          className="min-h-[44px] h-10 px-4 rounded-xl bg-[#8B5CF6] hover:bg-[#8B5CF6]/90 text-white font-semibold text-xs shadow-sm flex items-center gap-1.5"
        >
          <Upload className="w-4 h-4" /> Anexar Certificado
        </Button>
      </div>

      {/* Lista de Certificados */}
      {certificates.length === 0 ? (
        <div className="p-8 sm:p-10 text-center rounded-2xl border border-dashed border-border bg-card/40 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#8B5CF6]/10 text-[#8B5CF6] flex items-center justify-center mx-auto">
            <Award className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-foreground">Nenhum certificado anexado</h4>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Guarde os comprovantes e certificados de conclusão deste curso (PDF ou imagem).
            </p>
          </div>
          <Button
            onClick={() => setUploadModalOpen(true)}
            variant="outline"
            className="h-10 px-4 rounded-xl border-border text-xs font-semibold"
          >
            <Upload className="w-3.5 h-3.5 mr-1 text-[#8B5CF6]" /> Anexar primeiro certificado
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {certificates.map((cert) => {
            const isPdf = cert.fileType === 'pdf'

            return (
              <Card
                key={cert.id}
                className="rounded-2xl border-border bg-card shadow-subtle overflow-hidden hover:border-[#8B5CF6]/40 transition-all flex flex-col justify-between"
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-[#8B5CF6]/15 text-[#8B5CF6] flex items-center justify-center shrink-0">
                        {isPdf ? (
                          <FileText className="w-5 h-5" />
                        ) : (
                          <FileCheck className="w-5 h-5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-foreground line-clamp-1">
                          {cert.title}
                        </h4>
                        <p className="text-[11px] text-muted-foreground">
                          {isPdf ? 'Documento PDF' : 'Imagem'}
                          {cert.issueDate ? ` • Emitido em ${cert.issueDate}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-0.5 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingCert(cert)
                          setNewTitle(cert.title)
                        }}
                        className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg"
                        title="Renomear"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteCertId(cert.id)}
                        className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-lg"
                        title="Excluir"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Prévia se for imagem */}
                  {!isPdf && cert.fileData && (
                    <div
                      onClick={() => handleOpenFile(cert)}
                      className="cursor-pointer relative aspect-video w-full rounded-xl overflow-hidden border border-border/70 bg-muted/40 group"
                    >
                      <img
                        src={cert.fileData}
                        alt={cert.title}
                        className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-200"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium gap-1">
                        <Eye className="w-4 h-4" /> Visualizar
                      </div>
                    </div>
                  )}

                  {/* Ação para abrir */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenFile(cert)}
                    className="w-full h-9 rounded-xl text-xs font-semibold border-border gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5 text-[#8B5CF6]" />
                    Visualizar documento
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* MODAL DE UPLOAD / ANEXAR CERTIFICADO */}
      <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
        <DialogContent className="sm:max-w-md bg-card rounded-2xl p-5 sm:p-6 border border-border">
          <DialogHeader className="text-left space-y-1">
            <div className="flex items-center gap-2 text-[#8B5CF6]">
              <Award className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-wider">Novo Certificado</span>
            </div>
            <DialogTitle className="text-lg font-bold">Anexar Arquivo</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            {/* Título do certificado */}
            <div className="space-y-1.5">
              <Label htmlFor="cert-title" className="text-xs font-semibold">
                Título do certificado / diploma *
              </Label>
              <Input
                id="cert-title"
                placeholder="Ex.: Certificado de Conclusão, Diploma FIAP..."
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                className="rounded-xl text-xs sm:text-sm bg-background"
              />
            </div>

            {/* Data de emissão */}
            <div className="space-y-1.5">
              <Label htmlFor="cert-date" className="text-xs font-semibold">
                Data de emissão (opcional)
              </Label>
              <Input
                id="cert-date"
                type="date"
                value={uploadIssueDate}
                onChange={(e) => setUploadIssueDate(e.target.value)}
                className="rounded-xl text-xs bg-background"
              />
            </div>

            {/* Seletor de Arquivo (PDF ou Imagem) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Arquivo *</Label>

              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFileSelected(file)
                }}
              />

              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFileSelected(file)
                }}
              />

              {selectedFileData ? (
                <div className="p-3 rounded-xl border border-[#8B5CF6]/40 bg-[#8B5CF6]/5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-[#8B5CF6] text-white flex items-center justify-center shrink-0 text-xs font-bold">
                      {selectedFileType === 'pdf' ? 'PDF' : 'IMG'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground line-clamp-1">
                        {selectedFileName || 'Arquivo selecionado'}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Pronto para salvar offline
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedFileData(null)
                      setSelectedFileName('')
                    }}
                    className="text-xs text-muted-foreground hover:text-destructive h-8 px-2"
                  >
                    Trocar
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isProcessing}
                    className="min-h-[44px] h-12 rounded-xl text-xs font-semibold border-border gap-2 flex flex-col items-center justify-center"
                  >
                    <Upload className="w-4 h-4 text-[#8B5CF6]" />
                    <span>Arquivo ou Galeria</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={isProcessing}
                    className="min-h-[44px] h-12 rounded-xl text-xs font-semibold border-border gap-2 flex flex-col items-center justify-center"
                  >
                    <Camera className="w-4 h-4 text-[#8B5CF6]" />
                    <span>Tirar Foto (Câmera)</span>
                  </Button>
                </div>
              )}
            </div>

            <DialogFooter className="pt-2 flex flex-row gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setUploadModalOpen(false)}
                className="h-10 rounded-xl text-xs px-4"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleSaveUpload}
                disabled={isProcessing || !selectedFileData || !uploadTitle.trim()}
                className="h-10 rounded-xl text-xs px-5 bg-[#8B5CF6] hover:bg-[#8B5CF6]/90 text-white font-semibold"
              >
                Salvar Certificado
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL DE VISUALIZAÇÃO FULL SCREEN DO CERTIFICADO */}
      <Dialog open={Boolean(viewingCert)} onOpenChange={(val) => !val && setViewingCert(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card rounded-2xl p-5 border border-border">
          <DialogHeader className="text-left space-y-1">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Award className="w-4 h-4 text-[#8B5CF6]" />
              {viewingCert?.title}
            </DialogTitle>
            {viewingCert?.issueDate && (
              <p className="text-xs text-muted-foreground">
                Data de emissão: {viewingCert.issueDate}
              </p>
            )}
          </DialogHeader>

          <div className="py-2">
            {viewingCert?.fileType === 'pdf' ? (
              <div className="space-y-3">
                <iframe
                  src={viewingCert.fileData}
                  title={viewingCert.title}
                  className="w-full h-[60vh] rounded-xl border border-border"
                />
                <div className="flex justify-end">
                  <a
                    href={viewingCert.fileData}
                    download={viewingCert.fileName || `${viewingCert.title}.pdf`}
                    className="inline-flex items-center gap-1.5 text-xs text-[#8B5CF6] font-semibold hover:underline"
                  >
                    <Download className="w-3.5 h-3.5" /> Baixar PDF
                  </a>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-center">
                <div className="rounded-xl overflow-hidden border border-border bg-black/5 flex items-center justify-center max-h-[65vh]">
                  <img
                    src={viewingCert?.fileData}
                    alt={viewingCert?.title}
                    className="max-h-[60vh] w-auto object-contain rounded-lg shadow-sm"
                  />
                </div>
                <div className="flex justify-end">
                  <a
                    href={viewingCert?.fileData}
                    download={viewingCert?.fileName || `${viewingCert?.title}.jpg`}
                    className="inline-flex items-center gap-1.5 text-xs text-[#8B5CF6] font-semibold hover:underline"
                  >
                    <Download className="w-3.5 h-3.5" /> Baixar Imagem
                  </a>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setViewingCert(null)}
              className="h-10 rounded-xl text-xs px-4"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL DE RENOMEAR */}
      <Dialog open={Boolean(editingCert)} onOpenChange={(val) => !val && setEditingCert(null)}>
        <DialogContent className="sm:max-w-md bg-card rounded-2xl p-5 border border-border">
          <DialogHeader className="text-left space-y-1">
            <DialogTitle className="text-base font-bold">Renomear Certificado</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 pt-1">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Novo título..."
              className="rounded-xl text-xs sm:text-sm bg-background"
            />

            <DialogFooter className="pt-2 flex flex-row gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setEditingCert(null)}
                className="h-10 rounded-xl text-xs px-4"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleUpdateTitle}
                disabled={!newTitle.trim()}
                className="h-10 rounded-xl text-xs px-5 bg-[#8B5CF6] text-white hover:bg-[#8B5CF6]/90 font-semibold"
              >
                Salvar
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* CONFIRMAÇÃO DE EXCLUSÃO */}
      <AlertDialog
        open={Boolean(deleteCertId)}
        onOpenChange={(val) => !val && setDeleteCertId(null)}
      >
        <AlertDialogContent className="rounded-2xl bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir certificado?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              O arquivo será removido permanentemente deste dispositivo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl text-xs">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="rounded-xl text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
