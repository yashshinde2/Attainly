'use client'

import { useActionState, useState } from 'react'
import { saveFacultyProfile, type FacultyActionState } from '@/app/actions/faculty'
import type { FacultyProfileWithDetails } from '@/lib/server/repositories/faculty-profile-repository'
import {
  ActionMessage,
  StudentSectionHeader,
  studentFieldClass,
  studentLabelClass,
} from '@/components/student/shared-ui'

const initialState: FacultyActionState = { status: 'idle', message: '' }

export function FacultyProfileSection({
  facultyName,
  email,
  profile,
}: {
  facultyName: string
  email: string
  profile: FacultyProfileWithDetails | null
}) {
  const [state, action, pending] = useActionState(saveFacultyProfile, initialState)
  const [photoUrl, setPhotoUrl] = useState(profile?.photoUrl ?? '')
  const [uploading, setUploading] = useState(false)
  const [photoError, setPhotoError] = useState('')

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setPhotoError('')
    const fd = new FormData()
    fd.append('file', file)
    try {
      const res = await fetch('/api/documents', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      setPhotoUrl(data.fileUrl)
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-border bg-card p-6">
      <StudentSectionHeader
        title="My Profile"
        description="Manage your specialization, academic identifiers (ORCID, Google Scholar, Scopus), and contact details."
        badge={profile?.employmentStatus ?? 'ACTIVE'}
      />

      {/* Read-only Institutional Identity */}
      <div className="mb-6 rounded-xl border border-border bg-muted/30 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">Institutional Identity</h3>
          <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
            Institution-Controlled (Read-Only)
          </span>
        </div>
        <div className="grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-muted-foreground">Full Name &amp; Email</p>
            <p className="mt-1 font-semibold text-foreground">{facultyName} ({email})</p>
          </div>
          <div>
            <p className="text-muted-foreground">Employee Number</p>
            <p className="mt-1 font-semibold text-foreground">{profile?.employeeId ?? 'Not assigned'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Department</p>
            <p className="mt-1 font-semibold text-foreground">
              {profile?.department ? `${profile.department.name} (${profile.department.code})` : 'Unassigned'}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Designation</p>
            <p className="mt-1 font-semibold text-foreground">{profile?.designation ?? 'Not assigned'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Employment Type &amp; Status</p>
            <p className="mt-1 font-semibold text-foreground">
              {profile?.employmentType ?? 'Full-Time'} &bull; {profile?.employmentStatus ?? 'ACTIVE'}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Joining Date</p>
            <p className="mt-1 font-semibold text-foreground">
              {profile?.joiningDate ? new Date(profile.joiningDate).toLocaleDateString() : 'Not recorded'}
            </p>
          </div>
        </div>
      </div>

      <form action={action} className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-4">
          <input type="hidden" name="photoUrl" value={photoUrl} />
          {photoUrl ? (
            <img
              src={
                photoUrl.startsWith('http')
                  ? photoUrl
                  : `/api/documents?pathname=${encodeURIComponent(photoUrl)}&disposition=inline`
              }
              alt={facultyName}
              className="h-16 w-16 rounded-2xl border border-border object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-xs text-muted-foreground">
              No Photo
            </div>
          )}
          <div>
            <label htmlFor="faculty-photo" className={studentLabelClass}>Profile Photo</label>
            <input
              id="faculty-photo"
              type="file"
              accept=".png,.jpg,.jpeg"
              onChange={handlePhotoUpload}
              className="mt-1.5 block text-xs file:mr-2 file:rounded-lg file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-xs file:font-medium"
            />
            {uploading && <span className="mt-1 block text-xs text-muted-foreground">Uploading…</span>}
            {photoError && <span className="mt-1 block text-xs text-destructive">{photoError}</span>}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="phone" className={studentLabelClass}>Office Phone</label>
            <input id="phone" name="phone" type="tel" defaultValue={profile?.phone ?? ''} className={studentFieldClass} />
          </div>
          <div>
            <label htmlFor="office" className={studentLabelClass}>Office / Cabin</label>
            <input id="office" name="office" defaultValue={profile?.office ?? ''} className={studentFieldClass} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="specialization" className={studentLabelClass}>Academic Specialization</label>
            <input
              id="specialization"
              name="specialization"
              defaultValue={profile?.specialization ?? ''}
              className={studentFieldClass}
              placeholder="e.g. Distributed Systems, Machine Learning, VLSI"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="bio" className={studentLabelClass}>Academic Biography</label>
            <textarea
              id="bio"
              name="bio"
              rows={3}
              defaultValue={profile?.bio ?? ''}
              className={studentFieldClass}
              placeholder="Research interests, teaching philosophy, and academic leadership..."
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label htmlFor="orcidId" className={studentLabelClass}>ORCID iD</label>
            <input id="orcidId" name="orcidId" defaultValue={profile?.orcidId ?? ''} className={studentFieldClass} placeholder="0000-0002-1825-0097" />
          </div>
          <div>
            <label htmlFor="scopusAuthorId" className={studentLabelClass}>Scopus Author ID</label>
            <input id="scopusAuthorId" name="scopusAuthorId" defaultValue={profile?.scopusAuthorId ?? ''} className={studentFieldClass} />
          </div>
          <div>
            <label htmlFor="googleScholarUrl" className={studentLabelClass}>Google Scholar URL</label>
            <input id="googleScholarUrl" name="googleScholarUrl" type="url" defaultValue={profile?.googleScholarUrl ?? ''} className={studentFieldClass} placeholder="https://scholar.google.com/..." />
          </div>
          <div>
            <label htmlFor="linkedinUrl" className={studentLabelClass}>LinkedIn URL</label>
            <input id="linkedinUrl" name="linkedinUrl" type="url" defaultValue={profile?.linkedinUrl ?? ''} className={studentFieldClass} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="researchGateOrOrcidUrl" className={studentLabelClass}>ResearchGate / Institutional Profile URL</label>
            <input id="researchGateOrOrcidUrl" name="researchGateOrOrcidUrl" type="url" defaultValue={profile?.researchGateOrOrcidUrl ?? ''} className={studentFieldClass} />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {pending ? 'Saving…' : 'Save Profile'}
          </button>
          <ActionMessage state={state} />
        </div>
      </form>
    </div>
  )
}
