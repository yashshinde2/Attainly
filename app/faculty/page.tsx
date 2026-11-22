import { PortalDashboard } from '@/components/portal-dashboard'
import { FacultyWorkspace } from '@/components/faculty-workspace'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { PrismaFacultyProfileRepository } from '@/lib/server/repositories/faculty-profile-repository'
import { PrismaFacultyEducationRepository } from '@/lib/server/repositories/faculty-education-repository'
import { PrismaFacultyExperienceRepository } from '@/lib/server/repositories/faculty-experience-repository'
import { PrismaFacultyCertificationRepository } from '@/lib/server/repositories/faculty-certification-repository'
import { PrismaFacultyResearchPaperRepository } from '@/lib/server/repositories/faculty-research-paper-repository'
import { PrismaFacultyPatentRepository } from '@/lib/server/repositories/faculty-patent-repository'
import { PrismaEventRepository } from '@/lib/server/repositories/event-repository'
import {
  readOwnFacultyProfile,
  listOwnFacultyEducation,
  listOwnFacultyExperiences,
  listOwnFacultyCertifications,
  listOwnFacultyResearchPapers,
  listOwnFacultyPatents,
} from '@/lib/server/services/faculty'
import { listOwnEventParticipations } from '@/lib/server/services/event'

const profileRepository = new PrismaFacultyProfileRepository()
const educationRepository = new PrismaFacultyEducationRepository()
const experienceRepository = new PrismaFacultyExperienceRepository()
const certificationRepository = new PrismaFacultyCertificationRepository()
const researchPaperRepository = new PrismaFacultyResearchPaperRepository()
const patentRepository = new PrismaFacultyPatentRepository()
const eventRepository = new PrismaEventRepository()

export default async function FacultyPortalPage() {
  const principal = await getCurrentPrincipal()
  const [
    profile,
    education,
    experiences,
    certifications,
    researchPapers,
    patents,
    participations,
  ] = await Promise.all([
    readOwnFacultyProfile({ principal, repository: profileRepository }),
    listOwnFacultyEducation({ principal, repository: educationRepository }),
    listOwnFacultyExperiences({ principal, repository: experienceRepository }),
    listOwnFacultyCertifications({ principal, repository: certificationRepository }),
    listOwnFacultyResearchPapers({ principal, repository: researchPaperRepository }),
    listOwnFacultyPatents({ principal, repository: patentRepository }),
    listOwnEventParticipations({ principal, repository: eventRepository }),
  ])

  return (
    <PortalDashboard
      portal="faculty"
      content={
        <FacultyWorkspace
          profile={profile}
          education={education}
          experiences={experiences}
          certifications={certifications}
          researchPapers={researchPapers}
          patents={patents}
          participations={participations}
        />
      }
    />
  )
}
