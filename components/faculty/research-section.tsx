'use client'

import { useActionState, useRef, useState } from 'react'
import { Edit3, Plus, Users } from 'lucide-react'
import {
  addCanonicalPublicationAction,
  addFacultyGrantAction,
  addFacultyPatent,
  deleteCanonicalPublicationAction,
  deleteFacultyGrantAction,
  deleteFacultyPatent,
  updateCanonicalPublicationAction,
  updateFacultyGrantAction,
  updateFacultyPatent,
  type FacultyActionState,
} from '@/app/actions/faculty'
import type { FacultyPatent, FacultyResearchGrant, FacultyResearchPaper } from '@/generated/prisma/client'
import type { CanonicalPublicationWithContributors } from '@/lib/server/repositories/faculty-portfolio-repository'
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
import {
  DuplicateRecordSuggestionBanner,
  FormDraftBanner,
} from '@/components/shared/smart-evidence-uploader'

const initialState: FacultyActionState = { status: 'idle', message: '' }

export function FacultyResearchSection({
  canonicalPublications,
  grants,
  patents,
  legacyPapers,
}: {
  canonicalPublications: CanonicalPublicationWithContributors[]
  grants: FacultyResearchGrant[]
  patents: FacultyPatent[]
  legacyPapers: FacultyResearchPaper[]
}) {
  const [pubAddState, pubAddAction, pubAddPending] = useActionState(addCanonicalPublicationAction, initialState)
  const [pubEditState, pubEditAction, pubEditPending] = useActionState(updateCanonicalPublicationAction, initialState)
  const [pubDelState, pubDelAction] = useActionState(deleteCanonicalPublicationAction, initialState)
  const [editingPubId, setEditingPubId] = useState<string | null>(null)

  const [grAddState, grAddAction, grAddPending] = useActionState(addFacultyGrantAction, initialState)
  const [grEditState, grEditAction, grEditPending] = useActionState(updateFacultyGrantAction, initialState)
  const [grDelState, grDelAction] = useActionState(deleteFacultyGrantAction, initialState)
  const [editingGrantId, setEditingGrantId] = useState<string | null>(null)

  const [patAddState, patAddAction, patAddPending] = useActionState(addFacultyPatent, initialState)
  const [patEditState, patEditAction, patEditPending] = useActionState(updateFacultyPatent, initialState)
  const [patDelState, patDelAction] = useActionState(deleteFacultyPatent, initialState)
  const [editingPatId, setEditingPatId] = useState<string | null>(null)
  const [pubTitle, setPubTitle] = useState('')
  const [pubDoi, setPubDoi] = useState('')
  const pubFormRef = useRef<HTMLFormElement>(null)

  return (
    <div className="mt-6 flex flex-col gap-6">
      {/* Canonical Research Publications (Journals, Conferences, Books, Book Chapters) */}
      <section className="rounded-2xl border border-border bg-card p-6">
        <StudentSectionHeader
          title="Research Publications, Books &amp; Chapters"
          description="Canonical publications prevent institutional double-counting: entering an existing DOI links you as a co-author contributor."
          badge={`${canonicalPublications.length} Canonical`}
        />

        <form ref={pubFormRef} action={pubAddAction} className="mb-6 grid gap-4 rounded-xl border border-border bg-muted/20 p-4 sm:grid-cols-3">
          <FormDraftBanner
            draftKey="faculty-publication"
            formRef={pubFormRef}
            clearWhenSuccess={pubAddState.status === 'success'}
          />
          <div className="sm:col-span-2">
            <label htmlFor="pub-title" className={studentLabelClass}>Publication / Book Title</label>
            <input
              id="pub-title"
              name="title"
              required
              value={pubTitle}
              onChange={(e) => setPubTitle(e.target.value)}
              className={studentFieldClass}
            />
          </div>
          <div>
            <label htmlFor="pub-type" className={studentLabelClass}>Type</label>
            <select id="pub-type" name="publicationType" className={studentFieldClass}>
              <option value="JOURNAL">Journal Article</option>
              <option value="CONFERENCE">Conference Paper</option>
              <option value="BOOK">Book</option>
              <option value="BOOK_CHAPTER">Book Chapter</option>
            </select>
          </div>
          <div>
            <label htmlFor="pub-venue" className={studentLabelClass}>Journal / Conference / Book</label>
            <input id="pub-venue" name="journalOrConference" className={studentFieldClass} />
          </div>
          <div>
            <label htmlFor="pub-publisher" className={studentLabelClass}>Publisher</label>
            <input id="pub-publisher" name="publisher" className={studentFieldClass} placeholder="IEEE / Springer / Elsevier" />
          </div>
          <div>
            <label htmlFor="pub-doi" className={studentLabelClass}>DOI (auto-links co-authors)</label>
            <input
              id="pub-doi"
              name="doi"
              value={pubDoi}
              onChange={(e) => setPubDoi(e.target.value)}
              className={studentFieldClass}
              placeholder="10.1109/..."
            />
          </div>
          <DuplicateRecordSuggestionBanner type="PUBLICATION" title={pubTitle} doi={pubDoi} />
          <div>
            <label htmlFor="pub-issn" className={studentLabelClass}>ISSN / ISBN</label>
            <input id="pub-issn" name="issnOrIsbn" className={studentFieldClass} />
          </div>
          <div>
            <label htmlFor="pub-index" className={studentLabelClass}>Indexing</label>
            <select id="pub-index" name="indexing" className={studentFieldClass}>
              <option value="">Select indexing</option>
              <option value="SCOPUS">Scopus</option>
              <option value="WEB_OF_SCIENCE">Web of Science</option>
              <option value="UGC_CARE">UGC-CARE</option>
              <option value="IEEE">IEEE Xplore</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div>
            <label htmlFor="pub-date" className={studentLabelClass}>Publication Date</label>
            <input id="pub-date" name="publishedAt" type="date" className={studentFieldClass} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="pub-authors" className={studentLabelClass}>Full Author List</label>
            <input id="pub-authors" name="authorsText" className={studentFieldClass} placeholder="Dr. A. Smith, Dr. B. Jones" />
          </div>
          <div>
            <label htmlFor="pub-role" className={studentLabelClass}>Your Contributor Role</label>
            <select id="pub-role" name="authorRole" className={studentFieldClass}>
              <option value="FIRST_AUTHOR">First Author</option>
              <option value="CORRESPONDING">Corresponding Author</option>
              <option value="CO_AUTHOR">Co-Author</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="pub-crit" className={studentLabelClass}>Accreditation Criterion</label>
            <select id="pub-crit" name="criterionCode" className={studentFieldClass}>
              <option value="">None</option>
              {ACCREDITATION_CRITERIA.map((c) => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="pub-order" className={studentLabelClass}>Author Order</label>
            <input id="pub-order" name="authorOrder" type="number" min={1} defaultValue={1} className={studentFieldClass} />
          </div>
          <div className="sm:col-span-3">
            <SingleDocumentUploadField id="pub-file" name="fileUrl" label="Full Paper / First Page Proof" />
          </div>
          <div className="sm:col-span-3 flex items-center gap-3">
            <button type="submit" disabled={pubAddPending} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-60">
              <Plus size={14} /> {pubAddPending ? 'Saving…' : 'Add / Link Publication'}
            </button>
            <ActionMessage state={pubAddState} />
            <ActionMessage state={pubDelState} />
          </div>
        </form>

        <div className="divide-y divide-border">
          {canonicalPublications.map((pub) =>
            editingPubId === pub.id ? (
              <form key={pub.id} action={pubEditAction} className="grid gap-3 py-4 sm:grid-cols-3">
                <input type="hidden" name="id" value={pub.id} />
                <input name="title" defaultValue={pub.title} required className={`${studentFieldClass} sm:col-span-2`} />
                <select name="publicationType" defaultValue={pub.publicationType} className={studentFieldClass}>
                  <option value="JOURNAL">Journal</option>
                  <option value="CONFERENCE">Conference</option>
                  <option value="BOOK">Book</option>
                  <option value="BOOK_CHAPTER">Book Chapter</option>
                </select>
                <input name="journalOrConference" defaultValue={pub.journalOrConference ?? ''} placeholder="Venue" className={studentFieldClass} />
                <input name="doi" defaultValue={pub.doi ?? ''} placeholder="DOI" className={studentFieldClass} />
                <input name="issnOrIsbn" defaultValue={pub.issnOrIsbn ?? ''} placeholder="ISSN/ISBN" className={studentFieldClass} />
                <input name="indexing" defaultValue={pub.indexing ?? ''} placeholder="Indexing" className={studentFieldClass} />
                <input name="authorsText" defaultValue={pub.authorsText ?? ''} placeholder="Authors" className={`${studentFieldClass} sm:col-span-2`} />
                <div className="sm:col-span-3">
                  <SingleDocumentUploadField id={`edit-pub-${pub.id}`} name="fileUrl" defaultValue={pub.fileUrl ?? ''} />
                </div>
                <div className="sm:col-span-3 flex gap-2">
                  <button type="submit" disabled={pubEditPending} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white">Save</button>
                  <button type="button" onClick={() => setEditingPubId(null)} className="rounded-lg border border-border px-3 py-1.5 text-xs">Cancel</button>
                  <ActionMessage state={pubEditState} />
                </div>
              </form>
            ) : (
              <div key={pub.id} className="flex flex-wrap items-start justify-between gap-3 py-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold">{pub.publicationType}</span>
                    <h3 className="text-sm font-semibold text-foreground">{pub.title}</h3>
                    <VerificationBadge status={pub.verificationStatus} verifiedAt={pub.verifiedAt} rejectionReason={pub.rejectionReason} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {[
                      pub.journalOrConference,
                      pub.publisher,
                      pub.indexing && `Indexed: ${pub.indexing}`,
                      pub.doi && `DOI: ${pub.doi}`,
                      pub.issnOrIsbn && `ISSN/ISBN: ${pub.issnOrIsbn}`,
                    ]
                      .filter(Boolean)
                      .join(' • ')}
                  </p>
                  {pub.contributors.length > 0 && (
                    <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-indigo-700 dark:text-indigo-300">
                      <Users size={12} /> Contributors:{' '}
                      {pub.contributors
                        .map((c) => `${c.facultyProfile.user.firstName} ${c.facultyProfile.user.lastName}`.trim())
                        .join(', ')}
                    </p>
                  )}
                  <div className="mt-2">
                    <DocumentPreviewLink fileUrl={pub.fileUrl} />
                  </div>
                  <ReviewerFeedbackBanner status={pub.verificationStatus} rejectionReason={pub.rejectionReason} />
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setEditingPubId(pub.id)} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-500/10">
                    <Edit3 size={12} /> Edit
                  </button>
                  <ConfirmDeleteForm id={pub.id} action={pubDelAction} itemLabel={pub.title} />
                </div>
              </div>
            ),
          )}
        </div>

        {legacyPapers.length > 0 && (
          <div className="mt-6 border-t border-border pt-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Legacy Research Papers ({legacyPapers.length})
            </h4>
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              {legacyPapers.map((lp) => (
                <li key={lp.id}>
                  {lp.title} {lp.doi ? `(${lp.doi})` : ''} — {lp.verificationStatus}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Research Projects & Grants */}
      <section className="rounded-2xl border border-border bg-card p-6">
        <StudentSectionHeader
          title="Research Projects &amp; Grants"
          description="Track funded research projects, agencies, sanctioned amounts, and PI/Co-PI roles."
          badge={`${grants.length} Grants`}
        />

        <form action={grAddAction} className="mb-6 grid gap-4 rounded-xl border border-border bg-muted/20 p-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label htmlFor="gr-title" className={studentLabelClass}>Project / Grant Title</label>
            <input id="gr-title" name="title" required className={studentFieldClass} />
          </div>
          <div>
            <label htmlFor="gr-agency" className={studentLabelClass}>Funding Agency</label>
            <input id="gr-agency" name="fundingAgency" required className={studentFieldClass} placeholder="DST / SERB / AICTE" />
          </div>
          <div>
            <label htmlFor="gr-num" className={studentLabelClass}>Sanction / Grant #</label>
            <input id="gr-num" name="grantNumber" className={studentFieldClass} />
          </div>
          <div>
            <label htmlFor="gr-amt" className={studentLabelClass}>Grant Amount</label>
            <input id="gr-amt" name="amount" className={studentFieldClass} placeholder="₹15,00,000" />
          </div>
          <div>
            <label htmlFor="gr-role" className={studentLabelClass}>Role</label>
            <select id="gr-role" name="role" className={studentFieldClass}>
              <option value="PI">Principal Investigator (PI)</option>
              <option value="CO_PI">Co-PI</option>
            </select>
          </div>
          <div>
            <label htmlFor="gr-status" className={studentLabelClass}>Status</label>
            <select id="gr-status" name="status" className={studentFieldClass}>
              <option value="ONGOING">Ongoing</option>
              <option value="COMPLETED">Completed</option>
              <option value="SUBMITTED">Submitted</option>
            </select>
          </div>
          <div>
            <label htmlFor="gr-start" className={studentLabelClass}>Start Date</label>
            <input id="gr-start" name="startDate" type="date" className={studentFieldClass} />
          </div>
          <div>
            <label htmlFor="gr-end" className={studentLabelClass}>End Date</label>
            <input id="gr-end" name="endDate" type="date" className={studentFieldClass} />
          </div>
          <div className="sm:col-span-3">
            <SingleDocumentUploadField id="gr-doc" name="documentUrl" label="Sanction Order / Grant Letter" />
          </div>
          <div className="sm:col-span-3 flex items-center gap-3">
            <button type="submit" disabled={grAddPending} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-60">
              <Plus size={14} /> {grAddPending ? 'Saving…' : 'Add Grant'}
            </button>
            <ActionMessage state={grAddState} />
            <ActionMessage state={grDelState} />
          </div>
        </form>

        <div className="divide-y divide-border">
          {grants.map((g) =>
            editingGrantId === g.id ? (
              <form key={g.id} action={grEditAction} className="grid gap-3 py-4 sm:grid-cols-3">
                <input type="hidden" name="id" value={g.id} />
                <input name="title" defaultValue={g.title} required className={`${studentFieldClass} sm:col-span-2`} />
                <input name="fundingAgency" defaultValue={g.fundingAgency} required className={studentFieldClass} />
                <input name="grantNumber" defaultValue={g.grantNumber ?? ''} placeholder="Grant #" className={studentFieldClass} />
                <input name="amount" defaultValue={g.amount ?? ''} placeholder="Amount" className={studentFieldClass} />
                <select name="status" defaultValue={g.status} className={studentFieldClass}>
                  <option value="ONGOING">Ongoing</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="SUBMITTED">Submitted</option>
                </select>
                <div className="sm:col-span-3">
                  <SingleDocumentUploadField id={`edit-gr-${g.id}`} name="documentUrl" defaultValue={g.documentUrl ?? ''} />
                </div>
                <div className="sm:col-span-3 flex gap-2">
                  <button type="submit" disabled={grEditPending} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white">Save</button>
                  <button type="button" onClick={() => setEditingGrantId(null)} className="rounded-lg border border-border px-3 py-1.5 text-xs">Cancel</button>
                  <ActionMessage state={grEditState} />
                </div>
              </form>
            ) : (
              <div key={g.id} className="flex flex-wrap items-start justify-between gap-3 py-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground">{g.title}</h3>
                    <VerificationBadge status={g.verificationStatus} verifiedAt={g.verifiedAt} rejectionReason={g.rejectionReason} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {[g.fundingAgency, g.role, g.amount, g.status].filter(Boolean).join(' • ')}
                  </p>
                  <div className="mt-2">
                    <DocumentPreviewLink fileUrl={g.documentUrl} />
                  </div>
                  <ReviewerFeedbackBanner status={g.verificationStatus} rejectionReason={g.rejectionReason} />
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setEditingGrantId(g.id)} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-500/10">
                    <Edit3 size={12} /> Edit
                  </button>
                  <ConfirmDeleteForm id={g.id} action={grDelAction} itemLabel={g.title} />
                </div>
              </div>
            ),
          )}
        </div>
      </section>

      {/* Patents */}
      <section className="rounded-2xl border border-border bg-card p-6">
        <StudentSectionHeader
          title="Patents &amp; Intellectual Property"
          description="Track filed, published, and granted faculty patents."
          badge={`${patents.length} Patents`}
        />

        <form action={patAddAction} className="mb-6 grid gap-4 rounded-xl border border-border bg-muted/20 p-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="fpat-title" className={studentLabelClass}>Patent Title</label>
            <input id="fpat-title" name="title" required className={studentFieldClass} />
          </div>
          <div>
            <label htmlFor="fpat-num" className={studentLabelClass}>Patent Number</label>
            <input id="fpat-num" name="patentNumber" className={studentFieldClass} />
          </div>
          <div>
            <label htmlFor="fpat-status" className={studentLabelClass}>Status</label>
            <select id="fpat-status" name="status" className={studentFieldClass}>
              <option value="FILED">Filed</option>
              <option value="PUBLISHED">Published</option>
              <option value="GRANTED">Granted</option>
              <option value="PENDING">Pending</option>
            </select>
          </div>
          <div>
            <label htmlFor="fpat-date" className={studentLabelClass}>Filing Date</label>
            <input id="fpat-date" name="filedAt" type="date" className={studentFieldClass} />
          </div>
          <div>
            <label htmlFor="fpat-crit" className={studentLabelClass}>Accreditation Criterion</label>
            <select id="fpat-crit" name="criterionCode" className={studentFieldClass}>
              <option value="">None</option>
              {ACCREDITATION_CRITERIA.map((c) => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <SingleDocumentUploadField id="fpat-file" name="fileUrl" />
          </div>
          <div className="sm:col-span-2 flex items-center gap-3">
            <button type="submit" disabled={patAddPending} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-60">
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
                  <SingleDocumentUploadField id={`edit-fpat-${pat.id}`} name="fileUrl" defaultValue={pat.fileUrl ?? ''} />
                </div>
                <div className="sm:col-span-2 flex gap-2">
                  <button type="submit" disabled={patEditPending} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white">Save</button>
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
