// /app/api/reviews/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET
    });
    
    if (!token || !token.clinicId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';
    const patientId = searchParams.get('patientId');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50;
    
    // Build where clause
    const where: any = { clinicId: token.clinicId as string };
    
    if (patientId) {
      where.patientId = patientId;
    }
    
    if (status !== 'all') {
      where.status = status;
    }

    const reviews = await prisma.review.findMany({
      where,
      include: {
        patient: {
          select: {
            name: true,
            mobile: true,
            fcmToken: true,
          },
        },
      },
      orderBy: { requestDate: 'desc' },
      take: limit,
    });

    // Format reviews for frontend
    const formattedReviews = reviews.map((review) => ({
      id: review.id,
      patientId: review.patientId,
      patientName: review.patient.name,
      patientMobile: review.patient.mobile,
      patientFcmToken: review.patient.fcmToken,
      requestDate: review.requestDate.toISOString(),
      sentDate: review.sentDate?.toISOString(),
      receivedDate: review.receivedDate?.toISOString(),
      status: review.status,
      rating: review.rating,
      reviewText: review.reviewText,
      platform: review.platform,
      deliveryMethod: review.deliveryMethod, // Changed from channel to deliveryMethod
      scheduledDate: review.scheduledDate?.toISOString(),
      createdAt: review.createdAt.toISOString(),
      
      // Status flags for easier frontend use
      isPending: review.status === 'pending',
      isSent: review.status === 'sent',
      isReceived: review.status === 'received',
      isSkipped: review.status === 'skipped',
      isFailed: review.status === 'failed',
      
      // Date formatting for display
      requestDateFormatted: review.requestDate.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
    }));

    return NextResponse.json({ 
      reviews: formattedReviews,
      total: reviews.length,
      stats: {
        pending: reviews.filter(r => r.status === 'pending').length,
        sent: reviews.filter(r => r.status === 'sent').length,
        received: reviews.filter(r => r.status === 'received').length,
        skipped: reviews.filter(r => r.status === 'skipped').length,
        failed: reviews.filter(r => r.status === 'failed').length,
      }
    });
    
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET
    });
    
    if (!token || !token.clinicId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      patientId, 
      platform = 'google',
      deliveryMethod = 'push',
      scheduledDate,
      messageTemplate
    } = body;
    
    // Validate required fields
    if (!patientId) {
      return NextResponse.json({ error: 'Patient ID is required' }, { status: 400 });
    }
    
    // Check if patient belongs to this clinic
    const patient = await prisma.patient.findFirst({
      where: {
        id: patientId,
        clinicId: token.clinicId as string,
      },
      include: {
        appInstallations: {
          where: { isActive: true },
          take: 1
        }
      }
    });
    
    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }
    
    // Get clinic info for review link
    const clinic = await prisma.clinic.findUnique({
      where: { id: token.clinicId as string },
      select: { googleReviewLink: true, name: true }
    });
    
    if (!clinic) {
      return NextResponse.json({ error: 'Clinic not found' }, { status: 404 });
    }
    
    // For push delivery, check if patient has app installed
    if (deliveryMethod === 'push' && patient.appInstallations.length === 0) {
      return NextResponse.json({ 
        error: 'Patient does not have the app installed',
        message: 'Cannot send push notification. Patient needs to install the app first.'
      }, { status: 400 });
    }
    
    // Check if a review request already exists for this patient (pending or sent recently)
    const existingReview = await prisma.review.findFirst({
      where: {
        patientId,
        clinicId: token.clinicId as string,
        status: { in: ['pending', 'sent'] },
        requestDate: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      }
    });
    
    if (existingReview) {
      return NextResponse.json({ 
        error: 'Review request already sent',
        message: 'A review request has already been sent to this patient recently.',
        existingReview: {
          id: existingReview.id,
          status: existingReview.status,
          requestDate: existingReview.requestDate,
        }
      }, { status: 400 });
    }
    
    // Create review request
    const review = await prisma.review.create({
      data: {
        patientId,
        clinicId: token.clinicId as string,
        platform,
        deliveryMethod,
        status: 'pending',
        requestDate: new Date(),
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
      },
      include: {
        patient: {
          select: {
            name: true,
            mobile: true,
          }
        }
      }
    });
    
    // If scheduled for future, it will be sent later
    // If no scheduled date, send immediately (in a real app, you'd trigger sending logic here)
    
    return NextResponse.json({
      success: true,
      message: scheduledDate ? 'Review request scheduled' : 'Review request created',
      review: {
        id: review.id,
        patientName: review.patient.name,
        patientMobile: review.patient.mobile,
        platform: review.platform,
        deliveryMethod: review.deliveryMethod,
        status: review.status,
        requestDate: review.requestDate,
        scheduledDate: review.scheduledDate,
      },
      clinicReviewLink: clinic.googleReviewLink,
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error creating review request:', error);
    return NextResponse.json({ 
      error: 'Failed to create review request',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}