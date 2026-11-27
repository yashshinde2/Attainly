'use client'

import { useActionState, useState } from 'react'
import { Edit3, Plus } from 'lucide-react'
import {
  addFacultyCertification,
  addFacultyFdpAction,
  deleteFacultyCertification,
  deleteFacultyFdpAction,
  updateFacultyCertification,
  updateFacultyFdpAction,
  type FacultyActionState,
} from '@/app/actions/faculty'
import type { FacultyCertification, FacultyDevelopmentProgram } from '@/generated/prisma/client'
import {
  ACCREDITATION_CRITERIA,
  ActionMessage,
  ConfirmDeleteForm,
  DocumentPreviewLink,
  ReviewerFeedbackBanner,
  SingleDocumentUploadField,
  StudentSectionHeader,
  VerificationBadge,
  studentFieldClass,
  studentLabelClass,
} from '@/components/student/shared-ui'

const initialState: FacultyActionState = { status: 'idle', message: '' }

export function FacultyDevelopmentSection({
  fdps,
  certifications,
}: {
  fdps: FacultyDevelopmentProgram[]
  certifications: FacultyCertification[]
}) {
  const [fdpAddState, fdpAddAction, fdpAddPending] = useActionState(addFacultyFdpAction, initialState)
  const [fdpEditState, fdpEditAction, fdpEditPending] = useActionState(updateFacultyFdpAction, initialState)
  const [fdpDelState, fdpDelAction] = useActionState(deleteFacultyFdpAction, initialState)
  const [editingFdpId, setEditingFdpId] = useState<string | null>(null)

  const [certAddState, certAddAction, certAddPending] = useActionState(addFacultyCertification, initialState)
  const [certEditState, certEditAction, certEditPending] = useActionState(updateFacultyCertification, initialState)
  const [certDelState, certDelAction] = useActionState(deleteFacultyCertification, initialState)
  const [editingCertId, setEditingCertId] = useState<string | null>(null)

  return (
    <div className="mt-6 flex flex-col gap-6">
      {/* FDPs / STTPs / Workshops / Seminars / Conferences */}
      <section className="rounded-2xl border border-border bg-card p-6">
        <StudentSectionHeader
          title="FDPs, STTPs, Workshops &amp; Conferences"
          description="Log faculty development programs, short-term training, workshops, seminars, and conferences."
          badge={`${fdps.length} Programs`}
        />

        <form action={fdpAddAction} className="mb-6 grid gap-4 rounded-xl border border-border bg-muted/20 p-4 sm:grid-cols-3">
          <div>
            <label htmlFor="fdp-type" className={studentLabelClass}>Program Type</label>
            <select id="fdp-type" name="programType" className={studentFieldClass}>
              <option value="FDP">FDP (Faculty Development Program)</option>
              <option value="STTP">STTP (Short Term Training)</option>
              <option value="WORKSHOP">Workshop</option>
              <option value="SEMINAR">Seminar</option>
              <option value="CONFERENCE">Conference</option>
              <option value="TRAINING">Professional Training</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="fdp-title" className={studentLabelClass}>Title</label>
            <input id="fdp-title" name="title" required className={studentFieldClass} placeholder="AI & Pedagogy in Higher Education" />
          </div>
          <div>
            <label htmlFor="fdp-org" className={studentLabelClass}>Organizer</label>
            <input id="fdp-org" name="organizer" required className={studentFieldClass} placeholder="AICTE / IIT Bombay" />
          </div>
          <div>
            <label htmlFor="fdp-mode" className={studentLabelClass}>Mode</label>
            <select id="fdp-mode" name="mode" className={studentFieldClass}>
              <option value="ONLINE">Online</option>
              <option value="OFFLINE">Offline</option>
              <option value="HYBRID">Hybrid</option>
            </select>
          </div>
          <div>
            <label htmlFor="fdp-days" className={studentLabelClass}>Duration (Days)</label>
            <input id="fdp-days" name="durationDays" type="number" min={1} max={365} className={studentFieldClass} placeholder="5" />
          </div>
          <div>
            <label htmlFor="fdp-start" className={studentLabelClass}>Start Date</label>
            <input id="fdp-start" name="startDate" type="date" required className={studentFieldClass} />
          </div>
          <div>
            <label htmlFor="fdp-end" className={studentLabelClass}>End Date</label>
            <input id="fdp-end" name="endDate" type="date" required className={studentFieldClass} />
          </div>
          <div>
            <label htmlFor="fdp-crit" className={studentLabelClass}>Accreditation Criterion</label>
            <select id="fdp-crit" name="criterionCode" className={studentFieldClass}>
              <option value="">None</option>
              {ACCREDITATION_CRITERIA.map((c) => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-3">
            <SingleDocumentUploadField id="fdp-doc" name="documentUrl" label="Completion Certificate" />
          </div>
          <div className="sm:col-span-3 flex items-center gap-3">
            <button type="submit" disabled={fdpAddPending} className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
              <Plus size={14} /> {fdpAddPending ? 'Saving…' : 'Add Program'}
            </button>
            <ActionMessage state={fdpAddState} />
            <ActionMessage state={fdpDelState} />
          </div>
        </form>

        <div className="divide-y divide-border">
          {fdps.map((f) =>
            editingFdpId === f.id ? (
              <form key={f.id} action={fdpEditAction} className="grid gap-3 py-4 sm:grid-cols-3">
                <input type="hidden" name="id" value={f.id} />
                <select name="programType" defaultValue={f.programType} className={studentFieldClass}>
                  <option value="FDP">FDP</option>
                  <option value="STTP">STTP</option>
                  <option value="WORKSHOP">Workshop</option>
                  <option value="SEMINAR">Seminar</option>
                  <option value="CONFERENCE">Conference</option>
                  <option value="TRAINING">Training</option>
                </select>
                <input name="title" defaultValue={f.title} required className={studentFieldClass} />
                <input name="organizer" defaultValue={f.organizer} required className={studentFieldClass} />
                <select name="mode" defaultValue={f.mode} className={studentFieldClass}>
                  <option value="ONLINE">Online</option>
                  <option value="OFFLINE">Offline</option>
                  <option value="HYBRID">Hybrid</option>
                </select>
                <input name="startDate" type="date" defaultValue={new Date(f.startDate).toISOString().slice(0, 10)} required className={studentFieldClass} />
                <input name="endDate" type="date" defaultValue={new Date(f.endDate).toISOString().slice(0, 10)} required className={studentFieldClass} />
                <div className="sm:col-span-3">
                  <SingleDocumentUploadField id={`edit-fdp-${f.id}`} name="documentUrl" defaultValue={f.documentUrl ?? ''} />
                </div>
                <div className="sm:col-span-3 flex gap-2">
                  <button type="submit" disabled={fdpEditPending} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white">Save</button>
                  <button type="button" onClick={() => setEditingFdpId(null)} className="rounded-lg border border-border px-3 py-1.5 text-xs">Cancel</button>
                  <ActionMessage state={fdpEditState} />
                </div>
              </form>
            ) : (
              <div key={f.id} className="flex flex-wrap items-start justify-between gap-3 py-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold">{f.programType}</span>
                    <h3 className="text-sm font-semibold text-foreground">{f.title}</h3>
                    <VerificationBadge status={f.verificationStatus} verifiedAt={f.verifiedAt} rejectionReason={f.rejectionReason} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {f.organizer} &bull; {f.mode} &bull; {new Date(f.startDate).toLocaleDateString()} – {new Date(f.endDate).toLocaleDateString()}
                  </p>
                  <div className="mt-2">
                    <DocumentPreviewLink fileUrl={f.documentUrl} />
                  </div>
                  <ReviewerFeedbackBanner status={f.verificationStatus} rejectionReason={f.rejectionReason} />
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setEditingFdpId(f.id)} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-500/10">
                    <Edit3 size={12} /> Edit
                  </button>
                  <ConfirmDeleteForm id={f.id} action={fdpDelAction} itemLabel={f.title} />
                </div>
              </div>
            ),
          )}
        </div>
      </section>

      {/* Certifications */}
      <section className="rounded-2xl border border-border bg-card p-6">
        <StudentSectionHeader
          title="Professional Certifications"
          description="Log MOOCs, industry credentials, and specialized teaching certifications."
          badge={`${certifications.length} Certifications`}
        />

        <form action={certAddAction} className="mb-6 grid gap-4 rounded-xl border border-border bg-muted/20 p-4 sm:grid-cols-2">
          <div>
            <label htmlFor="fc-name" className={studentLabelClass}>Certificate Name</label>
            <input id="fc-name" name="name" required className={studentFieldClass} />
          </div>
          <div>
            <label htmlFor="fc-issuer" className={studentLabelClass}>Issuing Body</label>
            <input id="fc-issuer" name="issuer" className={studentFieldClass} />
          </div>
          <div>
            <label htmlFor="fc-date" className={studentLabelClass}>Issue Date</label>
            <input id="fc-date" name="issuedAt" type="date" className={studentFieldClass} />
          </div>
          <div>
            <label htmlFor="fc-crit" className={studentLabelClass}>Accreditation Criterion</label>
            <select id="fc-crit" name="criterionCode" className={studentFieldClass}>
              <option value="">None</option>
              {ACCREDITATION_CRITERIA.map((c) => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <SingleDocumentUploadField id="fc-file" name="fileUrl" />
          </div>
          <div className="sm:col-span-2 flex items-center gap-3">
            <button type="submit" disabled={certAddPending} className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
              <Plus size={14} /> {certAddPending ? 'Saving…' : 'Add Certification'}
            </button>
            <ActionMessage state={certAddState} />
            <ActionMessage state={certDelState} />
          </div>
        </form>

        <div className="divide-y divide-border">
          {certifications.map((c) =>
            editingCertId === c.id ? (
              <form key={c.id} action={certEditAction} className="grid gap-3 py-4 sm:grid-cols-2">
                <input type="hidden" name="id" value={c.id} />
                <input name="name" defaultValue={c.name} required className={studentFieldClass} />
                <input name="issuer" defaultValue={c.issuer ?? ''} placeholder="Issuer" className={studentFieldClass} />
                <input name="issuedAt" type="date" defaultValue={c.issuedAt ? new Date(c.issuedAt).toISOString().slice(0, 10) : ''} className={studentFieldClass} />
                <div className="sm:col-span-2">
                  <SingleDocumentUploadField id={`edit-fc-${c.id}`} name="fileUrl" defaultValue={c.fileUrl ?? ''} />
                </div>
                <div className="sm:col-span-2 flex gap-2">
                  <button type="submit" disabled={certEditPending} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white">Save</button>
                  <button type="button" onClick={() => setEditingCertId(null)} className="rounded-lg border border-border px-3 py-1.5 text-xs">Cancel</button>
                  <ActionMessage state={certEditState} />
                </div>
              </form>
            ) : (
              <div key={c.id} className="flex flex-wrap items-start justify-between gap-3 py-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground">{c.name}</h3>
                    <VerificationBadge status={c.verificationStatus} verifiedAt={c.verifiedAt} rejectionReason={c.rejectionReason} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {[c.issuer, c.issuedAt && new Date(c.issuedAt).toLocaleDateString()].filter(Boolean).join(' • ')}
                  </p>
                  <div className="mt-2">
                    <DocumentPreviewLink fileUrl={c.fileUrl} />
                  </div>
                  <ReviewerFeedbackBanner status={c.verificationStatus} rejectionReason={c.rejectionReason} />
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setEditingCertId(c.id)} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-500/10">
                    <Edit3 size={12} /> Edit
                  </button>
                  <ConfirmDeleteForm id={c.id} action={certDelAction} itemLabel={c.name} />
                </div>
              </div>
            ),
          )}
        </div>
      </section>
    </div>
  )
}
