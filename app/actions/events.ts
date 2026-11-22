'use server'

import { revalidatePath } from 'next/cache'
import { createActionGuard } from '@/lib/server/action-guard'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { PrismaEventRepository } from '@/lib/server/repositories/event-repository'
import {
  createEvent,
  archiveEvent,
  enterEventResults,
  registerForEvent,
  type ParticipationResultItem,
} from '@/lib/server/services/event'

export type EventActionState = { status: 'idle' | 'success' | 'error'; message: string }

const eventRepository = new PrismaEventRepository()
const runAuthorized = createActionGuard(getCurrentPrincipal)

const emptyToNull = (value: FormDataEntryValue | null) => {
  const normalized = typeof value === 'string' ? value.trim() : ''
  return normalized || null
}

export async function createEventAction(
  _previous: EventActionState,
  formData: FormData,
): Promise<EventActionState> {
  try {
    const startsAt = formData.get('startsAt')
    const endsAt = formData.get('endsAt')

    await runAuthorized('event:create', (principal) =>
      createEvent({
        principal,
        repository: eventRepository,
        data: {
          departmentId: formData.get('departmentId'),
          title: formData.get('title'),
          type: formData.get('type'),
          startsAt: startsAt ? new Date(String(startsAt)) : undefined,
          endsAt: endsAt ? new Date(String(endsAt)) : undefined,
          description: emptyToNull(formData.get('description')),
        },
      }),
    )

    revalidatePath('/admin')
    revalidatePath('/admin/events')
    revalidatePath('/faculty')
    revalidatePath('/student')
    return { status: 'success', message: 'Event created successfully.' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not create event.'
    return { status: 'error', message: message || 'Could not create event. Check your inputs.' }
  }
}

export async function archiveEventAction(
  _previous: EventActionState,
  formData: FormData,
): Promise<EventActionState> {
  try {
    const eventId = String(formData.get('eventId'))
    await runAuthorized('event:create', (principal) =>
      archiveEvent({
        principal,
        repository: eventRepository,
        eventId,
      }),
    )

    revalidatePath('/admin')
    revalidatePath('/admin/events')
    revalidatePath('/faculty')
    revalidatePath('/student')
    return { status: 'success', message: 'Event archived successfully.' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not archive event.'
    return { status: 'error', message: message || 'Could not archive event.' }
  }
}

export async function bulkEnterEventResultsAction(
  _previous: EventActionState,
  formData: FormData,
): Promise<EventActionState> {
  try {
    const eventId = String(formData.get('eventId'))
    const rawResultsJson = formData.get('resultsJson')

    let results: ParticipationResultItem[] = []

    if (rawResultsJson && typeof rawResultsJson === 'string') {
      results = JSON.parse(rawResultsJson)
    } else {
      const userIds = formData.getAll('userId')
      const roles = formData.getAll('role')
      const positions = formData.getAll('position')
      const certificateUrls = formData.getAll('certificateUrl')

      results = userIds.map((userId, idx) => ({
        userId: String(userId),
        role: String(roles[idx]) as 'PARTICIPANT' | 'WINNER' | 'ORGANIZER',
        position: positions[idx] ? String(positions[idx]).trim() : null,
        certificateUrl: certificateUrls[idx] ? String(certificateUrls[idx]).trim() : null,
      }))
    }

    if (!results.length) {
      return { status: 'error', message: 'At least one participant result is required.' }
    }

    await runAuthorized('event:enter_results', (principal) =>
      enterEventResults({
        principal,
        repository: eventRepository,
        eventId,
        results,
      }),
    )

    revalidatePath('/admin')
    revalidatePath('/admin/events')
    revalidatePath('/faculty')
    revalidatePath('/student')
    return { status: 'success', message: `Recorded results for ${results.length} participant(s).` }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not record event results.'
    return { status: 'error', message: message || 'Failed to record event results.' }
  }
}

export async function registerForEventAction(
  _previous: EventActionState,
  formData: FormData,
): Promise<EventActionState> {
  try {
    const eventId = String(formData.get('eventId'))
    await runAuthorized('event:participate', (principal) =>
      registerForEvent({
        principal,
        repository: eventRepository,
        eventId,
      }),
    )

    revalidatePath('/student')
    revalidatePath('/faculty')
    revalidatePath('/admin/events')
    return { status: 'success', message: 'Registered for event successfully.' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not register for event.'
    return { status: 'error', message: message || 'Failed to register for event.' }
  }
}
