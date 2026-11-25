import { db } from '@/db/dexie'
import { supabase } from '@/lib/supabase'

type SyncableTable = 'patients' | 'prenatal_visits' | 'immunizations'

export interface SyncResult {
  syncedCount: number
  failedCount: number
  lastError: string | null
}

/**
 * Saves a record locally to IndexedDB first, then queues it for Supabase sync.
 */
export async function saveOfflineRecord<T extends { id: string; updated_at: string; synced?: number }>(
  tableName: SyncableTable,
  record: T
): Promise<SyncResult> {
  const localRecord = { ...record, synced: 0 }

  // 1. Write immediately to local IndexedDB
  await (db[tableName] as any).put(localRecord)

  // 2. Strip local-only `synced` flag before queuing for Supabase
  const { synced, ...cloudPayload } = localRecord

  // Remove any older pending UPSERT for the same record so only latest state syncs
  const existingQueueItems = await db.sync_queue
    .where('record_id')
    .equals(record.id)
    .toArray()

  for (const existing of existingQueueItems) {
    if (existing.operation === 'UPSERT' && existing.queue_id !== undefined) {
      await db.sync_queue.delete(existing.queue_id)
    }
  }

  await db.sync_queue.add({
    table_name: tableName,
    operation: 'UPSERT',
    record_id: record.id,
    payload: cloudPayload,
    created_at: new Date().toISOString()
  })

  // 3. Attempt immediate background sync if online
  if (navigator.onLine) {
    return await processSyncQueue()
  }

  return { syncedCount: 0, failedCount: 0, lastError: null }
}

/**
 * Processes all pending items in `sync_queue` and pushes them to Supabase.
 */
export async function processSyncQueue(): Promise<SyncResult> {
  if (!navigator.onLine) {
    return { syncedCount: 0, failedCount: 0, lastError: 'Device is offline.' }
  }

  const pendingItems = await db.sync_queue.orderBy('queue_id').toArray()
  if (pendingItems.length === 0) {
    return { syncedCount: 0, failedCount: 0, lastError: null }
  }

  let syncedCount = 0
  let failedCount = 0
  let lastError: string | null = null

  for (const item of pendingItems) {
    try {
      if (item.operation === 'UPSERT') {
        const { error } = await supabase
          .from(item.table_name)
          .upsert(item.payload, { onConflict: 'id' })

        if (error) throw error
      } else if (item.operation === 'DELETE') {
        const { error } = await supabase
          .from(item.table_name)
          .delete()
          .eq('id', item.record_id)

        if (error) throw error
      }

      if (item.operation === 'UPSERT') {
        await (db[item.table_name] as any).update(item.record_id, { synced: 1 })
      }
      if (item.queue_id !== undefined) {
        await db.sync_queue.delete(item.queue_id)
      }
      syncedCount++
    } catch (err: any) {
      failedCount++
      lastError = err?.message || `Failed to sync ${item.table_name}`
      console.error(`Sync failed for ${item.table_name} (${item.record_id}):`, err)
    }
  }

  return { syncedCount, failedCount, lastError }
}

/**
 * Pulls latest cloud records from Supabase into local IndexedDB cache
 * without overwriting local records that still have pending offline changes.
 */
export async function pullFromCloud(): Promise<{ error: string | null }> {
  if (!navigator.onLine) return { error: 'Device is offline.' }

  const tables: SyncableTable[] = ['patients', 'prenatal_visits', 'immunizations']

  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*')
    if (error) {
      console.error(`Pull failed for ${table}:`, error)
      return { error: error.message }
    }

    if (data) {
      // Find IDs that currently have unsynced local changes so we don't clobber them
      const unsyncedLocal = await (db[table] as any)
        .where('synced')
        .equals(0)
        .toArray()
      const unsyncedIds = new Set(unsyncedLocal.map((r: any) => r.id))

      const safeCloudRecords = data
        .filter((row) => !unsyncedIds.has(row.id))
        .map((row) => ({ ...row, synced: 1 }))

      if (safeCloudRecords.length > 0) {
        await (db[table] as any).bulkPut(safeCloudRecords)
      }
    }
  }

  return { error: null }
}

/**
 * Initializes automatic sync whenever the browser reconnects to the internet.
 */
export function initAutoSync() {
  window.addEventListener('online', () => {
    console.log('Connection restored. Syncing offline records...')
    processSyncQueue()
  })

  if (navigator.onLine) {
    processSyncQueue()
  }
}