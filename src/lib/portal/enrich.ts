/* ===========================================================================
   portal/enrich.ts · datos maestros (ejecutivos, grupos, materiales)
   Port de enrich.js del portal original (simplified for Supabase)
   =========================================================================== */
import { norm } from './utils';

export function normCode(v: any): string {
  let s = norm(v);
  if (s === '') return '';
  s = s.replace(/^(-?\d+)\.0+$/, '$1');
  if (/^-?\d+$/.test(s)) {
    const neg = s[0] === '-', d = (neg ? s.slice(1) : s).replace(/^0+(?=\d)/, '');
    return (neg ? '-' : '') + d;
  }
  return s;
}

// In-memory maps populated from Supabase data
const mapGrupo = new Map<string, string>();
const mapEjec = new Map<string, { nombre: string; zona: string }>();
const mapMat = new Map<string, { sector: string; grupo: string; desc: string }>();

let loaded = false;

export async function loadEnrichFromSupabase(supabase: any): Promise<boolean> {
  if (!supabase) return false;
  try {
    const [gruposRes, ejecRes] = await Promise.all([
      supabase.from('grupos_cliente').select('codigo, nombre'),
      supabase.from('ejecutivos').select('codigo, nombre, zona'),
    ]);
    mapGrupo.clear(); mapEjec.clear();
    (gruposRes.data || []).forEach((r: any) => { const k = normCode(r.codigo); if (k) mapGrupo.set(k, norm(r.nombre)); });
    (ejecRes.data || []).forEach((r: any) => { const k = normCode(r.codigo); if (k) mapEjec.set(k, { nombre: norm(r.nombre), zona: norm(r.zona) }); });
    loaded = true;
    return true;
  } catch { return false; }
}

export const grupoCliente = (code: string): string => mapGrupo.get(normCode(code)) || '';
export const ejecutivoNombre = (zona: string): string => {
  const r = mapEjec.get(normCode(zona));
  return r ? r.nombre : '';
};
export const matSector = (mat: string): string => {
  const r = mapMat.get(normCode(mat));
  return r ? r.sector : '';
};
export const matGrupo = (mat: string): string => {
  const r = mapMat.get(normCode(mat));
  return r ? r.grupo : '';
};
export const enrichLoaded = () => loaded;
