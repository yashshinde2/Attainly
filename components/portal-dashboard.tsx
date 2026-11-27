'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
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
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { signOut } from 'next-auth/react'
import { ThemeToggle } from '@/components/theme-toggle'

const portalConfig = {
  student: {
    label: 'Student portal',
    heading: 'Your student workspace',
    description: 'Academic progression, verified achievements, documents, career outcomes, and resume portfolio.',
    icon: GraduationCap,
    links: [
      ['Overview', '/student', LayoutDashboard],
      ['My Profile', '/student/profile', UserCircle],
      ['Academics', '/student/academics', BookOpen],
      ['Achievements', '/student/achievements', Award],
      ['Certifications & Skills', '/student/certifications', FileBadge],
      ['Projects & Internships', '/student/projects', Layers],
      ['Research & Innovation', '/student/research', FlaskConical],
      ['Career & Placements', '/student/career', Briefcase],
      ['Events', '/student/events', CalendarDays],
      ['My Documents', '/student/documents', FolderOpen],
      ['Resume & Portfolio', '/student/resume', FileText],
      ['Notifications', '/student/notifications', Bell],
    ],
  },
  faculty: {
    label: 'Faculty portal',
    heading: 'Your faculty workspace',
    description: 'Academic portfolio, teaching workload, research publications, consultancy, and CV builder.',
    icon: BookOpen,
    links: [
      ['Overview', '/faculty', LayoutDashboard],
      ['My Profile', '/faculty/profile', UserCircle],
      ['Qualifications', '/faculty/qualifications', GraduationCap],
      ['Experience & Teaching', '/faculty/experience', Layers],
      ['Professional Development', '/faculty/development', FileBadge],
      ['Research & Innovation', '/faculty/research', FlaskConical],
      ['Consultancy', '/faculty/consultancy', Briefcase],
      ['Contributions', '/faculty/contributions', Award],
      ['Events', '/faculty/events', CalendarDays],
      ['My Documents', '/faculty/documents', FolderOpen],
      ['Academic CV', '/faculty/cv', FileText],
      ['Notifications', '/faculty/notifications', Bell],
    ],
  },
  admin: {
    label: 'Institution admin',
    heading: 'Admin Command Center',
    description: 'Institutional analytics, student & faculty directories, verification queue, and governance.',
    icon: ShieldCheck,
    links: [
      ['Overview', '/admin', LayoutDashboard],
      ['Students', '/admin/students', GraduationCap],
      ['Faculty', '/admin/faculty', UsersRound],
      ['Verifications', '/admin/verifications', CheckSquare],
      ['Departments', '/admin/departments', BookOpen],
      ['Courses', '/admin/courses', Layers],
      ['Events', '/admin/events', CalendarDays],
      ['Reports', '/admin/reports', BarChart3],
      ['Document Vault', '/admin/documents', FolderOpen],
      ['Inspections', '/admin/inspections', FileBadge],
      ['Users & Access', '/admin/people', ShieldCheck],
      ['Settings', '/admin/settings', Settings2],
    ],
  },
} as const

type Portal = keyof typeof portalConfig

export function PortalDashboard({ portal, content }: { portal: Portal; content?: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [globalSearch, setGlobalSearch] = useState('')
  const pathname = usePathname()
  const router = useRouter()
  const config = portalConfig[portal]
  const BrandIcon = config.icon

  const pathSegments = pathname.split('/').filter(Boolean)

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

  return (
    <main className={`min-h-screen bg-background ${collapsed ? 'lg:grid lg:grid-cols-[76px_minmax(0,1fr)]' : 'lg:grid lg:grid-cols-[248px_minmax(0,1fr)]'}`}>
      <aside className={`${menuOpen ? 'block' : 'hidden'} border-r border-border bg-card lg:flex lg:flex-col`}>
        <div className="flex h-[72px] items-center justify-between border-b border-border px-5">
          <div className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Command aria-hidden="true" size={18} />
            </span>
            {!collapsed && <span className="text-lg font-semibold tracking-tight">attainly</span>}
          </div>
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="hidden rounded-lg p-1.5 text-muted-foreground hover:bg-muted lg:inline-flex"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
        </div>
        {!collapsed && (
          <div className="px-4 pt-6">
            <p className="px-3 text-[10px] font-semibold uppercase tracking-[.16em] text-muted-foreground">Workspace</p>
            <div className="mt-3 flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-3">
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary/8 text-primary">
                <BrandIcon aria-hidden="true" size={18} />
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{config.label}</span>
              <ChevronDown aria-hidden="true" size={15} className="text-muted-foreground" />
            </div>
          </div>
        )}
        <nav aria-label={`${config.label} navigation`} className="flex flex-col gap-1 px-3 pt-6">
          {config.links.map(([label, href, Icon]) => {
            const active = pathname === href || (href !== `/${portal}` && pathname.startsWith(`${href}/`))
            return (
              <Link
                key={href}
                href={href}
                prefetch={true}
                onClick={() => setMenuOpen(false)}
                title={collapsed ? label : undefined}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  active
                    ? 'bg-primary/8 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                } ${collapsed ? 'justify-center px-2' : ''}`}
              >
                <Icon aria-hidden="true" size={17} className="shrink-0" />
                {!collapsed && <span className="truncate">{label}</span>}
              </Link>
            )
          })}
        </nav>
        <div className="mt-auto hidden border-t border-border p-4 lg:flex lg:flex-col lg:gap-1">
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: '/login' })}
            title={collapsed ? 'Sign out' : undefined}
            className="flex w-full items-center gap-3 rounded-xl p-2 text-left text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-destructive">
              <LogOut aria-hidden="true" size={17} />
            </span>
            {!collapsed && <span>Sign out</span>}
          </button>
          <Link
            href="/"
            title={collapsed ? 'Back to Attainly' : undefined}
            className="flex items-center gap-3 rounded-xl p-2 text-sm text-muted-foreground transition hover:bg-muted active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
              <Settings2 aria-hidden="true" size={17} />
            </span>
            {!collapsed && <span>Back to Attainly</span>}
          </Link>
        </div>
      </aside>
      <section className="min-w-0">
        <header className="flex h-[72px] items-center justify-between border-b border-border bg-card/70 px-5 sm:px-8">
          <button
            type="button"
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted lg:hidden"
            aria-label="Toggle navigation"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <Menu aria-hidden="true" size={20} />
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
                    <Link href={href} className="capitalize hover:text-foreground">
                      {seg.replace(/-/g, ' ')}
                    </Link>
                  )}
                </span>
              )
            })}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <form onSubmit={handleSearchSubmit} className="relative hidden md:block">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder={portal === 'admin' ? 'Search students…' : 'Search documents…'}
                className="w-48 rounded-xl border border-border bg-background py-1.5 pl-8 pr-3 text-xs outline-none transition focus:w-64 focus:border-primary"
              />
            </form>
            <ThemeToggle />
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
              title="Sign out & switch account"
            >
              <LogOut aria-hidden="true" size={14} />
              <span className="hidden sm:inline">Sign out</span>
            </button>
            <span
              className="flex size-9 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground"
              aria-label="Profile placeholder"
            >
              {portal[0].toUpperCase()}
            </span>
          </div>
        </header>
        <div className="mx-auto max-w-6xl px-5 py-9 sm:px-8 sm:py-12">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-medium text-primary">Attainly / {config.label}</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{config.heading}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{config.description}</p>
            </div>
            <span className="w-fit rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground">
              Foundation preview
            </span>
          </div>
          {content ?? (
            <>
              <div className="mt-9 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {['Overview', 'Activity', 'Quick access'].map((title, index) => (
                  <article key={title} className="min-h-48 rounded-2xl border border-border bg-card p-5 sm:p-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-semibold">{title}</h2>
                      <span className="flex size-9 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                        {index === 0 ? (
                          <LayoutDashboard aria-hidden="true" size={17} />
                        ) : index === 1 ? (
                          <CalendarDays aria-hidden="true" size={17} />
                        ) : (
                          <BookOpen aria-hidden="true" size={17} />
                        )}
                      </span>
                    </div>
                    <div className="mt-7 flex min-h-20 items-center justify-center rounded-xl border border-dashed border-border bg-background">
                      <p className="px-4 text-center text-sm text-muted-foreground">{title} placeholder</p>
                    </div>
                  </article>
                ))}
              </div>
              <p className="mt-6 text-xs text-muted-foreground">
                Portal structure only — connect institutional data and permissions to populate this workspace.
              </p>
            </>
          )}
        </div>
      </section>
    </main>
  )
}
