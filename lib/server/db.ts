import 'server-only'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@/generated/prisma/client'

const globalForPrisma = globalThis as typeof globalThis & {
  attainlyPool?: Pool
  attainlyPrisma?: PrismaClient
}

function getPrismaClient(): PrismaClient {
  if (globalForPrisma.attainlyPrisma) return globalForPrisma.attainlyPrisma

  const connectionString = process.env.DATABASE_URL ?? process.env.POSTGRES_PRISMA_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL is required to connect to Postgres.')
  }

  const pool =
    globalForPrisma.attainlyPool ??
    new Pool({
      connectionString,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      ...(process.env.DATABASE_SCHEMA ? { options: `-c search_path=${process.env.DATABASE_SCHEMA}` } : {}),
    })

  globalForPrisma.attainlyPool = pool

  const client = new PrismaClient({
    adapter: new PrismaPg(pool, process.env.DATABASE_SCHEMA ? { schema: process.env.DATABASE_SCHEMA } : undefined),
  })

  globalForPrisma.attainlyPrisma = client
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
