import { config as loadDotenv } from 'dotenv'
import { defineConfig, env } from 'prisma/config'

loadDotenv({ path: '.env.development.local' })

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
})
