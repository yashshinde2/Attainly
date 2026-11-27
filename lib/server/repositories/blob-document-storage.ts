import 'server-only'
import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { put } from '@vercel/blob'
import type { DocumentStorage } from '../services/uploads'

const EXTENSIONS: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
}

export function resolveLocalBlobPath(pathname: string): string {
  const safeRelative = pathname.replace(/^\/+/, '').replace(/\.\.+/g, '_')
  return join(tmpdir(), 'attainly-blobs', safeRelative)
}

export class VercelBlobDocumentStorage implements DocumentStorage {
  async upload(input: { institutionId: string; ownerId: string; file: File }): Promise<{ fileUrl: string }> {
    const extension = EXTENSIONS[input.file.type]
    if (!extension) throw new Error('Unsupported document type.')

    const key = `institutions/${input.institutionId}/users/${input.ownerId}/${randomUUID()}.${extension}`
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      const dest = resolveLocalBlobPath(key)
      await mkdir(dirname(dest), { recursive: true })
      const buf = Buffer.from(await input.file.arrayBuffer())
      await writeFile(dest, buf)
      return { fileUrl: key }
    }

    const blob = await put(
      key,
      input.file,
      { access: 'private', contentType: input.file.type },
    )

    return { fileUrl: blob.pathname }
  }
}
