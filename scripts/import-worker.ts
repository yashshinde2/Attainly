import 'dotenv/config'
import { claimNextQueuedImportJob, processImportJob } from '../lib/server/services/import-center'

const runOnce = process.argv.includes('--once')
const pollMs = Number(process.env.IMPORT_WORKER_POLL_MS ?? 3000)

async function main() {
  console.log(`[import-worker] Started (mode=${runOnce ? 'once' : 'daemon'}, pollMs=${pollMs})`)
  while (true) {
    const claimed = await claimNextQueuedImportJob()
    if (claimed) {
      console.log(`[import-worker] Processing job ${claimed.id} (type=${claimed.importType}, institution=${claimed.institutionId})`)
      const res = await processImportJob({ institutionId: claimed.institutionId, id: claimed.id })
      console.log(
        `[import-worker] Finished job ${claimed.id}: ${res.status} (created=${res.createdCount}, updated=${res.updatedCount}, skipped=${res.skippedCount}, failed=${res.failedCount})`,
      )
      continue
    }
    if (runOnce) break
    await new Promise((r) => setTimeout(r, pollMs))
  }
}

main().catch((err) => {
  console.error('[import-worker] Fatal error:', err)
  process.exit(1)
})
