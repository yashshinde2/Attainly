import { Command } from 'lucide-react'

export function PortalSkeleton({ label }: { label: string }) {
  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      {/* Sidebar Skeleton */}
      <aside className="hidden border-r border-border bg-card lg:flex lg:flex-col">
        <div className="flex h-[72px] items-center gap-3 border-b border-border px-6">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary/20 text-primary animate-pulse">
            <Command aria-hidden="true" size={18} />
          </span>
          <span className="text-lg font-semibold tracking-tight text-foreground">attainly</span>
        </div>
        <div className="px-4 pt-6">
          <div className="h-3 w-16 rounded bg-muted animate-pulse" />
          <div className="mt-3 flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-3">
            <div className="size-9 rounded-lg bg-muted animate-pulse" />
            <div className="h-4 flex-1 rounded bg-muted animate-pulse" />
          </div>
        </div>
        <div className="flex flex-col gap-2 px-4 pt-7">
          <div className="h-9 w-full rounded-xl bg-muted/60 animate-pulse" />
          <div className="h-9 w-full rounded-xl bg-muted/40 animate-pulse" />
          <div className="h-9 w-full rounded-xl bg-muted/40 animate-pulse" />
          <div className="h-9 w-full rounded-xl bg-muted/40 animate-pulse" />
        </div>
      </aside>

      {/* Main Content Skeleton */}
      <div className="flex flex-col">
        {/* Top Header */}
        <header className="flex h-[72px] items-center justify-between border-b border-border px-6 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="h-5 w-32 rounded-lg bg-muted animate-pulse" />
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              {label}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-muted animate-pulse" />
            <div className="h-8 w-20 rounded-lg bg-muted animate-pulse" />
          </div>
        </header>

        {/* Content Body Skeleton */}
        <main className="flex-1 p-6 sm:p-8">
          <div className="mx-auto max-w-7xl space-y-6">
            {/* Title / Hero */}
            <div className="space-y-2">
              <div className="h-8 w-64 rounded-xl bg-muted animate-pulse" />
              <div className="h-4 w-96 rounded bg-muted/70 animate-pulse" />
            </div>

            {/* Metric / Action Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="rounded-2xl border border-border bg-card p-5 space-y-3">
                  <div className="h-3 w-20 rounded bg-muted animate-pulse" />
                  <div className="h-7 w-24 rounded-lg bg-muted animate-pulse" />
                  <div className="h-2 w-full rounded bg-muted/50 animate-pulse" />
                </div>
              ))}
            </div>

            {/* Main Section */}
            <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="h-5 w-40 rounded bg-muted animate-pulse" />
                <div className="h-8 w-24 rounded-xl bg-muted animate-pulse" />
              </div>
              <div className="h-36 w-full rounded-xl bg-muted/30 animate-pulse" />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
