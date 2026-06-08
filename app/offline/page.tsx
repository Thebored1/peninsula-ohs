'use client'

export default function OfflinePage() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#161616',
        color: '#f4f4f4',
        fontFamily: 'var(--font-ibm-plex-sans, IBM Plex Sans, sans-serif)',
        gap: '1rem',
        padding: '2rem',
        textAlign: 'center',
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 32 32"
        width="64"
        height="64"
        fill="currentColor"
        aria-hidden="true"
        style={{ opacity: 0.5 }}
      >
        <path d="M28.707 26.293L5.707 3.293 4.293 4.707l4.175 4.175A17.912 17.912 0 0 0 2 16l1.93 1.286A15.91 15.91 0 0 1 10.1 10.514l2.24 2.24A10.957 10.957 0 0 0 6 22h2a8.96 8.96 0 0 1 4.832-7.874l1.617 1.617A6.979 6.979 0 0 0 9 22h2a4.99 4.99 0 0 1 2.142-4.144L16 20.713V27h2v-4.287l8.707 8.58L28.12 29.71zM16 9a9.012 9.012 0 0 1 3.235.6l1.547 1.547A6.978 6.978 0 0 0 16 22h-.713l-1.48-1.48A4.987 4.987 0 0 1 16 11H14a6.972 6.972 0 0 0-2.143.344l-1.56-1.56A8.967 8.967 0 0 1 16 9zm6.618 6.618A8.953 8.953 0 0 1 25 22h-2a6.97 6.97 0 0 0-1.794-4.675zM30.07 16l-1.93-1.286A15.888 15.888 0 0 1 16 18c-.45 0-.894-.021-1.334-.06l-2.119-2.119c.473.118.952.179 1.453.179a10.984 10.984 0 0 0 8.47-4.02l-1.499-1.499A8.985 8.985 0 0 1 14 13.713L11.886 11.6A11.008 11.008 0 0 0 16 12a10.974 10.974 0 0 0 8.24-3.73l-1.484-1.484A8.978 8.978 0 0 1 16 9a8.993 8.993 0 0 1-1.956-.217L12.49 7.228A10.991 10.991 0 0 0 16 7a10.975 10.975 0 0 0 7.9-3.34L22.4 2.246A12.97 12.97 0 0 1 16 4.5a12.96 12.96 0 0 1-6.33-1.648L8.169 4.352A14.945 14.945 0 0 0 16 6.5a14.95 14.95 0 0 0 10.14-3.942L27.577 3.99A16.929 16.929 0 0 1 16 8.5a16.924 16.924 0 0 1-8.24-2.131L6.263 7.864A18.915 18.915 0 0 0 16 10.5a18.9 18.9 0 0 0 11.79-4.104l1.34 1.34A20.877 20.877 0 0 1 16 12.5a20.87 20.87 0 0 1-8.785-1.935l-1.46 1.461A22.843 22.843 0 0 0 16 14.5c3.85 0 7.469-1.009 10.6-2.774L28.07 13.2A17.9 17.9 0 0 1 30.07 16z" />
      </svg>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0 }}>
        You&apos;re offline
      </h1>
      <p style={{ fontSize: '1rem', opacity: 0.7, margin: 0, maxWidth: '24rem' }}>
        Check your network connection and try again. Incidents you&apos;ve already viewed may still be accessible.
      </p>
      <button
        onClick={() => window.location.reload()}
        style={{
          marginTop: '0.5rem',
          padding: '0.75rem 1.5rem',
          backgroundColor: '#0f62fe',
          color: 'white',
          border: 'none',
          fontSize: '0.875rem',
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        Try again
      </button>
    </div>
  )
}
