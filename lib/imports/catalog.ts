export const IMPORT_TYPE_IDS = [
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

export type ImportTypeId = (typeof IMPORT_TYPE_IDS)[number]

export type ImportCategory = 'Identities' | 'Student Academics & Career' | 'Faculty & Research'

export interface ImportFieldSpec {
  key: string
  label: string
  required: boolean
  type: 'string' | 'email' | 'number' | 'integer' | 'date' | 'enum' | 'url' | 'list'
  description: string
  example: string
  aliases: string[]
  enumValues?: readonly string[]
}

export interface ImportTypeSpec {
  id: ImportTypeId
  label: string
  category: ImportCategory
  description: string
  matchKeyDescription: string
  adminOnly?: boolean
  supportsTrustedProvenance: boolean
  fields: ImportFieldSpec[]
}

export const IMPORT_CATALOG: Record<ImportTypeId, ImportTypeSpec> = {
  STUDENT_IDENTITY: {
    id: 'STUDENT_IDENTITY',
    label: 'Student Identities & Profiles',
    category: 'Identities',
    description: 'Provision student accounts or update student profiles, enrollment numbers, departments, courses, and batches.',
    matchKeyDescription: 'Matched by Enrollment Number or Email within the institution (never by name alone).',
    supportsTrustedProvenance: false,
    fields: [
      { key: 'enrollmentNumber', label: 'Enrollment Number', required: true, type: 'string', description: 'Unique institutional enrollment / roll number.', example: '2025CSE001', aliases: ['enrollment', 'enrollment_number', 'rollno', 'roll_number', 'regno', 'usn'] },
      { key: 'email', label: 'Institutional Email', required: true, type: 'email', description: 'Unique institutional email address.', example: 'aarav.sharma@attainly.demo', aliases: ['email_id', 'student_email', 'mail'] },
      { key: 'firstName', label: 'First Name', required: true, type: 'string', description: 'Given name.', example: 'Aarav', aliases: ['first_name', 'fname'] },
      { key: 'lastName', label: 'Last Name', required: true, type: 'string', description: 'Family name.', example: 'Sharma', aliases: ['last_name', 'lname', 'surname'] },
      { key: 'departmentCode', label: 'Department Code', required: true, type: 'string', description: 'Existing department code (e.g. CSE, ECE).', example: 'CSE', aliases: ['department', 'dept_code', 'dept'] },
      { key: 'courseCode', label: 'Course Code', required: false, type: 'string', description: 'Existing course code within the department.', example: 'BTECH-CSE', aliases: ['course', 'program_code'] },
      { key: 'admissionYear', label: 'Admission Year', required: false, type: 'integer', description: '4-digit admission year.', example: '2025', aliases: ['admission_year', 'year_of_admission'] },
      { key: 'currentSemester', label: 'Current Semester', required: false, type: 'integer', description: 'Semester number (1-12).', example: '3', aliases: ['semester', 'current_semester', 'sem'] },
      { key: 'batchLabel', label: 'Batch Label', required: false, type: 'string', description: 'Batch cohort label (e.g. 2025-2029).', example: '2025-2029', aliases: ['batch', 'batch_label', 'cohort'] },
      { key: 'academicStatus', label: 'Academic Status', required: false, type: 'enum', description: 'Current academic standing.', example: 'ACTIVE', aliases: ['status', 'academic_status'], enumValues: ['ACTIVE', 'ON_LEAVE', 'GRADUATED', 'SUSPENDED', 'ALUMNI'] },
      { key: 'dateOfBirth', label: 'Date of Birth', required: false, type: 'date', description: 'YYYY-MM-DD format.', example: '2006-05-14', aliases: ['dob', 'birth_date'] },
      { key: 'phone', label: 'Phone', required: false, type: 'string', description: 'Contact phone number.', example: '+91-9876543210', aliases: ['mobile', 'contact'] },
    ],
  },
  FACULTY_IDENTITY: {
    id: 'FACULTY_IDENTITY',
    label: 'Faculty Identities & Profiles',
    category: 'Identities',
    description: 'Provision faculty accounts or update employee IDs, designations, departments, and research identifiers.',
    matchKeyDescription: 'Matched by Employee ID or Email within the institution (never by name alone).',
    adminOnly: true,
    supportsTrustedProvenance: false,
    fields: [
      { key: 'employeeId', label: 'Employee ID', required: true, type: 'string', description: 'Unique institutional employee ID.', example: 'FAC-CSE-101', aliases: ['employee_id', 'emp_id', 'faculty_id', 'staff_id'] },
      { key: 'email', label: 'Institutional Email', required: true, type: 'email', description: 'Unique institutional email address.', example: 'meera.iyer@attainly.demo', aliases: ['email_id', 'faculty_email'] },
      { key: 'firstName', label: 'First Name', required: true, type: 'string', description: 'Given name.', example: 'Meera', aliases: ['first_name', 'fname'] },
      { key: 'lastName', label: 'Last Name', required: true, type: 'string', description: 'Family name.', example: 'Iyer', aliases: ['last_name', 'lname'] },
      { key: 'departmentCode', label: 'Department Code', required: true, type: 'string', description: 'Existing department code.', example: 'CSE', aliases: ['department', 'dept_code', 'dept'] },
      { key: 'designation', label: 'Designation', required: false, type: 'string', description: 'Academic rank / title.', example: 'Associate Professor', aliases: ['title', 'rank'] },
      { key: 'employmentStatus', label: 'Employment Status', required: false, type: 'enum', description: 'Current employment status.', example: 'ACTIVE', aliases: ['status', 'employment_status'], enumValues: ['ACTIVE', 'ON_LEAVE', 'VISITING', 'INACTIVE'] },
      { key: 'employmentType', label: 'Employment Type', required: false, type: 'string', description: 'Regular, Contractual, Adjunct, etc.', example: 'Regular', aliases: ['employment_type', 'contract_type'] },
      { key: 'joiningDate', label: 'Joining Date', required: false, type: 'date', description: 'YYYY-MM-DD format.', example: '2021-07-01', aliases: ['joining_date', 'doj'] },
      { key: 'specialization', label: 'Specialization', required: false, type: 'string', description: 'Primary academic specialization.', example: 'Distributed Systems', aliases: ['area', 'domain'] },
      { key: 'orcidId', label: 'ORCID iD', required: false, type: 'string', description: 'ORCID identifier.', example: '0000-0002-1825-0097', aliases: ['orcid', 'orcid_id'] },
      { key: 'phone', label: 'Phone', required: false, type: 'string', description: 'Contact phone number.', example: '+91-9811122233', aliases: ['mobile', 'contact'] },
    ],
  },
  STUDENT_EDUCATION: {
    id: 'STUDENT_EDUCATION',
    label: 'Student Previous Education',
    category: 'Student Academics & Career',
    description: 'Import prior 10th, 12th, diploma, or degree records linked to existing students.',
    matchKeyDescription: 'Matched to student by Enrollment Number, deduped by (Enrollment, Level, Institution, End Year).',
    supportsTrustedProvenance: false,
    fields: [
      { key: 'enrollmentNumber', label: 'Enrollment Number', required: true, type: 'string', description: 'Existing student enrollment number.', example: '2025CSE001', aliases: ['enrollment', 'enrollment_number', 'rollno'] },
      { key: 'level', label: 'Education Level', required: true, type: 'enum', description: 'Qualification level.', example: 'TWELFTH', aliases: ['education_level', 'degree_level'], enumValues: ['TENTH', 'TWELFTH', 'DEGREE', 'OTHER'] },
      { key: 'institutionName', label: 'School / College Name', required: true, type: 'string', description: 'Issuing school or institution.', example: 'Delhi Public School', aliases: ['institution', 'school', 'college'] },
      { key: 'boardOrUniversity', label: 'Board / University', required: false, type: 'string', description: 'Affiliated board or university.', example: 'CBSE', aliases: ['board', 'university'] },
      { key: 'courseOrStream', label: 'Course / Stream', required: false, type: 'string', description: 'Stream or degree specialization.', example: 'Science (PCM)', aliases: ['stream', 'course', 'branch'] },
      { key: 'score', label: 'Score / Percentage / CGPA', required: false, type: 'string', description: 'Obtained marks or grade.', example: '94.6%', aliases: ['percentage', 'marks', 'cgpa'] },
      { key: 'startYear', label: 'Start Year', required: false, type: 'integer', description: '4-digit start year.', example: '2023', aliases: ['start_year', 'from_year'] },
      { key: 'endYear', label: 'End Year', required: false, type: 'integer', description: '4-digit completion year.', example: '2025', aliases: ['end_year', 'passing_year', 'to_year'] },
    ],
  },
  SEMESTER_RECORD: {
    id: 'SEMESTER_RECORD',
    label: 'Semester Academic Performance',
    category: 'Student Academics & Career',
    description: 'Import semester-wise SGPA, cumulative CGPA, and backlog counts.',
    matchKeyDescription: 'Matched by (Enrollment Number, Semester Number) within the institution.',
    supportsTrustedProvenance: false,
    fields: [
      { key: 'enrollmentNumber', label: 'Enrollment Number', required: true, type: 'string', description: 'Existing student enrollment number.', example: '2025CSE001', aliases: ['enrollment', 'enrollment_number', 'rollno'] },
      { key: 'semesterNumber', label: 'Semester Number', required: true, type: 'integer', description: 'Semester index (1-12).', example: '4', aliases: ['semester', 'sem'] },
      { key: 'sgpa', label: 'SGPA', required: true, type: 'number', description: 'Semester GPA on 0.00-10.00 scale.', example: '8.75', aliases: ['sem_gpa', 'gpa'] },
      { key: 'cgpaAtSemester', label: 'CGPA at Semester', required: true, type: 'number', description: 'Cumulative GPA on 0.00-10.00 scale.', example: '8.62', aliases: ['cgpa', 'cumulative_gpa'] },
      { key: 'backlogCount', label: 'Backlog Count', required: false, type: 'integer', description: 'Active backlogs (>= 0).', example: '0', aliases: ['backlogs', 'arrears'] },
    ],
  },
  ACHIEVEMENT: {
    id: 'ACHIEVEMENT',
    label: 'Student Achievements',
    category: 'Student Academics & Career',
    description: 'Import co-curricular, technical, sports, and cultural achievements.',
    matchKeyDescription: 'Matched to student by Enrollment Number, deduped by (Enrollment, Title, Category, Awarded Date).',
    supportsTrustedProvenance: true,
    fields: [
      { key: 'enrollmentNumber', label: 'Enrollment Number', required: true, type: 'string', description: 'Existing student enrollment number.', example: '2025CSE001', aliases: ['enrollment', 'enrollment_number', 'rollno'] },
      { key: 'title', label: 'Achievement Title', required: true, type: 'string', description: 'Title of award or event.', example: 'Smart India Hackathon Finalist', aliases: ['event_name', 'award_title'] },
      { key: 'category', label: 'Category', required: true, type: 'enum', description: 'Achievement category.', example: 'TECHNICAL', aliases: ['type'], enumValues: ['TECHNICAL', 'NON_TECHNICAL', 'SPORTS', 'CULTURAL'] },
      { key: 'status', label: 'Outcome Status', required: true, type: 'enum', description: 'Winner or Participation.', example: 'WINNER', aliases: ['outcome', 'result_status'], enumValues: ['PARTICIPATION', 'WINNER'] },
      { key: 'categoryCode', label: 'Criterion Code', required: false, type: 'string', description: 'Optional NAAC/NBA criterion code.', example: 'NAAC-5.3.1', aliases: ['criterion', 'criterion_code'] },
      { key: 'participationLevel', label: 'Level', required: false, type: 'string', description: 'Institutional, State, National, International.', example: 'National', aliases: ['level', 'scope'] },
      { key: 'organizer', label: 'Organizer', required: false, type: 'string', description: 'Organizing body.', example: 'AICTE & MoE', aliases: ['host', 'organizing_body'] },
      { key: 'result', label: 'Position / Result', required: false, type: 'string', description: 'Rank or prize.', example: '1st Place', aliases: ['position', 'rank', 'prize'] },
      { key: 'awardedAt', label: 'Awarded Date', required: false, type: 'date', description: 'YYYY-MM-DD format.', example: '2025-11-18', aliases: ['date', 'event_date', 'awarded_at'] },
      { key: 'description', label: 'Description', required: false, type: 'string', description: 'Summary notes.', example: 'Built real-time campus energy monitor.', aliases: ['notes', 'details'] },
    ],
  },
  CERTIFICATION: {
    id: 'CERTIFICATION',
    label: 'Student Certifications',
    category: 'Student Academics & Career',
    description: 'Import verified or historical professional certifications earned by students.',
    matchKeyDescription: 'Matched by Enrollment Number, deduped by Credential ID or (Enrollment, Name, Issuer).',
    supportsTrustedProvenance: true,
    fields: [
      { key: 'enrollmentNumber', label: 'Enrollment Number', required: true, type: 'string', description: 'Existing student enrollment number.', example: '2025CSE001', aliases: ['enrollment', 'enrollment_number', 'rollno'] },
      { key: 'name', label: 'Certification Name', required: true, type: 'string', description: 'Course or credential title.', example: 'AWS Certified Cloud Practitioner', aliases: ['title', 'cert_name', 'course_name'] },
      { key: 'issuer', label: 'Issuer', required: false, type: 'string', description: 'Issuing organization.', example: 'Amazon Web Services', aliases: ['provider', 'organization'] },
      { key: 'credentialId', label: 'Credential ID', required: false, type: 'string', description: 'Certificate serial / ID.', example: 'AWS-CCP-99214', aliases: ['credential_id', 'cert_id'] },
      { key: 'credentialUrl', label: 'Credential URL', required: false, type: 'url', description: 'Verification link.', example: 'https://aws.amazon.com/verification', aliases: ['url', 'verify_url'] },
      { key: 'duration', label: 'Duration', required: false, type: 'string', description: 'Course duration.', example: '40 hours', aliases: ['hours'] },
      { key: 'issuedAt', label: 'Issued Date', required: false, type: 'date', description: 'YYYY-MM-DD format.', example: '2025-09-10', aliases: ['issue_date', 'issued_at'] },
      { key: 'expiresAt', label: 'Expiry Date', required: false, type: 'date', description: 'YYYY-MM-DD format.', example: '2028-09-10', aliases: ['expiry_date', 'expires_at'] },
      { key: 'skillsEarned', label: 'Skills Earned', required: false, type: 'list', description: 'Comma-separated skills.', example: 'AWS, Cloud Architecture', aliases: ['skills'] },
    ],
  },
  PROJECT_INTERNSHIP: {
    id: 'PROJECT_INTERNSHIP',
    label: 'Projects & Internships',
    category: 'Student Academics & Career',
    description: 'Import student academic projects and industry internships in one unified template.',
    matchKeyDescription: 'Matched by Enrollment Number + Record Type (PROJECT or INTERNSHIP) + Title/Organization + Start Date.',
    supportsTrustedProvenance: true,
    fields: [
      { key: 'enrollmentNumber', label: 'Enrollment Number', required: true, type: 'string', description: 'Existing student enrollment number.', example: '2025CSE001', aliases: ['enrollment', 'enrollment_number', 'rollno'] },
      { key: 'recordType', label: 'Record Type', required: true, type: 'enum', description: 'PROJECT or INTERNSHIP.', example: 'INTERNSHIP', aliases: ['type', 'record_type'], enumValues: ['PROJECT', 'INTERNSHIP'] },
      { key: 'titleOrOrganization', label: 'Project Title / Company Name', required: true, type: 'string', description: 'Project title (for PROJECT) or organization (for INTERNSHIP).', example: 'Acme Cloud Labs', aliases: ['title', 'organization', 'company', 'project_title'] },
      { key: 'role', label: 'Role', required: false, type: 'string', description: 'Internship role (e.g. Backend Intern).', example: 'Software Engineering Intern', aliases: ['position', 'designation'] },
      { key: 'facultyGuide', label: 'Faculty Guide', required: false, type: 'string', description: 'Supervising faculty member.', example: 'Dr. Meera Iyer', aliases: ['mentor', 'guide'] },
      { key: 'startDate', label: 'Start Date', required: false, type: 'date', description: 'YYYY-MM-DD format.', example: '2025-05-01', aliases: ['start_date', 'from_date'] },
      { key: 'endDate', label: 'End Date', required: false, type: 'date', description: 'YYYY-MM-DD format.', example: '2025-07-31', aliases: ['end_date', 'to_date'] },
      { key: 'offerType', label: 'Internship Offer Type', required: false, type: 'enum', description: 'PPO conversion status (internships).', example: 'PPO_OFFERED', aliases: ['offer_type'], enumValues: ['NONE', 'PPO_OFFERED', 'CONVERTED_TO_JOB'] },
      { key: 'stipendAmount', label: 'Stipend', required: false, type: 'string', description: 'Monthly stipend (internships).', example: '25000 INR/month', aliases: ['stipend'] },
      { key: 'techStack', label: 'Tech Stack', required: false, type: 'list', description: 'Comma-separated technologies.', example: 'TypeScript, PostgreSQL', aliases: ['skills', 'technologies'] },
      { key: 'outcomes', label: 'Outcomes', required: false, type: 'string', description: 'Deliverables or impact.', example: 'Reduced query latency by 35%', aliases: ['summary', 'description'] },
    ],
  },
  PLACEMENT_OUTCOME: {
    id: 'PLACEMENT_OUTCOME',
    label: 'Placement Offers & Graduate Outcomes',
    category: 'Student Academics & Career',
    description: 'Import campus placement offers and post-graduation progression outcomes.',
    matchKeyDescription: 'Matched by Enrollment Number + Record Type (PLACEMENT_OFFER or GRADUATE_OUTCOME).',
    supportsTrustedProvenance: true,
    fields: [
      { key: 'enrollmentNumber', label: 'Enrollment Number', required: true, type: 'string', description: 'Existing student enrollment number.', example: '2025CSE001', aliases: ['enrollment', 'enrollment_number', 'rollno'] },
      { key: 'recordType', label: 'Record Type', required: true, type: 'enum', description: 'PLACEMENT_OFFER or GRADUATE_OUTCOME.', example: 'PLACEMENT_OFFER', aliases: ['type', 'record_type'], enumValues: ['PLACEMENT_OFFER', 'GRADUATE_OUTCOME'] },
      { key: 'organizationOrUniversity', label: 'Company / University', required: true, type: 'string', description: 'Employer or higher-studies university.', example: 'Infosys', aliases: ['company', 'company_name', 'university', 'organization'] },
      { key: 'programOrRole', label: 'Role / Program', required: false, type: 'string', description: 'Job role or academic degree program.', example: 'Systems Engineer', aliases: ['role', 'program', 'designation'] },
      { key: 'packageCtc', label: 'Package / CTC', required: false, type: 'string', description: 'Annual compensation (offers).', example: '8.5 LPA', aliases: ['ctc', 'package', 'salary'] },
      { key: 'offerStatus', label: 'Offer Status', required: false, type: 'enum', description: 'Placement offer status.', example: 'ACCEPTED', aliases: ['status', 'offer_status'], enumValues: ['OFFERED', 'ACCEPTED', 'DECLINED'] },
      { key: 'outcomeType', label: 'Graduate Outcome Type', required: false, type: 'enum', description: 'Outcome category (graduate outcomes).', example: 'PLACED', aliases: ['outcome_type'], enumValues: ['PLACED', 'HIGHER_STUDIES', 'ENTREPRENEURSHIP', 'ALUMNI', 'SEEKING', 'OTHER'] },
      { key: 'location', label: 'Location', required: false, type: 'string', description: 'City or country.', example: 'Bengaluru', aliases: ['city'] },
      { key: 'offeredAt', label: 'Offer / Recorded Date', required: false, type: 'date', description: 'YYYY-MM-DD format.', example: '2026-02-15', aliases: ['date', 'offered_at', 'recorded_at'] },
    ],
  },
  FACULTY_QUALIFICATION: {
    id: 'FACULTY_QUALIFICATION',
    label: 'Faculty Qualifications',
    category: 'Faculty & Research',
    description: 'Import academic degrees and qualifications for faculty members.',
    matchKeyDescription: 'Matched by Employee ID, deduped by (Employee ID, Qualification, Institution, Year).',
    supportsTrustedProvenance: false,
    fields: [
      { key: 'employeeId', label: 'Employee ID', required: true, type: 'string', description: 'Existing faculty employee ID.', example: 'FAC-CSE-101', aliases: ['employee_id', 'emp_id', 'faculty_id'] },
      { key: 'qualification', label: 'Qualification / Degree', required: true, type: 'string', description: 'Degree title (e.g. Ph.D., M.Tech).', example: 'Ph.D.', aliases: ['degree', 'title'] },
      { key: 'institutionName', label: 'Awarding University / Institution', required: true, type: 'string', description: 'University or institute name.', example: 'IIT Bombay', aliases: ['university', 'institution'] },
      { key: 'fieldOfStudy', label: 'Field of Study', required: false, type: 'string', description: 'Specialization / discipline.', example: 'Computer Science & Engineering', aliases: ['specialization', 'field', 'stream'] },
      { key: 'yearCompleted', label: 'Year Completed', required: false, type: 'integer', description: '4-digit graduation year.', example: '2019', aliases: ['year', 'year_completed', 'passing_year'] },
    ],
  },
  FACULTY_EXPERIENCE: {
    id: 'FACULTY_EXPERIENCE',
    label: 'Faculty Experience',
    category: 'Faculty & Research',
    description: 'Import teaching and industry experience history for faculty members.',
    matchKeyDescription: 'Matched by Employee ID, deduped by (Employee ID, Type, Organization, Title, Start Date).',
    supportsTrustedProvenance: false,
    fields: [
      { key: 'employeeId', label: 'Employee ID', required: true, type: 'string', description: 'Existing faculty employee ID.', example: 'FAC-CSE-101', aliases: ['employee_id', 'emp_id', 'faculty_id'] },
      { key: 'type', label: 'Experience Type', required: true, type: 'enum', description: 'TEACHING or INDUSTRY.', example: 'TEACHING', aliases: ['experience_type'], enumValues: ['TEACHING', 'INDUSTRY'] },
      { key: 'organization', label: 'Organization / Institution', required: true, type: 'string', description: 'Employer or university.', example: 'NIT Surathkal', aliases: ['company', 'institution'] },
      { key: 'title', label: 'Role / Designation', required: true, type: 'string', description: 'Position held.', example: 'Assistant Professor', aliases: ['designation', 'role'] },
      { key: 'startDate', label: 'Start Date', required: false, type: 'date', description: 'YYYY-MM-DD format.', example: '2018-08-01', aliases: ['start_date', 'from_date'] },
      { key: 'endDate', label: 'End Date', required: false, type: 'date', description: 'YYYY-MM-DD format (blank if current).', example: '2021-06-30', aliases: ['end_date', 'to_date'] },
      { key: 'description', label: 'Description', required: false, type: 'string', description: 'Responsibilities or courses taught.', example: 'Taught Operating Systems and Compilers.', aliases: ['notes'] },
    ],
  },
  FACULTY_FDP: {
    id: 'FACULTY_FDP',
    label: 'FDP & Professional Development',
    category: 'Faculty & Research',
    description: 'Import Faculty Development Programs, STTPs, workshops, and refresher courses.',
    matchKeyDescription: 'Matched by Employee ID, deduped by (Employee ID, Title, Organizer, Start Date).',
    supportsTrustedProvenance: true,
    fields: [
      { key: 'employeeId', label: 'Employee ID', required: true, type: 'string', description: 'Existing faculty employee ID.', example: 'FAC-CSE-101', aliases: ['employee_id', 'emp_id', 'faculty_id'] },
      { key: 'programType', label: 'Program Type', required: false, type: 'string', description: 'FDP, STTP, Workshop, Refresher, etc.', example: 'FDP', aliases: ['type', 'program_type'] },
      { key: 'title', label: 'Program Title', required: true, type: 'string', description: 'Name of the FDP / workshop.', example: 'AI & Deep Learning Pedagogy', aliases: ['name', 'program_title'] },
      { key: 'organizer', label: 'Organizer', required: true, type: 'string', description: 'Host institute or agency.', example: 'AICTE ATAL Academy', aliases: ['host', 'institution'] },
      { key: 'mode', label: 'Delivery Mode', required: false, type: 'enum', description: 'ONLINE, OFFLINE, or HYBRID.', example: 'ONLINE', aliases: ['delivery_mode'], enumValues: ['ONLINE', 'OFFLINE', 'HYBRID'] },
      { key: 'startDate', label: 'Start Date', required: true, type: 'date', description: 'YYYY-MM-DD format.', example: '2025-01-06', aliases: ['start_date', 'from_date'] },
      { key: 'endDate', label: 'End Date', required: true, type: 'date', description: 'YYYY-MM-DD format.', example: '2025-01-10', aliases: ['end_date', 'to_date'] },
      { key: 'durationDays', label: 'Duration (Days)', required: false, type: 'integer', description: 'Number of days.', example: '5', aliases: ['days', 'duration'] },
    ],
  },
  RESEARCH_PUBLICATION: {
    id: 'RESEARCH_PUBLICATION',
    label: 'Research Publications',
    category: 'Faculty & Research',
    description: 'Import canonical institutional research publications and link faculty contributors by Employee ID.',
    matchKeyDescription: 'Matched by DOI (or Title + Published Date) and linked to Faculty via Employee ID.',
    supportsTrustedProvenance: true,
    fields: [
      { key: 'employeeId', label: 'Primary Faculty Employee ID', required: true, type: 'string', description: 'Contributor faculty employee ID.', example: 'FAC-CSE-101', aliases: ['employee_id', 'emp_id', 'faculty_id'] },
      { key: 'title', label: 'Publication Title', required: true, type: 'string', description: 'Full paper or book title.', example: 'Scalable Federated Learning on Edge Clusters', aliases: ['paper_title'] },
      { key: 'publicationType', label: 'Publication Type', required: false, type: 'enum', description: 'Type of publication.', example: 'JOURNAL', aliases: ['type', 'pub_type'], enumValues: ['JOURNAL', 'CONFERENCE', 'BOOK_CHAPTER', 'BOOK'] },
      { key: 'journalOrConference', label: 'Journal / Conference Name', required: false, type: 'string', description: 'Venue name.', example: 'IEEE Transactions on Parallel Systems', aliases: ['journal', 'conference', 'venue'] },
      { key: 'publisher', label: 'Publisher', required: false, type: 'string', description: 'Publishing house.', example: 'IEEE', aliases: ['pub'] },
      { key: 'doi', label: 'DOI', required: false, type: 'string', description: 'Digital Object Identifier.', example: '10.1109/TPDS.2025.10042', aliases: ['doi_number'] },
      { key: 'issnOrIsbn', label: 'ISSN / ISBN', required: false, type: 'string', description: 'ISSN or ISBN number.', example: '1045-9219', aliases: ['issn', 'isbn'] },
      { key: 'indexing', label: 'Indexing', required: false, type: 'string', description: 'Scopus, WoS, UGC Care, IEEE, etc.', example: 'Scopus', aliases: ['index'] },
      { key: 'authorsText', label: 'Authors List', required: false, type: 'string', description: 'Formatted authors string.', example: 'M. Iyer, R. Kulkarni', aliases: ['authors'] },
      { key: 'publishedAt', label: 'Published Date', required: false, type: 'date', description: 'YYYY-MM-DD format.', example: '2025-04-15', aliases: ['date', 'pub_date'] },
      { key: 'authorOrder', label: 'Author Order', required: false, type: 'integer', description: 'Position of this faculty author (1 = first).', example: '1', aliases: ['order'] },
      { key: 'authorRole', label: 'Author Role', required: false, type: 'string', description: 'First Author, Corresponding Author, Co-Author.', example: 'First Author', aliases: ['role'] },
    ],
  },
  PATENT: {
    id: 'PATENT',
    label: 'Patents',
    category: 'Faculty & Research',
    description: 'Import faculty or student patents matched by Employee ID or Enrollment Number.',
    matchKeyDescription: 'Matched by Owner ID (Employee ID or Enrollment Number) + Patent Number (or Title).',
    supportsTrustedProvenance: true,
    fields: [
      { key: 'ownerType', label: 'Owner Type', required: true, type: 'enum', description: 'FACULTY or STUDENT.', example: 'FACULTY', aliases: ['person_type', 'owner_type'], enumValues: ['FACULTY', 'STUDENT'] },
      { key: 'ownerIdentifier', label: 'Employee ID or Enrollment No.', required: true, type: 'string', description: 'Employee ID (for FACULTY) or Enrollment No. (for STUDENT).', example: 'FAC-CSE-101', aliases: ['employeeId', 'employee_id', 'enrollmentNumber', 'enrollment_number', 'identifier'] },
      { key: 'title', label: 'Patent Title', required: true, type: 'string', description: 'Title of invention.', example: 'Low-Power Smart Grid Fault Detector', aliases: ['patent_title'] },
      { key: 'patentNumber', label: 'Patent / Application Number', required: false, type: 'string', description: 'Official filing or grant number.', example: 'IN202541008812', aliases: ['patent_number', 'application_no'] },
      { key: 'status', label: 'Patent Status', required: false, type: 'string', description: 'Filed, Published, Granted, etc.', example: 'Published', aliases: ['patent_status'] },
      { key: 'filedAt', label: 'Filed Date', required: false, type: 'date', description: 'YYYY-MM-DD format.', example: '2025-03-20', aliases: ['filed_at', 'filing_date', 'date'] },
    ],
  },
  CONSULTANCY_CONTRIBUTION: {
    id: 'CONSULTANCY_CONTRIBUTION',
    label: 'Consultancy & Institutional Contributions',
    category: 'Faculty & Research',
    description: 'Import faculty consultancy engagements and institutional/committee contributions.',
    matchKeyDescription: 'Matched by Employee ID + Record Type (CONSULTANCY or CONTRIBUTION) + Title + Start Date.',
    supportsTrustedProvenance: true,
    fields: [
      { key: 'employeeId', label: 'Employee ID', required: true, type: 'string', description: 'Existing faculty employee ID.', example: 'FAC-CSE-101', aliases: ['employee_id', 'emp_id', 'faculty_id'] },
      { key: 'recordType', label: 'Record Type', required: true, type: 'enum', description: 'CONSULTANCY or CONTRIBUTION.', example: 'CONSULTANCY', aliases: ['type', 'record_type'], enumValues: ['CONSULTANCY', 'CONTRIBUTION'] },
      { key: 'title', label: 'Title', required: true, type: 'string', description: 'Project or contribution title.', example: 'Cloud Security Audit for FinTech Corp', aliases: ['project_title', 'name'] },
      { key: 'organization', label: 'Client / Committee / Body', required: true, type: 'string', description: 'Client organization (consultancy) or committee/body (contribution).', example: 'FinTech Corp', aliases: ['client', 'clientOrganization', 'organizationOrBody'] },
      { key: 'contributionType', label: 'Contribution Category', required: false, type: 'string', description: 'Required for CONTRIBUTION (e.g. COMMITTEE, AWARD, REVIEWER).', example: 'COMMITTEE', aliases: ['category', 'contribution_type'] },
      { key: 'role', label: 'Role', required: false, type: 'string', description: 'Lead Consultant, Chair, Member, etc.', example: 'Lead Consultant', aliases: ['position'] },
      { key: 'amount', label: 'Consultancy Amount', required: false, type: 'string', description: 'Contract value (consultancies).', example: '350000 INR', aliases: ['value', 'revenue'] },
      { key: 'startDate', label: 'Start Date', required: true, type: 'date', description: 'YYYY-MM-DD format.', example: '2025-06-01', aliases: ['start_date', 'from_date'] },
      { key: 'endDate', label: 'End Date', required: false, type: 'date', description: 'YYYY-MM-DD format.', example: '2025-09-30', aliases: ['end_date', 'to_date'] },
      { key: 'description', label: 'Outcomes / Description', required: false, type: 'string', description: 'Summary of outcomes.', example: 'Delivered compliance roadmap.', aliases: ['outcomes', 'notes'] },
    ],
  },
  TEACHING_WORKLOAD: {
    id: 'TEACHING_WORKLOAD',
    label: 'Teaching Workload',
    category: 'Faculty & Research',
    description: 'Import semester-wise faculty teaching load, course assignments, and weekly hours.',
    matchKeyDescription: 'Matched by Employee ID + Academic Year + Semester + Subject Name.',
    supportsTrustedProvenance: false,
    fields: [
      { key: 'employeeId', label: 'Employee ID', required: true, type: 'string', description: 'Existing faculty employee ID.', example: 'FAC-CSE-101', aliases: ['employee_id', 'emp_id', 'faculty_id'] },
      { key: 'academicYear', label: 'Academic Year', required: true, type: 'string', description: 'Academic year label (e.g. 2025-26).', example: '2025-26', aliases: ['academic_year', 'ay'] },
      { key: 'semester', label: 'Semester', required: true, type: 'integer', description: 'Semester number (1-12).', example: '5', aliases: ['sem'] },
      { key: 'subjectName', label: 'Subject Name', required: true, type: 'string', description: 'Course / subject title.', example: 'Database Management Systems', aliases: ['subject', 'course_name'] },
      { key: 'subjectCode', label: 'Subject Code', required: false, type: 'string', description: 'Course code.', example: 'CS301', aliases: ['course_code', 'code'] },
      { key: 'hoursPerWeek', label: 'Hours / Week', required: true, type: 'integer', description: 'Weekly contact hours (1-40).', example: '4', aliases: ['hours', 'weekly_hours'] },
      { key: 'studentCount', label: 'Student Count', required: false, type: 'integer', description: 'Enrolled students (>= 0).', example: '64', aliases: ['students', 'enrollment_count'] },
    ],
  },
}

export const IMPORT_CATALOG_LIST: ImportTypeSpec[] = IMPORT_TYPE_IDS.map((id) => IMPORT_CATALOG[id])

export function isValidImportType(value: string): value is ImportTypeId {
  return (IMPORT_TYPE_IDS as readonly string[]).includes(value)
}

function normalizeHeaderToken(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, '')
}

/**
 * Suggests a mapping from canonical field keys -> uploaded spreadsheet column headers.
 */
export function suggestColumnMapping(
  typeId: ImportTypeId,
  headers: string[],
): Record<string, string> {
  const spec = IMPORT_CATALOG[typeId]
  const normalizedToHeader = new Map<string, string>()
  for (const h of headers) {
    const norm = normalizeHeaderToken(h)
    if (norm && !normalizedToHeader.has(norm)) {
      normalizedToHeader.set(norm, h)
    }
  }

  const mapping: Record<string, string> = {}
  for (const field of spec.fields) {
    const candidates = [field.key, field.label, ...field.aliases].map(normalizeHeaderToken)
    for (const candidate of candidates) {
      const matched = normalizedToHeader.get(candidate)
      if (matched) {
        mapping[field.key] = matched
        break
      }
    }
  }
  return mapping
}
