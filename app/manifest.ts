import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Attainly — Engineering College Portal',
    short_name: 'Attainly',
    description: 'A connected workspace for engineering college communities.',
    start_url: '/admin',
    display: 'standalone',
    background_color: '#f7f7f2',
    theme_color: '#25345b',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  }
}
