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
      
      if (prescription.medicines) {
        try {
          // Parse medicines if it's a string (JSON), or use directly if it's already an object
          const medicines = typeof prescription.medicines === 'string' 
            ? JSON.parse(prescription.medicines)
            : prescription.medicines;
          
          medicinesCount = Array.isArray(medicines) ? medicines.length : 0;
        } catch (error) {
          medicinesCount = 0;
          console.error('Error parsing medicines:', error);
        }
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
        hasMedicines: medicinesCount > 0, // Optional: add flag to indicate if medicines exist
        nextVisitDate: prescription.nextVisitDate?.toISOString().split('T')[0] || null,
        status,
        // Optionally include the raw medicines data if needed
        medicines: prescription.medicines,
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