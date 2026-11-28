'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Loader2, Save } from 'lucide-react'

export interface ProfileCustomFieldItem {
  id: string
  fieldKey: string
  displayName: string
  description: string | null
  dataType: string
  isRequired: boolean
  allowedValues: string[]
  visibilityScope: string
  value: string
}

export function CustomProfileFieldsCard({
  profileType,
  profileId,
  fields,
}: {
  profileType: 'STUDENT' | 'FACULTY'
  profileId: string
  fields: ProfileCustomFieldItem[]
}) {
  const router = useRouter()
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((f) => [f.fieldKey, f.value ?? ''])),
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedMsg, setSavedMsg] = useState<string | null>(null)

  if (fields.length === 0) return null

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSavedMsg(null)
    try {
      const res = await fetch('/api/profile/custom-fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileType, profileId, values }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Could not save custom fields.')
      setSavedMsg('Institution custom fields saved.')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save custom fields.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)] sm:p-6">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-foreground">Institution Custom Fields</h2>
        <p className="text-xs text-muted-foreground">
          Additional profile attributes configured by your institution.
        </p>
      </div>

      <form onSubmit={handleSave} className="grid gap-4 sm:grid-cols-2">
        {fields.map((f) => (
          <div key={f.id}>
            <label htmlFor={`cf-${f.fieldKey}`} className="text-xs font-semibold text-foreground">
              {f.displayName}
              {f.isRequired && <span className="text-destructive"> *</span>}
            </label>
            {f.description && (
              <p className="text-[11px] text-muted-foreground">{f.description}</p>
            )}
            {f.dataType === 'SELECT' ? (
              <select
                id={`cf-${f.fieldKey}`}
                value={values[f.fieldKey] ?? ''}
                onChange={(e) => setValues((p) => ({ ...p, [f.fieldKey]: e.target.value }))}
                className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-xs"
              >
                <option value="">Select…</option>
                {f.allowedValues.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            ) : f.dataType === 'BOOLEAN' ? (
              <select
                id={`cf-${f.fieldKey}`}
                value={values[f.fieldKey] ?? ''}
                onChange={(e) => setValues((p) => ({ ...p, [f.fieldKey]: e.target.value }))}
                className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-xs"
              >
                <option value="">Select…</option>
                <option value="true">Yes (true)</option>
                <option value="false">No (false)</option>
              </select>
            ) : (
              <input
                id={`cf-${f.fieldKey}`}
                type={f.dataType === 'DATE' ? 'date' : f.dataType === 'NUMBER' ? 'number' : 'text'}
                step={f.dataType === 'NUMBER' ? 'any' : undefined}
                value={values[f.fieldKey] ?? ''}
                onChange={(e) => setValues((p) => ({ ...p, [f.fieldKey]: e.target.value }))}
                className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-xs"
              />
            )}
          </div>
        ))}

        <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-2 pt-1">
          <div>
            {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
            {savedMsg && (
              <p role="status" className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                <CheckCircle2 size={13} /> {savedMsg}
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            <span>{saving ? 'Saving…' : 'Save Custom Fields'}</span>
          </button>
        </div>
      </form>
    </section>
  )
}
