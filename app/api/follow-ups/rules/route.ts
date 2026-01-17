// app/api/follow-ups/rules/route.ts
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

    // Get clinic info for personalized templates
    const clinic = await prisma.clinic.findUnique({
      where: { id: session.user.clinicId },
      select: {
        name: true,
        googleReviewLink: true,
        doctorName: true,
      }
    });

    if (!clinic) {
      return NextResponse.json({ error: 'Clinic not found' }, { status: 404 });
    }

    // Create notification templates (not stored in database, generated on the fly)
    const notificationTemplates = [
      { 
        id: "appointment_reminder_1",
        name: "Appointment Reminder (1 day before)", 
        enabled: true, 
        daysBeforeAppointment: 1, 
        type: "appointment",
        messageTemplate: `Dear {patient}, your appointment with Dr. ${clinic.doctorName} at ${clinic.name} is tomorrow. Please arrive 10 minutes early.`,
        description: "Send 1 day before appointment"
      },
      { 
        id: "appointment_reminder_same_day",
        name: "Appointment Reminder (Same day)", 
        enabled: true, 
        hoursBeforeAppointment: 2, 
        type: "appointment",
        messageTemplate: `Reminder: Your appointment with Dr. ${clinic.doctorName} is today. See you soon at ${clinic.name}!`,
        description: "Send 2 hours before appointment"
      },
      { 
        id: "medicine_reminder_morning",
        name: "Morning Medicine Reminder", 
        enabled: true, 
        timeOfDay: "09:00", 
        type: "medicine",
        messageTemplate: "Good morning! Don't forget to take your morning medicine as prescribed.",
        description: "Send daily at 9:00 AM for patients with active prescriptions"
      },
      { 
        id: "medicine_reminder_evening",
        name: "Evening Medicine Reminder", 
        enabled: true, 
        timeOfDay: "20:00", 
        type: "medicine",
        messageTemplate: "Evening reminder: Time to take your medicine. Complete your dosage as directed.",
        description: "Send daily at 8:00 PM for patients with active prescriptions"
      },
      { 
        id: "follow_up_2_days",
        name: "2-Day Follow-up", 
        enabled: true, 
        daysAfterVisit: 2, 
        type: "followup",
        messageTemplate: `Hi {patient}, this is ${clinic.name} checking in. How are you feeling after your visit?`,
        description: "Send 2 days after visit"
      },
      { 
        id: "follow_up_7_days",
        name: "7-Day Progress Check", 
        enabled: true, 
        daysAfterVisit: 7, 
        type: "followup",
        messageTemplate: `Hello {patient}, hope you're feeling better. Remember to complete your medication as prescribed. - ${clinic.name}`,
        description: "Send 7 days after visit"
      },
      { 
        id: "review_request",
        name: "Review Request", 
        enabled: true, 
        daysAfterVisit: 3, 
        type: "review",
        messageTemplate: clinic.googleReviewLink 
          ? `Hope you're feeling better! If you had a good experience, please leave us a review: ${clinic.googleReviewLink}`
          : `Hope you're feeling better! Thank you for choosing ${clinic.name}.`,
        description: "Request review 3 days after visit"
      },
      { 
        id: "next_visit_reminder",
        name: "Next Visit Reminder", 
        enabled: true, 
        daysBeforeNextVisit: 1, 
        type: "appointment",
        messageTemplate: `Reminder: Your next visit at ${clinic.name} is tomorrow. Please confirm your appointment.`,
        description: "Send 1 day before scheduled next visit"
      }
    ];

    // Get actual notification stats to show effectiveness
    const notificationStats = await prisma.notification.groupBy({
      by: ['type'],
      where: {
        clinicId: session.user.clinicId,
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      },
      _count: {
        id: true
      }
    });

    const statsMap = notificationStats.reduce((acc, stat) => {
      acc[stat.type] = stat._count.id;
      return acc;
    }, {} as Record<string, number>);

    // Add stats to templates
    const templatesWithStats = notificationTemplates.map(template => ({
      ...template,
      usageCount: statsMap[template.type] || 0
    }));

    return NextResponse.json({ 
      templates: templatesWithStats,
      clinicName: clinic.name,
      totalTemplates: notificationTemplates.length,
      message: "These are notification templates. They're not stored in database but can be used to quickly send notifications."
    });
    
  } catch (error) {
    console.error('Error fetching notification templates:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch notification templates',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.clinicId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      patientId, 
      templateId, 
      customMessage,
      scheduledDate
    } = body;

    if (!patientId) {
      return NextResponse.json({ error: 'Patient ID is required' }, { status: 400 });
    }

    if (!templateId) {
      return NextResponse.json({ error: 'Template ID is required' }, { status: 400 });
    }

    // Check if patient belongs to this clinic
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

    // Check if patient has app installed
    if (patient.appInstallations.length === 0) {
      return NextResponse.json({ 
        error: 'Patient does not have the app installed',
        message: 'Cannot send push notification. Patient needs to install the app first.'
      }, { status: 400 });
    }

    // Get clinic info for template
    const clinic = await prisma.clinic.findUnique({
      where: { id: session.user.clinicId },
      select: { name: true, doctorName: true, googleReviewLink: true }
    });

    if (!clinic) {
      return NextResponse.json({ error: 'Clinic not found' }, { status: 404 });
    }

    // Define templates (same as in GET)
    const templates = {
      "appointment_reminder_1": {
        name: "Appointment Reminder (1 day before)",
        type: "appointment",
        message: `Dear ${patient.name}, your appointment with Dr. ${clinic.doctorName} at ${clinic.name} is tomorrow. Please arrive 10 minutes early.`
      },
      "appointment_reminder_same_day": {
        name: "Appointment Reminder (Same day)",
        type: "appointment", 
        message: `Reminder: Your appointment with Dr. ${clinic.doctorName} is today. See you soon at ${clinic.name}!`
      },
      "medicine_reminder_morning": {
        name: "Morning Medicine Reminder",
        type: "medicine",
        message: `Good morning ${patient.name}! Don't forget to take your morning medicine as prescribed.`
      },
      "medicine_reminder_evening": {
        name: "Evening Medicine Reminder",
        type: "medicine",
        message: `Evening reminder ${patient.name}: Time to take your medicine. Complete your dosage as directed.`
      },
      "follow_up_2_days": {
        name: "2-Day Follow-up",
        type: "followup",
        message: `Hi ${patient.name}, this is ${clinic.name} checking in. How are you feeling after your visit?`
      },
      "follow_up_7_days": {
        name: "7-Day Progress Check",
        type: "followup",
        message: `Hello ${patient.name}, hope you're feeling better. Remember to complete your medication as prescribed. - ${clinic.name}`
      },
      "review_request": {
        name: "Review Request",
        type: "review",
        message: clinic.googleReviewLink 
          ? `Hope you're feeling better ${patient.name}! If you had a good experience, please leave us a review: ${clinic.googleReviewLink}`
          : `Hope you're feeling better ${patient.name}! Thank you for choosing ${clinic.name}.`
      },
      "next_visit_reminder": {
        name: "Next Visit Reminder",
        type: "appointment",
        message: `Reminder ${patient.name}: Your next visit at ${clinic.name} is tomorrow. Please confirm your appointment.`
      }
    };

    const template = templates[templateId as keyof typeof templates];
    
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Use custom message if provided, otherwise use template
    const finalMessage = customMessage?.trim() || template.message;

    // Check clinic's push notification balance
    const clinicBalance = await prisma.clinic.findUnique({
      where: { id: session.user.clinicId },
      select: { pushNotificationBalance: true }
    });
    
    if (!clinicBalance || clinicBalance.pushNotificationBalance <= 0) {
      return NextResponse.json({ 
        error: 'Insufficient notification balance',
        message: 'Please top up your push notification balance to send notifications.'
      }, { status: 400 });
    }

    // Create notification
    const notification = await prisma.notification.create({
      data: {
        patientId,
        clinicId: session.user.clinicId,
        type: template.type,
        category: 'reminder',
        message: finalMessage,
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
    
    // Decrement clinic's notification balance
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
      templateUsed: template.name,
      remainingBalance: clinicBalance.pushNotificationBalance - 1
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error sending notification from template:', error);
    return NextResponse.json({ 
      error: 'Failed to send notification from template',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}