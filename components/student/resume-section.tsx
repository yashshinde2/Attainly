'use client'

import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import type {
  Achievement,
  StudentCertification,
  StudentEducation,
  StudentInternship,
  StudentPatent,
  StudentProject,
  StudentResearchPaper,
  StudentSemesterRecord,
  StudentSkill,
} from '@/generated/prisma/client'
import type { StudentProfileWithDetails } from '@/lib/server/repositories/student-profile-repository'
import type { EventParticipationWithEvent } from '@/lib/server/repositories/event-repository'
import { StudentSectionHeader } from './shared-ui'

export function StudentResumeSection({
  studentName,
  email,
  profile,
  education,
  achievements,
  certifications,
  researchPapers,
  patents,
  projects,
  internships,
  skills,
  semesters,
  participations,
}: {
  studentName: string
  email: string
  profile: StudentProfileWithDetails | null
  education: StudentEducation[]
  achievements: Achievement[]
  certifications: StudentCertification[]
  researchPapers: StudentResearchPaper[]
  patents: StudentPatent[]
  projects: StudentProject[]
  internships: StudentInternship[]
  skills: StudentSkill[]
  semesters: StudentSemesterRecord[]
  participations: EventParticipationWithEvent[]
}) {
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState('')

  // Configurable resume sections
  const [includeEducation, setIncludeEducation] = useState(true)
  const [includeSkills, setIncludeSkills] = useState(true)
  const [includeProjects, setIncludeProjects] = useState(true)
  const [includeInternships, setIncludeInternships] = useState(true)
  const [includeCertifications, setIncludeCertifications] = useState(true)
  const [includeAchievements, setIncludeAchievements] = useState(true)
  const [includeResearch, setIncludeResearch] = useState(true)
  const [verifiedOnly, setVerifiedOnly] = useState(false)

  const filteredAchievements = verifiedOnly
    ? achievements.filter((a) => a.verificationStatus === 'VERIFIED')
    : achievements
  const filteredCerts = verifiedOnly
    ? certifications.filter((c) => c.verificationStatus === 'VERIFIED')
    : certifications
  const filteredPapers = verifiedOnly
    ? researchPapers.filter((r) => r.verificationStatus === 'VERIFIED')
    : researchPapers
  const filteredPatents = verifiedOnly
    ? patents.filter((p) => p.verificationStatus === 'VERIFIED')
    : patents
  const filteredInternships = verifiedOnly
    ? internships.filter((i) => i.verificationStatus === 'VERIFIED')
    : internships

  const handleDownloadPdf = async () => {
    setDownloading(true)
    setError('')
    try {
      const [{ pdf }, { ResumePdfDocument }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('@/components/resume-pdf-document'),
      ])
      const doc = (
        <ResumePdfDocument
          studentName={studentName}
          email={email}
          profile={profile}
          education={includeEducation ? education : []}
          achievements={includeAchievements ? filteredAchievements : []}
          certifications={includeCertifications ? filteredCerts : []}
          researchPapers={includeResearch ? filteredPapers : []}
          patents={includeResearch ? filteredPatents : []}
          projects={includeProjects ? projects : []}
          internships={includeInternships ? filteredInternships : []}
          skills={includeSkills ? skills : []}
          semesters={includeEducation ? semesters : []}
          participations={includeAchievements ? participations : []}
        />
      )
      const blob = await pdf(doc).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${studentName.replace(/\s+/g, '_')}_Resume.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate resume PDF.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="mt-6 flex flex-col gap-6">
      <section className="rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <StudentSectionHeader
            title="Configurable Resume & Portfolio Builder"
            description="Choose which sections and verification status to include, then export a formatted PDF resume."
          />
          <button
            type="button"
            disabled={downloading}
            onClick={handleDownloadPdf}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
          >
            {downloading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
            {downloading ? 'Generating PDF…' : 'Download PDF Resume'}
          </button>
        </div>

        {error && <p className="mb-4 text-xs text-destructive">{error}</p>}

        {/* Section Configuration Toggles */}
        <div className="mb-6 flex flex-wrap gap-3 rounded-xl border border-border bg-muted/20 p-4 text-xs">
          {[
            ['Education & Grades', includeEducation, setIncludeEducation],
            ['Skills', includeSkills, setIncludeSkills],
            ['Projects', includeProjects, setIncludeProjects],
            ['Internships', includeInternships, setIncludeInternships],
            ['Certifications', includeCertifications, setIncludeCertifications],
            ['Achievements & Events', includeAchievements, setIncludeAchievements],
            ['Research & Patents', includeResearch, setIncludeResearch],
            ['Verified Claims Only', verifiedOnly, setVerifiedOnly],
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

        {/* Live Structured Preview */}
        <div className="rounded-xl border border-border bg-background p-6 space-y-5">
          <div className="border-b border-border pb-4">
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">{studentName}</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {[
                email,
                profile?.phone,
                profile?.enrollmentNumber && `ID: ${profile.enrollmentNumber}`,
                profile?.department?.name,
                profile?.currentSemester && `Semester ${profile.currentSemester}`,
              ]
                .filter(Boolean)
                .join(' • ')}
            </p>
            {profile?.bio && <p className="mt-2 text-xs text-foreground/80">{profile.bio}</p>}
          </div>

          {includeEducation && (education.length > 0 || semesters.length > 0) && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">Education</h4>
              <ul className="mt-2 space-y-1 text-xs">
                {education.map((e) => (
                  <li key={e.id}>
                    <strong>{e.institutionName}</strong> ({e.level}) {e.score ? `— ${e.score}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {includeSkills && skills.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">Skills</h4>
              <p className="mt-1.5 text-xs text-foreground">
                {skills.map((s) => `${s.skillName} (${s.proficiency})`).join(', ')}
              </p>
            </div>
          )}

          {includeInternships && filteredInternships.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">Internships</h4>
              <ul className="mt-2 space-y-1 text-xs">
                {filteredInternships.map((i) => (
                  <li key={i.id}>
                    <strong>{i.organization}</strong> {i.role ? `— ${i.role}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {includeProjects && projects.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">Projects</h4>
              <ul className="mt-2 space-y-1 text-xs">
                {projects.map((p) => (
                  <li key={p.id}>
                    <strong>{p.title}</strong> {p.techStack.length > 0 ? `(${p.techStack.join(', ')})` : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {includeCertifications && filteredCerts.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">Certifications</h4>
              <ul className="mt-2 space-y-1 text-xs">
                {filteredCerts.map((c) => (
                  <li key={c.id}>
                    <strong>{c.name}</strong> {c.issuer ? `— ${c.issuer}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {includeAchievements && filteredAchievements.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">Achievements</h4>
              <ul className="mt-2 space-y-1 text-xs">
                {filteredAchievements.map((a) => (
                  <li key={a.id}>
                    <strong>{a.title}</strong> ({a.categoryCode ?? a.category})
                  </li>
                ))}
              </ul>
            </div>
          )}

          {includeResearch && (filteredPapers.length > 0 || filteredPatents.length > 0) && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">Research &amp; Patents</h4>
              <ul className="mt-2 space-y-1 text-xs">
                {filteredPapers.map((r) => (
                  <li key={r.id}>Paper: <strong>{r.title}</strong></li>
                ))}
                {filteredPatents.map((p) => (
                  <li key={p.id}>Patent: <strong>{p.title}</strong></li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
