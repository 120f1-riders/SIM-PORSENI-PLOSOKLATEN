import * as XLSX from 'xlsx'
import { rankDisplay } from './constants'

export const IMPORT_HEADERS = ['Nama Lengkap', 'Jenis Kelamin (L/P)', 'NISN', 'Tempat, Tanggal Lahir', 'Cabang Lomba']

// Generate & download an Excel template for bulk participant registration
export function downloadPesertaTemplate(lombaList = []) {
  const wb = XLSX.utils.book_new()

  // Sheet 1: Data Peserta (form to fill)
  const example = [
    IMPORT_HEADERS,
    ['Ahmad Fauzi', 'L', '0012345678', 'Kediri, 01 Januari 2015', lombaList[0]?.name || 'Kaligrafi'],
    ['Siti Aminah', 'P', '0012345679', 'Kediri, 05 Februari 2015', lombaList[0]?.name || 'Kaligrafi'],
  ]
  const ws = XLSX.utils.aoa_to_sheet(example)
  ws['!cols'] = [{ wch: 26 }, { wch: 18 }, { wch: 16 }, { wch: 28 }, { wch: 24 }]
  XLSX.utils.book_append_sheet(wb, ws, 'Data Peserta')

  // Sheet 2: reference list of available lomba
  const ref = [['Daftar Cabang Lomba Tersedia'], ['Nama Lomba', 'Kategori', 'Jenis']]
  lombaList.forEach((l) => ref.push([l.name, l.category, l.type === 'kelompok' ? 'Kelompok' : 'Individu']))
  const wsRef = XLSX.utils.aoa_to_sheet(ref)
  wsRef['!cols'] = [{ wch: 28 }, { wch: 14 }, { wch: 14 }]
  XLSX.utils.book_append_sheet(wb, wsRef, 'Referensi Lomba')

  XLSX.writeFile(wb, 'Template_Pendaftaran_Porseni.xlsx')
}

// Parse an uploaded Excel/CSV file -> array of row objects
export async function parsePesertaWorkbook(file) {
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
  const out = []
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]
    if (!r || r.every((c) => String(c).trim() === '')) continue
    const name = String(r[0] || '').trim()
    if (!name) continue
    let g = String(r[1] || '').trim().toUpperCase()
    if (g.startsWith('L')) g = 'L'
    else if (g.startsWith('P')) g = 'P'
    else g = ''
    out.push({
      participant_name: name,
      gender: g,
      nisn: String(r[2] || '').trim(),
      ttl: String(r[3] || '').trim(),
      lomba_name: String(r[4] || '').trim(),
    })
  }
  return out
}

/* ================= TEAM (KELOMPOK) BULK ================= */
export const TEAM_IMPORT_HEADERS = ['Cabang Lomba (Kelompok)', 'Nama Madrasah', 'Nama Anggota', 'Jenis Kelamin (L/P)', 'NISN', 'Tempat, Tanggal Lahir']

export function downloadTeamTemplate(lombaList = []) {
  const wb = XLSX.utils.book_new()
  const group = lombaList.filter((l) => l.type === 'kelompok')
  const ex = group[0]?.name || 'Futsal'
  const example = [
    TEAM_IMPORT_HEADERS,
    [ex, 'MI Al-Hidayah', 'Ahmad Fauzi', 'L', '0012345678', 'Kediri, 01 Januari 2015'],
    [ex, 'MI Al-Hidayah', 'Budi Santoso', 'L', '0012345679', 'Kediri, 03 Maret 2015'],
    [ex, 'MI Al-Hidayah', 'Candra Wijaya', 'L', '0012345680', 'Kediri, 05 Mei 2015'],
  ]
  const ws = XLSX.utils.aoa_to_sheet(example)
  ws['!cols'] = [{ wch: 24 }, { wch: 22 }, { wch: 24 }, { wch: 18 }, { wch: 16 }, { wch: 28 }]
  XLSX.utils.book_append_sheet(wb, ws, 'Data Tim')
  const ref = [['Daftar Cabang Lomba Kelompok'], ['Nama Lomba', 'Jumlah Anggota']]
  group.forEach((l) => ref.push([l.name, l.team_size || '?']))
  const wsRef = XLSX.utils.aoa_to_sheet(ref)
  wsRef['!cols'] = [{ wch: 28 }, { wch: 16 }]
  XLSX.utils.book_append_sheet(wb, wsRef, 'Referensi Lomba')
  XLSX.writeFile(wb, 'Template_Pendaftaran_Tim_Porseni.xlsx')
}

// Parse team workbook -> [{ lomba_name, madrasah_name, members:[{participant_name,gender,nisn,ttl}] }]
export async function parseTeamWorkbook(file) {
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
  const teams = {}
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]
    if (!r || r.every((c) => String(c).trim() === '')) continue
    const lomba_name = String(r[0] || '').trim()
    const madrasah_name = String(r[1] || '').trim()
    const name = String(r[2] || '').trim()
    if (!lomba_name || !madrasah_name || !name) continue
    let g = String(r[3] || '').trim().toUpperCase()
    g = g.startsWith('L') ? 'L' : g.startsWith('P') ? 'P' : ''
    const key = lomba_name.toLowerCase() + '||' + madrasah_name.toLowerCase()
    if (!teams[key]) teams[key] = { lomba_name, madrasah_name, members: [] }
    teams[key].members.push({ participant_name: name, gender: g, nisn: String(r[4] || '').trim(), ttl: String(r[5] || '').trim() })
  }
  return Object.values(teams)
}

/* ================= LOMBA BULK ================= */
export const LOMBA_IMPORT_HEADERS = ['Nama Lomba', 'Kategori (Olahraga/Seni)', 'Jenis (Individu/Kelompok)', 'Jumlah Anggota (kelompok)', 'Kriteria Penilaian (pisah ;)']

export function downloadLombaTemplate() {
  const wb = XLSX.utils.book_new()
  const example = [
    LOMBA_IMPORT_HEADERS,
    ['Kaligrafi', 'Seni', 'Individu', '', 'Kerapian; Keindahan; Ketepatan'],
    ['Futsal', 'Olahraga', 'Kelompok', '10', 'Teknik; Kerjasama'],
  ]
  const ws = XLSX.utils.aoa_to_sheet(example)
  ws['!cols'] = [{ wch: 24 }, { wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 34 }]
  XLSX.utils.book_append_sheet(wb, ws, 'Data Lomba')
  XLSX.writeFile(wb, 'Template_Cabang_Lomba_Porseni.xlsx')
}

export async function parseLombaWorkbook(file) {
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
  const out = []
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]
    if (!r || r.every((c) => String(c).trim() === '')) continue
    const name = String(r[0] || '').trim()
    if (!name) continue
    let cat = String(r[1] || '').trim().toLowerCase()
    cat = cat.startsWith('sen') ? 'Seni' : 'Olahraga'
    let type = String(r[2] || '').trim().toLowerCase()
    type = type.startsWith('kel') ? 'kelompok' : 'individu'
    const team_size = type === 'kelompok' ? (Number(String(r[3] || '').trim()) || null) : null
    const judging_criteria = String(r[4] || '').split(/[;,]/).map((s) => s.trim()).filter(Boolean)
    out.push({ name, category: cat, type, team_size, judging_criteria })
  }
  return out
}

/* ================= USER BULK ================= */
export const USER_IMPORT_HEADERS = ['Nama', 'User (email atau kode)', 'Password (kosong=12345678)', 'Peran (admin_madrasah/panitia)', 'Asal Madrasah', 'Cabang Lomba (untuk panitia)']

export function downloadUserTemplate(lombaList = []) {
  const wb = XLSX.utils.book_new()
  const example = [
    USER_IMPORT_HEADERS,
    ['Admin MI Al-Hidayah', 'mi.alhidayah', '', 'admin_madrasah', 'MI Al-Hidayah', ''],
    ['Panitia Futsal', 'panitia.futsal', '', 'panitia', '', lombaList[0]?.name || 'Futsal'],
  ]
  const ws = XLSX.utils.aoa_to_sheet(example)
  ws['!cols'] = [{ wch: 24 }, { wch: 22 }, { wch: 26 }, { wch: 28 }, { wch: 22 }, { wch: 24 }]
  XLSX.utils.book_append_sheet(wb, ws, 'Data Pengguna')
  const ref = [['Referensi Cabang Lomba'], ['Nama Lomba']]
  lombaList.forEach((l) => ref.push([l.name]))
  const wsRef = XLSX.utils.aoa_to_sheet(ref)
  wsRef['!cols'] = [{ wch: 28 }]
  XLSX.utils.book_append_sheet(wb, wsRef, 'Referensi Lomba')
  XLSX.writeFile(wb, 'Template_Pengguna_Porseni.xlsx')
}

export async function parseUserWorkbook(file) {
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
  const out = []
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]
    if (!r || r.every((c) => String(c).trim() === '')) continue
    const name = String(r[0] || '').trim()
    const email = String(r[1] || '').trim()
    if (!name || !email) continue
    let role = String(r[3] || '').trim().toLowerCase()
    if (role.includes('panit')) role = 'panitia'
    else if (role.includes('super')) role = 'super_admin'
    else role = 'admin_madrasah'
    out.push({
      name,
      email,
      password: String(r[2] || '').trim(),
      role,
      madrasah_name: String(r[4] || '').trim(),
      lomba_name: String(r[5] || '').trim(),
    })
  }
  return out
}

/* ================= JUARA (WINNERS) EXPORT ================= */
// Rekap juara untuk kebutuhan sertifikat -> Excel
const GENDER_CERT = { L: 'Putra', P: 'Putri' }
export function exportJuaraToExcel(juara = [], lombaList = [], pesertaList = []) {
  const lombaById = {}
  lombaList.forEach((l) => { lombaById[l.id] = l })
  const pesertaById = {}
  pesertaList.forEach((p) => { pesertaById[p.id] = p })

  // Urutkan: nama lomba, lalu peringkat, lalu jenis kelamin
  const rankOrder = { 'Juara 1': 1, 'Juara 2': 2, 'Juara 3': 3, 'Juara 3 Bersama': 3.5, 'Harapan 1': 4, 'Harapan 2': 5, 'Harapan 3': 6 }
  const rows = [...juara].sort((a, b) => {
    const la = (lombaById[a.lomba_id]?.name || '').toLowerCase()
    const lb = (lombaById[b.lomba_id]?.name || '').toLowerCase()
    if (la !== lb) return la < lb ? -1 : 1
    const ra = rankOrder[a.rank] || 99, rb = rankOrder[b.rank] || 99
    if (ra !== rb) return ra - rb
    return (a.gender || '').localeCompare(b.gender || '')
  })

  const header = ['No', 'Cabang Lomba', 'Kategori', 'Jenis', 'Peringkat', 'Jenis Kelamin', 'Nama Peserta / Regu', 'Asal Madrasah', 'NISN']
  const data = [header]
  rows.forEach((j, i) => {
    const l = lombaById[j.lomba_id]
    const p = j.peserta_id ? pesertaById[j.peserta_id] : null
    data.push([
      i + 1,
      l?.name || '-',
      l?.category || '-',
      l?.type === 'kelompok' ? 'Kelompok' : 'Individu',
      rankDisplay(j.rank) || '-',
      GENDER_CERT[j.gender] || '-',
      j.participant_name || '-',
      j.madrasah_name || '-',
      (p && p.nisn) ? p.nisn : '-',
    ])
  })
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(data)
  ws['!cols'] = [{ wch: 5 }, { wch: 24 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 28 }, { wch: 26 }, { wch: 18 }]
  XLSX.utils.book_append_sheet(wb, ws, 'Rekap Juara')
  const stamp = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(wb, `Rekap_Juara_Porseni_${stamp}.xlsx`)
}

const ROLE_TEXT = { super_admin: 'Super Admin', admin_madrasah: 'Admin Madrasah', panitia: 'Panitia' }
export function exportUsersToExcel(users = [], lombaList = []) {
  const lombaById = {}
  lombaList.forEach((l) => { lombaById[l.id] = l.name })
  const header = ['No', 'Nama', 'User (email/kode)', 'Kata Sandi', 'Peran', 'Keterangan', 'Status']
  const data = [header]
  users.forEach((u, i) => {
    const ket = u.role === 'admin_madrasah'
      ? (u.madrasah_name || '-')
      : u.role === 'panitia'
        ? (lombaById[u.assigned_lomba_id] || '-')
        : '-'
    data.push([
      i + 1,
      u.name || '',
      u.email || '',
      u.password_plain || '(tidak tersedia)',
      ROLE_TEXT[u.role] || u.role || '',
      ket,
      u.status === 'verified' ? 'Terverifikasi' : 'Menunggu',
    ])
  })
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(data)
  ws['!cols'] = [{ wch: 5 }, { wch: 28 }, { wch: 26 }, { wch: 20 }, { wch: 18 }, { wch: 26 }, { wch: 16 }]
  XLSX.utils.book_append_sheet(wb, ws, 'Daftar Pengguna')
  const stamp = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(wb, `Daftar_Pengguna_Porseni_${stamp}.xlsx`)
}

