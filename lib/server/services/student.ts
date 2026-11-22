import 'server-only'
import { z } from 'zod'
import { requirePermission, type AuthenticatedPrincipal } from '../authorization'
import { prisma } from '@/lib/server/db'

function checkPerm(principal: AuthenticatedPrincipal, specific: string, fallback: string) {
  const perm = principal.permissions.includes(specific) ? specific : fallback
  requirePermission(principal, perm)
}

// ---------------- Profile ----------------
const profileInput = z.object({
  dateOfBirth: z.coerce.date().nullable().optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  address: z.string().trim().max(500).nullable().optional(),
  enrollmentNumber: z.string().trim().max(60).nullable().optional(),
  departmentId: z.string().trim().nullable().optional(),
  courseId: z.string().trim().nullable().optional(),
  admissionYear: z.coerce.number().int().min(1990).max(2100).nullable().optional(),
  currentSemester: z.coerce.number().int().min(1).max(8).nullable().optional(),
  linkedinUrl: z.string().trim().max(2000).nullable().optional(),
  githubUrl: z.string().trim().max(2000).nullable().optional(),
  portfolioUrl: z.string().trim().max(2000).nullable().optional(),
  photoUrl: z.string().trim().max(2000).nullable().optional(),
})

export type StudentProfileInput = z.infer<typeof profileInput>

export interface StudentProfileRepository<TProfile> {
  findByUser(input: { institutionId: string; userId: string }): Promise<TProfile | null>
  upsertByUser(input: { institutionId: string; userId: string; data: StudentProfileInput }): Promise<TProfile>
}

export async function readOwnStudentProfile<TProfile>(input: {
  principal: AuthenticatedPrincipal
  repository: StudentProfileRepository<TProfile>
}): Promise<TProfile | null> {
  checkPerm(input.principal, 'student_profile:read_own', 'student_profile:read_own')
  return input.repository.findByUser({
    institutionId: input.principal.institutionId,
    userId: input.principal.userId,
  })
}

export async function updateOwnStudentProfile<TProfile>(input: {
  principal: AuthenticatedPrincipal
  repository: StudentProfileRepository<TProfile>
  data: unknown
}): Promise<TProfile> {
  checkPerm(input.principal, 'student_profile:edit_own', 'student_profile:edit_own')
  const data = profileInput.parse(input.data)

  // Enforce enrollmentNumber uniqueness per institution if provided
  if (data.enrollmentNumber) {
    const existing = await prisma.studentProfile.findFirst({
      where: {
        institutionId: input.principal.institutionId,
        enrollmentNumber: { equals: data.enrollmentNumber, mode: 'insensitive' },
        userId: { not: input.principal.userId },
      },
    })
    if (existing) {
      throw new Error(`Enrollment number "${data.enrollmentNumber}" is already in use by another student.`)
    }
  }

  return input.repository.upsertByUser({
    institutionId: input.principal.institutionId,
    userId: input.principal.userId,
    data,
  })
}

// ---------------- Education ----------------
const educationInput = z.object({
  level: z.enum(['TENTH', 'TWELFTH', 'DEGREE', 'OTHER']),
  institutionName: z.string().trim().min(1).max(180),
  boardOrUniversity: z.string().trim().max(180).nullable().optional(),
  courseOrStream: z.string().trim().max(180).nullable().optional(),
  score: z.string().trim().max(50).nullable().optional(),
  startYear: z.coerce.number().int().min(1950).max(2100).nullable().optional(),
  endYear: z.coerce.number().int().min(1950).max(2100).nullable().optional(),
})

export type StudentEducationInput = z.infer<typeof educationInput>

export interface StudentEducationRepository<TEducation> {
  listByUser(input: { institutionId: string; userId: string }): Promise<TEducation[]>
  createByUser(input: { institutionId: string; userId: string; data: StudentEducationInput }): Promise<TEducation>
  updateByUser(input: { institutionId: string; userId: string; id: string; data: StudentEducationInput }): Promise<TEducation>
  deleteByUser(input: { institutionId: string; userId: string; id: string }): Promise<void>
}

export async function readOwnStudentEducation<TEducation>(input: {
  principal: AuthenticatedPrincipal
  repository: StudentEducationRepository<TEducation>
}): Promise<TEducation[]> {
  checkPerm(input.principal, 'student_education:read_own', 'student_profile:read_own')
  return input.repository.listByUser({
    institutionId: input.principal.institutionId,
    userId: input.principal.userId,
  })
}

export async function addOwnStudentEducation<TEducation>(input: {
  principal: AuthenticatedPrincipal
  repository: StudentEducationRepository<TEducation>
  data: unknown
}): Promise<TEducation> {
  checkPerm(input.principal, 'student_education:edit_own', 'student_profile:edit_own')
  const data = educationInput.parse(input.data)
  return input.repository.createByUser({
    institutionId: input.principal.institutionId,
    userId: input.principal.userId,
    data,
  })
}

export async function updateOwnStudentEducation<TEducation>(input: {
  principal: AuthenticatedPrincipal
  repository: StudentEducationRepository<TEducation>
  id: string
  data: unknown
}): Promise<TEducation> {
  checkPerm(input.principal, 'student_education:edit_own', 'student_profile:edit_own')
  const data = educationInput.parse(input.data)
  return input.repository.updateByUser({
    institutionId: input.principal.institutionId,
    userId: input.principal.userId,
    id: input.id,
    data,
  })
}

export async function deleteOwnStudentEducation<TEducation>(input: {
  principal: AuthenticatedPrincipal
  repository: StudentEducationRepository<TEducation>
  id: string
}): Promise<void> {
  checkPerm(input.principal, 'student_education:delete_own', 'student_profile:edit_own')
  return input.repository.deleteByUser({
    institutionId: input.principal.institutionId,
    userId: input.principal.userId,
    id: input.id,
  })
}

// ---------------- Certifications ----------------
const certificationInput = z.object({
  name: z.string().trim().min(1).max(180),
  issuer: z.string().trim().max(180).nullable().optional(),
  fileUrl: z.string().trim().max(2000).nullable().optional(),
  issuedAt: z.coerce.date().nullable().optional(),
})

export type StudentCertificationInput = z.infer<typeof certificationInput>

export interface StudentCertificationRepository<TCertification> {
  listByUser(input: { institutionId: string; userId: string }): Promise<TCertification[]>
  createByUser(input: { institutionId: string; userId: string; data: StudentCertificationInput }): Promise<TCertification>
  updateByUser(input: { institutionId: string; userId: string; id: string; data: StudentCertificationInput }): Promise<TCertification>
  deleteByUser(input: { institutionId: string; userId: string; id: string }): Promise<void>
}

export async function readOwnStudentCertifications<TCertification>(input: {
  principal: AuthenticatedPrincipal
  repository: StudentCertificationRepository<TCertification>
}): Promise<TCertification[]> {
  checkPerm(input.principal, 'student_certification:read_own', 'student_profile:read_own')
  return input.repository.listByUser({
    institutionId: input.principal.institutionId,
    userId: input.principal.userId,
  })
}

export async function addOwnStudentCertification<TCertification>(input: {
  principal: AuthenticatedPrincipal
  repository: StudentCertificationRepository<TCertification>
  data: unknown
}): Promise<TCertification> {
  checkPerm(input.principal, 'student_certification:edit_own', 'student_profile:edit_own')
  const data = certificationInput.parse(input.data)

  // Duplicate prevention
  const profile = await prisma.studentProfile.findUnique({
    where: { institutionId_userId: { institutionId: input.principal.institutionId, userId: input.principal.userId } },
    select: { id: true },
  })
  if (profile) {
    const existing = await prisma.studentCertification.findFirst({
      where: {
        institutionId: input.principal.institutionId,
        studentProfileId: profile.id,
        name: { equals: data.name, mode: 'insensitive' },
        ...(data.issuer ? { issuer: { equals: data.issuer, mode: 'insensitive' } } : {}),
      },
    })
    if (existing) {
      throw new Error(`A certification named "${data.name}" ${data.issuer ? `from "${data.issuer}" ` : ''}already exists.`)
    }
  }

  return input.repository.createByUser({
    institutionId: input.principal.institutionId,
    userId: input.principal.userId,
    data,
  })
}

export async function updateOwnStudentCertification<TCertification>(input: {
  principal: AuthenticatedPrincipal
  repository: StudentCertificationRepository<TCertification>
  id: string
  data: unknown
}): Promise<TCertification> {
  checkPerm(input.principal, 'student_certification:edit_own', 'student_profile:edit_own')
  const data = certificationInput.parse(input.data)
  return input.repository.updateByUser({
    institutionId: input.principal.institutionId,
    userId: input.principal.userId,
    id: input.id,
    data,
  })
}

export async function deleteOwnStudentCertification<TCertification>(input: {
  principal: AuthenticatedPrincipal
  repository: StudentCertificationRepository<TCertification>
  id: string
}): Promise<void> {
  checkPerm(input.principal, 'student_certification:delete_own', 'student_profile:edit_own')
  return input.repository.deleteByUser({
    institutionId: input.principal.institutionId,
    userId: input.principal.userId,
    id: input.id,
  })
}

// ---------------- Research Papers ----------------
const researchPaperInput = z.object({
  title: z.string().trim().min(1).max(250),
  publication: z.string().trim().max(250).nullable().optional(),
  doi: z.string().trim().max(200).nullable().optional(),
  fileUrl: z.string().trim().max(2000).nullable().optional(),
  publishedAt: z.coerce.date().nullable().optional(),
})

export type StudentResearchPaperInput = z.infer<typeof researchPaperInput>

export interface StudentResearchPaperRepository<TPaper> {
  listByUser(input: { institutionId: string; userId: string }): Promise<TPaper[]>
  createByUser(input: { institutionId: string; userId: string; data: StudentResearchPaperInput }): Promise<TPaper>
  updateByUser(input: { institutionId: string; userId: string; id: string; data: StudentResearchPaperInput }): Promise<TPaper>
  deleteByUser(input: { institutionId: string; userId: string; id: string }): Promise<void>
}

export async function readOwnStudentResearchPapers<TPaper>(input: {
  principal: AuthenticatedPrincipal
  repository: StudentResearchPaperRepository<TPaper>
}): Promise<TPaper[]> {
  checkPerm(input.principal, 'student_research:read_own', 'student_profile:read_own')
  return input.repository.listByUser({
    institutionId: input.principal.institutionId,
    userId: input.principal.userId,
  })
}

export async function addOwnStudentResearchPaper<TPaper>(input: {
  principal: AuthenticatedPrincipal
  repository: StudentResearchPaperRepository<TPaper>
  data: unknown
}): Promise<TPaper> {
  checkPerm(input.principal, 'student_research:edit_own', 'student_profile:edit_own')
  const data = researchPaperInput.parse(input.data)
  return input.repository.createByUser({
    institutionId: input.principal.institutionId,
    userId: input.principal.userId,
    data,
  })
}

export async function updateOwnStudentResearchPaper<TPaper>(input: {
  principal: AuthenticatedPrincipal
  repository: StudentResearchPaperRepository<TPaper>
  id: string
  data: unknown
}): Promise<TPaper> {
  checkPerm(input.principal, 'student_research:edit_own', 'student_profile:edit_own')
  const data = researchPaperInput.parse(input.data)
  return input.repository.updateByUser({
    institutionId: input.principal.institutionId,
    userId: input.principal.userId,
    id: input.id,
    data,
  })
}

export async function deleteOwnStudentResearchPaper<TPaper>(input: {
  principal: AuthenticatedPrincipal
  repository: StudentResearchPaperRepository<TPaper>
  id: string
}): Promise<void> {
  checkPerm(input.principal, 'student_research:delete_own', 'student_profile:edit_own')
  return input.repository.deleteByUser({
    institutionId: input.principal.institutionId,
    userId: input.principal.userId,
    id: input.id,
  })
}

// ---------------- Patents ----------------
const patentInput = z.object({
  title: z.string().trim().min(1).max(250),
  patentNumber: z.string().trim().max(100).nullable().optional(),
  status: z.string().trim().max(50).nullable().optional(),
  fileUrl: z.string().trim().max(2000).nullable().optional(),
  filedAt: z.coerce.date().nullable().optional(),
})

export type StudentPatentInput = z.infer<typeof patentInput>

export interface StudentPatentRepository<TPatent> {
  listByUser(input: { institutionId: string; userId: string }): Promise<TPatent[]>
  createByUser(input: { institutionId: string; userId: string; data: StudentPatentInput }): Promise<TPatent>
  updateByUser(input: { institutionId: string; userId: string; id: string; data: StudentPatentInput }): Promise<TPatent>
  deleteByUser(input: { institutionId: string; userId: string; id: string }): Promise<void>
}

export async function readOwnStudentPatents<TPatent>(input: {
  principal: AuthenticatedPrincipal
  repository: StudentPatentRepository<TPatent>
}): Promise<TPatent[]> {
  checkPerm(input.principal, 'student_patent:read_own', 'student_profile:read_own')
  return input.repository.listByUser({
    institutionId: input.principal.institutionId,
    userId: input.principal.userId,
  })
}

export async function addOwnStudentPatent<TPatent>(input: {
  principal: AuthenticatedPrincipal
  repository: StudentPatentRepository<TPatent>
  data: unknown
}): Promise<TPatent> {
  checkPerm(input.principal, 'student_patent:edit_own', 'student_profile:edit_own')
  const data = patentInput.parse(input.data)
  return input.repository.createByUser({
    institutionId: input.principal.institutionId,
    userId: input.principal.userId,
    data,
  })
}

export async function updateOwnStudentPatent<TPatent>(input: {
  principal: AuthenticatedPrincipal
  repository: StudentPatentRepository<TPatent>
  id: string
  data: unknown
}): Promise<TPatent> {
  checkPerm(input.principal, 'student_patent:edit_own', 'student_profile:edit_own')
  const data = patentInput.parse(input.data)
  return input.repository.updateByUser({
    institutionId: input.principal.institutionId,
    userId: input.principal.userId,
    id: input.id,
    data,
  })
}

export async function deleteOwnStudentPatent<TPatent>(input: {
  principal: AuthenticatedPrincipal
  repository: StudentPatentRepository<TPatent>
  id: string
}): Promise<void> {
  checkPerm(input.principal, 'student_patent:delete_own', 'student_profile:edit_own')
  return input.repository.deleteByUser({
    institutionId: input.principal.institutionId,
    userId: input.principal.userId,
    id: input.id,
  })
}

// ---------------- Projects ----------------
const projectInput = z.object({
  title: z.string().trim().min(1).max(180),
  description: z.string().trim().max(2000).nullable().optional(),
  repositoryUrl: z.string().trim().max(2000).nullable().optional(),
  startDate: z.coerce.date().nullable().optional(),
  endDate: z.coerce.date().nullable().optional(),
})

export type StudentProjectInput = z.infer<typeof projectInput>

export interface StudentProjectRepository<TProject> {
  listByUser(input: { institutionId: string; userId: string }): Promise<TProject[]>
  createByUser(input: { institutionId: string; userId: string; data: StudentProjectInput }): Promise<TProject>
  updateByUser(input: { institutionId: string; userId: string; id: string; data: StudentProjectInput }): Promise<TProject>
  deleteByUser(input: { institutionId: string; userId: string; id: string }): Promise<void>
}

export async function readOwnStudentProjects<TProject>(input: {
  principal: AuthenticatedPrincipal
  repository: StudentProjectRepository<TProject>
}): Promise<TProject[]> {
  checkPerm(input.principal, 'student_project:read_own', 'student_profile:read_own')
  return input.repository.listByUser({
    institutionId: input.principal.institutionId,
    userId: input.principal.userId,
  })
}

export async function addOwnStudentProject<TProject>(input: {
  principal: AuthenticatedPrincipal
  repository: StudentProjectRepository<TProject>
  data: unknown
}): Promise<TProject> {
  checkPerm(input.principal, 'student_project:edit_own', 'student_profile:edit_own')
  const data = projectInput.parse(input.data)
  return input.repository.createByUser({
    institutionId: input.principal.institutionId,
    userId: input.principal.userId,
    data,
  })
}

export async function updateOwnStudentProject<TProject>(input: {
  principal: AuthenticatedPrincipal
  repository: StudentProjectRepository<TProject>
  id: string
  data: unknown
}): Promise<TProject> {
  checkPerm(input.principal, 'student_project:edit_own', 'student_profile:edit_own')
  const data = projectInput.parse(input.data)
  return input.repository.updateByUser({
    institutionId: input.principal.institutionId,
    userId: input.principal.userId,
    id: input.id,
    data,
  })
}

export async function deleteOwnStudentProject<TProject>(input: {
  principal: AuthenticatedPrincipal
  repository: StudentProjectRepository<TProject>
  id: string
}): Promise<void> {
  checkPerm(input.principal, 'student_project:delete_own', 'student_profile:edit_own')
  return input.repository.deleteByUser({
    institutionId: input.principal.institutionId,
    userId: input.principal.userId,
    id: input.id,
  })
}

// ---------------- Internships ----------------
const internshipInput = z.object({
  organization: z.string().trim().min(1).max(180),
  role: z.string().trim().max(180).nullable().optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  startDate: z.coerce.date().nullable().optional(),
  endDate: z.coerce.date().nullable().optional(),
  stipendAmount: z.string().trim().max(50).nullable().optional(),
  offerType: z.enum(['NONE', 'PPO_OFFERED', 'CONVERTED_TO_JOB']).default('NONE'),
})

export type StudentInternshipInput = z.infer<typeof internshipInput>

export interface StudentInternshipRepository<TInternship> {
  listByUser(input: { institutionId: string; userId: string }): Promise<TInternship[]>
  createByUser(input: { institutionId: string; userId: string; data: StudentInternshipInput }): Promise<TInternship>
  updateByUser(input: { institutionId: string; userId: string; id: string; data: StudentInternshipInput }): Promise<TInternship>
  deleteByUser(input: { institutionId: string; userId: string; id: string }): Promise<void>
}

export async function readOwnStudentInternships<TInternship>(input: {
  principal: AuthenticatedPrincipal
  repository: StudentInternshipRepository<TInternship>
}): Promise<TInternship[]> {
  checkPerm(input.principal, 'student_internship:read_own', 'student_profile:read_own')
  return input.repository.listByUser({
    institutionId: input.principal.institutionId,
    userId: input.principal.userId,
  })
}

export async function addOwnStudentInternship<TInternship>(input: {
  principal: AuthenticatedPrincipal
  repository: StudentInternshipRepository<TInternship>
  data: unknown
}): Promise<TInternship> {
  checkPerm(input.principal, 'student_internship:edit_own', 'student_profile:edit_own')
  const data = internshipInput.parse(input.data)
  return input.repository.createByUser({
    institutionId: input.principal.institutionId,
    userId: input.principal.userId,
    data,
  })
}

export async function updateOwnStudentInternship<TInternship>(input: {
  principal: AuthenticatedPrincipal
  repository: StudentInternshipRepository<TInternship>
  id: string
  data: unknown
}): Promise<TInternship> {
  checkPerm(input.principal, 'student_internship:edit_own', 'student_profile:edit_own')
  const data = internshipInput.parse(input.data)
  return input.repository.updateByUser({
    institutionId: input.principal.institutionId,
    userId: input.principal.userId,
    id: input.id,
    data,
  })
}

export async function deleteOwnStudentInternship<TInternship>(input: {
  principal: AuthenticatedPrincipal
  repository: StudentInternshipRepository<TInternship>
  id: string
}): Promise<void> {
  checkPerm(input.principal, 'student_internship:delete_own', 'student_profile:edit_own')
  return input.repository.deleteByUser({
    institutionId: input.principal.institutionId,
    userId: input.principal.userId,
    id: input.id,
  })
}

// ---------------- Skills ----------------
const skillInput = z.object({
  skillName: z.string().trim().min(1).max(100),
  proficiency: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']).default('INTERMEDIATE'),
})

export type StudentSkillInput = z.infer<typeof skillInput>

export interface StudentSkillRepository<TSkill> {
  listByUser(input: { institutionId: string; userId: string }): Promise<TSkill[]>
  createByUser(input: { institutionId: string; userId: string; data: StudentSkillInput }): Promise<TSkill>
  updateByUser(input: { institutionId: string; userId: string; id: string; data: StudentSkillInput }): Promise<TSkill>
  deleteByUser(input: { institutionId: string; userId: string; id: string }): Promise<void>
}

export async function readOwnStudentSkills<TSkill>(input: {
  principal: AuthenticatedPrincipal
  repository: StudentSkillRepository<TSkill>
}): Promise<TSkill[]> {
  checkPerm(input.principal, 'student_skill:read_own', 'student_profile:read_own')
  return input.repository.listByUser({
    institutionId: input.principal.institutionId,
    userId: input.principal.userId,
  })
}

export async function addOwnStudentSkill<TSkill>(input: {
  principal: AuthenticatedPrincipal
  repository: StudentSkillRepository<TSkill>
  data: unknown
}): Promise<TSkill> {
  checkPerm(input.principal, 'student_skill:create_own', 'student_profile:edit_own')
  const data = skillInput.parse(input.data)
  return input.repository.createByUser({
    institutionId: input.principal.institutionId,
    userId: input.principal.userId,
    data,
  })
}

export async function updateOwnStudentSkill<TSkill>(input: {
  principal: AuthenticatedPrincipal
  repository: StudentSkillRepository<TSkill>
  id: string
  data: unknown
}): Promise<TSkill> {
  checkPerm(input.principal, 'student_skill:edit_own', 'student_profile:edit_own')
  const data = skillInput.parse(input.data)
  return input.repository.updateByUser({
    institutionId: input.principal.institutionId,
    userId: input.principal.userId,
    id: input.id,
    data,
  })
}

export async function deleteOwnStudentSkill<TSkill>(input: {
  principal: AuthenticatedPrincipal
  repository: StudentSkillRepository<TSkill>
  id: string
}): Promise<void> {
  checkPerm(input.principal, 'student_skill:delete_own', 'student_profile:edit_own')
  return input.repository.deleteByUser({
    institutionId: input.principal.institutionId,
    userId: input.principal.userId,
    id: input.id,
  })
}

// ---------------- Semester Records (Academic Performance) ----------------
const semesterInput = z.object({
  semesterNumber: z.coerce.number().int().min(1).max(8),
  sgpa: z.coerce.number().min(0, 'SGPA must be between 0 and 10').max(10, 'SGPA must be between 0 and 10'),
  cgpaAtSemester: z.coerce.number().min(0, 'CGPA must be between 0 and 10').max(10, 'CGPA must be between 0 and 10'),
  backlogCount: z.coerce.number().int().min(0).max(50).nullable().optional(),
})

export type StudentSemesterInput = z.infer<typeof semesterInput>

export interface StudentSemesterRepository<TSemester> {
  listByUser(input: { institutionId: string; userId: string }): Promise<TSemester[]>
  createByUser(input: { institutionId: string; userId: string; data: StudentSemesterInput }): Promise<TSemester>
  updateByUser(input: { institutionId: string; userId: string; id: string; data: StudentSemesterInput }): Promise<TSemester>
  deleteByUser(input: { institutionId: string; userId: string; id: string }): Promise<void>
}

export async function readOwnStudentSemesters<TSemester>(input: {
  principal: AuthenticatedPrincipal
  repository: StudentSemesterRepository<TSemester>
}): Promise<TSemester[]> {
  checkPerm(input.principal, 'student_semester:read_own', 'student_profile:read_own')
  return input.repository.listByUser({
    institutionId: input.principal.institutionId,
    userId: input.principal.userId,
  })
}

export async function addOwnStudentSemester<TSemester>(input: {
  principal: AuthenticatedPrincipal
  repository: StudentSemesterRepository<TSemester>
  data: unknown
}): Promise<TSemester> {
  checkPerm(input.principal, 'student_semester:create_own', 'student_profile:edit_own')
  const data = semesterInput.parse(input.data)
  return input.repository.createByUser({
    institutionId: input.principal.institutionId,
    userId: input.principal.userId,
    data,
  })
}

export async function updateOwnStudentSemester<TSemester>(input: {
  principal: AuthenticatedPrincipal
  repository: StudentSemesterRepository<TSemester>
  id: string
  data: unknown
}): Promise<TSemester> {
  checkPerm(input.principal, 'student_semester:edit_own', 'student_profile:edit_own')
  const data = semesterInput.parse(input.data)
  return input.repository.updateByUser({
    institutionId: input.principal.institutionId,
    userId: input.principal.userId,
    id: input.id,
    data,
  })
}

export async function deleteOwnStudentSemester<TSemester>(input: {
  principal: AuthenticatedPrincipal
  repository: StudentSemesterRepository<TSemester>
  id: string
}): Promise<void> {
  checkPerm(input.principal, 'student_semester:delete_own', 'student_profile:edit_own')
  return input.repository.deleteByUser({
    institutionId: input.principal.institutionId,
    userId: input.principal.userId,
    id: input.id,
  })
}
