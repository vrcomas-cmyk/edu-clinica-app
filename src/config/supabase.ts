import { createClient } from "@supabase/supabase-js"
import type { Database } from "../types/database"

const url = import.meta.env.VITE_SUPABASE_URL as string
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string

const isConfigured = url && anon && url !== "your_supabase_url" && anon !== "your_supabase_anon_key"

if (!isConfigured) {
  console.warn(
    "Supabase no configurado. Agrega VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY a .env"
  )
}

export const supabase = isConfigured
  ? createClient<Database>(url, anon, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null

export const isSupabaseConfigured = () => isConfigured
