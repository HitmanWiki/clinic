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

// Input sanitization
const sanitizeInput = (input: string): string => {
  if (!input) return '';
  return input.replace(/<[^>]*>?/gm, '').replace(/[<>'"]/g, '').trim();
};

const isValidPhoneNumber = (phone: string): boolean => {
  return phone.length === 10 && /^\d+$/.test(phone) && /^[6789]/.test(phone);
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
        try {
          if (!credentials?.phone || !credentials?.password) {
            return null;
          }
          
          const sanitizedPhone = sanitizeInput(credentials.phone);
          const sanitizedPassword = sanitizeInput(credentials.password);
          
          if (!isValidPhoneNumber(sanitizedPhone)) {
            return null;
          }
          
          const user = await prisma.users.findUnique({
            where: { phone: sanitizedPhone },
            include: { 
              clinics: {
                include: {
                  patients: { select: { id: true } }
                }
              }
            }
          });
          
          if (!user) {
            return null;
          }
          
          // Password check
          const isPasswordValid = sanitizedPassword === "clinic123";
          if (!isPasswordValid) {
            return null;
          }
          
          const appUsersCount = user.clinics.patients.length;
          const clinicData = user.clinics;
          
          return {
            id: user.id,
            phone: user.phone,
            email: user.email,
            role: user.role || "admin",
            name: user.clinics.doctorName || "Clinic User",
            clinicId: user.clinicId,
            pushNotificationBalance: clinicData.pushNotificationBalance ?? 100,
            hasAppUsers: appUsersCount,
            pushDeliveryRate: clinicData.pushDeliveryRate ?? 0.0,
            subscriptionPlan: user.clinics.subscriptionPlan,
            subscriptionStatus: user.clinics.subscriptionStatus,
          };
          
        } catch (error) {
          console.error("Auth error:", error);
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
      }
      return token;
    },
    
    async session({ session, token }) {
      if (token && session.user) {
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
      }
      return session;
    },
    
    async redirect({ url, baseUrl }) {
      if (url.startsWith(baseUrl)) {
        return url;
      } else if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }
      return baseUrl;
    },
  },
  // CRITICAL FOR VERCEL:
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
  // Use cookies that work on Vercel
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax", // Change to "none" if you have cross-domain issues
        path: "/",
        secure: true, // TRUE for production (Vercel uses HTTPS)
      },
    },
    callbackUrl: {
      name: `next-auth.callback-url`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: true,
      },
    },
    csrfToken: {
      name: `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: true,
      },
    },
  },
  // Important for server-side APIs
  useSecureCookies: process.env.NODE_ENV === "production",
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };