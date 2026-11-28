import { NextResponse, type NextRequest } from 'next/server'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { AuthorizationError } from '@/lib/server/authorization'
import { AuthenticationRequiredError } from '@/lib/server/action-guard'
import { listOwnRecentDocuments } from '@/lib/server/services/document-intelligence'

export async function GET(request: NextRequest) {
  try {
    const principal = await getCurrentPrincipal()
    const q = request.nextUrl.searchParams.get('q') ?? undefined
    const mimeRaw = request.nextUrl.searchParams.get('mime')
    const mimeCategory = mimeRaw === 'PDF' || mimeRaw === 'IMAGE' ? mimeRaw : 'ALL'
    const limit = Number(request.nextUrl.searchParams.get('limit') ?? 20)

    const items = await listOwnRecentDocuments({
      principal,
      query: q,
      mimeCategory,
      limit: Number.isFinite(limit) ? limit : 20,
    })

    return NextResponse.json({ items }, { status: 200 })
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    const message = error instanceof Error ? error.message : 'Failed to list documents.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
