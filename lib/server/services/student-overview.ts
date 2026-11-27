import 'server-only'
import { prisma } from '@/lib/server/db'
import { calculateStudentCompleteness, type CompletenessResult } from '@/lib/completeness'
import { requirePermission, type AuthenticatedPrincipal } from '../authorization'

export interface StudentNotificationItem {
  id: string
  severity: 'action_required' | 'info' | 'success'
  title: string
  message: string
  href: string
  timestamp: string
}

export interface StudentOverviewData {
  profileSummary: {
    enrollmentNumber: string | null
    departmentName: string | null
    courseName: string | null
    admissionYear: number | null
    currentSemester: number | null
    batchLabel: string | null
    academicStatus: string
    photoUrl: string | null
  }
  completeness: CompletenessResult
  counts: {
    achievements: number
    verifiedAchievements: number
    certifications: number
    projects: number
    internships: number
    researchPapers: number
    patents: number
    skills: number
    placementOffers: number
    events: number
    documents: number
  }
  semesters: Array<{
    semesterNumber: number
    sgpa: number
    cgpaAtSemester: number
    backlogCount: number | null
  }>
  recentActivity: Array<{
    id: string
    type: string
    title: string
    status: string
    date: string
    href: string
  }>
  notifications: StudentNotificationItem[]
}

export async function getStudentNotifications(input: {
  principal: AuthenticatedPrincipal
}): Promise<StudentNotificationItem[]> {
  requirePermission(input.principal, 'student_profile:read_own')
  const { institutionId, userId } = input.principal

  const profile = await prisma.studentProfile.findUnique({
    where: { institutionId_userId: { institutionId, userId } },
    select: {
      id: true,
      phone: true,
      enrollmentNumber: true,
      departmentId: true,
      _count: {
        select: {
          education: true,
          semesterRecords: true,
          skills: true,
        },
      },
      achievements: {
        where: { verificationStatus: { in: ['REJECTED', 'VERIFIED'] } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, title: true, verificationStatus: true, rejectionReason: true, verifiedAt: true, createdAt: true },
      },
      certifications: {
        where: { verificationStatus: { in: ['REJECTED', 'VERIFIED'] } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, name: true, verificationStatus: true, rejectionReason: true, verifiedAt: true, createdAt: true },
      },
      internships: {
        where: { verificationStatus: { in: ['REJECTED', 'VERIFIED'] } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, organization: true, verificationStatus: true, rejectionReason: true, verifiedAt: true, createdAt: true },
      },
      placementOffers: {
        where: { verificationStatus: { in: ['REJECTED', 'VERIFIED'] } },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, companyName: true, role: true, verificationStatus: true, rejectionReason: true, verifiedAt: true, createdAt: true },
      },
    },
  })

  const notifications: StudentNotificationItem[] = []

  if (profile) {
    const pushVerificationNote = (
      prefix: string,
      id: string,
      title: string,
      status: string,
      reason: string | null,
      ts: Date,
      href: string,
    ) => {
      if (status === 'REJECTED') {
        notifications.push({
          id: `${prefix}-${id}`,
          severity: 'action_required',
          title: `Needs changes: ${title}`,
          message: reason ? `Reviewer feedback: ${reason}` : 'Your submission was returned for updates.',
          href,
          timestamp: ts.toISOString(),
        })
      } else if (status === 'VERIFIED') {
        notifications.push({
          id: `${prefix}-${id}`,
          severity: 'success',
          title: `Verified: ${title}`,
          message: 'Approved by institutional reviewer.',
          href,
          timestamp: ts.toISOString(),
        })
      }
    }

    for (const a of profile.achievements) {
      pushVerificationNote('ach', a.id, a.title, a.verificationStatus, a.rejectionReason, a.verifiedAt ?? a.createdAt, '/student/achievements')
    }
    for (const c of profile.certifications) {
      pushVerificationNote('cert', c.id, c.name, c.verificationStatus, c.rejectionReason, c.verifiedAt ?? c.createdAt, '/student/certifications')
    }
    for (const i of profile.internships) {
      pushVerificationNote('int', i.id, i.organization, i.verificationStatus, i.rejectionReason, i.verifiedAt ?? i.createdAt, '/student/projects')
    }
    for (const po of profile.placementOffers) {
      pushVerificationNote('offer', po.id, `${po.companyName} (${po.role})`, po.verificationStatus, po.rejectionReason, po.verifiedAt ?? po.createdAt, '/student/career')
    }

    if (!profile.phone) {
      notifications.push({
        id: 'missing-phone',
        severity: 'info',
        title: 'Add your contact details',
        message: 'Complete your phone and emergency contact details in My Profile.',
        href: '/student/profile',
        timestamp: new Date().toISOString(),
      })
    }
    if (profile._count.education === 0) {
      notifications.push({
        id: 'missing-edu',
        severity: 'info',
        title: 'Add educational history',
        message: 'Record your 10th, 12th, and current degree details in Academics.',
        href: '/student/academics',
        timestamp: new Date().toISOString(),
      })
    }
    if (profile._count.skills === 0) {
      notifications.push({
        id: 'missing-skills',
        severity: 'info',
        title: 'Add core skills',
        message: 'List your technical and soft skills for your resume and portfolio.',
        href: '/student/certifications',
        timestamp: new Date().toISOString(),
      })
    }
  }

  return notifications.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
}

export async function getStudentOverviewData(input: {
  principal: AuthenticatedPrincipal
}): Promise<StudentOverviewData> {
  requirePermission(input.principal, 'student_profile:read_own')
  const { institutionId, userId } = input.principal

  const [profile, eventCount, documentCount, verifiedAchievements, notifications] = await Promise.all([
    prisma.studentProfile.findUnique({
      where: { institutionId_userId: { institutionId, userId } },
      select: {
        id: true,
        phone: true,
        enrollmentNumber: true,
        departmentId: true,
        admissionYear: true,
        currentSemester: true,
        batchLabel: true,
        academicStatus: true,
        photoUrl: true,
        department: { select: { name: true } },
        course: { select: { name: true } },
        semesterRecords: {
          orderBy: { semesterNumber: 'asc' },
          select: { semesterNumber: true, sgpa: true, cgpaAtSemester: true, backlogCount: true },
        },
        achievements: {
          orderBy: { createdAt: 'desc' },
          take: 4,
          select: { id: true, title: true, verificationStatus: true, createdAt: true },
        },
        certifications: {
          orderBy: { createdAt: 'desc' },
          take: 3,
          select: { id: true, name: true, verificationStatus: true, createdAt: true },
        },
        graduateOutcome: { select: { id: true } },
        _count: {
          select: {
            education: true,
            semesterRecords: true,
            achievements: true,
            certifications: true,
            researchPapers: true,
            patents: true,
            projects: true,
            internships: true,
            skills: true,
            placementOffers: true,
          },
        },
      },
    }),
    prisma.eventParticipation.count({ where: { institutionId, userId } }),
    prisma.document.count({ where: { institutionId, ownerUserId: userId } }),
    prisma.achievement.count({
      where: { institutionId, studentProfile: { userId }, verificationStatus: 'VERIFIED' },
    }),
    getStudentNotifications({ principal: input.principal }),
  ])

  const counts = {
    achievements: profile?._count.achievements ?? 0,
    verifiedAchievements,
    certifications: profile?._count.certifications ?? 0,
    projects: profile?._count.projects ?? 0,
    internships: profile?._count.internships ?? 0,
    researchPapers: profile?._count.researchPapers ?? 0,
    patents: profile?._count.patents ?? 0,
    skills: profile?._count.skills ?? 0,
    placementOffers: profile?._count.placementOffers ?? 0,
    events: eventCount,
    documents: documentCount,
  }

  const completeness = calculateStudentCompleteness({
    hasPersonalInfo: Boolean(profile?.phone),
    hasInstitutionalIdentity: Boolean(profile?.enrollmentNumber && profile?.departmentId),
    educationCount: profile?._count.education ?? 0,
    semesterCount: profile?._count.semesterRecords ?? 0,
    achievementCount: counts.achievements,
    participationCount: eventCount,
    certificationCount: counts.certifications,
    researchPaperCount: counts.researchPapers,
    patentCount: counts.patents,
    projectCount: counts.projects,
    internshipCount: counts.internships,
    skillCount: counts.skills,
    placementOfferCount: counts.placementOffers,
    hasGraduateOutcome: Boolean(profile?.graduateOutcome),
  })

  const recentActivity = [
    ...(profile?.achievements ?? []).map((a) => ({
      id: `ach-${a.id}`,
      type: 'Achievement',
      title: a.title,
      status: a.verificationStatus,
      date: a.createdAt.toISOString(),
      href: '/student/achievements',
    })),
    ...(profile?.certifications ?? []).map((c) => ({
      id: `cert-${c.id}`,
      type: 'Certification',
      title: c.name,
      status: c.verificationStatus,
      date: c.createdAt.toISOString(),
      href: '/student/certifications',
    })),
  ]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 6)

  return {
    profileSummary: {
      enrollmentNumber: profile?.enrollmentNumber ?? null,
      departmentName: profile?.department?.name ?? null,
      courseName: profile?.course?.name ?? null,
      admissionYear: profile?.admissionYear ?? null,
      currentSemester: profile?.currentSemester ?? null,
      batchLabel: profile?.batchLabel ?? null,
      academicStatus: profile?.academicStatus ?? 'ACTIVE',
      photoUrl: profile?.photoUrl ?? null,
    },
    completeness,
    counts,
    semesters: profile?.semesterRecords ?? [],
    recentActivity,
    notifications,
  }
}
