import { useState, useEffect } from 'react'
import { useTheme } from '@/components/theme-provider'
import { useAuth } from '@/hooks/use-auth'
import { catTipoActividadDB, catSectorDB, db } from '@/lib/database'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Sun,
  Moon,
  Monitor,
  Bell,
  Wifi,
  WifiOff,
  RefreshCw,
  Download,
  Upload,
  Trash2,
  Settings,
  CheckCircle,
  Plus,
  Pencil,
  Save,
} from 'lucide-react'
import type { CatTipoActividad, CatSector } from '@/types/database'

export function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const { usuario, isOnline } = useAuth()
  const [notifications, setNotifications] = useState(true)
  const [autoSync, setAutoSync] = useState(true)
  const [tiposActividad, setTiposActividad] = useState<CatTipoActividad[]>([])
  const [sectores, setSectores] = useState<CatSector[]>([])

  // Edit catalog
  const [editingTipo, setEditingTipo] = useState<CatTipoActividad | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editForm, setEditForm] = useState({ nombre: '', prefijo: '', requiere_materiales: false, activo: true })
  const [newTipoOpen, setNewTipoOpen] = useState(false)

  useEffect(() => {
    loadCatalogos()
  }, [])

  async function loadCatalogos() {
    const [tipos, secs] = await Promise.all([
      catTipoActividadDB.getAll(),
      catSectorDB.getAll(),
    ])
    setTiposActividad(tipos)
    setSectores(secs)
  }

  function openEditDialog(tipo: CatTipoActividad) {
    setEditingTipo(tipo)
    setEditForm({
      nombre: tipo.nombre,
      prefijo: tipo.prefijo || '',
      requiere_materiales: tipo.requiere_materiales || false,
      activo: tipo.activo,
    })
    setEditDialogOpen(true)
  }

  async function handleSaveEdit() {
    if (!editingTipo) return
    try {
      const { supabase: sb, isSupabaseConfigured } = await import('@/config/supabase')
      if (isSupabaseConfigured()) {
        await sb!.from('cat_tipo_actividad').update({
          nombre: editForm.nombre,
          prefijo: editForm.prefijo || null,
          requiere_materiales: editForm.requiere_materiales,
          activo: editForm.activo,
        }).eq('id', editingTipo.id)
      }
      await db.cat_tipo_actividad.update(editingTipo.id, {
        nombre: editForm.nombre,
        prefijo: editForm.prefijo || null,
        requiere_materiales: editForm.requiere_materiales,
        activo: editForm.activo,
      })
      setEditDialogOpen(false)
      loadCatalogos()
    } catch (error) {
      console.error('Error saving tipo:', error)
    }
  }

  async function handleCreateTipo() {
    if (!editForm.nombre.trim()) return
    try {
      const { supabase: sb, isSupabaseConfigured } = await import('@/config/supabase')
      const payload = {
        nombre: editForm.nombre,
        prefijo: editForm.prefijo || null,
        requiere_materiales: editForm.requiere_materiales,
        activo: true,
        orden: tiposActividad.length + 1,
      }
      if (isSupabaseConfigured()) {
        const { data } = await sb!.from('cat_tipo_actividad').insert(payload).select().single()
        if (data) {
          await db.cat_tipo_actividad.add(data as any)
        }
      }
      setNewTipoOpen(false)
      setEditForm({ nombre: '', prefijo: '', requiere_materiales: false, activo: true })
      loadCatalogos()
    } catch (error) {
      console.error('Error creating tipo:', error)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Configuración</h1>
        <p className="text-muted-foreground">Administra tu perfil y preferencias</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Perfil</CardTitle>
          <CardDescription>Información de tu cuenta</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xl">
                {usuario?.nombre?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </span>
            </div>
            <div>
              <p className="font-semibold text-lg">{usuario?.nombre}</p>
              <p className="text-muted-foreground">{usuario?.correo}</p>
              <Badge variant="secondary" className="mt-1">
                {usuario?.es_admin ? 'Admin' : usuario?.es_gerente ? 'Gerente' : 'Educador'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Admin: Configuración de catálogos */}
      {usuario?.es_admin && (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Tipos de Actividad
                  </CardTitle>
                  <CardDescription>
                    Gestiona los tipos de actividad, requisitos de evidencia y materiales
                  </CardDescription>
                </div>
                <Button size="sm" onClick={() => { setEditForm({ nombre: '', prefijo: '', requiere_materiales: false, activo: true }); setNewTipoOpen(true) }} className="gap-1">
                  <Plus className="h-4 w-4" /> Nuevo
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {tiposActividad.length === 0 ? (
                <p className="text-sm text-muted-foreground">Cargando...</p>
              ) : (
                tiposActividad.map((tipo) => (
                  <div key={tipo.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <CheckCircle className={cn('h-5 w-5', tipo.activo ? 'text-green-600' : 'text-muted-foreground')} />
                      <div>
                        <p className="font-medium">{tipo.nombre}</p>
                        <p className="text-sm text-muted-foreground">
                          {tipo.requiere_materiales ? 'Requiere materiales' : 'Sin materiales'}
                          {tipo.prefijo ? ` • Prefijo: ${tipo.prefijo}` : ''}
                          {!tipo.activo && ' • Inactivo'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={tipo.requiere_materiales ? 'default' : 'secondary'}>
                        {tipo.requiere_materiales ? 'Materiales' : 'Básico'}
                      </Badge>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(tipo)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Sectores
              </CardTitle>
              <CardDescription>
                Catálogo de sectores disponibles para visitas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {sectores.map((s) => (
                  <Badge key={s.id} variant="outline" className="text-sm">
                    {s.nombre}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Edit dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Editar Tipo de Actividad</DialogTitle>
            <DialogDescription>Modifica la configuración del tipo de actividad</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input value={editForm.nombre} onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Prefijo</Label>
              <Input value={editForm.prefijo} onChange={(e) => setEditForm({ ...editForm, prefijo: e.target.value })} placeholder="Ej: CAP, VIS" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="req-mat" checked={editForm.requiere_materiales} onChange={(e) => setEditForm({ ...editForm, requiere_materiales: e.target.checked })} className="rounded" />
              <Label htmlFor="req-mat">Requiere materiales</Label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="activo-tipo" checked={editForm.activo} onChange={(e) => setEditForm({ ...editForm, activo: e.target.checked })} className="rounded" />
              <Label htmlFor="activo-tipo">Activo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveEdit}><Save className="h-4 w-4 mr-1" /> Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New tipo dialog */}
      <Dialog open={newTipoOpen} onOpenChange={setNewTipoOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Nuevo Tipo de Actividad</DialogTitle>
            <DialogDescription>Crea un nuevo tipo de actividad para las visitas</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input value={editForm.nombre} onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })} placeholder="Ej: Capacitación" />
            </div>
            <div className="space-y-2">
              <Label>Prefijo</Label>
              <Input value={editForm.prefijo} onChange={(e) => setEditForm({ ...editForm, prefijo: e.target.value })} placeholder="Ej: CAP" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="req-mat-new" checked={editForm.requiere_materiales} onChange={(e) => setEditForm({ ...editForm, requiere_materiales: e.target.checked })} className="rounded" />
              <Label htmlFor="req-mat-new">Requiere materiales</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewTipoOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateTipo} disabled={!editForm.nombre.trim()}><Plus className="h-4 w-4 mr-1" /> Crear</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Apariencia</CardTitle>
          <CardDescription>Personaliza el aspecto de la aplicación</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sun className="h-5 w-5" />
              <div>
                <p className="font-medium">Modo claro</p>
                <p className="text-sm text-muted-foreground">Tema claro</p>
              </div>
            </div>
            <Switch checked={theme === 'light'} onCheckedChange={() => setTheme('light')} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Moon className="h-5 w-5" />
              <div>
                <p className="font-medium">Modo oscuro</p>
                <p className="text-sm text-muted-foreground">Tema oscuro</p>
              </div>
            </div>
            <Switch checked={theme === 'dark'} onCheckedChange={() => setTheme('dark')} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Monitor className="h-5 w-5" />
              <div>
                <p className="font-medium">Automático</p>
                <p className="text-sm text-muted-foreground">Seguir sistema</p>
              </div>
            </div>
            <Switch checked={theme === 'system'} onCheckedChange={() => setTheme('system')} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notificaciones</CardTitle>
          <CardDescription>Configura tus alertas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5" />
              <div>
                <p className="font-medium">Notificaciones push</p>
                <p className="text-sm text-muted-foreground">Recibe alertas de visitas</p>
              </div>
            </div>
            <Switch checked={notifications} onCheckedChange={setNotifications} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sincronización</CardTitle>
          <CardDescription>Gestiona la sincronización de datos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isOnline ? (
                <Wifi className="h-5 w-5 text-green-600" />
              ) : (
                <WifiOff className="h-5 w-5 text-orange-600" />
              )}
              <div>
                <p className="font-medium">Estado de conexión</p>
                <p className="text-sm text-muted-foreground">
                  {isOnline ? 'Conectado' : 'Sin conexión - modo offline'}
                </p>
              </div>
            </div>
            <Badge variant={isOnline ? 'default' : 'secondary'}>
              {isOnline ? 'Online' : 'Offline'}
            </Badge>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <RefreshCw className="h-5 w-5" />
              <div>
                <p className="font-medium">Sincronización automática</p>
                <p className="text-sm text-muted-foreground">Sincronizar al tener conexión</p>
              </div>
            </div>
            <Switch checked={autoSync} onCheckedChange={setAutoSync} />
          </div>
          <Separator />
          <Button variant="outline" className="w-full gap-2">
            <RefreshCw className="h-4 w-4" />
            Sincronizar ahora
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Datos</CardTitle>
          <CardDescription>Gestiona tus datos locales</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button variant="outline" className="w-full gap-2">
            <Download className="h-4 w-4" />
            Exportar datos
          </Button>
          <Button variant="outline" className="w-full gap-2">
            <Upload className="h-4 w-4" />
            Importar datos
          </Button>
          <Separator />
          <Button variant="destructive" className="w-full gap-2">
            <Trash2 className="h-4 w-4" />
            Limpiar datos locales
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Acerca de</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>EduClínica CRM v1.0.0</p>
          <p>DEGASA - Sistema de Educación Clínica</p>
        </CardContent>
      </Card>
    </div>
  )
}
