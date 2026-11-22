import 'server-only'
import { prisma } from '@/lib/server/db'
import type { Department, Course } from '@/generated/prisma/client'
import type { DepartmentInput, CourseInput, DepartmentRepository } from '../services/department'

export type DepartmentWithCourseCount = Department & { _count?: { courses: number } }

export class PrismaDepartmentRepository implements DepartmentRepository<DepartmentWithCourseCount, Course> {
  async listDepartments(input: { institutionId: string }): Promise<DepartmentWithCourseCount[]> {
    return prisma.department.findMany({
      where: { institutionId: input.institutionId },
      include: {
        _count: {
          select: { courses: true },
        },
      },
      orderBy: { name: 'asc' },
    })
  }

  async createDepartment(input: { institutionId: string; data: DepartmentInput }): Promise<DepartmentWithCourseCount> {
    return prisma.department.create({
      data: {
        institutionId: input.institutionId,
        name: input.data.name,
        code: input.data.code,
      },
      include: {
        _count: {
          select: { courses: true },
        },
      },
    })
  }

  async listCourses(input: { institutionId: string; departmentId?: string }): Promise<Course[]> {
    return prisma.course.findMany({
      where: {
        institutionId: input.institutionId,
        ...(input.departmentId ? { departmentId: input.departmentId } : {}),
      },
      orderBy: { name: 'asc' },
    })
  }

  async createCourse(input: { institutionId: string; data: CourseInput }): Promise<Course> {
    return prisma.course.create({
      data: {
        institutionId: input.institutionId,
        departmentId: input.data.departmentId,
        name: input.data.name,
        code: input.data.code,
        description: input.data.description,
      },
    })
  }
}
