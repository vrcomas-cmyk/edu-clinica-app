import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { MainLayout } from '@/components/layout/main-layout'
import { AuthPage } from '@/components/auth/auth-page'
import { DashboardPage } from '@/components/dashboard/dashboard-page'
import { ClientsPage } from '@/components/crm/clients-page'
import { ClientDetailPage } from '@/components/crm/client-detail-page'
import { VisitsPage } from '@/components/visits/visits-page'
import { VisitDetailPage } from '@/components/visits/visit-detail-page'
import { CalendarPage } from '@/components/calendar/calendar-page'
import { ActivitiesPage } from '@/components/visits/activities-page'
import { ReportsPage } from '@/components/dashboard/reports-page'
import { SettingsPage } from '@/components/settings/settings-page'
import { ConsumoPage } from '@/components/portal/consumo-page'
import { SugerenciasPage } from '@/components/portal/sugerencias-page'
import { InventarioPage } from '@/components/portal/inventario-page'
import { AdminPortalPage } from '@/components/portal/admin-portal-page'
import { LoadingScreen } from '@/components/ui/loading-screen'
import { AnimatePresence, motion } from 'framer-motion'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { usuario, loading } = useAuth()
  
  if (loading) return <LoadingScreen />
  if (!usuario) return <Navigate to="/auth" replace />
  
  return <MainLayout>{children}</MainLayout>
}

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
}

const pageTransition = {
  type: 'tween' as const,
  ease: [0.25, 0.46, 0.45, 0.94],
  duration: 0.25,
}

function AnimatedPage({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransition}
    >
      {children}
    </motion.div>
  )
}

function AnimatedRoutes() {
  const location = useLocation()
  
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/auth" element={<AuthPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AnimatedPage><DashboardPage /></AnimatedPage>
            </ProtectedRoute>
          }
        />
        <Route
          path="/clients"
          element={
            <ProtectedRoute>
              <AnimatedPage><ClientsPage /></AnimatedPage>
            </ProtectedRoute>
          }
        />
        <Route
          path="/clients/:id"
          element={
            <ProtectedRoute>
              <AnimatedPage><ClientDetailPage /></AnimatedPage>
            </ProtectedRoute>
          }
        />
        <Route
          path="/visits"
          element={
            <ProtectedRoute>
              <AnimatedPage><VisitsPage /></AnimatedPage>
            </ProtectedRoute>
          }
        />
        <Route
          path="/visits/:id"
          element={
            <ProtectedRoute>
              <AnimatedPage><VisitDetailPage /></AnimatedPage>
            </ProtectedRoute>
          }
        />
        <Route
          path="/calendar"
          element={
            <ProtectedRoute>
              <AnimatedPage><CalendarPage /></AnimatedPage>
            </ProtectedRoute>
          }
        />
        <Route
          path="/activities"
          element={
            <ProtectedRoute>
              <AnimatedPage><ActivitiesPage /></AnimatedPage>
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <AnimatedPage><ReportsPage /></AnimatedPage>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <AnimatedPage><SettingsPage /></AnimatedPage>
            </ProtectedRoute>
          }
        />
        <Route
          path="/consumo"
          element={
            <ProtectedRoute>
              <AnimatedPage><ConsumoPage /></AnimatedPage>
            </ProtectedRoute>
          }
        />
        <Route
          path="/sugerencias"
          element={
            <ProtectedRoute>
              <AnimatedPage><SugerenciasPage /></AnimatedPage>
            </ProtectedRoute>
          }
        />
        <Route
          path="/inventario"
          element={
            <ProtectedRoute>
              <AnimatedPage><InventarioPage /></AnimatedPage>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-portal"
          element={
            <ProtectedRoute>
              <AnimatedPage><AdminPortalPage /></AnimatedPage>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  )
}

export default function App() {
  return <AnimatedRoutes />
}
