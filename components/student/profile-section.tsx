'use client'

import { useActionState, useState } from 'react'
import { saveStudentProfile, type StudentActionState } from '@/app/actions/student'
import type { StudentProfileWithDetails } from '@/lib/server/repositories/student-profile-repository'
import {
  ActionMessage,
  StudentSectionHeader,
  studentFieldClass,
  studentLabelClass,
} from './shared-ui'

const initialState: StudentActionState = { status: 'idle', message: '' }

export function StudentProfileSection({
  studentName,
  email,
  profile,
}: {
  studentName: string
  email: string
  profile: StudentProfileWithDetails | null
}) {
  const [state, action, pending] = useActionState(saveStudentProfile, initialState)
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
        description="Manage your personal details, emergency contacts, and portfolio links."
        badge={profile?.academicStatus ?? 'ACTIVE'}
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
            <p className="text-muted-foreground">Full Name &amp; Institutional Email</p>
            <p className="mt-1 font-semibold text-foreground">{studentName} ({email})</p>
          </div>
          <div>
            <p className="text-muted-foreground">Enrollment / Roll Number</p>
            <p className="mt-1 font-semibold text-foreground">{profile?.enrollmentNumber ?? 'Not assigned'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Department &amp; Program</p>
            <p className="mt-1 font-semibold text-foreground">
              {profile?.department?.name ?? 'Unassigned'} {profile?.course ? `• ${profile.course.name}` : ''}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Batch / Admission Year</p>
            <p className="mt-1 font-semibold text-foreground">
              {profile?.batchLabel ?? (profile?.admissionYear ? `Batch ${profile.admissionYear}` : 'Not assigned')}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Current Semester</p>
            <p className="mt-1 font-semibold text-foreground">
              {profile?.currentSemester ? `Semester ${profile.currentSemester}` : 'Not assigned'}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Academic Status</p>
            <p className="mt-1 font-semibold text-foreground">{profile?.academicStatus ?? 'ACTIVE'}</p>
          </div>
        </div>
      </div>

      <form action={action} className="flex flex-col gap-5">
        {/* Profile Photo */}
        <div className="flex flex-wrap items-center gap-4">
          <input type="hidden" name="photoUrl" value={photoUrl} />
          {photoUrl ? (
            <img
              src={
                photoUrl.startsWith('http')
                  ? photoUrl
                  : `/api/documents?pathname=${encodeURIComponent(photoUrl)}&disposition=inline`
              }
              alt={studentName}
              className="h-16 w-16 rounded-2xl border border-border object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-xs text-muted-foreground">
              No Photo
            </div>
          )}
          <div>
            <label htmlFor="student-photo" className={studentLabelClass}>Profile Photo</label>
            <input
              id="student-photo"
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
            <label htmlFor="dateOfBirth" className={studentLabelClass}>Date of Birth</label>
            <input
              id="dateOfBirth"
              name="dateOfBirth"
              type="date"
              defaultValue={profile?.dateOfBirth ? new Date(profile.dateOfBirth).toISOString().slice(0, 10) : ''}
              className={studentFieldClass}
            />
          </div>
          <div>
            <label htmlFor="phone" className={studentLabelClass}>Primary Phone</label>
            <input
              id="phone"
              name="phone"
              type="tel"
              defaultValue={profile?.phone ?? ''}
              maxLength={40}
              className={studentFieldClass}
              placeholder="+91 98765 43210"
            />
          </div>
          <div>
            <label htmlFor="alternateEmail" className={studentLabelClass}>Alternate Email</label>
            <input
              id="alternateEmail"
              name="alternateEmail"
              type="email"
              defaultValue={profile?.alternateEmail ?? ''}
              maxLength={254}
              className={studentFieldClass}
              placeholder="personal@example.com"
            />
          </div>
          <div>
            <label htmlFor="address" className={studentLabelClass}>Residential Address</label>
            <input
              id="address"
              name="address"
              defaultValue={profile?.address ?? ''}
              maxLength={500}
              className={studentFieldClass}
              placeholder="City, State"
            />
          </div>
          <div>
            <label htmlFor="emergencyContactName" className={studentLabelClass}>Emergency Contact Name</label>
            <input
              id="emergencyContactName"
              name="emergencyContactName"
              defaultValue={profile?.emergencyContactName ?? ''}
              maxLength={120}
              className={studentFieldClass}
            />
          </div>
          <div>
            <label htmlFor="emergencyContactPhone" className={studentLabelClass}>Emergency Contact Phone</label>
            <input
              id="emergencyContactPhone"
              name="emergencyContactPhone"
              type="tel"
              defaultValue={profile?.emergencyContactPhone ?? ''}
              maxLength={40}
              className={studentFieldClass}
            />
          </div>
        </div>

        <div>
          <label htmlFor="bio" className={studentLabelClass}>About / Academic Summary</label>
          <textarea
            id="bio"
            name="bio"
            rows={3}
            defaultValue={profile?.bio ?? ''}
            maxLength={1000}
            className={studentFieldClass}
            placeholder="Brief summary of your academic interests and career goals..."
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="linkedinUrl" className={studentLabelClass}>LinkedIn URL</label>
            <input
              id="linkedinUrl"
              name="linkedinUrl"
              type="url"
              defaultValue={profile?.linkedinUrl ?? ''}
              className={studentFieldClass}
              placeholder="https://linkedin.com/in/..."
            />
          </div>
          <div>
            <label htmlFor="githubUrl" className={studentLabelClass}>GitHub URL</label>
            <input
              id="githubUrl"
              name="githubUrl"
              type="url"
              defaultValue={profile?.githubUrl ?? ''}
              className={studentFieldClass}
              placeholder="https://github.com/..."
            />
          </div>
          <div>
            <label htmlFor="portfolioUrl" className={studentLabelClass}>Portfolio URL</label>
            <input
              id="portfolioUrl"
              name="portfolioUrl"
              type="url"
              defaultValue={profile?.portfolioUrl ?? ''}
              className={studentFieldClass}
              placeholder="https://..."
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
          >
            {pending ? 'Saving…' : 'Save Profile'}
          </button>
          <ActionMessage state={state} />
        </div>
      </form>
    </div>
  )
}
