'use client'

import { useActionState, useState } from 'react'
import { Edit3, ExternalLink, Plus } from 'lucide-react'
import {
  addStudentCertification,
  addStudentSkill,
  deleteStudentCertification,
  deleteStudentSkill,
  updateStudentCertification,
  updateStudentSkill,
  type StudentActionState,
} from '@/app/actions/student'
import type { StudentCertification, StudentSkill } from '@/generated/prisma/client'
import {
  ACCREDITATION_CRITERIA,
  ActionMessage,
  ConfirmDeleteForm,
  DocumentPreviewLink,
  ReviewerFeedbackBanner,
  SingleDocumentUploadField,
  StudentSectionHeader,
  VerificationBadge,
  studentFieldClass,
  studentLabelClass,
} from './shared-ui'

const initialState: StudentActionState = { status: 'idle', message: '' }

export function StudentCertificationsSkillsSection({
  certifications,
  skills,
}: {
  certifications: StudentCertification[]
  skills: StudentSkill[]
}) {
  const [certAddState, certAddAction, certAddPending] = useActionState(addStudentCertification, initialState)
  const [certEditState, certEditAction, certEditPending] = useActionState(updateStudentCertification, initialState)
  const [certDelState, certDelAction] = useActionState(deleteStudentCertification, initialState)
  const [editingCertId, setEditingCertId] = useState<string | null>(null)

  const [skillAddState, skillAddAction, skillAddPending] = useActionState(addStudentSkill, initialState)
  const [skillEditState, skillEditAction, skillEditPending] = useActionState(updateStudentSkill, initialState)
  const [skillDelState, skillDelAction] = useActionState(deleteStudentSkill, initialState)
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null)

  return (
    <div className="mt-6 flex flex-col gap-6">
      {/* Certifications */}
      <section className="rounded-2xl border border-border bg-card p-6">
        <StudentSectionHeader
          title="Certifications"
          description="Track professional certificates with credential IDs, verification URLs, durations, expiry dates, and skills earned."
          badge={`${certifications.length} Certifications`}
        />

        <form action={certAddAction} className="mb-6 grid gap-4 rounded-xl border border-border bg-muted/20 p-4 sm:grid-cols-3">
          <div>
            <label htmlFor="cert-name" className={studentLabelClass}>Certificate Name</label>
            <input id="cert-name" name="name" required className={studentFieldClass} placeholder="AWS Certified Cloud Practitioner" />
          </div>
          <div>
            <label htmlFor="cert-issuer" className={studentLabelClass}>Issuing Organization</label>
            <input id="cert-issuer" name="issuer" className={studentFieldClass} placeholder="Amazon Web Services" />
          </div>
          <div>
            <label htmlFor="cert-cred-id" className={studentLabelClass}>Credential ID</label>
            <input id="cert-cred-id" name="credentialId" className={studentFieldClass} placeholder="AWS-CP-12345" />
          </div>
          <div>
            <label htmlFor="cert-cred-url" className={studentLabelClass}>Verification URL</label>
            <input id="cert-cred-url" name="credentialUrl" type="url" className={studentFieldClass} placeholder="https://..." />
          </div>
          <div>
            <label htmlFor="cert-duration" className={studentLabelClass}>Duration</label>
            <input id="cert-duration" name="duration" className={studentFieldClass} placeholder="e.g. 6 weeks / 40 hours" />
          </div>
          <div>
            <label htmlFor="cert-skills" className={studentLabelClass}>Skills Earned (comma-separated)</label>
            <input id="cert-skills" name="skillsEarned" className={studentFieldClass} placeholder="Cloud, IAM, S3" />
          </div>
          <div>
            <label htmlFor="cert-issued" className={studentLabelClass}>Issue Date</label>
            <input id="cert-issued" name="issuedAt" type="date" className={studentFieldClass} />
          </div>
          <div>
            <label htmlFor="cert-expires" className={studentLabelClass}>Expiry Date (Optional)</label>
            <input id="cert-expires" name="expiresAt" type="date" className={studentFieldClass} />
          </div>
          <div>
            <label htmlFor="cert-criterion" className={studentLabelClass}>Accreditation Criterion</label>
            <select id="cert-criterion" name="criterionCode" className={studentFieldClass}>
              <option value="">None</option>
              {ACCREDITATION_CRITERIA.map((c) => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-3">
            <SingleDocumentUploadField id="cert-file" name="fileUrl" label="Certificate Proof (PDF / Image)" />
          </div>
          <div className="sm:col-span-3 flex items-center gap-3">
            <button
              type="submit"
              disabled={certAddPending}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              <Plus size={14} /> {certAddPending ? 'Saving…' : 'Add Certification'}
            </button>
            <ActionMessage state={certAddState} />
            <ActionMessage state={certDelState} />
          </div>
        </form>

        <div className="divide-y divide-border">
          {certifications.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No certifications added yet.</p>
          ) : (
            certifications.map((cert) =>
              editingCertId === cert.id ? (
                <form key={cert.id} action={certEditAction} className="grid gap-3 py-4 sm:grid-cols-3">
                  <input type="hidden" name="id" value={cert.id} />
                  <input name="name" defaultValue={cert.name} required className={studentFieldClass} />
                  <input name="issuer" defaultValue={cert.issuer ?? ''} placeholder="Issuer" className={studentFieldClass} />
                  <input name="credentialId" defaultValue={cert.credentialId ?? ''} placeholder="Credential ID" className={studentFieldClass} />
                  <input name="credentialUrl" type="url" defaultValue={cert.credentialUrl ?? ''} placeholder="Verification URL" className={studentFieldClass} />
                  <input name="duration" defaultValue={cert.duration ?? ''} placeholder="Duration" className={studentFieldClass} />
                  <input name="skillsEarned" defaultValue={cert.skillsEarned.join(', ')} placeholder="Skills" className={studentFieldClass} />
                  <input name="issuedAt" type="date" defaultValue={cert.issuedAt ? new Date(cert.issuedAt).toISOString().slice(0, 10) : ''} className={studentFieldClass} />
                  <input name="expiresAt" type="date" defaultValue={cert.expiresAt ? new Date(cert.expiresAt).toISOString().slice(0, 10) : ''} className={studentFieldClass} />
                  <div className="sm:col-span-3">
                    <SingleDocumentUploadField id={`edit-cert-file-${cert.id}`} name="fileUrl" defaultValue={cert.fileUrl ?? ''} />
                  </div>
                  <div className="sm:col-span-3 flex items-center gap-2">
                    <button type="submit" disabled={certEditPending} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white">
                      {certEditPending ? 'Saving…' : 'Save Changes'}
                    </button>
                    <button type="button" onClick={() => setEditingCertId(null)} className="rounded-lg border border-border px-3 py-1.5 text-xs">
                      Cancel
                    </button>
                    <ActionMessage state={certEditState} />
                  </div>
                </form>
              ) : (
                <div key={cert.id} className="flex flex-wrap items-start justify-between gap-3 py-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground">{cert.name}</h3>
                      <VerificationBadge status={cert.verificationStatus} verifiedAt={cert.verifiedAt} rejectionReason={cert.rejectionReason} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {[
                        cert.issuer,
                        cert.credentialId && `ID: ${cert.credentialId}`,
                        cert.duration && `Duration: ${cert.duration}`,
                        cert.issuedAt && `Issued: ${new Date(cert.issuedAt).toLocaleDateString()}`,
                        cert.expiresAt && `Expires: ${new Date(cert.expiresAt).toLocaleDateString()}`,
                      ]
                        .filter(Boolean)
                        .join(' • ')}
                    </p>
                    {cert.skillsEarned.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {cert.skillsEarned.map((s) => (
                          <span key={s} className="rounded-md bg-teal-500/10 px-2 py-0.5 text-[11px] font-medium text-teal-700 dark:text-teal-300">
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <DocumentPreviewLink fileUrl={cert.fileUrl} />
                      {cert.credentialUrl && (
                        <a
                          href={cert.credentialUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-medium text-teal-600 hover:underline"
                        >
                          <ExternalLink size={12} /> Verify Credential
                        </a>
                      )}
                    </div>
                    <ReviewerFeedbackBanner status={cert.verificationStatus} rejectionReason={cert.rejectionReason} />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingCertId(cert.id)}
                      className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-500/10"
                    >
                      <Edit3 size={12} /> Edit
                    </button>
                    <ConfirmDeleteForm id={cert.id} action={certDelAction} itemLabel={cert.name} />
                  </div>
                </div>
              ),
            )
          )}
        </div>
      </section>

      {/* Skills Matrix */}
      <section className="rounded-2xl border border-border bg-card p-6">
        <StudentSectionHeader
          title="Skills Matrix"
          description="Highlight your technical, domain, and analytical competencies."
          badge={`${skills.length} Skills`}
        />

        <form action={skillAddAction} className="mb-5 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-muted/20 p-4">
          <div className="min-w-[200px] flex-1">
            <label htmlFor="skill-name" className={studentLabelClass}>Skill Name</label>
            <input id="skill-name" name="skillName" required className={studentFieldClass} placeholder="e.g. TypeScript, React, SQL" />
          </div>
          <div className="w-44">
            <label htmlFor="skill-prof" className={studentLabelClass}>Proficiency</label>
            <select id="skill-prof" name="proficiency" defaultValue="INTERMEDIATE" className={studentFieldClass}>
              <option value="BEGINNER">Beginner</option>
              <option value="INTERMEDIATE">Intermediate</option>
              <option value="ADVANCED">Advanced</option>
              <option value="EXPERT">Expert</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={skillAddPending}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            <Plus size={14} /> {skillAddPending ? 'Adding…' : 'Add Skill'}
          </button>
          <div className="w-full">
            <ActionMessage state={skillAddState} />
            <ActionMessage state={skillDelState} />
          </div>
        </form>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {skills.map((sk) =>
            editingSkillId === sk.id ? (
              <form key={sk.id} action={skillEditAction} className="rounded-xl border border-border p-3 space-y-2">
                <input type="hidden" name="id" value={sk.id} />
                <input name="skillName" defaultValue={sk.skillName} required className={studentFieldClass} />
                <select name="proficiency" defaultValue={sk.proficiency} className={studentFieldClass}>
                  <option value="BEGINNER">Beginner</option>
                  <option value="INTERMEDIATE">Intermediate</option>
                  <option value="ADVANCED">Advanced</option>
                  <option value="EXPERT">Expert</option>
                </select>
                <div className="flex gap-2">
                  <button type="submit" disabled={skillEditPending} className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-semibold text-white">Save</button>
                  <button type="button" onClick={() => setEditingSkillId(null)} className="rounded-lg border border-border px-3 py-1 text-xs">Cancel</button>
                </div>
                <ActionMessage state={skillEditState} />
              </form>
            ) : (
              <div key={sk.id} className="flex items-center justify-between rounded-xl border border-border bg-background px-3.5 py-2.5">
                <div>
                  <p className="text-sm font-semibold text-foreground">{sk.skillName}</p>
                  <p className="text-[11px] font-medium text-teal-600 dark:text-teal-400">{sk.proficiency}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => setEditingSkillId(sk.id)} className="rounded p-1 text-indigo-600 hover:bg-indigo-500/10" aria-label={`Edit ${sk.skillName}`}>
                    <Edit3 size={13} />
                  </button>
                  <ConfirmDeleteForm id={sk.id} action={skillDelAction} itemLabel={sk.skillName} />
                </div>
              </div>
            ),
          )}
        </div>
      </section>
    </div>
  )
}
