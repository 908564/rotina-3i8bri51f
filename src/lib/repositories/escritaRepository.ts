import { idb } from '../indexedDb'
import { EscritaNote } from '../types'

export const escritaRepository = {
  async getNotes(): Promise<EscritaNote[]> {
    const list = await idb.getAll<EscritaNote>(idb.STORE_ESCRITA)
    return list.sort((a, b) => b.date.localeCompare(a.date))
  },

  async getNoteByDate(date: string): Promise<EscritaNote | undefined> {
    const db = await idb.getDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(idb.STORE_ESCRITA, 'readonly')
      const store = tx.objectStore(idb.STORE_ESCRITA)
      const index = store.index('date')
      const request = index.get(date)
      request.onsuccess = () => resolve(request.result as EscritaNote | undefined)
      request.onerror = () => reject(request.error)
    })
  },

  async saveNote(
    date: string,
    data: { title: string; body: string; tags: string[] },
  ): Promise<EscritaNote | null> {
    const trimmedTitle = data.title.trim()
    const trimmedBody = data.body.trim()
    const cleanTags = (data.tags || []).slice(0, 5)
    const isEmpty = !trimmedTitle && !trimmedBody && cleanTags.length === 0

    return idb.runTransaction<EscritaNote | null>(idb.STORE_ESCRITA, 'readwrite', (tx) => {
      return new Promise<EscritaNote | null>((resolve, reject) => {
        const store = tx.objectStore(idb.STORE_ESCRITA)
        const index = store.index('date')
        const getReq = index.get(date)

        getReq.onerror = () => reject(getReq.error)
        getReq.onsuccess = () => {
          const existing = getReq.result as EscritaNote | undefined

          if (isEmpty) {
            if (existing) {
              const delReq = store.delete(existing.id)
              delReq.onerror = () => reject(delReq.error)
              delReq.onsuccess = () => resolve(null)
            } else {
              resolve(null)
            }
            return
          }

          const now = new Date().toISOString()
          const note: EscritaNote = {
            id: existing ? existing.id : crypto.randomUUID(),
            date,
            title: trimmedTitle,
            body: data.body,
            tags: cleanTags,
            created: existing ? existing.created : now,
            updated: now,
          }

          const putReq = store.put(note)
          putReq.onerror = () => reject(putReq.error)
          putReq.onsuccess = () => resolve(note)
        }
      })
    })
  },

  async deleteNote(id: string): Promise<void> {
    await idb.delete(idb.STORE_ESCRITA, id)
  },

  async searchNotes(query: string): Promise<EscritaNote[]> {
    const q = query.trim().toLowerCase()
    if (!q) return []
    const all = await this.getNotes()
    return all.filter((n) => {
      const matchTitle = (n.title || '').toLowerCase().includes(q)
      const matchBody = (n.body || '').toLowerCase().includes(q)
      const matchTags = (n.tags || []).some((t) => t.toLowerCase().includes(q))
      return matchTitle || matchBody || matchTags
    })
  },
}
