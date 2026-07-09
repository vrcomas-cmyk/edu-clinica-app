import { useEffect, useState, useRef, useCallback } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/config/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Upload, FileText, Users, CheckCircle, XCircle, Loader2,
  Eye, EyeOff, AlertTriangle,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { showToast } from '@/components/ui/toaster'
import type { Usuario, PortalUpload, UsuarioModulo } from '@/types/database'
import {
  processUpload, ROLE_LABELS, type UploadResult,
} from '@/lib/portal/upload'

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

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } }
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }

export function AdminPortalPage() {
  const { usuario } = useAuth()
  const [uploads, setUploads] = useState<PortalUpload[]>([])
  const [users, setUsers] = useState<Usuario[]>([])
  const [userModules, setUserModules] = useState<UsuarioModulo[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [showResult, setShowResult] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!usuario?.es_admin) return
    loadData()
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

  const handleFileUpload = useCallback(async (file: File) => {
    if (!supabase || !usuario) return
    setUploading(true)
    setUploadProgress('Leyendo archivo...')
    setUploadResult(null)

    try {
      const buf = await file.arrayBuffer()
      setUploadProgress('Parseando hojas Excel...')

      const result = await processUpload(supabase, buf, file.name, usuario.id, (msg) => {
        setUploadProgress(msg)
      })

      setUploadResult(result)
      setShowResult(true)

      const okCount = result.ingests.filter(i => i.ok).length
      const totalRows = result.ingests.reduce((s, i) => s + i.done, 0)
      showToast({
        title: `${file.name} procesado`,
        description: `${okCount} hojas ingestate · ${totalRows} filas totales · ${result.catalogos.info}`,
        variant: okCount > 0 ? 'success' : 'destructive',
      })

      loadData()
    } catch (e: any) {
      showToast({ title: 'Error al procesar', description: e.message, variant: 'destructive' })
    }
    setUploading(false)
    setUploadProgress('')
  }, [supabase, usuario])

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
        <p className="text-muted-foreground text-sm mt-0.5">Subir archivos Excel, gestionar usuarios y módulos</p>
      </motion.div>

      {/* Upload Section */}
      <motion.div variants={item}>
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-display font-semibold flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Subir Archivo Excel
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground mb-4">
              El sistema detecta automáticamente el tipo de reporte por los encabezados de cada hoja:
              Resumen Facturación, Sugerencias, Consumo, RSS, Inventario. También llena los catálogos
              de ejecutivos, grupos de cliente, solicitantes y destinatarios.
            </p>

            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0]
                if (f) handleFileUpload(f)
                e.target.value = ''
              }}
            />

            <Button
              className="gap-2"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {uploading ? uploadProgress : 'Seleccionar archivo Excel'}
            </Button>

            {/* Progress */}
            {uploading && uploadProgress && (
              <div className="mt-3 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {uploadProgress}
              </div>
            )}

            {/* Result */}
            <AnimatePresence>
              {showResult && uploadResult && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 overflow-hidden"
                >
                  <div className="p-4 rounded-xl border border-border/50 bg-muted/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{uploadResult.fileName}</p>
                      <Button variant="ghost" size="sm" onClick={() => setShowResult(false)}>
                        Cerrar
                      </Button>
                    </div>

                    {/* Sheets detected */}
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-medium text-muted-foreground uppercase">Hojas detectadas</p>
                      {uploadResult.sheets.map((s, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          {s.role ? (
                            <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                          ) : (
                            <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                          <span className="font-medium">{s.name}</span>
                          <span className="text-muted-foreground">({s.rows} filas)</span>
                          {s.role && (
                            <Badge variant="secondary" className="text-[9px]">{ROLE_LABELS[s.role]}</Badge>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Ingest results */}
                    {uploadResult.ingests.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-medium text-muted-foreground uppercase">Ingesta</p>
                        {uploadResult.ingests.map((ing, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            {ing.ok ? (
                              <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                            ) : (
                              <XCircle className="h-3.5 w-3.5 text-red-500" />
                            )}
                            <span>{ROLE_LABELS[ing.type]}</span>
                            <span className="text-muted-foreground">
                              {ing.ok ? `${ing.done} filas` : ing.error}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Catalogs */}
                    <div className="flex items-center gap-2 text-xs">
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                      <span>Catálogos: {uploadResult.catalogos.info}</span>
                    </div>

                    {/* Storage */}
                    {uploadResult.storagePath && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <FileText className="h-3.5 w-3.5" />
                        <span>Archivo guardado en Storage</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
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
                    {u.status === 'active' ? (
                      <CheckCircle className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-muted-foreground" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{u.filename}</p>
                      <p className="text-xs text-muted-foreground">
                        {u.report_type} · {new Date(u.created_at).toLocaleDateString('es-MX')}
                      </p>
                    </div>
                    <Badge variant={u.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">
                      {u.status}
                    </Badge>
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
