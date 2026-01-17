// /app/dashboard/settings/notifications/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

interface BrandingColors {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  logoUrl?: string;
}

export default function NotificationSettingsPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    // Appointment reminders
    appointmentReminders: true,
    appointmentReminderHours: 24,
    
    // Medicine reminders
    medicineReminders: true,
    
    // Follow-up notifications
    followUpDay2: true,
    followUpDay7: true,
    followUpDay30: false,
    
    // Review requests
    reviewRequests: true,
    reviewRequestDelay: 3, // days after treatment
    
    // Clinic updates
    clinicUpdates: true,
    healthTips: true,
  });

  const [branding, setBranding] = useState<BrandingColors>({
    primaryColor: '#3b82f6',
    secondaryColor: '#10b981',
    accentColor: '#8b5cf6'
  });

  useEffect(() => {
    fetchBranding();
  }, []);

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

  const handleSave = async () => {
    setLoading(true);
    try {
      // Save settings to database
      const response = await fetch("/api/clinic/notification-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clinicId: session?.user?.clinicId,
          settings,
        }),
      });
      
      if (response.ok) {
        alert("Settings saved successfully!");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Failed to save settings");
    } finally {
      setLoading(false);
    }
  };

  // Helper function to apply branding colors
  const getBrandingStyle = (type: 'primary' | 'secondary' | 'accent' = 'primary') => {
    const colorMap = {
      primary: branding.primaryColor,
      secondary: branding.secondaryColor,
      accent: branding.accentColor
    };
    
    return {
      backgroundColor: `${colorMap[type]}15`,
      color: colorMap[type],
      borderColor: `${colorMap[type]}30`
    };
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Link
          href="/dashboard/settings"
          className="text-sm transition-colors hover:opacity-80"
          style={{ color: branding.primaryColor }}
        >
          ← Back to Settings
        </Link>
        <h1 className="text-2xl font-semibold text-gray-900 mt-2">
          Push Notification Settings
        </h1>
        <p className="text-gray-600">
          Configure automated push notifications for your patients
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        {/* Stats Card - Updated without cost mention */}
        <div 
          className="border rounded-lg p-4"
          style={getBrandingStyle('primary')}
        >
          <div className="flex items-center">
            <div 
              className="h-12 w-12 rounded-full flex items-center justify-center mr-4"
              style={{
                backgroundColor: `${branding.primaryColor}20`,
                color: branding.primaryColor
              }}
            >
              <span className="text-xl">📱</span>
            </div>
            <div>
              <h3 className="font-medium" style={{ color: branding.primaryColor }}>
                Push Notification Benefits
              </h3>
              <ul className="text-sm mt-1 space-y-1">
                <li>• High delivery rate (90%+)</li>
                <li>• Patients receive even when offline</li>
                <li>• Higher engagement with rich content</li>
                <li>• Unlimited notifications included</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Appointment Reminders */}
        <div className="border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Appointment Reminders</h3>
              <p className="text-sm text-gray-600">Send reminders before appointments</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.appointmentReminders}
                onChange={(e) => setSettings({ ...settings, appointmentReminders: e.target.checked })}
                className="sr-only peer"
              />
              <div 
                className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"
                style={settings.appointmentReminders ? { backgroundColor: branding.primaryColor } : {}}
              ></div>
            </label>
          </div>
          
          {settings.appointmentReminders && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Remind before (hours)
              </label>
              <div className="flex space-x-2">
                {[1, 6, 12, 24, 48].map((hours) => (
                  <button
                    key={hours}
                    type="button"
                    onClick={() => setSettings({ ...settings, appointmentReminderHours: hours })}
                    className={`px-4 py-2 rounded-lg border transition-colors ${
                      settings.appointmentReminderHours === hours
                        ? "text-white"
                        : "bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100"
                    }`}
                    style={
                      settings.appointmentReminderHours === hours
                        ? {
                            backgroundColor: branding.primaryColor,
                            borderColor: branding.primaryColor
                          }
                        : {}
                    }
                  >
                    {hours}h
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Follow-up Schedule */}
        <div className="border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Follow-up Schedule</h3>
          <p className="text-sm text-gray-600 mb-4">Automated check-ins after treatment</p>
          
          <div className="space-y-4">
            {[
              { key: "followUpDay2", label: "Day 2 Check-in", desc: "How are you feeling?", color: "primary" as const },
              { key: "followUpDay7", label: "Week Follow-up", desc: "Progress update", color: "secondary" as const },
              { key: "followUpDay30", label: "Monthly Check", desc: "Long-term follow-up", color: "accent" as const },
            ].map((item) => (
              <div 
                key={item.key} 
                className="flex items-center justify-between p-3 rounded-lg transition-colors"
                style={getBrandingStyle(item.color)}
              >
                <div>
                  <div className="font-medium">{item.label}</div>
                  <div className="text-sm">{item.desc}</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings[item.key as keyof typeof settings] as boolean}
                    onChange={(e) => setSettings({ ...settings, [item.key]: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div 
                    className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"
                    style={settings[item.key as keyof typeof settings] as boolean ? { 
                      backgroundColor: item.color === 'primary' ? branding.primaryColor :
                                    item.color === 'secondary' ? branding.secondaryColor :
                                    branding.accentColor
                    } : {}}
                  ></div>
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Review Requests */}
        <div className="border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Review Requests</h3>
              <p className="text-sm text-gray-600">Automatically ask for reviews after treatment</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.reviewRequests}
                onChange={(e) => setSettings({ ...settings, reviewRequests: e.target.checked })}
                className="sr-only peer"
              />
              <div 
                className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"
                style={settings.reviewRequests ? { backgroundColor: branding.secondaryColor } : {}}
              ></div>
            </label>
          </div>
          
          {settings.reviewRequests && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Send review request after (days)
              </label>
              <div className="flex space-x-2">
                {[1, 2, 3, 5, 7].map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setSettings({ ...settings, reviewRequestDelay: days })}
                    className={`px-4 py-2 rounded-lg border transition-colors ${
                      settings.reviewRequestDelay === days
                        ? "text-white"
                        : "bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100"
                    }`}
                    style={
                      settings.reviewRequestDelay === days
                        ? {
                            backgroundColor: branding.secondaryColor,
                            borderColor: branding.secondaryColor
                          }
                        : {}
                    }
                  >
                    {days} day{days > 1 ? 's' : ''}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Additional Features */}
        <div className="border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Additional Features</h3>
          
          <div className="space-y-4">
            {[
              { 
                key: "medicineReminders", 
                label: "Medicine Reminders", 
                desc: "Based on prescription schedule",
                color: "accent" as const 
              },
              { 
                key: "clinicUpdates", 
                label: "Clinic Updates", 
                desc: "Holidays, new services, announcements",
                color: "primary" as const 
              },
              { 
                key: "healthTips", 
                label: "Health Tips", 
                desc: "Weekly health tips and advice",
                color: "secondary" as const 
              },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900">{item.label}</div>
                  <div className="text-sm text-gray-600">{item.desc}</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings[item.key as keyof typeof settings] as boolean}
                    onChange={(e) => setSettings({ ...settings, [item.key]: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div 
                    className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"
                    style={settings[item.key as keyof typeof settings] as boolean ? { 
                      backgroundColor: item.color === 'primary' ? branding.primaryColor :
                                    item.color === 'secondary' ? branding.secondaryColor :
                                    branding.accentColor
                    } : {}}
                  ></div>
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => setSettings({
              appointmentReminders: true,
              appointmentReminderHours: 24,
              medicineReminders: true,
              followUpDay2: true,
              followUpDay7: true,
              followUpDay30: false,
              reviewRequests: true,
              reviewRequestDelay: 3,
              clinicUpdates: true,
              healthTips: true,
            })}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Reset to Default
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-6 py-2 text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-all duration-200"
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
            {loading ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}