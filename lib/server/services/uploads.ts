import 'server-only'
import { createHash } from 'node:crypto'
import { requirePermission, type AuthenticatedPrincipal } from '../authorization'

const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024
const ALLOWED_TYPES: Record<string, string[]> = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
}

export interface DocumentStorage {
  upload(input: { institutionId: string; ownerId: string; file: File }): Promise<{ fileUrl: string }>
}

export async function uploadDocument(input: {
  principal: AuthenticatedPrincipal
  storage: DocumentStorage
  file: File
}): Promise<{
  fileUrl: string
  originalFilename: string
  mimeType: string
  sizeBytes: number
  sha256: string
}> {
  requirePermission(input.principal, 'document:upload')
  if (input.file.size < 1 || input.file.size > MAX_DOCUMENT_BYTES) {
    throw new Error('Document must be between 1 byte and 10 MB.')
  }
  const allowedExts = ALLOWED_TYPES[input.file.type]
  if (!allowedExts) {
    throw new Error('Only PDF, JPEG, and PNG documents are accepted.')
  }

  const lowerName = input.file.name.toLowerCase()
  if (!allowedExts.some((ext) => lowerName.endsWith(ext))) {
    throw new Error('File extension does not match the declared document type.')
  }

  const buffer = Buffer.from(await input.file.arrayBuffer())
  const signature = new Uint8Array(buffer.subarray(0, 8))
  const validSignature = input.file.type === 'application/pdf'
    ? signature[0] === 0x25 && signature[1] === 0x50 && signature[2] === 0x44 && signature[3] === 0x46
    : input.file.type === 'image/png'
      ? signature[0] === 0x89 && signature[1] === 0x50 && signature[2] === 0x4e && signature[3] === 0x47
      : signature[0] === 0xff && signature[1] === 0xd8 && signature[2] === 0xff
  if (!validSignature) throw new Error('File contents do not match the declared document type.')

  const sha256 = createHash('sha256').update(buffer).digest('hex')

  const uploaded = await input.storage.upload({
    institutionId: input.principal.institutionId,
    ownerId: input.principal.userId,
    file: input.file,
  })

  return {
    fileUrl: uploaded.fileUrl,
    originalFilename: input.file.name,
    mimeType: input.file.type,
    sizeBytes: input.file.size,
    sha256,
  }
}
