import { PortalDashboard } from '@/components/portal-dashboard'
import { FacultyExperienceTeachingSection } from '@/components/faculty/experience-teaching-section'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { PrismaFacultyExperienceRepository } from '@/lib/server/repositories/faculty-experience-repository'
import { listOwnFacultyExperiences } from '@/lib/server/services/faculty'
import { listOwnTeachingLoads } from '@/lib/server/services/faculty-portfolio'

const experienceRepository = new PrismaFacultyExperienceRepository()

export default async function FacultyExperiencePage() {
  const principal = await getCurrentPrincipal()
  const [experiences, teachingLoads] = await Promise.all([
    listOwnFacultyExperiences({ principal, repository: experienceRepository }),
    listOwnTeachingLoads(principal),
  ])

  return (
    <PortalDashboard
      portal="faculty"
      content={<FacultyExperienceTeachingSection experiences={experiences} teachingLoads={teachingLoads} />}
    />
  )
}
