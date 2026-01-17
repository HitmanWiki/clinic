import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.clinicId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // First verify patient belongs to this clinic
    const patient = await prisma.patient.findUnique({
      where: { 
        id: params.id,
        clinicId: session.user.clinicId 
      },
    })
    
    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    }
    
    // Get notifications for this patient (replacing follow-ups)
    const notifications = await prisma.notification.findMany({
      where: { 
        patientId: params.id,
        clinicId: session.user.clinicId 
      },
      orderBy: { scheduledDate: 'asc' },
      include: {
        medicineReminder: {
          select: {
            medicineName: true,
            dosage: true,
            frequency: true,
          }
        }
      }
    })
    
    return NextResponse.json({ 
      success: true,
      notifications: notifications.map((notification) => ({
        // Follow-up compatible fields for frontend
        id: notification.id,
        type: notification.type,
        scheduledDate: notification.scheduledDate,
        message: notification.message || '',
        status: notification.status,
        channel: notification.deliveryMethod, // Use deliveryMethod instead of channel
        sentAt: notification.sentAt,
        deliveredAt: notification.deliveredAt,
        readAt: notification.readAt,
        createdAt: notification.createdAt,
        failureReason: notification.failureReason,
        
        // Additional notification fields
        notificationId: notification.id,
        category: notification.category,
        priority: notification.priority,
        
        // Medicine reminder info if applicable
        medicineReminder: notification.medicineReminder,
        
        // Calculated fields
        isScheduled: notification.status === 'scheduled',
        isSent: notification.status === 'sent',
        isDelivered: notification.status === 'delivered',
        isRead: notification.status === 'read',
        isFailed: notification.status === 'failed',
      }))
    })
    
  } catch (error) {
    console.error('Error fetching patient notifications:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.clinicId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // First verify patient exists and belongs to this clinic
    const patient = await prisma.patient.findUnique({
      where: { 
        id: params.id,
        clinicId: session.user.clinicId 
      },
      include: {
        appInstallations: {
          where: { isActive: true },
          take: 1
        }
      }
    })
    
    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    }
    
    const body = await request.json()
    
    // Validate required fields
    if (!body.message?.trim()) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }
    
    if (!body.scheduledDate) {
      return NextResponse.json(
        { error: 'Scheduled date is required' },
        { status: 400 }
      )
    }
    
    // Check if patient has app installed (for push notifications)
    if (patient.appInstallations.length === 0) {
      return NextResponse.json({ 
        error: 'Patient does not have the app installed',
        message: 'Cannot schedule notification. Patient needs to install the app first.'
      }, { status: 400 })
    }
    
    // Check clinic's push notification balance
    const clinic = await prisma.clinic.findUnique({
      where: { id: session.user.clinicId },
      select: { pushNotificationBalance: true }
    })
    
    if (!clinic || clinic.pushNotificationBalance <= 0) {
      return NextResponse.json({ 
        error: 'Insufficient notification balance',
        message: 'Please top up your push notification balance to schedule notifications.'
      }, { status: 400 })
    }
    
    // Create notification (replacing follow-up)
    const notification = await prisma.notification.create({
      data: {
        patientId: params.id,
        clinicId: session.user.clinicId,
        type: body.type?.trim() || 'reminder',
        category: body.category || 'reminder',
        message: body.message.trim(),
        scheduledDate: new Date(body.scheduledDate),
        status: 'scheduled',
        priority: body.priority || 'normal',
        deliveryMethod: 'push', // Always push since you're using app notifications
      },
      include: {
        patient: {
          select: {
            name: true,
            mobile: true,
          }
        }
      }
    })
    
    // Decrement clinic's notification balance
    await prisma.clinic.update({
      where: { id: session.user.clinicId },
      data: {
        pushNotificationBalance: {
          decrement: 1
        }
      }
    })
    
    return NextResponse.json({
      success: true,
      notification: {
        id: notification.id,
        patientId: notification.patientId,
        patientName: notification.patient.name,
        patientMobile: notification.patient.mobile,
        type: notification.type,
        message: notification.message,
        scheduledDate: notification.scheduledDate,
        status: notification.status,
        channel: notification.deliveryMethod,
      },
      // Follow-up compatible response for frontend
      followUp: {
        id: notification.id,
        type: notification.type,
        scheduledDate: notification.scheduledDate,
        message: notification.message,
        status: notification.status,
        channel: notification.deliveryMethod,
      },
      message: 'Notification scheduled successfully',
      remainingBalance: clinic.pushNotificationBalance - 1
    }, { status: 201 })
    
  } catch (error) {
    console.error('Error creating notification:', error)
    return NextResponse.json(
      { 
        error: 'Failed to schedule notification',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

// Optional: Add a batch endpoint to create multiple notifications
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.clinicId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { notifications, templateId } = body
    
    // Validate required fields
    if (!notifications || !Array.isArray(notifications) || notifications.length === 0) {
      return NextResponse.json(
        { error: 'Notifications array is required and cannot be empty' },
        { status: 400 }
      )
    }
    
    // Verify patient exists and belongs to this clinic
    const patient = await prisma.patient.findUnique({
      where: { 
        id: params.id,
        clinicId: session.user.clinicId 
      },
      include: {
        appInstallations: {
          where: { isActive: true },
          take: 1
        }
      }
    })
    
    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    }
    
    // Check if patient has app installed
    if (patient.appInstallations.length === 0) {
      return NextResponse.json({ 
        error: 'Patient does not have the app installed',
        message: 'Cannot schedule notifications. Patient needs to install the app first.'
      }, { status: 400 })
    }
    
    // Check clinic's push notification balance
    const clinic = await prisma.clinic.findUnique({
      where: { id: session.user.clinicId },
      select: { pushNotificationBalance: true }
    })
    
    if (!clinic || clinic.pushNotificationBalance < notifications.length) {
      return NextResponse.json({ 
        error: 'Insufficient notification balance',
        message: `Please top up your push notification balance. You have ${clinic?.pushNotificationBalance || 0} remaining but need ${notifications.length}.`
      }, { status: 400 })
    }
    
    // Create all notifications
    const createdNotifications = await Promise.all(
      notifications.map(async (notificationData: any) => {
        return prisma.notification.create({
          data: {
            patientId: params.id,
            clinicId: session.user.clinicId,
            type: notificationData.type || 'reminder',
            category: notificationData.category || 'reminder',
            message: notificationData.message.trim(),
            scheduledDate: new Date(notificationData.scheduledDate),
            status: 'scheduled',
            priority: notificationData.priority || 'normal',
            deliveryMethod: 'push',
          },
          select: {
            id: true,
            type: true,
            message: true,
            scheduledDate: true,
            status: true,
          }
        })
      })
    )
    
    // Update clinic balance
    await prisma.clinic.update({
      where: { id: session.user.clinicId },
      data: {
        pushNotificationBalance: {
          decrement: notifications.length
        }
      }
    })
    
    return NextResponse.json({
      success: true,
      message: `${createdNotifications.length} notifications scheduled successfully`,
      notifications: createdNotifications,
      remainingBalance: clinic.pushNotificationBalance - notifications.length
    }, { status: 201 })
    
  } catch (error) {
    console.error('Error creating batch notifications:', error)
    return NextResponse.json(
      { 
        error: 'Failed to schedule notifications',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}