// app/api/notifications/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.clinicId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const notification = await prisma.notifications.findFirst({
      where: {
        id,
        clinicId: session.user.clinicId,
      }
    });
    
    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }
    
    if (notification.status !== 'scheduled') {
      return NextResponse.json({ 
        error: 'Only scheduled notifications can be deleted',
        message: 'Notifications that have already been sent cannot be deleted'
      }, { status: 400 });
    }
    
    await prisma.notifications.delete({
      where: {
        id,
      }
    });
    
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
    });
    
  } catch (error) {
    console.error('Error deleting notification:', error);
    return NextResponse.json({ 
      error: 'Failed to delete notification',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.clinicId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { status, failureReason, message, scheduledDate } = body;
    
    const allowedFields = ['status', 'message', 'scheduledDate', 'failureReason'];
    const updateData: any = {};
    
    Object.keys(body).forEach(key => {
      if (allowedFields.includes(key)) {
        updateData[key] = body[key];
        
        if (key === 'scheduledDate') {
          updateData[key] = new Date(body[key]);
        }
      }
    });
    
    if (status) {
      const now = new Date();
      
      if (status === 'sent') {
        updateData.sentAt = now;
      } else if (status === 'delivered') {
        updateData.deliveredAt = now;
      } else if (status === 'read') {
        updateData.readAt = now;
      } else if (status === 'failed' && failureReason) {
        updateData.failureReason = failureReason;
      }
    }
    
    const existingNotification = await prisma.notifications.findFirst({
      where: {
        id,
        clinicId: session.user.clinicId,
      },
    });
    
    if (!existingNotification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }
    
    // Update notification and include patient data
    const notification = await prisma.notifications.update({
      where: {
        id,
      },
      data: updateData,
      // Use snake_case for relation names
      include: {
        patients: {
          select: {
            name: true,
            mobile: true,
          }
        }
      }
    });

    // Cast to any to access the relation since TypeScript doesn't know about it
    const notificationWithPatient = notification as any;
    const patient = notificationWithPatient.patients || notificationWithPatient.patient;
    
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
      error: 'Failed to update notification',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}