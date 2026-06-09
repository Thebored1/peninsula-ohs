export default function BgcPublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f4f4f4', fontFamily: 'var(--font-ibm-plex-sans, sans-serif)' }}>
      <header style={{ backgroundColor: '#0f62fe', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ color: '#fff', fontWeight: 600, fontSize: 18 }}>Lumis</span>
        <span style={{ color: '#a6c8ff', fontSize: 14 }}>— Secure Background Check Portal</span>
      </header>
      <main style={{ maxWidth: 720, margin: '40px auto', padding: '0 24px' }}>
        {children}
      </main>
    </div>
  )
}
