// app/api/patient/auth/verify-otp/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phoneNumber, otpCode } = body;

    if (!phoneNumber || !otpCode) {
      return NextResponse.json(
        { success: false, message: 'Phone number and OTP are required' },
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

    // Clean phone number
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    const last10Digits = cleanPhone.slice(-10);

    console.log('🔐 OTP Verification for:', { 
      original: phoneNumber, 
      clean: cleanPhone,
      otp: otpCode 
    });

    // Find patient - try multiple formats
    const patient = await prisma.patient.findFirst({
      where: {
        OR: [
          { mobile: cleanPhone },
          { mobile: last10Digits },
          { mobile: `+${cleanPhone}` },
        ],
      },
      include: {
        clinic: true,
      },
    });

    if (!patient) {
      console.log('❌ Patient not found for verification');
      return NextResponse.json(
        { success: false, message: 'Patient not found' },
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

    console.log('✅ Patient found for verification:', patient.id);

    // DEVELOPMENT MODE: Accept any OTP that's 6 digits
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    if (isDevelopment) {
      console.log('🛠️ Development mode: Checking OTP format');
      // Accept any 6-digit number in development
      if (otpCode.length !== 6 || !/^\d+$/.test(otpCode)) {
        return NextResponse.json(
          { success: false, message: 'Invalid OTP format. Use 6 digits.' },
          { status: 401 }
        );
      }
      console.log('🛠️ Development mode: OTP accepted');
    } else {
      // PRODUCTION: Check actual OTP from database
      if (!patient.otpCode || patient.otpCode !== otpCode) {
        console.log('❌ OTP mismatch:', { stored: patient.otpCode, received: otpCode });
        return NextResponse.json(
          { success: false, message: 'Invalid OTP' },
          { status: 401 }
        );
      }

      if (!patient.otpExpiresAt || patient.otpExpiresAt < new Date()) {
        console.log('❌ OTP expired:', patient.otpExpiresAt);
        return NextResponse.json(
          { success: false, message: 'OTP expired. Please request a new one.' },
          { status: 401 }
        );
      }
    }

    // Clear OTP after successful verification (even in development)
    await prisma.patient.update({
      where: { id: patient.id },
      data: {
        otpCode: null,
        otpExpiresAt: null,
        isVerified: true,
        lastAppLogin: new Date(),
      },
    });

    console.log('✅ OTP cleared, patient verified');

    // Create JWT token
    const token = jwt.sign(
      {
        patientId: patient.id,
        clinicId: patient.clinicId,
        mobile: patient.mobile,
        type: 'patient',
      },
      process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
      { expiresIn: '30d' }
    );

    // Prepare patient data (exclude sensitive info)
    const patientData = {
      id: patient.id,
      name: patient.name,
      mobile: patient.mobile,
      clinicId: patient.clinicId,
      clinicName: patient.clinic?.name || 'Clinic',
      clinicPhone: patient.clinic?.phone,
      clinicAddress: patient.clinic?.address,
      age: patient.age,
      gender: patient.gender,
      lastVisit: patient.visitDate,
      hasAppInstalled: patient.hasAppInstalled,
      isVerified: true,
    };

    console.log('✅ Login successful for patient:', patient.name);

    return NextResponse.json({
      success: true,
      message: 'OTP verified successfully',
      data: {
        token,
        patient: patientData,
      },
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });

  } catch (error: any) {
    console.error('❌ OTP verification error:', error);
    
    // Handle JWT errors
    if (error.name === 'JsonWebTokenError') {
      return NextResponse.json(
        { success: false, message: 'Token generation failed' },
        { status: 500 }
      );
    }

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