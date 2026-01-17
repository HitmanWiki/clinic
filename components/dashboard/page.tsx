// app/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

interface DashboardStats {
  patientsToday: number;
  followUpsScheduled: number;
  messagesSentToday: number;
  reviewRequestsSent: number;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<DashboardStats>({
    patientsToday: 0,
    followUpsScheduled: 0,
    messagesSentToday: 0,
    reviewRequestsSent: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    setLoading(true);
    // Mock data for now
    setTimeout(() => {
      setStats({
        patientsToday: 12,
        followUpsScheduled: 45,
        messagesSentToday: 28,
        reviewRequestsSent: 15,
      });
      setLoading(false);
    }, 1000);
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">
        Welcome, {session?.user?.name || "Doctor"}
      </h1>
      
      {/* Stats Grid */}
      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-4.201a4 4 0 01-4.9 4.9m4.9-4.9a9 9 0 01-9 9" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Patients Today
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {loading ? "..." : stats.patientsToday}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                  <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Follow-ups Scheduled
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {loading ? "..." : stats.followUpsScheduled}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Add two more stat cards similarly */}
      </div>

      {/* Status Indicators */}
      <div className="mt-6 bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">System Status</h2>
        <div className="space-y-3">
          <div className="flex items-center">
            <div className="h-3 w-3 rounded-full bg-green-500 mr-2"></div>
            <span className="text-sm text-gray-600">WhatsApp: Active</span>
          </div>
          <div className="flex items-center">
            <div className="h-3 w-3 rounded-full bg-green-500 mr-2"></div>
            <span className="text-sm text-gray-600">SMS: Active (Fallback)</span>
          </div>
          <div className="flex items-center">
            <span className="text-sm text-gray-600">Message Balance: 247/300</span>
          </div>
          <div className="flex items-center">
            <span className="text-sm text-gray-600">Subscription: Starter Plan (Active)</span>
          </div>
        </div>
      </div>
    </div>
  );
}