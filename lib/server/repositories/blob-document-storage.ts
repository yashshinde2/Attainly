import 'server-only'
import { randomUUID } from 'node:crypto'
import { put } from '@vercel/blob'
import type { DocumentStorage } from '../services/uploads'

const EXTENSIONS: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
}

export class VercelBlobDocumentStorage implements DocumentStorage {
  async upload(input: { institutionId: string; ownerId: string; file: File }): Promise<{ fileUrl: string }> {
    const extension = EXTENSIONS[input.file.type]
    if (!extension) throw new Error('Unsupported document type.')

    const blob = await put(
      `institutions/${input.institutionId}/users/${input.ownerId}/${randomUUID()}.${extension}`,
      input.file,
      { access: 'private', contentType: input.file.type },
    )

    return { fileUrl: blob.pathname }
  }
}
