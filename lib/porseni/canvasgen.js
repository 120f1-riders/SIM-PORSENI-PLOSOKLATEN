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
function wrapText(ctx, text, maxWidthPx) {
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

export async function renderOverlay({ templateSrc, fields = [], values = {} }) {
  const img = await loadImage(templateSrc)
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth || 1200
  canvas.height = img.naturalHeight || 850
  const ctx = canvas.getContext('2d')
  const W = canvas.width
  const H = canvas.height
  ctx.drawImage(img, 0, 0, W, H)

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
        } catch (e) { /* ignore */ }
      }
      continue
    }
    const val = values[f.key] != null ? values[f.key] : (f.label || '')
    const size = (f.size || 0.04) * W
    ctx.font = `${f.bold ? 'bold ' : ''}${size}px ${f.font || 'Georgia, serif'}`
    ctx.fillStyle = f.color || '#111827'
    ctx.textAlign = f.align || 'center'
    ctx.textBaseline = 'middle'
    const maxW = f.maxWidth ? (f.maxWidth / 100) * W : 0
    const lines = wrapText(ctx, val, maxW)
    const lineH = size * 1.18
    const x = (f.x / 100) * W
    const startY = (f.y / 100) * H - ((lines.length - 1) * lineH) / 2
    lines.forEach((ln, li) => ctx.fillText(ln, x, startY + li * lineH))
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
