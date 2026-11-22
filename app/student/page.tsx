import { PortalDashboard } from '@/components/portal-dashboard'
import { StudentWorkspace } from '@/components/student-workspace'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { PrismaStudentProfileRepository } from '@/lib/server/repositories/student-profile-repository'
import { PrismaStudentAchievementRepository } from '@/lib/server/repositories/student-achievement-repository'
import { PrismaEventRepository } from '@/lib/server/repositories/event-repository'
import { readOwnStudentProfile } from '@/lib/server/services/student'
import { listOwnAchievements } from '@/lib/server/services/student-achievements'
import { listOwnEventParticipations } from '@/lib/server/services/event'

const profileRepository = new PrismaStudentProfileRepository()
const achievementRepository = new PrismaStudentAchievementRepository()
const eventRepository = new PrismaEventRepository()

export default async function StudentPortalPage() {
  const principal = await getCurrentPrincipal()
  const [profile, achievements, participations] = await Promise.all([
    readOwnStudentProfile({ principal, repository: profileRepository }),
    listOwnAchievements({ principal, repository: achievementRepository }),
    listOwnEventParticipations({ principal, repository: eventRepository }),
  ])

  return (
    <PortalDashboard
      portal="student"
      content={
        <StudentWorkspace
          profile={profile}
          achievements={achievements}
          participations={participations}
        />
      }
    />
  )
}
