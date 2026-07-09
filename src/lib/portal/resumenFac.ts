/* ===========================================================================
   portal/resumenFac.ts · índices de facturación mensual + clasificación
   Port de resumenFac.js del portal original
   =========================================================================== */
import { norm, num, mesKey, hoyMes, aMesAnio } from './utils';
import { portalStore, RFC } from './store';

type SeriePoint = { mes: string; cant: number; imp: number };
type SerieMap = Map<string, SeriePoint[]>;
type SerieMap2 = Map<string, Map<string, SeriePoint[]>>;

export interface RFResult {
  matDest: SerieMap;
  solic: SerieMap;
  dest: SerieMap;
  mat: SerieMap;
  solicMats: SerieMap2;
  destMats: SerieMap2;
  matTexto: Map<string, string>;
  solicRazon: Map<string, string>;
  solicGpoV: Map<string, string>;
  solicGpoC: Map<string, string>;
  matMinYr: Map<string, number>;
  curmes: string;
}

export function buildRF(rows: any[]): RFResult {
  const matDest = new Map<string, Map<string, SeriePoint>>();
  const solic = new Map<string, Map<string, SeriePoint>>();
  const dest = new Map<string, Map<string, SeriePoint>>();
  const mat = new Map<string, Map<string, SeriePoint>>();
  const solicMats = new Map<string, Map<string, Map<string, SeriePoint>>>();
  const destMats = new Map<string, Map<string, Map<string, SeriePoint>>>();
  const matTexto = new Map<string, string>();
  const solicRazon = new Map<string, string>();
  const solicGpoV = new Map<string, string>();
  const solicGpoC = new Map<string, string>();
  const matMinYr = new Map<string, number>();
  let maxk = 0, maxmes = '';

  const add = (map: Map<string, Map<string, SeriePoint>>, key: string, mes: string, c: number, i: number) => {
    if (!map.has(key)) map.set(key, new Map());
    const mm = map.get(key)!;
    const cur = mm.get(mes) || { mes, cant: 0, imp: 0 };
    cur.cant += c; cur.imp += i; mm.set(mes, cur);
  };
  const add2 = (map: Map<string, Map<string, Map<string, SeriePoint>>>, k1: string, k2: string, mes: string, c: number, i: number) => {
    if (!map.has(k1)) map.set(k1, new Map());
    add(map.get(k1)!, k2, mes, c, i);
  };

  // primer recorrido: detectar mes corriente
  rows.forEach(r => {
    const mes = norm(r[RFC.mes]); if (!mes) return;
    const k = mesKey(mes); if (k > maxk) { maxk = k; maxmes = mes; }
  });
  const curYear = (maxmes.split('/')[1] || '').trim();

  rows.forEach(r => {
    const mes = norm(r[RFC.mes]); if (!mes) return;
    const c = num(r[RFC.cant]), i = num(r[RFC.imp]);
    const d = norm(r[RFC.dest]), s = norm(r[RFC.solic]), m = norm(r[RFC.material]);
    add(matDest, d + '||' + m, mes, c, i);
    add(solic, s, mes, c, i);
    add(dest, d, mes, c, i);
    add(mat, m, mes, c, i);
    add2(solicMats, s, m, mes, c, i);
    add2(destMats, d, m, mes, c, i);
    if (m && !matTexto.has(m)) matTexto.set(m, norm(r[RFC.texto]));
    if (s && !solicRazon.has(s)) solicRazon.set(s, norm(r[RFC.razon]));
    if (s && !solicGpoV.has(s) && norm(r['Gpo. Vdor.'])) solicGpoV.set(s, norm(r['Gpo. Vdor.']));
    if (s && !solicGpoC.has(s) && norm(r['Gpo. Cte.'])) solicGpoC.set(s, norm(r['Gpo. Cte.']));
    if (m && c > 0 && (mes.split('/')[1] || '').trim() === curYear) {
      const u = i / c; const prev = matMinYr.get(m);
      if (u > 0 && (prev == null || u < prev)) matMinYr.set(m, u);
    }
  });

  const toSerie = (mm: Map<string, SeriePoint>): SeriePoint[] =>
    [...mm.entries()].map(([mes, v]) => ({ mes, cant: v.cant, imp: v.imp }))
      .sort((a, b) => mesKey(a.mes) - mesKey(b.mes));
  const ser = (map: Map<string, Map<string, SeriePoint>>): SerieMap => {
    const o = new Map<string, SeriePoint[]>();
    map.forEach((mm, k) => o.set(k, toSerie(mm)));
    return o;
  };
  const ser2 = (map: Map<string, Map<string, Map<string, SeriePoint>>>): SerieMap2 => {
    const o = new Map<string, Map<string, SeriePoint[]>>();
    map.forEach((inner, k) => o.set(k, ser(inner)));
    return o;
  };

  portalStore.CURMES = maxmes;
  portalStore.FACROWS = rows;
  return {
    matDest: ser(matDest), solic: ser(solic), dest: ser(dest), mat: ser(mat),
    solicMats: ser2(solicMats), destMats: ser2(destMats),
    matTexto, solicRazon, solicGpoV, solicGpoC, matMinYr, curmes: maxmes,
  };
}

/* Tendencia numérica */
export function tendencia(serie: SeriePoint[]): { dir: string; pct: number } {
  if (!serie || serie.length < 2) return { dir: 'flat', pct: 0 };
  const a = serie[serie.length - 2].imp, b = serie[serie.length - 1].imp;
  if (a <= 0 && b <= 0) return { dir: 'flat', pct: 0 };
  const pct = a > 0 ? (b - a) / a * 100 : 100;
  if (pct >= 5) return { dir: 'up', pct };
  if (pct <= -5) return { dir: 'down', pct };
  return { dir: 'flat', pct };
}

/* Clasificación por趋势 */
export function statusTrend(serie: SeriePoint[]): { key: string; label: string; cls: string; pct: number } {
  if (!serie || !serie.length) return { key: 'nada', label: 'Sin compra', cls: 'gris', pct: 0 };
  const t = tendencia(serie);
  if (t.dir === 'up') return { key: 'up', label: 'En aumento', cls: 'verde', pct: t.pct };
  if (t.dir === 'down') return { key: 'down', label: 'Cayendo', cls: 'rojo', pct: t.pct };
  return { key: 'flat', label: 'Estable', cls: 'azul', pct: t.pct };
}

/* días desde la última compra */
export function diasDesdeUltimo(serie: SeriePoint[]): number | null {
  if (!serie || !serie.length) return null;
  const [mm, yy] = String(serie[serie.length - 1].mes).split('/').map(Number);
  if (!mm || !yy) return null;
  const lastDay = new Date(yy, mm, 0);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((today.getTime() - lastDay.getTime()) / 86400000));
}

/* Clasificación definitiva por días reales */
export function clasificarEstado(
  serie: SeriePoint[] | null,
  pedido = false,
  refMes: string = hoyMes()
): { key: string; label: string; cls: string; pct: number; dias?: number | null } {
  const t = tendencia(serie || []);
  if (!serie || !serie.length)
    return pedido ? { key: 'nueva', label: 'Nueva compra', cls: 'vio', pct: 0 }
                  : { key: 'nada', label: 'Sin compra', cls: 'gris', pct: 0 };
  const months = serie.map(s => mesKey(s.mes)).filter(Boolean).sort((a, b) => a - b);
  const [cm, cy] = String(refMes).split('/').map(Number);
  const qStart = cy * 12 + (Math.floor((cm - 1) / 3) * 3 + 1);
  const qEnd = qStart + 2;
  const yearAgoQStart = qStart - 12;
  const billedCurQ = months.some(k => k >= qStart && k <= qEnd);
  const before = months.filter(k => k < qStart);

  if (billedCurQ && before.length === 0) return { key: 'nueva', label: 'Nueva compra', cls: 'vio', pct: t.pct };
  if (billedCurQ && before.length && Math.max(...before) < yearAgoQStart)
    return { key: 'reactiva', label: 'Reactivación', cls: 'vio', pct: t.pct };

  const dias = diasDesdeUltimo(serie);
  if (dias != null && dias > 365) return { key: 'sinanio', label: 'Sin compra en más de un año', cls: 'gris', pct: t.pct, dias };
  if (dias != null && dias > 150) return { key: 'riesgo', label: 'En riesgo', cls: 'rojo', pct: t.pct, dias };
  if (dias != null && dias >= 90) return { key: 'revisar', label: 'Revisar', cls: 'amb', pct: t.pct, dias };
  return { key: 'corriente', label: 'Al corriente', cls: 'verde', pct: t.pct, dias };
}

/* Tendencia texto con meses de referencia */
export const TREND_MESES = 3;
export function tendenciaTexto(serie: SeriePoint[], meses = TREND_MESES): { dir: string; txt: string } {
  if (!serie || !serie.length) return { dir: 'flat', txt: 'Sin datos' };
  const d = new Date();
  const prevMes = String(d.getMonth()).padStart(2, '0') + '/' + d.getFullYear();
  const refK = mesKey(prevMes);
  const valAt = (k: number) => { const f = serie.find(s => mesKey(s.mes) === k); return f ? f.imp : 0; };
  let a = 0, b = 0;
  for (let i = 0; i < meses; i++) { a += valAt(refK - i); b += valAt(refK - meses - i); }
  if (a === 0 && b === 0) return { dir: 'flat', txt: 'Sin movimiento' };
  if (b === 0) return { dir: 'up', txt: 'En aumento' };
  if (a === 0) return { dir: 'down', txt: 'En decremento' };
  const r = a / b;
  if (r > 1.1) return { dir: 'up', txt: 'En aumento' };
  if (r < 0.9) return { dir: 'down', txt: 'En decremento' };
  return { dir: 'flat', txt: 'Estable' };
}

/* comparativa mes actual vs año anterior */
export function comparativa(serie: SeriePoint[], refMes: string = hoyMes()) {
  const list = serie || [];
  const val = (mm: number, yy: number) => {
    const key = String(mm).padStart(2, '0') + '/' + yy;
    const f = list.find(s => s.mes === key);
    return f ? { cant: f.cant, imp: f.imp } : { cant: 0, imp: 0 };
  };
  const [cm, cy] = String(refMes).split('/').map(Number);
  const q = Math.floor((cm - 1) / 3);
  const qMonths = [q * 3 + 1, q * 3 + 2, q * 3 + 3];
  const sumQ = (yy: number) => qMonths.reduce((a, mm) => { const v = val(mm, yy); return { cant: a.cant + v.cant, imp: a.imp + v.imp }; }, { cant: 0, imp: 0 });
  const pct = (act: number, ant: number) => ant > 0 ? (act - ant) / ant * 100 : (act > 0 ? 100 : 0);
  const mesAct = val(cm, cy), mesAnt = val(cm, cy - 1);
  const qAct = sumQ(cy), qAnt = sumQ(cy - 1);
  return {
    cm, cy, q: q + 1,
    mesAct, mesAnt, mesPct: pct(mesAct.imp, mesAnt.imp),
    qAct, qAnt, qPct: pct(qAct.imp, qAnt.imp),
  };
}

/* rellena meses sin compra con 0 */
export function completarSerie(serie: SeriePoint[], range?: [number, number]): SeriePoint[] {
  const byMes = new Map((serie || []).map(s => [s.mes, s]));
  let loK: number, hiK: number;
  if (range) { [loK, hiK] = range; }
  else {
    if (!serie || !serie.length) return serie || [];
    loK = mesKey(serie[0].mes); hiK = Math.max(mesKey(serie[serie.length - 1].mes), mesKey(hoyMes()));
  }
  if (!loK || !hiK || loK > hiK) return [];
  const out: SeriePoint[] = []; let k = loK, guard = 0;
  while (k <= hiK && guard++ < 600) {
    const yy = Math.floor((k - 1) / 12), mm = ((k - 1) % 12) + 1;
    const mes = String(mm).padStart(2, '0') + '/' + yy;
    out.push(byMes.get(mes) || { mes, cant: 0, imp: 0 });
    k++;
  }
  return out;
}

/* serie mínima desde Reporte de Consumo */
export function serieDeConsumo(r: Record<string, any>, RC: Record<string, string>): SeriePoint[] {
  const arr: SeriePoint[] = [];
  const pm = aMesAnio(r[RC.penFecha]); if (pm) arr.push({ mes: pm, cant: num(r[RC.cantPen]), imp: num(r[RC.impPen]) });
  const um = aMesAnio(r[RC.ultMes]); if (um) arr.push({ mes: um, cant: num(r[RC.cantUlt]), imp: num(r[RC.impUlt]) });
  return arr.sort((a, b) => mesKey(a.mes) - mesKey(b.mes));
}

/* atajos de acceso a series */
export const serieMatDest = (dest: string, mat: string): SeriePoint[] | null =>
  portalStore.RF ? (portalStore.RF.matDest.get(norm(dest) + '||' + norm(mat)) || null) : null;
export const serieSolic = (s: string): SeriePoint[] | null =>
  portalStore.RF ? (portalStore.RF.solic.get(norm(s)) || null) : null;
export const serieDest = (d: string): SeriePoint[] | null =>
  portalStore.RF ? (portalStore.RF.dest.get(norm(d)) || null) : null;

export const ESTADOS: [string, string][] = [
  ['nueva', 'Nueva compra'], ['corriente', 'Al corriente'], ['reactiva', 'Reactivación'],
  ['revisar', 'Revisar'], ['riesgo', 'En riesgo'], ['sinanio', 'Sin compra +1 año'], ['nada', 'Sin compra'],
];
