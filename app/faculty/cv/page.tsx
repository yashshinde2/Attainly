import { PortalDashboard } from '@/components/portal-dashboard'
import { FacultyCvSection } from '@/components/faculty/cv-section'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { PrismaFacultyProfileRepository } from '@/lib/server/repositories/faculty-profile-repository'
import { PrismaFacultyEducationRepository } from '@/lib/server/repositories/faculty-education-repository'
import { PrismaFacultyExperienceRepository } from '@/lib/server/repositories/faculty-experience-repository'
import { PrismaFacultyCertificationRepository } from '@/lib/server/repositories/faculty-certification-repository'
import { PrismaFacultyPatentRepository } from '@/lib/server/repositories/faculty-patent-repository'
import {
  listOwnFacultyCertifications,
  listOwnFacultyEducation,
  listOwnFacultyExperiences,
  listOwnFacultyPatents,
  readOwnFacultyProfile,
} from '@/lib/server/services/faculty'
import {
  listOwnCanonicalPublications,
  listOwnConsultancies,
  listOwnContributions,
  listOwnFdps,
  listOwnGrants,
  listOwnTeachingLoads,
} from '@/lib/server/services/faculty-portfolio'

const profileRepository = new PrismaFacultyProfileRepository()
const educationRepository = new PrismaFacultyEducationRepository()
const experienceRepository = new PrismaFacultyExperienceRepository()
const certificationRepository = new PrismaFacultyCertificationRepository()
const patentRepository = new PrismaFacultyPatentRepository()

export default async function FacultyCvPage() {
  const [principal, session] = await Promise.all([
    getCurrentPrincipal(),
    getServerSession(authOptions),
  ])

  const [
    profile,
    education,
    experiences,
    teachingLoads,
    fdps,
    certifications,
    publications,
    grants,
    patents,
    consultancies,
    contributions,
  ] = await Promise.all([
    readOwnFacultyProfile({ principal, repository: profileRepository }),
    listOwnFacultyEducation({ principal, repository: educationRepository }),
    listOwnFacultyExperiences({ principal, repository: experienceRepository }),
    listOwnTeachingLoads(principal),
    listOwnFdps(principal),
    listOwnFacultyCertifications({ principal, repository: certificationRepository }),
    listOwnCanonicalPublications(principal),
    listOwnGrants(principal),
    listOwnFacultyPatents({ principal, repository: patentRepository }),
    listOwnConsultancies(principal),
    listOwnContributions(principal),
  ])

  return (
    <PortalDashboard
      portal="faculty"
      content={
        <FacultyCvSection
          facultyName={session?.user?.name ?? 'Faculty'}
          email={session?.user?.email ?? ''}
          profile={profile}
          education={education}
          experiences={experiences}
          teachingLoads={teachingLoads}
          fdps={fdps}
          certifications={certifications}
          publications={publications}
          grants={grants}
          patents={patents}
          consultancies={consultancies}
          contributions={contributions}
        />
      }
    />
  )
}
