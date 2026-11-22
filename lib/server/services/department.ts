import 'server-only'
import { z } from 'zod'
import { requirePermission, type AuthenticatedPrincipal } from '../authorization'

const departmentInput = z.object({
  name: z.string().trim().min(1).max(120),
  code: z.string().trim().min(1).max(20).toUpperCase(),
})

export type DepartmentInput = z.infer<typeof departmentInput>

const courseInput = z.object({
  departmentId: z.string().trim().min(1),
  name: z.string().trim().min(1).max(180),
  code: z.string().trim().min(1).max(20).toUpperCase(),
  description: z.string().trim().max(1000).nullable().optional(),
})

export type CourseInput = z.infer<typeof courseInput>

export interface DepartmentRepository<TDepartment, TCourse> {
  listDepartments(input: { institutionId: string }): Promise<TDepartment[]>
  createDepartment(input: { institutionId: string; data: DepartmentInput }): Promise<TDepartment>
  listCourses(input: { institutionId: string; departmentId?: string }): Promise<TCourse[]>
  createCourse(input: { institutionId: string; data: CourseInput }): Promise<TCourse>
}

export async function listInstitutionDepartments<TDepartment, TCourse>(input: {
  principal: AuthenticatedPrincipal
  repository: DepartmentRepository<TDepartment, TCourse>
}): Promise<TDepartment[]> {
  requirePermission(input.principal, 'department:manage')
  return input.repository.listDepartments({ institutionId: input.principal.institutionId })
}

export async function createInstitutionDepartment<TDepartment, TCourse>(input: {
  principal: AuthenticatedPrincipal
  repository: DepartmentRepository<TDepartment, TCourse>
  data: unknown
}): Promise<TDepartment> {
  requirePermission(input.principal, 'department:manage')
  const data = departmentInput.parse(input.data)
  return input.repository.createDepartment({ institutionId: input.principal.institutionId, data })
}

export async function listInstitutionCourses<TDepartment, TCourse>(input: {
  principal: AuthenticatedPrincipal
  repository: DepartmentRepository<TDepartment, TCourse>
  departmentId?: string
}): Promise<TCourse[]> {
  requirePermission(input.principal, 'course:manage')
  return input.repository.listCourses({
    institutionId: input.principal.institutionId,
    departmentId: input.departmentId,
  })
}

export async function createInstitutionCourse<TDepartment, TCourse>(input: {
  principal: AuthenticatedPrincipal
  repository: DepartmentRepository<TDepartment, TCourse>
  data: unknown
}): Promise<TCourse> {
  requirePermission(input.principal, 'course:manage')
  const data = courseInput.parse(input.data)
  return input.repository.createCourse({ institutionId: input.principal.institutionId, data })
}
