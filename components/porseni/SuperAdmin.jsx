'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  Trophy, Users, GraduationCap, Loader2, Plus, Pencil, Trash2, CheckCircle, ShieldCheck,
  Upload, Award, Download, IdCard, Image as ImageIcon, Printer, UsersRound, User,
  Eye, EyeOff, KeyRound, Copy, FileText, BellRing, Cloud, RefreshCw, FileSpreadsheet, Link2, Unlink, Medal,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { StatCard, StatusBadge, PageHeader, Empty } from '@/components/porseni/shared'
import TemplateStudio from '@/components/porseni/TemplateStudio'
import { CATEGORIES, LOMBA_TYPES, GENDER_LABEL, GENDERS, ROLES, ROLE_LABEL, CERT_DEFAULT_FIELDS, CERT_PANITIA_FIELDS, IDCARD_PESERTA_FIELDS, IDCARD_PANITIA_FIELDS } from '@/lib/porseni/constants'
import { api, uploadFile, fileUrl, getToken } from '@/lib/porseni/api'
import { downloadLombaTemplate, parseLombaWorkbook, downloadUserTemplate, parseUserWorkbook, exportUsersToExcel } from '@/lib/porseni/excel'

export default function SuperAdmin({ view }) {
  if (view === 'lomba') return <ManajemenLomba />
  if (view === 'pengguna') return <ManajemenPengguna />
  if (view === 'pendaftar') return <DataPendaftar />
  if (view === 'cetak') return <CetakAdmin />
  if (view === 'sertifikat') return <Sertifikat />
  if (view === 'idcard') return <IdCardManager />
  if (view === 'integrasi') return <IntegrasiGoogle />
  if (view === 'backup') return <BackupRestore />
  return <Dashboard />
}

/* ---------------- INTEGRASI GOOGLE ---------------- */
function IntegrasiGoogle() {
  const [st, setSt] = useState(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  const load = async () => {
    setLoading(true)
    try { setSt(await api('/integrations/status')) }
    catch (e) { toast.error(e.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const connectDrive = () => {
    const tk = getToken()
    const w = window.open(`/api/google/start?token=${encodeURIComponent(tk)}`, '_blank', 'width=520,height=680')
    // Poll for connection after popup closes
    const timer = setInterval(async () => {
      if (w && w.closed) {
        clearInterval(timer)
        await load()
      }
    }, 1500)
  }

  const disconnectDrive = async () => {
    if (!confirm('Putuskan koneksi Google Drive? Berkas baru akan disimpan di server lokal.')) return
    try { await api('/integrations/drive/disconnect', { method: 'POST' }); toast.success('Koneksi Drive diputus'); load() }
    catch (e) { toast.error(e.message) }
  }

  const syncSheet = async () => {
    setSyncing(true)
    try {
      const r = await api('/integrations/sync', { method: 'POST' })
      toast.success(`Berhasil sinkron ${r.synced} peserta ke Google Sheet`)
    } catch (e) { toast.error(e.message) }
    finally { setSyncing(false) }
  }

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>

  const s = st || {}
  return (
    <div className="space-y-5">
      <PageHeader title="Integrasi Google" desc="Hubungkan aplikasi ke Google Drive & Google Sheets" />

      {/* Google Sheets */}
      <Card className="p-5">
        <div className="flex items-start gap-3">
          <div className="h-11 w-11 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
            <FileSpreadsheet className="h-6 w-6 text-emerald-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold">Google Sheets</h3>
              {s.sheets_configured
                ? <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Terhubung</Badge>
                : <Badge variant="secondary">Belum dikonfigurasi</Badge>}
            </div>
            {s.sheets_configured ? (
              <div className="text-sm text-muted-foreground mt-1 space-y-0.5">
                <p>Spreadsheet: <span className="font-medium text-foreground">{s.spreadsheet || '-'}</span></p>
                <p>Tab: <span className="font-medium text-foreground">{s.target_tab}</span> {s.tab_exists ? '' : '(akan dibuat otomatis)'}</p>
                {s.sheets_error && <p className="text-red-600">Error: {s.sheets_error}</p>}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mt-1">Kredensial service account belum diset.</p>
            )}
            <p className="text-xs text-muted-foreground mt-2">Setiap peserta yang didaftarkan otomatis ditambahkan ke Google Sheet. Gunakan tombol di bawah untuk menyinkron ulang seluruh data.</p>
            <div className="mt-3">
              <Button size="sm" onClick={syncSheet} disabled={syncing || !s.sheets_configured}>
                {syncing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
                Sinkronkan Semua Sekarang
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Google Drive */}
      <Card className="p-5">
        <div className="flex items-start gap-3">
          <div className="h-11 w-11 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
            <Cloud className="h-6 w-6 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold">Google Drive</h3>
              {s.drive_connected
                ? <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Terhubung</Badge>
                : (s.oauth_configured
                  ? <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Belum dihubungkan</Badge>
                  : <Badge variant="secondary">Belum dikonfigurasi</Badge>)}
            </div>
            {s.drive_connected ? (
              <>
                <div className="text-sm text-muted-foreground mt-1">
                  <p>Folder tujuan: <span className="font-medium text-foreground">{s.drive_folder || '-'}</span></p>
                  {s.drive_error && <p className="text-red-600">Error: {s.drive_error}</p>}
                </div>
                <p className="text-xs text-muted-foreground mt-2">Berkas peserta (Akte, Surat Ket, Pas Photo) tersimpan di Google Drive Anda.</p>
                <div className="mt-3">
                  <Button size="sm" variant="outline" onClick={disconnectDrive}>
                    <Unlink className="h-4 w-4 mr-1" /> Putuskan Koneksi
                  </Button>
                </div>
              </>
            ) : s.oauth_configured ? (
              <>
                <p className="text-sm text-muted-foreground mt-1">Klik tombol di bawah untuk mengizinkan aplikasi menyimpan berkas ke Google Drive Anda (login sekali saja).</p>
                <div className="mt-3">
                  <Button size="sm" onClick={connectDrive}>
                    <Link2 className="h-4 w-4 mr-1" /> Hubungkan Google Drive
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground mt-1">Kredensial OAuth (Client ID &amp; Secret) belum diset. Hubungi admin sistem untuk mengaktifkan penyimpanan Drive. Sementara ini berkas disimpan di server lokal.</p>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}

/* ---------------- DASHBOARD ---------------- */
function Dashboard() {
  const [data, setData] = useState({ lomba: [], users: [], peserta: [], juara: [] })
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    (async () => {
      try {
        const [lomba, users, peserta, juara] = await Promise.all([api('/lomba'), api('/users'), api('/peserta'), api('/juara').catch(() => [])])
        setData({ lomba, users, peserta, juara: juara || [] })
      } catch (e) { toast.error(e.message) } finally { setLoading(false) }
    })()
  }, [])
  const pendingUsers = data.users.filter((u) => u.status === 'pending').length
  const totalL = data.peserta.filter((p) => p.gender === 'L').length
  const totalP = data.peserta.filter((p) => p.gender === 'P').length
  const perLomba = data.lomba.map((l) => {
    const ps = data.peserta.filter((p) => p.lomba_id === l.id)
    return { ...l, total: ps.length, L: ps.filter((p) => p.gender === 'L').length, P: ps.filter((p) => p.gender === 'P').length }
  }).sort((a, b) => b.total - a.total)

  // Klasemen perolehan medali per Asal Madrasah
  // Juara 1 = Emas (5 poin), Juara 2 = Perak (3 poin), Juara 3 = Perunggu (1 poin). Harapan = 0.
  const RANK_MEDAL = { 'Juara 1': { key: 'gold', poin: 5 }, 'Juara 2': { key: 'silver', poin: 3 }, 'Juara 3': { key: 'bronze', poin: 1 } }
  const medalMap = {}
  data.juara.forEach((j) => {
    const m = RANK_MEDAL[j.rank]
    if (!m) return
    const nama = (j.madrasah_name || '').trim() || '(Tanpa Madrasah)'
    if (!medalMap[nama]) medalMap[nama] = { madrasah: nama, gold: 0, silver: 0, bronze: 0, poin: 0 }
    medalMap[nama][m.key] += 1
    medalMap[nama].poin += m.poin
  })
  const klasemen = Object.values(medalMap).sort((a, b) => b.poin - a.poin || b.gold - a.gold || b.silver - a.silver || b.bronze - a.bronze || a.madrasah.localeCompare(b.madrasah))

  return (
    <div>
      <PageHeader title="Dashboard Super Admin" desc="Monitoring keseluruhan Porseni MI Plosoklaten" />
      {loading ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={Trophy} label="Cabang Lomba" value={data.lomba.length} />
            <StatCard icon={Users} label="Total Peserta" value={data.peserta.length} />
            <StatCard icon={GraduationCap} label="Pengguna" value={data.users.length} />
            <StatCard icon={ShieldCheck} label="Menunggu Verifikasi" value={pendingUsers} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 mt-4">
            <StatCard icon={User} label="Peserta Laki-laki" value={totalL} />
            <StatCard icon={UsersRound} label="Peserta Perempuan" value={totalP} />
          </div>

          <Card className="mt-6">
            <div className="p-5 border-b flex items-center gap-2">
              <Medal className="h-5 w-5 text-amber-500" />
              <div>
                <h3 className="font-semibold">Perolehan Juara per Asal Madrasah</h3>
                <p className="text-sm text-muted-foreground">🥇 Emas (Juara 1) = 5 poin · 🥈 Perak (Juara 2) = 3 poin · 🥉 Perunggu (Juara 3) = 1 poin</p>
              </div>
            </div>
            {klasemen.length === 0 ? <Empty text="Belum ada perolehan juara. Klasemen tampil setelah Panitia menetapkan juara." /> : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-14 text-center">Peringkat</TableHead>
                    <TableHead>Asal Madrasah</TableHead>
                    <TableHead className="text-center">🥇 Emas</TableHead>
                    <TableHead className="text-center">🥈 Perak</TableHead>
                    <TableHead className="text-center">🥉 Perunggu</TableHead>
                    <TableHead className="text-center">Total Poin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {klasemen.map((k, i) => (
                    <TableRow key={k.madrasah} className={i === 0 ? 'bg-amber-50' : ''}>
                      <TableCell className="text-center font-semibold">{i + 1}</TableCell>
                      <TableCell className="font-medium">{k.madrasah}</TableCell>
                      <TableCell className="text-center">{k.gold}</TableCell>
                      <TableCell className="text-center">{k.silver}</TableCell>
                      <TableCell className="text-center">{k.bronze}</TableCell>
                      <TableCell className="text-center font-bold text-primary">{k.poin}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>

          <Card className="mt-6">
            <div className="p-5 border-b">
              <h3 className="font-semibold">Rekap Pendaftar per Cabang Lomba</h3>
              <p className="text-sm text-muted-foreground">Jumlah peserta terdaftar untuk setiap cabang lomba</p>
            </div>
            {perLomba.length === 0 ? <Empty text="Belum ada cabang lomba." /> : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cabang Lomba</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Jenis</TableHead>
                    <TableHead className="text-center">Laki-laki</TableHead>
                    <TableHead className="text-center">Perempuan</TableHead>
                    <TableHead className="text-center">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {perLomba.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium">{l.name}</TableCell>
                      <TableCell><Badge variant={l.category === 'Seni' ? 'secondary' : 'default'}>{l.category}</Badge></TableCell>
                      <TableCell><Badge variant="outline">{l.type === 'kelompok' ? 'Kelompok' : 'Individu'}</Badge></TableCell>
                      <TableCell className="text-center">{l.L}</TableCell>
                      <TableCell className="text-center">{l.P}</TableCell>
                      <TableCell className="text-center font-semibold">{l.total}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </>
      )}
    </div>
  )
}

/* ---------------- MANAJEMEN LOMBA ---------------- */
function IdCardImageUpload({ value, onChange }) {
  const [busy, setBusy] = useState(false)
  const ref = useRef(null)
  const handle = async (e) => {
    const file = e.target.files?.[0]
    if (ref.current) ref.current.value = ''
    if (!file) return
    if (file.size > 10 * 1024 * 1024) return toast.error('Ukuran maksimal 10MB')
    setBusy(true)
    try { const up = await uploadFile(file); onChange(fileUrl(up.id)); toast.success('Gambar ID Card terunggah') }
    catch (err) { toast.error(err.message) } finally { setBusy(false) }
  }
  return (
    <div className="flex items-center gap-2">
      {value ? <img src={value} alt="ID Card" className="h-12 w-20 border rounded object-contain bg-white" /> : <div className="h-12 w-20 border border-dashed rounded flex items-center justify-center text-[10px] text-muted-foreground">Belum ada</div>}
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={handle} />
      <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => ref.current?.click()}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}{value ? 'Ganti' : 'Unggah'}</Button>
      {value && <Button type="button" size="sm" variant="ghost" className="text-destructive" onClick={() => onChange('')}>Hapus</Button>}
    </div>
  )
}

function LombaBulkImport({ onDone }) {
  const [busy, setBusy] = useState(false)
  const ref = useRef(null)
  const doUpload = async (e) => {
    const file = e.target.files?.[0]
    if (ref.current) ref.current.value = ''
    if (!file) return
    setBusy(true)
    try {
      const rows = await parseLombaWorkbook(file)
      if (!rows.length) { toast.error('Tidak ada data lomba pada file.'); return }
      let ok = 0; const errs = []
      for (const r of rows) {
        try { await api('/lomba', { method: 'POST', body: r }); ok++ }
        catch (err) { errs.push(`${r.name}: ${err.message}`) }
      }
      if (ok) toast.success(`${ok} cabang lomba berhasil diimport.`)
      if (errs.length) toast.error(`${errs.length} gagal:\n` + errs.slice(0, 5).join('\n'), { duration: 8000 })
      onDone()
    } catch (err) { toast.error('Gagal membaca file: ' + err.message) } finally { setBusy(false) }
  }
  return (
    <Card className="p-5 mb-4 bg-emerald-50/60 border-emerald-200">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start gap-3">
          <FileSpreadsheet className="h-6 w-6 text-emerald-700 mt-0.5" />
          <div>
            <div className="font-semibold">Upload Massal Cabang Lomba via Excel</div>
            <p className="text-sm text-muted-foreground mt-1 max-w-xl">Unduh template, isi daftar cabang lomba (kolom Jenis diisi Individu/Kelompok), lalu unggah kembali.</p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" onClick={downloadLombaTemplate}><Download className="h-4 w-4 mr-1" />Template</Button>
          <input ref={ref} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={doUpload} />
          <Button disabled={busy} onClick={() => ref.current?.click()}>{busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}Upload Excel</Button>
        </div>
      </div>
    </Card>
  )
}

function ManajemenLomba() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [edit, setEdit] = useState(null)
  const [form, setForm] = useState({ name: '', category: 'Olahraga', type: 'individu', criteria: '' })

  const load = async () => { setLoading(true); try { setList(await api('/lomba')) } catch (e) { toast.error(e.message) } finally { setLoading(false) } }
  useEffect(() => { load() }, [])

  const openNew = () => { setEdit(null); setForm({ name: '', category: 'Olahraga', type: 'individu', team_size: '', idcard_image_url: '', criteria: '' }); setOpen(true) }
  const openEdit = (l) => { setEdit(l); setForm({ name: l.name, category: l.category, type: l.type || 'individu', team_size: l.team_size || '', idcard_image_url: l.idcard_image_url || '', criteria: (l.judging_criteria || []).map((c) => (typeof c === 'string' ? c : c.name)).join(', ') }); setOpen(true) }

  const save = async () => {
    if (!form.name) return toast.error('Nama lomba wajib diisi')
    const body = { name: form.name, category: form.category, type: form.type, team_size: form.type === 'kelompok' ? (Number(form.team_size) || null) : null, idcard_image_url: form.idcard_image_url || null, judging_criteria: form.criteria.split(',').map((s) => s.trim()).filter(Boolean) }
    try {
      if (edit) await api(`/lomba/${edit.id}`, { method: 'PUT', body })
      else await api('/lomba', { method: 'POST', body })
      toast.success('Lomba disimpan'); setOpen(false); load()
    } catch (e) { toast.error(e.message) }
  }
  const del = async (id) => { if (!confirm('Hapus lomba?')) return; try { await api(`/lomba/${id}`, { method: 'DELETE' }); toast.success('Dihapus'); load() } catch (e) { toast.error(e.message) } }

  return (
    <div>
      <PageHeader title="Manajemen Lomba" desc="Kelola cabang lomba Olahraga & Seni">
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" />Tambah Lomba</Button>
      </PageHeader>
      <LombaBulkImport onDone={load} />
      <Card>
        {loading ? <div className="p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div> : list.length === 0 ? <Empty text="Belum ada lomba. Tambahkan cabang lomba pertama." /> : (
          <Table>
            <TableHeader><TableRow><TableHead>Nama Lomba</TableHead><TableHead>Kategori</TableHead><TableHead>Jenis</TableHead><TableHead>Kriteria Penilaian</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader>
            <TableBody>
              {list.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{l.name}</TableCell>
                  <TableCell><Badge variant={l.category === 'Seni' ? 'secondary' : 'default'}>{l.category}</Badge></TableCell>
                  <TableCell><Badge variant="outline">{l.type === 'kelompok' ? 'Kelompok' : 'Individu'}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{(l.judging_criteria || []).map((c) => (typeof c === 'string' ? c : c.name)).join(', ') || '-'}</TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(l)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => del(l.id)}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{edit ? 'Edit Lomba' : 'Tambah Lomba'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>Nama Lomba</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Kaligrafi / Futsal / ..." /></div>
            <div className="space-y-1.5">
              <Label>Kategori</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Jenis Lomba</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{LOMBA_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Kelompok: juara ditetapkan per Madrasah, sertifikat dapat dicetak untuk seluruh anggota regu.</p>
            </div>
            {form.type === 'kelompok' && (
              <div className="space-y-1.5">
                <Label>Jumlah Anggota per Tim</Label>
                <Input type="number" min={1} value={form.team_size} onChange={(e) => setForm({ ...form, team_size: e.target.value })} placeholder="Contoh: Voli = 6, Futsal = 10" />
                <p className="text-xs text-muted-foreground">Digunakan untuk formulir pendaftaran satu tim oleh Admin Madrasah.</p>
              </div>
            )}
            <div className="space-y-1.5"><Label>Kriteria Penilaian (pisahkan dengan koma)</Label><Textarea value={form.criteria} onChange={(e) => setForm({ ...form, criteria: e.target.value })} placeholder="Kerapian, Keindahan, Ketepatan" /></div>
            <div className="space-y-1.5">
              <Label>Gambar ID Card (khusus lomba ini, opsional)</Label>
              <IdCardImageUpload value={form.idcard_image_url} onChange={(v) => setForm({ ...form, idcard_image_url: v })} />
              <p className="text-xs text-muted-foreground">Jika diisi, ID Card peserta lomba ini memakai gambar ini. Jika kosong, memakai template ID Card umum.</p>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Batal</Button><Button onClick={save}>Simpan</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ---------------- MANAJEMEN PENGGUNA ---------------- */
function UserBulkImport({ lomba, onDone }) {
  const [busy, setBusy] = useState(false)
  const ref = useRef(null)
  const doUpload = async (e) => {
    const file = e.target.files?.[0]
    if (ref.current) ref.current.value = ''
    if (!file) return
    setBusy(true)
    try {
      const rows = await parseUserWorkbook(file)
      if (!rows.length) { toast.error('Tidak ada data pengguna pada file.'); return }
      const byName = {}
      lomba.forEach((l) => { byName[l.name.trim().toLowerCase()] = l.id })
      let ok = 0; const errs = []
      for (const r of rows) {
        const body = {
          name: r.name, email: r.email, password: r.password || '12345678', role: r.role,
          madrasah_name: r.role === 'admin_madrasah' ? r.madrasah_name : null,
          assigned_lomba_id: r.role === 'panitia' ? (byName[(r.lomba_name || '').trim().toLowerCase()] || null) : null,
        }
        if (r.role === 'panitia' && !body.assigned_lomba_id) { errs.push(`${r.name}: cabang lomba "${r.lomba_name}" tidak ditemukan`); continue }
        try { await api('/users', { method: 'POST', body }); ok++ }
        catch (err) { errs.push(`${r.name} (${r.email}): ${err.message}`) }
      }
      if (ok) toast.success(`${ok} pengguna berhasil dibuat (terverifikasi, sandi default 12345678 bila kosong).`, { duration: 8000 })
      if (errs.length) toast.error(`${errs.length} gagal:\n` + errs.slice(0, 5).join('\n'), { duration: 9000 })
      onDone()
    } catch (err) { toast.error('Gagal membaca file: ' + err.message) } finally { setBusy(false) }
  }
  return (
    <Card className="p-5 mb-4 bg-emerald-50/60 border-emerald-200">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start gap-3">
          <FileSpreadsheet className="h-6 w-6 text-emerald-700 mt-0.5" />
          <div>
            <div className="font-semibold">Upload Massal Pengguna via Excel</div>
            <p className="text-sm text-muted-foreground mt-1 max-w-xl">Unduh template, isi daftar pengguna (Peran: admin_madrasah / panitia). Akun langsung terverifikasi; sandi kosong otomatis <b>12345678</b>.</p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" onClick={() => downloadUserTemplate(lomba)}><Download className="h-4 w-4 mr-1" />Template</Button>
          <input ref={ref} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={doUpload} />
          <Button disabled={busy} onClick={() => ref.current?.click()}>{busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}Upload Excel</Button>
        </div>
      </div>
    </Card>
  )
}

function ManajemenPengguna() {
  const [users, setUsers] = useState([])
  const [lomba, setLomba] = useState([])
  const [loading, setLoading] = useState(true)
  const [show, setShow] = useState({})
  const [resetDlg, setResetDlg] = useState({ open: false, user: null })
  const [editDlg, setEditDlg] = useState({ open: false, user: null })
  const load = async () => { setLoading(true); try { const [u, l] = await Promise.all([api('/users'), api('/lomba')]); setUsers(u); setLomba(l) } catch (e) { toast.error(e.message) } finally { setLoading(false) } }
  useEffect(() => { load() }, [])
  const lombaName = (id) => lomba.find((l) => l.id === id)?.name || '-'
  const verify = async (id, status) => { try { await api(`/users/${id}`, { method: 'PUT', body: { status } }); toast.success('Status diperbarui'); load() } catch (e) { toast.error(e.message) } }
  const del = async (id) => { if (!confirm('Hapus pengguna?')) return; try { await api(`/users/${id}`, { method: 'DELETE' }); toast.success('Dihapus'); load() } catch (e) { toast.error(e.message) } }
  const copy = (txt) => { navigator.clipboard?.writeText(txt); toast.success('Sandi disalin') }
  const exportExcel = () => {
    if (!users.length) { toast.error('Belum ada pengguna untuk diexport.'); return }
    exportUsersToExcel(users, lomba)
    toast.success('File Excel daftar pengguna diunduh.')
  }
  const resetCount = users.filter((u) => u.reset_requested).length

  return (
    <div>
      <PageHeader title="Manajemen Pengguna" desc="Verifikasi akun, lihat & atur ulang kata sandi">
        <Button variant="outline" onClick={exportExcel}><FileSpreadsheet className="h-4 w-4 mr-2" />Cetak Excel</Button>
      </PageHeader>

      <KopSuratCard />

      <UserBulkImport lomba={lomba} onDone={load} />

      {resetCount > 0 && (
        <Card className="p-4 mb-4 bg-amber-50 border-amber-300 flex items-center gap-2">
          <BellRing className="h-5 w-5 text-amber-600" />
          <span className="text-sm text-amber-800">{resetCount} pengguna meminta reset kata sandi. Gunakan tombol <b>Reset Sandi</b> pada baris bertanda.</span>
        </Card>
      )}

      <Card>
        {loading ? <div className="p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div> : (
          <Table>
            <TableHeader><TableRow><TableHead>Nama</TableHead><TableHead>User</TableHead><TableHead>Peran</TableHead><TableHead>Keterangan</TableHead><TableHead>Kata Sandi</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id} className={u.reset_requested ? 'bg-amber-50/60' : ''}>
                  <TableCell className="font-medium">
                    {u.name}
                    {u.reset_requested && <Badge className="ml-2 bg-amber-500 text-white text-[10px]">Minta Reset</Badge>}
                  </TableCell>
                  <TableCell className="text-sm">{u.email}</TableCell>
                  <TableCell><Badge variant="outline">{ROLE_LABEL[u.role]}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{u.role === 'admin_madrasah' ? u.madrasah_name : u.role === 'panitia' ? lombaName(u.assigned_lomba_id) : '-'}</TableCell>
                  <TableCell>
                    {u.password_plain ? (
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-sm">{show[u.id] ? u.password_plain : '••••••••'}</span>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setShow((s) => ({ ...s, [u.id]: !s[u.id] }))}>
                          {show[u.id] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </Button>
                        {show[u.id] && <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => copy(u.password_plain)}><Copy className="h-3.5 w-3.5" /></Button>}
                      </div>
                    ) : <span className="text-xs text-muted-foreground italic">tidak tersedia (reset untuk atur)</span>}
                  </TableCell>
                  <TableCell><StatusBadge status={u.status} /></TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {u.role !== 'super_admin' && <Button size="sm" variant="outline" className="mr-1" onClick={() => setEditDlg({ open: true, user: u })}><Pencil className="h-4 w-4 mr-1" />Edit</Button>}
                    <Button size="sm" variant={u.reset_requested ? 'default' : 'outline'} className="mr-1" onClick={() => setResetDlg({ open: true, user: u })}><KeyRound className="h-4 w-4 mr-1" />Reset Sandi</Button>
                    {u.status !== 'verified'
                      ? <Button size="sm" onClick={() => verify(u.id, 'verified')}><CheckCircle className="h-4 w-4 mr-1" />Verifikasi</Button>
                      : u.role !== 'super_admin' && <Button size="sm" variant="outline" onClick={() => verify(u.id, 'pending')}>Nonaktifkan</Button>}
                    {u.role !== 'super_admin' && <Button size="icon" variant="ghost" className="text-destructive ml-1" onClick={() => del(u.id)}><Trash2 className="h-4 w-4" /></Button>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <ResetPasswordDialog state={resetDlg} onClose={() => setResetDlg({ open: false, user: null })} onSaved={load} />
      <EditUserDialog state={editDlg} lomba={lomba} onClose={() => setEditDlg({ open: false, user: null })} onSaved={load} />
    </div>
  )
}

function EditUserDialog({ state, lomba, onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', email: '', role: 'panitia', madrasah_name: '', assigned_lomba_id: '' })
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    if (state.open && state.user) {
      const u = state.user
      setForm({
        name: u.name || '',
        email: u.email || '',
        role: u.role || 'panitia',
        madrasah_name: u.madrasah_name || '',
        assigned_lomba_id: u.assigned_lomba_id || '',
      })
    }
  }, [state.open, state.user])

  const save = async () => {
    if (!form.name.trim()) return toast.error('Nama wajib diisi')
    if (!form.email.trim()) return toast.error('User/email wajib diisi')
    if (form.role === 'panitia' && !form.assigned_lomba_id) return toast.error('Pilih divisi/cabang lomba untuk Panitia')
    if (form.role === 'admin_madrasah' && !form.madrasah_name.trim()) return toast.error('Nama madrasah wajib diisi')
    setSaving(true)
    try {
      const body = {
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role,
        madrasah_name: form.role === 'admin_madrasah' ? form.madrasah_name.trim() : null,
        assigned_lomba_id: form.role === 'panitia' ? form.assigned_lomba_id : null,
      }
      await api(`/users/${state.user.id}`, { method: 'PUT', body })
      toast.success('Data pengguna diperbarui')
      onClose(); onSaved()
    } catch (e) { toast.error(e.message) } finally { setSaving(false) }
  }

  if (!state.user) return null
  return (
    <Dialog open={state.open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Edit Pengguna — {state.user.name}</DialogTitle></DialogHeader>
        <div className="space-y-3 mt-1">
          <div className="space-y-1.5">
            <Label>Nama</Label>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Nama lengkap" />
          </div>
          <div className="space-y-1.5">
            <Label>User (Email)</Label>
            <Input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="email / username" />
          </div>
          <div className="space-y-1.5">
            <Label>Peran</Label>
            <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.filter((r) => r.value !== 'super_admin').map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {form.role === 'admin_madrasah' && (
            <div className="space-y-1.5">
              <Label>Nama Madrasah</Label>
              <Input value={form.madrasah_name} onChange={(e) => setForm((f) => ({ ...f, madrasah_name: e.target.value }))} placeholder="cth: MI Al-Hidayah" />
            </div>
          )}
          {form.role === 'panitia' && (
            <div className="space-y-1.5">
              <Label>Divisi / Cabang Lomba</Label>
              <Select value={form.assigned_lomba_id} onValueChange={(v) => setForm((f) => ({ ...f, assigned_lomba_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Pilih cabang lomba" /></SelectTrigger>
                <SelectContent>
                  {(lomba || []).map((l) => <SelectItem key={l.id} value={l.id}>{l.name} ({l.category})</SelectItem>)}
                  {(lomba || []).length === 0 && <div className="px-3 py-2 text-sm text-muted-foreground">Belum ada cabang lomba</div>}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Simpan Perubahan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ResetPasswordDialog({ state, onClose, onSaved }) {
  const [pw, setPw] = useState('')
  const [saving, setSaving] = useState(false)
  useEffect(() => { if (state.open) setPw('') }, [state.open])
  const save = async () => {
    if (!pw || pw.length < 4) return toast.error('Sandi minimal 4 karakter')
    setSaving(true)
    try {
      await api(`/users/${state.user.id}`, { method: 'PUT', body: { password: pw } })
      toast.success('Kata sandi berhasil diatur ulang')
      onClose(); onSaved()
    } catch (e) { toast.error(e.message) } finally { setSaving(false) }
  }
  if (!state.user) return null
  return (
    <Dialog open={state.open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Reset Kata Sandi — {state.user.name}</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground -mt-2">Tetapkan sandi baru untuk <b>{state.user.email}</b>. Sandi ini akan tampil di tabel dan dapat diberitahukan ke pengguna.</p>
        <div className="space-y-1.5 mt-2">
          <Label>Sandi Baru</Label>
          <Input value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Masukkan sandi baru" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Simpan Sandi</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function KopSuratCard() {
  const [url, setUrl] = useState(null)
  const [busy, setBusy] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    api('/templates?type=kopsurat').then((list) => { if (list && list[0]) setUrl(list[0].image_url) }).catch(() => {})
  }, [])
  const handle = async (e) => {
    const file = e.target.files?.[0]
    if (ref.current) ref.current.value = ''
    if (!file) return
    if (file.size > 10 * 1024 * 1024) return toast.error('Ukuran maksimal 10MB')
    setBusy(true)
    try {
      const up = await uploadFile(file)
      const imgUrl = fileUrl(up.id)
      await api('/templates', { method: 'POST', body: { type: 'kopsurat', image_url: imgUrl, fields: [] } })
      setUrl(imgUrl)
      toast.success('Kop surat tersimpan. Akan tampil di cetak Absensi & Rekap Nilai.')
    } catch (err) { toast.error(err.message) } finally { setBusy(false) }
  }
  const remove = async () => {
    setBusy(true)
    try { await api('/templates', { method: 'POST', body: { type: 'kopsurat', image_url: '', fields: [] } }); setUrl(null); toast.success('Kop surat dihapus') }
    catch (err) { toast.error(err.message) } finally { setBusy(false) }
  }
  return (
    <Card className="p-5 mb-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start gap-3">
          <FileText className="h-5 w-5 text-primary mt-0.5" />
          <div>
            <div className="font-semibold">Kop Surat (Kepala Surat)</div>
            <p className="text-sm text-muted-foreground max-w-xl">Unggah gambar kop surat (disarankan format lebar/landscape, PNG/JPG). Kop ini otomatis tampil di bagian atas cetak <b>Absensi</b> dan <b>Rekap/Lembar Penilaian</b> Panitia serta cetak Data Pendaftar.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {url ? <img src={url} alt="Kop Surat" className="h-14 border rounded bg-white object-contain" /> : <div className="h-14 w-40 border border-dashed rounded flex items-center justify-center text-xs text-muted-foreground">Belum ada</div>}
          <input ref={ref} type="file" accept="image/*" className="hidden" onChange={handle} />
          <div className="flex flex-col gap-1">
            <Button size="sm" disabled={busy} onClick={() => ref.current?.click()}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}{url ? 'Ganti' : 'Unggah'}</Button>
            {url && <Button size="sm" variant="ghost" className="text-destructive" disabled={busy} onClick={remove}>Hapus</Button>}
          </div>
        </div>
      </div>
    </Card>
  )
}

/* ---------------- DATA PENDAFTAR (cetak keseluruhan) ---------------- */
function EditBiodataDialogSA({ peserta, lomba, open, onOpenChange, onSaved }) {
  const [form, setForm] = useState({ participant_name: '', gender: '', nisn: '', ttl: '', madrasah_name: '', lomba_id: '', nomor_peserta: '' })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  useEffect(() => {
    if (open && peserta) setForm({
      participant_name: peserta.participant_name || '',
      gender: peserta.gender || '',
      nisn: peserta.nisn || '',
      ttl: peserta.ttl || '',
      madrasah_name: peserta.madrasah_name || '',
      lomba_id: peserta.lomba_id || '',
      nomor_peserta: peserta.nomor_peserta || '',
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
        madrasah_name: form.madrasah_name,
        lomba_id: form.lomba_id,
        nomor_peserta: form.nomor_peserta,
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
        <div className="grid sm:grid-cols-2 gap-3 mt-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Nama Lengkap</Label>
            <Input value={form.participant_name} onChange={(e) => set('participant_name', e.target.value)} placeholder="Nama peserta" />
          </div>
          <div className="space-y-1.5">
            <Label>Jenis Kelamin</Label>
            <Select value={form.gender} onValueChange={(v) => set('gender', v)}>
              <SelectTrigger><SelectValue placeholder="Pilih jenis kelamin" /></SelectTrigger>
              <SelectContent>{GENDERS.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>No. Peserta</Label>
            <Input value={form.nomor_peserta} onChange={(e) => set('nomor_peserta', e.target.value)} placeholder="001" />
          </div>
          <div className="space-y-1.5">
            <Label>NISN</Label>
            <Input value={form.nisn} onChange={(e) => set('nisn', e.target.value)} placeholder="NISN" />
          </div>
          <div className="space-y-1.5">
            <Label>Tempat, Tanggal Lahir</Label>
            <Input value={form.ttl} onChange={(e) => set('ttl', e.target.value)} placeholder="Kediri, 01 Januari 2015" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Asal Madrasah</Label>
            <Input value={form.madrasah_name} onChange={(e) => set('madrasah_name', e.target.value)} placeholder="Nama madrasah" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
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

function DataPendaftar() {
  const [peserta, setPeserta] = useState([])
  const [lomba, setLomba] = useState([])
  const [loading, setLoading] = useState(true)
  const [lombaFilter, setLombaFilter] = useState('all')
  const [genderFilter, setGenderFilter] = useState('all')
  const [madrasahFilter, setMadrasahFilter] = useState('all')
  const [kopSurat, setKopSurat] = useState(null)
  const [editDlg, setEditDlg] = useState({ open: false, peserta: null })

  const load = async () => {
    setLoading(true)
    try {
      const [p, l, tpl] = await Promise.all([api('/peserta'), api('/lomba'), api('/templates?type=kopsurat').catch(() => [])])
      setPeserta(p || []); setLomba(l || [])
      setKopSurat(tpl && tpl[0] && tpl[0].image_url ? tpl[0].image_url : null)
    } catch (e) { toast.error(e.message) } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])
  const verify = async (id, status) => {
    try { await api(`/peserta/${id}/status`, { method: 'PUT', body: { status } }); toast.success(status === 'verified' ? 'Peserta diverifikasi' : 'Verifikasi dibatalkan'); load() }
    catch (e) { toast.error(e.message) }
  }
  const del = async (p) => {
    if (!confirm(`Hapus data pendaftar "${p.participant_name}" (${p.lomba_name})? Tindakan ini tidak dapat dibatalkan.`)) return
    try { await api(`/peserta/${p.id}`, { method: 'DELETE' }); toast.success('Data pendaftar dihapus'); load() }
    catch (e) { toast.error(e.message) }
  }

  const rows = peserta
    .filter((p) => lombaFilter === 'all' ? true : p.lomba_id === lombaFilter)
    .filter((p) => genderFilter === 'all' ? true : p.gender === genderFilter)
    .filter((p) => madrasahFilter === 'all' ? true : (p.madrasah_name || '') === madrasahFilter)

  const madrasahOptions = Array.from(new Set(peserta.map((p) => (p.madrasah_name || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b))

  const doPrint = () => setTimeout(() => window.print(), 150)
  const photoCell = (p) => {
    const src = p.files?.pas_photo ? fileUrl(p.files.pas_photo.id) : null
    return src
      ? <img src={src} alt={p.participant_name} className="peserta-photo" crossOrigin="anonymous" />
      : <span className="peserta-photo-empty">Foto</span>
  }

  const Sheet = (
    <div className="sheet">
      <div style={{ borderBottom: '3px double #000', paddingBottom: 12, marginBottom: 20 }}>
        {kopSurat
          ? <img src={kopSurat} alt="Kop Surat" style={{ width: '100%', maxHeight: 130, objectFit: 'contain', marginBottom: 8 }} />
          : (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 700 }}>PEKAN OLAHRAGA DAN SENI (PORSENI)</div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>MADRASAH IBTIDAIYYAH KECAMATAN PLOSOKLATEN</div>
            </div>
          )}
        <div style={{ textAlign: 'center', fontSize: 14, marginTop: 4, fontWeight: 600 }}>DAFTAR SELURUH PESERTA{lombaFilter !== 'all' ? ' — ' + (lomba.find((l) => l.id === lombaFilter)?.name || '') : ''}{madrasahFilter !== 'all' ? ' — ' + madrasahFilter : ''}</div>
      </div>
      <table className="print-table">
        <thead><tr><th>No</th><th>No. Peserta</th><th style={{ width: 60 }}>Foto</th><th>Nama</th><th>L/P</th><th>Tempat, Tgl Lahir</th><th>Asal Madrasah</th><th>Cabang Lomba</th><th>Status</th></tr></thead>
        <tbody>
          {rows.map((p, i) => (
            <tr key={p.id}>
              <td style={{ textAlign: 'center' }}>{i + 1}</td>
              <td style={{ textAlign: 'center' }}>{p.nomor_peserta}</td>
              <td style={{ textAlign: 'center' }}>{photoCell(p)}</td>
              <td>{p.participant_name}</td>
              <td style={{ textAlign: 'center' }}>{p.gender || '-'}</td>
              <td>{p.ttl || '-'}</td>
              <td>{p.madrasah_name}</td>
              <td>{p.lomba_name}</td>
              <td style={{ textAlign: 'center' }}>{p.status === 'verified' ? 'Terverifikasi' : 'Menunggu'}</td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={9} style={{ textAlign: 'center' }}>Belum ada peserta</td></tr>}
        </tbody>
      </table>
      <div style={{ marginTop: 16, fontSize: 13 }}>Total: {rows.length} peserta</div>
    </div>
  )

  return (
    <div>
      <div className="screen-only">
        <PageHeader title="Data Pendaftar" desc="Seluruh peserta lintas madrasah & cabang lomba">
          <Button onClick={doPrint}><Printer className="h-4 w-4 mr-2" />Cetak Semua</Button>
        </PageHeader>
        <Card className="p-4 mb-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Cabang Lomba:</span>
            <Select value={lombaFilter} onValueChange={setLombaFilter}>
              <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Lomba</SelectItem>
                {lomba.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Asal Madrasah:</span>
            <Select value={madrasahFilter} onValueChange={setMadrasahFilter}>
              <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Madrasah</SelectItem>
                {madrasahOptions.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Jenis Kelamin:</span>
            <Select value={genderFilter} onValueChange={setGenderFilter}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                <SelectItem value="L">Laki-laki</SelectItem>
                <SelectItem value="P">Perempuan</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <span className="text-xs text-muted-foreground">{rows.length} peserta</span>
        </Card>
        <Card>
          {loading ? <div className="p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div> : rows.length === 0 ? <Empty text="Belum ada peserta." /> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No. Peserta</TableHead>
                  <TableHead>Foto</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>L/P</TableHead>
                  <TableHead>Tempat, Tgl Lahir</TableHead>
                  <TableHead>Asal Madrasah</TableHead>
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
                    <TableCell>{photoCell(p)}</TableCell>
                    <TableCell className="font-medium">{p.participant_name}</TableCell>
                    <TableCell>{GENDER_LABEL[p.gender] ? p.gender : '-'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.ttl || '-'}</TableCell>
                    <TableCell>{p.madrasah_name}</TableCell>
                    <TableCell>{p.lomba_name}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap max-w-[220px]">
                        {Object.entries(p.files || {}).map(([k, v]) => (
                          <a key={k} href={fileUrl(v.id)} target="_blank" rel="noreferrer" className="text-xs text-primary underline">{k}</a>
                        ))}
                        {(!p.files || Object.keys(p.files).length === 0) && <span className="text-xs text-muted-foreground">-</span>}
                      </div>
                    </TableCell>
                    <TableCell>{p.complete ? <Badge className="bg-emerald-600 text-white">Lengkap</Badge> : <Badge variant="outline" className="text-amber-700 border-amber-300">Belum</Badge>}</TableCell>
                    <TableCell><StatusBadge status={p.status} /></TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button size="sm" variant="outline" className="mr-1" title="Edit biodata" onClick={() => setEditDlg({ open: true, peserta: p })}><Pencil className="h-4 w-4 mr-1" />Edit</Button>
                      {p.status !== 'verified'
                        ? <Button size="sm" disabled={!p.complete} title={!p.complete ? 'Berkas belum lengkap' : ''} onClick={() => verify(p.id, 'verified')}><CheckCircle className="h-4 w-4 mr-1" />Verifikasi</Button>
                        : <Button size="sm" variant="outline" onClick={() => verify(p.id, 'pending')}>Batalkan</Button>}
                      <Button size="icon" variant="ghost" className="text-destructive ml-1" title="Hapus data pendaftar" onClick={() => del(p)}><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
      <div className="print-only">{Sheet}</div>
      <EditBiodataDialogSA peserta={editDlg.peserta} lomba={lomba} open={editDlg.open} onOpenChange={(v) => setEditDlg((d) => ({ ...d, open: v }))} onSaved={load} />
    </div>
  )
}

/* ---------------- CETAK ADMINISTRASI (Super Admin) ---------------- */
function CetakAdmin() {
  const [peserta, setPeserta] = useState([])
  const [lomba, setLomba] = useState([])
  const [kopSurat, setKopSurat] = useState(null)
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState('absensi')
  const [lombaFilter, setLombaFilter] = useState('')
  const [gender, setGender] = useState('all')

  useEffect(() => {
    (async () => {
      try {
        const [p, l, tpl] = await Promise.all([api('/peserta'), api('/lomba'), api('/templates?type=kopsurat').catch(() => [])])
        setPeserta(p || []); setLomba(l || [])
        setKopSurat(tpl && tpl[0] && tpl[0].image_url ? tpl[0].image_url : null)
        if (l && l[0]) setLombaFilter(l[0].id)
      } catch (e) { toast.error(e.message) } finally { setLoading(false) }
    })()
  }, [])

  const selectedLomba = lomba.find((l) => l.id === lombaFilter)
  const crit = (selectedLomba?.judging_criteria || []).map((c) => (typeof c === 'string' ? c : c.name))
  const critList = crit.length ? crit : ['Kriteria 1', 'Kriteria 2']

  const rows = peserta
    .filter((p) => (lombaFilter ? p.lomba_id === lombaFilter : true))
    .filter((p) => p.status === 'verified')
    .filter((p) => (gender === 'all' ? true : p.gender === gender))
    .sort((a, b) => String(a.nomor_peserta).localeCompare(String(b.nomor_peserta)))

  const doPrint = (m) => { setMode(m); setTimeout(() => window.print(), 150) }
  const genderLabel = gender === 'L' ? ' (Putra)' : gender === 'P' ? ' (Putri)' : ''
  const photoCell = (p) => {
    const src = p.files?.pas_photo ? fileUrl(p.files.pas_photo.id) : null
    return src
      ? <img src={src} alt={p.participant_name} className="peserta-photo" crossOrigin="anonymous" />
      : <span className="peserta-photo-empty">Foto</span>
  }

  const Header = (
    <div style={{ borderBottom: '3px double #000', paddingBottom: 12, marginBottom: 20 }}>
      {kopSurat
        ? <img src={kopSurat} alt="Kop Surat" style={{ width: '100%', maxHeight: 130, objectFit: 'contain', marginBottom: 8 }} />
        : (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>PEKAN OLAHRAGA DAN SENI (PORSENI)</div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>MADRASAH IBTIDAIYYAH KECAMATAN PLOSOKLATEN</div>
          </div>
        )}
      <div style={{ textAlign: 'center', fontSize: 14, marginTop: 4, fontWeight: 600 }}>{mode === 'absensi' ? 'DAFTAR HADIR PESERTA' : 'LEMBAR PENILAIAN'} — {selectedLomba?.name || 'Semua Lomba'}{genderLabel}</div>
    </div>
  )
  const signArea = (label) => (
    <div className="print-sign" style={{ marginTop: 56, display: 'flex', justifyContent: 'flex-end' }}>
      <div style={{ textAlign: 'center', fontSize: 13 }}>
        <div>Plosoklaten, .............................</div>
        <div style={{ marginTop: 4 }}>{label}</div>
        <div style={{ marginTop: 64 }}>( ................................. )</div>
      </div>
    </div>
  )

  const Sheet = (
    <div className="sheet">
      {Header}
      {mode === 'absensi' ? (
        <table className="print-table">
          <thead><tr><th>No</th><th>Nomor Peserta</th><th style={{ width: 60 }}>Foto</th><th>Nama</th><th>L/P</th><th>Tempat, Tgl Lahir</th><th>Madrasah</th>{!lombaFilter && <th>Cabang Lomba</th>}<th style={{ width: '18%' }}>Tanda Tangan</th></tr></thead>
          <tbody>
            {rows.map((p, i) => (
              <tr key={p.id}><td style={{ textAlign: 'center' }}>{i + 1}</td><td style={{ textAlign: 'center' }}>{p.nomor_peserta}</td><td style={{ textAlign: 'center' }}>{photoCell(p)}</td><td>{p.participant_name}</td><td style={{ textAlign: 'center' }}>{p.gender || '-'}</td><td>{p.ttl || '-'}</td><td>{p.madrasah_name}</td>{!lombaFilter && <td>{p.lomba_name}</td>}<td style={{ height: 34 }}></td></tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={lombaFilter ? 8 : 9} style={{ textAlign: 'center' }}>Belum ada peserta</td></tr>}
          </tbody>
        </table>
      ) : (
        <table className="print-table">
          <thead><tr><th>No</th><th>Nomor Peserta</th><th>Nama</th><th>L/P</th>{critList.map((c, i) => <th key={i}>{c}</th>)}<th>Total</th></tr></thead>
          <tbody>
            {rows.map((p, i) => (
              <tr key={p.id}><td style={{ textAlign: 'center' }}>{i + 1}</td><td style={{ textAlign: 'center' }}>{p.nomor_peserta}</td><td>{p.participant_name}</td><td style={{ textAlign: 'center' }}>{p.gender || '-'}</td>{critList.map((_, j) => <td key={j} style={{ height: 34 }}></td>)}<td></td></tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={critList.length + 5} style={{ textAlign: 'center' }}>Belum ada peserta</td></tr>}
          </tbody>
        </table>
      )}
      {signArea(mode === 'absensi' ? 'Panitia / Juri' : 'Juri Lomba')}
    </div>
  )

  return (
    <div>
      <div className="screen-only">
        <PageHeader title="Cetak Administrasi" desc="Cetak daftar hadir & lembar penilaian per cabang lomba">
          <Button variant={mode === 'absensi' ? 'default' : 'outline'} onClick={() => setMode('absensi')}><Printer className="h-4 w-4 mr-1" />Absensi</Button>
          <Button variant={mode === 'penilaian' ? 'default' : 'outline'} onClick={() => setMode('penilaian')}><Printer className="h-4 w-4 mr-1" />Penilaian</Button>
        </PageHeader>
        {loading ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : (
          <>
            <Card className="p-4 mb-4 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Cabang Lomba:</span>
                <Select value={lombaFilter || 'all'} onValueChange={(v) => setLombaFilter(v === 'all' ? '' : v)}>
                  <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Lomba</SelectItem>
                    {lomba.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Jenis Kelamin:</span>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua</SelectItem>
                    {GENDERS.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <span className="text-xs text-muted-foreground">{rows.length} peserta</span>
            </Card>
            <div className="flex gap-2 mb-4">
              <Button onClick={() => doPrint('absensi')}><Printer className="h-4 w-4 mr-2" />Cetak Absensi</Button>
              <Button onClick={() => doPrint('penilaian')}><Printer className="h-4 w-4 mr-2" />Cetak Lembar Penilaian</Button>
            </div>
            <Card className="p-2 shadow-inner bg-muted/40">
              <div className="mx-auto max-w-3xl border shadow bg-white">{Sheet}</div>
            </Card>
          </>
        )}
      </div>
      <div className="print-only">{Sheet}</div>
    </div>
  )
}

/* ---------------- SERTIFIKAT ---------------- */
function Sertifikat() {
  const [tab, setTab] = useState('juara')
  return (
    <div>
      <PageHeader title="Manajemen Sertifikat" desc="Unggah template, atur posisi teks & foto, lalu generate sertifikat" />
      <div className="flex gap-2 mb-6">
        <Button variant={tab === 'juara' ? 'default' : 'outline'} onClick={() => setTab('juara')}><Award className="h-4 w-4 mr-1" />Sertifikat Juara</Button>
        <Button variant={tab === 'panitia' ? 'default' : 'outline'} onClick={() => setTab('panitia')}><Award className="h-4 w-4 mr-1" />Sertifikat Panitia</Button>
      </div>
      {tab === 'juara' ? <SertifikatJuara /> : <SertifikatPanitia />}
    </div>
  )
}

function LombaFilterBar({ lomba, value, onChange }) {
  return (
    <Card className="p-4 mb-4 flex flex-wrap items-center gap-3">
      <span className="text-sm text-muted-foreground">Filter Cabang Lomba:</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Semua Lomba</SelectItem>
          {lomba.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
        </SelectContent>
      </Select>
    </Card>
  )
}

function SertifikatJuara() {
  const [raw, setRaw] = useState({ loading: true, juara: [], peserta: [], lomba: [] })
  const [groupMode, setGroupMode] = useState('peserta') // 'peserta' | 'regu'
  const [lombaFilter, setLombaFilter] = useState('all')
  const [includePhoto, setIncludePhoto] = useState(true)

  useEffect(() => {
    (async () => {
      try {
        const [juara, peserta, lomba] = await Promise.all([api('/juara'), api('/peserta'), api('/lomba')])
        setRaw({ loading: false, juara: juara || [], peserta: peserta || [], lomba: lomba || [] })
      } catch (e) { toast.error(e.message); setRaw({ loading: false, juara: [], peserta: [], lomba: [] }) }
    })()
  }, [])

  const lm = Object.fromEntries((raw.lomba || []).map((l) => [l.id, l.name]))
  const pesertaById = Object.fromEntries((raw.peserta || []).map((p) => [p.id, p]))
  const photoOf = (p) => (includePhoto && p && p.files?.pas_photo ? fileUrl(p.files.pas_photo.id) : null)
  const gLabel = (g) => (g === 'L' ? 'Putra' : g === 'P' ? 'Putri' : '')
  const juaraFiltered = (raw.juara || []).filter((j) => (lombaFilter === 'all' ? true : j.lomba_id === lombaFilter))
  const targets = []
  for (const j of juaraFiltered) {
    const lombaName = lm[j.lomba_id] || ''
    const gl = gLabel(j.gender)
    const rankLabel = gl ? `${j.rank} ${gl}` : j.rank
    if (j.is_group) {
      if (groupMode === 'regu') {
        targets.push({
          label: `${rankLabel} - ${j.madrasah_name} (Regu)`,
          filename: `Sertifikat_${j.rank}_${gl}_${(j.madrasah_name || 'regu').replace(/\s+/g, '_')}.png`,
          values: { participant_name: j.madrasah_name, madrasah_name: j.madrasah_name, lomba_name: lombaName, rank: rankLabel, photo: null },
        })
      } else {
        const members = (raw.peserta || []).filter((p) => p.lomba_id === j.lomba_id && p.madrasah_name === j.madrasah_name && (j.gender ? p.gender === j.gender : true))
        if (members.length === 0) {
          targets.push({
            label: `${rankLabel} - ${j.madrasah_name} (tidak ada anggota)`,
            filename: `Sertifikat_${gl}_${(j.madrasah_name || 'regu').replace(/\s+/g, '_')}.png`,
            values: { participant_name: j.madrasah_name, madrasah_name: j.madrasah_name, lomba_name: lombaName, rank: rankLabel, photo: null },
          })
        }
        members.forEach((p) => targets.push({
          label: `${rankLabel} - ${p.participant_name} (${j.madrasah_name})`,
          filename: `Sertifikat_${(p.participant_name || 'peserta').replace(/\s+/g, '_')}.png`,
          values: { participant_name: p.participant_name, madrasah_name: p.madrasah_name, lomba_name: lombaName, rank: rankLabel, photo: photoOf(p) },
        }))
      }
    } else {
      const p = pesertaById[j.peserta_id]
      targets.push({
        label: `${rankLabel} - ${j.participant_name}`,
        filename: `Sertifikat_${(j.participant_name || 'peserta').replace(/\s+/g, '_')}.png`,
        values: { participant_name: j.participant_name, madrasah_name: j.madrasah_name, lomba_name: lombaName, rank: rankLabel, photo: photoOf(p) },
      })
    }
  }

  const hasGroup = juaraFiltered.some((j) => j.is_group)

  return (
    <div>
      <LombaFilterBar lomba={raw.lomba || []} value={lombaFilter} onChange={setLombaFilter} />
      <Card className="p-4 mb-4 flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium">Foto pada sertifikat:</span>
        <Button size="sm" variant={includePhoto ? 'default' : 'outline'} onClick={() => setIncludePhoto(true)}>Sertakan Foto</Button>
        <Button size="sm" variant={!includePhoto ? 'default' : 'outline'} onClick={() => setIncludePhoto(false)}>Tanpa Foto</Button>
        <span className="text-xs text-muted-foreground">Foto peserta diambil dari pas photo (opsional).</span>
      </Card>
      {hasGroup && (
        <Card className="p-4 mb-6 flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium">Mode Sertifikat Kelompok:</span>
          <Button size="sm" variant={groupMode === 'peserta' ? 'default' : 'outline'} onClick={() => setGroupMode('peserta')}>Per Peserta (semua anggota regu)</Button>
          <Button size="sm" variant={groupMode === 'regu' ? 'default' : 'outline'} onClick={() => setGroupMode('regu')}>Per Regu / Madrasah</Button>
        </Card>
      )}
      <TemplateStudio
        type="certificate"
        defaultFields={CERT_DEFAULT_FIELDS}
        targets={targets}
        loadingTargets={raw.loading}
        sample={{ participant_name: 'Ahmad Fauzi', madrasah_name: 'MI Al-Hidayah', lomba_name: 'Kaligrafi', rank: 'Juara 1 Putra' }}
      />
    </div>
  )
}

function SertifikatPanitia() {
  const [state, setState] = useState({ loading: true, users: [], lomba: [] })
  const [lombaFilter, setLombaFilter] = useState('all')
  const [includePhoto, setIncludePhoto] = useState(true)
  useEffect(() => {
    (async () => {
      try {
        const [users, lomba] = await Promise.all([api('/users'), api('/lomba')])
        setState({ loading: false, users: users || [], lomba: lomba || [] })
      } catch (e) { toast.error(e.message); setState({ loading: false, users: [], lomba: [] }) }
    })()
  }, [])
  const lm = Object.fromEntries((state.lomba || []).map((l) => [l.id, l.name]))
  const targets = (state.users || [])
    .filter((u) => u.role === 'panitia')
    .filter((u) => (lombaFilter === 'all' ? true : u.assigned_lomba_id === lombaFilter))
    .map((u) => ({
      label: `${u.name} — ${lm[u.assigned_lomba_id] || '-'}`,
      filename: `Sertifikat_Panitia_${(u.name || 'panitia').replace(/\s+/g, '_')}.png`,
      values: { name: u.name, lomba_name: lm[u.assigned_lomba_id] || '-', photo: includePhoto ? (u.photo_url || null) : null },
    }))
  return (
    <div>
      <LombaFilterBar lomba={state.lomba || []} value={lombaFilter} onChange={setLombaFilter} />
      <Card className="p-4 mb-4 flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium">Foto pada sertifikat:</span>
        <Button size="sm" variant={includePhoto ? 'default' : 'outline'} onClick={() => setIncludePhoto(true)}>Sertakan Foto</Button>
        <Button size="sm" variant={!includePhoto ? 'default' : 'outline'} onClick={() => setIncludePhoto(false)}>Tanpa Foto</Button>
        <span className="text-xs text-muted-foreground">Foto diambil dari foto profil panitia (opsional).</span>
      </Card>
      <TemplateStudio
        type="certificate_panitia"
        defaultFields={CERT_PANITIA_FIELDS}
        targets={targets}
        loadingTargets={state.loading}
        sample={{ name: 'Budi Santoso', lomba_name: 'Futsal' }}
      />
    </div>
  )
}

/* ---------------- ID CARD ---------------- */
function IdCardManager() {
  const [tab, setTab] = useState('peserta')
  return (
    <div>
      <PageHeader title="Manajemen ID Card" desc="Unggah template kartu identitas & cetak untuk Peserta dan Panitia" />
      <div className="flex gap-2 mb-6">
        <Button variant={tab === 'peserta' ? 'default' : 'outline'} onClick={() => setTab('peserta')}><IdCard className="h-4 w-4 mr-1" />ID Card Peserta</Button>
        <Button variant={tab === 'panitia' ? 'default' : 'outline'} onClick={() => setTab('panitia')}><IdCard className="h-4 w-4 mr-1" />ID Card Panitia</Button>
      </div>
      {tab === 'peserta' ? <IdCardPeserta /> : <IdCardPanitia />}
    </div>
  )
}

function IdCardPeserta() {
  const [state, setState] = useState({ loading: true, peserta: [], lomba: [] })
  const [lombaFilter, setLombaFilter] = useState('all')
  useEffect(() => {
    (async () => {
      try {
        const [peserta, lomba] = await Promise.all([api('/peserta'), api('/lomba')])
        setState({ loading: false, peserta: peserta || [], lomba: lomba || [] })
      } catch (e) { toast.error(e.message); setState({ loading: false, peserta: [], lomba: [] }) }
    })()
  }, [])
  const lmImg = Object.fromEntries((state.lomba || []).map((l) => [l.id, l.idcard_image_url || null]))
  const targets = (state.peserta || [])
    .filter((p) => (lombaFilter === 'all' ? true : p.lomba_id === lombaFilter))
    .map((p) => ({
      label: `${p.nomor_peserta} - ${p.participant_name}`,
      filename: `IDCard_${(p.participant_name || 'peserta').replace(/\s+/g, '_')}.png`,
      baseImage: lmImg[p.lomba_id] || null,
      values: { participant_name: p.participant_name, madrasah_name: p.madrasah_name, lomba_name: p.lomba_name, nomor_peserta: 'No. ' + p.nomor_peserta, photo: p.files?.pas_photo ? fileUrl(p.files.pas_photo.id) : null },
    }))
  return (
    <div>
      <LombaFilterBar lomba={state.lomba || []} value={lombaFilter} onChange={setLombaFilter} />
      <Card className="p-4 mb-4 text-sm text-muted-foreground flex items-start gap-2">
        <ImageIcon className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
        Lomba yang memiliki <b>Gambar ID Card</b> sendiri (diatur di Manajemen Lomba) akan otomatis memakai gambar tersebut. Lomba tanpa gambar khusus memakai template umum di bawah ini.
      </Card>
      <TemplateStudio type="idcard_peserta" defaultFields={IDCARD_PESERTA_FIELDS} targets={targets} loadingTargets={state.loading}
        sample={{ participant_name: 'Ahmad Fauzi', madrasah_name: 'MI Al-Hidayah', lomba_name: 'Kaligrafi', nomor_peserta: 'No. 001' }} />
    </div>
  )
}

function IdCardPanitia() {
  const [state, setState] = useState({ loading: true, users: [], lomba: [] })
  const [lombaFilter, setLombaFilter] = useState('all')
  useEffect(() => {
    (async () => {
      try {
        const [users, lomba] = await Promise.all([api('/users'), api('/lomba')])
        setState({ loading: false, users: users || [], lomba: lomba || [] })
      } catch (e) { toast.error(e.message); setState({ loading: false, users: [], lomba: [] }) }
    })()
  }, [])
  const lm = Object.fromEntries((state.lomba || []).map((l) => [l.id, l.name]))
  const targets = (state.users || [])
    .filter((u) => u.role === 'panitia')
    .filter((u) => (lombaFilter === 'all' ? true : u.assigned_lomba_id === lombaFilter))
    .map((u) => ({
      label: `${u.name} — ${lm[u.assigned_lomba_id] || '-'}`,
      filename: `IDCard_Panitia_${(u.name || 'panitia').replace(/\s+/g, '_')}.png`,
      values: { name: u.name, role_label: 'Panitia / Juri', lomba_name: lm[u.assigned_lomba_id] || '-', photo: u.photo_url || null },
    }))
  return (
    <div>
      <LombaFilterBar lomba={state.lomba || []} value={lombaFilter} onChange={setLombaFilter} />
      <TemplateStudio type="idcard_panitia" defaultFields={IDCARD_PANITIA_FIELDS} targets={targets} loadingTargets={state.loading}
        sample={{ name: 'Budi Santoso', role_label: 'Panitia / Juri', lomba_name: 'Futsal' }} />
    </div>
  )
}


/* ---------------- BACKUP & RESTORE ---------------- */
function BackupRestore() {
  const [busy, setBusy] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const ref = useRef(null)

  const doBackup = async () => {
    setBusy(true)
    try {
      const data = await api('/admin/backup')
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
      a.download = `backup_sim_porseni_${stamp}.json`
      document.body.appendChild(a); a.click(); a.remove()
      URL.revokeObjectURL(url)
      const counts = Object.entries(data.collections || {}).map(([k, v]) => `${k}: ${v.length}`).join(', ')
      toast.success('Backup berhasil diunduh. ' + counts, { duration: 8000 })
    } catch (e) { toast.error(e.message) } finally { setBusy(false) }
  }

  const doRestore = async (e) => {
    const file = e.target.files?.[0]
    if (ref.current) ref.current.value = ''
    if (!file) return
    if (!confirm('PERINGATAN: Restore akan MENGGANTI seluruh data saat ini dengan isi file backup. Lanjutkan?')) return
    setRestoring(true)
    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      if (!parsed || !parsed.collections) throw new Error('File backup tidak valid (tidak ada "collections").')
      const res = await api('/admin/restore', { method: 'POST', body: { collections: parsed.collections } })
      const counts = Object.entries(res.restored || {}).map(([k, v]) => `${k}: ${v}`).join(', ')
      toast.success('Restore berhasil. ' + counts, { duration: 8000 })
    } catch (err) { toast.error('Gagal restore: ' + err.message) } finally { setRestoring(false) }
  }

  return (
    <div>
      <PageHeader title="Backup & Restore" desc="Cadangkan & pulihkan seluruh data aplikasi (pengguna, lomba, peserta, hasil, juara, sertifikat, dll)" />
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-2"><Download className="h-5 w-5 text-primary" /><h3 className="font-semibold">Backup Data</h3></div>
          <p className="text-sm text-muted-foreground mb-4">Unduh salinan seluruh data dalam satu file JSON. Simpan file ini di tempat aman sebelum melakukan pembaruan/penambahan fitur agar data tidak hilang.</p>
          <Button onClick={doBackup} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}Unduh Backup (JSON)</Button>
        </Card>
        <Card className="p-6 border-amber-200 bg-amber-50/40">
          <div className="flex items-center gap-2 mb-2"><Upload className="h-5 w-5 text-amber-600" /><h3 className="font-semibold">Restore Data</h3></div>
          <p className="text-sm text-muted-foreground mb-4">Pulihkan data dari file backup JSON. <b className="text-amber-700">Perhatian:</b> proses ini akan menimpa seluruh data yang ada saat ini. Sesi Super Admin Anda tetap aktif.</p>
          <input ref={ref} type="file" accept="application/json,.json" className="hidden" onChange={doRestore} />
          <Button variant="outline" onClick={() => ref.current?.click()} disabled={restoring}>{restoring ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}Pilih File Backup & Restore</Button>
        </Card>
      </div>
    </div>
  )
}
