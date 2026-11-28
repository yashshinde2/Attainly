import { PortalDashboard } from '@/components/portal-dashboard'
import { FacultyProfileSection } from '@/components/faculty/profile-section'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { PrismaFacultyProfileRepository } from '@/lib/server/repositories/faculty-profile-repository'
import { readOwnFacultyProfile } from '@/lib/server/services/faculty'
import { getProfileCustomFields } from '@/lib/server/services/institution-config'
import { CustomProfileFieldsCard } from '@/components/shared/custom-profile-fields'

const profileRepository = new PrismaFacultyProfileRepository()

export default async function FacultyProfilePage() {
  const [principal, session] = await Promise.all([
    getCurrentPrincipal(),
    getServerSession(authOptions),
  ])

  const profile = await readOwnFacultyProfile({ principal, repository: profileRepository })
  const customFields = profile
    ? await getProfileCustomFields(principal, { profileType: 'FACULTY', profileId: profile.id })
    : []

  return (
    <PortalDashboard
      portal="faculty"
      content={
        <div className="space-y-6">
          <FacultyProfileSection
            facultyName={session?.user?.name ?? 'Faculty'}
            email={session?.user?.email ?? ''}
            profile={profile}
          />
          {profile && (
            <CustomProfileFieldsCard
              profileType="FACULTY"
              profileId={profile.id}
              fields={customFields}
            />
          )}
        </div>
      }
    />
  )
}
