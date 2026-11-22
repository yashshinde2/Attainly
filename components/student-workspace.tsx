'use client'

import { useActionState } from 'react'
import { addStudentAchievement, saveStudentProfile, type StudentActionState } from '@/app/actions/student'
import type { Achievement, StudentProfile } from '@/generated/prisma/client'

const initialState: StudentActionState = { status: 'idle', message: '' }
const fieldClass = 'mt-2 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring'
const labelClass = 'text-sm font-medium text-foreground'

function ActionMessage({ state }: { state: StudentActionState }) {
  if (!state.message) return null
  return <p role={state.status === 'error' ? 'alert' : 'status'} className={`mt-3 text-sm ${state.status === 'error' ? 'text-destructive' : 'text-primary'}`}>{state.message}</p>
}

function ProfileForm({ profile }: { profile: StudentProfile | null }) {
  const [state, action, pending] = useActionState(saveStudentProfile, initialState)
  return (
    <form action={action} className="flex flex-col gap-5">
      <div><label htmlFor="dateOfBirth" className={labelClass}>Date of birth</label><input id="dateOfBirth" name="dateOfBirth" type="date" defaultValue={profile?.dateOfBirth?.toISOString().slice(0, 10) ?? ''} className={fieldClass} /></div>
      <div><label htmlFor="phone" className={labelClass}>Phone</label><input id="phone" name="phone" type="tel" autoComplete="tel" defaultValue={profile?.phone ?? ''} maxLength={40} className={fieldClass} /></div>
      <div><label htmlFor="address" className={labelClass}>Address</label><textarea id="address" name="address" rows={3} defaultValue={profile?.address ?? ''} maxLength={500} className={fieldClass} /></div>
      <div className="flex flex-wrap items-center gap-3"><button type="submit" disabled={pending} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60">{pending ? 'Saving…' : 'Save profile'}</button><ActionMessage state={state} /></div>
    </form>
  )
}

function AchievementForm() {
  const [state, action, pending] = useActionState(addStudentAchievement, initialState)
  return (
    <form action={action} className="flex flex-col gap-4 border-b border-border pb-6">
      <div><label htmlFor="achievement-title" className={labelClass}>Title</label><input id="achievement-title" name="title" required maxLength={180} className={fieldClass} /></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label htmlFor="achievement-category" className={labelClass}>Category</label><select id="achievement-category" name="category" className={fieldClass} defaultValue="TECHNICAL"><option value="TECHNICAL">Technical</option><option value="NON_TECHNICAL">Non-technical</option><option value="SPORTS">Sports</option><option value="CULTURAL">Cultural</option></select></div>
        <div><label htmlFor="achievement-status" className={labelClass}>Recognition</label><select id="achievement-status" name="status" className={fieldClass} defaultValue="PARTICIPATION"><option value="PARTICIPATION">Participation</option><option value="WINNER">Winner</option></select></div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2"><div><label htmlFor="achievement-awarded-at" className={labelClass}>Awarded on</label><input id="achievement-awarded-at" name="awardedAt" type="date" className={fieldClass} /></div><div><label htmlFor="achievement-description" className={labelClass}>Description</label><input id="achievement-description" name="description" maxLength={2000} className={fieldClass} /></div></div>
      <div className="flex flex-wrap items-center gap-3"><button type="submit" disabled={pending} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60">{pending ? 'Adding…' : 'Add achievement'}</button><ActionMessage state={state} /></div>
    </form>
  )
}

export function StudentWorkspace({ profile, achievements }: { profile: StudentProfile | null; achievements: Achievement[] }) {
  return (
    <div className="mt-8 grid gap-5 xl:grid-cols-[.9fr_1.1fr]">
      <section aria-labelledby="profile-heading" className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="mb-6"><h2 id="profile-heading" className="text-lg font-semibold">Personal details</h2><p className="mt-1 text-sm text-muted-foreground">Keep your student profile up to date.</p></div>
        <ProfileForm profile={profile} />
      </section>
      <section aria-labelledby="achievements-heading" className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="mb-6"><h2 id="achievements-heading" className="text-lg font-semibold">Achievements</h2><p className="mt-1 text-sm text-muted-foreground">Record your campus and professional milestones.</p></div>
        <AchievementForm />
        <div className="flex flex-col gap-3 pt-5">
          {achievements.length ? achievements.map((achievement) => <article key={achievement.id} className="rounded-xl border border-border bg-background p-4"><div className="flex flex-wrap items-start justify-between gap-2"><h3 className="font-medium">{achievement.title}</h3><span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">{achievement.status === 'WINNER' ? 'Winner' : 'Participation'}</span></div><p className="mt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{achievement.category.replaceAll('_', ' ').toLowerCase()}</p>{achievement.description && <p className="mt-2 text-sm text-muted-foreground">{achievement.description}</p>}</article>) : <p className="rounded-xl border border-dashed border-border px-4 py-7 text-center text-sm text-muted-foreground">No achievements yet. Add your first one above.</p>}
        </div>
      </section>
    </div>
  )
}
