import { NextResponse, type NextRequest } from 'next/server'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { AuthorizationError } from '@/lib/server/authorization'
import {
  executeStudentLifecycleTransition,
  previewStudentLifecycleTransition,
  type StudentTransitionParams,
} from '@/lib/server/services/lifecycle'

export async function POST(request: NextRequest) {
  try {
    const principal = await getCurrentPrincipal()
    const body = (await request.json()) as {
      mode?: 'preview' | 'execute'
    } & StudentTransitionParams

    if (body.mode === 'execute') {
      const result = await executeStudentLifecycleTransition(principal, body)
      return NextResponse.json(result, { status: 200 })
    }

    const preview = await previewStudentLifecycleTransition(principal, body)
    return NextResponse.json({ preview }, { status: 200 })
  } catch (error) {
    const status = error instanceof AuthorizationError ? 403 : 400
    const message = error instanceof Error ? error.message : 'Student lifecycle transition failed.'
    return NextResponse.json({ error: message }, { status })
  }
}
