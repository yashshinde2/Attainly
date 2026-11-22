'use client'

import { useActionState, useState } from 'react'
import {
  saveStudentProfile,
  addStudentAchievement,
  addStudentEducation,
  addStudentCertification,
  addStudentResearchPaper,
  addStudentPatent,
  addStudentProject,
  addStudentInternship,
  type StudentActionState,
} from '@/app/actions/student'
import type {
  Achievement,
  StudentProfile,
  StudentEducation,
  StudentCertification,
  StudentResearchPaper,
  StudentPatent,
  StudentProject,
  StudentInternship,
} from '@/generated/prisma/client'
import type { EventParticipationWithEvent } from '@/lib/server/repositories/event-repository'
import { ResumePdfDocument } from './resume-pdf-document'

const initialState: StudentActionState = { status: 'idle', message: '' }
const fieldClass =
  'mt-2 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring'
const labelClass = 'text-sm font-medium text-foreground'

function ActionMessage({ state }: { state: StudentActionState }) {
  if (!state.message) return null
  return (
    <p
      role={state.status === 'error' ? 'alert' : 'status'}
      className={`mt-3 text-sm ${state.status === 'error' ? 'text-destructive' : 'text-primary'}`}
    >
      {state.message}
    </p>
  )
}

function DocumentUploadField({
  id,
  name,
  label = 'Document / Certificate',
}: {
  id: string
  name: string
  label?: string
}) {
  const [fileUrl, setFileUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError('')
    const fd = new FormData()
    fd.append('file', file)
    try {
      const res = await fetch('/api/documents', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      setFileUrl(data.fileUrl)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <label htmlFor={id} className={labelClass}>{label}</label>
      <input type="hidden" name={name} value={fileUrl} />
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <input
          id={id}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg"
          onChange={handleUpload}
          className="text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-secondary-foreground hover:file:opacity-90"
        />
        {uploading && <span className="text-xs text-muted-foreground">Uploading document…</span>}
        {fileUrl && (
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
            ✓ Document attached
          </span>
        )}
      </div>
      {uploadError && <p className="mt-1 text-xs text-destructive">{uploadError}</p>}
    </div>
  )
}

// ---------------- Section Forms ----------------

function ProfileForm({ profile }: { profile: StudentProfile | null }) {
  const [state, action, pending] = useActionState(saveStudentProfile, initialState)
  return (
    <form action={action} className="flex flex-col gap-5">
      <div>
        <label htmlFor="dateOfBirth" className={labelClass}>Date of birth</label>
        <input
          id="dateOfBirth"
          name="dateOfBirth"
          type="date"
          defaultValue={profile?.dateOfBirth?.toISOString().slice(0, 10) ?? ''}
          className={fieldClass}
        />
      </div>
      <div>
        <label htmlFor="phone" className={labelClass}>Phone</label>
        <input
          id="phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          defaultValue={profile?.phone ?? ''}
          maxLength={40}
          className={fieldClass}
          placeholder="+1 (555) 000-0000"
        />
      </div>
      <div>
        <label htmlFor="address" className={labelClass}>Address</label>
        <textarea
          id="address"
          name="address"
          rows={3}
          defaultValue={profile?.address ?? ''}
          maxLength={500}
          className={fieldClass}
          placeholder="Street, City, Postal Code"
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? 'Saving…' : 'Save profile'}
        </button>
        <ActionMessage state={state} />
      </div>
    </form>
  )
}

function EducationForm() {
  const [state, action, pending] = useActionState(addStudentEducation, initialState)
  return (
    <form action={action} className="flex flex-col gap-4 border-b border-border pb-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="edu-level" className={labelClass}>Level</label>
          <select id="edu-level" name="level" className={fieldClass} defaultValue="DEGREE">
            <option value="DEGREE">Degree / Undergraduate</option>
            <option value="TWELFTH">12th Grade / Senior Secondary</option>
            <option value="TENTH">10th Grade / Secondary</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
        <div>
          <label htmlFor="edu-inst" className={labelClass}>Institution name</label>
          <input
            id="edu-inst"
            name="institutionName"
            required
            maxLength={180}
            className={fieldClass}
            placeholder="e.g. Stanford University"
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="edu-board" className={labelClass}>Board or University</label>
          <input
            id="edu-board"
            name="boardOrUniversity"
            maxLength={180}
            className={fieldClass}
            placeholder="e.g. State Board or University Name"
          />
        </div>
        <div>
          <label htmlFor="edu-stream" className={labelClass}>Specialization / Stream</label>
          <input
            id="edu-stream"
            name="courseOrStream"
            maxLength={180}
            className={fieldClass}
            placeholder="e.g. Computer Science Engineering"
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="edu-score" className={labelClass}>Score / Percentage / CGPA</label>
          <input
            id="edu-score"
            name="score"
            maxLength={50}
            className={fieldClass}
            placeholder="e.g. 3.9 / 4.0 or 88%"
          />
        </div>
        <div>
          <label htmlFor="edu-start" className={labelClass}>Start year</label>
          <input
            id="edu-start"
            name="startYear"
            type="number"
            min={1950}
            max={2100}
            className={fieldClass}
            placeholder="2022"
          />
        </div>
        <div>
          <label htmlFor="edu-end" className={labelClass}>Completion year</label>
          <input
            id="edu-end"
            name="endYear"
            type="number"
            min={1950}
            max={2100}
            className={fieldClass}
            placeholder="2026"
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? 'Adding…' : 'Add education'}
        </button>
        <ActionMessage state={state} />
      </div>
    </form>
  )
}

function AchievementForm() {
  const [state, action, pending] = useActionState(addStudentAchievement, initialState)
  return (
    <form action={action} className="flex flex-col gap-4 border-b border-border pb-6">
      <div>
        <label htmlFor="achievement-title" className={labelClass}>Title</label>
        <input
          id="achievement-title"
          name="title"
          required
          maxLength={180}
          className={fieldClass}
          placeholder="e.g. 1st Place at National Hackathon"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="achievement-category" className={labelClass}>Category</label>
          <select id="achievement-category" name="category" className={fieldClass} defaultValue="TECHNICAL">
            <option value="TECHNICAL">Technical</option>
            <option value="NON_TECHNICAL">Non-technical</option>
            <option value="SPORTS">Sports</option>
            <option value="CULTURAL">Cultural</option>
          </select>
        </div>
        <div>
          <label htmlFor="achievement-status" className={labelClass}>Recognition</label>
          <select id="achievement-status" name="status" className={fieldClass} defaultValue="PARTICIPATION">
            <option value="PARTICIPATION">Participation</option>
            <option value="WINNER">Winner</option>
          </select>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="achievement-awarded-at" className={labelClass}>Awarded on</label>
          <input id="achievement-awarded-at" name="awardedAt" type="date" className={fieldClass} />
        </div>
        <div>
          <label htmlFor="achievement-description" className={labelClass}>Description</label>
          <input
            id="achievement-description"
            name="description"
            maxLength={2000}
            className={fieldClass}
            placeholder="Details about the award or project"
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? 'Adding…' : 'Add achievement'}
        </button>
        <ActionMessage state={state} />
      </div>
    </form>
  )
}

function CertificationForm() {
  const [state, action, pending] = useActionState(addStudentCertification, initialState)
  return (
    <form action={action} className="flex flex-col gap-4 border-b border-border pb-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="cert-name" className={labelClass}>Certification title</label>
          <input
            id="cert-name"
            name="name"
            required
            maxLength={180}
            className={fieldClass}
            placeholder="e.g. AWS Certified Cloud Practitioner"
          />
        </div>
        <div>
          <label htmlFor="cert-issuer" className={labelClass}>Issuer / Organization</label>
          <input
            id="cert-issuer"
            name="issuer"
            maxLength={180}
            className={fieldClass}
            placeholder="e.g. Amazon Web Services"
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="cert-date" className={labelClass}>Issue date</label>
          <input id="cert-date" name="issuedAt" type="date" className={fieldClass} />
        </div>
        <DocumentUploadField id="cert-doc" name="fileUrl" label="Certificate document" />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? 'Adding…' : 'Add certification'}
        </button>
        <ActionMessage state={state} />
      </div>
    </form>
  )
}

function ResearchPaperForm() {
  const [state, action, pending] = useActionState(addStudentResearchPaper, initialState)
  return (
    <form action={action} className="flex flex-col gap-4 border-b border-border pb-6">
      <div>
        <label htmlFor="paper-title" className={labelClass}>Paper title</label>
        <input
          id="paper-title"
          name="title"
          required
          maxLength={250}
          className={fieldClass}
          placeholder="e.g. Scalable Graph Neural Networks for Recommendation"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="paper-pub" className={labelClass}>Conference / Venue</label>
          <input
            id="paper-pub"
            name="publication"
            maxLength={250}
            className={fieldClass}
            placeholder="e.g. IEEE BigData 2025"
          />
        </div>
        <div>
          <label htmlFor="paper-doi" className={labelClass}>DOI or Paper Link</label>
          <input
            id="paper-doi"
            name="doi"
            maxLength={200}
            className={fieldClass}
            placeholder="10.1145/... or https://..."
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="paper-date" className={labelClass}>Publication date</label>
          <input id="paper-date" name="publishedAt" type="date" className={fieldClass} />
        </div>
        <DocumentUploadField id="paper-doc" name="fileUrl" label="Paper PDF" />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? 'Adding…' : 'Add paper'}
        </button>
        <ActionMessage state={state} />
      </div>
    </form>
  )
}

function PatentForm() {
  const [state, action, pending] = useActionState(addStudentPatent, initialState)
  return (
    <form action={action} className="flex flex-col gap-4 border-b border-border pb-6">
      <div>
        <label htmlFor="patent-title" className={labelClass}>Patent title</label>
        <input
          id="patent-title"
          name="title"
          required
          maxLength={250}
          className={fieldClass}
          placeholder="e.g. Distributed Key-Value Store with Adaptive Replication"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="patent-number" className={labelClass}>Patent / Application number</label>
          <input
            id="patent-number"
            name="patentNumber"
            maxLength={100}
            className={fieldClass}
            placeholder="e.g. US 2025/0123456"
          />
        </div>
        <div>
          <label htmlFor="patent-status" className={labelClass}>Status</label>
          <select id="patent-status" name="status" className={fieldClass} defaultValue="FILED">
            <option value="FILED">Filed</option>
            <option value="PENDING">Pending</option>
            <option value="GRANTED">Granted</option>
          </select>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="patent-date" className={labelClass}>Filing date</label>
          <input id="patent-date" name="filedAt" type="date" className={fieldClass} />
        </div>
        <DocumentUploadField id="patent-doc" name="fileUrl" label="Patent document" />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? 'Adding…' : 'Add patent'}
        </button>
        <ActionMessage state={state} />
      </div>
    </form>
  )
}

function ProjectForm() {
  const [state, action, pending] = useActionState(addStudentProject, initialState)
  return (
    <form action={action} className="flex flex-col gap-4 border-b border-border pb-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="proj-title" className={labelClass}>Project title</label>
          <input
            id="proj-title"
            name="title"
            required
            maxLength={180}
            className={fieldClass}
            placeholder="e.g. Autonomous Campus Delivery Rover"
          />
        </div>
        <div>
          <label htmlFor="proj-link" className={labelClass}>Repository or Demo URL</label>
          <input
            id="proj-link"
            name="repositoryUrl"
            maxLength={2000}
            className={fieldClass}
            placeholder="https://github.com/..."
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="proj-start" className={labelClass}>Start date</label>
          <input id="proj-start" name="startDate" type="date" className={fieldClass} />
        </div>
        <div>
          <label htmlFor="proj-end" className={labelClass}>End date (blank if ongoing)</label>
          <input id="proj-end" name="endDate" type="date" className={fieldClass} />
        </div>
      </div>
      <div>
        <label htmlFor="proj-desc" className={labelClass}>Description, Tech Stack, &amp; Role</label>
        <textarea
          id="proj-desc"
          name="description"
          rows={3}
          maxLength={2000}
          className={fieldClass}
          placeholder="Implemented computer vision pipeline using Python and ROS2..."
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? 'Adding…' : 'Add project'}
        </button>
        <ActionMessage state={state} />
      </div>
    </form>
  )
}

function InternshipForm() {
  const [state, action, pending] = useActionState(addStudentInternship, initialState)
  return (
    <form action={action} className="flex flex-col gap-4 border-b border-border pb-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="intern-org" className={labelClass}>Company / Organization</label>
          <input
            id="intern-org"
            name="organization"
            required
            maxLength={180}
            className={fieldClass}
            placeholder="e.g. Microsoft"
          />
        </div>
        <div>
          <label htmlFor="intern-role" className={labelClass}>Role / Title</label>
          <input
            id="intern-role"
            name="role"
            maxLength={180}
            className={fieldClass}
            placeholder="e.g. Software Engineering Intern"
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="intern-start" className={labelClass}>Start date</label>
          <input id="intern-start" name="startDate" type="date" className={fieldClass} />
        </div>
        <div>
          <label htmlFor="intern-end" className={labelClass}>End date (blank if ongoing)</label>
          <input id="intern-end" name="endDate" type="date" className={fieldClass} />
        </div>
      </div>
      <div>
        <label htmlFor="intern-desc" className={labelClass}>Description &amp; Key Accomplishments</label>
        <textarea
          id="intern-desc"
          name="description"
          rows={3}
          maxLength={2000}
          className={fieldClass}
          placeholder="Developed telemetry microservices reducing latency by 20%..."
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? 'Adding…' : 'Add internship'}
        </button>
        <ActionMessage state={state} />
      </div>
    </form>
  )
}

// ---------------- Main Tabbed Workspace ----------------

type TabKey =
  | 'personal'
  | 'education'
  | 'achievements'
  | 'certifications'
  | 'research'
  | 'projects'
  | 'resume'

export function StudentWorkspace({
  studentName = 'Student',
  email = '',
  profile,
  education = [],
  achievements = [],
  certifications = [],
  researchPapers = [],
  patents = [],
  projects = [],
  internships = [],
  participations = [],
}: {
  studentName?: string
  email?: string
  profile: StudentProfile | null
  education?: StudentEducation[]
  achievements?: Achievement[]
  certifications?: StudentCertification[]
  researchPapers?: StudentResearchPaper[]
  patents?: StudentPatent[]
  projects?: StudentProject[]
  internships?: StudentInternship[]
  participations?: EventParticipationWithEvent[]
}) {
  const [activeTab, setActiveTab] = useState<TabKey>('personal')
  const [downloadingPdf, setDownloadingPdf] = useState(false)

  // Profile Completeness Calculation
  const sections = [
    Boolean(profile?.phone || profile?.address),
    education.length > 0,
    achievements.length > 0 || participations.length > 0,
    certifications.length > 0,
    researchPapers.length > 0 || patents.length > 0,
    projects.length > 0 || internships.length > 0,
  ]
  const completedSections = sections.filter(Boolean).length
  const completenessPercentage = Math.round((completedSections / sections.length) * 100)

  // Event recognitions for achievements stream
  const eventRecognitions = participations.filter(
    (p) => p.role === 'WINNER' || p.role === 'PARTICIPANT',
  )

  const downloadPdf = async () => {
    setDownloadingPdf(true)
    try {
      const { pdf } = await import('@react-pdf/renderer')
      const doc = (
        <ResumePdfDocument
          studentName={studentName}
          email={email}
          profile={profile}
          education={education}
          achievements={achievements}
          certifications={certifications}
          researchPapers={researchPapers}
          patents={patents}
          projects={projects}
          internships={internships}
          participations={participations}
        />
      )
      const blob = await pdf(doc).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${studentName.replace(/\s+/g, '_')}_Resume.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('PDF generation error', e)
    } finally {
      setDownloadingPdf(false)
    }
  }

  const tabs: Array<{ key: TabKey; label: string; count?: number }> = [
    { key: 'personal', label: 'Personal' },
    { key: 'education', label: 'Education', count: education.length },
    { key: 'achievements', label: 'Achievements', count: achievements.length + eventRecognitions.length },
    { key: 'certifications', label: 'Certifications', count: certifications.length },
    { key: 'research', label: 'Research & Patents', count: researchPapers.length + patents.length },
    { key: 'projects', label: 'Projects & Internships', count: projects.length + internships.length },
    { key: 'resume', label: 'Resume' },
  ]

  return (
    <div className="mt-8 flex flex-col gap-6">
      {/* Profile Completeness Indicator */}
      <section aria-label="Profile completeness" className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">Profile Completeness</span>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
              {completenessPercentage}%
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {completedSections} of {sections.length} core sections completed.
          </p>
        </div>
        <div className="w-full sm:w-64">
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${completenessPercentage}%` }}
            />
          </div>
        </div>
      </section>

      {/* Tab Navigation */}
      <nav aria-label="Student profile sections" className="flex flex-wrap gap-1.5 border-b border-border pb-3">
        {tabs.map((tab) => {
          const active = activeTab === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition ${
                active
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && tab.count > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-semibold ${
                    active ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Tab 1: Personal Details */}
      {activeTab === 'personal' && (
        <section aria-labelledby="personal-heading" className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="mb-6">
            <h2 id="personal-heading" className="text-lg font-semibold">Personal details</h2>
            <p className="mt-1 text-sm text-muted-foreground">Keep your student profile and contact details up to date.</p>
          </div>
          <ProfileForm profile={profile} />
        </section>
      )}

      {/* Tab 2: Education */}
      {activeTab === 'education' && (
        <section aria-labelledby="education-heading" className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="mb-6">
            <h2 id="education-heading" className="text-lg font-semibold">Education</h2>
            <p className="mt-1 text-sm text-muted-foreground">Record your academic qualifications, boards, and scores.</p>
          </div>
          <EducationForm />
          <div className="flex flex-col gap-3 pt-5">
            {education.length ? (
              education.map((edu) => (
                <article key={edu.id} className="rounded-xl border border-border bg-background p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="font-medium">
                        {edu.level} {edu.courseOrStream ? `— ${edu.courseOrStream}` : ''}
                      </h3>
                      <p className="mt-0.5 text-sm text-muted-foreground">{edu.institutionName}</p>
                    </div>
                    {edu.score && (
                      <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                        {edu.score}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    {edu.boardOrUniversity && <span>Board: {edu.boardOrUniversity}</span>}
                    {(edu.startYear || edu.endYear) && (
                      <span>
                        {edu.startYear ?? ''}{edu.startYear && edu.endYear ? ' - ' : ''}{edu.endYear ?? ''}
                      </span>
                    )}
                  </div>
                </article>
              ))
            ) : (
              <p className="rounded-xl border border-dashed border-border px-4 py-7 text-center text-sm text-muted-foreground">
                No education records yet. Add your first qualification above.
              </p>
            )}
          </div>
        </section>
      )}

      {/* Tab 3: Achievements & Events */}
      {activeTab === 'achievements' && (
        <div className="flex flex-col gap-6">
          <section aria-labelledby="achievements-heading" className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <div className="mb-6">
              <h2 id="achievements-heading" className="text-lg font-semibold">Achievements &amp; Awards</h2>
              <p className="mt-1 text-sm text-muted-foreground">Record your campus, technical, and professional milestones.</p>
            </div>
            <AchievementForm />
            <div className="flex flex-col gap-3 pt-5">
              {achievements.length || eventRecognitions.length ? (
                <>
                  {achievements.map((achievement) => (
                    <article key={achievement.id} className="rounded-xl border border-border bg-background p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <h3 className="font-medium">{achievement.title}</h3>
                        <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                          {achievement.status === 'WINNER' ? 'Winner' : 'Participation'}
                        </span>
                      </div>
                      <p className="mt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {achievement.category.replaceAll('_', ' ').toLowerCase()}
                      </p>
                      {achievement.description && (
                        <p className="mt-2 text-sm text-muted-foreground">{achievement.description}</p>
                      )}
                    </article>
                  ))}

                  {/* Automatic event recognition on read path */}
                  {eventRecognitions.map((part) => (
                    <article key={part.id} className="rounded-xl border border-border bg-background p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h3 className="font-medium">
                            {part.event.title}
                            {part.position ? ` · ${part.position}` : ''}
                          </h3>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            Department: {part.event.department.name} ({part.event.department.code})
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                            Event Honor
                          </span>
                          <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                            {part.role === 'WINNER' ? 'Winner' : 'Participation'}
                          </span>
                        </div>
                      </div>
                      <p className="mt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {part.event.type.replaceAll('_', ' ').toLowerCase()}
                      </p>
                      {part.event.description && (
                        <p className="mt-2 text-sm text-muted-foreground">{part.event.description}</p>
                      )}
                    </article>
                  ))}
                </>
              ) : (
                <p className="rounded-xl border border-dashed border-border px-4 py-7 text-center text-sm text-muted-foreground">
                  No achievements recorded yet. Add your first achievement above.
                </p>
              )}
            </div>
          </section>

          {/* Read-only "My Events" section */}
          <section aria-labelledby="my-events-tab-heading" className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 id="my-events-tab-heading" className="text-lg font-semibold">My Event Participations</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Official events and hackathons you enrolled in or completed.
                </p>
              </div>
              <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                {participations.length} {participations.length === 1 ? 'event' : 'events'}
              </span>
            </div>
            <div className="flex flex-col gap-3">
              {participations.length ? (
                participations.map((part) => (
                  <article key={part.id} className="rounded-xl border border-border bg-background p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h3 className="font-medium">{part.event.title}</h3>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {part.event.department.name} ({part.event.department.code})
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                          {part.role}
                        </span>
                        {part.position && (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                            {part.position}
                          </span>
                        )}
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <p className="rounded-xl border border-dashed border-border px-4 py-7 text-center text-sm text-muted-foreground">
                  No event participations registered yet.
                </p>
              )}
            </div>
          </section>
        </div>
      )}

      {/* Tab 4: Certifications */}
      {activeTab === 'certifications' && (
        <section aria-labelledby="certifications-heading" className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="mb-6">
            <h2 id="certifications-heading" className="text-lg font-semibold">Certifications &amp; Licenses</h2>
            <p className="mt-1 text-sm text-muted-foreground">Professional credentials and online course certificates.</p>
          </div>
          <CertificationForm />
          <div className="flex flex-col gap-3 pt-5">
            {certifications.length ? (
              certifications.map((cert) => (
                <article key={cert.id} className="rounded-xl border border-border bg-background p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="font-medium">{cert.name}</h3>
                    {cert.issuedAt && (
                      <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                        {new Date(cert.issuedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  {cert.issuer && <p className="mt-1 text-sm text-muted-foreground">Issuer: {cert.issuer}</p>}
                  {cert.fileUrl && (
                    <div className="mt-2">
                      <a
                        href={cert.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-primary underline hover:opacity-80"
                      >
                        View certificate document &rarr;
                      </a>
                    </div>
                  )}
                </article>
              ))
            ) : (
              <p className="rounded-xl border border-dashed border-border px-4 py-7 text-center text-sm text-muted-foreground">
                No certifications yet. Add your first certificate above.
              </p>
            )}
          </div>
        </section>
      )}

      {/* Tab 5: Research & Patents */}
      {activeTab === 'research' && (
        <div className="grid gap-6 xl:grid-cols-2">
          <section aria-labelledby="papers-heading" className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <div className="mb-6">
              <h2 id="papers-heading" className="text-lg font-semibold">Research Papers</h2>
              <p className="mt-1 text-sm text-muted-foreground">Published articles, journals, and conference papers.</p>
            </div>
            <ResearchPaperForm />
            <div className="flex flex-col gap-3 pt-5">
              {researchPapers.length ? (
                researchPapers.map((paper) => (
                  <article key={paper.id} className="rounded-xl border border-border bg-background p-4">
                    <h3 className="font-medium">{paper.title}</h3>
                    {paper.publication && (
                      <p className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {paper.publication}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      {paper.doi && <span>DOI/Link: {paper.doi}</span>}
                      {paper.publishedAt && (
                        <span>Published: {new Date(paper.publishedAt).toLocaleDateString()}</span>
                      )}
                      {paper.fileUrl && (
                        <a
                          href={paper.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary underline hover:opacity-80"
                        >
                          View paper
                        </a>
                      )}
                    </div>
                  </article>
                ))
              ) : (
                <p className="rounded-xl border border-dashed border-border px-4 py-7 text-center text-sm text-muted-foreground">
                  No research papers added yet.
                </p>
              )}
            </div>
          </section>

          <section aria-labelledby="patents-heading" className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <div className="mb-6">
              <h2 id="patents-heading" className="text-lg font-semibold">Patents</h2>
              <p className="mt-1 text-sm text-muted-foreground">Inventions filed, pending, or granted.</p>
            </div>
            <PatentForm />
            <div className="flex flex-col gap-3 pt-5">
              {patents.length ? (
                patents.map((pat) => (
                  <article key={pat.id} className="rounded-xl border border-border bg-background p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h3 className="font-medium">{pat.title}</h3>
                      {pat.status && (
                        <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                          {pat.status}
                        </span>
                      )}
                    </div>
                    {pat.patentNumber && (
                      <p className="mt-1 text-xs font-mono text-muted-foreground">Application: {pat.patentNumber}</p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      {pat.filedAt && <span>Filed: {new Date(pat.filedAt).toLocaleDateString()}</span>}
                      {pat.fileUrl && (
                        <a
                          href={pat.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary underline hover:opacity-80"
                        >
                          View patent document
                        </a>
                      )}
                    </div>
                  </article>
                ))
              ) : (
                <p className="rounded-xl border border-dashed border-border px-4 py-7 text-center text-sm text-muted-foreground">
                  No patents added yet.
                </p>
              )}
            </div>
          </section>
        </div>
      )}

      {/* Tab 6: Projects & Internships */}
      {activeTab === 'projects' && (
        <div className="grid gap-6 xl:grid-cols-2">
          <section aria-labelledby="projects-heading" className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <div className="mb-6">
              <h2 id="projects-heading" className="text-lg font-semibold">Projects</h2>
              <p className="mt-1 text-sm text-muted-foreground">Coursework, capstone, and personal software or hardware projects.</p>
            </div>
            <ProjectForm />
            <div className="flex flex-col gap-3 pt-5">
              {projects.length ? (
                projects.map((proj) => (
                  <article key={proj.id} className="rounded-xl border border-border bg-background p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h3 className="font-medium">{proj.title}</h3>
                      {(proj.startDate || proj.endDate) && (
                        <span className="text-xs text-muted-foreground">
                          {proj.startDate ? new Date(proj.startDate).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : ''}
                          {' - '}
                          {proj.endDate ? new Date(proj.endDate).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : 'Ongoing'}
                        </span>
                      )}
                    </div>
                    {proj.repositoryUrl && (
                      <p className="mt-1">
                        <a
                          href={proj.repositoryUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-primary underline hover:opacity-80"
                        >
                          {proj.repositoryUrl}
                        </a>
                      </p>
                    )}
                    {proj.description && <p className="mt-2 text-sm text-muted-foreground">{proj.description}</p>}
                  </article>
                ))
              ) : (
                <p className="rounded-xl border border-dashed border-border px-4 py-7 text-center text-sm text-muted-foreground">
                  No projects added yet.
                </p>
              )}
            </div>
          </section>

          <section aria-labelledby="internships-heading" className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <div className="mb-6">
              <h2 id="internships-heading" className="text-lg font-semibold">Internships &amp; Work Experience</h2>
              <p className="mt-1 text-sm text-muted-foreground">Industry roles, co-ops, and research internships.</p>
            </div>
            <InternshipForm />
            <div className="flex flex-col gap-3 pt-5">
              {internships.length ? (
                internships.map((intern) => (
                  <article key={intern.id} className="rounded-xl border border-border bg-background p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h3 className="font-medium">{intern.organization}</h3>
                        {intern.role && <p className="mt-0.5 text-xs text-primary font-medium">{intern.role}</p>}
                      </div>
                      {(intern.startDate || intern.endDate) && (
                        <span className="text-xs text-muted-foreground">
                          {intern.startDate ? new Date(intern.startDate).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : ''}
                          {' - '}
                          {intern.endDate ? new Date(intern.endDate).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : 'Present'}
                        </span>
                      )}
                    </div>
                    {intern.description && <p className="mt-2 text-sm text-muted-foreground">{intern.description}</p>}
                  </article>
                ))
              ) : (
                <p className="rounded-xl border border-dashed border-border px-4 py-7 text-center text-sm text-muted-foreground">
                  No internships added yet.
                </p>
              )}
            </div>
          </section>
        </div>
      )}

      {/* Tab 7: Resume Preview & PDF Download */}
      {activeTab === 'resume' && (
        <section aria-labelledby="resume-heading" className="rounded-2xl border border-border bg-card p-5 sm:p-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
            <div>
              <h2 id="resume-heading" className="text-xl font-bold tracking-tight">Curriculum Vitae / Resume</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Consolidated professional overview ready for employer submission.
              </p>
            </div>
            <button
              type="button"
              onClick={downloadPdf}
              disabled={downloadingPdf}
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
            >
              {downloadingPdf ? 'Generating PDF…' : 'Download PDF'}
            </button>
          </div>

          {/* Formatted HTML Resume Preview */}
          <div className="mx-auto max-w-3xl rounded-xl border border-border bg-background p-6 sm:p-10 shadow-sm text-foreground">
            {/* Header */}
            <div className="border-b-2 border-foreground pb-4">
              <h1 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-tight">{studentName}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {email && <span>{email}</span>}
                {profile?.phone && <span>• {profile.phone}</span>}
                {profile?.address && <span>• {profile.address}</span>}
              </div>
            </div>

            {/* Education Section */}
            {education.length > 0 && (
              <div className="mt-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-1">
                  Education
                </h3>
                <div className="mt-3 flex flex-col gap-3">
                  {education.map((edu) => (
                    <div key={edu.id} className="flex justify-between items-start text-xs sm:text-sm">
                      <div>
                        <p className="font-semibold text-foreground">
                          {edu.courseOrStream ? `${edu.level} in ${edu.courseOrStream}` : edu.level}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {edu.institutionName}{edu.boardOrUniversity ? ` (${edu.boardOrUniversity})` : ''}
                          {edu.score ? ` — Score: ${edu.score}` : ''}
                        </p>
                      </div>
                      {(edu.startYear || edu.endYear) && (
                        <p className="text-xs font-mono text-muted-foreground">
                          {edu.startYear ?? ''}{edu.startYear && edu.endYear ? ' - ' : ''}{edu.endYear ?? ''}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Experience / Internships Section */}
            {internships.length > 0 && (
              <div className="mt-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-1">
                  Internships &amp; Experience
                </h3>
                <div className="mt-3 flex flex-col gap-3">
                  {internships.map((intern) => (
                    <div key={intern.id} className="text-xs sm:text-sm">
                      <div className="flex justify-between items-start">
                        <p className="font-semibold text-foreground">{intern.role || 'Intern'}</p>
                        {(intern.startDate || intern.endDate) && (
                          <p className="text-xs font-mono text-muted-foreground">
                            {intern.startDate ? new Date(intern.startDate).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : ''}
                            {' - '}
                            {intern.endDate ? new Date(intern.endDate).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : 'Present'}
                          </p>
                        )}
                      </div>
                      <p className="text-xs text-primary font-medium">{intern.organization}</p>
                      {intern.description && <p className="mt-1 text-xs text-muted-foreground">{intern.description}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Projects Section */}
            {projects.length > 0 && (
              <div className="mt-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-1">
                  Projects
                </h3>
                <div className="mt-3 flex flex-col gap-3">
                  {projects.map((proj) => (
                    <div key={proj.id} className="text-xs sm:text-sm">
                      <div className="flex justify-between items-start">
                        <p className="font-semibold text-foreground">{proj.title}</p>
                        {(proj.startDate || proj.endDate) && (
                          <p className="text-xs font-mono text-muted-foreground">
                            {proj.startDate ? new Date(proj.startDate).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : ''}
                            {proj.endDate ? ` - ${new Date(proj.endDate).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}` : ''}
                          </p>
                        )}
                      </div>
                      {proj.repositoryUrl && <p className="text-xs text-primary font-mono">{proj.repositoryUrl}</p>}
                      {proj.description && <p className="mt-1 text-xs text-muted-foreground">{proj.description}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Certifications Section */}
            {certifications.length > 0 && (
              <div className="mt-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-1">
                  Certifications
                </h3>
                <div className="mt-3 flex flex-col gap-2">
                  {certifications.map((cert) => (
                    <div key={cert.id} className="flex justify-between items-start text-xs sm:text-sm">
                      <div>
                        <p className="font-semibold text-foreground">{cert.name}</p>
                        {cert.issuer && <p className="text-xs text-muted-foreground">{cert.issuer}</p>}
                      </div>
                      {cert.issuedAt && (
                        <p className="text-xs font-mono text-muted-foreground">
                          {new Date(cert.issuedAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Research Papers & Patents Section */}
            {(researchPapers.length > 0 || patents.length > 0) && (
              <div className="mt-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-1">
                  Research Papers &amp; Patents
                </h3>
                <div className="mt-3 flex flex-col gap-3">
                  {researchPapers.map((paper) => (
                    <div key={paper.id} className="text-xs sm:text-sm">
                      <p className="font-semibold text-foreground">{paper.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {paper.publication}{paper.doi ? ` • DOI: ${paper.doi}` : ''}
                      </p>
                    </div>
                  ))}
                  {patents.map((pat) => (
                    <div key={pat.id} className="text-xs sm:text-sm">
                      <p className="font-semibold text-foreground">{pat.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Patent No: {pat.patentNumber || 'Pending'}{pat.status ? ` (${pat.status})` : ''}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Achievements Section */}
            {(achievements.length > 0 || participations.length > 0) && (
              <div className="mt-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-1">
                  Honors &amp; Achievements
                </h3>
                <div className="mt-3 flex flex-col gap-2">
                  {achievements.map((ach) => (
                    <div key={ach.id} className="text-xs sm:text-sm">
                      <p className="font-semibold text-foreground">
                        {ach.title} ({ach.status === 'WINNER' ? 'Winner' : 'Participation'})
                      </p>
                      {ach.description && <p className="text-xs text-muted-foreground">{ach.description}</p>}
                    </div>
                  ))}
                  {participations.map((part) => (
                    <div key={part.id} className="text-xs sm:text-sm">
                      <p className="font-semibold text-foreground">
                        {part.event.title} — {part.role === 'WINNER' ? 'Winner' : part.role === 'ORGANIZER' ? 'Organizer' : 'Participant'}{part.position ? ` (${part.position})` : ''}
                      </p>
                      <p className="text-xs text-muted-foreground">Host: {part.event.department.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
