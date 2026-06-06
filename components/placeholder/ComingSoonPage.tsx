import Link from 'next/link'

interface ComingSoonPageProps {
  title: string
  description: string
  backHref?: string
  backLabel?: string
}

export function ComingSoonPage({
  title,
  description,
  backHref = '/dashboard',
  backLabel = 'Back to dashboard',
}: ComingSoonPageProps) {
  return (
    <div style={{ padding: '2rem' }}>
      <div
        style={{
          maxWidth: '48rem',
          backgroundColor: '#ffffff',
          border: '1px solid #e0e0e0',
          padding: '2rem',
        }}
      >
        <p
          style={{
            fontSize: '0.75rem',
            letterSpacing: '0.32px',
            color: '#6f6f6f',
            marginBottom: '0.5rem',
            textTransform: 'uppercase',
          }}
        >
          Coming soon
        </p>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 400, color: '#161616', marginBottom: '0.75rem' }}>
          {title}
        </h1>
        <p style={{ fontSize: '0.95rem', lineHeight: 1.6, color: '#525252', marginBottom: '1.5rem' }}>
          {description}
        </p>
        <Link href={backHref} style={{ color: '#0f62fe', textDecoration: 'none', fontWeight: 600 }}>
          {backLabel}
        </Link>
      </div>
    </div>
  )
}
