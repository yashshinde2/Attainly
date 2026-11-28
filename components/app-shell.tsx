'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  Award,
  BarChart3,
  Bell,
  BookOpen,
  Briefcase,
  CalendarDays,
  CheckSquare,
  ChevronDown,
  Command,
  FileBadge,
  FileSpreadsheet,
  FileText,
  FlaskConical,
  FolderOpen,
  GraduationCap,
  Layers,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings2,
  ShieldCheck,
  UserCircle,
  UsersRound,
  X,
  type LucideIcon,
} from 'lucide-react'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { ThemeToggle } from '@/components/theme-toggle'
import {
  PORTAL_META,
  type NavGroupConfig,
  type NavItemConfig,
  type PortalType,
} from '@/lib/portal-navigation'

const ICON_MAP: Record<NavItemConfig['iconKey'], LucideIcon> = {
  overview: LayoutDashboard,
  profile: UserCircle,
  academics: BookOpen,
  achievements: Award,
  certifications: FileBadge,
  projects: Layers,
  research: FlaskConical,
  career: Briefcase,
  events: CalendarDays,
  documents: FolderOpen,
  resume: FileText,
  notifications: Bell,
  qualifications: GraduationCap,
  experience: Layers,
  development: FileBadge,
  consultancy: Briefcase,
  contributions: Award,
  students: GraduationCap,
  faculty: UsersRound,
  verifications: CheckSquare,
  departments: BookOpen,
  courses: Layers,
  reports: BarChart3,
  inspections: FileBadge,
  imports: FileSpreadsheet,
  people: ShieldCheck,
  settings: Settings2,
}

const PortalShellContext = createContext(false)

export function usePortalShellActive(): boolean {
  return useContext(PortalShellContext)
}

export interface AppShellProps {
  portal: PortalType
  navGroups: NavGroupConfig[]
  institutionName: string
  userName: string
  userEmail: string
  roleLabel: string
  academicYearLabel?: string | null
  children: ReactNode
}

export function AppShell({
  portal,
  navGroups,
  institutionName,
  userName,
  userEmail,
  roleLabel,
  academicYearLabel,
  children,
}: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [globalSearch, setGlobalSearch] = useState('')
  const pathname = usePathname()
  const router = useRouter()
  const meta = PORTAL_META[portal]
  const pathSegments = pathname.split('/').filter(Boolean)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileOpen(false)
        setProfileMenuOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const q = globalSearch.trim()
    if (!q) return
    if (portal === 'admin') {
      router.push(`/admin/students?q=${encodeURIComponent(q)}`)
    } else if (portal === 'student') {
      router.push(`/student/documents?q=${encodeURIComponent(q)}`)
    } else {
      router.push(`/faculty/documents?q=${encodeURIComponent(q)}`)
    }
  }

  const initials =
    userName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase() ?? '')
      .join('') || portal[0].toUpperCase()

  const renderNavContent = (isMobileDrawer: boolean) => {
    const isCompact = !isMobileDrawer && collapsed
    return (
      <>
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-sidebar-border px-4">
          <Link href={`/${portal}`} className="flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring rounded-lg">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              <Command aria-hidden="true" size={16} />
            </span>
            {!isCompact && (
              <span className="text-base font-semibold tracking-tight text-sidebar-foreground">
                attainly
              </span>
            )}
          </Link>
          {isMobileDrawer ? (
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Close navigation"
            >
              <X size={18} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setCollapsed((c) => !c)}
              className="hidden rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:inline-flex"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            </button>
          )}
        </div>

        {!isCompact && (
          <div className="px-3.5 pt-4">
            <div className="rounded-xl border border-sidebar-border bg-background/70 px-3 py-2.5">
              <p className="truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {meta.label}
              </p>
              <p className="mt-0.5 truncate text-xs font-semibold text-foreground">{institutionName}</p>
            </div>
          </div>
        )}

        <nav aria-label={`${meta.label} navigation`} className="flex-1 space-y-5 overflow-y-auto px-2.5 py-4">
          {navGroups.map((group) => (
            <div key={group.groupLabel}>
              {!isCompact && (
                <p className="mb-1.5 px-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {group.groupLabel}
                </p>
              )}
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const Icon = ICON_MAP[item.iconKey]
                  const active =
                    pathname === item.href ||
                    (item.href !== `/${portal}` && pathname.startsWith(`${item.href}/`))
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch={false}
                      onClick={() => setMobileOpen(false)}
                      title={isCompact ? item.label : undefined}
                      aria-current={active ? 'page' : undefined}
                      className={`group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring ${
                        active
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold'
                          : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                      } ${isCompact ? 'justify-center px-2' : ''}`}
                    >
                      <Icon aria-hidden="true" size={16} className="shrink-0" />
                      {!isCompact && <span className="truncate">{item.label}</span>}
                      {isCompact && (
                        <span
                          role="tooltip"
                          className="pointer-events-none absolute left-full z-40 ml-2.5 hidden whitespace-nowrap rounded-md border border-border bg-popover px-2.5 py-1 text-xs font-medium text-popover-foreground shadow-md group-hover:block group-focus-visible:block"
                        >
                          {item.label}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="mt-auto border-t border-sidebar-border p-2.5 space-y-1">
          <Link
            href="/"
            title={isCompact ? 'Back to Attainly' : undefined}
            className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring ${isCompact ? 'justify-center px-2' : ''}`}
          >
            <Settings2 aria-hidden="true" size={15} className="shrink-0" />
            {!isCompact && <span>Attainly Home</span>}
          </Link>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: '/login' })}
            title={isCompact ? 'Sign out' : undefined}
            className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-destructive transition hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring ${isCompact ? 'justify-center px-2' : ''}`}
          >
            <LogOut aria-hidden="true" size={15} className="shrink-0" />
            {!isCompact && <span>Sign out</span>}
          </button>
        </div>
      </>
    )
  }

  return (
    <PortalShellContext.Provider value={true}>
      <div
        className={`min-h-screen bg-background ${
          collapsed ? 'lg:grid lg:grid-cols-[72px_minmax(0,1fr)]' : 'lg:grid lg:grid-cols-[248px_minmax(0,1fr)]'
        }`}
      >
        {/* Desktop Persistent Sidebar */}
        <aside className="hidden border-r border-sidebar-border bg-sidebar lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
          {renderNavContent(false)}
        </aside>

        {/* Mobile Slide-Over Drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
            <div
              className="fixed inset-0 bg-foreground/30 backdrop-blur-[1px]"
              onClick={() => setMobileOpen(false)}
            />
            <aside className="relative z-10 flex h-full w-72 max-w-[85vw] flex-col border-r border-sidebar-border bg-sidebar shadow-xl">
              {renderNavContent(true)}
            </aside>
          </div>
        )}

        {/* Main Content Column */}
        <div className="flex min-w-0 flex-col">
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border bg-card/85 px-4 backdrop-blur-md sm:px-7">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="rounded-lg p-2 text-muted-foreground hover:bg-muted lg:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Toggle navigation"
                aria-expanded={mobileOpen}
                onClick={() => setMobileOpen(true)}
              >
                <Menu aria-hidden="true" size={19} />
              </button>

              <nav aria-label="Breadcrumb" className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
                {pathSegments.map((seg, idx) => {
                  const href = '/' + pathSegments.slice(0, idx + 1).join('/')
                  const isLast = idx === pathSegments.length - 1
                  return (
                    <span key={href} className="inline-flex items-center gap-1.5">
                      {idx > 0 && <span className="text-border">/</span>}
                      {isLast ? (
                        <span className="font-semibold capitalize text-foreground">{seg.replace(/-/g, ' ')}</span>
                      ) : (
                        <Link href={href} className="capitalize transition hover:text-foreground">
                          {seg.replace(/-/g, ' ')}
                        </Link>
                      )}
                    </span>
                  )
                })}
              </nav>
            </div>

            <div className="ml-auto flex items-center gap-2.5">
              {academicYearLabel && (
                <span className="hidden rounded-full border border-border bg-muted/60 px-2.5 py-1 text-[11px] font-medium text-muted-foreground xl:inline-flex">
                  AY {academicYearLabel}
                </span>
              )}

              <form onSubmit={handleSearchSubmit} className="relative hidden md:block">
                <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="search"
                  value={globalSearch}
                  onChange={(e) => setGlobalSearch(e.target.value)}
                  placeholder={meta.searchPlaceholder}
                  aria-label={meta.searchPlaceholder}
                  className="w-44 rounded-lg border border-input bg-background py-1.5 pl-8 pr-3 text-xs outline-none transition-all focus:w-60 focus:border-ring focus:ring-2 focus:ring-ring/20"
                />
              </form>

              <Link
                href={meta.notificationsHref}
                aria-label="Notifications"
                title="Notifications"
                className="flex size-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Bell size={15} />
              </Link>

              <ThemeToggle />

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setProfileMenuOpen((o) => !o)}
                  aria-expanded={profileMenuOpen}
                  aria-haspopup="menu"
                  className="flex items-center gap-2 rounded-lg border border-border bg-card px-2 py-1 text-left transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="flex size-7 items-center justify-center rounded-full bg-secondary text-[11px] font-bold text-secondary-foreground">
                    {initials}
                  </span>
                  <span className="hidden max-w-[110px] truncate text-xs font-medium text-foreground sm:block">
                    {userName}
                  </span>
                  <ChevronDown size={13} className="hidden text-muted-foreground sm:block" />
                </button>

                {profileMenuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-60 rounded-xl border border-border bg-popover p-2 text-popover-foreground shadow-lg"
                  >
                    <div className="border-b border-border px-2.5 py-2">
                      <p className="truncate text-xs font-semibold text-foreground">{userName}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{userEmail}</p>
                      <span className="mt-1.5 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                        {roleLabel}
                      </span>
                    </div>
                    <div className="mt-1 space-y-0.5">
                      <Link
                        href={`/${portal}`}
                        role="menuitem"
                        onClick={() => setProfileMenuOpen(false)}
                        className="block rounded-lg px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
                      >
                        Workspace Overview
                      </Link>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => signOut({ callbackUrl: '/login' })}
                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-destructive hover:bg-destructive/10"
                      >
                        <LogOut size={13} />
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>

          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-7 sm:py-8">
            {children}
          </main>
        </div>
      </div>
    </PortalShellContext.Provider>
  )
}
