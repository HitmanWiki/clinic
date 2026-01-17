// /app/dashboard/notifications/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// Define TypeScript interfaces
interface Notification {
  id: string;
  patientId: string;
  patientName: string;
  patientMobile: string;
  type: string;
  message: string;
  scheduledDate: string;
  status: string;
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  failureReason?: string;
}

interface NotificationStats {
  totalSent: number;
  totalDelivered: number;
  totalRead: number;
  totalFailed: number;
  deliveryRate: number;
  engagementRate: number;
  // Removed: pushNotificationBalance: number;
}

interface BrandingColors {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  logoUrl?: string;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, scheduled, sent, delivered, read, failed
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);
  const [branding, setBranding] = useState<BrandingColors>({
    primaryColor: '#3b82f6', // Default blue
    secondaryColor: '#10b981', // Default green
    accentColor: '#8b5cf6' // Default purple
  });

  useEffect(() => {
    fetchNotifications();
    fetchStats();
    fetchBranding();
  }, [filter]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const url = filter === 'all' 
        ? '/api/notifications' 
        : `/api/notifications?status=${filter}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.notifications) {
        setNotifications(data.notifications);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/dashboard/stats');
      const data = await response.json();
      
      if (data) {
        setStats({
          totalSent: data.notificationsSentThisWeek || 0,
          totalDelivered: data.totalDelivered || 0,
          totalRead: data.totalRead || 0,
          totalFailed: data.totalFailed || 0,
          deliveryRate: data.notificationDeliveryRate || 0,
          engagementRate: data.engagementRate || 0,
          // Removed: pushNotificationBalance: data.pushNotificationBalance || 0
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
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

  const handleNotificationSelect = (id: string) => {
    setSelectedNotifications(prev => {
      if (prev.includes(id)) {
        return prev.filter(notificationId => notificationId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedNotifications.length === notifications.length) {
      setSelectedNotifications([]);
    } else {
      setSelectedNotifications(notifications.map(n => n.id));
    }
  };

  const handleDeleteSelected = async () => {
    if (!selectedNotifications.length || !confirm('Are you sure you want to delete selected notifications?')) {
      return;
    }

    try {
      const promises = selectedNotifications.map(id => 
        fetch(`/api/notifications/${id}`, {
          method: 'DELETE',
        })
      );

      const results = await Promise.all(promises);
      const allSuccessful = results.every(res => res.ok);

      if (allSuccessful) {
        alert(`${selectedNotifications.length} notifications deleted successfully`);
        setSelectedNotifications([]);
        fetchNotifications();
        fetchStats();
      } else {
        alert('Some notifications failed to delete');
      }
    } catch (error) {
      console.error('Error deleting notifications:', error);
      alert('Failed to delete notifications');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return `bg-yellow-100 text-yellow-800`;
      case 'sent': return `bg-blue-100 text-blue-800`;
      case 'delivered': return `bg-green-100 text-green-800`;
      case 'read': return `bg-purple-100 text-purple-800`;
      case 'failed': return `bg-red-100 text-red-800`;
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'appointment': return '📅';
      case 'medicine': return '💊';
      case 'reminder': return '⏰';
      case 'followup': return '🔄';
      case 'review': return '⭐';
      case 'announcement': return '📢';
      default: return '🔔';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'appointment': return `bg-blue-100 text-blue-600`;
      case 'medicine': return `bg-green-100 text-green-600`;
      case 'reminder': return `bg-yellow-100 text-yellow-600`;
      case 'followup': return `bg-purple-100 text-purple-600`;
      case 'review': return `bg-pink-100 text-pink-600`;
      case 'announcement': return `bg-indigo-100 text-indigo-600`;
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins} minutes ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hours ago`;
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
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
      backgroundColor: `${colorMap[type]}15`, // 15 = 8% opacity in hex
      color: colorMap[type],
      borderColor: `${colorMap[type]}30` // 30 = 19% opacity
    };
  };

  return (
    <div>
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Push Notifications</h1>
            <p className="text-gray-600">Manage automated patient notifications</p>
          </div>
          <Link
            href="/dashboard/notifications/send"
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
            Send Notification
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Stats and Quick Actions */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Notification Stats</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Delivery Rate</span>
                <span className="font-medium text-lg">
                  {stats?.deliveryRate ? `${stats.deliveryRate}%` : 'Loading...'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Engagement Rate</span>
                <span className="font-medium text-lg">
                  {stats?.engagementRate ? `${stats.engagementRate}%` : 'Loading...'}
                </span>
              </div>
              
              {/* Removed Notifications Balance Section */}
              
              <div className="pt-3 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center">
                    <div 
                      className="text-2xl font-bold"
                      style={{ color: branding.secondaryColor }}
                    >
                      {stats?.totalDelivered || 0}
                    </div>
                    <div className="text-xs text-gray-500">Delivered</div>
                  </div>
                  <div className="text-center">
                    <div 
                      className="text-2xl font-bold"
                      style={{ color: branding.accentColor }}
                    >
                      {stats?.totalRead || 0}
                    </div>
                    <div className="text-xs text-gray-500">Read</div>
                  </div>
                  <div className="text-center">
                    <div 
                      className="text-2xl font-bold"
                      style={{ color: branding.primaryColor }}
                    >
                      {stats?.totalSent || 0}
                    </div>
                    <div className="text-xs text-gray-500">Sent</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{stats?.totalFailed || 0}</div>
                    <div className="text-xs text-gray-500">Failed</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Link
                href="/dashboard/notifications/send?type=appointment"
                className="block w-full text-left px-4 py-3 border rounded-lg hover:bg-gray-50 transition-colors"
                style={getBrandingStyle('primary')}
              >
                <div className="flex items-center">
                  <span className="mr-3">📅</span>
                  <span>Send Appointment Reminders</span>
                </div>
              </Link>
              <Link
                href="/dashboard/notifications/send?type=medicine"
                className="block w-full text-left px-4 py-3 border rounded-lg hover:bg-gray-50 transition-colors"
                style={getBrandingStyle('secondary')}
              >
                <div className="flex items-center">
                  <span className="mr-3">💊</span>
                  <span>Send Medicine Reminders</span>
                </div>
              </Link>
              <Link
                href="/dashboard/notifications/send?type=review"
                className="block w-full text-left px-4 py-3 border rounded-lg hover:bg-gray-50 transition-colors"
                style={getBrandingStyle('accent')}
              >
                <div className="flex items-center">
                  <span className="mr-3">⭐</span>
                  <span>Request Reviews</span>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* Right column - Notifications List */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <h2 className="text-lg font-medium text-gray-900">Recent Notifications</h2>
                <div className="flex space-x-2">
                  {['all', 'scheduled', 'sent', 'delivered', 'failed'].map((status) => (
                    <button
                      key={status}
                      onClick={() => setFilter(status)}
                      className={`px-3 py-1 text-sm rounded-full capitalize ${
                        filter === status
                          ? 'text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                      style={
                        filter === status
                          ? { backgroundColor: branding.primaryColor }
                          : {}
                      }
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
              
              {selectedNotifications.length > 0 && (
                <button
                  onClick={handleDeleteSelected}
                  className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                >
                  Delete Selected ({selectedNotifications.length})
                </button>
              )}
            </div>
            
            {loading ? (
              <div className="p-12 text-center">
                <div 
                  className="inline-block animate-spin rounded-full h-8 w-8 border-b-2"
                  style={{ borderColor: branding.primaryColor }}
                ></div>
                <p className="mt-2 text-gray-600">Loading notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-12 text-center">
                <div className="text-gray-400 text-4xl mb-4">🔔</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications found</h3>
                <p className="text-gray-600 mb-4">
                  {filter === 'all' 
                    ? 'You haven\'t sent any notifications yet.'
                    : `No ${filter} notifications found.`
                  }
                </p>
                <Link
                  href="/dashboard/notifications/send"
                  className="inline-flex items-center px-4 py-2 text-white rounded-lg transition-colors"
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
                  Send Your First Notification
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                <div className="px-6 py-3 bg-gray-50 flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedNotifications.length === notifications.length}
                    onChange={handleSelectAll}
                    className="h-4 w-4 rounded focus:ring-blue-500"
                    style={{
                      color: branding.primaryColor,
                      borderColor: `${branding.primaryColor}80`
                    }}
                  />
                  <div className="ml-4 flex-1 grid grid-cols-12 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="col-span-3">Patient</div>
                    <div className="col-span-3">Message</div>
                    <div className="col-span-2">Type</div>
                    <div className="col-span-2">Status</div>
                    <div className="col-span-2">Time</div>
                  </div>
                </div>

                {notifications.map((notification) => (
                  <div key={notification.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start">
                      <input
                        type="checkbox"
                        checked={selectedNotifications.includes(notification.id)}
                        onChange={() => handleNotificationSelect(notification.id)}
                        className="h-4 w-4 rounded focus:ring-blue-500 mt-1"
                        style={{
                          color: branding.primaryColor,
                          borderColor: `${branding.primaryColor}80`
                        }}
                      />
                      <div className="ml-4 flex-1 grid grid-cols-12 items-center">
                        <div className="col-span-3">
                          <div className="font-medium text-gray-900">{notification.patientName}</div>
                          <div className="text-sm text-gray-500">{notification.patientMobile}</div>
                        </div>
                        
                        <div className="col-span-3">
                          <p className="text-sm text-gray-900 truncate" title={notification.message}>
                            {notification.message.length > 40 
                              ? notification.message.substring(0, 40) + '...' 
                              : notification.message}
                          </p>
                        </div>
                        
                        <div className="col-span-2">
                          <span 
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs"
                            style={getBrandingStyle(
                              notification.type === 'appointment' ? 'primary' :
                              notification.type === 'medicine' ? 'secondary' : 'accent'
                            )}
                          >
                            <span className="mr-1">{getTypeIcon(notification.type)}</span>
                            <span className="capitalize">{notification.type}</span>
                          </span>
                        </div>
                        
                        <div className="col-span-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(notification.status)}`}>
                            {notification.status}
                          </span>
                        </div>
                        
                        <div className="col-span-2 text-sm text-gray-500">
                          {formatDate(notification.scheduledDate)}
                        </div>
                      </div>
                    </div>
                    
                    {notification.failureReason && notification.status === 'failed' && (
                      <div className="ml-8 mt-2 text-sm text-red-600">
                        <strong>Failed:</strong> {notification.failureReason}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}