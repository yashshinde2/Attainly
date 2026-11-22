'use server'

import { revalidatePath } from 'next/cache'
import { createActionGuard } from '@/lib/server/action-guard'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { PrismaStudentProfileRepository } from '@/lib/server/repositories/student-profile-repository'
import { PrismaStudentAchievementRepository } from '@/lib/server/repositories/student-achievement-repository'
import { PrismaStudentEducationRepository } from '@/lib/server/repositories/student-education-repository'
import { PrismaStudentCertificationRepository } from '@/lib/server/repositories/student-certification-repository'
import { PrismaStudentResearchPaperRepository } from '@/lib/server/repositories/student-research-paper-repository'
import { PrismaStudentPatentRepository } from '@/lib/server/repositories/student-patent-repository'
import { PrismaStudentProjectRepository } from '@/lib/server/repositories/student-project-repository'
import { PrismaStudentInternshipRepository } from '@/lib/server/repositories/student-internship-repository'
import {
  updateOwnStudentProfile,
  addOwnStudentEducation,
  addOwnStudentCertification,
  addOwnStudentResearchPaper,
  addOwnStudentPatent,
  addOwnStudentProject,
  addOwnStudentInternship,
} from '@/lib/server/services/student'
import { addOwnAchievement } from '@/lib/server/services/student-achievements'

export type StudentActionState = { status: 'idle' | 'success' | 'error'; message: string }

const profileRepository = new PrismaStudentProfileRepository()
const achievementRepository = new PrismaStudentAchievementRepository()
const educationRepository = new PrismaStudentEducationRepository()
const certificationRepository = new PrismaStudentCertificationRepository()
const researchPaperRepository = new PrismaStudentResearchPaperRepository()
const patentRepository = new PrismaStudentPatentRepository()
const projectRepository = new PrismaStudentProjectRepository()
const internshipRepository = new PrismaStudentInternshipRepository()

const runAuthorized = createActionGuard(getCurrentPrincipal)

const emptyToNull = (value: FormDataEntryValue | null) => {
  const normalized = typeof value === 'string' ? value.trim() : ''
  return normalized || null
}

export async function saveStudentProfile(_previous: StudentActionState, formData: FormData): Promise<StudentActionState> {
  try {
    const principal = await getCurrentPrincipal()
    const perm = principal.permissions.includes('student_profile:edit_own')
      ? 'student_profile:edit_own'
      : 'student_profile:edit_own'

    await runAuthorized(perm, (auth) => updateOwnStudentProfile({
      principal: auth,
      repository: profileRepository,
      data: {
        dateOfBirth: emptyToNull(formData.get('dateOfBirth')) ? new Date(`${formData.get('dateOfBirth')}T12:00:00`) : null,
        phone: emptyToNull(formData.get('phone')),
        address: emptyToNull(formData.get('address')),
      },
    }))
    revalidatePath('/student')
    return { status: 'success', message: 'Profile saved.' }
  } catch {
    return { status: 'error', message: 'Could not save your profile. Check the fields and try again.' }
  }
}

export async function addStudentAchievement(_previous: StudentActionState, formData: FormData): Promise<StudentActionState> {
  try {
    await runAuthorized('achievement:create_own', (principal) => addOwnAchievement({
      principal,
      repository: achievementRepository,
      data: {
        title: formData.get('title'),
        category: formData.get('category'),
        status: formData.get('status'),
        description: emptyToNull(formData.get('description')),
        awardedAt: emptyToNull(formData.get('awardedAt')) ? new Date(`${formData.get('awardedAt')}T12:00:00`) : null,
      },
    }))
    revalidatePath('/student')
    return { status: 'success', message: 'Achievement added.' }
  } catch {
    return { status: 'error', message: 'Could not add the achievement. Check the fields and try again.' }
  }
}

export async function addStudentEducation(_previous: StudentActionState, formData: FormData): Promise<StudentActionState> {
  try {
    const principal = await getCurrentPrincipal()
    const perm = principal.permissions.includes('student_education:edit_own')
      ? 'student_education:edit_own'
      : 'student_profile:edit_own'

    const startYearRaw = emptyToNull(formData.get('startYear'))
    const endYearRaw = emptyToNull(formData.get('endYear'))

    await runAuthorized(perm, (auth) => addOwnStudentEducation({
      principal: auth,
      repository: educationRepository,
      data: {
        level: formData.get('level'),
        institutionName: formData.get('institutionName'),
        boardOrUniversity: emptyToNull(formData.get('boardOrUniversity')),
        courseOrStream: emptyToNull(formData.get('courseOrStream')),
        score: emptyToNull(formData.get('score')),
        startYear: startYearRaw ? parseInt(startYearRaw, 10) : null,
        endYear: endYearRaw ? parseInt(endYearRaw, 10) : null,
      },
    }))
    revalidatePath('/student')
    return { status: 'success', message: 'Education added successfully.' }
  } catch {
    return { status: 'error', message: 'Could not add education record. Check your inputs.' }
  }
}

export async function addStudentCertification(_previous: StudentActionState, formData: FormData): Promise<StudentActionState> {
  try {
    const principal = await getCurrentPrincipal()
    const perm = principal.permissions.includes('student_certification:edit_own')
      ? 'student_certification:edit_own'
      : 'student_profile:edit_own'

    const issuedAtRaw = emptyToNull(formData.get('issuedAt'))

    await runAuthorized(perm, (auth) => addOwnStudentCertification({
      principal: auth,
      repository: certificationRepository,
      data: {
        name: formData.get('name'),
        issuer: emptyToNull(formData.get('issuer')),
        fileUrl: emptyToNull(formData.get('fileUrl')),
        issuedAt: issuedAtRaw ? new Date(`${issuedAtRaw}T12:00:00`) : null,
      },
    }))
    revalidatePath('/student')
    return { status: 'success', message: 'Certification added successfully.' }
  } catch {
    return { status: 'error', message: 'Could not add certification. Check your inputs.' }
  }
}

export async function addStudentResearchPaper(_previous: StudentActionState, formData: FormData): Promise<StudentActionState> {
  try {
    const principal = await getCurrentPrincipal()
    const perm = principal.permissions.includes('student_research:edit_own')
      ? 'student_research:edit_own'
      : 'student_profile:edit_own'

    const publishedAtRaw = emptyToNull(formData.get('publishedAt'))

    await runAuthorized(perm, (auth) => addOwnStudentResearchPaper({
      principal: auth,
      repository: researchPaperRepository,
      data: {
        title: formData.get('title'),
        publication: emptyToNull(formData.get('publication')),
        doi: emptyToNull(formData.get('doi')),
        fileUrl: emptyToNull(formData.get('fileUrl')),
        publishedAt: publishedAtRaw ? new Date(`${publishedAtRaw}T12:00:00`) : null,
      },
    }))
    revalidatePath('/student')
    return { status: 'success', message: 'Research paper added successfully.' }
  } catch {
    return { status: 'error', message: 'Could not add research paper. Check your inputs.' }
  }
}

export async function addStudentPatent(_previous: StudentActionState, formData: FormData): Promise<StudentActionState> {
  try {
    const principal = await getCurrentPrincipal()
    const perm = principal.permissions.includes('student_patent:edit_own')
      ? 'student_patent:edit_own'
      : 'student_profile:edit_own'

    const filedAtRaw = emptyToNull(formData.get('filedAt'))

    await runAuthorized(perm, (auth) => addOwnStudentPatent({
      principal: auth,
      repository: patentRepository,
      data: {
        title: formData.get('title'),
        patentNumber: emptyToNull(formData.get('patentNumber')),
        status: emptyToNull(formData.get('status')),
        fileUrl: emptyToNull(formData.get('fileUrl')),
        filedAt: filedAtRaw ? new Date(`${filedAtRaw}T12:00:00`) : null,
      },
    }))
    revalidatePath('/student')
    return { status: 'success', message: 'Patent added successfully.' }
  } catch {
    return { status: 'error', message: 'Could not add patent. Check your inputs.' }
  }
}

export async function addStudentProject(_previous: StudentActionState, formData: FormData): Promise<StudentActionState> {
  try {
    const principal = await getCurrentPrincipal()
    const perm = principal.permissions.includes('student_project:edit_own')
      ? 'student_project:edit_own'
      : 'student_profile:edit_own'

    const startDateRaw = emptyToNull(formData.get('startDate'))
    const endDateRaw = emptyToNull(formData.get('endDate'))

    await runAuthorized(perm, (auth) => addOwnStudentProject({
      principal: auth,
      repository: projectRepository,
      data: {
        title: formData.get('title'),
        description: emptyToNull(formData.get('description')),
        repositoryUrl: emptyToNull(formData.get('repositoryUrl')),
        startDate: startDateRaw ? new Date(`${startDateRaw}T12:00:00`) : null,
        endDate: endDateRaw ? new Date(`${endDateRaw}T12:00:00`) : null,
      },
    }))
    revalidatePath('/student')
    return { status: 'success', message: 'Project added successfully.' }
  } catch {
    return { status: 'error', message: 'Could not add project. Check your inputs.' }
  }
}

export async function addStudentInternship(_previous: StudentActionState, formData: FormData): Promise<StudentActionState> {
  try {
    const principal = await getCurrentPrincipal()
    const perm = principal.permissions.includes('student_internship:edit_own')
      ? 'student_internship:edit_own'
      : 'student_profile:edit_own'

    const startDateRaw = emptyToNull(formData.get('startDate'))
    const endDateRaw = emptyToNull(formData.get('endDate'))

    await runAuthorized(perm, (auth) => addOwnStudentInternship({
      principal: auth,
      repository: internshipRepository,
      data: {
        organization: formData.get('organization'),
        role: emptyToNull(formData.get('role')),
        description: emptyToNull(formData.get('description')),
        startDate: startDateRaw ? new Date(`${startDateRaw}T12:00:00`) : null,
        endDate: endDateRaw ? new Date(`${endDateRaw}T12:00:00`) : null,
      },
    }))
    revalidatePath('/student')
    return { status: 'success', message: 'Internship added successfully.' }
  } catch {
    return { status: 'error', message: 'Could not add internship. Check your inputs.' }
  }
}
