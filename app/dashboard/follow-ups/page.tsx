"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

interface FollowUp {
  id: string;
  patientId: string;
  patientName: string;
  patientMobile: string;
  type: string;
  scheduledDate: string;
  status: string;
  channel: string;
  message: string;
  appInstalled: boolean;
}

interface DashboardStats {
  scheduledToday: number;
  pendingCount: number;
  deliveryRate: number;
  upcomingCount: number;
  appPatients: number;
}

interface ClinicBranding {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  logoUrl: string | null;
}

export default function FollowUpsPage() {
  const { data: session } = useSession();
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    scheduledToday: 0,
    pendingCount: 0,
    deliveryRate: 0,
    upcomingCount: 0,
    appPatients: 0,
  });
  const [branding, setBranding] = useState<ClinicBranding>({
    primaryColor: "#2563eb", // Default blue
    secondaryColor: "#7c3aed", // Default purple
    accentColor: "#059669", // Default green
    logoUrl: null
  });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("today");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchClinicBranding();
    fetchFollowUpData();
  }, []);

  const fetchClinicBranding = async () => {
    try {
      const response = await fetch("/api/clinic/default");
      if (response.ok) {
        const clinicData = await response.json();
        setBranding({
          primaryColor: clinicData.primaryColor || "#2563eb",
          secondaryColor: clinicData.secondaryColor || "#7c3aed",
          accentColor: clinicData.accentColor || "#059669",
          logoUrl: clinicData.logoUrl
        });
      }
    } catch (error) {
      console.error("Error fetching clinic branding:", error);
    }
  };

  const fetchFollowUpData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/follow-ups");
      
      if (response.status === 401) {
        setError("Please log in to view follow-ups");
        return;
      }
      
      if (!response.ok) {
        throw new Error(`Failed to fetch follow-ups: ${response.status}`);
      }
      
      const data = await response.json();
      setFollowUps(data.followUps || []);
      calculateStats(data.followUps || []);
      
    } catch (error) {
      console.error("Error fetching follow-ups:", error);
      setError("Failed to load follow-ups. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (followUps: FollowUp[]) => {
    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const scheduledToday = followUps.filter(f => f.scheduledDate === today).length;
    const pendingCount = followUps.filter(f => f.status === "pending").length;
    const upcomingCount = followUps.filter(f => f.scheduledDate >= today && f.scheduledDate <= nextWeek).length;
    const appPatients = followUps.filter(f => f.appInstalled).length;
    
    const deliveredCount = followUps.filter(f => f.status === "delivered").length;
    const totalProcessed = followUps.filter(f => ["delivered", "failed"].includes(f.status)).length;
    const deliveryRate = totalProcessed > 0 ? Math.round((deliveredCount / totalProcessed) * 100) : 0;
    
    setStats({
      scheduledToday,
      pendingCount,
      deliveryRate,
      upcomingCount,
      appPatients,
    });
  };

  // Helper function to darken color
  const shadeColor = (color: string, percent: number) => {
    let R = parseInt(color.substring(1,3),16);
    let G = parseInt(color.substring(3,5),16);
    let B = parseInt(color.substring(5,7),16);

    R = Math.floor(R * (100 + percent) / 100);
    G = Math.floor(G * (100 + percent) / 100);
    B = Math.floor(B * (100 + percent) / 100);

    R = (R<255)?R:255;
    G = (G<255)?G:255;
    B = (B<255)?B:255;

    const RR = ((R.toString(16).length==1)?"0"+R.toString(16):R.toString(16));
    const GG = ((G.toString(16).length==1)?"0"+G.toString(16):G.toString(16));
    const BB = ((B.toString(16).length==1)?"0"+B.toString(16):B.toString(16));

    return "#"+RR+GG+BB;
  };

  // Helper function to lighten color
  const tintColor = (color: string, percent: number) => {
    let R = parseInt(color.substring(1,3),16);
    let G = parseInt(color.substring(3,5),16);
    let B = parseInt(color.substring(5,7),16);

    R = Math.floor(R + (255 - R) * percent / 100);
    G = Math.floor(G + (255 - G) * percent / 100);
    B = Math.floor(B + (255 - B) * percent / 100);

    const RR = ((R.toString(16).length==1)?"0"+R.toString(16):R.toString(16));
    const GG = ((G.toString(16).length==1)?"0"+G.toString(16):G.toString(16));
    const BB = ((B.toString(16).length==1)?"0"+B.toString(16):B.toString(16));

    return "#"+RR+GG+BB;
  };

  // Filter follow-ups
  const filteredFollowUps = followUps.filter(followUp => {
    const today = new Date().toISOString().split('T')[0];
    
    if (filter === "today") return followUp.scheduledDate === today;
    if (filter === "upcoming") return followUp.scheduledDate > today;
    if (filter === "pending") return followUp.status === "pending";
    if (filter === "app-only") return followUp.appInstalled === true;
    return true;
  });

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      medication: `bg-[${tintColor(branding.primaryColor, 90)}] text-[${branding.primaryColor}]`,
      followup: `bg-[${tintColor(branding.accentColor, 90)}] text-[${branding.accentColor}]`,
      appointment: `bg-[${tintColor(branding.secondaryColor, 90)}] text-[${branding.secondaryColor}]`,
      review: "bg-yellow-100 text-yellow-800",
      custom: "bg-gray-100 text-gray-800",
    };
    return colors[type] || "bg-gray-100 text-gray-800";
  };

  const getTypeText = (type: string) => {
    const typeMap: Record<string, string> = {
      medication: "Medication Reminder",
      followup: "Follow-up Check",
      appointment: "Appointment",
      review: "Review Request",
      custom: "Custom Message",
    };
    return typeMap[type] || type;
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      scheduled: `bg-[${tintColor(branding.primaryColor, 90)}] text-[${branding.primaryColor}]`,
      delivered: `bg-[${tintColor(branding.accentColor, 90)}] text-[${branding.accentColor}]`,
      read: `bg-[${tintColor(branding.secondaryColor, 90)}] text-[${branding.secondaryColor}]`,
      failed: "bg-red-100 text-red-800",
      cancelled: "bg-gray-100 text-gray-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: "Pending",
      scheduled: "Scheduled",
      delivered: "Delivered",
      read: "Read",
      failed: "Failed",
      cancelled: "Cancelled",
    };
    return statusMap[status] || status;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";
    
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      weekday: 'short'
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const handleSendNow = async (followUpId: string) => {
    try {
      const response = await fetch(`/api/follow-ups/${followUpId}/send`, {
        method: 'POST',
      });

      if (response.ok) {
        fetchFollowUpData();
        alert("Notification sent successfully!");
      } else {
        throw new Error("Failed to send notification");
      }
    } catch (error) {
      console.error("Error sending notification:", error);
      alert("Failed to send notification. Please try again.");
    }
  };

  const handleCancel = async (followUpId: string) => {
    if (!confirm("Are you sure you want to cancel this notification?")) return;

    try {
      const response = await fetch(`/api/follow-ups/${followUpId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchFollowUpData();
        alert("Notification cancelled successfully!");
      } else {
        throw new Error("Failed to cancel notification");
      }
    } catch (error) {
      console.error("Error cancelling notification:", error);
      alert("Failed to cancel notification. Please try again.");
    }
  };

  if (error) {
    return (
      <div className="p-8 text-center">
        <div className="text-red-600 text-4xl mb-4">⚠️</div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Error Loading Follow-ups</h1>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={fetchFollowUpData}
          style={{ backgroundColor: branding.primaryColor }}
          className="px-4 py-2 text-white rounded-lg hover:opacity-90"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Push Notifications</h1>
          <p className="text-gray-600">Schedule and manage push notifications for patients</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/dashboard/notifications/send"
            style={{ backgroundColor: branding.primaryColor }}
            className="px-4 py-2 text-white rounded-lg hover:opacity-90 flex items-center"
          >
            <span className="mr-2">📢</span>
            Send Now
          </Link>
          <Link
            href="/dashboard/notifications/schedule"
            style={{ borderColor: branding.primaryColor, color: branding.primaryColor }}
            className="px-4 py-2 border rounded-lg hover:opacity-90 flex items-center"
          >
            <span className="mr-2">⏰</span>
            Schedule New
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">Scheduled Today</div>
          <div className="text-2xl font-bold" style={{ color: branding.primaryColor }}>
            {loading ? "..." : stats.scheduledToday}
          </div>
          <div className="text-xs text-gray-500 mt-1">Push notifications</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">Pending</div>
          <div className="text-2xl font-bold" style={{ color: branding.primaryColor }}>
            {loading ? "..." : stats.pendingCount}
          </div>
          <div className="text-xs text-gray-500 mt-1">Awaiting delivery</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">Delivery Rate</div>
          <div className="text-2xl font-bold" style={{ color: branding.accentColor }}>
            {loading ? "..." : `${stats.deliveryRate}%`}
          </div>
          <div className="text-xs text-gray-500 mt-1">Successful deliveries</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">Upcoming</div>
          <div className="text-2xl font-bold" style={{ color: branding.secondaryColor }}>
            {loading ? "..." : stats.upcomingCount}
          </div>
          <div className="text-xs text-gray-500 mt-1">Next 7 days</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">App Users</div>
          <div className="text-2xl font-bold" style={{ color: branding.secondaryColor }}>
            {loading ? "..." : stats.appPatients}
          </div>
          <div className="text-xs text-gray-500 mt-1">Can receive push</div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* Filters */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-wrap gap-2">
            {["today", "upcoming", "pending", "app-only", "all"].map((filterType) => (
              <button
                key={filterType}
                onClick={() => setFilter(filterType)}
                className={`px-4 py-2 rounded-lg ${
                  filter === filterType
                    ? "text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
                style={filter === filterType ? { backgroundColor: branding.primaryColor } : {}}
              >
                {filterType === "app-only" ? "App Users Only" : 
                 filterType.charAt(0).toUpperCase() + filterType.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div 
              className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto"
              style={{ borderColor: branding.primaryColor }}
            ></div>
            <p className="mt-4 text-gray-600">Loading notifications...</p>
          </div>
        ) : followUps.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-gray-400 text-4xl mb-4">📱</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Notifications Scheduled</h3>
            <p className="text-gray-600 mb-4">
              Start sending push notifications to your patients' mobile apps.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Link
                href="/dashboard/notifications/send"
                style={{ backgroundColor: branding.primaryColor }}
                className="inline-flex items-center px-4 py-2 text-white rounded-lg hover:opacity-90"
              >
                <span className="mr-2">📢</span>
                Send Immediate Notification
              </Link>
              <Link
                href="/dashboard/notifications/schedule"
                style={{ borderColor: branding.primaryColor, color: branding.primaryColor }}
                className="inline-flex items-center px-4 py-2 border rounded-lg hover:opacity-90"
              >
                <span className="mr-2">⏰</span>
                Schedule for Later
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Patient
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Schedule
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      App Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredFollowUps.map((followUp) => (
                    <tr key={followUp.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div 
                            className="h-10 w-10 rounded-full flex items-center justify-center mr-3"
                            style={{ backgroundColor: tintColor(branding.primaryColor, 90) }}
                          >
                            <span style={{ color: branding.primaryColor }} className="font-medium">
                              {followUp.patientName.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {followUp.patientName}
                            </div>
                            <div className="text-xs text-gray-500">
                              +91 {followUp.patientMobile}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getTypeBadge(followUp.type)}`}>
                          {getTypeText(followUp.type)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 font-medium">
                          {formatDate(followUp.scheduledDate)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatTime(followUp.scheduledDate)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(followUp.status)}`}>
                          {getStatusText(followUp.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {followUp.appInstalled ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            App Installed
                          </span>
                        ) : (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            No App
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          {followUp.status === "pending" && (
                            <button
                              onClick={() => handleSendNow(followUp.id)}
                              style={{ color: branding.primaryColor }}
                              className="hover:opacity-80"
                            >
                              Send Now
                            </button>
                          )}
                          {followUp.status === "pending" && (
                            <button
                              onClick={() => handleCancel(followUp.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Cancel
                            </button>
                          )}
                          <button className="text-gray-600 hover:text-gray-900">
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredFollowUps.length === 0 && followUps.length > 0 && (
              <div className="p-8 text-center border-t border-gray-200">
                <p className="text-gray-600">No notifications match the current filter.</p>
                <button
                  onClick={() => setFilter("all")}
                  style={{ color: branding.primaryColor }}
                  className="mt-2 hover:opacity-80"
                >
                  View All Notifications
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Help Section */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div 
          className="rounded-lg p-4"
          style={{ 
            backgroundColor: tintColor(branding.primaryColor, 95),
            border: `1px solid ${tintColor(branding.primaryColor, 80)}`
          }}
        >
          <h3 
            className="text-sm font-medium mb-2 flex items-center"
            style={{ color: branding.primaryColor }}
          >
            <span className="mr-2">💡</span> Push Notification Tips
          </h3>
          <ul 
            className="text-sm space-y-1"
            style={{ color: shadeColor(branding.primaryColor, 20) }}
          >
            <li>• Best times to send: 9-11 AM and 7-9 PM</li>
            <li>• Personalize messages with patient names</li>
            <li>• Use medication reminders for better adherence</li>
            <li>• Schedule follow-ups 3-7 days after visit</li>
          </ul>
        </div>
        
        <div 
          className="rounded-lg p-4"
          style={{ 
            backgroundColor: tintColor(branding.accentColor, 95),
            border: `1px solid ${tintColor(branding.accentColor, 80)}`
          }}
        >
          <h3 
            className="text-sm font-medium mb-2 flex items-center"
            style={{ color: branding.accentColor }}
          >
            <span className="mr-2">📈</span> Performance Stats
          </h3>
          <ul 
            className="text-sm space-y-1"
            style={{ color: shadeColor(branding.accentColor, 20) }}
          >
            <li>• Push notifications have 85% open rate</li>
            <li>• 40% higher engagement than SMS</li>
            <li>• 92% delivery rate for app users</li>
            <li>• Patients respond 3x faster to push notifications</li>
          </ul>
        </div>
      </div>
    </div>
  );
}