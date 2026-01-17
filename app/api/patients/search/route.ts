import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');
    
    console.log('📱 Patient search request for phone:', phone);
    
    if (!phone) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }
    
    // Remove country code if present (keep only last 10 digits)
    const phoneDigits = phone.replace(/\D/g, '');
    const phoneWithoutCountryCode = phoneDigits.slice(-10);
    
    console.log('🔍 Searching for phone (last 10 digits):', phoneWithoutCountryCode);
    
    let targetClinicId = null;
    
    // ===== BYPASS AUTH ONLY FOR TEST PHONE =====
    const TEST_PHONE = '+916284958487';
    const TEST_PHONE_DIGITS = '6284958487'; // Last 10 digits
    
    // Check if this is the test phone number
    if (phone === TEST_PHONE || phoneDigits.endsWith(TEST_PHONE_DIGITS)) {
      console.log('🔓 Test phone detected - authentication bypassed');
      
      // Find which clinic this test patient belongs to
      const testPatient = await prisma.patient.findFirst({
        where: {
          mobile: {
            endsWith: TEST_PHONE_DIGITS
          }
        },
        select: {
          clinicId: true,
          name: true
        }
      });
      
      if (testPatient) {
        targetClinicId = testPatient.clinicId;
        console.log(`✅ Found test patient ${testPatient.name} in clinic ${testPatient.clinicId}`);
      } else {
        console.log('❌ Test patient not found in database');
        return NextResponse.json(
          { 
            success: false, 
            message: 'Test patient not found. Please check if patient exists in database.' 
          },
          { status: 404 }
        );
      }
    }
    // ===== NORMAL AUTHENTICATION FOR ALL OTHER REQUESTS =====
    else {
      console.log('🔐 Regular phone - checking authentication');
      
      const session = await getServerSession(authOptions);
      
      if (!session?.user?.clinicId) {
        console.log('❌ Unauthorized - No session or clinicId');
        return NextResponse.json(
          { error: 'Unauthorized. Please login to access patient records.' },
          { status: 401 }
        );
      }
      
      targetClinicId = session.user.clinicId;
      console.log('✅ Authenticated via session, clinicId:', targetClinicId);
    }
    
    // ===== SEARCH PATIENT WITH DETAILS =====
    const patient = await prisma.patient.findFirst({
      where: {
        clinicId: targetClinicId,
        mobile: {
          endsWith: phoneWithoutCountryCode
        }
      },
      include: {
        clinic: {
          select: {
            id: true,
            name: true,
            doctorName: true,
            phone: true,
            email: true,
            address: true,
            city: true,
            logoUrl: true,
            primaryColor: true,
            secondaryColor: true,
            accentColor: true,
            workingHours: true,
            emergencyPhone: true,
            supportEmail: true,
          }
        },
        prescriptions: {
          orderBy: { visitDate: 'desc' },
          take: 1,
          select: {
            id: true,
            visitDate: true,
            diagnosis: true,
            nextVisitDate: true
          }
        }
      }
    });
    
    if (!patient) {
      console.log('❌ Patient not found in clinic:', targetClinicId);
      return NextResponse.json(
        { 
          success: false, 
          message: phone === TEST_PHONE 
            ? 'Test patient exists but not found in expected clinic. Check database.' 
            : 'Patient not found in our records' 
        },
        { status: 404 }
      );
    }
    
    console.log(`✅ Patient found: ${patient.name} (${patient.mobile})`);
    
    // Calculate age
    let age = patient.age || 30;
    if (!patient.age && patient.visitDate) {
      const visitDate = new Date(patient.visitDate);
      const currentDate = new Date();
      age = currentDate.getFullYear() - visitDate.getFullYear();
    }
    
    // Get last visit info
    const lastVisit = patient.prescriptions[0];
    
    const responseData = {
      success: true,
      patient: {
        id: patient.id,
        fullName: patient.name,
        phoneNumber: patient.mobile,
        age: age,
        gender: patient.gender || 'Not specified',
        lastVisit: lastVisit?.visitDate?.toISOString() || patient.visitDate.toISOString(),
        lastDiagnosis: lastVisit?.diagnosis,
        lastDoctor: patient.clinic.doctorName || 'Clinic Doctor',
        medicalRecordNumber: patient.id.slice(-8).toUpperCase(),
        hasAppInstalled: patient.hasAppInstalled,
        lastAppLogin: patient.lastAppLogin?.toISOString(),
        clinicId: patient.clinicId,
        // Include clinic branding info for mobile app
        clinic: patient.clinic
      }
    };
    
    console.log('📦 Sending response data');
    
    return NextResponse.json(responseData);
    
  } catch (error) {
    console.error('❌ Error searching patient:', error);
    
    // Type-safe error handling
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const errorDetails = error instanceof Error ? error.stack : String(error);
    
    return NextResponse.json(
      { 
        error: 'Failed to search patient', 
        details: errorMessage,
        debug: process.env.NODE_ENV === 'development' ? errorDetails : undefined
      },
      { status: 500 }
    );
  }
}