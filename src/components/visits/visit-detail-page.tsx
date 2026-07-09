import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import {
  visitasDB,
  clientesDB,
  actividadesDB,
  evidenciasDB,
  catSectorDB,
  catTipoActividadDB,
  materialesDB,
  visitaSectoresDB,
  actividadMaterialesDB,
  comentariosDB,
} from '@/lib/database'
import { cn, formatDate, formatTime } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import {
  ArrowLeft,
  MapPin,
  Clock,
  CheckCircle,
  Calendar,
  FileText,
  Image,
  Video,
  File,
  Mic,
  Plus,
  Loader2,
  Trash2,
  RotateCcw,
  XCircle,
} from 'lucide-react'
import type {
  Visita,
  Cliente,
  Actividad,
  Evidencia,
  CatSector,
  CatTipoActividad,
  Material,
  VisitaSector,
  ActividadMaterial,
  Comentario,
} from '@/types/database'

const visitStatusLabels: Record<string, string> = {
  Pendiente: 'Programada',
  Completo: 'Completada',
  Cancelado: 'Cancelada',
  Reagendado: 'Reprogramada',
}

function getEvidenceIcon(type: string) {
  if (type === 'foto') return <Image className="h-8 w-8 text-muted-foreground" />
  if (type === 'video') return <Video className="h-8 w-8 text-muted-foreground" />
  if (type === 'audio') return <Mic className="h-8 w-8 text-muted-foreground" />
  return <File className="h-8 w-8 text-muted-foreground" />
}

export function VisitDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { usuario } = useAuth()
  const [visit, setVisit] = useState<(Visita & { client?: Cliente }) | null>(null)
  const [sectors, setSectors] = useState<CatSector[]>([])
  const [visitSectors, setVisitSectors] = useState<VisitaSector[]>([])
  const [activities, setActivities] = useState<Actividad[]>([])
  const [activityMaterials, setActivityMaterials] = useState<Record<string, ActividadMaterial[]>>({})
  const [evidences, setEvidences] = useState<Evidencia[]>([])
  const [tiposActividad, setTiposActividad] = useState<CatTipoActividad[]>([])
  const [materiales, setMateriales] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [checkingIn, setCheckingIn] = useState(false)
  const [checkingOut, setCheckingOut] = useState(false)

  // Activity dialog
  const [activityDialogOpen, setActivityDialogOpen] = useState(false)
  const [selectedSectorId, setSelectedSectorId] = useState<string>('')
  const [activityForm, setActivityForm] = useState({
    tipo_actividad_id: '',
    contacto_id: '',
    area_visitada_id: '',
    requiere_evidencia: false,
  })
  const [activityMaterialsForm, setActivityMaterialsForm] = useState<
    { material_id: string; cantidad: string; folio: string }[]
  >([])

  // Reschedule dialog
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false)
  const [rescheduleForm, setRescheduleForm] = useState({
    fecha_visita: '',
    hora_visita: '',
    motivo: '',
  })

  // Cancel dialog
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [cancelMotivo, setCancelMotivo] = useState('')

  // Comments
  const [comentarios, setComentarios] = useState<Comentario[]>([])
  const [nuevoComentario, setNuevoComentario] = useState('')

  // Validation
  const [validationComment, setValidationComment] = useState('')
  const [validationDialog, setValidationDialog] = useState<{ open: boolean; id: string; type: 'actividad' | 'evidencia'; action: 'Aprobado' | 'Rechazado' }>({ open: false, id: '', type: 'actividad', action: 'Aprobado' })

  useEffect(() => {
    if (id) loadVisitData(id)
  }, [id])

  async function loadVisitData(visitId: string) {
    try {
      const visitData = await visitasDB.getById(visitId)
      if (visitData) {
        const client = visitData.cliente_id
          ? await clientesDB.getById(visitData.cliente_id)
          : undefined
        setVisit({ ...visitData, client })

        const [allSectors, allTipos, allMateriales] = await Promise.all([
          catSectorDB.getAll(),
          catTipoActividadDB.getAll(),
          materialesDB.getAll(),
        ])
        setSectors(allSectors)
        setTiposActividad(allTipos)
        setMateriales(allMateriales)

        const vs = await visitaSectoresDB.getByVisita(visitId)
        setVisitSectors(vs)

        const visitActivities = await actividadesDB.getByVisita(visitId)
        setActivities(visitActivities)

        // Load materials and evidences in parallel (avoid N+1)
        const matsResults = await Promise.all(
          visitActivities.map(act => actividadMaterialesDB.getByActividad(act.id))
        )
        const matsByActivity: Record<string, ActividadMaterial[]> = {}
        matsResults.forEach((mats, i) => {
          if (mats.length > 0) matsByActivity[visitActivities[i].id] = mats
        })
        setActivityMaterials(matsByActivity)

        const evResults = await Promise.all(
          visitActivities.map(act => evidenciasDB.getByActividad(act.id))
        )
        setEvidences(evResults.flat())

        // Load comments
        const comments = await comentariosDB.getByVisita(visitId)
        setComentarios(comments)
      }
    } catch (error) {
      console.error('Error loading visit:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleAddComentario() {
    if (!visit || !nuevoComentario.trim() || !usuario) return
    try {
      await comentariosDB.create({
        visita_id: visit.id,
        cliente_id: visit.cliente_id || null,
        usuario_id: usuario.id,
        texto: nuevoComentario.trim(),
      })
      setNuevoComentario('')
      const comments = await comentariosDB.getByVisita(visit.id)
      setComentarios(comments)
    } catch (error) {
      console.error('Error adding comment:', error)
    }
  }

  async function handleCheckIn() {
    if (!visit) return
    setCheckingIn(true)
    try {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            await visitasDB.checkIn(visit.id, {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            })
            loadVisitData(visit.id)
            setCheckingIn(false)
          },
          async () => {
            await visitasDB.checkIn(visit.id, { lat: 0, lng: 0 })
            loadVisitData(visit.id)
            setCheckingIn(false)
          }
        )
      } else {
        await visitasDB.checkIn(visit.id, { lat: 0, lng: 0 })
        loadVisitData(visit.id)
        setCheckingIn(false)
      }
    } catch (error) {
      console.error('Error checking in:', error)
      setCheckingIn(false)
    }
  }

  async function handleCheckOut() {
    if (!visit) return
    setCheckingOut(true)
    try {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            await visitasDB.checkOut(visit.id, {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            })
            loadVisitData(visit.id)
            setCheckingOut(false)
          },
          async () => {
            await visitasDB.checkOut(visit.id, { lat: 0, lng: 0 })
            loadVisitData(visit.id)
            setCheckingOut(false)
          }
        )
      } else {
        await visitasDB.checkOut(visit.id, { lat: 0, lng: 0 })
        loadVisitData(visit.id)
        setCheckingOut(false)
      }
    } catch (error) {
      console.error('Error checking out:', error)
      setCheckingOut(false)
    }
  }

  function openActivityDialog(sectorId: string) {
    setSelectedSectorId(sectorId)
    setActivityForm({
      tipo_actividad_id: '',
      contacto_id: '',
      area_visitada_id: '',
      requiere_evidencia: false,
    })
    setActivityMaterialsForm([{ material_id: '', cantidad: '', folio: '' }])
    setActivityDialogOpen(true)
  }

  async function handleCreateActivity() {
    if (!visit || !selectedSectorId) return

    try {
      const newActivity = await actividadesDB.create({
        visita_id: visit.id,
        sector_previsto_id: selectedSectorId,
        tipo_actividad_id: activityForm.tipo_actividad_id || null,
        contacto_id: activityForm.contacto_id || null,
        area_visitada_id: activityForm.area_visitada_id || null,
        requiere_evidencia: activityForm.requiere_evidencia,
        estado_actividad: 'Pendiente',
        estado_evidencia: 'Pendiente',
        deleted_at: null,
        updated_at: new Date().toISOString(),
      })

      // Save materials
      for (const mat of activityMaterialsForm) {
        if (mat.material_id) {
          await actividadMaterialesDB.add({
            actividad_id: newActivity.id,
            material_id: mat.material_id || null,
            sector_id: selectedSectorId,
            cantidad: mat.cantidad ? Number(mat.cantidad) : null,
            um_id: null,
            folio: mat.folio || null,
          })
        }
      }

      setActivityDialogOpen(false)
      loadVisitData(visit.id)
    } catch (error) {
      console.error('Error creating activity:', error)
    }
  }

  function openRescheduleDialog() {
    if (!visit) return
    setRescheduleForm({
      fecha_visita: visit.fecha_visita,
      hora_visita: visit.hora_visita || '',
      motivo: '',
    })
    setRescheduleDialogOpen(true)
  }

  async function handleReschedule() {
    if (!visit || !rescheduleForm.fecha_visita) return

    try {
      await visitasDB.update(visit.id, {
        fecha_visita: rescheduleForm.fecha_visita,
        hora_visita: rescheduleForm.hora_visita || null,
        status: 'Reagendado',
        updated_at: new Date().toISOString(),
      })
      setRescheduleDialogOpen(false)
      loadVisitData(visit.id)
    } catch (error) {
      console.error('Error rescheduling visit:', error)
    }
  }

  async function handleCancel() {
    if (!visit) return

    try {
      const motivo = cancelMotivo.trim()
      const objetivoActual = visit.objetivo || ''
      const nuevoObjetivo = motivo
        ? `[CANCELADA] ${motivo}${objetivoActual ? '\n\nOriginal: ' + objetivoActual : ''}`
        : objetivoActual

      await visitasDB.update(visit.id, {
        status: 'Cancelado',
        objetivo: nuevoObjetivo || null,
        updated_at: new Date().toISOString(),
      })
      setCancelDialogOpen(false)
      setCancelMotivo('')
      loadVisitData(visit.id)
    } catch (error) {
      console.error('Error canceling visit:', error)
    }
  }

  async function handleValidate() {
    const { id: actId, type, action } = validationDialog
    if (!actId || !visit) return

    try {
      if (type === 'actividad') {
        await actividadesDB.update(actId, {
          estado_actividad: action,
          updated_at: new Date().toISOString(),
        })
      } else {
        await actividadesDB.update(actId, {
          estado_evidencia: action,
          updated_at: new Date().toISOString(),
        })
      }
      setValidationDialog({ ...validationDialog, open: false })
      setValidationComment('')
      loadVisitData(visit.id)
    } catch (error) {
      console.error('Error validating:', error)
    }
  }

  function getSectorName(sectorId: string) {
    return sectors.find(s => s.id === sectorId)?.nombre || sectorId
  }

  function getTipoActividadName(tipoId: string) {
    return tiposActividad.find(t => t.id === tipoId)?.nombre || tipoId
  }

  function getMaterialName(materialId: string) {
    return materiales.find(m => m.id === materialId)?.nombre || materialId
  }

  function getMaterialsForSector(sectorId: string) {
    return materiales.filter(m => m.sector_id === sectorId)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted rounded w-48 animate-pulse" />
        <div className="h-48 bg-muted rounded animate-pulse" />
      </div>
    )
  }

  if (!visit) {
    return (
      <div className="text-center py-12">
        <Calendar className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
        <p className="text-muted-foreground">Visita no encontrada</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/visits')}>
          Volver a visitas
        </Button>
      </div>
    )
  }

  const isActive = visit.status === 'Pendiente' || visit.status === 'Reagendado'
  const canCheckIn = isActive && !visit.fecha_llegada
  const canCheckOut = isActive && visit.fecha_llegada && !visit.fecha_salida

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/visits')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{visit.client?.razon_social || 'Cliente'}</h1>
          <p className="text-muted-foreground">
            {visit.hospital} • {formatDate(visit.fecha_visita)}
          </p>
        </div>
        <Badge
          className={cn(
            'text-sm',
            visit.status === 'Completo'
              ? 'bg-green-100 text-green-700'
              : visit.status === 'Pendiente'
                ? 'bg-blue-100 text-blue-700'
                : visit.status === 'Reagendado'
                  ? 'bg-orange-100 text-orange-700'
                  : 'bg-red-100 text-red-700'
          )}
        >
          {visitStatusLabels[visit.status] || visit.status}
        </Badge>
      </div>

      {/* Action buttons */}
      {isActive && (
        <div className="flex gap-3 flex-wrap">
          {canCheckIn && (
            <Button onClick={handleCheckIn} disabled={checkingIn} className="gap-2">
              {checkingIn ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              Check-in
            </Button>
          )}
          {canCheckOut && (
            <Button
              onClick={handleCheckOut}
              disabled={checkingOut}
              variant="outline"
              className="gap-2 border-orange-500 text-orange-600 hover:bg-orange-50"
            >
              {checkingOut ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              Check-out
            </Button>
          )}
          <Button variant="outline" onClick={openRescheduleDialog} className="gap-2">
            <RotateCcw className="h-4 w-4" /> Reagendar
          </Button>
          <Button
            variant="outline"
            onClick={() => setCancelDialogOpen(true)}
            className="gap-2 border-red-500 text-red-600 hover:bg-red-50"
          >
            <XCircle className="h-4 w-4" /> Cancelar
          </Button>
        </div>
      )}

      {/* Visit info */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fecha</p>
                <p className="font-medium">{formatDate(visit.fecha_visita)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        {visit.hora_visita && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Clock className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Hora</p>
                  <p className="font-medium">{formatTime(visit.hora_visita)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        {visit.hospital && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <MapPin className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Hospital</p>
                  <p className="font-medium">{visit.hospital}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Objetivo */}
      {visit.objetivo && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Objetivo</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-muted-foreground">{visit.objetivo}</p>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="sectors">
        <TabsList>
          <TabsTrigger value="sectors">
            Sectores ({visitSectors.length})
          </TabsTrigger>
          <TabsTrigger value="activities">
            Actividades ({activities.length})
          </TabsTrigger>
          <TabsTrigger value="evidence">
            Evidencias ({evidences.length})
          </TabsTrigger>
          <TabsTrigger value="comments">
            Comentarios ({comentarios.length})
          </TabsTrigger>
        </TabsList>

        {/* ── Sectores Tab ── */}
        <TabsContent value="sectors" className="space-y-4">
          {visitSectors.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">Sin sectores asignados</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {visitSectors.map((vs) => {
                const sectorActivities = activities.filter(
                  (a) => a.sector_previsto_id === vs.sector_id
                )
                return (
                  <Card key={vs.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-semibold">{getSectorName(vs.sector_id || '')}</h4>
                          {vs.objetivo && (
                            <p className="text-sm text-muted-foreground">{vs.objetivo}</p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          onClick={() => vs.sector_id && openActivityDialog(vs.sector_id)}
                          className="gap-1"
                        >
                          <Plus className="h-4 w-4" /> Actividad
                        </Button>
                      </div>
                      {sectorActivities.length > 0 ? (
                        <div className="space-y-2 ml-4 border-l-2 border-primary/20 pl-4">
                          {sectorActivities.map((act) => (
                            <div
                              key={act.id}
                              className="flex items-center justify-between p-2 bg-muted/50 rounded"
                            >
                              <div>
                                <p className="text-sm font-medium">
                                  {act.tipo_actividad_id
                                    ? getTipoActividadName(act.tipo_actividad_id)
                                    : 'Actividad'}
                                </p>
                                {activityMaterials[act.id] && (
                                  <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                                    {activityMaterials[act.id].map((am) => (
                                      <p key={am.id}>
                                        {am.material_id ? getMaterialName(am.material_id) : 'Material'}
                                        {am.cantidad ? ` x${am.cantidad}` : ''}
                                        {am.folio ? ` • Folio: ${am.folio}` : ''}
                                      </p>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <Badge
                                variant={
                                  act.estado_actividad === 'Aprobado'
                                    ? 'default'
                                    : act.estado_actividad === 'Rechazado'
                                      ? 'destructive'
                                      : 'secondary'
                                }
                              >
                                {act.estado_actividad}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground ml-4">
                          Sin actividades — haz clic en "Actividad" para agregar
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Actividades Tab ── */}
        <TabsContent value="activities" className="space-y-4">
          {activities.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">
                  Sin actividades registradas — usa la pestaña "Sectores" para agregar
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {activities.map((activity) => {
                const puedeValidarAct = usuario?.valida_actividades || usuario?.es_gerente || usuario?.es_admin
                const puedeValidarEvid = usuario?.valida_evidencias || usuario?.es_admin
                return (
                <Card key={activity.id}>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">
                            {activity.tipo_actividad_id
                              ? getTipoActividadName(activity.tipo_actividad_id)
                              : 'Actividad'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Sector: {getSectorName(activity.sector_previsto_id)}
                            {activity.requiere_evidencia ? ' • Requiere evidencia' : ''}
                          </p>
                          {activityMaterials[activity.id] && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {activityMaterials[activity.id].map((am) => (
                                <p key={am.id}>
                                  {am.material_id ? getMaterialName(am.material_id) : ''}
                                  {am.cantidad ? ` x${am.cantidad}` : ''}
                                  {am.folio ? ` • Folio: ${am.folio}` : ''}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Act:</span>
                            <Badge
                              variant={
                                activity.estado_actividad === 'Aprobado'
                                  ? 'default'
                                  : activity.estado_actividad === 'Rechazado'
                                    ? 'destructive'
                                    : 'secondary'
                              }
                            >
                              {activity.estado_actividad}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Evid:</span>
                            <Badge
                              variant={
                                activity.estado_evidencia === 'Aprobado'
                                  ? 'default'
                                  : activity.estado_evidencia === 'Rechazado'
                                    ? 'destructive'
                                    : 'secondary'
                              }
                            >
                              {activity.estado_evidencia}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {(puedeValidarAct || puedeValidarEvid) && (
                        <div className="flex gap-2 pt-2 border-t">
                          {puedeValidarAct && activity.estado_actividad === 'Pendiente' && (
                            <>
                              <Button size="sm" variant="outline" className="text-green-600 border-green-300 hover:bg-green-50 text-xs h-7"
                                onClick={() => setValidationDialog({ open: true, id: activity.id, type: 'actividad', action: 'Aprobado' })}>
                                <CheckCircle className="h-3 w-3 mr-1" /> Aprobar
                              </Button>
                              <Button size="sm" variant="outline" className="text-red-600 border-red-300 hover:bg-red-50 text-xs h-7"
                                onClick={() => setValidationDialog({ open: true, id: activity.id, type: 'actividad', action: 'Rechazado' })}>
                                <XCircle className="h-3 w-3 mr-1" /> Rechazar
                              </Button>
                            </>
                          )}
                          {puedeValidarEvid && activity.estado_evidencia === 'Pendiente' && (
                            <>
                              <Button size="sm" variant="outline" className="text-green-600 border-green-300 hover:bg-green-50 text-xs h-7"
                                onClick={() => setValidationDialog({ open: true, id: activity.id, type: 'evidencia', action: 'Aprobado' })}>
                                <CheckCircle className="h-3 w-3 mr-1" /> Evid. OK
                              </Button>
                              <Button size="sm" variant="outline" className="text-red-600 border-red-300 hover:bg-red-50 text-xs h-7"
                                onClick={() => setValidationDialog({ open: true, id: activity.id, type: 'evidencia', action: 'Rechazado' })}>
                                <XCircle className="h-3 w-3 mr-1" /> Evid. No
                              </Button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Evidencias Tab ── */}
        <TabsContent value="evidence" className="space-y-4">
          {evidences.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Image className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">Sin evidencias capturadas</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {evidences.map((evidence) => (
                <Card key={evidence.id}>
                  <CardContent className="p-3">
                    <div className="aspect-square bg-muted rounded-lg flex items-center justify-center mb-2">
                      {getEvidenceIcon(evidence.tipo)}
                    </div>
                    <p className="text-xs truncate">{evidence.nombre_archivo}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Comments Tab ── */}
        <TabsContent value="comments" className="space-y-4">
          <div className="space-y-3">
            {comentarios.map((com) => (
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
                        {formatDate(com.created_at)}
                        {com.updated_at !== com.created_at && ' (editado)'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {/* Add comment */}
          <div className="flex gap-2">
            <Textarea
              value={nuevoComentario}
              onChange={(e) => setNuevoComentario(e.target.value)}
              placeholder="Escribe un comentario..."
              rows={2}
              className="flex-1"
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
      </Tabs>

      {/* ── Activity Dialog ── */}
      <Dialog open={activityDialogOpen} onOpenChange={setActivityDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva Actividad</DialogTitle>
            <DialogDescription>
              Sector: {getSectorName(selectedSectorId)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tipo de Actividad</Label>
              <Select
                value={activityForm.tipo_actividad_id}
                onValueChange={(v) =>
                  setActivityForm({ ...activityForm, tipo_actividad_id: v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  {tiposActividad.map((tipo) => (
                    <SelectItem key={tipo.id} value={tipo.id}>
                      {tipo.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>
                <input
                  type="checkbox"
                  checked={activityForm.requiere_evidencia}
                  onChange={(e) =>
                    setActivityForm({
                      ...activityForm,
                      requiere_evidencia: e.target.checked,
                    })
                  }
                  className="mr-2"
                />
                Requiere evidencia
              </Label>
            </div>

            {/* Materials */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Materiales</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setActivityMaterialsForm([
                      ...activityMaterialsForm,
                      { material_id: '', cantidad: '', folio: '' },
                    ])
                  }
                >
                  <Plus className="h-3 w-3 mr-1" /> Agregar
                </Button>
              </div>
              {(() => {
                const sectorMateriales = getMaterialsForSector(selectedSectorId)
                return activityMaterialsForm.map((mat, idx) => {
                return (
                  <div key={idx} className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Select
                        value={mat.material_id}
                        onValueChange={(v) => {
                          const updated = [...activityMaterialsForm]
                          updated[idx].material_id = v
                          setActivityMaterialsForm(updated)
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Material" />
                        </SelectTrigger>
                        <SelectContent>
                          {sectorMateriales.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-20">
                      <Input
                        placeholder="Cant."
                        type="number"
                        value={mat.cantidad}
                        onChange={(e) => {
                          const updated = [...activityMaterialsForm]
                          updated[idx].cantidad = e.target.value
                          setActivityMaterialsForm(updated)
                        }}
                      />
                    </div>
                    <div className="flex-1">
                      <Input
                        placeholder="Folio"
                        value={mat.folio}
                        onChange={(e) => {
                          const updated = [...activityMaterialsForm]
                          updated[idx].folio = e.target.value
                          setActivityMaterialsForm(updated)
                        }}
                      />
                    </div>
                    {activityMaterialsForm.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-destructive"
                        onClick={() => {
                          const updated = activityMaterialsForm.filter((_, i) => i !== idx)
                          setActivityMaterialsForm(updated)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )
              })
              })()}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setActivityDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateActivity}>Crear Actividad</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Reschedule Dialog ── */}
      <Dialog open={rescheduleDialogOpen} onOpenChange={setRescheduleDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Reagendar Visita</DialogTitle>
            <DialogDescription>Selecciona una nueva fecha y hora</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nueva Fecha *</Label>
              <Input
                type="date"
                value={rescheduleForm.fecha_visita}
                onChange={(e) =>
                  setRescheduleForm({ ...rescheduleForm, fecha_visita: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Nueva Hora</Label>
              <Input
                type="time"
                value={rescheduleForm.hora_visita}
                onChange={(e) =>
                  setRescheduleForm({ ...rescheduleForm, hora_visita: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleReschedule}
              disabled={!rescheduleForm.fecha_visita}
            >
              Reagendar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Cancel Dialog ── */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Cancelar Visita</DialogTitle>
            <DialogDescription>
              Esta acción quedará registrada para auditoría
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Motivo de cancelación</Label>
              <Textarea
                value={cancelMotivo}
                onChange={(e) => setCancelMotivo(e.target.value)}
                placeholder="Describe el motivo..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
              Volver
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
            >
              Cancelar Visita
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Validation Dialog ── */}
      <Dialog open={validationDialog.open} onOpenChange={(open) => setValidationDialog({ ...validationDialog, open })}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>
              {validationDialog.action === 'Aprobado' ? 'Aprobar' : 'Rechazar'} {validationDialog.type === 'actividad' ? 'Actividad' : 'Evidencia'}
            </DialogTitle>
            <DialogDescription>
              {validationDialog.action === 'Aprobado' ? 'Confirma la validación' : 'Indica el motivo del rechazo'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Comentario {validationDialog.action === 'Rechazado' ? '(requerido)' : ''}</Label>
              <Textarea
                value={validationComment}
                onChange={(e) => setValidationComment(e.target.value)}
                placeholder={validationDialog.action === 'Rechazado' ? 'Motivo del rechazo...' : 'Comentario opcional...'}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setValidationDialog({ ...validationDialog, open: false })}>
              Cancelar
            </Button>
            <Button
              variant={validationDialog.action === 'Aprobado' ? 'default' : 'destructive'}
              onClick={handleValidate}
              disabled={validationDialog.action === 'Rechazado' && !validationComment.trim()}
            >
              {validationDialog.action === 'Aprobado' ? 'Aprobar' : 'Rechazar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
