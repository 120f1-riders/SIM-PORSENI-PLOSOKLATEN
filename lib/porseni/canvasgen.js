export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

// Pecah teks menjadi baris: hormati Enter (\n) + word-wrap otomatis sesuai maxWidthPx
export function wrapText(ctx, text, maxWidthPx) {
  const paragraphs = String(text == null ? '' : text).split('\n')
  const lines = []
  for (const para of paragraphs) {
    if (!maxWidthPx || maxWidthPx <= 0) { lines.push(para); continue }
    const words = para.split(/\s+/).filter(Boolean)
    if (words.length === 0) { lines.push(''); continue }
    let cur = ''
    for (const w of words) {
      const test = cur ? cur + ' ' + w : w
      if (ctx.measureText(test).width > maxWidthPx && cur) { lines.push(cur); cur = w }
      else cur = test
    }
    if (cur) lines.push(cur)
  }
  return lines.length ? lines : ['']
}

// Ukuran font terlebar dari teks setelah dibungkus
function widestLine(ctx, lines) {
  let w = 0
  for (const ln of lines) { const m = ctx.measureText(ln).width; if (m > w) w = m }
  return w
}

// Cari ukuran font agar teks MUAT di dalam maxWidthPx & tidak melebihi maxLines baris.
// Font akan dikecilkan bertahap dari baseSizePx sampai muat atau mencapai minSizePx.
export function computeFitSize(ctx, text, { baseSizePx, maxWidthPx, maxLines = 2, minSizePx, bold, font }) {
  const min = minSizePx || Math.max(6, baseSizePx * 0.35)
  const step = Math.max(0.5, baseSizePx * 0.02)
  let size = baseSizePx
  while (size > min) {
    ctx.font = `${bold ? 'bold ' : ''}${size}px ${font || 'Georgia, serif'}`
    const lines = wrapText(ctx, text, maxWidthPx)
    const tooManyLines = maxLines && lines.length > maxLines
    const tooWide = maxWidthPx && widestLine(ctx, lines) > maxWidthPx
    if (!tooManyLines && !tooWide) break
    size -= step
  }
  return Math.max(min, size)
}

export async function renderOverlay({ templateSrc, fields = [], values = {} }) {
  const img = await loadImage(templateSrc)
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth || 1200
  canvas.height = img.naturalHeight || 850
  const ctx = canvas.getContext('2d')
  const W = canvas.width
  const H = canvas.height
  ctx.drawImage(img, 0, 0, W, H)

  // Simpan posisi bawah tiap elemen (px) agar elemen lain bisa mengalir otomatis di bawahnya
  const bottomOf = {}

  for (const f of fields) {
    if (f.type === 'photo') {
      const src = values[f.key]
      if (src) {
        try {
          const ph = await loadImage(src)
          const x = (f.x / 100) * W
          const y = (f.y / 100) * H
          const w = ((f.w || 22) / 100) * W
          const h = ((f.h || 30) / 100) * H
          ctx.drawImage(ph, x, y, w, h)
          bottomOf[f.key] = y + h
        } catch (e) { /* ignore */ }
      }
      continue
    }
    const val = values[f.key] != null ? values[f.key] : (f.label || '')
    let size = (f.size || 0.04) * W
    const maxW = f.maxWidth ? (f.maxWidth / 100) * W : 0
    // AUTO-KECIL: kecilkan font otomatis agar nama panjang tetap muat & tidak menabrak elemen lain
    if (f.autoFit && maxW > 0) {
      size = computeFitSize(ctx, val, {
        baseSizePx: size,
        maxWidthPx: maxW,
        maxLines: f.maxLines || 2,
        bold: f.bold,
        font: f.font || 'Georgia, serif',
      })
    }
    ctx.font = `${f.bold ? 'bold ' : ''}${size}px ${f.font || 'Georgia, serif'}`
    ctx.fillStyle = f.color || '#111827'
    ctx.textAlign = f.align || 'center'
    ctx.textBaseline = 'middle'
    const lines = wrapText(ctx, val, maxW)
    const lineH = size * 1.18
    const x = (f.x / 100) * W
    // POSISI OTOMATIS (flow): jika field mengikuti elemen lain, tempatkan sedikit di bawahnya
    let startY
    if (f.flowBelow && bottomOf[f.flowBelow] != null) {
      const gapPx = ((f.flowGap != null ? f.flowGap : 2) / 100) * H
      startY = bottomOf[f.flowBelow] + gapPx + lineH / 2
    } else if (f.vAlign === 'top') {
      // RATA-ATAS: baris pertama selalu mulai di titik Y yang sama (konsisten untuk nama 1/2 baris)
      startY = (f.y / 100) * H
    } else {
      startY = (f.y / 100) * H - ((lines.length - 1) * lineH) / 2
    }
    lines.forEach((ln, li) => ctx.fillText(ln, x, startY + li * lineH))
    bottomOf[f.key] = startY + (lines.length - 1) * lineH + lineH / 2
  }
  return canvas.toDataURL('image/png')
}

export function downloadDataUrl(dataUrl, filename) {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
}
