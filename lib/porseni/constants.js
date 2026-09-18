export const ROLES = [
  { value: 'admin_madrasah', label: 'Admin Madrasah' },
  { value: 'panitia', label: 'Panitia Lomba' },
  { value: 'super_admin', label: 'Super Admin (Pusat)' },
]

export const ROLE_LABEL = {
  admin_madrasah: 'Admin Madrasah',
  panitia: 'Panitia Lomba',
  super_admin: 'Super Admin',
}

export const CATEGORIES = ['Olahraga', 'Seni']

export const LOMBA_TYPES = [
  { value: 'individu', label: 'Individu' },
  { value: 'kelompok', label: 'Kelompok' },
]

export const GENDERS = [
  { value: 'L', label: 'Laki-laki' },
  { value: 'P', label: 'Perempuan' },
]

export const GENDER_LABEL = { L: 'Laki-laki', P: 'Perempuan' }

// Label jenis kelamin untuk sertifikat & ID card (sesuai permintaan: Putra/Putri)
export const GENDER_CERT_LABEL = { L: 'Putra', P: 'Putri' }

export const REQ_FILES = [
  { key: 'akte', label: 'Akte Kelahiran' },
  { key: 'surat_ket', label: 'Surat Keterangan Kepala Madrasah' },
  { key: 'pas_photo', label: 'Pas Photo 3x4 (maks 10MB)' },
  { key: 'nisn_doc', label: 'Upload NISN (Kartu/Bukti NISN)' },
  { key: 'raport', label: 'Upload Raport' },
]

export const RANKS = ['Juara 1', 'Juara 2', 'Juara 3', 'Harapan 1', 'Harapan 2', 'Harapan 3']

export const APP_TITLE = 'Porseni MI Kecamatan Plosoklaten'

// ==========================================================================
// UKURAN OUTPUT TEMPLATE (ID CARD & SERTIFIKAT)
// Cukup ATUR SEKALI di sini -> berlaku untuk SEMUA template.
// Naikkan nilainya untuk hasil lebih tajam saat dicetak (mis. 2400 / 3000).
// ==========================================================================
export const OUTPUT_WIDTH = 2000

export const CERT_DEFAULT_FIELDS = [
  { key: 'photo', type: 'photo', x: 42, y: 18, w: 16, h: 22 },
  { key: 'participant_name', label: 'Nama Peserta', x: 50, y: 46, size: 0.05, color: '#166534', align: 'center', bold: true, font: 'Georgia, serif', maxWidth: 80, autoFit: true, maxLines: 2 },
  { key: 'madrasah_name', label: 'Asal Madrasah', x: 50, y: 56, size: 0.028, color: '#1f2937', align: 'center', bold: false, font: 'Georgia, serif', maxWidth: 80 },
  { key: 'lomba_name', label: 'Cabang Lomba', x: 50, y: 64, size: 0.03, color: '#1f2937', align: 'center', bold: true, font: 'Georgia, serif' },
  { key: 'gender_label', label: 'Jenis Kelamin', x: 50, y: 68, size: 0.026, color: '#1f2937', align: 'center', bold: false, font: 'Georgia, serif' },
  { key: 'rank', label: 'Juara 1', x: 50, y: 72, size: 0.035, color: '#b45309', align: 'center', bold: true, font: 'Georgia, serif' },
]

export const CERT_PANITIA_FIELDS = [
  { key: 'photo', type: 'photo', x: 42, y: 18, w: 16, h: 22 },
  { key: 'name', label: 'Nama Panitia', x: 50, y: 46, size: 0.05, color: '#166534', align: 'center', bold: true, font: 'Georgia, serif', maxWidth: 80, autoFit: true, maxLines: 2 },
  { key: 'gender_label', label: 'Jenis Kelamin', x: 50, y: 52, size: 0.026, color: '#1f2937', align: 'center', bold: false, font: 'Georgia, serif' },
  { key: 'lomba_name', label: 'Divisi / Cabang Lomba', x: 50, y: 58, size: 0.03, color: '#1f2937', align: 'center', bold: true, font: 'Georgia, serif' },
]

export const IDCARD_PESERTA_FIELDS = [
  { key: 'photo', type: 'photo', x: 8, y: 28, w: 26, h: 34 },
  { key: 'participant_name', label: 'Nama Peserta', x: 40, y: 34, size: 0.05, color: '#166534', align: 'left', bold: true, font: 'Arial, sans-serif', maxWidth: 55, autoFit: true, maxLines: 2 },
  { key: 'madrasah_name', label: 'Asal Madrasah', x: 40, y: 45, size: 0.035, color: '#1f2937', align: 'left', bold: false, font: 'Arial, sans-serif', maxWidth: 55, flowBelow: 'participant_name', flowGap: 2 },
  { key: 'lomba_name', label: 'Cabang Lomba', x: 40, y: 55, size: 0.035, color: '#1f2937', align: 'left', bold: false, font: 'Arial, sans-serif' },
  { key: 'gender_label', label: 'Jenis Kelamin', x: 40, y: 62, size: 0.032, color: '#1f2937', align: 'left', bold: false, font: 'Arial, sans-serif' },
  { key: 'nomor_peserta', label: '001', x: 40, y: 69, size: 0.04, color: '#b45309', align: 'left', bold: true, font: 'Arial, sans-serif' },
]

export const IDCARD_PANITIA_FIELDS = [
  { key: 'photo', type: 'photo', x: 8, y: 28, w: 26, h: 34 },
  { key: 'name', label: 'Nama Panitia', x: 40, y: 34, size: 0.05, color: '#166534', align: 'left', bold: true, font: 'Arial, sans-serif', maxWidth: 55, autoFit: true, maxLines: 2 },
  { key: 'gender_label', label: 'Jenis Kelamin', x: 40, y: 44, size: 0.032, color: '#1f2937', align: 'left', bold: false, font: 'Arial, sans-serif' },
  { key: 'role_label', label: 'Panitia / Juri', x: 40, y: 52, size: 0.035, color: '#1f2937', align: 'left', bold: false, font: 'Arial, sans-serif' },
  { key: 'lomba_name', label: 'Cabang Lomba', x: 40, y: 60, size: 0.035, color: '#1f2937', align: 'left', bold: false, font: 'Arial, sans-serif' },
]
