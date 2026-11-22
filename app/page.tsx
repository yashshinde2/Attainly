import Link from 'next/link'
import { ThemeToggle } from '@/components/theme-toggle'
import { InstallPrompt } from '@/components/install-prompt'
import { ArrowRight, BookOpen, CalendarDays, GraduationCap, Layers3, ShieldCheck, UsersRound } from 'lucide-react'

const portals = [
  { title: 'Student portal', description: 'A home for learning, events, and achievements.', href: '/student', icon: GraduationCap, tone: 'indigo' },
  { title: 'Faculty portal', description: 'Tools for teaching, mentoring, and research.', href: '/faculty', icon: BookOpen, tone: 'teal' },
  { title: 'Institution admin', description: 'A connected view of your campus operations.', href: '/admin', icon: ShieldCheck, tone: 'amber' },
]

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
        <Link className="flex items-center gap-3" href="/">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Layers3 aria-hidden="true" size={20} /></span>
          <span className="text-xl font-semibold tracking-tight">attainly</span>
        </Link>
        <div className="flex items-center gap-3"><InstallPrompt /><ThemeToggle /><a href="#portals" className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium transition hover:bg-muted">Explore portals <ArrowRight aria-hidden="true" size={16} /></a></div>
      </header>

      <section className="mx-auto grid max-w-7xl items-center gap-14 px-6 pb-20 pt-14 lg:grid-cols-[1.05fr_.95fr] lg:px-10 lg:pb-28 lg:pt-20">
        <div className="max-w-2xl">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary"><span className="size-2 rounded-full bg-accent" /> One campus, moving forward</div>
          <h1 className="text-5xl font-semibold leading-[1.08] tracking-[-0.05em] sm:text-6xl lg:text-7xl">A clearer path through <span className="text-primary">campus life.</span></h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">Attainly brings student growth, faculty work, and institutional operations into one thoughtful place.</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <a href="#portals" className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90">Explore the portals <ArrowRight aria-hidden="true" size={17} /></a>
            <a href="#about" className="rounded-xl border border-border bg-card px-5 py-3 text-sm font-semibold transition hover:bg-muted">About Attainly</a>
          </div>
          <div className="mt-12 flex items-center gap-3 text-sm text-muted-foreground"><span className="flex -space-x-2"><span className="flex size-8 items-center justify-center rounded-full border-2 border-background bg-primary/10 text-primary"><UsersRound aria-hidden="true" size={14} /></span><span className="flex size-8 items-center justify-center rounded-full border-2 border-background bg-accent/20 text-foreground"><CalendarDays aria-hidden="true" size={14} /></span><span className="flex size-8 items-center justify-center rounded-full border-2 border-background bg-secondary text-secondary-foreground"><BookOpen aria-hidden="true" size={14} /></span></span><span>Designed around the whole campus community</span></div>
        </div>

        <div className="relative mx-auto w-full max-w-lg">
          <div aria-hidden="true" className="absolute -right-8 -top-8 size-52 rounded-full bg-accent/15 blur-3xl" />
          <div className="relative rounded-[2rem] border border-border bg-card p-5 shadow-[0_24px_80px_-32px_rgba(31,43,73,.25)] sm:p-7">
            <div className="flex items-center justify-between border-b border-border pb-5"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-muted-foreground">Your campus, connected</p><p className="mt-1 text-lg font-semibold">A better overview</p></div><span className="flex size-10 items-center justify-center rounded-xl bg-primary/8 text-primary"><Layers3 aria-hidden="true" size={19} /></span></div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {['Learning', 'Campus events', 'Research', 'Student growth'].map((label, index) => <div key={label} className="rounded-2xl border border-border/70 bg-background p-4"><span className={`mb-5 flex size-9 items-center justify-center rounded-xl ${index % 2 ? 'bg-accent/20 text-foreground' : 'bg-primary/8 text-primary'}`}><span className="text-sm font-semibold">0{index + 1}</span></span><p className="text-sm font-medium">{label}</p><p className="mt-1 text-xs text-muted-foreground">A space to get started</p></div>)}
            </div>
            <div className="mt-4 flex items-center gap-3 rounded-2xl bg-primary px-4 py-4 text-primary-foreground"><span className="flex size-10 items-center justify-center rounded-xl bg-white/10"><GraduationCap aria-hidden="true" size={20} /></span><div><p className="text-sm font-semibold">Built for every role</p><p className="mt-0.5 text-xs text-primary-foreground/75">The right tools, right where you need them</p></div></div>
          </div>
          <div aria-hidden="true" className="absolute -bottom-5 -left-5 -z-10 size-32 rounded-full bg-primary/10 blur-2xl" />
        </div>
      </section>

      <section id="portals" className="border-y border-border/70 bg-card/60">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-10 lg:py-20">
          <div className="mb-9 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold uppercase tracking-[.17em] text-primary">Choose your workspace</p><h2 className="mt-3 text-3xl font-semibold tracking-tight">Made for the work you do.</h2></div><p className="max-w-md text-sm leading-6 text-muted-foreground">A focused starting point for each part of the college community.</p></div>
          <div className="grid gap-4 md:grid-cols-3">
            {portals.map(({ title, description, href, icon: Icon, tone }) => <Link key={href} href={href} className="group rounded-2xl border border-border bg-background p-6 transition hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg"><div className={`mb-7 flex size-12 items-center justify-center rounded-2xl ${tone === 'amber' ? 'bg-accent/20 text-foreground' : tone === 'teal' ? 'bg-secondary text-secondary-foreground' : 'bg-primary/8 text-primary'}`}><Icon aria-hidden="true" size={21} /></div><div className="flex items-center justify-between"><h3 className="text-lg font-semibold">{title}</h3><ArrowRight aria-hidden="true" size={18} className="text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" /></div><p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p></Link>)}
          </div>
        </div>
      </section>
      <footer id="about" className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between lg:px-10"><span className="font-semibold tracking-tight text-foreground">attainly</span><span>A thoughtful foundation for engineering education.</span></footer>
    </main>
  )
}
