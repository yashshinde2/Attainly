import 'dotenv/config'
import { hash } from 'bcryptjs'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client'

if (process.env.NODE_ENV === 'production') {
  throw new Error('The Attainly demo seed is disabled in production.')
}

const connectionString = process.env.DATABASE_URL ?? process.env.POSTGRES_PRISMA_URL
if (!connectionString) throw new Error('DATABASE_URL is required to seed Attainly.')

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) })
const DEMO_PASSWORD = 'AttainlyDemo!2026'

const permissionDefinitions = [
  { key: 'student_profile:read_own', description: 'Read the signed-in student profile.' },
  { key: 'student_profile:edit_own', description: 'Edit the signed-in student profile.' },
  { key: 'student_education:read_own', description: 'Read student education records.' },
  { key: 'student_education:edit_own', description: 'Edit student education records.' },
  { key: 'student_certification:read_own', description: 'Read student certifications.' },
  { key: 'student_certification:edit_own', description: 'Edit student certifications.' },
  { key: 'student_research:read_own', description: 'Read student research papers.' },
  { key: 'student_research:edit_own', description: 'Edit student research papers.' },
  { key: 'student_patent:read_own', description: 'Read student patents.' },
  { key: 'student_patent:edit_own', description: 'Edit student patents.' },
  { key: 'student_project:read_own', description: 'Read student projects.' },
  { key: 'student_project:edit_own', description: 'Edit student projects.' },
  { key: 'student_internship:read_own', description: 'Read student internships.' },
  { key: 'student_internship:edit_own', description: 'Edit student internships.' },
  { key: 'achievement:read_own', description: 'Read the signed-in student achievements.' },
  { key: 'achievement:create_own', description: 'Add achievements to the signed-in student profile.' },
  { key: 'faculty_profile:read_own', description: 'Read the signed-in faculty profile.' },
  { key: 'faculty_profile:edit_own', description: 'Edit the signed-in faculty profile.' },
  { key: 'department:manage', description: 'Manage institution departments.' },
  { key: 'course:manage', description: 'Manage institution courses.' },
  { key: 'user:manage', description: 'Manage institution users.' },
  { key: 'event:create', description: 'Create institution events.' },
  { key: 'event:participate', description: 'Join institution events.' },
  { key: 'event:enter_results', description: 'Enter event participation results.' },
  { key: 'document:upload', description: 'Upload institution documents.' },
  { key: 'document:read_own', description: 'Read documents uploaded by the signed-in user.' },
  { key: 'user:import', description: 'Bulk import institution users.' },
]

const roleDefinitions = [
  {
    key: 'STUDENT',
    name: 'Student',
    permissions: [
      'student_profile:read_own',
      'student_profile:edit_own',
      'student_education:read_own',
      'student_education:edit_own',
      'student_certification:read_own',
      'student_certification:edit_own',
      'student_research:read_own',
      'student_research:edit_own',
      'student_patent:read_own',
      'student_patent:edit_own',
      'student_project:read_own',
      'student_project:edit_own',
      'student_internship:read_own',
      'student_internship:edit_own',
      'achievement:read_own',
      'achievement:create_own',
      'event:participate',
      'document:upload',
      'document:read_own',
    ],
  },
  {
    key: 'FACULTY',
    name: 'Faculty',
    permissions: [
      'faculty_profile:read_own',
      'faculty_profile:edit_own',
      'event:create',
      'event:participate',
      'event:enter_results',
      'document:upload',
      'document:read_own',
    ],
  },
  {
    key: 'INSTITUTION_ADMIN',
    name: 'Institution admin',
    permissions: permissionDefinitions.map(({ key }) => key),
  },
]

async function main() {
  const institution = await prisma.institution.upsert({
    where: { slug: 'attainly-demo' },
    update: { name: 'Attainly Demo Institution' },
    create: { name: 'Attainly Demo Institution', slug: 'attainly-demo' },
  })

  const permissions = new Map<string, string>()
  for (const definition of permissionDefinitions) {
    const permission = await prisma.permission.upsert({
      where: { institutionId_key: { institutionId: institution.id, key: definition.key } },
      update: { description: definition.description },
      create: { institutionId: institution.id, ...definition },
    })
    permissions.set(permission.key, permission.id)
  }

  const roles = new Map<string, string>()
  for (const definition of roleDefinitions) {
    const role = await prisma.role.upsert({
      where: { institutionId_key: { institutionId: institution.id, key: definition.key } },
      update: { name: definition.name },
      create: { institutionId: institution.id, key: definition.key, name: definition.name },
    })
    roles.set(role.key, role.id)

    for (const permissionKey of definition.permissions) {
      const permissionId = permissions.get(permissionKey)
      if (!permissionId) throw new Error(`Missing permission definition: ${permissionKey}`)
      await prisma.rolePermission.upsert({
        where: { institutionId_roleId_permissionId: { institutionId: institution.id, roleId: role.id, permissionId } },
        update: {},
        create: { institutionId: institution.id, roleId: role.id, permissionId },
      })
    }
  }

  const passwordHash = await hash(DEMO_PASSWORD, 12)
  const demos = [
    { roleKey: 'INSTITUTION_ADMIN', email: 'admin@attainly.demo', firstName: 'Alex', lastName: 'Admin' },
    { roleKey: 'FACULTY', email: 'faculty@attainly.demo', firstName: 'Frankie', lastName: 'Faculty' },
    { roleKey: 'STUDENT', email: 'student@attainly.demo', firstName: 'Sam', lastName: 'Student' },
  ]

  for (const demo of demos) {
    const { roleKey, ...userData } = demo
    const roleId = roles.get(roleKey)
    if (!roleId) throw new Error(`Missing role definition: ${roleKey}`)
    const user = await prisma.user.upsert({
      where: { institutionId_email: { institutionId: institution.id, email: demo.email } },
      update: { ...userData, roleId, passwordHash, isActive: true },
      create: { institutionId: institution.id, ...userData, roleId, passwordHash },
    })

    if (roleKey === 'STUDENT') {
      await prisma.studentProfile.upsert({
        where: { institutionId_userId: { institutionId: institution.id, userId: user.id } },
        update: {},
        create: { institutionId: institution.id, userId: user.id },
      })
    }
    if (roleKey === 'FACULTY') {
      await prisma.facultyProfile.upsert({
        where: { institutionId_userId: { institutionId: institution.id, userId: user.id } },
        update: {},
        create: { institutionId: institution.id, userId: user.id },
      })
    }
  }

  console.info('Attainly demo users are ready:')
  for (const demo of demos) console.info(`${demo.roleKey}: ${demo.email}`)
  console.info(`Demo password: ${DEMO_PASSWORD}`)
}

main()
  .catch((error) => {
    console.error('Attainly seed failed.', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
