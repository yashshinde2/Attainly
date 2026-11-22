'use server'

import { revalidatePath } from 'next/cache'
import { createActionGuard } from '@/lib/server/action-guard'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { PrismaFacultyProfileRepository } from '@/lib/server/repositories/faculty-profile-repository'
import { PrismaFacultyEducationRepository } from '@/lib/server/repositories/faculty-education-repository'
import { PrismaFacultyExperienceRepository } from '@/lib/server/repositories/faculty-experience-repository'
import { PrismaFacultyCertificationRepository } from '@/lib/server/repositories/faculty-certification-repository'
import { PrismaFacultyResearchPaperRepository } from '@/lib/server/repositories/faculty-research-paper-repository'
import { PrismaFacultyPatentRepository } from '@/lib/server/repositories/faculty-patent-repository'
import { PrismaCriterionTagRepository } from '@/lib/server/repositories/criterion-tag-repository'
import {
  updateOwnFacultyProfile,
  addOwnFacultyEducation,
  updateOwnFacultyEducation,
  deleteOwnFacultyEducation,
  addOwnFacultyExperience,
  updateOwnFacultyExperience,
  deleteOwnFacultyExperience,
  addOwnFacultyCertification,
  updateOwnFacultyCertification,
  deleteOwnFacultyCertification,
  addOwnFacultyResearchPaper,
  updateOwnFacultyResearchPaper,
  deleteOwnFacultyResearchPaper,
  addOwnFacultyPatent,
  updateOwnFacultyPatent,
  deleteOwnFacultyPatent,
} from '@/lib/server/services/faculty'

export type FacultyActionState = { status: 'idle' | 'success' | 'error'; message: string }

const profileRepository = new PrismaFacultyProfileRepository()
const educationRepository = new PrismaFacultyEducationRepository()
const experienceRepository = new PrismaFacultyExperienceRepository()
const certificationRepository = new PrismaFacultyCertificationRepository()
const researchPaperRepository = new PrismaFacultyResearchPaperRepository()
const patentRepository = new PrismaFacultyPatentRepository()
const criterionTagRepository = new PrismaCriterionTagRepository()

const runAuthorized = createActionGuard(getCurrentPrincipal)

const emptyToNull = (value: FormDataEntryValue | null) => {
  const normalized = typeof value === 'string' ? value.trim() : ''
  return normalized || null
}

// ---------------- Profile ----------------
export async function saveFacultyProfile(_previous: FacultyActionState, formData: FormData): Promise<FacultyActionState> {
  try {
    await runAuthorized('faculty_profile:edit_own', (principal) =>
      updateOwnFacultyProfile({
        principal,
        repository: profileRepository,
        data: {
          phone: emptyToNull(formData.get('phone')),
          office: emptyToNull(formData.get('office')),
          photoUrl: emptyToNull(formData.get('photoUrl')),
          linkedinUrl: emptyToNull(formData.get('linkedinUrl')),
          researchGateOrOrcidUrl: emptyToNull(formData.get('researchGateOrOrcidUrl')),
        },
      }),
    )
    revalidatePath('/faculty')
    return { status: 'success', message: 'Profile saved successfully.' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not save profile. Check fields and try again.'
    return { status: 'error', message }
  }
}

// ---------------- Education ----------------
export async function addFacultyEducation(_previous: FacultyActionState, formData: FormData): Promise<FacultyActionState> {
  try {
    const yearRaw = emptyToNull(formData.get('yearCompleted'))
    await runAuthorized('faculty_education:edit_own', (principal) =>
      addOwnFacultyEducation({
        principal,
        repository: educationRepository,
        data: {
          qualification: formData.get('qualification'),
          institutionName: formData.get('institutionName'),
          fieldOfStudy: emptyToNull(formData.get('fieldOfStudy')),
          yearCompleted: yearRaw ? parseInt(yearRaw, 10) : null,
        },
      }),
    )
    revalidatePath('/faculty')
    return { status: 'success', message: 'Education added successfully.' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not add education record.'
    return { status: 'error', message }
  }
}

export async function updateFacultyEducation(_previous: FacultyActionState, formData: FormData): Promise<FacultyActionState> {
  try {
    const id = formData.get('id') as string
    if (!id) throw new Error('Missing record ID.')
    const yearRaw = emptyToNull(formData.get('yearCompleted'))

    await runAuthorized('faculty_education:edit_own', (principal) =>
      updateOwnFacultyEducation({
        principal,
        repository: educationRepository,
        id,
        data: {
          qualification: formData.get('qualification'),
          institutionName: formData.get('institutionName'),
          fieldOfStudy: emptyToNull(formData.get('fieldOfStudy')),
          yearCompleted: yearRaw ? parseInt(yearRaw, 10) : null,
        },
      }),
    )
    revalidatePath('/faculty')
    return { status: 'success', message: 'Education record updated.' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not update education record.'
    return { status: 'error', message }
  }
}

export async function deleteFacultyEducation(_previous: FacultyActionState, formData: FormData): Promise<FacultyActionState> {
  try {
    const id = formData.get('id') as string
    if (!id) throw new Error('Missing record ID.')

    await runAuthorized('faculty_education:delete_own', (principal) =>
      deleteOwnFacultyEducation({
        principal,
        repository: educationRepository,
        id,
      }),
    )
    revalidatePath('/faculty')
    return { status: 'success', message: 'Education record deleted.' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not delete education record.'
    return { status: 'error', message }
  }
}

// ---------------- Experience ----------------
export async function addFacultyExperience(_previous: FacultyActionState, formData: FormData): Promise<FacultyActionState> {
  try {
    const startDateRaw = emptyToNull(formData.get('startDate'))
    const endDateRaw = emptyToNull(formData.get('endDate'))

    await runAuthorized('faculty_experience:edit_own', (principal) =>
      addOwnFacultyExperience({
        principal,
        repository: experienceRepository,
        data: {
          type: formData.get('type'),
          organization: formData.get('organization'),
          title: formData.get('title'),
          description: emptyToNull(formData.get('description')),
          startDate: startDateRaw ? new Date(`${startDateRaw}T12:00:00`) : null,
          endDate: endDateRaw ? new Date(`${endDateRaw}T12:00:00`) : null,
        },
      }),
    )
    revalidatePath('/faculty')
    return { status: 'success', message: 'Experience added successfully.' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not add experience record.'
    return { status: 'error', message }
  }
}

export async function updateFacultyExperience(_previous: FacultyActionState, formData: FormData): Promise<FacultyActionState> {
  try {
    const id = formData.get('id') as string
    if (!id) throw new Error('Missing record ID.')
    const startDateRaw = emptyToNull(formData.get('startDate'))
    const endDateRaw = emptyToNull(formData.get('endDate'))

    await runAuthorized('faculty_experience:edit_own', (principal) =>
      updateOwnFacultyExperience({
        principal,
        repository: experienceRepository,
        id,
        data: {
          type: formData.get('type'),
          organization: formData.get('organization'),
          title: formData.get('title'),
          description: emptyToNull(formData.get('description')),
          startDate: startDateRaw ? new Date(`${startDateRaw}T12:00:00`) : null,
          endDate: endDateRaw ? new Date(`${endDateRaw}T12:00:00`) : null,
        },
      }),
    )
    revalidatePath('/faculty')
    return { status: 'success', message: 'Experience record updated.' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not update experience record.'
    return { status: 'error', message }
  }
}

export async function deleteFacultyExperience(_previous: FacultyActionState, formData: FormData): Promise<FacultyActionState> {
  try {
    const id = formData.get('id') as string
    if (!id) throw new Error('Missing record ID.')

    await runAuthorized('faculty_experience:delete_own', (principal) =>
      deleteOwnFacultyExperience({
        principal,
        repository: experienceRepository,
        id,
      }),
    )
    revalidatePath('/faculty')
    return { status: 'success', message: 'Experience record deleted.' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not delete experience record.'
    return { status: 'error', message }
  }
}

// ---------------- Certifications ----------------
export async function addFacultyCertification(_previous: FacultyActionState, formData: FormData): Promise<FacultyActionState> {
  try {
    const issuedAtRaw = emptyToNull(formData.get('issuedAt'))
    const criterionCode = emptyToNull(formData.get('criterionCode'))

    await runAuthorized('faculty_certification:edit_own', async (principal) => {
      const record = await addOwnFacultyCertification({
        principal,
        repository: certificationRepository,
        data: {
          name: formData.get('name'),
          issuer: emptyToNull(formData.get('issuer')),
          fileUrl: emptyToNull(formData.get('fileUrl')),
          issuedAt: issuedAtRaw ? new Date(`${issuedAtRaw}T12:00:00`) : null,
        },
      })
      if (criterionCode) {
        await criterionTagRepository.setTagForItem({
          institutionId: principal.institutionId,
          itemType: 'FACULTY_CERTIFICATION',
          itemId: record.id,
          criterionCode,
        })
      }
    })
    revalidatePath('/faculty')
    return { status: 'success', message: 'Certification added successfully.' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not add certification.'
    return { status: 'error', message }
  }
}

export async function updateFacultyCertification(_previous: FacultyActionState, formData: FormData): Promise<FacultyActionState> {
  try {
    const id = formData.get('id') as string
    if (!id) throw new Error('Missing record ID.')
    const issuedAtRaw = emptyToNull(formData.get('issuedAt'))
    const criterionCode = emptyToNull(formData.get('criterionCode'))

    await runAuthorized('faculty_certification:edit_own', async (principal) => {
      await updateOwnFacultyCertification({
        principal,
        repository: certificationRepository,
        id,
        data: {
          name: formData.get('name'),
          issuer: emptyToNull(formData.get('issuer')),
          fileUrl: emptyToNull(formData.get('fileUrl')),
          issuedAt: issuedAtRaw ? new Date(`${issuedAtRaw}T12:00:00`) : null,
        },
      })
      if (criterionCode) {
        await criterionTagRepository.setTagForItem({
          institutionId: principal.institutionId,
          itemType: 'FACULTY_CERTIFICATION',
          itemId: id,
          criterionCode,
        })
      }
    })
    revalidatePath('/faculty')
    return { status: 'success', message: 'Certification updated.' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not update certification.'
    return { status: 'error', message }
  }
}

export async function deleteFacultyCertification(_previous: FacultyActionState, formData: FormData): Promise<FacultyActionState> {
  try {
    const id = formData.get('id') as string
    if (!id) throw new Error('Missing record ID.')

    await runAuthorized('faculty_certification:delete_own', (principal) =>
      deleteOwnFacultyCertification({
        principal,
        repository: certificationRepository,
        id,
      }),
    )
    revalidatePath('/faculty')
    return { status: 'success', message: 'Certification deleted.' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not delete certification.'
    return { status: 'error', message }
  }
}

// ---------------- Research Papers ----------------
export async function addFacultyResearchPaper(_previous: FacultyActionState, formData: FormData): Promise<FacultyActionState> {
  try {
    const publishedAtRaw = emptyToNull(formData.get('publishedAt'))
    const criterionCode = emptyToNull(formData.get('criterionCode'))

    await runAuthorized('faculty_research:edit_own', async (principal) => {
      const record = await addOwnFacultyResearchPaper({
        principal,
        repository: researchPaperRepository,
        data: {
          title: formData.get('title'),
          publication: emptyToNull(formData.get('publication')),
          doi: emptyToNull(formData.get('doi')),
          fileUrl: emptyToNull(formData.get('fileUrl')),
          publishedAt: publishedAtRaw ? new Date(`${publishedAtRaw}T12:00:00`) : null,
        },
      })
      if (criterionCode) {
        await criterionTagRepository.setTagForItem({
          institutionId: principal.institutionId,
          itemType: 'FACULTY_RESEARCH_PAPER',
          itemId: record.id,
          criterionCode,
        })
      }
    })
    revalidatePath('/faculty')
    return { status: 'success', message: 'Research paper added successfully.' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not add research paper.'
    return { status: 'error', message }
  }
}

export async function updateFacultyResearchPaper(_previous: FacultyActionState, formData: FormData): Promise<FacultyActionState> {
  try {
    const id = formData.get('id') as string
    if (!id) throw new Error('Missing record ID.')
    const publishedAtRaw = emptyToNull(formData.get('publishedAt'))
    const criterionCode = emptyToNull(formData.get('criterionCode'))

    await runAuthorized('faculty_research:edit_own', async (principal) => {
      await updateOwnFacultyResearchPaper({
        principal,
        repository: researchPaperRepository,
        id,
        data: {
          title: formData.get('title'),
          publication: emptyToNull(formData.get('publication')),
          doi: emptyToNull(formData.get('doi')),
          fileUrl: emptyToNull(formData.get('fileUrl')),
          publishedAt: publishedAtRaw ? new Date(`${publishedAtRaw}T12:00:00`) : null,
        },
      })
      if (criterionCode) {
        await criterionTagRepository.setTagForItem({
          institutionId: principal.institutionId,
          itemType: 'FACULTY_RESEARCH_PAPER',
          itemId: id,
          criterionCode,
        })
      }
    })
    revalidatePath('/faculty')
    return { status: 'success', message: 'Research paper updated.' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not update research paper.'
    return { status: 'error', message }
  }
}

export async function deleteFacultyResearchPaper(_previous: FacultyActionState, formData: FormData): Promise<FacultyActionState> {
  try {
    const id = formData.get('id') as string
    if (!id) throw new Error('Missing record ID.')

    await runAuthorized('faculty_research:delete_own', (principal) =>
      deleteOwnFacultyResearchPaper({
        principal,
        repository: researchPaperRepository,
        id,
      }),
    )
    revalidatePath('/faculty')
    return { status: 'success', message: 'Research paper deleted.' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not delete research paper.'
    return { status: 'error', message }
  }
}

// ---------------- Patents ----------------
export async function addFacultyPatent(_previous: FacultyActionState, formData: FormData): Promise<FacultyActionState> {
  try {
    const filedAtRaw = emptyToNull(formData.get('filedAt'))
    const criterionCode = emptyToNull(formData.get('criterionCode'))

    await runAuthorized('faculty_patent:edit_own', async (principal) => {
      const record = await addOwnFacultyPatent({
        principal,
        repository: patentRepository,
        data: {
          title: formData.get('title'),
          patentNumber: emptyToNull(formData.get('patentNumber')),
          status: emptyToNull(formData.get('status')),
          fileUrl: emptyToNull(formData.get('fileUrl')),
          filedAt: filedAtRaw ? new Date(`${filedAtRaw}T12:00:00`) : null,
        },
      })
      if (criterionCode) {
        await criterionTagRepository.setTagForItem({
          institutionId: principal.institutionId,
          itemType: 'FACULTY_PATENT',
          itemId: record.id,
          criterionCode,
        })
      }
    })
    revalidatePath('/faculty')
    return { status: 'success', message: 'Patent added successfully.' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not add patent.'
    return { status: 'error', message }
  }
}

export async function updateFacultyPatent(_previous: FacultyActionState, formData: FormData): Promise<FacultyActionState> {
  try {
    const id = formData.get('id') as string
    if (!id) throw new Error('Missing record ID.')
    const filedAtRaw = emptyToNull(formData.get('filedAt'))
    const criterionCode = emptyToNull(formData.get('criterionCode'))

    await runAuthorized('faculty_patent:edit_own', async (principal) => {
      await updateOwnFacultyPatent({
        principal,
        repository: patentRepository,
        id,
        data: {
          title: formData.get('title'),
          patentNumber: emptyToNull(formData.get('patentNumber')),
          status: emptyToNull(formData.get('status')),
          fileUrl: emptyToNull(formData.get('fileUrl')),
          filedAt: filedAtRaw ? new Date(`${filedAtRaw}T12:00:00`) : null,
        },
      })
      if (criterionCode) {
        await criterionTagRepository.setTagForItem({
          institutionId: principal.institutionId,
          itemType: 'FACULTY_PATENT',
          itemId: id,
          criterionCode,
        })
      }
    })
    revalidatePath('/faculty')
    return { status: 'success', message: 'Patent updated.' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not update patent.'
    return { status: 'error', message }
  }
}

export async function deleteFacultyPatent(_previous: FacultyActionState, formData: FormData): Promise<FacultyActionState> {
  try {
    const id = formData.get('id') as string
    if (!id) throw new Error('Missing record ID.')

    await runAuthorized('faculty_patent:delete_own', (principal) =>
      deleteOwnFacultyPatent({
        principal,
        repository: patentRepository,
        id,
      }),
    )
    revalidatePath('/faculty')
    return { status: 'success', message: 'Patent deleted.' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not delete patent.'
    return { status: 'error', message }
  }
}
