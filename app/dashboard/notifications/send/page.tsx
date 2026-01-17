// app/dashboard/notifications/send/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Define TypeScript interfaces
interface Patient {
  id: string;
  name: string;
  mobile: string;
  age?: number;
  gender?: string;
  hasAppInstalled: boolean;
  [key: string]: any; // For other properties
}

interface BrandingColors {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  logoUrl?: string;
}

export default function SendNotificationPage() {
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatients, setSelectedPatients] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [notificationType, setNotificationType] = useState('reminder');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [branding, setBranding] = useState<BrandingColors>({
    primaryColor: '#3b82f6', // Default blue
    secondaryColor: '#10b981', // Default green
    accentColor: '#8b5cf6' // Default purple
  });

  useEffect(() => {
    fetchPatients();
    fetchBranding();
  }, []);

  const fetchPatients = async () => {
    try {
      const response = await fetch('/api/patients?limit=100');
      const data = await response.json();
      if (data.patients) {
        setPatients(data.patients);
      }
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
  };

  const fetchBranding = async () => {
    try {
      const response = await fetch('/api/clinic/default');
      const data = await response.json();
      
      if (data) {
        setBranding({
          primaryColor: data.primaryColor || '#3b82f6',
          secondaryColor: data.secondaryColor || '#10b981',
          accentColor: data.accentColor || '#8b5cf6',
          logoUrl: data.logoUrl
        });
      }
    } catch (error) {
      console.error('Error fetching branding:', error);
    }
  };

  const handlePatientSelect = (patientId: string) => {
    setSelectedPatients(prev => {
      if (prev.includes(patientId)) {
        return prev.filter(id => id !== patientId);
      } else {
        return [...prev, patientId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedPatients.length === patients.length) {
      setSelectedPatients([]);
    } else {
      setSelectedPatients(patients.map(p => p.id));
    }
  };

  const handleSendNotification = async () => {
    if (selectedPatients.length === 0) {
      alert('Please select at least one patient');
      return;
    }

    if (!message.trim()) {
      alert('Please enter a message');
      return;
    }

    // Removed balance check: if (selectedPatients.length > clinicBalance) {...}

    setLoading(true);

    try {
      // Combine date and time
      const dateTime = scheduledDate && scheduledTime 
        ? `${scheduledDate}T${scheduledTime}:00`
        : new Date().toISOString();

      // Send to each selected patient
      const promises = selectedPatients.map(patientId => 
        fetch('/api/notifications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            patientId,
            message,
            scheduledDate: dateTime,
            type: notificationType,
          }),
        })
      );

      const results = await Promise.all(promises);
      const allSuccessful = results.every(res => res.ok);

      if (allSuccessful) {
        alert(`Notifications sent successfully to ${selectedPatients.length} patients!`);
        router.push('/dashboard/notifications');
      } else {
        alert('Some notifications failed to send. Please try again.');
      }
    } catch (error) {
      console.error('Error sending notifications:', error);
      alert('Failed to send notifications. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickMessage = (text: string) => {
    setMessage(text);
  };

  // Filter patients based on search query
  const filteredPatients = patients.filter((patient) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      patient.name.toLowerCase().includes(query) ||
      patient.mobile.includes(query)
    );
  });

  // Filter patients with app installed
  const patientsWithApp = filteredPatients.filter(p => p.hasAppInstalled);
  const selectedPatientsWithApp = selectedPatients.filter(id => {
    const patient = patients.find(p => p.id === id);
    return patient?.hasAppInstalled;
  });

  // Helper function to apply branding colors
  const getBrandingStyle = (type: 'primary' | 'secondary' | 'accent' = 'primary') => {
    const colorMap = {
      primary: branding.primaryColor,
      secondary: branding.secondaryColor,
      accent: branding.accentColor
    };
    
    return {
      backgroundColor: `${colorMap[type]}15`, // 15 = 8% opacity in hex
      color: colorMap[type],
      borderColor: `${colorMap[type]}30` // 30 = 19% opacity
    };
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Send Notifications</h1>
          <p className="text-gray-600">
            Send push notifications to patients with the app installed
          </p>
        </div>
        {/* Updated: Removed balance display, added branding indicator */}
        <div 
          className="text-sm px-3 py-2 rounded-lg font-medium"
          style={{
            backgroundColor: `${branding.primaryColor}15`,
            color: branding.primaryColor,
            border: `1px solid ${branding.primaryColor}30`
          }}
        >
          <span className="font-bold">Free</span> Push Notifications
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Patients List */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Select Patients</h2>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-500">
                  {selectedPatients.length} selected • {patientsWithApp.length} with app
                </span>
                <button
                  onClick={handleSelectAll}
                  className="text-sm font-medium transition-colors hover:opacity-80"
                  style={{ color: branding.primaryColor }}
                >
                  {selectedPatients.length === filteredPatients.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
            </div>
            
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search patients by name or mobile..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-colors"
                style={{
                  borderColor: `${branding.primaryColor}50`,
                  outlineColor: branding.primaryColor
                }}
              />
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredPatients.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No patients found
                </div>
              ) : (
                filteredPatients.map((patient) => (
                  <div
                    key={patient.id}
                    className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-all duration-200 ${
                      selectedPatients.includes(patient.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    } ${!patient.hasAppInstalled ? 'opacity-60' : ''}`}
                    style={
                      selectedPatients.includes(patient.id)
                        ? {
                            borderColor: branding.primaryColor,
                            backgroundColor: `${branding.primaryColor}15`
                          }
                        : {}
                    }
                    onClick={() => {
                      if (patient.hasAppInstalled) {
                        handlePatientSelect(patient.id);
                      }
                    }}
                  >
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={selectedPatients.includes(patient.id)}
                        onChange={() => {
                          if (patient.hasAppInstalled) {
                            handlePatientSelect(patient.id);
                          }
                        }}
                        disabled={!patient.hasAppInstalled}
                        className="h-4 w-4 rounded focus:ring-blue-500 transition-colors"
                        style={{
                          color: branding.primaryColor,
                          borderColor: `${branding.primaryColor}80`
                        }}
                      />
                      <div>
                        <div className="font-medium">{patient.name}</div>
                        <div className="text-sm text-gray-500">{patient.mobile}</div>
                        {patient.age && <div className="text-xs text-gray-400">Age: {patient.age}</div>}
                      </div>
                    </div>
                    <div className="text-sm">
                      {patient.hasAppInstalled ? (
                        <span 
                          className="font-medium"
                          style={{ color: branding.secondaryColor }}
                        >
                          ✓ App Installed
                        </span>
                      ) : (
                        <span className="text-red-600">✗ No App</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 text-sm text-gray-500">
              <div>
                Selected: {selectedPatientsWithApp.length} patients with app • 
                Total with app: {patientsWithApp.length}
              </div>
              {selectedPatients.length > selectedPatientsWithApp.length && (
                <div className="text-red-500 mt-1">
                  Note: {selectedPatients.length - selectedPatientsWithApp.length} selected patients don't have the app installed
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Message Form */}
        <div className="space-y-6">
          {/* Notification Details */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Notification Details</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  value={notificationType}
                  onChange={(e) => setNotificationType(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-colors"
                  style={{
                    borderColor: `${branding.primaryColor}50`,
                    outlineColor: branding.primaryColor
                  }}
                >
                  <option value="reminder">General Reminder</option>
                  <option value="appointment">Appointment Reminder</option>
                  <option value="medicine">Medicine Reminder</option>
                  <option value="followup">Follow-up</option>
                  <option value="announcement">Announcement</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Schedule Date (Optional)
                </label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-colors"
                  style={{
                    borderColor: `${branding.primaryColor}50`,
                    outlineColor: branding.primaryColor
                  }}
                />
              </div>

              {scheduledDate && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Schedule Time (Optional)
                  </label>
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-colors"
                    style={{
                      borderColor: `${branding.primaryColor}50`,
                      outlineColor: branding.primaryColor
                    }}
                  />
                </div>
              )}

              <div className="text-sm text-gray-500">
                {!scheduledDate ? 
                  'If no date is selected, notification will be sent immediately.' :
                  `Notification will be sent on ${scheduledDate} at ${scheduledTime || '00:00'}`
                }
              </div>
            </div>
          </div>

          {/* Message Box */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Message</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quick Messages
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  'Please take your medicine on time',
                  'Your next appointment is tomorrow',
                  'Don\'t forget to drink water regularly',
                  'Please review your visit on Google',
                  'Follow up with doctor if symptoms persist',
                  'Take rest and avoid strenuous activities',
                ].map((text, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickMessage(text)}
                    className="px-3 py-1 text-sm rounded-full transition-colors duration-200 hover:scale-105"
                    style={getBrandingStyle(
                      index % 3 === 0 ? 'primary' : 
                      index % 3 === 1 ? 'secondary' : 'accent'
                    )}
                  >
                    {text.length > 25 ? text.substring(0, 25) + '...' : text}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Custom Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                placeholder="Type your notification message here..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent resize-none transition-colors"
                style={{
                  borderColor: `${branding.primaryColor}50`,
                  outlineColor: branding.primaryColor
                }}
                maxLength={500}
              />
              <div className="flex justify-between text-sm text-gray-500 mt-1">
                <span>{message.length}/500 characters</span>
                <span 
                  className={message.length > 450 ? 'font-medium' : ''}
                  style={message.length > 450 ? { color: branding.accentColor } : {}}
                >
                  {500 - message.length} characters remaining
                </span>
              </div>
            </div>

            <div className="mt-6 flex space-x-3">
              <button
                onClick={() => router.push('/dashboard/notifications')}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSendNotification}
                disabled={loading || selectedPatientsWithApp.length === 0 || !message.trim()}
                className="flex-1 px-4 py-2 text-white rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
                style={{
                  backgroundColor: branding.primaryColor,
                  borderColor: branding.primaryColor
                }}
                onMouseEnter={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = '';
                  e.currentTarget.style.boxShadow = '';
                }}
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg 
                      className="animate-spin h-5 w-5 mr-2" 
                      viewBox="0 0 24 24"
                      style={{ color: 'white' }}
                    >
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Sending...
                  </span>
                ) : (
                  `Send to ${selectedPatientsWithApp.length} Patients`
                )}
              </button>
            </div>

            {selectedPatients.length > 0 && selectedPatientsWithApp.length === 0 && (
              <div className="mt-4 p-3 border rounded-lg"
                style={{
                  backgroundColor: `${branding.accentColor}15`,
                  borderColor: `${branding.accentColor}30`
                }}
              >
                <p 
                  className="text-sm font-medium"
                  style={{ color: branding.accentColor }}
                >
                  No selected patients have the app installed. Please select patients who have installed the app.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}