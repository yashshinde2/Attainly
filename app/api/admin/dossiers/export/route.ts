import { NextResponse, type NextRequest } from 'next/server'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { AuthorizationError } from '@/lib/server/authorization'
import { buildBulkDossierZip } from '@/lib/server/services/dossier-export'

export async function POST(request: NextRequest) {
  try {
    const principal = await getCurrentPrincipal()
    const body = (await request.json()) as {
      targetType?: 'STUDENT' | 'FACULTY'
      userIds?: string[]
    }
    const targetType = body.targetType === 'FACULTY' ? 'FACULTY' : 'STUDENT'
    const userIds = Array.isArray(body.userIds) ? body.userIds : []

    const result = await buildBulkDossierZip({ principal, targetType, userIds })
    return new NextResponse(new Uint8Array(result.buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${result.filename}"`,
      },
    })
  } catch (error) {
    const status = error instanceof AuthorizationError ? 403 : 400
    const message = error instanceof Error ? error.message : 'Bulk dossier export failed.'
    return NextResponse.json({ error: message }, { status })
  }
}
