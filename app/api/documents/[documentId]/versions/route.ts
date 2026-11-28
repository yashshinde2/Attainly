import { NextResponse, type NextRequest } from 'next/server'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { AuthorizationError } from '@/lib/server/authorization'
import { AuthenticationRequiredError } from '@/lib/server/action-guard'
import { VercelBlobDocumentStorage } from '@/lib/server/repositories/blob-document-storage'
import {
  listDocumentVersions,
  replaceDocumentWithNewVersion,
} from '@/lib/server/services/document-intelligence'

const storage = new VercelBlobDocumentStorage()

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ documentId: string }> },
) {
  try {
    const principal = await getCurrentPrincipal()
    const { documentId } = await context.params
    const versions = await listDocumentVersions(principal, documentId)
    return NextResponse.json({ versions }, { status: 200 })
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    const message = error instanceof Error ? error.message : 'Failed to load document versions.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ documentId: string }> },
) {
  try {
    const principal = await getCurrentPrincipal()
    const { documentId } = await context.params
    const formData = await request.formData()
    const file = formData.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Choose a replacement document to upload.' }, { status: 400 })
    }

    const result = await replaceDocumentWithNewVersion({
      principal,
      documentId,
      file,
      storage,
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return NextResponse.json({ error: 'Sign in required.' }, { status: 401 })
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    const message = error instanceof Error ? error.message : 'Failed to replace document.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
