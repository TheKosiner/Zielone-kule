// Kompresja zdjęć w przeglądarce: zdjęcie z telefonu (3–8 MB) → JPEG ok. 200–400 kB + miniatura.

async function loadImage(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' })
    } catch {
      /* np. HEIC poza Safari – próbujemy przez <img> */
    }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.decoding = 'async'
    img.src = url
    await img.decode()
    return img
  } finally {
    URL.revokeObjectURL(url)
  }
}

function drawScaled(source: ImageBitmap | HTMLImageElement, maxDim: number, quality: number): Promise<{ blob: Blob; width: number; height: number }> {
  const sw = 'naturalWidth' in source ? source.naturalWidth : source.width
  const sh = 'naturalHeight' in source ? source.naturalHeight : source.height
  const scale = Math.min(1, maxDim / Math.max(sw, sh))
  const width = Math.round(sw * scale)
  const height = Math.round(sh * scale)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, 0, 0, width, height)
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve({ blob, width, height }) : reject(new Error('Nie udało się zapisać zdjęcia'))), 'image/jpeg', quality),
  )
}

export async function compressImage(file: Blob, maxDim = 1600, quality = 0.8): Promise<{ blob: Blob; thumb: Blob; width: number; height: number }> {
  const img = await loadImage(file)
  const full = await drawScaled(img, maxDim, quality)
  const thumb = await drawScaled(img, 360, 0.72)
  if ('close' in img) img.close()
  return { blob: full.blob, thumb: thumb.blob, width: full.width, height: full.height }
}
