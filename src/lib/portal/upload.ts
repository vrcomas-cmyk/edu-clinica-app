/* ===========================================================================
   portal/upload.ts · Detección de tipo de hoja, parseo Excel, ingesta a Supabase
   Port de data.js y supabaseData.js del portal original
   =========================================================================== */
import * as XLSX from 'xlsx'
import { norm } from './utils'

/* ---- Tipos de reporte detectables ---- */
export type ReportRole = 'fac' | 'sug' | 'cons' | 'rss' | 'lotes' | 'cond'

export const ROLE_LABELS: Record<ReportRole, string> = {
  fac: 'Resumen Facturación',
  sug: 'Sugerencias (BO)',
  cons: 'Reporte de Consumo',
  rss: 'Resumen Sin Sugerencias',
  lotes: 'Detalle Lotes',
  cond: 'Inventario por Condición',
}

/* ---- Detección de rol por firma de encabezados ---- */
export function roleOf(headers: string[]): ReportRole | null {
  const H = new Set(headers.map(norm))
  const has = (...c: string[]) => c.every(x => H.has(x))
  if (has('Material base', 'Fuente', 'Pedido')) return 'sug'
  if (has('Mes y año', 'Importe facturado', 'Material')) return 'fac'
  if (has('Consumo_actual', 'Ultimo mes facturacion')) return 'cons'
  if (has('Cantidad_Pendiente', 'Suma inventario', 'Centro', 'Almacen')) return 'rss'
  if (has('Lote', 'FechaCaducidad', 'CantidadDisp')) return 'lotes'
  if (has('Condicion', 'Material')) return 'cond'
  return null
}

/* ---- Parseo de Excel ---- */
export interface ParsedSheet {
  name: string
  rows: Record<string, any>[]
  role: ReportRole | null
}

export interface ParsedWorkbook {
  names: string[]
  sheets: Record<string, Record<string, any>[]>
  parsed: ParsedSheet[]
}

function fixRange(ws: XLSX.WorkSheet) {
  const cells = Object.keys(ws).filter(k => k[0] !== '!')
  if (!cells.length) return
  const r = { s: { r: Infinity, c: Infinity }, e: { r: 0, c: 0 } }
  cells.forEach(k => {
    const a = XLSX.utils.decode_cell(k)
    if (a.r < r.s.r) r.s.r = a.r
    if (a.c < r.s.c) r.s.c = a.c
    if (a.r > r.e.r) r.e.r = a.r
    if (a.c > r.e.c) r.e.c = a.c
  })
  ws['!ref'] = XLSX.utils.encode_range(r)
}

export function parseWorkbook(buf: ArrayBuffer): ParsedWorkbook {
  const wb = XLSX.read(buf, { type: 'array', cellDates: false })
  const sheets: Record<string, Record<string, any>[]> = {}
  const parsed: ParsedSheet[] = []

  wb.SheetNames.forEach(name => {
    const ws = wb.Sheets[name]
    fixRange(ws)
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '', raw: true }) as Record<string, any>[]
    sheets[name] = rows
    const headers = rows.length ? Object.keys(rows[0]) : []
    const role = roleOf(headers)
    parsed.push({ name, rows, role })
  })

  return { names: wb.SheetNames, sheets, parsed }
}

/* ---- Helpers ---- */
const S = (v: any) => (v == null ? '' : String(v).trim())
const N = (v: any) => {
  const x = parseFloat(String(v ?? '').replace(/[^0-9.\-]/g, ''))
  return isNaN(x) ? 0 : x
}

/* ---- Ingesta: Facturación mensual ---- */
export async function ingestFacturacion(
  supabase: any,
  rows: Record<string, any>[],
  uploadedBy: string | null,
  onProgress?: (done: number, total: number) => void,
): Promise<{ ok: boolean; done: number; error?: string }> {
  if (!supabase) return { ok: false, done: 0, error: 'Supabase no disponible' }
  if (!rows?.length) return { ok: false, done: 0, error: 'Sin filas' }

  try {
    // Limpiar tabla anterior
    const del = await supabase.from('facturacion_mensual').delete().gte('created_at', '2000-01-01')
    if (del.error) return { ok: false, done: 0, error: 'No se pudo limpiar: ' + del.error.message }

    const CH = 1000
    let done = 0
    for (let i = 0; i < rows.length; i += CH) {
      const batch = rows.slice(i, i + CH).map(r => {
        const my = S(r['Mes y año'] || r['Mes y anno'])
        const p = my.split('/')
        return {
          solicitante_codigo: S(r['Solicitante']),
          destinatario_codigo: S(r['Destinatario']),
          razon_social: S(r['Razón Social'] || r['Razon Social']),
          material: S(r['Material']),
          texto_material: S(r['Texto de material']),
          mes_anio: my,
          mes: parseInt(p[0], 10) || null,
          anio: parseInt(p[1], 10) || null,
          cantidad_facturada: N(r['Cantidad facturada']),
          importe_facturado: N(r['Importe facturado']),
          centro: S(r['Centro']),
          grupo_cliente: S(r['Gpo. Cte.'] || r['Grp. Cliente']),
          grupo_vendedor: S(r['Gpo. Vdor.'] || r['Gpo.Vdor.']),
          uploaded_by: uploadedBy,
        }
      })
      const ins = await supabase.from('facturacion_mensual').insert(batch)
      if (ins.error) return { ok: false, done, error: ins.error.message }
      done += batch.length
      onProgress?.(done, rows.length)
    }
    return { ok: true, done }
  } catch (e) {
    return { ok: false, done: 0, error: String(e) }
  }
}

/* ---- Ingesta: Consumo ---- */
export async function ingestConsumo(
  supabase: any,
  rows: Record<string, any>[],
  uploadedBy: string | null,
  onProgress?: (done: number, total: number) => void,
): Promise<{ ok: boolean; done: number; error?: string }> {
  if (!supabase) return { ok: false, done: 0, error: 'Supabase no disponible' }
  if (!rows?.length) return { ok: false, done: 0, error: 'Sin filas' }

  try {
    const del = await supabase.from('consumo').delete().gte('created_at', '2000-01-01')
    if (del.error) return { ok: false, done: 0, error: 'No se pudo limpiar: ' + del.error.message }

    const CH = 1000
    let done = 0
    for (let i = 0; i < rows.length; i += CH) {
      const batch = rows.slice(i, i + CH).map(r => ({
        centro: S(r['Centro']),
        grupo_cliente: S(r['Grp. Cliente'] || r['Gpo. Cte.']),
        solicitante_codigo: S(r['Solicitante']),
        destinatario_codigo: S(r['Destinatario']),
        razon_social: S(r['Razón Social'] || r['Razon Social']),
        material: S(r['Material']),
        texto_material: S(r['Texto Material']),
        consumo_actual: N(r['Consumo_actual']),
        consumo_promedio_mensual: N(r['Consumo_promedio_mensual']),
        tendencia: S(r['Tendencia']),
        ultimo_mes_facturacion: S(r['Ultimo mes facturacion']),
        cantidad_ultima: N(r['Cantidad ultima']),
        importe_ultima: N(r['Importe ultima']),
        penultima_fecha: S(r['Penultima_fecha']),
        cantidad_penultima: N(r['Cantidad_penultima']),
        importe_penultima: N(r['Importe_penultima']),
        ultima_facturacion_destinatario: S(r['Ultima_facturacion_destinatario']),
        precio_min: N(r['precio_min']) || null,
        precio_max: N(r['precio_max']) || null,
        precio_prom: N(r['precio_prom']) || null,
        precio_unitario_ultima: N(r['Precio_unitario_ultima']) || null,
        precio_unitario_penultima: N(r['Precio_unitario_penultima']) || null,
        uploaded_by: uploadedBy,
      }))
      const ins = await supabase.from('consumo').insert(batch)
      if (ins.error) return { ok: false, done, error: ins.error.message }
      done += batch.length
      onProgress?.(done, rows.length)
    }
    return { ok: true, done }
  } catch (e) {
    return { ok: false, done: 0, error: String(e) }
  }
}

/* ---- Ingesta: Sugerencias / BO ---- */
export async function ingestSugerencias(
  supabase: any,
  rows: Record<string, any>[],
  uploadedBy: string | null,
  onProgress?: (done: number, total: number) => void,
): Promise<{ ok: boolean; done: number; error?: string }> {
  if (!supabase) return { ok: false, done: 0, error: 'Supabase no disponible' }
  if (!rows?.length) return { ok: false, done: 0, error: 'Sin filas' }

  try {
    const del = await supabase.from('sugerencias').delete().gte('created_at', '2000-01-01')
    if (del.error) return { ok: false, done: 0, error: 'No se pudo limpiar: ' + del.error.message }

    const CH = 1000
    let done = 0
    for (let i = 0; i < rows.length; i += CH) {
      const batch = rows.slice(i, i + CH).map(r => ({
        grupo_cliente: S(r['Gpo. Cte.']),
        fecha: S(r['Fecha']),
        oc: S(r['OC']),
        pedido: S(r['Pedido']),
        grupo_vendedor: S(r['Gpo.Vdor.'] || r['Gpo. Vdor.']),
        solicitante_codigo: S(r['Solicitante']),
        destinatario_codigo: S(r['Destinatario']),
        razon_social: S(r['Razón Social'] || r['Razon Social']),
        centro_pedido: S(r['Centro pedido']),
        almacen: S(r['Almacén'] || r['Almacen']),
        material_solicitado: S(r['Material solicitado']),
        material_base: S(r['Material base']),
        descripcion_solicitada: S(r['Descripción solicitada'] || r['Descripcion solicitada']),
        cantidad_pedido: N(r['Cantidad pedido']),
        cantidad_pendiente: N(r['Cantidad pendiente']),
        cantidad_ofertar: N(r['Cantidad a Ofertar']),
        precio: N(r['Precio']),
        consumo_promedio: N(r['Consumo promedio']) || null,
        fuente: S(r['Fuente']),
        material_sugerido: S(r['Material sugerido']),
        descripcion_sugerida: S(r['Descripción sugerida'] || r['Descripcion sugerida']),
        centro_sugerido: S(r['Centro sugerido']),
        almacen_sugerido: S(r['Almacén sugerido'] || r['Almacen sugerido']),
        disponible: N(r['Disponible']) || null,
        lote: S(r['Lote']),
        fecha_caducidad: S(r['Fecha de Caducidad']),
        bloqueado: S(r['Bloqueado']),
        inv_1030: N(r['Inv 1030']) || null,
        inv_1031: N(r['Inv 1031']) || null,
        inv_1032: N(r['Inv 1032']) || null,
        inv_1036: N(r['Inv 1036']) || null,
        disponible_1031_1030: N(r['Disponible 1031-1030']) || null,
        disponible_1031_1032: N(r['Disponible 1031-1032']) || null,
        cant_transito: N(r['Cant. en Tránsito'] || r['Cant. en Transito']) || null,
        uploaded_by: uploadedBy,
      }))
      const ins = await supabase.from('sugerencias').insert(batch)
      if (ins.error) return { ok: false, done, error: ins.error.message }
      done += batch.length
      onProgress?.(done, rows.length)
    }
    return { ok: true, done }
  } catch (e) {
    return { ok: false, done: 0, error: String(e) }
  }
}

/* ---- Ingesta: RSS (Resumen Sin Sugerencias) → inventario ---- */
export async function ingestInventario(
  supabase: any,
  rows: Record<string, any>[],
  uploadedBy: string | null,
  onProgress?: (done: number, total: number) => void,
): Promise<{ ok: boolean; done: number; error?: string }> {
  if (!supabase) return { ok: false, done: 0, error: 'Supabase no disponible' }
  if (!rows?.length) return { ok: false, done: 0, error: 'Sin filas' }

  try {
    const del = await supabase.from('inventario').delete().gte('created_at', '2000-01-01')
    if (del.error) return { ok: false, done: 0, error: 'No se pudo limpiar: ' + del.error.message }

    const CH = 1000
    let done = 0
    for (let i = 0; i < rows.length; i += CH) {
      const batch = rows.slice(i, i + CH).map(r => ({
        material: S(r['Material']),
        texto_material: S(r['Texto breve de material'] || r['Texto Material']),
        condicion: S(r['Condicion'] || r['Condición']),
        grupo: S(r['Grupo'] || r['Descr. Grupo de Art.']),
        sector: S(r['Sector'] || r['Descr. Sector']),
        precio_oferta: N(r['Precio Oferta'] || r['Precio oferta']) || null,
        disponible_1030: N(r['Disponible 1031-1030'] || r['Inv 1030']) || null,
        disponible_1031: N(r['Inv 1031']) || null,
        disponible_1032: N(r['Disponible 1031-1032'] || r['Inv 1032']) || null,
        inv_suma: N(r['Inv Suma']) || null,
        importe_inventario: N(r['Importe Inventario $'] || r['Importe']) || null,
        uploaded_by: uploadedBy,
      }))
      const ins = await supabase.from('inventario').insert(batch)
      if (ins.error) return { ok: false, done, error: ins.error.message }
      done += batch.length
      onProgress?.(done, rows.length)
    }
    return { ok: true, done }
  } catch (e) {
    return { ok: false, done: 0, error: String(e) }
  }
}

/* ---- Ingesta de catálogos maestros (ejecutivos, grupos, solicitantes, destinatarios) ---- */
export async function ingestCatalogos(
  supabase: any,
  allSheets: Record<string, Record<string, any>[]>,
): Promise<{ ok: boolean; info: string }> {
  // Extraer códigos únicos de todas las hojas para poblar catálogos
  const ejecMap = new Map<string, { nombre: string; zona: string }>()
  const gpoMap = new Map<string, string>()
  const solicMap = new Map<string, { razon: string; gpo: string; gpoV: string }>()
  const destMap = new Map<string, { razon: string; centro: string }>()

  for (const rows of Object.values(allSheets)) {
    for (const r of rows) {
      // Ejecutivos (de Gpo.Vdor.)
      const gpoV = S(r['Gpo.Vdor.'] || r['Gpo. Vdor.'] || r['Grupo Vendedor'])
      if (gpoV && !ejecMap.has(gpoV)) ejecMap.set(gpoV, { nombre: gpoV, zona: gpoV })

      // Grupos de cliente
      const gpo = S(r['Gpo. Cte.'] || r['Grp. Cliente'])
      if (gpo && !gpoMap.has(gpo)) gpoMap.set(gpo, gpo)

      // Solicitantes
      const solic = S(r['Solicitante'])
      if (solic && !solicMap.has(solic)) {
        solicMap.set(solic, {
          razon: S(r['Razón Social'] || r['Razon Social']),
          gpo, gpoV,
        })
      }

      // Destinatarios
      const dest = S(r['Destinatario'])
      if (dest && !destMap.has(dest)) {
        destMap.set(dest, {
          razon: S(r['Razón Social'] || r['Razon Social']),
          centro: S(r['Centro'] || r['Centro pedido']),
        })
      }
    }
  }

  let count = 0

  // Upsert ejecutivos
  for (const [codigo, data] of ejecMap) {
    await supabase.from('ejecutivos').upsert({ codigo, nombre: data.nombre, zona: data.zona }, { onConflict: 'codigo' })
    count++
  }

  // Upsert grupos_cliente
  for (const [codigo, nombre] of gpoMap) {
    await supabase.from('grupos_cliente').upsert({ codigo, nombre }, { onConflict: 'codigo' })
    count++
  }

  // Upsert solicitantes
  for (const [codigo, data] of solicMap) {
    await supabase.from('solicitantes').upsert({
      codigo, razon_social: data.razon || codigo,
      grupo_vendedor: data.gpoV,
    }, { onConflict: 'codigo' })
    count++
  }

  // Upsert destinatarios
  for (const [codigo, data] of destMap) {
    await supabase.from('destinatarios').upsert({
      codigo, razon_social: data.razon || codigo,
      centro: data.centro,
    }, { onConflict: 'codigo' })
    count++
  }

  return { ok: true, info: `${count} registros de catálogo actualizados` }
}

/* ---- Upload a Supabase Storage + metadata ---- */
const BUCKET = 'portal-uploads'

export async function uploadPortalFile(
  supabase: any,
  buf: ArrayBuffer,
  meta: {
    fileName: string
    selected: string[]
    roles: Record<string, string>
    types: string[]
    uploadedBy: string | null
  },
): Promise<string | null> {
  if (!supabase) return null
  try {
    const base = meta.fileName
      .replace(/\.xlsx?$/i, '')
      .replace(/[^\w.\-]+/g, '_')
      .slice(0, 60)
    const path = `${Date.now()}_${base}.xlsx`
    const up = await supabase.storage
      .from(BUCKET)
      .upload(path, new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), { upsert: true })
    if (up.error) return null

    const types = meta.types.length ? meta.types : ['multi']
    for (const t of types) {
      await supabase.from('portal_uploads').update({ status: 'inactive' })
        .eq('report_type', t).eq('status', 'active')
      await supabase.from('portal_uploads').insert({
        report_type: t,
        filename: meta.fileName,
        storage_path: path,
        row_count: 0,
        uploaded_by: meta.uploadedBy,
        status: 'active',
      })
    }
    return path
  } catch {
    return null
  }
}

/* ---- Orquestador: procesar archivo completo ---- */
export interface UploadResult {
  fileName: string
  sheets: { name: string; role: ReportRole | null; rows: number }[]
  ingests: { type: ReportRole; ok: boolean; done: number; error?: string }[]
  catalogos: { ok: boolean; info: string }
  storagePath: string | null
}

export async function processUpload(
  supabase: any,
  buf: ArrayBuffer,
  fileName: string,
  uploadedBy: string | null,
  onProgress?: (msg: string) => void,
): Promise<UploadResult> {
  onProgress?.('Parseando archivo Excel...')
  const parsed = parseWorkbook(buf)

  const result: UploadResult = {
    fileName,
    sheets: parsed.parsed.map(p => ({ name: p.name, role: p.role, rows: p.rows.length })),
    ingests: [],
    catalogos: { ok: false, info: '' },
    storagePath: null,
  }

  // 1. Ingestar datos por tipo
  for (const p of parsed.parsed) {
    if (!p.role || !p.rows.length) continue
    onProgress?.(`Ingestando ${ROLE_LABELS[p.role]} (${p.rows.length} filas)...`)

    let res: { ok: boolean; done: number; error?: string }
    switch (p.role) {
      case 'fac':
        res = await ingestFacturacion(supabase, p.rows, uploadedBy)
        break
      case 'cons':
        res = await ingestConsumo(supabase, p.rows, uploadedBy)
        break
      case 'sug':
        res = await ingestSugerencias(supabase, p.rows, uploadedBy)
        break
      case 'rss':
      case 'cond':
        res = await ingestInventario(supabase, p.rows, uploadedBy)
        break
      default:
        continue
    }
    result.ingests.push({ type: p.role, ...res })
  }

  // 2. Poblar catálogos maestros
  onProgress?.('Actualizando catálogos (ejecutivos, grupos, solicitantes, destinatarios)...')
  result.catalogos = await ingestCatalogos(supabase, parsed.sheets)

  // 3. Subir archivo a Storage
  onProgress?.('Guardando archivo en Storage...')
  const types = parsed.parsed.filter(p => p.role).map(p => p.role!)
  result.storagePath = await uploadPortalFile(supabase, buf, {
    fileName,
    selected: parsed.names,
    roles: Object.fromEntries(parsed.parsed.filter(p => p.role).map(p => [p.role!, p.name])),
    types,
    uploadedBy,
  })

  return result
}
