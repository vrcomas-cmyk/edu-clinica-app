import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Usuario } from '@/types/database'
import type { Rol } from '@/types'
import { usuarioToRol } from '@/types'
import { db } from '@/lib/database'

interface AuthContextType {
  usuario: Usuario | null
  rol: Rol | null
  loading: boolean
  signIn: (correo: string, password: string) => Promise<{ error?: string }>
  signUp: (correo: string, password: string, nombre: string, rol?: Rol) => Promise<{ error?: string }>
  signOut: () => Promise<void>
  isOnline: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [rol, setRol] = useState<Rol | null>(null)
  const [loading, setLoading] = useState(true)
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    try {
      const stored = localStorage.getItem('crm-usuario')
      if (stored) {
        const u: Usuario = JSON.parse(stored)
        setUsuario(u)
        setRol(usuarioToRol(u))
        // Sync latest flags from Supabase in background
        if (u.correo) {
          ;(async () => {
            try {
              const { supabase } = await import('@/config/supabase')
              if (!supabase) return
              const { data } = await supabase
                .from('usuarios')
                .select('es_admin, es_gerente, es_educador, valida_actividades, valida_evidencias, valida_plan_trabajo')
                .eq('correo', u.correo)
                .single()
              if (data) {
                const merged = { ...u, ...data }
                db.usuarios.update(u.id, data).catch(() => {})
                setUsuario(merged)
                setRol(usuarioToRol(merged))
                localStorage.setItem('crm-usuario', JSON.stringify(merged))
              }
            } catch { /* offline or supabase error */ }
          })()
        }
      }
    } catch (error) {
      console.error('Error loading usuario:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const signIn = async (correo: string, _password: string) => {
    try {
      const found = await db.usuarios.where('correo').equals(correo).first()

      if (found && found.activo) {
        // Sync latest role flags from Supabase (es_admin, es_gerente, etc.)
        try {
          const { supabase } = await import('@/config/supabase')
          if (supabase) {
            const { data: remote } = await supabase
              .from('usuarios')
              .select('es_admin, es_gerente, es_educador, valida_actividades, valida_evidencias, valida_plan_trabajo')
              .eq('correo', correo)
              .single()
            if (remote) {
              const updated = { ...found, ...remote }
              await db.usuarios.update(found.id, remote)
              setUsuario(updated)
              setRol(usuarioToRol(updated))
              localStorage.setItem('crm-usuario', JSON.stringify(updated))
              return {}
            }
          }
        } catch { /* offline or supabase error — use local data */ }

        setUsuario(found)
        setRol(usuarioToRol(found))
        localStorage.setItem('crm-usuario', JSON.stringify(found))
        return {}
      } else {
        return { error: 'Usuario no encontrado. Usa "Crear cuenta" para registrarte.' }
      }
    } catch (error) {
      console.error('Error signing in:', error)
      return { error: 'Error al iniciar sesión' }
    }
  }

  const signUp = async (correo: string, _password: string, nombre: string, r?: Rol) => {
    try {
      const nuevo: Usuario = {
        id: crypto.randomUUID(),
        auth_uid: null,
        correo,
        nombre,
        es_educador: r?.esEducador ?? true,
        valida_actividades: r?.validaActividades ?? false,
        valida_evidencias: r?.validaEvidencias ?? false,
        valida_plan_trabajo: r?.validaPlanTrabajo ?? false,
        es_gerente: r?.esGerente ?? false,
        es_admin: r?.esAdmin ?? false,
        activo: true,
      }

      await db.usuarios.add(nuevo)
      setUsuario(nuevo)
      setRol(usuarioToRol(nuevo))
      localStorage.setItem('crm-usuario', JSON.stringify(nuevo))
      return {}
    } catch (error) {
      console.error('Error signing up:', error)
      return { error: 'Error al crear cuenta' }
    }
  }

  const signOut = async () => {
    setUsuario(null)
    setRol(null)
    localStorage.removeItem('crm-usuario')
  }

  return (
    <AuthContext.Provider value={{ usuario, rol, loading, signIn, signUp, signOut, isOnline }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
