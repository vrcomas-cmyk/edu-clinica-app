/* ===========================================================================
   portal/utils.ts · helpers puros (sin estado, sin DOM)
   Port de utils.js del portal original
   =========================================================================== */

export const norm = (v: any): string => (v == null ? '' : String(v)).trim();

export const num = (v: any): number => {
  if (v == null || v === '') return 0;
  const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ''));
  return isNaN(n) ? 0 : n;
};

export const fmt = (n: any): string => Math.round(num(n)).toLocaleString('es-MX');
export const money = (n: any): string =>
  num(n).toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
export const moneyD = (n: any): string =>
  num(n).toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2, maximumFractionDigits: 4 });

export const esc = (s: any): string =>
  norm(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] || c));

/* mm/aaaa -> clave ordenable */
export const mesKey = (m: string): number => {
  const x = norm(m).split('/');
  return x.length === 2 ? (+x[1]) * 12 + (+x[0]) : 0;
};

/* Búsqueda multi-token */
export function tokenMatch(text: string, query: string): boolean {
  const q = norm(query).toLowerCase();
  if (!q) return true;
  const t = norm(text).toLowerCase();
  return q.split(/\s+/).filter(Boolean).every(tok => t.includes(tok));
}

/* primer campo no vacío entre varios encabezados candidatos */
export const pickField = (r: Record<string, any>, names: string[]): string => {
  for (const n of names) { const v = norm(r[n]); if (v) return v; }
  return '';
};

/* parsea fecha (dd/mm/aaaa, mm/aaaa, yyyy-mm-dd) -> Date | null */
export function parseFecha(v: string): Date | null {
  const s = norm(v); if (!s) return null;
  let m = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(s);
  if (m) { let y = +m[3]; if (y < 100) y += 2000; return new Date(y, +m[2] - 1, +m[1]); }
  m = /^(\d{1,2})\/(\d{4})$/.exec(s);
  if (m) return new Date(+m[2], +m[1] - 1, 1);
  m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

/* vigencia restante hasta una caducidad */
export function vigencia(fecha: string): { dias: number; meses: number; txt: string; cls: string } | null {
  const exp = parseFecha(fecha); if (!exp) return null;
  const now = new Date(); now.setHours(0, 0, 0, 0); exp.setHours(0, 0, 0, 0);
  const dias = Math.round((exp.getTime() - now.getTime()) / 86400000);
  const meses = dias / 30.44;
  let txt: string, cls: string;
  if (dias < 0) { txt = 'Vencido'; cls = 'rojo'; }
  else if (dias <= 31) { txt = `${dias} d`; cls = 'rojo'; }
  else if (dias <= 182) { txt = `${meses.toFixed(1)} meses`; cls = 'amb'; }
  else { txt = `${meses.toFixed(1)} meses`; cls = 'verde'; }
  return { dias, meses, txt, cls };
}

/* nombres de mes */
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
export const mesLabel = (m: string | null | undefined): string => {
  const p = String(m == null ? '' : m).split('/');
  if (p.length !== 2) return String(m || '');
  return (MESES[(+p[0]) - 1] || p[0]) + '/' + p[1];
};

/* fecha/"mm/aaaa" -> "mm/aaaa" */
export function aMesAnio(v: any): string {
  const s = String(v == null ? '' : v).trim(); if (!s) return '';
  let m = s.match(/^(\d{1,2})\/(\d{4})$/); if (m) return s;
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) { let y = +m[3]; if (y < 100) y += 2000; return String(m[2]).padStart(2, '0') + '/' + y; }
  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return String(m[2]).padStart(2, '0') + '/' + m[1];
  return '';
}

export function hoyMes(): string {
  const d = new Date();
  return String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
}
