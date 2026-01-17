// app/api/notifications/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.clinicId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';
    const patientId = searchParams.get('patientId');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50;
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1;
    
    const where: any = {
      clinicId: session.user.clinicId,
    };
    
    if (patientId) {
      where.patientId = patientId;
    }
    
    if (status !== 'all') {
      where.status = status;
    }
    
    const skip = (page - 1) * limit;
    
    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { scheduledDate: 'desc' },
        take: limit,
        skip,
        include: {
          patient: {
            select: {
              name: true,
              mobile: true,
            }
          },
          medicineReminder: {
            select: {
              medicineName: true,
              dosage: true,
            }
          }
        }
      }),
      prisma.notification.count({ where })
    ]);
    
    return NextResponse.json({
      notifications: notifications.map(notification => ({
        id: notification.id,
        patientId: notification.patientId,
        patientName: notification.patient.name,
        patientMobile: notification.patient.mobile,
        type: notification.type,
        message: notification.message,
        scheduledDate: notification.scheduledDate.toISOString(),
        status: notification.status,
        sentAt: notification.sentAt?.toISOString(),
        deliveredAt: notification.deliveredAt?.toISOString(),
        readAt: notification.readAt?.toISOString(),
        failureReason: notification.failureReason,
        category: notification.category,
        priority: notification.priority,
        deliveryMethod: notification.deliveryMethod,
        medicineReminder: notification.medicineReminder,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
      limit,
    });
    
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.clinicId) {
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
    
    if (!patientId) {
      return NextResponse.json({ error: 'Patient ID is required' }, { status: 400 });
    }
    
    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }
    
    const patient = await prisma.patient.findFirst({
      where: {
        id: patientId,
        clinicId: session.user.clinicId,
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
    
    if (patient.appInstallations.length === 0) {
      return NextResponse.json({ 
        error: 'Patient does not have the app installed',
        message: 'Cannot send push notification. Patient needs to install the app first.'
      }, { status: 400 });
    }
    
    const clinic = await prisma.clinic.findUnique({
      where: { id: session.user.clinicId },
      select: { pushNotificationBalance: true }
    });
    
    if (!clinic || clinic.pushNotificationBalance <= 0) {
      return NextResponse.json({ 
        error: 'Insufficient notification balance',
        message: 'Please top up your push notification balance to send notifications.'
      }, { status: 400 });
    }
    
    const notification = await prisma.notification.create({
      data: {
        patientId,
        clinicId: session.user.clinicId,
        type,
        category,
        message: message.trim(),
        scheduledDate: scheduledDate ? new Date(scheduledDate) : new Date(),
        status: scheduledDate ? 'scheduled' : 'sent',
        priority: 'normal',
        deliveryMethod: 'push',
        ...(scheduledDate ? {} : { sentAt: new Date() })
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
    
    await prisma.clinic.update({
      where: { id: session.user.clinicId },
      data: {
        pushNotificationBalance: {
          decrement: 1
        }
      }
    });
    
    return NextResponse.json({
      success: true,
      message: scheduledDate ? 'Notification scheduled successfully' : 'Notification sent successfully',
      notification: {
        id: notification.id,
        patientName: notification.patient.name,
        type: notification.type,
        message: notification.message,
        scheduledDate: notification.scheduledDate,
        status: notification.status,
      },
      remainingBalance: clinic.pushNotificationBalance - 1
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json({ 
      error: 'Failed to create notification',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}