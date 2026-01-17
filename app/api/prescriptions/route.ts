import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/prescriptions
export async function GET(request: NextRequest) {
  try {
    // Get clinicId from headers
    const clinicId = request.headers.get('clinicId');
    
    if (!clinicId) {
      return NextResponse.json(
        { error: 'Clinic ID is required' },
        { status: 400 }
      );
    }

    const prescriptions = await prisma.prescription.findMany({
      where: { clinicId },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            mobile: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Format response for the prescriptions page
    const formattedPrescriptions = prescriptions.map(prescription => {
      // Parse medicines to count them
      let medicinesCount = 0;
      try {
        const medicines = JSON.parse(prescription.medicines as string);
        medicinesCount = Array.isArray(medicines) ? medicines.length : 0;
      } catch (error) {
        medicinesCount = 0;
      }

      // Determine status based on nextVisitDate and current date
      const today = new Date();
      const nextVisitDate = prescription.nextVisitDate ? new Date(prescription.nextVisitDate) : null;
      
      let status: "active" | "completed" | "cancelled" = "active";
      if (nextVisitDate && nextVisitDate < today) {
        status = "completed";
      }

      return {
        id: prescription.id,
        patientId: prescription.patientId,
        patientName: prescription.patient.name,
        patientMobile: prescription.patient.mobile,
        date: prescription.createdAt.toISOString().split('T')[0],
        diagnosis: prescription.diagnosis || '',
        medicinesCount,
        nextVisitDate: prescription.nextVisitDate?.toISOString().split('T')[0],
        status,
      };
    });

    return NextResponse.json({ prescriptions: formattedPrescriptions });
  } catch (error) {
    console.error('Error fetching prescriptions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prescriptions' },
      { status: 500 }
    );
  }
}