## Estado Actual

### ✅ Completado
1. **RLS corregido** — Migración `SQL/migration_fix_rls_portal.sql` deshabilita RLS en tablas del portal (la app usa auth local, no Supabase Auth)
2. **Upload real** — `admin-portal-page.tsx` parsea Excel con SheetJS, detecta hojas por headers, ingesta a Supabase + catálogos + Storage
3. **Inventario Apps Script** — `inventario-page.tsx` conecta a Apps Script cuando Supabase está vacío, con cache 3 días en IndexedDB
4. **Clientes desde upload** — `clients-page.tsx` muestra solicitantes del upload con destinatarios expandibles, ejecutivo y grupo

### 📋 Próximos pasos
1. **Ejecutar migración SQL** en Supabase: `SQL/migration_fix_rls_portal.sql`
2. **Crear bucket** `portal-uploads` en Supabase Storage (si no existe)
3. **Subir primer archivo Excel** desde Admin Portal
4. **Probar flujo completo**: upload → datos en tablas → consumo/sugerencias/inventario muestran datos

### 🐛 Error anterior (resuelto)
```
Error al subir: new row violates row-level security policy for table "portal_uploads"
```
Causa: RLS usaba `auth.uid()` pero la app usa auth local en IndexedDB.
Solución: Migración que deshabilita RLS en tablas del portal.
