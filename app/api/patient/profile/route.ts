import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Get patientId from query params (for development/testing)
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');
    
    if (!patientId) {
      return NextResponse.json(
        { success: false, message: 'Patient ID required' },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        }
      );
    }

    // Get patient with all related data (same as before)
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        clinic: {
          select: {
            id: true,
            name: true,
            doctorName: true,
            phone: true,
            address: true,
            city: true,
            googleReviewLink: true,
          },
        },
        prescriptions: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            visitDate: true,
            diagnosis: true,
            nextVisitDate: true,
            createdAt: true,
            enablePushReminders: true,
          },
        },
        medicineReminders: {
          where: { status: 'active' },
          take: 10,
          orderBy: { startDate: 'desc' },
          select: {
            id: true,
            medicineName: true,
            dosage: true,
            frequency: true,
            reminderTimes: true,
            startDate: true,
            endDate: true,
            status: true,
          },
        },
        reviews: {
          take: 5,
          orderBy: { requestDate: 'desc' },
          select: {
            id: true,
            requestDate: true,
            sentDate: true,
            receivedDate: true,
            status: true,
            rating: true,
            platform: true,
          },
        },
      },
    });

    if (!patient) {
      return NextResponse.json(
        { success: false, message: 'Patient not found' },
        { 
          status: 404,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        }
      );
    }

    // Calculate statistics
    const stats = {
      totalPrescriptions: await prisma.prescription.count({
        where: { patientId: patient.id },
      }),
      activeReminders: await prisma.medicineReminder.count({
        where: { patientId: patient.id, status: 'active' },
      }),
      completedReminders: await prisma.medicineReminder.count({
        where: { patientId: patient.id, status: 'completed' },
      }),
      pendingReviews: await prisma.review.count({
        where: { patientId: patient.id, status: 'pending' },
      }),
    };

    // Prepare response data
    const responseData = {
      id: patient.id,
      name: patient.name,
      mobile: patient.mobile,
      age: patient.age,
      gender: patient.gender,
      lastVisit: patient.visitDate,
      lastAppLogin: patient.lastAppLogin,
      hasAppInstalled: patient.hasAppInstalled,
      clinic: patient.clinic,
      recentPrescriptions: patient.prescriptions,
      activeReminders: patient.medicineReminders,
      recentReviews: patient.reviews,
      stats,
    };

    return NextResponse.json({
      success: true,
      data: responseData,
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });

  } catch (error: any) {
    console.error('Profile fetch error:', error);
    
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}