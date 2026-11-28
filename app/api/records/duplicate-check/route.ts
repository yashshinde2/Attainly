import { NextResponse, type NextRequest } from 'next/server'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { AuthenticationRequiredError } from '@/lib/server/action-guard'
import { findPotentialRecordDuplicates } from '@/lib/server/services/document-intelligence'

export async function GET(request: NextRequest) {
  try {
    const principal = await getCurrentPrincipal()
    const typeRaw = request.nextUrl.searchParams.get('type')
    const type =
      typeRaw === 'CERTIFICATION' || typeRaw === 'PUBLICATION' ? typeRaw : 'ACHIEVEMENT'
    const title = request.nextUrl.searchParams.get('title') ?? undefined
    const issuer = request.nextUrl.searchParams.get('issuer') ?? undefined
    const doi = request.nextUrl.searchParams.get('doi') ?? undefined

    const suggestions = await findPotentialRecordDuplicates({
      principal,
      type,
      title,
      issuer,
      doi,
    })

    return NextResponse.json({ suggestions }, { status: 200 })
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })
    }
    return NextResponse.json({ suggestions: [] }, { status: 200 })
  }
}
