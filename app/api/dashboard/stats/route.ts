// app/api/dashboard/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.clinicId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clinicId = session.user.clinicId;

    // Get today's date at midnight
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get start of week (Monday)
    const startOfWeek = new Date(today);
    const dayOfWeek = today.getDay();
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);

    // ✅ FIRST: Fetch clinic data separately to ensure we get it
    const clinicData = await prisma.clinic.findUnique({
      where: { id: clinicId },
      select: {
        pushNotificationBalance: true,
        subscriptionPlan: true,
        subscriptionStatus: true,
        hasAppUsers: true
      }
    });

    if (!clinicData) {
      return NextResponse.json(
        { error: 'Clinic not found' },
        { status: 404 }
      );
    }

    // Now fetch other stats in parallel
    const [
      patientsToday,
      totalPatients,
      patientsWithApp,
      notificationsScheduled,
      notificationsSentToday,
      notificationsSentThisWeek,
      totalDelivered,
      totalRead,
      totalFailed
    ] = await Promise.all([
      // Patients today
      prisma.patient.count({
        where: {
          clinicId,
          visitDate: {
            gte: today,
            lt: tomorrow
          }
        }
      }),

      // Total patients
      prisma.patient.count({
        where: { clinicId }
      }),

      // Patients with app installed
      prisma.patient.count({
        where: {
          clinicId,
          appInstallations: {
            some: {
              isActive: true
            }
          }
        }
      }),

      // Active notifications scheduled
      prisma.notification.count({
        where: {
          clinicId,
          status: 'scheduled',
          scheduledDate: {
            gte: today
          }
        }
      }),

      // Notifications sent today
      prisma.notification.count({
        where: {
          clinicId,
          sentAt: {
            gte: today,
            lt: tomorrow
          }
        }
      }),

      // Notifications sent this week (last 7 days)
      prisma.notification.count({
        where: {
          clinicId,
          sentAt: {
            gte: startOfWeek
          }
        }
      }),

      // Total delivered notifications (all time)
      prisma.notification.count({
        where: {
          clinicId,
          status: 'delivered'
        }
      }),

      // Total read notifications (all time)
      prisma.notification.count({
        where: {
          clinicId,
          status: 'read'
        }
      }),

      // Total failed notifications (all time)
      prisma.notification.count({
        where: {
          clinicId,
          status: 'failed'
        }
      })
    ]);

    // ✅ FIXED: Calculate delivery rate properly
    // Use this week's sent notifications for delivery rate
    const sentThisWeek = notificationsSentThisWeek;
    const successfulDeliveriesThisWeek = await prisma.notification.count({
      where: {
        clinicId,
        status: { in: ['delivered', 'read'] },
        sentAt: {
          gte: startOfWeek
        }
      }
    });
    
    // Calculate delivery rate for this week
    let notificationDeliveryRate = 0;
    if (sentThisWeek > 0) {
      notificationDeliveryRate = Math.round((successfulDeliveriesThisWeek / sentThisWeek) * 100);
    } else if (totalDelivered + totalRead + totalFailed > 0) {
      // If no notifications this week, calculate from all-time data
      const totalSentAllTime = totalDelivered + totalRead + totalFailed;
      notificationDeliveryRate = Math.round(((totalDelivered + totalRead) / totalSentAllTime) * 100);
    }

    // ✅ FIXED: Calculate engagement rate properly
    // Engagement = % of delivered notifications that were read
    let engagementRate = 0;
    if (totalDelivered > 0) {
      engagementRate = Math.round((totalRead / totalDelivered) * 100);
    }

    // Calculate remaining notifications for today
    const notificationsScheduledToday = await prisma.notification.count({
      where: {
        clinicId,
        status: 'scheduled',
        scheduledDate: {
          gte: today,
          lt: tomorrow
        }
      }
    });

    // Calculate patients with pending notifications
    const patientsWithPendingNotifications = await prisma.patient.count({
      where: {
        clinicId,
        notifications: {
          some: {
            status: 'scheduled',
            scheduledDate: {
              gte: today
            }
          }
        }
      }
    });

    // Update clinic's hasAppUsers count if it's different
    if (clinicData.hasAppUsers !== patientsWithApp) {
      await prisma.clinic.update({
        where: { id: clinicId },
        data: { hasAppUsers: patientsWithApp }
      });
    }

    // ✅ FIXED: Get actual push notification balance from clinic
    // If balance is null or undefined, show 0 (not hardcoded 100)
    const pushNotificationBalance = clinicData.pushNotificationBalance ?? 0;

    return NextResponse.json({
      // Patient stats
      patientsToday,
      totalPatients,
      patientsWithApp,
      
      // Notification stats
      notificationsScheduled,
      notificationsSentToday,
      notificationsSentThisWeek,
      notificationsScheduledToday,
      patientsWithPendingNotifications,
      
      // ✅ FIXED: Real calculated values, no hardcoding
      notificationDeliveryRate: Math.min(Math.max(notificationDeliveryRate, 0), 100), // Clamp 0-100
      engagementRate: Math.min(Math.max(engagementRate, 0), 100), // Clamp 0-100
      
      // Count stats
      totalDelivered,
      totalRead,
      totalFailed,
      
      // Clinic data - use actual values, no hardcoded fallbacks
      pushNotificationBalance,
      subscriptionPlan: clinicData.subscriptionPlan,
      subscriptionStatus: clinicData.subscriptionStatus,
      hasAppUsers: patientsWithApp,
      
      success: true,
      
      // ✅ DEBUG INFO (remove in production)
      _debug: process.env.NODE_ENV === 'development' ? {
        sentThisWeek,
        successfulDeliveriesThisWeek,
        totalDelivered,
        totalRead,
        totalFailed,
        calculation: {
          deliveryRate: `${successfulDeliveriesThisWeek} / ${sentThisWeek} = ${notificationDeliveryRate}%`,
          engagementRate: `${totalRead} / ${totalDelivered} = ${engagementRate}%`
        }
      } : undefined
    });

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch dashboard stats',
        // Provide sensible defaults in case of error
        patientsToday: 0,
        totalPatients: 0,
        patientsWithApp: 0,
        notificationsScheduled: 0,
        notificationsSentToday: 0,
        notificationsSentThisWeek: 0,
        notificationsScheduledToday: 0,
        patientsWithPendingNotifications: 0,
        notificationDeliveryRate: 0,
        engagementRate: 0,
        totalDelivered: 0,
        totalRead: 0,
        totalFailed: 0,
        pushNotificationBalance: 0, // Not 100!
        subscriptionPlan: 'unknown',
        subscriptionStatus: 'unknown',
        hasAppUsers: 0,
        success: false
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}