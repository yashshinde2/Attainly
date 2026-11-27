export type ReportEntityType =
  | 'STUDENT_ACADEMICS'
  | 'ACHIEVEMENTS'
  | 'SPORTS_CULTURAL'
  | 'HACKATHONS'
  | 'CERTIFICATIONS'
  | 'INTERNSHIPS'
  | 'PLACEMENTS'
  | 'HIGHER_EDUCATION'
  | 'FACULTY_QUALIFICATIONS'
  | 'FACULTY_EXPERIENCE'
  | 'RESEARCH_PUBLICATIONS'
  | 'FACULTY_FDPS'
  | 'FACULTY_CONSULTANCY'
  | 'FACULTY_WORKLOAD'
  | 'EVENTS'
  | 'CERT_RESEARCH_PATENT'
  | 'VERIFICATION_AGING'
  | 'COMPLETENESS_LAGGARDS'
  | 'CRITERION_COVERAGE'
  | 'DATA_QUALITY'

export type ReportFilterKey =
  | 'academicYearId'
  | 'dateRange'
  | 'departmentId'
  | 'courseId'
  | 'batchYear'
  | 'semester'
  | 'categoryCode'
  | 'eventType'
  | 'participationLevel'
  | 'result'
  | 'verificationStatus'
  | 'includeUnverified'
  | 'threshold'

export interface ReportColumnDef {
  key: string
  label: string
  defaultVisible?: boolean
}

export interface ReportRegistryEntry {
  id: ReportEntityType
  label: string
  description: string
  category: 'STUDENT' | 'FACULTY' | 'EVENT' | 'GOVERNANCE'
  countingUnit: string
  dateFieldSemantics: string
  requiredPermission: 'report:view'
  allowedFilters: ReportFilterKey[]
  columns: ReportColumnDef[]
  groupingDimensions: Array<{ key: string; label: string }>
  supportsDrillDown: boolean
}

export const REPORT_REGISTRY: Record<ReportEntityType, ReportRegistryEntry> = {
  STUDENT_ACADEMICS: {
    id: 'STUDENT_ACADEMICS',
    label: 'Student Academic Progression',
    description: 'Semester-wise SGPA, CGPA, credits earned, and backlog summary per student.',
    category: 'STUDENT',
    countingUnit: 'Semester academic records & unique students',
    dateFieldSemantics: 'Academic year & semester',
    requiredPermission: 'report:view',
    allowedFilters: ['departmentId', 'courseId', 'batchYear', 'semester', 'academicYearId'],
    columns: [
      { key: 'studentName', label: 'Student Name', defaultVisible: true },
      { key: 'enrollmentNumber', label: 'Enrollment No', defaultVisible: true },
      { key: 'departmentCode', label: 'Department', defaultVisible: true },
      { key: 'batchYear', label: 'Batch', defaultVisible: true },
      { key: 'semester', label: 'Semester', defaultVisible: true },
      { key: 'sgpa', label: 'SGPA', defaultVisible: true },
      { key: 'cgpa', label: 'CGPA', defaultVisible: true },
      { key: 'backlogsCount', label: 'Backlogs', defaultVisible: true },
    ],
    groupingDimensions: [
      { key: 'departmentCode', label: 'Department' },
      { key: 'batchYear', label: 'Batch Year' },
      { key: 'semester', label: 'Semester' },
    ],
    supportsDrillDown: false,
  },
  ACHIEVEMENTS: {
    id: 'ACHIEVEMENTS',
    label: 'Student Achievements',
    description: 'Verified student achievements across categories, participation levels, and results.',
    category: 'STUDENT',
    countingUnit: 'Activity records & unique students',
    dateFieldSemantics: 'awardedAt (fallback: createdAt)',
    requiredPermission: 'report:view',
    allowedFilters: ['academicYearId', 'dateRange', 'departmentId', 'batchYear', 'categoryCode', 'participationLevel', 'result', 'verificationStatus', 'includeUnverified'],
    columns: [
      { key: 'title', label: 'Achievement Title', defaultVisible: true },
      { key: 'studentName', label: 'Student', defaultVisible: true },
      { key: 'enrollmentNumber', label: 'Enrollment No', defaultVisible: true },
      { key: 'departmentCode', label: 'Department', defaultVisible: true },
      { key: 'category', label: 'Category', defaultVisible: true },
      { key: 'participationLevel', label: 'Level', defaultVisible: true },
      { key: 'status', label: 'Result', defaultVisible: true },
      { key: 'activityDate', label: 'Activity Date', defaultVisible: true },
      { key: 'verificationStatus', label: 'Verification', defaultVisible: true },
    ],
    groupingDimensions: [
      { key: 'category', label: 'Category' },
      { key: 'departmentCode', label: 'Department' },
      { key: 'participationLevel', label: 'Level' },
    ],
    supportsDrillDown: true,
  },
  SPORTS_CULTURAL: {
    id: 'SPORTS_CULTURAL',
    label: 'Sports & Cultural Participation',
    description: 'Sports and cultural achievements with individual/team and level breakdown.',
    category: 'STUDENT',
    countingUnit: 'Sports/cultural records & unique students',
    dateFieldSemantics: 'awardedAt (fallback: createdAt)',
    requiredPermission: 'report:view',
    allowedFilters: ['academicYearId', 'dateRange', 'departmentId', 'batchYear', 'participationLevel', 'result', 'includeUnverified'],
    columns: [
      { key: 'title', label: 'Activity Title', defaultVisible: true },
      { key: 'studentName', label: 'Student', defaultVisible: true },
      { key: 'departmentCode', label: 'Department', defaultVisible: true },
      { key: 'category', label: 'Category', defaultVisible: true },
      { key: 'participationLevel', label: 'Level', defaultVisible: true },
      { key: 'status', label: 'Result', defaultVisible: true },
      { key: 'activityDate', label: 'Activity Date', defaultVisible: true },
      { key: 'verificationStatus', label: 'Verification', defaultVisible: true },
    ],
    groupingDimensions: [{ key: 'category', label: 'Category' }, { key: 'departmentCode', label: 'Department' }],
    supportsDrillDown: true,
  },
  HACKATHONS: {
    id: 'HACKATHONS',
    label: 'Hackathons & Technical Competitions',
    description: 'Technical competitions, hackathons, and project expos.',
    category: 'STUDENT',
    countingUnit: 'Technical competition records & unique students',
    dateFieldSemantics: 'awardedAt / startsAt (fallback: createdAt)',
    requiredPermission: 'report:view',
    allowedFilters: ['academicYearId', 'dateRange', 'departmentId', 'batchYear', 'participationLevel', 'includeUnverified'],
    columns: [
      { key: 'title', label: 'Competition / Hackathon', defaultVisible: true },
      { key: 'studentName', label: 'Student', defaultVisible: true },
      { key: 'departmentCode', label: 'Department', defaultVisible: true },
      { key: 'teamName', label: 'Team', defaultVisible: true },
      { key: 'participationLevel', label: 'Level', defaultVisible: true },
      { key: 'status', label: 'Outcome', defaultVisible: true },
      { key: 'activityDate', label: 'Date', defaultVisible: true },
      { key: 'verificationStatus', label: 'Verification', defaultVisible: true },
    ],
    groupingDimensions: [{ key: 'departmentCode', label: 'Department' }, { key: 'participationLevel', label: 'Level' }],
    supportsDrillDown: true,
  },
  CERTIFICATIONS: {
    id: 'CERTIFICATIONS',
    label: 'Student & Faculty Certifications',
    description: 'Professional and technical certifications earned by students and faculty.',
    category: 'STUDENT',
    countingUnit: 'Certification records & unique earners',
    dateFieldSemantics: 'issuedAt (fallback: createdAt)',
    requiredPermission: 'report:view',
    allowedFilters: ['academicYearId', 'dateRange', 'departmentId', 'batchYear', 'includeUnverified'],
    columns: [
      { key: 'name', label: 'Certification', defaultVisible: true },
      { key: 'issuer', label: 'Issuer', defaultVisible: true },
      { key: 'ownerName', label: 'Holder', defaultVisible: true },
      { key: 'ownerRole', label: 'Role', defaultVisible: true },
      { key: 'departmentCode', label: 'Department', defaultVisible: true },
      { key: 'issuedDate', label: 'Issued Date', defaultVisible: true },
      { key: 'verificationStatus', label: 'Verification', defaultVisible: true },
    ],
    groupingDimensions: [{ key: 'departmentCode', label: 'Department' }, { key: 'ownerRole', label: 'Role' }],
    supportsDrillDown: true,
  },
  INTERNSHIPS: {
    id: 'INTERNSHIPS',
    label: 'Student Internships',
    description: 'Industry and research internships completed or ongoing by students.',
    category: 'STUDENT',
    countingUnit: 'Internship records & unique students',
    dateFieldSemantics: 'startDate (fallback: createdAt)',
    requiredPermission: 'report:view',
    allowedFilters: ['academicYearId', 'dateRange', 'departmentId', 'batchYear', 'includeUnverified'],
    columns: [
      { key: 'company', label: 'Organization', defaultVisible: true },
      { key: 'role', label: 'Role', defaultVisible: true },
      { key: 'studentName', label: 'Student', defaultVisible: true },
      { key: 'departmentCode', label: 'Department', defaultVisible: true },
      { key: 'batchYear', label: 'Batch', defaultVisible: true },
      { key: 'startDate', label: 'Start Date', defaultVisible: true },
      { key: 'stipend', label: 'Stipend', defaultVisible: true },
      { key: 'verificationStatus', label: 'Verification', defaultVisible: true },
    ],
    groupingDimensions: [{ key: 'departmentCode', label: 'Department' }, { key: 'batchYear', label: 'Batch' }],
    supportsDrillDown: true,
  },
  PLACEMENTS: {
    id: 'PLACEMENTS',
    label: 'Placements (Offers vs. Placed Students)',
    description: 'Distinguishes total job offers from unique placed students.',
    category: 'STUDENT',
    countingUnit: 'Job offers AND distinct placed students',
    dateFieldSemantics: 'offerDate (fallback: createdAt)',
    requiredPermission: 'report:view',
    allowedFilters: ['academicYearId', 'dateRange', 'departmentId', 'batchYear', 'includeUnverified'],
    columns: [
      { key: 'studentName', label: 'Student', defaultVisible: true },
      { key: 'enrollmentNumber', label: 'Enrollment No', defaultVisible: true },
      { key: 'departmentCode', label: 'Department', defaultVisible: true },
      { key: 'batchYear', label: 'Batch', defaultVisible: true },
      { key: 'companyName', label: 'Company', defaultVisible: true },
      { key: 'roleTitle', label: 'Role', defaultVisible: true },
      { key: 'packageLpa', label: 'Package (LPA)', defaultVisible: true },
      { key: 'offerStatus', label: 'Offer Status', defaultVisible: true },
      { key: 'verificationStatus', label: 'Verification', defaultVisible: true },
    ],
    groupingDimensions: [{ key: 'departmentCode', label: 'Department' }, { key: 'batchYear', label: 'Batch' }],
    supportsDrillDown: true,
  },
  HIGHER_EDUCATION: {
    id: 'HIGHER_EDUCATION',
    label: 'Higher Education & Career Outcomes',
    description: 'Higher studies admissions, competitive exams, and entrepreneurship outcomes.',
    category: 'STUDENT',
    countingUnit: 'Graduate outcome records & unique students',
    dateFieldSemantics: 'admissionYear / createdAt',
    requiredPermission: 'report:view',
    allowedFilters: ['departmentId', 'batchYear', 'includeUnverified'],
    columns: [
      { key: 'studentName', label: 'Student', defaultVisible: true },
      { key: 'departmentCode', label: 'Department', defaultVisible: true },
      { key: 'outcomeType', label: 'Outcome Type', defaultVisible: true },
      { key: 'institutionOrVenture', label: 'University / Venture', defaultVisible: true },
      { key: 'programOrExam', label: 'Program / Exam', defaultVisible: true },
      { key: 'admissionYear', label: 'Year', defaultVisible: true },
      { key: 'verificationStatus', label: 'Verification', defaultVisible: true },
    ],
    groupingDimensions: [{ key: 'outcomeType', label: 'Outcome Type' }, { key: 'departmentCode', label: 'Department' }],
    supportsDrillDown: false,
  },
  FACULTY_QUALIFICATIONS: {
    id: 'FACULTY_QUALIFICATIONS',
    label: 'Faculty Qualifications',
    description: 'Academic qualifications (Ph.D., M.Tech, etc.) across faculty.',
    category: 'FACULTY',
    countingUnit: 'Qualification records & unique faculty',
    dateFieldSemantics: 'yearOfCompletion (fallback: createdAt)',
    requiredPermission: 'report:view',
    allowedFilters: ['departmentId'],
    columns: [
      { key: 'facultyName', label: 'Faculty Name', defaultVisible: true },
      { key: 'employeeId', label: 'Employee ID', defaultVisible: true },
      { key: 'departmentCode', label: 'Department', defaultVisible: true },
      { key: 'degree', label: 'Degree', defaultVisible: true },
      { key: 'specialization', label: 'Specialization', defaultVisible: true },
      { key: 'institutionName', label: 'Awarding Institution', defaultVisible: true },
      { key: 'yearOfCompletion', label: 'Year', defaultVisible: true },
    ],
    groupingDimensions: [{ key: 'departmentCode', label: 'Department' }, { key: 'degree', label: 'Degree' }],
    supportsDrillDown: false,
  },
  FACULTY_EXPERIENCE: {
    id: 'FACULTY_EXPERIENCE',
    label: 'Faculty Experience & Designation',
    description: 'Faculty teaching and industry experience years by department and designation.',
    category: 'FACULTY',
    countingUnit: 'Unique faculty profiles',
    dateFieldSemantics: 'joiningDate (fallback: createdAt)',
    requiredPermission: 'report:view',
    allowedFilters: ['departmentId'],
    columns: [
      { key: 'facultyName', label: 'Faculty Name', defaultVisible: true },
      { key: 'employeeId', label: 'Employee ID', defaultVisible: true },
      { key: 'departmentCode', label: 'Department', defaultVisible: true },
      { key: 'designation', label: 'Designation', defaultVisible: true },
      { key: 'employmentStatus', label: 'Status', defaultVisible: true },
      { key: 'teachingYears', label: 'Teaching Yrs', defaultVisible: true },
      { key: 'industryYears', label: 'Industry Yrs', defaultVisible: true },
    ],
    groupingDimensions: [{ key: 'departmentCode', label: 'Department' }, { key: 'designation', label: 'Designation' }],
    supportsDrillDown: false,
  },
  RESEARCH_PUBLICATIONS: {
    id: 'RESEARCH_PUBLICATIONS',
    label: 'Research Publications (Deduplicated)',
    description: 'Distinct institutional research publications deduplicated across co-authors.',
    category: 'FACULTY',
    countingUnit: 'Distinct canonical publications & author records',
    dateFieldSemantics: 'publishedAt (fallback: createdAt)',
    requiredPermission: 'report:view',
    allowedFilters: ['academicYearId', 'dateRange', 'departmentId', 'includeUnverified'],
    columns: [
      { key: 'title', label: 'Publication Title', defaultVisible: true },
      { key: 'sourceScope', label: 'Record Type', defaultVisible: true },
      { key: 'venue', label: 'Journal / Conference', defaultVisible: true },
      { key: 'doi', label: 'DOI', defaultVisible: true },
      { key: 'indexing', label: 'Indexing', defaultVisible: true },
      { key: 'authorCount', label: 'Authors', defaultVisible: true },
      { key: 'publishedDate', label: 'Published Date', defaultVisible: true },
      { key: 'verificationStatus', label: 'Verification', defaultVisible: true },
    ],
    groupingDimensions: [{ key: 'sourceScope', label: 'Source' }, { key: 'indexing', label: 'Indexing' }],
    supportsDrillDown: false,
  },
  FACULTY_FDPS: {
    id: 'FACULTY_FDPS',
    label: 'Faculty Development Programs (FDPs / STTPs)',
    description: 'FDPs, workshops, STTPs, and training attended by faculty.',
    category: 'FACULTY',
    countingUnit: 'FDP records & unique faculty',
    dateFieldSemantics: 'startDate (fallback: createdAt)',
    requiredPermission: 'report:view',
    allowedFilters: ['academicYearId', 'dateRange', 'departmentId', 'includeUnverified'],
    columns: [
      { key: 'title', label: 'Program Title', defaultVisible: true },
      { key: 'facultyName', label: 'Faculty', defaultVisible: true },
      { key: 'departmentCode', label: 'Department', defaultVisible: true },
      { key: 'organizer', label: 'Organizer', defaultVisible: true },
      { key: 'mode', label: 'Mode', defaultVisible: true },
      { key: 'startDate', label: 'Start Date', defaultVisible: true },
      { key: 'endDate', label: 'End Date', defaultVisible: true },
      { key: 'verificationStatus', label: 'Verification', defaultVisible: true },
    ],
    groupingDimensions: [{ key: 'departmentCode', label: 'Department' }, { key: 'mode', label: 'Mode' }],
    supportsDrillDown: false,
  },
  FACULTY_CONSULTANCY: {
    id: 'FACULTY_CONSULTANCY',
    label: 'Faculty Consultancy Projects',
    description: 'Industry consultancy assignments and revenue.',
    category: 'FACULTY',
    countingUnit: 'Consultancy records & unique faculty',
    dateFieldSemantics: 'startDate (fallback: createdAt)',
    requiredPermission: 'report:view',
    allowedFilters: ['academicYearId', 'dateRange', 'departmentId', 'includeUnverified'],
    columns: [
      { key: 'title', label: 'Project Title', defaultVisible: true },
      { key: 'facultyName', label: 'Faculty Lead', defaultVisible: true },
      { key: 'departmentCode', label: 'Department', defaultVisible: true },
      { key: 'clientOrganization', label: 'Client', defaultVisible: true },
      { key: 'amount', label: 'Amount', defaultVisible: true },
      { key: 'startDate', label: 'Start Date', defaultVisible: true },
      { key: 'verificationStatus', label: 'Verification', defaultVisible: true },
    ],
    groupingDimensions: [{ key: 'departmentCode', label: 'Department' }],
    supportsDrillDown: false,
  },
  FACULTY_WORKLOAD: {
    id: 'FACULTY_WORKLOAD',
    label: 'Faculty Teaching Workload',
    description: 'Academic-year and semester course teaching assignments and weekly hours.',
    category: 'FACULTY',
    countingUnit: 'Workload entries & unique faculty',
    dateFieldSemantics: 'academicYear & semester',
    requiredPermission: 'report:view',
    allowedFilters: ['departmentId', 'semester'],
    columns: [
      { key: 'facultyName', label: 'Faculty', defaultVisible: true },
      { key: 'departmentCode', label: 'Department', defaultVisible: true },
      { key: 'academicYear', label: 'Academic Year', defaultVisible: true },
      { key: 'semester', label: 'Semester', defaultVisible: true },
      { key: 'courseCode', label: 'Course', defaultVisible: true },
      { key: 'hoursPerWeek', label: 'Hours/Week', defaultVisible: true },
      { key: 'studentCount', label: 'Students', defaultVisible: true },
    ],
    groupingDimensions: [{ key: 'departmentCode', label: 'Department' }, { key: 'academicYear', label: 'Academic Year' }],
    supportsDrillDown: false,
  },
  EVENTS: {
    id: 'EVENTS',
    label: 'Events, Attendance & Winners',
    description: 'Separates registered participants, confirmed attendance, and winners.',
    category: 'EVENT',
    countingUnit: 'Events, registrations, confirmed attendance & winners',
    dateFieldSemantics: 'startsAt',
    requiredPermission: 'report:view',
    allowedFilters: ['academicYearId', 'dateRange', 'departmentId', 'eventType'],
    columns: [
      { key: 'title', label: 'Event Title', defaultVisible: true },
      { key: 'departmentCode', label: 'Department', defaultVisible: true },
      { key: 'category', label: 'Category', defaultVisible: true },
      { key: 'level', label: 'Level', defaultVisible: true },
      { key: 'status', label: 'Status', defaultVisible: true },
      { key: 'registeredCount', label: 'Registered', defaultVisible: true },
      { key: 'confirmedCount', label: 'Confirmed/Attended', defaultVisible: true },
      { key: 'winnersCount', label: 'Winners', defaultVisible: true },
      { key: 'startDate', label: 'Start Date', defaultVisible: true },
    ],
    groupingDimensions: [{ key: 'departmentCode', label: 'Department' }, { key: 'category', label: 'Category' }],
    supportsDrillDown: true,
  },
  CERT_RESEARCH_PATENT: {
    id: 'CERT_RESEARCH_PATENT',
    label: 'Certifications, Research & Patents Summary',
    description: 'Combined summary across student & faculty certifications, papers, and patents.',
    category: 'GOVERNANCE',
    countingUnit: 'Activity records by department and verification status',
    dateFieldSemantics: 'issuedAt / publishedAt / filedAt (fallback: createdAt)',
    requiredPermission: 'report:view',
    allowedFilters: ['academicYearId', 'dateRange', 'departmentId', 'batchYear', 'includeUnverified'],
    columns: [
      { key: 'recordType', label: 'Record Type', defaultVisible: true },
      { key: 'departmentName', label: 'Department', defaultVisible: true },
      { key: 'batchYear', label: 'Batch Year', defaultVisible: true },
      { key: 'verificationStatus', label: 'Verification', defaultVisible: true },
      { key: 'count', label: 'Records', defaultVisible: true },
    ],
    groupingDimensions: [{ key: 'recordType', label: 'Record Type' }],
    supportsDrillDown: false,
  },
  VERIFICATION_AGING: {
    id: 'VERIFICATION_AGING',
    label: 'Verification Queue Aging',
    description: 'Pending verification records aged > 7, > 14, and > 30 days.',
    category: 'GOVERNANCE',
    countingUnit: 'Pending verification records',
    dateFieldSemantics: 'createdAt (submission age)',
    requiredPermission: 'report:view',
    allowedFilters: [],
    columns: [
      { key: 'label', label: 'Record Type', defaultVisible: true },
      { key: 'totalPending', label: 'Total Pending', defaultVisible: true },
      { key: 'olderThan7Days', label: '> 7 Days', defaultVisible: true },
      { key: 'olderThan14Days', label: '> 14 Days', defaultVisible: true },
      { key: 'olderThan30Days', label: '> 30 Days', defaultVisible: true },
    ],
    groupingDimensions: [],
    supportsDrillDown: false,
  },
  COMPLETENESS_LAGGARDS: {
    id: 'COMPLETENESS_LAGGARDS',
    label: 'Profile Completeness Laggards',
    description: 'Students and faculty below the configured profile completeness threshold.',
    category: 'GOVERNANCE',
    countingUnit: 'Unique student & faculty profiles',
    dateFieldSemantics: 'Current profile state',
    requiredPermission: 'report:view',
    allowedFilters: ['departmentId', 'threshold'],
    columns: [
      { key: 'name', label: 'Name', defaultVisible: true },
      { key: 'email', label: 'Email', defaultVisible: true },
      { key: 'role', label: 'Role', defaultVisible: true },
      { key: 'departmentName', label: 'Department', defaultVisible: true },
      { key: 'completenessPercentage', label: 'Completeness %', defaultVisible: true },
      { key: 'missingSummary', label: 'Missing Sections', defaultVisible: true },
    ],
    groupingDimensions: [{ key: 'departmentName', label: 'Department' }],
    supportsDrillDown: false,
  },
  CRITERION_COVERAGE: {
    id: 'CRITERION_COVERAGE',
    label: 'Reference Criterion Tagging Coverage',
    description: 'Count of verified and total records tagged with reference criteria.',
    category: 'GOVERNANCE',
    countingUnit: 'Tagged records per reference criterion',
    dateFieldSemantics: 'Current tagged records',
    requiredPermission: 'report:view',
    allowedFilters: [],
    columns: [
      { key: 'code', label: 'Criterion Code', defaultVisible: true },
      { key: 'label', label: 'Description', defaultVisible: true },
      { key: 'verifiedCount', label: 'Verified Items', defaultVisible: true },
      { key: 'totalTaggedCount', label: 'Total Tagged', defaultVisible: true },
      { key: 'status', label: 'Status', defaultVisible: true },
    ],
    groupingDimensions: [],
    supportsDrillDown: false,
  },
  DATA_QUALITY: {
    id: 'DATA_QUALITY',
    label: 'Data Quality & Missing Evidence Audit',
    description: 'Identifies missing enrollment/employee IDs, missing departments, and unverified or evidence-less claims.',
    category: 'GOVERNANCE',
    countingUnit: 'Profile & record quality flags',
    dateFieldSemantics: 'Current database state',
    requiredPermission: 'report:view',
    allowedFilters: ['departmentId'],
    columns: [
      { key: 'checkName', label: 'Quality Check', defaultVisible: true },
      { key: 'scope', label: 'Scope', defaultVisible: true },
      { key: 'issueCount', label: 'Flagged Count', defaultVisible: true },
      { key: 'severity', label: 'Severity', defaultVisible: true },
      { key: 'recommendation', label: 'Action', defaultVisible: true },
    ],
    groupingDimensions: [],
    supportsDrillDown: false,
  },
}

export const REPORT_PRESETS_LIST = Object.values(REPORT_REGISTRY)
