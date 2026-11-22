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
import {
  updateOwnFacultyProfile,
  addOwnFacultyEducation,
  addOwnFacultyExperience,
  addOwnFacultyCertification,
  addOwnFacultyResearchPaper,
  addOwnFacultyPatent,
} from '@/lib/server/services/faculty'

export type FacultyActionState = { status: 'idle' | 'success' | 'error'; message: string }

const profileRepository = new PrismaFacultyProfileRepository()
const educationRepository = new PrismaFacultyEducationRepository()
const experienceRepository = new PrismaFacultyExperienceRepository()
const certificationRepository = new PrismaFacultyCertificationRepository()
const researchPaperRepository = new PrismaFacultyResearchPaperRepository()
const patentRepository = new PrismaFacultyPatentRepository()

const runAuthorized = createActionGuard(getCurrentPrincipal)

const emptyToNull = (value: FormDataEntryValue | null) => {
  const normalized = typeof value === 'string' ? value.trim() : ''
  return normalized || null
}

export async function saveFacultyProfile(_previous: FacultyActionState, formData: FormData): Promise<FacultyActionState> {
  try {
    await runAuthorized('faculty_profile:edit_own', (principal) =>
      updateOwnFacultyProfile({
        principal,
        repository: profileRepository,
        data: {
          phone: emptyToNull(formData.get('phone')),
          office: emptyToNull(formData.get('office')),
        },
      }),
    )
    revalidatePath('/faculty')
    return { status: 'success', message: 'Profile saved.' }
  } catch {
    return { status: 'error', message: 'Could not save your profile. Check the fields and try again.' }
  }
}

export async function addFacultyEducation(_previous: FacultyActionState, formData: FormData): Promise<FacultyActionState> {
  try {
    const yearRaw = emptyToNull(formData.get('yearCompleted'))
    await runAuthorized('faculty_profile:edit_own', (principal) =>
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
    return { status: 'success', message: 'Education added.' }
  } catch {
    return { status: 'error', message: 'Could not add education record. Check the fields and try again.' }
  }
}

export async function addFacultyExperience(_previous: FacultyActionState, formData: FormData): Promise<FacultyActionState> {
  try {
    const startDateRaw = emptyToNull(formData.get('startDate'))
    const endDateRaw = emptyToNull(formData.get('endDate'))
    await runAuthorized('faculty_profile:edit_own', (principal) =>
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
    return { status: 'success', message: 'Experience added.' }
  } catch {
    return { status: 'error', message: 'Could not add experience record. Check the fields and try again.' }
  }
}

export async function addFacultyCertification(_previous: FacultyActionState, formData: FormData): Promise<FacultyActionState> {
  try {
    const issuedAtRaw = emptyToNull(formData.get('issuedAt'))
    await runAuthorized('faculty_profile:edit_own', (principal) =>
      addOwnFacultyCertification({
        principal,
        repository: certificationRepository,
        data: {
          name: formData.get('name'),
          issuer: emptyToNull(formData.get('issuer')),
          fileUrl: emptyToNull(formData.get('fileUrl')),
          issuedAt: issuedAtRaw ? new Date(`${issuedAtRaw}T12:00:00`) : null,
        },
      }),
    )
    revalidatePath('/faculty')
    return { status: 'success', message: 'Certification added.' }
  } catch {
    return { status: 'error', message: 'Could not add certification. Check the fields and try again.' }
  }
}

export async function addFacultyResearchPaper(_previous: FacultyActionState, formData: FormData): Promise<FacultyActionState> {
  try {
    const publishedAtRaw = emptyToNull(formData.get('publishedAt'))
    await runAuthorized('faculty_profile:edit_own', (principal) =>
      addOwnFacultyResearchPaper({
        principal,
        repository: researchPaperRepository,
        data: {
          title: formData.get('title'),
          publication: emptyToNull(formData.get('publication')),
          doi: emptyToNull(formData.get('doi')),
          fileUrl: emptyToNull(formData.get('fileUrl')),
          publishedAt: publishedAtRaw ? new Date(`${publishedAtRaw}T12:00:00`) : null,
        },
      }),
    )
    revalidatePath('/faculty')
    return { status: 'success', message: 'Research paper added.' }
  } catch {
    return { status: 'error', message: 'Could not add research paper. Check the fields and try again.' }
  }
}

export async function addFacultyPatent(_previous: FacultyActionState, formData: FormData): Promise<FacultyActionState> {
  try {
    const filedAtRaw = emptyToNull(formData.get('filedAt'))
    await runAuthorized('faculty_profile:edit_own', (principal) =>
      addOwnFacultyPatent({
        principal,
        repository: patentRepository,
        data: {
          title: formData.get('title'),
          patentNumber: emptyToNull(formData.get('patentNumber')),
          status: emptyToNull(formData.get('status')),
          fileUrl: emptyToNull(formData.get('fileUrl')),
          filedAt: filedAtRaw ? new Date(`${filedAtRaw}T12:00:00`) : null,
        },
      }),
    )
    revalidatePath('/faculty')
    return { status: 'success', message: 'Patent added.' }
  } catch {
    return { status: 'error', message: 'Could not add patent. Check the fields and try again.' }
  }
}
