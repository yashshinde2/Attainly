import 'server-only'
import { prisma } from '@/lib/server/db'
import type { Department, Course } from '@/generated/prisma/client'
import type { DepartmentInput, CourseInput, DepartmentRepository } from '../services/department'

export type DepartmentWithCourseCount = Department & { _count?: { courses: number } }
export type CourseWithDepartment = Course & { department?: Department }

export class PrismaDepartmentRepository implements DepartmentRepository<DepartmentWithCourseCount, CourseWithDepartment> {
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
    try {
      return await prisma.department.create({
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
    } catch (err: any) {
      if (err?.code === 'P2002') {
        throw new Error(`A department with code "${input.data.code}" already exists.`)
      }
      throw err
    }
  }

  async listCourses(input: { institutionId: string; departmentId?: string }): Promise<CourseWithDepartment[]> {
    return prisma.course.findMany({
      where: {
        institutionId: input.institutionId,
        ...(input.departmentId ? { departmentId: input.departmentId } : {}),
      },
      include: {
        department: true,
      },
      orderBy: [{ department: { name: 'asc' } }, { name: 'asc' }],
    })
  }

  async createCourse(input: { institutionId: string; data: CourseInput }): Promise<CourseWithDepartment> {
    try {
      return await prisma.course.create({
        data: {
          institutionId: input.institutionId,
          departmentId: input.data.departmentId,
          name: input.data.name,
          code: input.data.code,
          description: input.data.description,
        },
        include: {
          department: true,
        },
      })
    } catch (err: any) {
      if (err?.code === 'P2002') {
        throw new Error(`A course with code "${input.data.code}" already exists.`)
      }
      throw err
    }
  }

  async deleteCourse(input: { institutionId: string; id: string }): Promise<void> {
    const course = await prisma.course.findFirst({
      where: { institutionId: input.institutionId, id: input.id },
    })
    if (!course) throw new Error('Course not found.')

    await prisma.course.delete({
      where: { institutionId_id: { institutionId: input.institutionId, id: input.id } },
    })
  }
}
