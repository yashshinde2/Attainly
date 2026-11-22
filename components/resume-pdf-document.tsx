'use client'

import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type {
  Achievement,
  StudentProfile,
  StudentEducation,
  StudentCertification,
  StudentResearchPaper,
  StudentPatent,
  StudentProject,
  StudentInternship,
} from '@/generated/prisma/client'
import type { EventParticipationWithEvent } from '@/lib/server/repositories/event-repository'

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontFamily: 'Helvetica',
    fontSize: 9.5,
    color: '#1e293b',
    lineHeight: 1.4,
  },
  header: {
    borderBottomWidth: 1.5,
    borderBottomColor: '#0f172a',
    paddingBottom: 12,
    marginBottom: 14,
  },
  name: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    letterSpacing: 0.5,
  },
  contactRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 4,
    color: '#475569',
    fontSize: 9,
  },
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    borderBottomWidth: 0.8,
    borderBottomColor: '#cbd5e1',
    paddingBottom: 2,
    marginBottom: 6,
  },
  itemRow: {
    marginBottom: 6,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    color: '#0f172a',
  },
  itemDate: {
    fontSize: 8.5,
    color: '#64748b',
  },
  itemSubtitle: {
    fontSize: 9,
    color: '#334155',
    marginTop: 1,
  },
  itemDescription: {
    fontSize: 8.5,
    color: '#475569',
    marginTop: 2,
  },
  badge: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
})

export function ResumePdfDocument({
  studentName,
  email,
  profile,
  education,
  achievements,
  certifications,
  researchPapers,
  patents,
  projects,
  internships,
  participations = [],
}: {
  studentName: string
  email: string
  profile: StudentProfile | null
  education: StudentEducation[]
  achievements: Achievement[]
  certifications: StudentCertification[]
  researchPapers: StudentResearchPaper[]
  patents: StudentPatent[]
  projects: StudentProject[]
  internships: StudentInternship[]
  participations?: EventParticipationWithEvent[]
}) {
  return (
    <Document title={`${studentName} - Resume`} author={studentName}>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.name}>{studentName}</Text>
          <View style={styles.contactRow}>
            <Text>{email}</Text>
            {profile?.phone && <Text>•  {profile.phone}</Text>}
            {profile?.address && <Text>•  {profile.address}</Text>}
          </View>
        </View>

        {/* Education */}
        {education.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Education</Text>
            {education.map((edu) => (
              <View key={edu.id} style={styles.itemRow}>
                <View style={styles.titleRow}>
                  <Text style={styles.itemTitle}>
                    {edu.courseOrStream ? `${edu.level} in ${edu.courseOrStream}` : edu.level}
                  </Text>
                  {(edu.startYear || edu.endYear) && (
                    <Text style={styles.itemDate}>
                      {edu.startYear ?? ''}{edu.startYear && edu.endYear ? ' - ' : ''}{edu.endYear ?? ''}
                    </Text>
                  )}
                </View>
                <Text style={styles.itemSubtitle}>
                  {edu.institutionName}{edu.boardOrUniversity ? ` (${edu.boardOrUniversity})` : ''}
                  {edu.score ? `  •  Score: ${edu.score}` : ''}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Experience & Internships */}
        {internships.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Internships &amp; Experience</Text>
            {internships.map((intern) => (
              <View key={intern.id} style={styles.itemRow}>
                <View style={styles.titleRow}>
                  <Text style={styles.itemTitle}>{intern.role || 'Intern'}</Text>
                  {(intern.startDate || intern.endDate) && (
                    <Text style={styles.itemDate}>
                      {intern.startDate ? new Date(intern.startDate).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : ''}
                      {' - '}
                      {intern.endDate ? new Date(intern.endDate).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : 'Present'}
                    </Text>
                  )}
                </View>
                <Text style={styles.itemSubtitle}>{intern.organization}</Text>
                {intern.description && <Text style={styles.itemDescription}>{intern.description}</Text>}
              </View>
            ))}
          </View>
        )}

        {/* Projects */}
        {projects.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Academic &amp; Personal Projects</Text>
            {projects.map((proj) => (
              <View key={proj.id} style={styles.itemRow}>
                <View style={styles.titleRow}>
                  <Text style={styles.itemTitle}>{proj.title}</Text>
                  {(proj.startDate || proj.endDate) && (
                    <Text style={styles.itemDate}>
                      {proj.startDate ? new Date(proj.startDate).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : ''}
                      {proj.endDate ? ` - ${new Date(proj.endDate).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}` : ''}
                    </Text>
                  )}
                </View>
                {proj.repositoryUrl && <Text style={styles.itemSubtitle}>Repository: {proj.repositoryUrl}</Text>}
                {proj.description && <Text style={styles.itemDescription}>{proj.description}</Text>}
              </View>
            ))}
          </View>
        )}

        {/* Certifications */}
        {certifications.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Certifications &amp; Licenses</Text>
            {certifications.map((cert) => (
              <View key={cert.id} style={styles.itemRow}>
                <View style={styles.titleRow}>
                  <Text style={styles.itemTitle}>{cert.name}</Text>
                  {cert.issuedAt && (
                    <Text style={styles.itemDate}>
                      {new Date(cert.issuedAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                    </Text>
                  )}
                </View>
                {cert.issuer && <Text style={styles.itemSubtitle}>Issuer: {cert.issuer}</Text>}
              </View>
            ))}
          </View>
        )}

        {/* Research Papers & Patents */}
        {(researchPapers.length > 0 || patents.length > 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Publications &amp; Patents</Text>
            {researchPapers.map((paper) => (
              <View key={paper.id} style={styles.itemRow}>
                <View style={styles.titleRow}>
                  <Text style={styles.itemTitle}>{paper.title}</Text>
                  {paper.publishedAt && (
                    <Text style={styles.itemDate}>
                      {new Date(paper.publishedAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                    </Text>
                  )}
                </View>
                {paper.publication && <Text style={styles.itemSubtitle}>{paper.publication}{paper.doi ? ` • DOI: ${paper.doi}` : ''}</Text>}
              </View>
            ))}
            {patents.map((pat) => (
              <View key={pat.id} style={styles.itemRow}>
                <View style={styles.titleRow}>
                  <Text style={styles.itemTitle}>{pat.title}</Text>
                  {pat.status && <Text style={styles.itemDate}>Status: {pat.status}</Text>}
                </View>
                {pat.patentNumber && <Text style={styles.itemSubtitle}>Patent No: {pat.patentNumber}</Text>}
              </View>
            ))}
          </View>
        )}

        {/* Achievements & Honors */}
        {(achievements.length > 0 || participations.length > 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Achievements &amp; Honors</Text>
            {achievements.map((ach) => (
              <View key={ach.id} style={styles.itemRow}>
                <View style={styles.titleRow}>
                  <Text style={styles.itemTitle}>{ach.title} ({ach.status === 'WINNER' ? 'Winner' : 'Participation'})</Text>
                  {ach.awardedAt && (
                    <Text style={styles.itemDate}>
                      {new Date(ach.awardedAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                    </Text>
                  )}
                </View>
                {ach.description && <Text style={styles.itemDescription}>{ach.description}</Text>}
              </View>
            ))}
            {participations.map((part) => (
              <View key={part.id} style={styles.itemRow}>
                <View style={styles.titleRow}>
                  <Text style={styles.itemTitle}>{part.event.title} — {part.role === 'WINNER' ? 'Winner' : part.role === 'ORGANIZER' ? 'Organizer' : 'Participant'}{part.position ? ` (${part.position})` : ''}</Text>
                  <Text style={styles.itemDate}>
                    {new Date(part.event.startsAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                  </Text>
                </View>
                <Text style={styles.itemSubtitle}>Host: {part.event.department.name} ({part.event.department.code})</Text>
              </View>
            ))}
          </View>
        )}
      </Page>
    </Document>
  )
}
