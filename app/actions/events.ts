'use server'

import { revalidatePath } from 'next/cache'
import { invalidateInstitutionOverviewCache } from '@/lib/server/overview-cache'
import { createActionGuard } from '@/lib/server/action-guard'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { PrismaEventRepository } from '@/lib/server/repositories/event-repository'
import {
  archiveEvent,
  bulkImportEventParticipants,
  cancelEventRegistration,
  confirmAndSyncEventParticipations,
  createEvent,
  enterEventResults,
  registerForEvent,
  registerForEventWithEligibility,
  saveEventCompletionSummary,
  updateEvent,
  updateEventAttendance,
  upsertEventCategory,
  type ParticipationResultItem,
} from '@/lib/server/services/event'

export type EventActionState = { status: 'idle' | 'success' | 'error'; message: string }

const eventRepository = new PrismaEventRepository()
const runAuthorized = createActionGuard(getCurrentPrincipal)

const emptyToNull = (value: FormDataEntryValue | null) => {
  const normalized = typeof value === 'string' ? value.trim() : ''
  return normalized || null
}

function revalidateEventRoutes(institutionId?: string) {
  if (institutionId) invalidateInstitutionOverviewCache(institutionId)
  revalidatePath('/admin')
  revalidatePath('/admin/events')
  revalidatePath('/admin/reports')
  revalidatePath('/faculty')
  revalidatePath('/faculty/events')
  revalidatePath('/faculty/contributions')
  revalidatePath('/student')
  revalidatePath('/student/events')
  revalidatePath('/student/achievements')
}

function parseEventFormData(formData: FormData) {
  const startsAt = formData.get('startsAt')
  const endsAt = formData.get('endsAt')
  const regDeadline = emptyToNull(formData.get('registrationDeadline'))
  const capacityRaw = emptyToNull(formData.get('capacity'))
  const maxTeamRaw = emptyToNull(formData.get('maxTeamSize'))
  const batchesRaw = emptyToNull(formData.get('eligibleBatches'))
  const docsRaw = emptyToNull(formData.get('supportingDocUrls'))
  const eligibilityRoles = formData.getAll('eligibilityRoles').map(String).filter(Boolean)
  const eligibleDepartmentIds = formData.getAll('eligibleDepartmentIds').map(String).filter(Boolean)

  return {
    departmentId: formData.get('departmentId'),
    title: formData.get('title'),
    type: emptyToNull(formData.get('type')) ?? undefined,
    categoryCode: emptyToNull(formData.get('categoryCode')),
    subcategory: emptyToNull(formData.get('subcategory')),
    status: emptyToNull(formData.get('status')) ?? 'PUBLISHED',
    coordinatorUserId: emptyToNull(formData.get('coordinatorUserId')),
    venue: emptyToNull(formData.get('venue')),
    mode: emptyToNull(formData.get('mode')) ?? 'OFFLINE',
    level: emptyToNull(formData.get('level')) ?? 'INSTITUTION',
    startsAt: startsAt ? new Date(String(startsAt)) : undefined,
    endsAt: endsAt ? new Date(String(endsAt)) : undefined,
    registrationDeadline: regDeadline ? new Date(regDeadline) : null,
    capacity: capacityRaw ? Number(capacityRaw) : null,
    allowTeamRegistration: formData.get('allowTeamRegistration') === 'on',
    maxTeamSize: maxTeamRaw ? Number(maxTeamRaw) : null,
    eligibilityRoles: eligibilityRoles.length ? eligibilityRoles : ['STUDENT', 'FACULTY'],
    eligibleDepartmentIds,
    eligibleBatches: batchesRaw
      ? batchesRaw
          .split(',')
          .map((s) => Number(s.trim()))
          .filter((n) => Number.isFinite(n) && n >= 1990)
      : [],
    supportingDocUrls: docsRaw
      ? docsRaw
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean)
      : [],
    certificateTemplateEnabled: formData.get('certificateTemplateEnabled') === 'on',
    description: emptyToNull(formData.get('description')),
  }
}

export async function createEventAction(
  _previous: EventActionState,
  formData: FormData,
): Promise<EventActionState> {
  try {
    const created = await runAuthorized('event:create', (principal) =>
      createEvent({
        principal,
        repository: eventRepository,
        data: parseEventFormData(formData),
      }),
    )

    revalidateEventRoutes(created.institutionId)
    return { status: 'success', message: 'Event created successfully.' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not create event.'
    return { status: 'error', message: message || 'Could not create event. Check your inputs.' }
  }
}

export async function updateEventAction(
  _previous: EventActionState,
  formData: FormData,
): Promise<EventActionState> {
  try {
    const eventId = String(formData.get('eventId') ?? '')
    const updated = await runAuthorized('event:create', (principal) =>
      updateEvent({
        principal,
        repository: eventRepository,
        eventId,
        data: parseEventFormData(formData),
      }),
    )

    revalidateEventRoutes(updated.institutionId)
    return { status: 'success', message: 'Event updated successfully.' }
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Could not update event.' }
  }
}

export async function archiveEventAction(
  _previous: EventActionState,
  formData: FormData,
): Promise<EventActionState> {
  try {
    const eventId = String(formData.get('eventId'))
    await runAuthorized('event:create', async (principal) => {
      await archiveEvent({
        principal,
        repository: eventRepository,
        eventId,
      })
      invalidateInstitutionOverviewCache(principal.institutionId)
    })

    revalidateEventRoutes()
    return { status: 'success', message: 'Event archived successfully.' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not archive event.'
    return { status: 'error', message: message || 'Could not archive event.' }
  }
}

export async function upsertEventCategoryAction(
  _previous: EventActionState,
  formData: FormData,
): Promise<EventActionState> {
  try {
    const subcategoriesRaw = String(formData.get('subcategories') ?? '')
    await runAuthorized('event:create', (principal) =>
      upsertEventCategory(principal, {
        code: formData.get('code'),
        label: formData.get('label'),
        subcategories: subcategoriesRaw
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        isActive: true,
      }),
    )
    revalidateEventRoutes()
    return { status: 'success', message: 'Event category saved.' }
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Could not save category.' }
  }
}

export async function saveEventCompletionAction(
  _previous: EventActionState,
  formData: FormData,
): Promise<EventActionState> {
  try {
    const photosRaw = String(formData.get('completionPhotoUrls') ?? '')
    await runAuthorized('event:create', (principal) =>
      saveEventCompletionSummary(principal, {
        eventId: formData.get('eventId'),
        completionSummary: formData.get('completionSummary'),
        completionReportUrl: emptyToNull(formData.get('completionReportUrl')),
        completionPhotoUrls: photosRaw
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
        feedbackSummary: emptyToNull(formData.get('feedbackSummary')),
        markCompleted: formData.get('markCompleted') !== 'off',
      }),
    )
    revalidateEventRoutes()
    return { status: 'success', message: 'Completion summary saved.' }
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Could not save completion summary.' }
  }
}

export async function bulkImportParticipantsAction(
  _previous: EventActionState,
  formData: FormData,
): Promise<EventActionState> {
  try {
    const eventId = String(formData.get('eventId') ?? '')
    const userIds = formData.getAll('userIds').map(String).filter(Boolean)
    await runAuthorized('event:enter_results', (principal) =>
      bulkImportEventParticipants(principal, {
        eventId,
        userIds,
        role: emptyToNull(formData.get('role')) ?? 'PARTICIPANT',
        registrationStatus: emptyToNull(formData.get('registrationStatus')) ?? 'REGISTERED',
        teamName: emptyToNull(formData.get('teamName')),
      }),
    )
    revalidateEventRoutes()
    return { status: 'success', message: `Imported ${userIds.length} participant(s).` }
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Could not import participants.' }
  }
}

export async function updateAttendanceAction(
  _previous: EventActionState,
  formData: FormData,
): Promise<EventActionState> {
  try {
    const eventId = String(formData.get('eventId') ?? '')
    const entriesJson = String(formData.get('entriesJson') ?? '[]')
    const entries = JSON.parse(entriesJson)
    await runAuthorized('event:enter_results', (principal) =>
      updateEventAttendance(principal, { eventId, entries }),
    )
    revalidateEventRoutes()
    return { status: 'success', message: 'Attendance & confirmation updated.' }
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Could not update attendance.' }
  }
}

export async function syncEventToProfilesAction(
  _previous: EventActionState,
  formData: FormData,
): Promise<EventActionState> {
  try {
    const eventId = String(formData.get('eventId') ?? '')
    const result = await runAuthorized('event:enter_results', (principal) =>
      confirmAndSyncEventParticipations(principal, eventId),
    )
    revalidateEventRoutes()
    return {
      status: 'success',
      message: `Synchronized ${result.syncedStudents} student achievement(s) and ${result.syncedFaculty} faculty contribution(s) (idempotent).`,
    }
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Could not synchronize profiles.' }
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

    revalidateEventRoutes()
    return {
      status: 'success',
      message: `Recorded ${results.length} result(s) and synced confirmed records to student & faculty profiles.`,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not record event results.'
    return { status: 'error', message: message || 'Could not record event results.' }
  }
}

export async function registerForEventAction(
  _previous: EventActionState,
  formData: FormData,
): Promise<EventActionState> {
  try {
    const eventId = String(formData.get('eventId'))
    const teamName = emptyToNull(formData.get('teamName'))
    const teamRole = emptyToNull(formData.get('teamRole'))
    const notes = emptyToNull(formData.get('notes'))

    if (teamName || teamRole || notes) {
      await runAuthorized('event:participate', (principal) =>
        registerForEventWithEligibility(principal, { eventId, teamName, teamRole, notes }),
      )
    } else {
      await runAuthorized('event:participate', (principal) =>
        registerForEventWithEligibility(principal, { eventId }),
      )
    }

    revalidateEventRoutes()
    return { status: 'success', message: 'Registered for event.' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not register for event.'
    return { status: 'error', message: message || 'Could not register for event.' }
  }
}

export async function cancelEventRegistrationAction(
  _previous: EventActionState,
  formData: FormData,
): Promise<EventActionState> {
  try {
    const eventId = String(formData.get('eventId'))
    await runAuthorized('event:participate', (principal) =>
      cancelEventRegistration(principal, eventId),
    )
    revalidateEventRoutes()
    return { status: 'success', message: 'Registration cancelled.' }
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Could not cancel registration.' }
  }
}

// Keep legacy export reference intact
export { registerForEvent }
