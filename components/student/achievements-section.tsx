'use client'

import Link from 'next/link'
import { useActionState, useState } from 'react'
import { Edit3, Plus } from 'lucide-react'
import {
  addStudentAchievement,
  deleteStudentAchievement,
  updateStudentAchievement,
  type StudentActionState,
} from '@/app/actions/student'
import type { Achievement, AchievementCategoryConfig } from '@/generated/prisma/client'
import {
  ACCREDITATION_CRITERIA,
  ActionMessage,
  ConfirmDeleteForm,
  DocumentPreviewLink,
  MultiDocumentUploadField,
  ReviewerFeedbackBanner,
  StudentSectionHeader,
  VerificationBadge,
  studentFieldClass,
  studentLabelClass,
} from './shared-ui'

const initialState: StudentActionState = { status: 'idle', message: '' }

function mapConfigToLegacyCategory(code: string): 'TECHNICAL' | 'NON_TECHNICAL' | 'SPORTS' | 'CULTURAL' {
  if (code === 'SPORTS') return 'SPORTS'
  if (code === 'CULTURAL') return 'CULTURAL'
  if (code === 'TECHNICAL' || code === 'HACKATHON' || code === 'ACADEMIC') return 'TECHNICAL'
  return 'NON_TECHNICAL'
}

export function StudentAchievementsSection({
  items,
  total,
  page,
  pageSize,
  categories,
  activeCategoryCode,
}: {
  items: Achievement[]
  total: number
  page: number
  pageSize: number
  categories: AchievementCategoryConfig[]
  activeCategoryCode?: string
}) {
  const [addState, addAction, addPending] = useActionState(addStudentAchievement, initialState)
  const [editState, editAction, editPending] = useActionState(updateStudentAchievement, initialState)
  const [delState, delAction] = useActionState(deleteStudentAchievement, initialState)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [selectedCatCode, setSelectedCatCode] = useState(categories[0]?.code ?? 'TECHNICAL')
  const [selectedTeamType, setSelectedTeamType] = useState('INDIVIDUAL')

  const activeCategoryConfig = categories.find((c) => c.code === selectedCatCode)
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="mt-6 rounded-2xl border border-border bg-card p-6">
      <StudentSectionHeader
        title="Achievements & Co-Curricular Claims"
        description="Log technical events, hackathons, sports, cultural, leadership, and social service milestones with supporting evidence."
        badge={`${total} Total`}
      />

      {/* Add Achievement Form */}
      <form action={addAction} className="mb-6 grid gap-4 rounded-xl border border-border bg-muted/20 p-4 sm:grid-cols-3">
        <input type="hidden" name="category" value={mapConfigToLegacyCategory(selectedCatCode)} />

        <div className="sm:col-span-2">
          <label htmlFor="ach-title" className={studentLabelClass}>Achievement / Event Title</label>
          <input id="ach-title" name="title" required className={studentFieldClass} placeholder="e.g. Smart India Hackathon Finalist" />
        </div>
        <div>
          <label htmlFor="ach-date" className={studentLabelClass}>Activity Date</label>
          <input id="ach-date" name="awardedAt" type="date" className={studentFieldClass} />
        </div>

        <div>
          <label htmlFor="ach-cat-code" className={studentLabelClass}>Category</label>
          <select
            id="ach-cat-code"
            name="categoryCode"
            value={selectedCatCode}
            onChange={(e) => setSelectedCatCode(e.target.value)}
            className={studentFieldClass}
          >
            {categories.map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="ach-subcat" className={studentLabelClass}>Subcategory</label>
          <select id="ach-subcat" name="subcategory" className={studentFieldClass}>
            <option value="">Select subcategory</option>
            {(activeCategoryConfig?.subcategories ?? []).map((sub) => (
              <option key={sub} value={sub}>{sub}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="ach-level" className={studentLabelClass}>Participation Level</label>
          <select id="ach-level" name="participationLevel" className={studentFieldClass}>
            <option value="INSTITUTIONAL">Institutional</option>
            <option value="STATE">State / Regional</option>
            <option value="NATIONAL">National</option>
            <option value="INTERNATIONAL">International</option>
          </select>
        </div>

        <div>
          <label htmlFor="ach-status" className={studentLabelClass}>Outcome Status</label>
          <select id="ach-status" name="status" className={studentFieldClass}>
            <option value="WINNER">Winner / Ranked</option>
            <option value="PARTICIPATION">Participation</option>
          </select>
        </div>

        <div>
          <label htmlFor="ach-result" className={studentLabelClass}>Result / Position</label>
          <input id="ach-result" name="result" className={studentFieldClass} placeholder="e.g. 1st Place / Top 5" />
        </div>

        <div>
          <label htmlFor="ach-organizer" className={studentLabelClass}>Organizer</label>
          <input id="ach-organizer" name="organizer" className={studentFieldClass} placeholder="e.g. Ministry of Education / IEEE" />
        </div>

        <div>
          <label htmlFor="ach-team-type" className={studentLabelClass}>Participation Mode</label>
          <select
            id="ach-team-type"
            name="teamType"
            value={selectedTeamType}
            onChange={(e) => setSelectedTeamType(e.target.value)}
            className={studentFieldClass}
          >
            <option value="INDIVIDUAL">Individual</option>
            <option value="TEAM">Team</option>
          </select>
        </div>

        {selectedTeamType === 'TEAM' && (
          <div>
            <label htmlFor="ach-team-name" className={studentLabelClass}>Team Name</label>
            <input id="ach-team-name" name="teamName" className={studentFieldClass} placeholder="Team Alpha" />
          </div>
        )}

        <div>
          <label htmlFor="ach-role" className={studentLabelClass}>Your Role</label>
          <input id="ach-role" name="role" className={studentFieldClass} placeholder="e.g. Team Lead / Backend Developer" />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="ach-criterion" className={studentLabelClass}>Accreditation Criterion (Optional)</label>
          <select id="ach-criterion" name="criterionCode" className={studentFieldClass}>
            <option value="">None</option>
            {ACCREDITATION_CRITERIA.map((c) => (
              <option key={c.code} value={c.code}>{c.label}</option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-3">
          <label htmlFor="ach-desc" className={studentLabelClass}>Description</label>
          <textarea id="ach-desc" name="description" rows={2} className={studentFieldClass} placeholder="Key contributions and impact..." />
        </div>

        <div className="sm:col-span-3">
          <MultiDocumentUploadField id="ach-docs" name="documentUrls" />
        </div>

        <div className="sm:col-span-3 flex items-center gap-3">
          <button
            type="submit"
            disabled={addPending}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            <Plus size={14} /> {addPending ? 'Submitting…' : 'Add Achievement'}
          </button>
          <ActionMessage state={addState} />
          <ActionMessage state={delState} />
        </div>
      </form>

      {/* Category Filter */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Link
          href="/student/achievements"
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            !activeCategoryCode ? 'bg-indigo-600 text-white' : 'bg-muted text-muted-foreground hover:text-foreground'
          }`}
        >
          All
        </Link>
        {categories.map((c) => (
          <Link
            key={c.code}
            href={`/student/achievements?category=${encodeURIComponent(c.code)}`}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              activeCategoryCode === c.code
                ? 'bg-indigo-600 text-white'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            {c.name}
          </Link>
        ))}
      </div>

      {/* Paginated List */}
      <div className="divide-y divide-border">
        {items.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No achievements found for this filter.</p>
        ) : (
          items.map((item) =>
            editingId === item.id ? (
              <form key={item.id} action={editAction} className="grid gap-3 py-4 sm:grid-cols-3">
                <input type="hidden" name="id" value={item.id} />
                <input type="hidden" name="category" value={item.category} />
                <input type="hidden" name="categoryCode" value={item.categoryCode ?? item.category} />
                <input name="title" defaultValue={item.title} required className={studentFieldClass} />
                <select name="status" defaultValue={item.status} className={studentFieldClass}>
                  <option value="WINNER">Winner</option>
                  <option value="PARTICIPATION">Participation</option>
                </select>
                <input name="result" defaultValue={item.result ?? ''} placeholder="Result" className={studentFieldClass} />
                <input name="organizer" defaultValue={item.organizer ?? ''} placeholder="Organizer" className={studentFieldClass} />
                <input name="role" defaultValue={item.role ?? ''} placeholder="Role" className={studentFieldClass} />
                <input
                  name="awardedAt"
                  type="date"
                  defaultValue={item.awardedAt ? new Date(item.awardedAt).toISOString().slice(0, 10) : ''}
                  className={studentFieldClass}
                />
                <textarea name="description" defaultValue={item.description ?? ''} rows={2} className={`${studentFieldClass} sm:col-span-3`} />
                <div className="sm:col-span-3">
                  <MultiDocumentUploadField id={`edit-ach-docs-${item.id}`} name="documentUrls" defaultUrls={item.documentUrls} />
                </div>
                <div className="sm:col-span-3 flex items-center gap-2">
                  <button type="submit" disabled={editPending} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white">
                    {editPending ? 'Saving…' : 'Save Changes'}
                  </button>
                  <button type="button" onClick={() => setEditingId(null)} className="rounded-lg border border-border px-3 py-1.5 text-xs">
                    Cancel
                  </button>
                  <ActionMessage state={editState} />
                </div>
              </form>
            ) : (
              <div key={item.id} className="py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                      <VerificationBadge status={item.verificationStatus} verifiedAt={item.verifiedAt} rejectionReason={item.rejectionReason} />
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium">
                        {item.categoryCode ?? item.category} {item.subcategory ? `• ${item.subcategory}` : ''}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {[
                        item.participationLevel,
                        item.result,
                        item.organizer && `Organizer: ${item.organizer}`,
                        item.role && `Role: ${item.role}`,
                        item.awardedAt && new Date(item.awardedAt).toLocaleDateString(),
                      ]
                        .filter(Boolean)
                        .join(' • ')}
                    </p>
                    {item.description && <p className="mt-1 text-xs text-foreground/80">{item.description}</p>}
                    {item.documentUrls.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-3">
                        {item.documentUrls.map((url, idx) => (
                          <DocumentPreviewLink key={url} fileUrl={url} label={`Evidence ${idx + 1}`} />
                        ))}
                      </div>
                    )}
                    <ReviewerFeedbackBanner status={item.verificationStatus} rejectionReason={item.rejectionReason} />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingId(item.id)}
                      className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-500/10"
                    >
                      <Edit3 size={12} /> Edit
                    </button>
                    <ConfirmDeleteForm id={item.id} action={delAction} itemLabel={item.title} />
                  </div>
                </div>
              </div>
            ),
          )
        )}
      </div>

      {/* Server-side Pagination */}
      {totalPages > 1 && (
        <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-xs">
          <span className="text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/student/achievements?page=${page - 1}${activeCategoryCode ? `&category=${encodeURIComponent(activeCategoryCode)}` : ''}`}
                className="rounded-lg border border-border px-3 py-1.5 font-medium hover:bg-muted"
              >
                Previous
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/student/achievements?page=${page + 1}${activeCategoryCode ? `&category=${encodeURIComponent(activeCategoryCode)}` : ''}`}
                className="rounded-lg border border-border px-3 py-1.5 font-medium hover:bg-muted"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
