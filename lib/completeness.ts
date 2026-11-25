export interface StudentCompletenessInput {
  hasPersonalInfo: boolean
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
}

export interface FacultyCompletenessInput {
  hasPersonalInfo: boolean
  educationCount: number
  experienceCount: number
  certificationCount: number
  researchPaperCount: number
  patentCount: number
}

export interface CompletenessResult {
  percentage: number
  completedSections: number
  totalSections: number
  missingSections: string[]
}

/**
 * Computes student profile completeness percentage across 7 core sections.
 * Shared between client workspace UI and server-side reports.
 */
export function calculateStudentCompleteness(input: StudentCompletenessInput): CompletenessResult {
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
