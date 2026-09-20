'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Users, CheckCircle2, Clock, UserPlus, Loader2, Upload, FileText, Trash2, FolderTree, FileSpreadsheet, Download, FileCheck2, FileWarning, Pencil } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { StatCard, StatusBadge, PageHeader, Empty, SortSelect } from '@/components/porseni/shared'
import { api, uploadFile, fileUrl } from '@/lib/porseni/api'
import { GENDERS, GENDER_LABEL, REQ_FILES, sortPeserta } from '@/lib/porseni/constants'
import { downloadPesertaTemplate, parsePesertaWorkbook, downloadTeamTemplate, parseTeamWorkbook } from '@/lib/porseni/excel'

export default function AdminMadrasah({ view, user }) {
  const [lomba, setLomba] = useState([])
  const [peserta, setPeserta] = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const [l, p] = await Promise.all([api('/lomba'), api('/peserta')])
      setLomba(l); setPeserta(p)
    } catch (e) { toast.error(e.message) } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  if (view === 'dashboard') return <Dashboard user={user} peserta={peserta} loading={loading} />
  if (view === 'pendaftaran') return <Pendaftaran user={user} lomba={lomba} onDone={load} />
  return <DaftarPeserta peserta={peserta} lomba={lomba} loading={loading} onChange={load} />
}

function Dashboard({ user, peserta, loading }) {
  const verified = peserta.filter((p) => p.status === 'verified').length
  const complete = peserta.filter((p) => p.complete).length
  return (
    <div>
      <PageHeader title={`Selamat datang, ${user.name}`} desc={user.madrasah_name} />
      {loading ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : (
        <div className="grid gap-4 sm:grid-cols-4">
          <StatCard icon={Users} label="Total Peserta" value={peserta.length} />
          <StatCard icon={FileCheck2} label="Berkas Lengkap" value={complete} />
          <StatCard icon={CheckCircle2} label="Terverifikasi" value={verified} />
          <StatCard icon={Clock} label="Belum Lengkap" value={peserta.length - complete} />
        </div>
      )}
      <Card className="p-6 mt-6 bg-primary/5 border-primary/20">
        <div className="flex items-start gap-3">
          <UserPlus className="h-5 w-5 text-primary mt-0.5" />
          <div>
            <div className="font-semibold">Daftarkan peserta lomba</div>
            <p className="text-sm text-muted-foreground mt-1">Gunakan menu <b>Pendaftaran Peserta</b> untuk menambahkan siswa (satuan atau import Excel). Peserta baru diteruskan ke Panitia setelah data lengkap dan seluruh berkas persyaratan (Akte, Surat Keterangan, Pas Photo) terunggah.</p>
          </div>
        </div>
      </Card>
    </div>
  )
}

// Build a safe Drive folder path: [Lomba]/[Madrasah]/[Peserta]
const drivePath = (...parts) => parts.filter((p) => p && String(p).trim()).map((s) => String(s).replace(/[\\/]+/g, '-').trim().slice(0, 120)).join('/')

function FileUploadRow({ item, value, onUploaded, folderPath, disabled, disabledReason }) {
  const [busy, setBusy] = useState(false)
  const ref = useRef(null)
  const handle = async (e) => {
    const file = e.target.files?.[0]
    if (ref.current) ref.current.value = ''
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { toast.error('Ukuran file maksimal 10MB'); return }
    setBusy(true)
    try {
      const res = await uploadFile(file, folderPath)
      onUploaded(res)
      toast.success(`${item.label} terunggah`)
    } catch (err) { toast.error(err.message) } finally { setBusy(false) }
  }
  return (
    <div className="flex items-center justify-between gap-3 border rounded-lg p-3">
      <div className="flex items-center gap-2 min-w-0">
        <FileText className="h-4 w-4 text-primary shrink-0" />
        <div className="min-w-0">
          <div className="text-sm font-medium truncate">{item.label}</div>
          {value ? <div className="text-xs text-primary truncate">{value.name}</div> : <div className="text-xs text-muted-foreground">Belum diunggah</div>}
        </div>
      </div>
      <input ref={ref} type="file" className="hidden" onChange={handle} accept={item.key === 'pas_photo' ? 'image/*' : 'image/*,application/pdf'} />
      <Button type="button" size="sm" variant={value ? 'outline' : 'secondary'} disabled={busy || disabled} title={disabled ? (disabledReason || '') : ''} onClick={() => ref.current?.click()}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        <span className="ml-1">{value ? 'Ganti' : 'Unggah'}</span>
      </Button>
    </div>
  )
}

function Pendaftaran({ user, lomba, onDone }) {
  const [mode, setMode] = useState('perorangan')
  const [form, setForm] = useState({ participant_name: '', gender: '', ttl: '', nisn: '', lomba_id: '' })
  const [files, setFiles] = useState({})
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const individuLomba = lomba.filter((l) => l.type !== 'kelompok')

  const submit = async () => {
    if (!form.participant_name || !form.lomba_id) return toast.error('Nama & Cabang Lomba wajib diisi')
    if (!form.gender) return toast.error('Jenis kelamin wajib dipilih')
    setSaving(true)
    try {
      const filesPayload = {}
      Object.entries(files).forEach(([k, v]) => { filesPayload[k] = { id: v.id, name: v.name } })
      const res = await api('/peserta', { method: 'POST', body: { ...form, madrasah_name: user.madrasah_name, files: filesPayload } })
      toast.success('Peserta berhasil didaftarkan', {
        description: `Nomor Peserta: ${res.nomor_peserta}. ${res.complete ? 'Berkas lengkap, diteruskan ke Panitia.' : 'Lengkapi berkas persyaratan di menu Daftar Peserta agar diteruskan ke Panitia.'}`,
        duration: 7000,
      })
      setForm({ participant_name: '', gender: '', ttl: '', nisn: '', lomba_id: '' })
      setFiles({})
      onDone()
    } catch (e) { toast.error(e.message) } finally { setSaving(false) }
  }

  return (
    <div>
      <PageHeader title="Pendaftaran Peserta" desc={`Madrasah: ${user.madrasah_name || '-'}`} />

      <div className="flex gap-2 mb-4">
        <Button variant={mode === 'perorangan' ? 'default' : 'outline'} onClick={() => setMode('perorangan')}><UserPlus className="h-4 w-4 mr-1" />Perorangan</Button>
        <Button variant={mode === 'tim' ? 'default' : 'outline'} onClick={() => setMode('tim')}><Users className="h-4 w-4 mr-1" />Tim / Kelompok</Button>
      </div>

      {mode === 'tim' ? (
        <TeamPendaftaran user={user} lomba={lomba} onDone={onDone} />
      ) : (
        <>
          <BulkImport user={user} lomba={lomba} onDone={onDone} />
          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Data Peserta (Satuan)</h3>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Nama Lengkap</Label>
                  <Textarea rows={2} value={form.participant_name} onChange={(e) => set('participant_name', e.target.value)} placeholder="Nama peserta (tekan Enter untuk baris baru)" />
                </div>
                <div className="space-y-1.5">
                  <Label>Jenis Kelamin</Label>
                  <Select value={form.gender} onValueChange={(v) => set('gender', v)}>
                    <SelectTrigger><SelectValue placeholder="Pilih jenis kelamin" /></SelectTrigger>
                    <SelectContent>
                      {GENDERS.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>NISN</Label>
                  <Input value={form.nisn} onChange={(e) => set('nisn', e.target.value)} placeholder="Nomor Induk Siswa Nasional" />
                </div>
                <div className="space-y-1.5">
                  <Label>Tempat, Tanggal Lahir</Label>
                  <Input value={form.ttl} onChange={(e) => set('ttl', e.target.value)} placeholder="Kediri, 01 Januari 2015" />
                </div>
                <div className="space-y-1.5">
                  <Label>Asal Madrasah</Label>
                  <Input value={user.madrasah_name || ''} disabled />
                </div>
                <div className="space-y-1.5">
                  <Label>Cabang Lomba (Perorangan)</Label>
                  <Select value={form.lomba_id} onValueChange={(v) => set('lomba_id', v)}>
                    <SelectTrigger><SelectValue placeholder="Pilih cabang lomba" /></SelectTrigger>
                    <SelectContent>
                      {individuLomba.map((l) => <SelectItem key={l.id} value={l.id}>{l.name} ({l.category})</SelectItem>)}
                      {individuLomba.length === 0 && <div className="px-3 py-2 text-sm text-muted-foreground">Belum ada lomba perorangan</div>}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold mb-1">Berkas Persyaratan</h3>
              <p className="text-xs text-muted-foreground mb-4 flex items-center gap-1">
                <FolderTree className="h-3.5 w-3.5" /> Disimpan terstruktur di Drive: [Lomba]/[Madrasah]/[Peserta]
              </p>
              {(() => {
                const selLomba = lomba.find((l) => l.id === form.lomba_id)
                const ready = !!(form.lomba_id && form.participant_name.trim())
                const folderPath = ready ? drivePath(selLomba?.name, user.madrasah_name || 'Umum', form.participant_name) : ''
                return (
                  <>
                    {!ready && <p className="text-xs text-amber-600 mb-3">Isi <b>Nama Lengkap</b> & <b>Cabang Lomba</b> terlebih dahulu agar berkas tersimpan pada folder peserta yang benar.</p>}
                    <div className="space-y-3">
                      {REQ_FILES.map((item) => (
                        <FileUploadRow key={item.key} item={item} value={files[item.key]} folderPath={folderPath} disabled={!ready} disabledReason="Isi Nama & Cabang Lomba dulu" onUploaded={(res) => setFiles((f) => ({ ...f, [item.key]: res }))} />
                      ))}
                    </div>
                  </>
                )
              })()}
              <Button className="w-full mt-6" disabled={saving} onClick={submit}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Daftarkan Peserta
              </Button>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}

function TeamMemberCard({ index, member, onChange, lombaName, madrasahName }) {
  const ready = !!member.participant_name.trim()
  const folderPath = ready ? drivePath(lombaName, madrasahName, member.participant_name) : ''
  return (
    <Card className="p-4 border-primary/20">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">{index + 1}</div>
        <div className="font-semibold text-sm">Anggota {index + 1}</div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Nama Lengkap</Label>
          <Textarea rows={2} value={member.participant_name} onChange={(e) => onChange({ participant_name: e.target.value })} placeholder="Nama anggota (tekan Enter untuk baris baru)" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Jenis Kelamin</Label>
          <Select value={member.gender} onValueChange={(v) => onChange({ gender: v })}>
            <SelectTrigger><SelectValue placeholder="L / P" /></SelectTrigger>
            <SelectContent>{GENDERS.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">NISN</Label>
          <Input value={member.nisn} onChange={(e) => onChange({ nisn: e.target.value })} placeholder="NISN" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Tempat, Tanggal Lahir</Label>
          <Input value={member.ttl} onChange={(e) => onChange({ ttl: e.target.value })} placeholder="Kediri, 01 Januari 2015" />
        </div>
      </div>
      <div className="mt-3 space-y-2">
        <p className="text-xs text-muted-foreground">Berkas persyaratan (khusus anggota ini):</p>
        {!ready && <p className="text-xs text-amber-600">Isi nama anggota dulu agar berkas tersimpan di folder peserta.</p>}
        {REQ_FILES.map((item) => (
          <FileUploadRow key={item.key} item={item} value={member.files?.[item.key]} folderPath={folderPath} disabled={!ready} disabledReason="Isi nama anggota dulu" onUploaded={(res) => onChange({ files: { ...(member.files || {}), [item.key]: res } })} />
        ))}
      </div>
    </Card>
  )
}

function TeamBulkImport({ user, lomba, onDone }) {
  const [busy, setBusy] = useState(false)
  const ref = useRef(null)
  const doUpload = async (e) => {
    const file = e.target.files?.[0]
    if (ref.current) ref.current.value = ''
    if (!file) return
    setBusy(true)
    try {
      const teams = await parseTeamWorkbook(file)
      if (!teams.length) { toast.error('Tidak ada data tim pada file.'); return }
      const byName = {}
      lomba.forEach((l) => { if (l.type === 'kelompok') byName[l.name.trim().toLowerCase()] = l })
      let okTeams = 0; let okMembers = 0
      const errs = []
      for (const t of teams) {
        const l = byName[(t.lomba_name || '').trim().toLowerCase()]
        if (!l) { errs.push(`Lomba kelompok "${t.lomba_name}" tidak ditemukan (tim ${t.madrasah_name})`); continue }
        try {
          const res = await api('/peserta/team', { method: 'POST', body: { lomba_id: l.id, madrasah_name: t.madrasah_name || user.madrasah_name, members: t.members } })
          okTeams++; okMembers += res.count || t.members.length
        } catch (err) { errs.push(`${t.lomba_name} - ${t.madrasah_name}: ${err.message}`) }
      }
      if (okTeams) toast.success(`${okTeams} tim (${okMembers} anggota) berhasil diimport. Lengkapi berkas tiap anggota di menu Daftar Peserta Saya.`, { duration: 8000 })
      if (errs.length) toast.error(`${errs.length} gagal:\n` + errs.slice(0, 5).join('\n'), { duration: 9000 })
      onDone()
    } catch (err) { toast.error('Gagal membaca file: ' + err.message) } finally { setBusy(false) }
  }
  return (
    <Card className="p-6 mb-2 bg-emerald-50/60 border-emerald-200">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start gap-3">
          <FileSpreadsheet className="h-6 w-6 text-emerald-700 mt-0.5" />
          <div>
            <div className="font-semibold">Pendaftaran Tim Massal via Excel</div>
            <p className="text-sm text-muted-foreground mt-1 max-w-xl">Unduh template, isi banyak tim sekaligus (satu baris = satu anggota; baris dengan Cabang Lomba + Nama Madrasah yang sama dikelompokkan menjadi satu tim). Setelah import, lengkapi berkas tiap anggota di menu <b>Daftar Peserta Saya</b>.</p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" onClick={() => downloadTeamTemplate(lomba)}><Download className="h-4 w-4 mr-1" />Template</Button>
          <input ref={ref} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={doUpload} />
          <Button disabled={busy} onClick={() => ref.current?.click()}>{busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}Upload Excel</Button>
        </div>
      </div>
    </Card>
  )
}

function TeamPendaftaran({ user, lomba, onDone }) {
  const groupLomba = lomba.filter((l) => l.type === 'kelompok')
  const [lombaId, setLombaId] = useState('')
  const [members, setMembers] = useState([])
  const [saving, setSaving] = useState(false)
  const selected = groupLomba.find((l) => l.id === lombaId)

  useEffect(() => {
    if (selected) {
      const n = Number(selected.team_size) || 1
      setMembers(Array.from({ length: n }, () => ({ participant_name: '', gender: '', nisn: '', ttl: '', files: {} })))
    } else {
      setMembers([])
    }
  }, [lombaId])

  const updateMember = (i, patch) => setMembers((ms) => ms.map((m, j) => (j === i ? { ...m, ...patch } : m)))

  const submit = async () => {
    if (!selected) return toast.error('Pilih cabang lomba kelompok terlebih dahulu')
    const filled = members.filter((m) => m.participant_name.trim())
    if (filled.length === 0) return toast.error('Isi minimal satu anggota tim')
    setSaving(true)
    try {
      const payload = {
        lomba_id: selected.id,
        madrasah_name: user.madrasah_name,
        members: filled.map((m) => ({
          participant_name: m.participant_name,
          gender: m.gender,
          nisn: m.nisn,
          ttl: m.ttl,
          files: Object.fromEntries(Object.entries(m.files || {}).filter(([, v]) => v && v.id).map(([k, v]) => [k, { id: v.id, name: v.name }])),
        })),
      }
      const res = await api('/peserta/team', { method: 'POST', body: payload })
      toast.success(`Tim berhasil didaftarkan: ${res.count} anggota.`, { description: 'Pastikan seluruh berkas tiap anggota lengkap agar diteruskan ke Panitia (cek menu Daftar Peserta Saya).', duration: 8000 })
      setLombaId(''); setMembers([]); onDone()
    } catch (e) { toast.error(e.message) } finally { setSaving(false) }
  }

  return (
    <div className="space-y-6">
      <TeamBulkImport user={user} lomba={lomba} onDone={onDone} />
      <Card className="p-6 bg-emerald-50/60 border-emerald-200">
        <div className="grid sm:grid-cols-2 gap-4 items-end">
          <div className="space-y-1.5">
            <Label>Cabang Lomba Kelompok</Label>
            <Select value={lombaId} onValueChange={setLombaId}>
              <SelectTrigger><SelectValue placeholder="Pilih lomba kelompok (Voli, Futsal, dst)" /></SelectTrigger>
              <SelectContent>
                {groupLomba.map((l) => <SelectItem key={l.id} value={l.id}>{l.name} ({l.category}) — {l.team_size || '?'} anggota</SelectItem>)}
                {groupLomba.length === 0 && <div className="px-3 py-2 text-sm text-muted-foreground">Belum ada lomba kelompok</div>}
              </SelectContent>
            </Select>
          </div>
          <div className="text-sm text-muted-foreground">
            {selected ? <>Mendaftarkan <b>1 tim</b> dari <b>{user.madrasah_name}</b> berisi <b>{Number(selected.team_size) || 1} anggota</b>.</> : 'Pilih cabang lomba untuk menampilkan formulir anggota tim.'}
          </div>
        </div>
      </Card>

      {selected && (
        <>
          <div className="grid lg:grid-cols-2 gap-4">
            {members.map((m, i) => (
              <TeamMemberCard key={i} index={i} member={m} onChange={(patch) => updateMember(i, patch)} lombaName={selected.name} madrasahName={user.madrasah_name} />
            ))}
          </div>
          <div className="flex justify-end">
            <Button disabled={saving} onClick={submit}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Daftarkan Tim ({members.length} Anggota)
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

function BulkImport({ user, lomba, onDone }) {
  const [busy, setBusy] = useState(false)
  const ref = useRef(null)

  const doUpload = async (e) => {
    const file = e.target.files?.[0]
    if (ref.current) ref.current.value = ''
    if (!file) return
    setBusy(true)
    try {
      const rows = await parsePesertaWorkbook(file)
      if (!rows.length) { toast.error('Tidak ada data peserta pada file.'); return }
      const byName = {}
      lomba.forEach((l) => { byName[l.name.trim().toLowerCase()] = l.id })
      let ok = 0
      const errs = []
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i]
        const lombaId = byName[(r.lomba_name || '').trim().toLowerCase()]
        if (!lombaId) { errs.push(`Baris ${i + 2}: cabang lomba "${r.lomba_name}" tidak ditemukan`); continue }
        if (!r.gender) { errs.push(`Baris ${i + 2}: jenis kelamin (L/P) kosong untuk ${r.participant_name}`); continue }
        try {
          await api('/peserta', { method: 'POST', body: { participant_name: r.participant_name, gender: r.gender, nisn: r.nisn, ttl: r.ttl, lomba_id: lombaId, madrasah_name: user.madrasah_name, files: {} } })
          ok++
        } catch (err) { errs.push(`Baris ${i + 2}: ${err.message}`) }
      }
      if (ok) toast.success(`${ok} peserta berhasil diimport. Lengkapi berkas persyaratan di menu Daftar Peserta.`, { duration: 7000 })
      if (errs.length) toast.error(`${errs.length} baris gagal:\n` + errs.slice(0, 5).join('\n'), { duration: 9000 })
      onDone()
    } catch (err) { toast.error('Gagal membaca file: ' + err.message) } finally { setBusy(false) }
  }

  return (
    <Card className="p-6 mb-6 bg-emerald-50/60 border-emerald-200">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start gap-3">
          <FileSpreadsheet className="h-6 w-6 text-emerald-700 mt-0.5" />
          <div>
            <div className="font-semibold">Pendaftaran Massal via Excel</div>
            <p className="text-sm text-muted-foreground mt-1 max-w-xl">Unduh template Excel, isi data peserta (kolom Jenis Kelamin diisi L / P), lalu unggah kembali. Setelah import, lengkapi berkas persyaratan tiap peserta di menu <b>Daftar Peserta Saya</b>.</p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" onClick={() => downloadPesertaTemplate(lomba)}>
            <Download className="h-4 w-4 mr-1" />Template
          </Button>
          <input ref={ref} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={doUpload} />
          <Button disabled={busy} onClick={() => ref.current?.click()}>
            {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}Upload Excel
          </Button>
        </div>
      </div>
    </Card>
  )
}

function PersyaratanDialog({ peserta, open, onOpenChange, onSaved }) {
  const [files, setFiles] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open && peserta) setFiles(peserta.files || {})
  }, [open, peserta])

  const save = async () => {
    setSaving(true)
    try {
      const payload = {}
      Object.entries(files).forEach(([k, v]) => { if (v && v.id) payload[k] = { id: v.id, name: v.name } })
      const res = await api(`/peserta/${peserta.id}`, { method: 'PUT', body: { files: payload } })
      toast.success(res.complete ? 'Berkas lengkap. Peserta diteruskan ke Panitia.' : 'Berkas tersimpan. Masih ada yang belum diunggah.')
      onOpenChange(false); onSaved()
    } catch (e) { toast.error(e.message) } finally { setSaving(false) }
  }

  if (!peserta) return null
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Upload Persyaratan — {peserta.participant_name}</DialogTitle></DialogHeader>
        <p className="text-xs text-muted-foreground -mt-2">Lengkapi seluruh berkas agar peserta diteruskan ke Panitia.</p>
        <div className="space-y-3 mt-2">
          {REQ_FILES.map((item) => (
            <FileUploadRow key={item.key} item={item} value={files[item.key]} folderPath={drivePath(peserta.lomba_name, peserta.madrasah_name, peserta.participant_name)} onUploaded={(res) => setFiles((f) => ({ ...f, [item.key]: res }))} />
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Tutup</Button>
          <Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Simpan Berkas</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function EditBiodataDialog({ peserta, lomba, open, onOpenChange, onSaved }) {
  const [form, setForm] = useState({ participant_name: '', gender: '', nisn: '', ttl: '', lomba_id: '' })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  useEffect(() => {
    if (open && peserta) setForm({
      participant_name: peserta.participant_name || '',
      gender: peserta.gender || '',
      nisn: peserta.nisn || '',
      ttl: peserta.ttl || '',
      lomba_id: peserta.lomba_id || '',
    })
  }, [open, peserta])

  const save = async () => {
    if (!form.participant_name.trim()) return toast.error('Nama wajib diisi')
    setSaving(true)
    try {
      await api(`/peserta/${peserta.id}`, { method: 'PUT', body: {
        participant_name: form.participant_name.trim(),
        gender: form.gender,
        nisn: form.nisn,
        ttl: form.ttl,
        lomba_id: form.lomba_id,
      } })
      toast.success('Biodata peserta diperbarui')
      onOpenChange(false); onSaved()
    } catch (e) { toast.error(e.message) } finally { setSaving(false) }
  }

  if (!peserta) return null
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Edit Biodata — {peserta.participant_name}</DialogTitle></DialogHeader>
        <div className="space-y-3 mt-2">
          <div className="space-y-1.5">
            <Label>Nama Lengkap</Label>
            <Textarea rows={2} value={form.participant_name} onChange={(e) => set('participant_name', e.target.value)} placeholder="Nama peserta (tekan Enter untuk baris baru)" />
          </div>
          <div className="space-y-1.5">
            <Label>Jenis Kelamin</Label>
            <Select value={form.gender} onValueChange={(v) => set('gender', v)}>
              <SelectTrigger><SelectValue placeholder="Pilih jenis kelamin" /></SelectTrigger>
              <SelectContent>{GENDERS.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>NISN</Label>
            <Input value={form.nisn} onChange={(e) => set('nisn', e.target.value)} placeholder="Nomor Induk Siswa Nasional" />
          </div>
          <div className="space-y-1.5">
            <Label>Tempat, Tanggal Lahir</Label>
            <Input value={form.ttl} onChange={(e) => set('ttl', e.target.value)} placeholder="Kediri, 01 Januari 2015" />
          </div>
          <div className="space-y-1.5">
            <Label>Cabang Lomba</Label>
            <Select value={form.lomba_id} onValueChange={(v) => set('lomba_id', v)}>
              <SelectTrigger><SelectValue placeholder="Pilih cabang lomba" /></SelectTrigger>
              <SelectContent>{(lomba || []).map((l) => <SelectItem key={l.id} value={l.id}>{l.name} ({l.category})</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Simpan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DaftarPeserta({ peserta, lomba, loading, onChange }) {
  const [dlg, setDlg] = useState({ open: false, peserta: null })
  const [editDlg, setEditDlg] = useState({ open: false, peserta: null })
  const [sortBy, setSortBy] = useState('nomor')
  const rows = sortPeserta(peserta, sortBy)
  const del = async (id) => {
    if (!confirm('Hapus peserta ini?')) return
    try { await api(`/peserta/${id}`, { method: 'DELETE' }); toast.success('Peserta dihapus'); onChange() }
    catch (e) { toast.error(e.message) }
  }
  return (
    <div>
      <PageHeader title="Daftar Peserta Saya" desc="Lengkapi berkas persyaratan agar peserta diteruskan ke Panitia">
        {peserta.length > 0 && <SortSelect value={sortBy} onChange={setSortBy} />}
      </PageHeader>
      <Card>
        {loading ? <div className="p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div> : peserta.length === 0 ? <Empty text="Belum ada peserta terdaftar." /> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No. Peserta</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>L/P</TableHead>
                <TableHead>Tempat, Tgl Lahir</TableHead>
                <TableHead>Cabang Lomba</TableHead>
                <TableHead>Berkas</TableHead>
                <TableHead>Kelengkapan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono">{p.nomor_peserta}</TableCell>
                  <TableCell className="font-medium">{p.participant_name}</TableCell>
                  <TableCell>{GENDER_LABEL[p.gender] ? (p.gender === 'L' ? 'L' : 'P') : '-'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.ttl || '-'}</TableCell>
                  <TableCell>{p.lomba_name}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {Object.entries(p.files || {}).map(([k, v]) => (
                        <a key={k} href={fileUrl(v.id)} target="_blank" rel="noreferrer" className="text-xs text-primary underline">{k}</a>
                      ))}
                      {(!p.files || Object.keys(p.files).length === 0) && <span className="text-xs text-muted-foreground">-</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    {p.complete
                      ? <Badge className="bg-emerald-600 text-white"><FileCheck2 className="h-3 w-3 mr-1" />Lengkap</Badge>
                      : <Badge variant="outline" className="text-amber-700 border-amber-300"><FileWarning className="h-3 w-3 mr-1" />Belum</Badge>}
                  </TableCell>
                  <TableCell><StatusBadge status={p.status} /></TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button size="sm" variant="outline" onClick={() => setEditDlg({ open: true, peserta: p })}><Pencil className="h-4 w-4 mr-1" />Edit</Button>
                    <Button size="sm" variant="outline" className="ml-1" onClick={() => setDlg({ open: true, peserta: p })}><Upload className="h-4 w-4 mr-1" />Persyaratan</Button>
                    <Button size="icon" variant="ghost" className="text-destructive ml-1" onClick={() => del(p.id)}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
      <PersyaratanDialog peserta={dlg.peserta} open={dlg.open} onOpenChange={(v) => setDlg((d) => ({ ...d, open: v }))} onSaved={onChange} />
      <EditBiodataDialog peserta={editDlg.peserta} lomba={lomba} open={editDlg.open} onOpenChange={(v) => setEditDlg((d) => ({ ...d, open: v }))} onSaved={onChange} />
    </div>
  )
}
