import withPWAInit from '@ducanh2912/next-pwa'

const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV !== 'production',
  fallbacks: { document: '/offline.html' },
  // Never cache authenticated institutional portals or API responses offline
  runtimeCaching: [
    {
      urlPattern: ({ url }) =>
        url.pathname.startsWith('/admin') ||
        url.pathname.startsWith('/student') ||
        url.pathname.startsWith('/faculty') ||
        url.pathname.startsWith('/api') ||
        url.pathname.startsWith('/change-password'),
      handler: 'NetworkOnly',
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
