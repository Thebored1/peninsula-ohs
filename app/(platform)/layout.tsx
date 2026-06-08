import { cookies } from 'next/headers'
import { AppShell } from '@/components/shell/AppShell'

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  // AUTH TEMPORARILY DISABLED — skip all auth/profile/onboarding guards
  const cookieStore = await cookies()
  const impersonatingCookie = cookieStore.get('peninsula_impersonating')?.value
  let impersonating: { orgName: string } | null = null
  if (impersonatingCookie) {
    try { impersonating = JSON.parse(impersonatingCookie) } catch { /* ignore */ }
  }

  return (
    <AppShell userEmail="dev@example.com" impersonating={impersonating}>
      {children}
    </AppShell>
  )
}
