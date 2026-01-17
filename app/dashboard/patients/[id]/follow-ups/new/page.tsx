"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface ClinicBranding {
  id: string;
  name: string;
  doctorName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  workingHours?: string;
  emergencyPhone?: string;
  supportEmail?: string;
}

// Default branding colors
const DEFAULT_BRANDING = {
  primaryColor: '#3b82f6', // blue-600
  secondaryColor: '#1e40af', // blue-800
  accentColor: '#10b981', // green-500
};

export default function NewPatientFollowUpPage() {
  const { data: session } = useSession();
  const params = useParams();
  const router = useRouter();
  const patientId = params.id as string;
  
  const [patient, setPatient] = useState<any>(null);
  const [clinicBranding, setClinicBranding] = useState<ClinicBranding | null>(null);
  const [loading, setLoading] = useState(true);
  const [scheduling, setScheduling] = useState(false);
  
  // Form state
  const [followUpType, setFollowUpType] = useState("medication");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("19:00");
  const [customMessage, setCustomMessage] = useState("");
  const [appInstalled, setAppInstalled] = useState(false);
  
  // Fetch clinic branding
  useEffect(() => {
    fetchClinicBranding();
  }, []);
  
  useEffect(() => {
    if (clinicBranding) {
      fetchPatientDetails();
      // Set default date to tomorrow at 7:00 PM
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setScheduledDate(tomorrow.toISOString().split('T')[0]);
      // Default time to 7:00 PM (19:00)
      setScheduledTime("19:00");
    }
  }, [clinicBranding]);
  
  const fetchClinicBranding = async () => {
    try {
      const response = await fetch('/api/clinic/default');
      if (response.ok) {
        const data = await response.json();
        setClinicBranding(data);
        console.log('✅ Clinic branding loaded:', data);
      } else {
        console.log('⚠️ Using default branding');
        setClinicBranding(null);
      }
    } catch (error) {
      console.error('❌ Error fetching clinic branding:', error);
      setClinicBranding(null);
    }
  };
  
  const fetchPatientDetails = async () => {
    try {
      const response = await fetch(`/api/patients/${patientId}`);
      if (response.ok) {
        const data = await response.json();
        setPatient(data.patient);
        setAppInstalled(data.patient?.hasAppInstalled || false);
      }
    } catch (error) {
      console.error("Error fetching patient:", error);
    } finally {
      setLoading(false);
    }
  };
  
  // Helper function to get branding colors
  const getBrandingColors = () => {
    if (!clinicBranding) return DEFAULT_BRANDING;
    
    return {
      primaryColor: clinicBranding.primaryColor || DEFAULT_BRANDING.primaryColor,
      secondaryColor: clinicBranding.secondaryColor || DEFAULT_BRANDING.secondaryColor,
      accentColor: clinicBranding.accentColor || DEFAULT_BRANDING.accentColor,
    };
  };
  
  // Get clinic name
  const getClinicName = () => {
    return clinicBranding?.name || (session?.user?.name?.split(' ')[0] || "Dr.") + "'s Clinic";
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!session?.user?.clinicId || !patientId) {
      alert("Please log in to schedule notifications");
      return;
    }
    
    // Combine date and time
    const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
    
    setScheduling(true);
    
    try {
      const response = await fetch(`/api/patients/${patientId}/notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: followUpType,
          scheduledDate: scheduledDateTime.toISOString(),
          message: customMessage || getDefaultMessage(followUpType),
          category: getNotificationCategory(followUpType),
          important: followUpType === "medication" || followUpType === "appointment",
        }),
      });
      
      if (response.ok) {
        alert("Push notification scheduled successfully!");
        router.push(`/dashboard/patients/${patientId}`);
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error || "Failed to schedule notification"}`);
      }
    } catch (error) {
      console.error("Error scheduling notification:", error);
      alert("Failed to schedule notification. Please try again.");
    } finally {
      setScheduling(false);
    }
  };
  
  const getDefaultMessage = (type: string) => {
    const clinicName = getClinicName();
    const messages: Record<string, string> = {
      medication: `Reminder to take your medication as prescribed. Hope you're feeling better, ${patient?.name || ""}! - ${clinicName}`,
      followup: `Follow-up reminder from ${clinicName}. How are you feeling after your visit?`,
      appointment: `Reminder for your upcoming appointment at ${clinicName}. Please arrive 10 minutes early.`,
      review: `Hope you're feeling better! If you had a good experience, please leave ${clinicName} a review in the app.`,
      health_tip: `Health Tip from ${clinicName}: Remember to drink plenty of water and get adequate rest.`,
      custom: customMessage || `Personal message from ${clinicName}`,
    };
    return messages[type];
  };
  
  const getNotificationCategory = (type: string) => {
    const categories: Record<string, string> = {
      medication: "reminder",
      followup: "followup",
      appointment: "appointment",
      review: "review",
      health_tip: "health_tip",
      custom: "custom",
    };
    return categories[type] || "custom";
  };
  
  const getTypeDescription = (type: string) => {
    const descriptions: Record<string, string> = {
      medication: "Medication reminder (high priority)",
      followup: "Treatment follow-up check",
      appointment: "Appointment reminder",
      review: "Request for app review",
      health_tip: "General health tip",
      custom: "Custom notification",
    };
    return descriptions[type];
  };
  
  if (loading) {
    const colors = getBrandingColors();
    return (
      <div className="p-8 text-center">
        <div 
          className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto"
          style={{ borderColor: colors.primaryColor }}
        ></div>
        <p className="mt-4 text-gray-600">Loading patient details...</p>
      </div>
    );
  }
  
  const colors = getBrandingColors();
  
  // Helper function to create button style
  const getButtonStyle = (isActive: boolean) => {
    if (!isActive) return {};
    
    return {
      borderColor: colors.primaryColor,
      backgroundColor: `${colors.primaryColor}10`,
      color: colors.primaryColor,
      boxShadow: `0 0 0 2px ${colors.primaryColor}20`
    };
  };
  
  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/dashboard/patients/${patientId}`}
          className="hover:opacity-90 transition-opacity flex items-center mb-4"
          style={{ color: colors.primaryColor }}
        >
          ← Back to Patient
        </Link>
        <h1 className="text-2xl font-semibold text-gray-900">
          Schedule Push Notification for {patient?.name || "Patient"}
        </h1>
        <p className="text-gray-600">
          Send push notifications to patient's mobile app
        </p>
      </div>
      
      {/* App Status Banner */}
      {!appInstalled && (
        <div 
          className="mb-6 p-4 rounded-lg border"
          style={{ 
            backgroundColor: `${colors.accentColor}10`,
            borderColor: `${colors.accentColor}30`
          }}
        >
          <div className="flex items-center">
            <span className="mr-3" style={{ color: colors.accentColor }}>⚠️</span>
            <div>
              <p className="text-sm font-medium" style={{ color: colors.accentColor }}>
                Patient doesn't have the {getClinicName()} app installed
              </p>
              <p className="text-xs mt-1" style={{ color: `${colors.accentColor}90` }}>
                This notification will only work if the patient has installed the clinic app.
                Consider asking them to download it during their next visit.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6">
        {/* Notification Type */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notification Type
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {[
              { value: "medication", label: "💊 Medication", icon: "💊" },
              { value: "followup", label: "👨‍⚕️ Follow-up", icon: "👨‍⚕️" },
              { value: "appointment", label: "📅 Appointment", icon: "📅" },
              { value: "review", label: "⭐ Review", icon: "⭐" },
              { value: "health_tip", label: "💡 Health Tip", icon: "💡" },
              { value: "custom", label: "📝 Custom", icon: "📝" },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setFollowUpType(option.value)}
                className={`px-4 py-3 rounded-lg border text-center transition-all ${
                  followUpType === option.value
                    ? "ring-2"
                    : "border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400"
                }`}
                style={getButtonStyle(followUpType === option.value)}
              >
                <div className="flex flex-col items-center">
                  <span className="text-xl mb-1">{option.icon}</span>
                  <span className="text-sm font-medium">{option.label.replace(option.icon, "").trim()}</span>
                </div>
              </button>
            ))}
          </div>
          <p className="mt-2 text-sm text-gray-600">
            {getTypeDescription(followUpType)}
          </p>
        </div>
        
        {/* Date and Time */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Schedule Date
            </label>
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
              style={{ '--tw-ring-color': colors.primaryColor } as React.CSSProperties}
              required
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Schedule Time
            </label>
            <select
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
              style={{ '--tw-ring-color': colors.primaryColor } as React.CSSProperties}
            >
              <option value="09:00">9:00 AM</option>
              <option value="10:00">10:00 AM</option>
              <option value="11:00">11:00 AM</option>
              <option value="12:00">12:00 PM</option>
              <option value="13:00">1:00 PM</option>
              <option value="14:00">2:00 PM</option>
              <option value="15:00">3:00 PM</option>
              <option value="16:00">4:00 PM</option>
              <option value="17:00">5:00 PM</option>
              <option value="18:00">6:00 PM</option>
              <option value="19:00">7:00 PM</option>
              <option value="20:00">8:00 PM</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Best times: 9-11 AM or 7-9 PM
            </p>
          </div>
        </div>
        
        {/* Custom Message */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notification Message
          </label>
          <textarea
            value={customMessage || getDefaultMessage(followUpType)}
            onChange={(e) => setCustomMessage(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
            style={{ '--tw-ring-color': colors.primaryColor } as React.CSSProperties}
            rows={4}
            placeholder="Enter your notification message..."
            maxLength={200}
          />
          <div className="flex justify-between mt-1">
            <p className="text-xs text-gray-500">
              Max 200 characters. Keep it short and clear.
            </p>
            <p className="text-xs text-gray-500">
              {customMessage.length || getDefaultMessage(followUpType).length}/200
            </p>
          </div>
        </div>
        
        {/* Priority Setting */}
        <div className="mb-6">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={followUpType === "medication" || followUpType === "appointment"}
              readOnly
              className="h-4 w-4 border-gray-300 rounded focus:ring-2"
              style={{ 
                '--tw-ring-color': colors.primaryColor,
                color: colors.primaryColor
              } as React.CSSProperties}
            />
            <span className="ml-2 text-sm text-gray-700">
              High Priority Notification
            </span>
          </label>
          <p className="mt-1 text-xs text-gray-500">
            Medication and appointment reminders are automatically marked as high priority.
          </p>
        </div>
        
        {/* Preview */}
        <div 
          className="mb-8 p-4 rounded-lg border"
          style={{ 
            backgroundColor: `${colors.primaryColor}5`,
            borderColor: `${colors.primaryColor}20`
          }}
        >
          <div className="flex justify-between items-center mb-2">
            <div className="text-sm font-medium" style={{ color: colors.primaryColor }}>
              Preview
            </div>
            <div className="flex items-center">
              <span className="text-xs text-gray-500 mr-2">Mobile App Notification</span>
              <span 
                className="text-xs px-2 py-1 rounded"
                style={{ 
                  backgroundColor: `${colors.primaryColor}20`,
                  color: colors.primaryColor
                }}
              >
                📱
              </span>
            </div>
          </div>
          <div className="p-4 bg-white border border-gray-300 rounded-lg shadow-sm">
            <div className="flex items-start mb-2">
              <div 
                className="h-8 w-8 rounded-full flex items-center justify-center mr-3"
                style={{ 
                  backgroundColor: `${colors.primaryColor}15`,
                  color: colors.primaryColor
                }}
              >
                <span className="font-medium">
                  {session?.user?.name?.charAt(0) || "D"}
                </span>
              </div>
              <div className="flex-1">
                <div className="font-medium text-gray-900">
                  {getClinicName()}
                </div>
                <div className="text-xs text-gray-500">
                  Now • Clinic App
                </div>
              </div>
            </div>
            <div className="text-gray-700 whitespace-pre-wrap text-sm">
              {customMessage || getDefaultMessage(followUpType)}
            </div>
            <div className="mt-3 text-xs text-gray-500">
              Scheduled for {new Date(`${scheduledDate}T${scheduledTime}`).toLocaleString('en-IN', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
              })}
            </div>
            {!appInstalled && (
              <div 
                className="mt-2 text-xs flex items-center"
                style={{ color: colors.accentColor }}
              >
                <span className="mr-1">⚠️</span>
                Will only deliver if patient installs the {getClinicName()} app
              </div>
            )}
          </div>
        </div>
        
        {/* Submit */}
        <div className="flex justify-end space-x-4">
          <Link
            href={`/dashboard/patients/${patientId}`}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={scheduling}
            className="px-4 py-2 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            style={{ backgroundColor: colors.primaryColor }}
          >
            {scheduling ? (
              <>
                <div 
                  className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"
                ></div>
                Scheduling...
              </>
            ) : (
              <>
                <span className="mr-2">⏰</span>
                Schedule Notification
              </>
            )}
          </button>
        </div>
      </form>
      
      {/* Tips Section */}
      <div 
        className="mt-6 rounded-lg border p-4"
        style={{ 
          backgroundColor: `${colors.primaryColor}5`,
          borderColor: `${colors.primaryColor}20`
        }}
      >
        <h3 
          className="text-sm font-medium mb-2 flex items-center"
          style={{ color: colors.primaryColor }}
        >
          <span className="mr-2">💡</span> Push Notification Best Practices
        </h3>
        <ul className="text-sm space-y-1" style={{ color: `${colors.primaryColor}90` }}>
          <li>• Best delivery times: 9-11 AM and 7-9 PM</li>
          <li>• Keep messages under 200 characters</li>
          <li>• Personalize with patient's name when possible</li>
          <li>• Medication reminders should include specific times</li>
          <li>• Follow-ups work best 2-3 days after visit</li>
          <li>• Review requests should be sent 3-5 days after treatment</li>
        </ul>
      </div>
    </div>
  );
}