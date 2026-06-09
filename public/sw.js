const CACHE_NAME = 'exxio-v1'

// Precache the offline fallback page on install
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.add('/offline'))
      .then(() => self.skipWaiting())
  )
})

// Remove stale caches on activate
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Only handle GET requests over http(s)
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) return

  // Never intercept Supabase API or Next.js HMR
  if (url.hostname.includes('supabase.co') || url.pathname.includes('/_next/webpack-hmr')) return

  // Cache-first for fingerprinted static assets (safe because they have content hashes)
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached
        return fetch(request).then(response => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone))
          }
          return response
        })
      })
    )
    return
  }

  // Network-first for page navigations — fall back to /offline if no connection
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/offline'))
    )
  }
})
