import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/config/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Search, Package, Warehouse, DollarSign,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Eye, EyeOff,
} from 'lucide-react'
import { motion } from 'framer-motion'
import {
  norm, num, fmt, money, moneyD,
  makeFilters, passes, FilterState,
  normCode,
} from '@/lib/portal'

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } }
const item = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }

/* ---- field detection ---- */
const normKey = (k: string) => String(k).replace(/\s+/g, ' ').trim()

function findField(keys: string[], cands: string[]): string | null {
  return cands.find(c => keys.includes(c)) || null
}

function detectFields(rows: any[]) {
  const keys = [...new Set(rows.flatMap(r => Object.keys(r)))]
  return {
    material: findField(keys, ['Material', 'material']),
    texto: findField(keys, ['Texto breve de material', 'texto_material']),
    cond: findField(keys, ['Condicion', 'Condición', 'condicion']),
    grupo: findField(keys, ['Grupo', 'Descr. Grupo de Art.', 'grupo']),
    sector: findField(keys, ['Sector', 'Descr. Sector', 'sector']),
    precio: findField(keys, ['Precio Oferta', 'Precio oferta', 'precio_oferta']),
    disp1030: findField(keys, ['Disponible 1031-1030', 'disponible_1030']),
    disp1032: findField(keys, ['Disponible 1031-1032', 'disponible_1032']),
    invSuma: findField(keys, ['Inv Suma', 'inv_suma']),
    importe: findField(keys, ['Importe Inventario $', 'importe_inventario']),
  }
}

function invKeys(rows: any[]): string[] {
  const keys = [...new Set(rows.flatMap(r => Object.keys(r)))]
  return keys.map(k => (k.match(/^Inv (\d+)$/i) || [])[1]).filter(Boolean).sort()
}

const rowKey = (r: any, F: any) => norm(r[F.material]) + '||' + norm(r[F.cond])

export function InventarioPage() {
  const [rawData, setRawData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [flt, setFlt] = useState<FilterState>(makeFilters())
  const [condFilter, setCondFilter] = useState('')
  const [grupoFilter, setGrupoFilter] = useState('')
  const [sectorFilter, setSectorFilter] = useState('')
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(100)
  const [adminMode, setAdminMode] = useState(false)
  const [hiddenRows, setHiddenRows] = useState<Set<string>>(new Set())

  const [F, setF] = useState<any>({})
  const [invCodes, setInvCodes] = useState<string[]>([])

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      if (!supabase) { setLoading(false); return }
      const { data: rows, error: err } = await supabase
        .from('inventario')
        .select('*')
        .limit(2000)
      if (err) throw err
      const data = rows || []
      setRawData(data)
      if (data.length) {
        const fields = detectFields(data)
        setF(fields)
        setInvCodes(invKeys(data))
      }
    } catch (e: any) { setError(e.message || String(e)) }
    setLoading(false)
  }

  const filtered = useMemo(() => {
    if (!F.material) return rawData
    return rawData.filter(r => {
      if (condFilter && norm(r[F.cond]) !== condFilter) return false
      if (grupoFilter && norm(r[F.grupo]) !== grupoFilter) return false
      if (sectorFilter && norm(r[F.sector]) !== sectorFilter) return false
      if (!adminMode && hiddenRows.has(rowKey(r, F))) return false
      return passes(r, Object.values(F).filter(Boolean).map((k: any) => ({
        key: normKey(String(k)), label: String(k), get: (row: any) => row[k]
      })), flt)
    })
  }, [rawData, flt, condFilter, grupoFilter, sectorFilter, adminMode, hiddenRows, F])

  const totalPages = Math.max(1, Math.ceil(filtered.length / size))
  if (page >= totalPages) setPage(totalPages - 1)
  const start = page * size
  const slice = filtered.slice(start, start + size)

  /* Distinct values for filters */
  const distinctConds = useMemo(() =>
    [...new Set(rawData.map(r => norm(r[F.cond])).filter(Boolean))].sort()
  , [rawData, F])
  const distinctGrupos = useMemo(() =>
    [...new Set(rawData.map(r => norm(r[F.grupo])).filter(Boolean))].sort()
  , [rawData, F])
  const distinctSectores = useMemo(() =>
    [...new Set(rawData.map(r => norm(r[F.sector])).filter(Boolean))].sort()
  , [rawData, F])

  /* KPIs */
  const kpis = useMemo(() => {
    const mats = new Set(filtered.map(r => norm(r[F.material])).filter(Boolean))
    const totImp = F.importe ? filtered.reduce((s, r) => s + num(r[F.importe]), 0) : 0
    return {
      materiales: mats.size,
      registros: filtered.length,
      importeTotal: totImp,
      conStock: filtered.filter(r => num(F.invSuma ? r[F.invSuma] : 0) > 0).length,
    }
  }, [filtered, F])

  /* Ranking by importe */
  const ranking = useMemo(() => {
    if (!F.importe) return []
    const rkMap = new Map<string, any>()
    filtered.forEach(r => {
      const m = norm(r[F.material]); if (!m) return
      const c = norm(r[F.cond])
      const multi = new Set(filtered.filter(x => norm(x[F.material]) === m).map(x => norm(x[F.cond]))).size > 1
      const code = m + (multi && c ? ` (${c})` : '')
      const cur = rkMap.get(code) || { code, desc: norm(r[F.texto]).slice(0, 40), val: 0 }
      cur.val += num(r[F.importe])
      rkMap.set(code, cur)
    })
    return [...rkMap.values()].filter(x => x.val > 0).sort((a, b) => b.val - a.val).slice(0, 10)
  }, [filtered, F])

  const toggleHidden = (key: string) => {
    setHiddenRows(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  return (
    <motion.div className="space-y-5" variants={container} initial="hidden" animate="show">
      <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold">Inventario por Condición</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{fmt(filtered.length)} registros · {kpis.materiales} materiales</p>
        </div>
        <div className="flex gap-2">
          <Button variant={adminMode ? 'default' : 'outline'} size="sm" className="text-xs gap-1.5" onClick={() => setAdminMode(!adminMode)}>
            {adminMode ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            {adminMode ? 'Admin ON' : 'Admin'}
          </Button>
          <Button variant="outline" size="sm" className="text-xs" onClick={loadData}>Refrescar</Button>
        </div>
      </motion.div>

      {/* KPIs */}
      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Materiales (filtro)', value: fmt(kpis.materiales), icon: Package, color: 'text-blue-600' },
          { label: 'Registros (filtro)', value: fmt(kpis.registros), icon: Warehouse, color: 'text-emerald-600' },
          { label: 'Con stock', value: fmt(kpis.conStock), icon: Package, color: 'text-amber-600' },
          { label: 'Importe total', value: money(kpis.importeTotal), icon: DollarSign, color: 'text-purple-600' },
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
            <Input placeholder="Buscar material, descripción..." value={flt.q} onChange={e => setFlt(f => ({ ...f, q: e.target.value }))} className="pl-9" />
          </div>
          <select className="h-9 px-3 rounded-md border bg-background text-xs" value={condFilter} onChange={e => { setCondFilter(e.target.value); setPage(0) }}>
            <option value="">Condición (todas)</option>
            {distinctConds.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {distinctGrupos.length > 0 && (
            <select className="h-9 px-3 rounded-md border bg-background text-xs" value={grupoFilter} onChange={e => { setGrupoFilter(e.target.value); setPage(0) }}>
              <option value="">Grupo (todos)</option>
              {distinctGrupos.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          )}
          {distinctSectores.length > 0 && (
            <select className="h-9 px-3 rounded-md border bg-background text-xs" value={sectorFilter} onChange={e => { setSectorFilter(e.target.value); setPage(0) }}>
              <option value="">Sector (todos)</option>
              {distinctSectores.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
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

      {/* Ranking */}
      {ranking.length > 0 && (
        <motion.div variants={item}>
          <Card className="border-border/50">
            <CardContent className="p-4">
              <p className="text-xs font-semibold text-muted-foreground mb-3">Top 10 por Importe $</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1">
                {ranking.map((r, i) => (
                  <div key={r.code} className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground w-4 text-right">{i + 1}.</span>
                    <span className="font-mono truncate flex-1">{r.code}</span>
                    <span className="text-muted-foreground truncate max-w-[80px]">{r.desc}</span>
                    <span className="font-semibold">{money(r.val)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Table */}
      <motion.div variants={item}>
        <Card className="border-border/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/50">
                  {adminMode && <th className="px-3 py-2.5 w-8"></th>}
                  {['Material', 'Condición', 'Grupo', 'Sector', 'Precio', 'Disp 1031-1030', 'Disp 1031-1032', ...invCodes.map(c => `Inv ${c}`), 'Inv Suma', 'Importe $'].map(h => (
                    <th key={h} className="text-left px-3 py-2.5 font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={(adminMode ? 1 : 0) + 6 + invCodes.length + 2} className="text-center py-12 text-muted-foreground">Cargando...</td></tr>
                ) : error ? (
                  <tr><td colSpan={(adminMode ? 1 : 0) + 6 + invCodes.length + 2} className="text-center py-12 text-red-500">Error: {error}</td></tr>
                ) : slice.length === 0 ? (
                  <tr><td colSpan={(adminMode ? 1 : 0) + 6 + invCodes.length + 2} className="text-center py-12 text-muted-foreground">Sin datos. Sube un archivo en Admin Portal.</td></tr>
                ) : (
                  slice.map((r, i) => {
                    const k = rowKey(r, F)
                    const isH = hiddenRows.has(k)
                    const corta = /corta/i.test(norm(r[F.cond]))
                    return (
                      <tr key={k + i} className={`border-b border-border/20 hover:bg-muted/20 transition-colors ${adminMode && isH ? 'opacity-40' : ''} ${corta ? 'bg-red-50/20' : ''}`}>
                        {adminMode && (
                          <td className="px-3 py-2">
                            <button onClick={() => toggleHidden(k)} className="text-muted-foreground hover:text-foreground">
                              {isH ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5 text-red-400" />}
                            </button>
                          </td>
                        )}
                        <td className="px-3 py-2">
                          <span className="font-mono">{normCode(r[F.material])}</span>
                          <p className="text-[10px] text-muted-foreground truncate max-w-[140px]">{r[F.texto]}</p>
                        </td>
                        <td className="px-3 py-2">
                          <Badge variant="outline" className={`text-[9px] ${corta ? 'border-red-300 text-red-700' : 'border-muted'}`}>
                            {norm(r[F.cond]) || '—'}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground truncate max-w-[100px]">{norm(r[F.grupo]) || '—'}</td>
                        <td className="px-3 py-2 text-muted-foreground truncate max-w-[100px]">{norm(r[F.sector]) || '—'}</td>
                        <td className="px-3 py-2 text-right">{F.precio ? moneyD(r[F.precio]) : '—'}</td>
                        <td className="px-3 py-2 text-right">{F.disp1030 ? fmt(r[F.disp1030]) : fmt(r['Inv 1030'] || 0)}</td>
                        <td className="px-3 py-2 text-right">{F.disp1032 ? fmt(r[F.disp1032]) : fmt(r['Inv 1032'] || 0)}</td>
                        {invCodes.map(c => (
                          <td key={c} className="px-3 py-2 text-right">{fmt(r[`Inv ${c}`] || r[`inv ${c}`] || 0)}</td>
                        ))}
                        <td className="px-3 py-2 text-right font-medium">{F.invSuma ? fmt(r[F.invSuma]) : '—'}</td>
                        <td className="px-3 py-2 text-right font-medium">{F.importe ? money(r[F.importe]) : '—'}</td>
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
