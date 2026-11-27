'use client'

import { useActionState, useState } from 'react'
import { Edit3, Plus } from 'lucide-react'
import {
  addStudentPatent,
  addStudentResearchPaper,
  deleteStudentPatent,
  deleteStudentResearchPaper,
  updateStudentPatent,
  updateStudentResearchPaper,
  type StudentActionState,
} from '@/app/actions/student'
import type { StudentPatent, StudentResearchPaper } from '@/generated/prisma/client'
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
} from './shared-ui'

const initialState: StudentActionState = { status: 'idle', message: '' }

export function StudentResearchSection({
  papers,
  patents,
}: {
  papers: StudentResearchPaper[]
  patents: StudentPatent[]
}) {
  const [paperAddState, paperAddAction, paperAddPending] = useActionState(addStudentResearchPaper, initialState)
  const [paperEditState, paperEditAction, paperEditPending] = useActionState(updateStudentResearchPaper, initialState)
  const [paperDelState, paperDelAction] = useActionState(deleteStudentResearchPaper, initialState)
  const [editingPaperId, setEditingPaperId] = useState<string | null>(null)

  const [patAddState, patAddAction, patAddPending] = useActionState(addStudentPatent, initialState)
  const [patEditState, patEditAction, patEditPending] = useActionState(updateStudentPatent, initialState)
  const [patDelState, patDelAction] = useActionState(deleteStudentPatent, initialState)
  const [editingPatId, setEditingPatId] = useState<string | null>(null)

  return (
    <div className="mt-6 flex flex-col gap-6">
      {/* Research Papers */}
      <section className="rounded-2xl border border-border bg-card p-6">
        <StudentSectionHeader
          title="Research Publications"
          description="Submit journal and conference publications with DOI, venue, and supporting manuscripts."
          badge={`${papers.length} Papers`}
        />

        <form action={paperAddAction} className="mb-6 grid gap-4 rounded-xl border border-border bg-muted/20 p-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="paper-title" className={studentLabelClass}>Paper Title</label>
            <input id="paper-title" name="title" required className={studentFieldClass} />
          </div>
          <div>
            <label htmlFor="paper-pub" className={studentLabelClass}>Journal / Conference</label>
            <input id="paper-pub" name="publication" className={studentFieldClass} />
          </div>
          <div>
            <label htmlFor="paper-doi" className={studentLabelClass}>DOI / Link</label>
            <input id="paper-doi" name="doi" className={studentFieldClass} />
          </div>
          <div>
            <label htmlFor="paper-date" className={studentLabelClass}>Publication Date</label>
            <input id="paper-date" name="publishedAt" type="date" className={studentFieldClass} />
          </div>
          <div>
            <label htmlFor="paper-criterion" className={studentLabelClass}>Accreditation Criterion</label>
            <select id="paper-criterion" name="criterionCode" className={studentFieldClass}>
              <option value="">None</option>
              {ACCREDITATION_CRITERIA.map((c) => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <SingleDocumentUploadField id="paper-file" name="fileUrl" label="Paper PDF / Acceptance Letter" />
          </div>
          <div className="sm:col-span-2 flex items-center gap-3">
            <button type="submit" disabled={paperAddPending} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">
              <Plus size={14} /> {paperAddPending ? 'Saving…' : 'Add Paper'}
            </button>
            <ActionMessage state={paperAddState} />
            <ActionMessage state={paperDelState} />
          </div>
        </form>

        <div className="divide-y divide-border">
          {papers.map((p) =>
            editingPaperId === p.id ? (
              <form key={p.id} action={paperEditAction} className="grid gap-3 py-4 sm:grid-cols-2">
                <input type="hidden" name="id" value={p.id} />
                <input name="title" defaultValue={p.title} required className={`${studentFieldClass} sm:col-span-2`} />
                <input name="publication" defaultValue={p.publication ?? ''} placeholder="Publication" className={studentFieldClass} />
                <input name="doi" defaultValue={p.doi ?? ''} placeholder="DOI" className={studentFieldClass} />
                <input name="publishedAt" type="date" defaultValue={p.publishedAt ? new Date(p.publishedAt).toISOString().slice(0, 10) : ''} className={studentFieldClass} />
                <div className="sm:col-span-2">
                  <SingleDocumentUploadField id={`edit-paper-file-${p.id}`} name="fileUrl" defaultValue={p.fileUrl ?? ''} />
                </div>
                <div className="sm:col-span-2 flex gap-2">
                  <button type="submit" disabled={paperEditPending} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">Save</button>
                  <button type="button" onClick={() => setEditingPaperId(null)} className="rounded-lg border border-border px-3 py-1.5 text-xs">Cancel</button>
                  <ActionMessage state={paperEditState} />
                </div>
              </form>
            ) : (
              <div key={p.id} className="flex flex-wrap items-start justify-between gap-3 py-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground">{p.title}</h3>
                    <VerificationBadge status={p.verificationStatus} verifiedAt={p.verifiedAt} rejectionReason={p.rejectionReason} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {[p.publication, p.doi && `DOI: ${p.doi}`, p.publishedAt && new Date(p.publishedAt).toLocaleDateString()].filter(Boolean).join(' • ')}
                  </p>
                  <div className="mt-2">
                    <DocumentPreviewLink fileUrl={p.fileUrl} />
                  </div>
                  <ReviewerFeedbackBanner status={p.verificationStatus} rejectionReason={p.rejectionReason} />
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setEditingPaperId(p.id)} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-500/10">
                    <Edit3 size={12} /> Edit
                  </button>
                  <ConfirmDeleteForm id={p.id} action={paperDelAction} itemLabel={p.title} />
                </div>
              </div>
            ),
          )}
        </div>
      </section>

      {/* Patents */}
      <section className="rounded-2xl border border-border bg-card p-6">
        <StudentSectionHeader
          title="Patents & Intellectual Property"
          description="Track filed, published, and granted patent applications."
          badge={`${patents.length} Patents`}
        />

        <form action={patAddAction} className="mb-6 grid gap-4 rounded-xl border border-border bg-muted/20 p-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="pat-title" className={studentLabelClass}>Patent Title</label>
            <input id="pat-title" name="title" required className={studentFieldClass} />
          </div>
          <div>
            <label htmlFor="pat-num" className={studentLabelClass}>Patent / Application Number</label>
            <input id="pat-num" name="patentNumber" className={studentFieldClass} />
          </div>
          <div>
            <label htmlFor="pat-status" className={studentLabelClass}>Filing Status</label>
            <select id="pat-status" name="status" className={studentFieldClass}>
              <option value="FILED">Filed</option>
              <option value="PUBLISHED">Published</option>
              <option value="GRANTED">Granted</option>
              <option value="PENDING">Pending</option>
            </select>
          </div>
          <div>
            <label htmlFor="pat-date" className={studentLabelClass}>Filing Date</label>
            <input id="pat-date" name="filedAt" type="date" className={studentFieldClass} />
          </div>
          <div>
            <label htmlFor="pat-criterion" className={studentLabelClass}>Accreditation Criterion</label>
            <select id="pat-criterion" name="criterionCode" className={studentFieldClass}>
              <option value="">None</option>
              {ACCREDITATION_CRITERIA.map((c) => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <SingleDocumentUploadField id="pat-file" name="fileUrl" label="Patent Filing Receipt / Grant Certificate" />
          </div>
          <div className="sm:col-span-2 flex items-center gap-3">
            <button type="submit" disabled={patAddPending} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">
              <Plus size={14} /> {patAddPending ? 'Saving…' : 'Add Patent'}
            </button>
            <ActionMessage state={patAddState} />
            <ActionMessage state={patDelState} />
          </div>
        </form>

        <div className="divide-y divide-border">
          {patents.map((pat) =>
            editingPatId === pat.id ? (
              <form key={pat.id} action={patEditAction} className="grid gap-3 py-4 sm:grid-cols-2">
                <input type="hidden" name="id" value={pat.id} />
                <input name="title" defaultValue={pat.title} required className={`${studentFieldClass} sm:col-span-2`} />
                <input name="patentNumber" defaultValue={pat.patentNumber ?? ''} placeholder="Patent #" className={studentFieldClass} />
                <input name="status" defaultValue={pat.status ?? ''} placeholder="Status" className={studentFieldClass} />
                <input name="filedAt" type="date" defaultValue={pat.filedAt ? new Date(pat.filedAt).toISOString().slice(0, 10) : ''} className={studentFieldClass} />
                <div className="sm:col-span-2">
                  <SingleDocumentUploadField id={`edit-pat-file-${pat.id}`} name="fileUrl" defaultValue={pat.fileUrl ?? ''} />
                </div>
                <div className="sm:col-span-2 flex gap-2">
                  <button type="submit" disabled={patEditPending} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">Save</button>
                  <button type="button" onClick={() => setEditingPatId(null)} className="rounded-lg border border-border px-3 py-1.5 text-xs">Cancel</button>
                  <ActionMessage state={patEditState} />
                </div>
              </form>
            ) : (
              <div key={pat.id} className="flex flex-wrap items-start justify-between gap-3 py-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground">{pat.title}</h3>
                    <VerificationBadge status={pat.verificationStatus} verifiedAt={pat.verifiedAt} rejectionReason={pat.rejectionReason} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {[pat.patentNumber && `Patent #: ${pat.patentNumber}`, pat.status, pat.filedAt && new Date(pat.filedAt).toLocaleDateString()].filter(Boolean).join(' • ')}
                  </p>
                  <div className="mt-2">
                    <DocumentPreviewLink fileUrl={pat.fileUrl} />
                  </div>
                  <ReviewerFeedbackBanner status={pat.verificationStatus} rejectionReason={pat.rejectionReason} />
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setEditingPatId(pat.id)} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-500/10">
                    <Edit3 size={12} /> Edit
                  </button>
                  <ConfirmDeleteForm id={pat.id} action={patDelAction} itemLabel={pat.title} />
                </div>
              </div>
            ),
          )}
        </div>
      </section>
    </div>
  )
}
