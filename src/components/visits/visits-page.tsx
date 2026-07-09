import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { visitasDB, clientesDB, catSectorDB, visitaSectoresDB } from '@/lib/database'
import { useAuth } from '@/hooks/use-auth'
import { cn, formatDate, formatTime } from '@/lib/utils'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Combobox } from '@/components/ui/combobox'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Plus,
  Search,
  Calendar,
  Clock,
  CheckCircle,
  MapPin,
  Filter,
} from 'lucide-react'
import type { Visita, Cliente, CatSector } from '@/types/database'
import type { VisitaStatus } from '@/types'

const visitStatusLabels: Record<VisitaStatus, string> = {
  Pendiente: 'Pendiente',
  Completo: 'Completo',
  Cancelado: 'Cancelado',
  Reagendado: 'Reagendado',
}

const visitStatusColors: Record<VisitaStatus, string> = {
  Pendiente: 'bg-blue-100 text-blue-700',
  Completo: 'bg-green-100 text-green-700',
  Cancelado: 'bg-red-100 text-red-700',
  Reagendado: 'bg-purple-100 text-purple-700',
}

export function VisitsPage() {
  const { usuario } = useAuth()
  const navigate = useNavigate()
  const [allVisits, setAllVisits] = useState<(Visita & { cliente?: Cliente })[]>([])
  const [clients, setClients] = useState<Cliente[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sectors, setSectors] = useState<CatSector[]>([])
  const [selectedSectors, setSelectedSectors] = useState<string[]>([])

  const [formData, setFormData] = useState({
    clienteId: '',
    fechaVisita: new Date().toISOString().split('T')[0],
    horaVisita: '',
    hospital: '',
    objetivo: '',
  })

  useEffect(() => {
    loadData()
  }, [])

  const visits = allVisits.filter(v => {
    const matchesSearch = !searchQuery || (() => {
      const q = searchQuery.toLowerCase()
      return (
        v.cliente?.razon_social?.toLowerCase().includes(q) ||
        v.cliente?.no_cliente?.includes(q) ||
        v.hospital?.toLowerCase().includes(q) ||
        v.objetivo?.toLowerCase().includes(q)
      )
    })()
    const matchesStatus = statusFilter === 'all' || v.status === statusFilter
    return matchesSearch && matchesStatus
  })

  async function loadData() {
    try {
      const [allVisits, allClients, allSectors] = await Promise.all([
        visitasDB.getAll(),
        clientesDB.getAll(),
        catSectorDB.getAll(),
      ])

      setClients(allClients)
      setSectors(allSectors)

      const visitsWithClients = allVisits
        .map(v => ({
          ...v,
          cliente: allClients.find(c => c.id === v.cliente_id),
        }))
        .sort((a, b) => new Date(b.fecha_visita).getTime() - new Date(a.fecha_visita).getTime())
      
      setAllVisits(visitsWithClients)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!formData.clienteId || !formData.fechaVisita) return

    try {
      const newVisit = await visitasDB.create({
        educador_id: usuario?.id || '',
        cliente_id: formData.clienteId,
        fecha_visita: formData.fechaVisita,
        hora_visita: formData.horaVisita || null,
        hospital: formData.hospital || null,
        objetivo: formData.objetivo || null,
        status: 'Pendiente',
        cliente_libre: null,
        id_origen: null,
        gcal_event_id: null,
        fecha_llegada: null,
        hora_llegada: null,
        lat_llegada: null,
        lng_llegada: null,
        fecha_salida: null,
        hora_salida: null,
        lat_salida: null,
        lng_salida: null,
        deleted_at: null,
        updated_at: new Date().toISOString(),
      })

      // Save selected sectors
      for (const sectorId of selectedSectors) {
        await visitaSectoresDB.create({
          visita_id: newVisit.id,
          sector_id: sectorId,
          objetivo: null,
          deleted_at: null,
          updated_at: new Date().toISOString(),
        })
      }

      setIsDialogOpen(false)
      setSelectedSectors([])
      loadData()
    } catch (error) {
      console.error('Error saving visit:', error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Visitas</h1>
          <p className="text-muted-foreground">
            {visits.length} visitas registradas
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nueva Visita
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar visitas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="Pendiente">Pendientes</SelectItem>
            <SelectItem value="Completo">Completadas</SelectItem>
            <SelectItem value="Cancelado">Canceladas</SelectItem>
            <SelectItem value="Reagendado">Reagendadas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-12 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : visits.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">
              {searchQuery || statusFilter !== 'all'
                ? 'No se encontraron visitas con esos filtros'
                : 'No hay visitas registradas'}
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <Button variant="outline" className="mt-4" onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> Agregar primera visita
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {visits.map((visit) => (
            <Card
              key={visit.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/visits/${visit.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2 rounded-lg",
                      visit.status === 'Completo' ? "bg-green-100" : 
                      visit.status === 'Pendiente' ? "bg-blue-100" : "bg-red-100"
                    )}>
                      {visit.status === 'Completo' ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : visit.status === 'Pendiente' ? (
                        <Clock className="h-5 w-5 text-blue-600" />
                      ) : (
                        <Calendar className="h-5 w-5 text-red-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">
                        {visit.cliente?.razon_social || 'Cliente no encontrado'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(visit.fecha_visita)}
                        {visit.hora_visita && ` • ${formatTime(visit.hora_visita)}`}
                        {visit.hospital && ` • ${visit.hospital}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {visit.hospital && (
                      <Badge variant="outline" className="hidden sm:flex">
                        <MapPin className="h-3 w-3 mr-1" />
                        {visit.hospital}
                      </Badge>
                    )}
                    <Badge
                      className={cn("text-xs", visitStatusColors[visit.status])}
                    >
                      {visitStatusLabels[visit.status]}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Nueva Visita</DialogTitle>
            <DialogDescription>Registra una nueva visita a cliente</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="clienteId">Cliente *</Label>
              <Combobox
                items={clients.map(c => ({
                  value: c.id,
                  label: c.razon_social,
                  subtitle: `${c.no_cliente}${c.poblacion ? ` • ${c.poblacion}` : ''}`,
                }))}
                value={formData.clienteId}
                onValueChange={(value) => setFormData({ ...formData, clienteId: value })}
                placeholder="Buscar y seleccionar cliente..."
                searchPlaceholder="Escribe para buscar por nombre o código..."
                emptyMessage="No se encontraron clientes"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fechaVisita">Fecha *</Label>
                <Input
                  id="fechaVisita"
                  type="date"
                  value={formData.fechaVisita}
                  onChange={(e) => setFormData({ ...formData, fechaVisita: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="horaVisita">Hora</Label>
                <Input
                  id="horaVisita"
                  type="time"
                  value={formData.horaVisita}
                  onChange={(e) => setFormData({ ...formData, horaVisita: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hospital">Hospital</Label>
              <Input
                id="hospital"
                value={formData.hospital}
                onChange={(e) => setFormData({ ...formData, hospital: e.target.value })}
                placeholder="Ej: Hospital General"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="objetivo">Objetivo</Label>
              <Textarea
                id="objetivo"
                value={formData.objetivo}
                onChange={(e) => setFormData({ ...formData, objetivo: e.target.value })}
                placeholder="Objetivo de la visita..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Sectores a visitar</Label>
              <div className="flex flex-wrap gap-2">
                {sectors.map((sector) => (
                  <button
                    key={sector.id}
                    type="button"
                    onClick={() => {
                      setSelectedSectors((prev) =>
                        prev.includes(sector.id)
                          ? prev.filter((s) => s !== sector.id)
                          : [...prev, sector.id]
                      )
                    }}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-sm border transition-colors',
                      selectedSectors.includes(sector.id)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background hover:bg-muted border-border'
                    )}
                  >
                    {sector.nombre}
                  </button>
                ))}
              </div>
              {selectedSectors.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {selectedSectors.length} sector(es) seleccionado(s)
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formData.clienteId || !formData.fechaVisita}
            >
              Crear visita
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}