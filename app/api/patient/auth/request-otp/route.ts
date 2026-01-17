// app/api/patient/auth/request-otp/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendOTP } from '@/lib/otp-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phoneNumber, clinicId } = body;

    if (!phoneNumber) {
      return NextResponse.json(
        { success: false, message: 'Phone number is required' },
        {
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        }
      );
    }

    // Clean phone number (remove +, spaces, etc.)
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    const last10Digits = cleanPhone.slice(-10); // Get last 10 digits

    console.log('📱 OTP Request for:', { original: phoneNumber, clean: cleanPhone, last10: last10Digits });

    // Find patient - try multiple formats
    const patient = await prisma.patient.findFirst({
      where: {
        OR: [
          { mobile: cleanPhone }, // Full number with country code
          { mobile: last10Digits }, // Just last 10 digits
          { mobile: `+${cleanPhone}` }, // With plus
        ],
        ...(clinicId && { clinicId }),
      },
      include: {
        clinic: true,
      },
    });

    if (!patient) {
      console.log('❌ Patient not found for phone:', cleanPhone);
      return NextResponse.json(
        { 
          success: false, 
          message: 'Patient not found. Please visit the clinic to register.' 
        },
        {
          status: 404,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        }
      );
    }

    console.log('✅ Patient found:', patient.id, patient.name);

    // Generate OTP (6 digits)
    const otpCode = '123456'; // For development - in production, generate random
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Update patient with OTP
    await prisma.patient.update({
      where: { id: patient.id },
      data: {
        otpCode,
        otpExpiresAt,
      },
    });

    console.log('📝 OTP saved to database for patient:', patient.id);

    // Send OTP via SMS
    const otpSent = await sendOTP(cleanPhone);

    if (!otpSent) {
      console.log('❌ Failed to send OTP via SMS');
      return NextResponse.json(
        { success: false, message: 'Failed to send OTP. Please try again.' },
        {
          status: 500,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        }
      );
    }

    console.log('✅ OTP sent successfully to:', cleanPhone);

    return NextResponse.json({
      success: true,
      message: 'OTP sent successfully',
      data: {
        retryAfter: 60, // seconds
        otpExpiresIn: 300, // seconds (5 minutes)
        demoOTP: process.env.NODE_ENV === 'development' ? otpCode : undefined,
      },
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });

  } catch (error) {
    console.error('❌ OTP request error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}