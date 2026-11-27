'use client'

import { useActionState, useState } from 'react'
import { Edit3, Plus } from 'lucide-react'
import {
  addFacultyExperience,
  addTeachingLoadAction,
  deleteFacultyExperience,
  deleteTeachingLoadAction,
  updateFacultyExperience,
  updateTeachingLoadAction,
  type FacultyActionState,
} from '@/app/actions/faculty'
import type { FacultyExperience, FacultyTeachingLoad } from '@/generated/prisma/client'
import {
  ActionMessage,
  ConfirmDeleteForm,
  StudentSectionHeader,
  studentFieldClass,
  studentLabelClass,
} from '@/components/student/shared-ui'

const initialState: FacultyActionState = { status: 'idle', message: '' }

export function FacultyExperienceTeachingSection({
  experiences,
  teachingLoads,
}: {
  experiences: FacultyExperience[]
  teachingLoads: FacultyTeachingLoad[]
}) {
  const [expAddState, expAddAction, expAddPending] = useActionState(addFacultyExperience, initialState)
  const [expEditState, expEditAction, expEditPending] = useActionState(updateFacultyExperience, initialState)
  const [expDelState, expDelAction] = useActionState(deleteFacultyExperience, initialState)
  const [editingExpId, setEditingExpId] = useState<string | null>(null)

  const [loadAddState, loadAddAction, loadAddPending] = useActionState(addTeachingLoadAction, initialState)
  const [loadEditState, loadEditAction, loadEditPending] = useActionState(updateTeachingLoadAction, initialState)
  const [loadDelState, loadDelAction] = useActionState(deleteTeachingLoadAction, initialState)
  const [editingLoadId, setEditingLoadId] = useState<string | null>(null)

  return (
    <div className="mt-6 flex flex-col gap-6">
      {/* Teaching Workload */}
      <section className="rounded-2xl border border-border bg-card p-6">
        <StudentSectionHeader
          title="Teaching Workload"
          description="Record subjects taught, academic year, semester, weekly contact hours, and student count."
          badge={`${teachingLoads.length} Courses`}
        />

        <form action={loadAddAction} className="mb-6 grid gap-4 rounded-xl border border-border bg-muted/20 p-4 sm:grid-cols-3">
          <div>
            <label htmlFor="tl-year" className={studentLabelClass}>Academic Year</label>
            <input id="tl-year" name="academicYear" required className={studentFieldClass} placeholder="2025-26" />
          </div>
          <div>
            <label htmlFor="tl-sem" className={studentLabelClass}>Semester</label>
            <input id="tl-sem" name="semester" type="number" min={1} max={12} required className={studentFieldClass} placeholder="5" />
          </div>
          <div>
            <label htmlFor="tl-code" className={studentLabelClass}>Subject Code</label>
            <input id="tl-code" name="subjectCode" className={studentFieldClass} placeholder="CS501" />
          </div>
          <div>
            <label htmlFor="tl-subj" className={studentLabelClass}>Subject Name</label>
            <input id="tl-subj" name="subjectName" required className={studentFieldClass} placeholder="Operating Systems" />
          </div>
          <div>
            <label htmlFor="tl-hours" className={studentLabelClass}>Hours / Week</label>
            <input id="tl-hours" name="hoursPerWeek" type="number" min={1} max={60} required className={studentFieldClass} placeholder="4" />
          </div>
          <div>
            <label htmlFor="tl-students" className={studentLabelClass}>Student Count</label>
            <input id="tl-students" name="studentCount" type="number" min={0} className={studentFieldClass} placeholder="64" />
          </div>
          <div className="sm:col-span-3 flex items-center gap-3">
            <button type="submit" disabled={loadAddPending} className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
              <Plus size={14} /> {loadAddPending ? 'Saving…' : 'Add Teaching Load'}
            </button>
            <ActionMessage state={loadAddState} />
            <ActionMessage state={loadDelState} />
          </div>
        </form>

        <div className="divide-y divide-border">
          {teachingLoads.map((tl) =>
            editingLoadId === tl.id ? (
              <form key={tl.id} action={loadEditAction} className="grid gap-3 py-4 sm:grid-cols-3">
                <input type="hidden" name="id" value={tl.id} />
                <input name="academicYear" defaultValue={tl.academicYear} required className={studentFieldClass} />
                <input name="semester" type="number" defaultValue={tl.semester} required className={studentFieldClass} />
                <input name="subjectCode" defaultValue={tl.subjectCode ?? ''} placeholder="Code" className={studentFieldClass} />
                <input name="subjectName" defaultValue={tl.subjectName} required className={studentFieldClass} />
                <input name="hoursPerWeek" type="number" defaultValue={tl.hoursPerWeek} required className={studentFieldClass} />
                <input name="studentCount" type="number" defaultValue={tl.studentCount ?? ''} placeholder="Students" className={studentFieldClass} />
                <div className="sm:col-span-3 flex gap-2">
                  <button type="submit" disabled={loadEditPending} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white">Save</button>
                  <button type="button" onClick={() => setEditingLoadId(null)} className="rounded-lg border border-border px-3 py-1.5 text-xs">Cancel</button>
                  <ActionMessage state={loadEditState} />
                </div>
              </form>
            ) : (
              <div key={tl.id} className="flex flex-wrap items-center justify-between gap-3 py-3.5">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    {tl.subjectCode ? `${tl.subjectCode}: ` : ''}{tl.subjectName}
                  </h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {tl.academicYear} &bull; Semester {tl.semester} &bull; {tl.hoursPerWeek} hrs/week
                    {tl.studentCount !== null && tl.studentCount !== undefined ? ` • ${tl.studentCount} students` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setEditingLoadId(tl.id)} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-500/10">
                    <Edit3 size={12} /> Edit
                  </button>
                  <ConfirmDeleteForm id={tl.id} action={loadDelAction} itemLabel={tl.subjectName} />
                </div>
              </div>
            ),
          )}
        </div>
      </section>

      {/* Teaching & Industry Experience */}
      <section className="rounded-2xl border border-border bg-card p-6">
        <StudentSectionHeader
          title="Teaching & Industry Experience"
          description="Maintain prior academic appointments and industry experience."
          badge={`${experiences.length} Records`}
        />

        <form action={expAddAction} className="mb-6 grid gap-4 rounded-xl border border-border bg-muted/20 p-4 sm:grid-cols-3">
          <div>
            <label htmlFor="exp-type" className={studentLabelClass}>Experience Type</label>
            <select id="exp-type" name="type" className={studentFieldClass}>
              <option value="TEACHING">Teaching</option>
              <option value="INDUSTRY">Industry</option>
            </select>
          </div>
          <div>
            <label htmlFor="exp-org" className={studentLabelClass}>Organization / Institution</label>
            <input id="exp-org" name="organization" required className={studentFieldClass} />
          </div>
          <div>
            <label htmlFor="exp-title" className={studentLabelClass}>Role / Designation</label>
            <input id="exp-title" name="title" required className={studentFieldClass} />
          </div>
          <div>
            <label htmlFor="exp-start" className={studentLabelClass}>Start Date</label>
            <input id="exp-start" name="startDate" type="date" className={studentFieldClass} />
          </div>
          <div>
            <label htmlFor="exp-end" className={studentLabelClass}>End Date (blank if current)</label>
            <input id="exp-end" name="endDate" type="date" className={studentFieldClass} />
          </div>
          <div>
            <label htmlFor="exp-desc" className={studentLabelClass}>Responsibilities</label>
            <input id="exp-desc" name="description" className={studentFieldClass} />
          </div>
          <div className="sm:col-span-3 flex items-center gap-3">
            <button type="submit" disabled={expAddPending} className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
              <Plus size={14} /> {expAddPending ? 'Saving…' : 'Add Experience'}
            </button>
            <ActionMessage state={expAddState} />
            <ActionMessage state={expDelState} />
          </div>
        </form>

        <div className="divide-y divide-border">
          {experiences.map((exp) =>
            editingExpId === exp.id ? (
              <form key={exp.id} action={expEditAction} className="grid gap-3 py-4 sm:grid-cols-3">
                <input type="hidden" name="id" value={exp.id} />
                <select name="type" defaultValue={exp.type} className={studentFieldClass}>
                  <option value="TEACHING">Teaching</option>
                  <option value="INDUSTRY">Industry</option>
                </select>
                <input name="organization" defaultValue={exp.organization} required className={studentFieldClass} />
                <input name="title" defaultValue={exp.title} required className={studentFieldClass} />
                <input name="startDate" type="date" defaultValue={exp.startDate ? new Date(exp.startDate).toISOString().slice(0, 10) : ''} className={studentFieldClass} />
                <input name="endDate" type="date" defaultValue={exp.endDate ? new Date(exp.endDate).toISOString().slice(0, 10) : ''} className={studentFieldClass} />
                <input name="description" defaultValue={exp.description ?? ''} className={studentFieldClass} />
                <div className="sm:col-span-3 flex gap-2">
                  <button type="submit" disabled={expEditPending} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white">Save</button>
                  <button type="button" onClick={() => setEditingExpId(null)} className="rounded-lg border border-border px-3 py-1.5 text-xs">Cancel</button>
                  <ActionMessage state={expEditState} />
                </div>
              </form>
            ) : (
              <div key={exp.id} className="flex flex-wrap items-center justify-between gap-3 py-3.5">
                <div>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold">{exp.type}</span>
                  <span className="ml-2 text-sm font-semibold text-foreground">{exp.title} — {exp.organization}</span>
                  {exp.description && <p className="mt-0.5 text-xs text-muted-foreground">{exp.description}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setEditingExpId(exp.id)} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-500/10">
                    <Edit3 size={12} /> Edit
                  </button>
                  <ConfirmDeleteForm id={exp.id} action={expDelAction} itemLabel={exp.title} />
                </div>
              </div>
            ),
          )}
        </div>
      </section>
    </div>
  )
}
