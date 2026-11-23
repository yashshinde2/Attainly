'use server'

import { revalidatePath } from 'next/cache'
import { createActionGuard } from '@/lib/server/action-guard'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { PrismaDepartmentRepository } from '@/lib/server/repositories/department-repository'
import { PrismaInstitutionUserRepository } from '@/lib/server/repositories/institution-user-repository'
import { PrismaUserImportRepository } from '@/lib/server/repositories/user-import-repository'
import {
  createInstitutionDepartment,
  createInstitutionCourse,
  deleteInstitutionCourse,
} from '@/lib/server/services/department'
import { createInstitutionUser, resetInstitutionUserPassword } from '@/lib/server/services/institution-user'
import {
  updateInstitutionSettings,
  addCriterionReferenceCode,
  type CriterionReferenceItem,
} from '@/lib/server/services/institution'
import { importUsersFromCsv, type CreatedImportUser, type UserImportResult } from '@/lib/server/services/user-import'

export type AdminActionState = {
  status: 'idle' | 'success' | 'error'
  message: string
  createdUser?: {
    email: string
    name: string
    roleKey: string
    temporaryPassword: string
  }
  importResult?: UserImportResult
  resetResult?: {
    userId: string
    email: string
    temporaryPassword: string
  }
  newCriterion?: CriterionReferenceItem
}

const departmentRepository = new PrismaDepartmentRepository()
const userRepository = new PrismaInstitutionUserRepository()
const userImportRepository = new PrismaUserImportRepository()
const runAuthorized = createActionGuard(getCurrentPrincipal)

const emptyToNull = (value: FormDataEntryValue | null) => {
  const normalized = typeof value === 'string' ? value.trim() : ''
  return normalized || null
}

export async function addDepartment(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  try {
    await runAuthorized('department:manage', (principal) =>
      createInstitutionDepartment({
        principal,
        repository: departmentRepository,
        data: {
          name: formData.get('name'),
          code: formData.get('code'),
        },
      }),
    )
    revalidatePath('/admin')
    revalidatePath('/admin/departments')
    return { status: 'success', message: 'Department added successfully.' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not add department.'
    return { status: 'error', message: message || 'Could not add department. Check the fields and try again.' }
  }
}

export async function addCourse(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  try {
    await runAuthorized('course:manage', (principal) =>
      createInstitutionCourse({
        principal,
        repository: departmentRepository,
        data: {
          departmentId: emptyToNull(formData.get('departmentId')),
          name: emptyToNull(formData.get('name')),
          code: emptyToNull(formData.get('code')),
          description: emptyToNull(formData.get('description')),
        },
      }),
    )
    revalidatePath('/admin')
    revalidatePath('/admin/courses')
    revalidatePath('/admin/departments')
    revalidatePath('/student/courses')
    revalidatePath('/faculty/courses')
    return { status: 'success', message: 'Course added successfully.' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not add course.'
    return { status: 'error', message: message || 'Could not add course. Check the fields and try again.' }
  }
}

export async function deleteCourseAction(courseId: string): Promise<AdminActionState> {
  try {
    await runAuthorized('course:manage', (principal) =>
      deleteInstitutionCourse({
        principal,
        repository: departmentRepository,
        id: courseId,
      }),
    )
    revalidatePath('/admin/courses')
    revalidatePath('/admin/departments')
    revalidatePath('/student/courses')
    revalidatePath('/faculty/courses')
    return { status: 'success', message: 'Course deleted successfully.' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not delete course.'
    return { status: 'error', message: message || 'Could not delete course.' }
  }
}

export async function addUser(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  try {
    const principal = await getCurrentPrincipal()
    const permission = principal.permissions.includes('user:manage')
      ? 'user:manage'
      : principal.permissions.includes('department:manage')
        ? 'department:manage'
        : 'user:import'

    const result = await runAuthorized(permission, (authPrincipal) =>
      createInstitutionUser({
        principal: authPrincipal,
        repository: userRepository,
        data: {
          email: emptyToNull(formData.get('email')),
          firstName: emptyToNull(formData.get('firstName')),
          lastName: emptyToNull(formData.get('lastName')),
          roleKey: emptyToNull(formData.get('roleKey')),
        },
      }),
    )
    revalidatePath('/admin')
    revalidatePath('/admin/people')
    return {
      status: 'success',
      message: 'User created successfully.',
      createdUser: {
        email: result.user.email,
        name: `${result.user.firstName} ${result.user.lastName}`,
        roleKey: result.user.role.key,
        temporaryPassword: result.temporaryPassword,
      },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not create user.'
    return { status: 'error', message: message || 'Could not create user. Check the fields and try again.' }
  }
}

export async function importUsersCsvAction(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  try {
    const file = formData.get('csvFile') as File | null
    let csvContent = ''

    if (file && typeof file === 'object' && 'text' in file && file.size > 0) {
      csvContent = await file.text()
    } else {
      const rawText = formData.get('csvText')
      if (typeof rawText === 'string') {
        csvContent = rawText.trim()
      }
    }

    if (!csvContent) {
      return { status: 'error', message: 'Please provide a valid CSV file or paste CSV content.' }
    }

    const result = await runAuthorized('user:import', (principal) =>
      importUsersFromCsv({
        principal,
        repository: userImportRepository,
        csv: csvContent,
      }),
    )

    revalidatePath('/admin')
    revalidatePath('/admin/people')
    return {
      status: 'success',
      message: `Successfully imported ${result.count} users (${result.skippedCount} skipped/duplicates).`,
      importResult: result,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not import users.'
    return { status: 'error', message: message || 'Could not import users. Check CSV formatting and try again.' }
  }
}

export async function resetUserPasswordAction(userId: string): Promise<AdminActionState> {
  try {
    const principal = await getCurrentPrincipal()
    const permission = principal.permissions.includes('user:manage')
      ? 'user:manage'
      : principal.permissions.includes('department:manage')
        ? 'department:manage'
        : 'user:import'

    const result = await runAuthorized(permission, (authPrincipal) =>
      resetInstitutionUserPassword({
        principal: authPrincipal,
        repository: userRepository,
        userId,
      }),
    )

    revalidatePath('/admin')
    revalidatePath('/admin/people')
    return {
      status: 'success',
      message: 'Password reset successfully.',
      resetResult: {
        userId,
        email: result.user.email,
        temporaryPassword: result.temporaryPassword,
      },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not reset password.'
    return { status: 'error', message: message || 'Could not reset password.' }
  }
}

export async function updateInstitutionSettingsAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  try {
    await runAuthorized('institution:manage', (principal) =>
      updateInstitutionSettings({
        principal,
        data: {
          name: emptyToNull(formData.get('name')),
          logoUrl: emptyToNull(formData.get('logoUrl')),
        },
      }),
    )
    revalidatePath('/admin')
    revalidatePath('/admin/settings')
    return { status: 'success', message: 'Institution settings updated successfully.' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not update institution settings.'
    return { status: 'error', message: message || 'Could not update institution settings.' }
  }
}

export async function addCriterionCodeAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  try {
    const item = await runAuthorized('institution:manage', (principal) =>
      addCriterionReferenceCode({
        principal,
        data: {
          code: emptyToNull(formData.get('code')),
          label: emptyToNull(formData.get('label')),
        },
      }),
    )
    revalidatePath('/admin/settings')
    return { status: 'success', message: `Criterion "${item.code}" added successfully.`, newCriterion: item }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not add criterion code.'
    return { status: 'error', message: message || 'Could not add criterion code.' }
  }
}
