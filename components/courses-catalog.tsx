'use client'

import { useState } from 'react'
import type { CourseWithDepartment, DepartmentWithCourseCount } from '@/lib/server/repositories/department-repository'
import { BookOpen, GraduationCap, Layers, Search } from 'lucide-react'

export function CoursesCatalog({
  courses,
  departments,
  userDepartmentName,
}: {
  courses: CourseWithDepartment[]
  departments: DepartmentWithCourseCount[]
  userDepartmentName?: string
}) {
  const [selectedDept, setSelectedDept] = useState<string>('ALL')
  const [search, setSearch] = useState('')

  const filtered = courses.filter((c) => {
    const matchesDept = selectedDept === 'ALL' || c.departmentId === selectedDept
    const matchesSearch =
      search === '' ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      (c.description && c.description.toLowerCase().includes(search.toLowerCase())) ||
      (c.department && c.department.name.toLowerCase().includes(search.toLowerCase()))
    return matchesDept && matchesSearch
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Academic Courses &amp; Curricula</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Explore approved undergraduate and postgraduate courses across academic departments.
            {userDepartmentName && (
              <span className="ml-1 text-primary font-medium">Your Department: {userDepartmentName}</span>
            )}
          </p>
        </div>
        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
          {courses.length} {courses.length === 1 ? 'course' : 'courses'} available
        </span>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-sm">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by course code, name, or keywords…"
            className="w-full rounded-xl border border-input bg-background pl-9 pr-3.5 py-2 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <select
          value={selectedDept}
          onChange={(e) => setSelectedDept(e.target.value)}
          className="rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="ALL">All Departments</option>
          {departments.map((dept) => (
            <option key={dept.id} value={dept.id}>
              {dept.name} ({dept.code})
            </option>
          ))}
        </select>
      </div>

      {/* Courses Grid */}
      {filtered.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <div
              key={c.id}
              className="flex flex-col justify-between rounded-2xl border border-border bg-card p-5 transition hover:border-primary/40 hover:shadow-sm"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-primary tracking-wider rounded-lg bg-primary/10 px-2.5 py-1">
                    {c.code}
                  </span>
                  <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-medium text-secondary-foreground">
                    {c.department?.code ?? 'General'}
                  </span>
                </div>

                <h3 className="mt-3.5 font-semibold text-foreground text-base line-clamp-2">{c.name}</h3>
                <p className="mt-1.5 text-xs leading-5 text-muted-foreground line-clamp-3">
                  {c.description || 'No detailed syllabus or course overview currently listed.'}
                </p>
              </div>

              <div className="mt-5 border-t border-border pt-3.5 text-xs text-muted-foreground flex items-center gap-1.5">
                <Layers size={13} className="text-muted-foreground shrink-0" />
                <span className="truncate">{c.department?.name ?? 'Institution-wide'}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border p-12 text-center">
          <BookOpen size={32} className="text-muted-foreground/60 mb-3" />
          <p className="text-sm font-medium text-foreground">No courses found matching your search</p>
          <p className="mt-1 text-xs text-muted-foreground">Try clearing filters or searching with different keywords.</p>
        </div>
      )}
    </div>
  )
}
