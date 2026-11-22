'use client'

import { useActionState, useState } from 'react'
import {
  saveFacultyProfile,
  addFacultyEducation,
  updateFacultyEducation,
  deleteFacultyEducation,
  addFacultyExperience,
  updateFacultyExperience,
  deleteFacultyExperience,
  addFacultyCertification,
  updateFacultyCertification,
  deleteFacultyCertification,
  addFacultyResearchPaper,
  updateFacultyResearchPaper,
  deleteFacultyResearchPaper,
  addFacultyPatent,
  updateFacultyPatent,
  deleteFacultyPatent,
  type FacultyActionState,
} from '@/app/actions/faculty'
import type {
  FacultyProfile,
  FacultyEducation,
  FacultyExperience,
  FacultyCertification,
  FacultyResearchPaper,
  FacultyPatent,
} from '@/generated/prisma/client'
import type { EventParticipationWithEvent } from '@/lib/server/repositories/event-repository'

const initialState: FacultyActionState = { status: 'idle', message: '' }
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

function ActionMessage({ state }: { state: FacultyActionState }) {
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
      <label className={labelClass}>Faculty Photo</label>
      <input type="hidden" name="photoUrl" value={photoUrl} />
      <div className="flex items-center gap-4">
        {photoUrl ? (
          <img
            src={photoUrl.startsWith('http') ? photoUrl : `/api/documents?pathname=${encodeURIComponent(photoUrl)}`}
            alt="Faculty Photo"
            className="h-16 w-16 rounded-full border border-border object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-xs text-muted-foreground">
            No Photo
          </div>
        )}
        <div>
          <input
            id="faculty-photo-upload"
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

// ---------------- Tab 1: Personal ----------------

function ProfileForm({ profile }: { profile: FacultyProfile | null }) {
  const [state, action, pending] = useActionState(saveFacultyProfile, initialState)
  return (
    <form action={action} className="flex flex-col gap-5">
      <PhotoUploadField defaultValue={profile?.photoUrl ?? ''} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="phone" className={labelClass}>Office Phone</label>
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
          <label htmlFor="office" className={labelClass}>Office location / Cabin</label>
          <input
            id="office"
            name="office"
            defaultValue={profile?.office ?? ''}
            maxLength={120}
            className={fieldClass}
            placeholder="e.g. Science Block, Room 302"
          />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card/60 p-4">
        <h3 className="mb-3 font-semibold text-foreground">Academic &amp; Professional Links</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="linkedinUrl" className={labelClass}>LinkedIn Profile</label>
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
            <label htmlFor="researchGateOrOrcidUrl" className={labelClass}>ResearchGate / ORCID Profile</label>
            <input
              id="researchGateOrOrcidUrl"
              name="researchGateOrOrcidUrl"
              defaultValue={profile?.researchGateOrOrcidUrl ?? ''}
              maxLength={2000}
              className={fieldClass}
              placeholder="https://orcid.org/... or ResearchGate link"
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

// ---------------- Tab 2: Education ----------------

function EducationCard({ item }: { item: FacultyEducation }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editState, editAction, editPending] = useActionState(updateFacultyEducation, initialState)
  const [delState, delAction, delPending] = useActionState(deleteFacultyEducation, initialState)

  return (
    <div className="rounded-xl border border-border bg-card p-4 transition">
      {isEditing ? (
        <form action={editAction} className="flex flex-col gap-3">
          <input type="hidden" name="id" value={item.id} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Qualification</label>
              <input name="qualification" defaultValue={item.qualification} required maxLength={180} className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>Institution name</label>
              <input name="institutionName" defaultValue={item.institutionName} required maxLength={180} className={fieldClass} />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Field of study</label>
              <input name="fieldOfStudy" defaultValue={item.fieldOfStudy ?? ''} maxLength={180} className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>Year completed</label>
              <input name="yearCompleted" type="number" min={1950} max={2100} defaultValue={item.yearCompleted ?? ''} className={fieldClass} />
            </div>
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
            <h4 className="font-semibold text-foreground">{item.qualification}</h4>
            <p className="mt-1 text-xs text-muted-foreground">
              {item.institutionName}
              {item.fieldOfStudy && <span> • {item.fieldOfStudy}</span>}
              {item.yearCompleted && <span> • Class of {item.yearCompleted}</span>}
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
              <input type="hidden" name="id" value={item.id} />
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

function EducationTab({ education }: { education: FacultyEducation[] }) {
  const [state, action, pending] = useActionState(addFacultyEducation, initialState)

  return (
    <div className="flex flex-col gap-6">
      <form action={action} className="flex flex-col gap-4 border-b border-border pb-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="qualification" className={labelClass}>Qualification / Degree</label>
            <input id="qualification" name="qualification" required maxLength={180} className={fieldClass} placeholder="e.g. Ph.D. in Computer Science" />
          </div>
          <div>
            <label htmlFor="edu-inst" className={labelClass}>Institution name</label>
            <input id="edu-inst" name="institutionName" required maxLength={180} className={fieldClass} placeholder="e.g. MIT" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="fieldOfStudy" className={labelClass}>Field of study</label>
            <input id="fieldOfStudy" name="fieldOfStudy" maxLength={180} className={fieldClass} placeholder="e.g. Artificial Intelligence" />
          </div>
          <div>
            <label htmlFor="yearCompleted" className={labelClass}>Year completed</label>
            <input id="yearCompleted" name="yearCompleted" type="number" min={1950} max={2100} className={fieldClass} placeholder="e.g. 2018" />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? 'Adding…' : 'Add qualification'}
          </button>
          <ActionMessage state={state} />
        </div>
      </form>

      <div className="flex flex-col gap-3">
        {education.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-xs text-muted-foreground">
            No academic qualifications recorded yet.
          </p>
        ) : (
          education.map((item) => <EducationCard key={item.id} item={item} />)
        )}
      </div>
    </div>
  )
}

// ---------------- Tab 3: Experience ----------------

function ExperienceCard({ item }: { item: FacultyExperience }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editState, editAction, editPending] = useActionState(updateFacultyExperience, initialState)
  const [delState, delAction, delPending] = useActionState(deleteFacultyExperience, initialState)

  return (
    <div className="rounded-xl border border-border bg-card p-4 transition">
      {isEditing ? (
        <form action={editAction} className="flex flex-col gap-3">
          <input type="hidden" name="id" value={item.id} />
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className={labelClass}>Experience Type</label>
              <select name="type" defaultValue={item.type} className={fieldClass}>
                <option value="TEACHING">Teaching</option>
                <option value="INDUSTRY">Industry</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Organization</label>
              <input name="organization" defaultValue={item.organization} required maxLength={180} className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>Title / Role</label>
              <input name="title" defaultValue={item.title} required maxLength={180} className={fieldClass} />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Start Date</label>
              <input
                name="startDate"
                type="date"
                defaultValue={item.startDate ? new Date(item.startDate).toISOString().slice(0, 10) : ''}
                className={fieldClass}
              />
            </div>
            <div>
              <label className={labelClass}>End Date</label>
              <input
                name="endDate"
                type="date"
                defaultValue={item.endDate ? new Date(item.endDate).toISOString().slice(0, 10) : ''}
                className={fieldClass}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Description</label>
            <textarea name="description" rows={2} defaultValue={item.description ?? ''} className={fieldClass} />
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
              <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground">
                {item.type}
              </span>
              <h4 className="font-semibold text-foreground">{item.title}</h4>
              <span className="text-xs text-muted-foreground">• {item.organization}</span>
            </div>
            {(item.startDate || item.endDate) && (
              <p className="mt-1 text-xs text-muted-foreground">
                {item.startDate ? new Date(item.startDate).toLocaleDateString() : ''}
                {' – '}
                {item.endDate ? new Date(item.endDate).toLocaleDateString() : 'Present'}
              </p>
            )}
            {item.description && <p className="mt-1 text-xs text-foreground/80">{item.description}</p>}
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
              <input type="hidden" name="id" value={item.id} />
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

function ExperienceTab({ experiences }: { experiences: FacultyExperience[] }) {
  const [state, action, pending] = useActionState(addFacultyExperience, initialState)

  return (
    <div className="flex flex-col gap-6">
      <form action={action} className="flex flex-col gap-4 border-b border-border pb-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="exp-type" className={labelClass}>Type</label>
            <select id="exp-type" name="type" className={fieldClass} defaultValue="TEACHING">
              <option value="TEACHING">Teaching</option>
              <option value="INDUSTRY">Industry</option>
            </select>
          </div>
          <div>
            <label htmlFor="exp-org" className={labelClass}>Organization / Institution</label>
            <input id="exp-org" name="organization" required maxLength={180} className={fieldClass} placeholder="e.g. Stanford University" />
          </div>
          <div>
            <label htmlFor="exp-title" className={labelClass}>Title / Designation</label>
            <input id="exp-title" name="title" required maxLength={180} className={fieldClass} placeholder="e.g. Associate Professor" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="exp-start" className={labelClass}>Start date</label>
            <input id="exp-start" name="startDate" type="date" className={fieldClass} />
          </div>
          <div>
            <label htmlFor="exp-end" className={labelClass}>End date (blank if present)</label>
            <input id="exp-end" name="endDate" type="date" className={fieldClass} />
          </div>
        </div>
        <div>
          <label htmlFor="exp-desc" className={labelClass}>Description &amp; Key Responsibilities</label>
          <textarea id="exp-desc" name="description" rows={2} maxLength={2000} className={fieldClass} placeholder="Courses taught, labs directed, research supervised..." />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? 'Adding…' : 'Add experience'}
          </button>
          <ActionMessage state={state} />
        </div>
      </form>

      <div className="flex flex-col gap-3">
        {experiences.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-xs text-muted-foreground">
            No teaching or industry experiences recorded yet.
          </p>
        ) : (
          experiences.map((item) => <ExperienceCard key={item.id} item={item} />)
        )}
      </div>
    </div>
  )
}

// ---------------- Tab 4: Certifications ----------------

function CertificationCard({ item }: { item: FacultyCertification }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editState, editAction, editPending] = useActionState(updateFacultyCertification, initialState)
  const [delState, delAction, delPending] = useActionState(deleteFacultyCertification, initialState)

  return (
    <div className="rounded-xl border border-border bg-card p-4 transition">
      {isEditing ? (
        <form action={editAction} className="flex flex-col gap-3">
          <input type="hidden" name="id" value={item.id} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Certification Title</label>
              <input name="name" defaultValue={item.name} required maxLength={180} className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>Issuer / Organization</label>
              <input name="issuer" defaultValue={item.issuer ?? ''} maxLength={180} className={fieldClass} />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Issue Date</label>
              <input
                name="issuedAt"
                type="date"
                defaultValue={item.issuedAt ? new Date(item.issuedAt).toISOString().slice(0, 10) : ''}
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
          <DocumentUploadField id={`fac-cert-doc-${item.id}`} name="fileUrl" label="Certificate File" defaultValue={item.fileUrl ?? ''} />
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
              <h4 className="font-semibold text-foreground">{item.name}</h4>
              <VerificationBadge status={item.verificationStatus} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {item.issuer && <span>Issued by <strong>{item.issuer}</strong> • </span>}
              {item.issuedAt && <span>{new Date(item.issuedAt).toLocaleDateString()}</span>}
            </p>
            {item.fileUrl && (
              <a
                href={item.fileUrl.startsWith('http') ? item.fileUrl : `/api/documents?pathname=${encodeURIComponent(item.fileUrl)}`}
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
              <input type="hidden" name="id" value={item.id} />
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

function CertificationTab({ certifications }: { certifications: FacultyCertification[] }) {
  const [state, action, pending] = useActionState(addFacultyCertification, initialState)

  return (
    <div className="flex flex-col gap-6">
      <form action={action} className="flex flex-col gap-4 border-b border-border pb-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="f-cert-name" className={labelClass}>Certification title</label>
            <input id="f-cert-name" name="name" required maxLength={180} className={fieldClass} placeholder="e.g. Certified Data Science Educator" />
          </div>
          <div>
            <label htmlFor="f-cert-issuer" className={labelClass}>Issuer / Organization</label>
            <input id="f-cert-issuer" name="issuer" maxLength={180} className={fieldClass} placeholder="e.g. IEEE Education Society" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="f-cert-date" className={labelClass}>Issue date</label>
            <input id="f-cert-date" name="issuedAt" type="date" className={fieldClass} />
          </div>
          <div>
            <label htmlFor="f-cert-crit" className={labelClass}>Tag to Accreditation Criterion (optional)</label>
            <select id="f-cert-crit" name="criterionCode" className={fieldClass} defaultValue="">
              <option value="">None / Select Criterion</option>
              {ACCREDITATION_CRITERIA.map((crit) => (
                <option key={crit.code} value={crit.code}>{crit.label}</option>
              ))}
            </select>
          </div>
        </div>
        <DocumentUploadField id="f-cert-file" name="fileUrl" label="Certificate File (PDF, PNG, JPG)" />
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

      <div className="flex flex-col gap-3">
        {certifications.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-xs text-muted-foreground">
            No certifications recorded yet.
          </p>
        ) : (
          certifications.map((item) => <CertificationCard key={item.id} item={item} />)
        )}
      </div>
    </div>
  )
}

// ---------------- Tab 5: Research & Patents ----------------

function ResearchPaperCard({ item }: { item: FacultyResearchPaper }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editState, editAction, editPending] = useActionState(updateFacultyResearchPaper, initialState)
  const [delState, delAction, delPending] = useActionState(deleteFacultyResearchPaper, initialState)

  return (
    <div className="rounded-xl border border-border bg-card p-4 transition">
      {isEditing ? (
        <form action={editAction} className="flex flex-col gap-3">
          <input type="hidden" name="id" value={item.id} />
          <div>
            <label className={labelClass}>Paper Title</label>
            <input name="title" defaultValue={item.title} required maxLength={250} className={fieldClass} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Publication / Journal</label>
              <input name="publication" defaultValue={item.publication ?? ''} maxLength={250} className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>DOI or Link</label>
              <input name="doi" defaultValue={item.doi ?? ''} maxLength={100} className={fieldClass} />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Published Date</label>
              <input
                name="publishedAt"
                type="date"
                defaultValue={item.publishedAt ? new Date(item.publishedAt).toISOString().slice(0, 10) : ''}
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
          <DocumentUploadField id={`fac-paper-doc-${item.id}`} name="fileUrl" label="Paper Manuscript / Proof" defaultValue={item.fileUrl ?? ''} />
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
              <h4 className="font-semibold text-foreground">{item.title}</h4>
              <VerificationBadge status={item.verificationStatus} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {item.publication && <span>Published in <strong>{item.publication}</strong> • </span>}
              {item.doi && <span>DOI: {item.doi} • </span>}
              {item.publishedAt && <span>{new Date(item.publishedAt).toLocaleDateString()}</span>}
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
              <input type="hidden" name="id" value={item.id} />
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

function PatentCard({ item }: { item: FacultyPatent }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editState, editAction, editPending] = useActionState(updateFacultyPatent, initialState)
  const [delState, delAction, delPending] = useActionState(deleteFacultyPatent, initialState)

  return (
    <div className="rounded-xl border border-border bg-card p-4 transition">
      {isEditing ? (
        <form action={editAction} className="flex flex-col gap-3">
          <input type="hidden" name="id" value={item.id} />
          <div>
            <label className={labelClass}>Patent Title</label>
            <input name="title" defaultValue={item.title} required maxLength={250} className={fieldClass} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Patent Number</label>
              <input name="patentNumber" defaultValue={item.patentNumber ?? ''} maxLength={100} className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>Status</label>
              <select name="status" defaultValue={item.status ?? 'PENDING'} className={fieldClass}>
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
                defaultValue={item.filedAt ? new Date(item.filedAt).toISOString().slice(0, 10) : ''}
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
          <DocumentUploadField id={`fac-patent-doc-${item.id}`} name="fileUrl" label="Patent Certificate" defaultValue={item.fileUrl ?? ''} />
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
              <h4 className="font-semibold text-foreground">{item.title}</h4>
              {item.status && (
                <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                  {item.status}
                </span>
              )}
              <VerificationBadge status={item.verificationStatus} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {item.patentNumber && <span>App/Patent #: <strong>{item.patentNumber}</strong> • </span>}
              {item.filedAt && <span>Filed on {new Date(item.filedAt).toLocaleDateString()}</span>}
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
              <input type="hidden" name="id" value={item.id} />
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

function ResearchTab({
  researchPapers,
  patents,
}: {
  researchPapers: FacultyResearchPaper[]
  patents: FacultyPatent[]
}) {
  const [paperState, paperAction, paperPending] = useActionState(addFacultyResearchPaper, initialState)
  const [patState, patAction, patPending] = useActionState(addFacultyPatent, initialState)

  return (
    <div className="flex flex-col gap-8">
      {/* Publications Form */}
      <div>
        <h3 className="mb-4 text-base font-semibold text-foreground">Add Research Publication</h3>
        <form action={paperAction} className="flex flex-col gap-4 border-b border-border pb-6">
          <div>
            <label htmlFor="f-paper-title" className={labelClass}>Paper title</label>
            <input id="f-paper-title" name="title" required maxLength={250} className={fieldClass} placeholder="e.g. Distributed Quantum Algorithms" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="f-paper-pub" className={labelClass}>Journal or Conference name</label>
              <input id="f-paper-pub" name="publication" maxLength={250} className={fieldClass} placeholder="e.g. ACM Computing Surveys" />
            </div>
            <div>
              <label htmlFor="f-paper-doi" className={labelClass}>DOI or citation link</label>
              <input id="f-paper-doi" name="doi" maxLength={100} className={fieldClass} placeholder="10.1145/..." />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="f-paper-date" className={labelClass}>Publication date</label>
              <input id="f-paper-date" name="publishedAt" type="date" className={fieldClass} />
            </div>
            <div>
              <label htmlFor="f-paper-crit" className={labelClass}>Tag to Accreditation Criterion (optional)</label>
              <select id="f-paper-crit" name="criterionCode" className={fieldClass} defaultValue="">
                <option value="">None / Select Criterion</option>
                {ACCREDITATION_CRITERIA.map((crit) => (
                  <option key={crit.code} value={crit.code}>{crit.label}</option>
                ))}
              </select>
            </div>
          </div>
          <DocumentUploadField id="f-paper-file" name="fileUrl" label="Paper Manuscript / Proof" />
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

        <div className="mt-4 flex flex-col gap-3">
          {researchPapers.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-4 py-4 text-center text-xs text-muted-foreground">
              No research papers recorded yet.
            </p>
          ) : (
            researchPapers.map((item) => <ResearchPaperCard key={item.id} item={item} />)
          )}
        </div>
      </div>

      {/* Patents Form */}
      <div>
        <h3 className="mb-4 text-base font-semibold text-foreground">Add Patent</h3>
        <form action={patAction} className="flex flex-col gap-4 border-b border-border pb-6">
          <div>
            <label htmlFor="f-pat-title" className={labelClass}>Patent title</label>
            <input id="f-pat-title" name="title" required maxLength={250} className={fieldClass} placeholder="e.g. Energy-Efficient Neural Accelerator" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="f-pat-num" className={labelClass}>Patent / Application number</label>
              <input id="f-pat-num" name="patentNumber" maxLength={100} className={fieldClass} placeholder="e.g. US 10,987,654" />
            </div>
            <div>
              <label htmlFor="f-pat-status" className={labelClass}>Status</label>
              <select id="f-pat-status" name="status" className={fieldClass} defaultValue="FILED">
                <option value="FILED">Filed</option>
                <option value="PUBLISHED">Published</option>
                <option value="GRANTED">Granted</option>
                <option value="PENDING">Pending</option>
              </select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="f-pat-date" className={labelClass}>Filing date</label>
              <input id="f-pat-date" name="filedAt" type="date" className={fieldClass} />
            </div>
            <div>
              <label htmlFor="f-pat-crit" className={labelClass}>Tag to Accreditation Criterion (optional)</label>
              <select id="f-pat-crit" name="criterionCode" className={fieldClass} defaultValue="">
                <option value="">None / Select Criterion</option>
                {ACCREDITATION_CRITERIA.map((crit) => (
                  <option key={crit.code} value={crit.code}>{crit.label}</option>
                ))}
              </select>
            </div>
          </div>
          <DocumentUploadField id="f-pat-file" name="fileUrl" label="Patent Certificate / Proof" />
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={patPending}
              className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {patPending ? 'Adding…' : 'Add patent'}
            </button>
            <ActionMessage state={patState} />
          </div>
        </form>

        <div className="mt-4 flex flex-col gap-3">
          {patents.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-4 py-4 text-center text-xs text-muted-foreground">
              No patents recorded yet.
            </p>
          ) : (
            patents.map((item) => <PatentCard key={item.id} item={item} />)
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------- Main Faculty Tabbed Workspace ----------------

type FacultyTabKey = 'personal' | 'education' | 'experience' | 'certifications' | 'research'

export function FacultyWorkspace({
  profile,
  education = [],
  experiences = [],
  certifications = [],
  researchPapers = [],
  patents = [],
  participations = [],
}: {
  profile: FacultyProfile | null
  education: FacultyEducation[]
  experiences: FacultyExperience[]
  certifications: FacultyCertification[]
  researchPapers: FacultyResearchPaper[]
  patents: FacultyPatent[]
  participations: EventParticipationWithEvent[]
}) {
  const [activeTab, setActiveTab] = useState<FacultyTabKey>('personal')

  const tabs: Array<{ key: FacultyTabKey; label: string; count?: number }> = [
    { key: 'personal', label: 'Personal & Office' },
    { key: 'education', label: 'Education', count: education.length },
    { key: 'experience', label: 'Experience', count: experiences.length },
    { key: 'certifications', label: 'Certifications', count: certifications.length },
    { key: 'research', label: 'Research & Patents', count: researchPapers.length + patents.length },
  ]

  return (
    <div className="mt-8 flex flex-col gap-6">
      {/* Tab Navigation */}
      <nav aria-label="Faculty profile sections" className="flex flex-wrap gap-1.5 border-b border-border pb-3">
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
        <section aria-label="Faculty Personal" className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-semibold">Faculty Profile &amp; Contact</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage your office location, contact phone, profile photo, and academic research profiles.
            </p>
          </div>
          <ProfileForm profile={profile} />
        </section>
      )}

      {/* Tab 2: Education */}
      {activeTab === 'education' && (
        <section aria-label="Faculty Education" className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-semibold">Academic Qualifications</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Undergraduate, postgraduate, and doctorate qualifications.
            </p>
          </div>
          <EducationTab education={education} />
        </section>
      )}

      {/* Tab 3: Experience */}
      {activeTab === 'experience' && (
        <section aria-label="Faculty Experience" className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-semibold">Teaching &amp; Industry Experience</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Professional history across academic institutions and industrial roles.
            </p>
          </div>
          <ExperienceTab experiences={experiences} />
        </section>
      )}

      {/* Tab 4: Certifications */}
      {activeTab === 'certifications' && (
        <section aria-label="Faculty Certifications" className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-semibold">Professional Certifications &amp; Training</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Faculty development programs, industry certifications, and accreditation credentials.
            </p>
          </div>
          <CertificationTab certifications={certifications} />
        </section>
      )}

      {/* Tab 5: Research & Patents */}
      {activeTab === 'research' && (
        <section aria-label="Faculty Research" className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-semibold">Research Publications &amp; Patents</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Publications, peer-reviewed journal articles, conference proceedings, and patent filings.
            </p>
          </div>
          <ResearchTab researchPapers={researchPapers} patents={patents} />

          {/* Institutional Recognitions / Events */}
          {participations.length > 0 && (
            <div className="mt-8 border-t border-border pt-6">
              <h3 className="mb-3 text-base font-semibold text-foreground">Institutional Events &amp; Outcomes</h3>
              <div className="flex flex-col gap-3">
                {participations.map((part) => (
                  <div
                    key={part.id}
                    className="flex flex-col justify-between gap-2 rounded-xl border border-primary/20 bg-primary/5 p-4 sm:flex-row sm:items-center"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs font-bold text-primary">
                          {part.event.type}
                        </span>
                        <h4 className="font-semibold text-foreground">{part.event.title}</h4>
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground">
                          {part.role}
                        </span>
                        {part.position && (
                          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-600">
                            {part.position}
                          </span>
                        )}
                        <VerificationBadge status="VERIFIED" />
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(part.event.startsAt).toLocaleDateString()} – {new Date(part.event.endsAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
