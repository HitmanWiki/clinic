"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface ClinicColors {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}

export default function AddPatientPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    mobile: "",
    age: "",
    gender: "",
    visitDate: new Date().toISOString().split('T')[0],
    notes: "",
    askForAppInstallation: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [clinicColors, setClinicColors] = useState<ClinicColors>({
    primaryColor: "#3b82f6",
    secondaryColor: "#10b981",
    accentColor: "#f59e0b",
  });

  // Fetch clinic colors from database
  useEffect(() => {
    const fetchClinicColors = async () => {
      try {
        const response = await fetch('/api/clinic/default');
        if (response.ok) {
          const data = await response.json();
          setClinicColors({
            primaryColor: data.primaryColor || "#3b82f6",
            secondaryColor: data.secondaryColor || "#10b981",
            accentColor: data.accentColor || "#f59e0b",
          });
        }
      } catch (error) {
        console.error("Error fetching clinic colors:", error);
      }
    };

    fetchClinicColors();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!formData.mobile.trim()) {
      newErrors.mobile = "Mobile number is required";
    } else if (!/^\d{10}$/.test(formData.mobile)) {
      newErrors.mobile = "Enter a valid 10-digit mobile number";
    }

    if (!formData.visitDate) {
      newErrors.visitDate = "Visit date is required";
    }

    if (formData.age && (parseInt(formData.age) < 0 || parseInt(formData.age) > 150)) {
      newErrors.age = "Please enter a valid age";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    
    try {
      // Send to real API
      const response = await fetch("/api/patients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          age: formData.age ? parseInt(formData.age) : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to add patient");
      }

      // Show success message
      alert("Patient added successfully!");
      
      // Option to create prescription
      const createPrescription = confirm("Do you want to create a prescription for this patient now?");
      if (createPrescription) {
        router.push(`/dashboard/patients/${data.patient?.id || data.id}/prescriptions/new`);
      } else {
        // Redirect to patients list
        router.push("/dashboard/patients");
      }
      
    } catch (error) {
      console.error("Error adding patient:", error);
      alert(error instanceof Error ? error.message : "Failed to add patient. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Get input border color based on error state
  const getInputBorderColor = (fieldName: string) => {
    return errors[fieldName] 
      ? "border-red-300 focus:border-red-500 focus:ring-red-500" 
      : `border-gray-300 focus:border-[${clinicColors.primaryColor}] focus:ring-[${clinicColors.primaryColor}]`;
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center">
          <Link
            href="/dashboard/patients"
            className="text-gray-600 hover:text-gray-900 mr-4"
          >
            ← Back to Patients
          </Link>
        </div>
        <h1 
          className="text-2xl font-semibold mt-2"
          style={{ color: clinicColors.primaryColor }}
        >
          Add New Patient
        </h1>
        <p className="text-gray-600">Register a new patient in your clinic</p>
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Name Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Patient Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-offset-1 transition-all ${getInputBorderColor('name')}`}
                style={{
                  borderColor: errors.name ? undefined : `${clinicColors.primaryColor}40`,
                  backgroundColor: errors.name ? undefined : `${clinicColors.primaryColor}05`,
                }}
                placeholder="Enter full name"
                disabled={loading}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            {/* Mobile Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mobile Number *
              </label>
              <div className="flex">
                <span 
                  className="inline-flex items-center px-3 rounded-l-md border border-r-0 text-sm"
                  style={{
                    backgroundColor: `${clinicColors.primaryColor}10`,
                    borderColor: `${clinicColors.primaryColor}40`,
                    color: clinicColors.primaryColor,
                  }}
                >
                  +91
                </span>
                <input
                  type="text"
                  name="mobile"
                  value={formData.mobile}
                  onChange={(e) => {
                    // Allow only numbers and limit to 10 digits
                    const value = e.target.value.replace(/\D/g, "").slice(0, 10);
                    setFormData(prev => ({ ...prev, mobile: value }));
                    
                    // Clear error if exists
                    if (errors.mobile) {
                      setErrors(prev => ({ ...prev, mobile: "" }));
                    }
                  }}
                  className={`flex-1 min-w-0 px-4 py-2 rounded-r-lg border focus:ring-2 focus:ring-offset-1 transition-all ${getInputBorderColor('mobile')}`}
                  style={{
                    borderColor: errors.mobile ? undefined : `${clinicColors.primaryColor}40`,
                    backgroundColor: errors.mobile ? undefined : `${clinicColors.primaryColor}05`,
                  }}
                  placeholder="9876543210"
                  disabled={loading}
                />
              </div>
              {errors.mobile && (
                <p className="mt-1 text-sm text-red-600">{errors.mobile}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Will be used for clinic app registration and notifications
              </p>
            </div>

            {/* Age and Gender */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Age (Optional)
                </label>
                <input
                  type="number"
                  name="age"
                  value={formData.age}
                  onChange={handleChange}
                  min="0"
                  max="150"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-offset-1 transition-all ${getInputBorderColor('age')}`}
                  style={{
                    borderColor: errors.age ? undefined : `${clinicColors.primaryColor}40`,
                    backgroundColor: errors.age ? undefined : `${clinicColors.primaryColor}05`,
                  }}
                  placeholder="Age in years"
                  disabled={loading}
                />
                {errors.age && (
                  <p className="mt-1 text-sm text-red-600">{errors.age}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gender (Optional)
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-offset-1 transition-all"
                  style={{
                    borderColor: `${clinicColors.primaryColor}40`,
                    backgroundColor: `${clinicColors.primaryColor}05`,
                  }}
                  disabled={loading}
                >
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            {/* Visit Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Visit Date *
              </label>
              <input
                type="date"
                name="visitDate"
                value={formData.visitDate}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-offset-1 transition-all ${getInputBorderColor('visitDate')}`}
                style={{
                  borderColor: errors.visitDate ? undefined : `${clinicColors.primaryColor}40`,
                  backgroundColor: errors.visitDate ? undefined : `${clinicColors.primaryColor}05`,
                }}
                disabled={loading}
              />
              {errors.visitDate && (
                <p className="mt-1 text-sm text-red-600">{errors.visitDate}</p>
              )}
            </div>

            {/* Mobile App Installation */}
            <div 
              className="border rounded-lg p-4"
              style={{ 
                backgroundColor: `${clinicColors.primaryColor}08`,
                borderColor: `${clinicColors.primaryColor}20`
              }}
            >
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="ask-for-app"
                    name="askForAppInstallation"
                    type="checkbox"
                    checked={formData.askForAppInstallation}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      askForAppInstallation: e.target.checked 
                    }))}
                    className="h-4 w-4 border-gray-300 rounded"
                    style={{
                      color: clinicColors.primaryColor,
                    }}
                    disabled={loading}
                  />
                </div>
                <label htmlFor="ask-for-app" className="ml-3 cursor-pointer">
                  <div 
                    className="text-sm font-medium"
                    style={{ color: clinicColors.primaryColor }}
                  >
                    📱 Recommend Mobile App Installation
                  </div>
                  <p 
                    className="text-sm mt-1"
                    style={{ color: `${clinicColors.primaryColor}90` }}
                  >
                    Ask patient to install the clinic app for:
                  </p>
                  <ul 
                    className="text-sm mt-2 space-y-1"
                    style={{ color: `${clinicColors.primaryColor}80` }}
                  >
                    <li>• Medication reminders via push notifications</li>
                    <li>• Appointment and follow-up reminders</li>
                    <li>• Access to prescriptions anytime</li>
                    <li>• Health tips and educational content</li>
                  </ul>
                </label>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (Optional)
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-offset-1 transition-all"
                style={{
                  borderColor: `${clinicColors.primaryColor}40`,
                  backgroundColor: `${clinicColors.primaryColor}05`,
                }}
                placeholder="Any additional notes about the patient..."
                disabled={loading}
              />
              <p className="mt-1 text-xs text-gray-500">
                Diagnosis, symptoms, or any special instructions
              </p>
            </div>

            {/* Mobile App Benefits */}
            <div 
              className="border rounded-lg p-4"
              style={{ 
                backgroundColor: `${clinicColors.secondaryColor}08`,
                borderColor: `${clinicColors.secondaryColor}20`
              }}
            >
              <h3 
                className="text-sm font-medium mb-2"
                style={{ color: clinicColors.secondaryColor }}
              >
                📱 Clinic Mobile App Benefits
              </h3>
              <p 
                className="text-sm mb-2"
                style={{ color: `${clinicColors.secondaryColor}90` }}
              >
                When patients install the clinic app, they get:
              </p>
              <ul 
                className="text-sm space-y-1"
                style={{ color: `${clinicColors.secondaryColor}80` }}
              >
                <li>• <strong>Push Notifications:</strong> Medication reminders at exact times</li>
                <li>• <strong>Prescription Access:</strong> View all prescriptions anytime</li>
                <li>• <strong>Health Tracking:</strong> Log symptoms and progress</li>
                <li>• <strong>Direct Communication:</strong> Contact clinic through the app</li>
                <li>• <strong>Appointment Management:</strong> Book and manage visits</li>
              </ul>
            </div>

            {/* Form Actions */}
            <div className="flex flex-col sm:flex-row justify-end space-y-4 sm:space-y-0 sm:space-x-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => router.push("/dashboard/patients")}
                className={`px-6 py-2 border rounded-lg text-gray-700 hover:opacity-90 transition-all duration-200 ${
                  loading ? "opacity-50 cursor-not-allowed" : ""
                }`}
                style={{
                  borderColor: `${clinicColors.primaryColor}40`,
                  backgroundColor: `${clinicColors.primaryColor}05`,
                }}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 text-white rounded-lg hover:opacity-90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-sm"
                style={{ 
                  background: `linear-gradient(135deg, ${clinicColors.primaryColor} 0%, ${clinicColors.secondaryColor} 100%)`,
                }}
              >
                {loading ? (
                  <>
                    <div 
                      className="animate-spin rounded-full h-4 w-4 border-b-2 mr-2"
                      style={{ borderColor: 'white' }}
                    ></div>
                    Adding Patient...
                  </>
                ) : (
                  <>
                    <span className="mr-2">➕</span>
                    Add Patient &amp; Send App Invite
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Quick Tips */}
      <div 
        className="mt-8 border rounded-lg p-4"
        style={{ 
          backgroundColor: `${clinicColors.accentColor}08`,
          borderColor: `${clinicColors.accentColor}20`
        }}
      >
        <h3 
          className="text-sm font-medium mb-2"
          style={{ color: clinicColors.accentColor }}
        >
          💡 Tips for Patient Registration
        </h3>
        <ul 
          className="text-sm space-y-1"
          style={{ color: `${clinicColors.accentColor}90` }}
        >
          <li>• <strong>Complete details:</strong> Age and gender help with personalized care</li>
          <li>• <strong>Mobile app:</strong> 85% of patients find medication reminders helpful</li>
          <li>• <strong>Follow-ups:</strong> App users are 3x more likely to return for follow-ups</li>
          <li>• <strong>Communication:</strong> Patients can message directly through the app</li>
          <li>• <strong>After adding:</strong> Create prescription to set up medication reminders</li>
        </ul>
      </div>

      {/* What Happens Next */}
      <div 
        className="mt-6 border rounded-lg p-4"
        style={{ 
          backgroundColor: `${clinicColors.primaryColor}08`,
          borderColor: `${clinicColors.primaryColor}20`
        }}
      >
        <h3 
          className="text-sm font-medium mb-2"
          style={{ color: clinicColors.primaryColor }}
        >
          🔄 What Happens Next
        </h3>
        <div 
          className="text-sm space-y-2"
          style={{ color: `${clinicColors.primaryColor}90` }}
        >
          <div className="flex items-start">
            <div 
              className="rounded-full h-6 w-6 flex items-center justify-center text-xs mr-3 flex-shrink-0"
              style={{ 
                backgroundColor: `${clinicColors.primaryColor}20`,
                color: clinicColors.primaryColor
              }}
            >
              1
            </div>
            <div>Patient receives app installation invite via SMS</div>
          </div>
          <div className="flex items-start">
            <div 
              className="rounded-full h-6 w-6 flex items-center justify-center text-xs mr-3 flex-shrink-0"
              style={{ 
                backgroundColor: `${clinicColors.primaryColor}20`,
                color: clinicColors.primaryColor
              }}
            >
              2
            </div>
            <div>They can download the clinic app from Play Store/App Store</div>
          </div>
          <div className="flex items-start">
            <div 
              className="rounded-full h-6 w-6 flex items-center justify-center text-xs mr-3 flex-shrink-0"
              style={{ 
                backgroundColor: `${clinicColors.primaryColor}20`,
                color: clinicColors.primaryColor
              }}
            >
              3
            </div>
            <div>App automatically links to their profile using mobile number</div>
          </div>
          <div className="flex items-start">
            <div 
              className="rounded-full h-6 w-6 flex items-center justify-center text-xs mr-3 flex-shrink-0"
              style={{ 
                backgroundColor: `${clinicColors.primaryColor}20`,
                color: clinicColors.primaryColor
              }}
            >
              4
            </div>
            <div>You can send push notifications for medications, follow-ups, and health tips</div>
          </div>
        </div>
      </div>
    </div>
  );
}