import { NextResponse, type NextRequest } from 'next/server'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { AuthenticationRequiredError } from '@/lib/server/action-guard'
import { runGlobalSearch } from '@/lib/server/services/global-search'

export async function GET(request: NextRequest) {
  try {
    const principal = await getCurrentPrincipal()
    const q = request.nextUrl.searchParams.get('q') ?? ''
    const results = await runGlobalSearch(principal, q)
    return NextResponse.json({ results }, { status: 200 })
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })
    }
    return NextResponse.json({ results: [] }, { status: 200 })
  }
}
