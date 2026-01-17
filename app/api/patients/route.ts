import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function GET(request: Request) {
  try {
    console.log('🔄 GET /api/patients called')
    
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.clinicId) {
      console.log('❌ No session or clinicId')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    console.log(`✅ Session clinicId: ${session.user.clinicId}`)
    
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const filter = searchParams.get('filter') || 'all'
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined
    
    console.log(`📋 Query params: search="${search}", filter="${filter}", limit="${limit}"`)
    
    // Build where clause
    const where: any = {
      clinicId: session.user.clinicId,
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { mobile: { contains: search } },
      ]
    }
    
    if (filter === 'today') {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      
      where.visitDate = {
        gte: today,
        lt: tomorrow,
      }
    }
    
    // Filter by patients with app installed
    if (filter === 'with_app') {
      where.app_installations = {
        some: {
          isActive: true
        }
      }
    }
    
    // Filter by patients with pending notifications
    if (filter === 'pending_notifications') {
      where.notifications = {
        some: {
          status: 'scheduled'
        }
      }
    }
    
    console.log('🔍 Querying database...')
    
    // Fetch patients from database
    const patients = await prisma.patients.findMany({
      where,
      orderBy: { visitDate: 'desc' },
      take: limit,
      include: {
        _count: {
          select: { 
            prescriptions: true, 
            reviews: true,
            notifications: true,  // ✅ Count notifications instead of followUps
            app_installations: true,
            medicine_reminders: true
          }
        },
        // Include recent notification status
        notifications: {
          take: 1,
          orderBy: { scheduledDate: 'desc' },
          where: {
            status: 'scheduled'
          },
          select: {
            status: true,
            scheduledDate: true
          }
        },
        // Include app installation status
        app_installations: {
          take: 1,
          where: {
            isActive: true
          },
          select: {
            installedAt: true,
            deviceType: true
          }
        }
      },
    })
    
    console.log(`✅ Found ${patients.length} patients`)
    
    // Transform for frontend
    const formattedPatients = patients.map((patient: any) => {
      // Check if patient has app installed
      const hasAppInstalled = patient._count.app_installations > 0
      
      // Get notification status
      const hasPendingNotifications = patient.notifications.length > 0
      const nextNotificationDate = hasPendingNotifications 
        ? patient.notifications[0].scheduledDate 
        : null
      
      // Get app installation info
      const appInstalledAt = patient.app_installations.length > 0 
        ? patient.app_installations[0].installedAt 
        : null
      const deviceType = patient.app_installations.length > 0 
        ? patient.app_installations[0].deviceType 
        : null
      
      return {
        id: patient.id,
        name: patient.name,
        mobile: patient.mobile,
        visitDate: patient.visitDate.toISOString(),
        notes: patient.notes,
        age: patient.age,
        gender: patient.gender,
        optOut: patient.optOut,
        hasAppInstalled,
        appInstalledAt: appInstalledAt ? appInstalledAt.toISOString() : null,
        deviceType,
        
        // Notification related fields
        hasPendingNotifications,
        nextNotificationDate: nextNotificationDate ? nextNotificationDate.toISOString() : null,
        notificationStatus: hasPendingNotifications ? 'scheduled' : 'none',
        
        // Counts
        prescriptionCount: patient._count.prescriptions,
        notificationCount: patient._count.notifications,
        reviewCount: patient._count.reviews,
        medicineReminderCount: patient._count.medicine_reminders,
        
        // Review status (you can customize this based on your review logic)
        reviewStatus: patient._count.reviews > 0 ? 'completed' : 'pending',
      }
    })
    
    return NextResponse.json({
      patients: formattedPatients,
      total: patients.length,
    })
    
  } catch (error) {
    console.error('❌ Error fetching patients:', error)
    return NextResponse.json(
      { error: 'Failed to fetch patients' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.clinicId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    console.log(`📝 Creating patient for clinic: ${session.user.clinicId}`)
    
    const body = await request.json()
    
    // Validate required fields
    if (!body.name?.trim()) {
      return NextResponse.json(
        { error: 'Patient name is required' },
        { status: 400 }
      )
    }
    
    if (!body.mobile?.trim()) {
      return NextResponse.json(
        { error: 'Mobile number is required' },
        { status: 400 }
      )
    }
    
    // Validate mobile format (10 digits for India)
    const mobileRegex = /^\d{10}$/
    if (!mobileRegex.test(body.mobile)) {
      return NextResponse.json(
        { error: 'Mobile number must be 10 digits' },
        { status: 400 }
      )
    }
    
    // Check for duplicate mobile in same clinic
    const existingPatient = await prisma.patients.findFirst({
      where: {
        clinicId: session.user.clinicId,
        mobile: body.mobile,
      },
    })
    
    if (existingPatient) {
      console.log(`❌ Duplicate patient found: ${existingPatient.name} (${existingPatient.mobile})`)
      return NextResponse.json(
        { 
          error: 'Patient with this mobile already exists in your clinic',
          existingPatient: {
            id: existingPatient.id,
            name: existingPatient.name,
            mobile: existingPatient.mobile,
          }
        },
        { status: 400 }
      )
    }
    
    // Create patient data object
    const patientData = {
      clinicId: session.user.clinicId,
      name: body.name.trim(),
      mobile: body.mobile.trim(),
      visitDate: body.visitDate ? new Date(body.visitDate) : new Date(),
      notes: body.notes?.trim(),
      age: body.age ? parseInt(body.age) : undefined,
      gender: body.gender,
    }
    
    console.log('📝 Creating patient with data:', patientData)
    
    const patient = await prisma.patients.create({
      data: patientData as any, // Type assertion to fix TypeScript error
    })
    
    console.log(`✅ Patient created: ${patient.name} (${patient.mobile}) - ID: ${patient.id}`)
    
    return NextResponse.json({
      success: true,
      patient: {
        id: patient.id,
        name: patient.name,
        mobile: patient.mobile,
        visitDate: patient.visitDate.toISOString(),
        notes: patient.notes,
        age: patient.age,
        gender: patient.gender,
      },
      message: 'Patient created successfully'
    }, { status: 201 })
    
  } catch (error) {
    console.error('❌ Error creating patient:', error)
    return NextResponse.json(
      { 
        error: 'Failed to create patient',
        details: String(error)
      },
      { status: 500 }
    )
  }
}

// Optional: Add an endpoint to create a notification for a patient
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.clinicId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { patientId, message, scheduledDate, type = 'reminder' } = body
    
    if (!patientId) {
      return NextResponse.json({ error: 'Patient ID is required' }, { status: 400 })
    }
    
    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }
    
    // Check if patient belongs to this clinic
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
    })
    
    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    }
    
    // Check if patient has app installed (for push notifications)
    if (patient.app_installations.length === 0) {
      return NextResponse.json({ 
        error: 'Patient does not have the app installed',
        message: 'Cannot send push notification. Patient needs to install the app first.'
      }, { status: 400 })
    }
    
    // Check clinic's push notification balance
    const clinic = await prisma.clinics.findUnique({
      where: { id: session.user.clinicId },
      select: { pushNotificationBalance: true }
    })
    
    if (!clinic || clinic.pushNotificationBalance <= 0) {
      return NextResponse.json({ 
        error: 'Insufficient notification balance',
        message: 'Please top up your push notification balance to send notifications.'
      }, { status: 400 })
    }
    
    // Create notification data object
    const notificationData = {
      patientId,
      clinicId: session.user.clinicId,
      type,
      category: 'reminder' as const,
      message: message.trim(),
      scheduledDate: scheduledDate ? new Date(scheduledDate) : new Date(),
      status: 'scheduled' as const,
      priority: 'normal' as const,
      deliveryMethod: 'push' as const,
    };
    
    // Create notification
    const notification = await prisma.notifications.create({
      data: notificationData as any, // Type assertion to fix TypeScript error
    })
    
    // Decrement clinic's notification balance
    await prisma.clinics.update({
      where: { id: session.user.clinicId },
      data: {
        pushNotificationBalance: {
          decrement: 1
        }
      }
    })
    
    console.log(`✅ Notification scheduled for patient ${patient.name}: ${message}`)
    
    return NextResponse.json({
      success: true,
      message: 'Notification scheduled successfully',
      notification: {
        id: notification.id,
        scheduledDate: notification.scheduledDate,
        status: notification.status,
      },
      remainingBalance: clinic.pushNotificationBalance - 1
    })
    
  } catch (error) {
    console.error('❌ Error scheduling notification:', error)
    return NextResponse.json(
      { 
        error: 'Failed to schedule notification',
        details: String(error)
      },
      { status: 500 }
    )
  }
}