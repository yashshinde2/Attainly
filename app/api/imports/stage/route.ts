import { NextResponse, type NextRequest } from 'next/server'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { AuthorizationError } from '@/lib/server/authorization'
import { stageImportJob, type ConflictMode } from '@/lib/server/services/import-center'

export async function POST(request: NextRequest) {
  try {
    const principal = await getCurrentPrincipal()
    const formData = await request.formData()
    const file = formData.get('file')
    const importType = String(formData.get('importType') ?? '')
    const conflictModeRaw = String(formData.get('conflictMode') ?? 'SKIP_EXISTING')
    const trustedProvenance = formData.get('trustedProvenance') === 'true'
    const columnMappingRaw = formData.get('columnMapping')

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Please select a CSV or XLSX file to upload.' }, { status: 400 })
    }

    const conflictMode: ConflictMode =
      conflictModeRaw === 'CREATE_ONLY' || conflictModeRaw === 'UPDATE_EXISTING'
        ? conflictModeRaw
        : 'SKIP_EXISTING'

    let columnMapping: Record<string, string> | undefined
    if (typeof columnMappingRaw === 'string' && columnMappingRaw.trim()) {
      columnMapping = JSON.parse(columnMappingRaw) as Record<string, string>
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const preview = await stageImportJob({
      principal,
      importType,
      fileName: file.name,
      fileBuffer: buffer,
      conflictMode,
      trustedProvenance,
      columnMapping,
    })

    return NextResponse.json(preview, { status: 200 })
  } catch (error) {
    const status = error instanceof AuthorizationError ? 403 : 400
    const message = error instanceof Error ? error.message : 'Failed to stage import.'
    return NextResponse.json({ error: message }, { status })
  }
}
