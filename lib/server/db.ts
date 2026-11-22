import 'server-only'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@/generated/prisma/client'

const globalForPrisma = globalThis as typeof globalThis & { attainlyPrisma?: PrismaClient }

function getPrismaClient(): PrismaClient {
  if (globalForPrisma.attainlyPrisma) return globalForPrisma.attainlyPrisma

  const connectionString = process.env.DATABASE_URL ?? process.env.POSTGRES_PRISMA_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL is required to connect to Postgres.')
  }

  const client = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  })

  if (process.env.NODE_ENV !== 'production') globalForPrisma.attainlyPrisma = client
  return client
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrismaClient()
    const value = Reflect.get(client, prop)
    if (typeof value === 'function') {
      return value.bind(client)
    }
    return value
  },
})
