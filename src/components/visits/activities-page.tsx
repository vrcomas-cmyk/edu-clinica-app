import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { actividadesDB, visitasDB, clientesDB } from '@/lib/database'
import { cn, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Plus,
  Search,
  FileText,
  Clock,
  CheckCircle,
} from 'lucide-react'
import type { Actividad, Visita, Cliente } from '@/types/database'

export function ActivitiesPage() {
  const navigate = useNavigate()
  const [activities, setActivities] = useState<(Actividad & { visit?: Visita & { client?: Cliente } })[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadActivities()
  }, [])

  useEffect(() => {
    filterActivities()
  }, [searchQuery, statusFilter])

  async function loadActivities() {
    try {
      const [allActivities, allVisits, allClients] = await Promise.all([
        actividadesDB.getAll(),
        visitasDB.getAll(),
        clientesDB.getAll(),
      ])

      const activitiesWithDetails = allActivities
        .map(activity => {
          const visit = allVisits.find(v => v.id === activity.visita_id)
          const client = visit ? allClients.find(c => c.id === visit.cliente_id) : undefined
          return {
            ...activity,
            visit: visit ? { ...visit, client } : undefined,
          }
        })
        .sort((a, b) => {
          const dateA = a.visit?.fecha_visita || ''
          const dateB = b.visit?.fecha_visita || ''
          return dateB.localeCompare(dateA)
        })

      setActivities(activitiesWithDetails)
    } catch (error) {
      console.error('Error loading activities:', error)
    } finally {
      setLoading(false)
    }
  }

  function filterActivities() {
    // Filtering is done in the render
  }

  const filteredActivities = activities.filter(activity => {
    const matchesSearch = !searchQuery || 
      'Actividad'.toLowerCase().includes(searchQuery.toLowerCase()) ||
      activity.visit?.client?.razon_social?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || activity.estado_actividad === statusFilter
    
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Actividades</h1>
          <p className="text-muted-foreground">
            {activities.length} actividades registradas
          </p>
        </div>
        <Button onClick={() => navigate('/visits')} className="gap-2">
          <Plus className="h-4 w-4" />
          Nueva Actividad
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar actividades..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'Pendiente', 'Aprobado', 'Rechazado'].map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(status)}
            >
              {status === 'all' ? 'Todas' :
               status === 'Pendiente' ? 'Pendientes' :
               status === 'Aprobado' ? 'Aprobadas' : 'Rechazadas'}
            </Button>
          ))}
        </div>
      </div>

      {/* Activities list */}
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
      ) : filteredActivities.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">
              {searchQuery || statusFilter !== 'all'
                ? 'No se encontraron actividades con esos filtros'
                : 'No hay actividades registradas'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredActivities.map((activity) => (
            <Card
              key={activity.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => activity.visit && navigate(`/visits/${activity.visita_id}`)}
            >
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2 rounded-lg",
                      activity.estado_actividad === 'Aprobado' ? "bg-green-100" :
                      activity.estado_actividad === 'Rechazado' ? "bg-orange-100" : "bg-blue-100"
                    )}>
                      {activity.estado_actividad === 'Aprobado' ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : activity.estado_actividad === 'Rechazado' ? (
                        <Clock className="h-5 w-5 text-orange-600" />
                      ) : (
                        <FileText className="h-5 w-5 text-blue-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">Actividad</p>
                      <p className="text-sm text-muted-foreground">
                        {activity.visit?.client?.razon_social || 'Cliente'} • {activity.visit?.fecha_visita ? formatDate(activity.visit.fecha_visita) : 'Sin fecha'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={activity.estado_actividad === 'Aprobado' ? 'default' : 'secondary'}
                    >
                      {activity.estado_actividad === 'Aprobado' ? 'Aprobada' :
                       activity.estado_actividad === 'Rechazado' ? 'Rechazada' : 'Pendiente'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
