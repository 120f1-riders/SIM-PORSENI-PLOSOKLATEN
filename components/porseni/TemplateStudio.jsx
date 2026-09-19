'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Upload, Download, Image as ImageIcon, Info } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Empty } from '@/components/porseni/shared'
import OverlayEditor from '@/components/porseni/OverlayEditor'
import { api, uploadFile, fileUrl } from '@/lib/porseni/api'
import { renderOverlay, downloadDataUrl } from '@/lib/porseni/canvasgen'

// Aktifkan Auto-Kecil + posisi-otomatis untuk template lama yang belum punya properti ini
function withAutoFitDefaults(arr, type) {
  const t = String(type || '')
  const flowType = t.startsWith('idcard') || t.startsWith('certificate')
  return (arr || []).map((f) => {
    let nf = f
    const isName = f.key === 'participant_name' || f.key === 'name'
    if (isName && f.autoFit === undefined) {
      nf = { ...nf, autoFit: true, maxLines: f.maxLines || 2, maxWidth: f.maxWidth || 55 }
    }
    // Nama peserta/panitia dibuat RATA-ATAS agar jarak nama konsisten (1 baris vs 2 baris)
    if (isName && nf.vAlign === undefined) {
      nf = { ...nf, vAlign: 'top' }
    }
    // ID Card / Sertifikat: nama madrasah otomatis mengalir sedikit di bawah nama peserta (naik saat nama pendek)
    if (flowType && f.key === 'madrasah_name' && f.flowBelow === undefined) {
      nf = { ...nf, flowBelow: 'participant_name', flowGap: f.flowGap != null ? f.flowGap : (t.startsWith('idcard') ? 2 : 3) }
    }
    return nf
  })
}

export default function TemplateStudio({ type, defaultFields, targets, loadingTargets, sample, readOnly = false }) {
  const [imageUrl, setImageUrl] = useState(null)
  const [fields, setFields] = useState(defaultFields)
  const [loaded, setLoaded] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    (async () => {
      try {
        const list = await api(`/templates?type=${type}`)
        if (list[0]) { setImageUrl(list[0].image_url); if (list[0].fields?.length) setFields(withAutoFitDefaults(list[0].fields, type)) }
      } catch (e) { /* ignore */ } finally { setLoaded(true) }
    })()
  }, [type])

  const upload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return
    setUploading(true)
    try { const res = await uploadFile(file); setImageUrl(fileUrl(res.id)); toast.success('Template diunggah') }
    catch (err) { toast.error(err.message) } finally { setUploading(false) }
  }
  const save = async () => {
    if (!imageUrl) return toast.error('Unggah template terlebih dahulu')
    setSaving(true)
    try { await api('/templates', { method: 'POST', body: { type, image_url: imageUrl, fields } }); toast.success('Template tersimpan') }
    catch (e) { toast.error(e.message) } finally { setSaving(false) }
  }
  const generateAll = async () => {
    if (!imageUrl && !targets.some((t) => t.baseImage)) return toast.error('Template belum tersedia')
    if (!targets.length) return toast.error('Belum ada data untuk digenerate')
    setGenerating(true)
    try {
      for (const t of targets) {
        const src = t.baseImage || imageUrl
        if (!src) continue
        const dataUrl = await renderOverlay({ templateSrc: src, fields, values: t.values })
        downloadDataUrl(dataUrl, t.filename)
        await new Promise((r) => setTimeout(r, 250))
      }
      toast.success(`${targets.length} file berhasil digenerate`)
    } catch (e) { toast.error('Gagal generate: ' + e.message) } finally { setGenerating(false) }
  }
  const generateOne = async (t) => {
    try { const src = t.baseImage || imageUrl; if (!src) return toast.error('Template belum tersedia'); const dataUrl = await renderOverlay({ templateSrc: src, fields, values: t.values }); downloadDataUrl(dataUrl, t.filename) }
    catch (e) { toast.error(e.message) }
  }

  if (!loaded) return <Loader2 className="h-6 w-6 animate-spin text-primary" />

  return (
    <div className="space-y-6">
      {!readOnly ? (
        <Card className="p-6">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <input ref={ref} type="file" accept="image/*" className="hidden" onChange={upload} />
            <Button variant="secondary" disabled={uploading} onClick={() => ref.current?.click()}>
              {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              {imageUrl ? 'Ganti Template' : 'Unggah Template (Gambar)'}
            </Button>
            {imageUrl && <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}Simpan Tata Letak</Button>}
          </div>
          {imageUrl ? (
            <OverlayEditor templateSrc={imageUrl} fields={fields} onChange={setFields} sampleValues={sample} />
          ) : (
            <div className="border-2 border-dashed rounded-lg py-16 text-center text-muted-foreground">
              <ImageIcon className="h-10 w-10 mx-auto mb-3 opacity-50" />
              Unggah gambar template (JPG/PNG) untuk mulai menata teks.
            </div>
          )}
        </Card>
      ) : (
        <Card className="p-6">
          {imageUrl ? (
            <div className="flex items-start gap-4">
              <img src={imageUrl} alt="Template" className="w-56 border rounded bg-white object-contain" />
              <div className="text-sm text-muted-foreground flex items-start gap-2">
                <Info className="h-4 w-4 mt-0.5 shrink-0" />
                Template & tata letak diatur oleh Super Admin. Anda dapat langsung mengunduh hasil untuk seluruh data di bawah ini.
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed rounded-lg py-12 text-center text-muted-foreground">
              <ImageIcon className="h-10 w-10 mx-auto mb-3 opacity-50" />
              Template belum disiapkan oleh Super Admin.
            </div>
          )}
        </Card>
      )}

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold">Generate ({targets.length})</h3>
            <p className="text-sm text-muted-foreground">Hasil diunduh sebagai gambar PNG siap cetak.</p>
          </div>
          <Button onClick={generateAll} disabled={generating || (!imageUrl && !targets.some((t) => t.baseImage)) || !targets.length}>
            {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}Unduh Semua
          </Button>
        </div>
        {loadingTargets ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : targets.length === 0 ? <Empty text="Belum ada data." /> : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {targets.map((t, i) => (
              <div key={i} className="flex items-center justify-between border rounded-lg px-3 py-2 text-sm">
                <span className="truncate">{t.label}</span>
                <Button size="icon" variant="ghost" disabled={!imageUrl && !t.baseImage} onClick={() => generateOne(t)}><Download className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
