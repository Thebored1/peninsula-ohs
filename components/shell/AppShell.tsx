'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  Header,
  HeaderMenuButton,
  HeaderName,
  HeaderGlobalBar,
  HeaderGlobalAction,
  HeaderPanel,
  SideNav,
  SideNavItems,
  SideNavLink,
  SideNavMenu,
  SideNavMenuItem,
  Content,
  SkipToContent,
  Theme,
} from '@carbon/react'
import {
  Dashboard,
  Warning,
  WarningAlt,
  DataError,
  TaskComplete,
  Certificate,
  Chemistry,
  Document,
  Activity,
  Earth,
  Analytics,
  Settings,
  UserMultiple,
  Notification,
  UserAvatar,
  Asset,
  Construction,
  Education,
  Alarm,
  Collaborate,
  Security,
} from '@carbon/icons-react'
import { createClient } from '@/lib/supabase/client'

interface Notification {
  id: string
  message: string
  notification_type: string | null
  is_read: boolean
  created_at: string
  related_entity_type: string | null
  related_entity_id: string | null
}

interface AppShellProps {
  children: React.ReactNode
  userEmail?: string
  impersonating?: { orgName: string } | null
}

export function AppShell({ children, userEmail, impersonating }: AppShellProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isSideNavExpanded, setIsSideNavExpanded] = useState(true)
  const [isHeaderPanelOpen, setIsHeaderPanelOpen] = useState(false)
  const [isNotifOpen, setIsNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [notifLoading, setNotifLoading] = useState(false)

  const fetchNotifications = useCallback(async () => {
    setNotifLoading(true)
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('notifications')
        .select('id, message, notification_type, is_read, created_at, related_entity_type, related_entity_id')
        .order('created_at', { ascending: false })
        .limit(20)
      setNotifications(data ?? [])
    } catch {
      // notifications table may not exist; silently ignore
    } finally {
      setNotifLoading(false)
    }
  }, [])

  async function markAllRead() {
    const supabase = createClient()
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id)
    if (unreadIds.length === 0) return
    await supabase.from('notifications').update({ is_read: true }).in('id', unreadIds)
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
  }

  function handleNotifToggle() {
    const next = !isNotifOpen
    setIsNotifOpen(next)
    if (next) {
      setIsHeaderPanelOpen(false)
      fetchNotifications()
    }
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  function isActive(path: string) {
    return pathname === path || pathname.startsWith(path + '/')
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length

  function notifLink(n: Notification): string {
    if (!n.related_entity_type || !n.related_entity_id) return '#'
    const typeMap: Record<string, string> = {
      incident: '/incidents',
      hazard_report: '/hazards',
      risk: '/risks',
      action: '/actions',
      inspection: '/inspections',
      audit: '/audits',
      permit: '/permits',
      investigation: '/investigations',
      hire: '/hiring',
    }
    const base = typeMap[n.related_entity_type]
    return base ? `${base}/${n.related_entity_id}` : '#'
  }

  function formatNotifDate(iso: string) {
    const d = new Date(iso)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHrs = Math.floor(diffMins / 60)
    if (diffHrs < 24) return `${diffHrs}h ago`
    return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
  }

  async function handleExitImpersonation() {
    await fetch('/api/admin/exit-impersonation', { method: 'POST' })
    router.push('/admin/organisations')
    router.refresh()
  }

  return (
    <Theme theme="white">
      {impersonating && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 10000,
          backgroundColor: '#f1c21b', color: '#161616',
          padding: '0.5rem 1rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontSize: '0.875rem', fontWeight: 500,
        }}>
          <span>
            Viewing as EXXIO Support — Organisation: <strong>{impersonating.orgName}</strong>
          </span>
          <button
            onClick={handleExitImpersonation}
            style={{
              background: 'none', border: '1px solid #161616', cursor: 'pointer',
              padding: '0.25rem 0.75rem', fontSize: '0.75rem', fontWeight: 600,
            }}
          >
            Exit
          </button>
        </div>
      )}
      <div style={impersonating ? { paddingTop: '2.25rem' } : undefined}>
      <SkipToContent />
      <Header aria-label="EXXIO">
        <HeaderMenuButton
          aria-label={isSideNavExpanded ? 'Close navigation' : 'Open navigation'}
          onClick={() => setIsSideNavExpanded(!isSideNavExpanded)}
          isActive={isSideNavExpanded}
        />
        <HeaderName href="/dashboard" prefix="">
          EXXIO
        </HeaderName>
        <HeaderGlobalBar>
          <HeaderGlobalAction
            aria-label="Notifications"
            tooltipAlignment="end"
            isActive={isNotifOpen}
            onClick={handleNotifToggle}
          >
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Notification size={20} />
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-6px',
                  right: '-6px',
                  background: '#da1e28',
                  color: '#fff',
                  borderRadius: '50%',
                  width: '16px',
                  height: '16px',
                  fontSize: '10px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: 1,
                }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
          </HeaderGlobalAction>
          <HeaderGlobalAction
            aria-label="User account"
            tooltipAlignment="end"
            isActive={isHeaderPanelOpen}
            onClick={() => { setIsHeaderPanelOpen(!isHeaderPanelOpen); setIsNotifOpen(false) }}
          >
            <UserAvatar size={20} />
          </HeaderGlobalAction>
        </HeaderGlobalBar>

        {/* Notification dropdown */}
        {isNotifOpen && (
          <div
            style={{
              position: 'fixed',
              top: '3rem',
              right: '3rem',
              width: '20rem',
              maxHeight: '28rem',
              backgroundColor: '#fff',
              border: '1px solid #e0e0e0',
              boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              zIndex: 9999,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>Notifications</p>
              {unreadCount > 0 && (
                <button onClick={markAllRead} style={{ fontSize: '0.75rem', color: '#0f62fe', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  Mark all read
                </button>
              )}
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {notifLoading ? (
                <div style={{ padding: '2rem 1rem', textAlign: 'center', fontSize: '0.875rem', color: '#6f6f6f' }}>Loading…</div>
              ) : notifications.length === 0 ? (
                <div style={{ padding: '2rem 1rem', textAlign: 'center', fontSize: '0.875rem', color: '#6f6f6f' }}>
                  No notifications
                </div>
              ) : (
                notifications.map((n) => (
                  <a
                    key={n.id}
                    href={notifLink(n)}
                    onClick={() => setIsNotifOpen(false)}
                    style={{
                      display: 'block',
                      padding: '0.75rem 1rem',
                      borderBottom: '1px solid #f4f4f4',
                      textDecoration: 'none',
                      backgroundColor: n.is_read ? '#fff' : '#edf5ff',
                    }}
                  >
                    <p style={{ fontSize: '0.875rem', color: '#161616', marginBottom: '0.25rem', lineHeight: 1.4 }}>{n.message}</p>
                    <p style={{ fontSize: '0.75rem', color: '#6f6f6f' }}>{formatNotifDate(n.created_at)}</p>
                  </a>
                ))
              )}
            </div>
          </div>
        )}

        <HeaderPanel
          expanded={isHeaderPanelOpen}
          aria-label="User panel"
        >
          <div style={{ padding: '1rem' }}>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#161616' }}>
              {userEmail ?? 'User'}
            </p>
            <button
              onClick={handleSignOut}
              style={{
                marginTop: '0.75rem',
                fontSize: '0.875rem',
                color: '#0f62fe',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              Sign out
            </button>
          </div>
        </HeaderPanel>
      </Header>

      <SideNav
        aria-label="Side navigation"
        expanded={isSideNavExpanded}
        isPersistent
      >
        <SideNavItems>
          <SideNavLink
            href="/dashboard"
            renderIcon={Dashboard}
            isActive={isActive('/dashboard')}
            element={Link}
          >
            Dashboard
          </SideNavLink>

          <SideNavMenu title="Safety" renderIcon={WarningAlt} defaultExpanded>
            <SideNavMenuItem
              href="/incidents"
              isActive={isActive('/incidents')}
              element={Link}
            >
              Incidents
            </SideNavMenuItem>
            <SideNavMenuItem
              href="/hazards"
              isActive={isActive('/hazards')}
              element={Link}
            >
              Hazard Reports
            </SideNavMenuItem>
            <SideNavMenuItem
              href="/risks"
              isActive={pathname === '/risks'}
              element={Link}
            >
              Risk Register
            </SideNavMenuItem>
            <SideNavMenuItem href="/risks/templates" isActive={isActive('/risks/templates')} element={Link}>Risk Templates</SideNavMenuItem>
            <SideNavMenuItem
              href="/actions"
              isActive={isActive('/actions')}
              element={Link}
            >
              Actions
            </SideNavMenuItem>
            <SideNavMenuItem
              href="/investigations"
              isActive={isActive('/investigations')}
              element={Link}
            >
              Investigations
            </SideNavMenuItem>
            <SideNavMenuItem href="/jsa" isActive={isActive('/jsa')} element={Link}>JSA / JHA</SideNavMenuItem>
            <SideNavMenuItem href="/toolbox" isActive={isActive('/toolbox')} element={Link}>Toolbox Talks</SideNavMenuItem>
            <SideNavMenuItem href="/speak-up" isActive={isActive('/speak-up')} element={Link}>Speak-Up Reports</SideNavMenuItem>
          </SideNavMenu>

          <SideNavMenu title="Compliance" renderIcon={Certificate} defaultExpanded>
            <SideNavMenuItem
              href="/inspections"
              isActive={isActive('/inspections')}
              element={Link}
            >
              Inspections
            </SideNavMenuItem>
            <SideNavMenuItem
              href="/audits"
              isActive={isActive('/audits')}
              element={Link}
            >
              Audits
            </SideNavMenuItem>
            <SideNavMenuItem
              href="/permits"
              isActive={isActive('/permits')}
              element={Link}
            >
              Permits to Work
            </SideNavMenuItem>
            <SideNavMenuItem href="/compliance-calendar" isActive={isActive('/compliance-calendar')} element={Link}>Compliance Calendar</SideNavMenuItem>
            <SideNavMenuItem href="/regulatory" isActive={isActive('/regulatory')} element={Link}>Regulatory Library</SideNavMenuItem>
          </SideNavMenu>

          <SideNavMenu
            title="Assets"
            renderIcon={Asset}
            isActive={isActive('/assets') || isActive('/maintenance')}
            defaultExpanded={isActive('/assets') || isActive('/maintenance')}
          >
            <SideNavMenuItem
              href="/assets"
              isActive={isActive('/assets')}
              element={Link}
            >
              Asset Register
            </SideNavMenuItem>
            <SideNavMenuItem
              href="/maintenance"
              isActive={isActive('/maintenance')}
              element={Link}
            >
              Maintenance
            </SideNavMenuItem>
            <SideNavMenuItem href="/loto" isActive={isActive('/loto')} element={Link}>LOTO Procedures</SideNavMenuItem>
          </SideNavMenu>

          <SideNavMenu
            title="Workforce"
            renderIcon={Activity}
            isActive={isActive('/health') || isActive('/workers') || isActive('/ppe') || isActive('/fatigue') || isActive('/wellbeing')}
            defaultExpanded={isActive('/health') || isActive('/workers') || isActive('/ppe') || isActive('/fatigue') || isActive('/wellbeing')}
          >
            <SideNavMenuItem
              href="/health"
              isActive={isActive('/health')}
              element={Link}
            >
              Health Surveillance
            </SideNavMenuItem>
            <SideNavMenuItem
              href="/workers"
              isActive={isActive('/workers')}
              element={Link}
            >
              Worker Profiles
            </SideNavMenuItem>
            <SideNavMenuItem href="/ppe" isActive={isActive('/ppe')} element={Link}>PPE Issuance</SideNavMenuItem>
            <SideNavMenuItem href="/fatigue" isActive={isActive('/fatigue')} element={Link}>Fatigue Monitoring</SideNavMenuItem>
            <SideNavMenuItem href="/wellbeing" isActive={isActive('/wellbeing')} element={Link}>Wellbeing</SideNavMenuItem>
          </SideNavMenu>

          <SideNavMenu
            title="Hiring"
            renderIcon={Collaborate}
            isActive={isActive('/hiring')}
            defaultExpanded={isActive('/hiring')}
          >
            <SideNavMenuItem href="/hiring" isActive={pathname === '/hiring'} element={Link}>Overview</SideNavMenuItem>
            <SideNavMenuItem href="/hiring/new" isActive={isActive('/hiring/new')} element={Link}>New Hire</SideNavMenuItem>
            <SideNavMenuItem href="/hiring/templates" isActive={isActive('/hiring/templates')} element={Link}>Document Templates</SideNavMenuItem>
            <SideNavMenuItem href="/hiring/onboarding" isActive={isActive('/hiring/onboarding') && !isActive('/hiring/onboarding/templates')} element={Link}>Onboarding</SideNavMenuItem>
            <SideNavMenuItem href="/hiring/onboarding/templates" isActive={isActive('/hiring/onboarding/templates')} element={Link}>Onboarding Templates</SideNavMenuItem>
          </SideNavMenu>

          <SideNavMenu
            title="Background Checks"
            renderIcon={Security}
            isActive={isActive('/background-checks')}
            defaultExpanded={isActive('/background-checks')}
          >
            <SideNavMenuItem href="/background-checks" isActive={pathname === '/background-checks'} element={Link}>Overview</SideNavMenuItem>
            <SideNavMenuItem href="/background-checks/packages" isActive={isActive('/background-checks/packages')} element={Link}>Packages</SideNavMenuItem>
            <SideNavMenuItem href="/background-checks/reference-checks" isActive={isActive('/background-checks/reference-checks')} element={Link}>References</SideNavMenuItem>
            <SideNavMenuItem href="/background-checks/licences" isActive={isActive('/background-checks/licences')} element={Link}>Licences</SideNavMenuItem>
            <SideNavMenuItem href="/background-checks/settings" isActive={isActive('/background-checks/settings')} element={Link}>Settings</SideNavMenuItem>
          </SideNavMenu>

          <SideNavMenu
            title="Training"
            renderIcon={Education}
            isActive={isActive('/training')}
            defaultExpanded={isActive('/training')}
          >
            <SideNavMenuItem href="/training" isActive={pathname === '/training'} element={Link}>Overview</SideNavMenuItem>
            <SideNavMenuItem href="/training/courses" isActive={isActive('/training/courses')} element={Link}>Course Library</SideNavMenuItem>
            <SideNavMenuItem href="/training/records" isActive={isActive('/training/records')} element={Link}>Training Records</SideNavMenuItem>
            <SideNavMenuItem href="/training/inductions" isActive={isActive('/training/inductions')} element={Link}>Induction Programs</SideNavMenuItem>
          </SideNavMenu>

          <SideNavMenu
            title="Environment"
            renderIcon={Earth}
            isActive={isActive('/environment') || isActive('/env-reporting')}
            defaultExpanded={isActive('/environment') || isActive('/env-reporting')}
          >
            <SideNavMenuItem
              href="/environment"
              isActive={isActive('/environment')}
              element={Link}
            >
              Monitoring
            </SideNavMenuItem>
            <SideNavMenuItem
              href="/env-reporting"
              isActive={isActive('/env-reporting')}
              element={Link}
            >
              Reporting
            </SideNavMenuItem>
          </SideNavMenu>

          <SideNavMenu
            title="Contractors"
            renderIcon={Construction}
            isActive={isActive('/contractors')}
            defaultExpanded={isActive('/contractors')}
          >
            <SideNavMenuItem
              href="/contractors"
              isActive={pathname === '/contractors'}
              element={Link}
            >
              Companies
            </SideNavMenuItem>
            <SideNavMenuItem
              href="/contractors/workers"
              isActive={isActive('/contractors/workers')}
              element={Link}
            >
              Workers
            </SideNavMenuItem>
            <SideNavMenuItem
              href="/contractors/access-log"
              isActive={isActive('/contractors/access-log')}
              element={Link}
            >
              Site Access Log
            </SideNavMenuItem>
          </SideNavMenu>

          <SideNavLink
            href="/chemicals"
            renderIcon={Chemistry}
            isActive={isActive('/chemicals')}
            element={Link}
          >
            Chemicals
          </SideNavLink>

          <SideNavMenu
            title="Documents"
            renderIcon={Document}
            isActive={isActive('/documents')}
            defaultExpanded={isActive('/documents')}
          >
            <SideNavMenuItem href="/documents" isActive={pathname === '/documents'} element={Link}>All Documents</SideNavMenuItem>
            <SideNavMenuItem href="/documents/workflows" isActive={isActive('/documents/workflows')} element={Link}>Review Workflows</SideNavMenuItem>
          </SideNavMenu>

          <SideNavMenu
            title="Emergency"
            renderIcon={Alarm}
            isActive={isActive('/emergency')}
            defaultExpanded={isActive('/emergency')}
          >
            <SideNavMenuItem href="/emergency" isActive={pathname === '/emergency'} element={Link}>Overview</SideNavMenuItem>
            <SideNavMenuItem href="/emergency/plans" isActive={isActive('/emergency/plans')} element={Link}>Response Plans</SideNavMenuItem>
            <SideNavMenuItem href="/emergency/drills" isActive={isActive('/emergency/drills')} element={Link}>Drills</SideNavMenuItem>
            <SideNavMenuItem href="/emergency/wardens" isActive={isActive('/emergency/wardens')} element={Link}>Wardens</SideNavMenuItem>
            <SideNavMenuItem href="/emergency/muster-points" isActive={isActive('/emergency/muster-points')} element={Link}>Muster Points</SideNavMenuItem>
            <SideNavMenuItem href="/emergency/activations" isActive={isActive('/emergency/activations')} element={Link}>Activations</SideNavMenuItem>
          </SideNavMenu>

          <SideNavMenu title="Reports & KPIs" renderIcon={Analytics} isActive={isActive('/reports')} defaultExpanded={isActive('/reports')}>
            <SideNavMenuItem href="/reports" isActive={pathname === '/reports'} element={Link}>KPI Dashboard</SideNavMenuItem>
            <SideNavMenuItem href="/reports/builder" isActive={isActive('/reports/builder')} element={Link}>Report Builder</SideNavMenuItem>
          </SideNavMenu>

          <SideNavMenu
            title="Administration"
            renderIcon={Settings}
            isActive={isActive('/settings')}
            defaultExpanded={isActive('/settings')}
          >
            <SideNavMenuItem
              href="/settings/organisation"
              isActive={isActive('/settings/organisation')}
              element={Link}
            >
              Organisation
            </SideNavMenuItem>
            <SideNavMenuItem
              href="/settings/sites"
              isActive={isActive('/settings/sites')}
              element={Link}
            >
              Sites &amp; Departments
            </SideNavMenuItem>
            <SideNavMenuItem
              href="/settings/users"
              isActive={isActive('/settings/users')}
              element={Link}
            >
              Users &amp; Roles
            </SideNavMenuItem>
            <SideNavMenuItem
              href="/settings/integrations"
              isActive={isActive('/settings/integrations')}
              element={Link}
            >
              Integrations
            </SideNavMenuItem>
            <SideNavMenuItem
              href="/settings/documents"
              isActive={isActive('/settings/documents')}
              element={Link}
            >
              Document Settings
            </SideNavMenuItem>
            <SideNavMenuItem
              href="/settings/notifications"
              isActive={isActive('/settings/notifications')}
              element={Link}
            >
              Notifications
            </SideNavMenuItem>
          </SideNavMenu>
        </SideNavItems>
      </SideNav>

      <Content style={{ paddingTop: '3rem' }}>
        {children}
      </Content>
      </div>
    </Theme>
  )
}
