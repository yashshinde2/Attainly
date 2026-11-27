'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import type { Document as DocRecord, Prisma } from '@/generated/prisma/client'
import type { CanonicalPublicationWithContributors } from '@/lib/server/repositories/faculty-portfolio-repository'
import { DocumentPreviewLink, VerificationBadge } from '@/components/student/shared-ui'

type FullFacultyProfile = Prisma.FacultyProfileGetPayload<{
  include: {
    user: { select: { id: true; firstName: true; lastName: true; email: true; isActive: true; createdAt: true } }
    department: true
    education: true
    experiences: true
    teachingLoads: true
    developmentPrograms: true
    certifications: true
    researchPapers: true
    patents: true
    researchGrants: true
    consultancies: true
    contributions: true
  }
}>

export function AdminFacultyPortfolioView({
  profile,
  canonicalPublications,
  documents,
}: {
  profile: FullFacultyProfile
  canonicalPublications: CanonicalPublicationWithContributors[]
  documents: DocRecord[]
}) {
  const [downloading, setDownloading] = useState(false)
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  const facultyName = `${profile.user.firstName} ${profile.user.lastName}`.trim()

  const filterV = <T extends { verificationStatus: string }>(arr: T[]) =>
    verifiedOnly ? arr.filter((i) => i.verificationStatus === 'VERIFIED') : arr

  const handleDownloadPortfolio = async () => {
    setDownloading(true)
    try {
      const [{ pdf }, { FacultyAcademicCvDocument }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('@/components/faculty/academic-cv-document'),
      ])
      const doc = (
        <FacultyAcademicCvDocument
          facultyName={facultyName}
          email={profile.user.email}
          profile={profile}
          education={profile.education}
          experiences={profile.experiences}
          teachingLoads={profile.teachingLoads}
          fdps={filterV(profile.developmentPrograms)}
          certifications={filterV(profile.certifications)}
          publications={filterV(canonicalPublications)}
          grants={filterV(profile.researchGrants)}
          patents={filterV(profile.patents)}
          consultancies={filterV(profile.consultancies)}
          contributions={filterV(profile.contributions)}
        />
      )
      const blob = await pdf(doc).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${facultyName.replace(/\s+/g, '_')}_Faculty_Portfolio.pdf`
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
          <Link href="/admin/faculty" className="text-xs font-medium text-indigo-600 hover:underline">
            &larr; Back to Faculty Directory
          </Link>
          <h2 className="mt-2 text-2xl font-bold">{facultyName}</h2>
          <p className="text-xs text-muted-foreground">
            {profile.user.email} &bull; Employee ID: {profile.employeeId ?? 'Unassigned'} &bull;{' '}
            {profile.designation ?? 'No Designation'} &bull; {profile.department?.name ?? 'No Department'}
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
            onClick={handleDownloadPortfolio}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-60"
          >
            {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            {downloading ? 'Generating Portfolio…' : 'Download Faculty Portfolio (PDF)'}
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold">Qualifications &amp; Teaching Workload</h3>
          <div className="mt-3 space-y-2 text-xs">
            {profile.education.map((e) => (
              <div key={e.id} className="border-b border-border pb-1.5">
                <strong>{e.qualification}</strong> — {e.institutionName} ({e.yearCompleted ?? 'N/A'})
              </div>
            ))}
            {profile.teachingLoads.map((tl) => (
              <div key={tl.id} className="border-b border-border pb-1.5 text-muted-foreground">
                Teaching: {tl.subjectName} ({tl.academicYear}, Sem {tl.semester}, {tl.hoursPerWeek}h/wk)
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold">Research Publications &amp; Grants</h3>
          <div className="mt-3 space-y-2 text-xs">
            {canonicalPublications.map((p) => (
              <div key={p.id} className="flex items-center justify-between border-b border-border pb-1.5">
                <span>{p.title}</span>
                <VerificationBadge status={p.verificationStatus} />
              </div>
            ))}
            {profile.researchGrants.map((g) => (
              <div key={g.id} className="flex items-center justify-between border-b border-border pb-1.5">
                <span>[Grant] {g.title} ({g.fundingAgency})</span>
                <VerificationBadge status={g.verificationStatus} />
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold">FDPs, Consultancy &amp; Contributions</h3>
        <div className="mt-3 divide-y divide-border text-xs">
          {profile.developmentPrograms.map((f) => (
            <div key={f.id} className="flex items-center justify-between py-2">
              <span>[{f.programType}] {f.title}</span>
              <div className="flex items-center gap-3">
                <DocumentPreviewLink fileUrl={f.documentUrl} />
                <VerificationBadge status={f.verificationStatus} />
              </div>
            </div>
          ))}
          {profile.consultancies.map((c) => (
            <div key={c.id} className="flex items-center justify-between py-2">
              <span>[Consultancy] {c.title} ({c.clientOrganization})</span>
              <VerificationBadge status={c.verificationStatus} />
            </div>
          ))}
          {profile.contributions.map((ctr) => (
            <div key={ctr.id} className="flex items-center justify-between py-2">
              <span>[{ctr.contributionType}] {ctr.title}</span>
              <VerificationBadge status={ctr.verificationStatus} />
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
