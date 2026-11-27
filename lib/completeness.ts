export interface StudentCompletenessInput {
  hasPersonalInfo: boolean
  hasInstitutionalIdentity?: boolean
  educationCount: number
  semesterCount: number
  achievementCount: number
  participationCount: number
  certificationCount: number
  researchPaperCount: number
  patentCount: number
  projectCount: number
  internshipCount: number
  skillCount: number
  placementOfferCount?: number
  hasGraduateOutcome?: boolean
}

export interface FacultyCompletenessInput {
  hasPersonalInfo: boolean
  educationCount: number
  experienceCount: number
  certificationCount: number
  researchPaperCount: number
  patentCount: number
}

export interface CompletenessSectionItem {
  label: string
  complete: boolean
  href?: string
}

export interface CompletenessGroup {
  percentage: number
  completedSections: number
  totalSections: number
  missingSections: string[]
  items: CompletenessSectionItem[]
}

export interface CompletenessResult {
  percentage: number
  completedSections: number
  totalSections: number
  missingSections: string[]
  mandatory?: CompletenessGroup
  optional?: CompletenessGroup
}

function buildGroup(items: CompletenessSectionItem[]): CompletenessGroup {
  const completedSections = items.filter((s) => s.complete).length
  const totalSections = items.length
  const percentage = totalSections > 0 ? Math.round((completedSections / totalSections) * 100) : 100
  const missingSections = items.filter((s) => !s.complete).map((s) => s.label)
  return { percentage, completedSections, totalSections, missingSections, items }
}

/**
 * Computes student profile completeness separated into:
 * - Mandatory Core Profile (Personal & Contact, Institutional Identity, Education, Semesters, Skills)
 * - Optional Achievements & Engagement (Achievements/Events, Certifications, Projects/Internships, Research/Patents, Career)
 * Maintains top-level percentage/completedSections/totalSections/missingSections for backward compatibility.
 */
export function calculateStudentCompleteness(input: StudentCompletenessInput): CompletenessResult {
  const mandatoryItems: CompletenessSectionItem[] = [
    { label: 'Personal & Contact Details', complete: input.hasPersonalInfo, href: '/student/profile' },
    { label: 'Institutional Identity', complete: input.hasInstitutionalIdentity ?? input.hasPersonalInfo, href: '/student/profile' },
    { label: 'Educational History', complete: input.educationCount > 0, href: '/student/academics' },
    { label: 'Semester Academic Records', complete: input.semesterCount > 0, href: '/student/academics' },
    { label: 'Technical & Core Skills', complete: input.skillCount > 0, href: '/student/certifications' },
  ]

  const optionalItems: CompletenessSectionItem[] = [
    {
      label: 'Achievements & Campus Events',
      complete: input.achievementCount > 0 || input.participationCount > 0,
      href: '/student/achievements',
    },
    { label: 'Certifications', complete: input.certificationCount > 0, href: '/student/certifications' },
    {
      label: 'Projects & Internships',
      complete: input.projectCount > 0 || input.internshipCount > 0,
      href: '/student/projects',
    },
    {
      label: 'Research & Patents',
      complete: input.researchPaperCount > 0 || input.patentCount > 0,
      href: '/student/research',
    },
    {
      label: 'Career & Graduate Outcomes',
      complete: Boolean((input.placementOfferCount ?? 0) > 0 || input.hasGraduateOutcome),
      href: '/student/career',
    },
  ]

  const mandatory = buildGroup(mandatoryItems)
  const optional = buildGroup(optionalItems)

  // Legacy 7-section summary for backward compatibility with existing reports & widgets
  const sections: Array<{ label: string; complete: boolean }> = [
    { label: 'Personal & Institutional Info', complete: input.hasPersonalInfo },
    { label: 'Education or Semesters', complete: input.educationCount > 0 || input.semesterCount > 0 },
    { label: 'Achievements or Events', complete: input.achievementCount > 0 || input.participationCount > 0 },
    { label: 'Certifications', complete: input.certificationCount > 0 },
    { label: 'Research or Patents', complete: input.researchPaperCount > 0 || input.patentCount > 0 },
    { label: 'Projects or Internships', complete: input.projectCount > 0 || input.internshipCount > 0 },
    { label: 'Skills', complete: input.skillCount > 0 },
  ]

  const completedSections = sections.filter((s) => s.complete).length
  const totalSections = sections.length
  const percentage = Math.round((completedSections / totalSections) * 100)
  const missingSections = sections.filter((s) => !s.complete).map((s) => s.label)

  return {
    percentage,
    completedSections,
    totalSections,
    missingSections,
    mandatory,
    optional,
  }
}

/**
 * Computes faculty profile completeness percentage across 5 core sections.
 */
export function calculateFacultyCompleteness(input: FacultyCompletenessInput): CompletenessResult {
  const sections: Array<{ label: string; complete: boolean }> = [
    { label: 'Personal & Contact Info', complete: input.hasPersonalInfo },
    { label: 'Education', complete: input.educationCount > 0 },
    { label: 'Experience', complete: input.experienceCount > 0 },
    { label: 'Certifications', complete: input.certificationCount > 0 },
    { label: 'Research or Patents', complete: input.researchPaperCount > 0 || input.patentCount > 0 },
  ]

  const completedSections = sections.filter((s) => s.complete).length
  const totalSections = sections.length
  const percentage = Math.round((completedSections / totalSections) * 100)
  const missingSections = sections.filter((s) => !s.complete).map((s) => s.label)

  return {
    percentage,
    completedSections,
    totalSections,
    missingSections,
  }
}
