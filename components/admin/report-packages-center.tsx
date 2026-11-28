'use client'

import { useMemo, useState } from 'react'
import {
  REPORT_PACKAGES,
  REPORT_PACKAGE_KEYS,
  type ReportPackageKey,
} from '@/lib/report-packages'
import type { GeneratedReportPackage } from '@/lib/server/services/report-packages'

interface DepartmentOption {
  id: string
  name: string
  code: string
}

interface AcademicYearOption {
  id: string
  label: string
  isCurrent: boolean
}

interface PersonOption {
  id: string
  name: string
  subtitle: string
  departmentId: string | null
}

interface ReportPackagesCenterProps {
  departments: DepartmentOption[]
  academicYears: AcademicYearOption[]
  students: PersonOption[]
  faculty: PersonOption[]
}

const CATEGORIES = [
  'Student Packages',
  'Faculty Packages',
  'Department & Institution',
  'Thematic Summaries',
] as const

export function ReportPackagesCenter({
  departments,
  academicYears,
  students,
  faculty,
}: ReportPackagesCenterProps) {
  const defaultYear = academicYears.find((y) => y.isCurrent)?.id ?? academicYears[0]?.id ?? ''
  const [selectedKey, setSelectedKey] = useState<ReportPackageKey>('DEPARTMENT_ANNUAL_REPORT')
  const [academicYearId, setAcademicYearId] = useState<string>(defaultYear)
  const [departmentId, setDepartmentId] = useState<string>('')
  const [targetUserId, setTargetUserId] = useState<string>('')
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  const [includeUnverified, setIncludeUnverified] = useState<boolean>(false)
  const [selectedSectionIds, setSelectedSectionIds] = useState<string[]>(
    REPORT_PACKAGES.DEPARTMENT_ANNUAL_REPORT.sections
      .filter((s) => s.defaultIncluded)
      .map((s) => s.id),
  )

  const [previewPkg, setPreviewPkg] = useState<GeneratedReportPackage | null>(null)
  const [loadingAction, setLoadingAction] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const activeDef = REPORT_PACKAGES[selectedKey]

  const personOptions = useMemo(() => {
    const base = activeDef.scopeType === 'STUDENT' ? students : activeDef.scopeType === 'FACULTY' ? faculty : []
    if (!departmentId) return base
    return base.filter((p) => p.departmentId === departmentId)
  }, [activeDef.scopeType, students, faculty, departmentId])

  function handleSelectPackage(key: ReportPackageKey) {
    setSelectedKey(key)
    const def = REPORT_PACKAGES[key]
    setSelectedSectionIds(def.sections.filter((s) => s.defaultIncluded).map((s) => s.id))
    setTargetUserId('')
    setPreviewPkg(null)
    setErrorMsg(null)
  }

  function toggleSection(sectionId: string) {
    setSelectedSectionIds((prev) =>
      prev.includes(sectionId) ? prev.filter((id) => id !== sectionId) : [...prev, sectionId],
    )
  }

  async function runPackageAction(action: 'preview' | 'export_pdf' | 'export_xlsx' | 'export_zip') {
    setErrorMsg(null)
    if (selectedSectionIds.length === 0) {
      setErrorMsg('Select at least one report section before generating.')
      return
    }
    if ((activeDef.scopeType === 'STUDENT' || activeDef.scopeType === 'FACULTY') && !targetUserId) {
      setErrorMsg(
        `Select a ${activeDef.scopeType === 'STUDENT' ? 'student' : 'faculty member'} for this package.`,
      )
      return
    }

    setLoadingAction(action)
    try {
      const response = await fetch('/api/reports/packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          packageKey: selectedKey,
          sectionIds: selectedSectionIds,
          academicYearId: academicYearId || null,
          departmentId: departmentId || null,
          targetUserId: targetUserId || null,
          dateFrom: dateFrom || null,
          dateTo: dateTo || null,
          includeUnverified,
        }),
      })

      if (!response.ok) {
        const errData = (await response.json().catch(() => ({}))) as { error?: string }
        throw new Error(errData.error ?? `Request failed (${response.status})`)
      }

      if (action === 'preview') {
        const data = (await response.json()) as { package: GeneratedReportPackage }
        setPreviewPkg(data.package)
        return
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const ext = action === 'export_pdf' ? 'pdf' : action === 'export_xlsx' ? 'xlsx' : 'zip'
      a.href = url
      a.download = `attainly-${selectedKey.toLowerCase()}.${ext}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to generate report package.')
    } finally {
      setLoadingAction(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Institutional Report Packages &amp; Portfolios
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Generate audit-ready PDF dossiers, multi-sheet XLSX workbooks, and evidence ZIP archives
            from verified institutional records.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left: Package Catalog */}
        <div className="space-y-4 lg:col-span-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
              Available Packages ({REPORT_PACKAGE_KEYS.length})
            </h2>
            <div className="mt-3 space-y-4">
              {CATEGORIES.map((category) => {
                const items = REPORT_PACKAGE_KEYS.map((k) => REPORT_PACKAGES[k]).filter(
                  (p) => p.category === category,
                )
                return (
                  <div key={category} className="space-y-1.5">
                    <p className="text-xs font-semibold text-slate-500">{category}</p>
                    <div className="space-y-1">
                      {items.map((item) => {
                        const isSelected = item.key === selectedKey
                        return (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() => handleSelectPackage(item.key)}
                            className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                              isSelected
                                ? 'border-blue-600 bg-blue-50/70 font-medium text-blue-950'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span>{item.label}</span>
                              {item.supportsEvidenceZip && (
                                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                                  ZIP
                                </span>
                              )}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right: Configuration & Preview */}
        <div className="space-y-6 lg:col-span-8">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                  {activeDef.category}
                </span>
                <h2 className="mt-2 text-lg font-semibold text-slate-900">{activeDef.label}</h2>
                <p className="mt-1 text-sm text-slate-600">{activeDef.description}</p>
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="pkg-academic-year"
                  className="block text-xs font-medium text-slate-700"
                >
                  Academic Year
                </label>
                <select
                  id="pkg-academic-year"
                  value={academicYearId}
                  onChange={(e) => setAcademicYearId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                >
                  <option value="">All Academic Years</option>
                  {academicYears.map((ay) => (
                    <option key={ay.id} value={ay.id}>
                      {ay.label} {ay.isCurrent ? '(Current)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="pkg-department"
                  className="block text-xs font-medium text-slate-700"
                >
                  Department Scope
                </label>
                <select
                  id="pkg-department"
                  value={departmentId}
                  onChange={(e) => {
                    setDepartmentId(e.target.value)
                    setTargetUserId('')
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                >
                  <option value="">All Authorized Departments</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.code} — {d.name}
                    </option>
                  ))}
                </select>
              </div>

              {(activeDef.scopeType === 'STUDENT' || activeDef.scopeType === 'FACULTY') && (
                <div className="sm:col-span-2">
                  <label
                    htmlFor="pkg-target-person"
                    className="block text-xs font-medium text-slate-700"
                  >
                    {activeDef.scopeType === 'STUDENT' ? 'Target Student' : 'Target Faculty Member'}
                  </label>
                  <select
                    id="pkg-target-person"
                    value={targetUserId}
                    onChange={(e) => setTargetUserId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                  >
                    <option value="">
                      Select {activeDef.scopeType === 'STUDENT' ? 'a student' : 'a faculty member'}...
                    </option>
                    {personOptions.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.subtitle})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label htmlFor="pkg-date-from" className="block text-xs font-medium text-slate-700">
                  Date From (Optional)
                </label>
                <input
                  id="pkg-date-from"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                />
              </div>

              <div>
                <label htmlFor="pkg-date-to" className="block text-xs font-medium text-slate-700">
                  Date To (Optional)
                </label>
                <input
                  id="pkg-date-to"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                />
              </div>
            </div>

            {/* Sections */}
            <div className="mt-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Included Sections
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {activeDef.sections.map((section) => {
                  const checked = selectedSectionIds.includes(section.id)
                  return (
                    <label
                      key={section.id}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSection(section.id)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600"
                      />
                      <span>{section.label}</span>
                    </label>
                  )
                })}
              </div>
            </div>

            {selectedKey !== 'VERIFIED_STUDENT_ACHIEVEMENT_TRANSCRIPT' && (
              <div className="mt-4">
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={includeUnverified}
                    onChange={(e) => setIncludeUnverified(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600"
                  />
                  <span>Include pending / unverified submissions alongside verified records</span>
                </label>
              </div>
            )}

            {errorMsg && (
              <div
                role="alert"
                className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
              >
                {errorMsg}
              </div>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-2.5 border-t border-slate-100 pt-4">
              <button
                type="button"
                disabled={loadingAction !== null}
                onClick={() => runPackageAction('preview')}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {loadingAction === 'preview' ? 'Generating Preview...' : 'Preview Package'}
              </button>
              <button
                type="button"
                disabled={loadingAction !== null}
                onClick={() => runPackageAction('export_pdf')}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
              >
                {loadingAction === 'export_pdf' ? 'Rendering PDF...' : 'Export PDF'}
              </button>
              <button
                type="button"
                disabled={loadingAction !== null}
                onClick={() => runPackageAction('export_xlsx')}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
              >
                {loadingAction === 'export_xlsx' ? 'Rendering XLSX...' : 'Export XLSX'}
              </button>
              {activeDef.supportsEvidenceZip && (
                <button
                  type="button"
                  disabled={loadingAction !== null}
                  onClick={() => runPackageAction('export_zip')}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
                >
                  {loadingAction === 'export_zip' ? 'Packaging ZIP...' : 'Export Evidence ZIP'}
                </button>
              )}
            </div>
          </div>

          {/* Preview Output */}
          {previewPkg && (
            <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="border-b border-slate-200 pb-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      {previewPkg.institutionName}
                    </p>
                    <h3 className="text-lg font-semibold text-slate-900">{previewPkg.title}</h3>
                    <p className="text-sm text-slate-600">Target: {previewPkg.targetLabel}</p>
                  </div>
                  <span className="rounded-md bg-slate-100 px-2.5 py-1 font-mono text-xs text-slate-700">
                    Snapshot: {previewPkg.snapshotId}
                  </span>
                </div>

                <dl className="mt-4 grid gap-2 rounded-lg bg-slate-50 p-3 text-xs sm:grid-cols-2">
                  <div>
                    <dt className="font-semibold text-slate-600">Reporting Period</dt>
                    <dd className="text-slate-900">{previewPkg.metadata.reportingPeriod}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-600">Verification Scope</dt>
                    <dd className="text-slate-900">{previewPkg.metadata.verificationScope}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-600">Counting Units</dt>
                    <dd className="text-slate-900">{previewPkg.metadata.countingUnits.join('; ')}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-600">Excluded (Missing Date)</dt>
                    <dd className="text-slate-900">{previewPkg.metadata.excludedMissingDateCount}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="font-semibold text-slate-600">Exactness Note</dt>
                    <dd className="text-slate-900">{previewPkg.metadata.exactnessNote}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="font-semibold text-slate-600">Linked Evidence Files</dt>
                    <dd className="text-slate-900">{previewPkg.evidencePaths.length} authorized document(s)</dd>
                  </div>
                </dl>
              </div>

              <div className="space-y-5">
                {previewPkg.sections.map((section) => (
                  <div key={section.id} className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="text-sm font-semibold text-slate-900">{section.title}</h4>
                      <span className="text-xs text-slate-500">
                        {section.totalRows} row(s) • {section.countingUnit}
                      </span>
                    </div>

                    {section.summaryMetrics.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {section.summaryMetrics.map((m, idx) => (
                          <div
                            key={`${m.label}-${idx}`}
                            className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5"
                          >
                            <div className="text-[11px] text-slate-500">{m.label}</div>
                            <div className="text-sm font-semibold text-slate-900">
                              {String(m.value)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {section.rows.length === 0 ? (
                      <p className="text-xs italic text-slate-500">
                        No records matched this section for the selected filters.
                      </p>
                    ) : (
                      <div className="overflow-x-auto rounded-lg border border-slate-200">
                        <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                          <thead className="bg-slate-50">
                            <tr>
                              {section.columns.map((col) => (
                                <th key={col.key} className="px-3 py-2 font-semibold text-slate-700">
                                  {col.label}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {section.rows.slice(0, 25).map((row, idx) => (
                              <tr key={idx}>
                                {section.columns.map((col) => (
                                  <td key={col.key} className="px-3 py-2 text-slate-800">
                                    {row[col.key] === null || row[col.key] === undefined
                                      ? '—'
                                      : typeof row[col.key] === 'boolean'
                                        ? row[col.key]
                                          ? 'Yes'
                                          : 'No'
                                        : String(row[col.key])}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <p className="border-t border-slate-100 pt-3 text-xs text-slate-500">
                {previewPkg.metadata.disclaimer}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
