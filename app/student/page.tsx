import { PortalDashboard } from '@/components/portal-dashboard'
import { StudentWorkspace } from '@/components/student-workspace'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { PrismaStudentProfileRepository } from '@/lib/server/repositories/student-profile-repository'
import { PrismaStudentAchievementRepository } from '@/lib/server/repositories/student-achievement-repository'
import { readOwnStudentProfile } from '@/lib/server/services/student'
import { listOwnAchievements } from '@/lib/server/services/student-achievements'

const profileRepository = new PrismaStudentProfileRepository()
const achievementRepository = new PrismaStudentAchievementRepository()

export default async function StudentPortalPage() {
  const principal = await getCurrentPrincipal()
  const [profile, achievements] = await Promise.all([
    readOwnStudentProfile({ principal, repository: profileRepository }),
    listOwnAchievements({ principal, repository: achievementRepository }),
  ])

  return <PortalDashboard portal="student" content={<StudentWorkspace profile={profile} achievements={achievements} />} />
}
