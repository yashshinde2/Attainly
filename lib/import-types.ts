export const IMPORT_TYPE_KEYS = [
  'STUDENT_IDENTITY',
  'FACULTY_IDENTITY',
  'STUDENT_EDUCATION',
  'SEMESTER_RECORD',
  'ACHIEVEMENT',
  'CERTIFICATION',
  'PROJECT_INTERNSHIP',
  'PLACEMENT_OUTCOME',
  'FACULTY_QUALIFICATION',
  'FACULTY_EXPERIENCE',
  'FACULTY_FDP',
  'RESEARCH_PUBLICATION',
  'PATENT',
  'CONSULTANCY_CONTRIBUTION',
  'TEACHING_WORKLOAD',
] as const

export type ImportTypeKey = (typeof IMPORT_TYPE_KEYS)[number]

export type ImportColumnType = 'string' | 'email' | 'number' | 'integer' | 'date' | 'enum' | 'url' | 'list'

export interface ImportColumnSpec {
  key: string
  label: string
  required?: boolean
  type: ImportColumnType
  enumValues?: readonly string[]
  description: string
  example: string
  aliases?: readonly string[]
}

export interface ImportTypeDefinition {
  key: ImportTypeKey
  label: string
  category: 'Identities' | 'Student Records' | 'Faculty Records' | 'Research & Outreach'
  description: string
  matchKeyDescription: string
  supportsTrustedProvenance: boolean
  adminOnly: boolean
  columns: readonly ImportColumnSpec[]
  sampleRows: readonly Record<string, string>[]
}

export const IMPORT_CATALOG: Record<ImportTypeKey, ImportTypeDefinition> = {
  STUDENT_IDENTITY: {
    key: 'STUDENT_IDENTITY',
    label: 'Student Identities & Profiles',
    category: 'Identities',
    description: 'Provision or update student accounts, enrollment numbers, department/course assignments, and personal profiles.',
    matchKeyDescription: 'Enrollment Number or Email (scoped to institution)',
    supportsTrustedProvenance: false,
    adminOnly: false,
    columns: [
      { key: 'enrollmentNumber', label: 'Enrollment Number', required: true, type: 'string', description: 'Unique institutional roll/enrollment number', example: '2024CSE001', aliases: ['roll_no', 'rollnumber', 'usn', 'reg_no', 'enrollment_no'] },
      { key: 'email', label: 'Email', required: true, type: 'email', description: 'Institutional student email', example: 'aarav.sharma@college.edu', aliases: ['student_email', 'email_id'] },
      { key: 'firstName', label: 'First Name', required: true, type: 'string', description: 'Student first name', example: 'Aarav', aliases: ['first_name', 'fname'] },
      { key: 'lastName', label: 'Last Name', required: true, type: 'string', description: 'Student last name', example: 'Sharma', aliases: ['last_name', 'lname', 'surname'] },
      { key: 'departmentCode', label: 'Department Code', required: true, type: 'string', description: 'Existing department code (e.g. CSE, ECE)', example: 'CSE', aliases: ['dept_code', 'department'] },
      { key: 'courseCode', label: 'Course Code', required: false, type: 'string', description: 'Existing course/program code within department', example: 'BTECH-CSE', aliases: ['program_code', 'course'] },
      { key: 'admissionYear', label: 'Admission Year', required: false, type: 'integer', description: '4-digit admission year', example: '2024', aliases: ['admission_year', 'year_of_admission'] },
      { key: 'currentSemester', label: 'Current Semester', required: false, type: 'integer', description: 'Current semester (1–12)', example: '4', aliases: ['semester', 'sem'] },
      { key: 'batchLabel', label: 'Batch Label', required: false, type: 'string', description: 'Batch name (e.g. 2024-2028)', example: '2024-2028', aliases: ['batch'] },
      { key: 'academicStatus', label: 'Academic Status', required: false, type: 'enum', enumValues: ['ACTIVE', 'ON_LEAVE', 'GRADUATED', 'SUSPENDED', 'ALUMNI'], description: 'Student academic status', example: 'ACTIVE', aliases: ['status'] },
      { key: 'phone', label: 'Phone', required: false, type: 'string', description: 'Contact phone number', example: '+91-9876543210', aliases: ['mobile', 'phone_number'] },
      { key: 'dateOfBirth', label: 'Date of Birth', required: false, type: 'date', description: 'YYYY-MM-DD', example: '2006-05-14', aliases: ['dob'] },
    ],
    sampleRows: [
      { enrollmentNumber: '2024CSE001', email: 'aarav.sharma@college.edu', firstName: 'Aarav', lastName: 'Sharma', departmentCode: 'CSE', courseCode: 'BTECH-CSE', admissionYear: '2024', currentSemester: '4', batchLabel: '2024-2028', academicStatus: 'ACTIVE', phone: '+91-9876543210', dateOfBirth: '2006-05-14' },
    ],
  },

  FACULTY_IDENTITY: {
    key: 'FACULTY_IDENTITY',
    label: 'Faculty Identities & Profiles',
    category: 'Identities',
    description: 'Provision or update faculty accounts, employee IDs, designations, departments, and research identifiers.',
    matchKeyDescription: 'Employee ID or Email (scoped to institution)',
    supportsTrustedProvenance: false,
    adminOnly: true,
    columns: [
      { key: 'employeeId', label: 'Employee ID', required: true, type: 'string', description: 'Unique institutional employee ID', example: 'FAC-CSE-014', aliases: ['emp_id', 'faculty_id'] },
      { key: 'email', label: 'Email', required: true, type: 'email', description: 'Institutional faculty email', example: 'meera.iyer@college.edu', aliases: ['faculty_email'] },
      { key: 'firstName', label: 'First Name', required: true, type: 'string', description: 'Faculty first name', example: 'Meera', aliases: ['first_name'] },
      { key: 'lastName', label: 'Last Name', required: true, type: 'string', description: 'Faculty last name', example: 'Iyer', aliases: ['last_name'] },
      { key: 'departmentCode', label: 'Department Code', required: true, type: 'string', description: 'Existing department code', example: 'CSE', aliases: ['dept_code', 'department'] },
      { key: 'designation', label: 'Designation', required: false, type: 'string', description: 'Academic rank/designation', example: 'Associate Professor', aliases: ['title', 'rank'] },
      { key: 'employmentStatus', label: 'Employment Status', required: false, type: 'enum', enumValues: ['ACTIVE', 'ON_LEAVE', 'VISITING', 'INACTIVE'], description: 'Employment status', example: 'ACTIVE', aliases: ['status'] },
      { key: 'employmentType', label: 'Employment Type', required: false, type: 'string', description: 'Regular / Contract / Visiting', example: 'Regular', aliases: ['emp_type'] },
      { key: 'joiningDate', label: 'Joining Date', required: false, type: 'date', description: 'YYYY-MM-DD', example: '2019-07-01', aliases: ['doj'] },
      { key: 'specialization', label: 'Specialization', required: false, type: 'string', description: 'Area of specialization', example: 'Distributed Systems', aliases: ['area'] },
      { key: 'orcidId', label: 'ORCID ID', required: false, type: 'string', description: 'ORCID identifier', example: '0000-0002-1825-0097', aliases: ['orcid'] },
      { key: 'scopusAuthorId', label: 'Scopus Author ID', required: false, type: 'string', description: 'Scopus Author ID', example: '57201938411', aliases: ['scopus_id'] },
    ],
    sampleRows: [
      { employeeId: 'FAC-CSE-014', email: 'meera.iyer@college.edu', firstName: 'Meera', lastName: 'Iyer', departmentCode: 'CSE', designation: 'Associate Professor', employmentStatus: 'ACTIVE', employmentType: 'Regular', joiningDate: '2019-07-01', specialization: 'Distributed Systems', orcidId: '0000-0002-1825-0097', scopusAuthorId: '57201938411' },
    ],
  },

  STUDENT_EDUCATION: {
    key: 'STUDENT_EDUCATION',
    label: 'Student Previous Education',
    category: 'Student Records',
    description: 'Import 10th, 12th, diploma, or prior degree history linked by student enrollment number.',
    matchKeyDescription: 'Enrollment Number + Level + Institution Name + End Year',
    supportsTrustedProvenance: false,
    adminOnly: false,
    columns: [
      { key: 'enrollmentNumber', label: 'Enrollment Number', required: true, type: 'string', description: 'Existing student enrollment number', example: '2024CSE001', aliases: ['roll_no', 'usn'] },
      { key: 'level', label: 'Level', required: true, type: 'enum', enumValues: ['TENTH', 'TWELFTH', 'DEGREE', 'OTHER'], description: 'Education level', example: 'TWELFTH' },
      { key: 'institutionName', label: 'Institution Name', required: true, type: 'string', description: 'School/college name', example: 'Delhi Public School', aliases: ['school', 'college'] },
      { key: 'boardOrUniversity', label: 'Board / University', required: false, type: 'string', description: 'CBSE / State Board / University', example: 'CBSE', aliases: ['board', 'university'] },
      { key: 'courseOrStream', label: 'Course / Stream', required: false, type: 'string', description: 'Stream or specialization', example: 'PCM', aliases: ['stream'] },
      { key: 'score', label: 'Score / Percentage', required: false, type: 'string', description: 'Percentage or CGPA', example: '94.6%', aliases: ['percentage', 'marks'] },
      { key: 'startYear', label: 'Start Year', required: false, type: 'integer', description: 'Start year (YYYY)', example: '2022' },
      { key: 'endYear', label: 'End Year', required: false, type: 'integer', description: 'Completion year (YYYY)', example: '2024' },
    ],
    sampleRows: [
      { enrollmentNumber: '2024CSE001', level: 'TWELFTH', institutionName: 'Delhi Public School', boardOrUniversity: 'CBSE', courseOrStream: 'PCM', score: '94.6%', startYear: '2022', endYear: '2024' },
    ],
  },

  SEMESTER_RECORD: {
    key: 'SEMESTER_RECORD',
    label: 'Semester Academic Performance',
    category: 'Student Records',
    description: 'Import semester-wise SGPA, cumulative CGPA, and backlog counts for existing students.',
    matchKeyDescription: 'Enrollment Number + Semester Number',
    supportsTrustedProvenance: false,
    adminOnly: false,
    columns: [
      { key: 'enrollmentNumber', label: 'Enrollment Number', required: true, type: 'string', description: 'Existing student enrollment number', example: '2024CSE001', aliases: ['roll_no', 'usn'] },
      { key: 'semesterNumber', label: 'Semester Number', required: true, type: 'integer', description: 'Semester (1–12)', example: '3', aliases: ['semester', 'sem'] },
      { key: 'sgpa', label: 'SGPA', required: true, type: 'number', description: 'Semester GPA (0.00–10.00)', example: '8.75' },
      { key: 'cgpaAtSemester', label: 'CGPA at Semester', required: true, type: 'number', description: 'Cumulative GPA (0.00–10.00)', example: '8.62', aliases: ['cgpa'] },
      { key: 'backlogCount', label: 'Backlog Count', required: false, type: 'integer', description: 'Active backlogs (default 0)', example: '0', aliases: ['backlogs'] },
    ],
    sampleRows: [
      { enrollmentNumber: '2024CSE001', semesterNumber: '3', sgpa: '8.75', cgpaAtSemester: '8.62', backlogCount: '0' },
    ],
  },

  ACHIEVEMENT: {
    key: 'ACHIEVEMENT',
    label: 'Student Achievements',
    category: 'Student Records',
    description: 'Import competition wins, technical/cultural/sports participation, and hackathon awards.',
    matchKeyDescription: 'Enrollment Number + Title + Category + Awarded Date',
    supportsTrustedProvenance: true,
    adminOnly: false,
    columns: [
      { key: 'enrollmentNumber', label: 'Enrollment Number', required: true, type: 'string', description: 'Existing student enrollment number', example: '2024CSE001', aliases: ['roll_no', 'usn'] },
      { key: 'title', label: 'Title', required: true, type: 'string', description: 'Achievement or event title', example: 'Smart India Hackathon Winner' },
      { key: 'category', label: 'Category', required: true, type: 'enum', enumValues: ['TECHNICAL', 'NON_TECHNICAL', 'SPORTS', 'CULTURAL'], description: 'Achievement category', example: 'TECHNICAL' },
      { key: 'status', label: 'Outcome Status', required: true, type: 'enum', enumValues: ['PARTICIPATION', 'WINNER'], description: 'Participation or Winner', example: 'WINNER' },
      { key: 'categoryCode', label: 'Criterion Code', required: false, type: 'string', description: 'Optional criterion tag code', example: 'NAAC-5.3.1' },
      { key: 'participationLevel', label: 'Level', required: false, type: 'string', description: 'College / State / National / International', example: 'National' },
      { key: 'organizer', label: 'Organizer', required: false, type: 'string', description: 'Organizing body', example: 'AICTE & MoE' },
      { key: 'role', label: 'Role', required: false, type: 'string', description: 'Team Lead / Member / Solo', example: 'Team Lead' },
      { key: 'result', label: 'Result / Position', required: false, type: 'string', description: '1st Place / Gold Medal / Finalist', example: '1st Place' },
      { key: 'awardedAt', label: 'Awarded Date', required: false, type: 'date', description: 'YYYY-MM-DD', example: '2025-11-20', aliases: ['date'] },
      { key: 'description', label: 'Description', required: false, type: 'string', description: 'Additional details', example: 'Built AI-assisted water quality monitor' },
    ],
    sampleRows: [
      { enrollmentNumber: '2024CSE001', title: 'Smart India Hackathon Winner', category: 'TECHNICAL', status: 'WINNER', categoryCode: 'NAAC-5.3.1', participationLevel: 'National', organizer: 'AICTE & MoE', role: 'Team Lead', result: '1st Place', awardedAt: '2025-11-20', description: 'Built AI-assisted water quality monitor' },
    ],
  },

  CERTIFICATION: {
    key: 'CERTIFICATION',
    label: 'Student Certifications',
    category: 'Student Records',
    description: 'Import verified or pending professional certifications (NPTEL, AWS, Coursera, etc.).',
    matchKeyDescription: 'Enrollment Number + Certification Name + Credential ID (or Issuer)',
    supportsTrustedProvenance: true,
    adminOnly: false,
    columns: [
      { key: 'enrollmentNumber', label: 'Enrollment Number', required: true, type: 'string', description: 'Existing student enrollment number', example: '2024CSE001', aliases: ['roll_no', 'usn'] },
      { key: 'name', label: 'Certification Name', required: true, type: 'string', description: 'Certificate title', example: 'AWS Certified Cloud Practitioner', aliases: ['title'] },
      { key: 'issuer', label: 'Issuer', required: false, type: 'string', description: 'Issuing organization', example: 'Amazon Web Services' },
      { key: 'credentialId', label: 'Credential ID', required: false, type: 'string', description: 'Unique certificate ID', example: 'AWS-CCP-99481' },
      { key: 'credentialUrl', label: 'Credential URL', required: false, type: 'url', description: 'Verification URL', example: 'https://aws.amazon.com/verification/99481' },
      { key: 'duration', label: 'Duration', required: false, type: 'string', description: 'Course duration', example: '8 weeks' },
      { key: 'issuedAt', label: 'Issued Date', required: false, type: 'date', description: 'YYYY-MM-DD', example: '2025-08-15' },
      { key: 'expiresAt', label: 'Expiry Date', required: false, type: 'date', description: 'YYYY-MM-DD', example: '2028-08-15' },
      { key: 'skillsEarned', label: 'Skills Earned', required: false, type: 'list', description: 'Comma-separated skills', example: 'Cloud Computing, IAM, S3' },
    ],
    sampleRows: [
      { enrollmentNumber: '2024CSE001', name: 'AWS Certified Cloud Practitioner', issuer: 'Amazon Web Services', credentialId: 'AWS-CCP-99481', credentialUrl: 'https://aws.amazon.com/verification/99481', duration: '8 weeks', issuedAt: '2025-08-15', expiresAt: '2028-08-15', skillsEarned: 'Cloud Computing, IAM, S3' },
    ],
  },

  PROJECT_INTERNSHIP: {
    key: 'PROJECT_INTERNSHIP',
    label: 'Projects & Internships',
    category: 'Student Records',
    description: 'Import student academic projects and industry internships (with PPO/conversion tracking).',
    matchKeyDescription: 'Enrollment Number + Record Type + Title/Organization + Start Date',
    supportsTrustedProvenance: true,
    adminOnly: false,
    columns: [
      { key: 'enrollmentNumber', label: 'Enrollment Number', required: true, type: 'string', description: 'Existing student enrollment number', example: '2024CSE001', aliases: ['roll_no', 'usn'] },
      { key: 'recordType', label: 'Record Type', required: true, type: 'enum', enumValues: ['PROJECT', 'INTERNSHIP'], description: 'PROJECT or INTERNSHIP', example: 'INTERNSHIP', aliases: ['type'] },
      { key: 'titleOrOrganization', label: 'Title / Organization', required: true, type: 'string', description: 'Project title or Internship organization', example: 'Infosys Springboard', aliases: ['title', 'organization'] },
      { key: 'role', label: 'Role', required: false, type: 'string', description: 'Internship role (for INTERNSHIP)', example: 'Software Engineering Intern' },
      { key: 'facultyGuide', label: 'Faculty Guide', required: false, type: 'string', description: 'Supervising faculty name', example: 'Dr. Meera Iyer' },
      { key: 'techStack', label: 'Tech Stack', required: false, type: 'list', description: 'Comma-separated technologies', example: 'TypeScript, PostgreSQL, Next.js' },
      { key: 'startDate', label: 'Start Date', required: false, type: 'date', description: 'YYYY-MM-DD', example: '2025-05-01' },
      { key: 'endDate', label: 'End Date', required: false, type: 'date', description: 'YYYY-MM-DD', example: '2025-07-15' },
      { key: 'stipendAmount', label: 'Stipend Amount', required: false, type: 'string', description: 'Monthly stipend (for INTERNSHIP)', example: '25000 INR' },
      { key: 'offerType', label: 'Offer Type', required: false, type: 'enum', enumValues: ['NONE', 'PPO_OFFERED', 'CONVERTED_TO_JOB'], description: 'PPO status (for INTERNSHIP)', example: 'PPO_OFFERED' },
      { key: 'outcomes', label: 'Outcomes', required: false, type: 'string', description: 'Deliverables or outcomes', example: 'Shipped automated billing microservice' },
      { key: 'repositoryUrl', label: 'Repository URL', required: false, type: 'url', description: 'GitHub/project URL (for PROJECT)', example: 'https://github.com/example/project' },
    ],
    sampleRows: [
      { enrollmentNumber: '2024CSE001', recordType: 'INTERNSHIP', titleOrOrganization: 'Infosys Springboard', role: 'Software Engineering Intern', facultyGuide: 'Dr. Meera Iyer', techStack: 'TypeScript, PostgreSQL', startDate: '2025-05-01', endDate: '2025-07-15', stipendAmount: '25000 INR', offerType: 'PPO_OFFERED', outcomes: 'Shipped automated billing microservice', repositoryUrl: '' },
    ],
  },

  PLACEMENT_OUTCOME: {
    key: 'PLACEMENT_OUTCOME',
    label: 'Placement Offers & Graduate Outcomes',
    category: 'Student Records',
    description: 'Import campus placement offers and post-graduation outcomes (higher studies, entrepreneurship, etc.).',
    matchKeyDescription: 'Enrollment Number + Company/Role (Offer) or Enrollment Number (Outcome)',
    supportsTrustedProvenance: true,
    adminOnly: false,
    columns: [
      { key: 'enrollmentNumber', label: 'Enrollment Number', required: true, type: 'string', description: 'Existing student enrollment number', example: '2024CSE001', aliases: ['roll_no', 'usn'] },
      { key: 'recordType', label: 'Record Type', required: true, type: 'enum', enumValues: ['PLACEMENT_OFFER', 'GRADUATE_OUTCOME'], description: 'PLACEMENT_OFFER or GRADUATE_OUTCOME', example: 'PLACEMENT_OFFER', aliases: ['type'] },
      { key: 'companyOrInstitution', label: 'Company / University', required: true, type: 'string', description: 'Employer or university name', example: 'TCS Digital', aliases: ['companyName', 'organizationOrUniversity'] },
      { key: 'roleOrProgram', label: 'Role / Program', required: true, type: 'string', description: 'Job role or higher study program', example: 'Systems Engineer', aliases: ['role', 'programOrRole'] },
      { key: 'packageCtc', label: 'Package CTC', required: false, type: 'string', description: 'Compensation package (for PLACEMENT_OFFER)', example: '7.5 LPA' },
      { key: 'offerStatus', label: 'Offer Status', required: false, type: 'enum', enumValues: ['OFFERED', 'ACCEPTED', 'DECLINED'], description: 'Offer status (for PLACEMENT_OFFER)', example: 'ACCEPTED', aliases: ['status'] },
      { key: 'outcomeType', label: 'Outcome Type', required: false, type: 'enum', enumValues: ['PLACED', 'HIGHER_STUDIES', 'ENTREPRENEURSHIP', 'ALUMNI', 'SEEKING', 'OTHER'], description: 'Outcome type (for GRADUATE_OUTCOME)', example: 'PLACED' },
      { key: 'offeredAt', label: 'Offer / Recorded Date', required: false, type: 'date', description: 'YYYY-MM-DD', example: '2026-01-18', aliases: ['recordedAt'] },
      { key: 'location', label: 'Location', required: false, type: 'string', description: 'City/Country (for GRADUATE_OUTCOME)', example: 'Bengaluru, India' },
    ],
    sampleRows: [
      { enrollmentNumber: '2024CSE001', recordType: 'PLACEMENT_OFFER', companyOrInstitution: 'TCS Digital', roleOrProgram: 'Systems Engineer', packageCtc: '7.5 LPA', offerStatus: 'ACCEPTED', outcomeType: '', offeredAt: '2026-01-18', location: 'Bengaluru, India' },
    ],
  },

  FACULTY_QUALIFICATION: {
    key: 'FACULTY_QUALIFICATION',
    label: 'Faculty Qualifications',
    category: 'Faculty Records',
    description: 'Import academic degrees and qualifications (Ph.D., M.Tech, B.Tech) for existing faculty.',
    matchKeyDescription: 'Employee ID + Qualification + Institution + Year Completed',
    supportsTrustedProvenance: false,
    adminOnly: false,
    columns: [
      { key: 'employeeId', label: 'Employee ID', required: true, type: 'string', description: 'Existing faculty employee ID', example: 'FAC-CSE-014', aliases: ['emp_id'] },
      { key: 'qualification', label: 'Qualification', required: true, type: 'string', description: 'Degree name (e.g. Ph.D., M.Tech)', example: 'Ph.D.', aliases: ['degree'] },
      { key: 'institutionName', label: 'Institution Name', required: true, type: 'string', description: 'Awarding university/institute', example: 'IIT Madras', aliases: ['university'] },
      { key: 'fieldOfStudy', label: 'Field of Study', required: false, type: 'string', description: 'Discipline/specialization', example: 'Computer Science' },
      { key: 'yearCompleted', label: 'Year Completed', required: false, type: 'integer', description: 'Graduation year (YYYY)', example: '2018', aliases: ['year'] },
    ],
    sampleRows: [
      { employeeId: 'FAC-CSE-014', qualification: 'Ph.D.', institutionName: 'IIT Madras', fieldOfStudy: 'Computer Science', yearCompleted: '2018' },
    ],
  },

  FACULTY_EXPERIENCE: {
    key: 'FACULTY_EXPERIENCE',
    label: 'Faculty Experience',
    category: 'Faculty Records',
    description: 'Import prior teaching and industry experience records for faculty members.',
    matchKeyDescription: 'Employee ID + Type + Organization + Title + Start Date',
    supportsTrustedProvenance: false,
    adminOnly: false,
    columns: [
      { key: 'employeeId', label: 'Employee ID', required: true, type: 'string', description: 'Existing faculty employee ID', example: 'FAC-CSE-014', aliases: ['emp_id'] },
      { key: 'type', label: 'Experience Type', required: true, type: 'enum', enumValues: ['TEACHING', 'INDUSTRY'], description: 'TEACHING or INDUSTRY', example: 'TEACHING' },
      { key: 'organization', label: 'Organization', required: true, type: 'string', description: 'Institution or company name', example: 'NIT Trichy' },
      { key: 'title', label: 'Role / Title', required: true, type: 'string', description: 'Position held', example: 'Assistant Professor' },
      { key: 'startDate', label: 'Start Date', required: false, type: 'date', description: 'YYYY-MM-DD', example: '2015-08-01' },
      { key: 'endDate', label: 'End Date', required: false, type: 'date', description: 'YYYY-MM-DD (blank if current)', example: '2019-06-30' },
      { key: 'description', label: 'Description', required: false, type: 'string', description: 'Responsibilities or summary', example: 'Taught Operating Systems and Compilers' },
    ],
    sampleRows: [
      { employeeId: 'FAC-CSE-014', type: 'TEACHING', organization: 'NIT Trichy', title: 'Assistant Professor', startDate: '2015-08-01', endDate: '2019-06-30', description: 'Taught Operating Systems and Compilers' },
    ],
  },

  FACULTY_FDP: {
    key: 'FACULTY_FDP',
    label: 'FDP & Professional Development',
    category: 'Faculty Records',
    description: 'Import Faculty Development Programs, STTPs, workshops, and refresher courses.',
    matchKeyDescription: 'Employee ID + Title + Organizer + Start Date',
    supportsTrustedProvenance: true,
    adminOnly: false,
    columns: [
      { key: 'employeeId', label: 'Employee ID', required: true, type: 'string', description: 'Existing faculty employee ID', example: 'FAC-CSE-014', aliases: ['emp_id'] },
      { key: 'programType', label: 'Program Type', required: false, type: 'string', description: 'FDP / STTP / Workshop / Refresher', example: 'FDP' },
      { key: 'title', label: 'Program Title', required: true, type: 'string', description: 'Title of the FDP/workshop', example: 'AICTE ATAL FDP on Generative AI' },
      { key: 'organizer', label: 'Organizer', required: true, type: 'string', description: 'Organizing institute or agency', example: 'IIIT Hyderabad' },
      { key: 'mode', label: 'Mode', required: false, type: 'enum', enumValues: ['ONLINE', 'OFFLINE', 'HYBRID'], description: 'Delivery mode', example: 'ONLINE' },
      { key: 'durationDays', label: 'Duration (Days)', required: false, type: 'integer', description: 'Number of days', example: '5' },
      { key: 'startDate', label: 'Start Date', required: true, type: 'date', description: 'YYYY-MM-DD', example: '2025-07-07' },
      { key: 'endDate', label: 'End Date', required: true, type: 'date', description: 'YYYY-MM-DD', example: '2025-07-11' },
    ],
    sampleRows: [
      { employeeId: 'FAC-CSE-014', programType: 'FDP', title: 'AICTE ATAL FDP on Generative AI', organizer: 'IIIT Hyderabad', mode: 'ONLINE', durationDays: '5', startDate: '2025-07-07', endDate: '2025-07-11' },
    ],
  },

  RESEARCH_PUBLICATION: {
    key: 'RESEARCH_PUBLICATION',
    label: 'Research Publications',
    category: 'Research & Outreach',
    description: 'Import canonical faculty research publications (journals, conferences, book chapters) linked by DOI and Employee ID.',
    matchKeyDescription: 'DOI (or Title + Published Date) + Employee ID',
    supportsTrustedProvenance: true,
    adminOnly: false,
    columns: [
      { key: 'employeeId', label: 'Author Employee ID', required: true, type: 'string', description: 'Faculty contributor employee ID', example: 'FAC-CSE-014', aliases: ['emp_id'] },
      { key: 'title', label: 'Publication Title', required: true, type: 'string', description: 'Full paper/chapter title', example: 'Byzantine Fault Tolerance in Edge Clusters' },
      { key: 'publicationType', label: 'Publication Type', required: false, type: 'enum', enumValues: ['JOURNAL', 'CONFERENCE', 'BOOK_CHAPTER', 'BOOK'], description: 'JOURNAL, CONFERENCE, BOOK_CHAPTER, or BOOK', example: 'JOURNAL' },
      { key: 'journalOrConference', label: 'Journal / Conference', required: false, type: 'string', description: 'Venue name', example: 'IEEE Transactions on Parallel and Distributed Systems' },
      { key: 'publisher', label: 'Publisher', required: false, type: 'string', description: 'Publisher name', example: 'IEEE' },
      { key: 'doi', label: 'DOI', required: false, type: 'string', description: 'Digital Object Identifier', example: '10.1109/TPDS.2025.100421' },
      { key: 'issnOrIsbn', label: 'ISSN / ISBN', required: false, type: 'string', description: 'ISSN or ISBN number', example: '1045-9219' },
      { key: 'indexing', label: 'Indexing', required: false, type: 'string', description: 'SCI / Scopus / UGC-CARE / Web of Science', example: 'SCI, Scopus' },
      { key: 'authorsText', label: 'Authors List', required: false, type: 'string', description: 'Full author string', example: 'Meera Iyer, R. Kulkarni' },
      { key: 'authorOrder', label: 'Author Order', required: false, type: 'integer', description: 'Contributor position (default 1)', example: '1' },
      { key: 'publishedAt', label: 'Published Date', required: false, type: 'date', description: 'YYYY-MM-DD', example: '2025-09-10' },
    ],
    sampleRows: [
      { employeeId: 'FAC-CSE-014', title: 'Byzantine Fault Tolerance in Edge Clusters', publicationType: 'JOURNAL', journalOrConference: 'IEEE Transactions on Parallel and Distributed Systems', publisher: 'IEEE', doi: '10.1109/TPDS.2025.100421', issnOrIsbn: '1045-9219', indexing: 'SCI, Scopus', authorsText: 'Meera Iyer, R. Kulkarni', authorOrder: '1', publishedAt: '2025-09-10' },
    ],
  },

  PATENT: {
    key: 'PATENT',
    label: 'Patents (Faculty & Student)',
    category: 'Research & Outreach',
    description: 'Import patent filings and grants for faculty (by Employee ID) or students (by Enrollment Number).',
    matchKeyDescription: 'Owner Identifier (Employee ID or Enrollment Number) + Patent Number (or Title)',
    supportsTrustedProvenance: true,
    adminOnly: false,
    columns: [
      { key: 'ownerType', label: 'Owner Type', required: true, type: 'enum', enumValues: ['FACULTY', 'STUDENT'], description: 'FACULTY or STUDENT', example: 'FACULTY' },
      { key: 'ownerIdentifier', label: 'Employee ID / Enrollment No', required: true, type: 'string', description: 'Faculty Employee ID or Student Enrollment Number', example: 'FAC-CSE-014', aliases: ['employeeId', 'enrollmentNumber'] },
      { key: 'title', label: 'Patent Title', required: true, type: 'string', description: 'Title of invention', example: 'Adaptive Low-Power LoRa Mesh Routing' },
      { key: 'patentNumber', label: 'Patent / Application Number', required: false, type: 'string', description: 'Official patent/application number', example: 'IN202541008912' },
      { key: 'status', label: 'Patent Status', required: false, type: 'string', description: 'Filed / Published / Granted', example: 'Published' },
      { key: 'filedAt', label: 'Filed Date', required: false, type: 'date', description: 'YYYY-MM-DD', example: '2025-03-14' },
    ],
    sampleRows: [
      { ownerType: 'FACULTY', ownerIdentifier: 'FAC-CSE-014', title: 'Adaptive Low-Power LoRa Mesh Routing', patentNumber: 'IN202541008912', status: 'Published', filedAt: '2025-03-14' },
    ],
  },

  CONSULTANCY_CONTRIBUTION: {
    key: 'CONSULTANCY_CONTRIBUTION',
    label: 'Consultancy & Institutional Contributions',
    category: 'Research & Outreach',
    description: 'Import industry consultancy engagements and institutional committee/editorial contributions.',
    matchKeyDescription: 'Employee ID + Record Type + Title + Start Date',
    supportsTrustedProvenance: true,
    adminOnly: false,
    columns: [
      { key: 'employeeId', label: 'Employee ID', required: true, type: 'string', description: 'Existing faculty employee ID', example: 'FAC-CSE-014', aliases: ['emp_id'] },
      { key: 'recordType', label: 'Record Type', required: true, type: 'enum', enumValues: ['CONSULTANCY', 'CONTRIBUTION'], description: 'CONSULTANCY or CONTRIBUTION', example: 'CONSULTANCY', aliases: ['type'] },
      { key: 'title', label: 'Title', required: true, type: 'string', description: 'Project or contribution title', example: 'Cloud Security Audit for FinTech Corp' },
      { key: 'organization', label: 'Client / Organization', required: true, type: 'string', description: 'Client org (Consultancy) or Body (Contribution)', example: 'FinTech Corp India', aliases: ['clientOrganization', 'organizationOrBody'] },
      { key: 'contributionType', label: 'Contribution Type', required: false, type: 'string', description: 'Committee / Reviewer / Award / Outreach (for CONTRIBUTION)', example: 'COMMITTEE' },
      { key: 'role', label: 'Role', required: false, type: 'string', description: 'Lead Consultant / Chair / Member', example: 'Lead Consultant' },
      { key: 'amount', label: 'Revenue / Grant Amount', required: false, type: 'string', description: 'Consultancy revenue (for CONSULTANCY)', example: '450000 INR' },
      { key: 'startDate', label: 'Start Date', required: true, type: 'date', description: 'YYYY-MM-DD', example: '2025-04-01' },
      { key: 'endDate', label: 'End Date', required: false, type: 'date', description: 'YYYY-MM-DD', example: '2025-09-30' },
      { key: 'outcomesOrDescription', label: 'Outcomes / Description', required: false, type: 'string', description: 'Summary of deliverables', example: 'Completed ISO-27001 readiness audit' },
    ],
    sampleRows: [
      { employeeId: 'FAC-CSE-014', recordType: 'CONSULTANCY', title: 'Cloud Security Audit for FinTech Corp', organization: 'FinTech Corp India', contributionType: '', role: 'Lead Consultant', amount: '450000 INR', startDate: '2025-04-01', endDate: '2025-09-30', outcomesOrDescription: 'Completed ISO-27001 readiness audit' },
    ],
  },

  TEACHING_WORKLOAD: {
    key: 'TEACHING_WORKLOAD',
    label: 'Teaching Workload',
    category: 'Faculty Records',
    description: 'Import semester-wise faculty subject assignments, weekly hours, and student counts.',
    matchKeyDescription: 'Employee ID + Academic Year + Semester + Subject Name',
    supportsTrustedProvenance: false,
    adminOnly: false,
    columns: [
      { key: 'employeeId', label: 'Employee ID', required: true, type: 'string', description: 'Existing faculty employee ID', example: 'FAC-CSE-014', aliases: ['emp_id'] },
      { key: 'academicYear', label: 'Academic Year', required: true, type: 'string', description: 'Academic year label (e.g. 2025-26)', example: '2025-26', aliases: ['ay'] },
      { key: 'semester', label: 'Semester', required: true, type: 'integer', description: 'Semester number (1–12)', example: '5' },
      { key: 'subjectName', label: 'Subject Name', required: true, type: 'string', description: 'Course/subject name', example: 'Distributed Computing', aliases: ['course_name'] },
      { key: 'subjectCode', label: 'Subject Code', required: false, type: 'string', description: 'Course/subject code', example: 'CS501', aliases: ['course_code'] },
      { key: 'hoursPerWeek', label: 'Hours / Week', required: true, type: 'integer', description: 'Weekly teaching hours (1–40)', example: '4', aliases: ['hours'] },
      { key: 'studentCount', label: 'Student Count', required: false, type: 'integer', description: 'Enrolled students', example: '64', aliases: ['students'] },
    ],
    sampleRows: [
      { employeeId: 'FAC-CSE-014', academicYear: '2025-26', semester: '5', subjectName: 'Distributed Computing', subjectCode: 'CS501', hoursPerWeek: '4', studentCount: '64' },
    ],
  },
}

export function isImportTypeKey(value: string): value is ImportTypeKey {
  return (IMPORT_TYPE_KEYS as readonly string[]).includes(value)
}

export function suggestColumnMapping(
  importType: ImportTypeKey,
  headers: readonly string[],
): Record<string, string> {
  const def = IMPORT_CATALOG[importType]
  const normalizedHeaders = headers.map((h) => ({
    raw: h,
    norm: h.trim().toLowerCase().replace(/[^a-z0-9]/g, ''),
  }))

  const mapping: Record<string, string> = {}
  for (const col of def.columns) {
    const candidates = [col.key, col.label, ...(col.aliases ?? [])].map((c) =>
      c.toLowerCase().replace(/[^a-z0-9]/g, ''),
    )
    const exact = normalizedHeaders.find((h) => candidates.includes(h.norm))
    if (exact) {
      mapping[col.key] = exact.raw
    }
  }
  return mapping
}
