import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { cn, getInitials } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  LayoutDashboard,
  Users,
  Calendar,
  FileText,
  BarChart3,
  Settings,
  Menu,
  X,
  WifiOff,
  LogOut,
  Bell,
  Activity,
  ShoppingCart,
  Package,
  Shield,
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Clientes', href: '/clients', icon: Users },
  { name: 'Visitas', href: '/visits', icon: FileText },
  { name: 'Calendario', href: '/calendar', icon: Calendar },
  { name: 'Reportes', href: '/reports', icon: BarChart3 },
  { name: 'Consumo', href: '/consumo', icon: Package },
  { name: 'Sugerencias', href: '/sugerencias', icon: ShoppingCart },
  { name: 'Inventario', href: '/inventario', icon: Activity },
  { name: 'Admin Portal', href: '/admin-portal', icon: Shield },
  { name: 'Configuración', href: '/settings', icon: Settings },
]

interface MainLayoutProps {
  children: React.ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { usuario, signOut, isOnline } = useAuth()
  const navRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [indicatorStyle, setIndicatorStyle] = useState({ top: 0, height: 0 })

  useEffect(() => {
    const activeIndex = navigation.findIndex(n =>
      n.href === '/' ? location.pathname === '/' : location.pathname.startsWith(n.href)
    )
    if (activeIndex >= 0 && navRefs.current[activeIndex]) {
      const el = navRefs.current[activeIndex]
      if (el) {
        setIndicatorStyle({
          top: el.offsetTop,
          height: el.offsetHeight,
        })
      }
    }
  }, [location.pathname])

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-out lg:translate-x-0",
          "bg-card border-r",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center h-16 px-5 border-b">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-degasa-400 flex items-center justify-center shadow-glow-teal">
                  <Activity className="h-5 w-5 text-white" />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-degasa-400 border-2 border-card" />
              </div>
              <div>
                <h1 className="font-display font-bold text-[15px] tracking-tight">EduClínica</h1>
                <p className="text-[10px] text-muted-foreground font-medium tracking-widest uppercase">DEGASA</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden ml-auto"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto relative">
            {/* Animated indicator */}
            <div
              className="absolute left-3 right-3 rounded-lg bg-primary/8 transition-all duration-300 ease-out"
              style={{ top: indicatorStyle.top, height: indicatorStyle.height }}
            />

            {navigation.map((item, index) => {
              const isActive = item.href === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.href)
              return (
                <button
                  key={item.name}
                  ref={(el) => { navRefs.current[index] = el }}
                  onClick={() => {
                    navigate(item.href)
                    setSidebarOpen(false)
                  }}
                  className={cn(
                    "relative flex items-center w-full gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  )}
                >
                  <item.icon className={cn(
                    "h-[18px] w-[18px] transition-transform duration-200",
                    isActive && "scale-110"
                  )} />
                  {item.name}
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary" />
                  )}
                </button>
              )
            })}
          </nav>

          {/* User section */}
          <div className="p-3 border-t">
            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer group">
              <Avatar className="h-9 w-9 ring-2 ring-primary/10 group-hover:ring-primary/20 transition-all">
                <AvatarFallback className="bg-gradient-to-br from-primary to-degasa-400 text-white text-xs font-display font-bold">
                  {usuario ? getInitials(usuario.nombre) : '?'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate font-display">{usuario?.nombre}</p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {usuario?.es_admin ? 'Administrador' : usuario?.es_gerente ? 'Gerente' : 'Educador'}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={signOut}
                className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top header */}
        <header className="sticky top-0 z-30 h-14 bg-card/80 backdrop-blur-md border-b flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div>
              <h2 className="text-base font-display font-semibold hidden sm:block">
                {navigation.find(n => n.href === location.pathname)?.name || 'EduClínica'}
              </h2>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Online status indicator */}
            <div className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
              isOnline 
                ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400" 
                : "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400"
            )}>
              <span className={cn(
                "w-1.5 h-1.5 rounded-full",
                isOnline ? "bg-emerald-500" : "bg-amber-500"
              )} />
              {isOnline ? (
                <span className="hidden sm:inline">En línea</span>
              ) : (
                <WifiOff className="h-3 w-3" />
              )}
            </div>
            
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-[18px] w-[18px]" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-primary rounded-full ring-2 ring-card" />
            </Button>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
