import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Peninsula OHS Platform',
    short_name: 'Peninsula',
    description: 'Occupational health and safety management for field workers and managers',
    start_url: '/',
    display: 'standalone',
    background_color: '#161616',
    theme_color: '#0f62fe',
    orientation: 'any',
    icons: [
      {
        src: '/icons/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/icons/icon-maskable.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'Report Incident',
        short_name: 'Incident',
        description: 'Report a new workplace incident',
        url: '/incidents/new',
        icons: [{ src: '/icons/icon.svg', sizes: 'any' }],
      },
      {
        name: 'New Risk Assessment',
        short_name: 'Risk',
        description: 'Start a new risk assessment',
        url: '/risks/new',
        icons: [{ src: '/icons/icon.svg', sizes: 'any' }],
      },
    ],
    categories: ['business', 'productivity'],
  }
}
