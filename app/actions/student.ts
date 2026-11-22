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
import { PrismaStudentSkillRepository } from '@/lib/server/repositories/student-skill-repository'
import { PrismaStudentSemesterRepository } from '@/lib/server/repositories/student-semester-repository'
import { PrismaCriterionTagRepository } from '@/lib/server/repositories/criterion-tag-repository'
import {
  updateOwnStudentProfile,
  addOwnStudentEducation,
  updateOwnStudentEducation,
  deleteOwnStudentEducation,
  addOwnStudentCertification,
  updateOwnStudentCertification,
  deleteOwnStudentCertification,
  addOwnStudentResearchPaper,
  updateOwnStudentResearchPaper,
  deleteOwnStudentResearchPaper,
  addOwnStudentPatent,
  updateOwnStudentPatent,
  deleteOwnStudentPatent,
  addOwnStudentProject,
  updateOwnStudentProject,
  deleteOwnStudentProject,
  addOwnStudentInternship,
  updateOwnStudentInternship,
  deleteOwnStudentInternship,
  addOwnStudentSkill,
  updateOwnStudentSkill,
  deleteOwnStudentSkill,
  addOwnStudentSemester,
  updateOwnStudentSemester,
  deleteOwnStudentSemester,
} from '@/lib/server/services/student'
import {
  addOwnAchievement,
  updateOwnAchievement,
  deleteOwnAchievement,
} from '@/lib/server/services/student-achievements'

export type StudentActionState = { status: 'idle' | 'success' | 'error'; message: string }

const profileRepository = new PrismaStudentProfileRepository()
const achievementRepository = new PrismaStudentAchievementRepository()
const educationRepository = new PrismaStudentEducationRepository()
const certificationRepository = new PrismaStudentCertificationRepository()
const researchPaperRepository = new PrismaStudentResearchPaperRepository()
const patentRepository = new PrismaStudentPatentRepository()
const projectRepository = new PrismaStudentProjectRepository()
const internshipRepository = new PrismaStudentInternshipRepository()
const skillRepository = new PrismaStudentSkillRepository()
const semesterRepository = new PrismaStudentSemesterRepository()
const criterionTagRepository = new PrismaCriterionTagRepository()

const runAuthorized = createActionGuard(getCurrentPrincipal)

const emptyToNull = (value: FormDataEntryValue | null) => {
  const normalized = typeof value === 'string' ? value.trim() : ''
  return normalized || null
}

// ---------------- Profile ----------------
export async function saveStudentProfile(_previous: StudentActionState, formData: FormData): Promise<StudentActionState> {
  try {
    const admissionYearRaw = emptyToNull(formData.get('admissionYear'))
    const currentSemesterRaw = emptyToNull(formData.get('currentSemester'))

    await runAuthorized('student_profile:edit_own', (auth) => updateOwnStudentProfile({
      principal: auth,
      repository: profileRepository,
      data: {
        dateOfBirth: emptyToNull(formData.get('dateOfBirth')) ? new Date(`${formData.get('dateOfBirth')}T12:00:00`) : null,
        phone: emptyToNull(formData.get('phone')),
        address: emptyToNull(formData.get('address')),
        enrollmentNumber: emptyToNull(formData.get('enrollmentNumber')),
        departmentId: emptyToNull(formData.get('departmentId')),
        courseId: emptyToNull(formData.get('courseId')),
        admissionYear: admissionYearRaw ? parseInt(admissionYearRaw, 10) : null,
        currentSemester: currentSemesterRaw ? parseInt(currentSemesterRaw, 10) : null,
        linkedinUrl: emptyToNull(formData.get('linkedinUrl')),
        githubUrl: emptyToNull(formData.get('githubUrl')),
        portfolioUrl: emptyToNull(formData.get('portfolioUrl')),
        photoUrl: emptyToNull(formData.get('photoUrl')),
      },
    }))
    revalidatePath('/student')
    return { status: 'success', message: 'Profile updated successfully.' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not save your profile. Check fields and try again.'
    return { status: 'error', message }
  }
}

// ---------------- Achievements ----------------
export async function addStudentAchievement(_previous: StudentActionState, formData: FormData): Promise<StudentActionState> {
  try {
    const criterionCode = emptyToNull(formData.get('criterionCode'))
    await runAuthorized('achievement:create_own', async (principal) => {
      const record = await addOwnAchievement({
        principal,
        repository: achievementRepository,
        data: {
          title: formData.get('title'),
          category: formData.get('category'),
          status: formData.get('status'),
          description: emptyToNull(formData.get('description')),
          awardedAt: emptyToNull(formData.get('awardedAt')) ? new Date(`${formData.get('awardedAt')}T12:00:00`) : null,
        },
      })
      if (criterionCode) {
        await criterionTagRepository.setTagForItem({
          institutionId: principal.institutionId,
          itemType: 'ACHIEVEMENT',
          itemId: record.id,
          criterionCode,
        })
      }
    })
    revalidatePath('/student')
    return { status: 'success', message: 'Achievement added successfully.' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not add achievement.'
    return { status: 'error', message }
  }
}

export async function updateStudentAchievement(_previous: StudentActionState, formData: FormData): Promise<StudentActionState> {
  try {
    const id = formData.get('id') as string
    if (!id) throw new Error('Missing record ID.')
    const criterionCode = emptyToNull(formData.get('criterionCode'))

    await runAuthorized('achievement:edit_own', async (principal) => {
      await updateOwnAchievement({
        principal,
        repository: achievementRepository,
        id,
        data: {
          title: formData.get('title'),
          category: formData.get('category'),
          status: formData.get('status'),
          description: emptyToNull(formData.get('description')),
          awardedAt: emptyToNull(formData.get('awardedAt')) ? new Date(`${formData.get('awardedAt')}T12:00:00`) : null,
        },
      })
      if (criterionCode) {
        await criterionTagRepository.setTagForItem({
          institutionId: principal.institutionId,
          itemType: 'ACHIEVEMENT',
          itemId: id,
          criterionCode,
        })
      }
    })
    revalidatePath('/student')
    return { status: 'success', message: 'Achievement updated.' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not update achievement.'
    return { status: 'error', message }
  }
}

export async function deleteStudentAchievement(_previous: StudentActionState, formData: FormData): Promise<StudentActionState> {
  try {
    const id = formData.get('id') as string
    if (!id) throw new Error('Missing record ID.')
    await runAuthorized('achievement:delete_own', (principal) => deleteOwnAchievement({
      principal,
      repository: achievementRepository,
      id,
    }))
    revalidatePath('/student')
    return { status: 'success', message: 'Achievement deleted.' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not delete achievement.'
    return { status: 'error', message }
  }
}

// ---------------- Education ----------------
export async function addStudentEducation(_previous: StudentActionState, formData: FormData): Promise<StudentActionState> {
  try {
    const startYearRaw = emptyToNull(formData.get('startYear'))
    const endYearRaw = emptyToNull(formData.get('endYear'))

    await runAuthorized('student_education:edit_own', (auth) => addOwnStudentEducation({
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
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not add education record.'
    return { status: 'error', message }
  }
}

export async function updateStudentEducation(_previous: StudentActionState, formData: FormData): Promise<StudentActionState> {
  try {
    const id = formData.get('id') as string
    if (!id) throw new Error('Missing record ID.')
    const startYearRaw = emptyToNull(formData.get('startYear'))
    const endYearRaw = emptyToNull(formData.get('endYear'))

    await runAuthorized('student_education:edit_own', (auth) => updateOwnStudentEducation({
      principal: auth,
      repository: educationRepository,
      id,
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
    return { status: 'success', message: 'Education record updated.' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not update education record.'
    return { status: 'error', message }
  }
}

export async function deleteStudentEducation(_previous: StudentActionState, formData: FormData): Promise<StudentActionState> {
  try {
    const id = formData.get('id') as string
    if (!id) throw new Error('Missing record ID.')
    await runAuthorized('student_education:delete_own', (auth) => deleteOwnStudentEducation({
      principal: auth,
      repository: educationRepository,
      id,
    }))
    revalidatePath('/student')
    return { status: 'success', message: 'Education record deleted.' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not delete education record.'
    return { status: 'error', message }
  }
}

// ---------------- Certifications ----------------
export async function addStudentCertification(_previous: StudentActionState, formData: FormData): Promise<StudentActionState> {
  try {
    const issuedAtRaw = emptyToNull(formData.get('issuedAt'))
    const criterionCode = emptyToNull(formData.get('criterionCode'))

    await runAuthorized('student_certification:edit_own', async (auth) => {
      const record = await addOwnStudentCertification({
        principal: auth,
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
          institutionId: auth.institutionId,
          itemType: 'CERTIFICATION',
          itemId: record.id,
          criterionCode,
        })
      }
    })
    revalidatePath('/student')
    return { status: 'success', message: 'Certification added successfully.' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not add certification.'
    return { status: 'error', message }
  }
}

export async function updateStudentCertification(_previous: StudentActionState, formData: FormData): Promise<StudentActionState> {
  try {
    const id = formData.get('id') as string
    if (!id) throw new Error('Missing record ID.')
    const issuedAtRaw = emptyToNull(formData.get('issuedAt'))
    const criterionCode = emptyToNull(formData.get('criterionCode'))

    await runAuthorized('student_certification:edit_own', async (auth) => {
      await updateOwnStudentCertification({
        principal: auth,
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
          institutionId: auth.institutionId,
          itemType: 'CERTIFICATION',
          itemId: id,
          criterionCode,
        })
      }
    })
    revalidatePath('/student')
    return { status: 'success', message: 'Certification updated.' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not update certification.'
    return { status: 'error', message }
  }
}

export async function deleteStudentCertification(_previous: StudentActionState, formData: FormData): Promise<StudentActionState> {
  try {
    const id = formData.get('id') as string
    if (!id) throw new Error('Missing record ID.')
    await runAuthorized('student_certification:delete_own', (auth) => deleteOwnStudentCertification({
      principal: auth,
      repository: certificationRepository,
      id,
    }))
    revalidatePath('/student')
    return { status: 'success', message: 'Certification deleted.' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not delete certification.'
    return { status: 'error', message }
  }
}

// ---------------- Research Papers ----------------
export async function addStudentResearchPaper(_previous: StudentActionState, formData: FormData): Promise<StudentActionState> {
  try {
    const publishedAtRaw = emptyToNull(formData.get('publishedAt'))
    const criterionCode = emptyToNull(formData.get('criterionCode'))

    await runAuthorized('student_research:edit_own', async (auth) => {
      const record = await addOwnStudentResearchPaper({
        principal: auth,
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
          institutionId: auth.institutionId,
          itemType: 'RESEARCH_PAPER',
          itemId: record.id,
          criterionCode,
        })
      }
    })
    revalidatePath('/student')
    return { status: 'success', message: 'Research paper added successfully.' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not add research paper.'
    return { status: 'error', message }
  }
}

export async function updateStudentResearchPaper(_previous: StudentActionState, formData: FormData): Promise<StudentActionState> {
  try {
    const id = formData.get('id') as string
    if (!id) throw new Error('Missing record ID.')
    const publishedAtRaw = emptyToNull(formData.get('publishedAt'))
    const criterionCode = emptyToNull(formData.get('criterionCode'))

    await runAuthorized('student_research:edit_own', async (auth) => {
      await updateOwnStudentResearchPaper({
        principal: auth,
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
          institutionId: auth.institutionId,
          itemType: 'RESEARCH_PAPER',
          itemId: id,
          criterionCode,
        })
      }
    })
    revalidatePath('/student')
    return { status: 'success', message: 'Research paper updated.' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not update research paper.'
    return { status: 'error', message }
  }
}

export async function deleteStudentResearchPaper(_previous: StudentActionState, formData: FormData): Promise<StudentActionState> {
  try {
    const id = formData.get('id') as string
    if (!id) throw new Error('Missing record ID.')
    await runAuthorized('student_research:delete_own', (auth) => deleteOwnStudentResearchPaper({
      principal: auth,
      repository: researchPaperRepository,
      id,
    }))
    revalidatePath('/student')
    return { status: 'success', message: 'Research paper deleted.' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not delete research paper.'
    return { status: 'error', message }
  }
}

// ---------------- Patents ----------------
export async function addStudentPatent(_previous: StudentActionState, formData: FormData): Promise<StudentActionState> {
  try {
    const filedAtRaw = emptyToNull(formData.get('filedAt'))
    const criterionCode = emptyToNull(formData.get('criterionCode'))

    await runAuthorized('student_patent:edit_own', async (auth) => {
      const record = await addOwnStudentPatent({
        principal: auth,
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
          institutionId: auth.institutionId,
          itemType: 'PATENT',
          itemId: record.id,
          criterionCode,
        })
      }
    })
    revalidatePath('/student')
    return { status: 'success', message: 'Patent added successfully.' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not add patent.'
    return { status: 'error', message }
  }
}

export async function updateStudentPatent(_previous: StudentActionState, formData: FormData): Promise<StudentActionState> {
  try {
    const id = formData.get('id') as string
    if (!id) throw new Error('Missing record ID.')
    const filedAtRaw = emptyToNull(formData.get('filedAt'))
    const criterionCode = emptyToNull(formData.get('criterionCode'))

    await runAuthorized('student_patent:edit_own', async (auth) => {
      await updateOwnStudentPatent({
        principal: auth,
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
          institutionId: auth.institutionId,
          itemType: 'PATENT',
          itemId: id,
          criterionCode,
        })
      }
    })
    revalidatePath('/student')
    return { status: 'success', message: 'Patent updated.' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not update patent.'
    return { status: 'error', message }
  }
}

export async function deleteStudentPatent(_previous: StudentActionState, formData: FormData): Promise<StudentActionState> {
  try {
    const id = formData.get('id') as string
    if (!id) throw new Error('Missing record ID.')
    await runAuthorized('student_patent:delete_own', (auth) => deleteOwnStudentPatent({
      principal: auth,
      repository: patentRepository,
      id,
    }))
    revalidatePath('/student')
    return { status: 'success', message: 'Patent deleted.' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not delete patent.'
    return { status: 'error', message }
  }
}

// ---------------- Projects ----------------
export async function addStudentProject(_previous: StudentActionState, formData: FormData): Promise<StudentActionState> {
  try {
    const startDateRaw = emptyToNull(formData.get('startDate'))
    const endDateRaw = emptyToNull(formData.get('endDate'))

    await runAuthorized('student_project:edit_own', (auth) => addOwnStudentProject({
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
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not add project.'
    return { status: 'error', message }
  }
}

export async function updateStudentProject(_previous: StudentActionState, formData: FormData): Promise<StudentActionState> {
  try {
    const id = formData.get('id') as string
    if (!id) throw new Error('Missing record ID.')
    const startDateRaw = emptyToNull(formData.get('startDate'))
    const endDateRaw = emptyToNull(formData.get('endDate'))

    await runAuthorized('student_project:edit_own', (auth) => updateOwnStudentProject({
      principal: auth,
      repository: projectRepository,
      id,
      data: {
        title: formData.get('title'),
        description: emptyToNull(formData.get('description')),
        repositoryUrl: emptyToNull(formData.get('repositoryUrl')),
        startDate: startDateRaw ? new Date(`${startDateRaw}T12:00:00`) : null,
        endDate: endDateRaw ? new Date(`${endDateRaw}T12:00:00`) : null,
      },
    }))
    revalidatePath('/student')
    return { status: 'success', message: 'Project updated.' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not update project.'
    return { status: 'error', message }
  }
}

export async function deleteStudentProject(_previous: StudentActionState, formData: FormData): Promise<StudentActionState> {
  try {
    const id = formData.get('id') as string
    if (!id) throw new Error('Missing record ID.')
    await runAuthorized('student_project:delete_own', (auth) => deleteOwnStudentProject({
      principal: auth,
      repository: projectRepository,
      id,
    }))
    revalidatePath('/student')
    return { status: 'success', message: 'Project deleted.' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not delete project.'
    return { status: 'error', message }
  }
}

// ---------------- Internships ----------------
export async function addStudentInternship(_previous: StudentActionState, formData: FormData): Promise<StudentActionState> {
  try {
    const startDateRaw = emptyToNull(formData.get('startDate'))
    const endDateRaw = emptyToNull(formData.get('endDate'))

    await runAuthorized('student_internship:edit_own', (auth) => addOwnStudentInternship({
      principal: auth,
      repository: internshipRepository,
      data: {
        organization: formData.get('organization'),
        role: emptyToNull(formData.get('role')),
        description: emptyToNull(formData.get('description')),
        startDate: startDateRaw ? new Date(`${startDateRaw}T12:00:00`) : null,
        endDate: endDateRaw ? new Date(`${endDateRaw}T12:00:00`) : null,
        stipendAmount: emptyToNull(formData.get('stipendAmount')),
        offerType: (emptyToNull(formData.get('offerType')) as 'NONE' | 'PPO_OFFERED' | 'CONVERTED_TO_JOB') ?? 'NONE',
      },
    }))
    revalidatePath('/student')
    return { status: 'success', message: 'Internship added successfully.' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not add internship.'
    return { status: 'error', message }
  }
}

export async function updateStudentInternship(_previous: StudentActionState, formData: FormData): Promise<StudentActionState> {
  try {
    const id = formData.get('id') as string
    if (!id) throw new Error('Missing record ID.')
    const startDateRaw = emptyToNull(formData.get('startDate'))
    const endDateRaw = emptyToNull(formData.get('endDate'))

    await runAuthorized('student_internship:edit_own', (auth) => updateOwnStudentInternship({
      principal: auth,
      repository: internshipRepository,
      id,
      data: {
        organization: formData.get('organization'),
        role: emptyToNull(formData.get('role')),
        description: emptyToNull(formData.get('description')),
        startDate: startDateRaw ? new Date(`${startDateRaw}T12:00:00`) : null,
        endDate: endDateRaw ? new Date(`${endDateRaw}T12:00:00`) : null,
        stipendAmount: emptyToNull(formData.get('stipendAmount')),
        offerType: (emptyToNull(formData.get('offerType')) as 'NONE' | 'PPO_OFFERED' | 'CONVERTED_TO_JOB') ?? 'NONE',
      },
    }))
    revalidatePath('/student')
    return { status: 'success', message: 'Internship updated.' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not update internship.'
    return { status: 'error', message }
  }
}

export async function deleteStudentInternship(_previous: StudentActionState, formData: FormData): Promise<StudentActionState> {
  try {
    const id = formData.get('id') as string
    if (!id) throw new Error('Missing record ID.')
    await runAuthorized('student_internship:delete_own', (auth) => deleteOwnStudentInternship({
      principal: auth,
      repository: internshipRepository,
      id,
    }))
    revalidatePath('/student')
    return { status: 'success', message: 'Internship deleted.' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not delete internship.'
    return { status: 'error', message }
  }
}

// ---------------- Skills ----------------
export async function addStudentSkill(_previous: StudentActionState, formData: FormData): Promise<StudentActionState> {
  try {
    await runAuthorized('student_skill:create_own', (auth) => addOwnStudentSkill({
      principal: auth,
      repository: skillRepository,
      data: {
        skillName: formData.get('skillName'),
        proficiency: (emptyToNull(formData.get('proficiency')) as 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT') ?? 'INTERMEDIATE',
      },
    }))
    revalidatePath('/student')
    return { status: 'success', message: 'Skill added.' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not add skill.'
    return { status: 'error', message }
  }
}

export async function updateStudentSkill(_previous: StudentActionState, formData: FormData): Promise<StudentActionState> {
  try {
    const id = formData.get('id') as string
    if (!id) throw new Error('Missing record ID.')
    await runAuthorized('student_skill:edit_own', (auth) => updateOwnStudentSkill({
      principal: auth,
      repository: skillRepository,
      id,
      data: {
        skillName: formData.get('skillName'),
        proficiency: (emptyToNull(formData.get('proficiency')) as 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT') ?? 'INTERMEDIATE',
      },
    }))
    revalidatePath('/student')
    return { status: 'success', message: 'Skill updated.' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not update skill.'
    return { status: 'error', message }
  }
}

export async function deleteStudentSkill(_previous: StudentActionState, formData: FormData): Promise<StudentActionState> {
  try {
    const id = formData.get('id') as string
    if (!id) throw new Error('Missing record ID.')
    await runAuthorized('student_skill:delete_own', (auth) => deleteOwnStudentSkill({
      principal: auth,
      repository: skillRepository,
      id,
    }))
    revalidatePath('/student')
    return { status: 'success', message: 'Skill deleted.' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not delete skill.'
    return { status: 'error', message }
  }
}

// ---------------- Semesters ----------------
export async function addStudentSemesterRecord(_previous: StudentActionState, formData: FormData): Promise<StudentActionState> {
  try {
    const backlogsRaw = emptyToNull(formData.get('backlogCount'))
    await runAuthorized('student_semester:create_own', (auth) => addOwnStudentSemester({
      principal: auth,
      repository: semesterRepository,
      data: {
        semesterNumber: formData.get('semesterNumber'),
        sgpa: formData.get('sgpa'),
        cgpaAtSemester: formData.get('cgpaAtSemester'),
        backlogCount: backlogsRaw ? parseInt(backlogsRaw, 10) : 0,
      },
    }))
    revalidatePath('/student')
    return { status: 'success', message: 'Semester record added.' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not add semester record.'
    return { status: 'error', message }
  }
}

export async function updateStudentSemesterRecord(_previous: StudentActionState, formData: FormData): Promise<StudentActionState> {
  try {
    const id = formData.get('id') as string
    if (!id) throw new Error('Missing record ID.')
    const backlogsRaw = emptyToNull(formData.get('backlogCount'))
    await runAuthorized('student_semester:edit_own', (auth) => updateOwnStudentSemester({
      principal: auth,
      repository: semesterRepository,
      id,
      data: {
        semesterNumber: formData.get('semesterNumber'),
        sgpa: formData.get('sgpa'),
        cgpaAtSemester: formData.get('cgpaAtSemester'),
        backlogCount: backlogsRaw ? parseInt(backlogsRaw, 10) : 0,
      },
    }))
    revalidatePath('/student')
    return { status: 'success', message: 'Semester record updated.' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not update semester record.'
    return { status: 'error', message }
  }
}

export async function deleteStudentSemesterRecord(_previous: StudentActionState, formData: FormData): Promise<StudentActionState> {
  try {
    const id = formData.get('id') as string
    if (!id) throw new Error('Missing record ID.')
    await runAuthorized('student_semester:delete_own', (auth) => deleteOwnStudentSemester({
      principal: auth,
      repository: semesterRepository,
      id,
    }))
    revalidatePath('/student')
    return { status: 'success', message: 'Semester record deleted.' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not delete semester record.'
    return { status: 'error', message }
  }
}
