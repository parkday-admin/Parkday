// Renders the real Parkday app icon SVG into the PNG sizes the PWA manifest
// and iOS need. Run with: node scripts/generate-pwa-icons.mjs
import sharp from 'sharp'
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, '..', 'public')
const sourceSvg = readFileSync(join(publicDir, 'assets', 'logos', 'parkday-app-icon-navy.svg'))

const NAVY = '#0D2340'

mkdirSync(join(publicDir, 'icons'), { recursive: true })

async function renderFullBleed(size, outPath) {
  const buf = await sharp(sourceSvg, { density: 384 }).resize(size, size).png().toBuffer()
  writeFileSync(outPath, buf)
}

async function renderMaskable(size, outPath) {
  const inset = Math.round(size * 0.8)
  const icon = await sharp(sourceSvg, { density: 384 }).resize(inset, inset).png().toBuffer()
  const buf = await sharp({
    create: { width: size, height: size, channels: 4, background: NAVY },
  })
    .composite([{ input: icon, gravity: 'center' }])
    .png()
    .toBuffer()
  writeFileSync(outPath, buf)
}

await renderFullBleed(192, join(publicDir, 'icons', 'icon-192.png'))
await renderFullBleed(512, join(publicDir, 'icons', 'icon-512.png'))
await renderMaskable(512, join(publicDir, 'icons', 'icon-512-maskable.png'))
await renderFullBleed(180, join(publicDir, 'apple-touch-icon.png'))

console.log('Generated PWA icons from parkday-app-icon-navy.svg')
