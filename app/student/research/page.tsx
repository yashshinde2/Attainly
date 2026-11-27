import { PortalDashboard } from '@/components/portal-dashboard'
import { StudentResearchSection } from '@/components/student/research-section'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { PrismaStudentPatentRepository } from '@/lib/server/repositories/student-patent-repository'
import { PrismaStudentResearchPaperRepository } from '@/lib/server/repositories/student-research-paper-repository'
import { readOwnStudentPatents, readOwnStudentResearchPapers } from '@/lib/server/services/student'

const researchPaperRepository = new PrismaStudentResearchPaperRepository()
const patentRepository = new PrismaStudentPatentRepository()

export default async function StudentResearchPage() {
  const principal = await getCurrentPrincipal()
  const [papers, patents] = await Promise.all([
    readOwnStudentResearchPapers({ principal, repository: researchPaperRepository }),
    readOwnStudentPatents({ principal, repository: patentRepository }),
  ])

  return (
    <PortalDashboard
      portal="student"
      content={<StudentResearchSection papers={papers} patents={patents} />}
    />
  )
}
