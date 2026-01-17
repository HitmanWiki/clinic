// /components/dashboard/Sidebar.tsx - RESPONSIVE VERSION WITH CLINIC BRANDING
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

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

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: "🏠" },
  { name: "Patients", href: "/dashboard/patients", icon: "👥" },
  { name: "Prescriptions", href: "/dashboard/prescriptions", icon: "💊" },
  { name: "Follow-ups", href: "/dashboard/follow-ups", icon: "⏰" },
  { name: "Reviews", href: "/dashboard/reviews", icon: "⭐" },
  { name: "Notifications", href: "/dashboard/notifications", icon: "🔔" },
  { name: "Settings", href: "/dashboard/settings", icon: "⚙️" },
];

export default function DashboardSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [clinicData, setClinicData] = useState<Clinic | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Get colors from clinic data or defaults
  const primaryColor = clinicData?.primaryColor || '#2563EB';
  const secondaryColor = clinicData?.secondaryColor || '#1E40AF';
  const accentColor = clinicData?.accentColor || '#F59E0B';

  useEffect(() => {
    fetchClinicData();
  }, []);

  const fetchClinicData = async () => {
    try {
      setLoading(true);
      // ✅ CORRECTED: Use the same endpoint as login screen
      const response = await fetch('/api/clinic/default');
      if (response.ok) {
        const data = await response.json();
        setClinicData(data);
      } else {
        console.error('Failed to fetch clinic data:', response.status);
      }
    } catch (error) {
      console.error("Failed to fetch clinic data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Get clinic initials for logo
  const getClinicInitials = () => {
    if (!clinicData?.name) return "CP";
    return clinicData.name
      .split(' ')
      .filter(word => word.length > 0)
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Get clinic name
  const getClinicName = () => {
    return clinicData?.name || "Clinic Portal";
  };

  // Get doctor name
  const getDoctorName = () => {
    return clinicData?.doctorName || session?.user?.name || "Doctor";
  };

  // Get clinic address
  const getClinicAddress = () => {
    if (!clinicData) return "";
    return `${clinicData.address}, ${clinicData.city}`;
  };

  if (loading) {
    return (
      <>
        {/* Mobile loading skeleton */}
        <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center">
              <div 
                className="h-8 w-8 rounded-full animate-pulse"
                style={{ 
                  background: `linear-gradient(135deg, ${primaryColor}20 0%, ${secondaryColor}20 100%)`
                }}
              ></div>
              <div className="h-6 w-32 ml-3 bg-gray-200 rounded animate-pulse"></div>
            </div>
            <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>

        {/* Desktop loading skeleton */}
        <div className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:w-64 bg-white border-r border-gray-200 z-40">
          <div className="flex items-center h-16 px-4 border-b border-gray-200">
            <div 
              className="h-10 w-10 rounded-full animate-pulse"
              style={{ 
                background: `linear-gradient(135deg, ${primaryColor}20 0%, ${secondaryColor}20 100%)`
              }}
            ></div>
            <div className="ml-3">
              <div className="h-6 w-32 bg-gray-200 rounded animate-pulse mb-1"></div>
              <div className="h-3 w-20 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Mobile menu button */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center">
            <div 
              className="h-8 w-8 rounded-full flex items-center justify-center mr-3"
              style={{ 
                background: clinicData?.logoUrl 
                  ? `url(${clinicData.logoUrl}) center/cover`
                  : `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`
              }}
            >
              {!clinicData?.logoUrl && (
                <span className="text-white font-medium text-sm">
                  {getClinicInitials()}
                </span>
              )}
            </div>
            <span 
              className="text-lg font-semibold"
              style={{ color: primaryColor }}
            >
              {getClinicName()}
            </span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <span className="text-xl">✕</span>
            ) : (
              <span className="text-xl">☰</span>
            )}
          </button>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:w-64 bg-white border-r border-gray-200 z-40">
        {/* Logo */}
        <div className="flex items-center h-16 px-4 border-b border-gray-200">
          <div 
            className="h-10 w-10 rounded-full flex items-center justify-center mr-3"
            style={{ 
              background: clinicData?.logoUrl 
                ? `url(${clinicData.logoUrl}) center/cover`
                : `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`
            }}
          >
            {!clinicData?.logoUrl && (
              <span className="text-white font-medium text-lg">
                {getClinicInitials()}
              </span>
            )}
          </div>
          <div>
            <h1 
              className="text-xl font-bold truncate max-w-[180px]"
              style={{ color: primaryColor }}
            >
              {getClinicName()}
            </h1>
            <p className="text-xs text-gray-500 truncate max-w-[180px]">
              Dr. {getDoctorName().split(' ')[0]}
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-colors border-l-4 ${
                  isActive
                    ? ""
                    : "text-gray-700 hover:bg-gray-100 border-transparent"
                }`}
                style={isActive ? { 
                  backgroundColor: `${primaryColor}10`,
                  color: primaryColor,
                  borderLeftColor: primaryColor
                } : {}}
              >
                <span className="mr-3 text-lg">{item.icon}</span>
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* User info & Sign out */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex items-center">
            <div 
              className="h-10 w-10 rounded-full flex items-center justify-center"
              style={{ 
                background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`
              }}
            >
              <span className="text-white">👨‍⚕️</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900 truncate max-w-[160px]">
                Dr. {session?.user?.name || "User"}
              </p>
              {clinicData?.city && (
                <p className="text-xs text-gray-500 truncate max-w-[160px]">
                  {clinicData.city}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/auth/login" })}
            className="mt-4 w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            <span className="mr-2">🚪</span>
            Sign Out
          </button>
          
          {/* Clinic info footer */}
          {clinicData && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="text-xs text-gray-500 space-y-1">
                {clinicData.address && clinicData.city && (
                  <p className="truncate" title={getClinicAddress()}>
                    📍 {getClinicAddress()}
                  </p>
                )}
                {clinicData.phone && (
                  <p>📞 +91 {clinicData.phone}</p>
                )}
                {clinicData.workingHours && (
                  <p>🕒 {clinicData.workingHours}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="md:hidden fixed inset-0 bg-gray-600 bg-opacity-75 z-40"
            onClick={() => setMobileMenuOpen(false)}
          />
          
          {/* Mobile menu panel */}
          <div className="md:hidden fixed inset-y-0 left-0 flex flex-col w-64 bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out">
            {/* Mobile menu header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <div className="flex items-center">
                <div 
                  className="h-10 w-10 rounded-full flex items-center justify-center mr-3"
                  style={{ 
                    background: clinicData?.logoUrl 
                      ? `url(${clinicData.logoUrl}) center/cover`
                      : `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`
                  }}
                >
                  {!clinicData?.logoUrl && (
                    <span className="text-white font-medium">
                      {getClinicInitials()}
                    </span>
                  )}
                </div>
                <div>
                  <h2 
                    className="text-lg font-bold truncate max-w-[150px]"
                    style={{ color: primaryColor }}
                  >
                    {getClinicName()}
                  </h2>
                  <p className="text-xs text-gray-500">Dr. {getDoctorName().split(' ')[0]}</p>
                </div>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
              >
                <span className="text-xl">✕</span>
              </button>
            </div>

            {/* Mobile navigation */}
            <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
              {navigation.map((item) => {
                const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center px-3 py-3 text-base font-medium rounded-lg ${
                      isActive
                        ? ""
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                    style={isActive ? { 
                      backgroundColor: `${primaryColor}10`,
                      color: primaryColor
                    } : {}}
                  >
                    <span className="mr-3 text-lg">{item.icon}</span>
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            {/* Mobile footer */}
            <div className="border-t border-gray-200 p-4">
              <div className="flex items-center mb-4">
                <div 
                  className="h-10 w-10 rounded-full flex items-center justify-center"
                  style={{ 
                    background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`
                  }}
                >
                  <span className="text-white">👨‍⚕️</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">
                    Dr. {session?.user?.name || "User"}
                  </p>
                  <p className="text-xs text-gray-500">Logged in</p>
                </div>
              </div>
              
              {/* Clinic info in mobile */}
              {clinicData && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="text-xs text-gray-600 space-y-1">
                    {clinicData.address && clinicData.city && (
                      <p className="truncate">📍 {getClinicAddress()}</p>
                    )}
                    {clinicData.phone && (
                      <p>📞 +91 {clinicData.phone}</p>
                    )}
                  </div>
                </div>
              )}
              
              <button
                onClick={() => signOut({ callbackUrl: "/auth/login" })}
                className="w-full flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <span className="mr-2">🚪</span>
                Sign Out
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}