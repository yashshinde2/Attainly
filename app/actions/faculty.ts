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
import {
  addOwnCanonicalPublication,
  addOwnConsultancy,
  addOwnContribution,
  addOwnFdp,
  addOwnGrant,
  addOwnTeachingLoad,
  deleteOwnCanonicalPublication,
  deleteOwnConsultancy,
  deleteOwnContribution,
  deleteOwnFdp,
  deleteOwnGrant,
  deleteOwnTeachingLoad,
  updateOwnCanonicalPublication,
  updateOwnConsultancy,
  updateOwnContribution,
  updateOwnFdp,
  updateOwnGrant,
  updateOwnTeachingLoad,
} from '@/lib/server/services/faculty-portfolio'

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

function revalidateFacultyRoutes(...routes: string[]) {
  revalidatePath('/faculty')
  revalidatePath('/faculty/notifications')
  revalidatePath('/faculty/cv')
  for (const r of routes) revalidatePath(r)
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
          specialization: emptyToNull(formData.get('specialization')),
          bio: emptyToNull(formData.get('bio')),
          photoUrl: emptyToNull(formData.get('photoUrl')),
          linkedinUrl: emptyToNull(formData.get('linkedinUrl')),
          researchGateOrOrcidUrl: emptyToNull(formData.get('researchGateOrOrcidUrl')),
          orcidId: emptyToNull(formData.get('orcidId')),
          googleScholarUrl: emptyToNull(formData.get('googleScholarUrl')),
          scopusAuthorId: emptyToNull(formData.get('scopusAuthorId')),
        },
      }),
    )
    revalidateFacultyRoutes('/faculty/profile')
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
    revalidateFacultyRoutes('/faculty/qualifications', '/faculty/experience', '/faculty/development', '/faculty/research')
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
    revalidateFacultyRoutes('/faculty/qualifications', '/faculty/experience', '/faculty/development', '/faculty/research')
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
    revalidateFacultyRoutes('/faculty/qualifications', '/faculty/experience', '/faculty/development', '/faculty/research')
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
    revalidateFacultyRoutes('/faculty/qualifications', '/faculty/experience', '/faculty/development', '/faculty/research')
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
    revalidateFacultyRoutes('/faculty/qualifications', '/faculty/experience', '/faculty/development', '/faculty/research')
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
    revalidateFacultyRoutes('/faculty/qualifications', '/faculty/experience', '/faculty/development', '/faculty/research')
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
    revalidateFacultyRoutes('/faculty/qualifications', '/faculty/experience', '/faculty/development', '/faculty/research')
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
    revalidateFacultyRoutes('/faculty/qualifications', '/faculty/experience', '/faculty/development', '/faculty/research')
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
    revalidateFacultyRoutes('/faculty/qualifications', '/faculty/experience', '/faculty/development', '/faculty/research')
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
    revalidateFacultyRoutes('/faculty/qualifications', '/faculty/experience', '/faculty/development', '/faculty/research')
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
    revalidateFacultyRoutes('/faculty/qualifications', '/faculty/experience', '/faculty/development', '/faculty/research')
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
    revalidateFacultyRoutes('/faculty/qualifications', '/faculty/experience', '/faculty/development', '/faculty/research')
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
    revalidateFacultyRoutes('/faculty/qualifications', '/faculty/experience', '/faculty/development', '/faculty/research')
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
    revalidateFacultyRoutes('/faculty/qualifications', '/faculty/experience', '/faculty/development', '/faculty/research')
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
    revalidateFacultyRoutes('/faculty/research')
    return { status: 'success', message: 'Patent deleted.' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not delete patent.'
    return { status: 'error', message }
  }
}

// ---------------- Professional Development (FDP / STTP / Workshops) ----------------
export async function addFacultyFdpAction(_previous: FacultyActionState, formData: FormData): Promise<FacultyActionState> {
  try {
    const durationRaw = emptyToNull(formData.get('durationDays'))
    const criterionCode = emptyToNull(formData.get('criterionCode'))
    await runAuthorized('faculty_fdp:edit_own', async (principal) => {
      const rec = await addOwnFdp(principal, {
        programType: emptyToNull(formData.get('programType')) ?? 'FDP',
        title: formData.get('title'),
        organizer: formData.get('organizer'),
        mode: emptyToNull(formData.get('mode')) ?? 'ONLINE',
        durationDays: durationRaw ? parseInt(durationRaw, 10) : null,
        startDate: new Date(`${formData.get('startDate')}T12:00:00`),
        endDate: new Date(`${formData.get('endDate')}T12:00:00`),
        documentUrl: emptyToNull(formData.get('documentUrl')),
      })
      if (criterionCode) {
        await criterionTagRepository.setTagForItem({
          institutionId: principal.institutionId,
          itemType: 'FACULTY_FDP',
          itemId: rec.id,
          criterionCode,
        })
      }
    })
    revalidateFacultyRoutes('/faculty/development')
    return { status: 'success', message: 'Development program added.' }
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Could not add program.' }
  }
}

export async function updateFacultyFdpAction(_previous: FacultyActionState, formData: FormData): Promise<FacultyActionState> {
  try {
    const id = formData.get('id') as string
    if (!id) throw new Error('Missing record ID.')
    const durationRaw = emptyToNull(formData.get('durationDays'))
    await runAuthorized('faculty_fdp:edit_own', (principal) =>
      updateOwnFdp(principal, id, {
        programType: emptyToNull(formData.get('programType')) ?? 'FDP',
        title: formData.get('title'),
        organizer: formData.get('organizer'),
        mode: emptyToNull(formData.get('mode')) ?? 'ONLINE',
        durationDays: durationRaw ? parseInt(durationRaw, 10) : null,
        startDate: new Date(`${formData.get('startDate')}T12:00:00`),
        endDate: new Date(`${formData.get('endDate')}T12:00:00`),
        documentUrl: emptyToNull(formData.get('documentUrl')),
      }),
    )
    revalidateFacultyRoutes('/faculty/development')
    return { status: 'success', message: 'Development program updated.' }
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Could not update program.' }
  }
}

export async function deleteFacultyFdpAction(_previous: FacultyActionState, formData: FormData): Promise<FacultyActionState> {
  try {
    const id = formData.get('id') as string
    if (!id) throw new Error('Missing record ID.')
    await runAuthorized('faculty_fdp:delete_own', (principal) => deleteOwnFdp(principal, id))
    revalidateFacultyRoutes('/faculty/development')
    return { status: 'success', message: 'Development program deleted.' }
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Could not delete program.' }
  }
}

// ---------------- Teaching Workload ----------------
export async function addTeachingLoadAction(_previous: FacultyActionState, formData: FormData): Promise<FacultyActionState> {
  try {
    const studentCountRaw = emptyToNull(formData.get('studentCount'))
    await runAuthorized('faculty_teaching:edit_own', (principal) =>
      addOwnTeachingLoad(principal, {
        academicYear: formData.get('academicYear'),
        semester: formData.get('semester'),
        subjectName: formData.get('subjectName'),
        subjectCode: emptyToNull(formData.get('subjectCode')),
        hoursPerWeek: formData.get('hoursPerWeek'),
        studentCount: studentCountRaw ? parseInt(studentCountRaw, 10) : null,
      }),
    )
    revalidateFacultyRoutes('/faculty/experience')
    return { status: 'success', message: 'Teaching workload added.' }
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Could not add teaching load.' }
  }
}

export async function updateTeachingLoadAction(_previous: FacultyActionState, formData: FormData): Promise<FacultyActionState> {
  try {
    const id = formData.get('id') as string
    if (!id) throw new Error('Missing record ID.')
    const studentCountRaw = emptyToNull(formData.get('studentCount'))
    await runAuthorized('faculty_teaching:edit_own', (principal) =>
      updateOwnTeachingLoad(principal, id, {
        academicYear: formData.get('academicYear'),
        semester: formData.get('semester'),
        subjectName: formData.get('subjectName'),
        subjectCode: emptyToNull(formData.get('subjectCode')),
        hoursPerWeek: formData.get('hoursPerWeek'),
        studentCount: studentCountRaw ? parseInt(studentCountRaw, 10) : null,
      }),
    )
    revalidateFacultyRoutes('/faculty/experience')
    return { status: 'success', message: 'Teaching workload updated.' }
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Could not update teaching load.' }
  }
}

export async function deleteTeachingLoadAction(_previous: FacultyActionState, formData: FormData): Promise<FacultyActionState> {
  try {
    const id = formData.get('id') as string
    if (!id) throw new Error('Missing record ID.')
    await runAuthorized('faculty_teaching:delete_own', (principal) => deleteOwnTeachingLoad(principal, id))
    revalidateFacultyRoutes('/faculty/experience')
    return { status: 'success', message: 'Teaching workload deleted.' }
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Could not delete teaching load.' }
  }
}

// ---------------- Canonical Publications ----------------
export async function addCanonicalPublicationAction(_previous: FacultyActionState, formData: FormData): Promise<FacultyActionState> {
  try {
    const publishedAtRaw = emptyToNull(formData.get('publishedAt'))
    const authorOrderRaw = emptyToNull(formData.get('authorOrder'))
    const criterionCode = emptyToNull(formData.get('criterionCode'))
    await runAuthorized('faculty_research:edit_own', async (principal) => {
      const pub = await addOwnCanonicalPublication(principal, {
        title: formData.get('title'),
        publicationType: emptyToNull(formData.get('publicationType')) ?? 'JOURNAL',
        journalOrConference: emptyToNull(formData.get('journalOrConference')),
        publisher: emptyToNull(formData.get('publisher')),
        doi: emptyToNull(formData.get('doi')),
        issnOrIsbn: emptyToNull(formData.get('issnOrIsbn')),
        indexing: emptyToNull(formData.get('indexing')),
        authorsText: emptyToNull(formData.get('authorsText')),
        publishedAt: publishedAtRaw ? new Date(`${publishedAtRaw}T12:00:00`) : null,
        fileUrl: emptyToNull(formData.get('fileUrl')),
        authorOrder: authorOrderRaw ? parseInt(authorOrderRaw, 10) : 1,
        authorRole: emptyToNull(formData.get('authorRole')),
      })
      if (criterionCode) {
        await criterionTagRepository.setTagForItem({
          institutionId: principal.institutionId,
          itemType: 'CANONICAL_PUBLICATION',
          itemId: pub.id,
          criterionCode,
        })
      }
    })
    revalidateFacultyRoutes('/faculty/research')
    return { status: 'success', message: 'Publication saved and linked to your profile.' }
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Could not save publication.' }
  }
}

export async function updateCanonicalPublicationAction(_previous: FacultyActionState, formData: FormData): Promise<FacultyActionState> {
  try {
    const id = formData.get('id') as string
    if (!id) throw new Error('Missing record ID.')
    const publishedAtRaw = emptyToNull(formData.get('publishedAt'))
    await runAuthorized('faculty_research:edit_own', (principal) =>
      updateOwnCanonicalPublication(principal, id, {
        title: formData.get('title'),
        publicationType: emptyToNull(formData.get('publicationType')) ?? 'JOURNAL',
        journalOrConference: emptyToNull(formData.get('journalOrConference')),
        publisher: emptyToNull(formData.get('publisher')),
        doi: emptyToNull(formData.get('doi')),
        issnOrIsbn: emptyToNull(formData.get('issnOrIsbn')),
        indexing: emptyToNull(formData.get('indexing')),
        authorsText: emptyToNull(formData.get('authorsText')),
        publishedAt: publishedAtRaw ? new Date(`${publishedAtRaw}T12:00:00`) : null,
        fileUrl: emptyToNull(formData.get('fileUrl')),
      }),
    )
    revalidateFacultyRoutes('/faculty/research')
    return { status: 'success', message: 'Publication updated.' }
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Could not update publication.' }
  }
}

export async function deleteCanonicalPublicationAction(_previous: FacultyActionState, formData: FormData): Promise<FacultyActionState> {
  try {
    const id = formData.get('id') as string
    if (!id) throw new Error('Missing record ID.')
    await runAuthorized('faculty_research:delete_own', (principal) => deleteOwnCanonicalPublication(principal, id))
    revalidateFacultyRoutes('/faculty/research')
    return { status: 'success', message: 'Publication removed from your profile.' }
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Could not remove publication.' }
  }
}

// ---------------- Research Grants ----------------
export async function addFacultyGrantAction(_previous: FacultyActionState, formData: FormData): Promise<FacultyActionState> {
  try {
    const startRaw = emptyToNull(formData.get('startDate'))
    const endRaw = emptyToNull(formData.get('endDate'))
    const criterionCode = emptyToNull(formData.get('criterionCode'))
    await runAuthorized('faculty_grant:edit_own', async (principal) => {
      const rec = await addOwnGrant(principal, {
        title: formData.get('title'),
        fundingAgency: formData.get('fundingAgency'),
        grantNumber: emptyToNull(formData.get('grantNumber')),
        amount: emptyToNull(formData.get('amount')),
        role: emptyToNull(formData.get('role')) ?? 'PI',
        status: emptyToNull(formData.get('status')) ?? 'ONGOING',
        startDate: startRaw ? new Date(`${startRaw}T12:00:00`) : null,
        endDate: endRaw ? new Date(`${endRaw}T12:00:00`) : null,
        documentUrl: emptyToNull(formData.get('documentUrl')),
      })
      if (criterionCode) {
        await criterionTagRepository.setTagForItem({
          institutionId: principal.institutionId,
          itemType: 'FACULTY_GRANT',
          itemId: rec.id,
          criterionCode,
        })
      }
    })
    revalidateFacultyRoutes('/faculty/research')
    return { status: 'success', message: 'Research project / grant added.' }
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Could not add grant.' }
  }
}

export async function updateFacultyGrantAction(_previous: FacultyActionState, formData: FormData): Promise<FacultyActionState> {
  try {
    const id = formData.get('id') as string
    if (!id) throw new Error('Missing record ID.')
    const startRaw = emptyToNull(formData.get('startDate'))
    const endRaw = emptyToNull(formData.get('endDate'))
    await runAuthorized('faculty_grant:edit_own', (principal) =>
      updateOwnGrant(principal, id, {
        title: formData.get('title'),
        fundingAgency: formData.get('fundingAgency'),
        grantNumber: emptyToNull(formData.get('grantNumber')),
        amount: emptyToNull(formData.get('amount')),
        role: emptyToNull(formData.get('role')) ?? 'PI',
        status: emptyToNull(formData.get('status')) ?? 'ONGOING',
        startDate: startRaw ? new Date(`${startRaw}T12:00:00`) : null,
        endDate: endRaw ? new Date(`${endRaw}T12:00:00`) : null,
        documentUrl: emptyToNull(formData.get('documentUrl')),
      }),
    )
    revalidateFacultyRoutes('/faculty/research')
    return { status: 'success', message: 'Research grant updated.' }
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Could not update grant.' }
  }
}

export async function deleteFacultyGrantAction(_previous: FacultyActionState, formData: FormData): Promise<FacultyActionState> {
  try {
    const id = formData.get('id') as string
    if (!id) throw new Error('Missing record ID.')
    await runAuthorized('faculty_grant:delete_own', (principal) => deleteOwnGrant(principal, id))
    revalidateFacultyRoutes('/faculty/research')
    return { status: 'success', message: 'Research grant deleted.' }
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Could not delete grant.' }
  }
}

// ---------------- Consultancy ----------------
export async function addFacultyConsultancyAction(_previous: FacultyActionState, formData: FormData): Promise<FacultyActionState> {
  try {
    const endRaw = emptyToNull(formData.get('endDate'))
    const criterionCode = emptyToNull(formData.get('criterionCode'))
    await runAuthorized('faculty_consultancy:edit_own', async (principal) => {
      const rec = await addOwnConsultancy(principal, {
        title: formData.get('title'),
        clientOrganization: formData.get('clientOrganization'),
        role: emptyToNull(formData.get('role')),
        amount: emptyToNull(formData.get('amount')),
        startDate: new Date(`${formData.get('startDate')}T12:00:00`),
        endDate: endRaw ? new Date(`${endRaw}T12:00:00`) : null,
        outcomes: emptyToNull(formData.get('outcomes')),
        documentUrl: emptyToNull(formData.get('documentUrl')),
      })
      if (criterionCode) {
        await criterionTagRepository.setTagForItem({
          institutionId: principal.institutionId,
          itemType: 'FACULTY_CONSULTANCY',
          itemId: rec.id,
          criterionCode,
        })
      }
    })
    revalidateFacultyRoutes('/faculty/consultancy')
    return { status: 'success', message: 'Consultancy record added.' }
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Could not add consultancy.' }
  }
}

export async function updateFacultyConsultancyAction(_previous: FacultyActionState, formData: FormData): Promise<FacultyActionState> {
  try {
    const id = formData.get('id') as string
    if (!id) throw new Error('Missing record ID.')
    const endRaw = emptyToNull(formData.get('endDate'))
    await runAuthorized('faculty_consultancy:edit_own', (principal) =>
      updateOwnConsultancy(principal, id, {
        title: formData.get('title'),
        clientOrganization: formData.get('clientOrganization'),
        role: emptyToNull(formData.get('role')),
        amount: emptyToNull(formData.get('amount')),
        startDate: new Date(`${formData.get('startDate')}T12:00:00`),
        endDate: endRaw ? new Date(`${endRaw}T12:00:00`) : null,
        outcomes: emptyToNull(formData.get('outcomes')),
        documentUrl: emptyToNull(formData.get('documentUrl')),
      }),
    )
    revalidateFacultyRoutes('/faculty/consultancy')
    return { status: 'success', message: 'Consultancy record updated.' }
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Could not update consultancy.' }
  }
}

export async function deleteFacultyConsultancyAction(_previous: FacultyActionState, formData: FormData): Promise<FacultyActionState> {
  try {
    const id = formData.get('id') as string
    if (!id) throw new Error('Missing record ID.')
    await runAuthorized('faculty_consultancy:delete_own', (principal) => deleteOwnConsultancy(principal, id))
    revalidateFacultyRoutes('/faculty/consultancy')
    return { status: 'success', message: 'Consultancy record deleted.' }
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Could not delete consultancy.' }
  }
}

// ---------------- Contributions ----------------
export async function addFacultyContributionAction(_previous: FacultyActionState, formData: FormData): Promise<FacultyActionState> {
  try {
    const startRaw = emptyToNull(formData.get('startDate'))
    const endRaw = emptyToNull(formData.get('endDate'))
    const criterionCode = emptyToNull(formData.get('criterionCode'))
    await runAuthorized('faculty_contribution:edit_own', async (principal) => {
      const rec = await addOwnContribution(principal, {
        contributionType: formData.get('contributionType'),
        title: formData.get('title'),
        organizationOrBody: emptyToNull(formData.get('organizationOrBody')),
        role: emptyToNull(formData.get('role')),
        startDate: startRaw ? new Date(`${startRaw}T12:00:00`) : null,
        endDate: endRaw ? new Date(`${endRaw}T12:00:00`) : null,
        description: emptyToNull(formData.get('description')),
        documentUrl: emptyToNull(formData.get('documentUrl')),
      })
      if (criterionCode) {
        await criterionTagRepository.setTagForItem({
          institutionId: principal.institutionId,
          itemType: 'FACULTY_CONTRIBUTION',
          itemId: rec.id,
          criterionCode,
        })
      }
    })
    revalidateFacultyRoutes('/faculty/contributions')
    return { status: 'success', message: 'Contribution added.' }
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Could not add contribution.' }
  }
}

export async function updateFacultyContributionAction(_previous: FacultyActionState, formData: FormData): Promise<FacultyActionState> {
  try {
    const id = formData.get('id') as string
    if (!id) throw new Error('Missing record ID.')
    const startRaw = emptyToNull(formData.get('startDate'))
    const endRaw = emptyToNull(formData.get('endDate'))
    await runAuthorized('faculty_contribution:edit_own', (principal) =>
      updateOwnContribution(principal, id, {
        contributionType: formData.get('contributionType'),
        title: formData.get('title'),
        organizationOrBody: emptyToNull(formData.get('organizationOrBody')),
        role: emptyToNull(formData.get('role')),
        startDate: startRaw ? new Date(`${startRaw}T12:00:00`) : null,
        endDate: endRaw ? new Date(`${endRaw}T12:00:00`) : null,
        description: emptyToNull(formData.get('description')),
        documentUrl: emptyToNull(formData.get('documentUrl')),
      }),
    )
    revalidateFacultyRoutes('/faculty/contributions')
    return { status: 'success', message: 'Contribution updated.' }
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Could not update contribution.' }
  }
}

export async function deleteFacultyContributionAction(_previous: FacultyActionState, formData: FormData): Promise<FacultyActionState> {
  try {
    const id = formData.get('id') as string
    if (!id) throw new Error('Missing record ID.')
    await runAuthorized('faculty_contribution:delete_own', (principal) => deleteOwnContribution(principal, id))
    revalidateFacultyRoutes('/faculty/contributions')
    return { status: 'success', message: 'Contribution deleted.' }
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Could not delete contribution.' }
  }
}
