import { get } from '@vercel/blob'
import { NextResponse, type NextRequest } from 'next/server'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { VercelBlobDocumentStorage } from '@/lib/server/repositories/blob-document-storage'
import { canAccessDocument, PrismaDocumentRepository } from '@/lib/server/repositories/document-repository'
import { uploadDocument } from '@/lib/server/services/uploads'
import { AuthorizationError } from '@/lib/server/authorization'
import { AuthenticationRequiredError } from '@/lib/server/action-guard'

const storage = new VercelBlobDocumentStorage()
const documentRepository = new PrismaDocumentRepository()

const SAFE_INLINE_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png'])

function extractLegacyOwnerUserId(pathname: string, institutionId: string): string | null {
  const prefix = `institutions/${institutionId}/users/`
  if (!pathname.startsWith(prefix)) return null
  const rest = pathname.slice(prefix.length)
  const slashIdx = rest.indexOf('/')
  if (slashIdx <= 0) return null
  return rest.slice(0, slashIdx)
}

export async function POST(request: NextRequest) {
  try {
    const principal = await getCurrentPrincipal()
    const formData = await request.formData()
    const file = formData.get('file')
    if (!(file instanceof File)) return NextResponse.json({ error: 'Choose a document to upload.' }, { status: 400 })

    const uploaded = await uploadDocument({ principal, storage, file })
    const doc = await documentRepository.createDocument({
      institutionId: principal.institutionId,
      ownerUserId: principal.userId,
      pathname: uploaded.fileUrl,
      originalFilename: uploaded.originalFilename,
      mimeType: uploaded.mimeType,
      sizeBytes: uploaded.sizeBytes,
      sha256: uploaded.sha256,
    })

    return NextResponse.json(
      {
        fileUrl: uploaded.fileUrl,
        documentId: doc.id,
        originalFilename: doc.originalFilename,
        mimeType: doc.mimeType,
        sizeBytes: doc.sizeBytes,
      },
      { status: 201 },
    )
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })
    if (error instanceof AuthorizationError) return NextResponse.json({ error: 'You do not have permission to upload documents.' }, { status: 403 })
    const message = error instanceof Error ? error.message : 'Upload failed.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const principal = await getCurrentPrincipal()
    const idParam = request.nextUrl.searchParams.get('id')
    let pathname = request.nextUrl.searchParams.get('pathname')

    let docRecord = pathname
      ? await documentRepository.findByPathname({
          institutionId: principal.institutionId,
          pathname,
        })
      : null

    if (!pathname && idParam) {
      const { prisma } = await import('@/lib/server/db')
      docRecord = await prisma.document.findUnique({
        where: { institutionId_id: { institutionId: principal.institutionId, id: idParam } },
      })
      pathname = docRecord?.pathname ?? null
    }

    if (!pathname) return NextResponse.json({ error: 'Missing document path.' }, { status: 400 })

    const docInstitutionId = docRecord?.institutionId ?? principal.institutionId
    const docOwnerUserId = docRecord?.ownerUserId ?? extractLegacyOwnerUserId(pathname, principal.institutionId)

    if (!docOwnerUserId) {
      return NextResponse.json({ error: 'Document not found.' }, { status: 404 })
    }

    if (!canAccessDocument({ principal, docInstitutionId, docOwnerUserId })) {
      return NextResponse.json({ error: 'You do not have permission to access this document.' }, { status: 403 })
    }

    const result = await get(pathname, {
      access: 'private',
      ifNoneMatch: request.headers.get('if-none-match') ?? undefined,
    })
    if (!result) return NextResponse.json({ error: 'Document not found.' }, { status: 404 })
    if (result.statusCode === 304) {
      return new NextResponse(null, {
        status: 304,
        headers: { ETag: result.blob.etag, 'Cache-Control': 'private, no-store' },
      })
    }

    const requestedInline = request.nextUrl.searchParams.get('disposition') === 'inline'
    const disposition = requestedInline && SAFE_INLINE_TYPES.has(result.blob.contentType)
      ? 'inline'
      : 'attachment'

    const filename = (docRecord?.originalFilename ?? pathname.split('/').pop() ?? 'document').replace(/[\r\n"\\]/g, '')
    return new NextResponse(result.stream, {
      headers: {
        'Content-Type': result.blob.contentType,
        'Content-Disposition': `${disposition}; filename="${filename}"`,
        ETag: result.blob.etag,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })
    if (error instanceof AuthorizationError) return NextResponse.json({ error: 'You do not have permission to read this document.' }, { status: 403 })
    return NextResponse.json({ error: 'Could not retrieve document.' }, { status: 500 })
  }
}
