import { createHash } from 'node:crypto'
import { open, stat, unlink, type FileHandle } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createDeflateRaw } from 'node:zlib'
import { Readable } from 'node:stream'

const crcTable = new Uint32Array(256)
for (let i = 0; i < 256; i++) {
  let c = i
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  }
  crcTable[i] = c >>> 0
}

function updateCrc32(crc: number, buf: Uint8Array): number {
  let c = crc ^ 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  }
  return (c ^ 0xffffffff) >>> 0
}

export function sanitizeArchiveSegment(segment: string): string {
  const cleaned = segment
    .replace(/\0/g, '')
    .replace(/\.\.+/g, '_')
    .replace(/[/\\]+/g, '_')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return cleaned || 'item'
}

/**
 * Builds a collision-free, path-traversal-safe archive path.
 */
export function allocateUniqueArchivePath(
  dirSegments: string[],
  filename: string,
  usedPaths: Set<string>,
): string {
  const safeDirs = dirSegments.map(sanitizeArchiveSegment)
  const safeFile = sanitizeArchiveSegment(filename)
  const dotIdx = safeFile.lastIndexOf('.')
  const base = dotIdx > 0 ? safeFile.slice(0, dotIdx) : safeFile
  const ext = dotIdx > 0 ? safeFile.slice(dotIdx) : ''

  let candidate = [...safeDirs, safeFile].join('/')
  let counter = 2
  while (usedPaths.has(candidate.toLowerCase())) {
    candidate = [...safeDirs, `${base}_${counter}${ext}`].join('/')
    counter += 1
  }
  usedPaths.add(candidate.toLowerCase())
  return candidate
}

interface CentralEntry {
  nameBuf: Buffer
  crc: number
  compressedSize: number
  uncompressedSize: number
  localOffset: number
}

export interface StreamEntryResult {
  archivePath: string
  uncompressedSize: number
  compressedSize: number
  sha256: string
}

/**
 * Streaming temp-file ZIP writer (O(1) memory per entry, PKZIP 2.0 compatible).
 * Writes compressed entries directly to a temporary file on disk and patches
 * local headers in-place without buffering the archive in Node memory.
 */
export class StreamingZipWriter {
  readonly filePath: string
  private fh: FileHandle | null = null
  private offset = 0
  private readonly centralEntries: CentralEntry[] = []

  constructor(prefix = 'attainly-export') {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    this.filePath = join(tmpdir(), `${prefix}-${id}.zip`)
  }

  async open(): Promise<void> {
    if (!this.fh) {
      this.fh = await open(this.filePath, 'w+')
    }
  }

  async addBuffer(name: string, data: Uint8Array): Promise<StreamEntryResult> {
    return this.addStream(name, Readable.from([Buffer.from(data)]))
  }

  async addStream(
    name: string,
    source: ReadableStream<Uint8Array> | Readable,
  ): Promise<StreamEntryResult> {
    await this.open()
    const fh = this.fh!
    const cleanName = name.replace(/\\/g, '/').replace(/^\/+/, '')
    const nameBuf = Buffer.from(cleanName, 'utf8')
    const localOffset = this.offset

    const localHeader = Buffer.alloc(30)
    localHeader.writeUInt32LE(0x04034b50, 0)
    localHeader.writeUInt16LE(20, 4)
    localHeader.writeUInt16LE(0x0800, 6) // UTF-8
    localHeader.writeUInt16LE(8, 8) // deflate
    localHeader.writeUInt16LE(nameBuf.length, 26)

    await fh.write(localHeader, 0, localHeader.length, localOffset)
    await fh.write(nameBuf, 0, nameBuf.length, localOffset + localHeader.length)

    let writePos = localOffset + localHeader.length + nameBuf.length
    let crc = 0
    let uncompressedSize = 0
    let compressedSize = 0
    const shaHash = createHash('sha256')

    const nodeReadable =
      source instanceof Readable
        ? source
        : Readable.fromWeb(source as unknown as import('node:stream/web').ReadableStream<Uint8Array>)

    const deflate = createDeflateRaw()

    await new Promise<void>((resolve, reject) => {
      let writeChain = Promise.resolve()

      nodeReadable.on('data', (chunk: Buffer) => {
        const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
        crc = updateCrc32(crc, buf)
        uncompressedSize += buf.length
        shaHash.update(buf)
        if (!deflate.write(buf)) {
          nodeReadable.pause()
          deflate.once('drain', () => nodeReadable.resume())
        }
      })

      nodeReadable.on('end', () => {
        deflate.end()
      })

      nodeReadable.on('error', (err) => {
        deflate.destroy()
        reject(err)
      })

      deflate.on('data', (compChunk: Buffer) => {
        const cBuf = Buffer.isBuffer(compChunk) ? compChunk : Buffer.from(compChunk)
        compressedSize += cBuf.length
        const targetPos = writePos
        writePos += cBuf.length
        writeChain = writeChain.then(() => fh.write(cBuf, 0, cBuf.length, targetPos).then(() => undefined))
      })

      deflate.on('end', () => {
        writeChain.then(() => resolve()).catch(reject)
      })

      deflate.on('error', reject)
    })

    // Patch crc32, compressedSize, uncompressedSize into local header at localOffset + 14
    const patch = Buffer.alloc(12)
    patch.writeUInt32LE(crc >>> 0, 0)
    patch.writeUInt32LE(compressedSize >>> 0, 4)
    patch.writeUInt32LE(uncompressedSize >>> 0, 8)
    await fh.write(patch, 0, 12, localOffset + 14)

    this.offset = writePos
    this.centralEntries.push({
      nameBuf,
      crc: crc >>> 0,
      compressedSize: compressedSize >>> 0,
      uncompressedSize: uncompressedSize >>> 0,
      localOffset,
    })

    return {
      archivePath: cleanName,
      uncompressedSize,
      compressedSize,
      sha256: shaHash.digest('hex'),
    }
  }

  async finalize(): Promise<{ filePath: string; sizeBytes: number; sha256: string }> {
    await this.open()
    const fh = this.fh!
    const centralStart = this.offset
    let pos = centralStart

    for (const entry of this.centralEntries) {
      const centralHeader = Buffer.alloc(46)
      centralHeader.writeUInt32LE(0x02014b50, 0)
      centralHeader.writeUInt16LE(20, 4)
      centralHeader.writeUInt16LE(20, 6)
      centralHeader.writeUInt16LE(0x0800, 8)
      centralHeader.writeUInt16LE(8, 10)
      centralHeader.writeUInt32LE(entry.crc, 16)
      centralHeader.writeUInt32LE(entry.compressedSize, 20)
      centralHeader.writeUInt32LE(entry.uncompressedSize, 24)
      centralHeader.writeUInt16LE(entry.nameBuf.length, 28)
      centralHeader.writeUInt32LE(entry.localOffset, 42)

      await fh.write(centralHeader, 0, centralHeader.length, pos)
      pos += centralHeader.length
      await fh.write(entry.nameBuf, 0, entry.nameBuf.length, pos)
      pos += entry.nameBuf.length
    }

    const centralDirSize = pos - centralStart
    const eocd = Buffer.alloc(22)
    eocd.writeUInt32LE(0x06054b50, 0)
    eocd.writeUInt16LE(this.centralEntries.length, 8)
    eocd.writeUInt16LE(this.centralEntries.length, 10)
    eocd.writeUInt32LE(centralDirSize, 12)
    eocd.writeUInt32LE(centralStart, 16)

    await fh.write(eocd, 0, eocd.length, pos)
    await fh.close()
    this.fh = null

    const info = await stat(this.filePath)
    const hash = createHash('sha256')
    const readFh = await open(this.filePath, 'r')
    try {
      const stream = readFh.createReadStream()
      for await (const chunk of stream) {
        hash.update(chunk)
      }
    } finally {
      await readFh.close()
    }

    return {
      filePath: this.filePath,
      sizeBytes: info.size,
      sha256: hash.digest('hex'),
    }
  }

  async cleanup(): Promise<void> {
    if (this.fh) {
      await this.fh.close().catch(() => {})
      this.fh = null
    }
    await unlink(this.filePath).catch(() => {})
  }
}
