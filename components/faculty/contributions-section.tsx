'use client'

import { useActionState, useState } from 'react'
import { Edit3, Plus } from 'lucide-react'
import {
  addFacultyContributionAction,
  deleteFacultyContributionAction,
  updateFacultyContributionAction,
  type FacultyActionState,
} from '@/app/actions/faculty'
import type { FacultyContribution } from '@/generated/prisma/client'
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

const CONTRIBUTION_TYPES = [
  { value: 'MEMBERSHIP', label: 'Professional Membership (IEEE / ACM / CSI)' },
  { value: 'AWARD', label: 'Award / Recognition' },
  { value: 'MENTORSHIP', label: 'Student / Startup Mentorship' },
  { value: 'ADMIN_RESPONSIBILITY', label: 'Administrative Responsibility' },
  { value: 'COMMITTEE', label: 'Committee / Board Activity' },
  { value: 'INDUSTRY_COLLABORATION', label: 'Industry Collaboration / MoU' },
  { value: 'SOCIAL_CONTRIBUTION', label: 'Social / Community Contribution' },
]

export function FacultyContributionsSection({
  contributions,
}: {
  contributions: FacultyContribution[]
}) {
  const [addState, addAction, addPending] = useActionState(addFacultyContributionAction, initialState)
  const [editState, editAction, editPending] = useActionState(updateFacultyContributionAction, initialState)
  const [delState, delAction] = useActionState(deleteFacultyContributionAction, initialState)
  const [editingId, setEditingId] = useState<string | null>(null)

  return (
    <div className="mt-6 rounded-2xl border border-border bg-card p-6">
      <StudentSectionHeader
        title="Academic, Institutional &amp; Professional Contributions"
        description="Track memberships, awards, mentorship, administrative roles, committees, industry collaborations, and social outreach."
        badge={`${contributions.length} Contributions`}
      />

      <form action={addAction} className="mb-6 grid gap-4 rounded-xl border border-border bg-muted/20 p-4 sm:grid-cols-3">
        <div>
          <label htmlFor="ctr-type" className={studentLabelClass}>Contribution Type</label>
          <select id="ctr-type" name="contributionType" className={studentFieldClass}>
            {CONTRIBUTION_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="ctr-title" className={studentLabelClass}>Title / Achievement</label>
          <input id="ctr-title" name="title" required className={studentFieldClass} />
        </div>
        <div>
          <label htmlFor="ctr-org" className={studentLabelClass}>Organization / Committee</label>
          <input id="ctr-org" name="organizationOrBody" className={studentFieldClass} />
        </div>
        <div>
          <label htmlFor="ctr-role" className={studentLabelClass}>Role / Position</label>
          <input id="ctr-role" name="role" className={studentFieldClass} />
        </div>
        <div>
          <label htmlFor="ctr-crit" className={studentLabelClass}>Accreditation Criterion</label>
          <select id="ctr-crit" name="criterionCode" className={studentFieldClass}>
            <option value="">None</option>
            {ACCREDITATION_CRITERIA.map((c) => (
              <option key={c.code} value={c.code}>{c.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="ctr-start" className={studentLabelClass}>Start Date</label>
          <input id="ctr-start" name="startDate" type="date" className={studentFieldClass} />
        </div>
        <div>
          <label htmlFor="ctr-end" className={studentLabelClass}>End Date</label>
          <input id="ctr-end" name="endDate" type="date" className={studentFieldClass} />
        </div>
        <div>
          <label htmlFor="ctr-desc" className={studentLabelClass}>Description</label>
          <input id="ctr-desc" name="description" className={studentFieldClass} />
        </div>
        <div className="sm:col-span-3">
          <SingleDocumentUploadField id="ctr-doc" name="documentUrl" label="Supporting Proof / Appointment Letter" />
        </div>
        <div className="sm:col-span-3 flex items-center gap-3">
          <button type="submit" disabled={addPending} className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
            <Plus size={14} /> {addPending ? 'Saving…' : 'Add Contribution'}
          </button>
          <ActionMessage state={addState} />
          <ActionMessage state={delState} />
        </div>
      </form>

      <div className="divide-y divide-border">
        {contributions.map((c) =>
          editingId === c.id ? (
            <form key={c.id} action={editAction} className="grid gap-3 py-4 sm:grid-cols-3">
              <input type="hidden" name="id" value={c.id} />
              <select name="contributionType" defaultValue={c.contributionType} className={studentFieldClass}>
                {CONTRIBUTION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <input name="title" defaultValue={c.title} required className={`${studentFieldClass} sm:col-span-2`} />
              <input name="organizationOrBody" defaultValue={c.organizationOrBody ?? ''} placeholder="Organization" className={studentFieldClass} />
              <input name="role" defaultValue={c.role ?? ''} placeholder="Role" className={studentFieldClass} />
              <input name="description" defaultValue={c.description ?? ''} placeholder="Description" className={studentFieldClass} />
              <div className="sm:col-span-3">
                <SingleDocumentUploadField id={`edit-ctr-${c.id}`} name="documentUrl" defaultValue={c.documentUrl ?? ''} />
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
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold">
                    {c.contributionType.replace(/_/g, ' ')}
                  </span>
                  <h3 className="text-sm font-semibold text-foreground">{c.title}</h3>
                  <VerificationBadge status={c.verificationStatus} verifiedAt={c.verifiedAt} rejectionReason={c.rejectionReason} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {[c.organizationOrBody, c.role, c.description].filter(Boolean).join(' • ')}
                </p>
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
