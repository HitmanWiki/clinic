import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.clinicId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // First verify patient belongs to this clinic
    const patient = await prisma.patient.findUnique({
      where: { 
        id: params.id,
        clinicId: session.user.clinicId 
      },
    })
    
    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    }
    
    const prescriptions = await prisma.prescription.findMany({
      where: { 
        patientId: params.id,
        clinicId: session.user.clinicId 
      },
      orderBy: { visitDate: 'desc' },
    })
    
    // Transform the data for frontend
    const formattedPrescriptions = prescriptions.map((prescription: any) => ({ // Added type annotation
      id: prescription.id,
      date: prescription.visitDate,
      diagnosis: prescription.diagnosis || 'No diagnosis provided',
      medicines: Array.isArray(prescription.medicines) ? prescription.medicines : [],
      nextVisitDate: prescription.nextVisitDate,
      notes: prescription.notes,
      createdAt: prescription.createdAt,
    }))
    
    return NextResponse.json({ 
      success: true,
      prescriptions: formattedPrescriptions 
    })
    
  } catch (error) {
    console.error('Error fetching prescriptions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch prescriptions' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.clinicId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // First verify patient exists and belongs to this clinic
    const patient = await prisma.patient.findUnique({
      where: { 
        id: params.id,
        clinicId: session.user.clinicId 
      },
    })
    
    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    }
    
    const body = await request.json()
    
    // Validate required fields
    if (!body.diagnosis?.trim()) {
      return NextResponse.json(
        { error: 'Diagnosis is required' },
        { status: 400 }
      )
    }
    
    if (!Array.isArray(body.medicines) || body.medicines.length === 0) {
      return NextResponse.json(
        { error: 'At least one medicine is required' },
        { status: 400 }
      )
    }
    
    // Validate each medicine
    for (const medicine of body.medicines) {
      if (!medicine.name?.trim() || !medicine.dosage?.trim()) {
        return NextResponse.json(
          { error: 'Each medicine must have a name and dosage' },
          { status: 400 }
        )
      }
    }
    
    // Create prescription
    const prescription = await prisma.prescription.create({
      data: {
        patientId: params.id,
        clinicId: session.user.clinicId,
        diagnosis: body.diagnosis.trim(),
        medicines: body.medicines,
        visitDate: body.visitDate ? new Date(body.visitDate) : new Date(),
        nextVisitDate: body.nextVisitDate ? new Date(body.nextVisitDate) : null,
        notes: body.notes?.trim() || null,
      },
    })
    
    return NextResponse.json({
      success: true,
      prescription: prescription,
      message: 'Prescription created successfully'
    }, { status: 201 })
    
  } catch (error) {
    console.error('Error creating prescription:', error)
    return NextResponse.json(
      { error: 'Failed to create prescription' },
      { status: 500 }
    )
  }
}