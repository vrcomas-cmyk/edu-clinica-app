import { useEffect, useState } from 'react'
import { clientesDB, visitasDB, actividadesDB, evidenciasDB } from '@/lib/database'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import {
  Users,
  Calendar,
  TrendingUp,
  Image,
} from 'lucide-react'
import { motion } from 'framer-motion'

const BRAND_COLORS = ['#0f766e', '#14b8a6', '#5eead4', '#99f6e4', '#0d6d66', '#0a5c55']
const STATUS_COLORS = {
  'Completadas': '#10b981',
  'Pendientes': '#f59e0b',
  'Reagendado': '#3b82f6',
  'Cancelado': '#ef4444',
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-card-hover">
        <p className="text-xs font-medium text-foreground">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-xs text-muted-foreground">
            {entry.name}: <span className="font-semibold text-foreground">{entry.value}</span>
          </p>
        ))}
      </div>
    )
  }
  return null
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
}

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
}

export function ReportsPage() {
  const [stats, setStats] = useState({
    totalClients: 0,
    totalVisits: 0,
    completedVisits: 0,
    pendingVisits: 0,
    totalActivities: 0,
    totalEvidence: 0,
  })
  const [visitsByStatus, setVisitsByStatus] = useState<{ name: string; value: number }[]>([])
  const [visitsByMonth, setVisitsByMonth] = useState<{ name: string; visits: number }[]>([])
  const [clientsByRamo, setClientsByRamo] = useState<{ name: string; value: number }[]>([])

  useEffect(() => {
    loadReportData()
  }, [])

  async function loadReportData() {
    try {
      const [clients, visits, activities, evidences] = await Promise.all([
        clientesDB.getAll(),
        visitasDB.getAll(),
        actividadesDB.getAll(),
        evidenciasDB.getAll(),
      ])

      setStats({
        totalClients: clients.length,
        totalVisits: visits.length,
        completedVisits: visits.filter((v: any) => v.status === 'Completo').length,
        pendingVisits: visits.filter((v: any) => v.status === 'Pendiente').length,
        totalActivities: activities.length,
        totalEvidence: evidences.length,
      })

      const statusCount: Record<string, number> = {}
      visits.forEach((v: any) => {
        statusCount[v.status] = (statusCount[v.status] || 0) + 1
      })
      setVisitsByStatus(
        Object.entries(statusCount).map(([name, value]) => ({
          name: name === 'Completo' ? 'Completadas' : name === 'Pendiente' ? 'Pendientes' : name,
          value,
        }))
      )

      const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
      const monthCount: Record<string, number> = {}
      visits.forEach((v: any) => {
        const date = new Date(v.fecha_visita)
        const monthKey = `${date.getFullYear()}-${date.getMonth()}`
        monthCount[monthKey] = (monthCount[monthKey] || 0) + 1
      })

      const last6Months = []
      const now = new Date()
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const key = `${date.getFullYear()}-${date.getMonth()}`
        last6Months.push({
          name: monthNames[date.getMonth()],
          visits: monthCount[key] || 0,
        })
      }
      setVisitsByMonth(last6Months)

      const ramoCount: Record<string, number> = {}
      clients.forEach((c: any) => {
        const ramo = c.ramo || 'Sin ramo'
        ramoCount[ramo] = (ramoCount[ramo] || 0) + 1
      })
      setClientsByRamo(
        Object.entries(ramoCount).map(([name, value]) => ({
          name,
          value,
        }))
      )
    } catch (error) {
      console.error('Error loading report data:', error)
    }
  }

  const successRate = stats.totalVisits > 0
    ? Math.round((stats.completedVisits / stats.totalVisits) * 100)
    : 0

  const statCards = [
    { label: 'Clientes totales', value: stats.totalClients, icon: Users, color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
    { label: 'Visitas totales', value: stats.totalVisits, icon: Calendar, color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
    { label: 'Tasa de éxito', value: `${successRate}%`, icon: TrendingUp, color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400' },
    { label: 'Evidencias', value: stats.totalEvidence, icon: Image, color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  ]

  const summaryRows = [
    { label: 'Total de clientes', value: stats.totalClients },
    { label: 'Total de visitas', value: stats.totalVisits },
    { label: 'Visitas completadas', value: stats.completedVisits },
    { label: 'Visitas pendientes', value: stats.pendingVisits },
    { label: 'Tasa de completado', value: `${successRate}%` },
    { label: 'Total de actividades', value: stats.totalActivities },
    { label: 'Total de evidencias', value: stats.totalEvidence },
  ]

  return (
    <motion.div 
      className="space-y-6"
      variants={container}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={item}>
        <h1 className="text-2xl font-display font-bold text-foreground">Reportes</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Estadísticas y métricas de actividad</p>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((stat) => (
          <Card key={stat.label} className="group hover:shadow-card-hover transition-all duration-300 border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl transition-transform group-hover:scale-110 ${stat.color}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-display font-bold tabular-nums">{stat.value}</p>
                  <p className="text-[11px] text-muted-foreground font-medium">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-6">
        <motion.div variants={item}>
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-display font-semibold">Visitas por Mes</CardTitle>
            </CardHeader>
            <CardContent>
              {visitsByMonth.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={visitsByMonth} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="visits" fill="#0f766e" radius={[6, 6, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                  Sin datos disponibles
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-display font-semibold">Clientes por Ramo</CardTitle>
            </CardHeader>
            <CardContent>
              {clientsByRamo.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={clientsByRamo}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={95}
                      innerRadius={50}
                      fill="#0f766e"
                      dataKey="value"
                      strokeWidth={2}
                      stroke="hsl(var(--background))"
                    >
                      {clientsByRamo.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={BRAND_COLORS[index % BRAND_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend 
                      iconType="circle" 
                      iconSize={8}
                      formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                  Sin datos disponibles
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-display font-semibold">Visitas por Estado</CardTitle>
            </CardHeader>
            <CardContent>
              {visitsByStatus.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={visitsByStatus} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={40}>
                      {visitsByStatus.map((entry) => (
                        <Cell key={entry.name} fill={STATUS_COLORS[entry.name as keyof typeof STATUS_COLORS] || '#0f766e'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                  Sin datos disponibles
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div variants={item}>
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-display font-semibold">Resumen General</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-0">
              {summaryRows.map((row, i) => (
                <div 
                  key={row.label}
                  className={`flex items-center justify-between py-3 ${i < summaryRows.length - 1 ? 'border-b border-border/50' : ''}`}
                >
                  <span className="text-sm text-muted-foreground">{row.label}</span>
                  <span className="text-sm font-display font-semibold tabular-nums">{row.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
