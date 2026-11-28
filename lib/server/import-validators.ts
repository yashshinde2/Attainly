import { z } from 'zod'
import { IMPORT_CATALOG, type ImportTypeKey } from '@/lib/import-types'

export function parseStrictDate(raw: string | undefined | null): Date | null {
  const value = (raw ?? '').trim()
  if (!value) return null
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/.exec(value)
  if (!isoMatch) {
    throw new Error(`Invalid date "${value}". Use YYYY-MM-DD format.`)
  }
  const year = Number(isoMatch[1])
  const month = Number(isoMatch[2])
  const day = Number(isoMatch[3])
  if (year < 1950 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
    throw new Error(`Out-of-range date "${value}".`)
  }
  const dt = new Date(Date.UTC(year, month - 1, day))
  if (
    dt.getUTCFullYear() !== year ||
    dt.getUTCMonth() !== month - 1 ||
    dt.getUTCDate() !== day
  ) {
    throw new Error(`Invalid calendar date "${value}".`)
  }
  return dt
}

export function parseStrictInt(
  raw: string | undefined | null,
  fieldLabel: string,
  min: number,
  max: number,
): number | null {
  const value = (raw ?? '').trim()
  if (!value) return null
  if (!/^-?\d+$/.test(value)) {
    throw new Error(`${fieldLabel} must be an integer (got "${value}").`)
  }
  const num = Number(value)
  if (!Number.isSafeInteger(num) || num < min || num > max) {
    throw new Error(`${fieldLabel} must be between ${min} and ${max}.`)
  }
  return num
}

export function parseStrictFloat(
  raw: string | undefined | null,
  fieldLabel: string,
  min: number,
  max: number,
): number | null {
  const value = (raw ?? '').trim()
  if (!value) return null
  const num = Number(value)
  if (!Number.isFinite(num) || num < min || num > max) {
    throw new Error(`${fieldLabel} must be between ${min} and ${max}.`)
  }
  return Math.round(num * 100) / 100
}

export function parseList(raw: string | undefined | null): string[] {
  const value = (raw ?? '').trim()
  if (!value) return []
  return value
    .split(/[,;|]/)
    .map((s) => s.trim())
    .filter(Boolean)
}

export function applyColumnMapping(
  rawRow: Record<string, string>,
  mapping: Record<string, string>,
  importType: ImportTypeKey,
): Record<string, string> {
  const def = IMPORT_CATALOG[importType]
  const out: Record<string, string> = {}
  for (const col of def.columns) {
    const mappedHeader = mapping[col.key]
    if (mappedHeader && mappedHeader in rawRow) {
      out[col.key] = (rawRow[mappedHeader] ?? '').trim()
    } else if (col.key in rawRow) {
      out[col.key] = (rawRow[col.key] ?? '').trim()
    } else {
      out[col.key] = ''
    }
  }
  return out
}

const emailSchema = z.string().trim().email().max(254)
const urlSchema = z.string().trim().url().max(500)

function requireStr(val: string, label: string, max = 300): string {
  const trimmed = val.trim()
  if (!trimmed) throw new Error(`${label} is required.`)
  if (trimmed.length > max) throw new Error(`${label} exceeds ${max} characters.`)
  return trimmed
}

function optionalStr(val: string, max = 1000): string | null {
  const trimmed = val.trim()
  if (!trimmed) return null
  if (trimmed.length > max) throw new Error(`Value exceeds ${max} characters.`)
  return trimmed
}

function validateEnum<T extends string>(
  raw: string,
  allowed: readonly T[],
  label: string,
  defaultValue?: T,
): T {
  const val = raw.trim().toUpperCase()
  if (!val) {
    if (defaultValue !== undefined) return defaultValue
    throw new Error(`${label} is required (${allowed.join(', ')}).`)
  }
  if (!(allowed as readonly string[]).includes(val)) {
    throw new Error(`Invalid ${label} "${raw}". Allowed: ${allowed.join(', ')}.`)
  }
  return val as T
}

function assertDateOrder(start: Date | null, end: Date | null, label = 'End date'): void {
  if (start && end && end.getTime() < start.getTime()) {
    throw new Error(`${label} cannot be earlier than start date.`)
  }
}

export interface ValidatedImportRow {
  matchKey: string
  normalized: Record<string, unknown>
}

export function validateImportRow(
  importType: ImportTypeKey,
  mapped: Record<string, string>,
): ValidatedImportRow {
  switch (importType) {
    case 'STUDENT_IDENTITY': {
      const enrollmentNumber = requireStr(mapped.enrollmentNumber, 'Enrollment Number', 80).toUpperCase()
      const email = emailSchema.parse(requireStr(mapped.email, 'Email', 254)).toLowerCase()
      const firstName = requireStr(mapped.firstName, 'First Name', 100)
      const lastName = requireStr(mapped.lastName, 'Last Name', 100)
      const departmentCode = requireStr(mapped.departmentCode, 'Department Code', 40).toUpperCase()
      const courseCode = optionalStr(mapped.courseCode, 40)?.toUpperCase() ?? null
      const admissionYear = parseStrictInt(mapped.admissionYear, 'Admission Year', 1990, 2100)
      const currentSemester = parseStrictInt(mapped.currentSemester, 'Current Semester', 1, 12)
      const batchLabel = optionalStr(mapped.batchLabel, 60)
      const academicStatus = validateEnum(
        mapped.academicStatus,
        ['ACTIVE', 'ON_LEAVE', 'GRADUATED', 'SUSPENDED', 'ALUMNI'] as const,
        'Academic Status',
        'ACTIVE',
      )
      const phone = optionalStr(mapped.phone, 40)
      const dateOfBirth = parseStrictDate(mapped.dateOfBirth)
      return {
        matchKey: `STU:${enrollmentNumber}`,
        normalized: {
          enrollmentNumber,
          email,
          firstName,
          lastName,
          departmentCode,
          courseCode,
          admissionYear,
          currentSemester,
          batchLabel,
          academicStatus,
          phone,
          dateOfBirth: dateOfBirth?.toISOString() ?? null,
        },
      }
    }

    case 'FACULTY_IDENTITY': {
      const employeeId = requireStr(mapped.employeeId, 'Employee ID', 80).toUpperCase()
      const email = emailSchema.parse(requireStr(mapped.email, 'Email', 254)).toLowerCase()
      const firstName = requireStr(mapped.firstName, 'First Name', 100)
      const lastName = requireStr(mapped.lastName, 'Last Name', 100)
      const departmentCode = requireStr(mapped.departmentCode, 'Department Code', 40).toUpperCase()
      const designation = optionalStr(mapped.designation, 120)
      const employmentStatus = validateEnum(
        mapped.employmentStatus,
        ['ACTIVE', 'ON_LEAVE', 'VISITING', 'INACTIVE'] as const,
        'Employment Status',
        'ACTIVE',
      )
      const employmentType = optionalStr(mapped.employmentType, 80)
      const joiningDate = parseStrictDate(mapped.joiningDate)
      const specialization = optionalStr(mapped.specialization, 200)
      const orcidId = optionalStr(mapped.orcidId, 80)
      const scopusAuthorId = optionalStr(mapped.scopusAuthorId, 80)
      return {
        matchKey: `FAC:${employeeId}`,
        normalized: {
          employeeId,
          email,
          firstName,
          lastName,
          departmentCode,
          designation,
          employmentStatus,
          employmentType,
          joiningDate: joiningDate?.toISOString() ?? null,
          specialization,
          orcidId,
          scopusAuthorId,
        },
      }
    }

    case 'STUDENT_EDUCATION': {
      const enrollmentNumber = requireStr(mapped.enrollmentNumber, 'Enrollment Number', 80).toUpperCase()
      const level = validateEnum(mapped.level, ['TENTH', 'TWELFTH', 'DEGREE', 'OTHER'] as const, 'Level')
      const institutionName = requireStr(mapped.institutionName, 'Institution Name', 200)
      const boardOrUniversity = optionalStr(mapped.boardOrUniversity, 200)
      const courseOrStream = optionalStr(mapped.courseOrStream, 200)
      const score = optionalStr(mapped.score, 40)
      const startYear = parseStrictInt(mapped.startYear, 'Start Year', 1970, 2100)
      const endYear = parseStrictInt(mapped.endYear, 'End Year', 1970, 2100)
      if (startYear !== null && endYear !== null && endYear < startYear) {
        throw new Error('End Year cannot be earlier than Start Year.')
      }
      return {
        matchKey: `EDU:${enrollmentNumber}:${level}:${institutionName.toLowerCase()}:${endYear ?? ''}`,
        normalized: {
          enrollmentNumber,
          level,
          institutionName,
          boardOrUniversity,
          courseOrStream,
          score,
          startYear,
          endYear,
        },
      }
    }

    case 'SEMESTER_RECORD': {
      const enrollmentNumber = requireStr(mapped.enrollmentNumber, 'Enrollment Number', 80).toUpperCase()
      const semesterNumber = parseStrictInt(mapped.semesterNumber, 'Semester Number', 1, 12)
      if (semesterNumber === null) throw new Error('Semester Number is required.')
      const sgpa = parseStrictFloat(mapped.sgpa, 'SGPA', 0, 10)
      if (sgpa === null) throw new Error('SGPA is required.')
      const cgpaAtSemester = parseStrictFloat(mapped.cgpaAtSemester, 'CGPA at Semester', 0, 10)
      if (cgpaAtSemester === null) throw new Error('CGPA at Semester is required.')
      const backlogCount = parseStrictInt(mapped.backlogCount, 'Backlog Count', 0, 50) ?? 0
      return {
        matchKey: `SEM:${enrollmentNumber}:${semesterNumber}`,
        normalized: { enrollmentNumber, semesterNumber, sgpa, cgpaAtSemester, backlogCount },
      }
    }

    case 'ACHIEVEMENT': {
      const enrollmentNumber = requireStr(mapped.enrollmentNumber, 'Enrollment Number', 80).toUpperCase()
      const title = requireStr(mapped.title, 'Title', 240)
      const category = validateEnum(
        mapped.category,
        ['TECHNICAL', 'NON_TECHNICAL', 'SPORTS', 'CULTURAL'] as const,
        'Category',
      )
      const status = validateEnum(
        mapped.status,
        ['PARTICIPATION', 'WINNER'] as const,
        'Outcome Status',
      )
      const categoryCode = optionalStr(mapped.categoryCode, 60)
      const participationLevel = optionalStr(mapped.participationLevel, 80)
      const organizer = optionalStr(mapped.organizer, 200)
      const role = optionalStr(mapped.role, 100)
      const result = optionalStr(mapped.result, 120)
      const awardedAt = parseStrictDate(mapped.awardedAt)
      const description = optionalStr(mapped.description, 1000)
      return {
        matchKey: `ACH:${enrollmentNumber}:${category}:${title.toLowerCase()}:${awardedAt ? awardedAt.toISOString().slice(0, 10) : ''}`,
        normalized: {
          enrollmentNumber,
          title,
          category,
          status,
          categoryCode,
          participationLevel,
          organizer,
          role,
          result,
          awardedAt: awardedAt?.toISOString() ?? null,
          description,
        },
      }
    }

    case 'CERTIFICATION': {
      const enrollmentNumber = requireStr(mapped.enrollmentNumber, 'Enrollment Number', 80).toUpperCase()
      const name = requireStr(mapped.name, 'Certification Name', 240)
      const issuer = optionalStr(mapped.issuer, 200)
      const credentialId = optionalStr(mapped.credentialId, 120)
      const credentialUrlRaw = optionalStr(mapped.credentialUrl, 500)
      const credentialUrl = credentialUrlRaw ? urlSchema.parse(credentialUrlRaw) : null
      const duration = optionalStr(mapped.duration, 80)
      const issuedAt = parseStrictDate(mapped.issuedAt)
      const expiresAt = parseStrictDate(mapped.expiresAt)
      assertDateOrder(issuedAt, expiresAt, 'Expiry Date')
      const skillsEarned = parseList(mapped.skillsEarned)
      const dedupeSuffix = credentialId ? `cred:${credentialId.toLowerCase()}` : `name:${name.toLowerCase()}:${(issuer ?? '').toLowerCase()}`
      return {
        matchKey: `CERT:${enrollmentNumber}:${dedupeSuffix}`,
        normalized: {
          enrollmentNumber,
          name,
          issuer,
          credentialId,
          credentialUrl,
          duration,
          issuedAt: issuedAt?.toISOString() ?? null,
          expiresAt: expiresAt?.toISOString() ?? null,
          skillsEarned,
        },
      }
    }

    case 'PROJECT_INTERNSHIP': {
      const enrollmentNumber = requireStr(mapped.enrollmentNumber, 'Enrollment Number', 80).toUpperCase()
      const recordType = validateEnum(mapped.recordType, ['PROJECT', 'INTERNSHIP'] as const, 'Record Type')
      const titleOrOrganization = requireStr(mapped.titleOrOrganization, 'Title / Organization', 240)
      const role = optionalStr(mapped.role, 120)
      const facultyGuide = optionalStr(mapped.facultyGuide, 120)
      const techStack = parseList(mapped.techStack)
      const startDate = parseStrictDate(mapped.startDate)
      const endDate = parseStrictDate(mapped.endDate)
      assertDateOrder(startDate, endDate, 'End Date')
      const stipendAmount = optionalStr(mapped.stipendAmount, 60)
      const offerType = validateEnum(
        mapped.offerType,
        ['NONE', 'PPO_OFFERED', 'CONVERTED_TO_JOB'] as const,
        'Offer Type',
        'NONE',
      )
      const outcomes = optionalStr(mapped.outcomes, 1000)
      const repoRaw = optionalStr(mapped.repositoryUrl, 500)
      const repositoryUrl = repoRaw ? urlSchema.parse(repoRaw) : null
      return {
        matchKey: `PI:${enrollmentNumber}:${recordType}:${titleOrOrganization.toLowerCase()}:${startDate ? startDate.toISOString().slice(0, 10) : ''}`,
        normalized: {
          enrollmentNumber,
          recordType,
          titleOrOrganization,
          role,
          facultyGuide,
          techStack,
          startDate: startDate?.toISOString() ?? null,
          endDate: endDate?.toISOString() ?? null,
          stipendAmount,
          offerType,
          outcomes,
          repositoryUrl,
        },
      }
    }

    case 'PLACEMENT_OUTCOME': {
      const enrollmentNumber = requireStr(mapped.enrollmentNumber, 'Enrollment Number', 80).toUpperCase()
      const recordType = validateEnum(
        mapped.recordType,
        ['PLACEMENT_OFFER', 'GRADUATE_OUTCOME'] as const,
        'Record Type',
      )
      const companyOrInstitution = requireStr(mapped.companyOrInstitution, 'Company / University', 200)
      const roleOrProgram = requireStr(mapped.roleOrProgram, 'Role / Program', 200)
      const packageCtc = optionalStr(mapped.packageCtc, 60)
      const offerStatus = validateEnum(
        mapped.offerStatus,
        ['OFFERED', 'ACCEPTED', 'DECLINED'] as const,
        'Offer Status',
        'OFFERED',
      )
      const outcomeType =
        recordType === 'GRADUATE_OUTCOME'
          ? validateEnum(
              mapped.outcomeType,
              ['PLACED', 'HIGHER_STUDIES', 'ENTREPRENEURSHIP', 'ALUMNI', 'SEEKING', 'OTHER'] as const,
              'Outcome Type',
            )
          : null
      const offeredAt = parseStrictDate(mapped.offeredAt)
      const location = optionalStr(mapped.location, 160)
      const matchKey =
        recordType === 'GRADUATE_OUTCOME'
          ? `OUTCOME:${enrollmentNumber}`
          : `OFFER:${enrollmentNumber}:${companyOrInstitution.toLowerCase()}:${roleOrProgram.toLowerCase()}`
      return {
        matchKey,
        normalized: {
          enrollmentNumber,
          recordType,
          companyOrInstitution,
          roleOrProgram,
          packageCtc,
          offerStatus,
          outcomeType,
          offeredAt: offeredAt?.toISOString() ?? null,
          location,
        },
      }
    }

    case 'FACULTY_QUALIFICATION': {
      const employeeId = requireStr(mapped.employeeId, 'Employee ID', 80).toUpperCase()
      const qualification = requireStr(mapped.qualification, 'Qualification', 120)
      const institutionName = requireStr(mapped.institutionName, 'Institution Name', 200)
      const fieldOfStudy = optionalStr(mapped.fieldOfStudy, 200)
      const yearCompleted = parseStrictInt(mapped.yearCompleted, 'Year Completed', 1960, 2100)
      return {
        matchKey: `FQUAL:${employeeId}:${qualification.toLowerCase()}:${institutionName.toLowerCase()}:${yearCompleted ?? ''}`,
        normalized: { employeeId, qualification, institutionName, fieldOfStudy, yearCompleted },
      }
    }

    case 'FACULTY_EXPERIENCE': {
      const employeeId = requireStr(mapped.employeeId, 'Employee ID', 80).toUpperCase()
      const type = validateEnum(mapped.type, ['TEACHING', 'INDUSTRY'] as const, 'Experience Type')
      const organization = requireStr(mapped.organization, 'Organization', 200)
      const title = requireStr(mapped.title, 'Role / Title', 200)
      const startDate = parseStrictDate(mapped.startDate)
      const endDate = parseStrictDate(mapped.endDate)
      assertDateOrder(startDate, endDate, 'End Date')
      const description = optionalStr(mapped.description, 1000)
      return {
        matchKey: `FEXP:${employeeId}:${type}:${organization.toLowerCase()}:${title.toLowerCase()}:${startDate ? startDate.toISOString().slice(0, 10) : ''}`,
        normalized: {
          employeeId,
          type,
          organization,
          title,
          startDate: startDate?.toISOString() ?? null,
          endDate: endDate?.toISOString() ?? null,
          description,
        },
      }
    }

    case 'FACULTY_FDP': {
      const employeeId = requireStr(mapped.employeeId, 'Employee ID', 80).toUpperCase()
      const programType = optionalStr(mapped.programType, 60) ?? 'FDP'
      const title = requireStr(mapped.title, 'Program Title', 240)
      const organizer = requireStr(mapped.organizer, 'Organizer', 200)
      const mode = validateEnum(mapped.mode, ['ONLINE', 'OFFLINE', 'HYBRID'] as const, 'Mode', 'ONLINE')
      const durationDays = parseStrictInt(mapped.durationDays, 'Duration (Days)', 1, 365)
      const startDate = parseStrictDate(mapped.startDate)
      const endDate = parseStrictDate(mapped.endDate)
      if (!startDate || !endDate) throw new Error('Start Date and End Date are required for FDP.')
      assertDateOrder(startDate, endDate, 'End Date')
      return {
        matchKey: `FDP:${employeeId}:${title.toLowerCase()}:${organizer.toLowerCase()}:${startDate.toISOString().slice(0, 10)}`,
        normalized: {
          employeeId,
          programType,
          title,
          organizer,
          mode,
          durationDays,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
      }
    }

    case 'RESEARCH_PUBLICATION': {
      const employeeId = requireStr(mapped.employeeId, 'Author Employee ID', 80).toUpperCase()
      const title = requireStr(mapped.title, 'Publication Title', 300)
      const publicationType = validateEnum(
        mapped.publicationType,
        ['JOURNAL', 'CONFERENCE', 'BOOK_CHAPTER', 'BOOK'] as const,
        'Publication Type',
        'JOURNAL',
      )
      const journalOrConference = optionalStr(mapped.journalOrConference, 240)
      const publisher = optionalStr(mapped.publisher, 200)
      const doi = optionalStr(mapped.doi, 160)?.toLowerCase() ?? null
      const issnOrIsbn = optionalStr(mapped.issnOrIsbn, 80)
      const indexing = optionalStr(mapped.indexing, 160)
      const authorsText = optionalStr(mapped.authorsText, 500)
      const authorOrder = parseStrictInt(mapped.authorOrder, 'Author Order', 1, 50) ?? 1
      const publishedAt = parseStrictDate(mapped.publishedAt)
      const pubKey = doi ? `doi:${doi}` : `title:${title.toLowerCase()}`
      return {
        matchKey: `PUB:${pubKey}:author:${employeeId}`,
        normalized: {
          employeeId,
          title,
          publicationType,
          journalOrConference,
          publisher,
          doi,
          issnOrIsbn,
          indexing,
          authorsText,
          authorOrder,
          publishedAt: publishedAt?.toISOString() ?? null,
        },
      }
    }

    case 'PATENT': {
      const ownerType = validateEnum(mapped.ownerType, ['FACULTY', 'STUDENT'] as const, 'Owner Type')
      const ownerIdentifier = requireStr(mapped.ownerIdentifier, 'Employee ID / Enrollment No', 80).toUpperCase()
      const title = requireStr(mapped.title, 'Patent Title', 240)
      const patentNumber = optionalStr(mapped.patentNumber, 120)?.toUpperCase() ?? null
      const status = optionalStr(mapped.status, 80)
      const filedAt = parseStrictDate(mapped.filedAt)
      const patKey = patentNumber ? `num:${patentNumber}` : `title:${title.toLowerCase()}`
      return {
        matchKey: `PAT:${ownerType}:${ownerIdentifier}:${patKey}`,
        normalized: {
          ownerType,
          ownerIdentifier,
          title,
          patentNumber,
          status,
          filedAt: filedAt?.toISOString() ?? null,
        },
      }
    }

    case 'CONSULTANCY_CONTRIBUTION': {
      const employeeId = requireStr(mapped.employeeId, 'Employee ID', 80).toUpperCase()
      const recordType = validateEnum(
        mapped.recordType,
        ['CONSULTANCY', 'CONTRIBUTION'] as const,
        'Record Type',
      )
      const title = requireStr(mapped.title, 'Title', 240)
      const organization = requireStr(mapped.organization, 'Client / Organization', 200)
      const contributionType = optionalStr(mapped.contributionType, 80) ?? 'INSTITUTIONAL'
      const role = optionalStr(mapped.role, 120)
      const amount = optionalStr(mapped.amount, 80)
      const startDate = parseStrictDate(mapped.startDate)
      if (!startDate) throw new Error('Start Date is required.')
      const endDate = parseStrictDate(mapped.endDate)
      assertDateOrder(startDate, endDate, 'End Date')
      const outcomesOrDescription = optionalStr(mapped.outcomesOrDescription, 1000)
      return {
        matchKey: `CC:${employeeId}:${recordType}:${title.toLowerCase()}:${startDate.toISOString().slice(0, 10)}`,
        normalized: {
          employeeId,
          recordType,
          title,
          organization,
          contributionType,
          role,
          amount,
          startDate: startDate.toISOString(),
          endDate: endDate?.toISOString() ?? null,
          outcomesOrDescription,
        },
      }
    }

    case 'TEACHING_WORKLOAD': {
      const employeeId = requireStr(mapped.employeeId, 'Employee ID', 80).toUpperCase()
      const academicYear = requireStr(mapped.academicYear, 'Academic Year', 20)
      if (!/^\d{4}-\d{2,4}$/.test(academicYear)) {
        throw new Error(`Invalid Academic Year "${academicYear}". Expected format like 2025-26.`)
      }
      const semester = parseStrictInt(mapped.semester, 'Semester', 1, 12)
      if (semester === null) throw new Error('Semester is required.')
      const subjectName = requireStr(mapped.subjectName, 'Subject Name', 200)
      const subjectCode = optionalStr(mapped.subjectCode, 40)?.toUpperCase() ?? null
      const hoursPerWeek = parseStrictInt(mapped.hoursPerWeek, 'Hours / Week', 1, 40)
      if (hoursPerWeek === null) throw new Error('Hours / Week is required.')
      const studentCount = parseStrictInt(mapped.studentCount, 'Student Count', 0, 2000)
      return {
        matchKey: `LOAD:${employeeId}:${academicYear}:${semester}:${subjectName.toLowerCase()}`,
        normalized: {
          employeeId,
          academicYear,
          semester,
          subjectName,
          subjectCode,
          hoursPerWeek,
          studentCount,
        },
      }
    }
  }
}
