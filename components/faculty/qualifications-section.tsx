'use client'

import { useActionState, useState } from 'react'
import { Edit3, Plus } from 'lucide-react'
import {
  addFacultyEducation,
  deleteFacultyEducation,
  updateFacultyEducation,
  type FacultyActionState,
} from '@/app/actions/faculty'
import type { FacultyEducation } from '@/generated/prisma/client'
import {
  ActionMessage,
  ConfirmDeleteForm,
  StudentSectionHeader,
  studentFieldClass,
  studentLabelClass,
} from '@/components/student/shared-ui'

const initialState: FacultyActionState = { status: 'idle', message: '' }

export function FacultyQualificationsSection({
  education,
}: {
  education: FacultyEducation[]
}) {
  const [addState, addAction, addPending] = useActionState(addFacultyEducation, initialState)
  const [editState, editAction, editPending] = useActionState(updateFacultyEducation, initialState)
  const [delState, delAction] = useActionState(deleteFacultyEducation, initialState)
  const [editingId, setEditingId] = useState<string | null>(null)

  return (
    <div className="mt-6 rounded-2xl border border-border bg-card p-6">
      <StudentSectionHeader
        title="Academic Qualifications"
        description="Manage doctoral, postgraduate, and undergraduate degrees and specializations."
        badge={`${education.length} Qualifications`}
      />

      <form action={addAction} className="mb-6 grid gap-4 rounded-xl border border-border bg-muted/20 p-4 sm:grid-cols-2">
        <div>
          <label htmlFor="f-qual" className={studentLabelClass}>Degree / Qualification</label>
          <input id="f-qual" name="qualification" required className={studentFieldClass} placeholder="Ph.D. / M.Tech / B.Tech" />
        </div>
        <div>
          <label htmlFor="f-inst" className={studentLabelClass}>University / Institution</label>
          <input id="f-inst" name="institutionName" required className={studentFieldClass} />
        </div>
        <div>
          <label htmlFor="f-field" className={studentLabelClass}>Specialization / Field of Study</label>
          <input id="f-field" name="fieldOfStudy" className={studentFieldClass} placeholder="Computer Science" />
        </div>
        <div>
          <label htmlFor="f-year" className={studentLabelClass}>Year Completed</label>
          <input id="f-year" name="yearCompleted" type="number" min={1950} max={2100} className={studentFieldClass} placeholder="2020" />
        </div>
        <div className="sm:col-span-2 flex items-center gap-3">
          <button type="submit" disabled={addPending} className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
            <Plus size={14} /> {addPending ? 'Saving…' : 'Add Qualification'}
          </button>
          <ActionMessage state={addState} />
          <ActionMessage state={delState} />
        </div>
      </form>

      <div className="divide-y divide-border">
        {education.map((edu) =>
          editingId === edu.id ? (
            <form key={edu.id} action={editAction} className="grid gap-3 py-4 sm:grid-cols-2">
              <input type="hidden" name="id" value={edu.id} />
              <input name="qualification" defaultValue={edu.qualification} required className={studentFieldClass} />
              <input name="institutionName" defaultValue={edu.institutionName} required className={studentFieldClass} />
              <input name="fieldOfStudy" defaultValue={edu.fieldOfStudy ?? ''} placeholder="Field of study" className={studentFieldClass} />
              <input name="yearCompleted" type="number" defaultValue={edu.yearCompleted ?? ''} placeholder="Year" className={studentFieldClass} />
              <div className="sm:col-span-2 flex gap-2">
                <button type="submit" disabled={editPending} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white">Save</button>
                <button type="button" onClick={() => setEditingId(null)} className="rounded-lg border border-border px-3 py-1.5 text-xs">Cancel</button>
                <ActionMessage state={editState} />
              </div>
            </form>
          ) : (
            <div key={edu.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">{edu.qualification}</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {[edu.institutionName, edu.fieldOfStudy, edu.yearCompleted].filter(Boolean).join(' • ')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setEditingId(edu.id)} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-500/10">
                  <Edit3 size={12} /> Edit
                </button>
                <ConfirmDeleteForm id={edu.id} action={delAction} itemLabel={edu.qualification} />
              </div>
            </div>
          ),
        )}
      </div>
    </div>
  )
}
