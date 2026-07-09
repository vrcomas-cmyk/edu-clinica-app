import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { clientesDB, visitasDB } from '@/lib/database'
import { cn, formatDate, formatTime } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Users,
  Calendar,
  CheckCircle,
  Clock,
  TrendingUp,
  Plus,
  ArrowRight,
  FileText,
  Navigation,
  Loader2,
  Activity,
} from 'lucide-react'
import { motion } from 'framer-motion'
import type { Visita, Cliente } from '@/types/database'

type VisitaConCliente = Visita & { client?: Cliente }

const statIcons = [
  { icon: Users, color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
  { icon: Calendar, color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
  { icon: Clock, color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  { icon: CheckCircle, color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400' },
]

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
}

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
}

export function DashboardPage() {
  const { usuario } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState({
    totalClients: 0,
    visitsToday: 0,
    visitsThisWeek: 0,
    completedVisits: 0,
    pendingVisits: 0,
  })
  const [nextVisit, setNextVisit] = useState<VisitaConCliente | null>(null)
  const [upcomingVisits, setUpcomingVisits] = useState<VisitaConCliente[]>([])
  const [recentVisits, setRecentVisits] = useState<VisitaConCliente[]>([])
  const [checkingIn, setCheckingIn] = useState(false)
  const [checkingOut, setCheckingOut] = useState(false)

  useEffect(() => {
    loadDashboardData()
  }, [])

  async function loadDashboardData() {
    try {
      const [clients, allVisits] = await Promise.all([
        clientesDB.getAll(),
        visitasDB.getAll(),
      ])

      const myVisits = usuario?.es_admin || usuario?.es_gerente
        ? allVisits
        : allVisits.filter(v => v.educador_id === usuario?.id)

      const today = new Date().toISOString().split('T')[0]
      const now = new Date()
      const dayOfWeek = now.getDay()
      const weekStart = new Date(now)
      weekStart.setDate(now.getDate() - dayOfWeek)
      weekStart.setHours(0, 0, 0, 0)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)
      const weekStartStr = weekStart.toISOString().split('T')[0]
      const weekEndStr = weekEnd.toISOString().split('T')[0]

      setStats({
        totalClients: clients.length,
        visitsToday: myVisits.filter(v => v.fecha_visita === today).length,
        visitsThisWeek: myVisits.filter(v => v.fecha_visita >= weekStartStr && v.fecha_visita <= weekEndStr).length,
        completedVisits: myVisits.filter(v => v.status === 'Completo').length,
        pendingVisits: myVisits.filter(v => v.status === 'Pendiente').length,
      })

      const upcoming = myVisits
        .filter(v => v.fecha_visita >= today && (v.status === 'Pendiente' || v.status === 'Reagendado'))
        .sort((a, b) => a.fecha_visita.localeCompare(b.fecha_visita))

      if (upcoming.length > 0) {
        const next = { ...upcoming[0], client: clients.find(c => c.id === upcoming[0].cliente_id) }
        setNextVisit(next)
      }

      const upcomingList = upcoming
        .slice(0, 5)
        .map(v => ({ ...v, client: clients.find(c => c.id === v.cliente_id) }))
      setUpcomingVisits(upcomingList)

      const recent = myVisits
        .sort((a, b) => b.fecha_visita.localeCompare(a.fecha_visita))
        .slice(0, 5)
        .map(v => ({ ...v, client: clients.find(c => c.id === v.cliente_id) }))
      setRecentVisits(recent)
    } catch (error) {
      console.error('Error loading dashboard:', error)
    }
  }

  async function handleQuickCheckIn() {
    if (!nextVisit) return
    setCheckingIn(true)
    try {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            await visitasDB.checkIn(nextVisit.id, { lat: pos.coords.latitude, lng: pos.coords.longitude })
            loadDashboardData()
            setCheckingIn(false)
          },
          async () => {
            await visitasDB.checkIn(nextVisit.id, { lat: 0, lng: 0 })
            loadDashboardData()
            setCheckingIn(false)
          }
        )
      } else {
        await visitasDB.checkIn(nextVisit.id, { lat: 0, lng: 0 })
        loadDashboardData()
        setCheckingIn(false)
      }
    } catch {
      setCheckingIn(false)
    }
  }

  async function handleQuickCheckOut() {
    if (!nextVisit) return
    setCheckingOut(true)
    try {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            await visitasDB.checkOut(nextVisit.id, { lat: pos.coords.latitude, lng: pos.coords.longitude })
            loadDashboardData()
            setCheckingOut(false)
          },
          async () => {
            await visitasDB.checkOut(nextVisit.id, { lat: 0, lng: 0 })
            loadDashboardData()
            setCheckingOut(false)
          }
        )
      } else {
        await visitasDB.checkOut(nextVisit.id, { lat: 0, lng: 0 })
        loadDashboardData()
        setCheckingOut(false)
      }
    } catch {
      setCheckingOut(false)
    }
  }

  const canCheckIn = nextVisit && !nextVisit.fecha_llegada
  const canCheckOut = nextVisit && nextVisit.fecha_llegada && !nextVisit.fecha_salida
  const statValues = [stats.totalClients, stats.visitsToday, stats.pendingVisits, stats.completedVisits]

  return (
    <motion.div 
      className="space-y-6"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {/* Header */}
      <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            Hola, {usuario?.nombre?.split(' ')[0]}
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Resumen de tu actividad de educación clínica
          </p>
        </div>
        <Button 
          onClick={() => navigate('/visits')} 
          className="gap-2 bg-gradient-to-r from-primary to-degasa-500 hover:from-primary/90 hover:to-degasa-500/90 shadow-glow-teal text-white"
        >
          <Plus className="h-4 w-4" />
          Nueva Visita
        </Button>
      </motion.div>

      {/* Stats */}
      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {['Clientes totales', 'Visitas hoy', 'Pendientes', 'Completadas'].map((label, i) => (
          <Card key={label} className="group hover:shadow-card-hover transition-all duration-300 border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-xl transition-transform group-hover:scale-110", statIcons[i].color)}>
                  {(() => { const Icon = statIcons[i].icon; return <Icon className="h-5 w-5" /> })()}
                </div>
                <div>
                  <p className="text-2xl font-display font-bold tabular-nums">{statValues[i]}</p>
                  <p className="text-[11px] text-muted-foreground font-medium">{label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Next visit hero */}
      {nextVisit && (
        <motion.div variants={item}>
          <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-r from-primary/5 via-primary/[0.02] to-degasa-400/5">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
            <CardContent className="p-5 relative">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <Navigation className="h-4 w-4 text-primary" />
                    <p className="text-xs font-semibold text-primary uppercase tracking-wider">Siguiente visita</p>
                  </div>
                  <p className="font-display font-bold text-lg text-foreground">{nextVisit.client?.razon_social || 'Cliente'}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {formatDate(nextVisit.fecha_visita)}
                    {nextVisit.hora_visita && ` · ${formatTime(nextVisit.hora_visita)}`}
                    {nextVisit.hospital && ` · ${nextVisit.hospital}`}
                  </p>
                  {nextVisit.fecha_llegada && !nextVisit.fecha_salida && (
                    <Badge className="mt-2 bg-amber-100 text-amber-700 border-0 dark:bg-amber-900/30 dark:text-amber-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5 animate-pulse" />
                      En progreso — Check-in: {nextVisit.hora_llegada ? formatTime(nextVisit.hora_llegada) : ''}
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {canCheckIn && (
                    <Button onClick={handleQuickCheckIn} disabled={checkingIn} className="gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-600/90 hover:to-emerald-500/90 text-white">
                      {checkingIn ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                      Check-in
                    </Button>
                  )}
                  {canCheckOut && (
                    <Button
                      onClick={handleQuickCheckOut}
                      disabled={checkingOut}
                      variant="outline"
                      className="gap-2 border-amber-300 text-amber-600 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400"
                    >
                      {checkingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                      Check-out
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/visits/${nextVisit.id}`)}
                    className="gap-2"
                  >
                    Ver visita
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Two columns */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Upcoming visits */}
        <motion.div variants={item}>
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-display font-semibold">Próximas Visitas</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Visitas programadas</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/visits')} className="text-primary hover:text-primary/80 gap-1 text-xs">
                Ver todo <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </CardHeader>
            <CardContent className="pt-0">
              {upcomingVisits.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
                    <Calendar className="h-6 w-6 opacity-50" />
                  </div>
                  <p className="text-sm font-medium">No hay visitas programadas</p>
                  <Button variant="outline" size="sm" className="mt-3 gap-1" onClick={() => navigate('/visits')}>
                    <Plus className="h-3.5 w-3.5" /> Agregar visita
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {upcomingVisits.map((visit, i) => (
                    <motion.div
                      key={visit.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-3 p-3 rounded-xl border border-border/50 hover:border-primary/20 hover:bg-primary/[0.02] cursor-pointer transition-all duration-200 group"
                      onClick={() => navigate(`/visits/${visit.id}`)}
                    >
                      <div className="p-2 bg-primary/8 rounded-lg group-hover:bg-primary/12 transition-colors">
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                          {visit.client?.razon_social || 'Cliente'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(visit.fecha_visita)}
                          {visit.hora_visita && ` · ${formatTime(visit.hora_visita)}`}
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-[10px] font-medium">
                        {visit.status}
                      </Badge>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent activity */}
        <motion.div variants={item}>
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-display font-semibold">Actividad Reciente</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Últimas visitas registradas</p>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {recentVisits.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
                    <FileText className="h-6 w-6 opacity-50" />
                  </div>
                  <p className="text-sm font-medium">Sin actividad reciente</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentVisits.map((visit, i) => (
                    <motion.div
                      key={visit.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-3 p-3 rounded-xl border border-border/50 hover:border-primary/20 hover:bg-primary/[0.02] cursor-pointer transition-all duration-200 group"
                      onClick={() => navigate(`/visits/${visit.id}`)}
                    >
                      <div className={cn(
                        "p-2 rounded-lg",
                        visit.status === 'Completo' ? 'bg-emerald-500/10' :
                        visit.status === 'Cancelado' ? 'bg-red-500/10' :
                        'bg-amber-500/10'
                      )}>
                        {visit.status === 'Completo' ? (
                          <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        ) : visit.status === 'Cancelado' ? (
                          <FileText className="h-4 w-4 text-red-600 dark:text-red-400" />
                        ) : (
                          <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                          {visit.client?.razon_social || 'Cliente'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(visit.fecha_visita)}
                        </p>
                      </div>
                      <Badge 
                        variant="secondary" 
                        className={cn(
                          "text-[10px] font-medium",
                          visit.status === 'Completo' && 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
                          visit.status === 'Cancelado' && 'bg-red-500/10 text-red-700 dark:text-red-400',
                          visit.status === 'Pendiente' && 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                        )}
                      >
                        {visit.status === 'Completo' ? 'Completada' :
                         visit.status === 'Cancelado' ? 'Cancelada' : 'Pendiente'}
                      </Badge>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Quick actions */}
      <motion.div variants={item}>
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-display font-semibold">Acciones Rápidas</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { icon: Users, label: 'Clientes', path: '/clients', color: 'hover:border-blue-300 hover:bg-blue-50/50 dark:hover:border-blue-700 dark:hover:bg-blue-900/10' },
                { icon: Calendar, label: 'Visitas', path: '/visits', color: 'hover:border-emerald-300 hover:bg-emerald-50/50 dark:hover:border-emerald-700 dark:hover:bg-emerald-900/10' },
                { icon: Activity, label: 'Calendario', path: '/calendar', color: 'hover:border-purple-300 hover:bg-purple-50/50 dark:hover:border-purple-700 dark:hover:bg-purple-900/10' },
                { icon: TrendingUp, label: 'Reportes', path: '/reports', color: 'hover:border-amber-300 hover:bg-amber-50/50 dark:hover:border-amber-700 dark:hover:bg-amber-900/10' },
              ].map((action) => (
                <Button
                  key={action.path}
                  variant="outline"
                  className={cn("h-auto py-5 flex flex-col items-center gap-2.5 border-border/60 transition-all duration-200", action.color)}
                  onClick={() => navigate(action.path)}
                >
                  <action.icon className="h-5 w-5 text-muted-foreground" />
                  <span className="text-xs font-medium">{action.label}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
