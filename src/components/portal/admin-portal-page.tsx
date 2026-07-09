import { useEffect, useState, useRef } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/config/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Upload,
  FileText,
  Users,
  CheckCircle,
  XCircle,
  Loader2,
  Eye,
  EyeOff,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { showToast } from '@/components/ui/toaster'
import type { Usuario, PortalUpload, UsuarioModulo } from '@/types/database'

const REPORT_TYPES = [
  { key: 'resumen_fac', label: 'Resumen Facturación', desc: 'Series de tiempo de facturación mensual' },
  { key: 'consumo', label: 'Reporte de Consumo', desc: 'Consumo actual por cliente/material' },
  { key: 'sugerencias', label: 'Sugerencias / BO', desc: 'Pedidos abiertos y fuentes' },
  { key: 'inventario', label: 'Inventario por Condición', desc: 'Stock por condición y centro' },
]

const MODULES = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'clientes', label: 'Clientes' },
  { key: 'visitas', label: 'Visitas' },
  { key: 'calendario', label: 'Calendario' },
  { key: 'reportes', label: 'Reportes' },
  { key: 'consumo', label: 'Consumo' },
  { key: 'sugerencias', label: 'Sugerencias' },
  { key: 'inventario', label: 'Inventario' },
  { key: 'admin', label: 'Admin Portal' },
]

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
}
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
}

export function AdminPortalPage() {
  const { usuario } = useAuth()
  const [uploads, setUploads] = useState<PortalUpload[]>([])
  const [users, setUsers] = useState<Usuario[]>([])
  const [userModules, setUserModules] = useState<UsuarioModulo[]>([])
  const [uploading, setUploading] = useState<string | null>(null)
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})

  useEffect(() => {
    if (!usuario?.es_admin) return
    loadData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario])

  async function loadData() {
    try {
      if (!supabase) return
      const [uploadsRes, usersRes, modsRes] = await Promise.all([
        supabase.from('portal_uploads').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('usuarios').select('*').order('nombre'),
        supabase.from('usuario_modulos').select('*'),
      ])
      setUploads(uploadsRes.data || [])
      setUsers(usersRes.data || [])
      setUserModules(modsRes.data || [])
    } catch (e) {
      console.error('Error loading admin data:', e)
    }
  }

  async function handleFileUpload(reportType: string, file: File) {
    setUploading(reportType)
    try {
      // Parse CSV/Excel client-side
      const text = await file.text()
      const lines = text.split('\n').filter(l => l.trim())
      const rowCount = Math.max(0, lines.length - 1)

      if (!supabase) throw new Error('Sin conexión')

      // Store metadata
      const { error } = await supabase.from('portal_uploads').insert({
        report_type: reportType,
        filename: file.name,
        row_count: rowCount,
        uploaded_by: usuario?.id,
        status: 'active',
      })

      if (error) throw error

      showToast({ title: `${file.name} subido`, description: `${rowCount} registros procesados`, variant: 'success' })
      loadData()
    } catch (e: any) {
      showToast({ title: 'Error al subir', description: e.message, variant: 'destructive' })
    }
    setUploading(null)
  }

  function getUserModulos(userId: string): string[] {
    return userModules.filter(m => m.usuario_id === userId && m.visible).map(m => m.modulo)
  }

  async function toggleUserModulo(userId: string, modulo: string, visible: boolean) {
    if (!supabase) return
    const existing = userModules.find(m => m.usuario_id === userId && m.modulo === modulo)
    if (existing) {
      await supabase.from('usuario_modulos').update({ visible }).eq('id', existing.id)
    } else {
      await supabase.from('usuario_modulos').insert({ usuario_id: userId, modulo, visible })
    }
    loadData()
  }

  if (!usuario?.es_admin) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <XCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Solo administradores pueden acceder</p>
        </div>
      </div>
    )
  }

  return (
    <motion.div className="space-y-6" variants={container} initial="hidden" animate="show">
      <motion.div variants={item}>
        <h1 className="text-2xl font-display font-bold">Admin Portal</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Subir archivos, gestionar usuarios y módulos</p>
      </motion.div>

      {/* Upload Section */}
      <motion.div variants={item}>
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-display font-semibold flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Subir Archivos
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid sm:grid-cols-2 gap-3">
              {REPORT_TYPES.map(rt => (
                <div key={rt.key} className="p-4 rounded-xl border border-border/50 hover:border-primary/20 transition-all">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium">{rt.label}</p>
                      <p className="text-xs text-muted-foreground">{rt.desc}</p>
                    </div>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <input
                      ref={el => { fileRefs.current[rt.key] = el }}
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      className="hidden"
                      onChange={e => {
                        const f = e.target.files?.[0]
                        if (f) handleFileUpload(rt.key, f)
                        e.target.value = ''
                      }}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-xs"
                      disabled={uploading === rt.key}
                      onClick={() => fileRefs.current[rt.key]?.click()}
                    >
                      {uploading === rt.key ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Upload className="h-3.5 w-3.5" />
                      )}
                      Seleccionar archivo
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Upload History */}
      <motion.div variants={item}>
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-display font-semibold">Historial de Uploads</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {uploads.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Sin uploads registrados</p>
            ) : (
              <div className="space-y-2">
                {uploads.map(u => (
                  <div key={u.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/30 hover:bg-muted/30 transition-colors">
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{u.filename}</p>
                      <p className="text-xs text-muted-foreground">
                        {REPORT_TYPES.find(rt => rt.key === u.report_type)?.label || u.report_type} · {u.row_count} registros
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-[10px]">{u.status}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(u.created_at).toLocaleDateString('es-MX')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* User Module Visibility */}
      <motion.div variants={item}>
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-display font-semibold flex items-center gap-2">
              <Users className="h-4 w-4" />
              Módulos por Usuario
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground mb-4">Controla qué módulos puede ver cada usuario</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Usuario</th>
                    <th className="text-center px-2 py-2 font-medium text-muted-foreground text-[10px]">Rol</th>
                    {MODULES.map(m => (
                      <th key={m.key} className="text-center px-2 py-2 font-medium text-muted-foreground text-[10px]">{m.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => {
                    const mods = getUserModulos(u.id)
                    return (
                      <tr key={u.id} className="border-b border-border/30 hover:bg-muted/20">
                        <td className="px-3 py-2">
                          <p className="font-medium text-xs">{u.nombre}</p>
                          <p className="text-[10px] text-muted-foreground">{u.correo}</p>
                        </td>
                        <td className="text-center px-2 py-2">
                          <Badge variant={u.es_admin ? 'default' : u.es_gerente ? 'secondary' : 'outline'} className="text-[9px]">
                            {u.es_admin ? 'Admin' : u.es_gerente ? 'Gerente' : 'Educador'}
                          </Badge>
                        </td>
                        {MODULES.map(m => {
                          const isVisible = mods.includes(m.key) || u.es_admin
                          return (
                            <td key={m.key} className="text-center px-2 py-2">
                              <button
                                onClick={() => toggleUserModulo(u.id, m.key, !isVisible)}
                                disabled={u.es_admin}
                                className="p-1 rounded hover:bg-muted transition-colors disabled:opacity-50"
                              >
                                {isVisible ? (
                                  <Eye className="h-3.5 w-3.5 text-emerald-500" />
                                ) : (
                                  <EyeOff className="h-3.5 w-3.5 text-muted-foreground/40" />
                                )}
                              </button>
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
