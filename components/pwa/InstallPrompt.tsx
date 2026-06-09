'use client'

import { useState, useEffect } from 'react'
import { Button } from '@carbon/react'
import { Download } from '@carbon/icons-react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Don't show if already installed (running in standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) return

    // Don't show if user previously dismissed this session
    if (sessionStorage.getItem('pwa-install-dismissed')) {
      setDismissed(true)
      return
    }

    function handler(e: Event) {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (!deferredPrompt || dismissed) return null

  async function handleInstall() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setDeferredPrompt(null)
    }
  }

  function handleDismiss() {
    sessionStorage.setItem('pwa-install-dismissed', '1')
    setDismissed(true)
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '1rem',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9000,
        background: '#161616',
        color: '#f4f4f4',
        borderRadius: '6px',
        padding: '0.875rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        maxWidth: 'calc(100vw - 2rem)',
        width: 'max-content',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
        <Download size={16} />
      </div>
      <p style={{ fontSize: '0.875rem', margin: 0, whiteSpace: 'nowrap' }}>
        Install EXXIO for quick access
      </p>
      <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
        <Button kind="primary" size="sm" onClick={handleInstall}>
          Install
        </Button>
        <Button kind="ghost" size="sm" onClick={handleDismiss} style={{ color: '#a8a8a8' }}>
          Not now
        </Button>
      </div>
    </div>
  )
}
