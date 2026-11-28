import { PortalDashboard } from '@/components/portal-dashboard'
import { StudentProfileSection } from '@/components/student/profile-section'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { PrismaStudentProfileRepository } from '@/lib/server/repositories/student-profile-repository'
import { readOwnStudentProfile } from '@/lib/server/services/student'
import { getProfileCustomFields } from '@/lib/server/services/institution-config'
import { CustomProfileFieldsCard } from '@/components/shared/custom-profile-fields'

const profileRepository = new PrismaStudentProfileRepository()

export default async function StudentProfilePage() {
  const [principal, session] = await Promise.all([
    getCurrentPrincipal(),
    getServerSession(authOptions),
  ])

  const profile = await readOwnStudentProfile({ principal, repository: profileRepository })
  const customFields = profile
    ? await getProfileCustomFields(principal, { profileType: 'STUDENT', profileId: profile.id })
    : []

  return (
    <PortalDashboard
      portal="student"
      content={
        <div className="space-y-6">
          <StudentProfileSection
            studentName={session?.user?.name ?? 'Student'}
            email={session?.user?.email ?? ''}
            profile={profile}
          />
          {profile && (
            <CustomProfileFieldsCard
              profileType="STUDENT"
              profileId={profile.id}
              fields={customFields}
            />
          )}
        </div>
      }
    />
  )
}
