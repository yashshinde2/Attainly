import { NextResponse, type NextRequest } from 'next/server'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { AuthorizationError } from '@/lib/server/authorization'
import { confirmImportJob } from '@/lib/server/services/import-center'

export const maxDuration = 300

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ jobId: string }> },
) {
  try {
    const principal = await getCurrentPrincipal()
    const { jobId } = await context.params
    let runInBackground: boolean | undefined
    try {
      const body = (await request.json()) as { runInBackground?: boolean }
      if (typeof body?.runInBackground === 'boolean') {
        runInBackground = body.runInBackground
      }
    } catch {
      // Optional JSON body
    }

    const job = await confirmImportJob({ principal, jobId, runInBackground })
    return NextResponse.json({ job }, { status: 200 })
  } catch (error) {
    const status = error instanceof AuthorizationError ? 403 : 400
    const message = error instanceof Error ? error.message : 'Failed to execute import.'
    return NextResponse.json({ error: message }, { status })
  }
}
