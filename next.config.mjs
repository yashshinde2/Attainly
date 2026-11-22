import withPWAInit from '@ducanh2912/next-pwa'

const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV !== 'production',
  fallbacks: { document: '/offline.html' },
  runtimeCaching: [
    {
      urlPattern: ({ request, url }) => request.mode === 'navigate' && url.pathname.startsWith('/admin'),
      handler: 'NetworkFirst',
      options: {
        cacheName: 'attainly-admin-pages',
        networkTimeoutSeconds: 3,
        expiration: { maxEntries: 12, maxAgeSeconds: 60 * 60 * 24 },
      },
    },
  ],
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {},
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
  },
  headers: async () => [{
    source: '/:path*',
    headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Strict-Transport-Security', value: 'max-age=63072000' },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    ],
  }],
}

export default withPWA(nextConfig)
