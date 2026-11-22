'use client'

import { useActionState, useState } from 'react'
import {
  saveStudentProfile,
  addStudentAchievement,
  updateStudentAchievement,
  deleteStudentAchievement,
  addStudentEducation,
  updateStudentEducation,
  deleteStudentEducation,
  addStudentCertification,
  updateStudentCertification,
  deleteStudentCertification,
  addStudentResearchPaper,
  updateStudentResearchPaper,
  deleteStudentResearchPaper,
  addStudentPatent,
  updateStudentPatent,
  deleteStudentPatent,
  addStudentProject,
  updateStudentProject,
  deleteStudentProject,
  addStudentInternship,
  updateStudentInternship,
  deleteStudentInternship,
  addStudentSkill,
  updateStudentSkill,
  deleteStudentSkill,
  addStudentSemesterRecord,
  updateStudentSemesterRecord,
  deleteStudentSemesterRecord,
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
  StudentSkill,
  StudentSemesterRecord,
  Department,
  Course,
} from '@/generated/prisma/client'
import type { EventParticipationWithEvent } from '@/lib/server/repositories/event-repository'
import { ResumePdfDocument, type StudentProfileWithRelations } from './resume-pdf-document'

const initialState: StudentActionState = { status: 'idle', message: '' }
const fieldClass =
  'mt-2 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring'
const labelClass = 'text-sm font-medium text-foreground'

const ACCREDITATION_CRITERIA = [
  { code: 'NAAC-1.3.2', label: 'NAAC 1.3.2: Value-Added Courses & Experiential Learning' },
  { code: 'NAAC-3.4.3', label: 'NAAC 3.4.3: Research Publications in UGC/Scopus Journals' },
  { code: 'NAAC-3.4.4', label: 'NAAC 3.4.4: Patents Published and Awarded' },
  { code: 'NAAC-5.2.1', label: 'NAAC 5.2.1: Placement & Internships of Students' },
  { code: 'NAAC-5.3.1', label: 'NAAC 5.3.1: Awards / Medals in Sports & Cultural Activities' },
  { code: 'NBA-PO-PSO', label: 'NBA PO/PSO: Program Outcomes & Attainment' },
]

function ActionMessage({ state }: { state: StudentActionState }) {
  if (!state.message) return null
  return (
    <p
      role={state.status === 'error' ? 'alert' : 'status'}
      className={`mt-2 text-xs font-medium ${state.status === 'error' ? 'text-destructive' : 'text-primary'}`}
    >
      {state.message}
    </p>
  )
}

function VerificationBadge({ status }: { status?: 'PENDING' | 'VERIFIED' | 'REJECTED' }) {
  if (status === 'VERIFIED') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
        Verified
      </span>
    )
  }
  if (status === 'REJECTED') {
    return (
      <span className="inline-flex items-center rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">
        Needs changes
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
      Pending review
    </span>
  )
}

function DocumentUploadField({
  id,
  name,
  label = 'Document / Certificate',
  defaultValue = '',
}: {
  id: string
  name: string
  label?: string
  defaultValue?: string
}) {
  const [fileUrl, setFileUrl] = useState(defaultValue)
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

function PhotoUploadField({ defaultValue = '' }: { defaultValue?: string }) {
  const [photoUrl, setPhotoUrl] = useState(defaultValue)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')
    const fd = new FormData()
    fd.append('file', file)
    try {
      const res = await fetch('/api/documents', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      setPhotoUrl(data.fileUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <label className={labelClass}>Profile Photo</label>
      <input type="hidden" name="photoUrl" value={photoUrl} />
      <div className="flex items-center gap-4">
        {photoUrl ? (
          <img
            src={photoUrl.startsWith('http') ? photoUrl : `/api/documents?pathname=${encodeURIComponent(photoUrl)}`}
            alt="Profile Preview"
            className="h-16 w-16 rounded-full border border-border object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-xs text-muted-foreground">
            No Photo
          </div>
        )}
        <div>
          <input
            id="photo-upload"
            type="file"
            accept=".png,.jpg,.jpeg"
            onChange={handleUpload}
            className="text-xs file:mr-2 file:rounded-lg file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-secondary-foreground"
          />
          {uploading && <span className="block text-xs text-muted-foreground mt-1">Uploading photo…</span>}
          {error && <span className="block text-xs text-destructive mt-1">{error}</span>}
        </div>
      </div>
    </div>
  )
}

// ---------------- Section 1: Profile Form ----------------

function ProfileForm({
  profile,
  departments,
  courses,
}: {
  profile: StudentProfileWithRelations
  departments: Department[]
  courses: Course[]
}) {
  const [state, action, pending] = useActionState(saveStudentProfile, initialState)
  const [selectedDept, setSelectedDept] = useState(profile?.departmentId ?? '')

  const filteredCourses = selectedDept
    ? courses.filter((c) => c.departmentId === selectedDept)
    : courses

  return (
    <form action={action} className="flex flex-col gap-6">
      {/* Profile Photo */}
      <PhotoUploadField defaultValue={profile?.photoUrl ?? ''} />

      {/* Institutional Identity Fields */}
      <div className="rounded-xl border border-border bg-card/60 p-4">
        <h3 className="mb-3 font-semibold text-foreground">Institutional Identity</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="enrollmentNumber" className={labelClass}>Enrollment / Roll Number</label>
            <input
              id="enrollmentNumber"
              name="enrollmentNumber"
              defaultValue={profile?.enrollmentNumber ?? ''}
              maxLength={60}
              className={fieldClass}
              placeholder="e.g. EN2026-CSE-0042"
            />
          </div>
          <div>
            <label htmlFor="currentSemester" className={labelClass}>Current Semester (1-8)</label>
            <select
              id="currentSemester"
              name="currentSemester"
              defaultValue={profile?.currentSemester ?? ''}
              className={fieldClass}
            >
              <option value="">Select current semester</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                <option key={sem} value={sem}>Semester {sem}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="departmentId" className={labelClass}>Department</label>
            <select
              id="departmentId"
              name="departmentId"
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className={fieldClass}
            >
              <option value="">Select department</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="courseId" className={labelClass}>Course / Degree</label>
            <select
              id="courseId"
              name="courseId"
              defaultValue={profile?.courseId ?? ''}
              className={fieldClass}
            >
              <option value="">Select course</option>
              {filteredCourses.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="admissionYear" className={labelClass}>Admission Year</label>
            <input
              id="admissionYear"
              name="admissionYear"
              type="number"
              min={1990}
              max={2100}
              defaultValue={profile?.admissionYear ?? ''}
              className={fieldClass}
              placeholder="e.g. 2023"
            />
          </div>
        </div>
      </div>

      {/* Personal & Contact Details */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="dateOfBirth" className={labelClass}>Date of birth</label>
          <input
            id="dateOfBirth"
            name="dateOfBirth"
            type="date"
            defaultValue={profile?.dateOfBirth ? new Date(profile.dateOfBirth).toISOString().slice(0, 10) : ''}
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
      </div>

      <div>
        <label htmlFor="address" className={labelClass}>Address</label>
        <textarea
          id="address"
          name="address"
          rows={2}
          defaultValue={profile?.address ?? ''}
          maxLength={500}
          className={fieldClass}
          placeholder="Campus hostel or residential address"
        />
      </div>

      {/* Social / Portfolio Links */}
      <div className="rounded-xl border border-border bg-card/60 p-4">
        <h3 className="mb-3 font-semibold text-foreground">Online Links &amp; Profiles</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="linkedinUrl" className={labelClass}>LinkedIn URL</label>
            <input
              id="linkedinUrl"
              name="linkedinUrl"
              defaultValue={profile?.linkedinUrl ?? ''}
              maxLength={2000}
              className={fieldClass}
              placeholder="https://linkedin.com/in/..."
            />
          </div>
          <div>
            <label htmlFor="githubUrl" className={labelClass}>GitHub URL</label>
            <input
              id="githubUrl"
              name="githubUrl"
              defaultValue={profile?.githubUrl ?? ''}
              maxLength={2000}
              className={fieldClass}
              placeholder="https://github.com/..."
            />
          </div>
          <div>
            <label htmlFor="portfolioUrl" className={labelClass}>Portfolio Website</label>
            <input
              id="portfolioUrl"
              name="portfolioUrl"
              defaultValue={profile?.portfolioUrl ?? ''}
              maxLength={2000}
              className={fieldClass}
              placeholder="https://..."
            />
          </div>
        </div>
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

// ---------------- Section: Achievements ----------------

function AchievementCard({ achievement }: { achievement: Achievement }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editState, editAction, editPending] = useActionState(updateStudentAchievement, initialState)
  const [delState, delAction, delPending] = useActionState(deleteStudentAchievement, initialState)

  return (
    <div className="rounded-xl border border-border bg-card p-4 transition">
      {isEditing ? (
        <form action={editAction} className="flex flex-col gap-3">
          <input type="hidden" name="id" value={achievement.id} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Title</label>
              <input name="title" defaultValue={achievement.title} required maxLength={180} className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>Category</label>
              <select name="category" defaultValue={achievement.category} className={fieldClass}>
                <option value="TECHNICAL">Technical</option>
                <option value="NON_TECHNICAL">Non-technical</option>
                <option value="SPORTS">Sports</option>
                <option value="CULTURAL">Cultural</option>
              </select>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Status</label>
              <select name="status" defaultValue={achievement.status} className={fieldClass}>
                <option value="PARTICIPATION">Participation</option>
                <option value="WINNER">Winner</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Awarded date</label>
              <input
                name="awardedAt"
                type="date"
                defaultValue={achievement.awardedAt ? new Date(achievement.awardedAt).toISOString().slice(0, 10) : ''}
                className={fieldClass}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Description</label>
            <textarea name="description" rows={2} defaultValue={achievement.description ?? ''} className={fieldClass} />
          </div>
          <div>
            <label className={labelClass}>Accreditation Criterion (optional)</label>
            <select name="criterionCode" className={fieldClass} defaultValue="">
              <option value="">None / Select Criterion</option>
              {ACCREDITATION_CRITERIA.map((crit) => (
                <option key={crit.code} value={crit.code}>{crit.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={editPending}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
            >
              {editPending ? 'Saving…' : 'Save changes'}
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="rounded-lg border border-input px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
            >
              Cancel
            </button>
            <ActionMessage state={editState} />
          </div>
        </form>
      ) : (
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="font-semibold text-foreground">{achievement.title}</h4>
              <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                {achievement.category}
              </span>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                {achievement.status}
              </span>
              <VerificationBadge status={achievement.verificationStatus} />
            </div>
            {achievement.description && <p className="mt-1 text-xs text-foreground/80">{achievement.description}</p>}
            {achievement.awardedAt && (
              <p className="mt-1 text-xs text-muted-foreground">
                Awarded on {new Date(achievement.awardedAt).toLocaleDateString()}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted"
            >
              Edit
            </button>
            <form action={delAction}>
              <input type="hidden" name="id" value={achievement.id} />
              <button
                type="submit"
                disabled={delPending}
                className="rounded-lg bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive hover:bg-destructive/20 disabled:opacity-50"
              >
                {delPending ? '…' : 'Delete'}
              </button>
            </form>
          </div>
        </div>
      )}
      {delState.message && <ActionMessage state={delState} />}
    </div>
  )
}

function AchievementForm() {
  const [state, action, pending] = useActionState(addStudentAchievement, initialState)
  return (
    <form action={action} className="flex flex-col gap-4 border-b border-border pb-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="ach-title" className={labelClass}>Title</label>
          <input id="ach-title" name="title" required maxLength={180} className={fieldClass} placeholder="e.g. First Prize in Hackathon" />
        </div>
        <div>
          <label htmlFor="ach-category" className={labelClass}>Category</label>
          <select id="ach-category" name="category" className={fieldClass} defaultValue="TECHNICAL">
            <option value="TECHNICAL">Technical</option>
            <option value="NON_TECHNICAL">Non-technical</option>
            <option value="SPORTS">Sports</option>
            <option value="CULTURAL">Cultural</option>
          </select>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="ach-status" className={labelClass}>Status</label>
          <select id="ach-status" name="status" className={fieldClass} defaultValue="PARTICIPATION">
            <option value="PARTICIPATION">Participation</option>
            <option value="WINNER">Winner</option>
          </select>
        </div>
        <div>
          <label htmlFor="ach-awardedAt" className={labelClass}>Awarded date</label>
          <input id="ach-awardedAt" name="awardedAt" type="date" className={fieldClass} />
        </div>
      </div>
      <div>
        <label htmlFor="ach-desc" className={labelClass}>Description</label>
        <textarea id="ach-desc" name="description" rows={2} maxLength={2000} className={fieldClass} placeholder="Details about the competition or achievement" />
      </div>
      <div>
        <label htmlFor="ach-crit" className={labelClass}>Tag to Accreditation Criterion (optional)</label>
        <select id="ach-crit" name="criterionCode" className={fieldClass} defaultValue="">
          <option value="">None / Select Criterion</option>
          {ACCREDITATION_CRITERIA.map((crit) => (
            <option key={crit.code} value={crit.code}>{crit.label}</option>
          ))}
        </select>
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

// ---------------- Section: Education & Semesters ----------------

function EducationCard({ education }: { education: StudentEducation }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editState, editAction, editPending] = useActionState(updateStudentEducation, initialState)
  const [delState, delAction, delPending] = useActionState(deleteStudentEducation, initialState)

  return (
    <div className="rounded-xl border border-border bg-card p-4 transition">
      {isEditing ? (
        <form action={editAction} className="flex flex-col gap-3">
          <input type="hidden" name="id" value={education.id} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Level</label>
              <select name="level" defaultValue={education.level} className={fieldClass}>
                <option value="DEGREE">Degree / Undergraduate</option>
                <option value="TWELFTH">12th Grade / Senior Secondary</option>
                <option value="TENTH">10th Grade / Secondary</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Institution name</label>
              <input name="institutionName" defaultValue={education.institutionName} required maxLength={180} className={fieldClass} />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Board / University</label>
              <input name="boardOrUniversity" defaultValue={education.boardOrUniversity ?? ''} className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>Course / Stream</label>
              <input name="courseOrStream" defaultValue={education.courseOrStream ?? ''} className={fieldClass} />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className={labelClass}>Score / CGPA / %</label>
              <input name="score" defaultValue={education.score ?? ''} className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>Start Year</label>
              <input name="startYear" type="number" defaultValue={education.startYear ?? ''} className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>End Year</label>
              <input name="endYear" type="number" defaultValue={education.endYear ?? ''} className={fieldClass} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="submit" disabled={editPending} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
              {editPending ? 'Saving…' : 'Save changes'}
            </button>
            <button type="button" onClick={() => setIsEditing(false)} className="rounded-lg border border-input px-3 py-1.5 text-xs font-medium">
              Cancel
            </button>
            <ActionMessage state={editState} />
          </div>
        </form>
      ) : (
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                {education.level}
              </span>
              <h4 className="font-semibold text-foreground">
                {education.courseOrStream ? `${education.courseOrStream} - ${education.institutionName}` : education.institutionName}
              </h4>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {education.boardOrUniversity && <span>{education.boardOrUniversity} • </span>}
              {education.score && <span>Score: <strong className="text-foreground">{education.score}</strong> • </span>}
              {(education.startYear || education.endYear) && (
                <span>{education.startYear ?? ''} – {education.endYear ?? 'Present'}</span>
              )}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted"
            >
              Edit
            </button>
            <form action={delAction}>
              <input type="hidden" name="id" value={education.id} />
              <button
                type="submit"
                disabled={delPending}
                className="rounded-lg bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive hover:bg-destructive/20 disabled:opacity-50"
              >
                {delPending ? '…' : 'Delete'}
              </button>
            </form>
          </div>
        </div>
      )}
      {delState.message && <ActionMessage state={delState} />}
    </div>
  )
}

function SemesterRecordRow({ semester }: { semester: StudentSemesterRecord }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editState, editAction, editPending] = useActionState(updateStudentSemesterRecord, initialState)
  const [delState, delAction, delPending] = useActionState(deleteStudentSemesterRecord, initialState)

  if (isEditing) {
    return (
      <tr className="bg-muted/30">
        <td colSpan={5} className="p-3">
          <form action={editAction} className="flex flex-wrap items-center gap-3">
            <input type="hidden" name="id" value={semester.id} />
            <input type="hidden" name="semesterNumber" value={semester.semesterNumber} />
            <span className="text-xs font-semibold">Sem {semester.semesterNumber}:</span>
            <div>
              <label className="sr-only">SGPA</label>
              <input name="sgpa" type="number" step="0.01" min={0} max={10} defaultValue={semester.sgpa} placeholder="SGPA" className="h-8 w-20 rounded-lg border border-input px-2 text-xs" />
            </div>
            <div>
              <label className="sr-only">CGPA</label>
              <input name="cgpaAtSemester" type="number" step="0.01" min={0} max={10} defaultValue={semester.cgpaAtSemester} placeholder="CGPA" className="h-8 w-20 rounded-lg border border-input px-2 text-xs" />
            </div>
            <div>
              <label className="sr-only">Backlogs</label>
              <input name="backlogCount" type="number" min={0} defaultValue={semester.backlogCount ?? 0} placeholder="Backlogs" className="h-8 w-20 rounded-lg border border-input px-2 text-xs" />
            </div>
            <button type="submit" disabled={editPending} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
              {editPending ? '…' : 'Save'}
            </button>
            <button type="button" onClick={() => setIsEditing(false)} className="rounded-lg border px-3 py-1.5 text-xs">
              Cancel
            </button>
            <ActionMessage state={editState} />
          </form>
        </td>
      </tr>
    )
  }

  return (
    <tr className="border-b border-border transition hover:bg-muted/40">
      <td className="py-2.5 pr-4 font-semibold text-foreground">Semester {semester.semesterNumber}</td>
      <td className="py-2.5 pr-4 font-mono font-medium">{semester.sgpa.toFixed(2)}</td>
      <td className="py-2.5 pr-4 font-mono font-medium">{semester.cgpaAtSemester.toFixed(2)}</td>
      <td className="py-2.5 pr-4">
        {semester.backlogCount ? (
          <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-bold text-destructive">
            {semester.backlogCount}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">0</span>
        )}
      </td>
      <td className="py-2.5 text-right">
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="rounded border border-border px-2 py-0.5 text-[11px] font-medium hover:bg-muted"
          >
            Edit
          </button>
          <form action={delAction}>
            <input type="hidden" name="id" value={semester.id} />
            <button
              type="submit"
              disabled={delPending}
              className="rounded bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive hover:bg-destructive/20 disabled:opacity-50"
            >
              {delPending ? '…' : 'Delete'}
            </button>
          </form>
        </div>
      </td>
    </tr>
  )
}

function EducationTab({
  education,
  semesters,
}: {
  education: StudentEducation[]
  semesters: StudentSemesterRecord[]
}) {
  const [eduState, eduAction, eduPending] = useActionState(addStudentEducation, initialState)
  const [semState, semAction, semPending] = useActionState(addStudentSemesterRecord, initialState)

  return (
    <div className="flex flex-col gap-8">
      {/* Education Qualifications Form */}
      <div>
        <h3 className="mb-4 text-base font-semibold text-foreground">Add Formal Qualification</h3>
        <form action={eduAction} className="flex flex-col gap-4 border-b border-border pb-6">
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
              <input id="edu-inst" name="institutionName" required maxLength={180} className={fieldClass} placeholder="e.g. Stanford University" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="edu-board" className={labelClass}>Board or University</label>
              <input id="edu-board" name="boardOrUniversity" maxLength={180} className={fieldClass} placeholder="e.g. State Board or University Name" />
            </div>
            <div>
              <label htmlFor="edu-stream" className={labelClass}>Specialization / Stream</label>
              <input id="edu-stream" name="courseOrStream" maxLength={180} className={fieldClass} placeholder="e.g. Computer Science Engineering" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="edu-score" className={labelClass}>Score / CGPA / %</label>
              <input id="edu-score" name="score" maxLength={50} className={fieldClass} placeholder="e.g. 8.9 CGPA or 88%" />
            </div>
            <div>
              <label htmlFor="edu-start" className={labelClass}>Start Year</label>
              <input id="edu-start" name="startYear" type="number" min={1950} max={2100} className={fieldClass} placeholder="e.g. 2021" />
            </div>
            <div>
              <label htmlFor="edu-end" className={labelClass}>End Year</label>
              <input id="edu-end" name="endYear" type="number" min={1950} max={2100} className={fieldClass} placeholder="e.g. 2025" />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={eduPending}
              className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {eduPending ? 'Adding…' : 'Add qualification'}
            </button>
            <ActionMessage state={eduState} />
          </div>
        </form>

        <div className="mt-6 flex flex-col gap-3">
          {education.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-xs text-muted-foreground">
              No formal education records listed yet.
            </p>
          ) : (
            education.map((item) => <EducationCard key={item.id} education={item} />)
          )}
        </div>
      </div>

      {/* Semester Academic Performance */}
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <h3 className="text-base font-semibold text-foreground">Semester Academic Performance (SGPA / CGPA)</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Track semester-by-semester SGPA and cumulative CGPA on a 0–10 scale.
        </p>

        <form action={semAction} className="mt-4 flex flex-wrap items-end gap-3 border-b border-border pb-5">
          <div>
            <label className={labelClass}>Semester</label>
            <select name="semesterNumber" className={fieldClass} defaultValue="1">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                <option key={s} value={s}>Semester {s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>SGPA (0-10)</label>
            <input name="sgpa" type="number" step="0.01" min={0} max={10} required placeholder="e.g. 8.65" className={fieldClass} />
          </div>
          <div>
            <label className={labelClass}>CGPA (0-10)</label>
            <input name="cgpaAtSemester" type="number" step="0.01" min={0} max={10} required placeholder="e.g. 8.50" className={fieldClass} />
          </div>
          <div>
            <label className={labelClass}>Backlogs (if any)</label>
            <input name="backlogCount" type="number" min={0} max={50} defaultValue="0" className={fieldClass} />
          </div>
          <div className="mb-0.5">
            <button
              type="submit"
              disabled={semPending}
              className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              {semPending ? 'Adding…' : 'Record semester'}
            </button>
          </div>
          <ActionMessage state={semState} />
        </form>

        <div className="mt-4">
          {semesters.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">No semester records logged yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="pb-2 pr-4">Semester</th>
                    <th className="pb-2 pr-4">SGPA</th>
                    <th className="pb-2 pr-4">CGPA</th>
                    <th className="pb-2 pr-4">Backlogs</th>
                    <th className="pb-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {semesters.map((s) => <SemesterRecordRow key={s.id} semester={s} />)}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------- Section: Certifications ----------------

function CertificationCard({ cert }: { cert: StudentCertification }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editState, editAction, editPending] = useActionState(updateStudentCertification, initialState)
  const [delState, delAction, delPending] = useActionState(deleteStudentCertification, initialState)

  return (
    <div className="rounded-xl border border-border bg-card p-4 transition">
      {isEditing ? (
        <form action={editAction} className="flex flex-col gap-3">
          <input type="hidden" name="id" value={cert.id} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Certification Title</label>
              <input name="name" defaultValue={cert.name} required maxLength={180} className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>Issuer / Organization</label>
              <input name="issuer" defaultValue={cert.issuer ?? ''} maxLength={180} className={fieldClass} />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Issue Date</label>
              <input
                name="issuedAt"
                type="date"
                defaultValue={cert.issuedAt ? new Date(cert.issuedAt).toISOString().slice(0, 10) : ''}
                className={fieldClass}
              />
            </div>
            <div>
              <label className={labelClass}>Accreditation Criterion (optional)</label>
              <select name="criterionCode" className={fieldClass} defaultValue="">
                <option value="">None / Select Criterion</option>
                {ACCREDITATION_CRITERIA.map((crit) => (
                  <option key={crit.code} value={crit.code}>{crit.label}</option>
                ))}
              </select>
            </div>
          </div>
          <DocumentUploadField id={`edit-cert-doc-${cert.id}`} name="fileUrl" label="Certificate File" defaultValue={cert.fileUrl ?? ''} />
          <div className="flex items-center gap-2">
            <button type="submit" disabled={editPending} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
              {editPending ? 'Saving…' : 'Save changes'}
            </button>
            <button type="button" onClick={() => setIsEditing(false)} className="rounded-lg border px-3 py-1.5 text-xs font-medium">
              Cancel
            </button>
            <ActionMessage state={editState} />
          </div>
        </form>
      ) : (
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="font-semibold text-foreground">{cert.name}</h4>
              <VerificationBadge status={cert.verificationStatus} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {cert.issuer && <span>Issued by <strong>{cert.issuer}</strong> • </span>}
              {cert.issuedAt && <span>{new Date(cert.issuedAt).toLocaleDateString()}</span>}
            </p>
            {cert.fileUrl && (
              <a
                href={cert.fileUrl.startsWith('http') ? cert.fileUrl : `/api/documents?pathname=${encodeURIComponent(cert.fileUrl)}`}
                target="_blank"
                rel="noreferrer"
                className="mt-1.5 inline-block text-xs font-medium text-primary underline hover:opacity-80"
              >
                View certificate file
              </a>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted"
            >
              Edit
            </button>
            <form action={delAction}>
              <input type="hidden" name="id" value={cert.id} />
              <button
                type="submit"
                disabled={delPending}
                className="rounded-lg bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive hover:bg-destructive/20 disabled:opacity-50"
              >
                {delPending ? '…' : 'Delete'}
              </button>
            </form>
          </div>
        </div>
      )}
      {delState.message && <ActionMessage state={delState} />}
    </div>
  )
}

function CertificationForm() {
  const [state, action, pending] = useActionState(addStudentCertification, initialState)
  return (
    <form action={action} className="flex flex-col gap-4 border-b border-border pb-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="cert-name" className={labelClass}>Certification title</label>
          <input id="cert-name" name="name" required maxLength={180} className={fieldClass} placeholder="e.g. AWS Solutions Architect Associate" />
        </div>
        <div>
          <label htmlFor="cert-issuer" className={labelClass}>Issuer / Organization</label>
          <input id="cert-issuer" name="issuer" maxLength={180} className={fieldClass} placeholder="e.g. Amazon Web Services" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="cert-date" className={labelClass}>Issue date</label>
          <input id="cert-date" name="issuedAt" type="date" className={fieldClass} />
        </div>
        <div>
          <label htmlFor="cert-crit" className={labelClass}>Tag to Accreditation Criterion (optional)</label>
          <select id="cert-crit" name="criterionCode" className={fieldClass} defaultValue="">
            <option value="">None / Select Criterion</option>
            {ACCREDITATION_CRITERIA.map((crit) => (
              <option key={crit.code} value={crit.code}>{crit.label}</option>
            ))}
          </select>
        </div>
      </div>
      <DocumentUploadField id="cert-file" name="fileUrl" label="Certificate File (PDF, PNG, JPG)" />
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

// ---------------- Section: Research & Patents ----------------

function ResearchPaperCard({ paper }: { paper: StudentResearchPaper }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editState, editAction, editPending] = useActionState(updateStudentResearchPaper, initialState)
  const [delState, delAction, delPending] = useActionState(deleteStudentResearchPaper, initialState)

  return (
    <div className="rounded-xl border border-border bg-card p-4 transition">
      {isEditing ? (
        <form action={editAction} className="flex flex-col gap-3">
          <input type="hidden" name="id" value={paper.id} />
          <div>
            <label className={labelClass}>Paper Title</label>
            <input name="title" defaultValue={paper.title} required maxLength={250} className={fieldClass} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Publication / Journal / Conference</label>
              <input name="publication" defaultValue={paper.publication ?? ''} maxLength={250} className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>DOI or Link</label>
              <input name="doi" defaultValue={paper.doi ?? ''} maxLength={200} className={fieldClass} />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Published Date</label>
              <input
                name="publishedAt"
                type="date"
                defaultValue={paper.publishedAt ? new Date(paper.publishedAt).toISOString().slice(0, 10) : ''}
                className={fieldClass}
              />
            </div>
            <div>
              <label className={labelClass}>Accreditation Criterion (optional)</label>
              <select name="criterionCode" className={fieldClass} defaultValue="">
                <option value="">None / Select Criterion</option>
                {ACCREDITATION_CRITERIA.map((crit) => (
                  <option key={crit.code} value={crit.code}>{crit.label}</option>
                ))}
              </select>
            </div>
          </div>
          <DocumentUploadField id={`edit-paper-doc-${paper.id}`} name="fileUrl" label="Paper Document" defaultValue={paper.fileUrl ?? ''} />
          <div className="flex items-center gap-2">
            <button type="submit" disabled={editPending} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
              {editPending ? 'Saving…' : 'Save changes'}
            </button>
            <button type="button" onClick={() => setIsEditing(false)} className="rounded-lg border px-3 py-1.5 text-xs font-medium">
              Cancel
            </button>
            <ActionMessage state={editState} />
          </div>
        </form>
      ) : (
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="font-semibold text-foreground">{paper.title}</h4>
              <VerificationBadge status={paper.verificationStatus} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {paper.publication && <span>Published in <strong>{paper.publication}</strong> • </span>}
              {paper.doi && <span>DOI: {paper.doi} • </span>}
              {paper.publishedAt && <span>{new Date(paper.publishedAt).toLocaleDateString()}</span>}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted"
            >
              Edit
            </button>
            <form action={delAction}>
              <input type="hidden" name="id" value={paper.id} />
              <button
                type="submit"
                disabled={delPending}
                className="rounded-lg bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive hover:bg-destructive/20 disabled:opacity-50"
              >
                {delPending ? '…' : 'Delete'}
              </button>
            </form>
          </div>
        </div>
      )}
      {delState.message && <ActionMessage state={delState} />}
    </div>
  )
}

function PatentCard({ patent }: { patent: StudentPatent }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editState, editAction, editPending] = useActionState(updateStudentPatent, initialState)
  const [delState, delAction, delPending] = useActionState(deleteStudentPatent, initialState)

  return (
    <div className="rounded-xl border border-border bg-card p-4 transition">
      {isEditing ? (
        <form action={editAction} className="flex flex-col gap-3">
          <input type="hidden" name="id" value={patent.id} />
          <div>
            <label className={labelClass}>Patent Title</label>
            <input name="title" defaultValue={patent.title} required maxLength={250} className={fieldClass} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Patent Number / Application No.</label>
              <input name="patentNumber" defaultValue={patent.patentNumber ?? ''} maxLength={100} className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>Filing Status</label>
              <select name="status" defaultValue={patent.status ?? 'PENDING'} className={fieldClass}>
                <option value="FILED">Filed</option>
                <option value="PUBLISHED">Published</option>
                <option value="GRANTED">Granted</option>
                <option value="PENDING">Pending</option>
              </select>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Filing Date</label>
              <input
                name="filedAt"
                type="date"
                defaultValue={patent.filedAt ? new Date(patent.filedAt).toISOString().slice(0, 10) : ''}
                className={fieldClass}
              />
            </div>
            <div>
              <label className={labelClass}>Accreditation Criterion (optional)</label>
              <select name="criterionCode" className={fieldClass} defaultValue="">
                <option value="">None / Select Criterion</option>
                {ACCREDITATION_CRITERIA.map((crit) => (
                  <option key={crit.code} value={crit.code}>{crit.label}</option>
                ))}
              </select>
            </div>
          </div>
          <DocumentUploadField id={`edit-patent-doc-${patent.id}`} name="fileUrl" label="Patent Document" defaultValue={patent.fileUrl ?? ''} />
          <div className="flex items-center gap-2">
            <button type="submit" disabled={editPending} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
              {editPending ? 'Saving…' : 'Save changes'}
            </button>
            <button type="button" onClick={() => setIsEditing(false)} className="rounded-lg border px-3 py-1.5 text-xs font-medium">
              Cancel
            </button>
            <ActionMessage state={editState} />
          </div>
        </form>
      ) : (
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="font-semibold text-foreground">{patent.title}</h4>
              {patent.status && (
                <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                  {patent.status}
                </span>
              )}
              <VerificationBadge status={patent.verificationStatus} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {patent.patentNumber && <span>App/Patent #: <strong>{patent.patentNumber}</strong> • </span>}
              {patent.filedAt && <span>Filed on {new Date(patent.filedAt).toLocaleDateString()}</span>}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted"
            >
              Edit
            </button>
            <form action={delAction}>
              <input type="hidden" name="id" value={patent.id} />
              <button
                type="submit"
                disabled={delPending}
                className="rounded-lg bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive hover:bg-destructive/20 disabled:opacity-50"
              >
                {delPending ? '…' : 'Delete'}
              </button>
            </form>
          </div>
        </div>
      )}
      {delState.message && <ActionMessage state={delState} />}
    </div>
  )
}

function ResearchForm() {
  const [paperState, paperAction, paperPending] = useActionState(addStudentResearchPaper, initialState)
  const [patentState, patentAction, patentPending] = useActionState(addStudentPatent, initialState)

  return (
    <div className="flex flex-col gap-8">
      {/* Research Paper Form */}
      <div>
        <h3 className="mb-4 text-base font-semibold text-foreground">Add Research Publication</h3>
        <form action={paperAction} className="flex flex-col gap-4 border-b border-border pb-6">
          <div>
            <label htmlFor="paper-title" className={labelClass}>Paper title</label>
            <input id="paper-title" name="title" required maxLength={250} className={fieldClass} placeholder="e.g. Deep Reinforcement Learning for Autonomous Navigation" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="paper-pub" className={labelClass}>Journal or Conference name</label>
              <input id="paper-pub" name="publication" maxLength={250} className={fieldClass} placeholder="e.g. IEEE Transactions on Neural Networks" />
            </div>
            <div>
              <label htmlFor="paper-doi" className={labelClass}>DOI or publication link</label>
              <input id="paper-doi" name="doi" maxLength={200} className={fieldClass} placeholder="10.1109/..." />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="paper-date" className={labelClass}>Publication date</label>
              <input id="paper-date" name="publishedAt" type="date" className={fieldClass} />
            </div>
            <div>
              <label htmlFor="paper-crit" className={labelClass}>Tag to Accreditation Criterion (optional)</label>
              <select id="paper-crit" name="criterionCode" className={fieldClass} defaultValue="">
                <option value="">None / Select Criterion</option>
                {ACCREDITATION_CRITERIA.map((crit) => (
                  <option key={crit.code} value={crit.code}>{crit.label}</option>
                ))}
              </select>
            </div>
          </div>
          <DocumentUploadField id="paper-file" name="fileUrl" label="Paper Manuscript / Proof" />
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={paperPending}
              className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {paperPending ? 'Adding…' : 'Add publication'}
            </button>
            <ActionMessage state={paperState} />
          </div>
        </form>
      </div>

      {/* Patent Form */}
      <div>
        <h3 className="mb-4 text-base font-semibold text-foreground">Add Patent</h3>
        <form action={patentAction} className="flex flex-col gap-4 border-b border-border pb-6">
          <div>
            <label htmlFor="pat-title" className={labelClass}>Patent title</label>
            <input id="pat-title" name="title" required maxLength={250} className={fieldClass} placeholder="e.g. IoT Sensor Cluster with Fault-Tolerant Mesh" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="pat-num" className={labelClass}>Patent / Application number</label>
              <input id="pat-num" name="patentNumber" maxLength={100} className={fieldClass} placeholder="e.g. US 11,234,567" />
            </div>
            <div>
              <label htmlFor="pat-status" className={labelClass}>Status</label>
              <select id="pat-status" name="status" className={fieldClass} defaultValue="FILED">
                <option value="FILED">Filed</option>
                <option value="PUBLISHED">Published</option>
                <option value="GRANTED">Granted</option>
                <option value="PENDING">Pending</option>
              </select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="pat-date" className={labelClass}>Filing date</label>
              <input id="pat-date" name="filedAt" type="date" className={fieldClass} />
            </div>
            <div>
              <label htmlFor="pat-crit" className={labelClass}>Tag to Accreditation Criterion (optional)</label>
              <select id="pat-crit" name="criterionCode" className={fieldClass} defaultValue="">
                <option value="">None / Select Criterion</option>
                {ACCREDITATION_CRITERIA.map((crit) => (
                  <option key={crit.code} value={crit.code}>{crit.label}</option>
                ))}
              </select>
            </div>
          </div>
          <DocumentUploadField id="pat-file" name="fileUrl" label="Patent Filing Document / Certificate" />
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={patentPending}
              className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {patentPending ? 'Adding…' : 'Add patent'}
            </button>
            <ActionMessage state={patentState} />
          </div>
        </form>
      </div>
    </div>
  )
}

// ---------------- Section: Projects & Internships ----------------

function ProjectCard({ project }: { project: StudentProject }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editState, editAction, editPending] = useActionState(updateStudentProject, initialState)
  const [delState, delAction, delPending] = useActionState(deleteStudentProject, initialState)

  return (
    <div className="rounded-xl border border-border bg-card p-4 transition">
      {isEditing ? (
        <form action={editAction} className="flex flex-col gap-3">
          <input type="hidden" name="id" value={project.id} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Project Title</label>
              <input name="title" defaultValue={project.title} required maxLength={180} className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>Repository / Live URL</label>
              <input name="repositoryUrl" defaultValue={project.repositoryUrl ?? ''} maxLength={2000} className={fieldClass} />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Start Date</label>
              <input
                name="startDate"
                type="date"
                defaultValue={project.startDate ? new Date(project.startDate).toISOString().slice(0, 10) : ''}
                className={fieldClass}
              />
            </div>
            <div>
              <label className={labelClass}>End Date</label>
              <input
                name="endDate"
                type="date"
                defaultValue={project.endDate ? new Date(project.endDate).toISOString().slice(0, 10) : ''}
                className={fieldClass}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Description</label>
            <textarea name="description" rows={2} defaultValue={project.description ?? ''} className={fieldClass} />
          </div>
          <div className="flex items-center gap-2">
            <button type="submit" disabled={editPending} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
              {editPending ? 'Saving…' : 'Save changes'}
            </button>
            <button type="button" onClick={() => setIsEditing(false)} className="rounded-lg border px-3 py-1.5 text-xs font-medium">
              Cancel
            </button>
            <ActionMessage state={editState} />
          </div>
        </form>
      ) : (
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div className="min-w-0 flex-1">
            <h4 className="font-semibold text-foreground">{project.title}</h4>
            {project.description && <p className="mt-1 text-xs text-foreground/80">{project.description}</p>}
            {project.repositoryUrl && (
              <a href={project.repositoryUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-primary underline">
                {project.repositoryUrl}
              </a>
            )}
            {(project.startDate || project.endDate) && (
              <p className="mt-1 text-xs text-muted-foreground">
                {project.startDate ? new Date(project.startDate).toLocaleDateString() : ''}
                {' – '}
                {project.endDate ? new Date(project.endDate).toLocaleDateString() : 'Ongoing'}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted"
            >
              Edit
            </button>
            <form action={delAction}>
              <input type="hidden" name="id" value={project.id} />
              <button
                type="submit"
                disabled={delPending}
                className="rounded-lg bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive hover:bg-destructive/20 disabled:opacity-50"
              >
                {delPending ? '…' : 'Delete'}
              </button>
            </form>
          </div>
        </div>
      )}
      {delState.message && <ActionMessage state={delState} />}
    </div>
  )
}

function InternshipCard({ intern }: { intern: StudentInternship }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editState, editAction, editPending] = useActionState(updateStudentInternship, initialState)
  const [delState, delAction, delPending] = useActionState(deleteStudentInternship, initialState)

  return (
    <div className="rounded-xl border border-border bg-card p-4 transition">
      {isEditing ? (
        <form action={editAction} className="flex flex-col gap-3">
          <input type="hidden" name="id" value={intern.id} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Company / Organization</label>
              <input name="organization" defaultValue={intern.organization} required maxLength={180} className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>Role / Title</label>
              <input name="role" defaultValue={intern.role ?? ''} maxLength={180} className={fieldClass} />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className={labelClass}>Stipend Amount</label>
              <input name="stipendAmount" defaultValue={intern.stipendAmount ?? ''} placeholder="e.g. $2500/mo" className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>Offer / Conversion</label>
              <select name="offerType" defaultValue={intern.offerType} className={fieldClass}>
                <option value="NONE">None</option>
                <option value="PPO_OFFERED">PPO Offered</option>
                <option value="CONVERTED_TO_JOB">Converted to Full-time</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Start Date</label>
              <input
                name="startDate"
                type="date"
                defaultValue={intern.startDate ? new Date(intern.startDate).toISOString().slice(0, 10) : ''}
                className={fieldClass}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Description</label>
            <textarea name="description" rows={2} defaultValue={intern.description ?? ''} className={fieldClass} />
          </div>
          <div className="flex items-center gap-2">
            <button type="submit" disabled={editPending} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
              {editPending ? 'Saving…' : 'Save changes'}
            </button>
            <button type="button" onClick={() => setIsEditing(false)} className="rounded-lg border px-3 py-1.5 text-xs font-medium">
              Cancel
            </button>
            <ActionMessage state={editState} />
          </div>
        </form>
      ) : (
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="font-semibold text-foreground">{intern.organization}</h4>
              {intern.role && <span className="text-xs font-medium text-foreground/80">• {intern.role}</span>}
              {intern.offerType !== 'NONE' && (
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-600">
                  {intern.offerType.replace(/_/g, ' ')}
                </span>
              )}
              <VerificationBadge status={intern.verificationStatus} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {intern.stipendAmount && <span>Stipend: <strong className="text-foreground">{intern.stipendAmount}</strong> • </span>}
              {(intern.startDate || intern.endDate) && (
                <span>
                  {intern.startDate ? new Date(intern.startDate).toLocaleDateString() : ''}
                  {' – '}
                  {intern.endDate ? new Date(intern.endDate).toLocaleDateString() : 'Present'}
                </span>
              )}
            </p>
            {intern.description && <p className="mt-1 text-xs text-foreground/80">{intern.description}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted"
            >
              Edit
            </button>
            <form action={delAction}>
              <input type="hidden" name="id" value={intern.id} />
              <button
                type="submit"
                disabled={delPending}
                className="rounded-lg bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive hover:bg-destructive/20 disabled:opacity-50"
              >
                {delPending ? '…' : 'Delete'}
              </button>
            </form>
          </div>
        </div>
      )}
      {delState.message && <ActionMessage state={delState} />}
    </div>
  )
}

function ProjectsTab() {
  const [projState, projAction, projPending] = useActionState(addStudentProject, initialState)
  const [internState, internAction, internPending] = useActionState(addStudentInternship, initialState)

  return (
    <div className="flex flex-col gap-8">
      {/* Project Form */}
      <div>
        <h3 className="mb-4 text-base font-semibold text-foreground">Add Project</h3>
        <form action={projAction} className="flex flex-col gap-4 border-b border-border pb-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="proj-title" className={labelClass}>Project title</label>
              <input id="proj-title" name="title" required maxLength={180} className={fieldClass} placeholder="e.g. Distributed Task Scheduler" />
            </div>
            <div>
              <label htmlFor="proj-repo" className={labelClass}>Repository or Demo link</label>
              <input id="proj-repo" name="repositoryUrl" maxLength={2000} className={fieldClass} placeholder="https://github.com/..." />
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
            <label htmlFor="proj-desc" className={labelClass}>Description &amp; Tech Stack</label>
            <textarea id="proj-desc" name="description" rows={2} maxLength={2000} className={fieldClass} placeholder="Implemented pipeline using Python, Go, and Redis..." />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={projPending}
              className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {projPending ? 'Adding…' : 'Add project'}
            </button>
            <ActionMessage state={projState} />
          </div>
        </form>
      </div>

      {/* Internship Form */}
      <div>
        <h3 className="mb-4 text-base font-semibold text-foreground">Add Internship</h3>
        <form action={internAction} className="flex flex-col gap-4 border-b border-border pb-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="intern-org" className={labelClass}>Company / Organization</label>
              <input id="intern-org" name="organization" required maxLength={180} className={fieldClass} placeholder="e.g. Microsoft" />
            </div>
            <div>
              <label htmlFor="intern-role" className={labelClass}>Role / Title</label>
              <input id="intern-role" name="role" maxLength={180} className={fieldClass} placeholder="e.g. Software Engineering Intern" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="intern-stipend" className={labelClass}>Stipend Amount (optional)</label>
              <input id="intern-stipend" name="stipendAmount" maxLength={50} className={fieldClass} placeholder="e.g. $4000/mo" />
            </div>
            <div>
              <label htmlFor="intern-offer" className={labelClass}>Offer / PPO Conversion</label>
              <select id="intern-offer" name="offerType" className={fieldClass} defaultValue="NONE">
                <option value="NONE">None</option>
                <option value="PPO_OFFERED">PPO Offered</option>
                <option value="CONVERTED_TO_JOB">Converted to Full-time</option>
              </select>
            </div>
            <div>
              <label htmlFor="intern-start" className={labelClass}>Start date</label>
              <input id="intern-start" name="startDate" type="date" className={fieldClass} />
            </div>
          </div>
          <div>
            <label htmlFor="intern-desc" className={labelClass}>Description &amp; Key Deliverables</label>
            <textarea id="intern-desc" name="description" rows={2} maxLength={2000} className={fieldClass} placeholder="Developed telemetry microservice reducing latency by 20%..." />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={internPending}
              className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {internPending ? 'Adding…' : 'Add internship'}
            </button>
            <ActionMessage state={internState} />
          </div>
        </form>
      </div>
    </div>
  )
}

// ---------------- Section: Skills ----------------

function SkillCard({ skill }: { skill: StudentSkill }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editState, editAction, editPending] = useActionState(updateStudentSkill, initialState)
  const [delState, delAction, delPending] = useActionState(deleteStudentSkill, initialState)

  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
      {isEditing ? (
        <form action={editAction} className="flex flex-1 flex-wrap items-center gap-2">
          <input type="hidden" name="id" value={skill.id} />
          <input name="skillName" defaultValue={skill.skillName} required className="h-8 rounded-lg border px-2 text-xs" />
          <select name="proficiency" defaultValue={skill.proficiency} className="h-8 rounded-lg border px-2 text-xs">
            <option value="BEGINNER">Beginner</option>
            <option value="INTERMEDIATE">Intermediate</option>
            <option value="ADVANCED">Advanced</option>
            <option value="EXPERT">Expert</option>
          </select>
          <button type="submit" disabled={editPending} className="rounded bg-primary px-2.5 py-1 text-xs text-primary-foreground">
            {editPending ? '…' : 'Save'}
          </button>
          <button type="button" onClick={() => setIsEditing(false)} className="rounded border px-2.5 py-1 text-xs">
            Cancel
          </button>
          <ActionMessage state={editState} />
        </form>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground text-sm">{skill.skillName}</span>
            <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
              {skill.proficiency.toLowerCase()}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="rounded border border-border px-2 py-0.5 text-xs hover:bg-muted"
            >
              Edit
            </button>
            <form action={delAction}>
              <input type="hidden" name="id" value={skill.id} />
              <button
                type="submit"
                disabled={delPending}
                className="rounded bg-destructive/10 px-2 py-0.5 text-xs text-destructive hover:bg-destructive/20 disabled:opacity-50"
              >
                {delPending ? '…' : 'Delete'}
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  )
}

function SkillsTab({ skills }: { skills: StudentSkill[] }) {
  const [state, action, pending] = useActionState(addStudentSkill, initialState)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="mb-3 text-base font-semibold text-foreground">Add Skill &amp; Competency</h3>
        <form action={action} className="flex flex-wrap items-end gap-3 border-b border-border pb-5">
          <div className="flex-1 min-w-[200px]">
            <label htmlFor="skill-name" className={labelClass}>Skill Name</label>
            <input id="skill-name" name="skillName" required maxLength={100} placeholder="e.g. React, Python, Docker" className={fieldClass} />
          </div>
          <div>
            <label htmlFor="skill-prof" className={labelClass}>Proficiency</label>
            <select id="skill-prof" name="proficiency" className={fieldClass} defaultValue="INTERMEDIATE">
              <option value="BEGINNER">Beginner</option>
              <option value="INTERMEDIATE">Intermediate</option>
              <option value="ADVANCED">Advanced</option>
              <option value="EXPERT">Expert</option>
            </select>
          </div>
          <div className="mb-0.5">
            <button
              type="submit"
              disabled={pending}
              className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              {pending ? 'Adding…' : 'Add skill'}
            </button>
          </div>
          <ActionMessage state={state} />
        </form>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {skills.length === 0 ? (
          <p className="col-span-2 py-6 text-center text-xs text-muted-foreground">
            No technical or soft skills added yet.
          </p>
        ) : (
          skills.map((s) => <SkillCard key={s.id} skill={s} />)
        )}
      </div>
    </div>
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
  | 'skills'
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
  skills = [],
  semesters = [],
  departments = [],
  courses = [],
  participations = [],
}: {
  studentName?: string
  email?: string
  profile: StudentProfileWithRelations
  education?: StudentEducation[]
  achievements?: Achievement[]
  certifications?: StudentCertification[]
  researchPapers?: StudentResearchPaper[]
  patents?: StudentPatent[]
  projects?: StudentProject[]
  internships?: StudentInternship[]
  skills?: StudentSkill[]
  semesters?: StudentSemesterRecord[]
  departments?: Department[]
  courses?: Course[]
  participations?: EventParticipationWithEvent[]
}) {
  const [activeTab, setActiveTab] = useState<TabKey>('personal')
  const [downloadingPdf, setDownloadingPdf] = useState(false)

  // Profile Completeness Calculation
  const sections = [
    Boolean(profile?.enrollmentNumber || profile?.departmentId || profile?.phone),
    education.length > 0 || semesters.length > 0,
    achievements.length > 0 || participations.length > 0,
    certifications.length > 0,
    researchPapers.length > 0 || patents.length > 0,
    projects.length > 0 || internships.length > 0,
    skills.length > 0,
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
          skills={skills}
          semesters={semesters}
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
    { key: 'personal', label: 'Personal & Identity' },
    { key: 'education', label: 'Education & Grades', count: education.length + semesters.length },
    { key: 'achievements', label: 'Achievements', count: achievements.length + eventRecognitions.length },
    { key: 'certifications', label: 'Certifications', count: certifications.length },
    { key: 'research', label: 'Research & Patents', count: researchPapers.length + patents.length },
    { key: 'projects', label: 'Projects & Internships', count: projects.length + internships.length },
    { key: 'skills', label: 'Skills', count: skills.length },
    { key: 'resume', label: 'Resume & Preview' },
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
            {completedSections} of {sections.length} core profile areas completed.
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

      {/* Tab 1: Personal */}
      {activeTab === 'personal' && (
        <section aria-label="Personal Details" className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-semibold">Personal &amp; Institutional Identity</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Maintain your official enrollment number, department, current semester, contact details, and social links.
            </p>
          </div>
          <ProfileForm profile={profile} departments={departments} courses={courses} />
        </section>
      )}

      {/* Tab 2: Education & Semesters */}
      {activeTab === 'education' && (
        <section aria-label="Education" className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-semibold">Education &amp; Academic Performance</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Formal qualifications, secondary school, degree details, and semester grade records.
            </p>
          </div>
          <EducationTab education={education} semesters={semesters} />
        </section>
      )}

      {/* Tab 3: Achievements */}
      {activeTab === 'achievements' && (
        <section aria-label="Achievements" className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-semibold">Achievements &amp; Honors</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Competitions, awards, and verified institutional event recognitions.
            </p>
          </div>
          <AchievementForm />
          <div className="mt-6 flex flex-col gap-3">
            {achievements.length === 0 && eventRecognitions.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-xs text-muted-foreground">
                No achievements recorded yet. Add your first achievement above.
              </p>
            ) : (
              <>
                {achievements.map((item) => (
                  <AchievementCard key={item.id} achievement={item} />
                ))}
                {eventRecognitions.map((event) => (
                  <div
                    key={`event-${event.id}`}
                    className="flex flex-col justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 sm:flex-row sm:items-start"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs font-bold text-primary">
                          CAMPUS EVENT
                        </span>
                        <h4 className="font-semibold text-foreground">{event.event.title}</h4>
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground">
                          {event.role}
                        </span>
                        {event.position && (
                          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-600">
                            {event.position}
                          </span>
                        )}
                        <VerificationBadge status="VERIFIED" />
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Department: {event.event.department?.name ?? 'Institution-wide'} • Date: {new Date(event.event.startsAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </section>
      )}

      {/* Tab 4: Certifications */}
      {activeTab === 'certifications' && (
        <section aria-label="Certifications" className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-semibold">Certifications &amp; Credentials</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Professional credentials, online courses, and certificates with verified documentation.
            </p>
          </div>
          <CertificationForm />
          <div className="mt-6 flex flex-col gap-3">
            {certifications.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-xs text-muted-foreground">
                No certifications recorded yet.
              </p>
            ) : (
              certifications.map((item) => <CertificationCard key={item.id} cert={item} />)
            )}
          </div>
        </section>
      )}

      {/* Tab 5: Research & Patents */}
      {activeTab === 'research' && (
        <section aria-label="Research & Patents" className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-semibold">Research Publications &amp; Patents</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Conference and journal publications, DOI citations, and patent filings.
            </p>
          </div>
          <ResearchForm />
          <div className="mt-8">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Published Papers</h3>
            <div className="flex flex-col gap-3">
              {researchPapers.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border px-4 py-4 text-center text-xs text-muted-foreground">
                  No research papers added yet.
                </p>
              ) : (
                researchPapers.map((item) => <ResearchPaperCard key={item.id} paper={item} />)
              )}
            </div>

            <h3 className="mb-3 mt-6 text-sm font-semibold text-foreground">Patents Filed / Granted</h3>
            <div className="flex flex-col gap-3">
              {patents.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border px-4 py-4 text-center text-xs text-muted-foreground">
                  No patents added yet.
                </p>
              ) : (
                patents.map((item) => <PatentCard key={item.id} patent={item} />)
              )}
            </div>
          </div>
        </section>
      )}

      {/* Tab 6: Projects & Internships */}
      {activeTab === 'projects' && (
        <section aria-label="Projects & Internships" className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-semibold">Projects &amp; Work Experience</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Personal projects, open-source repositories, internships, stipends, and full-time job conversions.
            </p>
          </div>
          <ProjectsTab />
          <div className="mt-8">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Projects</h3>
            <div className="flex flex-col gap-3">
              {projects.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border px-4 py-4 text-center text-xs text-muted-foreground">
                  No projects added yet.
                </p>
              ) : (
                projects.map((item) => <ProjectCard key={item.id} project={item} />)
              )}
            </div>

            <h3 className="mb-3 mt-6 text-sm font-semibold text-foreground">Internships &amp; Experience</h3>
            <div className="flex flex-col gap-3">
              {internships.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border px-4 py-4 text-center text-xs text-muted-foreground">
                  No internships added yet.
                </p>
              ) : (
                internships.map((item) => <InternshipCard key={item.id} intern={item} />)
              )}
            </div>
          </div>
        </section>
      )}

      {/* Tab 7: Skills */}
      {activeTab === 'skills' && (
        <section aria-label="Skills" className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-semibold">Technical &amp; Professional Skills</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Highlight programming languages, libraries, tools, and competencies with proficiency ratings.
            </p>
          </div>
          <SkillsTab skills={skills} />
        </section>
      )}

      {/* Tab 8: Resume */}
      {activeTab === 'resume' && (
        <section aria-label="Resume" className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Resume Preview &amp; PDF Export</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Formatted academic resume generated live from your verified institutional record.
              </p>
            </div>
            <button
              type="button"
              onClick={downloadPdf}
              disabled={downloadingPdf}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>{downloadingPdf ? 'Generating PDF…' : 'Download PDF Resume'}</span>
            </button>
          </div>

          {/* Interactive Document Preview */}
          <div className="rounded-2xl border border-border bg-muted/20 p-6 sm:p-10 font-sans shadow-inner">
            <div className="mx-auto max-w-3xl rounded-xl border border-border bg-background p-8 shadow-sm">
              {/* Preview Header */}
              <div className="flex items-start justify-between border-b border-border pb-5">
                <div>
                  <h3 className="text-2xl font-bold tracking-tight text-foreground">{studentName}</h3>
                  {(profile?.enrollmentNumber || profile?.department || profile?.currentSemester) && (
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold text-primary">
                      {profile.enrollmentNumber && <span>Enrollment: {profile.enrollmentNumber}</span>}
                      {profile.department && <span>• Dept: {profile.department.name}</span>}
                      {profile.currentSemester && <span>• Semester {profile.currentSemester}</span>}
                      {profile.admissionYear && <span>• Batch {profile.admissionYear}</span>}
                    </div>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span>{email}</span>
                    {profile?.phone && <span>• {profile.phone}</span>}
                    {profile?.address && <span>• {profile.address}</span>}
                  </div>
                  {(profile?.linkedinUrl || profile?.githubUrl || profile?.portfolioUrl) && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-primary underline">
                      {profile.linkedinUrl && <a href={profile.linkedinUrl} target="_blank" rel="noreferrer">LinkedIn</a>}
                      {profile.githubUrl && <a href={profile.githubUrl} target="_blank" rel="noreferrer">GitHub</a>}
                      {profile.portfolioUrl && <a href={profile.portfolioUrl} target="_blank" rel="noreferrer">Portfolio</a>}
                    </div>
                  )}
                </div>
                {profile?.photoUrl && (
                  <img
                    src={profile.photoUrl.startsWith('http') ? profile.photoUrl : `/api/documents?pathname=${encodeURIComponent(profile.photoUrl)}`}
                    alt={studentName}
                    className="h-16 w-16 rounded-full border border-border object-cover"
                  />
                )}
              </div>

              {/* Preview Skills */}
              {skills.length > 0 && (
                <div className="mt-5 border-b border-border pb-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Skills</h4>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {skills.map((s) => (
                      <span key={s.id} className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                        {s.skillName} ({s.proficiency.toLowerCase()})
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Preview Education */}
              {education.length > 0 && (
                <div className="mt-5 border-b border-border pb-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Education</h4>
                  <div className="mt-3 flex flex-col gap-2">
                    {education.map((edu) => (
                      <div key={edu.id} className="flex justify-between text-xs">
                        <div>
                          <strong className="text-foreground">{edu.courseOrStream || edu.level}</strong>
                          <p className="text-muted-foreground">{edu.institutionName}</p>
                        </div>
                        <div className="text-right text-muted-foreground">
                          {edu.score && <p>Score: {edu.score}</p>}
                          {(edu.startYear || edu.endYear) && <p>{edu.startYear ?? ''} - {edu.endYear ?? 'Present'}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Preview Semesters */}
              {semesters.length > 0 && (
                <div className="mt-5 border-b border-border pb-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Academic Grades</h4>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {semesters.map((s) => (
                      <div key={s.id} className="rounded border border-border bg-muted/30 px-2 py-1 text-[11px]">
                        <span className="font-semibold">Sem {s.semesterNumber}: </span>
                        <span>SGPA: {s.sgpa.toFixed(2)} | CGPA: {s.cgpaAtSemester.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Preview Internships */}
              {internships.length > 0 && (
                <div className="mt-5 border-b border-border pb-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Experience &amp; Internships</h4>
                  <div className="mt-3 flex flex-col gap-2.5">
                    {internships.map((intern) => (
                      <div key={intern.id} className="text-xs">
                        <div className="flex justify-between">
                          <strong className="text-foreground">{intern.role || 'Intern'} - {intern.organization}</strong>
                          {(intern.startDate || intern.endDate) && (
                            <span className="text-muted-foreground">
                              {intern.startDate ? new Date(intern.startDate).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : ''}
                              {' - '}
                              {intern.endDate ? new Date(intern.endDate).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : 'Present'}
                            </span>
                          )}
                        </div>
                        {intern.description && <p className="mt-1 text-foreground/80">{intern.description}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Preview Projects */}
              {projects.length > 0 && (
                <div className="mt-5 border-b border-border pb-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Projects</h4>
                  <div className="mt-3 flex flex-col gap-2.5">
                    {projects.map((proj) => (
                      <div key={proj.id} className="text-xs">
                        <strong className="text-foreground">{proj.title}</strong>
                        {proj.description && <p className="mt-1 text-foreground/80">{proj.description}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Preview Certifications & Honors */}
              {(certifications.length > 0 || achievements.length > 0) && (
                <div className="mt-5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Certifications &amp; Honors</h4>
                  <ul className="mt-2 list-inside list-disc text-xs text-foreground/90 space-y-1">
                    {certifications.map((c) => (
                      <li key={c.id}><strong>{c.name}</strong> {c.issuer ? `(${c.issuer})` : ''}</li>
                    ))}
                    {achievements.map((a) => (
                      <li key={a.id}><strong>{a.title}</strong> - {a.status} ({a.category})</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
