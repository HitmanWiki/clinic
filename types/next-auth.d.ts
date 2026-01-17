import { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      clinicId: string;
      pushNotificationBalance?: number;
      hasAppUsers?: number;
      pushDeliveryRate?: number;
      subscriptionPlan?: string;
      subscriptionStatus?: string;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    clinicId: string;
    messageBalance?: number;
    subscriptionPlan?: string;
    subscriptionStatus?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    clinicId: string;
    messageBalance?: number;
    subscriptionPlan?: string;
    subscriptionStatus?: string;
  }
}