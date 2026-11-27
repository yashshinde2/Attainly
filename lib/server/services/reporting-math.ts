export interface DateWindow {
  from?: Date
  to?: Date
}

/**
 * Resolves the effective activity date for reporting: prefers the actual activity/award/event date
 * over the database record creation timestamp.
 */
export function resolveEffectiveActivityDate(primaryDate: Date | null | undefined, createdAt: Date): Date {
  return primaryDate ?? createdAt
}

export function isWithinDateWindow(date: Date, window?: DateWindow): boolean {
  if (!window) return true
  if (window.from && date < window.from) return false
  if (window.to && date > window.to) return false
  return true
}

export interface PlacementOfferMetricRow {
  studentProfileId: string
  packageLpa: number | null
  offerStatus: string
  verificationStatus: string
}

export function computePlacementMetrics(
  offers: PlacementOfferMetricRow[],
  includeUnverified: boolean,
) {
  const scoped = includeUnverified
    ? offers
    : offers.filter((o) => o.verificationStatus === 'VERIFIED')

  const totalOffers = scoped.length
  const distinctPlacedStudents = new Set(
    scoped
      .filter((o) => o.offerStatus !== 'DECLINED')
      .map((o) => o.studentProfileId),
  ).size
  const packages = scoped
    .map((o) => o.packageLpa)
    .filter((v): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0)

  const highestPackageLpa = packages.length > 0 ? Math.max(...packages) : 0
  const averagePackageLpa =
    packages.length > 0
      ? Number((packages.reduce((a, b) => a + b, 0) / packages.length).toFixed(2))
      : 0

  return {
    totalOffers,
    distinctPlacedStudents,
    highestPackageLpa,
    averagePackageLpa,
  }
}

export interface PublicationMetricRow {
  id: string
  doi?: string | null
  title: string
  verificationStatus: string
  authorCount: number
}

/**
 * Deduplicates research publications by DOI (if present) or normalized title + id,
 * distinguishing distinct publications from total co-author credit rows.
 */
export function computeDistinctPublicationStats(
  rows: PublicationMetricRow[],
  includeUnverified: boolean,
) {
  const scoped = includeUnverified
    ? rows
    : rows.filter((r) => r.verificationStatus === 'VERIFIED')

  const seenKeys = new Set<string>()
  let totalAuthorCredits = 0
  for (const row of scoped) {
    const key = row.doi?.trim().toLowerCase() || `${row.title.trim().toLowerCase()}::${row.id}`
    seenKeys.add(key)
    totalAuthorCredits += Math.max(1, row.authorCount)
  }

  return {
    distinctPublications: seenKeys.size,
    totalRecords: scoped.length,
    totalAuthorCredits,
  }
}

export interface EventParticipationMetricRow {
  userId: string
  registrationStatus: string
  attendanceStatus: string
  role: string
}

export function computeEventParticipationMetrics(rows: EventParticipationMetricRow[]) {
  const active = rows.filter((r) => r.registrationStatus !== 'CANCELLED')
  const confirmed = active.filter(
    (r) =>
      r.registrationStatus === 'CONFIRMED' ||
      r.registrationStatus === 'ATTENDED' ||
      r.attendanceStatus === 'PRESENT',
  )
  const winners = active.filter((r) => r.role === 'WINNER')
  const uniqueParticipants = new Set(confirmed.map((r) => r.userId)).size

  return {
    registrations: active.length,
    confirmedParticipants: confirmed.length,
    uniqueConfirmedParticipants: uniqueParticipants,
    winners: winners.length,
  }
}
