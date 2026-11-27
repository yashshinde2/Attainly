export interface DateWindow {
  from?: Date
  to?: Date
}

export interface ActivityDateResolution {
  date: Date
  isFallbackCreatedAt: boolean
}

/**
 * Resolves the effective activity date for reporting and flags when the primary
 * activity/award/event date is missing and createdAt was used as a fallback.
 */
export function resolveActivityDateWithFlag(
  primaryDate: Date | null | undefined,
  createdAt: Date,
): ActivityDateResolution {
  if (primaryDate) {
    return { date: primaryDate, isFallbackCreatedAt: false }
  }
  return { date: createdAt, isFallbackCreatedAt: true }
}

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
  offerStatus: string // 'OFFERED' | 'ACCEPTED' | 'DECLINED'
  verificationStatus: string
}

/**
 * Separates total offers received, students receiving offers, accepted offers,
 * and confirmed placements (accepted + verified). Never treats OFFERED as confirmed placement.
 */
export function computePlacementMetrics(
  offers: PlacementOfferMetricRow[],
  includeUnverified: boolean,
) {
  const scoped = includeUnverified
    ? offers
    : offers.filter((o) => o.verificationStatus === 'VERIFIED')

  const offersReceived = scoped.length
  const studentsReceivingOffers = new Set(
    scoped.filter((o) => o.offerStatus !== 'DECLINED').map((o) => o.studentProfileId),
  ).size
  const acceptedRows = scoped.filter((o) => o.offerStatus === 'ACCEPTED')
  const acceptedOffers = acceptedRows.length
  const confirmedPlacedStudents = new Set(
    acceptedRows
      .filter((o) => o.verificationStatus === 'VERIFIED')
      .map((o) => o.studentProfileId),
  ).size

  // Backwards-compatible alias for distinctPlacedStudents -> confirmedPlacedStudents
  const distinctPlacedStudents = confirmedPlacedStudents

  const packages = scoped
    .map((o) => o.packageLpa)
    .filter((v): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0)

  const highestPackageLpa = packages.length > 0 ? Math.max(...packages) : 0
  const averagePackageLpa =
    packages.length > 0
      ? Number((packages.reduce((a, b) => a + b, 0) / packages.length).toFixed(2))
      : 0

  return {
    offersReceived,
    totalOffers: offersReceived,
    studentsReceivingOffers,
    acceptedOffers,
    confirmedPlacedStudents,
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
