/* ===========================================================================
   portal/invConfig.ts · Configuración de Apps Script para Inventario
   =========================================================================== */

export const INV_CFG = {
  apiUrl: 'https://script.google.com/macros/s/AKfycbz74169NY7gqzyW-y7K_WUQJuqMWNuZjmBS-TKfJMBa_f_nweEmDF47NuTcLlBkuAyKAg/exec',
  tabs: {
    detalle: 'InvDetalle',
    consolidado: 'InvConsolidado',
  },
  expiry: { mes1: 30, mes3: 91, mes6: 182 },
  lowStock: 50,
  cacheDays: 3,
}

/* ---- Cache en IndexedDB para inventario ---- */
const DB_NAME = 'educlinica-db'
const STORE_NAME = 'inv_cache'

function openIDB(): Promise<IDBDatabase | null> {
  return new Promise(resolve => {
    try {
      const req = indexedDB.open(DB_NAME, 1)
      req.onupgradeneeded = () => {
        try { req.result.createObjectStore(STORE_NAME) } catch { /* already exists */ }
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => resolve(null)
    } catch { resolve(null) }
  })
}

export async function kvGet(key: string): Promise<any> {
  const db = await openIDB()
  if (!db) return null
  return new Promise(resolve => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const req = tx.objectStore(STORE_NAME).get(key)
      req.onsuccess = () => resolve(req.result ?? null)
      req.onerror = () => resolve(null)
    } catch { resolve(null) }
  })
}

export async function kvSet(key: string, value: any): Promise<void> {
  const db = await openIDB()
  if (!db) return
  return new Promise(resolve => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      tx.objectStore(STORE_NAME).put(value, key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => resolve()
    } catch { resolve() }
  })
}

/* ---- Fetch desde Apps Script ---- */
export interface InvDetalle {
  Material: string
  Centro: string
  Almacén: string
  Lote: string
  FechaCaducidad: string
  CantidadDisp: number
  [key: string]: any
}

export interface InvConsolidado {
  Material: string
  [key: string]: any
}

export async function fetchFromAppsScript(): Promise<{ detalle: InvDetalle[]; consolidado: InvConsolidado[] } | null> {
  try {
    const u1 = `${INV_CFG.apiUrl}?tab=${encodeURIComponent(INV_CFG.tabs.detalle)}`
    const u2 = `${INV_CFG.apiUrl}?tab=${encodeURIComponent(INV_CFG.tabs.consolidado)}`
    const [dRes, cRes] = await Promise.all([
      fetch(u1).then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json() }),
      fetch(u2).then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json() }),
    ])
    return { detalle: Array.isArray(dRes) ? dRes : [], consolidado: Array.isArray(cRes) ? cRes : [] }
  } catch {
    return null
  }
}

export async function fetchWithCache(force = false): Promise<{ detalle: InvDetalle[]; consolidado: InvConsolidado[] } | null> {
  if (!force) {
    try {
      const cached = await kvGet('inv_cache')
      if (cached?.d && cached?.c) {
        const ageDays = (Date.now() - (cached.ts || 0)) / 86400000
        if (ageDays < INV_CFG.cacheDays) {
          return { detalle: cached.d, consolidado: cached.c }
        }
      }
    } catch { /* no cache */ }
  }

  const data = await fetchFromAppsScript()
  if (data) {
    kvSet('inv_cache', { ts: Date.now(), d: data.detalle, c: data.consolidado }).catch(() => {})
  }
  return data
}
