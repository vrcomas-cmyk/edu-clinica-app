import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { visitasDB, clientesDB } from '@/lib/database'
import { cn, formatDate, formatTime, getWeekDates } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
} from 'lucide-react'
import type { Visita, Cliente } from '@/types/database'

const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

export function CalendarPage() {
  const navigate = useNavigate()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [visits, setVisits] = useState<(Visita & { client?: Cliente })[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  useEffect(() => {
    loadVisits()
  }, [currentDate])

  async function loadVisits() {
    try {
      const allVisits = await visitasDB.getAll()
      const allClients = await clientesDB.getAll()

      // Get visits for current month
      const year = currentDate.getFullYear()
      const month = currentDate.getMonth()
      const startDate = new Date(year, month, 1).toISOString().split('T')[0]
      const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0]

      const monthVisits = allVisits
        .filter(v => v.fecha_visita >= startDate && v.fecha_visita <= endDate)
        .map(v => ({
          ...v,
          client: allClients.find(c => c.id === v.cliente_id),
        }))

      setVisits(monthVisits)
    } catch (error) {
      console.error('Error loading visits:', error)
    }
  }

  function getDaysInMonth() {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    const days: { date: Date; isCurrentMonth: boolean; isToday: boolean }[] = []

    // Previous month days
    const prevMonthDays = new Date(year, month, 0).getDate()
    for (let i = firstDay - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonthDays - i)
      days.push({ date, isCurrentMonth: false, isToday: false })
    }

    // Current month days
    const today = new Date()
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i)
      const isToday =
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()
      days.push({ date, isCurrentMonth: true, isToday })
    }

    // Next month days
    const remaining = 42 - days.length
    for (let i = 1; i <= remaining; i++) {
      const date = new Date(year, month + 1, i)
      days.push({ date, isCurrentMonth: false, isToday: false })
    }

    return days
  }

  function getVisitsForDate(date: Date) {
    const dateStr = date.toISOString().split('T')[0]
    return visits.filter(v => v.fecha_visita === dateStr)
  }

  function prevMonth() {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  function nextMonth() {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const days = getDaysInMonth()
  const selectedDayVisits = selectedDate
    ? visits.filter(v => v.fecha_visita === selectedDate)
    : []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Calendario</h1>
          <p className="text-muted-foreground">
            {visits.length} visitas este mes
          </p>
        </div>
        <Button onClick={() => navigate('/visits')} className="gap-2">
          <Plus className="h-4 w-4" />
          Nueva Visita
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendar grid */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <Button variant="ghost" size="icon" onClick={prevMonth}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <CardTitle>
              {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={nextMonth}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </CardHeader>
          <CardContent>
            {/* Weekday headers */}
            <div className="grid grid-cols-7 mb-2">
              {WEEKDAYS.map(day => (
                <div
                  key={day}
                  className="text-center text-sm font-medium text-muted-foreground py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7 gap-1">
              {days.map((day, index) => {
                const dateStr = day.date.toISOString().split('T')[0]
                const dayVisits = getVisitsForDate(day.date)
                const isSelected = selectedDate === dateStr

                return (
                  <button
                    key={index}
                    onClick={() => setSelectedDate(dateStr)}
                    className={cn(
                      "relative aspect-square p-2 rounded-lg text-sm transition-colors",
                      day.isCurrentMonth
                        ? "hover:bg-accent"
                        : "text-muted-foreground opacity-50",
                      day.isToday && "bg-primary text-primary-foreground",
                      isSelected && !day.isToday && "bg-accent",
                      "flex flex-col items-center justify-start"
                    )}
                  >
                    <span>{day.date.getDate()}</span>
                    {dayVisits.length > 0 && (
                      <div className="flex gap-0.5 mt-1">
                        {dayVisits.slice(0, 3).map((_, i) => (
                          <div
                            key={i}
                            className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              day.isToday ? "bg-primary-foreground" : "bg-primary"
                            )}
                          />
                        ))}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Selected day details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {selectedDate
                ? formatDate(selectedDate)
                : 'Selecciona un día'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedDate ? (
              selectedDayVisits.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CalendarIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Sin visitas este día</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => navigate('/visits')}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Agregar visita
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedDayVisits.map(visit => (
                    <div
                      key={visit.id}
                      className="p-3 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/visits/${visit.id}`)}
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-medium">
                          {visit.client?.razon_social || 'Cliente'}
                        </p>
                        <span
                          className={cn(
                            "text-xs px-2 py-1 rounded-full",
                            visit.status === 'Completo'
                              ? "bg-green-100 text-green-700"
                              : "bg-blue-100 text-blue-700"
                          )}
                        >
                          {visit.status === 'Completo' ? 'Completada' : 'Pendiente'}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {visit.objetivo}
                        {visit.hora_visita && ` • ${formatTime(visit.hora_visita)}`}
                      </p>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>Haz clic en un día para ver sus visitas</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Week view */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Vista Semanal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {(() => {
              const { start, end } = getWeekDates(currentDate)
              const weekDays: Date[] = []
              const current = new Date(start)
              while (current <= end) {
                weekDays.push(new Date(current))
                current.setDate(current.getDate() + 1)
              }

              return weekDays.map((day, index) => {
                const dayVisits = getVisitsForDate(day)
                const isToday =
                  day.getDate() === new Date().getDate() &&
                  day.getMonth() === new Date().getMonth() &&
                  day.getFullYear() === new Date().getFullYear()

                return (
                  <div
                    key={index}
                    className={cn(
                      "p-3 rounded-lg border min-h-32",
                      isToday && "border-primary bg-primary/5"
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={cn(
                          "text-sm font-medium",
                          isToday && "text-primary"
                        )}
                      >
                        {WEEKDAYS[day.getDay()]} {day.getDate()}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {dayVisits.length}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {dayVisits.slice(0, 3).map(visit => (
                        <div
                          key={visit.id}
                          className={cn(
                            "text-xs p-1.5 rounded truncate cursor-pointer",
                            visit.status === 'Completo'
                              ? "bg-green-100 text-green-700"
                              : "bg-blue-100 text-blue-700"
                          )}
                          onClick={() => navigate(`/visits/${visit.id}`)}
                        >
                          {visit.client?.razon_social || 'Cliente'}
                        </div>
                      ))}
                      {dayVisits.length > 3 && (
                        <p className="text-xs text-muted-foreground text-center">
                          +{dayVisits.length - 3} más
                        </p>
                      )}
                    </div>
                  </div>
                )
              })
            })()}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
