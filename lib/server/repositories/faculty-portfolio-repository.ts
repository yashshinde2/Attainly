import 'server-only'
import { prisma } from '@/lib/server/db'
import type {
  CanonicalPublication,
  FacultyConsultancy,
  FacultyContribution,
  FacultyDevelopmentProgram,
  FacultyResearchGrant,
  FacultyTeachingLoad,
  Prisma,
} from '@/generated/prisma/client'

export type CanonicalPublicationWithContributors = Prisma.CanonicalPublicationGetPayload<{
  include: {
    contributors: {
      include: {
        facultyProfile: {
          include: { user: { select: { firstName: true; lastName: true; email: true } } }
        }
      }
      orderBy: { authorOrder: 'asc' }
    }
  }
}>

async function ensureFacultyProfileId(institutionId: string, userId: string): Promise<string> {
  const profile = await prisma.facultyProfile.upsert({
    where: { institutionId_userId: { institutionId, userId } },
    create: { institutionId, userId },
    update: {},
    select: { id: true },
  })
  return profile.id
}

async function getFacultyProfileIdOrThrow(institutionId: string, userId: string): Promise<string> {
  const profile = await prisma.facultyProfile.findUnique({
    where: { institutionId_userId: { institutionId, userId } },
    select: { id: true },
  })
  if (!profile) throw new Error('Faculty profile not found.')
  return profile.id
}

const resetAudit = {
  verificationStatus: 'PENDING' as const,
  verifiedByUserId: null,
  verifiedAt: null,
  rejectionReason: null,
  version: { increment: 1 },
}

export class PrismaFacultyPortfolioRepository {
  // ---------------- Professional Development (FDP / STTP / Workshops) ----------------
  async listFdps(input: { institutionId: string; userId: string }): Promise<FacultyDevelopmentProgram[]> {
    return prisma.facultyDevelopmentProgram.findMany({
      where: { institutionId: input.institutionId, facultyProfile: { userId: input.userId } },
      orderBy: { startDate: 'desc' },
    })
  }

  async createFdp(input: {
    institutionId: string
    userId: string
    data: Omit<Prisma.FacultyDevelopmentProgramUncheckedCreateInput, 'id' | 'institutionId' | 'facultyProfileId'>
  }): Promise<FacultyDevelopmentProgram> {
    const facultyProfileId = await ensureFacultyProfileId(input.institutionId, input.userId)
    return prisma.facultyDevelopmentProgram.create({
      data: {
        ...input.data,
        institutionId: input.institutionId,
        facultyProfileId,
        verificationStatus: 'PENDING',
      },
    })
  }

  async updateFdp(input: {
    institutionId: string
    userId: string
    id: string
    data: Omit<Prisma.FacultyDevelopmentProgramUncheckedCreateInput, 'id' | 'institutionId' | 'facultyProfileId'>
  }): Promise<FacultyDevelopmentProgram> {
    const facultyProfileId = await getFacultyProfileIdOrThrow(input.institutionId, input.userId)
    const existing = await prisma.facultyDevelopmentProgram.findFirst({
      where: { id: input.id, institutionId: input.institutionId, facultyProfileId },
    })
    if (!existing) throw new Error('Development program record not found.')

    return prisma.facultyDevelopmentProgram.update({
      where: { institutionId_id: { institutionId: input.institutionId, id: input.id } },
      data: { ...input.data, ...resetAudit },
    })
  }

  async deleteFdp(input: { institutionId: string; userId: string; id: string }): Promise<void> {
    const facultyProfileId = await getFacultyProfileIdOrThrow(input.institutionId, input.userId)
    const existing = await prisma.facultyDevelopmentProgram.findFirst({
      where: { id: input.id, institutionId: input.institutionId, facultyProfileId },
    })
    if (!existing) throw new Error('Development program record not found.')

    await prisma.facultyDevelopmentProgram.delete({
      where: { institutionId_id: { institutionId: input.institutionId, id: input.id } },
    })
  }

  // ---------------- Teaching Workload ----------------
  async listTeachingLoads(input: { institutionId: string; userId: string }): Promise<FacultyTeachingLoad[]> {
    return prisma.facultyTeachingLoad.findMany({
      where: { institutionId: input.institutionId, facultyProfile: { userId: input.userId } },
      orderBy: [{ academicYear: 'desc' }, { semester: 'asc' }],
    })
  }

  async createTeachingLoad(input: {
    institutionId: string
    userId: string
    data: Omit<Prisma.FacultyTeachingLoadUncheckedCreateInput, 'id' | 'institutionId' | 'facultyProfileId'>
  }): Promise<FacultyTeachingLoad> {
    const facultyProfileId = await ensureFacultyProfileId(input.institutionId, input.userId)
    return prisma.facultyTeachingLoad.create({
      data: { ...input.data, institutionId: input.institutionId, facultyProfileId },
    })
  }

  async updateTeachingLoad(input: {
    institutionId: string
    userId: string
    id: string
    data: Omit<Prisma.FacultyTeachingLoadUncheckedCreateInput, 'id' | 'institutionId' | 'facultyProfileId'>
  }): Promise<FacultyTeachingLoad> {
    const facultyProfileId = await getFacultyProfileIdOrThrow(input.institutionId, input.userId)
    const existing = await prisma.facultyTeachingLoad.findFirst({
      where: { id: input.id, institutionId: input.institutionId, facultyProfileId },
    })
    if (!existing) throw new Error('Teaching workload record not found.')

    return prisma.facultyTeachingLoad.update({
      where: { institutionId_id: { institutionId: input.institutionId, id: input.id } },
      data: input.data,
    })
  }

  async deleteTeachingLoad(input: { institutionId: string; userId: string; id: string }): Promise<void> {
    const facultyProfileId = await getFacultyProfileIdOrThrow(input.institutionId, input.userId)
    const existing = await prisma.facultyTeachingLoad.findFirst({
      where: { id: input.id, institutionId: input.institutionId, facultyProfileId },
    })
    if (!existing) throw new Error('Teaching workload record not found.')

    await prisma.facultyTeachingLoad.delete({
      where: { institutionId_id: { institutionId: input.institutionId, id: input.id } },
    })
  }

  // ---------------- Canonical Publications + Contributors ----------------
  async listCanonicalPublications(input: {
    institutionId: string
    userId: string
  }): Promise<CanonicalPublicationWithContributors[]> {
    return prisma.canonicalPublication.findMany({
      where: {
        institutionId: input.institutionId,
        contributors: { some: { facultyProfile: { userId: input.userId } } },
      },
      include: {
        contributors: {
          include: {
            facultyProfile: {
              include: { user: { select: { firstName: true, lastName: true, email: true } } },
            },
          },
          orderBy: { authorOrder: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async createOrLinkCanonicalPublication(input: {
    institutionId: string
    userId: string
    authorOrder?: number
    authorRole?: string | null
    data: {
      title: string
      publicationType: string
      journalOrConference?: string | null
      publisher?: string | null
      doi?: string | null
      issnOrIsbn?: string | null
      indexing?: string | null
      authorsText?: string | null
      publishedAt?: Date | null
      fileUrl?: string | null
    }
  }): Promise<CanonicalPublication> {
    const facultyProfileId = await ensureFacultyProfileId(input.institutionId, input.userId)
    const normalizedDoi = input.data.doi?.trim() || null

    if (normalizedDoi) {
      const existingByDoi = await prisma.canonicalPublication.findUnique({
        where: { institutionId_doi: { institutionId: input.institutionId, doi: normalizedDoi } },
      })
      if (existingByDoi) {
        await prisma.publicationContributor.upsert({
          where: {
            institutionId_canonicalPublicationId_facultyProfileId: {
              institutionId: input.institutionId,
              canonicalPublicationId: existingByDoi.id,
              facultyProfileId,
            },
          },
          create: {
            institutionId: input.institutionId,
            canonicalPublicationId: existingByDoi.id,
            facultyProfileId,
            authorOrder: input.authorOrder ?? 1,
            authorRole: input.authorRole ?? 'CO_AUTHOR',
          },
          update: {
            authorOrder: input.authorOrder ?? 1,
            authorRole: input.authorRole ?? 'CO_AUTHOR',
          },
        })
        return existingByDoi
      }
    }

    return prisma.canonicalPublication.create({
      data: {
        institutionId: input.institutionId,
        ...input.data,
        doi: normalizedDoi,
        createdByUserId: input.userId,
        verificationStatus: 'PENDING',
        contributors: {
          create: {
            facultyProfileId,
            authorOrder: input.authorOrder ?? 1,
            authorRole: input.authorRole ?? 'FIRST_AUTHOR',
          },
        },
      },
    })
  }

  async updateCanonicalPublication(input: {
    institutionId: string
    userId: string
    id: string
    data: {
      title: string
      publicationType: string
      journalOrConference?: string | null
      publisher?: string | null
      doi?: string | null
      issnOrIsbn?: string | null
      indexing?: string | null
      authorsText?: string | null
      publishedAt?: Date | null
      fileUrl?: string | null
    }
  }): Promise<CanonicalPublication> {
    const facultyProfileId = await getFacultyProfileIdOrThrow(input.institutionId, input.userId)
    const existing = await prisma.canonicalPublication.findFirst({
      where: {
        id: input.id,
        institutionId: input.institutionId,
        contributors: { some: { facultyProfileId } },
      },
    })
    if (!existing) throw new Error('Publication not found.')

    return prisma.canonicalPublication.update({
      where: { institutionId_id: { institutionId: input.institutionId, id: input.id } },
      data: {
        ...input.data,
        doi: input.data.doi?.trim() || null,
        ...resetAudit,
      },
    })
  }

  async unlinkOrDeleteCanonicalPublication(input: {
    institutionId: string
    userId: string
    id: string
  }): Promise<void> {
    const facultyProfileId = await getFacultyProfileIdOrThrow(input.institutionId, input.userId)
    const link = await prisma.publicationContributor.findUnique({
      where: {
        institutionId_canonicalPublicationId_facultyProfileId: {
          institutionId: input.institutionId,
          canonicalPublicationId: input.id,
          facultyProfileId,
        },
      },
    })
    if (!link) throw new Error('Publication contributor link not found.')

    await prisma.publicationContributor.delete({
      where: {
        institutionId_canonicalPublicationId_facultyProfileId: {
          institutionId: input.institutionId,
          canonicalPublicationId: input.id,
          facultyProfileId,
        },
      },
    })

    const remaining = await prisma.publicationContributor.count({
      where: { institutionId: input.institutionId, canonicalPublicationId: input.id },
    })
    if (remaining === 0) {
      await prisma.canonicalPublication.delete({
        where: { institutionId_id: { institutionId: input.institutionId, id: input.id } },
      })
    }
  }

  // ---------------- Research Grants ----------------
  async listGrants(input: { institutionId: string; userId: string }): Promise<FacultyResearchGrant[]> {
    return prisma.facultyResearchGrant.findMany({
      where: { institutionId: input.institutionId, facultyProfile: { userId: input.userId } },
      orderBy: { createdAt: 'desc' },
    })
  }

  async createGrant(input: {
    institutionId: string
    userId: string
    data: Omit<Prisma.FacultyResearchGrantUncheckedCreateInput, 'id' | 'institutionId' | 'facultyProfileId'>
  }): Promise<FacultyResearchGrant> {
    const facultyProfileId = await ensureFacultyProfileId(input.institutionId, input.userId)
    return prisma.facultyResearchGrant.create({
      data: { ...input.data, institutionId: input.institutionId, facultyProfileId, verificationStatus: 'PENDING' },
    })
  }

  async updateGrant(input: {
    institutionId: string
    userId: string
    id: string
    data: Omit<Prisma.FacultyResearchGrantUncheckedCreateInput, 'id' | 'institutionId' | 'facultyProfileId'>
  }): Promise<FacultyResearchGrant> {
    const facultyProfileId = await getFacultyProfileIdOrThrow(input.institutionId, input.userId)
    const existing = await prisma.facultyResearchGrant.findFirst({
      where: { id: input.id, institutionId: input.institutionId, facultyProfileId },
    })
    if (!existing) throw new Error('Research grant not found.')

    return prisma.facultyResearchGrant.update({
      where: { institutionId_id: { institutionId: input.institutionId, id: input.id } },
      data: { ...input.data, ...resetAudit },
    })
  }

  async deleteGrant(input: { institutionId: string; userId: string; id: string }): Promise<void> {
    const facultyProfileId = await getFacultyProfileIdOrThrow(input.institutionId, input.userId)
    const existing = await prisma.facultyResearchGrant.findFirst({
      where: { id: input.id, institutionId: input.institutionId, facultyProfileId },
    })
    if (!existing) throw new Error('Research grant not found.')

    await prisma.facultyResearchGrant.delete({
      where: { institutionId_id: { institutionId: input.institutionId, id: input.id } },
    })
  }

  // ---------------- Consultancy ----------------
  async listConsultancies(input: { institutionId: string; userId: string }): Promise<FacultyConsultancy[]> {
    return prisma.facultyConsultancy.findMany({
      where: { institutionId: input.institutionId, facultyProfile: { userId: input.userId } },
      orderBy: { startDate: 'desc' },
    })
  }

  async createConsultancy(input: {
    institutionId: string
    userId: string
    data: Omit<Prisma.FacultyConsultancyUncheckedCreateInput, 'id' | 'institutionId' | 'facultyProfileId'>
  }): Promise<FacultyConsultancy> {
    const facultyProfileId = await ensureFacultyProfileId(input.institutionId, input.userId)
    return prisma.facultyConsultancy.create({
      data: { ...input.data, institutionId: input.institutionId, facultyProfileId, verificationStatus: 'PENDING' },
    })
  }

  async updateConsultancy(input: {
    institutionId: string
    userId: string
    id: string
    data: Omit<Prisma.FacultyConsultancyUncheckedCreateInput, 'id' | 'institutionId' | 'facultyProfileId'>
  }): Promise<FacultyConsultancy> {
    const facultyProfileId = await getFacultyProfileIdOrThrow(input.institutionId, input.userId)
    const existing = await prisma.facultyConsultancy.findFirst({
      where: { id: input.id, institutionId: input.institutionId, facultyProfileId },
    })
    if (!existing) throw new Error('Consultancy record not found.')

    return prisma.facultyConsultancy.update({
      where: { institutionId_id: { institutionId: input.institutionId, id: input.id } },
      data: { ...input.data, ...resetAudit },
    })
  }

  async deleteConsultancy(input: { institutionId: string; userId: string; id: string }): Promise<void> {
    const facultyProfileId = await getFacultyProfileIdOrThrow(input.institutionId, input.userId)
    const existing = await prisma.facultyConsultancy.findFirst({
      where: { id: input.id, institutionId: input.institutionId, facultyProfileId },
    })
    if (!existing) throw new Error('Consultancy record not found.')

    await prisma.facultyConsultancy.delete({
      where: { institutionId_id: { institutionId: input.institutionId, id: input.id } },
    })
  }

  // ---------------- Contributions ----------------
  async listContributions(input: { institutionId: string; userId: string }): Promise<FacultyContribution[]> {
    return prisma.facultyContribution.findMany({
      where: { institutionId: input.institutionId, facultyProfile: { userId: input.userId } },
      orderBy: { createdAt: 'desc' },
    })
  }

  async createContribution(input: {
    institutionId: string
    userId: string
    data: Omit<Prisma.FacultyContributionUncheckedCreateInput, 'id' | 'institutionId' | 'facultyProfileId'>
  }): Promise<FacultyContribution> {
    const facultyProfileId = await ensureFacultyProfileId(input.institutionId, input.userId)
    return prisma.facultyContribution.create({
      data: { ...input.data, institutionId: input.institutionId, facultyProfileId, verificationStatus: 'PENDING' },
    })
  }

  async updateContribution(input: {
    institutionId: string
    userId: string
    id: string
    data: Omit<Prisma.FacultyContributionUncheckedCreateInput, 'id' | 'institutionId' | 'facultyProfileId'>
  }): Promise<FacultyContribution> {
    const facultyProfileId = await getFacultyProfileIdOrThrow(input.institutionId, input.userId)
    const existing = await prisma.facultyContribution.findFirst({
      where: { id: input.id, institutionId: input.institutionId, facultyProfileId },
    })
    if (!existing) throw new Error('Contribution record not found.')

    return prisma.facultyContribution.update({
      where: { institutionId_id: { institutionId: input.institutionId, id: input.id } },
      data: { ...input.data, ...resetAudit },
    })
  }

  async deleteContribution(input: { institutionId: string; userId: string; id: string }): Promise<void> {
    const facultyProfileId = await getFacultyProfileIdOrThrow(input.institutionId, input.userId)
    const existing = await prisma.facultyContribution.findFirst({
      where: { id: input.id, institutionId: input.institutionId, facultyProfileId },
    })
    if (!existing) throw new Error('Contribution record not found.')

    await prisma.facultyContribution.delete({
      where: { institutionId_id: { institutionId: input.institutionId, id: input.id } },
    })
  }
}
