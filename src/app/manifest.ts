import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '.med',
    short_name: '.med',
    description: 'Plataforma de estudos em medicina',
    start_url: '/subjects',
    display: 'standalone',
    orientation: 'landscape',
    background_color: '#F9F5F0',
    theme_color: '#F9F5F0',
    icons: [
      {
        src: '/icon',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/apple-icon',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  }
}
