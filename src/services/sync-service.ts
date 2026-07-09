import { supabase, isSupabaseConfigured } from '@/config/supabase'
import { db } from '@/lib/database'

type TableName = 'usuarios' | 'clientes' | 'contactos' | 'visitas' | 'visita_sectores' | 'actividades' | 'evidencias' | 'actividad_materiales'

const TABLE_MAP: Record<string, TableName> = {
  usuarios: 'usuarios',
  clientes: 'clientes',
  contactos: 'contactos',
  visitas: 'visitas',
  visita_sectores: 'visita_sectores',
  actividades: 'actividades',
  evidencias: 'evidencias',
  actividad_materiales: 'actividad_materiales',
}

export class SyncService {
  private isSyncing = false
  private syncInterval: ReturnType<typeof setInterval> | null = null

  startAutoSync(intervalMs: number = 30000) {
    if (this.syncInterval) clearInterval(this.syncInterval)
    this.syncInterval = setInterval(() => this.syncPendingChanges(), intervalMs)
  }

  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }
  }

  async syncPendingChanges(): Promise<void> {
    if (this.isSyncing || !isSupabaseConfigured() || !navigator.onLine) return

    this.isSyncing = true

    try {
      const pendingItems = await db.bitacora_sync
        .filter(b => !b.sincronizado)
        .limit(50)
        .toArray()

      for (const item of pendingItems) {
        try {
          const tableName = TABLE_MAP[item.tabla]
          if (!tableName) {
          await db.bitacora_sync.update(item.id, { sincronizado: true })
            continue
          }

          switch (item.operacion) {
            case 'INSERT': {
              const payload = item.payload as Record<string, unknown> | null
              if (payload) {
                const { error } = await supabase!.from(tableName).upsert(payload as any, { onConflict: 'id' })
                if (error) throw error
              }
              break
            }
            case 'UPDATE': {
              const payload = item.payload as Record<string, unknown> | null
              if (payload) {
                const { id: _id, ...updateData } = payload
                const { error } = await supabase!.from(tableName).update(updateData as any).eq('id', item.registro_id)
                if (error) throw error
              }
              break
            }
            case 'DELETE': {
              const { error } = await supabase!.from(tableName).delete().eq('id', item.registro_id)
              if (error) throw error
              break
            }
          }

          await db.bitacora_sync.update(item.id, { sincronizado: 1 } as any)
        } catch (error) {
          console.error(`Error syncing item ${item.id}:`, error)
          const newIntentos = (item.intentos || 0) + 1
          await db.bitacora_sync.update(item.id, {
            intentos: newIntentos,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        }
      }
    } catch (error) {
      console.error('Error in sync cycle:', error)
    } finally {
      this.isSyncing = false
    }
  }

  async forceSyncAll(): Promise<void> {
    if (!isSupabaseConfigured() || !navigator.onLine) return
    await this.pullRemoteChanges()
    await this.syncPendingChanges()
  }

  private async pullRemoteChanges() {
    const tables: TableName[] = ['clientes', 'contactos', 'visitas', 'actividades', 'evidencias']

    for (const table of tables) {
      try {
        const lastSync = localStorage.getItem(`lastSync_${table}`)
        let query = supabase!.from(table).select('*')

        if (lastSync) {
          query = query.gt('updated_at', lastSync) as typeof query
        }

        const { data, error } = await query
        if (error) throw error

        if (data && data.length > 0) {
          const localDb = db.table(table)
          for (const record of data) {
            const localRecord = await localDb.get(record.id)
            if (!localRecord) {
              await localDb.add(record)
            } else {
              const remoteUpdated = (record as any).updated_at
              const localUpdated = (localRecord as any).updated_at
              if (remoteUpdated && localUpdated && new Date(remoteUpdated) > new Date(localUpdated)) {
                await localDb.put(record)
              }
            }
          }
          localStorage.setItem(`lastSync_${table}`, new Date().toISOString())
        }
      } catch (error) {
        console.error(`Error pulling ${table}:`, error)
      }
    }
  }

  async getSyncStatus(): Promise<{
    pending: number
    syncing: number
    failed: number
    lastSync: string | null
  }> {
    const pending = await db.bitacora_sync.filter(b => !b.sincronizado).count()
    const failed = await db.bitacora_sync.filter(b => !!b.error && b.error !== '').count()

    const lastSyncItem = await db.bitacora_sync.orderBy('created_at').reverse().first()

    return {
      pending,
      syncing: 0,
      failed,
      lastSync: lastSyncItem?.created_at || null,
    }
  }

  async retryFailedItems(): Promise<void> {
    const failedItems = await db.bitacora_sync.where('error').notEqual('').toArray()
    for (const item of failedItems) {
      await db.bitacora_sync.update(item.id, { intentos: 0, error: null })
    }
    await this.syncPendingChanges()
  }

  async clearSyncQueue(): Promise<void> {
    await db.bitacora_sync.clear()
  }
}

export const syncService = new SyncService()
