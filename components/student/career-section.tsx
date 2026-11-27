'use client'

import { useActionState, useState } from 'react'
import { Edit3, Plus } from 'lucide-react'
import {
  addPlacementOfferAction,
  deletePlacementOfferAction,
  saveGraduateOutcomeAction,
  updatePlacementOfferAction,
  type StudentActionState,
} from '@/app/actions/student'
import type { StudentGraduateOutcome, StudentPlacementOffer } from '@/generated/prisma/client'
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

export function StudentCareerSection({
  offers,
  outcome,
}: {
  offers: StudentPlacementOffer[]
  outcome: StudentGraduateOutcome | null
}) {
  const [offerAddState, offerAddAction, offerAddPending] = useActionState(addPlacementOfferAction, initialState)
  const [offerEditState, offerEditAction, offerEditPending] = useActionState(updatePlacementOfferAction, initialState)
  const [offerDelState, offerDelAction] = useActionState(deletePlacementOfferAction, initialState)
  const [editingOfferId, setEditingOfferId] = useState<string | null>(null)

  const [outState, outAction, outPending] = useActionState(saveGraduateOutcomeAction, initialState)

  return (
    <div className="mt-6 flex flex-col gap-6">
      {/* Placement Offers (Multi-offer support without double-counting) */}
      <section className="rounded-2xl border border-border bg-card p-6">
        <StudentSectionHeader
          title="Placement Offers"
          description="Record all job and PPO offers received. Multiple offers are tracked independently from your single final graduate outcome."
          badge={`${offers.length} ${offers.length === 1 ? 'Offer' : 'Offers'}`}
        />

        <form action={offerAddAction} className="mb-6 grid gap-4 rounded-xl border border-border bg-muted/20 p-4 sm:grid-cols-3">
          <div>
            <label htmlFor="offer-company" className={studentLabelClass}>Company Name</label>
            <input id="offer-company" name="companyName" required className={studentFieldClass} placeholder="e.g. Google / TCS Digital" />
          </div>
          <div>
            <label htmlFor="offer-role" className={studentLabelClass}>Role / Title</label>
            <input id="offer-role" name="role" required className={studentFieldClass} placeholder="Software Engineer" />
          </div>
          <div>
            <label htmlFor="offer-ctc" className={studentLabelClass}>Package / CTC</label>
            <input id="offer-ctc" name="packageCtc" className={studentFieldClass} placeholder="e.g. 12 LPA" />
          </div>
          <div>
            <label htmlFor="offer-type" className={studentLabelClass}>Offer Type</label>
            <select id="offer-type" name="offerType" className={studentFieldClass}>
              <option value="FULL_TIME">Full-Time</option>
              <option value="PPO">PPO (Pre-Placement Offer)</option>
              <option value="INTERNSHIP_CUM_PPO">Internship + PPO</option>
            </select>
          </div>
          <div>
            <label htmlFor="offer-status" className={studentLabelClass}>Offer Status</label>
            <select id="offer-status" name="status" className={studentFieldClass}>
              <option value="OFFERED">Offered</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="DECLINED">Declined</option>
            </select>
          </div>
          <div>
            <label htmlFor="offer-date" className={studentLabelClass}>Offer Date</label>
            <input id="offer-date" name="offeredAt" type="date" className={studentFieldClass} />
          </div>
          <div className="sm:col-span-3">
            <SingleDocumentUploadField id="offer-letter" name="offerLetterUrl" label="Offer Letter (PDF / Image)" />
          </div>
          <div className="sm:col-span-3 flex items-center gap-3">
            <button type="submit" disabled={offerAddPending} className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
              <Plus size={14} /> {offerAddPending ? 'Saving…' : 'Add Placement Offer'}
            </button>
            <ActionMessage state={offerAddState} />
            <ActionMessage state={offerDelState} />
          </div>
        </form>

        <div className="divide-y divide-border">
          {offers.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No placement offers recorded yet.</p>
          ) : (
            offers.map((offer) =>
              editingOfferId === offer.id ? (
                <form key={offer.id} action={offerEditAction} className="grid gap-3 py-4 sm:grid-cols-3">
                  <input type="hidden" name="id" value={offer.id} />
                  <input name="companyName" defaultValue={offer.companyName} required className={studentFieldClass} />
                  <input name="role" defaultValue={offer.role} required className={studentFieldClass} />
                  <input name="packageCtc" defaultValue={offer.packageCtc ?? ''} placeholder="CTC" className={studentFieldClass} />
                  <input name="offerType" defaultValue={offer.offerType ?? 'FULL_TIME'} className={studentFieldClass} />
                  <select name="status" defaultValue={offer.status} className={studentFieldClass}>
                    <option value="OFFERED">Offered</option>
                    <option value="ACCEPTED">Accepted</option>
                    <option value="DECLINED">Declined</option>
                  </select>
                  <input name="offeredAt" type="date" defaultValue={offer.offeredAt ? new Date(offer.offeredAt).toISOString().slice(0, 10) : ''} className={studentFieldClass} />
                  <div className="sm:col-span-3">
                    <SingleDocumentUploadField id={`edit-offer-${offer.id}`} name="offerLetterUrl" defaultValue={offer.offerLetterUrl ?? ''} />
                  </div>
                  <div className="sm:col-span-3 flex gap-2">
                    <button type="submit" disabled={offerEditPending} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white">Save</button>
                    <button type="button" onClick={() => setEditingOfferId(null)} className="rounded-lg border border-border px-3 py-1.5 text-xs">Cancel</button>
                    <ActionMessage state={offerEditState} />
                  </div>
                </form>
              ) : (
                <div key={offer.id} className="flex flex-wrap items-start justify-between gap-3 py-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground">{offer.companyName} — {offer.role}</h3>
                      <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">
                        {offer.status}
                      </span>
                      <VerificationBadge status={offer.verificationStatus} verifiedAt={offer.verifiedAt} rejectionReason={offer.rejectionReason} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {[offer.packageCtc && `Package: ${offer.packageCtc}`, offer.offerType, offer.offeredAt && new Date(offer.offeredAt).toLocaleDateString()].filter(Boolean).join(' • ')}
                    </p>
                    <div className="mt-2">
                      <DocumentPreviewLink fileUrl={offer.offerLetterUrl} label="Preview Offer Letter" />
                    </div>
                    <ReviewerFeedbackBanner status={offer.verificationStatus} rejectionReason={offer.rejectionReason} />
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setEditingOfferId(offer.id)} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-500/10">
                      <Edit3 size={12} /> Edit
                    </button>
                    <ConfirmDeleteForm id={offer.id} action={offerDelAction} itemLabel={offer.companyName} />
                  </div>
                </div>
              ),
            )
          )}
        </div>
      </section>

      {/* Final Graduate / Higher Studies / Entrepreneurship / Alumni Outcome (Single unique record) */}
      <section className="rounded-2xl border border-border bg-card p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Final Graduate &amp; Alumni Outcome</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Your single official post-graduation status (Placement, Higher Studies, Entrepreneurship, or Alumni progression).
            </p>
          </div>
          {outcome && (
            <VerificationBadge status={outcome.verificationStatus} verifiedAt={outcome.verifiedAt} rejectionReason={outcome.rejectionReason} />
          )}
        </div>

        <form action={outAction} className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="out-type" className={studentLabelClass}>Outcome Type</label>
            <select id="out-type" name="outcomeType" defaultValue={outcome?.outcomeType ?? 'SEEKING'} className={studentFieldClass}>
              <option value="PLACED">Placed (Joined Full-Time Role)</option>
              <option value="HIGHER_STUDIES">Higher Studies (MS / M.Tech / MBA / PhD)</option>
              <option value="ENTREPRENEURSHIP">Entrepreneurship / Startup Founder</option>
              <option value="ALUMNI">Alumni Progression</option>
              <option value="SEEKING">Actively Seeking / Preparing</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div>
            <label htmlFor="out-org" className={studentLabelClass}>Company / University / Venture</label>
            <input id="out-org" name="organizationOrUniversity" defaultValue={outcome?.organizationOrUniversity ?? ''} className={studentFieldClass} />
          </div>
          <div>
            <label htmlFor="out-role" className={studentLabelClass}>Role / Degree Program</label>
            <input id="out-role" name="programOrRole" defaultValue={outcome?.programOrRole ?? ''} className={studentFieldClass} placeholder="e.g. MS Computer Science / SDE-1" />
          </div>
          <div>
            <label htmlFor="out-loc" className={studentLabelClass}>City / Country</label>
            <input id="out-loc" name="location" defaultValue={outcome?.location ?? ''} className={studentFieldClass} />
          </div>
          <div>
            <label htmlFor="out-email" className={studentLabelClass}>Alumni Contact Email</label>
            <input id="out-email" name="alumniEmail" type="email" defaultValue={outcome?.alumniEmail ?? ''} className={studentFieldClass} />
          </div>
          <div>
            <label htmlFor="out-linkedin" className={studentLabelClass}>Alumni LinkedIn</label>
            <input id="out-linkedin" name="alumniLinkedin" type="url" defaultValue={outcome?.alumniLinkedin ?? ''} className={studentFieldClass} />
          </div>
          <div className="sm:col-span-2">
            <SingleDocumentUploadField id="out-ev" name="evidenceUrl" label="Admission Letter / Joining Proof / Registration" defaultValue={outcome?.evidenceUrl ?? ''} />
          </div>
          <div className="sm:col-span-2">
            <ReviewerFeedbackBanner status={outcome?.verificationStatus} rejectionReason={outcome?.rejectionReason} />
          </div>
          <div className="sm:col-span-2 flex items-center gap-3">
            <button type="submit" disabled={outPending} className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60">
              {outPending ? 'Saving…' : 'Save Graduate Outcome'}
            </button>
            <ActionMessage state={outState} />
          </div>
        </form>
      </section>
    </div>
  )
}
