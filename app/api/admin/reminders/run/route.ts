import { NextResponse, type NextRequest } from 'next/server'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { requirePermission } from '@/lib/server/authorization'
import { prisma } from '@/lib/server/db'
import { runDurableRemindersForInstitution } from '@/lib/server/services/admin-action-center'

function isAuthorizedCron(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  return request.headers.get('authorization') === `Bearer ${cronSecret}`
}

async function handleReminders(request: NextRequest) {
  try {
    if (isAuthorizedCron(request)) {
      const institutions = await prisma.institution.findMany({ select: { id: true } })
      let totalDispatched = 0
      for (const inst of institutions) {
        const res = await runDurableRemindersForInstitution(inst.id)
        totalDispatched += res.remindersDispatched
      }
      return NextResponse.json({ institutions: institutions.length, totalDispatched }, { status: 200 })
    }

    const principal = await getCurrentPrincipal()
    requirePermission(principal, 'report:view')
    const res = await runDurableRemindersForInstitution(principal.institutionId)
    return NextResponse.json(res, { status: 200 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Reminder execution failed.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function GET(request: NextRequest) {
  return handleReminders(request)
}

export async function POST(request: NextRequest) {
  return handleReminders(request)
}
