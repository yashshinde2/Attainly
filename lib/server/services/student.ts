import 'server-only'
import { z } from 'zod'
import { requirePermission, type AuthenticatedPrincipal } from '../authorization'

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
  requirePermission(input.principal, 'student_profile:read_own')
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
  requirePermission(input.principal, 'student_profile:edit_own')
  const data = profileInput.parse(input.data)
  return input.repository.upsertByUser({
    institutionId: input.principal.institutionId,
    userId: input.principal.userId,
    data,
  })
}
