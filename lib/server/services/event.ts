import 'server-only'
import { z } from 'zod'
import { requirePermission, type AuthenticatedPrincipal } from '../authorization'

const eventInput = z.object({
  departmentId: z.string().min(1),
  title: z.string().trim().min(1).max(180),
  description: z.string().trim().max(5000).nullable().optional(),
  type: z.string().trim().min(1).max(80),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
}).refine((event) => event.endsAt > event.startsAt, {
  message: 'Event end must be later than its start.',
  path: ['endsAt'],
})

const resultInput = z.array(z.object({
  userId: z.string().min(1),
  role: z.enum(['PARTICIPANT', 'WINNER', 'ORGANIZER']),
  position: z.string().trim().max(80).nullable().optional(),
})).min(1).max(500)

export type EventInput = z.infer<typeof eventInput>
export type EventResultInput = z.infer<typeof resultInput>

export interface EventRepository<TEvent> {
  create(input: { institutionId: string; actorUserId: string; data: EventInput }): Promise<TEvent>
  addParticipant(input: { institutionId: string; eventId: string; userId: string }): Promise<unknown>
  enterResults(input: { institutionId: string; eventId: string; results: EventResultInput }): Promise<void>
}

export async function createEvent<TEvent>(input: {
  principal: AuthenticatedPrincipal
  repository: EventRepository<TEvent>
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

export async function registerForEvent<TEvent>(input: {
  principal: AuthenticatedPrincipal
  repository: EventRepository<TEvent>
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

export async function enterEventResults<TEvent>(input: {
  principal: AuthenticatedPrincipal
  repository: EventRepository<TEvent>
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
