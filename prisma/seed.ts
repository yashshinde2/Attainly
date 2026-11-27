import { config as loadDotenv } from 'dotenv'
loadDotenv({ path: '.env.local' })
loadDotenv({ path: '.env.development.local' })
loadDotenv({ path: '.env' })
import { hash } from 'bcryptjs'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client'

if (process.env.NODE_ENV === 'production') {
  throw new Error('The Attainly demo seed is disabled in production.')
}

const connectionString = process.env.DATABASE_URL ?? process.env.POSTGRES_PRISMA_URL
if (!connectionString) throw new Error('DATABASE_URL is required to seed Attainly.')

const pool = new Pool({
  connectionString,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
})

const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })
const DEMO_PASSWORD = 'AttainlyDemo!2026'

const permissionDefinitions = [
  { key: 'student_profile:read_own', description: 'Read the signed-in student profile.' },
  { key: 'student_profile:edit_own', description: 'Edit the signed-in student profile.' },
  { key: 'student_education:read_own', description: 'Read student education records.' },
  { key: 'student_education:edit_own', description: 'Edit student education records.' },
  { key: 'student_education:delete_own', description: 'Delete student education records.' },
  { key: 'student_certification:read_own', description: 'Read student certifications.' },
  { key: 'student_certification:edit_own', description: 'Edit student certifications.' },
  { key: 'student_certification:delete_own', description: 'Delete student certifications.' },
  { key: 'student_research:read_own', description: 'Read student research papers.' },
  { key: 'student_research:edit_own', description: 'Edit student research papers.' },
  { key: 'student_research:delete_own', description: 'Delete student research papers.' },
  { key: 'student_patent:read_own', description: 'Read student patents.' },
  { key: 'student_patent:edit_own', description: 'Edit student patents.' },
  { key: 'student_patent:delete_own', description: 'Delete student patents.' },
  { key: 'student_project:read_own', description: 'Read student projects.' },
  { key: 'student_project:edit_own', description: 'Edit student projects.' },
  { key: 'student_project:delete_own', description: 'Delete student projects.' },
  { key: 'student_internship:read_own', description: 'Read student internships.' },
  { key: 'student_internship:edit_own', description: 'Edit student internships.' },
  { key: 'student_internship:delete_own', description: 'Delete student internships.' },
  { key: 'student_skill:read_own', description: 'Read student skills.' },
  { key: 'student_skill:create_own', description: 'Add student skills.' },
  { key: 'student_skill:edit_own', description: 'Edit student skills.' },
  { key: 'student_skill:delete_own', description: 'Delete student skills.' },
  { key: 'student_semester:read_own', description: 'Read student semester academic records.' },
  { key: 'student_semester:create_own', description: 'Add student semester academic records.' },
  { key: 'student_semester:edit_own', description: 'Edit student semester academic records.' },
  { key: 'student_semester:delete_own', description: 'Delete student semester academic records.' },
  { key: 'achievement:read_own', description: 'Read the signed-in student achievements.' },
  { key: 'achievement:create_own', description: 'Add achievements to the signed-in student profile.' },
  { key: 'achievement:edit_own', description: 'Edit achievements of the signed-in student.' },
  { key: 'achievement:delete_own', description: 'Delete achievements of the signed-in student.' },
  { key: 'student_placement:read_own', description: 'Read student placement offers.' },
  { key: 'student_placement:edit_own', description: 'Add or edit student placement offers.' },
  { key: 'student_placement:delete_own', description: 'Delete student placement offers.' },
  { key: 'student_outcome:read_own', description: 'Read student graduate outcome.' },
  { key: 'student_outcome:edit_own', description: 'Edit student graduate outcome.' },
  { key: 'record:verify', description: 'Review and verify student submitted claims.' },
  { key: 'faculty_profile:read_own', description: 'Read the signed-in faculty profile.' },
  { key: 'faculty_profile:edit_own', description: 'Edit the signed-in faculty profile.' },
  { key: 'faculty_education:read_own', description: 'Read faculty education records.' },
  { key: 'faculty_education:edit_own', description: 'Edit faculty education records.' },
  { key: 'faculty_education:delete_own', description: 'Delete faculty education records.' },
  { key: 'faculty_experience:read_own', description: 'Read faculty experience records.' },
  { key: 'faculty_experience:edit_own', description: 'Edit faculty experience records.' },
  { key: 'faculty_experience:delete_own', description: 'Delete faculty experience records.' },
  { key: 'faculty_certification:read_own', description: 'Read faculty certifications.' },
  { key: 'faculty_certification:edit_own', description: 'Edit faculty certifications.' },
  { key: 'faculty_certification:delete_own', description: 'Delete faculty certifications.' },
  { key: 'faculty_research:read_own', description: 'Read faculty research papers.' },
  { key: 'faculty_research:edit_own', description: 'Edit faculty research papers.' },
  { key: 'faculty_research:delete_own', description: 'Delete faculty research papers.' },
  { key: 'faculty_patent:read_own', description: 'Read faculty patents.' },
  { key: 'faculty_patent:edit_own', description: 'Edit faculty patents.' },
  { key: 'faculty_patent:delete_own', description: 'Delete faculty patents.' },
  { key: 'faculty_fdp:read_own', description: 'Read faculty development programs.' },
  { key: 'faculty_fdp:edit_own', description: 'Edit faculty development programs.' },
  { key: 'faculty_fdp:delete_own', description: 'Delete faculty development programs.' },
  { key: 'faculty_teaching:read_own', description: 'Read faculty teaching workload.' },
  { key: 'faculty_teaching:edit_own', description: 'Edit faculty teaching workload.' },
  { key: 'faculty_teaching:delete_own', description: 'Delete faculty teaching workload.' },
  { key: 'faculty_grant:read_own', description: 'Read faculty research projects and grants.' },
  { key: 'faculty_grant:edit_own', description: 'Edit faculty research projects and grants.' },
  { key: 'faculty_grant:delete_own', description: 'Delete faculty research projects and grants.' },
  { key: 'faculty_consultancy:read_own', description: 'Read faculty consultancy projects.' },
  { key: 'faculty_consultancy:edit_own', description: 'Edit faculty consultancy projects.' },
  { key: 'faculty_consultancy:delete_own', description: 'Delete faculty consultancy projects.' },
  { key: 'faculty_contribution:read_own', description: 'Read faculty contributions and awards.' },
  { key: 'faculty_contribution:edit_own', description: 'Edit faculty contributions and awards.' },
  { key: 'faculty_contribution:delete_own', description: 'Delete faculty contributions and awards.' },
  { key: 'event:create', description: 'Create and manage events.' },
  { key: 'event:archive', description: 'Archive events.' },
  { key: 'event:enter_results', description: 'Bulk enter results for event participants.' },
  { key: 'event:participate', description: 'Self-register interest or participate in events.' },
  { key: 'department:manage', description: 'Manage academic departments.' },
  { key: 'course:manage', description: 'Manage academic courses.' },
  { key: 'institution:manage', description: 'Manage institution profile and settings.' },
  { key: 'user:manage', description: 'Manage users across the institution.' },
  { key: 'user:import', description: 'Import users from CSV.' },
  { key: 'report:view', description: 'View and export institutional accreditation and analytics reports.' },
  { key: 'document:upload', description: 'Upload supporting proof documents.' },
  { key: 'document:read_own', description: 'Read owned proof documents.' },
]

const roleDefinitions = [
  {
    key: 'INSTITUTION_ADMIN',
    name: 'Institution Administrator',
    permissions: [
      'department:manage',
      'course:manage',
      'institution:manage',
      'user:manage',
      'user:import',
      'event:create',
      'event:archive',
      'event:enter_results',
      'record:verify',
      'report:view',
    ],
  },
  {
    key: 'FACULTY',
    name: 'Faculty Member',
    permissions: [
      'faculty_profile:read_own',
      'faculty_profile:edit_own',
      'faculty_education:read_own',
      'faculty_education:edit_own',
      'faculty_education:delete_own',
      'faculty_experience:read_own',
      'faculty_experience:edit_own',
      'faculty_experience:delete_own',
      'faculty_certification:read_own',
      'faculty_certification:edit_own',
      'faculty_certification:delete_own',
      'faculty_research:read_own',
      'faculty_research:edit_own',
      'faculty_research:delete_own',
      'faculty_patent:read_own',
      'faculty_patent:edit_own',
      'faculty_patent:delete_own',
      'faculty_fdp:read_own',
      'faculty_fdp:edit_own',
      'faculty_fdp:delete_own',
      'faculty_teaching:read_own',
      'faculty_teaching:edit_own',
      'faculty_teaching:delete_own',
      'faculty_grant:read_own',
      'faculty_grant:edit_own',
      'faculty_grant:delete_own',
      'faculty_consultancy:read_own',
      'faculty_consultancy:edit_own',
      'faculty_consultancy:delete_own',
      'faculty_contribution:read_own',
      'faculty_contribution:edit_own',
      'faculty_contribution:delete_own',
      'record:verify',
      'event:create',
      'event:archive',
      'event:enter_results',
      'event:participate',
      'document:upload',
      'document:read_own',
    ],
  },
  {
    key: 'DEPARTMENT_COORDINATOR',
    name: 'Department Coordinator / HOD',
    permissions: [
      'record:verify',
      'report:view',
      'event:create',
      'event:enter_results',
      'document:read_own',
    ],
  },
  {
    key: 'STUDENT',
    name: 'Student',
    permissions: [
      'student_profile:read_own',
      'student_profile:edit_own',
      'student_education:read_own',
      'student_education:edit_own',
      'student_education:delete_own',
      'student_certification:read_own',
      'student_certification:edit_own',
      'student_certification:delete_own',
      'student_research:read_own',
      'student_research:edit_own',
      'student_research:delete_own',
      'student_patent:read_own',
      'student_patent:edit_own',
      'student_patent:delete_own',
      'student_project:read_own',
      'student_project:edit_own',
      'student_project:delete_own',
      'student_internship:read_own',
      'student_internship:edit_own',
      'student_internship:delete_own',
      'student_skill:read_own',
      'student_skill:create_own',
      'student_skill:edit_own',
      'student_skill:delete_own',
      'student_semester:read_own',
      'student_semester:create_own',
      'student_semester:edit_own',
      'student_semester:delete_own',
      'achievement:read_own',
      'achievement:create_own',
      'achievement:edit_own',
      'achievement:delete_own',
      'student_placement:read_own',
      'student_placement:edit_own',
      'student_placement:delete_own',
      'student_outcome:read_own',
      'student_outcome:edit_own',
      'event:participate',
      'document:upload',
      'document:read_own',
    ],
  },
]

async function main() {
  console.info('Seeding Attainly demo database…')

  const institution = await prisma.institution.upsert({
    where: { slug: 'attainly-demo' },
    update: { name: 'Attainly Demo Institute of Technology' },
    create: {
      slug: 'attainly-demo',
      name: 'Attainly Demo Institute of Technology',
    },
  })

  const department = await prisma.department.upsert({
    where: { institutionId_code: { institutionId: institution.id, code: 'CSE' } },
    update: { name: 'Computer Science and Engineering' },
    create: {
      institutionId: institution.id,
      code: 'CSE',
      name: 'Computer Science and Engineering',
    },
  })

  await prisma.course.upsert({
    where: { institutionId_code: { institutionId: institution.id, code: 'BTECH-CSE' } },
    update: { name: 'B.Tech in Computer Science and Engineering', departmentId: department.id },
    create: {
      institutionId: institution.id,
      departmentId: department.id,
      code: 'BTECH-CSE',
      name: 'B.Tech in Computer Science and Engineering',
      description: 'Undergraduate Program in Computer Science and Engineering',
    },
  })

  const defaultAchievementCategories = [
    { code: 'TECHNICAL', name: 'Technical Events', subcategories: ['Coding Contest', 'Paper Presentation', 'Tech Symposium', 'Robotics'], sortOrder: 1 },
    { code: 'HACKATHON', name: 'Hackathons', subcategories: ['24-Hour Hackathon', 'Smart India Hackathon', 'Ideathon', 'Buildathon'], sortOrder: 2 },
    { code: 'SPORTS', name: 'Sports', subcategories: ['Athletics', 'Team Sports', 'Indoor Games', 'Inter-University'], sortOrder: 3 },
    { code: 'CULTURAL', name: 'Cultural Activities', subcategories: ['Music', 'Dance', 'Drama & Theatre', 'Fine Arts & Literature'], sortOrder: 4 },
    { code: 'ACADEMIC', name: 'Academics', subcategories: ['Merit Scholarship', 'Dean’s List', 'Olympiad', 'Quiz Competition'], sortOrder: 5 },
    { code: 'SOCIAL_SERVICE', name: 'Social Service', subcategories: ['NSS', 'NCC', 'Community Outreach', 'Environmental Drive'], sortOrder: 6 },
    { code: 'ENTREPRENEURSHIP', name: 'Entrepreneurship', subcategories: ['Startup Pitch', 'E-Cell', 'Incubation', 'Business Plan'], sortOrder: 7 },
    { code: 'LEADERSHIP', name: 'Leadership', subcategories: ['Student Council', 'Club President', 'Event Convener', 'Class Representative'], sortOrder: 8 },
    { code: 'PROFESSIONAL', name: 'Professional Activities', subcategories: ['IEEE / ACM Chapter', 'Open Source', 'Industry Workshop', 'Mentorship'], sortOrder: 9 },
  ]
  for (const cat of defaultAchievementCategories) {
    await prisma.achievementCategoryConfig.upsert({
      where: { institutionId_code: { institutionId: institution.id, code: cat.code } },
      update: { name: cat.name, subcategories: cat.subcategories, sortOrder: cat.sortOrder, isActive: true },
      create: { institutionId: institution.id, ...cat, isActive: true },
    })
  }

  await prisma.academicYear.upsert({
    where: { institutionId_label: { institutionId: institution.id, label: '2025-26' } },
    update: { isCurrent: true },
    create: {
      institutionId: institution.id,
      label: '2025-26',
      startDate: new Date('2025-07-01T00:00:00Z'),
      endDate: new Date('2026-06-30T23:59:59Z'),
      isCurrent: true,
    },
  })

  // Bulk create/sync permissions in 1 query
  await prisma.permission.createMany({
    data: permissionDefinitions.map((def) => ({
      institutionId: institution.id,
      key: def.key,
      description: def.description,
    })),
    skipDuplicates: true,
  })

  const existingPermissions = await prisma.permission.findMany({
    where: { institutionId: institution.id },
    select: { id: true, key: true },
  })
  const permissions = new Map<string, string>()
  for (const perm of existingPermissions) {
    permissions.set(perm.key, perm.id)
  }

  const roles = new Map<string, string>()
  for (const definition of roleDefinitions) {
    const role = await prisma.role.upsert({
      where: { institutionId_key: { institutionId: institution.id, key: definition.key } },
      update: { name: definition.name },
      create: { institutionId: institution.id, key: definition.key, name: definition.name },
    })
    roles.set(role.key, role.id)

    const rolePermissionData = definition.permissions.map((permissionKey) => {
      const permissionId = permissions.get(permissionKey)
      if (!permissionId) throw new Error(`Missing permission definition: ${permissionKey}`)
      return {
        institutionId: institution.id,
        roleId: role.id,
        permissionId,
      }
    })

    await prisma.rolePermission.createMany({
      data: rolePermissionData,
      skipDuplicates: true,
    })
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
      update: { ...userData, roleId, passwordHash, isActive: true, mustChangePassword: false },
      create: { institutionId: institution.id, ...userData, roleId, passwordHash, mustChangePassword: false },
    })

    if (roleKey === 'STUDENT') {
      await prisma.studentProfile.upsert({
        where: { institutionId_userId: { institutionId: institution.id, userId: user.id } },
        update: {},
        create: {
          institutionId: institution.id,
          userId: user.id,
          enrollmentNumber: 'EN2026-CSE-0042',
          departmentId: department.id,
          admissionYear: 2023,
          currentSemester: 6,
        },
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
    await pool.end()
  })
