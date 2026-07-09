import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/config/supabase'
import { clientesDB } from '@/lib/database'
import { getInitials } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Plus, Search, MapPin, Building2, Edit, Trash2, Hash, Briefcase,
  Truck, UserCheck, ChevronDown, ChevronUp,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Cliente, Solicitante, Destinatario, Ejecutivo, GrupoCliente } from '@/types/database'

interface SolicitanteConDetalles extends Solicitante {
  ejecutivo_nombre?: string
  ejecutivo_zona?: string
  grupo_nombre?: string
  destinatarios?: Destinatario[]
  expanded?: boolean
}

export function ClientsPage() {
  const navigate = useNavigate()
  const [clients, setClients] = useState<Cliente[]>([])
  const [solicitantes, setSolicitantes] = useState<SolicitanteConDetalles[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Cliente | null>(null)
  const [loading, setLoading] = useState(true)
  const [dataSource, setDataSource] = useState<'local' | 'portal'>('local')

  const [formData, setFormData] = useState({
    razon_social: '',
    no_cliente: '',
    rfc: '',
    poblacion: '',
    estado: '',
    ramo: '',
    educador_asignado: '',
  })

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    try {
      // Cargar clientes locales
      const localClients = await clientesDB.getAll()
      setClients(localClients)

      // Cargar solicitantes desde Supabase (datos del upload)
      if (supabase) {
        const [solicRes, ejecRes, gpoRes, destRes] = await Promise.all([
          supabase.from('solicitantes').select('*').eq('activo', true).limit(2000),
          supabase.from('ejecutivos').select('*').eq('activo', true),
          supabase.from('grupos_cliente').select('*').eq('activo', true),
          supabase.from('destinatarios').select('*').eq('activo', true).limit(5000),
        ])

        const ejecMap = new Map<string, Ejecutivo>()
        ;(ejecRes.data || []).forEach(e => ejecMap.set(e.codigo, e))

        const gpoMap = new Map<string, GrupoCliente>()
        ;(gpoRes.data || []).forEach(g => gpoMap.set(g.codigo, g))

        const destBySolic = new Map<string, Destinatario[]>()
        ;(destRes.data || []).forEach(d => {
          if (!d.solicitante_id) return
          const arr = destBySolic.get(d.solicitante_id) || []
          arr.push(d)
          destBySolic.set(d.solicitante_id, arr)
        })

        const enriched = (solicRes.data || []).map(s => ({
          ...s,
          ejecutivo_nombre: ejecMap.get(s.grupo_vendedor || '')?.nombre || '',
          ejecutivo_zona: ejecMap.get(s.grupo_vendedor || '')?.zona || '',
          grupo_nombre: gpoMap.get(s.grupo_cliente_id || '')?.nombre || '',
          destinatarios: destBySolic.get(s.id) || [],
        }))

        setSolicitantes(enriched)
        if (enriched.length > 0) setDataSource('portal')
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredSolicitantes = useMemo(() => {
    if (!searchQuery) return solicitantes
    const q = searchQuery.toLowerCase()
    return solicitantes.filter(s =>
      s.razon_social?.toLowerCase().includes(q) ||
      s.codigo?.toLowerCase().includes(q) ||
      s.ejecutivo_nombre?.toLowerCase().includes(q) ||
      s.grupo_nombre?.toLowerCase().includes(q)
    )
  }, [solicitantes, searchQuery])

  const filteredClients = useMemo(() => {
    if (!searchQuery) return clients
    const q = searchQuery.toLowerCase()
    return clients.filter(c =>
      c.razon_social?.toLowerCase().includes(q) ||
      c.no_cliente?.toLowerCase().includes(q) ||
      c.rfc?.toLowerCase().includes(q)
    )
  }, [clients, searchQuery])

  function openCreateDialog() {
    setEditingClient(null)
    setFormData({ razon_social: '', no_cliente: '', rfc: '', poblacion: '', estado: '', ramo: '', educador_asignado: '' })
    setIsDialogOpen(true)
  }

  function openEditDialog(client: Cliente) {
    setEditingClient(client)
    setFormData({
      razon_social: client.razon_social,
      no_cliente: client.no_cliente,
      rfc: client.rfc || '',
      poblacion: client.poblacion || '',
      estado: client.estado || '',
      ramo: client.ramo || '',
      educador_asignado: client.educador_asignado || '',
    })
    setIsDialogOpen(true)
  }

  async function handleSave() {
    if (!formData.razon_social || !formData.no_cliente) return
    try {
      const clienteData = {
        razon_social: formData.razon_social,
        no_cliente: formData.no_cliente,
        rfc: formData.rfc || null,
        poblacion: formData.poblacion || null,
        estado: formData.estado || null,
        ramo: formData.ramo || null,
        educador_asignado: formData.educador_asignado || null,
        lat: editingClient?.lat ?? null,
        lng: editingClient?.lng ?? null,
        deleted_at: editingClient?.deleted_at ?? null,
        updated_at: editingClient?.updated_at || new Date().toISOString(),
        rev: editingClient?.rev || 1,
      }
      if (editingClient) {
        await clientesDB.update(editingClient.id, clienteData)
      } else {
        await clientesDB.create(clienteData)
      }
      setIsDialogOpen(false)
      loadAll()
    } catch (error) {
      console.error('Error saving client:', error)
    }
  }

  async function handleDelete(clientId: string) {
    if (confirm('¿Estás seguro de eliminar este cliente?')) {
      await clientesDB.softDelete(clientId)
      loadAll()
    }
  }

  function toggleExpand(codigo: string) {
    setSolicitantes(prev => prev.map(s =>
      s.codigo === codigo ? { ...s, expanded: !s.expanded } : s
    ))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-muted-foreground">
            {dataSource === 'portal' ? (
              <>{solicitantes.length} solicitantes · {solicitantes.reduce((s, sol) => s + (sol.destinatarios?.length || 0), 0)} destinatarios</>
            ) : (
              <>{clients.length} clientes registrados</>
            )}
          </p>
        </div>
        {dataSource === 'local' && (
          <Button onClick={openCreateDialog} className="gap-2">
            <Plus className="h-4 w-4" />
            Nuevo Cliente
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={dataSource === 'portal'
              ? "Buscar por nombre, código, ejecutivo o grupo..."
              : "Buscar por nombre, número de cliente, RFC..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Portal Data: Solicitantes grid */}
      {dataSource === 'portal' && (
        <div className="space-y-3">
          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="h-12 bg-muted rounded mb-3" />
                    <div className="h-4 bg-muted rounded w-2/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredSolicitantes.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Building2 className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">
                  {searchQuery ? 'No se encontraron resultados' : 'No hay datos. Sube un archivo Excel en Admin Portal.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredSolicitantes.map(sol => (
              <Card key={sol.id} className="border-border/50 hover:shadow-card-hover transition-all">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-primary font-semibold text-sm">
                          {getInitials(sol.razon_social)}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-medium text-sm truncate">{sol.razon_social}</h3>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <Hash className="h-3 w-3" />
                          <span className="font-mono">{sol.codigo}</span>
                          {sol.ejecutivo_nombre && (
                            <>
                              <span>·</span>
                              <UserCheck className="h-3 w-3" />
                              <span>{sol.ejecutivo_nombre}</span>
                            </>
                          )}
                          {sol.grupo_nombre && (
                            <>
                              <span>·</span>
                              <Badge variant="secondary" className="text-[9px]">{sol.grupo_nombre}</Badge>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="text-[9px]">
                        {sol.destinatarios?.length || 0} dest.
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => toggleExpand(sol.codigo)}
                      >
                        {sol.expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </div>

                  {/* Destinatarios expandidos */}
                  <AnimatePresence>
                    {sol.expanded && sol.destinatarios && sol.destinatarios.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-3 pt-3 border-t overflow-hidden"
                      >
                        <p className="text-[10px] font-medium text-muted-foreground uppercase mb-2">Destinatarios</p>
                        <div className="space-y-1.5">
                          {sol.destinatarios.map(dest => (
                            <div key={dest.id} className="flex items-center gap-2 text-xs p-2 rounded-lg bg-muted/30">
                              <Truck className="h-3 w-3 text-muted-foreground" />
                              <span className="font-mono">{dest.codigo}</span>
                              <span className="text-muted-foreground truncate flex-1">{dest.razon_social}</span>
                              {dest.centro && <Badge variant="outline" className="text-[9px]">{dest.centro}</Badge>}
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Local Data: Original clients grid */}
      {dataSource === 'local' && (
        <div className="space-y-3">
          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="h-12 bg-muted rounded mb-3" />
                    <div className="h-4 bg-muted rounded w-2/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredClients.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Building2 className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">
                  {searchQuery ? 'No se encontraron clientes' : 'No hay clientes registrados'}
                </p>
                {!searchQuery && (
                  <Button variant="outline" className="mt-4" onClick={openCreateDialog}>
                    <Plus className="h-4 w-4 mr-1" /> Agregar primer cliente
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredClients.map(client => (
                <Card
                  key={client.id}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => navigate(`/clients/${client.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <span className="text-primary font-semibold text-sm">
                            {getInitials(client.razon_social)}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-medium line-clamp-1">{client.razon_social}</h3>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Hash className="h-3 w-3" />
                            <span>{client.no_cliente}</span>
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={e => { e.stopPropagation(); openEditDialog(client) }}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      {client.poblacion && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5" />
                          <span>{client.poblacion}{client.estado && `, ${client.estado}`}</span>
                        </div>
                      )}
                      {client.ramo && (
                        <div className="flex items-center gap-2">
                          <Briefcase className="h-3.5 w-3.5" />
                          <span>{client.ramo}</span>
                        </div>
                      )}
                    </div>
                    <div className="mt-3 pt-3 border-t flex justify-between items-center text-xs text-muted-foreground">
                      {client.rfc && <span className="font-mono">{client.rfc}</span>}
                      {!client.rfc && <span />}
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={e => { e.stopPropagation(); handleDelete(client.id) }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingClient ? 'Editar Cliente' : 'Nuevo Cliente'}</DialogTitle>
            <DialogDescription>
              {editingClient ? 'Actualiza la información del cliente' : 'Agrega un nuevo cliente a tu CRM'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="razon_social">Razón Social *</Label>
              <Input id="razon_social" value={formData.razon_social} onChange={e => setFormData({ ...formData, razon_social: e.target.value })} placeholder="Razón social del cliente" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="no_cliente">Número de Cliente *</Label>
              <Input id="no_cliente" value={formData.no_cliente} onChange={e => setFormData({ ...formData, no_cliente: e.target.value })} placeholder="Número de cliente" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rfc">RFC</Label>
              <Input id="rfc" value={formData.rfc} onChange={e => setFormData({ ...formData, rfc: e.target.value })} placeholder="RFC" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="poblacion">Población</Label>
                <Input id="poblacion" value={formData.poblacion} onChange={e => setFormData({ ...formData, poblacion: e.target.value })} placeholder="Ciudad" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estado">Estado</Label>
                <Input id="estado" value={formData.estado} onChange={e => setFormData({ ...formData, estado: e.target.value })} placeholder="Estado" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ramo">Ramo</Label>
              <Input id="ramo" value={formData.ramo} onChange={e => setFormData({ ...formData, ramo: e.target.value })} placeholder="Ramo del cliente" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="educador_asignado">Educador Asignado</Label>
              <Input id="educador_asignado" value={formData.educador_asignado} onChange={e => setFormData({ ...formData, educador_asignado: e.target.value })} placeholder="Nombre del educador" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!formData.razon_social || !formData.no_cliente}>
              {editingClient ? 'Guardar cambios' : 'Crear cliente'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
