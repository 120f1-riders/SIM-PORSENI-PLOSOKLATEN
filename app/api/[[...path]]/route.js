import { MongoClient } from 'mongodb'
import { v4 as uuidv4 } from 'uuid'
import { NextResponse } from 'next/server'
import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import {
  sheetsConfigured,
  oauthConfigured,
  uploadToDrive,
  downloadFromDrive,
  ensureFolderPath,
  ensureTab,
  ensureHeader,
  appendRows,
  overwriteSheet,
  sheetsStatus,
  driveStatus,
  driveAuthUrl,
  exchangeCode,
} from '@/lib/porseni/google'

const SHEET_HEADER = [
  'No Peserta', 'Nama Peserta', 'L/P', 'Cabang Lomba', 'Jenis', 'Madrasah',
  'NISN', 'TTL', 'Tim', 'Kelengkapan', 'Link Akte', 'Link Surat Ket', 'Link Pas Photo', 'Tanggal Daftar',
]

async function fileLinkFor(db, f) {
  if (!f || !f.id) return ''
  const rec = await db.collection('files').findOne({ id: f.id })
  if (rec && rec.drive_url) return rec.drive_url
  return (process.env.NEXT_PUBLIC_BASE_URL || '') + '/api/files/' + f.id
}

async function buildSheetRow(db, doc, lomba) {
  const files = doc.files || {}
  return [
    doc.nomor_peserta || '', doc.participant_name || '', doc.gender || '',
    doc.lomba_name || (lomba ? lomba.name : ''), (lomba ? lomba.type : '') || '',
    doc.madrasah_name || '', doc.nisn || '', doc.ttl || '', doc.team_name || '',
    doc.complete ? 'Lengkap' : 'Belum',
    await fileLinkFor(db, files.akte), await fileLinkFor(db, files.surat_ket), await fileLinkFor(db, files.pas_photo),
    doc.created_at ? new Date(doc.created_at).toLocaleString('id-ID') : '',
  ]
}

// Helper: read stored Drive OAuth refresh token from settings
async function getDriveRefreshToken(db) {
  const s = await db.collection('settings').findOne({ key: 'google_drive_oauth' })
  return s ? s.refresh_token : null
}

// Append one or more peserta docs to Google Sheet (non-blocking / best-effort)
async function syncSheetAppend(db, docs) {
  try {
    if (!sheetsConfigured()) return
    await ensureTab()
    await ensureHeader(SHEET_HEADER)
    const rows = []
    for (const d of docs) {
      const lomba = await db.collection('lomba').findOne({ id: d.lomba_id })
      rows.push(await buildSheetRow(db, d, lomba))
    }
    if (rows.length) await appendRows(rows)
  } catch (e) {
    console.error('[sheet-sync] append failed:', e.message)
  }
}

let client
let db

const UP_DIR = path.join(process.cwd(), '.uploads')
const SALT = 'porseni_mi_plosoklaten_2025'

async function connectToMongo() {
  if (!client) {
    client = new MongoClient(process.env.MONGO_URL)
    await client.connect()
    db = client.db(process.env.DB_NAME)
  }
  return db
}

function handleCORS(response) {
  response.headers.set('Access-Control-Allow-Origin', process.env.CORS_ORIGINS || '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  response.headers.set('Access-Control-Allow-Credentials', 'true')
  return response
}

function json(data, status = 200) {
  return handleCORS(NextResponse.json(data, { status }))
}

function hashPw(pw) {
  return crypto.createHash('sha256').update(String(pw) + SALT).digest('hex')
}

function clean(doc) {
  if (!doc) return doc
  const { _id, password, password_plain, token, tokens, ...rest } = doc
  return rest
}

// For super_admin user listing: keep password_plain visible, strip hash/token/_id
function cleanUserAdmin(doc) {
  if (!doc) return doc
  const { _id, password, token, tokens, ...rest } = doc
  return rest
}

const REQUIRED_FILE_KEYS = ['akte', 'surat_ket', 'pas_photo', 'nisn_doc', 'raport']

function computeComplete(doc) {
  const files = doc.files || {}
  const hasAllFiles = REQUIRED_FILE_KEYS.every((k) => files[k] && files[k].id)
  const hasData = !!(doc.participant_name && doc.gender && doc.lomba_id)
  return hasData && hasAllFiles
}

async function getUser(request) {
  const auth = request.headers.get('authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return null
  // Multi-device: a token is valid if it matches the legacy single `token`
  // field OR is present in the `tokens` array (one account, many devices).
  const u = await db.collection('users').findOne({ $or: [{ tokens: token }, { token }] })
  return u || null
}

export async function OPTIONS() {
  return handleCORS(new NextResponse(null, { status: 200 }))
}

async function handleRoute(request, { params }) {
  const { path: pathArr = [] } = await params
  const p = pathArr
  const route = `/${p.join('/')}`
  const method = request.method

  try {
    const db = await connectToMongo()

    // ---------- HEALTH ----------
    if ((route === '/' || route === '/root') && method === 'GET') {
      return json({ message: 'Porseni MI Plosoklaten API' })
    }

    // ---------- INTEGRATIONS (Google Drive + Sheets) ----------
    if (route === '/integrations/status' && method === 'GET') {
      const u = await getUser(request)
      if (!u || u.role !== 'super_admin') return json({ error: 'Akses ditolak' }, 403)
      const out = {
        sheets_configured: sheetsConfigured(),
        oauth_configured: oauthConfigured(),
        drive_connected: false,
      }
      // Sheets status
      if (sheetsConfigured()) {
        try {
          const st = await sheetsStatus()
          out.spreadsheet = st.spreadsheet
          out.tabs = st.tabs
          out.target_tab = st.target_tab
          out.tab_exists = Array.isArray(st.tabs) && st.tabs.includes(st.target_tab)
        } catch (e) { out.sheets_error = e.message }
      }
      // Drive OAuth status
      const rt = await getDriveRefreshToken(db)
      if (oauthConfigured() && rt) {
        try {
          const ds = await driveStatus(rt)
          out.drive_connected = true
          out.drive_folder = ds.drive_folder
        } catch (e) { out.drive_error = e.message }
      }
      return json(out)
    }
    if (route === '/integrations/sync' && method === 'POST') {
      const u = await getUser(request)
      if (!u || u.role !== 'super_admin') return json({ error: 'Akses ditolak' }, 403)
      if (!sheetsConfigured()) return json({ error: 'Google Sheets belum dikonfigurasi' }, 400)
      try {
        await ensureTab()
        const all = await db.collection('peserta').find({}).sort({ lomba_name: 1, nomor_peserta: 1 }).limit(5000).toArray()
        // Batch-load lomba to avoid N+1 queries
        const lombaIds = [...new Set(all.map((d) => d.lomba_id).filter(Boolean))]
        const lombaDocs = await db.collection('lomba').find({ id: { $in: lombaIds } }).toArray()
        const lombaMap = Object.fromEntries(lombaDocs.map((l) => [l.id, l]))
        const rows = []
        for (const d of all) {
          rows.push(await buildSheetRow(db, d, lombaMap[d.lomba_id] || null))
        }
        await overwriteSheet(SHEET_HEADER, rows)
        return json({ ok: true, synced: rows.length })
      } catch (e) {
        return json({ error: e.message }, 500)
      }
    }
    // Disconnect Drive OAuth (remove stored refresh token)
    if (route === '/integrations/drive/disconnect' && method === 'POST') {
      const u = await getUser(request)
      if (!u || u.role !== 'super_admin') return json({ error: 'Akses ditolak' }, 403)
      await db.collection('settings').deleteOne({ key: 'google_drive_oauth' })
      return json({ ok: true })
    }

    // ---------- GOOGLE OAUTH (Drive) ----------
    // Start: /google/start?token=<super_admin_token>  -> redirect to Google consent
    if (route === '/google/start' && method === 'GET') {
      if (!oauthConfigured()) return json({ error: 'OAuth belum dikonfigurasi (client id/secret)' }, 400)
      const url = new URL(request.url)
      const tk = url.searchParams.get('token')
      const owner = tk ? await db.collection('users').findOne({ token: tk }) : null
      if (!owner || owner.role !== 'super_admin') return json({ error: 'Akses ditolak. Sertakan token super_admin.' }, 403)
      const state = tk
      const authUrl = driveAuthUrl(state)
      return handleCORS(NextResponse.redirect(authUrl))
    }
    // Callback: /google/callback?code=...&state=<super_admin_token>
    if (route === '/google/callback' && method === 'GET') {
      const url = new URL(request.url)
      const code = url.searchParams.get('code')
      const state = url.searchParams.get('state')
      const err = url.searchParams.get('error')
      const htmlPage = (title, msg, ok) => new NextResponse(
        `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head><body style="font-family:system-ui,Arial;background:#f0fdf4;margin:0;display:flex;min-height:100vh;align-items:center;justify-content:center"><div style="background:#fff;max-width:440px;padding:32px;border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,.08);text-align:center"><div style="font-size:48px">${ok ? '&#9989;' : '&#9888;&#65039;'}</div><h2 style="color:#166534;margin:12px 0">${title}</h2><p style="color:#374151;line-height:1.5">${msg}</p><a href="/" style="display:inline-block;margin-top:16px;background:#16a34a;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px">Kembali ke Aplikasi</a></div></body></html>`,
        { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      )
      if (err) return htmlPage('Otorisasi Dibatalkan', 'Proses menghubungkan Google Drive dibatalkan atau gagal: ' + err, false)
      const owner = state ? await db.collection('users').findOne({ token: state }) : null
      if (!code || !owner || owner.role !== 'super_admin') {
        return htmlPage('Otorisasi Gagal', 'State tidak valid atau kode tidak ada. Silakan ulangi dari aplikasi.', false)
      }
      try {
        const tokens = await exchangeCode(code)
        if (!tokens.refresh_token) {
          return htmlPage('Perlu Diulang', 'Google tidak mengirim refresh token. Buka myaccount.google.com/permissions, hapus akses aplikasi ini, lalu coba hubungkan lagi.', false)
        }
        await db.collection('settings').updateOne(
          { key: 'google_drive_oauth' },
          { $set: { key: 'google_drive_oauth', refresh_token: tokens.refresh_token, connected_by: owner.id, connected_at: new Date() } },
          { upsert: true }
        )
        return htmlPage('Google Drive Terhubung!', 'Berhasil. Berkas peserta sekarang akan tersimpan di Google Drive Anda. Anda bisa menutup halaman ini.', true)
      } catch (e) {
        return htmlPage('Otorisasi Gagal', 'Terjadi kesalahan: ' + e.message, false)
      }
    }

    // ---------- FILE SERVE ---------- GET /files/:id
    if (p[0] === 'files' && p[1] && method === 'GET') {
      const f = await db.collection('files').findOne({ id: p[1] })
      if (!f) return json({ error: 'File tidak ditemukan' }, 404)
      let buf
      if (f.driveId) {
        const rt = await getDriveRefreshToken(db)
        buf = await downloadFromDrive(f.driveId, rt)
      } else {
        buf = await fs.readFile(path.join(UP_DIR, f.storedName))
      }
      return new NextResponse(buf, {
        status: 200,
        headers: {
          'Content-Type': f.mime || 'application/octet-stream',
          'Content-Disposition': `inline; filename="${f.name}"`,
          'Cache-Control': 'public, max-age=31536000',
        },
      })
    }

    // ---------- UPLOAD ---------- POST /upload (multipart)
    if (route === '/upload' && method === 'POST') {
      const form = await request.formData()
      const file = form.get('file')
      if (!file || typeof file === 'string') return json({ error: 'File wajib diunggah' }, 400)
      const bytes = Buffer.from(await file.arrayBuffer())
      const id = uuidv4()
      const origName = file.name || id
      const mime = file.type || 'application/octet-stream'
      // Optional Drive folder path context from client (Lomba/Madrasah)
      const folderCtx = form.get('folder_path')
      let doc = null
      const refreshToken = await getDriveRefreshToken(db)
      if (oauthConfigured() && refreshToken) {
        try {
          let folderId
          if (folderCtx && typeof folderCtx === 'string') {
            folderId = await ensureFolderPath(folderCtx.split('/').filter(Boolean), refreshToken)
          }
          const up = await uploadToDrive({ buffer: bytes, filename: `${Date.now()}_${origName}`, mimeType: mime, folderId, refreshToken })
          doc = { id, name: origName, driveId: up.driveId, drive_url: up.url, mime, size: bytes.length, created_at: new Date() }
        } catch (e) {
          console.error('[drive-upload] failed, fallback to disk:', e.message)
        }
      }
      if (!doc) {
        await fs.mkdir(UP_DIR, { recursive: true })
        const ext = (origName && origName.includes('.')) ? '.' + origName.split('.').pop() : ''
        const storedName = id + ext
        await fs.writeFile(path.join(UP_DIR, storedName), bytes)
        doc = { id, name: origName, storedName, mime, size: bytes.length, created_at: new Date() }
      }
      await db.collection('files').insertOne(doc)
      return json({ id, name: doc.name, url: `/api/files/${id}`, size: doc.size, drive_url: doc.drive_url || null })
    }

    // ---------- AUTH ----------
    if (route === '/auth/register' && method === 'POST') {
      const b = await request.json()
      if (!b.name || !b.email || !b.password || !b.role) return json({ error: 'Data tidak lengkap' }, 400)
      const exists = await db.collection('users').findOne({ email: String(b.email).toLowerCase() })
      if (exists) return json({ error: 'Email sudah terdaftar' }, 400)
      const isSuper = b.role === 'super_admin'
      const initToken = uuidv4()
      const user = {
        id: uuidv4(),
        name: b.name,
        email: String(b.email).toLowerCase(),
        password: hashPw(b.password),
        password_plain: String(b.password),
        role: b.role,
        madrasah_name: b.madrasah_name || null,
        assigned_lomba_id: b.assigned_lomba_id || null,
        status: isSuper ? 'verified' : 'pending',
        token: initToken,
        tokens: [initToken],
        created_at: new Date(),
      }
      await db.collection('users').insertOne(user)
      if (user.status === 'pending') {
        return json({ pending: true, message: 'Registrasi berhasil. Menunggu verifikasi Super Admin.' })
      }
      return json({ token: user.token, user: clean(user) })
    }

    if (route === '/auth/login' && method === 'POST') {
      const b = await request.json()
      const u = await db.collection('users').findOne({ email: String(b.email || '').toLowerCase() })
      if (!u || u.password !== hashPw(b.password)) return json({ error: 'Email atau kata sandi salah' }, 401)
      if (u.status !== 'verified') return json({ error: 'Akun Anda masih menunggu verifikasi Super Admin.' }, 403)
      const token = uuidv4()
      await db.collection('users').updateOne({ id: u.id }, { $set: { token }, $addToSet: { tokens: token } })
      return json({ token, user: clean({ ...u, token }) })
    }

    if (route === '/auth/me' && method === 'GET') {
      const u = await getUser(request)
      if (!u) return json({ error: 'Tidak terautentikasi' }, 401)
      return json(clean(u))
    }

    // ---------- PROFILE (self service) ----------
    if (route === '/auth/profile' && method === 'GET') {
      const u = await getUser(request)
      if (!u) return json({ error: 'Tidak terautentikasi' }, 401)
      const { _id, password, token, tokens, ...rest } = u
      return json(rest) // includes password_plain, photo_url, assigned_lomba_id
    }
    if (route === '/auth/profile' && method === 'PUT') {
      const u = await getUser(request)
      if (!u) return json({ error: 'Tidak terautentikasi' }, 401)
      const b = await request.json()
      const set = {}
      if (b.name !== undefined) set.name = b.name
      if (b.photo_url !== undefined) set.photo_url = b.photo_url
      if (b.password) { set.password = hashPw(String(b.password)); set.password_plain = String(b.password) }
      await db.collection('users').updateOne({ id: u.id }, { $set: set })
      const doc = await db.collection('users').findOne({ id: u.id })
      const { _id, password, token, tokens, ...rest } = doc
      return json(rest)
    }

    // ---------- FORGOT PASSWORD (public) -> notify super admin ----------
    if (route === '/auth/forgot' && method === 'POST') {
      const b = await request.json()
      const email = String(b.email || '').toLowerCase()
      const target = await db.collection('users').findOne({ email })
      if (target) {
        await db.collection('users').updateOne({ id: target.id }, { $set: { reset_requested: true, reset_requested_at: new Date() } })
      }
      // generic response (avoid leaking which emails exist)
      return json({ ok: true, message: 'Permintaan reset sandi terkirim ke Super Admin. Silakan hubungi Super Admin untuk sandi baru Anda.' })
    }

    // ---------- LOMBA ----------
    if (route === '/lomba' && method === 'GET') {
      const list = await db.collection('lomba').find({}).sort({ created_at: 1 }).toArray()
      return json(list.map(clean))
    }
    if (route === '/lomba' && method === 'POST') {
      const u = await getUser(request)
      if (!u || u.role !== 'super_admin') return json({ error: 'Akses ditolak' }, 403)
      const b = await request.json()
      const doc = { id: uuidv4(), name: b.name, category: b.category || 'Olahraga', type: b.type || 'individu', team_size: b.team_size ? Number(b.team_size) : null, idcard_image_url: b.idcard_image_url || null, judging_criteria: b.judging_criteria || [], created_at: new Date() }
      await db.collection('lomba').insertOne(doc)
      return json(clean(doc))
    }
    if (p[0] === 'lomba' && p[1] && method === 'PUT') {
      const u = await getUser(request)
      if (!u || u.role !== 'super_admin') return json({ error: 'Akses ditolak' }, 403)
      const b = await request.json()
      const set = {}
      ;['name', 'category', 'type', 'team_size', 'idcard_image_url', 'judging_criteria'].forEach(k => { if (b[k] !== undefined) set[k] = b[k] })
      await db.collection('lomba').updateOne({ id: p[1] }, { $set: set })
      const doc = await db.collection('lomba').findOne({ id: p[1] })
      return json(clean(doc))
    }
    if (p[0] === 'lomba' && p[1] && method === 'DELETE') {
      const u = await getUser(request)
      if (!u || u.role !== 'super_admin') return json({ error: 'Akses ditolak' }, 403)
      await db.collection('lomba').deleteOne({ id: p[1] })
      return json({ ok: true })
    }

    // ---------- USERS (super admin) ----------
    if (route === '/users' && method === 'GET') {
      const u = await getUser(request)
      if (!u || u.role !== 'super_admin') return json({ error: 'Akses ditolak' }, 403)
      const list = await db.collection('users').find({}).sort({ created_at: -1 }).toArray()
      return json(list.map(cleanUserAdmin))
    }
    // Create user directly (super_admin) — used by manual add & bulk Excel import; auto-verified
    if (route === '/users' && method === 'POST') {
      const u = await getUser(request)
      if (!u || u.role !== 'super_admin') return json({ error: 'Akses ditolak' }, 403)
      const b = await request.json()
      if (!b.name || !b.email || !b.role) return json({ error: 'Data tidak lengkap (nama, user, peran wajib)' }, 400)
      const email = String(b.email).toLowerCase()
      const exists = await db.collection('users').findOne({ email })
      if (exists) return json({ error: 'User sudah terdaftar' }, 400)
      const pw = b.password ? String(b.password) : '12345678'
      const initToken = uuidv4()
      const user = {
        id: uuidv4(), name: b.name, email,
        password: hashPw(pw), password_plain: pw,
        role: b.role,
        madrasah_name: b.madrasah_name || null,
        assigned_lomba_id: b.assigned_lomba_id || null,
        status: 'verified',
        token: initToken, tokens: [initToken], created_at: new Date(),
      }
      await db.collection('users').insertOne(user)
      return json(cleanUserAdmin(user))
    }
    if (p[0] === 'users' && p[1] && method === 'PUT') {
      const u = await getUser(request)
      if (!u || u.role !== 'super_admin') return json({ error: 'Akses ditolak' }, 403)
      const b = await request.json()
      const set = {}
      ;['status', 'name', 'madrasah_name', 'assigned_lomba_id', 'role'].forEach(k => { if (b[k] !== undefined) set[k] = b[k] })
      if (b.email !== undefined) {
        const email = String(b.email).toLowerCase().trim()
        if (!email) return json({ error: 'Email tidak boleh kosong' }, 400)
        const dup = await db.collection('users').findOne({ email, id: { $ne: p[1] } })
        if (dup) return json({ error: 'Email sudah digunakan pengguna lain' }, 400)
        set.email = email
      }
      // keep role-specific fields consistent
      if (set.role === 'admin_madrasah') set.assigned_lomba_id = null
      if (set.role === 'panitia') set.madrasah_name = null
      if (set.role === 'super_admin') { set.assigned_lomba_id = null; set.madrasah_name = null }
      if (b.password) {
        set.password = hashPw(String(b.password))
        set.password_plain = String(b.password)
        set.reset_requested = false
      }
      await db.collection('users').updateOne({ id: p[1] }, { $set: set })
      const doc = await db.collection('users').findOne({ id: p[1] })
      return json(cleanUserAdmin(doc))
    }
    if (p[0] === 'users' && p[1] && method === 'DELETE') {
      const u = await getUser(request)
      if (!u || u.role !== 'super_admin') return json({ error: 'Akses ditolak' }, 403)
      await db.collection('users').deleteOne({ id: p[1] })
      return json({ ok: true })
    }

    // ---------- PESERTA ----------
    if (route === '/peserta' && method === 'GET') {
      const u = await getUser(request)
      if (!u) return json({ error: 'Tidak terautentikasi' }, 401)
      let q = {}
      if (u.role === 'admin_madrasah') q = { created_by: u.id }
      else if (u.role === 'panitia') q = { lomba_id: u.assigned_lomba_id, complete: true, status: 'verified' }
      const list = await db.collection('peserta').find(q).sort({ created_at: -1 }).toArray()
      return json(list.map(clean))
    }
    if (route === '/peserta' && method === 'POST') {
      const u = await getUser(request)
      if (!u) return json({ error: 'Tidak terautentikasi' }, 401)
      const b = await request.json()
      const lomba = await db.collection('lomba').findOne({ id: b.lomba_id })
      const count = await db.collection('peserta').countDocuments({ lomba_id: b.lomba_id })
      const nomor = String(count + 1).padStart(3, '0')
      const madrasah = b.madrasah_name || u.madrasah_name || '-'
      const drivePath = `${lomba ? lomba.name : 'Lomba'}/${madrasah}/${b.participant_name}`
      const doc = {
        id: uuidv4(),
        participant_name: b.participant_name,
        gender: b.gender === 'P' ? 'P' : (b.gender === 'L' ? 'L' : ''),
        nisn: b.nisn || '',
        ttl: b.ttl || '',
        madrasah_name: madrasah,
        lomba_id: b.lomba_id,
        lomba_name: lomba ? lomba.name : '',
        nomor_peserta: nomor,
        status: 'pending',
        files: b.files || {},
        drive_path: drivePath,
        created_by: u.id,
        created_at: new Date(),
      }
      doc.complete = computeComplete(doc)
      await db.collection('peserta').insertOne(doc)
      await syncSheetAppend(db, [doc])
      return json(clean(doc))
    }
    // ---------- PESERTA TEAM (kelompok) ----------
    if (route === '/peserta/team' && method === 'POST') {
      const u = await getUser(request)
      if (!u) return json({ error: 'Tidak terautentikasi' }, 401)
      const b = await request.json()
      const lomba = await db.collection('lomba').findOne({ id: b.lomba_id })
      const madrasah = b.madrasah_name || u.madrasah_name || '-'
      const members = Array.isArray(b.members) ? b.members.filter((m) => m && m.participant_name) : []
      if (members.length === 0) return json({ error: 'Minimal satu anggota tim wajib diisi' }, 400)
      const team_id = uuidv4()
      const team_name = b.team_name || `${lomba ? lomba.name : 'Tim'} - ${madrasah}`
      let count = await db.collection('peserta').countDocuments({ lomba_id: b.lomba_id })
      const created = []
      for (const m of members) {
        count += 1
        const nomor = String(count).padStart(3, '0')
        const doc = {
          id: uuidv4(),
          participant_name: m.participant_name,
          gender: m.gender === 'P' ? 'P' : (m.gender === 'L' ? 'L' : ''),
          nisn: m.nisn || '',
          ttl: m.ttl || '',
          madrasah_name: madrasah,
          lomba_id: b.lomba_id,
          lomba_name: lomba ? lomba.name : '',
          nomor_peserta: nomor,
          status: 'pending',
          files: m.files || {},
          is_group: true,
          team_id,
          team_name,
          drive_path: `${lomba ? lomba.name : 'Lomba'}/${madrasah}/${team_name}/${m.participant_name}`,
          created_by: u.id,
          created_at: new Date(),
        }
        doc.complete = computeComplete(doc)
        await db.collection('peserta').insertOne(doc)
        created.push(clean(doc))
      }
      await syncSheetAppend(db, created)
      return json({ team_id, team_name, count: created.length, members: created })
    }
    if (p[0] === 'peserta' && p[1] && p[2] === 'status' && method === 'PUT') {
      const u = await getUser(request)
      if (!u || u.role !== 'super_admin') return json({ error: 'Hanya Super Admin yang dapat memverifikasi peserta' }, 403)
      const b = await request.json()
      await db.collection('peserta').updateOne({ id: p[1] }, { $set: { status: b.status } })
      const doc = await db.collection('peserta').findOne({ id: p[1] })
      return json(clean(doc))
    }
    if (p[0] === 'peserta' && p[1] && method === 'PUT') {
      const u = await getUser(request)
      if (!u) return json({ error: 'Tidak terautentikasi' }, 401)
      const target = await db.collection('peserta').findOne({ id: p[1] })
      if (!target) return json({ error: 'Peserta tidak ditemukan' }, 404)
      if (u.role === 'admin_madrasah' && target.created_by !== u.id) return json({ error: 'Anda hanya dapat mengubah peserta milik madrasah Anda' }, 403)
      const b = await request.json()
      const set = {}
      ;['participant_name', 'gender', 'nisn', 'ttl', 'madrasah_name', 'lomba_id', 'files', 'status', 'nomor_peserta'].forEach(k => { if (b[k] !== undefined) set[k] = b[k] })
      if (b.lomba_id !== undefined) {
        const lomba = await db.collection('lomba').findOne({ id: b.lomba_id })
        set.lomba_name = lomba ? lomba.name : ''
      }
      const merged = { ...target, ...set }
      set.complete = computeComplete(merged)
      await db.collection('peserta').updateOne({ id: p[1] }, { $set: set })
      const doc = await db.collection('peserta').findOne({ id: p[1] })
      return json(clean(doc))
    }
    if (p[0] === 'peserta' && p[1] && method === 'DELETE') {
      const u = await getUser(request)
      if (!u) return json({ error: 'Tidak terautentikasi' }, 401)
      const existing = await db.collection('peserta').findOne({ id: p[1] })
      if (!existing) return json({ error: 'Peserta tidak ditemukan' }, 404)
      if (u.role === 'panitia') return json({ error: 'Panitia tidak dapat menghapus data pendaftar' }, 403)
      if (u.role === 'admin_madrasah' && existing.created_by !== u.id) return json({ error: 'Anda hanya dapat menghapus peserta milik madrasah Anda' }, 403)
      await db.collection('peserta').deleteOne({ id: p[1] })
      return json({ ok: true })
    }

    // ---------- HASIL ----------
    if (route === '/hasil' && method === 'GET') {
      const u = await getUser(request)
      if (!u) return json({ error: 'Tidak terautentikasi' }, 401)
      const url = new URL(request.url)
      const lomba_id = url.searchParams.get('lomba_id') || (u.role === 'panitia' ? u.assigned_lomba_id : null)
      const q = lomba_id ? { lomba_id } : {}
      const list = await db.collection('hasil').find(q).sort({ created_at: -1 }).toArray()
      return json(list.map(clean))
    }
    if (route === '/hasil' && method === 'POST') {
      const u = await getUser(request)
      if (!u) return json({ error: 'Tidak terautentikasi' }, 401)
      const b = await request.json()
      const doc = { id: uuidv4(), lomba_id: b.lomba_id, uploaded_score_sheet_url: b.uploaded_score_sheet_url, note: b.note || '', created_by: u.id, created_at: new Date() }
      await db.collection('hasil').insertOne(doc)
      return json(clean(doc))
    }

    // ---------- JUARA ----------
    if (route === '/juara' && method === 'GET') {
      const u = await getUser(request)
      if (!u) return json({ error: 'Tidak terautentikasi' }, 401)
      const url = new URL(request.url)
      const lomba_id = url.searchParams.get('lomba_id')
      let q = {}
      if (lomba_id) q = { lomba_id }
      else if (u.role === 'panitia') q = { lomba_id: u.assigned_lomba_id }
      const list = await db.collection('juara').find(q).toArray()
      return json(list.map(clean))
    }
    if (route === '/juara' && method === 'POST') {
      const u = await getUser(request)
      if (!u) return json({ error: 'Tidak terautentikasi' }, 401)
      const b = await request.json()
      const gender = b.gender === 'P' ? 'P' : (b.gender === 'L' ? 'L' : '')
      // one winner per rank per gender per lomba -> upsert
      await db.collection('juara').deleteMany({ lomba_id: b.lomba_id, rank: b.rank, gender })
      const lomba = await db.collection('lomba').findOne({ id: b.lomba_id })
      const isGroup = (b.is_group !== undefined) ? !!b.is_group : (lomba && lomba.type === 'kelompok')
      let doc
      if (isGroup) {
        // group winner keyed by madrasah
        doc = {
          id: uuidv4(), lomba_id: b.lomba_id, peserta_id: null, rank: b.rank, gender,
          is_group: true,
          participant_name: b.madrasah_name || '', madrasah_name: b.madrasah_name || '',
          certificate_url: null, created_at: new Date(),
        }
      } else {
        const peserta = await db.collection('peserta').findOne({ id: b.peserta_id })
        doc = {
          id: uuidv4(), lomba_id: b.lomba_id, peserta_id: b.peserta_id, rank: b.rank, gender,
          is_group: false,
          participant_name: peserta ? peserta.participant_name : '', madrasah_name: peserta ? peserta.madrasah_name : '',
          certificate_url: null, created_at: new Date(),
        }
      }
      await db.collection('juara').insertOne(doc)
      return json(clean(doc))
    }
    if (p[0] === 'juara' && p[1] && method === 'DELETE') {
      const u = await getUser(request)
      if (!u) return json({ error: 'Tidak terautentikasi' }, 401)
      await db.collection('juara').deleteOne({ id: p[1] })
      return json({ ok: true })
    }

    // ---------- TEMPLATES (certificate / idcard) ----------
    if (route === '/templates' && method === 'GET') {
      const url = new URL(request.url)
      const type = url.searchParams.get('type')
      const q = type ? { type } : {}
      const list = await db.collection('templates').find(q).toArray()
      return json(list.map(clean))
    }
    if (route === '/templates' && method === 'POST') {
      const u = await getUser(request)
      if (!u || u.role !== 'super_admin') return json({ error: 'Akses ditolak' }, 403)
      const b = await request.json()
      const existing = await db.collection('templates').findOne({ type: b.type })
      if (existing) {
        await db.collection('templates').updateOne({ type: b.type }, { $set: { image_url: b.image_url, fields: b.fields || [] } })
      } else {
        await db.collection('templates').insertOne({ id: uuidv4(), type: b.type, image_url: b.image_url, fields: b.fields || [], created_at: new Date() })
      }
      const doc = await db.collection('templates').findOne({ type: b.type })
      return json(clean(doc))
    }

    // ---------- BACKUP & RESTORE (super_admin) ----------
    const BACKUP_COLLECTIONS = ['users', 'lomba', 'peserta', 'hasil', 'juara', 'templates', 'files', 'settings']
    if (route === '/admin/backup' && method === 'GET') {
      const u = await getUser(request)
      if (!u || u.role !== 'super_admin') return json({ error: 'Akses ditolak' }, 403)
      const data = {}
      for (const c of BACKUP_COLLECTIONS) {
        const docs = await db.collection(c).find({}).toArray()
        data[c] = docs.map((d) => { const { _id, ...rest } = d; return rest })
      }
      const payload = { app: 'sim-porseni', version: 1, exported_at: new Date().toISOString(), collections: data }
      return json(payload)
    }
    if (route === '/admin/restore' && method === 'POST') {
      const u = await getUser(request)
      if (!u || u.role !== 'super_admin') return json({ error: 'Akses ditolak' }, 403)
      const b = await request.json()
      const cols = b && b.collections ? b.collections : null
      if (!cols || typeof cols !== 'object') return json({ error: 'Format backup tidak valid' }, 400)
      const summary = {}
      for (const c of BACKUP_COLLECTIONS) {
        if (!Array.isArray(cols[c])) continue
        // preserve current super_admin session so operator is not locked out
        const clean = cols[c].map((d) => { const { _id, ...rest } = d; return rest })
        await db.collection(c).deleteMany({})
        if (clean.length) await db.collection(c).insertMany(clean)
        summary[c] = clean.length
      }
      // ensure current super_admin still exists & keeps a valid token
      const meStill = await db.collection('users').findOne({ id: u.id })
      if (meStill) {
        await db.collection('users').updateOne({ id: u.id }, { $set: { token: u.token, status: 'verified' }, $addToSet: { tokens: u.token } })
      } else {
        await db.collection('users').insertOne({ ...u })
      }
      return json({ ok: true, restored: summary })
    }

    return json({ error: `Route ${route} not found` }, 404)
  } catch (error) {
    console.error('API Error:', error)
    return json({ error: 'Internal server error', detail: String(error && error.message || error) }, 500)
  }
}

export const GET = handleRoute
export const POST = handleRoute
export const PUT = handleRoute
export const DELETE = handleRoute
export const PATCH = handleRoute
