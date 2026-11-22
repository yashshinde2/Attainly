'use server'

import { revalidatePath } from 'next/cache'
import { createActionGuard } from '@/lib/server/action-guard'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { PrismaStudentProfileRepository } from '@/lib/server/repositories/student-profile-repository'
import { PrismaStudentAchievementRepository } from '@/lib/server/repositories/student-achievement-repository'
import { updateOwnStudentProfile } from '@/lib/server/services/student'
import { addOwnAchievement } from '@/lib/server/services/student-achievements'

export type StudentActionState = { status: 'idle' | 'success' | 'error'; message: string }

const profileRepository = new PrismaStudentProfileRepository()
const achievementRepository = new PrismaStudentAchievementRepository()
const runAuthorized = createActionGuard(getCurrentPrincipal)
const emptyToNull = (value: FormDataEntryValue | null) => {
  const normalized = typeof value === 'string' ? value.trim() : ''
  return normalized || null
}

export async function saveStudentProfile(_previous: StudentActionState, formData: FormData): Promise<StudentActionState> {
  try {
    await runAuthorized('student_profile:edit_own', (principal) => updateOwnStudentProfile({
      principal,
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
