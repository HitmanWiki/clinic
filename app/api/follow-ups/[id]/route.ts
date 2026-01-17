// app/api/follow-ups/[id]/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.clinicId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Validate allowed fields to update
    const allowedFields = ['status', 'message', 'scheduledDate', 'type', 'priority'];
    const updateData: any = {};
    
    // Only allow updating specific fields
    Object.keys(body).forEach(key => {
      if (allowedFields.includes(key)) {
        updateData[key] = body[key];
        
        // Convert date strings to Date objects
        if (key === 'scheduledDate') {
          updateData[key] = new Date(body[key]);
        }
      }
    });
    
    // If status is being updated, add timestamps
    if (body.status) {
      const now = new Date();
      
      if (body.status === 'sent') {
        updateData.sentAt = now;
      } else if (body.status === 'delivered') {
        updateData.deliveredAt = now;
      } else if (body.status === 'read') {
        updateData.readAt = now;
      } else if (body.status === 'failed' && body.failureReason) {
        updateData.failureReason = body.failureReason;
      }
    }
    
    // Check if notification exists and belongs to this clinic
    const existingNotification = await prisma.notifications.findFirst({
      where: {
        id,
        clinicId: session.user.clinicId,
      },
    });
    
    if (!existingNotification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }
    
    // Update notification (this replaces the follow-up update)
    const notification = await prisma.notifications.update({
      where: {
        id,
      },
      data: updateData,
      // Use snake_case for relations
      include: {
        patients: {
          select: {
            name: true,
            mobile: true,
          }
        }
      }
    });

    // Access the patient data correctly
    const notificationAny = notification as any;
    const patient = notificationAny.patients || notificationAny.patient;
    
    return NextResponse.json({ 
      success: true, 
      notification: {
        id: notification.id,
        patientId: notification.patientId,
        patientName: patient?.name || 'Unknown',
        patientMobile: patient?.mobile || 'Unknown',
        type: notification.type,
        message: notification.message,
        scheduledDate: notification.scheduledDate.toISOString(),
        status: notification.status,
        sentAt: notification.sentAt?.toISOString(),
        deliveredAt: notification.deliveredAt?.toISOString(),
        readAt: notification.readAt?.toISOString(),
        failureReason: notification.failureReason,
      }
    });
    
  } catch (error) {
    console.error('Error updating notification:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.clinicId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if notification exists and belongs to this clinic
    const existingNotification = await prisma.notifications.findFirst({
      where: {
        id,
        clinicId: session.user.clinicId,
      },
    });
    
    if (!existingNotification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }
    
    // Only allow deletion of scheduled notifications
    if (existingNotification.status !== 'scheduled') {
      return NextResponse.json({ 
        error: 'Only scheduled notifications can be deleted',
        message: 'Notifications that have already been sent cannot be deleted'
      }, { status: 400 });
    }
    
    // Delete the notification
    await prisma.notifications.delete({
      where: {
        id,
      }
    });
    
    // Refund the notification balance
    await prisma.clinics.update({
      where: { id: session.user.clinicId },
      data: {
        pushNotificationBalance: {
          increment: 1
        }
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Notification deleted and balance refunded',
      refunded: true
    });
    
  } catch (error) {
    console.error('Error deleting notification:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.clinicId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get notification (replacing follow-up)
    const notification = await prisma.notifications.findFirst({
      where: {
        id,
        clinicId: session.user.clinicId,
      },
      // Use snake_case for all relations
      include: {
        patients: {
          select: {
            name: true,
            mobile: true,
            fcmToken: true,
          }
        },
        // Use snake_case based on the error message
        medicine_reminders: {
          select: {
            medicineName: true,
            dosage: true,
            frequency: true,
          }
        }
      }
    });

    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    // Access the relations correctly with snake_case
    const notificationAny = notification as any;
    const patient = notificationAny.patients || notificationAny.patient;
    const medicineReminder = notificationAny.medicine_reminders || notificationAny.medicineReminder;

    return NextResponse.json({ 
      success: true, 
      notification: {
        id: notification.id,
        patientId: notification.patientId,
        patientName: patient?.name || 'Unknown',
        patientMobile: patient?.mobile || 'Unknown',
        fcmToken: patient?.fcmToken || null,
        type: notification.type,
        category: notification.category,
        message: notification.message,
        scheduledDate: notification.scheduledDate.toISOString(),
        status: notification.status,
        priority: notification.priority,
        deliveryMethod: notification.deliveryMethod,
        sentAt: notification.sentAt?.toISOString(),
        deliveredAt: notification.deliveredAt?.toISOString(),
        readAt: notification.readAt?.toISOString(),
        failureReason: notification.failureReason,
        createdAt: notification.createdAt.toISOString(),
        medicineReminder: medicineReminder || null,
      }
    });
    
  } catch (error) {
    console.error('Error fetching notification:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}