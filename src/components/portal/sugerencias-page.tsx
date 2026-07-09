import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/config/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Search, TrendingUp, TrendingDown, Minus, ShoppingCart, Package, CheckCircle,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
} from 'lucide-react'
import { motion } from 'framer-motion'
import {
  norm, num, fmt, money, moneyD,
  C, RC, portalStore, buildRF, clasificarEstado, tendenciaTexto,
  serieMatDest, serieDeConsumo,
  makeFilters, passes, dateRange, inRangeDay, PERIODOS, periodoISO,
  ColumnDef, FilterState,
  grupoCliente, ejecutivoNombre, matSector, matGrupo, normCode,
  loadEnrichFromSupabase,
} from '@/lib/portal'

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } }
const item = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }

/* ---- enrichment getters ---- */
const gpoVdor = (r: any) => r['Gpo. Vdor.'] || r['Gpo.Vdor.'] || r['Gpo Vdor'] || r['Grupo Vendedor'] || ''
const ejecDe = (r: any) => ejecutivoNombre(gpoVdor(r))
const grupoCli = (r: any) => {
  const code = r[C.gpo] || ''
  return grupoCliente(code) || code
}
const sectorDe = (r: any) => matSector(r[C.matBase])
const grupoArt = (r: any) => matGrupo(r[C.matBase])
const bloqDe = (r: any) => norm(r[C.bloq])
const hasFuente = (r: any) => norm(r[C.fuente]) !== ''

const keyOf = (r: any) => [norm(r[C.pedido]), norm(r[C.matBase]), norm(r[C.centro]), norm(r[C.alm]), norm(r[C.dest])].join('|')

/* ---- build BO (back orders) ---- */
function buildBO(rows: any[]) {
  const map = new Map<string, any>()
  rows.forEach(r => {
    const k = keyOf(r)
    if (!map.has(k)) map.set(k, { origen: null, fuentes: [], any: r })
    const g = map.get(k)
    if (hasFuente(r)) g.fuentes.push(r)
    else if (!g.origen) g.origen = r
  })
  return [...map.values()].map(g => {
    const b = g.origen || g.any
    const serie = serieMatDest(b[C.dest], b[C.matBase]) || serieDeConsumo(b, RC)
    let cp = num(b[C.consumo])
    if (!cp) { for (const rr of [g.origen, g.any, ...g.fuentes].filter(Boolean)) { const v = num(rr[C.consumo]); if (v) { cp = v; break } } }
    return {
      bo: b, fuentes: g.fuentes, k: keyOf(b), serie, consumoProm: cp,
      status: clasificarEstado(serie, num(b[C.pend]) > 0), tend: tendenciaTexto(serie),
    }
  })
}



const cols = (): ColumnDef[] => [
  { key: 'grupocli', label: 'Grupo cliente', get: it => grupoCli(it.bo) },
  { key: 'pedido', label: 'Pedido', get: it => it.bo[C.pedido] },
  { key: 'oc', label: 'OC', get: it => it.bo[C.oc] },
  { key: 'cliente', label: 'Cliente', get: it => it.bo[C.razon] },
  { key: 'ejecutivo', label: 'Ejecutivo', get: it => ejecDe(it.bo) },
  { key: 'solic', label: 'Solicitante', get: it => it.bo[C.solic] },
  { key: 'dest', label: 'Destinatario', get: it => it.bo[C.dest] },
  { key: 'mat', label: 'Material', get: it => it.bo[C.matBase] },
  { key: 'desc', label: 'Descripción', get: it => it.bo[C.descSol] },
  { key: 'sector', label: 'Sector', get: it => sectorDe(it.bo) },
  { key: 'grupoart', label: 'Grupo art.', get: it => grupoArt(it.bo) },
  { key: 'centro', label: 'Centro', get: it => it.bo[C.centro] },
  { key: 'almacen', label: 'Almacén', get: it => it.bo[C.alm] },
  { key: 'bloq', label: 'Bloqueado', get: it => bloqDe(it.bo) },
]

export function SugerenciasPage() {
  const [loading, setLoading] = useState(true)
  const [flt, setFlt] = useState<FilterState>({ ...makeFilters(), estado: '', fuente: '' })
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(100)
  const [boList, setBoList] = useState<any[]>([])

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      if (!supabase) { setLoading(false); return }
      await loadEnrichFromSupabase(supabase)
      const [sugRes, facRes] = await Promise.all([
        supabase.from('sugerencias').select('*').limit(3000),
        supabase.from('facturacion_mensual').select('*').limit(5000),
      ])
      const rows = sugRes.data || []
      if (facRes.data?.length) portalStore.RF = buildRF(facRes.data)
      setBoList(buildBO(rows))
    } catch (e) { console.error('Error loading sugerencias:', e) }
    setLoading(false)
  }

  const filtered = useMemo(() => {
    const Cc = cols()
    const pr = dateRange(flt.desde || '', flt.hasta || '')
    return boList.filter(it => {
      if (flt.estado && it.status.key !== flt.estado) return false
      if (flt.fuente === 'si' && !it.fuentes.length) return false
      if (flt.fuente === 'no' && it.fuentes.length) return false
      if (pr && !inRangeDay(it.bo[C.fecha], pr)) return false
      return passes(it, Cc, flt)
    })
  }, [boList, flt])

  const totalPages = Math.max(1, Math.ceil(filtered.length / size))
  if (page >= totalPages) setPage(totalPages - 1)
  const start = page * size
  const slice = filtered.slice(start, start + size)

  /* KPIs */
  const kpis = useMemo(() => {
    const isBloq = (it: any) => bloqDe(it.bo) !== ''
    const pendTot = filtered.reduce((s, it) => s + num(it.bo[C.pend]), 0)
    const pendBloq = filtered.filter(isBloq).reduce((s, it) => s + num(it.bo[C.pend]), 0)
    const impTot = filtered.reduce((s, it) => s + num(it.bo[C.pend]) * num(it.bo[C.precio]), 0)
    const impBloq = filtered.filter(isBloq).reduce((s, it) => s + num(it.bo[C.pend]) * num(it.bo[C.precio]), 0)
    return {
      renglones: filtered.length, pendTot, pendBloq, impTot, impBloq,
      conFuentes: filtered.filter(it => it.fuentes.length).length,
    }
  }, [filtered])

  /* Ranking by material importe pendiente */
  const rankMateriales = useMemo(() => {
    const rkMap = new Map<string, any>()
    filtered.forEach(it => {
      const m = norm(it.bo[C.matBase]); if (!m) return
      const cur = rkMap.get(m) || { code: m, desc: norm(it.bo[C.descSol]).slice(0, 40), val: 0 }
      cur.val += num(it.bo[C.pend]) * num(it.bo[C.precio])
      rkMap.set(m, cur)
    })
    return [...rkMap.values()].filter(x => x.val > 0).sort((a, b) => b.val - a.val).slice(0, 10)
  }, [filtered])



  return (
    <motion.div className="space-y-5" variants={container} initial="hidden" animate="show">
      <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold">Todas las Sugerencias</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{fmt(filtered.length)} renglones BO · {filtered.length === boList.length ? 'todos filtrados' : `de ${fmt(boList.length)} totales`}</p>
        </div>
      </motion.div>

      {/* KPIs */}
      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Renglones BO', value: fmt(kpis.renglones), color: 'text-blue-600', icon: ShoppingCart },
          { label: 'Cant. pendiente', value: fmt(kpis.pendTot), color: 'text-purple-600', icon: Package, sub: `${fmt(kpis.pendTot - kpis.pendBloq)} sin bloqueo · ${fmt(kpis.pendBloq)} bloqueados` },
          { label: 'Importe pendiente', value: money(kpis.impTot), color: 'text-amber-600', icon: TrendingUp, sub: `${money(kpis.impTot - kpis.impBloq)} sin bloqueo · ${money(kpis.impBloq)} bloqueados` },
          { label: 'Con fuentes', value: fmt(kpis.conFuentes), color: 'text-emerald-600', icon: CheckCircle },
        ].map(s => (
          <Card key={s.label} className="border-border/50 hover:shadow-card-hover transition-all">
            <CardContent className="p-3">
              <div className="flex items-center gap-2.5">
                <div className={`p-1.5 rounded-lg bg-muted/50 ${s.color}`}><s.icon className="h-4 w-4" /></div>
                <div>
                  <p className="text-lg font-display font-bold leading-tight">{s.value}</p>
                  <p className="text-[10px] text-muted-foreground font-medium">{s.label}</p>
                  {s.sub && <p className="text-[9px] text-muted-foreground mt-0.5">{s.sub}</p>}
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
            <Input placeholder="Buscar (multi-palabra)" value={flt.q} onChange={e => setFlt(f => ({ ...f, q: e.target.value }))} className="pl-9" />
          </div>
          <select className="h-9 px-3 rounded-md border bg-background text-xs" value={flt.estado || ''} onChange={e => setFlt(f => ({ ...f, estado: e.target.value }))}>
            <option value="">Estado (todos)</option>
            {['corriente', 'nueva', 'reactiva', 'revisar', 'riesgo', 'sinanio', 'nada'].map(k => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
          <select className="h-9 px-3 rounded-md border bg-background text-xs" value={flt.fuente || ''} onChange={e => setFlt(f => ({ ...f, fuente: e.target.value }))}>
            <option value="">Fuentes</option>
            <option value="si">Con fuentes</option>
            <option value="no">Sin fuentes</option>
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

      {/* Ranking + Summary */}
      <motion.div variants={item} className="grid lg:grid-cols-2 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-muted-foreground mb-3">Top 10 materiales por importe pendiente</p>
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
            <p className="text-xs font-semibold text-muted-foreground mb-3">Resumen de fuentes</p>
            <div className="grid grid-cols-2 gap-4 mt-3">
              <div className="text-center">
                <p className="text-2xl font-display font-bold text-emerald-600">{kpis.conFuentes}</p>
                <p className="text-[10px] text-muted-foreground">Con fuentes</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-display font-bold text-amber-600">{kpis.renglones - kpis.conFuentes}</p>
                <p className="text-[10px] text-muted-foreground">Sin fuentes</p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t space-y-1.5 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Importe total</span><span className="font-semibold">{money(kpis.impTot)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Importe bloqueado</span><span className="font-semibold text-amber-600">{money(kpis.impBloq)}</span></div>
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
                  {['Grupo cliente', 'Pedido/OC', 'Fecha', 'Cliente', 'Ejecutivo', 'Centro/Alm', 'Material', 'Sector', 'Cant ped', 'Pend', 'Precio', 'Consumo', 'Inv 1030', 'Inv 1031', 'Inv 1032', 'Inv 1060', 'Bloq', 'Estado', 'Tend', 'Fuentes'].map(h => (
                    <th key={h} className="text-left px-3 py-2.5 font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={20} className="text-center py-12 text-muted-foreground">Cargando...</td></tr>
                ) : slice.length === 0 ? (
                  <tr><td colSpan={20} className="text-center py-12 text-muted-foreground">Sin datos. Sube un archivo en Admin Portal.</td></tr>
                ) : (
                  slice.map((it, i) => {
                    const b = it.bo, bl = bloqDe(b), st = it.status, tn = it.tend
                    return (
                      <tr key={it.k || i} className={`border-b border-border/20 hover:bg-muted/20 transition-colors ${bl ? 'bg-amber-50/30' : ''}`}>
                        <td className="px-3 py-2">{grupoCli(b) || '—'}</td>
                        <td className="px-3 py-2">
                          <p className="font-medium">{b[C.pedido]}</p>
                          <p className="text-[10px] text-muted-foreground">OC {b[C.oc] || '—'}</p>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{b[C.fecha]}</td>
                        <td className="px-3 py-2">
                          <p className="font-medium truncate max-w-[120px]">{b[C.razon]}</p>
                          <p className="text-[10px] text-muted-foreground">S {normCode(b[C.solic])} → D {normCode(b[C.dest])}</p>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{ejecDe(b) || '—'}</td>
                        <td className="px-3 py-2 text-muted-foreground">{b[C.centro]}{norm(b[C.alm]) ? ` / ${b[C.alm]}` : ''}</td>
                        <td className="px-3 py-2">
                          <span className="font-mono">{normCode(b[C.matBase])}</span>
                          <p className="text-[10px] text-muted-foreground truncate max-w-[100px]">{b[C.descSol]}</p>
                        </td>
                        <td className="px-3 py-2">
                          <span className="text-muted-foreground">{sectorDe(b) || '—'}</span>
                          <p className="text-[10px] text-muted-foreground">{grupoArt(b) || ''}</p>
                        </td>
                        <td className="px-3 py-2 text-right font-medium">{fmt(b[C.cantPed])}</td>
                        <td className="px-3 py-2 text-right">{fmt(b[C.pend])}</td>
                        <td className="px-3 py-2 text-right">{moneyD(b[C.precio])}</td>
                        <td className="px-3 py-2 text-right">{fmt(it.consumoProm)}</td>
                        <td className="px-3 py-2 text-right">{fmt(b[C.inv1030])}</td>
                        <td className="px-3 py-2 text-right">{fmt(b[C.inv1031])}</td>
                        <td className="px-3 py-2 text-right">{fmt(b[C.inv1032])}</td>
                        <td className="px-3 py-2 text-right">{fmt(b[C.inv1060])}</td>
                        <td className="px-3 py-2">{bl ? <Badge variant="outline" className="text-[9px] border-amber-300 text-amber-700">{bl}</Badge> : '—'}</td>
                        <td className="px-3 py-2">
                          <Badge variant="outline" className={`text-[9px] font-medium ${
                            st.cls === 'verde' ? 'border-emerald-300 text-emerald-700' :
                            st.cls === 'rojo' ? 'border-red-300 text-red-700' :
                            st.cls === 'amb' ? 'border-amber-300 text-amber-700' :
                            st.cls === 'vio' ? 'border-purple-300 text-purple-700' : ''
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
                        <td className="px-3 py-2 text-right">{it.fuentes.length || '—'}</td>
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


