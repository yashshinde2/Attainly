'use client'

import Link from 'next/link'
import { useActionState, useState } from 'react'
import { BookOpen, Edit3, Plus, TrendingUp } from 'lucide-react'
import {
  addStudentEducation,
  addStudentSemesterRecord,
  deleteStudentEducation,
  deleteStudentSemesterRecord,
  updateStudentEducation,
  updateStudentSemesterRecord,
  type StudentActionState,
} from '@/app/actions/student'
import type { StudentEducation, StudentSemesterRecord } from '@/generated/prisma/client'
import {
  ActionMessage,
  ConfirmDeleteForm,
  StudentSectionHeader,
  studentFieldClass,
  studentLabelClass,
} from './shared-ui'

const initialState: StudentActionState = { status: 'idle', message: '' }

export function StudentAcademicsSection({
  semesters,
  education,
}: {
  semesters: StudentSemesterRecord[]
  education: StudentEducation[]
}) {
  const [semAddState, semAddAction, semAddPending] = useActionState(addStudentSemesterRecord, initialState)
  const [semEditState, semEditAction, semEditPending] = useActionState(updateStudentSemesterRecord, initialState)
  const [semDelState, semDelAction] = useActionState(deleteStudentSemesterRecord, initialState)
  const [editingSemId, setEditingSemId] = useState<string | null>(null)

  const [eduAddState, eduAddAction, eduAddPending] = useActionState(addStudentEducation, initialState)
  const [eduEditState, eduEditAction, eduEditPending] = useActionState(updateStudentEducation, initialState)
  const [eduDelState, eduDelAction] = useActionState(deleteStudentEducation, initialState)
  const [editingEduId, setEditingEduId] = useState<string | null>(null)

  const sortedSemesters = [...semesters].sort((a, b) => a.semesterNumber - b.semesterNumber)

  return (
    <div className="mt-6 flex flex-col gap-6">
      {/* Semester Performance & Progression Chart */}
      <section className="rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <StudentSectionHeader
            title="Academic Performance & Progression"
            description="Track semester-wise SGPA, cumulative CGPA, and backlogs."
            badge={`${sortedSemesters.length} Semesters`}
          />
          <Link
            href="/student/courses"
            prefetch={true}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-muted"
          >
            <BookOpen size={14} /> View Department Courses
          </Link>
        </div>

        {sortedSemesters.length > 0 && (
          <div className="mb-6 rounded-xl border border-border bg-muted/20 p-4">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-foreground">
              <TrendingUp size={15} className="text-indigo-600" /> SGPA &amp; CGPA Trend
            </div>
            <div className="flex items-end gap-3 overflow-x-auto pb-1">
              {sortedSemesters.map((s) => (
                <div key={s.id} className="flex min-w-[60px] flex-1 flex-col items-center gap-1">
                  <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300">
                    {s.sgpa.toFixed(2)}
                  </span>
                  <div className="flex h-24 w-full items-end justify-center rounded-lg bg-background p-1">
                    <div
                      className="w-full max-w-[26px] rounded bg-gradient-to-t from-indigo-600 to-teal-500"
                      style={{ height: `${Math.max(10, (s.sgpa / 10) * 100)}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-muted-foreground">Sem {s.semesterNumber}</span>
                  <span className="text-[10px] text-teal-600 dark:text-teal-400">CGPA {s.cgpaAtSemester.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add Semester Form */}
        <form action={semAddAction} className="grid gap-3 rounded-xl border border-border bg-muted/20 p-4 sm:grid-cols-4">
          <div>
            <label htmlFor="sem-num" className={studentLabelClass}>Semester #</label>
            <input id="sem-num" name="semesterNumber" type="number" min={1} max={12} required className={studentFieldClass} placeholder="1" />
          </div>
          <div>
            <label htmlFor="sem-sgpa" className={studentLabelClass}>SGPA (0-10)</label>
            <input id="sem-sgpa" name="sgpa" type="number" step="0.01" min={0} max={10} required className={studentFieldClass} placeholder="8.75" />
          </div>
          <div>
            <label htmlFor="sem-cgpa" className={studentLabelClass}>CGPA (0-10)</label>
            <input id="sem-cgpa" name="cgpaAtSemester" type="number" step="0.01" min={0} max={10} required className={studentFieldClass} placeholder="8.60" />
          </div>
          <div>
            <label htmlFor="sem-backlogs" className={studentLabelClass}>Backlogs</label>
            <input id="sem-backlogs" name="backlogCount" type="number" min={0} defaultValue={0} className={studentFieldClass} />
          </div>
          <div className="sm:col-span-4 flex items-center gap-3">
            <button
              type="submit"
              disabled={semAddPending}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              <Plus size={14} /> {semAddPending ? 'Saving…' : 'Add Semester'}
            </button>
            <ActionMessage state={semAddState} />
            <ActionMessage state={semDelState} />
          </div>
        </form>

        <div className="mt-4 divide-y divide-border">
          {sortedSemesters.map((sem) =>
            editingSemId === sem.id ? (
              <form key={sem.id} action={semEditAction} className="grid gap-3 py-3 sm:grid-cols-4">
                <input type="hidden" name="id" value={sem.id} />
                <input name="semesterNumber" type="number" min={1} max={12} defaultValue={sem.semesterNumber} required className={studentFieldClass} />
                <input name="sgpa" type="number" step="0.01" min={0} max={10} defaultValue={sem.sgpa} required className={studentFieldClass} />
                <input name="cgpaAtSemester" type="number" step="0.01" min={0} max={10} defaultValue={sem.cgpaAtSemester} required className={studentFieldClass} />
                <input name="backlogCount" type="number" min={0} defaultValue={sem.backlogCount ?? 0} className={studentFieldClass} />
                <div className="sm:col-span-4 flex items-center gap-2">
                  <button type="submit" disabled={semEditPending} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
                    {semEditPending ? 'Updating…' : 'Save'}
                  </button>
                  <button type="button" onClick={() => setEditingSemId(null)} className="rounded-lg border border-border px-3 py-1.5 text-xs">
                    Cancel
                  </button>
                  <ActionMessage state={semEditState} />
                </div>
              </form>
            ) : (
              <div key={sem.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <div>
                  <span className="font-semibold text-foreground">Semester {sem.semesterNumber}</span>
                  <span className="ml-3 text-xs text-muted-foreground">
                    SGPA: <strong>{sem.sgpa.toFixed(2)}</strong> &bull; CGPA: <strong>{sem.cgpaAtSemester.toFixed(2)}</strong> &bull; Backlogs: {sem.backlogCount ?? 0}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingSemId(sem.id)}
                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-500/10"
                  >
                    <Edit3 size={12} /> Edit
                  </button>
                  <ConfirmDeleteForm id={sem.id} action={semDelAction} itemLabel={`Semester ${sem.semesterNumber}`} />
                </div>
              </div>
            ),
          )}
        </div>
      </section>

      {/* Educational History */}
      <section className="rounded-2xl border border-border bg-card p-6">
        <StudentSectionHeader
          title="Educational History"
          description="Record your 10th, 12th/Diploma, and current degree qualifications."
          badge={`${education.length} Records`}
        />

        <form action={eduAddAction} className="grid gap-3 rounded-xl border border-border bg-muted/20 p-4 sm:grid-cols-3">
          <div>
            <label htmlFor="edu-level" className={studentLabelClass}>Level</label>
            <select id="edu-level" name="level" className={studentFieldClass}>
              <option value="TENTH">10th / Secondary</option>
              <option value="TWELFTH">12th / Higher Secondary</option>
              <option value="DEGREE">Degree / Diploma</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div>
            <label htmlFor="edu-inst" className={studentLabelClass}>Institution Name</label>
            <input id="edu-inst" name="institutionName" required className={studentFieldClass} placeholder="School / College" />
          </div>
          <div>
            <label htmlFor="edu-board" className={studentLabelClass}>Board / University</label>
            <input id="edu-board" name="boardOrUniversity" className={studentFieldClass} placeholder="CBSE / State / University" />
          </div>
          <div>
            <label htmlFor="edu-stream" className={studentLabelClass}>Stream / Specialization</label>
            <input id="edu-stream" name="courseOrStream" className={studentFieldClass} placeholder="PCM / CSE" />
          </div>
          <div>
            <label htmlFor="edu-score" className={studentLabelClass}>Percentage / CGPA</label>
            <input id="edu-score" name="score" className={studentFieldClass} placeholder="92.4% or 9.1 CGPA" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="edu-start" className={studentLabelClass}>Start Year</label>
              <input id="edu-start" name="startYear" type="number" min={1950} max={2100} className={studentFieldClass} placeholder="2020" />
            </div>
            <div>
              <label htmlFor="edu-end" className={studentLabelClass}>End Year</label>
              <input id="edu-end" name="endYear" type="number" min={1950} max={2100} className={studentFieldClass} placeholder="2022" />
            </div>
          </div>
          <div className="sm:col-span-3 flex items-center gap-3">
            <button
              type="submit"
              disabled={eduAddPending}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              <Plus size={14} /> {eduAddPending ? 'Saving…' : 'Add Education'}
            </button>
            <ActionMessage state={eduAddState} />
            <ActionMessage state={eduDelState} />
          </div>
        </form>

        <div className="mt-4 divide-y divide-border">
          {education.map((edu) =>
            editingEduId === edu.id ? (
              <form key={edu.id} action={eduEditAction} className="grid gap-3 py-3 sm:grid-cols-3">
                <input type="hidden" name="id" value={edu.id} />
                <select name="level" defaultValue={edu.level} className={studentFieldClass}>
                  <option value="TENTH">10th / Secondary</option>
                  <option value="TWELFTH">12th / Higher Secondary</option>
                  <option value="DEGREE">Degree / Diploma</option>
                  <option value="OTHER">Other</option>
                </select>
                <input name="institutionName" defaultValue={edu.institutionName} required className={studentFieldClass} />
                <input name="boardOrUniversity" defaultValue={edu.boardOrUniversity ?? ''} className={studentFieldClass} placeholder="Board/University" />
                <input name="courseOrStream" defaultValue={edu.courseOrStream ?? ''} className={studentFieldClass} placeholder="Stream" />
                <input name="score" defaultValue={edu.score ?? ''} className={studentFieldClass} placeholder="Score" />
                <div className="grid grid-cols-2 gap-2">
                  <input name="startYear" type="number" defaultValue={edu.startYear ?? ''} className={studentFieldClass} placeholder="Start" />
                  <input name="endYear" type="number" defaultValue={edu.endYear ?? ''} className={studentFieldClass} placeholder="End" />
                </div>
                <div className="sm:col-span-3 flex items-center gap-2">
                  <button type="submit" disabled={eduEditPending} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
                    {eduEditPending ? 'Updating…' : 'Save'}
                  </button>
                  <button type="button" onClick={() => setEditingEduId(null)} className="rounded-lg border border-border px-3 py-1.5 text-xs">
                    Cancel
                  </button>
                  <ActionMessage state={eduEditState} />
                </div>
              </form>
            ) : (
              <div key={edu.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold">{edu.level}</span>
                  <span className="ml-2 text-sm font-semibold text-foreground">{edu.institutionName}</span>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {[edu.boardOrUniversity, edu.courseOrStream, edu.score && `Score: ${edu.score}`, edu.endYear && `Completed: ${edu.endYear}`]
                      .filter(Boolean)
                      .join(' • ')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingEduId(edu.id)}
                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-500/10"
                  >
                    <Edit3 size={12} /> Edit
                  </button>
                  <ConfirmDeleteForm id={edu.id} action={eduDelAction} itemLabel={edu.institutionName} />
                </div>
              </div>
            ),
          )}
        </div>
      </section>
    </div>
  )
}
