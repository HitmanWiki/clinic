import NextAuth, { type AuthOptions, type DefaultSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

// Extend session type
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      clinicId: string;
      phone: string;
      role: string;
      pushNotificationBalance?: number;
      hasAppUsers?: number;
      pushDeliveryRate?: number;
      subscriptionPlan?: string;
      subscriptionStatus?: string;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    clinicId: string;
    phone: string;
    email: string | null;
    role: string;
    name: string;
    pushNotificationBalance?: number;
    hasAppUsers?: number;
    pushDeliveryRate?: number;
    subscriptionPlan?: string;
    subscriptionStatus?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    clinicId: string;
    phone: string;
    role: string;
    pushNotificationBalance?: number;
    hasAppUsers?: number;
    pushDeliveryRate?: number;
    subscriptionPlan?: string;
    subscriptionStatus?: string;
  }
}

// SECURITY: Input sanitization function
const sanitizeInput = (input: string): string => {
  if (!input) return '';
  
  // 1. Remove HTML/script tags
  let sanitized = input.replace(/<[^>]*>?/gm, '');
  
  // 2. Remove potentially dangerous characters
  sanitized = sanitized.replace(/[<>'"]/g, '');
  
  // 3. Trim whitespace
  sanitized = sanitized.trim();
  
  return sanitized;
};

// SECURITY: Validate phone number format
const isValidPhoneNumber = (phone: string): boolean => {
  // Must be exactly 10 digits
  if (phone.length !== 10) return false;
  
  // Must contain only digits
  if (!/^\d+$/.test(phone)) return false;
  
  // Must start with 6,7,8,9 for Indian numbers
  if (!/^[6789]/.test(phone)) return false;
  
  return true;
};

// SECURITY: Password validation
const isValidPassword = (password: string): boolean => {
  if (!password || password.length < 3) return false;
  
  // Basic password validation - adjust as needed
  // You can add more rules like:
  // - Minimum length
  // - Require special characters
  // - Require numbers, etc.
  
  return true;
};

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        phone: { label: "Phone", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        console.log("🔐 Login attempt received");
        
        // SECURITY: Validate input exists
        if (!credentials?.phone || !credentials?.password) {
          console.log("❌ Missing phone or password");
          return null;
        }
        
        // SECURITY: Sanitize inputs
        const sanitizedPhone = sanitizeInput(credentials.phone);
        const sanitizedPassword = sanitizeInput(credentials.password);
        
        console.log("🔍 Sanitized inputs:", {
          phone: sanitizedPhone,
          passwordLength: sanitizedPassword.length
        });
        
        // SECURITY: Validate phone number format
        if (!isValidPhoneNumber(sanitizedPhone)) {
          console.log("❌ Invalid phone number format:", sanitizedPhone);
          return null;
        }
        
        // SECURITY: Validate password
        if (!isValidPassword(sanitizedPassword)) {
          console.log("❌ Invalid password format");
          return null;
        }
        
        try {
          console.log("🔍 Searching for user with phone:", sanitizedPhone);
          
          // SECURITY: Using Prisma with parameterized queries - SQL Injection protected
          // Prisma automatically parameterizes queries, preventing SQL injection
          const user = await prisma.users.findUnique({
            where: { 
              phone: sanitizedPhone // Using sanitized input
            },
            include: { 
              clinics: {
                include: {
                  patients: {
                    select: { 
                      id: true,
                      // SECURITY: Only select necessary fields
                    }
                  }
                }
              }
            }
          });
          
          if (!user) {
            console.log("❌ User not found for phone:", sanitizedPhone);
            // SECURITY: Generic error message - don't reveal if user exists
            return null;
          }
          
          console.log("✅ User found:", user.id);
          
          // SECURITY: Simple password check for now
          // TODO: Implement proper password hashing with bcrypt
          const isPasswordValid = sanitizedPassword === "clinic123";
          
          if (!isPasswordValid) {
            console.log("❌ Invalid password for user:", user.id);
            // SECURITY: Generic error - don't reveal if password was close
            return null;
          }
          
          console.log("✅ Password verified for user:", user.id);
          
          // Calculate app users count
          const appUsersCount = user.clinics.patients.length;
          
          // Get clinic data with safe defaults
          const clinicData = user.clinics;
          const pushNotificationBalance = clinicData.pushNotificationBalance ?? 100;
          const pushDeliveryRate = clinicData.pushDeliveryRate ?? 0.0;
          
          // SECURITY: Return only necessary user data
          return {
            id: user.id,
            phone: user.phone,
            email: user.email,
            role: user.role || "admin",
            name: user.clinics.doctorName || "Clinic User",
            clinicId: user.clinicId,
            pushNotificationBalance,
            hasAppUsers: appUsersCount,
            pushDeliveryRate,
            subscriptionPlan: user.clinics.subscriptionPlan,
            subscriptionStatus: user.clinics.subscriptionStatus,
          };
          
        } catch (error) {
          // SECURITY: Log error but don't expose details to client
          console.error("❌ Authentication error:", error);
          
          // SECURITY: Generic error message
          return null;
        }
      },
    }),
  ],
  session: { 
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: { 
    signIn: "/auth/login",
    error: "/auth/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // SECURITY: Only store necessary claims in JWT
        token.id = user.id;
        token.clinicId = user.clinicId;
        token.phone = user.phone;
        token.role = user.role;
        token.email = user.email;
        token.name = user.name;
        token.pushNotificationBalance = user.pushNotificationBalance;
        token.hasAppUsers = user.hasAppUsers;
        token.pushDeliveryRate = user.pushDeliveryRate;
        token.subscriptionPlan = user.subscriptionPlan;
        token.subscriptionStatus = user.subscriptionStatus;
        
        console.log("🔑 JWT token created for clinic:", user.clinicId);
      }
      return token;
    },
    
    async session({ session, token }) {
      if (token && session.user) {
        // SECURITY: Only expose necessary session data
        session.user.id = token.id as string;
        session.user.clinicId = token.clinicId as string;
        session.user.phone = token.phone as string;
        session.user.role = token.role as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.pushNotificationBalance = token.pushNotificationBalance as number;
        session.user.hasAppUsers = token.hasAppUsers as number;
        session.user.pushDeliveryRate = token.pushDeliveryRate as number;
        session.user.subscriptionPlan = token.subscriptionPlan as string;
        session.user.subscriptionStatus = token.subscriptionStatus as string;
        
        console.log("🔐 Session created for clinic:", token.clinicId);
      }
      return session;
    },
    
    async redirect({ url, baseUrl }) {
      // SECURITY: Prevent open redirect vulnerabilities
      if (url.startsWith(baseUrl)) {
        return url;
      } else if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }
      return baseUrl;
    },
  },
  // SECURITY: Additional security configurations
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
  
  // SECURITY: Enable if you want to use cookies
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === "production" 
        ? "__Secure-next-auth.session-token" 
        : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };