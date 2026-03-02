if (!self.define) {
  let e,
    s = {}
  const a = (a, i) => (
    (a = new URL(a + '.js', i).href),
    s[a] ||
      new Promise((s) => {
        if ('document' in self) {
          const e = document.createElement('script')
          ;((e.src = a), (e.onload = s), document.head.appendChild(e))
        } else ((e = a), importScripts(a), s())
      }).then(() => {
        let e = s[a]
        if (!e) throw new Error(`Module ${a} didn’t register its module`)
        return e
      })
  )
  self.define = (i, n) => {
    const t = e || ('document' in self ? document.currentScript.src : '') || location.href
    if (s[t]) return
    let c = {}
    const r = (e) => a(e, t),
      d = { module: { uri: t }, exports: c, require: r }
    s[t] = Promise.all(i.map((e) => d[e] || r(e))).then((e) => (n(...e), c))
  }
}
define(['./workbox-5194662c'], function (e) {
  'use strict'
  ;(importScripts(),
    self.skipWaiting(),
    e.clientsClaim(),
    e.precacheAndRoute(
      [
        { url: '/_next/static/chunks/209-4b05d6105a56385b.js', revision: 'uZOLAPI4DasMDHYL0Gd6F' },
        { url: '/_next/static/chunks/28-38981306f99ad5c0.js', revision: 'uZOLAPI4DasMDHYL0Gd6F' },
        { url: '/_next/static/chunks/284-18970c0e21ddda28.js', revision: 'uZOLAPI4DasMDHYL0Gd6F' },
        { url: '/_next/static/chunks/288-b3901e9fe23c23ec.js', revision: 'uZOLAPI4DasMDHYL0Gd6F' },
        { url: '/_next/static/chunks/308-d56bb0618d86a0c7.js', revision: 'uZOLAPI4DasMDHYL0Gd6F' },
        { url: '/_next/static/chunks/356-2c5f9d8f5c7fc5d2.js', revision: 'uZOLAPI4DasMDHYL0Gd6F' },
        { url: '/_next/static/chunks/362-2cdb15c2502db2c1.js', revision: 'uZOLAPI4DasMDHYL0Gd6F' },
        { url: '/_next/static/chunks/407-c975913da219368f.js', revision: 'uZOLAPI4DasMDHYL0Gd6F' },
        { url: '/_next/static/chunks/494-0532150a21ba0d1c.js', revision: 'uZOLAPI4DasMDHYL0Gd6F' },
        { url: '/_next/static/chunks/510-5e07624e3c11b8f2.js', revision: 'uZOLAPI4DasMDHYL0Gd6F' },
        { url: '/_next/static/chunks/521-822c6407d59e4ddc.js', revision: 'uZOLAPI4DasMDHYL0Gd6F' },
        { url: '/_next/static/chunks/62-fd90b2db8495383a.js', revision: 'uZOLAPI4DasMDHYL0Gd6F' },
        { url: '/_next/static/chunks/653-d04a31ba02cad091.js', revision: 'uZOLAPI4DasMDHYL0Gd6F' },
        { url: '/_next/static/chunks/657-22d01f7842881d15.js', revision: 'uZOLAPI4DasMDHYL0Gd6F' },
        { url: '/_next/static/chunks/708-814a30fc20c8475a.js', revision: 'uZOLAPI4DasMDHYL0Gd6F' },
        { url: '/_next/static/chunks/806-e47b17911449c12a.js', revision: 'uZOLAPI4DasMDHYL0Gd6F' },
        { url: '/_next/static/chunks/874-91d26fa718f4d5d7.js', revision: 'uZOLAPI4DasMDHYL0Gd6F' },
        { url: '/_next/static/chunks/933-f1deb953b6dd9000.js', revision: 'uZOLAPI4DasMDHYL0Gd6F' },
        {
          url: '/_next/static/chunks/app/_not-found/page-d0f5319ada396fd4.js',
          revision: 'uZOLAPI4DasMDHYL0Gd6F',
        },
        {
          url: '/_next/static/chunks/app/archive/page-325d31357f2840f7.js',
          revision: 'uZOLAPI4DasMDHYL0Gd6F',
        },
        {
          url: '/_next/static/chunks/app/auth/signin/page-2b91b85b629ba61f.js',
          revision: 'uZOLAPI4DasMDHYL0Gd6F',
        },
        {
          url: '/_next/static/chunks/app/auth/signup/page-7dc9f8023d183606.js',
          revision: 'uZOLAPI4DasMDHYL0Gd6F',
        },
        {
          url: '/_next/static/chunks/app/chats/%5Bid%5D/page-2a734f3f83c1e624.js',
          revision: 'uZOLAPI4DasMDHYL0Gd6F',
        },
        {
          url: '/_next/static/chunks/app/chats/page-ef782312d91db92e.js',
          revision: 'uZOLAPI4DasMDHYL0Gd6F',
        },
        {
          url: '/_next/static/chunks/app/download/page-d1d0a0451bb426a7.js',
          revision: 'uZOLAPI4DasMDHYL0Gd6F',
        },
        {
          url: '/_next/static/chunks/app/error-e8408e2c17fdc29c.js',
          revision: 'uZOLAPI4DasMDHYL0Gd6F',
        },
        {
          url: '/_next/static/chunks/app/extension-auth/page-1c076685761ebb11.js',
          revision: 'uZOLAPI4DasMDHYL0Gd6F',
        },
        {
          url: '/_next/static/chunks/app/folder/%5Bid%5D/page-7efaec25a132c610.js',
          revision: 'uZOLAPI4DasMDHYL0Gd6F',
        },
        {
          url: '/_next/static/chunks/app/global-error-f8b79520c3f6365a.js',
          revision: 'uZOLAPI4DasMDHYL0Gd6F',
        },
        {
          url: '/_next/static/chunks/app/images/page-778b7a2bebed6938.js',
          revision: 'uZOLAPI4DasMDHYL0Gd6F',
        },
        {
          url: '/_next/static/chunks/app/layout-c02811a2fee8fbfe.js',
          revision: 'uZOLAPI4DasMDHYL0Gd6F',
        },
        {
          url: '/_next/static/chunks/app/lists/page-947a316fdbd42f00.js',
          revision: 'uZOLAPI4DasMDHYL0Gd6F',
        },
        {
          url: '/_next/static/chunks/app/not-found-e54ef7ed9636dae7.js',
          revision: 'uZOLAPI4DasMDHYL0Gd6F',
        },
        {
          url: '/_next/static/chunks/app/page-71ae1358f33f8159.js',
          revision: 'uZOLAPI4DasMDHYL0Gd6F',
        },
        {
          url: '/_next/static/chunks/app/profile/page-2111101d817496df.js',
          revision: 'uZOLAPI4DasMDHYL0Gd6F',
        },
        {
          url: '/_next/static/chunks/app/prompts/page-9f830309d7722644.js',
          revision: 'uZOLAPI4DasMDHYL0Gd6F',
        },
        {
          url: '/_next/static/chunks/app/settings/page-b1e8a6e66c64efec.js',
          revision: 'uZOLAPI4DasMDHYL0Gd6F',
        },
        {
          url: '/_next/static/chunks/app/studio/page-fa2a12e050a48b37.js',
          revision: 'uZOLAPI4DasMDHYL0Gd6F',
        },
        {
          url: '/_next/static/chunks/d92e98be-db608440f08e9d0b.js',
          revision: 'uZOLAPI4DasMDHYL0Gd6F',
        },
        {
          url: '/_next/static/chunks/framework-bef83a85c94ff7de.js',
          revision: 'uZOLAPI4DasMDHYL0Gd6F',
        },
        {
          url: '/_next/static/chunks/main-app-54b43871516346a1.js',
          revision: 'uZOLAPI4DasMDHYL0Gd6F',
        },
        { url: '/_next/static/chunks/main-e317f7570ec41f2d.js', revision: 'uZOLAPI4DasMDHYL0Gd6F' },
        {
          url: '/_next/static/chunks/pages/_app-1ed694e38f49926a.js',
          revision: 'uZOLAPI4DasMDHYL0Gd6F',
        },
        {
          url: '/_next/static/chunks/pages/_error-210767b4216ea791.js',
          revision: 'uZOLAPI4DasMDHYL0Gd6F',
        },
        {
          url: '/_next/static/chunks/polyfills-42372ed130431b0a.js',
          revision: '846118c33b2c0e922d7b3a7676f81f6f',
        },
        {
          url: '/_next/static/chunks/webpack-22b24deedcd7c24d.js',
          revision: 'uZOLAPI4DasMDHYL0Gd6F',
        },
        { url: '/_next/static/css/5f33cf0738cccce1.css', revision: '5f33cf0738cccce1' },
        { url: '/_next/static/css/7b8874e86610dc57.css', revision: '7b8874e86610dc57' },
        { url: '/_next/static/css/ad165fe211a49604.css', revision: 'ad165fe211a49604' },
        {
          url: '/_next/static/media/0aa834ed78bf6d07-s.woff2',
          revision: '324703f03c390d2e2a4f387de85fe63d',
        },
        {
          url: '/_next/static/media/67957d42bae0796d-s.woff2',
          revision: '54f02056e07c55023315568c637e3a96',
        },
        {
          url: '/_next/static/media/886030b0b59bc5a7-s.woff2',
          revision: 'c94e6e6c23e789fcb0fc60d790c9d2c1',
        },
        {
          url: '/_next/static/media/939c4f875ee75fbb-s.woff2',
          revision: '4a4e74bed5809194e4bc6538eb1a1e30',
        },
        {
          url: '/_next/static/media/bb3ef058b751a6ad-s.p.woff2',
          revision: '782150e6836b9b074d1a798807adcb18',
        },
        {
          url: '/_next/static/media/f911b923c6adde36-s.woff2',
          revision: '0f8d347d49960d05c9430d83e49edeb7',
        },
        {
          url: '/_next/static/uZOLAPI4DasMDHYL0Gd6F/_buildManifest.js',
          revision: '291d99c6f095c5b19dc73cefc91b957c',
        },
        {
          url: '/_next/static/uZOLAPI4DasMDHYL0Gd6F/_ssgManifest.js',
          revision: 'b6652df95db52feb4daf4eca35380933',
        },
        { url: '/daily-prompt-hint.png', revision: '6b6bbba801416cb44f17d911e25b9a5f' },
        { url: '/favicon.ico', revision: 'd41d8cd98f00b204e9800998ecf8427e' },
        { url: '/icons/providers/claude.png', revision: '448135ea2a43c37b99a153b1006bd421' },
        { url: '/icons/providers/deepseek.png', revision: '930dc7f25f05aa91579dfe9b389e8ddf' },
        { url: '/icons/providers/default-bot.png', revision: '5aaff622a4f8d82e6725ba48e6bda6a2' },
        { url: '/icons/providers/gemini.png', revision: '10dcf4805866473273e74f0febacc43b' },
        { url: '/icons/providers/grok.png', revision: '9ad8703c16d26fa4f7e500e559b5b3ca' },
        { url: '/icons/providers/mistral.png', revision: '77d8ed730548d72dc406fcd7f7bb9042' },
        { url: '/icons/providers/openai.png', revision: '99f0f8def22cd29babad4241f585ef4a' },
        { url: '/icons/providers/perplexity.png', revision: 'fdab70441ccab7cc72bc912c4830f014' },
        { url: '/icons/providers/qwen.png', revision: '4668beeee4f9b71e81b1734f25d88b3f' },
        { url: '/manifest.json', revision: 'fa77e1702b84e35c120e362ea52593e1' },
      ],
      { ignoreURLParametersMatching: [/^utm_/, /^fbclid$/] }
    ),
    e.cleanupOutdatedCaches(),
    e.registerRoute(
      '/',
      new e.NetworkFirst({
        cacheName: 'start-url',
        plugins: [
          {
            cacheWillUpdate: async ({ response: e }) =>
              e && 'opaqueredirect' === e.type
                ? new Response(e.body, { status: 200, statusText: 'OK', headers: e.headers })
                : e,
          },
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      /^https:\/\/fonts\.(?:gstatic)\.com\/.*/i,
      new e.CacheFirst({
        cacheName: 'google-fonts-webfonts',
        plugins: [new e.ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 31536e3 })],
      }),
      'GET'
    ),
    e.registerRoute(
      /^https:\/\/fonts\.(?:googleapis)\.com\/.*/i,
      new e.StaleWhileRevalidate({
        cacheName: 'google-fonts-stylesheets',
        plugins: [new e.ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 604800 })],
      }),
      'GET'
    ),
    e.registerRoute(
      /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
      new e.StaleWhileRevalidate({
        cacheName: 'static-font-assets',
        plugins: [new e.ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 604800 })],
      }),
      'GET'
    ),
    e.registerRoute(
      /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
      new e.StaleWhileRevalidate({
        cacheName: 'static-image-assets',
        plugins: [new e.ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 2592e3 })],
      }),
      'GET'
    ),
    e.registerRoute(
      /\/_next\/static.+\.js$/i,
      new e.CacheFirst({
        cacheName: 'next-static-js-assets',
        plugins: [new e.ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 86400 })],
      }),
      'GET'
    ),
    e.registerRoute(
      /\/_next\/image\?url=.+$/i,
      new e.StaleWhileRevalidate({
        cacheName: 'next-image',
        plugins: [new e.ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 86400 })],
      }),
      'GET'
    ),
    e.registerRoute(
      /\.(?:mp3|wav|ogg)$/i,
      new e.CacheFirst({
        cacheName: 'static-audio-assets',
        plugins: [
          new e.RangeRequestsPlugin(),
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      /\.(?:mp4|webm)$/i,
      new e.CacheFirst({
        cacheName: 'static-video-assets',
        plugins: [
          new e.RangeRequestsPlugin(),
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      /\.(?:js)$/i,
      new e.StaleWhileRevalidate({
        cacheName: 'static-js-assets',
        plugins: [new e.ExpirationPlugin({ maxEntries: 48, maxAgeSeconds: 86400 })],
      }),
      'GET'
    ),
    e.registerRoute(
      /\.(?:css|less)$/i,
      new e.StaleWhileRevalidate({
        cacheName: 'static-style-assets',
        plugins: [new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 })],
      }),
      'GET'
    ),
    e.registerRoute(
      /\/_next\/data\/.+\/.+\.json$/i,
      new e.StaleWhileRevalidate({
        cacheName: 'next-data',
        plugins: [new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 })],
      }),
      'GET'
    ),
    e.registerRoute(
      /\.(?:json|xml|csv)$/i,
      new e.NetworkFirst({
        cacheName: 'static-data-assets',
        plugins: [new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 })],
      }),
      'GET'
    ),
    e.registerRoute(
      ({ sameOrigin: e, url: { pathname: s } }) =>
        !(!e || s.startsWith('/api/auth/callback') || !s.startsWith('/api/')),
      new e.NetworkFirst({
        cacheName: 'apis',
        networkTimeoutSeconds: 10,
        plugins: [new e.ExpirationPlugin({ maxEntries: 16, maxAgeSeconds: 86400 })],
      }),
      'GET'
    ),
    e.registerRoute(
      ({ request: e, url: { pathname: s }, sameOrigin: a }) =>
        '1' === e.headers.get('RSC') &&
        '1' === e.headers.get('Next-Router-Prefetch') &&
        a &&
        !s.startsWith('/api/'),
      new e.NetworkFirst({
        cacheName: 'pages-rsc-prefetch',
        plugins: [new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 })],
      }),
      'GET'
    ),
    e.registerRoute(
      ({ request: e, url: { pathname: s }, sameOrigin: a }) =>
        '1' === e.headers.get('RSC') && a && !s.startsWith('/api/'),
      new e.NetworkFirst({
        cacheName: 'pages-rsc',
        plugins: [new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 })],
      }),
      'GET'
    ),
    e.registerRoute(
      ({ url: { pathname: e }, sameOrigin: s }) => s && !e.startsWith('/api/'),
      new e.NetworkFirst({
        cacheName: 'pages',
        plugins: [new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 })],
      }),
      'GET'
    ),
    e.registerRoute(
      ({ sameOrigin: e }) => !e,
      new e.NetworkFirst({
        cacheName: 'cross-origin',
        networkTimeoutSeconds: 10,
        plugins: [new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 3600 })],
      }),
      'GET'
    ))
})
