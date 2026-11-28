import { NextResponse, type NextRequest } from 'next/server'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { AuthorizationError } from '@/lib/server/authorization'
import { saveProfileCustomFields } from '@/lib/server/services/institution-config'

export async function POST(request: NextRequest) {
  try {
    const principal = await getCurrentPrincipal()
    const body = (await request.json()) as {
      profileType?: 'STUDENT' | 'FACULTY'
      profileId?: string
      values?: Record<string, string>
    }
    const profileType = body.profileType === 'FACULTY' ? 'FACULTY' : 'STUDENT'
    if (!body.profileId) {
      return NextResponse.json({ error: 'profileId is required.' }, { status: 400 })
    }
    const result = await saveProfileCustomFields(principal, {
      profileType,
      profileId: body.profileId,
      values: body.values ?? {},
    })
    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    const status = error instanceof AuthorizationError ? 403 : 400
    const message = error instanceof Error ? error.message : 'Failed to save custom fields.'
    return NextResponse.json({ error: message }, { status })
  }
}
