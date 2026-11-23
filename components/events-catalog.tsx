'use client'

import { useState } from 'react'
import type { EventWithDetails } from '@/lib/server/repositories/event-repository'
import { CalendarDays, Clock, MapPin, Tag, Users } from 'lucide-react'

export function EventsCatalog({
  events,
  portalRole,
}: {
  events: EventWithDetails[]
  portalRole: 'student' | 'faculty'
}) {
  const [filterType, setFilterType] = useState<string>('ALL')
  const [search, setSearch] = useState('')

  const categories = ['ALL', 'TECHNICAL', 'NON_TECHNICAL', 'SPORTS', 'CULTURAL']

  const filtered = events.filter((evt) => {
    const matchesType = filterType === 'ALL' || evt.type === filterType
    const matchesSearch =
      search === '' ||
      evt.title.toLowerCase().includes(search.toLowerCase()) ||
      evt.department.name.toLowerCase().includes(search.toLowerCase()) ||
      (evt.description && evt.description.toLowerCase().includes(search.toLowerCase()))
    return matchesType && matchesSearch
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Campus Events &amp; Activities</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Explore upcoming symposiums, hackathons, sports meets, and cultural festivals across campus.
          </p>
        </div>
        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
          {events.length} {events.length === 1 ? 'event' : 'events'} listed
        </span>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search events by title, department, or topic…"
          className="w-full max-w-sm rounded-xl border border-input bg-background px-3.5 py-2 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
        />

        <div className="flex flex-wrap items-center gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilterType(cat)}
              className={`rounded-xl px-3 py-1.5 text-xs font-medium transition ${
                filterType === cat
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-secondary text-secondary-foreground hover:bg-muted'
              }`}
            >
              {cat === 'ALL' ? 'All Events' : cat.replaceAll('_', ' ').toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Events Grid */}
      {filtered.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((evt) => {
            const startDate = new Date(evt.startsAt)
            const endDate = new Date(evt.endsAt)
            const isUpcoming = startDate > new Date()
            const isOngoing = startDate <= new Date() && endDate >= new Date()

            return (
              <div
                key={evt.id}
                className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5 transition hover:border-primary/40 hover:shadow-sm"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-secondary-foreground">
                      {evt.type.replaceAll('_', ' ').toLowerCase()}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        isOngoing
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : isUpcoming
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                            : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {isOngoing ? 'Happening Now' : isUpcoming ? 'Upcoming' : 'Concluded'}
                    </span>
                  </div>

                  <h3 className="mt-3 font-semibold text-foreground text-base line-clamp-1">{evt.title}</h3>
                  <p className="mt-1.5 text-xs leading-5 text-muted-foreground line-clamp-3">
                    {evt.description || 'No additional details provided for this event.'}
                  </p>
                </div>

                <div className="mt-5 space-y-2 border-t border-border pt-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <MapPin size={13} className="text-primary shrink-0" />
                    <span className="truncate">{evt.department.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CalendarDays size={13} className="shrink-0" />
                    <span>
                      {startDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      {startDate.toDateString() !== endDate.toDateString() &&
                        ` – ${endDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <Users size={13} />
                      <span>{evt._count?.participation ?? 0} participants</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border p-12 text-center">
          <CalendarDays size={32} className="text-muted-foreground/60 mb-3" />
          <p className="text-sm font-medium text-foreground">No campus events match your criteria</p>
          <p className="mt-1 text-xs text-muted-foreground">Try clearing your search or switching categories.</p>
        </div>
      )}
    </div>
  )
}
