-- =============================================================
-- Migración: Deshabilitar RLS en tablas del portal
-- La app usa auth local (IndexedDB), no Supabase Auth.
-- auth.uid() retorna null → bloquea inserts/updates.
-- =============================================================

-- Tablas de datos del portal (las más voluminosas)
ALTER TABLE facturacion_mensual DISABLE ROW LEVEL SECURITY;
ALTER TABLE consumo DISABLE ROW LEVEL SECURITY;
ALTER TABLE sugerencias DISABLE ROW LEVEL SECURITY;
ALTER TABLE inventario DISABLE ROW LEVEL SECURITY;
ALTER TABLE portal_uploads DISABLE ROW LEVEL SECURITY;
ALTER TABLE usuario_modulos DISABLE ROW LEVEL SECURITY;

-- Catálogos (lectura para todos, escritura para admin)
ALTER TABLE ejecutivos DISABLE ROW LEVEL SECURITY;
ALTER TABLE grupos_cliente DISABLE ROW LEVEL SECURITY;
ALTER TABLE solicitantes DISABLE ROW LEVEL SECURITY;
ALTER TABLE destinatarios DISABLE ROW LEVEL SECURITY;

-- Dropear políticas huérfanas (ya no aplican con RLS deshabilitado)
DROP POLICY IF EXISTS "admin_full_ejecutivos" ON ejecutivos;
DROP POLICY IF EXISTS "admin_full_grupos" ON grupos_cliente;
DROP POLICY IF EXISTS "admin_full_solicitantes" ON solicitantes;
DROP POLICY IF EXISTS "admin_full_destinatarios" ON destinatarios;
DROP POLICY IF EXISTS "admin_full_facturacion" ON facturacion_mensual;
DROP POLICY IF EXISTS "admin_full_consumo" ON consumo;
DROP POLICY IF EXISTS "admin_full_sugerencias" ON sugerencias;
DROP POLICY IF EXISTS "admin_full_inventario" ON inventario;
DROP POLICY IF EXISTS "admin_full_uploads" ON portal_uploads;
DROP POLICY IF EXISTS "admin_full_modulos" ON usuario_modulos;

DROP POLICY IF EXISTS "users_read_ejecutivos" ON ejecutivos;
DROP POLICY IF EXISTS "users_read_grupos" ON grupos_cliente;
DROP POLICY IF EXISTS "users_read_solicitantes" ON solicitantes;
DROP POLICY IF EXISTS "users_read_destinatarios" ON destinatarios;

DROP POLICY IF EXISTS "users_own_facturacion" ON facturacion_mensual;
DROP POLICY IF EXISTS "users_own_consumo" ON consumo;
DROP POLICY IF EXISTS "users_own_sugerencias" ON sugerencias;
DROP POLICY IF EXISTS "users_own_inventario" ON inventario;
DROP POLICY IF EXISTS "users_own_uploads" ON portal_uploads;

DROP POLICY IF EXISTS "gerente_all_facturacion" ON facturacion_mensual;
DROP POLICY IF EXISTS "gerente_all_consumo" ON consumo;
DROP POLICY IF EXISTS "gerente_all_sugerencias" ON sugerencias;
DROP POLICY IF EXISTS "gerente_all_inventario" ON inventario;
DROP POLICY IF EXISTS "gerente_all_uploads" ON portal_uploads;
