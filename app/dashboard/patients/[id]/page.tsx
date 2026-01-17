"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";

interface Patient {
  id: string;
  name: string;
  mobile: string;
  visitDate: string;
  notes: string;
  followUpStatus: string;
  reviewStatus: string;
  optOut: boolean;
  prescriptionCount: number;
  followUpCount: number;
  age?: number;
  gender?: string;
  hasAppInstalled?: boolean;
}

interface Prescription {
  id: string;
  date: string;
  diagnosis: string;
  medicines: Medicine[];
  enablePushReminders?: boolean;
}

interface Medicine {
  name: string;
  dosage: string;
  duration: string;
  instructions: string;
}

interface Notification {
  id: string;
  type: string;
  scheduledDate: string;
  message: string;
  status: string;
  category: string;
}

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

// Branding color defaults
const DEFAULT_BRANDING = {
  primaryColor: '#3b82f6', // blue-600
  secondaryColor: '#1e40af', // blue-800
  accentColor: '#10b981', // green-500
};

export default function PatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [clinicBranding, setClinicBranding] = useState<ClinicBranding | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "prescriptions" | "notifications" | "activity">("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add debugging
  useEffect(() => {
    console.log('🔍 Patient detail page loaded with params:', params);
    console.log('🔍 Patient ID from params:', params.id);
    console.log('🔍 Session status:', sessionStatus);
    console.log('🔍 Session:', session);
  }, [params, sessionStatus, session]);

  // Fetch clinic branding data
  useEffect(() => {
    fetchClinicBranding();
  }, []);

  const fetchClinicBranding = async () => {
    try {
      const response = await fetch('/api/clinic/default');
      if (response.ok) {
        const brandingData = await response.json();
        console.log('✅ Clinic branding loaded:', brandingData);
        setClinicBranding(brandingData);
      } else {
        console.log('⚠️ Using default branding');
        setClinicBranding(null);
      }
    } catch (error) {
      console.error('❌ Error fetching clinic branding:', error);
      setClinicBranding(null);
    }
  };

  // Fetch real data from API
  useEffect(() => {
    if (sessionStatus === "loading") return; // Wait for session to load
    
    fetchPatientData();
  }, [params.id, sessionStatus]);

  const fetchPatientData = async () => {
    try {
      setLoading(true);
      setError(null);

      const patientId = params.id;
      console.log(`🔄 Fetching data for patient ID: ${patientId}`);
      console.log(`🔗 API URL: /api/patients/${patientId}`);

      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      try {
        // Fetch patient details
        const patientResponse = await fetch(`/api/patients/${patientId}`, {
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        console.log(`📊 Response status: ${patientResponse.status}`);
        console.log(`📊 Response ok: ${patientResponse.ok}`);

        // Get response as text first
        const responseText = await patientResponse.text();
        console.log(`📊 Raw response (first 500 chars):`, responseText.substring(0, 500));

        if (!patientResponse.ok) {
          // Try to parse error
          let errorData = { error: 'Unknown error' };
          try {
            if (responseText) {
              errorData = JSON.parse(responseText);
              console.log('📊 Error data parsed:', errorData);
            }
          } catch (e) {
            console.log('📊 Could not parse error response as JSON');
            errorData = { error: responseText || 'Unknown error' };
          }

          if (patientResponse.status === 404) {
            throw new Error(`Patient not found: ${errorData.error || 'Unknown error'}`);
          }
          
          throw new Error(`Failed to fetch patient (${patientResponse.status}): ${errorData.error || 'Unknown error'}`);
        }

        // Parse successful response
        const patientData = JSON.parse(responseText);
        console.log("✅ Patient data received successfully:", patientData);

        // Check if API returns patient object or direct patient data
        let patientInfo;
        if (patientData.patient) {
          patientInfo = patientData.patient;
        } else {
          patientInfo = patientData;
        }

        if (!patientInfo || !patientInfo.id) {
          throw new Error('Patient data not found in response');
        }

        setPatient({
          id: patientInfo.id,
          name: patientInfo.name,
          mobile: patientInfo.mobile,
          visitDate: patientInfo.visitDate,
          notes: patientInfo.notes || "",
          followUpStatus: patientInfo.followUpStatus || "pending",
          reviewStatus: patientInfo.reviewStatus || "pending",
          optOut: patientInfo.optOut || false,
          prescriptionCount: patientInfo.prescriptionCount || 0,
          followUpCount: patientInfo.followUpCount || 0,
          age: patientInfo.age,
          gender: patientInfo.gender,
          hasAppInstalled: patientInfo.hasAppInstalled || false,
        });

        // Fetch prescriptions for this patient
        try {
          console.log(`🔗 Fetching prescriptions: /api/patients/${patientId}/prescriptions`);
          const prescriptionsResponse = await fetch(`/api/patients/${patientId}/prescriptions`, {
            signal: controller.signal
          });
          if (prescriptionsResponse.ok) {
            const prescriptionsData = await prescriptionsResponse.json();
            console.log('✅ Prescriptions data:', prescriptionsData);
            
            // FIX HERE: The API returns direct array, not wrapped in 'prescriptions'
            if (Array.isArray(prescriptionsData)) {
              setPrescriptions(prescriptionsData);
            } else if (prescriptionsData.prescriptions) {
              // Handle if API changes to return wrapped object
              setPrescriptions(prescriptionsData.prescriptions);
            } else {
              setPrescriptions([]);
            }
          } else {
            console.log(`⚠️ Prescriptions API returned ${prescriptionsResponse.status}`);
            setPrescriptions([]);
          }
        } catch (prescriptionsError) {
          console.error('⚠️ Could not fetch prescriptions:', prescriptionsError);
          setPrescriptions([]);
        }

        // Fetch notifications for this patient
        try {
          console.log(`🔗 Fetching notifications: /api/patients/${patientId}/notifications`);
          const notificationsResponse = await fetch(`/api/patients/${patientId}/notifications`, {
            signal: controller.signal
          });
          if (notificationsResponse.ok) {
            const notificationsData = await notificationsResponse.json();
            console.log('✅ Notifications data:', notificationsData);
            setNotifications(notificationsData.notifications || []);
          } else {
            console.log(`⚠️ Notifications API returned ${notificationsResponse.status}`);
            setNotifications([]);
          }
        } catch (notificationsError) {
          console.error('⚠️ Could not fetch notifications:', notificationsError);
          setNotifications([]);
        }

      } catch (fetchError: any) {
        console.error('❌ Fetch error:', fetchError);
        if (fetchError.name === 'AbortError') {
          throw new Error('Request timeout. Please try again.');
        }
        throw fetchError;
      }

    } catch (error) {
      console.error("❌ Error in fetchPatientData:", error);
      setError(error instanceof Error ? error.message : "Failed to load patient data");
      setPatient(null);
      setPrescriptions([]);
      setNotifications([]);
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

  // Get clinic name for display
  const getClinicName = () => {
    return clinicBranding?.name || 'Clinic Portal';
  };

  // Get doctor name for display
  const getDoctorName = () => {
    return clinicBranding?.doctorName || 'Doctor';
  };

  const handleSendPushNotification = () => {
    if (patient?.optOut) {
      alert("This patient has opted out of notifications.");
      return;
    }
    if (!patient?.hasAppInstalled) {
      alert("Patient needs to install the mobile app to receive push notifications.");
      return;
    }
    router.push(`/dashboard/notifications/send?patientId=${patient.id}`);
  };

  const handleOptOutToggle = async () => {
    if (!patient) return;
    
    try {
      const response = await fetch(`/api/patients/${patient.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          optOut: !patient.optOut,
        }),
      });

      if (response.ok) {
        const updatedPatient = { ...patient, optOut: !patient.optOut };
        setPatient(updatedPatient);
        alert(`Patient ${updatedPatient.optOut ? "opted out" : "opted in"} of push notifications`);
      } else {
        throw new Error("Failed to update opt-out status");
      }
    } catch (error) {
      console.error("Error updating opt-out status:", error);
      alert("Failed to update opt-out status");
    }
  };

  const handleRequestAppInstall = () => {
    if (!patient) return;
    
    // Use clinic branding if available
    const clinicName = getClinicName();
    const message = clinicBranding 
      ? `${clinicName} app installation link sent to +91 ${patient.mobile}`
      : `App installation link sent to +91 ${patient.mobile}`;
    
    alert(message);
    // In production, you would call an API to send SMS with app download link
  };

  // Safely get patient initials
  const getPatientInitials = () => {
    if (!patient?.name) return "??";
    return patient.name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  // Format date safely
  const formatDate = (dateString?: string) => {
    if (!dateString) return "Not specified";
    try {
      return new Date(dateString).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch (error) {
      return "Invalid date";
    }
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return "Not specified";
    try {
      return new Date(dateString).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      return "Invalid date";
    }
  };

  if (loading) {
    const colors = getBrandingColors();
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div 
          className="animate-spin rounded-full h-12 w-12 border-b-2"
          style={{ borderColor: colors.primaryColor }}
        ></div>
        <span className="ml-4 text-gray-600">Loading patient data...</span>
      </div>
    );
  }

  if (error || !patient) {
    const colors = getBrandingColors();
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">😕</div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          {error ? "Error loading patient" : "Patient not found"}
        </h2>
        <p className="text-gray-600 mb-4">{error || "The patient you're looking for doesn't exist."}</p>
        <div className="flex justify-center gap-4">
          <button
            onClick={fetchPatientData}
            className="px-4 py-2 text-white rounded-lg hover:opacity-90 transition-opacity"
            style={{ backgroundColor: colors.primaryColor }}
          >
            Try Again
          </button>
          <Link
            href="/dashboard/patients"
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
          >
            Back to Patients
          </Link>
        </div>
      </div>
    );
  }

  // Get branding colors
  const colors = getBrandingColors();

  return (
    <div>
      {/* Header with Actions */}
      <div className="mb-6">
        <div className="flex items-center mb-4">
          <Link
            href="/dashboard/patients"
            className="text-gray-600 hover:text-gray-900 mr-4"
          >
            ← Back to Patients
        </Link>
        </div>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between">
          <div>
            <div className="flex items-center">
              <div 
                className="h-16 w-16 rounded-full flex items-center justify-center mr-4"
                style={{ 
                  backgroundColor: `${colors.primaryColor}15`, // 15 = ~10% opacity
                  color: colors.primaryColor 
                }}
              >
                <span className="text-2xl font-medium">
                  {getPatientInitials()}
                </span>
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">{patient.name}</h1>
                <div className="flex flex-wrap items-center gap-3 mt-1">
                  <p className="text-gray-600">+91 {patient.mobile}</p>
                  {patient.age && (
                    <span className="text-sm text-gray-600">Age: {patient.age}</span>
                  )}
                  {patient.gender && (
                    <span className="text-sm text-gray-600">Gender: {patient.gender}</span>
                  )}
                  <div className="flex gap-2">
                    <span className={`text-xs px-2 py-1 rounded ${
                      patient.hasAppInstalled 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      📱 {patient.hasAppInstalled ? 'App Installed' : 'No App'}
                    </span>
                    <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                      Prescriptions: {patient.prescriptionCount}
                    </span>
                    <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                      Notifications: {patient.followUpCount}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 mt-4 md:mt-0">
            <button
              onClick={handleSendPushNotification}
              disabled={!patient.hasAppInstalled || patient.optOut}
              className={`px-4 py-2 border border-gray-300 rounded-lg ${
                patient.hasAppInstalled && !patient.optOut
                  ? 'text-gray-700 hover:bg-gray-50'
                  : 'text-gray-400 cursor-not-allowed'
              }`}
            >
              Send Push Notification
            </button>
            <Link
              href={`/dashboard/patients/${patient.id}/prescriptions/new`}
              className="px-4 py-2 text-white rounded-lg hover:opacity-90 transition-opacity"
              style={{ backgroundColor: colors.accentColor }}
            >
              + New Prescription
            </Link>
            <button
              onClick={() => router.push(`/dashboard/notifications/schedule?patientId=${patient.id}`)}
              className="px-4 py-2 text-white rounded-lg hover:opacity-90 transition-opacity"
              style={{ backgroundColor: colors.primaryColor }}
            >
              Schedule Notification
            </button>
          </div>
        </div>
      </div>

      {/* App Installation Banner - Updated with branding */}
      {!patient.hasAppInstalled && (
        <div className="mb-6 p-4 rounded-lg border"
          style={{ 
            backgroundColor: `${colors.accentColor}15`,
            borderColor: `${colors.accentColor}30`
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="mr-3" style={{ color: colors.accentColor }}>📱</span>
              <div>
                <p className="text-sm font-medium" style={{ color: colors.accentColor }}>
                  Patient doesn't have the {getClinicName()} app installed
                </p>
                <p className="text-xs mt-1" style={{ color: `${colors.accentColor}90` }}>
                  Push notifications require the mobile app. Ask them to download it for medication reminders and follow-ups.
                </p>
              </div>
            </div>
            <button
              onClick={handleRequestAppInstall}
              className="px-3 py-1.5 text-white text-sm rounded-lg hover:opacity-90 transition-opacity"
              style={{ backgroundColor: colors.accentColor }}
            >
              Send App Link
            </button>
          </div>
        </div>
      )}

      {/* Tabs - Updated with branding */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: "overview", label: "Overview", icon: "📋" },
            { id: "prescriptions", label: "Prescriptions", icon: "💊" },
            { id: "notifications", label: "Notifications", icon: "🔔" },
            { id: "activity", label: "Activity", icon: "📈" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 inline-flex items-center border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? `text-${colors.primaryColor.replace('#', '')} border-${colors.primaryColor.replace('#', '')}`
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
              style={activeTab === tab.id ? {
                color: colors.primaryColor,
                borderBottomColor: colors.primaryColor
              } : {}}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Patient Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <>
              {/* Patient Details Card */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Patient Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Full Name</label>
                    <p className="text-gray-900">{patient.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Mobile Number</label>
                    <p className="text-gray-900">+91 {patient.mobile}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Age</label>
                    <p className="text-gray-900">{patient.age || "Not specified"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Gender</label>
                    <p className="text-gray-900">{patient.gender || "Not specified"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Last Visit</label>
                    <p className="text-gray-900">{formatDate(patient.visitDate)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">App Status</label>
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      patient.hasAppInstalled 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {patient.hasAppInstalled ? 'App Installed' : 'No App'}
                    </span>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-gray-500">Notes</label>
                    <p className="text-gray-900 mt-1">{patient.notes || "No notes added"}</p>
                  </div>
                </div>
              </div>

              {/* Recent Prescriptions Preview */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-medium text-gray-900">Recent Prescriptions</h2>
                  <Link
                    href={`/dashboard/patients/${patient.id}/prescriptions/new`}
                    className="text-sm hover:opacity-90 transition-opacity"
                    style={{ color: colors.primaryColor }}
                  >
                    + Add New
                  </Link>
                </div>
                
                {prescriptions.length > 0 ? (
                  <div className="space-y-4">
                    {prescriptions.slice(0, 2).map((prescription) => (
                      <div key={prescription.id} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-medium text-gray-900">
                              {formatDate(prescription.date)}
                            </h3>
                            <p className="text-sm text-gray-600">{prescription.diagnosis}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {prescription.enablePushReminders && (
                              <span 
                                className="text-xs px-2 py-1 rounded"
                                style={{ 
                                  backgroundColor: `${colors.accentColor}15`,
                                  color: colors.accentColor
                                }}
                              >
                                🔔 Push Enabled
                              </span>
                            )}
                            <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                              {prescription.medicines?.length || 0} medicines
                            </span>
                          </div>
                        </div>
                        <div className="text-sm">
                          {prescription.medicines?.slice(0, 2).map((medicine, idx) => (
                            <div key={idx} className="flex items-center text-gray-700 mb-1">
                              <span 
                                className="w-2 h-2 rounded-full mr-2"
                                style={{ backgroundColor: colors.primaryColor }}
                              ></span>
                              {medicine.name} - {medicine.dosage}
                            </div>
                          ))}
                          {prescription.medicines && prescription.medicines.length > 2 && (
                            <p className="text-gray-500 text-xs mt-1">
                              +{prescription.medicines.length - 2} more medicines
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <div className="text-3xl mb-2">💊</div>
                    <p className="text-gray-600 mb-4">No prescriptions yet</p>
                    <Link
                      href={`/dashboard/patients/${patient.id}/prescriptions/new`}
                      className="px-4 py-2 text-white rounded-lg hover:opacity-90 transition-opacity text-sm"
                      style={{ backgroundColor: colors.accentColor }}
                    >
                      Create First Prescription
                    </Link>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Prescriptions Tab */}
          {activeTab === "prescriptions" && (
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-medium text-gray-900">All Prescriptions</h2>
                  <Link
                    href={`/dashboard/patients/${patient.id}/prescriptions/new`}
                    className="px-4 py-2 text-white rounded-lg hover:opacity-90 transition-opacity text-sm"
                    style={{ backgroundColor: colors.accentColor }}
                  >
                    + New Prescription
                  </Link>
                </div>
              </div>
              
              {prescriptions.length > 0 ? (
                <div className="divide-y divide-gray-200">
                  {prescriptions.map((prescription) => (
                    <div key={prescription.id} className="p-6 hover:bg-gray-50">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-medium text-gray-900">
                            Prescription from {formatDate(prescription.date)}
                          </h3>
                          <p className="text-sm text-gray-600">Diagnosis: {prescription.diagnosis}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {prescription.enablePushReminders && (
                            <span 
                              className="text-xs px-2 py-1 rounded"
                              style={{ 
                                backgroundColor: `${colors.accentColor}15`,
                                color: colors.accentColor
                              }}
                            >
                              🔔 Push Enabled
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {prescription.medicines && prescription.medicines.length > 0 && (
                        <div className="bg-gray-50 rounded-lg p-4">
                          <h4 className="font-medium text-gray-900 mb-2">Medicines</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {prescription.medicines.map((medicine, idx) => (
                              <div key={idx} className="bg-white rounded border border-gray-200 p-3 hover:border-gray-300 transition-colors">
                                <div className="flex justify-between items-start">
                                  <h5 className="font-medium text-gray-900">{medicine.name}</h5>
                                  <span 
                                    className="text-xs px-2 py-1 rounded"
                                    style={{ 
                                      backgroundColor: `${colors.primaryColor}15`,
                                      color: colors.primaryColor
                                    }}
                                  >
                                    {medicine.dosage}
                                  </span>
                                </div>
                                <div className="text-sm text-gray-600 mt-1">
                                  <div>Duration: {medicine.duration}</div>
                                  {medicine.instructions && (
                                    <div>Instructions: {medicine.instructions}</div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">💊</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No prescriptions yet</h3>
                  <p className="text-gray-600 mb-6">Create the first prescription for this patient</p>
                  <Link
                    href={`/dashboard/patients/${patient.id}/prescriptions/new`}
                    className="px-6 py-3 text-white rounded-lg hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: colors.accentColor }}
                  >
                    Create First Prescription
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === "notifications" && (
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-medium text-gray-900">Push Notifications</h2>
                  <button
                    onClick={() => router.push(`/dashboard/notifications/schedule?patientId=${patient.id}`)}
                    className="px-4 py-2 text-white rounded-lg hover:opacity-90 transition-opacity text-sm"
                    style={{ backgroundColor: colors.primaryColor }}
                  >
                    + Schedule Notification
                  </button>
                </div>
              </div>
              
              {notifications.length > 0 ? (
                <div className="divide-y divide-gray-200">
                  {notifications.map((notification) => (
                    <div key={notification.id} className="p-6 hover:bg-gray-50">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-gray-900 capitalize">
                              {notification.type} Notification
                            </h3>
                            <span 
                              className="text-xs px-2 py-0.5 rounded"
                              style={{ 
                                backgroundColor: `${colors.primaryColor}15`,
                                color: colors.primaryColor
                              }}
                            >
                              {notification.category}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          notification.status === 'delivered' ? 'bg-green-100 text-green-800' :
                          notification.status === 'read' ? 'bg-purple-100 text-purple-800' :
                          notification.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {notification.status}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        <div>Scheduled: {formatDateTime(notification.scheduledDate)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">🔔</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications scheduled</h3>
                  <p className="text-gray-600 mb-4">
                    {patient.hasAppInstalled 
                      ? "Create push notifications for this patient"
                      : `Patient needs to install the ${getClinicName()} app to receive push notifications`
                    }
                  </p>
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={() => router.push(`/dashboard/notifications/schedule?patientId=${patient.id}`)}
                      className="px-6 py-3 text-white rounded-lg hover:opacity-90 transition-opacity"
                      style={{ backgroundColor: colors.primaryColor }}
                    >
                      Schedule Notification
                    </button>
                    {!patient.hasAppInstalled && (
                      <button
                        onClick={handleRequestAppInstall}
                        className="px-6 py-3 text-white rounded-lg hover:opacity-90 transition-opacity"
                        style={{ backgroundColor: colors.accentColor }}
                      >
                        Send App Link
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Activity Tab */}
          {activeTab === "activity" && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-6">Patient Activity</h2>
              
              <div className="space-y-6">
                {/* App Usage */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">📱 App Usage</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    {patient.hasAppInstalled ? (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700">App Installed</span>
                          <span className="font-medium" style={{ color: colors.accentColor }}>Yes</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700">Push Notifications Enabled</span>
                          <span className="font-medium" style={{ color: colors.accentColor }}>Yes</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700">Last App Login</span>
                          <span className="text-gray-900">{formatDate(patient.visitDate)}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-gray-600">Patient hasn't installed the {getClinicName()} app yet</p>
                        <button
                          onClick={handleRequestAppInstall}
                          className="mt-3 px-4 py-2 text-white rounded-lg hover:opacity-90 transition-opacity text-sm"
                          style={{ backgroundColor: colors.accentColor }}
                        >
                          Send App Installation Link
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Communication Summary */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">💬 Communication Summary</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div 
                      className="p-3 rounded-lg"
                      style={{ backgroundColor: `${colors.primaryColor}10` }}
                    >
                      <div 
                        className="text-lg font-bold"
                        style={{ color: colors.primaryColor }}
                      >
                        {prescriptions.length}
                      </div>
                      <div 
                        className="text-sm"
                        style={{ color: colors.primaryColor }}
                      >
                        Prescriptions
                      </div>
                    </div>
                    <div 
                      className="p-3 rounded-lg"
                      style={{ backgroundColor: `${colors.accentColor}10` }}
                    >
                      <div 
                        className="text-lg font-bold"
                        style={{ color: colors.accentColor }}
                      >
                        {notifications.length}
                      </div>
                      <div 
                        className="text-sm"
                        style={{ color: colors.accentColor }}
                      >
                        Notifications
                      </div>
                    </div>
                    <div className="bg-purple-50 p-3 rounded-lg">
                      <div className="text-lg font-bold text-purple-600">
                        {notifications.filter(n => n.status === 'delivered' || n.status === 'read').length}
                      </div>
                      <div className="text-sm text-purple-800">Delivered</div>
                    </div>
                    <div className="bg-yellow-50 p-3 rounded-lg">
                      <div className="text-lg font-bold text-yellow-600">
                        {notifications.filter(n => n.status === 'pending').length}
                      </div>
                      <div className="text-sm text-yellow-800">Pending</div>
                    </div>
                  </div>
                </div>

                {/* Recent Activity Timeline */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">📈 Recent Activity</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="space-y-4">
                      {prescriptions.slice(0, 3).map((prescription) => (
                        <div key={prescription.id} className="flex items-start">
                          <div 
                            className="rounded-full h-6 w-6 flex items-center justify-center text-xs mr-3 flex-shrink-0"
                            style={{ 
                              backgroundColor: `${colors.accentColor}15`,
                              color: colors.accentColor
                            }}
                          >
                            💊
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">New Prescription</div>
                            <div className="text-sm text-gray-600">
                              {formatDate(prescription.date)} • {prescription.diagnosis}
                            </div>
                          </div>
                        </div>
                      ))}
                      {notifications.slice(0, 3).map((notification) => (
                        <div key={notification.id} className="flex items-start">
                          <div 
                            className="rounded-full h-6 w-6 flex items-center justify-center text-xs mr-3 flex-shrink-0"
                            style={{ 
                              backgroundColor: `${colors.primaryColor}15`,
                              color: colors.primaryColor
                            }}
                          >
                            🔔
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 capitalize">{notification.type} Notification</div>
                            <div className="text-sm text-gray-600">
                              {formatDate(notification.scheduledDate)} • {notification.status}
                            </div>
                          </div>
                        </div>
                      ))}
                      {prescriptions.length === 0 && notifications.length === 0 && (
                        <div className="text-center py-4 text-gray-500">
                          No recent activity
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Actions & Status */}
        <div className="space-y-6">
          {/* Status Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Patient Status</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Push Notifications</span>
                <button
                  onClick={handleOptOutToggle}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                    patient.optOut ? 'bg-red-600' : 'bg-green-600'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                    patient.optOut ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">App Status</span>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  patient.hasAppInstalled 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {patient.hasAppInstalled ? 'Installed' : 'Not Installed'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Last Activity</span>
                <span className="text-gray-900 font-medium text-sm">
                  {prescriptions.length > 0 
                    ? formatDate(prescriptions[0].date)
                    : formatDate(patient.visitDate)
                  }
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Notifications Status</span>
                <span 
                  className={`text-sm font-medium`}
                  style={{ 
                    color: notifications.length > 0 ? colors.primaryColor : '#6b7280'
                  }}
                >
                  {notifications.length} scheduled
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Link
                href={`/dashboard/patients/${patient.id}/prescriptions/new`}
                className="block w-full text-left px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center">
                  <span className="mr-3">💊</span>
                  <span>New Prescription</span>
                </div>
              </Link>
              <button
                onClick={handleSendPushNotification}
                disabled={!patient.hasAppInstalled || patient.optOut}
                className={`block w-full text-left px-4 py-3 border border-gray-200 rounded-lg transition-colors ${
                  patient.hasAppInstalled && !patient.optOut
                    ? 'hover:bg-gray-50'
                    : 'opacity-50 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center">
                  <span className="mr-3">🔔</span>
                  <span>
                    Send Push Notification
                    {patient.optOut && ' (Opted Out)'}
                    {!patient.hasAppInstalled && ' (No App)'}
                  </span>
                </div>
              </button>
              <button
                onClick={() => router.push(`/dashboard/notifications/schedule?patientId=${patient.id}`)}
                className="block w-full text-left px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center">
                  <span className="mr-3">⏰</span>
                  <span>Schedule Notification</span>
                </div>
              </button>
              {!patient.hasAppInstalled && (
                <button
                  onClick={handleRequestAppInstall}
                  className="block w-full text-left px-4 py-3 rounded-lg transition-colors"
                  style={{ 
                    backgroundColor: `${colors.accentColor}10`,
                    border: `1px solid ${colors.accentColor}30`,
                    color: colors.accentColor
                  }}
                >
                  <div className="flex items-center">
                    <span className="mr-3">📱</span>
                    <span>Send App Installation Link</span>
                  </div>
                </button>
              )}
            </div>
          </div>

          {/* Upcoming Notifications */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Upcoming Notifications</h2>
            <div className="space-y-3">
              {notifications.filter(n => n.status === 'pending').length > 0 ? (
                notifications
                  .filter(n => n.status === 'pending')
                  .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
                  .slice(0, 3)
                  .map((notification) => (
                    <div 
                      key={notification.id} 
                      className="flex items-center justify-between p-3 rounded-lg"
                      style={{ 
                        backgroundColor: `${colors.primaryColor}10`,
                        border: `1px solid ${colors.primaryColor}20`
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <div 
                          className="font-medium truncate capitalize"
                          style={{ color: colors.primaryColor }}
                        >
                          {notification.type}
                        </div>
                        <div 
                          className="text-sm"
                          style={{ color: `${colors.primaryColor}80` }}
                        >
                          {formatDateTime(notification.scheduledDate)}
                        </div>
                      </div>
                      <span 
                        className="px-2 py-1 text-xs rounded ml-2 flex-shrink-0"
                        style={{ 
                          backgroundColor: `${colors.primaryColor}20`,
                          color: colors.primaryColor
                        }}
                      >
                        Pending
                      </span>
                    </div>
                  ))
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-600 text-sm">No upcoming notifications</p>
                  <button
                    onClick={() => router.push(`/dashboard/notifications/schedule?patientId=${patient.id}`)}
                    className="mt-2 text-sm hover:opacity-90 transition-opacity"
                    style={{ color: colors.primaryColor }}
                  >
                    Schedule one →
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}