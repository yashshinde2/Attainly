import 'dotenv/config'
import { claimNextQueuedExportJob, processExportJob } from '../lib/server/services/export-jobs'

const runOnce = process.argv.includes('--once')
const pollMs = Number(process.env.EXPORT_WORKER_POLL_MS ?? 3000)

async function main() {
  console.log(`[export-worker] Started (mode=${runOnce ? 'once' : 'daemon'}, pollMs=${pollMs})`)
  while (true) {
    const claimed = await claimNextQueuedExportJob()
    if (claimed) {
      console.log(`[export-worker] Processing job ${claimed.id} (institution=${claimed.institutionId})`)
      const res = await processExportJob({ institutionId: claimed.institutionId, id: claimed.id })
      console.log(`[export-worker] Finished job ${claimed.id}: ${res.status}${res.errorMessage ? ` (${res.errorMessage})` : ''}`)
      continue
    }
    if (runOnce) break
    await new Promise((r) => setTimeout(r, pollMs))
  }
}

main().catch((err) => {
  console.error('[export-worker] Fatal error:', err)
  process.exit(1)
})
