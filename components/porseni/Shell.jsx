'use client'

import { useState } from 'react'
import {
  LayoutDashboard, UserPlus, Users, Trophy, ShieldCheck, Award, IdCard,
  Printer, Upload, LogOut, GraduationCap, Menu, X, User, Cloud, Database, Medal,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ROLE_LABEL } from '@/lib/porseni/constants'
import AdminMadrasah from '@/components/porseni/AdminMadrasah'
import Panitia from '@/components/porseni/Panitia'
import SuperAdmin from '@/components/porseni/SuperAdmin'
import ProfileView from '@/components/porseni/ProfileView'

const MENUS = {
  super_admin: [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'lomba', label: 'Manajemen Lomba', icon: Trophy },
    { id: 'pengguna', label: 'Manajemen Pengguna', icon: ShieldCheck },
    { id: 'pendaftar', label: 'Data Pendaftar', icon: Users },
    { id: 'cetak', label: 'Cetak Administrasi', icon: Printer },
    { id: 'juara', label: 'Manajemen Juara', icon: Medal },
    { id: 'sertifikat', label: 'Manajemen Sertifikat', icon: Award },
    { id: 'idcard', label: 'ID Card', icon: IdCard },
    { id: 'integrasi', label: 'Integrasi Google', icon: Cloud },
    { id: 'backup', label: 'Backup & Restore', icon: Database },
    { id: 'profil', label: 'Profil Saya', icon: User },
  ],
  admin_madrasah: [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'pendaftaran', label: 'Pendaftaran Peserta', icon: UserPlus },
    { id: 'peserta', label: 'Daftar Peserta Saya', icon: Users },
    { id: 'profil', label: 'Profil Saya', icon: User },
  ],
  panitia: [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'peserta', label: 'Daftar Peserta', icon: Users },
    { id: 'cetak', label: 'Cetak Administrasi', icon: Printer },
    { id: 'idcard', label: 'ID Card', icon: IdCard },
    { id: 'hasil', label: 'Upload Hasil & Juara', icon: Upload },
    { id: 'profil', label: 'Profil Saya', icon: User },
  ],
}

export default function Shell({ user, onLogout, onUserUpdate }) {
  const menus = MENUS[user.role] || []
  const [active, setActive] = useState(menus[0]?.id || 'dashboard')
  const [open, setOpen] = useState(false)

  const Sidebar = (
    <aside className="w-64 shrink-0 bg-sidebar text-sidebar-foreground flex flex-col h-full">
      <div className="p-5 border-b border-sidebar-border flex items-center gap-2">
        <div className="h-9 w-9 rounded-lg bg-sidebar-primary/20 flex items-center justify-center overflow-hidden">
          {user.photo_url
            ? <img src={user.photo_url} alt="Foto" className="h-full w-full object-cover" />
            : <GraduationCap className="h-5 w-5 text-sidebar-primary" />}
        </div>
        <div className="leading-tight">
          <div className="font-bold text-sm">SIM Porseni</div>
          <div className="text-xs text-sidebar-foreground/60">MI Plosoklaten</div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {menus.map((m) => {
          const Icon = m.icon
          const isActive = active === m.id
          return (
            <button
              key={m.id}
              onClick={() => { setActive(m.id); setOpen(false) }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${isActive ? 'bg-sidebar-primary text-sidebar-primary-foreground font-medium' : 'text-sidebar-foreground/80 hover:bg-sidebar-accent'}`}
            >
              <Icon className="h-4 w-4" />
              {m.label}
            </button>
          )
        })}
      </nav>
      <div className="p-3 border-t border-sidebar-border">
        <div className="px-3 py-2 mb-2">
          <div className="text-sm font-medium truncate">{user.name}</div>
          <div className="text-xs text-sidebar-foreground/60">{ROLE_LABEL[user.role]}</div>
          {user.madrasah_name && <div className="text-xs text-sidebar-foreground/60 truncate">{user.madrasah_name}</div>}
        </div>
        <Button variant="ghost" className="w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground" onClick={onLogout}>
          <LogOut className="h-4 w-4 mr-2" /> Keluar
        </Button>
      </div>
    </aside>
  )

  return (
    <div className="min-h-screen flex bg-green-50/40">
      {/* Desktop sidebar */}
      <div className="hidden md:block screen-only">{Sidebar}</div>

      {/* Mobile sidebar */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex screen-only">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="relative z-10 h-full">{Sidebar}</div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden screen-only sticky top-0 z-40 bg-white border-b flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2 text-primary font-bold">
            {user.photo_url
              ? <img src={user.photo_url} alt="Foto" className="h-6 w-6 rounded object-cover" />
              : <GraduationCap className="h-5 w-5" />} SIM Porseni
          </div>
          <Button size="icon" variant="ghost" onClick={() => setOpen(!open)}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </header>

        <main className="flex-1 p-4 md:p-8 max-w-[1400px] w-full mx-auto">
          {active === 'profil' ? (
            <ProfileView user={user} onUpdated={onUserUpdate} />
          ) : (
            <>
              {user.role === 'super_admin' && <SuperAdmin view={active} user={user} />}
              {user.role === 'admin_madrasah' && <AdminMadrasah view={active} user={user} />}
              {user.role === 'panitia' && <Panitia view={active} user={user} />}
            </>
          )}
        </main>
      </div>
    </div>
  )
}
