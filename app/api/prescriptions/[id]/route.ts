import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/prescriptions/[id]
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  // Await the params promise and destructure
  const { id: prescriptionId } = await props.params;
  
  console.log('🔍 Fetching prescription with ID:', prescriptionId);
  
  try {
    if (!prescriptionId) {
      console.error('❌ No prescription ID provided');
      return NextResponse.json(
        { error: 'Prescription ID is required' },
        { status: 400 }
      );
    }

    // Fetch prescription with patient and clinic data
    console.log('📋 Querying database...');
    const prescription = await prisma.prescription.findUnique({
      where: { id: prescriptionId },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            mobile: true,
            age: true,
            gender: true,
          },
        },
        clinic: {
          select: {
            id: true,
            name: true,
            doctorName: true,
            phone: true,
            address: true,
            city: true,
            logoUrl: true,
            primaryColor: true,
            secondaryColor: true,
            accentColor: true,
          },
        },
      },
    });

    console.log('📋 Database query result:', prescription);

    if (!prescription) {
      console.error('❌ Prescription not found for ID:', prescriptionId);
      return NextResponse.json(
        { error: 'Prescription not found' },
        { status: 404 }
      );
    }

    // Parse the medicines JSON field
    console.log('📋 Parsing medicines JSON...');
    let medicines: any[] = [];
    try {
      if (typeof prescription.medicines === 'string') {
        medicines = JSON.parse(prescription.medicines);
      } else if (prescription.medicines && typeof prescription.medicines === 'object') {
        medicines = Array.isArray(prescription.medicines) 
          ? prescription.medicines 
          : [prescription.medicines];
      }
      console.log('📋 Parsed medicines:', medicines);
    } catch (error) {
      console.error('❌ Error parsing medicines:', error);
      medicines = [];
    }

    // Format the response
    console.log('📋 Formatting response...');
    const formattedPrescription = {
      id: prescription.id,
      date: prescription.createdAt.toISOString(),
      diagnosis: prescription.diagnosis || '',
      medicines: Array.isArray(medicines) ? medicines.map(med => ({
        name: med?.name || med?.medicineName || 'Unknown Medicine',
        dosage: med?.dosage || '',
        duration: med?.duration || '',
        instructions: med?.instructions || '',
        timing: med?.timing || med?.frequency || '',
      })) : [],
      patientName: prescription.patient?.name || 'Unknown Patient',
      patientMobile: prescription.patient?.mobile || '',
      patientAge: prescription.patient?.age,
      patientGender: prescription.patient?.gender,
      doctorName: prescription.clinic?.doctorName || 'Doctor',
      clinicName: prescription.clinic?.name || 'Clinic',
      clinicAddress: prescription.clinic?.address && prescription.clinic?.city 
        ? `${prescription.clinic.address}, ${prescription.clinic.city}`
        : '',
      clinicPhone: prescription.clinic?.phone || '',
      nextVisitDate: prescription.nextVisitDate?.toISOString(),
      notes: prescription.notes || '',
      clinicLogoUrl: prescription.clinic?.logoUrl,
      clinicBranding: {
        primaryColor: prescription.clinic?.primaryColor,
        secondaryColor: prescription.clinic?.secondaryColor,
        accentColor: prescription.clinic?.accentColor,
      }
    };

    console.log('✅ Successfully formatted prescription:', formattedPrescription);
    
    return NextResponse.json({ 
      success: true,
      prescription: formattedPrescription 
    });
    
  } catch (error) {
    console.error('❌ Error in prescription API route:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch prescription',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}