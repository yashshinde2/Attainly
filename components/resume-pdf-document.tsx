'use client'

import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import type {
  Achievement,
  StudentProfile,
  StudentEducation,
  StudentCertification,
  StudentResearchPaper,
  StudentPatent,
  StudentProject,
  StudentInternship,
  StudentSkill,
  StudentSemesterRecord,
} from '@/generated/prisma/client'
import type { EventParticipationWithEvent } from '@/lib/server/repositories/event-repository'

export type StudentProfileWithRelations = (StudentProfile & {
  department?: { name: string; code: string } | null
  course?: { name: string; code: string } | null
}) | null

const styles = StyleSheet.create({
  page: {
    padding: 34,
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#1e293b',
    lineHeight: 1.35,
  },
  header: {
    borderBottomWidth: 1.5,
    borderBottomColor: '#0f172a',
    paddingBottom: 10,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
    paddingRight: 10,
  },
  photo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    objectFit: 'cover',
  },
  name: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    letterSpacing: 0.5,
  },
  institutionalDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 3,
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: '#2563eb',
  },
  contactRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
    color: '#475569',
    fontSize: 8.5,
  },
  socialLinksRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 3,
    color: '#0284c7',
    fontSize: 8,
  },
  section: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    borderBottomWidth: 0.8,
    borderBottomColor: '#cbd5e1',
    paddingBottom: 2,
    marginBottom: 5,
  },
  itemRow: {
    marginBottom: 5,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9.5,
    color: '#0f172a',
  },
  itemDate: {
    fontSize: 8,
    color: '#64748b',
  },
  itemSubtitle: {
    fontSize: 8.5,
    color: '#334155',
    marginTop: 1,
  },
  itemDescription: {
    fontSize: 8,
    color: '#475569',
    marginTop: 1.5,
  },
  skillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  skillPill: {
    fontSize: 8,
    backgroundColor: '#f1f5f9',
    color: '#0f172a',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: '#cbd5e1',
  },
  semesterTable: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  semesterBox: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 3,
    borderWidth: 0.5,
    borderColor: '#e2e8f0',
  },
})

export function ResumePdfDocument({
  studentName,
  email,
  profile,
  education = [],
  achievements = [],
  certifications = [],
  researchPapers = [],
  patents = [],
  projects = [],
  internships = [],
  skills = [],
  semesters = [],
  participations = [],
}: {
  studentName: string
  email: string
  profile: StudentProfileWithRelations
  education: StudentEducation[]
  achievements: Achievement[]
  certifications: StudentCertification[]
  researchPapers: StudentResearchPaper[]
  patents: StudentPatent[]
  projects: StudentProject[]
  internships: StudentInternship[]
  skills?: StudentSkill[]
  semesters?: StudentSemesterRecord[]
  participations?: EventParticipationWithEvent[]
}) {
  const verifiedAchievements = achievements.filter((a) => a.verificationStatus !== 'REJECTED')
  const verifiedCertifications = certifications.filter((c) => c.verificationStatus !== 'REJECTED')
  const verifiedPapers = researchPapers.filter((r) => r.verificationStatus !== 'REJECTED')
  const verifiedPatents = patents.filter((p) => p.verificationStatus !== 'REJECTED')
  const verifiedInternships = internships.filter((i) => i.verificationStatus !== 'REJECTED')

  return (
    <Document title={`${studentName} - Resume`} author={studentName}>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.name}>{studentName}</Text>

            {/* Institutional Identity Details */}
            {(profile?.enrollmentNumber || profile?.department || profile?.currentSemester) && (
              <View style={styles.institutionalDetails}>
                {profile.enrollmentNumber && <Text>Enrollment: {profile.enrollmentNumber}</Text>}
                {profile.department && <Text>•  Dept: {profile.department.name}</Text>}
                {profile.course && <Text>•  Course: {profile.course.name}</Text>}
                {profile.currentSemester && <Text>•  Semester {profile.currentSemester}</Text>}
                {profile.admissionYear && <Text>•  Batch {profile.admissionYear}</Text>}
              </View>
            )}

            <View style={styles.contactRow}>
              <Text>{email}</Text>
              {profile?.phone && <Text>•  {profile.phone}</Text>}
              {profile?.address && <Text>•  {profile.address}</Text>}
            </View>

            {/* Social Links */}
            {(profile?.linkedinUrl || profile?.githubUrl || profile?.portfolioUrl) && (
              <View style={styles.socialLinksRow}>
                {profile.linkedinUrl && <Text>LinkedIn: {profile.linkedinUrl}</Text>}
                {profile.githubUrl && <Text>GitHub: {profile.githubUrl}</Text>}
                {profile.portfolioUrl && <Text>Portfolio: {profile.portfolioUrl}</Text>}
              </View>
            )}
          </View>

          {profile?.photoUrl && (
            <Image
              src={profile.photoUrl}
              style={styles.photo}
            />
          )}
        </View>

        {/* Skills */}
        {skills.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Skills &amp; Competencies</Text>
            <View style={styles.skillsGrid}>
              {skills.map((skill) => (
                <Text key={skill.id} style={styles.skillPill}>
                  {skill.skillName} ({skill.proficiency.toLowerCase()})
                </Text>
              ))}
            </View>
          </View>
        )}

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

        {/* Semester Academic Performance */}
        {semesters.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Academic Performance (Semester Grades)</Text>
            <View style={styles.semesterTable}>
              {semesters.map((s) => (
                <View key={s.id} style={styles.semesterBox}>
                  <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 8 }}>Sem {s.semesterNumber}</Text>
                  <Text style={{ fontSize: 7.5, color: '#475569' }}>SGPA: {s.sgpa.toFixed(2)} | CGPA: {s.cgpaAtSemester.toFixed(2)}</Text>
                  {typeof s.backlogCount === 'number' && s.backlogCount > 0 && (
                    <Text style={{ fontSize: 7, color: '#dc2626' }}>Backlogs: {s.backlogCount}</Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Experience & Internships */}
        {verifiedInternships.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Internships &amp; Experience</Text>
            {verifiedInternships.map((intern) => (
              <View key={intern.id} style={styles.itemRow}>
                <View style={styles.titleRow}>
                  <Text style={styles.itemTitle}>
                    {intern.role || 'Intern'}{intern.offerType !== 'NONE' ? ` (${intern.offerType.replace(/_/g, ' ')})` : ''}
                  </Text>
                  {(intern.startDate || intern.endDate) && (
                    <Text style={styles.itemDate}>
                      {intern.startDate ? new Date(intern.startDate).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : ''}
                      {' - '}
                      {intern.endDate ? new Date(intern.endDate).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : 'Present'}
                    </Text>
                  )}
                </View>
                <Text style={styles.itemSubtitle}>
                  {intern.organization}{intern.stipendAmount ? `  •  Stipend: ${intern.stipendAmount}` : ''}
                </Text>
                {intern.description && <Text style={styles.itemDescription}>{intern.description}</Text>}
              </View>
            ))}
          </View>
        )}

        {/* Projects */}
        {projects.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Projects</Text>
            {projects.map((proj) => (
              <View key={proj.id} style={styles.itemRow}>
                <View style={styles.titleRow}>
                  <Text style={styles.itemTitle}>{proj.title}</Text>
                  {(proj.startDate || proj.endDate) && (
                    <Text style={styles.itemDate}>
                      {proj.startDate ? new Date(proj.startDate).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : ''}
                      {' - '}
                      {proj.endDate ? new Date(proj.endDate).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : 'Present'}
                    </Text>
                  )}
                </View>
                {proj.repositoryUrl && <Text style={{ fontSize: 8, color: '#2563eb' }}>{proj.repositoryUrl}</Text>}
                {proj.description && <Text style={styles.itemDescription}>{proj.description}</Text>}
              </View>
            ))}
          </View>
        )}

        {/* Certifications */}
        {verifiedCertifications.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Certifications</Text>
            {verifiedCertifications.map((cert) => (
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
        {(verifiedPapers.length > 0 || verifiedPatents.length > 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Research Publications &amp; Patents</Text>
            {verifiedPapers.map((paper) => (
              <View key={paper.id} style={styles.itemRow}>
                <View style={styles.titleRow}>
                  <Text style={styles.itemTitle}>{paper.title}</Text>
                  {paper.publishedAt && (
                    <Text style={styles.itemDate}>
                      {new Date(paper.publishedAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                    </Text>
                  )}
                </View>
                <Text style={styles.itemSubtitle}>
                  {paper.publication ?? 'Independent Research'}{paper.doi ? `  •  DOI: ${paper.doi}` : ''}
                </Text>
              </View>
            ))}
            {verifiedPatents.map((pat) => (
              <View key={pat.id} style={styles.itemRow}>
                <View style={styles.titleRow}>
                  <Text style={styles.itemTitle}>{pat.title}</Text>
                  {pat.filedAt && (
                    <Text style={styles.itemDate}>
                      {new Date(pat.filedAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                    </Text>
                  )}
                </View>
                <Text style={styles.itemSubtitle}>
                  {pat.patentNumber ? `Patent #${pat.patentNumber}` : 'Filing In Progress'}
                  {pat.status ? `  •  Status: ${pat.status}` : ''}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Achievements & Awards */}
        {(verifiedAchievements.length > 0 || participations.length > 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Honors &amp; Campus Recognitions</Text>
            {verifiedAchievements.map((ach) => (
              <View key={ach.id} style={styles.itemRow}>
                <View style={styles.titleRow}>
                  <Text style={styles.itemTitle}>{ach.title}</Text>
                  {ach.awardedAt && (
                    <Text style={styles.itemDate}>
                      {new Date(ach.awardedAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                    </Text>
                  )}
                </View>
                <Text style={styles.itemSubtitle}>
                  Category: {ach.category}  •  Status: {ach.status}
                </Text>
                {ach.description && <Text style={styles.itemDescription}>{ach.description}</Text>}
              </View>
            ))}
            {participations.map((part) => (
              <View key={part.id} style={styles.itemRow}>
                <View style={styles.titleRow}>
                  <Text style={styles.itemTitle}>{part.event.title}</Text>
                  <Text style={styles.itemDate}>{new Date(part.event.startsAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</Text>
                </View>
                <Text style={styles.itemSubtitle}>
                  Campus Event Role: {part.role}{part.position ? ` (${part.position})` : ''}  •  Type: {part.event.type}
                </Text>
              </View>
            ))}
          </View>
        )}
      </Page>
    </Document>
  )
}
