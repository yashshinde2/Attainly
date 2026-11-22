import 'server-only'
import { requirePermission, type AuthenticatedPrincipal } from '../authorization'

const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024
const ALLOWED_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png'])

export interface DocumentStorage {
  upload(input: { institutionId: string; ownerId: string; file: File }): Promise<{ fileUrl: string }>
}

export async function uploadDocument(input: {
  principal: AuthenticatedPrincipal
  storage: DocumentStorage
  file: File
}): Promise<{ fileUrl: string }> {
  requirePermission(input.principal, 'document:upload')
  if (input.file.size < 1 || input.file.size > MAX_DOCUMENT_BYTES) {
    throw new Error('Document must be between 1 byte and 10 MB.')
  }
  if (!ALLOWED_TYPES.has(input.file.type)) {
    throw new Error('Only PDF, JPEG, and PNG documents are accepted.')
  }

  const signature = new Uint8Array(await input.file.slice(0, 8).arrayBuffer())
  const validSignature = input.file.type === 'application/pdf'
    ? signature[0] === 0x25 && signature[1] === 0x50 && signature[2] === 0x44 && signature[3] === 0x46
    : input.file.type === 'image/png'
      ? signature[0] === 0x89 && signature[1] === 0x50 && signature[2] === 0x4e && signature[3] === 0x47
      : signature[0] === 0xff && signature[1] === 0xd8 && signature[2] === 0xff
  if (!validSignature) throw new Error('File contents do not match the declared document type.')

  return input.storage.upload({
    institutionId: input.principal.institutionId,
    ownerId: input.principal.userId,
    file: input.file,
  })
}
