import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

// GET: Fetch notifications for a patient (replacing follow-ups)
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  console.log('📋 GET /api/patients/[id]/follow-ups called');
  
  try {
    const { id: patientId } = await context.params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.clinicId) {
      console.log('❌ No session or clinicId');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('✅ Session clinicId:', session.user.clinicId);
    console.log('📝 Patient ID:', patientId);
    
    if (!patientId || patientId === 'undefined') {
      console.log('❌ Invalid patient ID');
      return NextResponse.json({ error: 'Patient ID is required' }, { status: 400 });
    }

    // Verify patient belongs to this clinic
    const patient = await prisma.patients.findFirst({
      where: {
        id: patientId,
        clinicId: session.user.clinicId,
      },
    });

    if (!patient) {
      console.log('❌ Patient not found or unauthorized');
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    // Fetch notifications for this patient (these are your "follow-ups")
    const notifications = await prisma.notifications.findMany({
      where: {
        patientId: patientId,
        clinicId: session.user.clinicId,
      },
      orderBy: {
        scheduledDate: 'asc',
      },
      select: {
        id: true,
        type: true,
        category: true,
        message: true,
        scheduledDate: true,
        status: true,
        priority: true,
        deliveryMethod: true,
        sentAt: true,
        deliveredAt: true,
        readAt: true,
        failureReason: true,
        createdAt: true,
        medicine_reminders: {
          select: {
            medicineName: true,
            dosage: true,
            frequency: true,
          }
        }
      },
    });

    console.log(`✅ Found ${notifications.length} notifications for patient`);

    // Transform notifications to follow-up format for frontend compatibility
    const formattedNotifications = notifications.map((notification: any) => ({
      // Follow-up compatible fields
      id: notification.id,
      patientId: patientId,
      type: notification.type,
      scheduledDate: notification.scheduledDate.toISOString(),
      status: notification.status,
      channel: notification.deliveryMethod,
      message: notification.message,
      
      // Additional notification details
      notificationId: notification.id,
      category: notification.category,
      priority: notification.priority,
      sentAt: notification.sentAt?.toISOString(),
      deliveredAt: notification.deliveredAt?.toISOString(),
      readAt: notification.readAt?.toISOString(),
      failureReason: notification.failureReason,
      createdAt: notification.createdAt.toISOString(),
      
      // Medicine reminder info if applicable
      medicineReminder: notification.medicine_reminders ? {
        medicineName: notification.medicine_reminders.medicineName,
        dosage: notification.medicine_reminders.dosage,
        frequency: notification.medicine_reminders.frequency,
      } : null,
      
      // Status indicators
      isScheduled: notification.status === 'scheduled',
      isSent: notification.status === 'sent',
      isDelivered: notification.status === 'delivered',
      isRead: notification.status === 'read',
      isFailed: notification.status === 'failed',
      
      // Time calculations
      isPastDue: notification.status === 'scheduled' && 
                 new Date(notification.scheduledDate) < new Date(),
      scheduledDateFormatted: notification.scheduledDate.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
      scheduledTime: notification.scheduledDate.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    }));

    // Sort: scheduled first, then by date
    formattedNotifications.sort((a: any, b: any) => {
      if (a.isScheduled && !b.isScheduled) return -1;
      if (!a.isScheduled && b.isScheduled) return 1;
      return new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime();
    });

    return NextResponse.json(formattedNotifications);
    
  } catch (error) {
    console.error('❌ Error fetching patient notifications:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// POST: Create a new notification for a patient (replacing follow-up creation)
// POST: Create a new notification for a patient (replacing follow-up creation)
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  console.log('📝 POST /api/patients/[id]/follow-ups called');
  
  try {
    const { id: patientId } = await context.params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.clinicId) {
      console.log('❌ No session or clinicId');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('✅ Session clinicId:', session.user.clinicId);
    console.log('📝 Patient ID:', patientId);
    
    if (!patientId || patientId === 'undefined') {
      console.log('❌ Invalid patient ID');
      return NextResponse.json({ error: 'Patient ID is required' }, { status: 400 });
    }

    // Get request body
    const body = await request.json();
    const { 
      message, 
      scheduledDate,
      type = 'reminder',
      category = 'reminder',
      priority = 'normal'
    } = body;
    
    // Validate required fields
    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }
    
    if (!scheduledDate) {
      return NextResponse.json({ error: 'Scheduled date is required' }, { status: 400 });
    }
    
    // Verify patient belongs to this clinic
    const patient = await prisma.patients.findFirst({
      where: {
        id: patientId,
        clinicId: session.user.clinicId,
      },
      include: {
        app_installations: {
          where: { isActive: true },
          take: 1
        }
      }
    });

    if (!patient) {
      console.log('❌ Patient not found or unauthorized');
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }
    
    // Check if patient has app installed (for push notifications)
    if (patient.app_installations.length === 0) {
      return NextResponse.json({ 
        error: 'Patient does not have the app installed',
        message: 'Cannot schedule notification. Patient needs to install the app first.'
      }, { status: 400 });
    }
    
    // Check clinic's push notification balance
    const clinic = await prisma.clinics.findUnique({
      where: { id: session.user.clinicId },
      select: { pushNotificationBalance: true }
    });
    
    if (!clinic || clinic.pushNotificationBalance <= 0) {
      return NextResponse.json({ 
        error: 'Insufficient notification balance',
        message: 'Please top up your push notification balance to schedule notifications.'
      }, { status: 400 });
    }
    
    // Create the notification data object
    const notificationData = {
      patientId: patientId,
      clinicId: session.user.clinicId,
      type: type,
      category: category,
      message: message.trim(),
      scheduledDate: new Date(scheduledDate),
      status: 'scheduled' as const,
      priority: priority,
      deliveryMethod: 'push' as const,
    };
    
    // Create the notification - use type assertion to bypass TypeScript error
    const notification = await prisma.notifications.create({
      data: notificationData as any, // Type assertion to fix TypeScript error
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
      where: { id: session.user.clinicId },
      data: {
        pushNotificationBalance: {
          decrement: 1
        }
      }
    });
    
    console.log(`✅ Notification scheduled for patient ${(notification as any).patients.name} at ${scheduledDate}`);
    
    // Cast to access the relation
    const notificationWithPatient = notification as any;
    const patientData = notificationWithPatient.patients || notificationWithPatient.patient;
    
    return NextResponse.json({
      id: notification.id,
      patientId: notification.patientId,
      patientName: patientData?.name || 'Unknown',
      patientMobile: patientData?.mobile || 'Unknown',
      type: notification.type,
      scheduledDate: notification.scheduledDate.toISOString(),
      status: notification.status,
      channel: notification.deliveryMethod,
      message: notification.message,
      notificationId: notification.id,
      success: true,
      responseMessage: 'Notification scheduled successfully',
      remainingBalance: clinic.pushNotificationBalance - 1
    }, { status: 201 });
    
  } catch (error) {
    console.error('❌ Error creating patient notification:', error);
    return NextResponse.json({ 
      error: 'Failed to schedule notification',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}