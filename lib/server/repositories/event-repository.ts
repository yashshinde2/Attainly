import 'server-only'
import { EventParticipationRole, type Event } from '@/generated/prisma/client'
import { prisma } from '@/lib/server/db'
import type { EventInput, EventRepository, EventResultInput } from '../services/event'

export class PrismaEventRepository implements EventRepository<Event> {
  async create(input: { institutionId: string; actorUserId: string; data: EventInput }): Promise<Event> {
    const { institutionId, actorUserId, data } = input
    void actorUserId
    return prisma.event.create({
      data: { ...data, institutionId },
    })
  }

  async addParticipant(input: { institutionId: string; eventId: string; userId: string }): Promise<unknown> {
    return prisma.eventParticipation.upsert({
      where: { institutionId_eventId_userId: input },
      create: {
        ...input,
        role: EventParticipationRole.PARTICIPANT,
      },
      update: {},
    })
  }

  async enterResults(input: { institutionId: string; eventId: string; results: EventResultInput }): Promise<void> {
    await prisma.$transaction(async (transaction) => {
      await Promise.all(input.results.map((result) => transaction.eventParticipation.upsert({
        where: {
          institutionId_eventId_userId: {
            institutionId: input.institutionId,
            eventId: input.eventId,
            userId: result.userId,
          },
        },
        create: {
          institutionId: input.institutionId,
          eventId: input.eventId,
          userId: result.userId,
          role: result.role,
          position: result.position,
        },
        update: {
          role: result.role,
          position: result.position,
        },
      })))
    })
  }
}
