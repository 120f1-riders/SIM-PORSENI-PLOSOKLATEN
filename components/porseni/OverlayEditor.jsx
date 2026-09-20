'use client'

import { useEffect, useRef, useState } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { computeFitSize, wrapText } from '@/lib/porseni/canvasgen'

export default function OverlayEditor({ templateSrc, fields, onChange, sampleValues = {} }) {
  const ref = useRef(null)
  const measureRef = useRef(null)
  const [cw, setCw] = useState(600)
  const [ch, setCh] = useState(400)
  const [dragIdx, setDragIdx] = useState(-1)
  const [sel, setSel] = useState(0)

  const getMeasureCtx = () => {
    if (!measureRef.current) measureRef.current = document.createElement('canvas').getContext('2d')
    return measureRef.current
  }

  const sampleText = (f) => (sampleValues[f.key] != null ? String(sampleValues[f.key]) : (f.label || ''))

  // Ukuran font untuk pratinjau (mengecil otomatis bila autoFit aktif)
  const previewSize = (f) => {
    const base = (f.size || 0.04) * cw
    const maxW = f.maxWidth ? (f.maxWidth / 100) * cw : 0
    if (!f.autoFit || maxW <= 0) return base
    try {
      return computeFitSize(getMeasureCtx(), sampleText(f), { baseSizePx: base, maxWidthPx: maxW, maxLines: f.maxLines || 2, bold: f.bold, font: f.font })
    } catch (e) { return base }
  }

  // Hitung posisi pratinjau tiap elemen (dukung posisi-otomatis / flow)
  const computeLayout = () => {
    const ctx = getMeasureCtx()
    const bottom = {}
    const pos = {}
    const H = ch || 400
    fields.forEach((f, i) => {
      if (f.type === 'photo') { bottom[f.key] = f.y + (f.h || 30); return }
      const sizePx = previewSize(f)
      const maxWpx = f.maxWidth ? (f.maxWidth / 100) * cw : 0
      ctx.font = `${f.bold ? 'bold ' : ''}${sizePx}px ${f.font || 'Georgia, serif'}`
      let lines
      try { lines = wrapText(ctx, sampleText(f), maxWpx) } catch (e) { lines = [sampleText(f)] }
      const n = lines.length || 1
      const lineHpct = ((sizePx * 1.18) / H) * 100
      let topPct
      if (f.flowBelow && bottom[f.flowBelow] != null) {
        topPct = bottom[f.flowBelow] + (f.flowGap != null ? f.flowGap : 2)
      } else if (f.vAlign === 'top') {
        // RATA-ATAS: baris pertama tetap di f.y (baris berikutnya turun ke bawah)
        topPct = f.y - lineHpct / 2
      } else {
        topPct = f.y - (n * lineHpct) / 2
      }
      const blockHpct = n * lineHpct
      pos[i] = { centerYpct: topPct + blockHpct / 2, sizePx }
      bottom[f.key] = topPct + blockHpct
    })
    return pos
  }

  useEffect(() => {
    const measure = () => { if (ref.current) { setCw(ref.current.offsetWidth); setCh(ref.current.offsetHeight) } }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [templateSrc])

  const update = (i, patch) => onChange(fields.map((f, j) => (j === i ? { ...f, ...patch } : f)))
  const clampNum = (v, min, max) => { const n = parseFloat(v); if (isNaN(n)) return min; return Math.min(max, Math.max(min, Math.round(n * 10) / 10)) }

  // Tambah elemen teks baru (teks bebas / kustom) yang bisa diketik sendiri
  const addText = () => {
    const key = 'custom_' + Date.now().toString(36)
    const nf = { key, custom: true, label: 'Teks Baru', x: 50, y: 50, size: 0.03, color: '#111827', align: 'center', bold: false, font: 'Georgia, serif', maxWidth: 0 }
    onChange([...fields, nf])
    setSel(fields.length)
  }
  const removeField = (i) => {
    const f = fields[i]
    // Konfirmasi untuk elemen bawaan (bukan teks kustom) karena tidak bisa ditambah ulang dari UI
    if (f && !f.custom) {
      const nama = f.type === 'photo' ? 'Kotak Foto' : (f.key || 'elemen')
      if (!window.confirm(`Hapus elemen "${nama}" dari tata letak? Elemen ini tidak akan tampil pada hasil. (Muat ulang halaman untuk mengembalikan bila belum disimpan)`)) return
    }
    const nf = fields.filter((_, j) => j !== i)
    onChange(nf)
    setSel(Math.max(0, Math.min(i, nf.length - 1)))
  }

  const onMove = (e) => {
    if (dragIdx < 0 || !ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const x = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100))
    const y = Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100))
    update(dragIdx, { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 })
  }

  const s = fields[sel]

  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2">
        <div
          ref={ref}
          className="relative select-none border rounded-lg overflow-hidden bg-muted touch-none"
          onPointerMove={onMove}
          onPointerUp={() => setDragIdx(-1)}
          onPointerLeave={() => setDragIdx(-1)}
        >
          <img src={templateSrc} alt="template" className="w-full block pointer-events-none" onLoad={() => ref.current && (setCw(ref.current.offsetWidth), setCh(ref.current.offsetHeight))} />
          {(() => { const layout = computeLayout(); return fields.map((f, i) => {
            if (f.type === 'photo') {
              return (
                <div
                  key={i}
                  onPointerDown={() => { setDragIdx(i); setSel(i) }}
                  style={{ left: f.x + '%', top: f.y + '%', width: (f.w || 22) + '%', height: (f.h || 30) + '%' }}
                  className={`absolute flex items-center justify-center text-[10px] font-medium bg-primary/15 cursor-move border-2 ${sel === i ? 'border-primary' : 'border-dashed border-gray-500'}`}
                >FOTO</div>
              )
            }
            const lp = layout[i] || { centerYpct: f.y, sizePx: previewSize(f) }
            return (
              <div
                key={i}
                onPointerDown={() => { setDragIdx(i); setSel(i) }}
                style={{ left: f.x + '%', top: lp.centerYpct + '%', transform: 'translate(-50%,-50%)', color: f.color, fontFamily: f.font, fontWeight: f.bold ? 700 : 400, fontSize: lp.sizePx + 'px', maxWidth: f.maxWidth ? (f.maxWidth + '%') : 'none', whiteSpace: f.maxWidth ? 'pre-line' : 'pre', textAlign: f.align || 'center' }}
                className={`absolute cursor-move px-1 leading-tight ${sel === i ? 'ring-2 ring-primary rounded' : ''} ${f.flowBelow ? 'opacity-95' : ''}`}
              >{sampleValues[f.key] != null ? sampleValues[f.key] : f.label}</div>
            )
          }) })()}
        </div>
        <p className="text-xs text-muted-foreground mt-2">Seret setiap elemen untuk mengatur posisi. Klik elemen untuk mengedit gaya di panel kanan.</p>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap gap-1 items-center">
          {fields.map((f, i) => (
            <button key={i} onClick={() => setSel(i)} className={`text-xs px-2 py-1 rounded border ${sel === i ? 'bg-primary text-primary-foreground border-primary' : 'bg-background'}`}>{f.custom ? (f.label || 'Teks') : f.key}</button>
          ))}
          <button onClick={addText} className="text-xs px-2 py-1 rounded border border-dashed border-primary text-primary hover:bg-primary/10">+ Tambah Teks</button>
        </div>
        {s && (
          <div className="border rounded-lg p-3 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-semibold">{s.type === 'photo' ? 'Kotak Foto' : (s.custom ? 'Teks Kustom' : 'Teks')}: {s.custom ? (s.label || 'Teks') : s.key}</div>
              <button onClick={() => removeField(sel)} className="text-xs px-2 py-1 rounded border border-red-300 text-red-600 hover:bg-red-50">Hapus</button>
            </div>
            {s.type === 'photo' ? (
              <>
                <div><Label className="text-xs">Lebar ({s.w || 22}%)</Label><Slider min={5} max={60} step={1} value={[s.w || 22]} onValueChange={([v]) => update(sel, { w: v })} /></div>
                <div><Label className="text-xs">Tinggi ({s.h || 30}%)</Label><Slider min={5} max={70} step={1} value={[s.h || 30]} onValueChange={([v]) => update(sel, { h: v })} /></div>
              </>
            ) : (
              <>
                {(s.custom || !s.key.match(/name|rank|role|lomba|madrasah|nomor|gender/)) && (
                  <div><Label className="text-xs">Teks</Label><Input value={s.label || ''} onChange={(e) => update(sel, { label: e.target.value })} /></div>
                )}
                <div>
                  <Label className="text-xs">Ukuran ({Math.round(s.size * 1000)})</Label>
                  <div className="flex items-center gap-2">
                    <Slider className="flex-1" min={15} max={90} step={1} value={[Math.round(s.size * 1000)]} onValueChange={([v]) => update(sel, { size: v / 1000 })} />
                    <Input type="number" min={5} max={200} value={Math.round(s.size * 1000)} onChange={(e) => update(sel, { size: clampNum(e.target.value, 5, 200) / 1000 })} className="h-8 w-16 text-xs" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Lebar Maks Baris ({s.maxWidth || 0}%) — 0 = tanpa batas</Label>
                  <div className="flex items-center gap-2">
                    <Slider className="flex-1" min={0} max={100} step={1} value={[s.maxWidth || 0]} onValueChange={([v]) => update(sel, { maxWidth: v })} />
                    <Input type="number" min={0} max={100} value={s.maxWidth || 0} onChange={(e) => update(sel, { maxWidth: clampNum(e.target.value, 0, 100) })} className="h-8 w-16 text-xs" />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">Nama panjang otomatis turun ke baris berikutnya bila melebihi lebar ini. Bisa juga tekan Enter saat mengetik nama.</p>
                </div>
                <div className="rounded-md border bg-muted/40 p-2 space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={!!s.autoFit}
                      onChange={(e) => {
                        const on = e.target.checked
                        update(sel, { autoFit: on, maxWidth: on && !s.maxWidth ? 55 : s.maxWidth, maxLines: s.maxLines || 2 })
                      }}
                    />
                    Auto-Kecil (ukuran mengecil otomatis agar muat)
                  </label>
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={s.vAlign === 'top'}
                      onChange={(e) => update(sel, { vAlign: e.target.checked ? 'top' : undefined })}
                    />
                    Rata Atas (jarak nama konsisten 1/2 baris)
                  </label>
                  <p className="text-[10px] text-muted-foreground">Aktifkan agar baris pertama nama selalu mulai di posisi yang sama; baris ke-2 (nama panjang) turun ke bawah, tidak naik ke atas.</p>
                  {s.autoFit && (
                    <div>
                      <Label className="text-xs">Maks Baris ({s.maxLines || 2})</Label>
                      <div className="flex items-center gap-2">
                        <Slider className="flex-1" min={1} max={4} step={1} value={[s.maxLines || 2]} onValueChange={([v]) => update(sel, { maxLines: v })} />
                        <Input type="number" min={1} max={4} value={s.maxLines || 2} onChange={(e) => update(sel, { maxLines: clampNum(e.target.value, 1, 4) })} className="h-8 w-16 text-xs" />
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">Bila nama panjang, ukuran font otomatis diperkecil agar muat dalam batas lebar & jumlah baris ini (butuh &quot;Lebar Maks Baris&quot; &gt; 0).</p>
                    </div>
                  )}
                </div>
                <div className="rounded-md border bg-muted/40 p-2 space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={!!s.flowBelow}
                      onChange={(e) => {
                        if (e.target.checked) {
                          const anchor = (fields.find((ff, j) => j !== sel && (ff.key === 'participant_name' || ff.key === 'name')) || fields.find((ff, j) => j !== sel)) || {}
                          update(sel, { flowBelow: anchor.key || '', flowGap: s.flowGap != null ? s.flowGap : 2 })
                        } else {
                          update(sel, { flowBelow: undefined })
                        }
                      }}
                    />
                    Posisi Otomatis (mengikuti di bawah elemen lain)
                  </label>
                  {s.flowBelow && (
                    <>
                      <div>
                        <Label className="text-xs">Mengikuti di bawah</Label>
                        <Select value={s.flowBelow} onValueChange={(v) => update(sel, { flowBelow: v })}>
                          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {fields.filter((ff, j) => j !== sel).map((ff, j) => (
                              <SelectItem key={j} value={ff.key}>{ff.key}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Jarak ({s.flowGap != null ? s.flowGap : 2}%)</Label>
                        <div className="flex items-center gap-2">
                          <Slider className="flex-1" min={0} max={15} step={0.5} value={[s.flowGap != null ? s.flowGap : 2]} onValueChange={([v]) => update(sel, { flowGap: v })} />
                          <Input type="number" step={0.5} min={0} max={15} value={s.flowGap != null ? s.flowGap : 2} onChange={(e) => update(sel, { flowGap: clampNum(e.target.value, 0, 15) })} className="h-8 w-16 text-xs" />
                        </div>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">Elemen ini otomatis naik/turun mengikuti elemen di atasnya (mis. nama pendek 1 baris = naik, nama panjang 2 baris = turun). Saat aktif, <b>Posisi Y manual diabaikan</b>.</p>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1"><Label className="text-xs">Warna</Label><Input type="color" value={s.color} onChange={(e) => update(sel, { color: e.target.value })} className="h-9 p-1" /></div>
                  <div className="flex-1">
                    <Label className="text-xs">Perataan</Label>
                    <Select value={s.align} onValueChange={(v) => update(sel, { align: v })}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="left">Kiri</SelectItem>
                        <SelectItem value="center">Tengah</SelectItem>
                        <SelectItem value="right">Kanan</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!s.bold} onChange={(e) => update(sel, { bold: e.target.checked })} /> Tebal (Bold)</label>
              </>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Posisi X ({s.x}%)</Label>
                <div className="flex items-center gap-2">
                  <Slider className="flex-1" min={0} max={100} step={0.5} value={[s.x]} onValueChange={([v]) => update(sel, { x: v })} />
                  <Input type="number" step={0.5} min={0} max={100} value={s.x} onChange={(e) => update(sel, { x: clampNum(e.target.value, 0, 100) })} className="h-8 w-16 text-xs" />
                </div>
              </div>
              <div>
                <Label className="text-xs">Posisi Y ({s.y}%)</Label>
                <div className="flex items-center gap-2">
                  <Slider className="flex-1" min={0} max={100} step={0.5} value={[s.y]} onValueChange={([v]) => update(sel, { y: v })} />
                  <Input type="number" step={0.5} min={0} max={100} value={s.y} onChange={(e) => update(sel, { y: clampNum(e.target.value, 0, 100) })} className="h-8 w-16 text-xs" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
