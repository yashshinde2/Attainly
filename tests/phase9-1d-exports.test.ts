import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { Readable } from 'node:stream'
import { inflateRawSync } from 'node:zlib'
import {
  allocateUniqueArchivePath,
  sanitizeArchiveSegment,
  StreamingZipWriter,
} from '../lib/server/streaming-zip'

test('AUD-10: sanitizeArchiveSegment & allocateUniqueArchivePath prevent path traversal and collisions', () => {
  assert.equal(sanitizeArchiveSegment('../../../etc/passwd'), 'etc_passwd')
  assert.equal(sanitizeArchiveSegment('..\\secret\0file.pdf'), 'secretfile.pdf')

  const used = new Set<string>()
  const p1 = allocateUniqueArchivePath(['evidence', 'CSE', 'ACHIEVEMENT'], 'certificate.pdf', used)
  const p2 = allocateUniqueArchivePath(['evidence', 'CSE', 'ACHIEVEMENT'], 'certificate.pdf', used)
  const p3 = allocateUniqueArchivePath(['evidence', 'CSE', 'ACHIEVEMENT'], 'CERTIFICATE.PDF', used)

  assert.equal(p1, 'evidence/CSE/ACHIEVEMENT/certificate.pdf')
  assert.equal(p2, 'evidence/CSE/ACHIEVEMENT/certificate_2.pdf')
  assert.equal(p3, 'evidence/CSE/ACHIEVEMENT/CERTIFICATE_3.PDF')
})

test('AUD-10: StreamingZipWriter writes valid PKZIP archive with exact SHA-256 & bounded memory on 10 MB stream', async () => {
  const writer = new StreamingZipWriter('test-stream')
  try {
    const manifestText = JSON.stringify({ collectionId: 'col-1', includedFiles: 2 })
    await writer.addBuffer('manifest.json', Buffer.from(manifestText, 'utf8'))

    // Stream 10 MB of deterministic binary data in 64 KB chunks
    const chunkSize = 64 * 1024
    const totalChunks = 160 // 10 MB
    const expectedHash = createHash('sha256')
    let sent = 0
    const largeStream = new Readable({
      read() {
        if (sent >= totalChunks) {
          this.push(null)
          return
        }
        const buf = Buffer.alloc(chunkSize, (sent % 251) + 1)
        expectedHash.update(buf)
        sent += 1
        this.push(buf)
      },
    })

    const heapBefore = process.memoryUsage().heapUsed
    const res = await writer.addStream('evidence/CSE/large_evidence.bin', largeStream)
    const finalized = await writer.finalize()
    const heapAfter = process.memoryUsage().heapUsed

    assert.equal(res.uncompressedSize, chunkSize * totalChunks)
    assert.equal(res.sha256, expectedHash.digest('hex'))
    assert.ok(finalized.sizeBytes > 0)
    // Streaming should not retain the 10 MB payload in heap
    assert.ok(heapAfter - heapBefore < 25 * 1024 * 1024, `Heap grew too much: ${heapAfter - heapBefore}`)

    // Verify ZIP binary structure & decompress first entry (manifest.json)
    const zipBuf = await readFile(finalized.filePath)
    assert.equal(zipBuf.readUInt32LE(0), 0x04034b50) // Local file header signature
    const nameLen = zipBuf.readUInt16LE(26)
    const compSize = zipBuf.readUInt32LE(18)
    const entryName = zipBuf.subarray(30, 30 + nameLen).toString('utf8')
    assert.equal(entryName, 'manifest.json')
    const inflated = inflateRawSync(zipBuf.subarray(30 + nameLen, 30 + nameLen + compSize)).toString('utf8')
    assert.equal(inflated, manifestText)
  } finally {
    await writer.cleanup()
  }
})
