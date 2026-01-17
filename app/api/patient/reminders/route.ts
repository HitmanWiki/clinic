import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Get patient ID from query parameter
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');

    if (!patientId) {
      return NextResponse.json(
        { success: false, message: 'Patient ID is required' },
        { status: 400 }
      );
    }

    // Get today's reminders
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const reminders = await prisma.medicine_reminders.findMany({
      where: {
        patientId: patientId,
        status: 'active',
        startDate: { lte: tomorrow },
        endDate: { gte: today },
      },
      include: {
        prescriptions: {
          select: {
            id: true,
            visitDate: true,
            diagnosis: true,
          },
        },
      },
      orderBy: { startDate: 'asc' },
    });

    // Group by time for display
    const groupedReminders = reminders.reduce((acc, reminder) => {
      // Parse reminderTimes (assuming it's stored as JSON string)
      let times: string[] = [];
      
      if (Array.isArray(reminder.reminderTimes)) {
        times = reminder.reminderTimes;
      } else if (typeof reminder.reminderTimes === 'string') {
        try {
          const parsed = JSON.parse(reminder.reminderTimes);
          if (Array.isArray(parsed)) {
            times = parsed;
          }
        } catch (error) {
          console.error('Error parsing reminderTimes:', error);
        }
      }
      
      times.forEach((time: string) => {
        if (!acc[time]) acc[time] = [];
        acc[time].push(reminder);
      });
      return acc;
    }, {} as Record<string, any[]>);

    return NextResponse.json({
      success: true,
      data: {
        reminders,
        groupedReminders,
        today: today.toISOString(),
        patientId,
        count: reminders.length,
      },
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });

  } catch (error) {
    console.error('Reminders fetch error:', error);
    
    // Return empty data with error
    return NextResponse.json({
      success: false,
      data: {
        reminders: [],
        groupedReminders: {},
        today: new Date().toISOString(),
        count: 0,
      },
      message: 'Error fetching reminders',
    }, { 
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}