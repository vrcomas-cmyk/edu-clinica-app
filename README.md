# EduClínica CRM - DEGASA

PWA CRM para gestión de equipo de educación clínica y promotoría.

## Características

- **Offline-First**: Funciona sin conexión con Dexie.js (IndexedDB)
- **Sincronización**: Sincronización automática con Supabase
- **Google Workspace**: Integración con Calendar, Drive y Sheets
- **Geolocalización**: Check-in/out con ubicación
- **Evidencias**: Fotos, PDFs, videos, documentos.
- **Reportes**: Dashboards y gráficas interactivas.
- **Responsive**: Optimizado para móvil, tablet y desktop.
- **PWA**: Instalable como aplicación nativa

## Tecnologías

- React 18 + TypeScript
- Vite
- Tailwind CSS + shadcn/ui
- Supabase (PostgreSQL + Auth + Storage)
- Dexie.js (IndexedDB)
- Recharts (gráficas)
- React Router
- Lucide Icons

## Instalación

```bash
# Clonar repositorio
git clone <url>
cd CRM-Educacion-Clinica

# Instalar dependencias
npm install

# Copiar archivo de entorno
cp .env.example .env

# Configurar variables de entorno en .env
# VITE_SUPABASE_URL=tu_url
# VITE_SUPABASE_ANON_KEY=tu_key

# Ejecutar en desarrollo
npm run dev
```

## Configuración

### 1. Supabase

1. Crear cuenta en [Supabase](https://supabase.com)
2. Crear nuevo proyecto
3. Ejecutar el schema SQL proporcionado
4. Copiar URL y anon key al archivo `.env`

### 2. Google APIs (Opcional)

1. Habilitar Google Calendar API y Google Drive API
2. Crear credenciales OAuth 2.0
3. Agregar Client ID y API Key al `.env`

## Estructura del Proyecto

```
src/
├── components/
│   ├── auth/          # Autenticación
│   ├── calendar/      # Calendario interactivo
│   ├── crm/           # Clientes
│   ├── dashboard/     # Dashboard y reportes
│   ├── layout/        # Layout principal
│   ├── settings/      # Configuración
│   ├── ui/            # Componentes UI (shadcn)
│   └── visits/        # Visitas y actividades
├── config/            # Configuración (Supabase)
├── hooks/             # Custom hooks
├── integrations/      # Google Calendar, Drive, Sheets
├── lib/               # Utilidades, base de datos
├── services/          # Servicios (sync)
├── stores/            # State management
└── types/             # Tipos TypeScript
```

## Módulos

### Dashboard
- Resumen de actividad
- Estadísticas principales
- Accesos rápidos

### Clientes
- CRUD completo
- Filtros por tipo y búsqueda
- Detalle con historial

### Visitas
- Registro con tipo, fecha, ubicación
- Check-in/out con geolocalización
- Estados: programada, en progreso, completada

### Actividades
- Tipos: capacitación, presentación, demostración, etc.
- Productos utilizados
- Asistentes y resultados

### Evidencias
- Fotos, PDFs, videos, documentos
- Subida a Google Drive
- Almacenamiento en Supabase Storage

### Calendario
- Vista mensual y semanal
- Navegación entre meses
- Detalle por día

### Reportes
- Gráficas interactivas
- Métricas por tipo, estado, período
- Exportación de datos

## Roles

- **Educador**: CRUD de visitas, actividades, evidencias
- **Analista**: Revisión y aprobación de evidencias
- **Gerente**: Supervisión, aprobaciones, reportes
- **Admin**: Configuración completa del sistema

## Offline

La aplicación almacena todos los datos localmente en IndexedDB y sincroniza automáticamente cuando hay conexión.

## Licencia

© 2024 DEGASA - Todos los derechos reservados
