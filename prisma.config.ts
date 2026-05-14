import { config } from 'dotenv'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'prisma/config'

const __dirname = dirname(fileURLToPath(import.meta.url))
// Загружаем .env из текущей директории
config({ path: resolve(__dirname, '.env') })

const datasourceUrl =
  process.env.DATABASE_URL ??
  'postgresql://admin:adminpassword@localhost:5432/cognitika?schema=public'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: datasourceUrl,
  },
})
