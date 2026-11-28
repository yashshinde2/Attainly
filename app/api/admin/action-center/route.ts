import { NextResponse, type NextRequest } from 'next/server'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { AuthorizationError } from '@/lib/server/authorization'
import {
  createCampaignTemplate,
  createReminderRule,
  createReviewerAssignmentRule,
  deleteCampaignTemplate,
  deleteReviewerAssignmentRule,
  launchCampaignFromTemplate,
  runDurableRemindersForInstitution,
} from '@/lib/server/services/admin-action-center'

export async function POST(request: NextRequest) {
  try {
    const principal = await getCurrentPrincipal()
    const body = (await request.json()) as Record<string, unknown>
    const action = String(body.action ?? '')

    switch (action) {
      case 'create_rule': {
        const rule = await createReviewerAssignmentRule(principal, {
          departmentId: body.departmentId ? String(body.departmentId) : null,
          itemType: body.itemType ? String(body.itemType) : 'ALL',
          reviewerUserId: String(body.reviewerUserId ?? ''),
          priority: Number(body.priority ?? 0),
        })
        return NextResponse.json({ rule }, { status: 201 })
      }
      case 'delete_rule': {
        await deleteReviewerAssignmentRule(principal, String(body.ruleId ?? ''))
        return NextResponse.json({ deleted: true }, { status: 200 })
      }
      case 'create_template': {
        const template = await createCampaignTemplate(principal, {
          name: String(body.name ?? ''),
          title: String(body.title ?? ''),
          description: body.description ? String(body.description) : null,
          targetType: body.targetType ? String(body.targetType) : 'DOCUMENT',
          requireEvidence: Boolean(body.requireEvidence),
          defaultDueDays: Number(body.defaultDueDays ?? 7),
        })
        return NextResponse.json({ template }, { status: 201 })
      }
      case 'delete_template': {
        await deleteCampaignTemplate(principal, String(body.templateId ?? ''))
        return NextResponse.json({ deleted: true }, { status: 200 })
      }
      case 'launch_template': {
        const res = await launchCampaignFromTemplate(principal, {
          templateId: String(body.templateId ?? ''),
          targetRole: body.targetRole === 'FACULTY' ? 'FACULTY' : 'STUDENT',
          departmentId: body.departmentId ? String(body.departmentId) : null,
        })
        return NextResponse.json(res, { status: 200 })
      }
      case 'create_reminder_rule': {
        const rule = await createReminderRule(principal, {
          name: String(body.name ?? ''),
          targetScope: body.targetScope ? String(body.targetScope) : 'DATA_REQUESTS',
          daysBeforeDue: Number(body.daysBeforeDue ?? 2),
          sendOverdueDigest: body.sendOverdueDigest !== false,
        })
        return NextResponse.json({ rule }, { status: 201 })
      }
      case 'run_reminders': {
        const res = await runDurableRemindersForInstitution(principal.institutionId)
        return NextResponse.json(res, { status: 200 })
      }
      default:
        return NextResponse.json({ error: `Unsupported action: ${action}` }, { status: 400 })
    }
  } catch (error) {
    const status = error instanceof AuthorizationError ? 403 : 400
    const message = error instanceof Error ? error.message : 'Action Center operation failed.'
    return NextResponse.json({ error: message }, { status })
  }
}
