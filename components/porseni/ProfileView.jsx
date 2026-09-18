'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Upload, User, Save, KeyRound, Eye, EyeOff } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PageHeader } from '@/components/porseni/shared'
import { api, uploadFile, fileUrl } from '@/lib/porseni/api'
import { ROLE_LABEL, GENDERS } from '@/lib/porseni/constants'

export default function ProfileView({ user, onUpdated }) {
  const [profile, setProfile] = useState(null)
  const [lomba, setLomba] = useState([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [gender, setGender] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [photoUrl, setPhotoUrl] = useState(null)
  const [saving, setSaving] = useState(false)
  const [busyPhoto, setBusyPhoto] = useState(false)
  const ref = useRef(null)

  const load = async () => {
    setLoading(true)
    try {
      const [p, l] = await Promise.all([api('/auth/profile'), api('/lomba').catch(() => [])])
      setProfile(p)
      setName(p.name || '')
      setGender(p.gender || '')
      setPhotoUrl(p.photo_url || null)
      setLomba(l || [])
    } catch (e) { toast.error(e.message) } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const lombaName = (id) => lomba.find((l) => l.id === id)?.name || '-'

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0]
    if (ref.current) ref.current.value = ''
    if (!file) return
    if (file.size > 10 * 1024 * 1024) return toast.error('Ukuran maksimal 10MB')
    setBusyPhoto(true)
    try {
      const up = await uploadFile(file)
      setPhotoUrl(fileUrl(up.id))
      toast.success('Foto terunggah. Klik Simpan untuk menyimpan.')
    } catch (err) { toast.error(err.message) } finally { setBusyPhoto(false) }
  }

  const save = async () => {
    if (!name.trim()) return toast.error('Nama tidak boleh kosong')
    if (password && password.length < 4) return toast.error('Sandi minimal 4 karakter')
    setSaving(true)
    try {
      const body = { name: name.trim(), photo_url: photoUrl, gender }
      if (password) body.password = password
      const updated = await api('/auth/profile', { method: 'PUT', body })
      toast.success('Profil berhasil diperbarui')
      setPassword('')
      setProfile(updated)
      if (onUpdated) onUpdated({ ...user, name: updated.name, photo_url: updated.photo_url })
    } catch (e) { toast.error(e.message) } finally { setSaving(false) }
  }

  if (loading || !profile) {
    return (
      <div>
        <PageHeader title="Profil Saya" desc="Kelola informasi akun Anda" />
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Profil Saya" desc="Kelola informasi akun Anda" />
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Photo card */}
        <Card className="p-6 flex flex-col items-center text-center">
          <div className="h-32 w-32 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center border-4 border-primary/20">
            {photoUrl ? <img src={photoUrl} alt="Foto" className="h-full w-full object-cover" /> : <User className="h-14 w-14 text-primary/50" />}
          </div>
          <div className="mt-4 font-semibold text-lg">{profile.name}</div>
          <div className="text-sm text-muted-foreground">{ROLE_LABEL[profile.role] || profile.role}</div>
          <input ref={ref} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
          <Button variant="outline" size="sm" className="mt-4" disabled={busyPhoto} onClick={() => ref.current?.click()}>
            {busyPhoto ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
            {photoUrl ? 'Ganti Foto' : 'Unggah Foto'}
          </Button>
          <p className="text-xs text-muted-foreground mt-2">Foto ini dipakai pada ID Card & Sertifikat.</p>
        </Card>

        {/* Data card */}
        <Card className="p-6 lg:col-span-2 space-y-4">
          <h3 className="font-semibold">Informasi Akun</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Nama Lengkap</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama lengkap" />
            </div>
            <div className="space-y-1.5">
              <Label>User (Email)</Label>
              <Input value={profile.email} disabled />
            </div>
            {profile.role === 'admin_madrasah' && (
              <div className="space-y-1.5">
                <Label>Asal Madrasah</Label>
                <Input value={profile.madrasah_name || '-'} disabled />
              </div>
            )}
            {profile.role === 'panitia' && (
              <div className="space-y-1.5">
                <Label>Divisi / Cabang Lomba</Label>
                <Input value={lombaName(profile.assigned_lomba_id)} disabled />
              </div>
            )}
            {profile.role !== 'super_admin' && (
              <div className="space-y-1.5">
                <Label>Jenis Kelamin (untuk Sertifikat & ID Card)</Label>
                <Select value={gender || 'none'} onValueChange={(v) => setGender(v === 'none' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder="Pilih jenis kelamin" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">- Tidak diisi -</SelectItem>
                    {GENDERS.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Peran / Role</Label>
              <Input value={ROLE_LABEL[profile.role] || profile.role} disabled />
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="font-semibold flex items-center gap-2 mb-3"><KeyRound className="h-4 w-4 text-primary" />Kata Sandi</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Sandi Saat Ini</Label>
                <div className="flex items-center gap-1">
                  <Input type={showPw ? 'text' : 'password'} value={profile.password_plain || ''} disabled className="font-mono" />
                  <Button type="button" size="icon" variant="ghost" onClick={() => setShowPw((s) => !s)}>
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Sandi Baru (opsional)</Label>
                <Input type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Kosongkan jika tidak diubah" />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}Simpan Perubahan
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
