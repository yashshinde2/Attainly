'use client'

import { useActionState } from 'react'
import {
  saveFacultyProfile,
  addFacultyEducation,
  addFacultyExperience,
  addFacultyCertification,
  addFacultyResearchPaper,
  addFacultyPatent,
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

const initialState: FacultyActionState = { status: 'idle', message: '' }
const fieldClass =
  'mt-2 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring'
const labelClass = 'text-sm font-medium text-foreground'

function ActionMessage({ state }: { state: FacultyActionState }) {
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

function ProfileForm({ profile }: { profile: FacultyProfile | null }) {
  const [state, action, pending] = useActionState(saveFacultyProfile, initialState)
  return (
    <form action={action} className="flex flex-col gap-5">
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
        <label htmlFor="office" className={labelClass}>Office location</label>
        <input
          id="office"
          name="office"
          type="text"
          defaultValue={profile?.office ?? ''}
          maxLength={120}
          className={fieldClass}
          placeholder="e.g. Science Block, Room 304"
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
  const [state, action, pending] = useActionState(addFacultyEducation, initialState)
  return (
    <form action={action} className="flex flex-col gap-4 border-b border-border pb-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="edu-qualification" className={labelClass}>Qualification</label>
          <input
            id="edu-qualification"
            name="qualification"
            required
            maxLength={180}
            className={fieldClass}
            placeholder="e.g. Ph.D., M.Tech, B.Sc."
          />
        </div>
        <div>
          <label htmlFor="edu-institution" className={labelClass}>Institution name</label>
          <input
            id="edu-institution"
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
          <label htmlFor="edu-field" className={labelClass}>Field of study</label>
          <input
            id="edu-field"
            name="fieldOfStudy"
            maxLength={180}
            className={fieldClass}
            placeholder="e.g. Computer Science"
          />
        </div>
        <div>
          <label htmlFor="edu-year" className={labelClass}>Year completed</label>
          <input
            id="edu-year"
            name="yearCompleted"
            type="number"
            min={1950}
            max={2100}
            className={fieldClass}
            placeholder="e.g. 2018"
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

function ExperienceForm() {
  const [state, action, pending] = useActionState(addFacultyExperience, initialState)
  return (
    <form action={action} className="flex flex-col gap-4 border-b border-border pb-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="exp-type" className={labelClass}>Experience type</label>
          <select id="exp-type" name="type" className={fieldClass} defaultValue="TEACHING">
            <option value="TEACHING">Teaching</option>
            <option value="INDUSTRY">Industry</option>
          </select>
        </div>
        <div>
          <label htmlFor="exp-org" className={labelClass}>Organization / Institution</label>
          <input
            id="exp-org"
            name="organization"
            required
            maxLength={180}
            className={fieldClass}
            placeholder="e.g. Google, MIT"
          />
        </div>
        <div>
          <label htmlFor="exp-title" className={labelClass}>Role / Title</label>
          <input
            id="exp-title"
            name="title"
            required
            maxLength={180}
            className={fieldClass}
            placeholder="e.g. Associate Professor, Senior Engineer"
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="exp-start" className={labelClass}>Start date</label>
          <input id="exp-start" name="startDate" type="date" className={fieldClass} />
        </div>
        <div>
          <label htmlFor="exp-end" className={labelClass}>End date</label>
          <input id="exp-end" name="endDate" type="date" className={fieldClass} />
        </div>
      </div>
      <div>
        <label htmlFor="exp-desc" className={labelClass}>Description</label>
        <textarea
          id="exp-desc"
          name="description"
          rows={2}
          maxLength={2000}
          className={fieldClass}
          placeholder="Brief summary of duties and impact"
        />
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
  )
}

function CertificationForm() {
  const [state, action, pending] = useActionState(addFacultyCertification, initialState)
  return (
    <form action={action} className="flex flex-col gap-4 border-b border-border pb-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="cert-name" className={labelClass}>Certification name</label>
          <input
            id="cert-name"
            name="name"
            required
            maxLength={180}
            className={fieldClass}
            placeholder="e.g. AWS Certified Solutions Architect"
          />
        </div>
        <div>
          <label htmlFor="cert-issuer" className={labelClass}>Issuing organization</label>
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
          <label htmlFor="cert-issued" className={labelClass}>Issued date</label>
          <input id="cert-issued" name="issuedAt" type="date" className={fieldClass} />
        </div>
        <div>
          <label htmlFor="cert-file" className={labelClass}>Credential URL</label>
          <input
            id="cert-file"
            name="fileUrl"
            maxLength={2000}
            className={fieldClass}
            placeholder="https://..."
          />
        </div>
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
  const [state, action, pending] = useActionState(addFacultyResearchPaper, initialState)
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
          placeholder="e.g. Deep Learning Architectures for Distributed Systems"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="paper-pub" className={labelClass}>Publication / Journal</label>
          <input
            id="paper-pub"
            name="publication"
            maxLength={250}
            className={fieldClass}
            placeholder="e.g. IEEE Transactions on Software Engineering"
          />
        </div>
        <div>
          <label htmlFor="paper-doi" className={labelClass}>DOI</label>
          <input
            id="paper-doi"
            name="doi"
            maxLength={100}
            className={fieldClass}
            placeholder="e.g. 10.1109/TSE.2024.1234567"
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="paper-date" className={labelClass}>Published date</label>
          <input id="paper-date" name="publishedAt" type="date" className={fieldClass} />
        </div>
        <div>
          <label htmlFor="paper-url" className={labelClass}>Paper link / URL</label>
          <input
            id="paper-url"
            name="fileUrl"
            maxLength={2000}
            className={fieldClass}
            placeholder="https://..."
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? 'Adding…' : 'Add research paper'}
        </button>
        <ActionMessage state={state} />
      </div>
    </form>
  )
}

function PatentForm() {
  const [state, action, pending] = useActionState(addFacultyPatent, initialState)
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
          placeholder="e.g. Adaptive Distributed Cache Synchronization Method"
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
            placeholder="e.g. US 11,234,567 B2"
          />
        </div>
        <div>
          <label htmlFor="patent-status" className={labelClass}>Status</label>
          <input
            id="patent-status"
            name="status"
            maxLength={50}
            className={fieldClass}
            placeholder="e.g. Granted, Filed, Pending"
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="patent-filed" className={labelClass}>Filed date</label>
          <input id="patent-filed" name="filedAt" type="date" className={fieldClass} />
        </div>
        <div>
          <label htmlFor="patent-url" className={labelClass}>Document / Verification URL</label>
          <input
            id="patent-url"
            name="fileUrl"
            maxLength={2000}
            className={fieldClass}
            placeholder="https://..."
          />
        </div>
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

export function FacultyWorkspace({
  profile,
  education,
  experiences,
  certifications,
  researchPapers,
  patents,
}: {
  profile: FacultyProfile | null
  education: FacultyEducation[]
  experiences: FacultyExperience[]
  certifications: FacultyCertification[]
  researchPapers: FacultyResearchPaper[]
  patents: FacultyPatent[]
}) {
  return (
    <div className="mt-8 flex flex-col gap-6">
      {/* Personal Details & Education */}
      <div className="grid gap-5 xl:grid-cols-2">
        <section aria-labelledby="profile-heading" className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="mb-6">
            <h2 id="profile-heading" className="text-lg font-semibold">Personal details</h2>
            <p className="mt-1 text-sm text-muted-foreground">Keep your faculty office contact information up to date.</p>
          </div>
          <ProfileForm profile={profile} />
        </section>

        <section aria-labelledby="education-heading" className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="mb-6">
            <h2 id="education-heading" className="text-lg font-semibold">Education &amp; Qualifications</h2>
            <p className="mt-1 text-sm text-muted-foreground">Record your academic qualifications and degrees.</p>
          </div>
          <EducationForm />
          <div className="flex flex-col gap-3 pt-5">
            {education.length ? (
              education.map((item) => (
                <article key={item.id} className="rounded-xl border border-border bg-background p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="font-medium">{item.qualification}</h3>
                    {item.yearCompleted && (
                      <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                        {item.yearCompleted}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{item.institutionName}</p>
                  {item.fieldOfStudy && (
                    <p className="mt-1 text-xs text-muted-foreground">Field: {item.fieldOfStudy}</p>
                  )}
                </article>
              ))
            ) : (
              <p className="rounded-xl border border-dashed border-border px-4 py-7 text-center text-sm text-muted-foreground">
                No education records added yet. Add your first qualification above.
              </p>
            )}
          </div>
        </section>
      </div>

      {/* Experience (Teaching vs Industry) */}
      <section aria-labelledby="experience-heading" className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="mb-6">
          <h2 id="experience-heading" className="text-lg font-semibold">Experience</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Track teaching appointments and industry engagements.
          </p>
        </div>
        <ExperienceForm />
        <div className="flex flex-col gap-3 pt-5">
          {experiences.length ? (
            experiences.map((exp) => (
              <article key={exp.id} className="rounded-xl border border-border bg-background p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="font-medium">{exp.title}</h3>
                    <p className="mt-0.5 text-sm text-muted-foreground">{exp.organization}</p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      exp.type === 'TEACHING'
                        ? 'bg-secondary text-secondary-foreground'
                        : 'bg-accent/20 text-accent-foreground'
                    }`}
                  >
                    {exp.type === 'TEACHING' ? 'Teaching' : 'Industry'}
                  </span>
                </div>
                {(exp.startDate || exp.endDate) && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {exp.startDate ? new Date(exp.startDate).toLocaleDateString() : '—'} &rarr;{' '}
                    {exp.endDate ? new Date(exp.endDate).toLocaleDateString() : 'Present'}
                  </p>
                )}
                {exp.description && <p className="mt-2 text-sm text-muted-foreground">{exp.description}</p>}
              </article>
            ))
          ) : (
            <p className="rounded-xl border border-dashed border-border px-4 py-7 text-center text-sm text-muted-foreground">
              No experience records added yet. Add teaching or industry experience above.
            </p>
          )}
        </div>
      </section>

      {/* Research Papers & Patents */}
      <div className="grid gap-5 xl:grid-cols-2">
        <section aria-labelledby="papers-heading" className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="mb-6">
            <h2 id="papers-heading" className="text-lg font-semibold">Research Papers</h2>
            <p className="mt-1 text-sm text-muted-foreground">Published journals, conference papers, and articles.</p>
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
                    {paper.doi && <span>DOI: {paper.doi}</span>}
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
                No research papers added yet. Add your first publication above.
              </p>
            )}
          </div>
        </section>

        <section aria-labelledby="patents-heading" className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="mb-6">
            <h2 id="patents-heading" className="text-lg font-semibold">Patents</h2>
            <p className="mt-1 text-sm text-muted-foreground">Patents filed or granted for your inventions.</p>
          </div>
          <PatentForm />
          <div className="flex flex-col gap-3 pt-5">
            {patents.length ? (
              patents.map((patent) => (
                <article key={patent.id} className="rounded-xl border border-border bg-background p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="font-medium">{patent.title}</h3>
                    {patent.status && (
                      <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                        {patent.status}
                      </span>
                    )}
                  </div>
                  {patent.patentNumber && (
                    <p className="mt-1 text-xs font-mono text-muted-foreground">No: {patent.patentNumber}</p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    {patent.filedAt && (
                      <span>Filed: {new Date(patent.filedAt).toLocaleDateString()}</span>
                    )}
                    {patent.fileUrl && (
                      <a
                        href={patent.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary underline hover:opacity-80"
                      >
                        View document
                      </a>
                    )}
                  </div>
                </article>
              ))
            ) : (
              <p className="rounded-xl border border-dashed border-border px-4 py-7 text-center text-sm text-muted-foreground">
                No patents added yet. Record your first patent above.
              </p>
            )}
          </div>
        </section>
      </div>

      {/* Certifications */}
      <section aria-labelledby="certifications-heading" className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="mb-6">
          <h2 id="certifications-heading" className="text-lg font-semibold">Certifications</h2>
          <p className="mt-1 text-sm text-muted-foreground">Professional and academic certifications.</p>
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
                  <p className="mt-2">
                    <a
                      href={cert.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-primary underline hover:opacity-80"
                    >
                      View certificate
                    </a>
                  </p>
                )}
              </article>
            ))
          ) : (
            <p className="rounded-xl border border-dashed border-border px-4 py-7 text-center text-sm text-muted-foreground">
              No certifications added yet. Add your first certification above.
            </p>
          )}
        </div>
      </section>
    </div>
  )
}
