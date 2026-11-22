import { PortalDashboard } from '@/components/portal-dashboard'
import { StudentWorkspace } from '@/components/student-workspace'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/server/db'
import { PrismaStudentProfileRepository } from '@/lib/server/repositories/student-profile-repository'
import { PrismaStudentAchievementRepository } from '@/lib/server/repositories/student-achievement-repository'
import { PrismaEventRepository } from '@/lib/server/repositories/event-repository'
import { PrismaStudentEducationRepository } from '@/lib/server/repositories/student-education-repository'
import { PrismaStudentCertificationRepository } from '@/lib/server/repositories/student-certification-repository'
import { PrismaStudentResearchPaperRepository } from '@/lib/server/repositories/student-research-paper-repository'
import { PrismaStudentPatentRepository } from '@/lib/server/repositories/student-patent-repository'
import { PrismaStudentProjectRepository } from '@/lib/server/repositories/student-project-repository'
import { PrismaStudentInternshipRepository } from '@/lib/server/repositories/student-internship-repository'
import { PrismaStudentSkillRepository } from '@/lib/server/repositories/student-skill-repository'
import { PrismaStudentSemesterRepository } from '@/lib/server/repositories/student-semester-repository'
import {
  readOwnStudentProfile,
  readOwnStudentEducation,
  readOwnStudentCertifications,
  readOwnStudentResearchPapers,
  readOwnStudentPatents,
  readOwnStudentProjects,
  readOwnStudentInternships,
  readOwnStudentSkills,
  readOwnStudentSemesters,
} from '@/lib/server/services/student'
import { listOwnAchievements } from '@/lib/server/services/student-achievements'
import { listOwnEventParticipations } from '@/lib/server/services/event'

const profileRepository = new PrismaStudentProfileRepository()
const achievementRepository = new PrismaStudentAchievementRepository()
const eventRepository = new PrismaEventRepository()
const educationRepository = new PrismaStudentEducationRepository()
const certificationRepository = new PrismaStudentCertificationRepository()
const researchPaperRepository = new PrismaStudentResearchPaperRepository()
const patentRepository = new PrismaStudentPatentRepository()
const projectRepository = new PrismaStudentProjectRepository()
const internshipRepository = new PrismaStudentInternshipRepository()
const skillRepository = new PrismaStudentSkillRepository()
const semesterRepository = new PrismaStudentSemesterRepository()

export default async function StudentPortalPage() {
  const [principal, session] = await Promise.all([
    getCurrentPrincipal(),
    getServerSession(authOptions),
  ])

  const [
    profile,
    achievements,
    participations,
    education,
    certifications,
    researchPapers,
    patents,
    projects,
    internships,
    skills,
    semesters,
    departments,
    courses,
  ] = await Promise.all([
    readOwnStudentProfile({ principal, repository: profileRepository }),
    listOwnAchievements({ principal, repository: achievementRepository }),
    listOwnEventParticipations({ principal, repository: eventRepository }),
    readOwnStudentEducation({ principal, repository: educationRepository }),
    readOwnStudentCertifications({ principal, repository: certificationRepository }),
    readOwnStudentResearchPapers({ principal, repository: researchPaperRepository }),
    readOwnStudentPatents({ principal, repository: patentRepository }),
    readOwnStudentProjects({ principal, repository: projectRepository }),
    readOwnStudentInternships({ principal, repository: internshipRepository }),
    readOwnStudentSkills({ principal, repository: skillRepository }),
    readOwnStudentSemesters({ principal, repository: semesterRepository }),
    prisma.department.findMany({
      where: { institutionId: principal.institutionId },
      orderBy: { name: 'asc' },
    }),
    prisma.course.findMany({
      where: { institutionId: principal.institutionId },
      orderBy: { name: 'asc' },
    }),
  ])

  return (
    <PortalDashboard
      portal="student"
      content={
        <StudentWorkspace
          studentName={session?.user?.name ?? 'Student'}
          email={session?.user?.email ?? ''}
          profile={profile}
          education={education}
          achievements={achievements}
          certifications={certifications}
          researchPapers={researchPapers}
          patents={patents}
          projects={projects}
          internships={internships}
          skills={skills}
          semesters={semesters}
          departments={departments}
          courses={courses}
          participations={participations}
        />
      }
    />
  )
}
