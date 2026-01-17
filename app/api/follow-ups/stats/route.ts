import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.clinicId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clinicId = session.user.clinicId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    // Get all stats in parallel for better performance
    const [
      scheduledToday,
      pendingCount,
      sentCount,
      deliveredCount,
      readCount,
      failedCount,
      upcomingCount,
      totalNotifications
    ] = await Promise.all([
      // Notifications scheduled for today
      prisma.notifications.count({
        where: {
          clinicId,
          status: 'scheduled',
          scheduledDate: {
            gte: today,
            lt: tomorrow,
          },
        },
      }),

      // Notifications with status 'scheduled' (pending)
      prisma.notifications.count({
        where: {
          clinicId,
          status: 'scheduled',
        },
      }),

      // Notifications with status 'sent'
      prisma.notifications.count({
        where: {
          clinicId,
          status: 'sent',
        },
      }),

      // Notifications with status 'delivered'
      prisma.notifications.count({
        where: {
          clinicId,
          status: 'delivered',
        },
      }),

      // Notifications with status 'read'
      prisma.notifications.count({
        where: {
          clinicId,
          status: 'read',
        },
      }),

      // Notifications with status 'failed'
      prisma.notifications.count({
        where: {
          clinicId,
          status: 'failed',
        },
      }),

      // Upcoming notifications (next 7 days)
      prisma.notifications.count({
        where: {
          clinicId,
          status: 'scheduled',
          scheduledDate: {
            gte: today,
            lt: nextWeek,
          },
        },
      }),

      // Total notifications
      prisma.notifications.count({
        where: {
          clinicId,
        },
      }),
    ]);

    // Calculate success rates
    const totalSent = sentCount + deliveredCount + readCount + failedCount;
    const successfulSent = deliveredCount + readCount; // Consider delivered and read as successful
    
    // Delivery success rate (sent vs delivered/read)
    const deliverySuccessRate = totalSent > 0 
      ? Math.round((successfulSent / totalSent) * 100) 
      : 0;

    // Engagement rate (read rate from delivered)
    const engagementRate = deliveredCount > 0 
      ? Math.round((readCount / deliveredCount) * 100) 
      : 0;

    // Get clinic notification balance
    const clinic = await prisma.clinics.findUnique({
      where: { id: clinicId },
      select: { pushNotificationBalance: true }
    });

    return NextResponse.json({
      // Counts
      scheduledToday,
      pendingCount,
      upcomingCount,
      totalNotifications,
      
      // Status breakdown
      sentCount,
      deliveredCount,
      readCount,
      failedCount,
      
      // Rates
      deliverySuccessRate,
      engagementRate,
      
      // Clinic info
      notificationBalance: clinic?.pushNotificationBalance || 0,
      
      // Legacy compatibility (if frontend needs these)
      successRate: deliverySuccessRate, // Alias for compatibility
      
      // Additional helpful stats
      totalSent,
      successfulSent,
      failureRate: totalSent > 0 ? Math.round((failedCount / totalSent) * 100) : 0,
    });
    
  } catch (error) {
    console.error('Error fetching notification stats:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}