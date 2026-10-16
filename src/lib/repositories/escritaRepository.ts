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
  ): Promise<EscritaNote> {
    const existing = await this.getNoteByDate(date)
    const now = new Date().toISOString()
    const note: EscritaNote = {
      id: existing ? existing.id : crypto.randomUUID(),
      date,
      title: data.title.trim(),
      body: data.body,
      tags: (data.tags || []).slice(0, 5),
      created: existing ? existing.created : now,
      updated: now,
    }
    await idb.put(idb.STORE_ESCRITA, note)
    return note
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
