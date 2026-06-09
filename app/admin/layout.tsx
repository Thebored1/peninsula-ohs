import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { validateSuperAdminSession } from '@/lib/super-admin/session'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const token = cookieStore.get('exxio_sa_token')?.value

  let adminName: string | null = null
  if (token) {
    const admin = await validateSuperAdminSession(token)
    if (admin) adminName = admin.display_name
  }

  // Login page is nested under (admin) but handled separately by middleware
  // Layout is rendered for all /admin/* routes including /admin/login
  // For non-login routes, middleware already blocked unauthenticated access

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#161616', color: '#f4f4f4' }}>
      {adminName && (
        <header style={{
          height: '3rem', backgroundColor: '#262626', borderBottom: '1px solid #393939',
          display: 'flex', alignItems: 'center', padding: '0 1.5rem',
          justifyContent: 'space-between', position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{
                width: '1.5rem', height: '1.5rem', backgroundColor: '#da1e28', borderRadius: '2px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg viewBox="0 0 24 24" fill="none" width="14" height="14">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                    stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#f4f4f4' }}>EXXIO Admin</span>
            </div>
            <nav style={{ display: 'flex', gap: '1rem' }}>
              {[
                { href: '/admin/dashboard', label: 'Dashboard' },
                { href: '/admin/organisations', label: 'Organisations' },
              ].map(link => (
                <Link key={link.href} href={link.href} style={{ fontSize: '0.875rem', color: '#c6c6c6', textDecoration: 'none' }}>
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '0.75rem', color: '#8d8d8d' }}>{adminName}</span>
            <form action="/api/admin/logout" method="POST">
              <button type="submit" style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '0.75rem', color: '#8d8d8d',
              }}>
                Sign out
              </button>
            </form>
          </div>
        </header>
      )}
      <main style={{ paddingTop: adminName ? '3rem' : 0 }}>
        {children}
      </main>
    </div>
  )
}
