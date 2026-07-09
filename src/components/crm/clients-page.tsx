import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { clientesDB } from '@/lib/database'
import { getInitials } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
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
  Plus,
  Search,
  MapPin,
  Building2,
  Edit,
  Trash2,
  Hash,
  Briefcase,
} from 'lucide-react'
import type { Cliente } from '@/types/database'

export function ClientsPage() {
  const navigate = useNavigate()
  const [clients, setClients] = useState<Cliente[]>([])
  const [filteredClients, setFilteredClients] = useState<Cliente[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Cliente | null>(null)
  const [loading, setLoading] = useState(true)

  const [formData, setFormData] = useState({
    razon_social: '',
    no_cliente: '',
    rfc: '',
    poblacion: '',
    estado: '',
    ramo: '',
    educador_asignado: '',
  })

  useEffect(() => {
    loadClients()
  }, [])

  useEffect(() => {
    if (searchQuery) {
      handleSearch(searchQuery)
    } else {
      setFilteredClients(clients)
    }
  }, [clients, searchQuery])

  async function loadClients() {
    try {
      const data = await clientesDB.getAll()
      setClients(data)
    } catch (error) {
      console.error('Error loading clients:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSearch(query: string) {
    try {
      const results = await clientesDB.search(query)
      setFilteredClients(results)
    } catch (error) {
      console.error('Error searching clients:', error)
    }
  }

  function openCreateDialog() {
    setEditingClient(null)
    setFormData({
      razon_social: '',
      no_cliente: '',
      rfc: '',
      poblacion: '',
      estado: '',
      ramo: '',
      educador_asignado: '',
    })
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
      loadClients()
    } catch (error) {
      console.error('Error saving client:', error)
    }
  }

  async function handleDelete(clientId: string) {
    if (confirm('¿Estás seguro de eliminar este cliente?')) {
      await clientesDB.softDelete(clientId)
      loadClients()
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-muted-foreground">
            {clients.length} clientes registrados
          </p>
        </div>
        <Button onClick={openCreateDialog} className="gap-2">
          <Plus className="h-4 w-4" />
          Nuevo Cliente
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, número de cliente, RFC o población..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Clients grid */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
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
              {searchQuery
                ? 'No se encontraron clientes con esos filtros'
                : 'No hay clientes registrados'}
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
          {filteredClients.map((client) => (
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
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation()
                      openEditDialog(client)
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-2 text-sm text-muted-foreground">
                  {client.poblacion && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>
                        {client.poblacion}
                        {client.estado && `, ${client.estado}`}
                      </span>
                    </div>
                  )}
                  {client.ramo && (
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-3.5 w-3.5" />
                      <span>{client.ramo}</span>
                    </div>
                  )}
                  {client.educador_asignado && (
                    <div className="flex items-center gap-2">
                      <Building2 className="h-3.5 w-3.5" />
                      <span>Educador: {client.educador_asignado}</span>
                    </div>
                  )}
                </div>

                <div className="mt-3 pt-3 border-t flex justify-between items-center text-xs text-muted-foreground">
                  {client.rfc && (
                    <span className="font-mono">{client.rfc}</span>
                  )}
                  {!client.rfc && <span />}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(client.id)
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingClient ? 'Editar Cliente' : 'Nuevo Cliente'}
            </DialogTitle>
            <DialogDescription>
              {editingClient
                ? 'Actualiza la información del cliente'
                : 'Agrega un nuevo cliente a tu CRM'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="razon_social">Razón Social *</Label>
              <Input
                id="razon_social"
                value={formData.razon_social}
                onChange={(e) => setFormData({ ...formData, razon_social: e.target.value })}
                placeholder="Razón social del cliente"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="no_cliente">Número de Cliente *</Label>
              <Input
                id="no_cliente"
                value={formData.no_cliente}
                onChange={(e) => setFormData({ ...formData, no_cliente: e.target.value })}
                placeholder="Número de cliente"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rfc">RFC</Label>
              <Input
                id="rfc"
                value={formData.rfc}
                onChange={(e) => setFormData({ ...formData, rfc: e.target.value })}
                placeholder="RFC"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="poblacion">Población</Label>
                <Input
                  id="poblacion"
                  value={formData.poblacion}
                  onChange={(e) => setFormData({ ...formData, poblacion: e.target.value })}
                  placeholder="Ciudad o población"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estado">Estado</Label>
                <Input
                  id="estado"
                  value={formData.estado}
                  onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                  placeholder="Estado"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ramo">Ramo</Label>
              <Input
                id="ramo"
                value={formData.ramo}
                onChange={(e) => setFormData({ ...formData, ramo: e.target.value })}
                placeholder="Ramo del cliente"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="educador_asignado">Educador Asignado</Label>
              <Input
                id="educador_asignado"
                value={formData.educador_asignado}
                onChange={(e) => setFormData({ ...formData, educador_asignado: e.target.value })}
                placeholder="Nombre del educador"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formData.razon_social || !formData.no_cliente}
            >
              {editingClient ? 'Guardar cambios' : 'Crear cliente'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
