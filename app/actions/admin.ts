'use server'

import { revalidatePath } from 'next/cache'
import { createActionGuard } from '@/lib/server/action-guard'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { PrismaDepartmentRepository } from '@/lib/server/repositories/department-repository'
import { PrismaInstitutionUserRepository } from '@/lib/server/repositories/institution-user-repository'
import { createInstitutionDepartment } from '@/lib/server/services/department'
import { createInstitutionUser } from '@/lib/server/services/institution-user'

export type AdminActionState = { status: 'idle' | 'success' | 'error'; message: string }

const departmentRepository = new PrismaDepartmentRepository()
const userRepository = new PrismaInstitutionUserRepository()
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
    return { status: 'success', message: 'Department added successfully.' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not add department.'
    return { status: 'error', message: message || 'Could not add department. Check the fields and try again.' }
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

    await runAuthorized(permission, (authPrincipal) =>
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
    return { status: 'success', message: 'User created successfully.' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not create user.'
    return { status: 'error', message: message || 'Could not create user. Check the fields and try again.' }
  }
}
