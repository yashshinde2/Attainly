'use client'

import Link from 'next/link'
import { useActionState, useState, useTransition } from 'react'
import {
  addDepartment,
  addCourse,
  deleteCourseAction,
  addUser,
  importUsersCsvAction,
  resetUserPasswordAction,
  updateInstitutionSettingsAction,
  addCriterionCodeAction,
  type AdminActionState,
} from '@/app/actions/admin'
import type { Role } from '@/generated/prisma/client'
import type { DepartmentWithCourseCount, CourseWithDepartment } from '@/lib/server/repositories/department-repository'
import type { EventWithDetails } from '@/lib/server/repositories/event-repository'
import type { UserWithRole } from '@/lib/server/repositories/institution-user-repository'
import type { CriterionReferenceItem } from '@/lib/server/services/institution'
import { PendingVerifications } from '@/components/pending-verifications'
import type { PendingVerificationItem } from '@/lib/server/services/verification'
import {
  BookOpen,
  CalendarDays,
  Check,
  Copy,
  Download,
  GraduationCap,
  KeyRound,
  Plus,
  Settings2,
  Trash2,
  Upload,
  UserPlus,
  Users,
  UsersRound,
  X,
} from 'lucide-react'

const initialState: AdminActionState = { status: 'idle', message: '' }
export const fieldClass =
  'mt-2 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring'
export const labelClass = 'text-sm font-medium text-foreground'

export function ActionMessage({ state }: { state: AdminActionState }) {
  if (!state.message) return null
  return (
    <p
      role={state.status === 'error' ? 'alert' : 'status'}
      className={`mt-3 text-sm ${state.status === 'error' ? 'text-destructive' : 'text-primary'}`}
    >
      {state.message}
    </p>
  )
}

export function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground shadow-sm transition hover:bg-muted"
    >
      {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
      <span>{copied ? 'Copied!' : label}</span>
    </button>
  )
}

// ==========================================
// 1. DEPARTMENTS MANAGEMENT
// ==========================================
export function DepartmentForm() {
  const [state, action, pending] = useActionState(addDepartment, initialState)
  return (
    <form action={action} className="flex flex-col gap-4 border-b border-border pb-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="dept-name" className={labelClass}>Department name</label>
          <input
            id="dept-name"
            name="name"
            required
            maxLength={120}
            className={fieldClass}
            placeholder="e.g. Computer Science & Engineering"
          />
        </div>
        <div>
          <label htmlFor="dept-code" className={labelClass}>Department code</label>
          <input
            id="dept-code"
            name="code"
            required
            maxLength={20}
            className={fieldClass}
            placeholder="e.g. CSE"
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? 'Adding…' : 'Add department'}
        </button>
        <ActionMessage state={state} />
      </div>
    </form>
  )
}

export function DepartmentManagement({ departments }: { departments: DepartmentWithCourseCount[] }) {
  return (
    <section aria-labelledby="departments-heading" className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 id="departments-heading" className="text-lg font-semibold">Academic Departments</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage academic departments and faculties across the institution.
          </p>
        </div>
        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
          {departments.length} {departments.length === 1 ? 'department' : 'departments'}
        </span>
      </div>

      <DepartmentForm />

      <div className="mt-6">
        {departments.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="pb-3 pr-4">Code</th>
                  <th className="pb-3 pr-4">Department Name</th>
                  <th className="pb-3 pr-4">Courses</th>
                  <th className="pb-3 pr-4">Created</th>
                  <th className="pb-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {departments.map((dept) => (
                  <tr key={dept.id} className="transition hover:bg-muted/40">
                    <td className="py-3.5 pr-4 font-mono text-xs font-semibold text-primary">{dept.code}</td>
                    <td className="py-3.5 pr-4 font-medium text-foreground">{dept.name}</td>
                    <td className="py-3.5 pr-4">
                      <Link
                        href={`/admin/courses?departmentId=${dept.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground hover:bg-muted"
                      >
                        <GraduationCap size={13} />
                        <span>{dept._count?.courses ?? 0} courses &rarr;</span>
                      </Link>
                    </td>
                    <td className="py-3.5 pr-4 text-xs text-muted-foreground">
                      {new Date(dept.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 text-right">
                      <Link
                        href={`/admin/courses?departmentId=${dept.id}`}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        Manage courses
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-border px-4 py-7 text-center text-sm text-muted-foreground">
            No departments registered yet. Use the form above to add your first department.
          </p>
        )}
      </div>
    </section>
  )
}

// ==========================================
// 2. COURSES MANAGEMENT
// ==========================================
export function CourseForm({ departments }: { departments: DepartmentWithCourseCount[] }) {
  const [state, action, pending] = useActionState(addCourse, initialState)
  return (
    <form action={action} className="flex flex-col gap-4 border-b border-border pb-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="course-dept" className={labelClass}>Department</label>
          <select id="course-dept" name="departmentId" required className={fieldClass} defaultValue={departments[0]?.id ?? ''}>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.code})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="course-name" className={labelClass}>Course name</label>
          <input
            id="course-name"
            name="name"
            required
            maxLength={180}
            className={fieldClass}
            placeholder="e.g. B.Tech in Computer Science"
          />
        </div>
        <div>
          <label htmlFor="course-code" className={labelClass}>Course code</label>
          <input
            id="course-code"
            name="code"
            required
            maxLength={20}
            className={fieldClass}
            placeholder="e.g. BTECH-CSE"
          />
        </div>
      </div>
      <div>
        <label htmlFor="course-desc" className={labelClass}>Description (optional)</label>
        <input
          id="course-desc"
          name="description"
          maxLength={1000}
          className={fieldClass}
          placeholder="Brief description of the academic program"
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending || departments.length === 0}
          className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? 'Adding course…' : 'Add course'}
        </button>
        <ActionMessage state={state} />
      </div>
    </form>
  )
}

export function CoursesManagement({
  courses,
  departments,
  initialDepartmentId,
}: {
  courses: CourseWithDepartment[]
  departments: DepartmentWithCourseCount[]
  initialDepartmentId?: string
}) {
  const [filterDept, setFilterDept] = useState(initialDepartmentId || '')
  const [isDeleting, startDeleteTransition] = useTransition()
  const [deleteMsg, setDeleteMsg] = useState('')

  const filteredCourses = filterDept
    ? courses.filter((c) => c.departmentId === filterDept)
    : courses

  const handleDeleteCourse = (courseId: string, courseName: string) => {
    if (!confirm(`Are you sure you want to delete course "${courseName}"?`)) return
    startDeleteTransition(async () => {
      const res = await deleteCourseAction(courseId)
      setDeleteMsg(res.message)
      setTimeout(() => setDeleteMsg(''), 4000)
    })
  }

  return (
    <section aria-labelledby="courses-heading" className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 id="courses-heading" className="text-lg font-semibold">Academic Courses &amp; Programs</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage degree programs, curricula, and courses offered by departments.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="rounded-xl border border-input bg-background px-3 py-1.5 text-xs text-foreground outline-none"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
            ))}
          </select>
          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
            {filteredCourses.length} {filteredCourses.length === 1 ? 'course' : 'courses'}
          </span>
        </div>
      </div>

      <CourseForm departments={departments} />

      {deleteMsg && (
        <p className="mt-3 text-sm text-primary">{deleteMsg}</p>
      )}

      <div className="mt-6">
        {filteredCourses.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="pb-3 pr-4">Code</th>
                  <th className="pb-3 pr-4">Course Name</th>
                  <th className="pb-3 pr-4">Department</th>
                  <th className="pb-3 pr-4">Description</th>
                  <th className="pb-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredCourses.map((c) => (
                  <tr key={c.id} className="transition hover:bg-muted/40">
                    <td className="py-3.5 pr-4 font-mono text-xs font-semibold text-primary">{c.code}</td>
                    <td className="py-3.5 pr-4 font-medium text-foreground">{c.name}</td>
                    <td className="py-3.5 pr-4 text-xs">
                      <span className="rounded-full bg-secondary px-2.5 py-0.5 font-medium text-secondary-foreground">
                        {c.department?.name ?? '—'}
                      </span>
                    </td>
                    <td className="py-3.5 pr-4 text-xs text-muted-foreground max-w-xs truncate">
                      {c.description || '—'}
                    </td>
                    <td className="py-3.5 text-right">
                      <button
                        type="button"
                        disabled={isDeleting}
                        onClick={() => handleDeleteCourse(c.id, c.name)}
                        className="inline-flex items-center gap-1 text-xs text-destructive hover:underline disabled:opacity-50"
                      >
                        <Trash2 size={13} /> Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-border px-4 py-7 text-center text-sm text-muted-foreground">
            No courses found. Use the form above to add your first course.
          </p>
        )}
      </div>
    </section>
  )
}

// ==========================================
// 3. USERS (PEOPLE) MANAGEMENT
// ==========================================
export function SingleUserForm({ roles }: { roles: Role[] }) {
  const [state, action, pending] = useActionState(addUser, initialState)
  return (
    <div className="flex flex-col gap-4 border-b border-border pb-6">
      <form action={action} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="user-first-name" className={labelClass}>First name</label>
            <input
              id="user-first-name"
              name="firstName"
              required
              maxLength={100}
              className={fieldClass}
              placeholder="e.g. Jane"
            />
          </div>
          <div>
            <label htmlFor="user-last-name" className={labelClass}>Last name</label>
            <input
              id="user-last-name"
              name="lastName"
              required
              maxLength={100}
              className={fieldClass}
              placeholder="e.g. Doe"
            />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="user-email" className={labelClass}>Email address</label>
            <input
              id="user-email"
              name="email"
              type="email"
              required
              maxLength={254}
              className={fieldClass}
              placeholder="jane.doe@institution.edu"
            />
          </div>
          <div>
            <label htmlFor="user-role" className={labelClass}>Role</label>
            <select id="user-role" name="roleKey" required className={fieldClass} defaultValue={roles[0]?.key ?? ''}>
              {roles.map((role) => (
                <option key={role.id} value={role.key}>
                  {role.name} ({role.key})
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? 'Creating…' : 'Add user'}
          </button>
          <ActionMessage state={state} />
        </div>
      </form>

      {/* One-time Temporary Password Reveal Banner */}
      {state.status === 'success' && state.createdUser && (
        <div className="mt-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                <Check size={12} /> Account Provisioned
              </span>
              <h4 className="mt-1 font-semibold text-foreground">
                Temporary Credentials for {state.createdUser.name}
              </h4>
              <p className="text-xs text-muted-foreground">
                Email: <span className="font-mono text-foreground">{state.createdUser.email}</span> &bull; Role: {state.createdUser.roleKey}
              </p>
            </div>
            <CopyButton text={state.createdUser.temporaryPassword} label="Copy Temporary Password" />
          </div>

          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Password:</span>
            <code className="rounded-lg border border-border bg-background px-3 py-1 font-mono text-sm font-bold tracking-wider text-foreground">
              {state.createdUser.temporaryPassword}
            </code>
          </div>

          <p className="mt-3 text-xs leading-5 text-amber-700 dark:text-amber-400">
            ⚠️ <strong>One-time reveal:</strong> This temporary password will never be displayed again. Share it securely with the user. They will be required to choose a new password on first login.
          </p>
        </div>
      )}
    </div>
  )
}

export function BulkImportForm() {
  const [state, action, pending] = useActionState(importUsersCsvAction, initialState)

  const downloadCredentialsCsv = (users: Array<{ email: string; name: string; roleKey: string; temporaryPassword: string }>) => {
    const csvRows = ['Email,Name,Role,TemporaryPassword']
    for (const u of users) {
      csvRows.push(`"${u.email}","${u.name}","${u.roleKey}","${u.temporaryPassword}"`)
    }
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `attainly-provisioned-users-${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const copyAllCredentials = async (users: Array<{ email: string; temporaryPassword: string }>) => {
    const text = users.map((u) => `${u.email}: ${u.temporaryPassword}`).join('\n')
    await navigator.clipboard.writeText(text)
  }

  return (
    <div className="flex flex-col gap-4 border-b border-border pb-6">
      <form action={action} className="flex flex-col gap-4">
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4">
          <label htmlFor="csvFile" className={labelClass}>Upload CSV File</label>
          <p className="mt-1 text-xs text-muted-foreground">
            CSV must include columns: <code className="font-mono text-foreground font-semibold">email, firstName, lastName, roleKey</code>
          </p>
          <input
            id="csvFile"
            name="csvFile"
            type="file"
            accept=".csv,text/csv"
            className="mt-3 block w-full text-xs text-muted-foreground file:mr-4 file:rounded-xl file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-xs file:font-semibold file:text-secondary-foreground hover:file:opacity-90"
          />
        </div>

        <div>
          <label htmlFor="csvText" className={labelClass}>Or Paste CSV Raw Text</label>
          <textarea
            id="csvText"
            name="csvText"
            rows={4}
            className={`${fieldClass} font-mono text-xs`}
            placeholder={`email,firstName,lastName,roleKey\nalice@institution.edu,Alice,Smith,STUDENT\nbob@institution.edu,Bob,Jones,FACULTY`}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Upload size={15} />
            {pending ? 'Importing & Provisioning…' : 'Import Users & Generate Passwords'}
          </button>
          <ActionMessage state={state} />
        </div>
      </form>

      {/* CSV Import Results with Table and Export */}
      {state.status === 'success' && state.importResult && (
        <div className="mt-3 rounded-2xl border border-emerald-500/30 bg-card p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                <Check size={12} /> Import Complete
              </span>
              <h4 className="mt-1 font-semibold text-foreground">
                Provisioned {state.importResult.count} Users ({state.importResult.skippedCount} skipped/duplicate)
              </h4>
            </div>

            {state.importResult.createdUsers.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => downloadCredentialsCsv(state.importResult!.createdUsers)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
                >
                  <Download size={13} /> Download CSV
                </button>
                <button
                  type="button"
                  onClick={() => copyAllCredentials(state.importResult!.createdUsers)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
                >
                  <Copy size={13} /> Copy All
                </button>
              </div>
            )}
          </div>

          <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
            ⚠️ <strong>Important:</strong> These passwords are displayed only once. Download or copy the credentials now to distribute to users. Users will be required to change their passwords upon first login.
          </p>

          {state.importResult.createdUsers.length > 0 && (
            <div className="mt-4 max-h-72 overflow-y-auto rounded-xl border border-border">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-secondary/80 backdrop-blur-sm">
                  <tr className="border-b border-border">
                    <th className="py-2.5 pl-3 pr-2 font-semibold">User</th>
                    <th className="py-2.5 px-2 font-semibold">Role</th>
                    <th className="py-2.5 px-2 font-semibold">Temporary Password</th>
                    <th className="py-2.5 pr-3 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {state.importResult.createdUsers.map((u) => (
                    <tr key={u.email} className="hover:bg-muted/40">
                      <td className="py-2.5 pl-3 pr-2">
                        <div className="font-medium text-foreground">{u.name}</div>
                        <div className="font-mono text-muted-foreground">{u.email}</div>
                      </td>
                      <td className="py-2.5 px-2">
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-secondary-foreground">
                          {u.roleKey}
                        </span>
                      </td>
                      <td className="py-2.5 px-2">
                        <code className="rounded bg-muted px-2 py-0.5 font-mono font-bold text-foreground">
                          {u.temporaryPassword}
                        </code>
                      </td>
                      <td className="py-2.5 pr-3 text-right">
                        <CopyButton text={u.temporaryPassword} label="Copy" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function UserManagement({
  users,
  roles,
}: {
  users: UserWithRole[]
  roles: Role[]
}) {
  const [userTab, setUserTab] = useState<'single' | 'bulk'>('single')
  const [resetModal, setResetModal] = useState<{
    open: boolean
    user?: UserWithRole
    temporaryPassword?: string
    error?: string
  }>({ open: false })
  const [isResetting, startResetTransition] = useTransition()

  const handleResetPassword = (user: UserWithRole) => {
    startResetTransition(async () => {
      const res = await resetUserPasswordAction(user.id)
      if (res.status === 'success' && res.resetResult) {
        setResetModal({
          open: true,
          user,
          temporaryPassword: res.resetResult.temporaryPassword,
        })
      } else {
        setResetModal({
          open: true,
          user,
          error: res.message || 'Failed to reset password.',
        })
      }
    })
  }

  return (
    <section aria-labelledby="users-heading" className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 id="users-heading" className="text-lg font-semibold">Institution Users</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Provision and manage students, faculty, and administrative staff accounts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setUserTab('single')}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition ${
              userTab === 'single'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-secondary text-secondary-foreground hover:bg-muted'
            }`}
          >
            <UserPlus size={13} /> Add Single User
          </button>
          <button
            type="button"
            onClick={() => setUserTab('bulk')}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition ${
              userTab === 'bulk'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-secondary text-secondary-foreground hover:bg-muted'
            }`}
          >
            <Users size={13} /> Bulk Import (CSV)
          </button>
        </div>
      </div>

      {userTab === 'single' ? (
        <SingleUserForm roles={roles} />
      ) : (
        <BulkImportForm />
      )}

      {/* Password Reset Modal / Reveal */}
      {resetModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex size-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <KeyRound size={18} />
                </div>
                <h3 className="font-semibold text-foreground">Password Reset</h3>
              </div>
              <button
                type="button"
                onClick={() => setResetModal({ open: false })}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>

            {resetModal.error ? (
              <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {resetModal.error}
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <p className="text-sm text-muted-foreground">
                  A new temporary password has been generated for{' '}
                  <strong className="text-foreground">{resetModal.user?.firstName} {resetModal.user?.lastName}</strong> ({resetModal.user?.email}):
                </p>

                <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 p-3">
                  <code className="font-mono text-base font-bold text-foreground">
                    {resetModal.temporaryPassword}
                  </code>
                  {resetModal.temporaryPassword && (
                    <CopyButton text={resetModal.temporaryPassword} label="Copy" />
                  )}
                </div>

                <p className="text-xs text-amber-700 dark:text-amber-400">
                  ⚠️ <strong>Notice:</strong> This password is shown only once. The user must use it to sign in and will be immediately forced to establish a new password.
                </p>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setResetModal({ open: false })}
                className="rounded-xl bg-secondary px-4 py-2 text-xs font-semibold text-secondary-foreground hover:opacity-90"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6">
        {users.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="pb-3 pr-4">Name</th>
                  <th className="pb-3 pr-4">Email</th>
                  <th className="pb-3 pr-4">Role</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Joined</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((user) => (
                  <tr key={user.id} className="transition hover:bg-muted/40">
                    <td className="py-3.5 pr-4 font-medium text-foreground">
                      {user.firstName} {user.lastName}
                    </td>
                    <td className="py-3.5 pr-4 font-mono text-xs text-muted-foreground">{user.email}</td>
                    <td className="py-3.5 pr-4">
                      <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                        {user.role.name}
                      </span>
                    </td>
                    <td className="py-3.5 pr-4">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          user.isActive
                            ? 'bg-primary/10 text-primary'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3.5 pr-4 text-xs text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 text-right">
                      <button
                        type="button"
                        disabled={isResetting}
                        onClick={() => handleResetPassword(user)}
                        className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground transition hover:bg-muted disabled:opacity-50"
                      >
                        <KeyRound size={12} />
                        <span>Reset password</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-border px-4 py-7 text-center text-sm text-muted-foreground">
            No users found. Add a user above or import users via CSV.
          </p>
        )}
      </div>
    </section>
  )
}

// ==========================================
// 4. SETTINGS MANAGEMENT
// ==========================================
export function InstitutionSettingsManagement({
  institution,
  logoUrl,
  criteria,
}: {
  institution: { id: string; name: string; slug: string }
  logoUrl: string | null
  criteria: CriterionReferenceItem[]
}) {
  const [settingsState, settingsAction, isUpdatingSettings] = useActionState(updateInstitutionSettingsAction, initialState)
  const [criterionState, criterionAction, isAddingCriterion] = useActionState(addCriterionCodeAction, initialState)

  const [currentLogo, setCurrentLogo] = useState(logoUrl || '')
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadError, setUploadError] = useState('')

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingLogo(true)
    setUploadError('')

    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/documents', {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) throw new Error('Failed to upload image.')
      const data = await res.json()
      if (data.url) {
        setCurrentLogo(data.url)
      }
    } catch (err: any) {
      setUploadError(err?.message || 'Could not upload logo.')
    } finally {
      setUploadingLogo(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Institution Profile */}
      <section aria-labelledby="inst-profile-heading" className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <h2 id="inst-profile-heading" className="text-lg font-semibold">Institution Profile</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure institutional identity, branding, and name.
        </p>

        <form action={settingsAction} className="mt-6 flex flex-col gap-4">
          <input type="hidden" name="logoUrl" value={currentLogo} />

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="inst-name" className={labelClass}>Institution Name</label>
              <input
                id="inst-name"
                name="name"
                required
                defaultValue={institution.name}
                className={fieldClass}
                placeholder="e.g. National Institute of Technology"
              />
            </div>
            <div>
              <label className={labelClass}>Institution Slug / Code</label>
              <input
                readOnly
                disabled
                value={institution.slug}
                className={`${fieldClass} bg-muted text-muted-foreground cursor-not-allowed`}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Institution Logo</label>
            <div className="mt-2 flex items-center gap-4">
              {currentLogo ? (
                <div className="relative size-16 overflow-hidden rounded-xl border border-border bg-background">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={currentLogo} alt="Institution logo" className="size-full object-contain p-1" />
                </div>
              ) : (
                <div className="flex size-16 items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 text-xs text-muted-foreground">
                  No Logo
                </div>
              )}
              <div className="space-y-1">
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploadingLogo}
                  onChange={handleLogoUpload}
                  className="block text-xs text-muted-foreground file:mr-3 file:rounded-xl file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-secondary-foreground hover:file:opacity-90"
                />
                <p className="text-[11px] text-muted-foreground">PNG, JPG, or SVG recommended</p>
                {uploadingLogo && <p className="text-xs text-primary animate-pulse">Uploading logo…</p>}
                {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}
              </div>
            </div>
          </div>

          <div className="mt-2 flex items-center gap-3">
            <button
              type="submit"
              disabled={isUpdatingSettings || uploadingLogo}
              className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
            >
              {isUpdatingSettings ? 'Saving…' : 'Save Changes'}
            </button>
            <ActionMessage state={settingsState} />
          </div>
        </form>
      </section>

      {/* Accreditation Criteria List & Add Form */}
      <section aria-labelledby="criteria-heading" className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 id="criteria-heading" className="text-lg font-semibold">Accreditation Reference Criteria</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Define accreditation criteria (NAAC, NBA, NIRF) available for student and faculty claim tagging.
            </p>
          </div>
          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
            {criteria.length} criteria codes
          </span>
        </div>

        <form action={criterionAction} className="mt-6 flex flex-col gap-4 border-b border-border pb-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="crit-code" className={labelClass}>Criterion Code</label>
              <input
                id="crit-code"
                name="code"
                required
                maxLength={40}
                className={fieldClass}
                placeholder="e.g. NAAC-2.1.1 or NBA-PEO"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="crit-label" className={labelClass}>Description / Label</label>
              <input
                id="crit-label"
                name="label"
                required
                maxLength={200}
                className={fieldClass}
                placeholder="e.g. Enrolment Percentage & Student Diversity"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={isAddingCriterion}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
            >
              <Plus size={15} />
              {isAddingCriterion ? 'Adding…' : 'Add Reference Criterion'}
            </button>
            <ActionMessage state={criterionState} />
          </div>
        </form>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="pb-3 pr-4">Code</th>
                <th className="pb-3 pr-4">Criterion Description</th>
                <th className="pb-3 text-right">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {criteria.map((c) => (
                <tr key={c.code} className="hover:bg-muted/40">
                  <td className="py-3 pr-4 font-mono text-xs font-bold text-primary">{c.code}</td>
                  <td className="py-3 pr-4 text-xs font-medium text-foreground">{c.label}</td>
                  <td className="py-3 text-right">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        c.isCustom
                          ? 'bg-primary/10 text-primary'
                          : 'bg-secondary text-secondary-foreground'
                      }`}
                    >
                      {c.isCustom ? 'Custom' : 'Standard'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

// ==========================================
// 5. EXECUTIVE OVERVIEW (MAIN /admin)
// ==========================================
export function AdminWorkspace({
  departments,
  users,
  roles,
  events = [],
  pendingVerifications = [],
  courseCount = 0,
}: {
  departments: DepartmentWithCourseCount[]
  users: UserWithRole[]
  roles: Role[]
  events?: EventWithDetails[]
  pendingVerifications?: PendingVerificationItem[]
  courseCount?: number
}) {
  return (
    <div className="mt-8 flex flex-col gap-8">
      {/* Overview Metric Cards with Navigation */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/admin/people"
          className="group rounded-2xl border border-border bg-card p-5 transition hover:border-primary/50 hover:shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Total Users</span>
            <span className="rounded-xl bg-primary/10 p-2 text-primary transition group-hover:scale-110">
              <UsersRound size={18} />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">{users.length}</p>
          <p className="mt-1 text-xs text-muted-foreground group-hover:text-primary">
            Manage directory &rarr;
          </p>
        </Link>

        <Link
          href="/admin/departments"
          className="group rounded-2xl border border-border bg-card p-5 transition hover:border-primary/50 hover:shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Departments</span>
            <span className="rounded-xl bg-blue-500/10 p-2 text-blue-600 dark:text-blue-400 transition group-hover:scale-110">
              <BookOpen size={18} />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">{departments.length}</p>
          <p className="mt-1 text-xs text-muted-foreground group-hover:text-primary">
            Manage faculties &rarr;
          </p>
        </Link>

        <Link
          href="/admin/courses"
          className="group rounded-2xl border border-border bg-card p-5 transition hover:border-primary/50 hover:shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Academic Courses</span>
            <span className="rounded-xl bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400 transition group-hover:scale-110">
              <GraduationCap size={18} />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">{courseCount}</p>
          <p className="mt-1 text-xs text-muted-foreground group-hover:text-primary">
            Manage programs &rarr;
          </p>
        </Link>

        <Link
          href="/admin/events"
          className="group rounded-2xl border border-border bg-card p-5 transition hover:border-primary/50 hover:shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Campus Events</span>
            <span className="rounded-xl bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400 transition group-hover:scale-110">
              <CalendarDays size={18} />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">{events.length}</p>
          <p className="mt-1 text-xs text-muted-foreground group-hover:text-primary">
            Event outcomes &rarr;
          </p>
        </Link>
      </div>

      {/* Pending Verifications */}
      <section aria-labelledby="verifications-heading" className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 id="verifications-heading" className="text-lg font-semibold">Pending Verifications</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Review and verify student achievements, certifications, papers, patents, and internships.
            </p>
          </div>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            {pendingVerifications.length} {pendingVerifications.length === 1 ? 'claim' : 'claims'} pending
          </span>
        </div>
        <PendingVerifications items={pendingVerifications} />
      </section>

      {/* Events Summary Section */}
      <section aria-labelledby="events-overview-heading" className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 id="events-overview-heading" className="text-lg font-semibold">Institutional Events</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Oversee campus events, symposiums, and participant outcomes.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
              {events.length} {events.length === 1 ? 'event' : 'events'}
            </span>
            <Link
              href="/admin/events"
              className="rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition hover:opacity-90"
            >
              Full Event Console &rarr;
            </Link>
          </div>
        </div>

        {events.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="pb-3 pr-4">Event</th>
                  <th className="pb-3 pr-4">Category</th>
                  <th className="pb-3 pr-4">Department</th>
                  <th className="pb-3 pr-4">Participants</th>
                  <th className="pb-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {events.slice(0, 5).map((evt) => (
                  <tr key={evt.id} className="transition hover:bg-muted/40">
                    <td className="py-3 pr-4 font-medium text-foreground">{evt.title}</td>
                    <td className="py-3 pr-4">
                      <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                        {evt.type.replaceAll('_', ' ').toLowerCase()}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-xs text-muted-foreground">{evt.department.name}</td>
                    <td className="py-3 pr-4 text-xs font-medium text-muted-foreground">{evt._count?.participation ?? 0}</td>
                    <td className="py-3">
                      <Link
                        href="/admin/events"
                        className="rounded-lg bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground hover:opacity-90"
                      >
                        Enter results
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border px-4 py-8 text-center">
            <p className="text-sm text-muted-foreground">No events recorded yet.</p>
            <Link
              href="/admin/events"
              className="mt-3 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90"
            >
              Create first event
            </Link>
          </div>
        )}
      </section>
    </div>
  )
}
