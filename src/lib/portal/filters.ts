/* ===========================================================================
   portal/filters.ts · barra de filtros múltiple + búsqueda multi-token
   Port de filters.js del portal original
   =========================================================================== */
import { norm, tokenMatch } from './utils';

export interface FilterState {
  q: string;
  list: Array<{ key: string; val: string }>;
  estado?: string;
  fuente?: string;
  periodo?: string;
  desde?: string;
  hasta?: string;
}

export interface ColumnDef {
  key: string;
  label: string;
  get: (row: any) => any;
}

export function makeFilters(): FilterState {
  return { q: '', list: [], estado: '', fuente: '', periodo: '', desde: '', hasta: '' };
}

export const searchText = (row: any, columns: ColumnDef[]): string =>
  columns.map(c => norm(c.get(row))).join(' ');

export function passes(row: any, columns: ColumnDef[], f: FilterState): boolean {
  if (!tokenMatch(searchText(row, columns), f.q)) return false;
  const byKey = new Map<string, Array<{ key: string; val: string }>>();
  for (const flt of f.list) {
    if (!byKey.has(flt.key)) byKey.set(flt.key, []);
    byKey.get(flt.key)!.push(flt);
  }
  for (const [key, flts] of byKey) {
    const col = columns.find(c => c.key === key);
    if (!col) continue;
    const v = norm(col.get(row));
    const okAny = flts.some(flt => {
      if (flt.val === '(vacíos)') return v === '';
      if (flt.val === '(con valor)') return v !== '';
      return tokenMatch(v, flt.val);
    });
    if (!okAny) return false;
  }
  return true;
}

export const PERIODOS: [string, string][] = [
  ['', 'Periodo: todo'], ['cur', 'Mes corriente'], ['3', 'Últimos 3 meses'], ['6', 'Últimos 6 meses'],
  ['12', 'Últimos 12 meses'], ['q', 'Trimestre corriente'], ['y', 'Año en curso'], ['y1', 'Año anterior'],
];

export function periodoRange(key: string, curmes: string): [number, number] | null {
  const [cm, cy] = String(curmes || '').split('/').map(Number);
  if (!cm) return null;
  const cur = cy * 12 + cm;
  switch (key) {
    case 'cur': return [cur, cur];
    case '3': return [cur - 2, cur];
    case '6': return [cur - 5, cur];
    case '12': return [cur - 11, cur];
    case 'q': { const qs = cy * 12 + (Math.floor((cm - 1) / 3) * 3 + 1); return [qs, qs + 2]; }
    case 'y': return [cy * 12 + 1, cy * 12 + 12];
    case 'y1': return [(cy - 1) * 12 + 1, (cy - 1) * 12 + 12];
    default: return null;
  }
}

export function periodoISO(key: string, curmes: string): [string, string] {
  const r = periodoRange(key, curmes); if (!r) return ['', ''];
  const fk = (k: number) => ({ y: Math.floor((k - 1) / 12), m: ((k - 1) % 12) + 1 });
  const a = fk(r[0]), b = fk(r[1]);
  const last = new Date(b.y, b.m, 0).getDate();
  const p = (n: number) => String(n).padStart(2, '0');
  return [`${a.y}-${p(a.m)}-01`, `${b.y}-${p(b.m)}-${p(last)}`];
}

export function dayNum(v: any): number | null {
  const s = String(v == null ? '' : v).trim(); if (!s) return null;
  let m = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(s);
  if (m) { let y = +m[3]; if (y < 100) y += 2000; return y * 10000 + (+m[2]) * 100 + (+m[1]); }
  m = /^(\d{1,2})\/(\d{4})$/.exec(s);
  if (m) return (+m[2]) * 10000 + (+m[1]) * 100 + 1;
  m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
  if (m) return (+m[1]) * 10000 + (+m[2]) * 100 + (+m[3]);
  return null;
}

const isoNum = (s: string): number | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || '');
  return m ? (+m[1]) * 10000 + (+m[2]) * 100 + (+m[3]) : null;
};

export function dateRange(desde: string, hasta: string): [number, number] | null {
  const d0 = isoNum(desde), d1 = isoNum(hasta);
  if (d0 == null && d1 == null) return null;
  return [d0 ?? 0, d1 ?? 99999999];
}

export function inRangeDay(value: string, range: [number, number]): boolean {
  if (!range) return true;
  const d = dayNum(value); if (d == null) return false;
  return d >= range[0] && d <= range[1];
}

export function inRangeMonth(value: string, range: [number, number]): boolean {
  if (!range) return true;
  const d = dayNum(value); if (d == null) return false;
  const mk = Math.floor(d / 100);
  return mk >= Math.floor(range[0] / 100) && mk <= Math.floor(range[1] / 100);
}

export function makeSuggest(rows: any[], columns: ColumnDef[], limit = 80) {
  return (colKey: string, query = ''): string[] => {
    const col = columns.find(c => c.key === colKey); if (!col) return [];
    const q = String(query || '').toLowerCase().trim();
    const set = new Set<string>(); let scanned = 0;
    for (const r of rows) {
      const v = norm(col.get(r));
      if (v && (!q || v.toLowerCase().includes(q))) set.add(v);
      if (++scanned >= 40000 || set.size >= 600) break;
    }
    return [...set].sort((a, b) => a.localeCompare(b, 'es', { numeric: true })).slice(0, limit);
  };
}
