'use client'

import { useActionState, useState } from 'react'
import { Edit3, ExternalLink, Plus } from 'lucide-react'
import {
  addStudentInternship,
  addStudentProject,
  deleteStudentInternship,
  deleteStudentProject,
  updateStudentInternship,
  updateStudentProject,
  type StudentActionState,
} from '@/app/actions/student'
import type { StudentInternship, StudentProject } from '@/generated/prisma/client'
import {
  ActionMessage,
  ConfirmDeleteForm,
  DocumentPreviewLink,
  ReviewerFeedbackBanner,
  SingleDocumentUploadField,
  StudentSectionHeader,
  VerificationBadge,
  studentFieldClass,
  studentLabelClass,
} from './shared-ui'

const initialState: StudentActionState = { status: 'idle', message: '' }

export function StudentProjectsInternshipsSection({
  projects,
  internships,
}: {
  projects: StudentProject[]
  internships: StudentInternship[]
}) {
  const [projAddState, projAddAction, projAddPending] = useActionState(addStudentProject, initialState)
  const [projEditState, projEditAction, projEditPending] = useActionState(updateStudentProject, initialState)
  const [projDelState, projDelAction] = useActionState(deleteStudentProject, initialState)
  const [editingProjId, setEditingProjId] = useState<string | null>(null)

  const [intAddState, intAddAction, intAddPending] = useActionState(addStudentInternship, initialState)
  const [intEditState, intEditAction, intEditPending] = useActionState(updateStudentInternship, initialState)
  const [intDelState, intDelAction] = useActionState(deleteStudentInternship, initialState)
  const [editingIntId, setEditingIntId] = useState<string | null>(null)

  return (
    <div className="mt-6 flex flex-col gap-6">
      {/* Projects */}
      <section className="rounded-2xl border border-border bg-card p-6">
        <StudentSectionHeader
          title="Academic & Personal Projects"
          description="Document team members, faculty guides, technologies used, outcomes, and supporting evidence."
          badge={`${projects.length} Projects`}
        />

        <form action={projAddAction} className="mb-6 grid gap-4 rounded-xl border border-border bg-muted/20 p-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label htmlFor="proj-title" className={studentLabelClass}>Project Title</label>
            <input id="proj-title" name="title" required className={studentFieldClass} placeholder="Smart Campus Energy Monitor" />
          </div>
          <div>
            <label htmlFor="proj-guide" className={studentLabelClass}>Faculty Guide</label>
            <input id="proj-guide" name="facultyGuide" className={studentFieldClass} placeholder="Dr. A. Sharma" />
          </div>
          <div>
            <label htmlFor="proj-team" className={studentLabelClass}>Team Members</label>
            <input id="proj-team" name="teamMembers" className={studentFieldClass} placeholder="Alice, Bob, Charlie" />
          </div>
          <div>
            <label htmlFor="proj-tech" className={studentLabelClass}>Tech Stack (comma-separated)</label>
            <input id="proj-tech" name="techStack" className={studentFieldClass} placeholder="Next.js, PostgreSQL, IoT" />
          </div>
          <div>
            <label htmlFor="proj-repo" className={studentLabelClass}>Repository / Demo URL</label>
            <input id="proj-repo" name="repositoryUrl" type="url" className={studentFieldClass} placeholder="https://github.com/..." />
          </div>
          <div>
            <label htmlFor="proj-start" className={studentLabelClass}>Start Date</label>
            <input id="proj-start" name="startDate" type="date" className={studentFieldClass} />
          </div>
          <div>
            <label htmlFor="proj-end" className={studentLabelClass}>End Date (leave blank if ongoing)</label>
            <input id="proj-end" name="endDate" type="date" className={studentFieldClass} />
          </div>
          <div>
            <label htmlFor="proj-outcomes" className={studentLabelClass}>Key Outcomes</label>
            <input id="proj-outcomes" name="outcomes" className={studentFieldClass} placeholder="Deployed in 2 labs / 30% savings" />
          </div>
          <div className="sm:col-span-3">
            <label htmlFor="proj-desc" className={studentLabelClass}>Description</label>
            <textarea id="proj-desc" name="description" rows={2} className={studentFieldClass} />
          </div>
          <div className="sm:col-span-3">
            <SingleDocumentUploadField id="proj-ev" name="evidenceUrl" label="Project Report / Evidence (Optional)" />
          </div>
          <div className="sm:col-span-3 flex items-center gap-3">
            <button
              type="submit"
              disabled={projAddPending}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              <Plus size={14} /> {projAddPending ? 'Saving…' : 'Add Project'}
            </button>
            <ActionMessage state={projAddState} />
            <ActionMessage state={projDelState} />
          </div>
        </form>

        <div className="divide-y divide-border">
          {projects.map((proj) =>
            editingProjId === proj.id ? (
              <form key={proj.id} action={projEditAction} className="grid gap-3 py-4 sm:grid-cols-3">
                <input type="hidden" name="id" value={proj.id} />
                <input name="title" defaultValue={proj.title} required className={studentFieldClass} />
                <input name="facultyGuide" defaultValue={proj.facultyGuide ?? ''} placeholder="Faculty Guide" className={studentFieldClass} />
                <input name="teamMembers" defaultValue={proj.teamMembers ?? ''} placeholder="Team Members" className={studentFieldClass} />
                <input name="techStack" defaultValue={proj.techStack.join(', ')} placeholder="Tech Stack" className={studentFieldClass} />
                <input name="repositoryUrl" type="url" defaultValue={proj.repositoryUrl ?? ''} placeholder="Repository URL" className={studentFieldClass} />
                <input name="outcomes" defaultValue={proj.outcomes ?? ''} placeholder="Outcomes" className={studentFieldClass} />
                <input name="startDate" type="date" defaultValue={proj.startDate ? new Date(proj.startDate).toISOString().slice(0, 10) : ''} className={studentFieldClass} />
                <input name="endDate" type="date" defaultValue={proj.endDate ? new Date(proj.endDate).toISOString().slice(0, 10) : ''} className={studentFieldClass} />
                <textarea name="description" defaultValue={proj.description ?? ''} rows={2} className={`${studentFieldClass} sm:col-span-3`} />
                <div className="sm:col-span-3">
                  <SingleDocumentUploadField id={`edit-proj-ev-${proj.id}`} name="evidenceUrl" defaultValue={proj.evidenceUrl ?? ''} />
                </div>
                <div className="sm:col-span-3 flex items-center gap-2">
                  <button type="submit" disabled={projEditPending} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">Save</button>
                  <button type="button" onClick={() => setEditingProjId(null)} className="rounded-lg border border-border px-3 py-1.5 text-xs">Cancel</button>
                  <ActionMessage state={projEditState} />
                </div>
              </form>
            ) : (
              <div key={proj.id} className="flex flex-wrap items-start justify-between gap-3 py-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{proj.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {[
                      proj.facultyGuide && `Guide: ${proj.facultyGuide}`,
                      proj.teamMembers && `Team: ${proj.teamMembers}`,
                      proj.outcomes && `Outcome: ${proj.outcomes}`,
                    ]
                      .filter(Boolean)
                      .join(' • ')}
                  </p>
                  {proj.techStack.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {proj.techStack.map((t) => (
                        <span key={t} className="rounded-md bg-indigo-500/10 px-2 py-0.5 text-[11px] font-medium text-indigo-700 dark:text-indigo-300">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="mt-2 flex flex-wrap gap-3">
                    {proj.repositoryUrl && (
                      <a href={proj.repositoryUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-teal-600 hover:underline">
                        <ExternalLink size={12} /> Repository
                      </a>
                    )}
                    <DocumentPreviewLink fileUrl={proj.evidenceUrl} label="Preview Evidence" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setEditingProjId(proj.id)} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-500/10">
                    <Edit3 size={12} /> Edit
                  </button>
                  <ConfirmDeleteForm id={proj.id} action={projDelAction} itemLabel={proj.title} />
                </div>
              </div>
            ),
          )}
        </div>
      </section>

      {/* Internships */}
      <section className="rounded-2xl border border-border bg-card p-6">
        <StudentSectionHeader
          title="Internships & Industry Training"
          description="Record company details, stipend, faculty mentor, tech stack, outcomes, and completion certificates."
          badge={`${internships.length} Internships`}
        />

        <form action={intAddAction} className="mb-6 grid gap-4 rounded-xl border border-border bg-muted/20 p-4 sm:grid-cols-3">
          <div>
            <label htmlFor="int-org" className={studentLabelClass}>Company / Organization</label>
            <input id="int-org" name="organization" required className={studentFieldClass} placeholder="Acme Corp" />
          </div>
          <div>
            <label htmlFor="int-loc" className={studentLabelClass}>Location / Mode</label>
            <input id="int-loc" name="companyLocation" className={studentFieldClass} placeholder="Bengaluru / Remote" />
          </div>
          <div>
            <label htmlFor="int-role" className={studentLabelClass}>Role</label>
            <input id="int-role" name="role" className={studentFieldClass} placeholder="Software Engineer Intern" />
          </div>
          <div>
            <label htmlFor="int-guide" className={studentLabelClass}>Faculty Mentor</label>
            <input id="int-guide" name="facultyGuide" className={studentFieldClass} />
          </div>
          <div>
            <label htmlFor="int-stipend" className={studentLabelClass}>Stipend</label>
            <input id="int-stipend" name="stipendAmount" className={studentFieldClass} placeholder="₹25,000 / month" />
          </div>
          <div>
            <label htmlFor="int-offer" className={studentLabelClass}>Conversion / PPO</label>
            <select id="int-offer" name="offerType" className={studentFieldClass}>
              <option value="NONE">None</option>
              <option value="PPO_OFFERED">PPO Offered</option>
              <option value="CONVERTED_TO_JOB">Converted to Full-Time</option>
            </select>
          </div>
          <div>
            <label htmlFor="int-start" className={studentLabelClass}>Start Date</label>
            <input id="int-start" name="startDate" type="date" className={studentFieldClass} />
          </div>
          <div>
            <label htmlFor="int-end" className={studentLabelClass}>End Date</label>
            <input id="int-end" name="endDate" type="date" className={studentFieldClass} />
          </div>
          <div>
            <label htmlFor="int-tech" className={studentLabelClass}>Technologies Used</label>
            <input id="int-tech" name="techStack" className={studentFieldClass} placeholder="Python, Docker, AWS" />
          </div>
          <div className="sm:col-span-3">
            <label htmlFor="int-outcomes" className={studentLabelClass}>Outcomes &amp; Deliverables</label>
            <input id="int-outcomes" name="outcomes" className={studentFieldClass} placeholder="Built automated ETL pipeline" />
          </div>
          <div className="sm:col-span-3">
            <SingleDocumentUploadField id="int-ev" name="evidenceUrl" label="Internship Offer / Completion Certificate" />
          </div>
          <div className="sm:col-span-3 flex items-center gap-3">
            <button
              type="submit"
              disabled={intAddPending}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              <Plus size={14} /> {intAddPending ? 'Saving…' : 'Add Internship'}
            </button>
            <ActionMessage state={intAddState} />
            <ActionMessage state={intDelState} />
          </div>
        </form>

        <div className="divide-y divide-border">
          {internships.map((intItem) =>
            editingIntId === intItem.id ? (
              <form key={intItem.id} action={intEditAction} className="grid gap-3 py-4 sm:grid-cols-3">
                <input type="hidden" name="id" value={intItem.id} />
                <input name="organization" defaultValue={intItem.organization} required className={studentFieldClass} />
                <input name="companyLocation" defaultValue={intItem.companyLocation ?? ''} placeholder="Location" className={studentFieldClass} />
                <input name="role" defaultValue={intItem.role ?? ''} placeholder="Role" className={studentFieldClass} />
                <input name="facultyGuide" defaultValue={intItem.facultyGuide ?? ''} placeholder="Faculty Mentor" className={studentFieldClass} />
                <input name="stipendAmount" defaultValue={intItem.stipendAmount ?? ''} placeholder="Stipend" className={studentFieldClass} />
                <select name="offerType" defaultValue={intItem.offerType} className={studentFieldClass}>
                  <option value="NONE">None</option>
                  <option value="PPO_OFFERED">PPO Offered</option>
                  <option value="CONVERTED_TO_JOB">Converted to Full-Time</option>
                </select>
                <input name="startDate" type="date" defaultValue={intItem.startDate ? new Date(intItem.startDate).toISOString().slice(0, 10) : ''} className={studentFieldClass} />
                <input name="endDate" type="date" defaultValue={intItem.endDate ? new Date(intItem.endDate).toISOString().slice(0, 10) : ''} className={studentFieldClass} />
                <input name="techStack" defaultValue={intItem.techStack.join(', ')} placeholder="Tech Stack" className={studentFieldClass} />
                <input name="outcomes" defaultValue={intItem.outcomes ?? ''} placeholder="Outcomes" className={`${studentFieldClass} sm:col-span-3`} />
                <div className="sm:col-span-3">
                  <SingleDocumentUploadField id={`edit-int-ev-${intItem.id}`} name="evidenceUrl" defaultValue={intItem.evidenceUrl ?? ''} />
                </div>
                <div className="sm:col-span-3 flex items-center gap-2">
                  <button type="submit" disabled={intEditPending} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">Save</button>
                  <button type="button" onClick={() => setEditingIntId(null)} className="rounded-lg border border-border px-3 py-1.5 text-xs">Cancel</button>
                  <ActionMessage state={intEditState} />
                </div>
              </form>
            ) : (
              <div key={intItem.id} className="flex flex-wrap items-start justify-between gap-3 py-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground">{intItem.organization}</h3>
                    <VerificationBadge status={intItem.verificationStatus} verifiedAt={intItem.verifiedAt} rejectionReason={intItem.rejectionReason} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {[
                      intItem.role,
                      intItem.companyLocation,
                      intItem.stipendAmount && `Stipend: ${intItem.stipendAmount}`,
                      intItem.offerType !== 'NONE' && `Offer: ${intItem.offerType.replace(/_/g, ' ')}`,
                    ]
                      .filter(Boolean)
                      .join(' • ')}
                  </p>
                  {intItem.outcomes && <p className="mt-1 text-xs text-foreground/80">Outcomes: {intItem.outcomes}</p>}
                  <div className="mt-2">
                    <DocumentPreviewLink fileUrl={intItem.evidenceUrl} label="Preview Evidence" />
                  </div>
                  <ReviewerFeedbackBanner status={intItem.verificationStatus} rejectionReason={intItem.rejectionReason} />
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setEditingIntId(intItem.id)} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-500/10">
                    <Edit3 size={12} /> Edit
                  </button>
                  <ConfirmDeleteForm id={intItem.id} action={intDelAction} itemLabel={intItem.organization} />
                </div>
              </div>
            ),
          )}
        </div>
      </section>
    </div>
  )
}
