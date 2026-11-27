'use client'

import Link from 'next/link'
import type { FacultyDirectoryItem } from '@/lib/server/services/admin-command'
import type { DepartmentWithCourseCount } from '@/lib/server/repositories/department-repository'

export function AdminFacultyDirectoryClient({
  items,
  total,
  page,
  pageSize,
  departments,
  filters,
}: {
  items: FacultyDirectoryItem[]
  total: number
  page: number
  pageSize: number
  departments: DepartmentWithCourseCount[]
  filters: Record<string, string>
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const buildPageHref = (nextPage: number) => {
    const p = new URLSearchParams(filters)
    p.set('page', String(nextPage))
    return `/admin/faculty?${p.toString()}`
  }

  return (
    <div className="mt-6 flex flex-col gap-6">
      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">Faculty Directory</h2>
            <p className="text-xs text-muted-foreground">
              {total} {total === 1 ? 'faculty member' : 'faculty members'} matched &bull; Server-filtered &amp; paginated
            </p>
          </div>
          <Link href="/admin/people" prefetch={true} className="rounded-xl border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted">
            Account Provisioning &rarr;
          </Link>
        </div>

        <form action="/admin/faculty" method="GET" className="grid gap-3 rounded-xl border border-border bg-muted/20 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <input
            name="q"
            defaultValue={filters.q ?? ''}
            placeholder="Search name, email, employee ID..."
            className="rounded-xl border border-input bg-background px-3 py-2 text-xs outline-none"
          />
          <select name="departmentId" defaultValue={filters.departmentId ?? ''} className="rounded-xl border border-input bg-background px-3 py-2 text-xs outline-none">
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
            ))}
          </select>
          <input
            name="designation"
            defaultValue={filters.designation ?? ''}
            placeholder="Designation (e.g. Professor)"
            className="rounded-xl border border-input bg-background px-3 py-2 text-xs outline-none"
          />
          <input
            name="qualification"
            defaultValue={filters.qualification ?? ''}
            placeholder="Qualification (e.g. Ph.D)"
            className="rounded-xl border border-input bg-background px-3 py-2 text-xs outline-none"
          />
          <select name="employmentStatus" defaultValue={filters.employmentStatus ?? ''} className="rounded-xl border border-input bg-background px-3 py-2 text-xs outline-none">
            <option value="">All Employment Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="ON_LEAVE">On Leave</option>
            <option value="VISITING">Visiting</option>
            <option value="INACTIVE">Inactive</option>
          </select>
          <input
            name="minExperience"
            type="number"
            min={0}
            defaultValue={filters.minExperience ?? ''}
            placeholder="Min experience records"
            className="rounded-xl border border-input bg-background px-3 py-2 text-xs outline-none"
          />
          <label className="inline-flex items-center gap-2 px-2 text-xs">
            <input type="checkbox" name="hasContributions" value="1" defaultChecked={filters.hasContributions === '1'} className="accent-indigo-600" />
            Has contributions
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <button type="submit" className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700">
              Apply Filters
            </button>
            <Link href="/admin/faculty" className="rounded-xl border border-border px-3 py-2 text-xs font-medium hover:bg-muted">
              Reset
            </Link>
          </div>
        </form>

        {items.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            No faculty matched the selected filters.
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="pb-3 pr-3">Faculty Member</th>
                  <th className="pb-3 pr-3">Employee ID</th>
                  <th className="pb-3 pr-3">Department / Designation</th>
                  <th className="pb-3 pr-3">Qualification</th>
                  <th className="pb-3 pr-3">Publications</th>
                  <th className="pb-3 pr-3">Completeness</th>
                  <th className="pb-3 text-right">Portfolio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((f) => (
                  <tr key={f.userId} className="hover:bg-muted/30">
                    <td className="py-3 pr-3">
                      <p className="font-semibold text-foreground">{f.name}</p>
                      <p className="text-muted-foreground">{f.email}</p>
                    </td>
                    <td className="py-3 pr-3 font-mono">{f.employeeId ?? '—'}</td>
                    <td className="py-3 pr-3">
                      <p>{f.departmentName ?? 'Unassigned'}</p>
                      <p className="text-muted-foreground">{f.designation ?? f.employmentStatus}</p>
                    </td>
                    <td className="py-3 pr-3">{f.highestQualification ?? '—'}</td>
                    <td className="py-3 pr-3">{f.publicationsCount} pubs &bull; {f.contributionsCount} contrib</td>
                    <td className="py-3 pr-3 font-semibold text-indigo-600">{f.completenessPercentage}%</td>
                    <td className="py-3 text-right">
                      <Link
                        href={`/admin/faculty/${f.userId}`}
                        prefetch={true}
                        className="rounded-lg bg-indigo-500/10 px-3 py-1.5 font-semibold text-indigo-700 hover:bg-indigo-500/20 dark:text-indigo-300"
                      >
                        View Portfolio &rarr;
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-xs">
            <span className="text-muted-foreground">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              {page > 1 && <Link href={buildPageHref(page - 1)} className="rounded-lg border border-border px-3 py-1.5">Previous</Link>}
              {page < totalPages && <Link href={buildPageHref(page + 1)} className="rounded-lg border border-border px-3 py-1.5">Next</Link>}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
