'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { addDepartment, addUser, type AdminActionState } from '@/app/actions/admin'
import type { Role } from '@/generated/prisma/client'
import type { DepartmentWithCourseCount } from '@/lib/server/repositories/department-repository'
import type { EventWithDetails } from '@/lib/server/repositories/event-repository'
import type { UserWithRole } from '@/lib/server/repositories/institution-user-repository'

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

function UserForm({ roles }: { roles: Role[] }) {
  const [state, action, pending] = useActionState(addUser, initialState)
  return (
    <form action={action} className="flex flex-col gap-4 border-b border-border pb-6">
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
  )
}

export function AdminWorkspace({
  departments,
  users,
  roles,
  events = [],
}: {
  departments: DepartmentWithCourseCount[]
  users: UserWithRole[]
  roles: Role[]
  events?: EventWithDetails[]
}) {
  return (
    <div className="mt-8 flex flex-col gap-8">
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
              Directory of students, faculty, and administrative members.
            </p>
          </div>
          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
            {users.length} {users.length === 1 ? 'user' : 'users'}
          </span>
        </div>

        <UserForm roles={roles} />

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
                    <th className="pb-3">Joined</th>
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
                      <td className="py-3.5 text-xs text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString()}
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
