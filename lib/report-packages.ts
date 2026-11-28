import type { ReportEntityType } from '@/lib/reporting-registry'

export const REPORT_PACKAGE_KEYS = [
  'STUDENT_ACADEMIC_PORTFOLIO',
  'VERIFIED_STUDENT_ACHIEVEMENT_TRANSCRIPT',
  'STUDENT_CAREER_PLACEMENT_PROFILE',
  'FACULTY_ACADEMIC_PORTFOLIO',
  'FACULTY_ANNUAL_ACTIVITY_REPORT',
  'FACULTY_QUALIFICATION_EXPERIENCE_DOSSIER',
  'DEPARTMENT_ANNUAL_REPORT',
  'INSTITUTION_ANNUAL_REPORT',
  'EVENT_COMPLETION_REPORT',
  'PLACEMENT_GRADUATE_OUTCOME_REPORT',
  'RESEARCH_PROFESSIONAL_DEV_SUMMARY',
] as const

export type ReportPackageKey = (typeof REPORT_PACKAGE_KEYS)[number]

export interface ReportPackageSectionSpec {
  id: string
  label: string
  reportEntityType?: ReportEntityType
  defaultIncluded: boolean
}

export interface ReportPackageDefinition {
  key: ReportPackageKey
  label: string
  category:
    | 'Student Packages'
    | 'Faculty Packages'
    | 'Department & Institution'
    | 'Thematic Summaries'
  description: string
  scopeType: 'STUDENT' | 'FACULTY' | 'DEPARTMENT' | 'INSTITUTION'
  supportsEvidenceZip: boolean
  sections: readonly ReportPackageSectionSpec[]
}

export const REPORT_PACKAGES: Record<ReportPackageKey, ReportPackageDefinition> = {
  STUDENT_ACADEMIC_PORTFOLIO: {
    key: 'STUDENT_ACADEMIC_PORTFOLIO',
    label: 'Student Academic Portfolio',
    category: 'Student Packages',
    description: 'Comprehensive academic progression, achievements, certifications, internships, and career profile for an individual student.',
    scopeType: 'STUDENT',
    supportsEvidenceZip: true,
    sections: [
      { id: 'academics', label: 'Semester Academic Performance', defaultIncluded: true },
      { id: 'achievements', label: 'Achievements & Co-Curriculars', defaultIncluded: true },
      { id: 'certifications', label: 'Certifications', defaultIncluded: true },
      { id: 'internships', label: 'Internships & Projects', defaultIncluded: true },
      { id: 'placements', label: 'Placement Offers & Outcome', defaultIncluded: true },
    ],
  },
  VERIFIED_STUDENT_ACHIEVEMENT_TRANSCRIPT: {
    key: 'VERIFIED_STUDENT_ACHIEVEMENT_TRANSCRIPT',
    label: 'Verified Student Achievement Transcript',
    category: 'Student Packages',
    description: 'Official transcript of strictly VERIFIED co-curricular achievements, certifications, and event participations.',
    scopeType: 'STUDENT',
    supportsEvidenceZip: true,
    sections: [
      { id: 'achievements', label: 'Verified Achievements', defaultIncluded: true },
      { id: 'certifications', label: 'Verified Certifications', defaultIncluded: true },
      { id: 'events', label: 'Confirmed Event Participations', defaultIncluded: true },
    ],
  },
  STUDENT_CAREER_PLACEMENT_PROFILE: {
    key: 'STUDENT_CAREER_PLACEMENT_PROFILE',
    label: 'Student Career & Placement Profile',
    category: 'Student Packages',
    description: 'Focused career readiness dossier covering skills, internships, placement offers, and graduate outcome.',
    scopeType: 'STUDENT',
    supportsEvidenceZip: true,
    sections: [
      { id: 'internships', label: 'Internships & PPOs', defaultIncluded: true },
      { id: 'placements', label: 'Placement Offers & Graduate Outcome', defaultIncluded: true },
      { id: 'certifications', label: 'Professional Certifications', defaultIncluded: true },
    ],
  },
  FACULTY_ACADEMIC_PORTFOLIO: {
    key: 'FACULTY_ACADEMIC_PORTFOLIO',
    label: 'Faculty Academic Portfolio',
    category: 'Faculty Packages',
    description: 'Complete faculty profile covering qualifications, experience, FDPs, publications, grants, consultancy, and contributions.',
    scopeType: 'FACULTY',
    supportsEvidenceZip: true,
    sections: [
      { id: 'qualifications', label: 'Academic Qualifications', defaultIncluded: true },
      { id: 'experience', label: 'Teaching & Industry Experience', defaultIncluded: true },
      { id: 'fdps', label: 'FDPs & Professional Development', defaultIncluded: true },
      { id: 'publications', label: 'Research Publications', defaultIncluded: true },
      { id: 'grants_consultancy', label: 'Grants & Consultancy', defaultIncluded: true },
    ],
  },
  FACULTY_ANNUAL_ACTIVITY_REPORT: {
    key: 'FACULTY_ANNUAL_ACTIVITY_REPORT',
    label: 'Faculty Annual Activity Report',
    category: 'Faculty Packages',
    description: 'Period-scoped annual appraisal report of teaching workload, FDPs, publications, and outreach contributions.',
    scopeType: 'FACULTY',
    supportsEvidenceZip: true,
    sections: [
      { id: 'workload', label: 'Teaching Workload', defaultIncluded: true },
      { id: 'fdps', label: 'FDPs & Workshops', defaultIncluded: true },
      { id: 'publications', label: 'Research Publications', defaultIncluded: true },
      { id: 'grants_consultancy', label: 'Grants, Consultancy & Contributions', defaultIncluded: true },
    ],
  },
  FACULTY_QUALIFICATION_EXPERIENCE_DOSSIER: {
    key: 'FACULTY_QUALIFICATION_EXPERIENCE_DOSSIER',
    label: 'Faculty Qualification & Experience Dossier',
    category: 'Faculty Packages',
    description: 'Structured qualification, prior experience, and teaching load dossier for accreditation inspections.',
    scopeType: 'FACULTY',
    supportsEvidenceZip: false,
    sections: [
      { id: 'qualifications', label: 'Academic Qualifications', defaultIncluded: true },
      { id: 'experience', label: 'Teaching & Industry Experience', defaultIncluded: true },
      { id: 'workload', label: 'Teaching Workload', defaultIncluded: true },
    ],
  },
  DEPARTMENT_ANNUAL_REPORT: {
    key: 'DEPARTMENT_ANNUAL_REPORT',
    label: 'Department Annual Report',
    category: 'Department & Institution',
    description: 'Department-scoped annual summary reusing Report Studio metrics across academics, achievements, placements, FDPs, and research.',
    scopeType: 'DEPARTMENT',
    supportsEvidenceZip: true,
    sections: [
      { id: 'stu_academics', label: 'Student Academics', reportEntityType: 'STUDENT_ACADEMICS', defaultIncluded: true },
      { id: 'achievements', label: 'Student Achievements', reportEntityType: 'ACHIEVEMENTS', defaultIncluded: true },
      { id: 'placements', label: 'Placements', reportEntityType: 'PLACEMENTS', defaultIncluded: true },
      { id: 'faculty_fdps', label: 'Faculty FDPs', reportEntityType: 'FACULTY_FDPS', defaultIncluded: true },
      { id: 'publications', label: 'Research Publications', reportEntityType: 'RESEARCH_PUBLICATIONS', defaultIncluded: true },
      { id: 'events', label: 'Department Events', reportEntityType: 'EVENTS', defaultIncluded: true },
    ],
  },
  INSTITUTION_ANNUAL_REPORT: {
    key: 'INSTITUTION_ANNUAL_REPORT',
    label: 'Institution Annual Report',
    category: 'Department & Institution',
    description: 'Institution-wide annual governance package across student outcomes, research, faculty development, and events.',
    scopeType: 'INSTITUTION',
    supportsEvidenceZip: true,
    sections: [
      { id: 'achievements', label: 'Student Achievements', reportEntityType: 'ACHIEVEMENTS', defaultIncluded: true },
      { id: 'certifications', label: 'Certifications', reportEntityType: 'CERTIFICATIONS', defaultIncluded: true },
      { id: 'internships', label: 'Internships', reportEntityType: 'INTERNSHIPS', defaultIncluded: true },
      { id: 'placements', label: 'Placements', reportEntityType: 'PLACEMENTS', defaultIncluded: true },
      { id: 'higher_ed', label: 'Graduate Outcomes', reportEntityType: 'HIGHER_EDUCATION', defaultIncluded: true },
      { id: 'publications', label: 'Research Publications', reportEntityType: 'RESEARCH_PUBLICATIONS', defaultIncluded: true },
      { id: 'faculty_fdps', label: 'Faculty FDPs', reportEntityType: 'FACULTY_FDPS', defaultIncluded: true },
      { id: 'events', label: 'Institutional Events', reportEntityType: 'EVENTS', defaultIncluded: true },
    ],
  },
  EVENT_COMPLETION_REPORT: {
    key: 'EVENT_COMPLETION_REPORT',
    label: 'Event Completion Report',
    category: 'Thematic Summaries',
    description: 'Event registrations, confirmed attendance, and winner outcomes across the selected reporting period.',
    scopeType: 'INSTITUTION',
    supportsEvidenceZip: false,
    sections: [
      { id: 'events', label: 'Institutional Events', reportEntityType: 'EVENTS', defaultIncluded: true },
      { id: 'hackathons', label: 'Hackathons & Competitions', reportEntityType: 'HACKATHONS', defaultIncluded: true },
      { id: 'sports_cultural', label: 'Sports & Cultural', reportEntityType: 'SPORTS_CULTURAL', defaultIncluded: false },
    ],
  },
  PLACEMENT_GRADUATE_OUTCOME_REPORT: {
    key: 'PLACEMENT_GRADUATE_OUTCOME_REPORT',
    label: 'Placement & Graduate Outcome Report',
    category: 'Thematic Summaries',
    description: 'Consolidated campus placement offers, internships, and higher-studies/entrepreneurship outcomes.',
    scopeType: 'INSTITUTION',
    supportsEvidenceZip: true,
    sections: [
      { id: 'placements', label: 'Placement Offers', reportEntityType: 'PLACEMENTS', defaultIncluded: true },
      { id: 'higher_ed', label: 'Graduate Outcomes', reportEntityType: 'HIGHER_EDUCATION', defaultIncluded: true },
      { id: 'internships', label: 'Student Internships', reportEntityType: 'INTERNSHIPS', defaultIncluded: true },
    ],
  },
  RESEARCH_PROFESSIONAL_DEV_SUMMARY: {
    key: 'RESEARCH_PROFESSIONAL_DEV_SUMMARY',
    label: 'Research & Professional Development Summary',
    category: 'Thematic Summaries',
    description: 'Consolidated summary of canonical publications, FDPs, consultancy projects, and certifications.',
    scopeType: 'INSTITUTION',
    supportsEvidenceZip: true,
    sections: [
      { id: 'publications', label: 'Research Publications', reportEntityType: 'RESEARCH_PUBLICATIONS', defaultIncluded: true },
      { id: 'faculty_fdps', label: 'Faculty FDPs', reportEntityType: 'FACULTY_FDPS', defaultIncluded: true },
      { id: 'consultancy', label: 'Faculty Consultancy', reportEntityType: 'FACULTY_CONSULTANCY', defaultIncluded: true },
      { id: 'certifications', label: 'Student Certifications', reportEntityType: 'CERTIFICATIONS', defaultIncluded: false },
    ],
  },
}

export function isReportPackageKey(value: string): value is ReportPackageKey {
  return (REPORT_PACKAGE_KEYS as readonly string[]).includes(value)
}
