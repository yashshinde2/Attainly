export interface EventCategorySeed {
  code: string
  label: string
  subcategories: string[]
  legacyType: 'TECHNICAL' | 'NON_TECHNICAL' | 'SPORTS' | 'CULTURAL'
  achievementCategory: 'TECHNICAL' | 'NON_TECHNICAL' | 'SPORTS' | 'CULTURAL'
}

export const DEFAULT_EVENT_CATEGORIES: EventCategorySeed[] = [
  {
    code: 'HACKATHON',
    label: 'Hackathon',
    subcategories: ['24-Hour Hackathon', 'Ideathon', 'Code Sprint', 'AI/ML Challenge'],
    legacyType: 'TECHNICAL',
    achievementCategory: 'TECHNICAL',
  },
  {
    code: 'WORKSHOP',
    label: 'Workshop',
    subcategories: ['Hands-on Lab', 'Bootcamp', 'Skill Workshop', 'Tool Training'],
    legacyType: 'TECHNICAL',
    achievementCategory: 'TECHNICAL',
  },
  {
    code: 'SEMINAR',
    label: 'Seminar & Guest Lecture',
    subcategories: ['Guest Lecture', 'Industry Talk', 'Webinar', 'Panel Discussion'],
    legacyType: 'NON_TECHNICAL',
    achievementCategory: 'NON_TECHNICAL',
  },
  {
    code: 'SPORTS',
    label: 'Sports & Athletics',
    subcategories: ['Indoor', 'Outdoor', 'Inter-Department', 'Annual Meet'],
    legacyType: 'SPORTS',
    achievementCategory: 'SPORTS',
  },
  {
    code: 'CULTURAL',
    label: 'Cultural Activity',
    subcategories: ['Music & Dance', 'Fine Arts', 'Literary & Debate', 'Annual Fest'],
    legacyType: 'CULTURAL',
    achievementCategory: 'CULTURAL',
  },
  {
    code: 'ACADEMIC_COMPETITION',
    label: 'Academic Competition',
    subcategories: ['Paper Presentation', 'Project Expo', 'Quiz', 'Coding Contest'],
    legacyType: 'TECHNICAL',
    achievementCategory: 'TECHNICAL',
  },
  {
    code: 'SOCIAL_OUTREACH',
    label: 'Social Outreach & NSS',
    subcategories: ['Community Service', 'Blood Donation', 'Environmental Drive', 'Awareness Camp'],
    legacyType: 'NON_TECHNICAL',
    achievementCategory: 'NON_TECHNICAL',
  },
]

export function mapCategoryToLegacyType(
  categoryCode: string | null | undefined,
): 'TECHNICAL' | 'NON_TECHNICAL' | 'SPORTS' | 'CULTURAL' {
  if (!categoryCode) return 'TECHNICAL'
  const match = DEFAULT_EVENT_CATEGORIES.find((c) => c.code === categoryCode)
  if (match) return match.legacyType
  if (categoryCode === 'SPORTS' || categoryCode === 'CULTURAL' || categoryCode === 'NON_TECHNICAL') {
    return categoryCode
  }
  return 'TECHNICAL'
}

export function mapCategoryToAchievementCategory(
  categoryCode: string | null | undefined,
  legacyType: string,
): 'TECHNICAL' | 'NON_TECHNICAL' | 'SPORTS' | 'CULTURAL' {
  const match = DEFAULT_EVENT_CATEGORIES.find((c) => c.code === categoryCode)
  if (match) return match.achievementCategory
  if (legacyType === 'SPORTS') return 'SPORTS'
  if (legacyType === 'CULTURAL') return 'CULTURAL'
  if (legacyType === 'NON_TECHNICAL') return 'NON_TECHNICAL'
  return 'TECHNICAL'
}

export interface EligibilityEventInput {
  status: string
  registrationDeadline: Date | null
  capacity: number | null
  eligibilityRoles: string[]
  eligibleDepartmentIds: string[]
  eligibleBatches: number[]
  currentParticipantCount: number
  isAlreadyRegistered: boolean
}

export interface EligibilityUserContext {
  portalRole: 'STUDENT' | 'FACULTY' | 'ADMIN'
  departmentId: string | null
  admissionYear: number | null
}

export function checkEventEligibility(
  event: EligibilityEventInput,
  user: EligibilityUserContext,
  now: Date = new Date(),
): { eligible: boolean; reason?: string } {
  if (event.isAlreadyRegistered) {
    return { eligible: true }
  }
  if (event.status !== 'PUBLISHED') {
    return { eligible: false, reason: `Registration is closed (status: ${event.status.toLowerCase()}).` }
  }
  if (event.registrationDeadline && now > event.registrationDeadline) {
    return { eligible: false, reason: 'Registration deadline has passed.' }
  }
  if (event.capacity !== null && event.capacity > 0 && event.currentParticipantCount >= event.capacity) {
    return { eligible: false, reason: 'Event capacity is full.' }
  }
  if (
    event.eligibilityRoles.length > 0 &&
    user.portalRole !== 'ADMIN' &&
    !event.eligibilityRoles.includes(user.portalRole)
  ) {
    return { eligible: false, reason: `Restricted to ${event.eligibilityRoles.join(' / ').toLowerCase()}s.` }
  }
  if (
    event.eligibleDepartmentIds.length > 0 &&
    (!user.departmentId || !event.eligibleDepartmentIds.includes(user.departmentId))
  ) {
    return { eligible: false, reason: 'Restricted to specific eligible departments.' }
  }
  if (
    event.eligibleBatches.length > 0 &&
    user.portalRole === 'STUDENT' &&
    (!user.admissionYear || !event.eligibleBatches.includes(user.admissionYear))
  ) {
    return { eligible: false, reason: `Restricted to batches: ${event.eligibleBatches.join(', ')}.` }
  }
  return { eligible: true }
}

export function generateCertificateRef(eventId: string, userId: string, year: number): string {
  const evtCode = eventId.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase()
  const usrCode = userId.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase()
  return `ATT-${year}-${evtCode}-${usrCode}`
}
