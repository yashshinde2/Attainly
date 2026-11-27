import { PortalDashboard } from '@/components/portal-dashboard'
import { FacultyResearchSection } from '@/components/faculty/research-section'
import { getCurrentPrincipal } from '@/lib/server/current-principal'
import { PrismaFacultyPatentRepository } from '@/lib/server/repositories/faculty-patent-repository'
import { PrismaFacultyResearchPaperRepository } from '@/lib/server/repositories/faculty-research-paper-repository'
import { listOwnFacultyPatents, listOwnFacultyResearchPapers } from '@/lib/server/services/faculty'
import { listOwnCanonicalPublications, listOwnGrants } from '@/lib/server/services/faculty-portfolio'

const researchPaperRepository = new PrismaFacultyResearchPaperRepository()
const patentRepository = new PrismaFacultyPatentRepository()

export default async function FacultyResearchPage() {
  const principal = await getCurrentPrincipal()
  const [canonicalPublications, grants, patents, legacyPapers] = await Promise.all([
    listOwnCanonicalPublications(principal),
    listOwnGrants(principal),
    listOwnFacultyPatents({ principal, repository: patentRepository }),
    listOwnFacultyResearchPapers({ principal, repository: researchPaperRepository }),
  ])

  return (
    <PortalDashboard
      portal="faculty"
      content={
        <FacultyResearchSection
          canonicalPublications={canonicalPublications}
          grants={grants}
          patents={patents}
          legacyPapers={legacyPapers}
        />
      }
    />
  )
}
