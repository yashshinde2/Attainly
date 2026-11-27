import 'server-only'
import { z } from 'zod'
import { requirePermission, type AuthenticatedPrincipal } from '../authorization'
import { PrismaDocumentRepository } from '../repositories/document-repository'
import { PrismaStudentCareerRepository } from '../repositories/student-placement-repository'
import type { StudentGraduateOutcome, StudentPlacementOffer } from '@/generated/prisma/client'

const documentRepository = new PrismaDocumentRepository()
const careerRepository = new PrismaStudentCareerRepository()

export const placementOfferInput = z.object({
  companyName: z.string().trim().min(1, 'Company name is required.').max(180),
  role: z.string().trim().min(1, 'Role is required.').max(180),
  packageCtc: z.string().trim().max(80).nullable().optional(),
  offerType: z.string().trim().max(60).nullable().optional(),
  offeredAt: z.coerce.date().nullable().optional(),
  status: z.enum(['OFFERED', 'ACCEPTED', 'DECLINED']).default('OFFERED'),
  offerLetterUrl: z.string().trim().max(2000).nullable().optional(),
})

export type PlacementOfferInput = z.infer<typeof placementOfferInput>

export const graduateOutcomeInput = z.object({
  outcomeType: z.enum(['PLACED', 'HIGHER_STUDIES', 'ENTREPRENEURSHIP', 'ALUMNI', 'SEEKING', 'OTHER']),
  organizationOrUniversity: z.string().trim().max(200).nullable().optional(),
  programOrRole: z.string().trim().max(200).nullable().optional(),
  location: z.string().trim().max(150).nullable().optional(),
  alumniEmail: z.string().trim().email('Enter a valid alumni email.').max(254).nullable().optional(),
  alumniLinkedin: z.string().trim().max(2000).nullable().optional(),
  evidenceUrl: z.string().trim().max(2000).nullable().optional(),
})

export type GraduateOutcomeInput = z.infer<typeof graduateOutcomeInput>

export async function listOwnPlacementOffers(input: {
  principal: AuthenticatedPrincipal
}): Promise<StudentPlacementOffer[]> {
  requirePermission(input.principal, 'student_placement:read_own')
  return careerRepository.listPlacementOffersByUser({
    institutionId: input.principal.institutionId,
    userId: input.principal.userId,
  })
}

export async function addOwnPlacementOffer(input: {
  principal: AuthenticatedPrincipal
  data: unknown
}): Promise<StudentPlacementOffer> {
  requirePermission(input.principal, 'student_placement:edit_own')
  const data = placementOfferInput.parse(input.data)
  await documentRepository.assertOwnedDocumentReference({
    institutionId: input.principal.institutionId,
    ownerUserId: input.principal.userId,
    fileUrl: data.offerLetterUrl,
  })
  return careerRepository.createPlacementOfferByUser({
    institutionId: input.principal.institutionId,
    userId: input.principal.userId,
    data,
  })
}

export async function updateOwnPlacementOffer(input: {
  principal: AuthenticatedPrincipal
  id: string
  data: unknown
}): Promise<StudentPlacementOffer> {
  requirePermission(input.principal, 'student_placement:edit_own')
  const data = placementOfferInput.parse(input.data)
  await documentRepository.assertOwnedDocumentReference({
    institutionId: input.principal.institutionId,
    ownerUserId: input.principal.userId,
    fileUrl: data.offerLetterUrl,
  })
  return careerRepository.updatePlacementOfferByUser({
    institutionId: input.principal.institutionId,
    userId: input.principal.userId,
    id: input.id,
    data,
  })
}

export async function deleteOwnPlacementOffer(input: {
  principal: AuthenticatedPrincipal
  id: string
}): Promise<void> {
  requirePermission(input.principal, 'student_placement:delete_own')
  return careerRepository.deletePlacementOfferByUser({
    institutionId: input.principal.institutionId,
    userId: input.principal.userId,
    id: input.id,
  })
}

export async function readOwnGraduateOutcome(input: {
  principal: AuthenticatedPrincipal
}): Promise<StudentGraduateOutcome | null> {
  requirePermission(input.principal, 'student_outcome:read_own')
  return careerRepository.getGraduateOutcomeByUser({
    institutionId: input.principal.institutionId,
    userId: input.principal.userId,
  })
}

export async function upsertOwnGraduateOutcome(input: {
  principal: AuthenticatedPrincipal
  data: unknown
}): Promise<StudentGraduateOutcome> {
  requirePermission(input.principal, 'student_outcome:edit_own')
  const data = graduateOutcomeInput.parse(input.data)
  await documentRepository.assertOwnedDocumentReference({
    institutionId: input.principal.institutionId,
    ownerUserId: input.principal.userId,
    fileUrl: data.evidenceUrl,
  })
  return careerRepository.upsertGraduateOutcomeByUser({
    institutionId: input.principal.institutionId,
    userId: input.principal.userId,
    data,
  })
}
