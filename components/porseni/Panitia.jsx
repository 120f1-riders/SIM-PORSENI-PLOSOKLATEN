'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Users, CheckCircle2, Clock, Loader2, Printer, Upload, Award, FileText, Trash2, ChevronDown, ChevronRight, School } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { StatCard, StatusBadge, PageHeader, Empty, SortSelect } from '@/components/porseni/shared'
import TemplateStudio from '@/components/porseni/TemplateStudio'
import { RANKS, GENDERS, IDCARD_PESERTA_FIELDS, sortPeserta as sortPesertaBy } from '@/lib/porseni/constants'
import { api, uploadFile, fileUrl } from '@/lib/porseni/api'

export default function Panitia({ view, user }) {
  const [lomba, setLomba] = useState(null)
  const [peserta, setPeserta] = useState([])
  const [juara, setJuara] = useState([])
  const [hasil, setHasil] = useState([])
  const [kopSurat, setKopSurat] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const [ls, p, j, h, tpl] = await Promise.all([api('/lomba'), api('/peserta'), api('/juara'), api('/hasil'), api('/templates?type=kopsurat').catch(() => [])])
      setLomba(ls.find((l) => l.id === user.assigned_lomba_id) || null)
      setPeserta(p); setJuara(j); setHasil(h)
      setKopSurat(tpl && tpl[0] && tpl[0].image_url ? tpl[0].image_url : null)
    } catch (e) { toast.error(e.message) } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const criteria = useMemo(() => (lomba?.judging_criteria || []).map((c) => (typeof c === 'string' ? c : c.name)), [lomba])

  if (view === 'dashboard') return <Dashboard lomba={lomba} peserta={peserta} loading={loading} />
  if (view === 'cetak') return <Cetak lomba={lomba} peserta={peserta} criteria={criteria} kopSurat={kopSurat} />
  if (view === 'idcard') return <IdCardCetak lomba={lomba} peserta={peserta} loading={loading} />
  if (view === 'hasil') return <Hasil lomba={lomba} peserta={peserta} juara={juara} hasil={hasil} onChange={load} />
  return <DaftarPeserta lomba={lomba} peserta={peserta} loading={loading} onChange={load} />
}

function Dashboard({ lomba, peserta, loading }) {
  const verified = peserta.filter((p) => p.status === 'verified').length
  return (
    <div>
      <PageHeader title="Dashboard Panitia" desc={lomba ? `Cabang Lomba: ${lomba.name} (${lomba.category})` : 'Belum ada lomba yang ditugaskan'} />
      {loading ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard icon={Users} label="Total Peserta" value={peserta.length} />
          <StatCard icon={CheckCircle2} label="Terverifikasi" value={verified} />
          <StatCard icon={Clock} label="Menunggu" value={peserta.length - verified} />
        </div>
      )}
    </div>
  )
}

function NomorCell({ p, onSave }) {
  const [val, setVal] = useState(p.nomor_peserta || '')
  useEffect(() => { setVal(p.nomor_peserta || '') }, [p.nomor_peserta])
  const commit = () => { const v = String(val).trim(); if (v && v !== p.nomor_peserta) onSave(p.id, v) }
  return (
    <input
      className="w-16 border rounded px-2 py-1 text-sm font-mono focus:ring-2 focus:ring-primary focus:outline-none"
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
      onBlur={commit}
      title="Klik untuk mengubah nomor urut, tekan Enter untuk simpan"
    />
  )
}

function TeamNomorCell({ members, onSave }) {
  const nums = (members || []).map((m) => Number(m.nomor_peserta) || 9999)
  const min = nums.length ? Math.min(...nums) : 9999
  const initial = min === 9999 ? '' : String(min)
  const [val, setVal] = useState(initial)
  useEffect(() => { setVal(initial) }, [initial])
  const commit = () => { const v = String(val).trim(); if (v && v !== initial) onSave(members, v) }
  return (
    <input
      className="w-16 border rounded px-2 py-1 text-sm font-mono focus:ring-2 focus:ring-primary focus:outline-none"
      value={val}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => setVal(e.target.value)}
      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
      onBlur={commit}
      title="Nomor urut tampil untuk tim/madrasah ini (berlaku ke semua anggota)"
    />
  )
}

function DaftarPeserta({ lomba, peserta, loading, onChange }) {
  const [expanded, setExpanded] = useState({})
  const [gender, setGender] = useState('all')
  const [sortBy, setSortBy] = useState('nomor')
  const setNomor = async (id, nomor_peserta) => {
    try { await api(`/peserta/${id}`, { method: 'PUT', body: { nomor_peserta } }); toast.success('Nomor urut tampil diperbarui'); onChange() }
    catch (e) { toast.error(e.message) }
  }
  const sortPeserta = (arr) => [...(arr || [])].sort((a, b) => (Number(a.nomor_peserta) || 0) - (Number(b.nomor_peserta) || 0) || String(a.nomor_peserta).localeCompare(String(b.nomor_peserta)))
  const filteredPeserta = (peserta || []).filter((p) => gender === 'all' ? true : (p.gender || '') === gender)
  const sorted = sortPesertaBy(filteredPeserta, sortBy)
  const isGroup = lomba?.type === 'kelompok'

  const GenderFilter = (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-sm text-muted-foreground">Jenis Kelamin:</span>
      <Select value={gender} onValueChange={setGender}>
        <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Semua</SelectItem>
          <SelectItem value="L">Laki-laki (L)</SelectItem>
          <SelectItem value="P">Perempuan (P)</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )

  const toggle = (k) => setExpanded((s) => ({ ...s, [k]: !s[k] }))
  const setTeamNomor = async (members, nomor_peserta) => {
    try {
      await Promise.all((members || []).map((m) => api(`/peserta/${m.id}`, { method: 'PUT', body: { nomor_peserta } })))
      toast.success('Nomor urut tim diperbarui'); onChange()
    } catch (e) { toast.error(e.message) }
  }
  const teamNo = (members) => { const n = (members || []).map((m) => Number(m.nomor_peserta) || 9999); return n.length ? Math.min(...n) : 9999 }
  const buildMadGroups = (members) => {
    const map = {}
    ;(members || []).forEach((p) => {
      const k = (p.madrasah_name || '').trim() || '(Tanpa Madrasah)'
      if (!map[k]) map[k] = []
      map[k].push(p)
    })
    return Object.keys(map)
      .map((k) => ({ madrasah: k, members: sortPeserta(map[k]) }))
      .sort((a, b) => teamNo(a.members) - teamNo(b.members) || a.madrasah.localeCompare(b.madrasah))
  }
  const renderMadrasahCard = (g, keyId) => {
    const open = !!expanded[keyId]
    const verifiedCount = g.members.filter((m) => m.status === 'verified').length
    return (
      <Card key={keyId} className="overflow-hidden">
        <div className="w-full flex items-center gap-3 p-4">
          <button type="button" onClick={() => toggle(keyId)} className="flex items-center gap-3 flex-1 text-left hover:opacity-80">
            {open ? <ChevronDown className="h-5 w-5 text-primary shrink-0" /> : <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />}
            <School className="h-5 w-5 text-primary shrink-0" />
            <span className="font-semibold">{g.madrasah}</span>
          </button>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-muted-foreground">No. Urut:</span>
            <TeamNomorCell members={g.members} onSave={setTeamNomor} />
          </div>
          <span className="text-sm text-muted-foreground shrink-0">{g.members.length} peserta</span>
          <span className="text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">{verifiedCount} terverifikasi</span>
        </div>
        {open && (
          <div className="border-t">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>L/P</TableHead>
                  <TableHead>Tempat, Tgl Lahir</TableHead>
                  <TableHead>Berkas</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {g.members.map((p, i) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-medium">{p.participant_name}</TableCell>
                    <TableCell>{p.gender || '-'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.ttl || '-'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {Object.entries(p.files || {}).map(([k, v]) => (
                          <a key={k} href={fileUrl(v.id)} target="_blank" rel="noreferrer" className="text-xs text-primary underline">{k}</a>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell><StatusBadge status={p.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    )
  }

  // Kelompok (Voli/Futsal): tampilkan Asal Madrasah + nomor urut per tim
  if (isGroup) {
    const genderSet = Array.from(new Set((peserta || []).map((p) => (p.gender || '').trim()).filter(Boolean)))
    const isVoli = genderSet.length > 1
    if (isVoli) {
      const genderOrder = ['L', 'P'].filter((gd) => genderSet.includes(gd))
      const shownGenders = genderOrder.filter((gd) => gender === 'all' || gender === gd)
      return (
        <div>
          <PageHeader title="Daftar Peserta" desc={lomba ? `${lomba.name} — pilih Laki-laki/Perempuan, lalu klik nama madrasah untuk melihat daftar pesertanya.` : ''} />
          {GenderFilter}
          {loading ? <Card><div className="p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div></Card>
            : shownGenders.length === 0 ? <Card><Empty /></Card> : (
              <div className="space-y-3">
                {shownGenders.map((gd) => {
                  const gkey = `gender:${gd}`
                  const gopen = !!expanded[gkey]
                  const membersOfGender = filteredPeserta.filter((p) => (p.gender || '') === gd)
                  const madGroups = buildMadGroups(membersOfGender)
                  const label = gd === 'L' ? 'Laki-laki (Putra)' : 'Perempuan (Putri)'
                  return (
                    <Card key={gkey} className="overflow-hidden">
                      <button type="button" onClick={() => toggle(gkey)} className="w-full flex items-center gap-3 p-4 text-left hover:bg-accent/60 transition-colors">
                        {gopen ? <ChevronDown className="h-5 w-5 text-primary shrink-0" /> : <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />}
                        <Users className="h-5 w-5 text-primary shrink-0" />
                        <span className="font-semibold flex-1">{label}</span>
                        <span className="text-sm text-muted-foreground">{madGroups.length} madrasah</span>
                        <span className="text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">{membersOfGender.length} peserta</span>
                      </button>
                      {gopen && (
                        <div className="border-t p-3 space-y-3 bg-muted/30">
                          {madGroups.length === 0 ? <Empty /> : madGroups.map((g) => renderMadrasahCard(g, `mad:${gd}:${g.madrasah}`))}
                        </div>
                      )}
                    </Card>
                  )
                })}
              </div>
            )}
        </div>
      )
    }
    const madGroups = buildMadGroups(filteredPeserta)
    return (
      <div>
        <PageHeader title="Daftar Peserta" desc={lomba ? `${lomba.name} — dikelompokkan per Asal Madrasah. Isi No. Urut pada tiap madrasah untuk mengatur urutan tampil.` : ''} />
        {GenderFilter}
        {loading ? <Card><div className="p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div></Card>
          : madGroups.length === 0 ? <Card><Empty /></Card> : (
            <div className="space-y-3">
              {madGroups.map((g) => renderMadrasahCard(g, `mad:${g.madrasah}`))}
            </div>
          )}
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Daftar Peserta" desc={lomba ? `${lomba.name} — isi kolom No. Urut Tampil untuk mengatur urutan cetak (verifikasi peserta oleh Super Admin)` : ''} />
      {GenderFilter}
      <div className="mb-3"><SortSelect value={sortBy} onChange={setSortBy} /></div>
      <Card>
        {loading ? <div className="p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div> : sorted.length === 0 ? <Empty /> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No. Urut Tampil</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>L/P</TableHead>
                <TableHead>Tempat, Tgl Lahir</TableHead>
                <TableHead>Madrasah</TableHead>
                <TableHead>Berkas</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((p) => (
                <TableRow key={p.id}>
                  <TableCell><NomorCell p={p} onSave={setNomor} /></TableCell>
                  <TableCell className="font-medium">{p.participant_name}</TableCell>
                  <TableCell>{p.gender || '-'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.ttl || '-'}</TableCell>
                  <TableCell>{p.madrasah_name}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {Object.entries(p.files || {}).map(([k, v]) => (
                        <a key={k} href={fileUrl(v.id)} target="_blank" rel="noreferrer" className="text-xs text-primary underline">{k}</a>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell><StatusBadge status={p.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  )
}

function IdCardCetak({ lomba, peserta, loading }) {
  const targets = (peserta || []).map((p) => ({
    label: `${p.nomor_peserta} - ${p.participant_name}`,
    filename: `IDCard_${(p.participant_name || 'peserta').replace(/\s+/g, '_')}.png`,
    baseImage: lomba?.idcard_image_url || null,
    values: { participant_name: p.participant_name, madrasah_name: p.madrasah_name, lomba_name: p.lomba_name, nomor_peserta: p.nomor_peserta, photo: p.files?.pas_photo ? fileUrl(p.files.pas_photo.id) : null },
  }))
  return (
    <div>
      <PageHeader title="ID Card Peserta" desc={lomba ? `${lomba.name} — cetak/unduh ID Card seluruh peserta` : ''} />
      <TemplateStudio
        readOnly
        type="idcard_peserta"
        defaultFields={IDCARD_PESERTA_FIELDS}
        targets={targets}
        loadingTargets={loading}
        sample={{ participant_name: 'Ahmad Fauzi', madrasah_name: 'MI Al-Hidayah', lomba_name: 'Kaligrafi', nomor_peserta: '001' }}
      />
    </div>
  )
}

function Cetak({ lomba, peserta, criteria, kopSurat }) {
  const [mode, setMode] = useState('absensi')
  const [gender, setGender] = useState('all')
  const [sortBy, setSortBy] = useState('nomor')
  const doPrint = (m) => { setMode(m); setTimeout(() => window.print(), 150) }
  const crit = criteria.length ? criteria : ['Kriteria 1', 'Kriteria 2']

  const photoCell = (p) => {
    const src = p.files?.pas_photo ? fileUrl(p.files.pas_photo.id) : null
    return src
      ? <img src={src} alt={p.participant_name} className="peserta-photo" crossOrigin="anonymous" />
      : <span className="peserta-photo-empty">Foto</span>
  }

  const rows = sortPesertaBy(
    peserta.filter((p) => gender === 'all' ? true : p.gender === gender),
    sortBy,
  )
  const genderLabel = gender === 'L' ? ' (Putra)' : gender === 'P' ? ' (Putri)' : ''

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
      <div style={{ textAlign: 'center', fontSize: 14, marginTop: 4, fontWeight: 600 }}>{mode === 'absensi' ? 'DAFTAR HADIR PESERTA' : 'LEMBAR PENILAIAN'} — {lomba?.name || '-'}{genderLabel}</div>
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
          <thead><tr><th>No</th><th>Nomor Peserta</th><th style={{ width: 60 }}>Foto</th><th>Nama</th><th>L/P</th><th>Tempat, Tgl Lahir</th><th>Madrasah</th><th style={{ width: '18%' }}>Tanda Tangan</th></tr></thead>
          <tbody>
            {rows.map((p, i) => (
              <tr key={p.id}><td style={{ textAlign: 'center' }}>{i + 1}</td><td style={{ textAlign: 'center' }}>{p.nomor_peserta}</td><td style={{ textAlign: 'center' }}>{photoCell(p)}</td><td>{p.participant_name}</td><td style={{ textAlign: 'center' }}>{p.gender || '-'}</td><td>{p.ttl || '-'}</td><td>{p.madrasah_name}</td><td style={{ height: 34 }}></td></tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={8} style={{ textAlign: 'center' }}>Belum ada peserta</td></tr>}
          </tbody>
        </table>
      ) : (
        <table className="print-table">
          <thead><tr><th>No</th><th>Nomor Peserta</th><th>Nama</th><th>L/P</th>{crit.map((c, i) => <th key={i}>{c}</th>)}<th>Total</th></tr></thead>
          <tbody>
            {rows.map((p, i) => (
              <tr key={p.id}><td style={{ textAlign: 'center' }}>{i + 1}</td><td style={{ textAlign: 'center' }}>{p.nomor_peserta}</td><td>{p.participant_name}</td><td style={{ textAlign: 'center' }}>{p.gender || '-'}</td>{crit.map((_, j) => <td key={j} style={{ height: 34 }}></td>)}<td></td></tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={crit.length + 5} style={{ textAlign: 'center' }}>Belum ada peserta</td></tr>}
          </tbody>
        </table>
      )}
      {signArea(mode === 'absensi' ? 'Panitia / Juri' : 'Juri Lomba')}
    </div>
  )

  return (
    <div>
      <div className="screen-only">
        <PageHeader title="Cetak Administrasi" desc={lomba?.name}>
          <Button variant={mode === 'absensi' ? 'default' : 'outline'} onClick={() => setMode('absensi')}><Printer className="h-4 w-4 mr-1" />Absensi</Button>
          <Button variant={mode === 'penilaian' ? 'default' : 'outline'} onClick={() => setMode('penilaian')}><Printer className="h-4 w-4 mr-1" />Penilaian</Button>
        </PageHeader>
        <div className="flex flex-wrap items-center gap-3 mb-4">
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
          <SortSelect value={sortBy} onChange={setSortBy} />
          <span className="text-xs text-muted-foreground">{rows.length} peserta</span>
        </div>
        <div className="flex gap-2 mb-4">
          <Button onClick={() => doPrint('absensi')}><Printer className="h-4 w-4 mr-2" />Cetak Absensi</Button>
          <Button onClick={() => doPrint('penilaian')}><Printer className="h-4 w-4 mr-2" />Cetak Lembar Penilaian</Button>
        </div>
        <Card className="p-2 shadow-inner bg-muted/40">
          <div className="mx-auto max-w-3xl border shadow bg-white">{Sheet}</div>
        </Card>
      </div>
      <div className="print-only">{Sheet}</div>
    </div>
  )
}

function Hasil({ lomba, peserta, juara, hasil, onChange }) {
  const [uploading, setUploading] = useState(false)
  const [gender, setGender] = useState('L')
  const ref = useRef(null)
  const verified = peserta.filter((p) => p.status === 'verified')

  const upload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const res = await uploadFile(file)
      await api('/hasil', { method: 'POST', body: { lomba_id: lomba.id, uploaded_score_sheet_url: res.id, note: res.name } })
      toast.success('Lembar nilai terunggah')
      onChange()
    } catch (err) { toast.error(err.message) } finally { setUploading(false) }
  }

  const assign = async (rank, value) => {
    try {
      const body = isGroup ? { lomba_id: lomba.id, rank, gender, madrasah_name: value, is_group: true } : { lomba_id: lomba.id, rank, gender, peserta_id: value }
      await api('/juara', { method: 'POST', body }); toast.success(`${rank} (${gender === 'L' ? 'Putra' : 'Putri'}) ditetapkan`); onChange()
    }
    catch (e) { toast.error(e.message) }
  }
  const removeJuara = async (id) => {
    try { await api(`/juara/${id}`, { method: 'DELETE' }); toast.success('Dihapus'); onChange() } catch (e) { toast.error(e.message) }
  }

  if (!lomba) return <Empty text="Belum ada lomba yang ditugaskan." />

  const isGroup = lomba.type === 'kelompok'
  const verifiedG = verified.filter((p) => p.gender === gender)
  const madrasahOptions = Array.from(new Set(verifiedG.map((p) => p.madrasah_name).filter(Boolean)))

  return (
    <div>
      <PageHeader title="Upload Hasil & Input Juara" desc={lomba.name} />
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-semibold mb-1">Upload Lembar Nilai Fisik</h3>
          <p className="text-sm text-muted-foreground mb-4">Unggah foto / PDF lembar penilaian yang sudah ditandatangani.</p>
          <input ref={ref} type="file" className="hidden" accept="image/*,application/pdf" onChange={upload} />
          <Button variant="secondary" disabled={uploading} onClick={() => ref.current?.click()}>
            {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}Pilih File
          </Button>
          <div className="mt-4 space-y-2">
            {hasil.map((h) => (
              <a key={h.id} href={fileUrl(h.uploaded_score_sheet_url)} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-primary border rounded-lg p-2 hover:bg-accent">
                <FileText className="h-4 w-4" /> {h.note || 'Lembar nilai'}
              </a>
            ))}
            {hasil.length === 0 && <p className="text-xs text-muted-foreground">Belum ada file diunggah.</p>}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold mb-1 flex items-center gap-2"><Award className="h-4 w-4 text-primary" />Penetapan Juara {isGroup && <span className="text-xs font-normal text-muted-foreground">(Kelompok — per Madrasah)</span>}</h3>
          <p className="text-sm text-muted-foreground mb-3">Juara dipisah Putra & Putri. Pilih jenis kelamin, lalu tetapkan pemenang tiap peringkat.</p>
          <div className="flex gap-2 mb-4">
            {GENDERS.map((g) => (
              <Button key={g.value} size="sm" variant={gender === g.value ? 'default' : 'outline'} onClick={() => setGender(g.value)}>
                {g.value === 'L' ? 'Putra' : 'Putri'}
              </Button>
            ))}
          </div>
          <div className="space-y-3">
            {RANKS.map((rank) => {
              const current = juara.find((j) => j.rank === rank && (j.gender || '') === gender)
              return (
                <div key={rank} className="flex items-center gap-2">
                  <div className="w-24 text-sm font-medium">{rank}</div>
                  {isGroup ? (
                    <Select value={current?.madrasah_name || ''} onValueChange={(v) => assign(rank, v)}>
                      <SelectTrigger className="flex-1"><SelectValue placeholder="Pilih madrasah" /></SelectTrigger>
                      <SelectContent>
                        {madrasahOptions.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                        {madrasahOptions.length === 0 && <div className="px-3 py-2 text-sm text-muted-foreground">Belum ada peserta {gender === 'L' ? 'putra' : 'putri'} terverifikasi</div>}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Select value={current?.peserta_id || ''} onValueChange={(v) => assign(rank, v)}>
                      <SelectTrigger className="flex-1"><SelectValue placeholder="Pilih peserta" /></SelectTrigger>
                      <SelectContent>
                        {verifiedG.map((p) => <SelectItem key={p.id} value={p.id}>{p.nomor_peserta} - {p.participant_name}</SelectItem>)}
                        {verifiedG.length === 0 && <div className="px-3 py-2 text-sm text-muted-foreground">Belum ada peserta {gender === 'L' ? 'putra' : 'putri'} terverifikasi</div>}
                      </SelectContent>
                    </Select>
                  )}
                  {current && <Button size="icon" variant="ghost" className="text-destructive" onClick={() => removeJuara(current.id)}><Trash2 className="h-4 w-4" /></Button>}
                </div>
              )
            })}
          </div>
        </Card>
      </div>
    </div>
  )
}
