'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Archive, CheckCircle2, Loader2, Plus, RotateCcw, Save, Settings } from 'lucide-react'

interface InstitutionConfigProps {
  config: {
    academicYearStartMonth: number
    gradingScaleType: string
    gradingScaleMax: number
    studentIdLabel: string
    facultyIdLabel: string
    facultyDesignations: string[]
    employmentCategories: string[]
    allowedDocumentTypes: string[]
    requireEvidenceForClaims: boolean
    mandatoryStudentFields: string[]
    mandatoryFacultyFields: string[]
    reportHeaderTitle: string | null
    reportHeaderSubtitle: string | null
    brandPrimaryColor: string | null
  }
  customFields: Array<{
    id: string
    fieldKey: string
    displayName: string
    description: string | null
    dataType: string
    profileType: string
    isRequired: boolean
    allowedValues: string[]
    validationRegex: string | null
    visibilityScope: string
    reportEligible: boolean
    isActive: boolean
    version: number
  }>
  activityCategories: Array<{
    id: string
    code: string
    name: string
    subcategories: string[]
    isActive: boolean
  }>
}

export function InstitutionConfigPanel({
  config,
  customFields,
  activityCategories,
}: InstitutionConfigProps) {
  const router = useRouter()
  const [tab, setTab] = useState<'rules' | 'categories' | 'custom-fields'>('rules')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  // Config state
  const [ayMonth, setAyMonth] = useState(String(config.academicYearStartMonth))
  const [gradingType, setGradingType] = useState(config.gradingScaleType)
  const [gradingMax, setGradingMax] = useState(String(config.gradingScaleMax))
  const [stuIdLabel, setStuIdLabel] = useState(config.studentIdLabel)
  const [facIdLabel, setFacIdLabel] = useState(config.facultyIdLabel)
  const [designations, setDesignations] = useState(config.facultyDesignations.join(', '))
  const [empCats, setEmpCats] = useState(config.employmentCategories.join(', '))
  const [requireEvidence, setRequireEvidence] = useState(config.requireEvidenceForClaims)
  const [mandatoryStu, setMandatoryStu] = useState(config.mandatoryStudentFields.join(', '))
  const [mandatoryFac, setMandatoryFac] = useState(config.mandatoryFacultyFields.join(', '))
  const [reportHeaderTitle, setReportHeaderTitle] = useState(config.reportHeaderTitle ?? '')
  const [reportHeaderSubtitle, setReportHeaderSubtitle] = useState(config.reportHeaderSubtitle ?? '')
  const [brandColor, setBrandColor] = useState(config.brandPrimaryColor ?? '')

  // Activity category form
  const [catCode, setCatCode] = useState('')
  const [catName, setCatName] = useState('')
  const [catSubs, setCatSubs] = useState('')

  // Custom field form
  const [cfKey, setCfKey] = useState('')
  const [cfName, setCfName] = useState('')
  const [cfDesc, setCfDesc] = useState('')
  const [cfType, setCfType] = useState<'TEXT' | 'NUMBER' | 'DATE' | 'BOOLEAN' | 'SELECT'>('TEXT')
  const [cfProfile, setCfProfile] = useState<'STUDENT' | 'FACULTY'>('STUDENT')
  const [cfRequired, setCfRequired] = useState(false)
  const [cfAllowed, setCfAllowed] = useState('')
  const [cfRegex, setCfRegex] = useState('')
  const [cfVisibility, setCfVisibility] = useState<'SELF_AND_ADMIN' | 'ADMIN_ONLY'>('SELF_AND_ADMIN')
  const [cfReportable, setCfReportable] = useState(false)

  const postConfig = async (payload: Record<string, unknown>, successText: string) => {
    setBusy(true)
    setErr(null)
    setMsg(null)
    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Configuration update failed.')
      setMsg(successText)
      router.refresh()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Configuration update failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <Settings size={18} className="text-primary" />
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Institutional Policy &amp; Custom Profile Configuration
            </h2>
            <p className="text-xs text-muted-foreground">
              Configure grading scales, identifier labels, activity categories, report headers, and custom profile fields per institution.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {(
          [
            ['rules', 'Grading, IDs & Report Headers'],
            ['categories', `Activity Categories (${activityCategories.length})`],
            ['custom-fields', `Custom Profile Fields (${customFields.length})`],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => {
              setTab(k)
              setMsg(null)
              setErr(null)
            }}
            className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
              tab === k
                ? 'bg-primary text-primary-foreground'
                : 'border border-border bg-background text-foreground hover:bg-muted'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {err && <p role="alert" className="mt-3 text-xs text-destructive">{err}</p>}
      {msg && (
        <p role="status" className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600">
          <CheckCircle2 size={14} /> {msg}
        </p>
      )}

      {/* TAB 1: RULES & HEADERS */}
      {tab === 'rules' && (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label htmlFor="cfgAyMonth" className="text-xs font-semibold">AY Start Month (1–12)</label>
            <input id="cfgAyMonth" type="number" min={1} max={12} value={ayMonth} onChange={(e) => setAyMonth(e.target.value)} className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs" />
          </div>
          <div>
            <label htmlFor="cfgScaleType" className="text-xs font-semibold">Grading Scale</label>
            <select id="cfgScaleType" value={gradingType} onChange={(e) => setGradingType(e.target.value)} className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs">
              <option value="CGPA_10">10-Point CGPA</option>
              <option value="CGPA_4">4-Point GPA</option>
              <option value="PERCENTAGE_100">Percentage (0–100)</option>
            </select>
          </div>
          <div>
            <label htmlFor="cfgScaleMax" className="text-xs font-semibold">Max Grade Value</label>
            <input id="cfgScaleMax" type="number" step="0.1" value={gradingMax} onChange={(e) => setGradingMax(e.target.value)} className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs" />
          </div>
          <div>
            <label htmlFor="cfgStuLabel" className="text-xs font-semibold">Student Identifier Label</label>
            <input id="cfgStuLabel" value={stuIdLabel} onChange={(e) => setStuIdLabel(e.target.value)} placeholder="USN / PRN / Enrollment Number" className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs" />
          </div>
          <div>
            <label htmlFor="cfgFacLabel" className="text-xs font-semibold">Faculty Identifier Label</label>
            <input id="cfgFacLabel" value={facIdLabel} onChange={(e) => setFacIdLabel(e.target.value)} placeholder="Employee ID" className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs" />
          </div>
          <div>
            <label htmlFor="cfgColor" className="text-xs font-semibold">Brand Primary Hex Color</label>
            <input id="cfgColor" value={brandColor} onChange={(e) => setBrandColor(e.target.value)} placeholder="#1D4ED8" className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs" />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="cfgDesig" className="text-xs font-semibold">Faculty Designations (comma-separated)</label>
            <input id="cfgDesig" value={designations} onChange={(e) => setDesignations(e.target.value)} className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs" />
          </div>
          <div>
            <label htmlFor="cfgEmpCats" className="text-xs font-semibold">Employment Categories</label>
            <input id="cfgEmpCats" value={empCats} onChange={(e) => setEmpCats(e.target.value)} className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs" />
          </div>
          <div>
            <label htmlFor="cfgMandStu" className="text-xs font-semibold">Mandatory Student Fields</label>
            <input id="cfgMandStu" value={mandatoryStu} onChange={(e) => setMandatoryStu(e.target.value)} className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs" />
          </div>
          <div>
            <label htmlFor="cfgMandFac" className="text-xs font-semibold">Mandatory Faculty Fields</label>
            <input id="cfgMandFac" value={mandatoryFac} onChange={(e) => setMandatoryFac(e.target.value)} className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs" />
          </div>
          <div>
            <label htmlFor="cfgRepTitle" className="text-xs font-semibold">Official Report Header Title</label>
            <input id="cfgRepTitle" value={reportHeaderTitle} onChange={(e) => setReportHeaderTitle(e.target.value)} placeholder="IQAC / NAAC Institutional Report" className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs" />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="cfgRepSub" className="text-xs font-semibold">Report Header Subtitle</label>
            <input id="cfgRepSub" value={reportHeaderSubtitle} onChange={(e) => setReportHeaderSubtitle(e.target.value)} placeholder="Autonomous Engineering Institute · Affiliated to..." className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs" />
          </div>
          <div className="flex items-center">
            <label className="flex items-center gap-2 text-xs font-medium">
              <input type="checkbox" checked={requireEvidence} onChange={(e) => setRequireEvidence(e.target.checked)} />
              Require evidence attachment for verifiable claims
            </label>
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                postConfig(
                  {
                    action: 'update_config',
                    data: {
                      academicYearStartMonth: Number(ayMonth),
                      gradingScaleType: gradingType,
                      gradingScaleMax: Number(gradingMax),
                      studentIdLabel: stuIdLabel,
                      facultyIdLabel: facIdLabel,
                      facultyDesignations: designations.split(',').map((s) => s.trim()).filter(Boolean),
                      employmentCategories: empCats.split(',').map((s) => s.trim()).filter(Boolean),
                      allowedDocumentTypes: config.allowedDocumentTypes,
                      requireEvidenceForClaims: requireEvidence,
                      mandatoryStudentFields: mandatoryStu.split(',').map((s) => s.trim()).filter(Boolean),
                      mandatoryFacultyFields: mandatoryFac.split(',').map((s) => s.trim()).filter(Boolean),
                      reportHeaderTitle: reportHeaderTitle || null,
                      reportHeaderSubtitle: reportHeaderSubtitle || null,
                      brandPrimaryColor: brandColor || null,
                    },
                  },
                  'Institution configuration saved.',
                )
              }
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              <span>Save Configuration</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: ACTIVITY CATEGORIES */}
      {tab === 'categories' && (
        <div className="mt-5 grid gap-6 lg:grid-cols-12">
          <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4 lg:col-span-5">
            <h3 className="text-sm font-semibold">Add / Update Activity Category</h3>
            <input value={catCode} onChange={(e) => setCatCode(e.target.value)} placeholder="Code (e.g. INNOVATION)" className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs" />
            <input value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="Display Name" className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs" />
            <input value={catSubs} onChange={(e) => setCatSubs(e.target.value)} placeholder="Subcategories (comma-separated)" className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs" />
            <button
              type="button"
              disabled={busy || !catCode || !catName}
              onClick={() =>
                postConfig(
                  {
                    action: 'upsert_activity_category',
                    code: catCode,
                    name: catName,
                    subcategories: catSubs.split(',').map((s) => s.trim()).filter(Boolean),
                  },
                  'Activity category saved.',
                )
              }
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
            >
              <Plus size={14} /> Save Category
            </button>
          </div>
          <div className="lg:col-span-7">
            <ul className="divide-y divide-border rounded-xl border border-border text-xs">
              {activityCategories.map((c) => (
                <li key={c.id} className="flex items-center justify-between p-3">
                  <div>
                    <p className="font-semibold">{c.name} <span className="font-mono text-[11px] text-muted-foreground">({c.code})</span></p>
                    <p className="text-[11px] text-muted-foreground">{c.subcategories.join(', ') || 'No subcategories'}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* TAB 3: CUSTOM PROFILE FIELDS */}
      {tab === 'custom-fields' && (
        <div className="mt-5 grid gap-6 lg:grid-cols-12">
          <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4 lg:col-span-5">
            <h3 className="text-sm font-semibold">Define Controlled Custom Field</h3>
            <input value={cfKey} onChange={(e) => setCfKey(e.target.value)} placeholder="Stable key (e.g. apaar_abc_id)" className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-mono" />
            <input value={cfName} onChange={(e) => setCfName(e.target.value)} placeholder="Display Name (e.g. APAAR / ABC ID)" className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs" />
            <input value={cfDesc} onChange={(e) => setCfDesc(e.target.value)} placeholder="Description (optional)" className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs" />
            <div className="grid grid-cols-2 gap-2">
              <select value={cfProfile} onChange={(e) => setCfProfile(e.target.value as 'STUDENT' | 'FACULTY')} className="rounded-xl border border-input bg-background px-3 py-2 text-xs">
                <option value="STUDENT">Student Profile</option>
                <option value="FACULTY">Faculty Profile</option>
              </select>
              <select value={cfType} onChange={(e) => setCfType(e.target.value as typeof cfType)} className="rounded-xl border border-input bg-background px-3 py-2 text-xs">
                <option value="TEXT">Text</option>
                <option value="NUMBER">Number</option>
                <option value="DATE">Date</option>
                <option value="BOOLEAN">Boolean</option>
                <option value="SELECT">Select (Enum)</option>
              </select>
            </div>
            {cfType === 'SELECT' && (
              <input value={cfAllowed} onChange={(e) => setCfAllowed(e.target.value)} placeholder="Allowed values (comma-separated)" className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs" />
            )}
            <input value={cfRegex} onChange={(e) => setCfRegex(e.target.value)} placeholder="Validation regex (optional, e.g. ^[0-9]{12}$)" className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-mono" />
            <select value={cfVisibility} onChange={(e) => setCfVisibility(e.target.value as typeof cfVisibility)} className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs">
              <option value="SELF_AND_ADMIN">Visible to Owner &amp; Admin</option>
              <option value="ADMIN_ONLY">Admin Only (Hidden from Self)</option>
            </select>
            <div className="flex flex-wrap gap-4 text-xs">
              <label className="flex items-center gap-1.5">
                <input type="checkbox" checked={cfRequired} onChange={(e) => setCfRequired(e.target.checked)} />
                Required
              </label>
              <label className="flex items-center gap-1.5">
                <input type="checkbox" checked={cfReportable} onChange={(e) => setCfReportable(e.target.checked)} />
                Include in Reports
              </label>
            </div>
            <button
              type="button"
              disabled={busy || !cfKey || !cfName}
              onClick={() =>
                postConfig(
                  {
                    action: 'create_custom_field',
                    data: {
                      fieldKey: cfKey,
                      displayName: cfName,
                      description: cfDesc || null,
                      dataType: cfType,
                      profileType: cfProfile,
                      isRequired: cfRequired,
                      allowedValues: cfAllowed.split(',').map((s) => s.trim()).filter(Boolean),
                      validationRegex: cfRegex || null,
                      visibilityScope: cfVisibility,
                      reportEligible: cfReportable,
                    },
                  },
                  'Custom field definition created.',
                )
              }
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
            >
              <Plus size={14} /> Create Custom Field
            </button>
          </div>

          <div className="lg:col-span-7">
            {customFields.length === 0 ? (
              <p className="text-xs text-muted-foreground">No custom fields defined yet.</p>
            ) : (
              <ul className="divide-y divide-border rounded-xl border border-border text-xs">
                {customFields.map((f) => (
                  <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
                    <div>
                      <p className="font-semibold">
                        {f.displayName}{' '}
                        <span className="font-mono text-[11px] text-muted-foreground">({f.fieldKey})</span>
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {f.profileType} · {f.dataType} · {f.visibilityScope}
                        {f.isRequired ? ' · Required' : ''}
                        {f.reportEligible ? ' · Reportable' : ''}
                        {!f.isActive ? ' · ARCHIVED' : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        postConfig(
                          { action: 'toggle_custom_field', fieldId: f.id, isActive: !f.isActive },
                          f.isActive ? 'Field archived (historical values preserved).' : 'Field reactivated.',
                        )
                      }
                      className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-[11px] font-medium hover:bg-muted"
                    >
                      {f.isActive ? <Archive size={12} /> : <RotateCcw size={12} />}
                      <span>{f.isActive ? 'Archive' : 'Activate'}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
