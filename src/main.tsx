import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from '@/components/theme-provider'
import { ToasterProvider } from '@/components/ui/toaster'
import { AuthProvider } from '@/hooks/use-auth'
import { syncFromSupabase } from '@/lib/database'
import { syncService } from '@/services/sync-service'
import App from './App'
import './index.css'

function AppInit() {
  const [syncing, setSyncing] = useState(true)

  useEffect(() => {
    // Sync from Supabase on app load
    syncFromSupabase()
      .then(result => {
        if (result.synced) {
          console.log('Datos sincronizados desde Supabase')
        } else {
          console.log('Modo offline - usando datos locales')
        }
      })
      .finally(() => {
        setSyncing(false)
        // Start background auto-sync every 30s
        syncService.startAutoSync(30000)
      })
  }, [])

  if (syncing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="relative mx-auto mb-6 w-14 h-14">
            <div className="absolute inset-0 rounded-2xl bg-primary/10 animate-glow-pulse" />
            <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-degasa-400 flex items-center justify-center shadow-glow-teal animate-float">
              <span className="text-white font-display font-bold text-lg">EC</span>
            </div>
          </div>
          <div className="flex items-center justify-center gap-1.5 mt-4">
            <div className="w-1.5 h-1.5 rounded-full bg-primary/30 animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-1.5 h-1.5 rounded-full bg-primary/30 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <p className="text-xs text-muted-foreground mt-3 font-medium">Sincronizando datos...</p>
        </div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <ThemeProvider defaultTheme="light" storageKey="educlinica-theme">
        <AuthProvider>
          <ToasterProvider>
            <App />
          </ToasterProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppInit />
  </React.StrictMode>,
)
