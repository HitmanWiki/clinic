"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Clinic {
  id: string;
  name: string;
  doctorName: string;
  phone: string;
  email: string | null;
  address: string;
  city: string;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  accentColor: string | null;
  workingHours: string | null;
  emergencyPhone: string | null;
  supportEmail: string | null;
}

interface Patient {
  id: string;
  name: string;
  mobile: string;
  visitDate: string;
  hasAppInstalled: boolean;
  notificationCount: number;
  [key: string]: any;
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
  subscriptionPlan: string;
  subscriptionStatus: string;
}

// Utility functions
const formatNumber = (num: number | null | undefined): string => {
  if (num === null || num === undefined) return '0';
  
  if (Math.abs(num) >= 100000) {
    return new Intl.NumberFormat('en-IN', {
      notation: 'compact',
      compactDisplay: 'short',
      maximumFractionDigits: 1
    }).format(num);
  }
  
  return new Intl.NumberFormat('en-IN').format(num);
};

const getSafeInitials = (name: string | null | undefined): string => {
  if (!name || typeof name !== 'string') return '??';
  
  try {
    const cleanName = name.replace(/[^\w\s]/g, '').trim();
    const parts = cleanName.split(' ').filter(part => part.length > 0);
    
    if (parts.length === 0) return '??';
    
    const initials = parts.slice(0, 2)
      .map(part => part.charAt(0).toUpperCase())
      .join('');
      
    return initials || '??';
  } catch (error) {
    try {
      const parts = name.split(' ').filter(part => part.length > 0);
      if (parts.length === 0) return '??';
      
      return parts.slice(0, 2)
        .map(part => part.charAt(0).toUpperCase())
        .join('') || '??';
    } catch {
      return '??';
    }
  }
};

const formatDateForDashboard = (dateString: string | null | undefined): string => {
  if (!dateString) return "Invalid date";
  
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString("en-IN", {
      timeZone: 'Asia/Kolkata',
      day: "numeric",
      month: "short",
    });
  } catch (error) {
    return "Invalid date";
  }
};

const safeNumber = (value: any, fallback = 0): number => {
  if (value === null || value === undefined) return fallback;
  
  const num = Number(value);
  return isNaN(num) ? fallback : num;
};

// Debounce utility
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Throttle utility
function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

export default function DashboardPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  
  // States
  const [stats, setStats] = useState<DashboardStats>({
    patientsToday: 0,
    totalPatients: 0,
    notificationsScheduled: 0,
    notificationsSentToday: 0,
    patientsWithApp: 0,
    notificationDeliveryRate: 0,
    engagementRate: 0,
    totalDelivered: 0,
    totalRead: 0,
    totalFailed: 0,
    subscriptionPlan: '',
    subscriptionStatus: '',
  });
  const [clinicData, setClinicData] = useState<Clinic | null>(null);
  const [recentPatients, setRecentPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingClinic, setLoadingClinic] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [clickCount, setClickCount] = useState<number>(0);
  const [globalLoading, setGlobalLoading] = useState<boolean>(false);

  // Refs for debouncing
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isNavigatingRef = useRef<boolean>(false);

  // Get colors from clinic data
  const primaryColor = clinicData?.primaryColor || '#3b82f6';
  const secondaryColor = clinicData?.secondaryColor || '#10b981';
  const accentColor = clinicData?.accentColor || '#f59e0b';

  const fetchDashboardData = useCallback(async (): Promise<void> => {
    try {
      setIsFetching(true);
      setLoading(true);
      setError(null);

      const statsResponse = await fetch(`/api/dashboard/stats`);
      
      if (!statsResponse.ok) {
        const errorText = await statsResponse.text();
        let errorMessage = `Server error: ${statsResponse.status}`;
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }
      
      const statsText = await statsResponse.text();
      let statsData;
      
      try {
        statsData = JSON.parse(statsText);
      } catch (jsonError) {
        throw new Error('Invalid JSON response from server');
      }
      
      if (typeof statsData !== 'object' || statsData === null) {
        throw new Error('Invalid response format');
      }

      setStats({
        patientsToday: safeNumber(statsData.patientsToday),
        totalPatients: safeNumber(statsData.totalPatients),
        notificationsScheduled: safeNumber(statsData.notificationsScheduled),
        notificationsSentToday: safeNumber(statsData.notificationsSentToday),
        patientsWithApp: safeNumber(statsData.patientsWithApp),
        notificationDeliveryRate: safeNumber(statsData.notificationDeliveryRate, 0),
        engagementRate: safeNumber(statsData.engagementRate, 0),
        totalDelivered: safeNumber(statsData.totalDelivered),
        totalRead: safeNumber(statsData.totalRead),
        totalFailed: safeNumber(statsData.totalFailed),
        subscriptionPlan: statsData.subscriptionPlan || '',
        subscriptionStatus: statsData.subscriptionStatus || '',
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setError(error instanceof Error ? error.message : "Failed to load dashboard data. Please try again.");
    } finally {
      setLoading(false);
      setIsFetching(false);
    }
  }, []);

  const fetchRecentPatients = useCallback(async (): Promise<void> => {
    try {
      const patientsResponse = await fetch(`/api/patients?limit=5`);
      
      if (!patientsResponse.ok) {
        throw new Error(`Failed to fetch patients: ${patientsResponse.status}`);
      }
      
      const patientsData = await patientsResponse.json();
      
      if (!patientsData || !Array.isArray(patientsData.patients)) {
        throw new Error('Invalid response format from patients API');
      }
      
      setRecentPatients(patientsData.patients);
    } catch (error) {
      console.error("Error fetching recent patients:", error);
      setRecentPatients([]);
    }
  }, []);

  const fetchClinicData = useCallback(async (): Promise<void> => {
    try {
      setLoadingClinic(true);
      const response = await fetch('/api/settings/clinic');
      
      if (response.ok) {
        const data = await response.json();
        setClinicData(data);
      } else {
        console.error('Failed to fetch clinic data');
      }
    } catch (error) {
      console.error("Failed to fetch clinic data:", error);
    } finally {
      setLoadingClinic(false);
    }
  }, []);

  // Create memoized debounced functions
  const debouncedFetchDashboardData = useMemo(() => 
    debounce(() => {
      fetchDashboardData();
    }, 500),
    [fetchDashboardData]
  );

  const debouncedFetchRecentPatients = useMemo(() => 
    debounce(() => {
      fetchRecentPatients();
    }, 500),
    [fetchRecentPatients]
  );

  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      router.push("/auth/login");
      return;
    }

    if (sessionStatus === "authenticated") {
      fetchClinicData();
      debouncedFetchDashboardData();
      debouncedFetchRecentPatients();
    }
  }, [sessionStatus, router, fetchClinicData, debouncedFetchDashboardData, debouncedFetchRecentPatients]);

  const deletePatient = async (patientId: string): Promise<void> => {
    if (!confirm('Are you sure you want to delete this patient? This action cannot be undone.')) {
      return;
    }

    try {
      setGlobalLoading(true);
      const response = await fetch(`/api/patients/${patientId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setRecentPatients(prev => prev.filter(p => p.id !== patientId));
        debouncedFetchDashboardData();
        alert('Patient deleted successfully');
      } else {
        const errorData = await response.json();
        alert(`Failed to delete patient: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting patient:', error);
      alert('Failed to delete patient. Please try again.');
    } finally {
      setGlobalLoading(false);
    }
  };

  // Debounced navigation handler
  const handleNavigation = useCallback(
    (href: string, e?: React.MouseEvent) => {
      if (e) {
        e.preventDefault();
      }
      
      if (isNavigatingRef.current) {
        console.log('Navigation prevented - already navigating');
        return;
      }
      
      setClickCount(prev => prev + 1);
      isNavigatingRef.current = true;
      
      setGlobalLoading(true);
      
      setTimeout(() => {
        router.push(href);
        isNavigatingRef.current = false;
      }, 100);
    },
    [router]
  );

  // Throttled version of handleNavigation
  const throttledHandleNavigation = useMemo(() => 
    throttle(handleNavigation, 1000),
    [handleNavigation]
  );

  // Check if subscription is suspended
  const isSuspended = stats.subscriptionStatus === 'suspended';

  // Function to check if feature should be disabled
  const isFeatureDisabled = (featureType: 'create' | 'send' | 'edit' | 'view'): boolean => {
    if (isSuspended) {
      return ['create', 'send', 'edit'].includes(featureType);
    }
    return false;
  };

  const getAppStatusText = (hasApp: boolean): string => {
    return hasApp ? "App Installed" : "No App";
  };

  const getAppStatusColor = (hasApp: boolean): string => {
    return hasApp 
      ? "bg-green-100 text-green-800" 
      : "bg-gray-100 text-gray-800";
  };

  // Calculate total notifications sent
  const totalNotificationsSent = stats.totalDelivered + stats.totalRead + stats.totalFailed;

  // Loading Spinner Component
  const LoadingSpinner = ({ color = primaryColor, size = 'md', text = '' }: { color?: string, size?: 'sm' | 'md' | 'lg', text?: string }) => {
    const sizeClasses = {
      sm: 'h-6 w-6',
      md: 'h-12 w-12',
      lg: 'h-16 w-16'
    };
    
    return (
      <div className="flex flex-col items-center justify-center">
        <div 
          className={`${sizeClasses[size]} animate-spin rounded-full border-b-2`}
          style={{ borderColor: color }}
        ></div>
        {text && (
          <span className="mt-4 text-gray-600 animate-pulse">{text}</span>
        )}
      </div>
    );
  };

  // Global Loading Overlay
  const GlobalLoadingOverlay = ({ isLoading }: { isLoading: boolean }) => {
    if (!isLoading) return null;
    
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white bg-opacity-90 backdrop-blur-sm">
        <div className="relative">
          <div className="h-16 w-16 animate-spin rounded-full border-[6px] border-gray-200 border-t-blue-500"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-8 w-8 rounded-full border-4 border-white border-t-transparent animate-spin"></div>
          </div>
        </div>
        <p className="mt-6 text-lg font-medium text-gray-700 animate-pulse">
          Loading dashboard data...
        </p>
        <p className="mt-2 text-sm text-gray-500">
          Please wait while we fetch your latest clinic information
        </p>
      </div>
    );
  };

  if (sessionStatus === "loading" || loadingClinic) {
    return (
      <div 
        className="flex justify-center items-center min-h-[400px]"
        style={{ 
          background: `linear-gradient(135deg, ${primaryColor}10 0%, ${secondaryColor}10 100%)`
        }}
      >
        <LoadingSpinner color={primaryColor} size="lg" text="Loading dashboard..." />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">🔒</div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Required</h2>
        <p className="text-gray-600 mb-4">Please log in to access the dashboard</p>
        <Link
          href="/auth/login"
          className="px-4 py-2 rounded-lg text-white hover:opacity-90 transition-all duration-200"
          style={{ 
            background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
          }}
        >
          Go to Login
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Global Loading Overlay */}
      <GlobalLoadingOverlay isLoading={globalLoading || isFetching} />
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
        <div>
          <h1 
            className="text-2xl md:text-3xl font-semibold"
            style={{ color: primaryColor }}
          >
            Welcome back, Dr. {session?.user?.name?.split(' ')[0] || "Doctor"}! 👋
          </h1>
          <p className="text-gray-600 mt-1">
            Here's what's happening with your clinic today
          </p>
        </div>
        <div className="text-sm text-gray-500">
          Last updated: {new Date().toLocaleDateString("en-IN", {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </div>
      </div>

      {/* SUSPENSION BANNER */}
      {isSuspended && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0 text-xl">⚠️</div>
            <div className="ml-3 flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-medium text-red-800">
                    Subscription Suspended
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>
                      Your clinic subscription has been suspended. Please contact support to reactivate.
                      You can view your existing data but cannot create new records or send notifications.
                    </p>
                    <div className="mt-2 space-y-1">
                      <p className="text-xs">• Cannot add new patients</p>
                      <p className="text-xs">• Cannot send notifications</p>
                      <p className="text-xs">• Cannot create prescriptions</p>
                      <p className="text-xs">• View-only access to existing data</p>
                    </div>
                  </div>
                </div>
                <Link
                  href="/dashboard/settings/billing"
                  className="ml-4 flex-shrink-0 text-sm font-medium text-red-600 hover:text-red-800"
                >
                  Update Payment →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0">⚠️</div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
              <button
                onClick={debouncedFetchDashboardData}
                className="mt-2 text-sm text-red-600 hover:text-red-800 font-medium"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { 
            href: "/dashboard/patients/new", 
            icon: "➕", 
            title: "Add Patient", 
            desc: "Register new patient", 
            color: primaryColor,
            disabled: isFeatureDisabled('create')
          },
          { 
            href: "/dashboard/patients", 
            icon: "💊", 
            title: "New Prescription", 
            desc: "Create prescription", 
            color: secondaryColor,
            disabled: isFeatureDisabled('create')
          },
          { 
            href: "/dashboard/notifications/schedule", 
            icon: "⏰", 
            title: "Schedule Notification", 
            desc: "Set push notifications", 
            color: accentColor,
            disabled: isFeatureDisabled('create')
          },
          { 
            href: "/dashboard/notifications/send", 
            icon: "📢", 
            title: "Send Notification", 
            desc: "Push notification to patients", 
            color: primaryColor,
            disabled: isFeatureDisabled('send')
          },
        ].map((action, index) => (
          <div 
            key={index} 
            className={`relative ${action.disabled ? 'opacity-60' : ''}`}
          >
            {action.disabled && (
              <div className="absolute inset-0 bg-gray-100 bg-opacity-30 rounded-lg z-10"></div>
            )}
            <Link
              href={action.disabled ? "#" : action.href}
              className={`block p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 ${
                action.disabled ? 'pointer-events-none cursor-not-allowed' : ''
              }`}
              style={{ 
                borderLeftColor: action.color,
                borderLeftWidth: '4px'
              }}
              onClick={(e) => {
                if (action.disabled) {
                  e.preventDefault();
                  return;
                }
                e.preventDefault();
                throttledHandleNavigation(action.href, e);
              }}
            >
              <div className="flex items-center">
                <div 
                  className="h-10 w-10 rounded-full flex items-center justify-center"
                  style={{ 
                    backgroundColor: `${action.color}20`,
                    opacity: action.disabled ? 0.5 : 1
                  }}
                >
                  <span style={{ color: action.color }} className="text-lg">{action.icon}</span>
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-900">{action.title}</h3>
                  <p className="text-xs text-gray-500">{action.desc}</p>
                  {action.disabled && (
                    <p className="text-xs text-red-500 mt-1">Disabled - Subscription suspended</p>
                  )}
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>

      {/* Reports Section */}
      <div className="mt-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Reports & Analytics</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { 
              href: "/dashboard/reports", 
              icon: "📊", 
              title: "Comprehensive Reports", 
              desc: "Detailed analytics & insights", 
              color: "#8b5cf6",
              disabled: false
            },
            { 
              href: "/dashboard/reports?type=notifications", 
              icon: "📢", 
              title: "Notifications Report", 
              desc: "Push notification analytics", 
              color: accentColor,
              disabled: false
            },
            { 
              href: "/dashboard/reports?type=patients", 
              icon: "👥", 
              title: "Patients Report", 
              desc: "Patient demographics & growth", 
              color: secondaryColor,
              disabled: false
            },
            { 
              href: "/dashboard/reports?type=prescriptions", 
              icon: "💊", 
              title: "Prescriptions Report", 
              desc: "Medicine & prescription analysis", 
              color: primaryColor,
              disabled: false
            },
          ].map((action, index) => (
            <div 
              key={index} 
              className={`relative ${action.disabled ? 'opacity-60' : ''}`}
            >
              {action.disabled && (
                <div className="absolute inset-0 bg-gray-100 bg-opacity-30 rounded-lg z-10"></div>
              )}
              <Link
                href={action.disabled ? "#" : action.href}
                className={`block p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 ${
                  action.disabled ? 'pointer-events-none cursor-not-allowed' : ''
                }`}
                style={{ 
                  borderLeftColor: action.color,
                  borderLeftWidth: '4px'
                }}
                onClick={(e) => {
                  if (action.disabled) {
                    e.preventDefault();
                    return;
                  }
                  e.preventDefault();
                  throttledHandleNavigation(action.href, e);
                }}
              >
                <div className="flex items-center">
                  <div 
                    className="h-10 w-10 rounded-full flex items-center justify-center"
                    style={{ 
                      backgroundColor: `${action.color}20`,
                      opacity: action.disabled ? 0.5 : 1
                    }}
                  >
                    <span style={{ color: action.color }} className="text-lg">{action.icon}</span>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-gray-900">{action.title}</h3>
                    <p className="text-xs text-gray-500">{action.desc}</p>
                    {action.disabled && (
                      <p className="text-xs text-red-500 mt-1">Disabled - Subscription suspended</p>
                    )}
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="mt-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Today's Overview</h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { key: 'patientsToday' as keyof DashboardStats, label: 'Patients Today', icon: '👥', subtext: 'Total patients', color: primaryColor },
            { key: 'notificationsScheduled' as keyof DashboardStats, label: 'Notifications Scheduled', icon: '⏰', subtext: 'Push notifications pending', color: accentColor },
            { key: 'notificationsSentToday' as keyof DashboardStats, label: 'Notifications Sent', icon: '📢', subtext: 'Today via push notifications', color: secondaryColor },
            { key: 'patientsWithApp' as keyof DashboardStats, label: 'Patients with App', icon: '📱', subtext: 'Can receive push notifications', color: primaryColor },
          ].map((stat, index) => (
            <div key={index} className="bg-white overflow-hidden shadow rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div 
                      className="h-10 w-10 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: `${stat.color}20` }}
                    >
                      <span style={{ color: stat.color }} className="text-lg">{stat.icon}</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        {stat.label}
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {loading ? (
                          <div className="h-6 w-12 bg-gray-200 rounded animate-pulse"></div>
                        ) : (
                          formatNumber(stats[stat.key] as number)
                        )}
                      </dd>
                    </dl>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-xs text-gray-500">
                    {stat.key === 'patientsToday' 
                      ? `Total: ${loading ? "..." : formatNumber(stats.totalPatients)} patients`
                      : stat.subtext
                    }
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Push Notifications Stats */}
      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-gray-900">Push Notifications Performance</h2>
          <Link
            href="/dashboard/notifications"
            className="text-sm font-medium hover:underline"
            style={{ color: primaryColor }}
            onClick={(e) => {
              e.preventDefault();
              throttledHandleNavigation("/dashboard/notifications", e);
            }}
          >
            View All →
          </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { 
              icon: '✅', 
              label: 'Delivery Rate', 
              value: `${stats.notificationDeliveryRate}%`, 
              subtext: 'Successful deliveries', 
              color: '#10b981' 
            },
            { 
              icon: '👁️', 
              label: 'Engagement Rate', 
              value: `${stats.engagementRate}%`, 
              subtext: 'Push notification opens', 
              color: '#3b82f6' 
            },
            { 
              icon: '📊', 
              label: 'Total Sent', 
              value: formatNumber(stats.totalDelivered + stats.totalRead), 
              subtext: 'All-time notifications', 
              color: primaryColor 
            },
          ].map((item, index) => (
            <div key={index} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div 
                  className="h-12 w-12 rounded-full flex items-center justify-center mr-4"
                  style={{ backgroundColor: `${item.color}20` }}
                >
                  <span style={{ color: item.color }} className="text-xl">{item.icon}</span>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">{item.label}</div>
                  <div className="text-2xl font-bold">
                    {loading ? (
                      <div className="h-8 w-16 bg-gray-200 rounded animate-pulse"></div>
                    ) : (
                      item.value
                    )}
                  </div>
                  <div className="text-xs text-gray-500">{item.subtext}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity & Status */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* System Status */}
        <div className="bg-white shadow rounded-lg p-6 border border-gray-200">
          <h2 className="text-lg font-medium text-gray-900 mb-4">System Status</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="h-3 w-3 rounded-full bg-green-500 mr-2"></div>
                <span className="text-sm text-gray-600">Push Notification Service</span>
              </div>
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Active</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="h-3 w-3 rounded-full bg-green-500 mr-2"></div>
                <span className="text-sm text-gray-600">Database</span>
              </div>
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Connected</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: primaryColor }}></div>
                <span className="text-sm text-gray-600">Subscription</span>
              </div>
              <span className={`text-xs px-2 py-1 rounded ${
                stats.subscriptionStatus === 'active' 
                  ? 'bg-green-100 text-green-800'
                  : stats.subscriptionStatus === 'suspended'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {stats.subscriptionPlan || 'Unknown Plan'} ({stats.subscriptionStatus || 'unknown'})
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="h-3 w-3 rounded-full bg-green-500 mr-2"></div>
                <span className="text-sm text-gray-600">App Connected</span>
              </div>
              <span className="text-xs font-medium">
                {loading ? "..." : `${formatNumber(stats.patientsWithApp)} patients`}
              </span>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <Link
                href="/dashboard/settings"
                className="text-sm font-medium hover:underline"
                style={{ color: primaryColor }}
                onClick={(e) => {
                  e.preventDefault();
                  throttledHandleNavigation("/dashboard/settings", e);
                }}
              >
                Notification Settings →
              </Link>
            </div>
          </div>
        </div>

        {/* Recent Patients Table */}
        <div className="bg-white shadow rounded-lg p-6 lg:col-span-2 border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-gray-900">Recent Patients</h2>
            <Link
              href="/dashboard/patients"
              className="text-sm font-medium hover:underline"
              style={{ color: primaryColor }}
              onClick={(e) => {
                e.preventDefault();
                throttledHandleNavigation("/dashboard/patients", e);
              }}
            >
              View all →
            </Link>
          </div>
          
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg animate-pulse">
                  <div className="h-10 w-10 rounded-full bg-gray-200"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : recentPatients.length > 0 ? (
            <div className="overflow-hidden overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Patient
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Visit Date
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Notifications
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      App Status
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentPatients.map((patient) => (
                    <tr key={patient.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <div 
                            className="h-8 w-8 rounded-full flex items-center justify-center mr-3"
                            style={{ backgroundColor: `${primaryColor}20` }}
                          >
                            <span 
                              className="text-xs font-medium"
                              style={{ color: primaryColor }}
                            >
                              {getSafeInitials(patient.name)}
                            </span>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {patient.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              +91 {patient.mobile}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {formatDateForDashboard(patient.visitDate)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {formatNumber(patient.notificationCount || 0)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getAppStatusColor(patient.hasAppInstalled)}`}>
                          {getAppStatusText(patient.hasAppInstalled)}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-3">
                          <Link
                            href={`/dashboard/patients/${patient.id}`}
                            className="text-blue-600 hover:text-blue-900"
                            title="View Patient Details"
                            onClick={(e) => {
                              e.preventDefault();
                              throttledHandleNavigation(`/dashboard/patients/${patient.id}`, e);
                            }}
                          >
                            View
                          </Link>
                          
                          <Link
                            href={`/dashboard/patients/${patient.id}/edit`}
                            className="text-green-600 hover:text-green-900"
                            title="Edit Patient"
                            onClick={(e) => {
                              e.preventDefault();
                              throttledHandleNavigation(`/dashboard/patients/${patient.id}/edit`, e);
                            }}
                          >
                            Edit
                          </Link>
                          
                          <button
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete ${patient.name}? This will also delete all their prescriptions and notifications.`)) {
                                deletePatient(patient.id);
                              }
                            }}
                            className="text-red-600 hover:text-red-900"
                            title="Delete Patient"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-gray-400 text-4xl mb-4">👥</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No patients yet</h3>
              <p className="text-gray-600 mb-4">Get started by adding your first patient</p>
              <button
                onClick={() => throttledHandleNavigation("/dashboard/patients/new")}
                className={`inline-flex items-center px-4 py-2 text-white rounded-lg hover:opacity-90 transition-colors ${
                  isSuspended ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                style={{ 
                  background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                }}
                disabled={isSuspended}
              >
                {isSuspended ? 'Add Patient (Disabled)' : '+ Add First Patient'}
              </button>
              {isSuspended && (
                <p className="text-xs text-red-500 mt-2">Feature disabled - subscription suspended</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Performance Summary */}
      <div className="mt-8 bg-white shadow rounded-lg p-6 border border-gray-200">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Notification Performance</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { 
              value: stats.totalDelivered, 
              label: "Delivered", 
              subtext: "Notifications", 
              color: "#3b82f6",
              icon: "📤"
            },
            { 
              value: stats.totalRead, 
              label: "Read", 
              subtext: "Notifications", 
              color: "#10b981",
              icon: "👁️"
            },
            { 
              value: stats.totalFailed, 
              label: "Failed", 
              subtext: "Notifications", 
              color: "#ef4444",
              icon: "❌"
            },
            { 
              value: totalNotificationsSent, 
              label: "Total Sent", 
              subtext: "All Time", 
              color: primaryColor,
              icon: "📊"
            },
          ].map((item, index) => (
            <div 
              key={index} 
              className="text-center p-4 rounded-lg"
              style={{ backgroundColor: `${item.color}10` }}
            >
              <div className="text-xl mb-2" style={{ color: item.color }}>
                {item.icon}
              </div>
              <div 
                className="text-2xl font-bold mb-1"
                style={{ color: item.color }}
              >
                {loading ? "..." : formatNumber(item.value)}
              </div>
              <div 
                className="text-sm font-medium"
                style={{ color: item.color }}
              >
                {item.label}
              </div>
              <div 
                className="text-xs mt-1"
                style={{ color: `${item.color}80` }}
              >
                {item.subtext}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reports Info Card */}
      <div className="mt-8 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-6">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
              <span className="text-purple-600 text-xl">📈</span>
            </div>
          </div>
          <div className="ml-4">
            <h3 className="text-lg font-medium text-purple-900">Advanced Analytics Available</h3>
            <p className="text-purple-700 mt-1">
              Get detailed insights into your clinic's performance with comprehensive reports. 
              Track patient growth, notification effectiveness, prescription patterns, and more.
            </p>
            <div className="mt-4">
              <Link
                href="/dashboard/reports"
                className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                onClick={(e) => {
                  e.preventDefault();
                  throttledHandleNavigation("/dashboard/reports", e);
                }}
              >
                <span className="mr-2">📊</span>
                Explore Reports
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Tips Section */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div 
          className="border rounded-lg p-4"
          style={{ 
            backgroundColor: `${primaryColor}08`,
            borderColor: `${primaryColor}20`
          }}
        >
          <h3 className="text-sm font-medium mb-2 flex items-center" style={{ color: primaryColor }}>
            <span className="mr-2">💡</span> Unlimited Notifications
          </h3>
          <p className="text-sm" style={{ color: `${primaryColor}90` }}>
            All plans include unlimited push notifications. Send as many appointment reminders, 
            follow-ups, and health tips as needed to keep your patients engaged and informed.
          </p>
        </div>
        
        <div 
          className="border rounded-lg p-4"
          style={{ 
            backgroundColor: `${secondaryColor}08`,
            borderColor: `${secondaryColor}20`
          }}
        >
          <h3 className="text-sm font-medium mb-2 flex items-center" style={{ color: secondaryColor }}>
            <span className="mr-2">📈</span> Engagement Boost
          </h3>
          <p className="text-sm" style={{ color: `${secondaryColor}90` }}>
            {stats.notificationDeliveryRate > 85 
              ? `Excellent! Your notification delivery rate of ${stats.notificationDeliveryRate}% is above average. Keep it up!`
              : `Your notification delivery rate is ${stats.notificationDeliveryRate}%. Try scheduling notifications during working hours for better results.`}
          </p>
        </div>
      </div>

      {/* Subscription Warning for Suspended Accounts */}
      {isSuspended && (
        <div className="mt-8 p-6 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                <span className="text-red-600 text-lg">💰</span>
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-red-800">Subscription Reactivation Required</h3>
              <p className="text-red-700">
                To restore full access to all features including adding patients, sending notifications, 
                and creating prescriptions, please update your payment method.
              </p>
              <div className="mt-4 flex space-x-4">
                <button
                  onClick={() => throttledHandleNavigation("/dashboard/settings/billing")}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Update Payment
                </button>
                <a
                  href={`mailto:support@clinicportal.com?subject=Subscription Suspended - ${session?.user?.clinicId}`}
                  className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50"
                >
                  Contact Support
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Debug Click Counter (can be removed in production) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 text-xs text-gray-500 bg-white p-2 rounded shadow opacity-50 hover:opacity-100 transition-opacity">
          Navigation clicks: {clickCount}
        </div>
      )}
    </div>
  );
}