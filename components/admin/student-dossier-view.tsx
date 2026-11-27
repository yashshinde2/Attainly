'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import type { Prisma } from '@/generated/prisma/client'
import type { EventParticipationWithEvent } from '@/lib/server/repositories/event-repository'
import type { Document as DocRecord } from '@/generated/prisma/client'
import { DocumentPreviewLink, VerificationBadge } from '@/components/student/shared-ui'

type FullStudentProfile = Prisma.StudentProfileGetPayload<{
  include: {
    user: { select: { id: true; firstName: true; lastName: true; email: true; isActive: true; createdAt: true } }
    department: true
    course: true
    education: true
    semesterRecords: true
    achievements: true
    certifications: true
    researchPapers: true
    patents: true
    projects: true
    internships: true
    skills: true
    placementOffers: true
    graduateOutcome: true
  }
}>

export function AdminStudentDossierView({
  profile,
  participations,
  documents,
}: {
  profile: FullStudentProfile
  participations: EventParticipationWithEvent[]
  documents: DocRecord[]
}) {
  const [downloading, setDownloading] = useState(false)
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  const studentName = `${profile.user.firstName} ${profile.user.lastName}`.trim()

  const handleDownloadDossier = async () => {
    setDownloading(true)
    try {
      const [{ pdf }, { ResumePdfDocument }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('@/components/resume-pdf-document'),
      ])
      const doc = (
        <ResumePdfDocument
          studentName={studentName}
          email={profile.user.email}
          profile={profile}
          education={profile.education}
          achievements={verifiedOnly ? profile.achievements.filter((a) => a.verificationStatus === 'VERIFIED') : profile.achievements}
          certifications={verifiedOnly ? profile.certifications.filter((c) => c.verificationStatus === 'VERIFIED') : profile.certifications}
          researchPapers={verifiedOnly ? profile.researchPapers.filter((r) => r.verificationStatus === 'VERIFIED') : profile.researchPapers}
          patents={verifiedOnly ? profile.patents.filter((p) => p.verificationStatus === 'VERIFIED') : profile.patents}
          projects={profile.projects}
          internships={verifiedOnly ? profile.internships.filter((i) => i.verificationStatus === 'VERIFIED') : profile.internships}
          skills={profile.skills}
          semesters={profile.semesterRecords}
          participations={participations}
        />
      )
      const blob = await pdf(doc).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${studentName.replace(/\s+/g, '_')}_Institutional_Dossier.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="mt-6 flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-6">
        <div>
          <Link href="/admin/students" className="text-xs font-medium text-indigo-600 hover:underline">
            &larr; Back to Student Directory
          </Link>
          <h2 className="mt-2 text-2xl font-bold">{studentName}</h2>
          <p className="text-xs text-muted-foreground">
            {profile.user.email} &bull; Enrollment: {profile.enrollmentNumber ?? 'Unassigned'} &bull;{' '}
            {profile.department?.name ?? 'No Department'} &bull; {profile.academicStatus}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-2 text-xs font-medium">
            <input type="checkbox" checked={verifiedOnly} onChange={(e) => setVerifiedOnly(e.target.checked)} className="accent-indigo-600" />
            Verified claims only
          </label>
          <button
            type="button"
            disabled={downloading}
            onClick={handleDownloadDossier}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            {downloading ? 'Generating Dossier…' : 'Download Student Dossier (PDF)'}
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold">Academics &amp; Semesters</h3>
          <div className="mt-3 space-y-2 text-xs">
            {profile.semesterRecords.map((s) => (
              <div key={s.id} className="flex justify-between border-b border-border pb-1.5">
                <span>Semester {s.semesterNumber}</span>
                <span>SGPA {s.sgpa.toFixed(2)} &bull; CGPA {s.cgpaAtSemester.toFixed(2)}</span>
              </div>
            ))}
            {profile.semesterRecords.length === 0 && <p className="text-muted-foreground">No semester records.</p>}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold">Placements &amp; Graduate Outcome</h3>
          <div className="mt-3 space-y-2 text-xs">
            {profile.placementOffers.map((o) => (
              <div key={o.id} className="flex items-center justify-between border-b border-border pb-1.5">
                <span>{o.companyName} — {o.role} ({o.status})</span>
                <VerificationBadge status={o.verificationStatus} />
              </div>
            ))}
            {profile.graduateOutcome && (
              <p className="pt-2 font-medium text-teal-600">
                Final Outcome: {profile.graduateOutcome.outcomeType} ({profile.graduateOutcome.organizationOrUniversity ?? 'N/A'})
              </p>
            )}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold">Achievements, Certifications &amp; Research</h3>
        <div className="mt-3 divide-y divide-border text-xs">
          {profile.achievements.map((a) => (
            <div key={a.id} className="flex items-center justify-between py-2">
              <span>[Achievement] {a.title}</span>
              <VerificationBadge status={a.verificationStatus} />
            </div>
          ))}
          {profile.certifications.map((c) => (
            <div key={c.id} className="flex items-center justify-between py-2">
              <span>[Certification] {c.name}</span>
              <div className="flex items-center gap-3">
                <DocumentPreviewLink fileUrl={c.fileUrl} />
                <VerificationBadge status={c.verificationStatus} />
              </div>
            </div>
          ))}
          {profile.researchPapers.map((r) => (
            <div key={r.id} className="flex items-center justify-between py-2">
              <span>[Research] {r.title}</span>
              <div className="flex items-center gap-3">
                <DocumentPreviewLink fileUrl={r.fileUrl} />
                <VerificationBadge status={r.verificationStatus} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold">Submitted Documents ({documents.length})</h3>
        <div className="mt-3 divide-y divide-border text-xs">
          {documents.map((d) => (
            <div key={d.id} className="flex items-center justify-between py-2">
              <span>{d.originalFilename} ({(d.sizeBytes / 1024).toFixed(1)} KB)</span>
              <DocumentPreviewLink fileUrl={d.pathname} label="Preview" />
            </div>
          ))}
          {documents.length === 0 && <p className="text-muted-foreground">No uploaded documents.</p>}
        </div>
      </section>
    </div>
  )
}
