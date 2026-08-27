// Renders the real Parkday app icon SVG into the PNG sizes the PWA manifest
// and iOS need. Run with: node scripts/generate-pwa-icons.mjs
import sharp from 'sharp'
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, '..', 'public')
const sourceSvg = readFileSync(join(publicDir, 'assets', 'logos', 'parkday-app-icon-navy.svg'))
const faviconSvg = readFileSync(join(publicDir, 'assets', 'logos', 'parkday-favicon.svg'))

const NAVY = '#0D2340'

// Minimal ICO container wrapping a single PNG image — sharp can't write
// .ico directly, but modern browsers accept a PNG-in-ICO just fine.
function wrapPngAsIco(pngBuffer, size) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2) // type: icon
  header.writeUInt16LE(1, 4) // 1 image

  const entry = Buffer.alloc(16)
  entry[0] = size >= 256 ? 0 : size // width
  entry[1] = size >= 256 ? 0 : size // height
  entry.writeUInt16LE(1, 4) // color planes
  entry.writeUInt16LE(32, 6) // bits per pixel
  entry.writeUInt32LE(pngBuffer.length, 8)
  entry.writeUInt32LE(header.length + entry.length, 12) // offset

  return Buffer.concat([header, entry, pngBuffer])
}

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

const faviconPng = await sharp(faviconSvg, { density: 384 }).resize(32, 32).png().toBuffer()
writeFileSync(join(publicDir, 'favicon.ico'), wrapPngAsIco(faviconPng, 32))

console.log('Generated PWA icons from parkday-app-icon-navy.svg and favicon.ico from parkday-favicon.svg')
