import { NextResponse, type NextRequest } from 'next/server'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { AuthorizationError } from '@/lib/server/authorization'
import { createAcademicYear, createBatch } from '@/lib/server/services/admin-command'
import { setCurrentAcademicYear } from '@/lib/server/services/lifecycle'

export async function POST(request: NextRequest) {
  try {
    const principal = await getCurrentPrincipal()
    const body = (await request.json()) as {
      action?: 'create_ay' | 'set_current_ay' | 'create_batch'
      academicYearId?: string
      label?: string
      startDate?: string
      endDate?: string
      isCurrent?: boolean
      name?: string
      admissionYear?: number
      departmentId?: string | null
      courseId?: string | null
    }

    if (body.action === 'set_current_ay') {
      if (!body.academicYearId) throw new Error('academicYearId is required.')
      const ay = await setCurrentAcademicYear(principal, body.academicYearId)
      return NextResponse.json({ academicYear: ay }, { status: 200 })
    }

    if (body.action === 'create_batch') {
      const batch = await createBatch(principal, {
        name: body.name,
        admissionYear: body.admissionYear,
        departmentId: body.departmentId ?? null,
        courseId: body.courseId ?? null,
      })
      return NextResponse.json({ batch }, { status: 201 })
    }

    const ay = await createAcademicYear(principal, {
      label: body.label,
      startDate: body.startDate,
      endDate: body.endDate,
      isCurrent: Boolean(body.isCurrent),
    })
    return NextResponse.json({ academicYear: ay }, { status: 201 })
  } catch (error) {
    const status = error instanceof AuthorizationError ? 403 : 400
    const message = error instanceof Error ? error.message : 'Academic year operation failed.'
    return NextResponse.json({ error: message }, { status })
  }
}
