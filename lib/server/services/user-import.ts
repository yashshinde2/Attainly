import 'server-only'
import { z } from 'zod'
import { requirePermission, type AuthenticatedPrincipal } from '../authorization'

export const userRowSchema = z.object({
  email: z.string().trim().email().max(254),
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  roleKey: z.string().trim().min(1).max(80),
})

export interface CreatedImportUser {
  email: string
  name: string
  roleKey: string
  temporaryPassword: string
}

export interface UserImportResult {
  count: number
  createdUsers: CreatedImportUser[]
  skippedCount: number
}

const MAX_CSV_BYTES = 2 * 1024 * 1024
const MAX_IMPORT_ROWS = 1000

function parseCsv(csv: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index]
    if (quoted) {
      if (char === '"' && csv[index + 1] === '"') {
        cell += '"'
        index += 1
      } else if (char === '"') {
        quoted = false
      } else {
        cell += char
      }
    } else if (char === '"' && cell.length === 0) {
      quoted = true
    } else if (char === ',') {
      row.push(cell)
      cell = ''
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && csv[index + 1] === '\n') index += 1
      row.push(cell)
      if (row.some((value) => value.trim().length > 0)) rows.push(row)
      row = []
      cell = ''
    } else {
      cell += char
    }
  }

  if (quoted) throw new Error('CSV contains an unterminated quoted field.')
  row.push(cell)
  if (row.some((value) => value.trim().length > 0)) rows.push(row)
  return rows
}

export interface UserImportRepository<TResult> {
  importUsers(input: {
    institutionId: string
    importedByUserId: string
    users: Array<z.infer<typeof userRowSchema>>
  }): Promise<TResult>
}

export async function importUsersFromCsv<TResult = UserImportResult>(input: {
  principal: AuthenticatedPrincipal
  repository: UserImportRepository<TResult>
  csv: string
}): Promise<TResult> {
  requirePermission(input.principal, 'user:import')
  if (new TextEncoder().encode(input.csv).byteLength > MAX_CSV_BYTES) {
    throw new Error('CSV files must be 2 MB or smaller.')
  }

  const [header, ...records] = parseCsv(input.csv)
  if (!header) throw new Error('CSV must include a header row.')
  const normalizedHeader = header.map((value) => value.trim().toLowerCase())
  const requiredColumns = ['email', 'firstname', 'lastname', 'rolekey']
  if (requiredColumns.some((column) => !normalizedHeader.includes(column))) {
    throw new Error('CSV must include email, firstName, lastName, and roleKey columns.')
  }
  if (records.length === 0 || records.length > MAX_IMPORT_ROWS) {
    throw new Error(`Import must contain between 1 and ${MAX_IMPORT_ROWS} users.`)
  }

  const columnIndex = Object.fromEntries(normalizedHeader.map((key, index) => [key, index]))
  const users = records.map((record, index) => {
    const value = (key: string) => record[columnIndex[key]] ?? ''
    const parsed = userRowSchema.safeParse({
      email: value('email'),
      firstName: value('firstname'),
      lastName: value('lastname'),
      roleKey: value('rolekey'),
    })
    if (!parsed.success) throw new Error(`Invalid user data on CSV row ${index + 2}.`)
    return parsed.data
  })

  return input.repository.importUsers({
    institutionId: input.principal.institutionId,
    importedByUserId: input.principal.userId,
    users,
  })
}
