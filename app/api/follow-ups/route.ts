// /app/api/follow-ups/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(request: NextRequest) {
  try {
    console.log("📋 GET /api/follow-ups called on Vercel");
    
    // 1. Use getServerSession to get the authenticated session
    const session = await getServerSession(authOptions);
    
    console.log("🔐 Session info:", {
      hasSession: !!session,
      userId: session?.user?.id,
      clinicId: session?.user?.clinicId,
      email: session?.user?.email
    });
    
    if (!session?.user?.clinicId) {
      console.log("❌ No authenticated session or clinicId found");
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'Please log in to access this resource'
      }, { status: 401 });
    }
    
    const clinicId = session.user.clinicId;
    console.log('✅ Authenticated with clinicId:', clinicId);
    
    // Get scheduled notifications
    const notifications = await prisma.notifications.findMany({
      where: {
        clinicId: clinicId,
        status: 'scheduled',
      },
      orderBy: {
        scheduledDate: 'asc',
      },
      include: {
        patients: {
          select: {
            name: true,
            mobile: true,
            fcmToken: true,
          },
        },
      },
    });

    console.log(`✅ Found ${notifications.length} scheduled notifications for clinic ${clinicId}`);

    // Transform data
    const formattedFollowUps = notifications.map((notification: any) => ({
      id: notification.id,
      patientId: notification.patientId,
      patientName: notification.patients?.name || 'Unknown Patient',
      patientMobile: notification.patients?.mobile || 'N/A',
      type: notification.type || 'reminder',
      scheduledDate: notification.scheduledDate?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
      scheduledTime: notification.scheduledDate?.toISOString().split('T')[1]?.substring(0, 5) || '00:00',
      status: notification.status || 'scheduled',
      channel: notification.deliveryMethod || 'push',
      message: notification.message || '',
      appInstalled: !!notification.patients?.fcmToken,
    }));

    return NextResponse.json({ 
      followUps: formattedFollowUps,
      message: `Found ${formattedFollowUps.length} scheduled notifications`,
      clinicId
    });
    
  } catch (error) {
    console.error('❌ Error fetching scheduled notifications:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("📝 POST /api/follow-ups called");
    
    // Use getServerSession for authentication
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.clinicId) {
      console.log("❌ No authenticated session");
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const clinicId = session.user.clinicId;
    console.log('✅ Authenticated POST with clinicId:', clinicId);

    const body = await request.json();
    const { 
      patientId, 
      message, 
      scheduledDate,
      type = 'reminder',
      category = 'reminder'
    } = body;
    
    // Validate required fields
    if (!patientId) {
      return NextResponse.json({ error: 'Patient ID is required' }, { status: 400 });
    }
    
    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }
    
    if (!scheduledDate) {
      return NextResponse.json({ error: 'Scheduled date is required' }, { status: 400 });
    }
    
    // Check if patient belongs to this clinic
    const patient = await prisma.patients.findFirst({
      where: {
        id: patientId,
        clinicId: clinicId,
      },
      include: {
        app_installations: {
          where: { isActive: true },
          take: 1
        }
      }
    });
    
    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }
    
    // Check if patient has app installed
    if (patient.app_installations.length === 0) {
      return NextResponse.json({ 
        error: 'Patient does not have the app installed',
        message: 'Cannot schedule notification. Patient needs to install the app first.'
      }, { status: 400 });
    }
    
    // Check clinic's push notification balance
    const clinic = await prisma.clinics.findUnique({
      where: { id: clinicId },
      select: { pushNotificationBalance: true }
    });
    
    if (!clinic || clinic.pushNotificationBalance <= 0) {
      return NextResponse.json({ 
        error: 'Insufficient notification balance',
        message: 'Please top up your push notification balance to schedule notifications.'
      }, { status: 400 });
    }
    
    // Create notification data object
    const notificationData = {
      patientId,
      clinicId,
      type,
      category,
      message: message.trim(),
      scheduledDate: new Date(scheduledDate),
      status: 'scheduled' as const,
      priority: 'normal' as const,
      deliveryMethod: 'push' as const,
    };
    
    // Create notification
    const notification = await prisma.notifications.create({
      data: notificationData as any,
      include: {
        patients: {
          select: {
            name: true,
            mobile: true,
          }
        }
      }
    });
    
    // Decrement clinic's notification balance
    await prisma.clinics.update({
      where: { id: clinicId },
      data: {
        pushNotificationBalance: {
          decrement: 1
        }
      }
    });
    
    const notificationWithPatient = notification as any;
    const patientData = notificationWithPatient.patients || notificationWithPatient.patient;
    
    console.log(`✅ Notification scheduled for patient ${patientData?.name} at ${scheduledDate}`);
    
    return NextResponse.json({
      success: true,
      message: 'Notification scheduled successfully',
      followUp: {
        id: notification.id,
        patientId: notification.patientId,
        patientName: patientData?.name || 'Unknown',
        patientMobile: patientData?.mobile || 'Unknown',
        type: notification.type,
        scheduledDate: notification.scheduledDate.toISOString(),
        status: notification.status,
        channel: notification.deliveryMethod,
        message: notification.message,
      },
      remainingBalance: clinic.pushNotificationBalance - 1
    }, { status: 201 });
    
  } catch (error) {
    console.error('❌ Error scheduling notification:', error);
    return NextResponse.json({ 
      error: 'Failed to schedule notification',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    console.log("🗑️ DELETE /api/follow-ups called");
    
    // Use getServerSession for authentication
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.clinicId) {
      console.log("❌ No authenticated session");
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const clinicId = session.user.clinicId;
    console.log('✅ Authenticated DELETE with clinicId:', clinicId);
    
    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get('id');
    
    if (!notificationId) {
      return NextResponse.json({ error: 'Notification ID is required' }, { status: 400 });
    }
    
    // Check if notification exists and belongs to this clinic
    const notification = await prisma.notifications.findFirst({
      where: {
        id: notificationId,
        clinicId: clinicId,
      }
    });
    
    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }
    
    // Only delete if status is 'scheduled'
    if (notification.status !== 'scheduled') {
      return NextResponse.json({ 
        error: 'Cannot delete notification that has already been sent',
        message: 'Only scheduled notifications can be deleted'
      }, { status: 400 });
    }
    
    // Delete the notification
    await prisma.notifications.delete({
      where: {
        id: notificationId,
      }
    });
    
    // Refund the notification balance
    await prisma.clinics.update({
      where: { id: clinicId },
      data: {
        pushNotificationBalance: {
          increment: 1
        }
      }
    });
    
    console.log(`✅ Notification ${notificationId} deleted and balance refunded`);
    
    return NextResponse.json({
      success: true,
      message: 'Notification deleted successfully',
      refunded: true
    });
    
  } catch (error) {
    console.error('❌ Error deleting notification:', error);
    return NextResponse.json({ 
      error: 'Failed to delete notification',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}