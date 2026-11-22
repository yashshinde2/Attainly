import 'server-only'
import { z } from 'zod'
import { requirePermission, type AuthenticatedPrincipal } from '../authorization'

function checkPerm(principal: AuthenticatedPrincipal, specific: string, fallback: string) {
  const perm = principal.permissions.includes(specific) ? specific : fallback
  requirePermission(principal, perm)
}

// ---------------- Profile ----------------
const profileInput = z.object({
  dateOfBirth: z.coerce.date().nullable().optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  address: z.string().trim().max(500).nullable().optional(),
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
  return input.repository.createByUser({
    institutionId: input.principal.institutionId,
    userId: input.principal.userId,
    data,
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

// ---------------- Internships ----------------
const internshipInput = z.object({
  organization: z.string().trim().min(1).max(180),
  role: z.string().trim().max(180).nullable().optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  startDate: z.coerce.date().nullable().optional(),
  endDate: z.coerce.date().nullable().optional(),
})

export type StudentInternshipInput = z.infer<typeof internshipInput>

export interface StudentInternshipRepository<TInternship> {
  listByUser(input: { institutionId: string; userId: string }): Promise<TInternship[]>
  createByUser(input: { institutionId: string; userId: string; data: StudentInternshipInput }): Promise<TInternship>
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
