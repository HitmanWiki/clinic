// lib/otp-service.ts
export async function sendOTP(phone: string): Promise<boolean> {
  console.log(`📱 [OTP Service] OTP would be sent to ${phone}`);
  console.log(`💡 Development: OTP is 123456`);
  
  // In production, implement:
  // - Twilio
  // - MSG91
  // - TextLocal
  // - Your SMS provider
  
  return true; // Always return true in development
}

export async function verifyOTP(phone: string, otp: string): Promise<boolean> {
  console.log(`📱 [OTP Service] Verifying OTP for ${phone}: ${otp}`);
  
  // In development, accept 123456
  if (process.env.NODE_ENV === 'development') {
    return otp === '123456';
  }
  
  // In production, verify against database
  return false;
}