import type { Metadata, Viewport } from 'next'
import { IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google'
import { ServiceWorkerRegister } from '@/components/pwa/ServiceWorkerRegister'
import './globals.scss'

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '600'],
  variable: '--font-ibm-plex-sans',
  display: 'swap',
})

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-ibm-plex-mono',
  display: 'swap',
})

export const viewport: Viewport = {
  themeColor: '#0f62fe',
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
}

export const metadata: Metadata = {
  title: 'Peninsula — Health & Safety Platform',
  description: 'Occupational health and safety management',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Peninsula',
  },
  icons: {
    apple: '/icons/icon.svg',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${ibmPlexSans.variable} ${ibmPlexMono.variable}`}>
      <body>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  )
}
