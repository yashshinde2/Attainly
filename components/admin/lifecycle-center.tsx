'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowRightLeft,
  CalendarDays,
  CheckCircle2,
  GraduationCap,
  History,
  Loader2,
  Users,
  XCircle,
} from 'lucide-react'
import type {
  FacultyTransitionType,
  StudentTransitionType,
  TransitionPreviewItem,
} from '@/lib/server/services/lifecycle'

interface LifecycleData {
  academicYears: Array<{
    id: string
    label: string
    startDate: string | Date
    endDate: string | Date
    isCurrent: boolean
  }>
  batches: Array<{
    id: string
    name: string
    admissionYear: number
    departmentId: string | null
    courseId: string | null
  }>
  departments: Array<{ id: string; code: string; name: string }>
  courses: Array<{ id: string; code: string; name: string; departmentId: string }>
  students: Array<{
    id: string
    enrollmentNumber: string | null
    currentSemester: number | null
    division: string | null
    batchLabel: string | null
    academicStatus: string
    isLateralEntry: boolean
    user: { id: string; firstName: string; lastName: string; email: string }
    department: { id: string; code: string; name: string } | null
    course: { id: string; code: string; name: string } | null
  }>
  faculties: Array<{
    id: string
    employeeId: string | null
    designation: string | null
    employmentStatus: string
    isArchived: boolean
    user: { id: string; firstName: string; lastName: string; email: string }
    department: { id: string; code: string; name: string } | null
  }>
  studentEvents: Array<{
    id: string
    studentProfileId: string
    eventType: string
    fromSemester: number | null
    toSemester: number | null
    fromStatus: string | null
    toStatus: string | null
    notes: string | null
    createdAt: string | Date
  }>
  facultyEvents: Array<{
    id: string
    facultyProfileId: string
    eventType: string
    fromDesignation: string | null
    toDesignation: string | null
    fromStatus: string | null
    toStatus: string | null
    notes: string | null
    createdAt: string | Date
  }>
}

type TabKey = 'students' | 'faculty' | 'academic-years' | 'history'

export function LifecycleCenter({ data }: { data: LifecycleData }) {
  const router = useRouter()
  const [tab, setTab] = useState<TabKey>('students')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Academic Year & Batch form states
  const [ayLabel, setAyLabel] = useState('')
  const [ayStart, setAyStart] = useState('')
  const [ayEnd, setAyEnd] = useState('')
  const [ayCurrent, setAyCurrent] = useState(false)
  const [batchName, setBatchName] = useState('')
  const [batchYear, setBatchYear] = useState(String(new Date().getFullYear()))
  const [batchDeptId, setBatchDeptId] = useState('')

  // Student Lifecycle state
  const [stuDeptFilter, setStuDeptFilter] = useState('')
  const [stuStatusFilter, setStuStatusFilter] = useState('')
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])
  const [stuTransition, setStuTransition] = useState<StudentTransitionType>('SEMESTER_ADVANCE')
  const [stuAyId, setStuAyId] = useState(
    data.academicYears.find((a) => a.isCurrent)?.id ?? data.academicYears[0]?.id ?? '',
  )
  const [stuTargetDeptId, setStuTargetDeptId] = useState('')
  const [stuTargetCourseId, setStuTargetCourseId] = useState('')
  const [stuTargetDivision, setStuTargetDivision] = useState('')
  const [stuTargetBatch, setStuTargetBatch] = useState('')
  const [stuTargetSem, setStuTargetSem] = useState('3')
  const [stuGradYear, setStuGradYear] = useState(String(new Date().getFullYear()))
  const [stuReason, setStuReason] = useState('')
  const [stuPreview, setStuPreview] = useState<TransitionPreviewItem[] | null>(null)
  const [stuResult, setStuResult] = useState<{
    succeededCount: number
    skippedCount: number
    failedCount: number
  } | null>(null)

  // Faculty Lifecycle state
  const [facDeptFilter, setFacDeptFilter] = useState('')
  const [selectedFacultyIds, setSelectedFacultyIds] = useState<string[]>([])
  const [facTransition, setFacTransition] = useState<FacultyTransitionType>('DESIGNATION_CHANGE')
  const [facTargetDeptId, setFacTargetDeptId] = useState('')
  const [facTargetDesignation, setFacTargetDesignation] = useState('')
  const [facTargetStatus, setFacTargetStatus] = useState<'ACTIVE' | 'ON_LEAVE' | 'VISITING' | 'INACTIVE'>('ACTIVE')
  const [facReason, setFacReason] = useState('')
  const [facPreview, setFacPreview] = useState<TransitionPreviewItem[] | null>(null)
  const [facResult, setFacResult] = useState<{
    succeededCount: number
    skippedCount: number
    failedCount: number
  } | null>(null)

  const filteredStudents = useMemo(() => {
    return data.students.filter((s) => {
      if (stuDeptFilter && s.department?.id !== stuDeptFilter) return false
      if (stuStatusFilter && s.academicStatus !== stuStatusFilter) return false
      return true
    })
  }, [data.students, stuDeptFilter, stuStatusFilter])

  const filteredFaculties = useMemo(() => {
    return data.faculties.filter((f) => {
      if (facDeptFilter && f.department?.id !== facDeptFilter) return false
      return true
    })
  }, [data.faculties, facDeptFilter])

  const toggleAllStudents = () => {
    const visibleIds = filteredStudents.map((s) => s.id)
    if (visibleIds.every((id) => selectedStudentIds.includes(id))) {
      setSelectedStudentIds((prev) => prev.filter((id) => !visibleIds.includes(id)))
    } else {
      setSelectedStudentIds((prev) => [...new Set([...prev, ...visibleIds])])
    }
  }

  const toggleAllFaculties = () => {
    const visibleIds = filteredFaculties.map((f) => f.id)
    if (visibleIds.every((id) => selectedFacultyIds.includes(id))) {
      setSelectedFacultyIds((prev) => prev.filter((id) => !visibleIds.includes(id)))
    } else {
      setSelectedFacultyIds((prev) => [...new Set([...prev, ...visibleIds])])
    }
  }

  const callStudentApi = async (mode: 'preview' | 'execute') => {
    setError(null)
    setBusy(true)
    try {
      const res = await fetch('/api/lifecycle/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          transitionType: stuTransition,
          studentProfileIds: selectedStudentIds,
          academicYearId: stuAyId || null,
          targetDepartmentId: stuTargetDeptId || null,
          targetCourseId: stuTargetCourseId || null,
          targetDivision: stuTargetDivision || null,
          targetBatchLabel: stuTargetBatch || null,
          targetSemester: Number(stuTargetSem) || 3,
          graduationYear: Number(stuGradYear) || new Date().getFullYear(),
          reason: stuReason || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Operation failed.')
      if (mode === 'preview') {
        setStuPreview(json.preview)
        setStuResult(null)
      } else {
        setStuResult(json)
        setStuPreview(null)
        setSelectedStudentIds([])
        router.refresh()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operation failed.')
    } finally {
      setBusy(false)
    }
  }

  const callFacultyApi = async (mode: 'preview' | 'execute') => {
    setError(null)
    setBusy(true)
    try {
      const res = await fetch('/api/lifecycle/faculty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          transitionType: facTransition,
          facultyProfileIds: selectedFacultyIds,
          targetDepartmentId: facTargetDeptId || null,
          targetDesignation: facTargetDesignation || null,
          targetStatus: facTargetStatus,
          reason: facReason || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Operation failed.')
      if (mode === 'preview') {
        setFacPreview(json.preview)
        setFacResult(null)
      } else {
        setFacResult(json)
        setFacPreview(null)
        setSelectedFacultyIds([])
        router.refresh()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operation failed.')
    } finally {
      setBusy(false)
    }
  }

  const callAyApi = async (payload: Record<string, unknown>) => {
    setError(null)
    setBusy(true)
    try {
      const res = await fetch('/api/lifecycle/academic-year', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Operation failed.')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operation failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          Academic Governance
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Academic Year &amp; Lifecycle Management
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Safely advance semesters, promote batches, transfer departments without rewriting historical attribution, and manage faculty career transitions.
        </p>
      </header>

      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        {(
          [
            ['students', 'Student Lifecycle', GraduationCap],
            ['faculty', 'Faculty Lifecycle', Users],
            ['academic-years', 'Academic Years & Batches', CalendarDays],
            ['history', 'Audit History', History],
          ] as const
        ).map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setTab(key)
              setError(null)
            }}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
              tab === key
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'border border-border bg-card text-foreground hover:bg-muted'
            }`}
          >
            <Icon size={14} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {error && (
        <div role="alert" className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
          <XCircle size={15} />
          <span>{error}</span>
        </div>
      )}

      {/* STUDENT LIFECYCLE TAB */}
      {tab === 'students' && (
        <div className="grid gap-6 lg:grid-cols-12">
          <section className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm lg:col-span-5">
            <h2 className="text-base font-semibold text-foreground">Configure Student Transition</h2>
            <div>
              <label htmlFor="stuTransitionType" className="text-xs font-semibold">Transition Action</label>
              <select
                id="stuTransitionType"
                value={stuTransition}
                onChange={(e) => {
                  setStuTransition(e.target.value as StudentTransitionType)
                  setStuPreview(null)
                }}
                className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs"
              >
                <option value="SEMESTER_ADVANCE">Advance Semester (+1, AY-guarded)</option>
                <option value="BATCH_PROMOTION">Promote / Reassign Batch</option>
                <option value="DIVISION_CHANGE">Reassign Division</option>
                <option value="DEPARTMENT_TRANSFER">Department / Program Transfer (Preserves History)</option>
                <option value="LATERAL_ENTRY">Lateral Entry Placement</option>
                <option value="GRADUATION">Mark Graduated</option>
                <option value="ALUMNI_TRANSITION">Transition to Alumni</option>
                <option value="DISCONTINUED">Mark Discontinued</option>
                <option value="TRANSFERRED_OUT">Mark Transferred Out</option>
              </select>
            </div>

            {stuTransition === 'SEMESTER_ADVANCE' && (
              <div>
                <label htmlFor="stuAySelect" className="text-xs font-semibold">Academic Year (Prevents Double Promotion)</label>
                <select
                  id="stuAySelect"
                  value={stuAyId}
                  onChange={(e) => setStuAyId(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs"
                >
                  {data.academicYears.map((ay) => (
                    <option key={ay.id} value={ay.id}>
                      {ay.label}{ay.isCurrent ? ' (Current)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {stuTransition === 'DEPARTMENT_TRANSFER' && (
              <div className="space-y-3">
                <div>
                  <label htmlFor="stuTargetDept" className="text-xs font-semibold">Target Department</label>
                  <select
                    id="stuTargetDept"
                    value={stuTargetDeptId}
                    onChange={(e) => {
                      setStuTargetDeptId(e.target.value)
                      setStuTargetCourseId('')
                    }}
                    className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs"
                  >
                    <option value="">Select department</option>
                    {data.departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.code} — {d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="stuTargetCourse" className="text-xs font-semibold">Target Program / Course (Optional)</label>
                  <select
                    id="stuTargetCourse"
                    value={stuTargetCourseId}
                    onChange={(e) => setStuTargetCourseId(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs"
                  >
                    <option value="">Keep / Unassigned</option>
                    {data.courses
                      .filter((c) => !stuTargetDeptId || c.departmentId === stuTargetDeptId)
                      .map((c) => (
                        <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
                      ))}
                  </select>
                </div>
              </div>
            )}

            {stuTransition === 'DIVISION_CHANGE' && (
              <div>
                <label htmlFor="stuDivInput" className="text-xs font-semibold">New Division</label>
                <input
                  id="stuDivInput"
                  value={stuTargetDivision}
                  onChange={(e) => setStuTargetDivision(e.target.value)}
                  placeholder="e.g. A, B, C"
                  className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs"
                />
              </div>
            )}

            {(stuTransition === 'BATCH_PROMOTION' || stuTransition === 'LATERAL_ENTRY') && (
              <div>
                <label htmlFor="stuBatchInput" className="text-xs font-semibold">Target Batch Label</label>
                <input
                  id="stuBatchInput"
                  value={stuTargetBatch}
                  onChange={(e) => setStuTargetBatch(e.target.value)}
                  placeholder="e.g. 2024-2028"
                  className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs"
                />
              </div>
            )}

            {stuTransition === 'LATERAL_ENTRY' && (
              <div>
                <label htmlFor="stuLatSem" className="text-xs font-semibold">Entry Semester</label>
                <input
                  id="stuLatSem"
                  type="number"
                  min={1}
                  max={12}
                  value={stuTargetSem}
                  onChange={(e) => setStuTargetSem(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs"
                />
              </div>
            )}

            {stuTransition === 'GRADUATION' && (
              <div>
                <label htmlFor="stuGradYr" className="text-xs font-semibold">Graduation Year</label>
                <input
                  id="stuGradYr"
                  type="number"
                  value={stuGradYear}
                  onChange={(e) => setStuGradYear(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs"
                />
              </div>
            )}

            <div>
              <label htmlFor="stuReason" className="text-xs font-semibold">Audit Reason / Order Reference</label>
              <input
                id="stuReason"
                value={stuReason}
                onChange={(e) => setStuReason(e.target.value)}
                placeholder="e.g. End-of-term academic council promotion"
                className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs"
              />
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                disabled={busy || selectedStudentIds.length === 0}
                onClick={() => callStudentApi('preview')}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
              >
                {busy ? <Loader2 size={14} className="animate-spin" /> : <ArrowRightLeft size={14} />}
                <span>Preview Transition ({selectedStudentIds.length})</span>
              </button>
            </div>

            {stuResult && (
              <div role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs">
                <p className="font-semibold text-emerald-700 dark:text-emerald-300">
                  Transition Executed
                </p>
                <p className="mt-1">
                  Succeeded: <strong>{stuResult.succeededCount}</strong> · Skipped:{' '}
                  <strong>{stuResult.skippedCount}</strong> · Failed:{' '}
                  <strong>{stuResult.failedCount}</strong>
                </p>
              </div>
            )}

            {stuPreview && (
              <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-3">
                <p className="text-xs font-semibold">Eligibility Preview ({stuPreview.length} selected)</p>
                <ul className="max-h-48 space-y-1.5 overflow-y-auto text-xs">
                  {stuPreview.map((item) => (
                    <li key={item.profileId} className="flex items-start justify-between gap-2 rounded-lg bg-background p-2">
                      <div>
                        <p className="font-semibold">{item.name} ({item.identifier})</p>
                        <p className="text-[11px] text-muted-foreground">{item.reason ?? item.summary}</p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          item.eligibility === 'WILL_APPLY'
                            ? 'bg-emerald-500/10 text-emerald-600'
                            : item.eligibility === 'SKIPPED'
                              ? 'bg-amber-500/10 text-amber-600'
                              : 'bg-destructive/10 text-destructive'
                        }`}
                      >
                        {item.eligibility}
                      </span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => callStudentApi('execute')}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                >
                  <CheckCircle2 size={14} />
                  <span>Confirm &amp; Execute Transition</span>
                </button>
              </div>
            )}
          </section>

          <section className="space-y-3 rounded-2xl border border-border bg-card p-5 shadow-sm lg:col-span-7">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-semibold">Select Students ({filteredStudents.length})</h2>
              <div className="flex flex-wrap gap-2">
                <select
                  aria-label="Filter students by department"
                  value={stuDeptFilter}
                  onChange={(e) => setStuDeptFilter(e.target.value)}
                  className="rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs"
                >
                  <option value="">All Departments</option>
                  {data.departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.code}</option>
                  ))}
                </select>
                <select
                  aria-label="Filter students by status"
                  value={stuStatusFilter}
                  onChange={(e) => setStuStatusFilter(e.target.value)}
                  className="rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs"
                >
                  <option value="">All Statuses</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="GRADUATED">GRADUATED</option>
                  <option value="ALUMNI">ALUMNI</option>
                  <option value="DISCONTINUED">DISCONTINUED</option>
                  <option value="TRANSFERRED">TRANSFERRED</option>
                </select>
              </div>
            </div>

            <div className="max-h-[480px] overflow-auto rounded-xl border border-border">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-muted/90 text-muted-foreground">
                  <tr>
                    <th className="p-2.5">
                      <input
                        type="checkbox"
                        aria-label="Select all filtered students"
                        checked={filteredStudents.length > 0 && filteredStudents.every((s) => selectedStudentIds.includes(s.id))}
                        onChange={toggleAllStudents}
                      />
                    </th>
                    <th className="p-2.5">Student</th>
                    <th className="p-2.5">Dept / Sem / Div</th>
                    <th className="p-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredStudents.map((s) => (
                    <tr key={s.id} className="bg-background">
                      <td className="p-2.5">
                        <input
                          type="checkbox"
                          aria-label={`Select ${s.user.firstName} ${s.user.lastName}`}
                          checked={selectedStudentIds.includes(s.id)}
                          onChange={(e) =>
                            setSelectedStudentIds((prev) =>
                              e.target.checked ? [...prev, s.id] : prev.filter((id) => id !== s.id),
                            )
                          }
                        />
                      </td>
                      <td className="p-2.5">
                        <p className="font-semibold text-foreground">{s.user.firstName} {s.user.lastName}</p>
                        <p className="font-mono text-[11px] text-muted-foreground">{s.enrollmentNumber ?? s.user.email}</p>
                      </td>
                      <td className="p-2.5 text-muted-foreground">
                        {s.department?.code ?? '—'} · Sem {s.currentSemester ?? '—'}
                        {s.division ? ` · Div ${s.division}` : ''}
                        {s.isLateralEntry ? ' · Lateral' : ''}
                      </td>
                      <td className="p-2.5 font-semibold">{s.academicStatus}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* FACULTY LIFECYCLE TAB */}
      {tab === 'faculty' && (
        <div className="grid gap-6 lg:grid-cols-12">
          <section className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm lg:col-span-5">
            <h2 className="text-base font-semibold text-foreground">Configure Faculty Transition</h2>
            <div>
              <label htmlFor="facTransitionType" className="text-xs font-semibold">Transition Action</label>
              <select
                id="facTransitionType"
                value={facTransition}
                onChange={(e) => {
                  setFacTransition(e.target.value as FacultyTransitionType)
                  setFacPreview(null)
                }}
                className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs"
              >
                <option value="DESIGNATION_CHANGE">Designation Change</option>
                <option value="DEPARTMENT_TRANSFER">Department Transfer (Preserves Historical Attribution)</option>
                <option value="STATUS_CHANGE">Employment Status Change</option>
                <option value="RELIEVING">Record Relieving</option>
                <option value="RETIREMENT">Record Retirement</option>
                <option value="ARCHIVED">Archive Portfolio</option>
              </select>
            </div>

            {facTransition === 'DESIGNATION_CHANGE' && (
              <div>
                <label htmlFor="facDesigInput" className="text-xs font-semibold">New Designation</label>
                <input
                  id="facDesigInput"
                  value={facTargetDesignation}
                  onChange={(e) => setFacTargetDesignation(e.target.value)}
                  placeholder="e.g. Professor, Associate Professor"
                  className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs"
                />
              </div>
            )}

            {facTransition === 'DEPARTMENT_TRANSFER' && (
              <div>
                <label htmlFor="facTargetDept" className="text-xs font-semibold">Target Department</label>
                <select
                  id="facTargetDept"
                  value={facTargetDeptId}
                  onChange={(e) => setFacTargetDeptId(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs"
                >
                  <option value="">Select department</option>
                  {data.departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.code} — {d.name}</option>
                  ))}
                </select>
              </div>
            )}

            {facTransition === 'STATUS_CHANGE' && (
              <div>
                <label htmlFor="facStatusSelect" className="text-xs font-semibold">New Employment Status</label>
                <select
                  id="facStatusSelect"
                  value={facTargetStatus}
                  onChange={(e) => setFacTargetStatus(e.target.value as typeof facTargetStatus)}
                  className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="ON_LEAVE">ON_LEAVE</option>
                  <option value="VISITING">VISITING</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>
            )}

            <div>
              <label htmlFor="facReason" className="text-xs font-semibold">Audit Reason / Order Reference</label>
              <input
                id="facReason"
                value={facReason}
                onChange={(e) => setFacReason(e.target.value)}
                placeholder="e.g. HR Order #2026-44"
                className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs"
              />
            </div>

            <button
              type="button"
              disabled={busy || selectedFacultyIds.length === 0}
              onClick={() => callFacultyApi('preview')}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <ArrowRightLeft size={14} />}
              <span>Preview Transition ({selectedFacultyIds.length})</span>
            </button>

            {facResult && (
              <div role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs">
                Succeeded: <strong>{facResult.succeededCount}</strong> · Skipped:{' '}
                <strong>{facResult.skippedCount}</strong> · Failed:{' '}
                <strong>{facResult.failedCount}</strong>
              </div>
            )}

            {facPreview && (
              <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-3">
                <ul className="max-h-48 space-y-1.5 overflow-y-auto text-xs">
                  {facPreview.map((item) => (
                    <li key={item.profileId} className="flex items-start justify-between gap-2 rounded-lg bg-background p-2">
                      <div>
                        <p className="font-semibold">{item.name} ({item.identifier})</p>
                        <p className="text-[11px] text-muted-foreground">{item.reason ?? item.summary}</p>
                      </div>
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                        {item.eligibility}
                      </span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => callFacultyApi('execute')}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                >
                  <CheckCircle2 size={14} />
                  <span>Confirm &amp; Execute Transition</span>
                </button>
              </div>
            )}
          </section>

          <section className="space-y-3 rounded-2xl border border-border bg-card p-5 shadow-sm lg:col-span-7">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-semibold">Select Faculty ({filteredFaculties.length})</h2>
              <select
                aria-label="Filter faculty by department"
                value={facDeptFilter}
                onChange={(e) => setFacDeptFilter(e.target.value)}
                className="rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs"
              >
                <option value="">All Departments</option>
                {data.departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.code}</option>
                ))}
              </select>
            </div>
            <div className="max-h-[480px] overflow-auto rounded-xl border border-border">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-muted/90 text-muted-foreground">
                  <tr>
                    <th className="p-2.5">
                      <input
                        type="checkbox"
                        aria-label="Select all filtered faculty"
                        checked={filteredFaculties.length > 0 && filteredFaculties.every((f) => selectedFacultyIds.includes(f.id))}
                        onChange={toggleAllFaculties}
                      />
                    </th>
                    <th className="p-2.5">Faculty</th>
                    <th className="p-2.5">Dept / Designation</th>
                    <th className="p-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredFaculties.map((f) => (
                    <tr key={f.id} className="bg-background">
                      <td className="p-2.5">
                        <input
                          type="checkbox"
                          aria-label={`Select ${f.user.firstName} ${f.user.lastName}`}
                          checked={selectedFacultyIds.includes(f.id)}
                          onChange={(e) =>
                            setSelectedFacultyIds((prev) =>
                              e.target.checked ? [...prev, f.id] : prev.filter((id) => id !== f.id),
                            )
                          }
                        />
                      </td>
                      <td className="p-2.5">
                        <p className="font-semibold text-foreground">{f.user.firstName} {f.user.lastName}</p>
                        <p className="font-mono text-[11px] text-muted-foreground">{f.employeeId ?? f.user.email}</p>
                      </td>
                      <td className="p-2.5 text-muted-foreground">
                        {f.department?.code ?? '—'} · {f.designation ?? '—'}
                      </td>
                      <td className="p-2.5 font-semibold">{f.employmentStatus}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* ACADEMIC YEARS & BATCHES TAB */}
      {tab === 'academic-years' && (
        <div className="grid gap-6 md:grid-cols-2">
          <section className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-base font-semibold">Academic Years</h2>
            <div className="grid gap-2 sm:grid-cols-3">
              <input value={ayLabel} onChange={(e) => setAyLabel(e.target.value)} placeholder="2026-27" className="rounded-lg border border-input bg-background px-3 py-2 text-xs" />
              <input type="date" value={ayStart} onChange={(e) => setAyStart(e.target.value)} className="rounded-lg border border-input bg-background px-3 py-2 text-xs" />
              <input type="date" value={ayEnd} onChange={(e) => setAyEnd(e.target.value)} className="rounded-lg border border-input bg-background px-3 py-2 text-xs" />
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={ayCurrent} onChange={(e) => setAyCurrent(e.target.checked)} />
                Set as active academic year
              </label>
              <button
                type="button"
                disabled={busy || !ayLabel || !ayStart || !ayEnd}
                onClick={() => callAyApi({ action: 'create_ay', label: ayLabel, startDate: ayStart, endDate: ayEnd, isCurrent: ayCurrent })}
                className="rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
              >
                Create Academic Year
              </button>
            </div>
            <ul className="divide-y divide-border rounded-xl border border-border">
              {data.academicYears.map((ay) => (
                <li key={ay.id} className="flex items-center justify-between p-3 text-xs">
                  <div>
                    <p className="font-semibold">{ay.label}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(ay.startDate).toISOString().slice(0, 10)} → {new Date(ay.endDate).toISOString().slice(0, 10)}
                    </p>
                  </div>
                  {ay.isCurrent ? (
                    <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-600">
                      Current
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => callAyApi({ action: 'set_current_ay', academicYearId: ay.id })}
                      className="rounded-lg border border-border px-2.5 py-1 text-[11px] font-medium hover:bg-muted"
                    >
                      Set Current
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-base font-semibold">Student Batches</h2>
            <div className="grid gap-2 sm:grid-cols-3">
              <input value={batchName} onChange={(e) => setBatchName(e.target.value)} placeholder="2026-2030 CSE" className="rounded-lg border border-input bg-background px-3 py-2 text-xs" />
              <input type="number" value={batchYear} onChange={(e) => setBatchYear(e.target.value)} placeholder="2026" className="rounded-lg border border-input bg-background px-3 py-2 text-xs" />
              <select value={batchDeptId} onChange={(e) => setBatchDeptId(e.target.value)} className="rounded-lg border border-input bg-background px-3 py-2 text-xs">
                <option value="">All Depts</option>
                {data.departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.code}</option>
                ))}
              </select>
            </div>
            <button
              type="button"
              disabled={busy || !batchName || !batchYear}
              onClick={() => callAyApi({ action: 'create_batch', name: batchName, admissionYear: Number(batchYear), departmentId: batchDeptId || null })}
              className="rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
            >
              Create Batch
            </button>
            <ul className="divide-y divide-border rounded-xl border border-border">
              {data.batches.map((b) => (
                <li key={b.id} className="flex items-center justify-between p-3 text-xs">
                  <span className="font-semibold">{b.name}</span>
                  <span className="text-muted-foreground">Admission {b.admissionYear}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}

      {/* AUDIT HISTORY TAB */}
      {tab === 'history' && (
        <div className="grid gap-6 md:grid-cols-2">
          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-base font-semibold">Recent Student Lifecycle Events</h2>
            <ul className="mt-3 divide-y divide-border text-xs">
              {data.studentEvents.length === 0 ? (
                <li className="py-4 text-muted-foreground">No student lifecycle events recorded yet.</li>
              ) : (
                data.studentEvents.map((e) => (
                  <li key={e.id} className="py-2.5">
                    <p className="font-semibold">{e.eventType}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {e.fromSemester !== e.toSemester ? `Sem ${e.fromSemester ?? '—'} → ${e.toSemester ?? '—'} · ` : ''}
                      {e.fromStatus !== e.toStatus ? `${e.fromStatus} → ${e.toStatus} · ` : ''}
                      {e.notes ?? 'Lifecycle transition'} · {new Date(e.createdAt).toLocaleString()}
                    </p>
                  </li>
                ))
              )}
            </ul>
          </section>
          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-base font-semibold">Recent Faculty Lifecycle Events</h2>
            <ul className="mt-3 divide-y divide-border text-xs">
              {data.facultyEvents.length === 0 ? (
                <li className="py-4 text-muted-foreground">No faculty lifecycle events recorded yet.</li>
              ) : (
                data.facultyEvents.map((e) => (
                  <li key={e.id} className="py-2.5">
                    <p className="font-semibold">{e.eventType}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {e.fromDesignation !== e.toDesignation ? `${e.fromDesignation ?? '—'} → ${e.toDesignation ?? '—'} · ` : ''}
                      {e.fromStatus !== e.toStatus ? `${e.fromStatus} → ${e.toStatus} · ` : ''}
                      {e.notes ?? 'Lifecycle transition'} · {new Date(e.createdAt).toLocaleString()}
                    </p>
                  </li>
                ))
              )}
            </ul>
          </section>
        </div>
      )}
    </div>
  )
}
