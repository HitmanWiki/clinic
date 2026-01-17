"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";

// Define clinic type with ALL fields
interface Clinic {
  id: string;
  name: string;
  doctorName: string;
  phone: string;
  email: string | null;
  address: string;
  city: string;
  // Branding fields
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  accentColor: string | null;
  workingHours: string | null;
  emergencyPhone: string | null;
  supportEmail: string | null;
}

export default function LoginPage() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [clinicData, setClinicData] = useState<Clinic | null>(null);
  const [loadingClinic, setLoadingClinic] = useState(true);
  const router = useRouter();

  // Fetch clinic data from database
  useEffect(() => {
    const fetchClinicData = async () => {
      try {
        const response = await fetch('/api/clinic/default');
        
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
    };

    fetchClinicData();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Enhanced phone validation for Indian numbers
    const phoneRegex = /^[6789]\d{9}$/; // Indian mobile numbers start with 6,7,8,9
    if (!phoneRegex.test(phone)) {
      setError("Please enter a valid 10-digit Indian mobile number");
      return;
    }
    
    if (!password.trim()) {
      setError("Please enter your password");
      return;
    }
    
    setLoading(true);
    setError("");
    
    try {
      const result = await signIn("credentials", {
        phone: phone,
        password: password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid phone number or password");
        setLoading(false);
      } else {
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("Login error:", error);
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    if (clinicData?.supportEmail) {
      setError(`Please email ${clinicData.supportEmail} for password reset`);
    } else if (clinicData?.email) {
      setError(`Please email ${clinicData.email} for password reset`);
    } else {
      setError("Please contact clinic administration for password reset");
    }
  };

  // Get colors from clinic data or use defaults
  const primaryColor = clinicData?.primaryColor || '#2563EB';
  const secondaryColor = clinicData?.secondaryColor || '#1E40AF';
  const accentColor = clinicData?.accentColor || '#F59E0B';

  // Get initials for logo
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

  // Format clinic address
  const getClinicAddress = () => {
    if (!clinicData) return "";
    return `${clinicData.address}, ${clinicData.city}`;
  };

  // Get working hours
  const getWorkingHours = () => {
    return clinicData?.workingHours || '9:00 AM - 8:00 PM';
  };

  // Get emergency phone
  const getEmergencyPhone = () => {
    return clinicData?.emergencyPhone || `+91-${clinicData?.phone || '9876543210'}`;
  };

  // Get support email
  const getSupportEmail = () => {
    return clinicData?.supportEmail || clinicData?.email || 'support@clinic.com';
  };

  if (loadingClinic) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ 
        background: `linear-gradient(135deg, ${primaryColor}20 0%, ${secondaryColor}20 100%)`
      }}>
        <div className="text-center">
          <div 
            className="inline-block animate-spin rounded-full h-12 w-12 border-b-2"
            style={{ borderColor: primaryColor }}
          ></div>
          <p className="mt-4 text-gray-600">Loading clinic information...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8"
      style={{ 
        background: `linear-gradient(135deg, ${primaryColor}10 0%, ${secondaryColor}10 100%)`
      }}
    >
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex flex-col items-center justify-center">
          {/* Dynamic Clinic Logo */}
          <div className="flex items-center justify-center mb-4">
            {clinicData?.logoUrl ? (
              // If logo URL exists, show image
              <div className="h-16 w-16 rounded-full overflow-hidden bg-white shadow-lg">
                <img 
                  src={clinicData.logoUrl} 
                  alt={`${clinicData.name} Logo`}
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              // Fallback to colored initials
              <div 
                className="h-16 w-16 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg"
                style={{ 
                  background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`
                }}
              >
                {getClinicInitials()}
              </div>
            )}
          </div>
          
          {/* Dynamic Clinic Name */}
          <h1 className="text-3xl font-bold text-gray-900 text-center">
            <span style={{ color: primaryColor }}>
              {clinicData?.name || "Clinic Portal"}
            </span>
          </h1>
          
          {/* Dynamic Doctor Name if available */}
          {clinicData?.doctorName && (
            <h2 className="mt-2 text-center text-xl font-semibold text-gray-700">
              {clinicData.doctorName}
            </h2>
          )}
        </div>
        
        <p className="mt-4 text-center text-sm text-gray-600">
          Secure access to clinic management system
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl rounded-xl sm:px-10 border border-gray-100">
          <form onSubmit={handleLogin}>
            {error && (
              <div className={`mb-4 px-4 py-3 rounded-md text-sm ${
                error.includes("Invalid") || error.includes("wrong") 
                  ? "bg-red-50 border border-red-200 text-red-600"
                  : "bg-blue-50 border border-blue-200 text-blue-600"
              }`}>
                {error}
              </div>
            )}
            
            <div className="space-y-5">
              {/* Phone Number */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Mobile Number
                </label>
                <div className="flex rounded-lg shadow-sm border border-gray-300 focus-within:ring-2 focus-within:border-blue-500 overflow-hidden"
                     style={{ 
                       '--tw-ring-color': primaryColor,
                       '--tw-border-opacity': 1,
                       borderColor: `${primaryColor}40`
                     } as any}
                >
                  <div 
                    className="inline-flex items-center px-4 border-r border-gray-300 text-sm font-medium"
                    style={{ 
                      backgroundColor: `${primaryColor}10`,
                      color: primaryColor
                    }}
                  >
                    +91
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    className="flex-1 block w-full px-4 py-3 text-gray-900 placeholder-gray-500 focus:outline-none sm:text-sm"
                    placeholder="Enter 10-digit mobile number"
                    maxLength={10}
                    required
                    style={{ 
                      '--tw-ring-color': primaryColor,
                    } as any}
                  />
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Enter registered mobile number (starts with 6, 7, 8, or 9)
                </p>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-gray-800">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-sm font-medium hover:underline"
                    style={{ color: primaryColor }}
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative rounded-lg shadow-sm">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none sm:text-sm pr-12"
                    placeholder="Enter your password"
                    required
                    style={{ 
                      '--tw-ring-color': primaryColor,
                      borderColor: `${primaryColor}40`
                    } as any}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center hover:text-gray-700"
                    style={{ color: primaryColor }}
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.59 6.59m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || phone.length !== 10 || !password.trim()}
              className="mt-8 w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-lg text-base font-semibold text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              style={{ 
                background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                '--tw-ring-color': primaryColor,
              } as any}
            >
              {loading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                "Sign In to Dashboard"
              )}
            </button>
          </form>

          {/* Dynamic Clinic Information Section */}
          {clinicData && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div 
                className="rounded-lg p-4 border"
                style={{ 
                  backgroundColor: `${primaryColor}08`,
                  borderColor: `${primaryColor}20`
                }}
              >
                <p className="text-sm font-medium mb-2" style={{ color: primaryColor }}>
                  <svg className="inline-block w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  Clinic Information
                </p>
                <div className="text-xs space-y-1" style={{ color: primaryColor }}>
                  {clinicData.address && clinicData.city && (
                    <p><strong>Address:</strong> {getClinicAddress()}</p>
                  )}
                  {clinicData.phone && (
                    <p><strong>Contact:</strong> +91-{clinicData.phone}</p>
                  )}
                  <p><strong>Working Hours:</strong> {getWorkingHours()}</p>
                  <p><strong>Emergency:</strong> {getEmergencyPhone()}</p>
                  <p><strong>Email:</strong> {getSupportEmail()}</p>
                </div>
              </div>
            </div>
          )}

          {/* Setup Clinic Link */}
          <div className="mt-6">
            <p className="text-center text-sm text-gray-600">
              Need assistance?{" "}
              <Link 
                href={`mailto:${getSupportEmail()}`} 
                className="font-semibold underline"
                style={{ color: primaryColor }}
              >
                Contact clinic support
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}