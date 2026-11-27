import { NextResponse } from 'next/server'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { generateInspectionZipPackage } from '@/lib/server/services/inspection'

export async function GET(
  _request: Request,
  context: { params: Promise<{ collectionId: string }> },
) {
  try {
    const principal = await getCurrentPrincipal()
    const { collectionId } = await context.params
    const { filename, buffer } = await generateInspectionZipPackage(principal, collectionId)

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate inspection package.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
