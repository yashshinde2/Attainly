'use client'

import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import type {
  FacultyCertification,
  FacultyConsultancy,
  FacultyContribution,
  FacultyDevelopmentProgram,
  FacultyEducation,
  FacultyExperience,
  FacultyPatent,
  FacultyResearchGrant,
  FacultyTeachingLoad,
} from '@/generated/prisma/client'
import type { FacultyProfileWithDetails } from '@/lib/server/repositories/faculty-profile-repository'
import type { CanonicalPublicationWithContributors } from '@/lib/server/repositories/faculty-portfolio-repository'
import { StudentSectionHeader } from '@/components/student/shared-ui'

export function FacultyCvSection({
  facultyName,
  email,
  profile,
  education,
  experiences,
  teachingLoads,
  fdps,
  certifications,
  publications,
  grants,
  patents,
  consultancies,
  contributions,
}: {
  facultyName: string
  email: string
  profile: FacultyProfileWithDetails | null
  education: FacultyEducation[]
  experiences: FacultyExperience[]
  teachingLoads: FacultyTeachingLoad[]
  fdps: FacultyDevelopmentProgram[]
  certifications: FacultyCertification[]
  publications: CanonicalPublicationWithContributors[]
  grants: FacultyResearchGrant[]
  patents: FacultyPatent[]
  consultancies: FacultyConsultancy[]
  contributions: FacultyContribution[]
}) {
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState('')

  const [includeEducation, setIncludeEducation] = useState(true)
  const [includeExperience, setIncludeExperience] = useState(true)
  const [includePublications, setIncludePublications] = useState(true)
  const [includeGrantsPatents, setIncludeGrantsPatents] = useState(true)
  const [includeConsultancy, setIncludeConsultancy] = useState(true)
  const [includeDevelopment, setIncludeDevelopment] = useState(true)
  const [includeContributions, setIncludeContributions] = useState(true)
  const [verifiedOnly, setVerifiedOnly] = useState(false)

  const filterVerified = <T extends { verificationStatus: string }>(arr: T[]) =>
    verifiedOnly ? arr.filter((i) => i.verificationStatus === 'VERIFIED') : arr

  const handleDownloadPdf = async () => {
    setDownloading(true)
    setError('')
    try {
      const [{ pdf }, { FacultyAcademicCvDocument }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('@/components/faculty/academic-cv-document'),
      ])
      const doc = (
        <FacultyAcademicCvDocument
          facultyName={facultyName}
          email={email}
          profile={profile}
          education={includeEducation ? education : []}
          experiences={includeExperience ? experiences : []}
          teachingLoads={includeExperience ? teachingLoads : []}
          fdps={includeDevelopment ? filterVerified(fdps) : []}
          certifications={includeDevelopment ? filterVerified(certifications) : []}
          publications={includePublications ? filterVerified(publications) : []}
          grants={includeGrantsPatents ? filterVerified(grants) : []}
          patents={includeGrantsPatents ? filterVerified(patents) : []}
          consultancies={includeConsultancy ? filterVerified(consultancies) : []}
          contributions={includeContributions ? filterVerified(contributions) : []}
        />
      )
      const blob = await pdf(doc).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${facultyName.replace(/\s+/g, '_')}_Academic_CV.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate Academic CV.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-border bg-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <StudentSectionHeader
          title="Configurable Academic CV &amp; Portfolio Export"
          description="Select sections and verification scope to generate your standardized Academic CV PDF."
        />
        <button
          type="button"
          disabled={downloading}
          onClick={handleDownloadPdf}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {downloading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
          {downloading ? 'Generating CV…' : 'Download Academic CV (PDF)'}
        </button>
      </div>

      {error && <p className="mb-4 text-xs text-destructive">{error}</p>}

      <div className="mb-6 flex flex-wrap gap-3 rounded-xl border border-border bg-muted/20 p-4 text-xs">
        {[
          ['Qualifications', includeEducation, setIncludeEducation],
          ['Experience & Teaching', includeExperience, setIncludeExperience],
          ['Publications', includePublications, setIncludePublications],
          ['Grants & Patents', includeGrantsPatents, setIncludeGrantsPatents],
          ['Consultancy', includeConsultancy, setIncludeConsultancy],
          ['FDPs & Certifications', includeDevelopment, setIncludeDevelopment],
          ['Contributions', includeContributions, setIncludeContributions],
          ['Verified Records Only', verifiedOnly, setVerifiedOnly],
        ].map(([label, checked, setter]) => (
          <label key={String(label)} className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 font-medium">
            <input
              type="checkbox"
              checked={Boolean(checked)}
              onChange={(e) => (setter as (v: boolean) => void)(e.target.checked)}
              className="accent-indigo-600"
            />
            <span>{String(label)}</span>
          </label>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-background p-6 space-y-4 text-xs">
        <div className="border-b border-border pb-4">
          <h3 className="text-xl font-bold text-foreground">{facultyName}</h3>
          <p className="mt-1 text-muted-foreground">
            {[profile?.designation, profile?.department?.name, profile?.employeeId, email].filter(Boolean).join(' • ')}
          </p>
        </div>
        <p className="text-muted-foreground">
          Included summary: {includeEducation ? `${education.length} qualifications` : '0 qualifications'},{' '}
          {includePublications ? `${filterVerified(publications).length} publications` : '0 publications'},{' '}
          {includeGrantsPatents ? `${filterVerified(grants).length} grants, ${filterVerified(patents).length} patents` : '0 grants/patents'},{' '}
          {includeConsultancy ? `${filterVerified(consultancies).length} consultancy` : '0 consultancy'},{' '}
          {includeDevelopment ? `${filterVerified(fdps).length} FDPs` : '0 FDPs'}.
        </p>
      </div>
    </div>
  )
}
