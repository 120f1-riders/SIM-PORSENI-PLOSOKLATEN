'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PESERTA_SORT_OPTIONS } from '@/lib/porseni/constants'

export function SortSelect({ value, onChange, className = 'w-44' }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Urutkan:</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={className}><SelectValue /></SelectTrigger>
        <SelectContent>
          {PESERTA_SORT_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  )
}

export function StatCard({ icon: Icon, label, value, hint, color = 'text-primary' }) {
  return (
    <Card className="p-5 flex items-center gap-4">
      <div className={`h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center ${color}`}>
        {Icon && <Icon className="h-6 w-6" />}
      </div>
      <div>
        <div className="text-2xl font-bold leading-tight">{value}</div>
        <div className="text-sm text-muted-foreground">{label}</div>
        {hint && <div className="text-xs text-muted-foreground/70 mt-0.5">{hint}</div>}
      </div>
    </Card>
  )
}

export function StatusBadge({ status }) {
  if (status === 'verified') return <Badge className="bg-primary text-primary-foreground">Terverifikasi</Badge>
  if (status === 'pending') return <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200">Menunggu</Badge>
  return <Badge variant="outline">{status}</Badge>
}

export function PageHeader({ title, desc, children }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {desc && <p className="text-muted-foreground text-sm mt-1">{desc}</p>}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  )
}

export function Empty({ text = 'Belum ada data.' }) {
  return <div className="text-center py-12 text-muted-foreground text-sm">{text}</div>
}
