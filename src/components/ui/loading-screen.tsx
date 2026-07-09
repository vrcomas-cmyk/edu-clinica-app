import { Activity } from 'lucide-react'

export function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        {/* Animated logo */}
        <div className="relative mx-auto mb-6 w-16 h-16">
          {/* Outer ring pulse */}
          <div className="absolute inset-0 rounded-2xl bg-primary/10 animate-glow-pulse" />
          {/* Logo */}
          <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-degasa-400 flex items-center justify-center shadow-glow-teal animate-float">
            <Activity className="h-8 w-8 text-white" />
          </div>
        </div>

        {/* Brand name */}
        <h1 className="font-display font-bold text-xl text-foreground mb-1">EduClínica</h1>
        
        {/* Loading indicator */}
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
