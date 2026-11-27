'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Download, ExternalLink, Eye, FileText, FolderOpen, LayoutGrid, LayoutList, Loader2, Search } from 'lucide-react'
import { DocumentPreviewDrawer } from '@/components/shared/attainly-ui'
import { escapeCsvCell } from '@/lib/csv'

interface VaultItem {
  id: string
  originalFilename: string
  pathname: string
  mimeType: string
  sizeBytes: number
  sha256: string | null
  entityType: string
  entityId: string | null
  version: number
  createdAt: Date | string
  ownerName: string
  ownerEmail: string
  ownerRole: string
  departmentCode: string
  departmentName: string
}

export function DocumentVaultClient({
  vault,
  departments,
  initialFilters,
}: {
  vault: { items: VaultItem[]; total: number; page: number; pageSize: number }
  departments: Array<{ id: string; code: string; name: string }>
  initialFilters: { search: string; departmentId: string; ownerRole: string; entityType: string }
}) {
  const router = useRouter()
  const [search, setSearch] = useState(initialFilters.search)
  const [departmentId, setDepartmentId] = useState(initialFilters.departmentId)
  const [ownerRole, setOwnerRole] = useState(initialFilters.ownerRole)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [previewDoc, setPreviewDoc] = useState<VaultItem | null>(null)
  const [isPending, startTransition] = useTransition()

  const applyFilters = (page = 1, nextSearch = search) => {
    const p = new URLSearchParams()
    if (nextSearch.trim()) p.set('search', nextSearch.trim())
    if (departmentId) p.set('departmentId', departmentId)
    if (ownerRole) p.set('ownerRole', ownerRole)
    if (page > 1) p.set('page', String(page))
    startTransition(() => {
      router.push(`/admin/documents?${p.toString()}`)
    })
  }

  useEffect(() => {
    if (search === initialFilters.search) return
    const timer = setTimeout(() => applyFilters(1, search), 320)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const exportMetadataCsv = () => {
    const targetItems = selectedIds.length
      ? vault.items.filter((i) => selectedIds.includes(i.id))
      : vault.items
    const header = ['ID', 'Filename', 'Owner', 'Role', 'Department', 'EntityType', 'Version', 'SizeBytes', 'SHA256', 'UploadedAt']
    const rows = targetItems.map((i) => [
      i.id,
      i.originalFilename,
      i.ownerName,
      i.ownerRole,
      i.departmentCode,
      i.entityType,
      `v${i.version}`,
      String(i.sizeBytes),
      i.sha256 ?? '',
      new Date(i.createdAt).toISOString(),
    ])
    const csv = [header, ...rows].map((r) => r.map(escapeCsvCell).join(',')).join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'attainly-document-vault.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const totalPages = Math.max(1, Math.ceil(vault.total / vault.pageSize))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Institutional Document Vault</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Searchable, role-scoped repository of supporting evidence across Student, Faculty, and Event records.
          </p>
        </div>
        <button
          type="button"
          onClick={exportMetadataCsv}
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
        >
          <Download size={13} />
          Export {selectedIds.length ? `Selected (${selectedIds.length})` : 'Index'} CSV
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applyFilters(1)}
            placeholder="Search filename or record type…"
            className="w-full rounded-xl border border-input bg-background py-2 pl-9 pr-3 text-sm"
          />
        </div>
        <select
          value={departmentId}
          onChange={(e) => setDepartmentId(e.target.value)}
          className="rounded-xl border border-input bg-background px-3 py-2 text-xs font-medium"
        >
          <option value="">All Departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
          ))}
        </select>
        <select
          value={ownerRole}
          onChange={(e) => setOwnerRole(e.target.value)}
          className="rounded-xl border border-input bg-background px-3 py-2 text-xs font-medium"
        >
          <option value="">All Roles</option>
          <option value="STUDENT">Students</option>
          <option value="FACULTY">Faculty</option>
        </select>
        <button
          type="button"
          disabled={isPending}
          onClick={() => applyFilters(1)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-secondary px-4 py-2 text-xs font-semibold text-secondary-foreground disabled:opacity-60"
        >
          {isPending && <Loader2 size={13} className="animate-spin" />}
          Apply Filters
        </button>
      </div>

      <section className="rounded-2xl border border-border bg-card p-5">
        {vault.items.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <FolderOpen size={36} className="mb-3 text-muted-foreground/40" />
            <p className="text-sm font-medium text-foreground">No documents match your filters</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="pb-3 pr-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.length === vault.items.length && vault.items.length > 0}
                        onChange={(e) =>
                          setSelectedIds(e.target.checked ? vault.items.map((i) => i.id) : [])
                        }
                      />
                    </th>
                    <th className="pb-3 pr-4">Document</th>
                    <th className="pb-3 pr-4">Owner</th>
                    <th className="pb-3 pr-4">Department</th>
                    <th className="pb-3 pr-4">Record Link</th>
                    <th className="pb-3 pr-4">Version</th>
                    <th className="pb-3 pr-4">Size</th>
                    <th className="pb-3 text-right">Preview</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {vault.items.map((doc) => (
                    <tr key={doc.id} className="hover:bg-muted/40">
                      <td className="py-3 pr-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(doc.id)}
                          onChange={(e) =>
                            setSelectedIds((prev) =>
                              e.target.checked ? [...prev, doc.id] : prev.filter((id) => id !== doc.id),
                            )
                          }
                        />
                      </td>
                      <td className="py-3 pr-4 font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          <FileText size={14} className="text-primary shrink-0" />
                          <span>{doc.originalFilename}</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground">{doc.mimeType}</div>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="font-medium text-foreground">{doc.ownerName}</div>
                        <div className="text-[11px] text-muted-foreground">{doc.ownerRole}</div>
                      </td>
                      <td className="py-3 pr-4">{doc.departmentCode}</td>
                      <td className="py-3 pr-4">
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold">
                          {doc.entityType}
                        </span>
                      </td>
                      <td className="py-3 pr-4 font-mono">v{doc.version}</td>
                      <td className="py-3 pr-4">{Math.max(1, Math.round(doc.sizeBytes / 1024))} KB</td>
                      <td className="py-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setPreviewDoc(doc)}
                            className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary/20"
                          >
                            <Eye size={12} /> Preview
                          </button>
                          <a
                            href={`/api/documents?id=${doc.id}`}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={`Open ${doc.originalFilename} in new tab`}
                            className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] font-medium hover:bg-muted"
                          >
                            <ExternalLink size={12} />
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <span>
                  Page {vault.page} of {totalPages} ({vault.total} documents)
                </span>
                <div className="inline-flex rounded-lg border border-border p-0.5">
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    aria-label="List view"
                    className={`rounded-md p-1 ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
                  >
                    <LayoutList size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    aria-label="Grid view"
                    className={`rounded-md p-1 ${viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
                  >
                    <LayoutGrid size={12} />
                  </button>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={vault.page <= 1}
                  onClick={() => applyFilters(vault.page - 1)}
                  className="rounded-lg border border-border px-2.5 py-1 disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={vault.page >= totalPages}
                  onClick={() => applyFilters(vault.page + 1)}
                  className="rounded-lg border border-border px-2.5 py-1 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>

            {viewMode === 'grid' && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {vault.items.map((doc) => (
                  <div key={`grid-${doc.id}`} className="rounded-xl border border-border bg-background p-3.5 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="truncate text-xs font-semibold text-foreground">{doc.originalFilename}</span>
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold">v{doc.version}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {doc.ownerName} &bull; {doc.departmentCode} &bull; {Math.max(1, Math.round(doc.sizeBytes / 1024))} KB
                    </p>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setPreviewDoc(doc)}
                        className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary"
                      >
                        <Eye size={12} /> Preview
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      <DocumentPreviewDrawer
        open={Boolean(previewDoc)}
        title={previewDoc?.originalFilename ?? 'Document Preview'}
        documentUrl={previewDoc ? `/api/documents?id=${previewDoc.id}&disposition=inline` : null}
        mimeType={previewDoc?.mimeType}
        onClose={() => setPreviewDoc(null)}
      />
    </div>
  )
}
