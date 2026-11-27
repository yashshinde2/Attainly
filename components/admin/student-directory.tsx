'use client'

import Link from 'next/link'
import type { StudentDirectoryItem } from '@/lib/server/services/admin-command'
import type { DepartmentWithCourseCount, CourseWithDepartment } from '@/lib/server/repositories/department-repository'

export function AdminStudentDirectoryClient({
  items,
  total,
  page,
  pageSize,
  departments,
  courses,
  filters,
}: {
  items: StudentDirectoryItem[]
  total: number
  page: number
  pageSize: number
  departments: DepartmentWithCourseCount[]
  courses: CourseWithDepartment[]
  filters: Record<string, string>
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const buildPageHref = (nextPage: number) => {
    const p = new URLSearchParams(filters)
    p.set('page', String(nextPage))
    return `/admin/students?${p.toString()}`
  }

  return (
    <div className="mt-6 flex flex-col gap-6">
      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">Student Directory</h2>
            <p className="text-xs text-muted-foreground">
              {total} {total === 1 ? 'student' : 'students'} matched &bull; Server-filtered &amp; paginated
            </p>
          </div>
          <Link href="/admin/people" prefetch={true} className="rounded-xl border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted">
            Account Provisioning &rarr;
          </Link>
        </div>

        <form action="/admin/students" method="GET" className="grid gap-3 rounded-xl border border-border bg-muted/20 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <input
            name="q"
            defaultValue={filters.q ?? ''}
            placeholder="Search name, email, enrollment #..."
            className="rounded-xl border border-input bg-background px-3 py-2 text-xs outline-none"
          />
          <select name="departmentId" defaultValue={filters.departmentId ?? ''} className="rounded-xl border border-input bg-background px-3 py-2 text-xs outline-none">
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
            ))}
          </select>
          <select name="courseId" defaultValue={filters.courseId ?? ''} className="rounded-xl border border-input bg-background px-3 py-2 text-xs outline-none">
            <option value="">All Programs / Courses</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <input
            name="batchYear"
            type="number"
            defaultValue={filters.batchYear ?? ''}
            placeholder="Batch / Admission Year"
            className="rounded-xl border border-input bg-background px-3 py-2 text-xs outline-none"
          />
          <select name="semester" defaultValue={filters.semester ?? ''} className="rounded-xl border border-input bg-background px-3 py-2 text-xs outline-none">
            <option value="">All Semesters</option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
              <option key={s} value={s}>Semester {s}</option>
            ))}
          </select>
          <select name="academicStatus" defaultValue={filters.academicStatus ?? ''} className="rounded-xl border border-input bg-background px-3 py-2 text-xs outline-none">
            <option value="">All Academic Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="ON_LEAVE">On Leave</option>
            <option value="GRADUATED">Graduated</option>
            <option value="ALUMNI">Alumni</option>
          </select>
          <select name="placementStatus" defaultValue={filters.placementStatus ?? ''} className="rounded-xl border border-input bg-background px-3 py-2 text-xs outline-none">
            <option value="">All Placement Statuses</option>
            <option value="PLACED">Placed</option>
            <option value="HAS_OFFERS">Has Offers</option>
            <option value="NO_OFFERS">No Offers Yet</option>
          </select>
          <select name="completenessBand" defaultValue={filters.completenessBand ?? ''} className="rounded-xl border border-input bg-background px-3 py-2 text-xs outline-none">
            <option value="">Any Completeness</option>
            <option value="below50">Below 50%</option>
            <option value="50to80">50% – 80%</option>
            <option value="above80">Above 80%</option>
          </select>
          <div className="sm:col-span-2 lg:col-span-4 flex flex-wrap items-center gap-2">
            <button type="submit" className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white hover:opacity-90">
              Apply Filters
            </button>
            <Link href="/admin/students" className="rounded-xl border border-border px-3 py-2 text-xs font-medium hover:bg-muted">
              Reset
            </Link>
          </div>
        </form>

        {items.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            No students matched the selected filters.
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="pb-3 pr-3">Student</th>
                  <th className="pb-3 pr-3">Enrollment #</th>
                  <th className="pb-3 pr-3">Department / Program</th>
                  <th className="pb-3 pr-3">Batch / Sem</th>
                  <th className="pb-3 pr-3">Completeness</th>
                  <th className="pb-3 pr-3">Placement</th>
                  <th className="pb-3 text-right">Dossier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((s) => (
                  <tr key={s.userId} className="hover:bg-muted/30">
                    <td className="py-3 pr-3">
                      <p className="font-semibold text-foreground">{s.name}</p>
                      <p className="text-muted-foreground">{s.email}</p>
                    </td>
                    <td className="py-3 pr-3 font-mono">{s.enrollmentNumber ?? '—'}</td>
                    <td className="py-3 pr-3">
                      <p>{s.departmentName ?? 'Unassigned'}</p>
                      <p className="text-muted-foreground">{s.courseName ?? ''}</p>
                    </td>
                    <td className="py-3 pr-3">
                      {s.admissionYear ?? '—'} {s.currentSemester ? `• Sem ${s.currentSemester}` : ''}
                    </td>
                    <td className="py-3 pr-3 font-semibold text-indigo-600">{s.completenessPercentage}%</td>
                    <td className="py-3 pr-3">
                      {s.graduateOutcomeType ? s.graduateOutcomeType.replace(/_/g, ' ') : `${s.placementOffersCount} offers`}
                    </td>
                    <td className="py-3 text-right">
                      <Link
                        href={`/admin/students/${s.userId}`}
                        prefetch={true}
                        className="rounded-lg bg-indigo-500/10 px-3 py-1.5 font-semibold text-indigo-700 hover:bg-indigo-500/20 dark:text-indigo-300"
                      >
                        View Dossier &rarr;
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
