import { PortalDashboard } from '@/components/portal-dashboard'
import { FacultyProfileSection } from '@/components/faculty/profile-section'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { PrismaFacultyProfileRepository } from '@/lib/server/repositories/faculty-profile-repository'
import { readOwnFacultyProfile } from '@/lib/server/services/faculty'

const profileRepository = new PrismaFacultyProfileRepository()

export default async function FacultyProfilePage() {
  const [principal, session] = await Promise.all([
    getCurrentPrincipal(),
    getServerSession(authOptions),
  ])

  const profile = await readOwnFacultyProfile({ principal, repository: profileRepository })

  return (
    <PortalDashboard
      portal="faculty"
      content={
        <FacultyProfileSection
          facultyName={session?.user?.name ?? 'Faculty'}
          email={session?.user?.email ?? ''}
          profile={profile}
        />
      }
    />
  )
}
