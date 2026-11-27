import 'server-only'
import { EventParticipationRole, type Event, type EventParticipation } from '@/generated/prisma/client'
import { prisma } from '@/lib/server/db'
import type { EventInput, EventRepository, EventResultInput } from '../services/event'

export type EventWithDetails = Event & {
  department: { id: string; name: string; code: string }
  participation?: Array<
    EventParticipation & {
      user: { id: string; firstName: string; lastName: string; email: string }
    }
  >
  _count?: { participation: number }
}

export type EventParticipationWithEvent = EventParticipation & {
  event: Event & {
    department: { id: string; name: string; code: string }
  }
}

export class PrismaEventRepository implements EventRepository<EventWithDetails, EventParticipationWithEvent> {
  async create(input: { institutionId: string; actorUserId: string; data: EventInput }): Promise<EventWithDetails> {
    const { institutionId, data } = input
    return prisma.event.create({
      data: {
        ...data,
        institutionId,
        coordinatorUserId: data.coordinatorUserId ?? input.actorUserId,
      },
      include: {
        department: { select: { id: true, name: true, code: true } },
        _count: { select: { participation: true } },
      },
    })
  }

  async update(input: {
    institutionId: string
    eventId: string
    data: Partial<EventInput>
  }): Promise<EventWithDetails> {
    return prisma.event.update({
      where: {
        institutionId_id: {
          institutionId: input.institutionId,
          id: input.eventId,
        },
      },
      data: input.data,
      include: {
        department: { select: { id: true, name: true, code: true } },
        _count: { select: { participation: true } },
      },
    })
  }

  async archive(input: { institutionId: string; eventId: string }): Promise<void> {
    await prisma.event.delete({
      where: {
        institutionId_id: {
          institutionId: input.institutionId,
          id: input.eventId,
        },
      },
    })
  }

  async list(input: { institutionId: string; departmentId?: string }): Promise<EventWithDetails[]> {
    return prisma.event.findMany({
      where: {
        institutionId: input.institutionId,
        ...(input.departmentId ? { departmentId: input.departmentId } : {}),
      },
      include: {
        department: { select: { id: true, name: true, code: true } },
        participation: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
        _count: { select: { participation: true } },
      },
      orderBy: { startsAt: 'desc' },
    })
  }

  async getById(input: { institutionId: string; eventId: string }): Promise<EventWithDetails | null> {
    return prisma.event.findUnique({
      where: {
        institutionId_id: {
          institutionId: input.institutionId,
          id: input.eventId,
        },
      },
      include: {
        department: { select: { id: true, name: true, code: true } },
        participation: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
        _count: { select: { participation: true } },
      },
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
      await Promise.all(
        input.results.map((result) =>
          transaction.eventParticipation.upsert({
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
              certificateUrl: result.certificateUrl,
            },
            update: {
              role: result.role,
              position: result.position,
              certificateUrl: result.certificateUrl,
            },
          }),
        ),
      )
    })
  }

  async listUserParticipations(input: {
    institutionId: string
    userId: string
  }): Promise<EventParticipationWithEvent[]> {
    return prisma.eventParticipation.findMany({
      where: {
        institutionId: input.institutionId,
        userId: input.userId,
      },
      include: {
        event: {
          include: {
            department: { select: { id: true, name: true, code: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  }
}
