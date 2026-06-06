import Link from 'next/link'

export default function ForgotPasswordPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#f4f4f4',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '28rem',
          backgroundColor: '#ffffff',
          border: '1px solid #e0e0e0',
          padding: '2rem',
        }}
      >
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#161616', marginBottom: '0.75rem' }}>
          Password reset
        </h1>
        <p style={{ color: '#525252', lineHeight: 1.6, marginBottom: '1.25rem' }}>
          Self-service password reset is not wired up yet. Use your normal sign-in flow or ask an administrator to help reset access.
        </p>
        <Link href="/login" style={{ color: '#0f62fe', textDecoration: 'none', fontWeight: 600 }}>
          Back to sign in
        </Link>
      </div>
    </div>
  )
}
