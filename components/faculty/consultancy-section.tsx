'use client'

import { useActionState, useState } from 'react'
import { Edit3, Plus } from 'lucide-react'
import {
  addFacultyConsultancyAction,
  deleteFacultyConsultancyAction,
  updateFacultyConsultancyAction,
  type FacultyActionState,
} from '@/app/actions/faculty'
import type { FacultyConsultancy } from '@/generated/prisma/client'
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

export function FacultyConsultancySection({
  consultancies,
}: {
  consultancies: FacultyConsultancy[]
}) {
  const [addState, addAction, addPending] = useActionState(addFacultyConsultancyAction, initialState)
  const [editState, editAction, editPending] = useActionState(updateFacultyConsultancyAction, initialState)
  const [delState, delAction] = useActionState(deleteFacultyConsultancyAction, initialState)
  const [editingId, setEditingId] = useState<string | null>(null)

  return (
    <div className="mt-6 rounded-2xl border border-border bg-card p-6">
      <StudentSectionHeader
        title="Consultancy &amp; Industry Advisory"
        description="Record sponsored consultancy projects, client organizations, revenue, and deliverables."
        badge={`${consultancies.length} Projects`}
      />

      <form action={addAction} className="mb-6 grid gap-4 rounded-xl border border-border bg-muted/20 p-4 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label htmlFor="con-title" className={studentLabelClass}>Project Title</label>
          <input id="con-title" name="title" required className={studentFieldClass} />
        </div>
        <div>
          <label htmlFor="con-client" className={studentLabelClass}>Client Organization</label>
          <input id="con-client" name="clientOrganization" required className={studentFieldClass} />
        </div>
        <div>
          <label htmlFor="con-role" className={studentLabelClass}>Your Role</label>
          <input id="con-role" name="role" className={studentFieldClass} placeholder="Lead Consultant" />
        </div>
        <div>
          <label htmlFor="con-amount" className={studentLabelClass}>Consultancy Value / Fee</label>
          <input id="con-amount" name="amount" className={studentFieldClass} placeholder="₹2,50,000" />
        </div>
        <div>
          <label htmlFor="con-crit" className={studentLabelClass}>Accreditation Criterion</label>
          <select id="con-crit" name="criterionCode" className={studentFieldClass}>
            <option value="">None</option>
            {ACCREDITATION_CRITERIA.map((c) => (
              <option key={c.code} value={c.code}>{c.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="con-start" className={studentLabelClass}>Start Date</label>
          <input id="con-start" name="startDate" type="date" required className={studentFieldClass} />
        </div>
        <div>
          <label htmlFor="con-end" className={studentLabelClass}>End Date (blank if ongoing)</label>
          <input id="con-end" name="endDate" type="date" className={studentFieldClass} />
        </div>
        <div>
          <label htmlFor="con-outcomes" className={studentLabelClass}>Outcomes</label>
          <input id="con-outcomes" name="outcomes" className={studentFieldClass} />
        </div>
        <div className="sm:col-span-3">
          <SingleDocumentUploadField id="con-doc" name="documentUrl" label="Work Order / Completion Proof" />
        </div>
        <div className="sm:col-span-3 flex items-center gap-3">
          <button type="submit" disabled={addPending} className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
            <Plus size={14} /> {addPending ? 'Saving…' : 'Add Consultancy'}
          </button>
          <ActionMessage state={addState} />
          <ActionMessage state={delState} />
        </div>
      </form>

      <div className="divide-y divide-border">
        {consultancies.map((c) =>
          editingId === c.id ? (
            <form key={c.id} action={editAction} className="grid gap-3 py-4 sm:grid-cols-3">
              <input type="hidden" name="id" value={c.id} />
              <input name="title" defaultValue={c.title} required className={`${studentFieldClass} sm:col-span-2`} />
              <input name="clientOrganization" defaultValue={c.clientOrganization} required className={studentFieldClass} />
              <input name="role" defaultValue={c.role ?? ''} placeholder="Role" className={studentFieldClass} />
              <input name="amount" defaultValue={c.amount ?? ''} placeholder="Amount" className={studentFieldClass} />
              <input name="startDate" type="date" defaultValue={new Date(c.startDate).toISOString().slice(0, 10)} required className={studentFieldClass} />
              <input name="endDate" type="date" defaultValue={c.endDate ? new Date(c.endDate).toISOString().slice(0, 10) : ''} className={studentFieldClass} />
              <input name="outcomes" defaultValue={c.outcomes ?? ''} placeholder="Outcomes" className={`${studentFieldClass} sm:col-span-2`} />
              <div className="sm:col-span-3">
                <SingleDocumentUploadField id={`edit-con-${c.id}`} name="documentUrl" defaultValue={c.documentUrl ?? ''} />
              </div>
              <div className="sm:col-span-3 flex gap-2">
                <button type="submit" disabled={editPending} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white">Save</button>
                <button type="button" onClick={() => setEditingId(null)} className="rounded-lg border border-border px-3 py-1.5 text-xs">Cancel</button>
                <ActionMessage state={editState} />
              </div>
            </form>
          ) : (
            <div key={c.id} className="flex flex-wrap items-start justify-between gap-3 py-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold text-foreground">{c.title}</h3>
                  <VerificationBadge status={c.verificationStatus} verifiedAt={c.verifiedAt} rejectionReason={c.rejectionReason} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {[c.clientOrganization, c.role, c.amount, `${new Date(c.startDate).toLocaleDateString()} – ${c.endDate ? new Date(c.endDate).toLocaleDateString() : 'Ongoing'}`].filter(Boolean).join(' • ')}
                </p>
                {c.outcomes && <p className="mt-1 text-xs text-foreground/80">Outcomes: {c.outcomes}</p>}
                <div className="mt-2">
                  <DocumentPreviewLink fileUrl={c.documentUrl} />
                </div>
                <ReviewerFeedbackBanner status={c.verificationStatus} rejectionReason={c.rejectionReason} />
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setEditingId(c.id)} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-500/10">
                  <Edit3 size={12} /> Edit
                </button>
                <ConfirmDeleteForm id={c.id} action={delAction} itemLabel={c.title} />
              </div>
            </div>
          ),
        )}
      </div>
    </div>
  )
}
