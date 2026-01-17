// /app/api/follow-ups/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    console.log("📋 GET /api/follow-ups called");
    
    // Try to get clinicId from headers (sent by client)
    const clinicId = request.headers.get('clinicId');
    const authHeader = request.headers.get('authorization');
    
    console.log("🔐 Headers - clinicId:", clinicId);
    console.log("🔐 Headers - authorization:", authHeader?.substring(0, 20) + '...');
    
    // Also check cookies for session
    const cookies = request.cookies.getAll();
    console.log("🔐 Cookies count:", cookies.length);
    
    // If no clinicId in headers, try to extract from session cookie
    let finalClinicId = clinicId;
    
    if (!finalClinicId) {
      // Check for clinicId in cookies or try alternative auth
      const sessionCookie = request.cookies.get('next-auth.session-token');
      if (sessionCookie) {
        console.log("🔐 Found session cookie");
        // You might need to decode the JWT token here
        // For now, let's use a fallback
      }
    }
    
    // For testing: If we're in development and have no clinicId, use a default
    if (!finalClinicId && process.env.NODE_ENV === 'development') {
      console.log("⚠️ Development mode: Using default clinicId");
      // Check if there's any clinic in the database
      const firstClinic = await prisma.clinic.findFirst();
      if (firstClinic) {
        finalClinicId = firstClinic.id;
        console.log("🔐 Using clinicId from first clinic:", finalClinicId);
      }
    }
    
    if (!finalClinicId) {
      console.log("❌ No clinicId found in headers, cookies, or development fallback");
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('✅ Using clinicId:', finalClinicId);
    
    // Get scheduled notifications (these are your "follow-ups")
    const notifications = await prisma.notification.findMany({
      where: {
        clinicId: finalClinicId,
        status: 'scheduled', // Only get scheduled notifications
      },
      orderBy: {
        scheduledDate: 'asc',
      },
      include: {
        patient: {
          select: {
            name: true,
            mobile: true,
            fcmToken: true,
          },
        },
      },
    });

    console.log(`✅ Found ${notifications.length} scheduled notifications in database`);

    // Transform data - convert notifications to follow-up format for frontend
    const formattedFollowUps = notifications.map((notification) => ({
      id: notification.id,
      patientId: notification.patientId,
      patientName: notification.patient.name,
      patientMobile: notification.patient.mobile,
      type: notification.type, // Use notification type (appointment_reminder, medicine_reminder, etc.)
      scheduledDate: notification.scheduledDate.toISOString().split('T')[0],
      scheduledTime: notification.scheduledDate.toISOString().split('T')[1].substring(0, 5),
      status: notification.status, // scheduled, sent, delivered, read, failed
      channel: notification.deliveryMethod, // push (since you only use push notifications)
      message: notification.message || '',
      // Additional notification-specific fields
      fcmToken: notification.patient.fcmToken,
      notificationId: notification.id,
      category: notification.category,
      priority: notification.priority,
    }));

    return NextResponse.json({ 
      followUps: formattedFollowUps,
      message: `Found ${formattedFollowUps.length} scheduled notifications`
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
    
    const clinicId = request.headers.get('clinicId');
    
    if (!clinicId) {
      console.log("❌ No clinicId found in headers");
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
    const patient = await prisma.patient.findFirst({
      where: {
        id: patientId,
        clinicId: clinicId,
      },
      include: {
        appInstallations: {
          where: { isActive: true },
          take: 1
        }
      }
    });
    
    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }
    
    // Check if patient has app installed (for push notifications)
    if (patient.appInstallations.length === 0) {
      return NextResponse.json({ 
        error: 'Patient does not have the app installed',
        message: 'Cannot schedule notification. Patient needs to install the app first.'
      }, { status: 400 });
    }
    
    // Check clinic's push notification balance
    const clinic = await prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { pushNotificationBalance: true }
    });
    
    if (!clinic || clinic.pushNotificationBalance <= 0) {
      return NextResponse.json({ 
        error: 'Insufficient notification balance',
        message: 'Please top up your push notification balance to schedule notifications.'
      }, { status: 400 });
    }
    
    // Create notification (this is your "follow-up")
    const notification = await prisma.notification.create({
      data: {
        patientId,
        clinicId,
        type,
        category,
        message: message.trim(),
        scheduledDate: new Date(scheduledDate),
        status: 'scheduled',
        priority: 'normal',
        deliveryMethod: 'push', // Always push since you're only using app notifications
      },
      include: {
        patient: {
          select: {
            name: true,
            mobile: true,
          }
        }
      }
    });
    
    // Decrement clinic's notification balance
    await prisma.clinic.update({
      where: { id: clinicId },
      data: {
        pushNotificationBalance: {
          decrement: 1
        }
      }
    });
    
    console.log(`✅ Notification scheduled for patient ${notification.patient.name} at ${scheduledDate}`);
    
    return NextResponse.json({
      success: true,
      message: 'Notification scheduled successfully',
      followUp: {
        id: notification.id,
        patientId: notification.patientId,
        patientName: notification.patient.name,
        patientMobile: notification.patient.mobile,
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
    
    const clinicId = request.headers.get('clinicId');
    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get('id');
    
    if (!clinicId) {
      console.log("❌ No clinicId found in headers");
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (!notificationId) {
      return NextResponse.json({ error: 'Notification ID is required' }, { status: 400 });
    }
    
    // Check if notification exists and belongs to this clinic
    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        clinicId: clinicId,
      }
    });
    
    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }
    
    // Only delete if status is 'scheduled' (not yet sent)
    if (notification.status !== 'scheduled') {
      return NextResponse.json({ 
        error: 'Cannot delete notification that has already been sent',
        message: 'Only scheduled notifications can be deleted'
      }, { status: 400 });
    }
    
    // Delete the notification
    await prisma.notification.delete({
      where: {
        id: notificationId,
      }
    });
    
    // Refund the notification balance
    await prisma.clinic.update({
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