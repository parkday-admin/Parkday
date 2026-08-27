// Placeholder PWA icon generator — navy square with a white circle, no
// external image deps. Encodes raw PNG chunks by hand (IHDR/IDAT/IEND) and
// wraps a PNG in a minimal ICO container for the favicon. Design polish
// (real artwork) comes later; these just satisfy manifest/icon requirements.
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, '..', 'public')

const NAVY = [0x0d, 0x23, 0x40]
const WHITE = [0xff, 0xff, 0xff]

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii')
  const lenBuf = Buffer.alloc(4)
  lenBuf.writeUInt32BE(data.length, 0)
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf])
}

// size: canvas size; circlePad: extra inset fraction for maskable safe area
function renderRGBA(size, circlePad = 0) {
  const raw = Buffer.alloc(size * size * 4)
  const cx = size / 2
  const cy = size / 2
  const r = size / 2 * (1 - circlePad) * 0.55
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx
      const dy = y - cy
      const inCircle = dx * dx + dy * dy <= r * r
      const [cr, cg, cb] = inCircle ? WHITE : NAVY
      const i = (y * size + x) * 4
      raw[i] = cr
      raw[i + 1] = cg
      raw[i + 2] = cb
      raw[i + 3] = 0xff
    }
  }
  return raw
}

function encodePNG(size, circlePad = 0) {
  const raw = renderRGBA(size, circlePad)
  // Each scanline prefixed with filter-type byte 0 (none)
  const stride = size * 4
  const withFilter = Buffer.alloc((stride + 1) * size)
  for (let y = 0; y < size; y++) {
    withFilter[y * (stride + 1)] = 0
    raw.copy(withFilter, y * (stride + 1) + 1, y * stride, y * stride + stride)
  }
  const idatData = deflateSync(withFilter)

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type: RGBA
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', idatData),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function encodeICO(size) {
  const png = encodePNG(size)
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2) // type: icon
  header.writeUInt16LE(1, 4) // 1 image

  const entry = Buffer.alloc(16)
  entry[0] = size >= 256 ? 0 : size // width
  entry[1] = size >= 256 ? 0 : size // height
  entry[2] = 0 // palette
  entry[3] = 0 // reserved
  entry.writeUInt16LE(1, 4) // color planes
  entry.writeUInt16LE(32, 6) // bits per pixel
  entry.writeUInt32LE(png.length, 8)
  entry.writeUInt32LE(header.length + entry.length, 12) // offset

  return Buffer.concat([header, entry, png])
}

mkdirSync(join(publicDir, 'icons'), { recursive: true })

writeFileSync(join(publicDir, 'icons', 'icon-192.png'), encodePNG(192))
writeFileSync(join(publicDir, 'icons', 'icon-512.png'), encodePNG(512))
writeFileSync(join(publicDir, 'icons', 'icon-512-maskable.png'), encodePNG(512, 0.3))
writeFileSync(join(publicDir, 'apple-touch-icon.png'), encodePNG(180))
writeFileSync(join(publicDir, 'favicon.ico'), encodeICO(32))

console.log('Generated placeholder PWA icons in public/icons, public/apple-touch-icon.png, public/favicon.ico')
