import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/config/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Search, TrendingUp, TrendingDown, Minus, Package, DollarSign,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
} from 'lucide-react'
import { motion } from 'framer-motion'
import {
  norm, fmt, money, moneyD, mesKey, mesLabel, aMesAnio,
  RC, portalStore, buildRF, clasificarEstado, tendenciaTexto, comparativa,
  serieMatDest, serieDeConsumo,
  makeFilters, passes, dateRange, inRangeMonth, PERIODOS, periodoISO,
  ColumnDef, FilterState,
  grupoCliente, ejecutivoNombre, matSector, matGrupo, normCode,
  loadEnrichFromSupabase,
} from '@/lib/portal'

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } }
const item = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }

/* ---- enrichment getters ---- */
const gpoVdor = (r: any) => r['Gpo. Vdor.'] || r['Gpo.Vdor.'] || r['Gpo Vdor'] || r['Grupo Vendedor'] || ''
const centroDe = (r: any) => r[RC.centro] || r['Centro'] || r['CENTRO'] || ''
const ejecDe = (r: any) => ejecutivoNombre(gpoVdor(r))
const grupoCli = (r: any) => {
  const code = r[RC.gpo] || r['Grp. Cliente'] || r['Gpo. Cte.'] || ''
  return grupoCliente(code) || code
}
const sectorDe = (r: any) => matSector(r[RC.material])
const grupoArt = (r: any) => matGrupo(r[RC.material])

/* ---- memo cache ---- */
const mSerie = new Map<string, any[]>()
const mStatus = new Map<string, any>()
const mTend = new Map<string, any>()
function resetCache() { mSerie.clear(); mStatus.clear(); mTend.clear() }
const keyR = (r: any) => norm(r[RC.dest]) + '||' + norm(r[RC.material])
function serieOf(r: any) {
  const k = keyR(r)
  if (!mSerie.has(k)) mSerie.set(k, serieMatDest(r[RC.dest], r[RC.material]) || serieDeConsumo(r, RC))
  return mSerie.get(k)!
}
function statusOf(r: any) {
  const k = keyR(r)
  if (!mStatus.has(k)) mStatus.set(k, clasificarEstado(serieOf(r).length ? serieOf(r) : null, false))
  return mStatus.get(k)
}
function tendOf(r: any) {
  const k = keyR(r)
  if (!mTend.has(k)) mTend.set(k, tendenciaTexto(serieOf(r)))
  return mTend.get(k)
}

/* ---- columns ---- */
const cols = (): ColumnDef[] => [
  { key: 'solic', label: 'Solicitante', get: r => r[RC.solic] },
  { key: 'dest', label: 'Destinatario', get: r => r[RC.dest] },
  { key: 'cliente', label: 'Cliente', get: r => r[RC.razon] },
  { key: 'grupocli', label: 'Grupo cliente', get: r => grupoCli(r) },
  { key: 'ejecutivo', label: 'Ejecutivo', get: r => ejecDe(r) },
  { key: 'material', label: 'Material', get: r => r[RC.material] },
  { key: 'desc', label: 'Descripción', get: r => r[RC.texto] },
  { key: 'sector', label: 'Sector', get: r => sectorDe(r) },
  { key: 'grupoart', label: 'Grupo art.', get: r => grupoArt(r) },
  { key: 'centro', label: 'Centro', get: r => centroDe(r) },
]



export function ConsumoPage() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [flt, setFlt] = useState<FilterState>(makeFilters())
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(100)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      if (!supabase) { setLoading(false); return }
      await loadEnrichFromSupabase(supabase)
      const [consumoRes, facRes] = await Promise.all([
        supabase.from('consumo').select('*').limit(2000),
        supabase.from('facturacion_mensual').select('*').limit(5000),
      ])
      const rows = consumoRes.data || []
      setData(rows)
      if (facRes.data?.length) {
        portalStore.RF = buildRF(facRes.data)
      }
      portalStore.CURMES = ''
      resetCache()
    } catch (e) { console.error('Error loading consumo:', e) }
    setLoading(false)
  }

  const filtered = useMemo(() => {
    const Cc = cols()
    const pr = dateRange(flt.desde || '', flt.hasta || '')
    return data.filter(r => {
      if (flt.estado && statusOf(r).key !== flt.estado) return false
      if (pr && !inRangeMonth(r[RC.ultMes], pr)) return false
      return passes(r, Cc, flt)
    })
  }, [data, flt])

  const totalPages = Math.max(1, Math.ceil(filtered.length / size))
  if (page >= totalPages) setPage(totalPages - 1)
  const start = page * size
  const slice = filtered.slice(start, start + size)

  /* KPIs */
  const kpis = useMemo(() => ({
    corriente: filtered.filter(r => statusOf(r).key === 'corriente').length,
    riesgo: filtered.filter(r => statusOf(r).key === 'riesgo').length,
    reactiva: filtered.filter(r => statusOf(r).key === 'reactiva').length,
    nueva: filtered.filter(r => statusOf(r).key === 'nueva').length,
    importeTotal: filtered.reduce((s, r) => s + (r[RC.impUlt] || 0), 0),
  }), [filtered])

  /* Rankings */
  const rankMateriales = useMemo(() => {
    if (!portalStore.RF) return []
    const cur = mesKey(portalStore.CURMES), lo = cur - 11
    const seen = new Set<string>(), acc = new Map<string, number>()
    for (const r of filtered) {
      const k = keyR(r); if (seen.has(k)) continue; seen.add(k)
      const mat = norm(r[RC.material]); let sum = 0
      for (const p of serieOf(r)) { const mk = mesKey(p.mes); if (mk >= lo && mk <= cur) sum += p.imp }
      if (sum) acc.set(mat, (acc.get(mat) || 0) + sum)
    }
    return [...acc.entries()].map(([m, s]) => ({ code: m, desc: (portalStore.RF?.matTexto.get(m) || '').slice(0, 40), val: s / 12 }))
      .sort((a, b) => b.val - a.val).slice(0, 10)
  }, [filtered])

  const rankSolicitantes = useMemo(() => {
    const seen = new Set<string>(), acc = new Map<string, number>(), name = new Map<string, string>()
    for (const r of filtered) {
      const s = norm(r[RC.solic]); const k = s + '|' + keyR(r); if (seen.has(k)) continue; seen.add(k)
      let sum = 0; for (const p of serieOf(r)) sum += p.imp
      if (sum) { acc.set(s, (acc.get(s) || 0) + sum); if (!name.has(s)) name.set(s, norm(r[RC.razon])) }
    }
    return [...acc.entries()].map(([s, v]) => ({ code: s, desc: name.get(s) || '', val: v }))
      .sort((a, b) => b.val - a.val).slice(0, 10)
  }, [filtered])

  /* Aggregate series for chart */
  /* Aggregate series for chart */
  const aggSerie = useMemo(() => {
    const seen = new Set<string>(), bucket = new Map<string, { cant: number; imp: number }>()
    for (const r of filtered) {
      const k = keyR(r); if (seen.has(k)) continue; seen.add(k)
      for (const p of serieOf(r)) {
        const c = bucket.get(p.mes) || { cant: 0, imp: 0 }
        c.cant += p.cant; c.imp += p.imp; bucket.set(p.mes, c)
      }
    }
    return [...bucket.entries()].map(([mes, v]) => ({ mes, cant: v.cant, imp: v.imp }))
      .sort((a, b) => mesKey(a.mes) - mesKey(b.mes))
  }, [filtered])

  const cmp = useMemo(() => comparativa(aggSerie), [aggSerie])

  return (
    <motion.div className="space-y-5" variants={container} initial="hidden" animate="show">
      <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold">Reporte de Consumo</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{fmt(filtered.length)} registros · {filtered.length === data.length ? 'todos filtrados' : `de ${fmt(data.length)} totales`}</p>
        </div>
      </motion.div>

      {/* KPIs */}
      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Al corriente', value: kpis.corriente, color: 'text-emerald-600', icon: TrendingUp },
          { label: 'En riesgo', value: kpis.riesgo, color: 'text-red-600', icon: TrendingDown },
          { label: 'Reactivación', value: kpis.reactiva, color: 'text-purple-600', icon: Minus },
          { label: 'Nueva compra', value: kpis.nueva, color: 'text-blue-600', icon: Package },
          { label: 'Importe último mes', value: money(kpis.importeTotal), color: 'text-amber-600', icon: DollarSign },
        ].map(s => (
          <Card key={s.label} className="border-border/50 hover:shadow-card-hover transition-all">
            <CardContent className="p-3">
              <div className="flex items-center gap-2.5">
                <div className={`p-1.5 rounded-lg bg-muted/50 ${s.color}`}><s.icon className="h-4 w-4" /></div>
                <div>
                  <p className="text-lg font-display font-bold leading-tight">{s.value}</p>
                  <p className="text-[10px] text-muted-foreground font-medium">{s.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Filters */}
      <motion.div variants={item} className="space-y-2">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar (multi-palabra: ej. 20 GASA)" value={flt.q} onChange={e => setFlt(f => ({ ...f, q: e.target.value }))} className="pl-9" />
          </div>
          <select className="h-9 px-3 rounded-md border bg-background text-xs" value={flt.estado || ''} onChange={e => setFlt(f => ({ ...f, estado: e.target.value }))}>
            <option value="">Estado (todos)</option>
            {['corriente', 'nueva', 'reactiva', 'revisar', 'riesgo', 'sinanio', 'nada'].map(k => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
          <select className="h-9 px-3 rounded-md border bg-background text-xs" value={flt.periodo || ''} onChange={e => {
            const v = e.target.value
            if (v === 'custom') { setFlt(f => ({ ...f, periodo: '', desde: '', hasta: '' })); return }
            const [a, b] = periodoISO(v, portalStore.CURMES)
            setFlt(f => ({ ...f, periodo: v, desde: a, hasta: b }))
          }}>
            {PERIODOS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            <option value="custom">Rango personalizado</option>
          </select>
        </div>
        <div className="flex gap-2">
          <Input type="date" className="h-8 text-xs w-36" value={flt.desde || ''} onChange={e => setFlt(f => ({ ...f, desde: e.target.value, periodo: '' }))} />
          <Input type="date" className="h-8 text-xs w-36" value={flt.hasta || ''} onChange={e => setFlt(f => ({ ...f, hasta: e.target.value, periodo: '' }))} />
          {flt.list.length > 0 && (
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setFlt(f => ({ ...f, list: [] }))}>Limpiar filtros ({flt.list.length})</Button>
          )}
        </div>
        {flt.list.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {flt.list.map((f, i) => (
              <Badge key={i} variant="secondary" className="text-[10px] gap-1">
                {f.key}: {f.val}
                <button onClick={() => setFlt(fl => ({ ...fl, list: fl.list.filter((_, j) => j !== i) }))} className="ml-0.5">×</button>
              </Badge>
            ))}
          </div>
        )}
      </motion.div>

      {/* Rankings + Comparativa */}
      <motion.div variants={item} className="grid lg:grid-cols-3 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-muted-foreground mb-3">Top 10 materiales (facturación prom. 12m)</p>
            <div className="space-y-1.5">
              {rankMateriales.map((r, i) => (
                <div key={r.code} className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground w-4 text-right">{i + 1}.</span>
                  <span className="font-mono truncate flex-1">{r.code}</span>
                  <span className="text-muted-foreground truncate max-w-[80px]">{r.desc}</span>
                  <span className="font-semibold">{money(r.val)}</span>
                </div>
              ))}
              {rankMateriales.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Sin datos</p>}
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-muted-foreground mb-3">Top 10 solicitantes (mayor facturación)</p>
            <div className="space-y-1.5">
              {rankSolicitantes.map((r, i) => (
                <div key={r.code} className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground w-4 text-right">{i + 1}.</span>
                  <span className="truncate flex-1">{r.desc || r.code}</span>
                  <span className="font-semibold">{money(r.val)}</span>
                </div>
              ))}
              {rankSolicitantes.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Sin datos</p>}
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-muted-foreground mb-3">Comparativo</p>
            <div className="space-y-2">
              <div className="flex justify-between text-xs"><span>Mes actual vs año ant.</span><span className={cmp.mesPct > 0 ? 'text-emerald-600' : 'text-red-600'}>{cmp.mesPct > 0 ? '+' : ''}{cmp.mesPct.toFixed(1)}%</span></div>
              <div className="flex justify-between text-xs"><span>Q corriente vs Q anterior</span><span className={cmp.qPct > 0 ? 'text-emerald-600' : 'text-red-600'}>{cmp.qPct > 0 ? '+' : ''}{cmp.qPct.toFixed(1)}%</span></div>
              <div className="mt-3 pt-3 border-t">
                <p className="text-[10px] text-muted-foreground mb-1">Evolución facturación</p>
                <div className="flex items-end gap-px h-16">
                  {aggSerie.slice(-12).map((p, i) => {
                    const max = Math.max(...aggSerie.slice(-12).map(x => x.imp), 1)
                    const h = Math.max(2, (p.imp / max) * 100)
                    return <div key={i} className="flex-1 bg-primary/20 rounded-t" style={{ height: `${h}%` }} title={`${p.mes}: ${money(p.imp)}`} />
                  })}
                </div>
                <div className="flex justify-between text-[9px] text-muted-foreground mt-1">
                  <span>{aggSerie.slice(-12)[0]?.mes}</span>
                  <span>{aggSerie.slice(-12).slice(-1)[0]?.mes}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Table */}
      <motion.div variants={item}>
        <Card className="border-border/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/50">
                  {['Cliente', 'Grupo', 'Ejecutivo', 'Centro', 'Material', 'Desc.', 'Cons. actual', 'Prom.', 'Últ. mes', 'Importe', 'P.U.', 'Estado', 'Tendencia'].map(h => (
                    <th key={h} className="text-left px-3 py-2.5 font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={13} className="text-center py-12 text-muted-foreground">Cargando...</td></tr>
                ) : slice.length === 0 ? (
                  <tr><td colSpan={13} className="text-center py-12 text-muted-foreground">Sin datos. Sube un archivo en Admin Portal.</td></tr>
                ) : (
                  slice.map((r, i) => {
                    const st = statusOf(r), tn = tendOf(r)
                    return (
                      <tr key={r.id || i} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                        <td className="px-3 py-2">
                          <p className="font-medium truncate max-w-[160px]">{r[RC.razon]}</p>
                          <p className="text-[10px] text-muted-foreground">S {normCode(r[RC.solic])} → D {normCode(r[RC.dest])}</p>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground truncate max-w-[100px]">{grupoCli(r) || '—'}</td>
                        <td className="px-3 py-2 text-muted-foreground truncate max-w-[100px]">{ejecDe(r) || '—'}</td>
                        <td className="px-3 py-2 text-muted-foreground">{centroDe(r) || '—'}</td>
                        <td className="px-3 py-2"><span className="font-mono">{normCode(r[RC.material])}</span></td>
                        <td className="px-3 py-2 text-muted-foreground truncate max-w-[120px]">{r[RC.texto]}</td>
                        <td className="px-3 py-2 text-right font-medium">{fmt(r[RC.consumoAct])}</td>
                        <td className="px-3 py-2 text-right text-muted-foreground">{fmt(r[RC.promedio])}</td>
                        <td className="px-3 py-2 text-right">{fmt(r[RC.cantUlt])} <span className="text-muted-foreground">/ {mesLabel(aMesAnio(r[RC.ultMes]))}</span></td>
                        <td className="px-3 py-2 text-right font-medium">{money(r[RC.impUlt])}</td>
                        <td className="px-3 py-2 text-right">{moneyD(r[RC.precioUltUni])}</td>
                        <td className="px-3 py-2">
                          <Badge variant="outline" className={`text-[9px] font-medium ${
                            st.cls === 'verde' ? 'border-emerald-300 text-emerald-700' :
                            st.cls === 'rojo' ? 'border-red-300 text-red-700' :
                            st.cls === 'amb' ? 'border-amber-300 text-amber-700' :
                            st.cls === 'vio' ? 'border-purple-300 text-purple-700' :
                            ''
                          }`}>{st.label}</Badge>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1">
                            {tn.dir === 'up' ? <TrendingUp className="h-3 w-3 text-emerald-500" /> :
                             tn.dir === 'down' ? <TrendingDown className="h-3 w-3 text-red-500" /> :
                             <Minus className="h-3 w-3 text-muted-foreground" />}
                            <span className="text-[10px] text-muted-foreground">{tn.txt}</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
          {/* Pager */}
          <div className="flex items-center justify-between px-4 py-2.5 border-t bg-muted/30">
            <div className="flex items-center gap-1.5">
              <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page === 0} onClick={() => setPage(0)}><ChevronsLeft className="h-3.5 w-3.5" /></Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page === 0} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-3.5 w-3.5" /></Button>
              <span className="text-xs text-muted-foreground px-2">{start + 1}–{Math.min(start + size, filtered.length)} de {fmt(filtered.length)}</span>
              <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-3.5 w-3.5" /></Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page >= totalPages - 1} onClick={() => setPage(totalPages - 1)}><ChevronsRight className="h-3.5 w-3.5" /></Button>
            </div>
            <select className="h-7 px-2 rounded border bg-background text-xs" value={size} onChange={e => { setSize(+e.target.value); setPage(0) }}>
              {[50, 100, 200, 500].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  )
}
