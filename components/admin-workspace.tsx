'use client'

import Link from 'next/link'
import { useActionState, useState, useTransition } from 'react'
import {
  addDepartment,
  addUser,
  importUsersCsvAction,
  resetUserPasswordAction,
  type AdminActionState,
} from '@/app/actions/admin'
import type { Role } from '@/generated/prisma/client'
import type { DepartmentWithCourseCount } from '@/lib/server/repositories/department-repository'
import type { EventWithDetails } from '@/lib/server/repositories/event-repository'
import type { UserWithRole } from '@/lib/server/repositories/institution-user-repository'
import { PendingVerifications } from '@/components/pending-verifications'
import type { PendingVerificationItem } from '@/lib/server/services/verification'
import { Check, Copy, Download, KeyRound, Upload, UserPlus, Users, X } from 'lucide-react'

const initialState: AdminActionState = { status: 'idle', message: '' }
const fieldClass =
  'mt-2 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring'
const labelClass = 'text-sm font-medium text-foreground'

function ActionMessage({ state }: { state: AdminActionState }) {
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

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
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

function DepartmentForm() {
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

function SingleUserForm({ roles }: { roles: Role[] }) {
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

function BulkImportForm() {
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

export function AdminWorkspace({
  departments,
  users,
  roles,
  events = [],
  pendingVerifications = [],
}: {
  departments: DepartmentWithCourseCount[]
  users: UserWithRole[]
  roles: Role[]
  events?: EventWithDetails[]
  pendingVerifications?: PendingVerificationItem[]
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
    <div className="mt-8 flex flex-col gap-8">
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

      {/* Departments Section */}
      <section aria-labelledby="departments-heading" className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 id="departments-heading" className="text-lg font-semibold">Departments</h2>
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
                    <th className="pb-3">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {departments.map((dept) => (
                    <tr key={dept.id} className="transition hover:bg-muted/40">
                      <td className="py-3.5 pr-4 font-mono text-xs font-semibold text-primary">{dept.code}</td>
                      <td className="py-3.5 pr-4 font-medium text-foreground">{dept.name}</td>
                      <td className="py-3.5 pr-4 text-muted-foreground">
                        {dept._count?.courses ?? 0}
                      </td>
                      <td className="py-3.5 text-xs text-muted-foreground">
                        {new Date(dept.createdAt).toLocaleDateString()}
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

      {/* Users Section */}
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
    </div>
  )
}
