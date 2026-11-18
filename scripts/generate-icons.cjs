// Generuje ikony PWA z public/favicon.svg (wymaga Playwright z Chromium).
// Uruchomienie: node scripts/generate-icons.cjs
const { chromium } = require('playwright')
const fs = require('node:fs')
const path = require('node:path')

const svg = fs.readFileSync(path.join(__dirname, '../public/favicon.svg'), 'utf8')
const out = path.join(__dirname, '../public')

const ICONS = [
  { file: 'pwa-192.png', size: 192, bg: '#F6F9F3', scale: 0.86 },
  { file: 'pwa-512.png', size: 512, bg: '#F6F9F3', scale: 0.86 },
  // maskable: logo w bezpiecznej strefie (ok. 60%) na pełnym tle
  { file: 'pwa-maskable-512.png', size: 512, bg: '#2F4A2C', scale: 0.62 },
  { file: 'apple-touch-icon.png', size: 180, bg: '#F6F9F3', scale: 0.8 },
]

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage()
  for (const icon of ICONS) {
    const inner = Math.round(icon.size * icon.scale)
    await page.setViewportSize({ width: icon.size, height: icon.size })
    await page.setContent(
      `<html><body style="margin:0;width:${icon.size}px;height:${icon.size}px;background:${icon.bg};display:flex;align-items:center;justify-content:center">
        <div style="width:${inner}px;height:${inner}px">${svg.replace('<svg ', `<svg width="${inner}" height="${inner}" `)}</div>
      </body></html>`,
    )
    await page.screenshot({ path: path.join(out, icon.file), omitBackground: false })
    console.log('✓', icon.file)
  }
  await browser.close()
})()
