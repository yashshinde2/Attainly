import { get } from '@vercel/blob'
import { NextResponse, type NextRequest } from 'next/server'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { VercelBlobDocumentStorage } from '@/lib/server/repositories/blob-document-storage'
import { uploadDocument } from '@/lib/server/services/uploads'
import { AuthorizationError, requirePermission } from '@/lib/server/authorization'
import { AuthenticationRequiredError } from '@/lib/server/action-guard'

const storage = new VercelBlobDocumentStorage()

export async function POST(request: NextRequest) {
  try {
    const principal = await getCurrentPrincipal()
    const formData = await request.formData()
    const file = formData.get('file')
    if (!(file instanceof File)) return NextResponse.json({ error: 'Choose a document to upload.' }, { status: 400 })

    const result = await uploadDocument({ principal, storage, file })
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })
    if (error instanceof AuthorizationError) return NextResponse.json({ error: 'You do not have permission to upload documents.' }, { status: 403 })
    return NextResponse.json({ error: 'Upload failed.' }, { status: 400 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const principal = await getCurrentPrincipal()
    requirePermission(principal, 'document:read_own')
    const pathname = request.nextUrl.searchParams.get('pathname')
    if (!pathname) return NextResponse.json({ error: 'Missing document path.' }, { status: 400 })

    const ownerPrefix = `institutions/${principal.institutionId}/users/${principal.userId}/`
    if (!pathname.startsWith(ownerPrefix)) return NextResponse.json({ error: 'Document not found.' }, { status: 404 })

    const result = await get(pathname, {
      access: 'private',
      ifNoneMatch: request.headers.get('if-none-match') ?? undefined,
    })
    if (!result) return NextResponse.json({ error: 'Document not found.' }, { status: 404 })
    if (result.statusCode === 304) {
      return new NextResponse(null, {
        status: 304,
        headers: { ETag: result.blob.etag, 'Cache-Control': 'private, no-cache' },
      })
    }

    const filename = pathname.split('/').pop()?.replace(/[\r\n"\\]/g, '') ?? 'document'
    return new NextResponse(result.stream, {
      headers: {
        'Content-Type': result.blob.contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        ETag: result.blob.etag,
        'Cache-Control': 'private, no-cache',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })
    if (error instanceof AuthorizationError) return NextResponse.json({ error: 'You do not have permission to read this document.' }, { status: 403 })
    return NextResponse.json({ error: 'Could not retrieve document.' }, { status: 500 })
  }
}
