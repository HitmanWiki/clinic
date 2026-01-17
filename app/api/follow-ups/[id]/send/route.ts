import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.clinicId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get notification data from request body
    const body = await request.json();
    const { 
      patientId, 
      message, 
      type = 'reminder',
      scheduledDate,
      deliveryMethod = 'push'
    } = body;
    
    // Validate required fields
    if (!patientId) {
      return NextResponse.json({ error: 'Patient ID is required' }, { status: 400 });
    }
    
    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }
    
    // Check if patient belongs to this clinic
    const patient = await prisma.patients.findFirst({
      where: {
        id: patientId,
        clinicId: session.user.clinicId,
      },
    });
    
    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }
    
    // Check if patient has FCM token for push notifications
    let finalStatus = 'scheduled';
    if (deliveryMethod === 'push' && !patient.fcmToken) {
      return NextResponse.json({ 
        error: 'Patient does not have FCM token for push notifications',
        suggestion: 'Use SMS delivery method instead' 
      }, { status: 400 });
    }
    
    // Create notification data object
    const notificationData: any = {
      patientId,
      clinicId: session.user.clinicId,
      type,
      message: message.trim(),
      scheduledDate: scheduledDate ? new Date(scheduledDate) : new Date(),
      deliveryMethod,
      status: finalStatus,
    };
    
    // If sending immediately, mark as sent
    if (finalStatus === 'sent') {
      notificationData.sentAt = new Date();
    }
    
    // Create notification (without include for now)
    const notification = await prisma.notifications.create({
      data: notificationData,
    });
    
    // Fetch patient details separately
    const patientDetails = await prisma.patients.findUnique({
      where: { id: patientId },
      select: {
        name: true,
        mobile: true,
      }
    });
    
    // If this is an immediate notification (not scheduled for future), send it
    if (finalStatus === 'sent') {
      // In a real app, you would integrate with:
      // 1. Firebase Cloud Messaging for push notifications
      // 2. Twilio/TextLocal for SMS
      // 3. Email service for email notifications
      
      console.log(`📤 Sending ${deliveryMethod} notification to ${patientDetails?.name || 'patient'}: ${message}`);
      
      // Here you would add actual notification sending logic
      // For now, we'll simulate sending
      
      // Update clinic's notification balance if using push notifications
      if (deliveryMethod === 'push') {
        await prisma.clinics.update({
          where: { id: session.user.clinicId },
          data: {
            pushNotificationBalance: {
              decrement: 1
            }
          }
        });
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      message: finalStatus === 'sent' ? 'Notification sent successfully' : 'Notification scheduled successfully',
      notification: {
        id: notification.id,
        patientName: patientDetails?.name || 'Unknown',
        patientMobile: patientDetails?.mobile || 'Unknown',
        type: notification.type,
        message: notification.message,
        scheduledDate: notification.scheduledDate,
        status: notification.status,
        deliveryMethod: notification.deliveryMethod,
      }
    });
    
  } catch (error) {
    console.error('Error creating/sending notification:', error);
    return NextResponse.json({ 
      error: 'Failed to create/send notification',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Optional: Add a PUT endpoint to update notification status (mark as sent/delivered/read)
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
    const { status, failureReason } = body;
    
    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 });
    }
    
    // Update notification status
    const updateData: any = {
      status,
    };
    
    // Add timestamps based on status
    if (status === 'sent') {
      updateData.sentAt = new Date();
    } else if (status === 'delivered') {
      updateData.deliveredAt = new Date();
    } else if (status === 'read') {
      updateData.readAt = new Date();
    } else if (status === 'failed' && failureReason) {
      updateData.failureReason = failureReason;
    }
    
    const notification = await prisma.notifications.update({
      where: {
        id,
        clinicId: session.user.clinicId,
      },
      data: updateData,
    });
    
    return NextResponse.json({ 
      success: true, 
      message: `Notification marked as ${status}`,
      notification: {
        id: notification.id,
        status: notification.status,
        sentAt: notification.sentAt,
        deliveredAt: notification.deliveredAt,
        readAt: notification.readAt,
      }
    });
    
  } catch (error) {
    console.error('Error updating notification:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Optional: Add DELETE endpoint to cancel scheduled notifications
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

    // Delete notification
    await prisma.notifications.delete({
      where: {
        id,
        clinicId: session.user.clinicId,
      },
    });
    
    return NextResponse.json({ 
      success: true, 
      message: 'Notification deleted successfully' 
    });
    
  } catch (error) {
    console.error('Error deleting notification:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}