-- =============================================================
-- Migración: Integración Portal Inventario_Pendientes_Consumo
-- =============================================================

-- 1. Ejecutivos (ventas / zona)
CREATE TABLE IF NOT EXISTS ejecutivos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  zona TEXT,
  correo TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Grupos de cliente
CREATE TABLE IF NOT EXISTS grupos_cliente (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Solicitantes (entidad compradora, vinculada a un cliente)
CREATE TABLE IF NOT EXISTS solicitantes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT UNIQUE NOT NULL,
  razon_social TEXT NOT NULL,
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  grupo_cliente_id UUID REFERENCES grupos_cliente(id) ON DELETE SET NULL,
  ejecutivo_id UUID REFERENCES ejecutivos(id) ON DELETE SET NULL,
  grupo_vendedor TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Destinatarios (puntos de entrega, vinculados a un solicitante)
CREATE TABLE IF NOT EXISTS destinatarios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT UNIQUE NOT NULL,
  razon_social TEXT NOT NULL,
  solicitante_id UUID REFERENCES solicitantes(id) ON DELETE SET NULL,
  centro TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Facturación mensual (Resumen_Fac - series de tiempo)
CREATE TABLE IF NOT EXISTS facturacion_mensual (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  solicitante_codigo TEXT NOT NULL,
  destinatario_codigo TEXT NOT NULL,
  razon_social TEXT,
  material TEXT NOT NULL,
  texto_material TEXT,
  mes_anio TEXT NOT NULL,
  cantidad_facturada NUMERIC DEFAULT 0,
  importe_facturado NUMERIC DEFAULT 0,
  centro TEXT,
  grupo_cliente TEXT,
  grupo_vendedor TEXT,
  archivo_origen TEXT,
  uploaded_by UUID REFERENCES usuarios(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Consumo (Reporte de Consumo)
CREATE TABLE IF NOT EXISTS consumo (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  centro TEXT,
  grupo_cliente TEXT,
  solicitante_codigo TEXT NOT NULL,
  destinatario_codigo TEXT NOT NULL,
  razon_social TEXT,
  material TEXT NOT NULL,
  texto_material TEXT,
  consumo_actual NUMERIC DEFAULT 0,
  consumo_promedio_mensual NUMERIC DEFAULT 0,
  tendencia TEXT,
  ultimo_mes_facturacion TEXT,
  cantidad_ultima NUMERIC DEFAULT 0,
  importe_ultima NUMERIC DEFAULT 0,
  penultima_fecha TEXT,
  cantidad_penultima NUMERIC DEFAULT 0,
  importe_penultima NUMERIC DEFAULT 0,
  ultima_facturacion_destinatario TEXT,
  precio_min NUMERIC,
  precio_max NUMERIC,
  precio_prom NUMERIC,
  precio_unitario_ultima NUMERIC,
  precio_unitario_penultima NUMERIC,
  archivo_origen TEXT,
  uploaded_by UUID REFERENCES usuarios(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Sugerencias / Back Orders
CREATE TABLE IF NOT EXISTS sugerencias (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  grupo_cliente TEXT,
  fecha TEXT,
  oc TEXT,
  pedido TEXT,
  grupo_vendedor TEXT,
  solicitante_codigo TEXT NOT NULL,
  destinatario_codigo TEXT NOT NULL,
  razon_social TEXT,
  centro_pedido TEXT,
  almacen TEXT,
  material_solicitado TEXT,
  material_base TEXT,
  descripcion_solicitada TEXT,
  cantidad_pedido NUMERIC DEFAULT 0,
  cantidad_pendiente NUMERIC DEFAULT 0,
  cantidad_ofertar NUMERIC DEFAULT 0,
  precio NUMERIC DEFAULT 0,
  consumo_promedio NUMERIC,
  fuente TEXT,
  material_sugerido TEXT,
  descripcion_sugerida TEXT,
  centro_sugerido TEXT,
  almacen_sugerido TEXT,
  disponible NUMERIC,
  lote TEXT,
  fecha_caducidad TEXT,
  bloqueado TEXT,
  inv_1030 NUMERIC,
  inv_1031 NUMERIC,
  inv_1032 NUMERIC,
  inv_1036 NUMERIC,
  disponible_1031_1030 NUMERIC,
  disponible_1031_1032 NUMERIC,
  cant_transito NUMERIC,
  archivo_origen TEXT,
  uploaded_by UUID REFERENCES usuarios(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Inventario por condición
CREATE TABLE IF NOT EXISTS inventario (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  material TEXT NOT NULL,
  texto_material TEXT,
  condicion TEXT,
  grupo TEXT,
  sector TEXT,
  precio_oferta NUMERIC,
  disponible_1030 NUMERIC,
  disponible_1031 NUMERIC,
  disponible_1032 NUMERIC,
  inv_suma NUMERIC,
  importe_inventario NUMERIC,
  archivo_origen TEXT,
  uploaded_by UUID REFERENCES usuarios(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. Tracking de uploads del portal
CREATE TABLE IF NOT EXISTS portal_uploads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  report_type TEXT NOT NULL,
  filename TEXT NOT NULL,
  row_count INTEGER DEFAULT 0,
  uploaded_by UUID REFERENCES usuarios(id),
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. Módulos visibles por usuario
CREATE TABLE IF NOT EXISTS usuario_modulos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  modulo TEXT NOT NULL,
  visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(usuario_id, modulo)
);

-- =============================================================
-- RLS Policies
-- =============================================================

ALTER TABLE ejecutivos ENABLE ROW LEVEL SECURITY;
ALTER TABLE grupos_cliente ENABLE ROW LEVEL SECURITY;
ALTER TABLE solicitantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE destinatarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE facturacion_mensual ENABLE ROW LEVEL SECURITY;
ALTER TABLE consumo ENABLE ROW LEVEL SECURITY;
ALTER TABLE sugerencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventario ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuario_modulos ENABLE ROW LEVEL SECURITY;

-- Admin/gerente: full access
CREATE POLICY "admin_full_ejecutivos" ON ejecutivos FOR ALL USING (
  EXISTS (SELECT 1 FROM usuarios WHERE auth_uid = auth.uid() AND (es_admin = true OR es_gerente = true))
);
CREATE POLICY "admin_full_grupos" ON grupos_cliente FOR ALL USING (
  EXISTS (SELECT 1 FROM usuarios WHERE auth_uid = auth.uid() AND (es_admin = true OR es_gerente = true))
);
CREATE POLICY "admin_full_solicitantes" ON solicitantes FOR ALL USING (
  EXISTS (SELECT 1 FROM usuarios WHERE auth_uid = auth.uid() AND (es_admin = true OR es_gerente = true))
);
CREATE POLICY "admin_full_destinatarios" ON destinatarios FOR ALL USING (
  EXISTS (SELECT 1 FROM usuarios WHERE auth_uid = auth.uid() AND (es_admin = true OR es_gerente = true))
);
CREATE POLICY "admin_full_facturacion" ON facturacion_mensual FOR ALL USING (
  EXISTS (SELECT 1 FROM usuarios WHERE auth_uid = auth.uid() AND (es_admin = true OR es_gerente = true))
);
CREATE POLICY "admin_full_consumo" ON consumo FOR ALL USING (
  EXISTS (SELECT 1 FROM usuarios WHERE auth_uid = auth.uid() AND (es_admin = true OR es_gerente = true))
);
CREATE POLICY "admin_full_sugerencias" ON sugerencias FOR ALL USING (
  EXISTS (SELECT 1 FROM usuarios WHERE auth_uid = auth.uid() AND (es_admin = true OR es_gerente = true))
);
CREATE POLICY "admin_full_inventario" ON inventario FOR ALL USING (
  EXISTS (SELECT 1 FROM usuarios WHERE auth_uid = auth.uid() AND (es_admin = true OR es_gerente = true))
);
CREATE POLICY "admin_full_uploads" ON portal_uploads FOR ALL USING (
  EXISTS (SELECT 1 FROM usuarios WHERE auth_uid = auth.uid() AND (es_admin = true OR es_gerente = true))
);
CREATE POLICY "admin_full_modulos" ON usuario_modulos FOR ALL USING (
  EXISTS (SELECT 1 FROM usuarios WHERE auth_uid = auth.uid() AND es_admin = true)
);

-- Regular users: read-only on reference tables
CREATE POLICY "users_read_ejecutivos" ON ejecutivos FOR SELECT USING (true);
CREATE POLICY "users_read_grupos" ON grupos_cliente FOR SELECT USING (true);
CREATE POLICY "users_read_solicitantes" ON solicitantes FOR SELECT USING (true);
CREATE POLICY "users_read_destinatarios" ON destinatarios FOR SELECT USING (true);

-- Users see their own uploaded data
CREATE POLICY "users_own_facturacion" ON facturacion_mensual FOR SELECT USING (
  uploaded_by = (SELECT id FROM usuarios WHERE auth_uid = auth.uid())
);
CREATE POLICY "users_own_consumo" ON consumo FOR SELECT USING (
  uploaded_by = (SELECT id FROM usuarios WHERE auth_uid = auth.uid())
);
CREATE POLICY "users_own_sugerencias" ON sugerencias FOR SELECT USING (
  uploaded_by = (SELECT id FROM usuarios WHERE auth_uid = auth.uid())
);
CREATE POLICY "users_own_inventario" ON inventario FOR SELECT USING (
  uploaded_by = (SELECT id FROM usuarios WHERE auth_uid = auth.uid())
);
CREATE POLICY "users_own_uploads" ON portal_uploads FOR SELECT USING (
  uploaded_by = (SELECT id FROM usuarios WHERE auth_uid = auth.uid())
);

-- Gerentes see all data from their team
CREATE POLICY "gerente_all_facturacion" ON facturacion_mensual FOR SELECT USING (
  EXISTS (SELECT 1 FROM usuarios WHERE auth_uid = auth.uid() AND es_gerente = true)
);
CREATE POLICY "gerente_all_consumo" ON consumo FOR SELECT USING (
  EXISTS (SELECT 1 FROM usuarios WHERE auth_uid = auth.uid() AND es_gerente = true)
);
CREATE POLICY "gerente_all_sugerencias" ON sugerencias FOR SELECT USING (
  EXISTS (SELECT 1 FROM usuarios WHERE auth_uid = auth.uid() AND es_gerente = true)
);
CREATE POLICY "gerente_all_inventario" ON inventario FOR SELECT USING (
  EXISTS (SELECT 1 FROM usuarios WHERE auth_uid = auth.uid() AND es_gerente = true)
);
CREATE POLICY "gerente_all_uploads" ON portal_uploads FOR SELECT USING (
  EXISTS (SELECT 1 FROM usuarios WHERE auth_uid = auth.uid() AND es_gerente = true)
);

-- =============================================================
-- Indexes for performance
-- =============================================================

CREATE INDEX IF NOT EXISTS idx_facturacion_solicitante ON facturacion_mensual(solicitante_codigo);
CREATE INDEX IF NOT EXISTS idx_facturacion_destinatario ON facturacion_mensual(destinatario_codigo);
CREATE INDEX IF NOT EXISTS idx_facturacion_material ON facturacion_mensual(material);
CREATE INDEX IF NOT EXISTS idx_facturacion_mes ON facturacion_mensual(mes_anio);
CREATE INDEX IF NOT EXISTS idx_consumo_solicitante ON consumo(solicitante_codigo);
CREATE INDEX IF NOT EXISTS idx_consumo_destinatario ON consumo(destinatario_codigo);
CREATE INDEX IF NOT EXISTS idx_consumo_material ON consumo(material);
CREATE INDEX IF NOT EXISTS idx_sugerencias_solicitante ON sugerencias(solicitante_codigo);
CREATE INDEX IF NOT EXISTS idx_sugerencias_pedido ON sugerencias(pedido);
CREATE INDEX IF NOT EXISTS idx_inventario_material ON inventario(material);
CREATE INDEX IF NOT EXISTS idx_solicitantes_cliente ON solicitantes(cliente_id);
CREATE INDEX IF NOT EXISTS idx_destinatarios_solicitante ON destinatarios(solicitante_id);

-- =============================================================
-- Lookup views for the app
-- =============================================================

CREATE OR REPLACE VIEW v_clientes_completo AS
SELECT
  c.id,
  c.no_cliente,
  c.razon_social,
  c.rfc,
  c.poblacion,
  c.estado,
  c.ramo,
  c.educador_asignado,
  c.lat,
  c.lng,
  gc.codigo AS grupo_cliente_codigo,
  gc.nombre AS grupo_cliente_nombre,
  e.codigo AS ejecutivo_codigo,
  e.nombre AS ejecutivo_nombre,
  (SELECT COUNT(*) FROM solicitantes s WHERE s.cliente_id = c.id AND s.activo = true) AS total_solicitantes,
  (SELECT COUNT(*) FROM destinatarios d JOIN solicitantes s2 ON d.solicitante_id = s2.id WHERE s2.cliente_id = c.id AND d.activo = true) AS total_destinatarios
FROM clientes c
LEFT JOIN solicitantes sol ON sol.cliente_id = c.id AND sol.activo = true
LEFT JOIN grupos_cliente gc ON sol.grupo_cliente_id = gc.id
LEFT JOIN ejecutivos e ON sol.ejecutivo_id = e.id
WHERE c.deleted_at IS NULL
GROUP BY c.id, c.no_cliente, c.razon_social, c.rfc, c.poblacion, c.estado, c.ramo, c.educador_asignado, c.lat, c.lng, gc.codigo, gc.nombre, e.codigo, e.nombre;
