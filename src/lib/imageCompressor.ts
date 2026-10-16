/**
 * Utilitário de compressão de foto de livro:
 * - Redimensiona para no máximo 800px de largura mantendo a proporção
 * - Codifica em JPEG com qualidade 0.7
 * - Retorna data URL Base64 pronta para salvar no IndexedDB
 */

export async function compressImage(
  file: File,
  options?: { maxWidth?: number; quality?: number },
): Promise<string> {
  const maxWidth = options?.maxWidth ?? 800
  const quality = options?.quality ?? 0.7

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Erro ao ler o arquivo de imagem'))
    reader.onload = (e) => {
      const img = new Image()
      img.onerror = () => reject(new Error('Não foi possível processar a imagem. Tente novamente.'))
      img.onload = () => {
        let width = img.width
        let height = img.height

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width)
          width = maxWidth
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Falha ao inicializar o processador gráfico do navegador.'))
          return
        }

        ctx.drawImage(img, 0, 0, width, height)
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality)
        resolve(compressedDataUrl)
      }
      img.src = e.target?.result as string
    }
    reader.readAsDataURL(file)
  })
}

/**
 * Utilitário de compressão de foto de livro:
 * - Redimensiona para no máximo 800px de largura mantendo a proporção
 * - Codifica em JPEG com qualidade 0.7
 * - Retorna data URL Base64 pronta para salvar no IndexedDB
 */
export async function compressBookCover(file: File): Promise<string> {
  return compressImage(file, { maxWidth: 800, quality: 0.7 })
}

/**
 * Utilitário de compressão de certificado/diploma:
 * - Redimensiona para no máximo 1600px de largura mantendo a legibilidade
 * - Codifica em JPEG com qualidade 0.8
 * - Retorna data URL Base64 pronta para salvar no IndexedDB
 */
export async function compressCertificateImage(file: File): Promise<string> {
  return compressImage(file, { maxWidth: 1600, quality: 0.8 })
}
