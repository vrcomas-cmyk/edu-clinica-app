import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, Activity, Shield, Users, Calendar, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'

export function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const { signIn, signUp, usuario } = useAuth()
  const navigate = useNavigate()

  if (usuario) {
    navigate('/')
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (isLogin) {
      const result = await signIn(email, password)
      if (result.error) {
        setError(result.error)
      } else {
        navigate('/')
      }
    } else {
      if (!name.trim()) {
        setError('El nombre es requerido')
        setLoading(false)
        return
      }
      const result = await signUp(email, password, name)
      if (result.error) {
        setError(result.error)
      } else {
        navigate('/')
      }
    }
    
    setLoading(false)
  }

  const handleDemoLogin = async () => {
    setLoading(true)
    const result = await signUp('demo@degasa.com', 'demo123', 'Usuario Demo')
    if (!result.error) {
      navigate('/')
    }
    setLoading(false)
  }

  const features = [
    { icon: Calendar, title: 'Gestión de Visitas', desc: 'Programa y administra visitas clínicas' },
    { icon: Users, title: 'Seguimiento de Clientes', desc: 'Control total de tu cartera de clientes' },
    { icon: Shield, title: 'Validación de Actividades', desc: 'Asegura la calidad de cada visita' },
  ]

  return (
    <div className="min-h-screen flex">
      {/* Left side - Brand panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-degasa-600 to-degasa-800" />
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 bg-noise opacity-30" />
        {/* Decorative circles */}
        <div className="absolute top-20 left-20 w-64 h-64 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute bottom-20 right-20 w-80 h-80 rounded-full bg-white/5 blur-3xl" />
        
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-16 w-full">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
            <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
              <Activity className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="font-display font-bold text-xl text-white">EduClínica</h1>
              <p className="text-[10px] text-white/60 font-medium tracking-widest uppercase">DEGASA</p>
            </div>
          </div>

          {/* Hero text */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="font-display text-3xl xl:text-4xl font-bold text-white leading-tight mb-4">
              Educación clínica
              <br />
              <span className="text-degasa-200">sin complicaciones</span>
            </h2>
            <p className="text-white/70 text-base max-w-md leading-relaxed">
              Administra visitas, valida actividades y da seguimiento a tus clientes desde un solo lugar.
            </p>
          </motion.div>

          {/* Feature list */}
          <div className="mt-10 space-y-4">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
                className="flex items-center gap-3 text-white/80"
              >
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                  <feature.icon className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{feature.title}</p>
                  <p className="text-xs text-white/50">{feature.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 bg-background">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-degasa-400 flex items-center justify-center">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-display font-bold text-lg">EduClínica</h1>
              <p className="text-[10px] text-muted-foreground font-medium tracking-widest uppercase">DEGASA</p>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="font-display text-2xl font-bold text-foreground">
              {isLogin ? 'Bienvenido de vuelta' : 'Crear cuenta'}
            </h2>
            <p className="text-muted-foreground text-sm mt-1">
              {isLogin ? 'Inicia sesión para continuar' : 'Regístrate para empezar'}
            </p>
          </div>

          <Card className="border-0 shadow-card bg-card p-0">
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                  <div className="space-y-1.5">
                    <Label htmlFor="name" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Nombre completo</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="Tu nombre"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required={!isLogin}
                      className="h-11 bg-secondary/50 border-0 focus-visible:ring-primary/30"
                    />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Correo electrónico</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="correo@ejemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-11 bg-secondary/50 border-0 focus-visible:ring-primary/30"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-11 bg-secondary/50 border-0 focus-visible:ring-primary/30"
                  />
                </div>

                {error && (
                  <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/10">
                    <p className="text-sm text-destructive text-center">{error}</p>
                  </div>
                )}

                <Button 
                  type="submit" 
                  className="w-full h-11 bg-gradient-to-r from-primary to-degasa-500 hover:from-primary/90 hover:to-degasa-500/90 shadow-glow-teal text-white font-medium"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isLogin ? (
                    <span className="flex items-center gap-2">Iniciar sesión <ArrowRight className="h-4 w-4" /></span>
                  ) : (
                    <span className="flex items-center gap-2">Crear cuenta <ArrowRight className="h-4 w-4" /></span>
                  )}
                </Button>
              </form>

              <div className="mt-4 text-center text-sm text-muted-foreground">
                {isLogin ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(!isLogin)
                    setError('')
                  }}
                  className="text-primary font-medium hover:underline"
                >
                  {isLogin ? 'Regístrate' : 'Inicia sesión'}
                </button>
              </div>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-[11px] uppercase">
                  <span className="bg-card px-3 text-muted-foreground font-medium">o</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full h-11"
                onClick={handleDemoLogin}
                disabled={loading}
              >
                Entrar con demo
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
