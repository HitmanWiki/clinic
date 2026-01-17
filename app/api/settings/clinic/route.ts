import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

// GET: Fetch clinic settings
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.clinicId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clinic = await prisma.clinics.findUnique({
      where: {
        id: session.user.clinicId,
      },
    });

    if (!clinic) {
      return NextResponse.json({ error: 'Clinic not found' }, { status: 404 });
    }

    // Parse settings JSON if it exists
    let settings = {};
    if (clinic.settings && typeof clinic.settings === 'string') {
      try {
        settings = JSON.parse(clinic.settings as string);
      } catch (error) {
        console.error('Error parsing settings:', error);
      }
    } else if (clinic.settings) {
      settings = clinic.settings;
    }

    // Default settings structure for your notification-only system
    const defaultSettings = {
      notificationAutomation: true,
      reviewAutomation: true,
      pushNotificationsEnabled: true,
      workingHoursStart: "09:00",
      workingHoursEnd: "20:00",
      appointmentReminders: true,
      medicineReminders: true,
      followUpReminders: true,
      reviewRequests: true,
      autoScheduling: true,
      timezone: "Asia/Kolkata",
      notificationSound: true,
      notificationVibration: true,
    };

    const responseData = {
      id: clinic.id,
      name: clinic.name,
      doctorName: clinic.doctorName,
      phone: clinic.phone,
      email: clinic.email || "",
      address: clinic.address,
      city: clinic.city,
      googleReviewLink: clinic.googleReviewLink || "",
      language: clinic.language as "en" | "hinglish",
      subscriptionPlan: clinic.subscriptionPlan,
      subscriptionStatus: clinic.subscriptionStatus,
      
      // Updated fields from your schema
      hasAppUsers: clinic.hasAppUsers,
      pushDeliveryRate: clinic.pushDeliveryRate,
      pushNotificationBalance: clinic.pushNotificationBalance,
      
      settings: {
        ...defaultSettings,
        ...settings,
      },
      
      // Timestamps
      createdAt: clinic.createdAt.toISOString(),
      updatedAt: clinic.updatedAt.toISOString(),
    };

    return NextResponse.json(responseData);
    
  } catch (error) {
    console.error('Error fetching clinic settings:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// PUT: Update clinic settings
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.clinicId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { settings, pushNotificationBalance, ...clinicData } = body;

    // Prepare update data
    const updateData: any = {
      ...clinicData,
    };

    // Handle settings JSON
    if (settings) {
      updateData.settings = settings;
    }

    // Only allow specific fields to be updated (prevent unauthorized changes)
    const allowedFields = [
      'name', 'doctorName', 'email', 'address', 'city', 
      'googleReviewLink', 'language', 'settings'
    ];
    
    // Filter update data to only include allowed fields
    const filteredUpdateData: any = {};
    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key)) {
        filteredUpdateData[key] = updateData[key];
      }
    });

    // Remove id from update data if present
    if (filteredUpdateData.id) {
      delete filteredUpdateData.id;
    }

    // Update clinic
    const updatedClinic = await prisma.clinics.update({
      where: {
        id: session.user.clinicId,
      },
      data: filteredUpdateData,
    });

    // Parse settings for response
    let parsedSettings = {};
    if (updatedClinic.settings && typeof updatedClinic.settings === 'string') {
      try {
        parsedSettings = JSON.parse(updatedClinic.settings as string);
      } catch (error) {
        console.error('Error parsing settings:', error);
      }
    } else if (updatedClinic.settings) {
      parsedSettings = updatedClinic.settings;
    }

    // Default settings for response
    const defaultSettings = {
      notificationAutomation: true,
      reviewAutomation: true,
      pushNotificationsEnabled: true,
      workingHoursStart: "09:00",
      workingHoursEnd: "20:00",
      appointmentReminders: true,
      medicineReminders: true,
      followUpReminders: true,
      reviewRequests: true,
      autoScheduling: true,
      timezone: "Asia/Kolkata",
      notificationSound: true,
      notificationVibration: true,
    };

    const responseData = {
      id: updatedClinic.id,
      name: updatedClinic.name,
      doctorName: updatedClinic.doctorName,
      phone: updatedClinic.phone,
      email: updatedClinic.email || "",
      address: updatedClinic.address,
      city: updatedClinic.city,
      googleReviewLink: updatedClinic.googleReviewLink || "",
      language: updatedClinic.language,
      subscriptionPlan: updatedClinic.subscriptionPlan,
      subscriptionStatus: updatedClinic.subscriptionStatus,
      
      // Updated fields from your schema
      hasAppUsers: updatedClinic.hasAppUsers,
      pushDeliveryRate: updatedClinic.pushDeliveryRate,
      pushNotificationBalance: updatedClinic.pushNotificationBalance,
      
      settings: {
        ...defaultSettings,
        ...parsedSettings,
      },
      
      // Timestamps
      createdAt: updatedClinic.createdAt.toISOString(),
      updatedAt: updatedClinic.updatedAt.toISOString(),
    };

    return NextResponse.json({
      success: true,
      message: 'Clinic settings updated successfully',
      clinic: responseData
    });
    
  } catch (error) {
    console.error('Error updating clinic settings:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// PATCH: Update specific settings (like notification balance)
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.clinicId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      pushNotificationBalance, 
      pushDeliveryRate, 
      hasAppUsers,
      settings 
    } = body;

    // Prepare update data - only allow specific operational fields
    const updateData: any = {};

    if (pushNotificationBalance !== undefined) {
      // Can only add to balance, not set arbitrary value
      if (pushNotificationBalance > 0) {
        updateData.pushNotificationBalance = {
          increment: pushNotificationBalance
        };
      }
    }

    if (pushDeliveryRate !== undefined) {
      updateData.pushDeliveryRate = pushDeliveryRate;
    }

    if (hasAppUsers !== undefined) {
      updateData.hasAppUsers = hasAppUsers;
    }

    if (settings) {
      // Merge settings with existing settings
      const clinic = await prisma.clinics.findUnique({
        where: { id: session.user.clinicId },
        select: { settings: true }
      });

      let existingSettings = {};
      if (clinic?.settings) {
        if (typeof clinic.settings === 'string') {
          try {
            existingSettings = JSON.parse(clinic.settings);
          } catch (error) {
            console.error('Error parsing existing settings:', error);
          }
        } else {
          existingSettings = clinic.settings;
        }
      }

      updateData.settings = {
        ...existingSettings,
        ...settings
      };
    }

    // Update clinic
    const updatedClinic = await prisma.clinics.update({
      where: {
        id: session.user.clinicId,
      },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      message: 'Clinic data updated successfully',
      updates: Object.keys(updateData),
      pushNotificationBalance: updatedClinic.pushNotificationBalance,
      pushDeliveryRate: updatedClinic.pushDeliveryRate,
      hasAppUsers: updatedClinic.hasAppUsers,
    });
    
  } catch (error) {
    console.error('Error updating clinic data:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}