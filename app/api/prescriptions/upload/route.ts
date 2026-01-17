// /app/api/prescriptions/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { randomUUID } from 'crypto';

// Helper function to generate unique filename
function generateUniqueFileName(originalName: string): string {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const extension = originalName.split('.').pop();
  return `${timestamp}-${randomString}.${extension}`;
}

// GET - Get uploaded prescriptions for a patient
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');
    const clinicId = request.headers.get('clinicId') || session.user?.clinicId;

    if (!patientId || !clinicId) {
      return NextResponse.json(
        { error: 'Patient ID and Clinic ID required' },
        { status: 400 }
      );
    }

    // Get uploaded prescriptions from database
    const uploads = await prisma.uploaded_prescriptions.findMany({
      where: {
        patient_id: patientId,
        clinic_id: clinicId,
      },
      orderBy: {
        uploaded_at: 'desc',
      },
    });

    // Convert snake_case to camelCase for frontend
    const formattedUploads = uploads.map(upload => ({
      id: upload.id,
      fileName: upload.file_name,
      fileUrl: upload.file_url,
      fileType: upload.file_type,
      fileSize: upload.file_size,
      uploadedBy: upload.uploaded_by,
      uploadedAt: upload.uploaded_at?.toISOString() || new Date().toISOString(),
      patientId: upload.patient_id,
      clinicId: upload.clinic_id,
    }));

    return NextResponse.json({ uploads: formattedUploads });
  } catch (error) {
    console.error('Error fetching uploaded prescriptions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Upload prescription file
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const patientId = formData.get('patientId') as string;
    const clinicId = formData.get('clinicId') as string || session.user?.clinicId;

    if (!file || !patientId || !clinicId) {
      return NextResponse.json(
        { error: 'Missing required fields: file, patientId, clinicId' },
        { status: 400 }
      );
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 10MB limit' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: JPG, PNG, GIF, PDF, DOC, DOCX' },
        { status: 400 }
      );
    }

    // Verify patient belongs to clinic - Use 'patient' (singular) model
    const patient = await prisma.patient.findUnique({
      where: { 
        id: patientId,
        clinicId: clinicId 
      },
    });

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    // Generate unique filename
    const fileName = generateUniqueFileName(file.name);
    
    // Define upload directory
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'prescriptions');
    
    // Create directory if it doesn't exist
    if (!existsSync(uploadDir)) {
      mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = join(uploadDir, fileName);
    const fileUrl = `/uploads/prescriptions/${fileName}`;

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Save to database
    const uploadedPrescription = await prisma.uploaded_prescriptions.create({
      data: {
        file_name: file.name,
        file_url: fileUrl,
        file_type: file.type,
        file_size: file.size,
        uploaded_by: session.user?.name || 'Doctor',
        patient_id: patientId,
        clinic_id: clinicId,
      },
    });

    // Format response
    const formattedResponse = {
      id: uploadedPrescription.id,
      fileName: uploadedPrescription.file_name,
      fileUrl: uploadedPrescription.file_url,
      fileType: uploadedPrescription.file_type,
      fileSize: uploadedPrescription.file_size,
      uploadedBy: uploadedPrescription.uploaded_by,
      uploadedAt: uploadedPrescription.uploaded_at?.toISOString() || new Date().toISOString(),
      patientId: uploadedPrescription.patient_id,
      clinicId: uploadedPrescription.clinic_id,
    };

    return NextResponse.json({
      success: true,
      upload: formattedResponse,
      message: 'Prescription uploaded successfully',
    });
  } catch (error) {
    console.error('Error uploading prescription:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete uploaded prescription
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const uploadId = searchParams.get('uploadId');
    const clinicId = request.headers.get('clinicId') || session.user?.clinicId;

    if (!uploadId || !clinicId) {
      return NextResponse.json(
        { error: 'Upload ID and Clinic ID required' },
        { status: 400 }
      );
    }

    // Get the upload to verify ownership
    const upload = await prisma.uploaded_prescriptions.findUnique({
      where: { 
        id: uploadId,
        clinic_id: clinicId,
      },
    });

    if (!upload) {
      return NextResponse.json({ error: 'Upload not found' }, { status: 404 });
    }

    // Delete file from filesystem
    try {
      const filePath = join(process.cwd(), 'public', upload.file_url);
      await unlink(filePath);
    } catch (fileError) {
      console.warn('Could not delete file, continuing with database deletion:', fileError);
    }

    // Delete from database
    await prisma.uploaded_prescriptions.delete({
      where: { id: uploadId },
    });

    return NextResponse.json({
      success: true,
      message: 'Prescription deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting prescription:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}