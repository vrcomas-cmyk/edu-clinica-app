import Dexie, { type Table } from 'dexie'
import type {
  Usuario,
  Cliente,
  Contacto,
  Visita,
  VisitaSector,
  Actividad,
  Evidencia,
  CatSector,
  CatTipoActividad,
  Material,
  ActividadMaterial,
  BitacoraSync,
  Comentario,
} from '../types/database'

class EduClinicaDB extends Dexie {
  usuarios!: Table<Usuario>
  clientes!: Table<Cliente>
  contactos!: Table<Contacto>
  visitas!: Table<Visita>
  visita_sectores!: Table<VisitaSector>
  actividades!: Table<Actividad>
  evidencias!: Table<Evidencia>
  cat_sector!: Table<CatSector>
  cat_tipo_actividad!: Table<CatTipoActividad>
  materiales!: Table<Material>
  actividad_materiales!: Table<ActividadMaterial>
  comentarios!: Table<Comentario>
  bitacora_sync!: Table<BitacoraSync>

  constructor() {
    super('educlinica-db')

    this.version(1).stores({
      usuarios: 'id, auth_uid, correo, nombre',
      clientes: 'id, no_cliente, razon_social, educador_asignado, deleted_at',
      contactos: 'id, cliente_id, nombre, deleted_at',
      visitas: 'id, educador_id, cliente_id, fecha_visita, status, deleted_at',
      visita_sectores: 'id, visita_id, sector_id, deleted_at',
      actividades: 'id, visita_id, sector_previsto_id, tipo_actividad_id, estado_actividad, deleted_at',
      evidencias: 'id, actividad_id, tipo, deleted_at',
      cat_sector: 'id, nombre',
      cat_tipo_actividad: 'id, nombre',
      materiales: 'id, codigo, nombre, sector_id',
      actividad_materiales: 'id, actividad_id, material_id, sector_id',
      comentarios: 'id, visita_id, cliente_id, usuario_id, created_at',
      bitacora_sync: 'id, tabla, registro_id, operacion, sincronizado',
    })
  }
}

export const db = new EduClinicaDB()

// ─── Helpers: Usarios ────────────────────────────────────────────────────────

export const usuariosDB = {
  async getAll() {
    return db.usuarios.toArray()
  },

  async getById(id: string) {
    return db.usuarios.get(id)
  },

  async getByAuthUid(authUid: string) {
    return db.usuarios.where('auth_uid').equals(authUid).first()
  },

  async create(usuario: Omit<Usuario, 'id'>) {
    const newUsuario: Usuario = {
      ...usuario,
      id: crypto.randomUUID(),
    }
    await db.usuarios.add(newUsuario)
    await addToBitacora('usuarios', newUsuario.id, 'INSERT', newUsuario)
    return newUsuario
  },

  async update(id: string, data: Partial<Usuario>) {
    await db.usuarios.update(id, data)
    const usuario = await db.usuarios.get(id)
    if (usuario) {
      await addToBitacora('usuarios', id, 'UPDATE', usuario)
    }
    return usuario
  },

  async delete(id: string) {
    await db.usuarios.delete(id)
    await addToBitacora('usuarios', id, 'DELETE')
  },
}

// ─── Helpers: Clientes ───────────────────────────────────────────────────────

export const clientesDB = {
  async getAll() {
    return db.clientes.filter(c => !c.deleted_at).toArray()
  },

  async getById(id: string) {
    return db.clientes.get(id)
  },

  async getByEducador(educadorId: string) {
    return db.clientes
      .where('educador_asignado')
      .equals(educadorId)
      .filter(c => !c.deleted_at)
      .toArray()
  },

  async create(cliente: Omit<Cliente, 'id' | 'rev'>) {
    const newCliente: Cliente = {
      ...cliente,
      id: crypto.randomUUID(),
      rev: 1,
    }
    await db.clientes.add(newCliente)
    await addToBitacora('clientes', newCliente.id, 'INSERT', newCliente)
    return newCliente
  },

  async update(id: string, data: Partial<Cliente>) {
    await db.clientes.update(id, { ...data })
    const cliente = await db.clientes.get(id)
    if (cliente) {
      await addToBitacora('clientes', id, 'UPDATE', cliente)
    }
    return cliente
  },

  async softDelete(id: string) {
    await db.clientes.update(id, { deleted_at: new Date().toISOString() })
    const cliente = await db.clientes.get(id)
    if (cliente) {
      await addToBitacora('clientes', id, 'UPDATE', cliente)
    }
  },

  async search(query: string) {
    const lowerQuery = query.toLowerCase()
    return db.clientes
      .filter(c =>
        (c.deleted_at === null || c.deleted_at === undefined) && (
          c.razon_social.toLowerCase().includes(lowerQuery) ||
          c.no_cliente.toLowerCase().includes(lowerQuery) ||
          `${c.no_cliente} ${c.razon_social}`.toLowerCase().includes(lowerQuery) ||
          (c.poblacion ?? '').toLowerCase().includes(lowerQuery) ||
          (c.rfc ?? '').toLowerCase().includes(lowerQuery)
        )
      )
      .toArray()
  },
}

// ─── Helpers: Contactos ──────────────────────────────────────────────────────

export const contactosDB = {
  async getAll() {
    return db.contactos.filter(c => !c.deleted_at).toArray()
  },

  async getById(id: string) {
    return db.contactos.get(id)
  },

  async getByCliente(clienteId: string) {
    return db.contactos
      .where('cliente_id')
      .equals(clienteId)
      .filter(c => !c.deleted_at)
      .toArray()
  },

  async create(contacto: Omit<Contacto, 'id' | 'rev'>) {
    const newContacto: Contacto = {
      ...contacto,
      id: crypto.randomUUID(),
      rev: 1,
    }
    await db.contactos.add(newContacto)
    await addToBitacora('contactos', newContacto.id, 'INSERT', newContacto)
    return newContacto
  },

  async update(id: string, data: Partial<Contacto>) {
    await db.contactos.update(id, data)
    const contacto = await db.contactos.get(id)
    if (contacto) {
      await addToBitacora('contactos', id, 'UPDATE', contacto)
    }
    return contacto
  },

  async softDelete(id: string) {
    await db.contactos.update(id, { deleted_at: new Date().toISOString() })
    const contacto = await db.contactos.get(id)
    if (contacto) {
      await addToBitacora('contactos', id, 'UPDATE', contacto)
    }
  },
}

// ─── Helpers: Visitas ────────────────────────────────────────────────────────

export const visitasDB = {
  async getAll() {
    return db.visitas.filter(v => !v.deleted_at).toArray()
  },

  async getById(id: string) {
    return db.visitas.get(id)
  },

  async getByEducador(educadorId: string) {
    return db.visitas
      .where('educador_id')
      .equals(educadorId)
      .filter(v => !v.deleted_at)
      .toArray()
  },

  async getByCliente(clienteId: string) {
    return db.visitas
      .where('cliente_id')
      .equals(clienteId)
      .filter(v => !v.deleted_at)
      .toArray()
  },

  async getByDateRange(startDate: string, endDate: string) {
    return db.visitas
      .where('fecha_visita')
      .between(startDate, endDate, true, true)
      .filter(v => !v.deleted_at)
      .toArray()
  },

  async create(visita: Omit<Visita, 'id' | 'rev'>) {
    const newVisita: Visita = {
      ...visita,
      id: crypto.randomUUID(),
      rev: 1,
    }
    await db.visitas.add(newVisita)
    await addToBitacora('visitas', newVisita.id, 'INSERT', newVisita)
    return newVisita
  },

  async update(id: string, data: Partial<Visita>) {
    await db.visitas.update(id, data)
    const visita = await db.visitas.get(id)
    if (visita) {
      await addToBitacora('visitas', id, 'UPDATE', visita)
    }
    return visita
  },

  async softDelete(id: string) {
    await db.visitas.update(id, { deleted_at: new Date().toISOString() })
    const visita = await db.visitas.get(id)
    if (visita) {
      await addToBitacora('visitas', id, 'UPDATE', visita)
    }
  },

  async checkIn(id: string, location: { lat: number; lng: number }) {
    const now = new Date()
    await db.visitas.update(id, {
      fecha_llegada: now.toISOString().split('T')[0],
      hora_llegada: now.toTimeString().split(' ')[0].substring(0, 5),
      lat_llegada: location.lat,
      lng_llegada: location.lng,
    })
    const visita = await db.visitas.get(id)
    if (visita) {
      await addToBitacora('visitas', id, 'UPDATE', visita)
    }
    return visita
  },

  async checkOut(id: string, location: { lat: number; lng: number }) {
    const now = new Date()
    await db.visitas.update(id, {
      status: 'Completo',
      fecha_salida: now.toISOString().split('T')[0],
      hora_salida: now.toTimeString().split(' ')[0].substring(0, 5),
      lat_salida: location.lat,
      lng_salida: location.lng,
    })
    const visita = await db.visitas.get(id)
    if (visita) {
      await addToBitacora('visitas', id, 'UPDATE', visita)
    }
    return visita
  },
}

// ─── Helpers: Actividades ────────────────────────────────────────────────────

export const actividadesDB = {
  async getAll() {
    return db.actividades.filter(a => !a.deleted_at).toArray()
  },

  async getById(id: string) {
    return db.actividades.get(id)
  },

  async getByVisita(visitaId: string) {
    return db.actividades
      .where('visita_id')
      .equals(visitaId)
      .filter(a => !a.deleted_at)
      .toArray()
  },

  async create(actividad: Omit<Actividad, 'id' | 'rev'>) {
    const newActividad: Actividad = {
      ...actividad,
      id: crypto.randomUUID(),
      rev: 1,
    }
    await db.actividades.add(newActividad)
    await addToBitacora('actividades', newActividad.id, 'INSERT', newActividad)
    return newActividad
  },

  async update(id: string, data: Partial<Actividad>) {
    await db.actividades.update(id, data)
    const actividad = await db.actividades.get(id)
    if (actividad) {
      await addToBitacora('actividades', id, 'UPDATE', actividad)
    }
    return actividad
  },

  async softDelete(id: string) {
    await db.actividades.update(id, { deleted_at: new Date().toISOString() })
    const actividad = await db.actividades.get(id)
    if (actividad) {
      await addToBitacora('actividades', id, 'UPDATE', actividad)
    }
  },
}

// ─── Helpers: Evidencias ─────────────────────────────────────────────────────

export const evidenciasDB = {
  async getAll() {
    return db.evidencias.filter(e => !e.deleted_at).toArray()
  },

  async getById(id: string) {
    return db.evidencias.get(id)
  },

  async getByActividad(actividadId: string) {
    return db.evidencias
      .where('actividad_id')
      .equals(actividadId)
      .filter(e => !e.deleted_at)
      .toArray()
  },

  async create(evidencia: Omit<Evidencia, 'id' | 'rev'>) {
    const newEvidencia: Evidencia = {
      ...evidencia,
      id: crypto.randomUUID(),
      rev: 1,
    }
    await db.evidencias.add(newEvidencia)
    await addToBitacora('evidencias', newEvidencia.id, 'INSERT', newEvidencia)
    return newEvidencia
  },

  async delete(id: string) {
    await db.evidencias.update(id, { deleted_at: new Date().toISOString() })
    const evidencia = await db.evidencias.get(id)
    if (evidencia) {
      await addToBitacora('evidencias', id, 'UPDATE', evidencia)
    }
  },
}

// ─── Helpers: Visita Sectores ──────────────────────────────────────────────

export const visitaSectoresDB = {
  async getByVisita(visitaId: string) {
    return db.visita_sectores
      .filter(vs => vs.visita_id === visitaId && !vs.deleted_at)
      .toArray()
  },

  async create(data: Omit<VisitaSector, 'id' | 'rev'>) {
    const newItem: VisitaSector = { ...data, id: crypto.randomUUID(), rev: 1 }
    await db.visita_sectores.add(newItem)
    await addToBitacora('visita_sectores', newItem.id, 'INSERT', newItem)
    return newItem
  },

  async delete(id: string) {
    await db.visita_sectores.update(id, { deleted_at: new Date().toISOString() })
  },
}

// ─── Helpers: Actividad Materiales ─────────────────────────────────────────

export const actividadMaterialesDB = {
  async getByActividad(actividadId: string) {
    return db.actividad_materiales
      .filter(am => am.actividad_id === actividadId)
      .toArray()
  },

  async add(data: Omit<ActividadMaterial, 'id' | 'rev'>) {
    const newItem: ActividadMaterial = { ...data, id: crypto.randomUUID(), rev: 1 }
    await db.actividad_materiales.add(newItem)
    await addToBitacora('actividad_materiales', newItem.id, 'INSERT', newItem)
    return newItem
  },

  async delete(id: string) {
    await db.actividad_materiales.delete(id)
  },
}

// ─── Helpers: Catálogos ──────────────────────────────────────────────────────

export const catSectorDB = {
  async getAll() {
    return db.cat_sector.filter(c => c.activo).toArray()
  },
  async getById(id: string) {
    return db.cat_sector.get(id)
  },
}

export const catTipoActividadDB = {
  async getAll() {
    return db.cat_tipo_actividad.filter(t => t.activo).toArray()
  },
  async getById(id: string) {
    return db.cat_tipo_actividad.get(id)
  },
}

export const materialesDB = {
  async getAll() {
    return db.materiales.filter(m => m.activo).toArray()
  },
  async getBySector(sectorId: string) {
    return db.materiales.where('sector_id').equals(sectorId).toArray()
  },
}

// ─── Helpers: Comentarios ──────────────────────────────────────────────────

export const comentariosDB = {
  async getByVisita(visitaId: string) {
    return db.comentarios
      .filter(c => c.visita_id === visitaId)
      .sortBy('created_at')
  },

  async getByCliente(clienteId: string) {
    return db.comentarios
      .filter(c => c.cliente_id === clienteId)
      .sortBy('created_at')
  },

  async create(data: Omit<Comentario, 'id' | 'created_at' | 'updated_at'>) {
    const now = new Date().toISOString()
    const item: Comentario = {
      ...data,
      id: crypto.randomUUID(),
      created_at: now,
      updated_at: now,
    }
    await db.comentarios.add(item)
    return item
  },

  async update(id: string, texto: string) {
    await db.comentarios.update(id, {
      texto,
      updated_at: new Date().toISOString(),
    })
  },

  async delete(id: string) {
    await db.comentarios.delete(id)
  },
}

// ─── Helpers: Bitácora Sync ──────────────────────────────────────────────────

export const bitacoraSyncDB = {
  async getPendientes() {
    return db.bitacora_sync.filter(b => !b.sincronizado).toArray()
  },

  async marcarSincronizado(id: string) {
    await db.bitacora_sync.update(id, { sincronizado: true })
  },

  async incrementarIntentos(id: string) {
    const registro = await db.bitacora_sync.get(id)
    if (registro) {
      await db.bitacora_sync.update(id, { intentos: (registro.intentos || 0) + 1 })
    }
  },
}

// ─── Helper: Bitácora ────────────────────────────────────────────────────────

async function addToBitacora(
  tabla: string,
  registroId: string,
  operacion: string,
  payload?: unknown
) {
  await db.bitacora_sync.add({
    id: crypto.randomUUID(),
    tabla,
    registro_id: registroId,
    operacion,
    payload: JSON.parse(JSON.stringify(payload || {})),
    usuario_id: null,
    created_at: new Date().toISOString(),
    sincronizado: false,
    intentos: 0,
    error: null,
  })
}

// ─── Export de todas las tablas ───────────────────────────────────────────────

export const dbHelpers = {
  usuarios: usuariosDB,
  clientes: clientesDB,
  contactos: contactosDB,
  visitas: visitasDB,
  visitaSectores: visitaSectoresDB,
  actividades: actividadesDB,
  evidencias: evidenciasDB,
  catSector: catSectorDB,
  catTipoActividad: catTipoActividadDB,
  materiales: materialesDB,
  actividadMateriales: actividadMaterialesDB,
  bitacoraSync: bitacoraSyncDB,
}

// ─── Sync: Fetch from Supabase and seed Dexie ────────────────────────────────

export async function syncFromSupabase(): Promise<{ synced: boolean; error?: string }> {
  const { supabase, isSupabaseConfigured } = await import('../config/supabase')

  if (!isSupabaseConfigured() || !supabase || !navigator.onLine) {
    return { synced: false, error: 'Supabase not configured or offline' }
  }

  try {
    // Fetch tables sequentially to isolate errors
    const results: Record<string, number> = {}

    // Users
    const { data: usuarios, error: e1 } = await supabase.from('usuarios').select('*')
    if (e1) console.error('Error fetching usuarios:', e1.message)
    if (usuarios) { await db.usuarios.bulkPut(usuarios as Usuario[]); results.usuarios = usuarios.length }

    // Clients
    const { data: clientes, error: e2 } = await supabase.from('clientes').select('*')
    if (e2) console.error('Error fetching clientes:', e2.message)
    if (clientes) { await db.clientes.bulkPut(clientes as Cliente[]); results.clientes = clientes.length }

    // Contacts
    const { data: contactos, error: e3 } = await supabase.from('contactos').select('*')
    if (e3) console.error('Error fetching contactos:', e3.message)
    if (contactos) { await db.contactos.bulkPut(contactos as Contacto[]); results.contactos = contactos.length }

    // Visits
    const { data: visitas, error: e4 } = await supabase.from('visitas').select('*')
    if (e4) console.error('Error fetching visitas:', e4.message)
    if (visitas) { await db.visitas.bulkPut(visitas as Visita[]); results.visitas = visitas.length }

    // Activities
    const { data: actividades, error: e5 } = await supabase.from('actividades').select('*')
    if (e5) console.error('Error fetching actividades:', e5.message)
    if (actividades) { await db.actividades.bulkPut(actividades as Actividad[]); results.actividades = actividades.length }

    // Evidence
    const { data: evidencias, error: e6 } = await supabase.from('evidencias').select('*')
    if (e6) console.error('Error fetching evidencias:', e6.message)
    if (evidencias) { await db.evidencias.bulkPut(evidencias as Evidencia[]); results.evidencias = evidencias.length }

    // Visit Sectors
    const { data: visitaSectores, error: eVS } = await supabase.from('visita_sectores').select('*')
    if (eVS) console.error('Error fetching visita_sectores:', eVS.message)
    if (visitaSectores) { await db.visita_sectores.bulkPut(visitaSectores as VisitaSector[]); results.visita_sectores = visitaSectores.length }

    // Activity Materials
    const { data: actividadMateriales, error: eAM } = await supabase.from('actividad_materiales').select('*')
    if (eAM) console.error('Error fetching actividad_materiales:', eAM.message)
    if (actividadMateriales) { await db.actividad_materiales.bulkPut(actividadMateriales as ActividadMaterial[]); results.actividad_materiales = actividadMateriales.length }

    // Catalogs
    const { data: catSector, error: e7 } = await supabase.from('cat_sector').select('*')
    if (e7) console.error('Error fetching cat_sector:', e7.message)
    if (catSector) { await db.cat_sector.bulkPut(catSector as any[]); results.cat_sector = catSector.length }

    const { data: catTipoActividad, error: e8 } = await supabase.from('cat_tipo_actividad').select('*')
    if (e8) console.error('Error fetching cat_tipo_actividad:', e8.message)
    if (catTipoActividad) { await db.cat_tipo_actividad.bulkPut(catTipoActividad as any[]); results.cat_tipo_actividad = catTipoActividad.length }

    const { data: materiales, error: e9 } = await supabase.from('materiales').select('*')
    if (e9) console.error('Error fetching materiales:', e9.message)
    if (materiales) { await db.materiales.bulkPut(materiales as any[]); results.materiales = materiales.length }

    console.log('Sync from Supabase completed:', results)
    return { synced: true }
  } catch (error) {
    console.error('Error syncing from Supabase:', error)
    return { synced: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}
