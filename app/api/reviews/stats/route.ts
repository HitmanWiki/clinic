// /app/api/reviews/stats/route.ts
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

    const clinicId = token.clinicId as string;
    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Get all reviews for the clinic
    const reviews = await prisma.review.findMany({
      where: { clinicId },
    });

    // Calculate stats
    const totalRequests = reviews.length;
    const receivedReviews = reviews.filter(r => r.status === 'received').length;
    
    const receivedWithRating = reviews.filter(r => r.rating);
    const averageRating = receivedWithRating.length > 0 
      ? receivedWithRating.reduce((sum, r) => sum + (r.rating || 0), 0) / receivedWithRating.length
      : 0;

    const responseRate = totalRequests > 0 ? (receivedReviews / totalRequests) * 100 : 0;

    const thisMonth = reviews.filter(r => 
      r.requestDate >= startOfThisMonth
    ).length;

    const lastMonth = reviews.filter(r => 
      r.requestDate >= startOfLastMonth && r.requestDate <= endOfLastMonth
    ).length;

    return NextResponse.json({
      totalRequests,
      receivedReviews,
      averageRating: parseFloat(averageRating.toFixed(1)),
      responseRate: parseFloat(responseRate.toFixed(1)),
      thisMonth,
      lastMonth,
    });
  } catch (error) {
    console.error('Error fetching review stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}