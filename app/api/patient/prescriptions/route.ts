// app/api/patient/prescriptions/route.ts - FIXED VERSION
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Authentication - Check if token exists but don't verify JWT
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get patientId from query parameters (like profile endpoint)
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');
    
    if (!patientId) {
      return NextResponse.json(
        { success: false, message: 'Patient ID is required' },
        { status: 400 }
      );
    }

    // Get query parameters
    const limit = parseInt(searchParams.get('limit') || '20');
    const page = parseInt(searchParams.get('page') || '1');
    const skip = (page - 1) * limit;

    // Get prescriptions for this patient
    const prescriptions = await prisma.prescriptions.findMany({
      where: { patientId: patientId },
      include: {
        medicine_reminders: {
          select: {
            id: true,
            medicineName: true,
            dosage: true,
            frequency: true,
            status: true,
          },
        },
        clinics: {
          select: {
            name: true,
            doctorName: true,
            phone: true,
            address: true,
            city: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: skip,
    });

    const total = await prisma.prescriptions.count({
      where: { patientId: patientId },
    });

    return NextResponse.json({
      success: true,
      data: {
        prescriptions,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      },
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('Prescriptions fetch error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
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
    },
  });
}