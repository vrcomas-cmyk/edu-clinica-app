export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      usuarios: {
        Row: {
          id: string
          auth_uid: string | null
          correo: string
          nombre: string
          es_educador: boolean
          valida_actividades: boolean
          valida_evidencias: boolean
          valida_plan_trabajo: boolean
          es_gerente: boolean
          es_admin: boolean
          activo: boolean
        }
        Insert: {
          id?: string
          auth_uid?: string | null
          correo: string
          nombre: string
          es_educador?: boolean
          valida_actividades?: boolean
          valida_evidencias?: boolean
          valida_plan_trabajo?: boolean
          es_gerente?: boolean
          es_admin?: boolean
          activo?: boolean
        }
        Update: {
          id?: string
          auth_uid?: string | null
          correo?: string
          nombre?: string
          es_educador?: boolean
          valida_actividades?: boolean
          valida_evidencias?: boolean
          valida_plan_trabajo?: boolean
          es_gerente?: boolean
          es_admin?: boolean
          activo?: boolean
        }
        Relationships: []
      }
      clientes: {
        Row: {
          id: string
          no_cliente: string
          razon_social: string
          rfc: string | null
          poblacion: string | null
          estado: string | null
          ramo: string | null
          educador_asignado: string | null
          lat: number | null
          lng: number | null
          deleted_at: string | null
          updated_at: string
          rev: number
        }
        Insert: {
          id?: string
          no_cliente: string
          razon_social: string
          rfc?: string | null
          poblacion?: string | null
          estado?: string | null
          ramo?: string | null
          educador_asignado?: string | null
          lat?: number | null
          lng?: number | null
          deleted_at?: string | null
          updated_at?: string
          rev?: number
        }
        Update: {
          id?: string
          no_cliente?: string
          razon_social?: string
          rfc?: string | null
          poblacion?: string | null
          estado?: string | null
          ramo?: string | null
          educador_asignado?: string | null
          lat?: number | null
          lng?: number | null
          deleted_at?: string | null
          updated_at?: string
          rev?: number
        }
        Relationships: []
      }
      contactos: {
        Row: {
          id: string
          cliente_id: string | null
          nombre: string
          cargo: string | null
          area: string | null
          correo: string | null
          telefono: string | null
          deleted_at: string | null
          updated_at: string
          rev: number
        }
        Insert: {
          id?: string
          cliente_id?: string | null
          nombre: string
          cargo?: string | null
          area?: string | null
          correo?: string | null
          telefono?: string | null
          deleted_at?: string | null
          updated_at?: string
          rev?: number
        }
        Update: {
          id?: string
          cliente_id?: string | null
          nombre?: string
          cargo?: string | null
          area?: string | null
          correo?: string | null
          telefono?: string | null
          deleted_at?: string | null
          updated_at?: string
          rev?: number
        }
        Relationships: []
      }
      visitas: {
        Row: {
          id: string
          educador_id: string
          cliente_id: string | null
          cliente_libre: string | null
          hospital: string | null
          fecha_visita: string
          hora_visita: string | null
          objetivo: string | null
          status: "Pendiente" | "Completo" | "Cancelado" | "Reagendado"
          id_origen: string | null
          gcal_event_id: string | null
          fecha_llegada: string | null
          hora_llegada: string | null
          lat_llegada: number | null
          lng_llegada: number | null
          fecha_salida: string | null
          hora_salida: string | null
          lat_salida: number | null
          lng_salida: number | null
          deleted_at: string | null
          updated_at: string
          rev: number
        }
        Insert: {
          id?: string
          educador_id: string
          cliente_id?: string | null
          cliente_libre?: string | null
          hospital?: string | null
          fecha_visita: string
          hora_visita?: string | null
          objetivo?: string | null
          status?: "Pendiente" | "Completo" | "Cancelado" | "Reagendado"
          id_origen?: string | null
          gcal_event_id?: string | null
          fecha_llegada?: string | null
          hora_llegada?: string | null
          lat_llegada?: number | null
          lng_llegada?: number | null
          fecha_salida?: string | null
          hora_salida?: string | null
          lat_salida?: number | null
          lng_salida?: number | null
          deleted_at?: string | null
          updated_at?: string
          rev?: number
        }
        Update: {
          id?: string
          educador_id?: string
          cliente_id?: string | null
          cliente_libre?: string | null
          hospital?: string | null
          fecha_visita?: string
          hora_visita?: string | null
          objetivo?: string | null
          status?: "Pendiente" | "Completo" | "Cancelado" | "Reagendado"
          id_origen?: string | null
          gcal_event_id?: string | null
          fecha_llegada?: string | null
          hora_llegada?: string | null
          lat_llegada?: number | null
          lng_llegada?: number | null
          fecha_salida?: string | null
          hora_salida?: string | null
          lat_salida?: number | null
          lng_salida?: number | null
          deleted_at?: string | null
          updated_at?: string
          rev?: number
        }
        Relationships: []
      }
      visita_sectores: {
        Row: {
          id: string
          visita_id: string
          sector_id: string | null
          objetivo: string | null
          deleted_at: string | null
          updated_at: string
          rev: number
        }
        Insert: {
          id?: string
          visita_id: string
          sector_id?: string | null
          objetivo?: string | null
          deleted_at?: string | null
          updated_at?: string
          rev?: number
        }
        Update: {
          id?: string
          visita_id?: string
          sector_id?: string | null
          objetivo?: string | null
          deleted_at?: string | null
          updated_at?: string
          rev?: number
        }
        Relationships: []
      }
      actividades: {
        Row: {
          id: string
          visita_id: string
          sector_previsto_id: string
          tipo_actividad_id: string | null
          contacto_id: string | null
          area_visitada_id: string | null
          requiere_evidencia: boolean
          estado_actividad: "Pendiente" | "Aprobado" | "Rechazado"
          estado_evidencia: "Pendiente" | "Aprobado" | "Rechazado"
          deleted_at: string | null
          updated_at: string
          rev: number
        }
        Insert: {
          id?: string
          visita_id: string
          sector_previsto_id: string
          tipo_actividad_id?: string | null
          contacto_id?: string | null
          area_visitada_id?: string | null
          requiere_evidencia?: boolean
          estado_actividad?: "Pendiente" | "Aprobado" | "Rechazado"
          estado_evidencia?: "Pendiente" | "Aprobado" | "Rechazado"
          deleted_at?: string | null
          updated_at?: string
          rev?: number
        }
        Update: {
          id?: string
          visita_id?: string
          sector_previsto_id?: string
          tipo_actividad_id?: string | null
          contacto_id?: string | null
          area_visitada_id?: string | null
          requiere_evidencia?: boolean
          estado_actividad?: "Pendiente" | "Aprobado" | "Rechazado"
          estado_evidencia?: "Pendiente" | "Aprobado" | "Rechazado"
          deleted_at?: string | null
          updated_at?: string
          rev?: number
        }
        Relationships: []
      }
      evidencias: {
        Row: {
          id: string
          actividad_id: string
          tipo: string
          nombre_archivo: string
          storage_url: string | null
          drive_id: string | null
          size_bytes: number | null
          deleted_at: string | null
          updated_at: string
          rev: number
        }
        Insert: {
          id?: string
          actividad_id: string
          tipo: string
          nombre_archivo: string
          storage_url?: string | null
          drive_id?: string | null
          size_bytes?: number | null
          deleted_at?: string | null
          updated_at?: string
          rev?: number
        }
        Update: {
          id?: string
          actividad_id?: string
          tipo?: string
          nombre_archivo?: string
          storage_url?: string | null
          drive_id?: string | null
          size_bytes?: number | null
          deleted_at?: string | null
          updated_at?: string
          rev?: number
        }
        Relationships: []
      }
      cat_sector: {
        Row: { id: string; codigo: string | null; nombre: string; orden: number; activo: boolean }
        Insert: Partial<Database["public"]["Tables"]["cat_sector"]["Row"]> & { nombre: string }
        Update: Partial<Database["public"]["Tables"]["cat_sector"]["Row"]>
        Relationships: []
      }
      cat_tipo_actividad: {
        Row: { id: string; nombre: string; prefijo: string | null; requiere_materiales: boolean; orden: number; activo: boolean }
        Insert: Partial<Database["public"]["Tables"]["cat_tipo_actividad"]["Row"]> & { nombre: string }
        Update: Partial<Database["public"]["Tables"]["cat_tipo_actividad"]["Row"]>
        Relationships: []
      }
      materiales: {
        Row: { id: string; codigo: string; nombre: string; sector_id: string | null; grupo_articulos: string | null; tipo_material: string | null; activo: boolean }
        Insert: Partial<Database["public"]["Tables"]["materiales"]["Row"]> & { codigo: string; nombre: string }
        Update: Partial<Database["public"]["Tables"]["materiales"]["Row"]>
        Relationships: []
      }
      actividad_materiales: {
        Row: { id: string; actividad_id: string; material_id: string | null; sector_id: string | null; cantidad: number | null; um_id: string | null; folio: string | null; rev: number }
        Insert: Partial<Database["public"]["Tables"]["actividad_materiales"]["Row"]> & { actividad_id: string }
        Update: Partial<Database["public"]["Tables"]["actividad_materiales"]["Row"]>
        Relationships: []
      }
      bitacora_sync: {
        Row: {
          id: string
          tabla: string
          registro_id: string
          operacion: string
          payload: Json | null
          usuario_id: string | null
          created_at: string
          sincronizado: boolean
          intentos: number
          error: string | null
        }
        Insert: {
          id?: string
          tabla: string
          registro_id: string
          operacion: string
          payload?: Json | null
          usuario_id?: string | null
          created_at?: string
          sincronizado?: boolean
          intentos?: number
          error?: string | null
        }
        Update: {
          id?: string
          tabla?: string
          registro_id?: string
          operacion?: string
          payload?: Json | null
          usuario_id?: string | null
          created_at?: string
          sincronizado?: boolean
          intentos?: number
          error?: string | null
        }
        Relationships: []
      }
      comentarios: {
        Row: {
          id: string
          visita_id: string
          cliente_id: string | null
          usuario_id: string
          texto: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          visita_id: string
          cliente_id?: string | null
          usuario_id: string
          texto: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          visita_id?: string
          cliente_id?: string | null
          usuario_id?: string
          texto?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      sync_queue: {
        Row: {
          id: string
          table_name: string
          record_id: string
          action: 'create' | 'update' | 'delete'
          data: Json | null
          timestamp: string
          retries: number
          status: 'pending' | 'syncing' | 'failed' | 'completed'
          error: string | null
        }
        Insert: {
          id?: string
          table_name: string
          record_id: string
          action: 'create' | 'update' | 'delete'
          data?: Json | null
          timestamp?: string
          retries?: number
          status?: 'pending' | 'syncing' | 'failed' | 'completed'
          error?: string | null
        }
        Update: {
          id?: string
          table_name?: string
          record_id?: string
          action?: 'create' | 'update' | 'delete'
          data?: Json | null
          timestamp?: string
          retries?: number
          status?: 'pending' | 'syncing' | 'failed' | 'completed'
          error?: string | null
        }
        Relationships: []
      }
      ejecutivos: {
        Row: { id: string; codigo: string; nombre: string; zona: string | null; correo: string | null; activo: boolean; created_at: string; updated_at: string }
        Insert: Partial<Database["public"]["Tables"]["ejecutivos"]["Row"]> & { codigo: string; nombre: string }
        Update: Partial<Database["public"]["Tables"]["ejecutivos"]["Row"]>
        Relationships: []
      }
      grupos_cliente: {
        Row: { id: string; codigo: string; nombre: string; activo: boolean; created_at: string; updated_at: string }
        Insert: Partial<Database["public"]["Tables"]["grupos_cliente"]["Row"]> & { codigo: string; nombre: string }
        Update: Partial<Database["public"]["Tables"]["grupos_cliente"]["Row"]>
        Relationships: []
      }
      solicitantes: {
        Row: { id: string; codigo: string; razon_social: string; cliente_id: string | null; grupo_cliente_id: string | null; ejecutivo_id: string | null; grupo_vendedor: string | null; activo: boolean; created_at: string; updated_at: string }
        Insert: Partial<Database["public"]["Tables"]["solicitantes"]["Row"]> & { codigo: string; razon_social: string }
        Update: Partial<Database["public"]["Tables"]["solicitantes"]["Row"]>
        Relationships: []
      }
      destinatarios: {
        Row: { id: string; codigo: string; razon_social: string; solicitante_id: string | null; centro: string | null; activo: boolean; created_at: string; updated_at: string }
        Insert: Partial<Database["public"]["Tables"]["destinatarios"]["Row"]> & { codigo: string; razon_social: string }
        Update: Partial<Database["public"]["Tables"]["destinatarios"]["Row"]>
        Relationships: []
      }
      facturacion_mensual: {
        Row: { id: string; solicitante_codigo: string; destinatario_codigo: string; razon_social: string | null; material: string; texto_material: string | null; mes_anio: string; cantidad_facturada: number; importe_facturado: number; centro: string | null; grupo_cliente: string | null; grupo_vendedor: string | null; archivo_origen: string | null; uploaded_by: string | null; created_at: string }
        Insert: Partial<Database["public"]["Tables"]["facturacion_mensual"]["Row"]> & { solicitante_codigo: string; destinatario_codigo: string; material: string; mes_anio: string }
        Update: Partial<Database["public"]["Tables"]["facturacion_mensual"]["Row"]>
        Relationships: []
      }
      consumo: {
        Row: { id: string; centro: string | null; grupo_cliente: string | null; solicitante_codigo: string; destinatario_codigo: string; razon_social: string | null; material: string; texto_material: string | null; consumo_actual: number; consumo_promedio_mensual: number; tendencia: string | null; ultimo_mes_facturacion: string | null; cantidad_ultima: number; importe_ultima: number; penultima_fecha: string | null; cantidad_penultima: number; importe_penultima: number; ultima_facturacion_destinatario: string | null; precio_min: number | null; precio_max: number | null; precio_prom: number | null; precio_unitario_ultima: number | null; precio_unitario_penultima: number | null; archivo_origen: string | null; uploaded_by: string | null; created_at: string }
        Insert: Partial<Database["public"]["Tables"]["consumo"]["Row"]> & { solicitante_codigo: string; destinatario_codigo: string; material: string }
        Update: Partial<Database["public"]["Tables"]["consumo"]["Row"]>
        Relationships: []
      }
      sugerencias: {
        Row: { id: string; grupo_cliente: string | null; fecha: string | null; oc: string | null; pedido: string | null; grupo_vendedor: string | null; solicitante_codigo: string; destinatario_codigo: string; razon_social: string | null; centro_pedido: string | null; almacen: string | null; material_solicitado: string | null; material_base: string | null; descripcion_solicitada: string | null; cantidad_pedido: number; cantidad_pendiente: number; cantidad_ofertar: number; precio: number; consumo_promedio: number | null; fuente: string | null; material_sugerido: string | null; descripcion_sugerida: string | null; centro_sugerido: string | null; almacen_sugerido: string | null; disponible: number | null; lote: string | null; fecha_caducidad: string | null; bloqueado: string | null; inv_1030: number | null; inv_1031: number | null; inv_1032: number | null; inv_1036: number | null; disponible_1031_1030: number | null; disponible_1031_1032: number | null; cant_transito: number | null; archivo_origen: string | null; uploaded_by: string | null; created_at: string }
        Insert: Partial<Database["public"]["Tables"]["sugerencias"]["Row"]> & { solicitante_codigo: string; destinatario_codigo: string }
        Update: Partial<Database["public"]["Tables"]["sugerencias"]["Row"]>
        Relationships: []
      }
      inventario: {
        Row: { id: string; material: string; texto_material: string | null; condicion: string | null; grupo: string | null; sector: string | null; precio_oferta: number | null; disponible_1030: number | null; disponible_1031: number | null; disponible_1032: number | null; inv_suma: number | null; importe_inventario: number | null; archivo_origen: string | null; uploaded_by: string | null; created_at: string }
        Insert: Partial<Database["public"]["Tables"]["inventario"]["Row"]> & { material: string }
        Update: Partial<Database["public"]["Tables"]["inventario"]["Row"]>
        Relationships: []
      }
      portal_uploads: {
        Row: { id: string; report_type: string; filename: string; row_count: number; uploaded_by: string | null; status: string; created_at: string }
        Insert: Partial<Database["public"]["Tables"]["portal_uploads"]["Row"]> & { report_type: string; filename: string }
        Update: Partial<Database["public"]["Tables"]["portal_uploads"]["Row"]>
        Relationships: []
      }
      usuario_modulos: {
        Row: { id: string; usuario_id: string; modulo: string; visible: boolean; created_at: string }
        Insert: Partial<Database["public"]["Tables"]["usuario_modulos"]["Row"]> & { usuario_id: string; modulo: string }
        Update: Partial<Database["public"]["Tables"]["usuario_modulos"]["Row"]>
        Relationships: []
      }
    }
    Views: {
      v_visita_color: {
        Row: { visita_id: string; color: "rojo" | "azul" | "verde" }
        Relationships: []
      }
    }
    Functions: {
      rpc_validar_evidencia: {
        Args: { p_actividad: string; p_estado: string; p_comentario?: string }
        Returns: undefined
      }
      rpc_validar_actividad: {
        Args: { p_actividad: string; p_estado: string; p_area?: string; p_comentario?: string }
        Returns: undefined
      }
      rpc_revisar_visita: {
        Args: { p_visita: string; p_tipo: string; p_estado: string; p_comentario?: string }
        Returns: undefined
      }
    }
    Enums: {
      estado_validacion: "Pendiente" | "Aprobado" | "Rechazado"
      visita_status: "Pendiente" | "Completo" | "Cancelado" | "Reagendado"
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Insert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type Update<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

export type Usuario = Tables<'usuarios'>
export type Cliente = Tables<'clientes'>
export type Contacto = Tables<'contactos'>
export type Visita = Tables<'visitas'>
export type VisitaSector = Tables<'visita_sectores'>
export type Actividad = Tables<'actividades'>
export type Evidencia = Tables<'evidencias'>
export type CatSector = Tables<'cat_sector'>
export type CatTipoActividad = Tables<'cat_tipo_actividad'>
export type Material = Tables<'materiales'>
export type ActividadMaterial = Tables<'actividad_materiales'>
export type BitacoraSync = Tables<'bitacora_sync'>
export type Comentario = Tables<'comentarios'>
export type SyncQueue = Tables<'sync_queue'>
export type Ejecutivo = Tables<'ejecutivos'>
export type GrupoCliente = Tables<'grupos_cliente'>
export type Solicitante = Tables<'solicitantes'>
export type Destinatario = Tables<'destinatarios'>
export type FacturacionMensual = Tables<'facturacion_mensual'>
export type Consumo = Tables<'consumo'>
export type Sugerencia = Tables<'sugerencias'>
export type InventarioItem = Tables<'inventario'>
export type PortalUpload = Tables<'portal_uploads'>
export type UsuarioModulo = Tables<'usuario_modulos'>
