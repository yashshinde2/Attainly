'use client'

import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import type {
  FacultyCertification,
  FacultyConsultancy,
  FacultyContribution,
  FacultyDevelopmentProgram,
  FacultyEducation,
  FacultyExperience,
  FacultyPatent,
  FacultyResearchGrant,
  FacultyTeachingLoad,
} from '@/generated/prisma/client'
import type { FacultyProfileWithDetails } from '@/lib/server/repositories/faculty-profile-repository'
import type { CanonicalPublicationWithContributors } from '@/lib/server/repositories/faculty-portfolio-repository'

const styles = StyleSheet.create({
  page: { padding: 34, fontFamily: 'Helvetica', fontSize: 9, color: '#1e293b', lineHeight: 1.4 },
  header: { borderBottomWidth: 1.5, borderBottomColor: '#0f172a', paddingBottom: 10, marginBottom: 12 },
  name: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#0f172a' },
  meta: { fontSize: 8.5, color: '#475569', marginTop: 3 },
  sectionTitle: {
    fontSize: 10.5,
    fontFamily: 'Helvetica-Bold',
    color: '#312e81',
    borderBottomWidth: 0.75,
    borderBottomColor: '#cbd5e1',
    paddingBottom: 2,
    marginTop: 10,
    marginBottom: 5,
    textTransform: 'uppercase',
  },
  item: { marginBottom: 4 },
  bold: { fontFamily: 'Helvetica-Bold' },
})

export function FacultyAcademicCvDocument({
  facultyName,
  email,
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
}: {
  facultyName: string
  email: string
  profile: FacultyProfileWithDetails | null
  education: FacultyEducation[]
  experiences: FacultyExperience[]
  teachingLoads: FacultyTeachingLoad[]
  fdps: FacultyDevelopmentProgram[]
  certifications: FacultyCertification[]
  publications: CanonicalPublicationWithContributors[]
  grants: FacultyResearchGrant[]
  patents: FacultyPatent[]
  consultancies: FacultyConsultancy[]
  contributions: FacultyContribution[]
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.name}>{facultyName}</Text>
          <Text style={styles.meta}>
            {[
              profile?.designation,
              profile?.department?.name,
              profile?.employeeId && `ID: ${profile.employeeId}`,
              email,
              profile?.phone,
            ]
              .filter(Boolean)
              .join(' • ')}
          </Text>
          {(profile?.orcidId || profile?.scopusAuthorId || profile?.specialization) && (
            <Text style={styles.meta}>
              {[
                profile.specialization && `Specialization: ${profile.specialization}`,
                profile.orcidId && `ORCID: ${profile.orcidId}`,
                profile.scopusAuthorId && `Scopus: ${profile.scopusAuthorId}`,
              ]
                .filter(Boolean)
                .join(' • ')}
            </Text>
          )}
        </View>

        {education.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Academic Qualifications</Text>
            {education.map((e) => (
              <Text key={e.id} style={styles.item}>
                <Text style={styles.bold}>{e.qualification}</Text> — {e.institutionName}
                {e.fieldOfStudy ? ` (${e.fieldOfStudy})` : ''}
                {e.yearCompleted ? `, ${e.yearCompleted}` : ''}
              </Text>
            ))}
          </View>
        )}

        {(experiences.length > 0 || teachingLoads.length > 0) && (
          <View>
            <Text style={styles.sectionTitle}>Experience &amp; Teaching</Text>
            {experiences.map((ex) => (
              <Text key={ex.id} style={styles.item}>
                <Text style={styles.bold}>{ex.title}</Text> — {ex.organization} ({ex.type})
              </Text>
            ))}
            {teachingLoads.map((tl) => (
              <Text key={tl.id} style={styles.item}>
                Teaching: <Text style={styles.bold}>{tl.subjectName}</Text> ({tl.academicYear}, Sem {tl.semester}, {tl.hoursPerWeek} hrs/wk)
              </Text>
            ))}
          </View>
        )}

        {publications.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Research Publications</Text>
            {publications.map((p) => (
              <Text key={p.id} style={styles.item}>
                <Text style={styles.bold}>{p.title}</Text>
                {p.journalOrConference ? ` — ${p.journalOrConference}` : ''}
                {p.doi ? ` (DOI: ${p.doi})` : ''}
              </Text>
            ))}
          </View>
        )}

        {(grants.length > 0 || patents.length > 0) && (
          <View>
            <Text style={styles.sectionTitle}>Grants &amp; Patents</Text>
            {grants.map((g) => (
              <Text key={g.id} style={styles.item}>
                Grant: <Text style={styles.bold}>{g.title}</Text> — {g.fundingAgency} ({g.role}{g.amount ? `, ${g.amount}` : ''})
              </Text>
            ))}
            {patents.map((pt) => (
              <Text key={pt.id} style={styles.item}>
                Patent: <Text style={styles.bold}>{pt.title}</Text>
                {pt.patentNumber ? ` (#${pt.patentNumber})` : ''}
              </Text>
            ))}
          </View>
        )}

        {consultancies.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Consultancy Projects</Text>
            {consultancies.map((c) => (
              <Text key={c.id} style={styles.item}>
                <Text style={styles.bold}>{c.title}</Text> — {c.clientOrganization}
                {c.amount ? ` (${c.amount})` : ''}
              </Text>
            ))}
          </View>
        )}

        {(fdps.length > 0 || certifications.length > 0) && (
          <View>
            <Text style={styles.sectionTitle}>Professional Development</Text>
            {fdps.map((f) => (
              <Text key={f.id} style={styles.item}>
                [{f.programType}] <Text style={styles.bold}>{f.title}</Text> — {f.organizer}
              </Text>
            ))}
            {certifications.map((c) => (
              <Text key={c.id} style={styles.item}>
                Cert: <Text style={styles.bold}>{c.name}</Text>
                {c.issuer ? ` — ${c.issuer}` : ''}
              </Text>
            ))}
          </View>
        )}

        {contributions.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Contributions &amp; Recognitions</Text>
            {contributions.map((ctr) => (
              <Text key={ctr.id} style={styles.item}>
                [{ctr.contributionType}] <Text style={styles.bold}>{ctr.title}</Text>
                {ctr.organizationOrBody ? ` — ${ctr.organizationOrBody}` : ''}
              </Text>
            ))}
          </View>
        )}
      </Page>
    </Document>
  )
}
