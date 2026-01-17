// app/api/reviews/schedule-bulk/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.clinicId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { patientIds, platform = 'google', deliveryMethod = 'push' } = body;
    
    if (!patientIds || !Array.isArray(patientIds) || patientIds.length === 0) {
      return NextResponse.json({ error: 'Patient IDs array is required' }, { status: 400 });
    }
    
    // Get clinic info
    const clinic = await prisma.clinics.findUnique({
      where: { id: session.user.clinicId },
      select: { googleReviewLink: true, name: true }
    });
    
    if (!clinic) {
      return NextResponse.json({ error: 'Clinic not found' }, { status: 404 });
    }
    
    // Get patients that belong to this clinic and have app installed
    const patients = await prisma.patients.findMany({
      where: {
        id: { in: patientIds },
        clinicId: session.user.clinicId,
        app_installations: {
          some: {
            isActive: true
          }
        }
      },
      select: {
        id: true,
        name: true,
        mobile: true,
      }
    });
    
    if (patients.length === 0) {
      return NextResponse.json({ 
        error: 'No eligible patients found',
        message: 'Selected patients either don\'t belong to your clinic or don\'t have the app installed.'
      }, { status: 400 });
    }
    
    // Check for existing recent review requests
    const recentReviews = await prisma.reviews.findMany({
      where: {
        patientId: { in: patients.map(p => p.id) },
        clinicId: session.user.clinicId,
        status: { in: ['pending', 'sent'] },
        requestDate: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      },
      select: {
        patientId: true,
        status: true,
        requestDate: true,
      }
    });
    
    const existingPatientIds = recentReviews.map(r => r.patientId);
    const eligiblePatients = patients.filter(p => !existingPatientIds.includes(p.id));
    
    if (eligiblePatients.length === 0) {
      return NextResponse.json({ 
        error: 'All selected patients already have pending review requests',
        message: 'Review requests have already been sent to these patients in the last 7 days.',
        existingReviews: recentReviews.length
      }, { status: 400 });
    }
    
    // Create review data objects
    const reviewRequests = await Promise.all(
      eligiblePatients.map(patient => {
        const reviewData = {
          patientId: patient.id,
          clinicId: session.user.clinicId,
          platform,
          deliveryMethod,
          status: 'pending' as const,
          requestDate: new Date(),
        };
        
        return prisma.reviews.create({
          data: reviewData as any, // Type assertion to fix TypeScript error
          select: {
            id: true,
            patientId: true,
            status: true,
            requestDate: true,
          }
        });
      })
    );
    
    return NextResponse.json({
      success: true,
      message: `Review requests scheduled for ${reviewRequests.length} patients`,
      scheduled: reviewRequests.length,
      skipped: patients.length - eligiblePatients.length,
      existingRequests: existingPatientIds.length,
      reviews: reviewRequests,
      clinicReviewLink: clinic.googleReviewLink,
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error scheduling bulk reviews:', error);
    return NextResponse.json({ 
      error: 'Failed to schedule review requests',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}