import { idb } from '../indexedDb'
import { SyncEntity, SyncOperation, SyncOutboxItem } from '../types'

/**
 * Adiciona uma alteração à fila de outbox de sincronização dentro de uma transação existente.
 * Se já houver um item pendente para a mesma entidade e clientId, atualiza ou funde para não inflar a fila.
 */
export function recordOutboxInTx(
  tx: IDBTransaction,
  entity: SyncEntity,
  clientId: string,
  operation: SyncOperation,
  data?: any,
): void {
  const store = tx.objectStore(idb.STORE_SYNC_OUTBOX)
  const item: SyncOutboxItem = {
    id: crypto.randomUUID(),
    entity,
    clientId,
    operation,
    data: operation === 'upsert' ? data : undefined,
    attempts: 0,
    timestamp: new Date().toISOString(),
  }
  store.put(item)
}

/**
 * Adiciona uma alteração à fila de outbox abrindo sua própria transação caso uma transação não tenha sido fornecida.
 */
export async function recordOutboxStandalone(
  entity: SyncEntity,
  clientId: string,
  operation: SyncOperation,
  data?: any,
): Promise<void> {
  await idb.runTransaction(idb.STORE_SYNC_OUTBOX, 'readwrite', (tx) => {
    recordOutboxInTx(tx, entity, clientId, operation, data)
  })
}
