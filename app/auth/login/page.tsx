"use client";

import { useState, useEffect, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";

interface ClinicData {
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

export default function LoginPage() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [clinicData, setClinicData] = useState<ClinicData | null>(null);
  const [loadingClinic, setLoadingClinic] = useState(true);
  const [phoneError, setPhoneError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const router = useRouter();

  // Fetch REAL clinic data from database
  useEffect(() => {
    const fetchClinicData = async () => {
      try {
        const response = await fetch('/api/clinic/default');
        
        if (response.ok) {
          const data = await response.json();
          setClinicData(data);
        }
      } catch (error) {
        console.error("Failed to fetch clinic data:", error);
      } finally {
        setLoadingClinic(false);
      }
    };

    fetchClinicData();
  }, []);

  // Phone input handler - XSS PROTECTED
  const handlePhoneChange = (value: string) => {
    // SECURITY: Remove ALL non-numeric characters including script tags
    const numericValue = value.replace(/[^\d]/g, '');
    
    // Auto-truncate to 10 digits
    const truncatedValue = numericValue.slice(0, 10);
    
    setPhone(truncatedValue);
    
    // Real-time validation
    validatePhone(truncatedValue);
  };

  const validatePhone = (value: string) => {
    if (value.length === 0) {
      setPhoneError("Mobile number is required");
    } else if (value.length < 10) {
      setPhoneError(`Enter ${10 - value.length} more digit(s)`);
    } else {
      const phoneRegex = /^[6789]\d{9}$/;
      if (!phoneRegex.test(value)) {
        setPhoneError("Please enter a valid Indian mobile number (starts with 6,7,8,9)");
      } else {
        setPhoneError("");
      }
    }
  };

  // Prevent non-numeric keyboard input
  // More comprehensive key prevention
const handlePhoneKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
  const key = e.key;
  
  // Allow: Control keys
  if (e.ctrlKey || e.metaKey) {
    return; // Allow Ctrl+A, Ctrl+C, Ctrl+V, etc.
  }
  
  // Allow: Navigation keys
  const navigationKeys = [
    'Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 
    'Home', 'End', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'
  ];
  
  if (navigationKeys.includes(key)) {
    return;
  }
  
  // Allow: Numbers 0-9
  if (/^\d$/.test(key)) {
    return;
  }
  
  // Prevent: Everything else (letters, symbols, etc.)
  e.preventDefault();
};

  // Password input handler
  const handlePasswordChange = (value: string) => {
    setPassword(value);
    
    // Real-time validation
    if (value.trim().length === 0) {
      setPasswordError("Password is required");
    } else if (value.length < 3) {
      setPasswordError("Password must be at least 3 characters");
    } else {
      setPasswordError("");
    }
  };

  // Form validation
  const validateForm = () => {
    let isValid = true;
    
    // Phone validation
    validatePhone(phone);
    if (phoneError) isValid = false;
    
    // Password validation
    const trimmedPassword = password.trim();
    if (trimmedPassword.length === 0) {
      setPasswordError("Password is required");
      isValid = false;
    } else if (trimmedPassword.length < 3) {
      setPasswordError("Password must be at least 3 characters");
      isValid = false;
    }
    
    return isValid;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors
    setError("");
    setPhoneError("");
    setPasswordError("");
    
    // Validate form
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      const result = await signIn("credentials", {
        phone: phone,
        password: password.trim(), // Trim whitespace
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

  // Get dynamic colors
  const getPrimaryColor = () => clinicData?.primaryColor || "#2563EB";
  const getSecondaryColor = () => clinicData?.secondaryColor || "#1D4ED8";

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

  if (loadingClinic) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{
        background: `linear-gradient(135deg, ${getPrimaryColor()}08 0%, ${getSecondaryColor()}08 100%)`
      }}>
        <div className="text-center">
          <div 
            className="inline-block animate-spin rounded-full h-12 w-12 border-b-2"
            style={{ borderColor: getPrimaryColor() }}
          ></div>
          <p className="mt-4 text-gray-600">Loading clinic information...</p>
        </div>
      </div>
    );
  }

  const primaryColor = getPrimaryColor();
  const secondaryColor = getSecondaryColor();

  return (
    <div 
      className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8"
      style={{
        background: `linear-gradient(135deg, ${primaryColor}08 0%, ${secondaryColor}08 100%)`
      }}
    >
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex flex-col items-center justify-center">
          {/* Logo */}
          <div className="flex items-center justify-center mb-4">
            {clinicData?.logoUrl ? (
              <div className="h-16 w-16 rounded-full overflow-hidden bg-white shadow-lg border-2" style={{ borderColor: primaryColor }}>
                <img 
                  src={clinicData.logoUrl} 
                  alt={`${clinicData.name} Logo`}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    target.parentElement!.innerHTML = `
                      <div class="h-full w-full flex items-center justify-center text-white font-bold text-xl"
                           style="background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)">
                        ${getClinicInitials()}
                      </div>
                    `;
                  }}
                />
              </div>
            ) : (
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
          
          <h1 className="text-3xl font-bold text-center" style={{ color: primaryColor }}>
            {clinicData?.name || "Clinic Portal"}
          </h1>
          
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
        <div className="bg-white py-8 px-6 shadow-xl rounded-xl sm:px-10 border" style={{ borderColor: `${primaryColor}20` }}>
          <form onSubmit={handleLogin} noValidate>
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}
            
            <div className="space-y-5">
              {/* SECURE Phone Input */}
              {/* SECURE Phone Input - UPDATED */}
<div>
  <label htmlFor="phone" className="block text-sm font-semibold text-gray-800 mb-2">
    Mobile Number
  </label>
  <div 
    className={`flex rounded-lg shadow-sm border overflow-hidden ${
      phoneError ? 'border-red-300' : ''
    }`}
    style={{ 
      '--tw-ring-color': primaryColor,
    } as any}
  >
    <div 
      className="inline-flex items-center px-4 border-r text-sm font-medium"
      style={{ 
        backgroundColor: `${primaryColor}08`,
        borderColor: `${primaryColor}40`,
        color: primaryColor
      }}
    >
      +91
    </div>
    <input
      type="tel"
      id="phone"
      name="phone"
      value={phone}
      onChange={(e) => {
        // SECURITY: Complete XSS protection
        const input = e.target.value;
        
        // 1. Remove ALL HTML tags and scripts
        const sanitized = input.replace(/<[^>]*>?/gm, '');
        
        // 2. Remove all non-numeric characters
        const numericOnly = sanitized.replace(/\D/g, '');
        
        // 3. Limit to 10 digits
        const truncated = numericOnly.slice(0, 10);
        
        // 4. Update state
        setPhone(truncated);
        
        // 5. Validate
        validatePhone(truncated);
      }}
      onKeyDown={handlePhoneKeyDown}
      onPaste={(e) => {
        // SECURITY: Handle paste safely
        e.preventDefault();
        const pastedText = e.clipboardData.getData('text');
        
        // Sanitize pasted content
        const sanitized = pastedText.replace(/<[^>]*>?/gm, '');
        const numericOnly = sanitized.replace(/\D/g, '');
        
        // Update with sanitized value
        const newValue = (phone + numericOnly).slice(0, 10);
        setPhone(newValue);
        validatePhone(newValue);
      }}
      onInput={(e) => {
        // SECURITY: Additional protection against script injection via input event
        const target = e.target as HTMLInputElement;
        const currentValue = target.value;
        
        // If value contains script tags, reset it
        if (/<[^>]*>/.test(currentValue)) {
          const sanitized = currentValue.replace(/<[^>]*>?/gm, '');
          const numericOnly = sanitized.replace(/\D/g, '');
          const truncated = numericOnly.slice(0, 10);
          target.value = truncated;
          setPhone(truncated);
          validatePhone(truncated);
        }
      }}
      className="flex-1 block w-full px-4 py-3 text-gray-900 placeholder-gray-500 focus:outline-none sm:text-sm"
      placeholder="Enter 10-digit mobile number"
      maxLength={10}
      required
      pattern="[6789][0-9]{9}"
      title="10-digit Indian mobile number starting with 6,7,8,9"
      autoComplete="username"
      inputMode="numeric"
      // SECURITY: Add data attribute for testing
      data-testid="phone-input"
    />
  </div>
  {phoneError ? (
    <p className="mt-1 text-xs text-red-600 flex items-center">
      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
      {phoneError}
    </p>
  ) : (
    <p className="mt-2 text-xs text-gray-500">
      Enter registered mobile number (starts with 6, 7, 8, or 9)
    </p>
  )}
</div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="password" className="block text-sm font-semibold text-gray-800">
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
                    id="password"
                    name="password"
                    value={password}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    className={`block w-full px-4 py-3 border rounded-lg shadow-sm focus:outline-none sm:text-sm pr-12 ${
                      passwordError ? 'border-red-300' : ''
                    }`}
                    placeholder="Enter your password"
                    required
                    minLength={3}
                    autoComplete="current-password"
                    style={{ 
                      '--tw-ring-color': primaryColor,
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
                {passwordError && (
                  <p className="mt-1 text-xs text-red-600 flex items-center">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    {passwordError}
                  </p>
                )}
              </div>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading || !!phoneError || !!passwordError}
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

          {/* Clinic Information */}
          {clinicData && (
            <div className="mt-8 pt-6" style={{ borderTopColor: `${primaryColor}20`, borderTopWidth: '1px' }}>
              <div 
                className="rounded-lg p-4 border"
                style={{ 
                  backgroundColor: `${primaryColor}08`,
                  borderColor: `${primaryColor}20`
                }}
              >
                <p className="text-sm font-medium mb-2" style={{ color: primaryColor }}>
                  Clinic Information
                </p>
                <div className="text-xs space-y-1" style={{ color: primaryColor }}>
                  {clinicData.address && clinicData.city && (
                    <p><strong>Address:</strong> {clinicData.address}, {clinicData.city}</p>
                  )}
                  {clinicData.phone && (
                    <p><strong>Contact:</strong> +91-{clinicData.phone}</p>
                  )}
                  {clinicData.workingHours && (
                    <p><strong>Working Hours:</strong> {clinicData.workingHours}</p>
                  )}
                  {clinicData.emergencyPhone && (
                    <p><strong>Emergency:</strong> {clinicData.emergencyPhone}</p>
                  )}
                  {(clinicData.supportEmail || clinicData.email) && (
                    <p><strong>Email:</strong> {clinicData.supportEmail || clinicData.email}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Contact Link */}
          <div className="mt-6">
            <p className="text-center text-sm text-gray-600">
              Need assistance?{" "}
              <Link 
                href={`mailto:${clinicData?.supportEmail || clinicData?.email || 'support@clinic.com'}`} 
                className="font-semibold hover:underline"
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