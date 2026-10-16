/* Plugin Vite zero-dependency: PWA offline para o app Rotina.
 *
 * O que ele faz no build de produção:
 * 1. Emite `manifest.webmanifest` (name/short_name "Rotina", display standalone,
 *    theme/background #34BEAA, ícones 192/512 + maskable).
 * 2. Gera os ícones PNG (letra "R" branca sobre #34BEAA) em puro JavaScript,
 *    sem binários externos: 64 (favicon), 192, 512 e 512 maskable.
 * 3. Emite `sw.js`: pré-cache do app shell + cache-first com atualização em
 *    background (stale-while-revalidate). Não intercepta nada fora da própria
 *    origem — o app não tem chamadas de API; os dados vivem no IndexedDB.
 */

const THEME = [0x34, 0xbe, 0xaa] // #34BEAA
const WHITE = [0xff, 0xff, 0xff]

/** Matriz de pixels (0 = fundo, 1 = traço do "R") numa grade 7x9. */
const R_GLYPH = [
  [1, 1, 1, 1, 1, 1, 0],
  [1, 1, 0, 0, 0, 1, 1],
  [1, 1, 0, 0, 0, 1, 1],
  [1, 1, 1, 1, 1, 1, 0],
  [1, 1, 1, 1, 0, 0, 0],
  [1, 1, 0, 1, 1, 0, 0],
  [1, 1, 0, 0, 1, 1, 0],
  [1, 1, 0, 0, 0, 1, 1],
  [1, 1, 0, 0, 0, 1, 1],
]

/** Desenha o ícone num buffer RGBA cru. */
function renderIcon(size) {
  const buf = Buffer.alloc(size * size * 4)
  const radius = Math.max(2, Math.round(size * 0.12))

  const glyphW = R_GLYPH[0].length
  const glyphH = R_GLYPH.length
  // A letra ocupa ~46% da altura, centralizada.
  const cell = Math.max(1, Math.floor((size * 0.46) / glyphH))
  const drawW = cell * glyphW
  const drawH = cell * glyphH
  const offX = Math.floor((size - drawW) / 2)
  const offY = Math.floor((size - drawH) / 2)

  const inCornerZone = (x, y) => {
    const cx = Math.min(Math.max(x, radius), size - 1 - radius)
    const cy = Math.min(Math.max(y, radius), size - 1 - radius)
    const dx = x - cx
    const dy = y - cy
    return (
      dx * dx + dy * dy > radius * radius &&
      (x < radius || x >= size - radius) &&
      (y < radius || y >= size - radius)
    )
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      // Cantos transparentes, fundo da cor do tema no restante.
      if (inCornerZone(x, y)) {
        buf[i + 3] = 0
        continue
      }
      buf[i] = THEME[0]
      buf[i + 1] = THEME[1]
      buf[i + 2] = THEME[2]
      buf[i + 3] = 0xff
    }
  }

  // Traço do "R" em branco, com folga de 1 célula entre os blocos.
  for (let gy = 0; gy < glyphH; gy++) {
    for (let gx = 0; gx < glyphW; gx++) {
      if (!R_GLYPH[gy][gx]) continue
      for (let py = 0; py < cell; py++) {
        for (let px = 0; px < cell; px++) {
          const x = offX + gx * cell + px
          const y = offY + gy * cell + py
          if (x < 0 || y < 0 || x >= size || y >= size) continue
          const i = (y * size + x) * 4
          buf[i] = WHITE[0]
          buf[i + 1] = WHITE[1]
          buf[i + 2] = WHITE[2]
          buf[i + 3] = 0xff
        }
      }
    }
  }

  return buf
}

/** Codifica um buffer RGBA cru como PNG (zlib "store", sem compressão). */
function encodePng(size, rgba) {
  const CRC_TABLE = (() => {
    const t = new Int32Array(256)
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      t[n] = c
    }
    return t
  })()

  function crc32(bytes) {
    let c = 0xffffffff
    for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8)
    return (c ^ 0xffffffff) >>> 0
  }

  function chunk(type, data) {
    const len = Buffer.alloc(4)
    len.writeUInt32BE(data.length)
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(crc32(body))
    return Buffer.concat([len, body, crc])
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  // Cada scanline é precedida de 1 byte de filtro (0 = none).
  const stride = size * 4
  const raw = Buffer.alloc((stride + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }

  // zlib store: blocos DEFATE com BFINAL/BTYPE=00 (sem compressão).
  function zlibStore(data) {
    const blocks = []
    const max = 0xffff
    for (let i = 0; i < data.length; i += max) {
      const slice = data.subarray(i, Math.min(i + max, data.length))
      const isFinal = i + max >= data.length ? 1 : 0
      const header = Buffer.from([isFinal])
      const len = Buffer.alloc(2)
      len.writeUInt16LE(slice.length)
      const nlen = Buffer.alloc(2)
      nlen.writeUInt16LE(~slice.length & 0xffff)
      blocks.push(header, len, nlen, slice)
    }
    if (blocks.length === 0) {
      // dado vazio: um bloco final vazio
      const header = Buffer.from([1])
      const len = Buffer.alloc(2)
      const nlen = Buffer.from([0xff, 0xff])
      blocks.push(header, len, nlen)
    }
    const adlerBase = 0xff
    let s1 = 1
    let s2 = 0
    for (const b of data) {
      s1 = (s1 + b) % 65521
      s2 = (s2 + s1) % 65521
    }
    const adler = Buffer.alloc(4)
    adler[0] = (s2 >>> 8) & (adlerBase * 0 + 0xff)
    adler[1] = s2 & 0xff
    adler[2] = (s1 >>> 8) & 0xff
    adler[3] = s1 & 0xff
    return Buffer.concat([...blocks, adler])
  }

  const idat = zlibStore(raw)

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function makeIcon(size) {
  return encodePng(size, renderIcon(size))
}

const ICON_ASSETS = {
  'favicon.png': () => makeIcon(64),
  'pwa-192.png': () => makeIcon(192),
  'pwa-512.png': () => makeIcon(512),
  'pwa-maskable-512.png': () => makeIcon(512),
}

function manifestContent(base) {
  const b = base || '/'
  return {
    name: 'Rotina',
    short_name: 'Rotina',
    description:
      'Seu app de rotina, treino, diário e leitura funcionando 100% offline no celular e tablet.',
    id: b,
    start_url: b,
    scope: b,
    display: 'standalone',
    orientation: 'portrait',
    lang: 'pt-BR',
    dir: 'ltr',
    theme_color: '#34BEAA',
    background_color: '#34BEAA',
    icons: [
      { src: `${b}pwa-192.png`, sizes: '192x192', type: 'image/png' },
      { src: `${b}pwa-512.png`, sizes: '512x512', type: 'image/png' },
      {
        src: `${b}pwa-maskable-512.png`,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}

function generateSw(revision) {
  return `/* Service worker do app Rotina — gerado automaticamente no build.
 * Estratégia: pré-cache do app shell + cache-first com atualização em
 * background (stale-while-revalidate). Não intercepta nada fora do próprio
 * app: não há chamadas de API de dados — tudo vive no IndexedDB. */

const CACHE = 'rotina-cache-${revision}'
const PRECACHE = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.ico',
  '/favicon.png',
  '/pwa-192.png',
  '/pwa-512.png',
  '/pwa-maskable-512.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  const url = new URL(req.url)
  // Nunca intercepta origens diferentes (não há APIs de dados no app).
  if (url.origin !== self.location.origin) return

  // Navegações: index.html do cache (SPA funciona em modo avião).
  if (req.mode === 'navigate') {
    event.respondWith(caches.match('/index.html').then((c) => c || fetch(req)))
    return
  }

  // Demais assets: cache-first com atualização em background.
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone()
            caches.open(CACHE).then((cache) => cache.put(req, copy))
          }
          return res
        })
        .catch(() => cached)
      return cached || network
    })
  )
})
`
}

/** Plugin Vite: emite manifest, ícones e service worker no build. */
export default function rotinaPwaPlugin() {
  let resolvedBase = '/'
  return {
    name: 'vite-plugin-rotina-pwa',
    apply: 'build',
    configResolved(resolved) {
      resolvedBase = resolved.base || '/'
    },
    generateBundle() {
      // 1. Manifest
      this.emitFile({
        type: 'asset',
        fileName: 'manifest.webmanifest',
        source: JSON.stringify(manifestContent(resolvedBase), null, 2),
      })

      // 2. Ícones gerados em runtime (sem binários)
      for (const [name, make] of Object.entries(ICON_ASSETS)) {
        this.emitFile({ type: 'asset', fileName: name, source: make() })
      }

      // 3. Service worker com revisão única por build
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: generateSw(Date.now().toString(36)),
      })
    },
  }
}
