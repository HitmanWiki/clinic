// app/dashboard/notifications/schedule/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Patient {
  id: string;
  name: string;
  mobile: string;
  hasAppInstalled: boolean;
  [key: string]: any;
}

interface NotificationTemplate {
  id: string;
  name: string;
  type: string;
  message: string;
  daysAfterVisit?: number;
  hoursBeforeAppointment?: number;
  description: string;
}

export default function ScheduleNotificationsPage() {
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [selectedPatients, setSelectedPatients] = useState<string[]>([]);
  const [customDate, setCustomDate] = useState<string>('');
  const [customTime, setCustomTime] = useState<string>('10:00');
  const [loading, setLoading] = useState(false);
  const [clinicBalance, setClinicBalance] = useState(0);

  useEffect(() => {
    fetchPatients();
    fetchTemplates();
    fetchClinicBalance();
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

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/follow-ups/rules');
      const data = await response.json();
      if (data.templates) {
        setTemplates(data.templates);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const fetchClinicBalance = async () => {
    try {
      const response = await fetch('/api/dashboard/stats');
      const data = await response.json();
      if (data.pushNotificationBalance) {
        setClinicBalance(data.pushNotificationBalance);
      }
    } catch (error) {
      console.error('Error fetching clinic balance:', error);
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
    const patientsWithApp = patients.filter(p => p.hasAppInstalled);
    if (selectedPatients.length === patientsWithApp.length) {
      setSelectedPatients([]);
    } else {
      setSelectedPatients(patientsWithApp.map(p => p.id));
    }
  };

  const handleScheduleNotifications = async () => {
    if (selectedPatients.length === 0) {
      alert('Please select at least one patient');
      return;
    }

    if (!selectedTemplate) {
      alert('Please select a template');
      return;
    }

    if (selectedPatients.length > clinicBalance) {
      alert(`Insufficient notification balance. You have ${clinicBalance} notifications remaining, but selected ${selectedPatients.length} patients.`);
      return;
    }

    const template = templates.find(t => t.id === selectedTemplate);
    if (!template) {
      alert('Selected template not found');
      return;
    }

    setLoading(true);

    try {
      // Calculate scheduled date
      let scheduledDate = new Date();
      
      if (customDate) {
        // Use custom date and time
        scheduledDate = new Date(`${customDate}T${customTime || '10:00'}:00`);
      } else if (template.daysAfterVisit) {
        // Schedule for days after visit
        scheduledDate.setDate(scheduledDate.getDate() + template.daysAfterVisit);
        scheduledDate.setHours(10, 0, 0, 0); // Default to 10 AM
      } else if (template.hoursBeforeAppointment) {
        // Schedule for hours before appointment (would need appointment data)
        scheduledDate.setHours(scheduledDate.getHours() + template.hoursBeforeAppointment);
      } else {
        // Default: schedule for tomorrow at 10 AM
        scheduledDate.setDate(scheduledDate.getDate() + 1);
        scheduledDate.setHours(10, 0, 0, 0);
      }

      // Schedule notifications for each selected patient
      const promises = selectedPatients.map(patientId => 
        fetch('/api/notifications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            patientId,
            message: template.message,
            scheduledDate: scheduledDate.toISOString(),
            type: template.type,
          }),
        })
      );

      const results = await Promise.all(promises);
      const allSuccessful = results.every(res => res.ok);

      if (allSuccessful) {
        alert(`${selectedPatients.length} notifications scheduled successfully for ${scheduledDate.toLocaleDateString()}!`);
        router.push('/dashboard/notifications');
      } else {
        alert('Some notifications failed to schedule. Please try again.');
      }
    } catch (error) {
      console.error('Error scheduling notifications:', error);
      alert('Failed to schedule notifications. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getPatientsWithApp = () => patients.filter(p => p.hasAppInstalled);
  const patientsWithApp = getPatientsWithApp();

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Schedule Notifications</h1>
          <p className="text-gray-600">
            Schedule automated notifications using templates
          </p>
        </div>
        <div className="text-sm bg-blue-50 text-blue-700 px-3 py-2 rounded-lg">
          Balance: <span className="font-bold">{clinicBalance}</span> notifications remaining
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Template Selection */}
        <div className="space-y-6">
          {/* Template Selection */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Select Template</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notification Template
                </label>
                <select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select a template...</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedTemplate && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-2">
                    {templates.find(t => t.id === selectedTemplate)?.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    {templates.find(t => t.id === selectedTemplate)?.description}
                  </p>
                  <p className="text-sm text-gray-700 bg-white p-3 rounded border">
                    "{templates.find(t => t.id === selectedTemplate)?.message}"
                  </p>
                </div>
              )}

              {/* Custom Scheduling */}
              <div className="border-t pt-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Custom Schedule (Optional)</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Date</label>
                    <input
                      type="date"
                      value={customDate}
                      onChange={(e) => setCustomDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Time</label>
                    <input
                      type="time"
                      value={customTime}
                      onChange={(e) => setCustomTime(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {customDate 
                    ? `Notifications will be sent on ${customDate} at ${customTime}`
                    : 'Using template default schedule'}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Schedule</h2>
              <span className="text-sm text-gray-500">
                {selectedPatients.length} patients selected
              </span>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleScheduleNotifications}
                disabled={loading || selectedPatients.length === 0 || !selectedTemplate}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Scheduling...
                  </span>
                ) : (
                  `Schedule ${selectedPatients.length} Notifications`
                )}
              </button>

              <button
                onClick={() => router.push('/dashboard/notifications')}
                className="w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>

            {selectedPatients.length > clinicBalance && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm">
                  Insufficient balance. You need {selectedPatients.length - clinicBalance} more notifications.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Patient Selection */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Select Patients</h2>
            <button
              onClick={handleSelectAll}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              {selectedPatients.length === patientsWithApp.length ? 'Deselect All' : 'Select All With App'}
            </button>
          </div>
          
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search patients..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onChange={(e) => {
                // You can implement search filtering here
              }}
            />
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {patientsWithApp.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No patients with app installed found
              </div>
            ) : (
              patientsWithApp.map((patient) => (
                <div
                  key={patient.id}
                  className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedPatients.includes(patient.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => handlePatientSelect(patient.id)}
                >
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={selectedPatients.includes(patient.id)}
                      onChange={() => handlePatientSelect(patient.id)}
                      className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <div>
                      <div className="font-medium">{patient.name}</div>
                      <div className="text-sm text-gray-500">{patient.mobile}</div>
                    </div>
                  </div>
                  <div className="text-sm text-green-600">
                    ✓ App Installed
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-4 pt-4 border-t text-sm text-gray-500">
            <div className="flex justify-between">
              <span>Total with app: {patientsWithApp.length}</span>
              <span>Selected: {selectedPatients.length}</span>
            </div>
            {patients.length - patientsWithApp.length > 0 && (
              <div className="mt-2 text-red-500">
                {patients.length - patientsWithApp.length} patients don't have the app installed
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}