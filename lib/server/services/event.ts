import 'server-only'
import { z } from 'zod'
import { requirePermission, type AuthenticatedPrincipal } from '../authorization'

const eventTypeEnum = z.enum(['TECHNICAL', 'NON_TECHNICAL', 'SPORTS', 'CULTURAL'])

const eventInput = z.object({
  departmentId: z.string().min(1),
  title: z.string().trim().min(1).max(180),
  description: z.string().trim().max(5000).nullable().optional(),
  type: eventTypeEnum,
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
}).refine((event) => event.endsAt >= event.startsAt, {
  message: 'Event end must be later than or equal to its start.',
  path: ['endsAt'],
})

const participationResultItem = z.object({
  userId: z.string().min(1),
  role: z.enum(['PARTICIPANT', 'WINNER', 'ORGANIZER']),
  position: z.string().trim().max(80).nullable().optional(),
  certificateUrl: z.string().trim().max(2000).nullable().optional(),
})

const resultInput = z.array(participationResultItem).min(1).max(500)

export type EventInput = z.infer<typeof eventInput>
export type EventResultInput = z.infer<typeof resultInput>
export type ParticipationResultItem = z.infer<typeof participationResultItem>

export interface EventRepository<TEvent, TParticipation> {
  create(input: { institutionId: string; actorUserId: string; data: EventInput }): Promise<TEvent>
  update(input: { institutionId: string; eventId: string; data: Partial<EventInput> }): Promise<TEvent>
  archive(input: { institutionId: string; eventId: string }): Promise<void>
  list(input: { institutionId: string; departmentId?: string }): Promise<TEvent[]>
  getById(input: { institutionId: string; eventId: string }): Promise<TEvent | null>
  addParticipant(input: { institutionId: string; eventId: string; userId: string }): Promise<unknown>
  enterResults(input: { institutionId: string; eventId: string; results: EventResultInput }): Promise<void>
  listUserParticipations(input: { institutionId: string; userId: string }): Promise<TParticipation[]>
}

export async function createEvent<TEvent, TParticipation>(input: {
  principal: AuthenticatedPrincipal
  repository: EventRepository<TEvent, TParticipation>
  data: unknown
}): Promise<TEvent> {
  requirePermission(input.principal, 'event:create')
  const data = eventInput.parse(input.data)
  return input.repository.create({
    institutionId: input.principal.institutionId,
    actorUserId: input.principal.userId,
    data,
  })
}

export async function updateEvent<TEvent, TParticipation>(input: {
  principal: AuthenticatedPrincipal
  repository: EventRepository<TEvent, TParticipation>
  eventId: string
  data: unknown
}): Promise<TEvent> {
  requirePermission(input.principal, 'event:create')
  const eventId = z.string().min(1).parse(input.eventId)
  const data = eventInput.partial().parse(input.data)
  return input.repository.update({
    institutionId: input.principal.institutionId,
    eventId,
    data,
  })
}

export async function archiveEvent<TEvent, TParticipation>(input: {
  principal: AuthenticatedPrincipal
  repository: EventRepository<TEvent, TParticipation>
  eventId: string
}): Promise<void> {
  requirePermission(input.principal, 'event:create')
  const eventId = z.string().min(1).parse(input.eventId)
  return input.repository.archive({
    institutionId: input.principal.institutionId,
    eventId,
  })
}

export async function listInstitutionEvents<TEvent, TParticipation>(input: {
  principal: AuthenticatedPrincipal
  repository: EventRepository<TEvent, TParticipation>
  departmentId?: string
}): Promise<TEvent[]> {
  return input.repository.list({
    institutionId: input.principal.institutionId,
    departmentId: input.departmentId,
  })
}

export async function getInstitutionEvent<TEvent, TParticipation>(input: {
  principal: AuthenticatedPrincipal
  repository: EventRepository<TEvent, TParticipation>
  eventId: string
}): Promise<TEvent | null> {
  const eventId = z.string().min(1).parse(input.eventId)
  return input.repository.getById({
    institutionId: input.principal.institutionId,
    eventId,
  })
}

export async function registerForEvent<TEvent, TParticipation>(input: {
  principal: AuthenticatedPrincipal
  repository: EventRepository<TEvent, TParticipation>
  eventId: string
}): Promise<unknown> {
  requirePermission(input.principal, 'event:participate')
  const eventId = z.string().min(1).parse(input.eventId)
  return input.repository.addParticipant({
    institutionId: input.principal.institutionId,
    eventId,
    userId: input.principal.userId,
  })
}

export async function enterEventResults<TEvent, TParticipation>(input: {
  principal: AuthenticatedPrincipal
  repository: EventRepository<TEvent, TParticipation>
  eventId: string
  results: unknown
}): Promise<void> {
  requirePermission(input.principal, 'event:enter_results')
  const eventId = z.string().min(1).parse(input.eventId)
  const results = resultInput.parse(input.results)
  if (new Set(results.map((result) => result.userId)).size !== results.length) {
    throw new Error('Each participant may only appear once per event result entry.')
  }
  await input.repository.enterResults({
    institutionId: input.principal.institutionId,
    eventId,
    results,
  })
}

export async function listOwnEventParticipations<TEvent, TParticipation>(input: {
  principal: AuthenticatedPrincipal
  repository: EventRepository<TEvent, TParticipation>
}): Promise<TParticipation[]> {
  return input.repository.listUserParticipations({
    institutionId: input.principal.institutionId,
    userId: input.principal.userId,
  })
}
