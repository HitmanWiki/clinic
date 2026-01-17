import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

// GET: Fetch prescriptions for a patient
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  console.log('📋 GET /api/patients/[id]/prescriptions called');
  
  try {
    const { id: patientId } = await context.params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.clinicId) {
      console.log('❌ No session or clinicId');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('✅ Session clinicId:', session.user.clinicId);
    console.log('📝 Patient ID:', patientId);
    
    if (!patientId || patientId === 'undefined') {
      console.log('❌ Invalid patient ID');
      return NextResponse.json({ error: 'Patient ID is required' }, { status: 400 });
    }

    // Check if patient exists and belongs to this clinic
    const patient = await prisma.patients.findFirst({
      where: {
        id: patientId,
        clinicId: session.user.clinicId,
      },
    });

    if (!patient) {
      console.log('❌ Patient not found or does not belong to clinic');
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    console.log('✅ Patient found:', patient.name);
    
    // Fetch prescriptions for this patient
    const prescriptions = await prisma.prescriptions.findMany({
      where: {
        patientId: patientId,
        clinicId: session.user.clinicId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        patients: {
          select: {
            name: true,
            mobile: true,
          }
        }
      }
    });

    console.log(`✅ Found ${prescriptions.length} prescriptions`);
    
    // Transform prescriptions for frontend
    const formattedPrescriptions = prescriptions.map((prescription: any) => ({
      id: prescription.id,
      patientId: prescription.patientId,
      patientName: prescription.patients.name,
      patientMobile: prescription.patients.mobile,
      date: prescription.createdAt,
      diagnosis: prescription.diagnosis || '',
      medicines: prescription.medicines || [],
      medicinesCount: Array.isArray(prescription.medicines) ? prescription.medicines.length : 0,
      nextVisitDate: prescription.nextVisitDate,
      notes: prescription.notes || '',
      status: prescription.nextVisitDate && new Date(prescription.nextVisitDate) > new Date() ? 'active' : 'completed',
      createdAt: prescription.createdAt,
    }));
    
    return NextResponse.json({
      success: true,
      prescriptions: formattedPrescriptions
    });
    
  } catch (error) {
    console.error('❌ Error fetching prescriptions:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// POST: Create a new prescription
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  console.log('📝 POST /api/patients/[id]/prescriptions called');
  
  try {
    const { id: patientId } = await context.params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.clinicId) {
      console.log('❌ No session or clinicId');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('✅ Session clinicId:', session.user.clinicId);
    console.log('📝 Patient ID:', patientId);
    
    if (!patientId || patientId === 'undefined') {
      console.log('❌ Invalid patient ID');
      return NextResponse.json({ error: 'Patient ID is required' }, { status: 400 });
    }

    // Verify patient exists and belongs to clinic
    const patient = await prisma.patients.findFirst({
      where: {
        id: patientId,
        clinicId: session.user.clinicId,
      },
    });

    if (!patient) {
      console.log('❌ Patient not found or does not belong to clinic');
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    console.log('✅ Patient found:', patient.name);
    
    const body = await request.json();
    console.log('📦 Received prescription data:', body);
    
    // Validate required fields
    if (!body.diagnosis?.trim()) {
      return NextResponse.json({ error: 'Diagnosis is required' }, { status: 400 });
    }
    
    if (!Array.isArray(body.medicines) || body.medicines.length === 0) {
      return NextResponse.json({ error: 'At least one medicine is required' }, { status: 400 });
    }
    
    // Validate each medicine
    for (const medicine of body.medicines) {
      if (!medicine.name?.trim()) {
        return NextResponse.json({ error: 'Each medicine must have a name' }, { status: 400 });
      }
    }
    
    // Create prescription data object
    const prescriptionData = {
      diagnosis: body.diagnosis.trim(),
      medicines: body.medicines,
      nextVisitDate: body.nextVisitDate ? new Date(body.nextVisitDate) : null,
      notes: body.notes || body.advice || '',
      patientId: patientId,
      clinicId: session.user.clinicId,
    };
    
    // Create prescription
    const prescription = await prisma.prescriptions.create({
      data: prescriptionData as any, // Type assertion to fix TypeScript error
    });

    console.log('✅ Created prescription:', prescription.id);
    
    return NextResponse.json({
      success: true,
      message: 'Prescription created successfully',
      prescription: prescription
    }, { status: 201 });
    
  } catch (error) {
    console.error('❌ Error creating prescription:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}