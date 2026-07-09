import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { clientesDB, visitasDB, contactosDB, comentariosDB, usuariosDB } from '@/lib/database'
import { useAuth } from '@/hooks/use-auth'
import { cn, getInitials, formatDateTime } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  ArrowLeft,
  MapPin,
  Building2,
  Calendar,
  FileText,
  Users,
  Plus,
  CheckCircle,
  Clock,
  MessageSquare,
  UserPlus,
  History,
} from 'lucide-react'
import type { Cliente, Contacto, Visita, Comentario, Usuario } from '@/types/database'

export function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { usuario } = useAuth()
  const [client, setClient] = useState<Cliente | null>(null)
  const [visits, setVisits] = useState<Visita[]>([])
  const [contacts, setContacts] = useState<Contacto[]>([])
  const [comments, setComments] = useState<Comentario[]>([])
  const [nuevoComentario, setNuevoComentario] = useState('')
  const [educadores, setEducadores] = useState<Usuario[]>([])
  const [transferDialogOpen, setTransferDialogOpen] = useState(false)
  const [selectedEducador, setSelectedEducador] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      loadClientData(id)
    }
  }, [id])

  async function loadClientData(clientId: string) {
    try {
      const clientData = await clientesDB.getById(clientId)
      if (clientData) {
        setClient(clientData)

        const [clientVisits, clientContacts, clientComments, allEducadores] = await Promise.all([
          visitasDB.getByCliente(clientId),
          contactosDB.getByCliente(clientId),
          comentariosDB.getByCliente(clientId),
          usuariosDB.getAll(),
        ])

        setVisits(clientVisits)
        setContacts(clientContacts)
        setComments(clientComments)
        setEducadores(allEducadores.filter(u => u.es_educador || u.es_admin))
      }
    } catch (error) {
      console.error('Error loading client:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleAddComentario() {
    if (!id || !nuevoComentario.trim() || !usuario) return
    try {
      await comentariosDB.create({
        visita_id: '',
        cliente_id: id,
        usuario_id: usuario.id,
        texto: nuevoComentario.trim(),
      })
      setNuevoComentario('')
      const updated = await comentariosDB.getByCliente(id)
      setComments(updated)
    } catch (error) {
      console.error('Error adding comment:', error)
    }
  }

  async function handleTransfer() {
    if (!client || !selectedEducador) return
    try {
      await clientesDB.update(client.id, {
        educador_asignado: selectedEducador,
      })

      if (usuario) {
        const fromName = usuario.nombre
        const toName = educadores.find(e => e.id === selectedEducador)?.nombre || selectedEducador
        await comentariosDB.create({
          visita_id: '',
          cliente_id: client.id,
          usuario_id: usuario.id,
          texto: `--- ROTACIÓN DE EDUCADOR ---\nDe: ${fromName}\nA: ${toName}\nFecha: ${new Date().toLocaleDateString('es-MX')}`,
        })
      }

      setTransferDialogOpen(false)
      setSelectedEducador('')
      loadClientData(client.id)
    } catch (error) {
      console.error('Error transferring educator:', error)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted rounded w-48 animate-pulse" />
        <div className="h-48 bg-muted rounded animate-pulse" />
      </div>
    )
  }

  if (!client) {
    return (
      <div className="text-center py-12">
        <Building2 className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
        <p className="text-muted-foreground">Cliente no encontrado</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/clients')}>
          Volver a clientes
        </Button>
      </div>
    )
  }

  const completedVisits = visits.filter(v => v.status === 'Completo').length
  const pendingVisits = visits.filter(v => v.status === 'Pendiente').length

  const educatorName = client?.educador_asignado
    ? educadores.find(e => e.id === client.educador_asignado)?.nombre || client.educador_asignado
    : 'Sin asignar'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/clients')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <span className="text-primary font-bold text-lg">
                {getInitials(client.razon_social)}
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-bold">{client.razon_social}</h1>
              <p className="text-sm text-muted-foreground">{client.no_cliente}</p>
            </div>
          </div>
        </div>
        {usuario?.es_admin && (
          <Button
            variant="outline"
            className="gap-2 border-amber-500 text-amber-600 hover:bg-amber-50"
            onClick={() => setTransferDialogOpen(true)}
          >
            <UserPlus className="h-4 w-4" />
            Transferir
          </Button>
        )}
      </div>

      {/* Info cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{visits.length}</p>
                <p className="text-xs text-muted-foreground">Visitas totales</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{completedVisits}</p>
                <p className="text-xs text-muted-foreground">Completadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingVisits}</p>
                <p className="text-xs text-muted-foreground">Pendientes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Información</TabsTrigger>
          <TabsTrigger value="visits">Visitas ({visits.length})</TabsTrigger>
          <TabsTrigger value="contacts">Contactos ({contacts.length})</TabsTrigger>
          <TabsTrigger value="comments">
            <MessageSquare className="h-4 w-4 mr-1" />
            Comentarios ({comments.length})
          </TabsTrigger>
          <TabsTrigger value="rotacion">
            <History className="h-4 w-4 mr-1" />
            Rotación
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Detalles del Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                {client.rfc && (
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">RFC</p>
                      <p className="font-medium">{client.rfc}</p>
                    </div>
                  </div>
                )}
                {client.poblacion && (
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Población</p>
                      <p className="font-medium">{client.poblacion}</p>
                    </div>
                  </div>
                )}
                {client.estado && (
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Estado</p>
                      <p className="font-medium">{client.estado}</p>
                    </div>
                  </div>
                )}
                {client.ramo && (
                  <div className="flex items-center gap-3">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Ramo</p>
                      <p className="font-medium">{client.ramo}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Educador Asignado</p>
                    <p className="font-medium">{educatorName}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="visits" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Historial de Visitas</h3>
            <Button size="sm" onClick={() => navigate('/visits')}>
              <Plus className="h-4 w-4 mr-1" /> Nueva Visita
            </Button>
          </div>
          {visits.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Calendar className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">Sin visitas registradas</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {visits
                .sort((a, b) => b.fecha_visita.localeCompare(a.fecha_visita))
                .map((visit) => (
                  <Card
                    key={visit.id}
                    className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => navigate(`/visits/${visit.id}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "p-2 rounded-lg",
                            visit.status === 'Completo' ? "bg-green-100" : "bg-orange-100"
                          )}>
                            {visit.status === 'Completo' ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <Clock className="h-4 w-4 text-orange-600" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{visit.hospital}</p>
                            <p className="text-sm text-muted-foreground">
                              {visit.fecha_visita} {visit.hora_visita && `• ${visit.hora_visita}`}
                            </p>
                          </div>
                        </div>
                        <Badge variant={visit.status === 'Completo' ? 'default' : 'secondary'}>
                          {visit.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="contacts" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Contactos</h3>
            <Button size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-1" /> Agregar Contacto
            </Button>
          </div>
          {contacts.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">Sin contactos registrados</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {contacts.map((contact) => (
                <Card key={contact.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-primary font-medium">
                            {getInitials(contact.nombre)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{contact.nombre}</p>
                          {contact.cargo && (
                            <p className="text-sm text-muted-foreground">{contact.cargo}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        {contact.telefono && <p>{contact.telefono}</p>}
                        {contact.correo && <p className="truncate max-w-48">{contact.correo}</p>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Comments Tab ── */}
        <TabsContent value="comments" className="space-y-4">
          <div className="space-y-3">
            {comments.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">Sin comentarios</p>
                </CardContent>
              </Card>
            ) : (
              comments.map((com) => (
                <Card key={com.id}>
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-primary text-xs font-semibold">
                          {com.usuario_id.slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm whitespace-pre-wrap">{com.texto}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDateTime(com.created_at)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
          <div className="flex gap-2">
            <textarea
              value={nuevoComentario}
              onChange={(e) => setNuevoComentario(e.target.value)}
              placeholder="Escribe un comentario sobre este cliente..."
              rows={2}
              className="flex-1 min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            <Button
              onClick={handleAddComentario}
              disabled={!nuevoComentario.trim()}
              className="self-end"
            >
              Enviar
            </Button>
          </div>
        </TabsContent>

        {/* ── Rotation history Tab ── */}
        <TabsContent value="rotacion" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Historial de Rotación
              </CardTitle>
            </CardHeader>
            <CardContent>
              {comments.filter(c => c.texto.includes('ROTACIÓN')).length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No hay cambios de educador registrados
                </p>
              ) : (
                <div className="space-y-3">
                  {comments
                    .filter(c => c.texto.includes('ROTACIÓN'))
                    .sort((a, b) => b.created_at.localeCompare(a.created_at))
                    .map((com) => (
                      <Card key={com.id} className="border-amber-200 bg-amber-50/50">
                        <CardContent className="p-3">
                          <p className="text-sm whitespace-pre-wrap">{com.texto.replace('--- ROTACIÓN DE EDUCADOR ---\n', '')}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDateTime(com.created_at)}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Transfer Dialog ── */}
      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Transferir Cliente</DialogTitle>
            <DialogDescription>
              Asigna un nuevo educador responsable. Se mantendrá el historial completo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nuevo Educador</Label>
              <select
                value={selectedEducador}
                onChange={(e) => setSelectedEducador(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              >
                <option value="">Seleccionar educador...</option>
                {educadores.map((edu) => (
                  <option key={edu.id} value={edu.id}>
                    {edu.nombre} {edu.es_admin ? '(Admin)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleTransfer} disabled={!selectedEducador}>
              Transferir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
