import 'server-only'
import { z } from 'zod'
import { requirePermission, type AuthenticatedPrincipal } from '../authorization'

const profileInput = z.object({
  phone: z.string().trim().max(40).nullable().optional(),
  office: z.string().trim().max(120).nullable().optional(),
})

export type FacultyProfileInput = z.infer<typeof profileInput>

export interface FacultyProfileRepository<TProfile> {
  findByUser(input: { institutionId: string; userId: string }): Promise<TProfile | null>
  upsertByUser(input: { institutionId: string; userId: string; data: FacultyProfileInput }): Promise<TProfile>
}

export async function readOwnFacultyProfile<TProfile>(input: {
  principal: AuthenticatedPrincipal
  repository: FacultyProfileRepository<TProfile>
}): Promise<TProfile | null> {
  requirePermission(input.principal, 'faculty_profile:read_own')
  return input.repository.findByUser({
    institutionId: input.principal.institutionId,
    userId: input.principal.userId,
  })
}

export async function updateOwnFacultyProfile<TProfile>(input: {
  principal: AuthenticatedPrincipal
  repository: FacultyProfileRepository<TProfile>
  data: unknown
}): Promise<TProfile> {
  requirePermission(input.principal, 'faculty_profile:edit_own')
  const data = profileInput.parse(input.data)
  return input.repository.upsertByUser({
    institutionId: input.principal.institutionId,
    userId: input.principal.userId,
    data,
  })
}

// ---------------- Education ----------------
const facultyEducationInput = z.object({
  qualification: z.string().trim().min(1).max(180),
  institutionName: z.string().trim().min(1).max(180),
  fieldOfStudy: z.string().trim().max(180).nullable().optional(),
  yearCompleted: z.coerce.number().int().min(1900).max(2100).nullable().optional(),
})

export type FacultyEducationInput = z.infer<typeof facultyEducationInput>

export interface FacultyEducationRepository<TEducation> {
  listByUser(input: { institutionId: string; userId: string }): Promise<TEducation[]>
  createByUser(input: { institutionId: string; userId: string; data: FacultyEducationInput }): Promise<TEducation>
}

export async function listOwnFacultyEducation<TEducation>(input: {
  principal: AuthenticatedPrincipal
  repository: FacultyEducationRepository<TEducation>
}): Promise<TEducation[]> {
  requirePermission(input.principal, 'faculty_profile:read_own')
  return input.repository.listByUser({
    institutionId: input.principal.institutionId,
    userId: input.principal.userId,
  })
}

export async function addOwnFacultyEducation<TEducation>(input: {
  principal: AuthenticatedPrincipal
  repository: FacultyEducationRepository<TEducation>
  data: unknown
}): Promise<TEducation> {
  requirePermission(input.principal, 'faculty_profile:edit_own')
  const data = facultyEducationInput.parse(input.data)
  return input.repository.createByUser({
    institutionId: input.principal.institutionId,
    userId: input.principal.userId,
    data,
  })
}

// ---------------- Experience (teaching vs industry) ----------------
const facultyExperienceInput = z.object({
  type: z.enum(['TEACHING', 'INDUSTRY']),
  organization: z.string().trim().min(1).max(180),
  title: z.string().trim().min(1).max(180),
  description: z.string().trim().max(2000).nullable().optional(),
  startDate: z.coerce.date().nullable().optional(),
  endDate: z.coerce.date().nullable().optional(),
})

export type FacultyExperienceInput = z.infer<typeof facultyExperienceInput>

export interface FacultyExperienceRepository<TExperience> {
  listByUser(input: { institutionId: string; userId: string }): Promise<TExperience[]>
  createByUser(input: { institutionId: string; userId: string; data: FacultyExperienceInput }): Promise<TExperience>
}

export async function listOwnFacultyExperiences<TExperience>(input: {
  principal: AuthenticatedPrincipal
  repository: FacultyExperienceRepository<TExperience>
}): Promise<TExperience[]> {
  requirePermission(input.principal, 'faculty_profile:read_own')
  return input.repository.listByUser({
    institutionId: input.principal.institutionId,
    userId: input.principal.userId,
  })
}

export async function addOwnFacultyExperience<TExperience>(input: {
  principal: AuthenticatedPrincipal
  repository: FacultyExperienceRepository<TExperience>
  data: unknown
}): Promise<TExperience> {
  requirePermission(input.principal, 'faculty_profile:edit_own')
  const data = facultyExperienceInput.parse(input.data)
  return input.repository.createByUser({
    institutionId: input.principal.institutionId,
    userId: input.principal.userId,
    data,
  })
}

// ---------------- Certifications ----------------
const facultyCertificationInput = z.object({
  name: z.string().trim().min(1).max(180),
  issuer: z.string().trim().max(180).nullable().optional(),
  fileUrl: z.string().trim().max(2000).nullable().optional(),
  issuedAt: z.coerce.date().nullable().optional(),
})

export type FacultyCertificationInput = z.infer<typeof facultyCertificationInput>

export interface FacultyCertificationRepository<TCertification> {
  listByUser(input: { institutionId: string; userId: string }): Promise<TCertification[]>
  createByUser(input: { institutionId: string; userId: string; data: FacultyCertificationInput }): Promise<TCertification>
}

export async function listOwnFacultyCertifications<TCertification>(input: {
  principal: AuthenticatedPrincipal
  repository: FacultyCertificationRepository<TCertification>
}): Promise<TCertification[]> {
  requirePermission(input.principal, 'faculty_profile:read_own')
  return input.repository.listByUser({
    institutionId: input.principal.institutionId,
    userId: input.principal.userId,
  })
}

export async function addOwnFacultyCertification<TCertification>(input: {
  principal: AuthenticatedPrincipal
  repository: FacultyCertificationRepository<TCertification>
  data: unknown
}): Promise<TCertification> {
  requirePermission(input.principal, 'faculty_profile:edit_own')
  const data = facultyCertificationInput.parse(input.data)
  return input.repository.createByUser({
    institutionId: input.principal.institutionId,
    userId: input.principal.userId,
    data,
  })
}

// ---------------- Research Papers ----------------
const facultyResearchPaperInput = z.object({
  title: z.string().trim().min(1).max(250),
  publication: z.string().trim().max(250).nullable().optional(),
  doi: z.string().trim().max(100).nullable().optional(),
  fileUrl: z.string().trim().max(2000).nullable().optional(),
  publishedAt: z.coerce.date().nullable().optional(),
})

export type FacultyResearchPaperInput = z.infer<typeof facultyResearchPaperInput>

export interface FacultyResearchPaperRepository<TPaper> {
  listByUser(input: { institutionId: string; userId: string }): Promise<TPaper[]>
  createByUser(input: { institutionId: string; userId: string; data: FacultyResearchPaperInput }): Promise<TPaper>
}

export async function listOwnFacultyResearchPapers<TPaper>(input: {
  principal: AuthenticatedPrincipal
  repository: FacultyResearchPaperRepository<TPaper>
}): Promise<TPaper[]> {
  requirePermission(input.principal, 'faculty_profile:read_own')
  return input.repository.listByUser({
    institutionId: input.principal.institutionId,
    userId: input.principal.userId,
  })
}

export async function addOwnFacultyResearchPaper<TPaper>(input: {
  principal: AuthenticatedPrincipal
  repository: FacultyResearchPaperRepository<TPaper>
  data: unknown
}): Promise<TPaper> {
  requirePermission(input.principal, 'faculty_profile:edit_own')
  const data = facultyResearchPaperInput.parse(input.data)
  return input.repository.createByUser({
    institutionId: input.principal.institutionId,
    userId: input.principal.userId,
    data,
  })
}

// ---------------- Patents ----------------
const facultyPatentInput = z.object({
  title: z.string().trim().min(1).max(250),
  patentNumber: z.string().trim().max(100).nullable().optional(),
  status: z.string().trim().max(50).nullable().optional(),
  fileUrl: z.string().trim().max(2000).nullable().optional(),
  filedAt: z.coerce.date().nullable().optional(),
})

export type FacultyPatentInput = z.infer<typeof facultyPatentInput>

export interface FacultyPatentRepository<TPatent> {
  listByUser(input: { institutionId: string; userId: string }): Promise<TPatent[]>
  createByUser(input: { institutionId: string; userId: string; data: FacultyPatentInput }): Promise<TPatent>
}

export async function listOwnFacultyPatents<TPatent>(input: {
  principal: AuthenticatedPrincipal
  repository: FacultyPatentRepository<TPatent>
}): Promise<TPatent[]> {
  requirePermission(input.principal, 'faculty_profile:read_own')
  return input.repository.listByUser({
    institutionId: input.principal.institutionId,
    userId: input.principal.userId,
  })
}

export async function addOwnFacultyPatent<TPatent>(input: {
  principal: AuthenticatedPrincipal
  repository: FacultyPatentRepository<TPatent>
  data: unknown
}): Promise<TPatent> {
  requirePermission(input.principal, 'faculty_profile:edit_own')
  const data = facultyPatentInput.parse(input.data)
  return input.repository.createByUser({
    institutionId: input.principal.institutionId,
    userId: input.principal.userId,
    data,
  })
}
