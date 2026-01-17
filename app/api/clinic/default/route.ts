import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Get the first clinic from database
    const clinic = await prisma.clinic.findFirst({
      select: {
        id: true,
        name: true,
        doctorName: true,
        phone: true,
        email: true,
        address: true,
        city: true,
        // NEW BRANDING FIELDS
        logoUrl: true,
        primaryColor: true,
        secondaryColor: true,
        accentColor: true,
        workingHours: true,
        emergencyPhone: true,
        supportEmail: true,
      }
    });

    if (!clinic) {
      return NextResponse.json(
        { error: 'No clinic found in database' },
        { status: 404 }
      );
    }

    return NextResponse.json(clinic);
  } catch (error) {
    console.error('Error fetching clinic:', error);
    return NextResponse.json(
      { error: 'Failed to fetch clinic data' },
      { status: 500 }
    );
  }
}