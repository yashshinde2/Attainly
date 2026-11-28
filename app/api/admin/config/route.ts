import { NextResponse, type NextRequest } from 'next/server'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { AuthorizationError } from '@/lib/server/authorization'
import {
  createCustomFieldDefinition,
  setCustomFieldActive,
  updateInstitutionConfig,
  upsertActivityCategory,
} from '@/lib/server/services/institution-config'

export async function POST(request: NextRequest) {
  try {
    const principal = await getCurrentPrincipal()
    const body = (await request.json()) as Record<string, unknown>
    const action = String(body.action ?? '')

    switch (action) {
      case 'update_config': {
        const config = await updateInstitutionConfig(principal, body.data)
        return NextResponse.json({ config }, { status: 200 })
      }
      case 'upsert_activity_category': {
        const cat = await upsertActivityCategory(principal, {
          code: String(body.code ?? ''),
          name: String(body.name ?? ''),
          subcategories: Array.isArray(body.subcategories) ? body.subcategories.map(String) : [],
          isActive: body.isActive !== false,
        })
        return NextResponse.json({ category: cat }, { status: 200 })
      }
      case 'create_custom_field': {
        const field = await createCustomFieldDefinition(principal, body.data)
        return NextResponse.json({ field }, { status: 201 })
      }
      case 'toggle_custom_field': {
        const field = await setCustomFieldActive(
          principal,
          String(body.fieldId ?? ''),
          Boolean(body.isActive),
        )
        return NextResponse.json({ field }, { status: 200 })
      }
      default:
        return NextResponse.json({ error: `Unsupported action: ${action}` }, { status: 400 })
    }
  } catch (error) {
    const status = error instanceof AuthorizationError ? 403 : 400
    const message = error instanceof Error ? error.message : 'Configuration update failed.'
    return NextResponse.json({ error: message }, { status })
  }
}
