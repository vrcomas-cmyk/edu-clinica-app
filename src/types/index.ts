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
} from './database'

export type {
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
}

// Enums de dominio
export type EstadoValidacion = 'Pendiente' | 'Aprobado' | 'Rechazado'
export type VisitaStatus = 'Pendiente' | 'Completo' | 'Cancelado' | 'Reagendado'
export type ColorEstado = 'rojo' | 'azul' | 'verde'
export type TipoEvidencia = 'foto' | 'pdf' | 'video' | 'audio' | 'documento'

// Roles (derived from usuario flags)
export interface Rol {
  esEducador: boolean
  validaActividades: boolean
  validaEvidencias: boolean
  validaPlanTrabajo: boolean
  esGerente: boolean
  esAdmin: boolean
}

// Helpers de dominio
export const puedeValidarEvidencias = (r: Rol) => r.validaEvidencias || r.esAdmin
export const puedeValidarActividades = (r: Rol) => r.validaActividades || r.esGerente || r.esAdmin
export const puedeRevisarPlan = (r: Rol) => r.validaPlanTrabajo || r.esGerente || r.esAdmin

// Derivar rol desde usuario
export function usuarioToRol(u: { es_educador: boolean; valida_actividades: boolean; valida_evidencias: boolean; valida_plan_trabajo: boolean; es_gerente: boolean; es_admin: boolean }): Rol {
  const admin = u.es_admin
  return {
    esEducador: u.es_educador || admin,
    validaActividades: u.valida_actividades || admin,
    validaEvidencias: u.valida_evidencias || admin,
    validaPlanTrabajo: u.valida_plan_trabajo || admin,
    esGerente: u.es_gerente || admin,
    esAdmin: admin,
  }
}

// Estado de color derivado (regla de negocio)
export function computeColor(nActividades: number, nEvidencias: number, nRequeridas: number): ColorEstado {
  if (nActividades === 0) return 'rojo'
  if (nRequeridas === 0 || nEvidencias < nRequeridas) return 'azul'
  return 'verde'
}


