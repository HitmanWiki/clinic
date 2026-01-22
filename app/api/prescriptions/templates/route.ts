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

    const prescriptions = await prisma.prescriptions.findMany({
      where: { clinicId },
      include: {
        patients: {
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
      // Handle medicines count - medicines can now be null or undefined
      let medicinesCount = 0;
      
      try {
        // Check if medicines exists and is not null/undefined
        if (prescription.medicines !== null && prescription.medicines !== undefined) {
          // Parse medicines if it's a string, otherwise use directly
          const medicines = typeof prescription.medicines === 'string' 
            ? JSON.parse(prescription.medicines as string)
            : prescription.medicines;
          
          medicinesCount = Array.isArray(medicines) ? medicines.length : 0;
        }
        // If medicines is null/undefined, count remains 0
      } catch (error) {
        console.error('Error parsing medicines for prescription:', prescription.id, error);
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
        patientName: prescription.patients.name,
        patientMobile: prescription.patients.mobile,
        date: prescription.createdAt.toISOString().split('T')[0],
        diagnosis: prescription.diagnosis || '',
        medicinesCount,
        hasMedicines: medicinesCount > 0, // Add this flag to indicate if medicines exist
        nextVisitDate: prescription.nextVisitDate?.toISOString().split('T')[0] || null,
        status,
        createdAt: prescription.createdAt.toISOString(),
        enablePushReminders: prescription.enablePushReminders || false,
      };
    });

    return NextResponse.json({ 
      success: true,
      prescriptions: formattedPrescriptions 
    });
  } catch (error) {
    console.error('Error fetching prescriptions:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch prescriptions',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}