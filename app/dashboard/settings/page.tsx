
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

interface ClinicSettings {
  id: string;
  name: string;
  doctorName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  // Branding fields
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  // Other fields
  googleReviewLink: string;
  language: "en" | "hinglish";
  subscriptionPlan: string;
  subscriptionStatus: string;
  hasAppUsers: number;
  pushDeliveryRate: number;
  settings: {
    notificationAutomation: boolean;
    reviewAutomation: boolean;
    pushNotificationsEnabled: boolean;
    workingHoursStart: string;
    workingHoursEnd: string;
    appointmentReminders: boolean;
    medicineReminders: boolean;
    followUpReminders: boolean;
    reviewRequests: boolean;
    autoScheduling: boolean;
    timezone: string;
    notificationSound: boolean;
    notificationVibration: boolean;
    // Enhanced notification settings
    appointmentReminderHours: number;
    followUpDay2: boolean;
    followUpDay7: boolean;
    followUpDay30: boolean;
    reviewRequestDelay: number;
    clinicUpdates: boolean;
    healthTips: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

interface DashboardStats {
  patientsToday: number;
  totalPatients: number;
  notificationsScheduled: number;
  notificationsSentToday: number;
  patientsWithApp: number;
  notificationDeliveryRate: number;
  engagementRate: number;
  totalDelivered: number;
  totalRead: number;
  totalFailed: number;
}

interface BrandingColors {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  logoUrl?: string;
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const [settings, setSettings] = useState<ClinicSettings | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"clinic" | "notifications" | "subscription">("clinic");
  const [formData, setFormData] = useState<Partial<ClinicSettings>>({});
  const [error, setError] = useState<string | null>(null);
  const [branding, setBranding] = useState<BrandingColors>({
    primaryColor: '#3b82f6',
    secondaryColor: '#10b981',
    accentColor: '#8b5cf6'
  });
  const [changesMade, setChangesMade] = useState(false);

  // Fetch data from API
  useEffect(() => {
    fetchSettings();
    fetchDashboardStats();
    fetchBranding();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/settings/clinic");
      if (!response.ok) {
        throw new Error("Failed to fetch clinic settings");
      }
      const data = await response.json();

      // Merge default notification settings if not present
      const settingsWithDefaults = {
        ...data,
        settings: {
          appointmentReminderHours: 24,
          followUpDay2: true,
          followUpDay7: true,
          followUpDay30: false,
          reviewRequestDelay: 3,
          clinicUpdates: true,
          healthTips: true,
          ...data.settings
        }
      };

      setSettings(settingsWithDefaults);
      setFormData(settingsWithDefaults);
    } catch (error) {
      console.error("Error fetching settings:", error);
      setError("Failed to load clinic settings. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch("/api/dashboard/stats");
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
    }
  };

  const fetchBranding = async () => {
    try {
      const response = await fetch('/api/clinic/default');
      if (response.ok) {
        const data = await response.json();
        if (data) {
          setBranding({
            primaryColor: data.primaryColor || '#3b82f6',
            secondaryColor: data.secondaryColor || '#10b981',
            accentColor: data.accentColor || '#8b5cf6',
            logoUrl: data.logoUrl
          });
        }
      }
    } catch (error) {
      console.error('Error fetching branding:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (name.startsWith("settings.")) {
      const settingName = name.split(".")[1];
      setFormData(prev => {
        const currentSettings = prev.settings || ({} as any);
        return {
          ...prev,
          settings: {
            ...currentSettings,
            [settingName]: type === "checkbox" ? (e.target as HTMLInputElement).checked : 
                         type === "number" ? parseInt(value) : value,
          },
        };
      });
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    setChangesMade(true);
  };

  const handleCheckboxChange = (settingName: string, value: boolean) => {
    setFormData(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        [settingName]: value,
      } as any,
    }));
    setChangesMade(true);
  };

  const handleNumberChange = (settingName: string, value: number) => {
    setFormData(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        [settingName]: value,
      } as any,
    }));
    setChangesMade(true);
  };

  const handleSave = async () => {
    if (!formData.id) return;

    setSaving(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/settings/clinic`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Failed to save settings");
      }

      const updatedData = await response.json();
      setSettings(updatedData);
      setFormData(updatedData);
      setChangesMade(false);
      
      alert("Settings saved successfully!");
    } catch (error) {
      console.error("Error saving settings:", error);
      setError("Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (settings) {
      setFormData(settings);
      setError(null);
      setChangesMade(false);
    }
  };

  const resetNotificationSettings = () => {
    setFormData(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        appointmentReminders: true,
        appointmentReminderHours: 24,
        medicineReminders: true,
        followUpReminders: true,
        followUpDay2: true,
        followUpDay7: true,
        followUpDay30: false,
        reviewRequests: true,
        reviewRequestDelay: 3,
        clinicUpdates: true,
        healthTips: true,
        pushNotificationsEnabled: true,
      } as any,
    }));
    setChangesMade(true);
  };

  // Helper function to apply branding colors
  const getBrandingStyle = (type: 'primary' | 'secondary' | 'accent' = 'primary') => {
    const colorMap = {
      primary: branding.primaryColor,
      secondary: branding.secondaryColor,
      accent: branding.accentColor
    };
    
    const color = colorMap[type];
    // Create lighter background color
    const bgColor = color + '15'; // Add 15% opacity
    
    return {
      backgroundColor: bgColor,
      color: color,
      borderColor: color + '30' // 30% opacity
    };
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div 
          className="animate-spin rounded-full h-12 w-12 border-b-2"
          style={{ borderColor: branding.primaryColor }}
        ></div>
      </div>
    );
  }

  if (error && !settings) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 text-4xl mb-4">⚠️</div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Settings</h2>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={fetchSettings}
          className="px-4 py-2 text-white rounded-lg transition-colors"
          style={{
            backgroundColor: branding.primaryColor,
            borderColor: branding.primaryColor
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = `${branding.primaryColor}CC`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = branding.primaryColor;
          }}
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">⚙️</div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Settings not found</h2>
        <p className="text-gray-600">Unable to load clinic settings.</p>
        <button
          onClick={fetchSettings}
          className="mt-4 px-4 py-2 text-white rounded-lg transition-colors"
          style={{
            backgroundColor: branding.primaryColor,
            borderColor: branding.primaryColor
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = `${branding.primaryColor}CC`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = branding.primaryColor;
          }}
        >
          Refresh
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Clinic Settings</h1>
        <p className="text-gray-600">Configure your clinic profile and notification settings</p>
      </div>

      {error && (
        <div 
          className="mb-4 p-4 border rounded-lg"
          style={{
            backgroundColor: `${branding.accentColor}15`,
            borderColor: `${branding.accentColor}30`
          }}
        >
          <p style={{ color: branding.accentColor }}>{error}</p>
        </div>
      )}

      {changesMade && (
        <div 
          className="mb-4 p-4 border rounded-lg"
          style={{
            backgroundColor: `${branding.primaryColor}15`,
            borderColor: `${branding.primaryColor}30`
          }}
        >
          <div className="flex items-center">
            <span className="mr-2" style={{ color: branding.primaryColor }}>⚠️</span>
            <p style={{ color: branding.primaryColor }}>
              You have unsaved changes. Click "Save Changes" to apply.
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: "clinic", label: "Clinic Info", icon: "🏥" },
            { id: "notifications", label: "Notifications", icon: "🔔" },
            { id: "subscription", label: "Subscription", icon: "💳" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 inline-flex items-center border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? "text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
              style={activeTab === tab.id ? { 
                borderColor: branding.primaryColor,
                color: branding.primaryColor
              } : {}}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {/* Clinic Info Tab */}
          {activeTab === "clinic" && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-6">Clinic Information</h2>
              
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Clinic Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name || ""}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-colors"
                      style={{
                        borderColor: `${branding.primaryColor}50`,
                        outlineColor: branding.primaryColor
                      }}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Doctor Name *
                    </label>
                    <input
                      type="text"
                      name="doctorName"
                      value={formData.doctorName || ""}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-colors"
                      style={{
                        borderColor: `${branding.primaryColor}50`,
                        outlineColor: branding.primaryColor
                      }}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Clinic Phone *
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone || ""}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-colors"
                      style={{
                        borderColor: `${branding.primaryColor}50`,
                        outlineColor: branding.primaryColor
                      }}
                      readOnly
                    />
                    <p className="mt-1 text-xs text-gray-500">Contact support to change phone number</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email || ""}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-colors"
                      style={{
                        borderColor: `${branding.primaryColor}50`,
                        outlineColor: branding.primaryColor
                      }}
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Clinic Address *
                    </label>
                    <textarea
                      name="address"
                      value={formData.address || ""}
                      onChange={handleInputChange}
                      rows={2}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-colors"
                      style={{
                        borderColor: `${branding.primaryColor}50`,
                        outlineColor: branding.primaryColor
                      }}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City *
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city || ""}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-colors"
                      style={{
                        borderColor: `${branding.primaryColor}50`,
                        outlineColor: branding.primaryColor
                      }}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Language Preference
                    </label>
                    <select
                      name="language"
                      value={formData.language || "en"}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-colors"
                      style={{
                        borderColor: `${branding.primaryColor}50`,
                        outlineColor: branding.primaryColor
                      }}
                    >
                      <option value="en">English</option>
                      <option value="hinglish">Hinglish (Hindi + English)</option>
                    </select>
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Google Review Link
                    </label>
                    <input
                      type="url"
                      name="googleReviewLink"
                      value={formData.googleReviewLink || ""}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-colors"
                      style={{
                        borderColor: `${branding.primaryColor}50`,
                        outlineColor: branding.primaryColor
                      }}
                      placeholder="https://g.page/r/..."
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Patients will be directed to this link for reviews
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === "notifications" && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-medium text-gray-900">Push Notification Settings</h2>
                <Link
                  href="/dashboard/notifications"
                  className="text-sm font-medium transition-colors hover:opacity-80"
                  style={{ color: branding.primaryColor }}
                >
                  Manage Notifications →
                </Link>
              </div>
              
              {/* Stats Card */}
              <div 
                className="border rounded-lg p-4 mb-6"
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

              <div className="space-y-6">
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
                        checked={formData.settings?.appointmentReminders || false}
                        onChange={(e) => handleCheckboxChange("appointmentReminders", e.target.checked)}
                        className="sr-only peer"
                      />
                      <div 
                        className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"
                        style={formData.settings?.appointmentReminders ? { backgroundColor: branding.primaryColor } : {}}
                      ></div>
                    </label>
                  </div>
                  
                  {formData.settings?.appointmentReminders && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Remind before (hours)
                      </label>
                      <div className="flex space-x-2">
                        {[1, 6, 12, 24, 48].map((hours) => (
                          <button
                            key={hours}
                            type="button"
                            onClick={() => handleNumberChange("appointmentReminderHours", hours)}
                            className={`px-4 py-2 rounded-lg border transition-colors ${
                              formData.settings?.appointmentReminderHours === hours
                                ? "text-white"
                                : "bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100"
                            }`}
                            style={
                              formData.settings?.appointmentReminderHours === hours
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
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">Follow-up Schedule</h3>
                      <p className="text-sm text-gray-600">Automated check-ins after treatment</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.settings?.followUpReminders || false}
                        onChange={(e) => handleCheckboxChange("followUpReminders", e.target.checked)}
                        className="sr-only peer"
                      />
                      <div 
                        className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"
                        style={formData.settings?.followUpReminders ? { backgroundColor: branding.secondaryColor } : {}}
                      ></div>
                    </label>
                  </div>
                  
                  {formData.settings?.followUpReminders && (
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
                              checked={formData.settings?.[item.key as keyof typeof formData.settings] as boolean || false}
                              onChange={(e) => handleCheckboxChange(item.key, e.target.checked)}
                              className="sr-only peer"
                            />
                            <div 
                              className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"
                              style={formData.settings?.[item.key as keyof typeof formData.settings] as boolean ? { 
                                backgroundColor: item.color === 'primary' ? branding.primaryColor :
                                              item.color === 'secondary' ? branding.secondaryColor :
                                              branding.accentColor
                              } : {}}
                            ></div>
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
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
                        checked={formData.settings?.reviewRequests || false}
                        onChange={(e) => handleCheckboxChange("reviewRequests", e.target.checked)}
                        className="sr-only peer"
                      />
                      <div 
                        className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"
                        style={formData.settings?.reviewRequests ? { backgroundColor: branding.secondaryColor } : {}}
                      ></div>
                    </label>
                  </div>
                  
                  {formData.settings?.reviewRequests && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Send review request after (days)
                      </label>
                      <div className="flex space-x-2">
                        {[1, 2, 3, 5, 7].map((days) => (
                          <button
                            key={days}
                            type="button"
                            onClick={() => handleNumberChange("reviewRequestDelay", days)}
                            className={`px-4 py-2 rounded-lg border transition-colors ${
                              formData.settings?.reviewRequestDelay === days
                                ? "text-white"
                                : "bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100"
                            }`}
                            style={
                              formData.settings?.reviewRequestDelay === days
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
                            checked={formData.settings?.[item.key as keyof typeof formData.settings] as boolean || false}
                            onChange={(e) => handleCheckboxChange(item.key, e.target.checked)}
                            className="sr-only peer"
                          />
                          <div 
                            className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"
                            style={formData.settings?.[item.key as keyof typeof formData.settings] as boolean ? { 
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

                {/* Push Notifications Master Switch */}
                <div className="border rounded-lg p-4 transition-colors"
                  style={getBrandingStyle('primary')}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Push Notifications Master Switch</h3>
                      <p className="text-sm">Enable/disable all push notifications</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.settings?.pushNotificationsEnabled || false}
                        onChange={(e) => handleCheckboxChange("pushNotificationsEnabled", e.target.checked)}
                        className="sr-only peer"
                      />
                      <div 
                        className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"
                        style={formData.settings?.pushNotificationsEnabled ? { backgroundColor: branding.primaryColor } : {}}
                      ></div>
                    </label>
                  </div>
                </div>

                {/* Working Hours */}
                <div className="border rounded-lg p-4 transition-colors"
                  style={getBrandingStyle('accent')}
                >
                  <h3 className="font-medium mb-4">Notification Hours</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Start Time
                      </label>
                      <input
                        type="time"
                        name="settings.workingHoursStart"
                        value={formData.settings?.workingHoursStart || "09:00"}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-colors"
                        style={{
                          borderColor: `${branding.primaryColor}50`,
                          outlineColor: branding.primaryColor
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        End Time
                      </label>
                      <input
                        type="time"
                        name="settings.workingHoursEnd"
                        value={formData.settings?.workingHoursEnd || "20:00"}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-colors"
                        style={{
                          borderColor: `${branding.primaryColor}50`,
                          outlineColor: branding.primaryColor
                        }}
                      />
                    </div>
                  </div>
                  <p className="mt-2 text-sm">
                    Push notifications will only be sent during working hours (9 AM - 8 PM by default)
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Subscription Tab */}
          {activeTab === "subscription" && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-6">Subscription & Billing</h2>
              
              <div className="space-y-6">
                {/* Current Plan */}
                <div 
                  className="border rounded-lg p-6"
                  style={{
                    backgroundColor: `${branding.primaryColor}15`,
                    borderColor: `${branding.primaryColor}30`
                  }}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-medium">Current Plan</h3>
                      <div 
                        className="text-2xl font-bold mt-1 capitalize"
                        style={{ color: branding.primaryColor }}
                      >
                        {formData.subscriptionPlan || 'starter'}
                      </div>
                    </div>
                    <span 
                      className="px-3 py-1 text-sm rounded-full"
                      style={{
                        backgroundColor: `${branding.secondaryColor}20`,
                        color: branding.secondaryColor
                      }}
                    >
                      {(formData.subscriptionStatus || "active").charAt(0).toUpperCase() + (formData.subscriptionStatus || "active").slice(1)}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <div className="text-sm">Patients with App</div>
                      <div className="text-lg font-semibold">
                        {stats?.patientsWithApp || 0} patients
                      </div>
                    </div>
                    <div>
                      <div className="text-sm">Push Notifications</div>
                      <div 
                        className="text-lg font-semibold"
                        style={{ color: branding.accentColor }}
                      >
                        Unlimited
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t"
                    style={{ borderColor: `${branding.primaryColor}30` }}
                  >
                    <div className="text-sm mb-2">Plan Features:</div>
                    <ul className="text-sm space-y-1">
                      <li>• Push notification system</li>
                      <li>• Follow-up automation</li>
                      <li>• Appointment reminders</li>
                      <li>• Medicine reminders</li>
                      <li>• Review requests</li>
                      <li>• Unlimited notifications</li>
                    </ul>
                  </div>
                </div>

                {/* App Usage */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-4">Notification Performance</h3>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">Delivery Rate</span>
                      <span className="font-medium">{stats?.notificationDeliveryRate || 0}%</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">Engagement Rate</span>
                      <span className="font-medium">{stats?.engagementRate || 0}%</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">Notifications Sent Today</span>
                      <span className="font-medium">{stats?.notificationsSentToday || 0}</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">Scheduled Notifications</span>
                      <span className="font-medium">{stats?.notificationsScheduled || 0}</span>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <Link
                      href="/dashboard/notifications"
                      className="text-sm font-medium transition-colors hover:opacity-80"
                      style={{ color: branding.primaryColor }}
                    >
                      View all notifications →
                    </Link>
                  </div>
                </div>

                {/* Billing History */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="font-medium text-gray-900 mb-4">Notification Usage</h3>
                  <div 
                    className="rounded-lg p-4"
                    style={{
                      backgroundColor: `${branding.accentColor}15`,
                      border: `1px solid ${branding.accentColor}30`
                    }}
                  >
                    <div className="text-center text-sm" style={{ color: branding.accentColor }}>
                      Unlimited push notifications included in all plans
                    </div>
                    <div className="mt-2 text-center">
                      <div className="text-sm font-medium" style={{ color: branding.accentColor }}>
                        No notification limits
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Save Button */}
          {(activeTab === "clinic" || activeTab === "notifications") && (
            <div className="mt-6 flex justify-between space-x-4">
              <div>
                {activeTab === "notifications" && (
                  <button
                    onClick={resetNotificationSettings}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    disabled={saving}
                  >
                    Reset to Default
                  </button>
                )}
              </div>
              <div className="flex space-x-4">
                <button
                  onClick={handleReset}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  disabled={saving}
                >
                  Discard Changes
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !changesMade}
                  className="px-6 py-2 text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition-all duration-200"
                  style={{
                    backgroundColor: changesMade ? branding.primaryColor : '#9ca3af',
                    borderColor: changesMade ? branding.primaryColor : '#9ca3af'
                  }}
                  onMouseEnter={(e) => {
                    if (!e.currentTarget.disabled && changesMade) {
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = '';
                    e.currentTarget.style.boxShadow = '';
                  }}
                >
                  {saving ? (
                    <>
                      <div 
                        className="animate-spin rounded-full h-4 w-4 border-b-2 mr-2"
                        style={{ borderColor: 'white' }}
                      ></div>
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Quick Stats & Help */}
        <div className="space-y-6">
          {/* Clinic Summary */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Clinic Summary</h2>
            
            <div className="space-y-3">
              <div className="flex items-center">
                <div 
                  className="h-12 w-12 rounded-full flex items-center justify-center mr-3"
                  style={{
                    backgroundColor: `${branding.primaryColor}15`,
                    color: branding.primaryColor
                  }}
                >
                  <span className="text-xl">🏥</span>
                </div>
                <div>
                  <div className="font-medium text-gray-900">{formData.name}</div>
                  <div className="text-sm text-gray-600">{formData.doctorName}</div>
                </div>
              </div>
              
              <div className="pt-3 border-t border-gray-200">
                <div className="text-sm text-gray-600">Subscription</div>
                <div className="font-medium text-gray-900 capitalize">{formData.subscriptionPlan}</div>
              </div>
              
              <div>
                <div className="text-sm text-gray-600">App Users</div>
                <div className="font-medium text-gray-900">{settings?.hasAppUsers || 0} active patients</div>
              </div>
              
              <div>
                <div className="text-sm text-gray-600">Location</div>
                <div className="font-medium text-gray-900">{formData.city}</div>
              </div>

              <div>
                <div className="text-sm text-gray-600">Push Notifications</div>
                <div 
                  className="font-medium"
                  style={{ color: branding.secondaryColor }}
                >
                  Unlimited
                </div>
              </div>
            </div>
          </div>

          {/* System Status */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">System Status</h2>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Push Service</span>
                <span 
                  className="px-2 py-1 text-xs rounded"
                  style={{
                    backgroundColor: `${branding.secondaryColor}20`,
                    color: branding.secondaryColor
                  }}
                >
                  Active
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-700">App Connection</span>
                <span 
                  className="px-2 py-1 text-xs rounded"
                  style={{
                    backgroundColor: `${branding.secondaryColor}20`,
                    color: branding.secondaryColor
                  }}
                >
                  Connected
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Notification Rate</span>
                <span 
                  className="text-sm"
                  style={{ color: branding.secondaryColor }}
                >
                  {settings?.pushDeliveryRate || 0}%
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-700">Last Updated</span>
                <span className="text-sm">
                  {settings?.updatedAt ? new Date(settings.updatedAt).toLocaleDateString('en-IN') : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Links</h2>
            
            <div className="space-y-3">
              <Link
                href="/dashboard/notifications/send"
                className="flex items-center transition-colors hover:opacity-80"
                style={{ color: branding.primaryColor }}
              >
                <span className="mr-2">📢</span>
                Send Push Notification
              </Link>
              
              <Link
                href="/dashboard/notifications/schedule"
                className="flex items-center transition-colors hover:opacity-80"
                style={{ color: branding.primaryColor }}
              >
                <span className="mr-2">⏰</span>
                Schedule Notifications
              </Link>
              
              <Link
                href="/dashboard/notifications"
                className="flex items-center transition-colors hover:opacity-80"
                style={{ color: branding.primaryColor }}
              >
                <span className="mr-2">📊</span>
                View All Notifications
              </Link>
              
              <Link
                href="/dashboard/follow-ups/rules"
                className="flex items-center transition-colors hover:opacity-80"
                style={{ color: branding.primaryColor }}
              >
                <span className="mr-2">📝</span>
                Notification Templates
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
