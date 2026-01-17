"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

interface Patient {
  id: string;
  name: string;
  mobile: string;
  visitDate: string;
  followUpStatus: string;
  reviewStatus: string;
  prescriptionCount: number;
  followUpCount: number;
  notes?: string;
}

interface ClinicColors {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}

export default function PatientsPage() {
  const { data: session, status } = useSession();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("all");
  const [clinicColors, setClinicColors] = useState<ClinicColors>({
    primaryColor: "#3b82f6", // Default blue
    secondaryColor: "#10b981", // Default green
    accentColor: "#f59e0b", // Default amber
  });

  // Fetch clinic colors from database - CORRECTED ENDPOINT
  useEffect(() => {
    const fetchClinicColors = async () => {
      try {
        const response = await fetch('/api/clinic/default');
        if (response.ok) {
          const data = await response.json();
          setClinicColors({
            primaryColor: data.primaryColor || "#3b82f6",
            secondaryColor: data.secondaryColor || "#10b981",
            accentColor: data.accentColor || "#f59e0b",
          });
        }
      } catch (error) {
        console.error("Error fetching clinic colors:", error);
      }
    };

    fetchClinicColors();
  }, []);

  // Fetch patients from API
  useEffect(() => {
    if (status === "loading") return;
    
    fetchPatients();
  }, [searchTerm, filter, status]);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      
      // Build query params
      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);
      if (filter !== "all") params.append("filter", filter);
      
      const url = `/api/patients${params.toString() ? `?${params.toString()}` : ""}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Transform API data
      const transformedPatients: Patient[] = data.patients.map((patient: any) => ({
        id: patient.id,
        name: patient.name,
        mobile: patient.mobile,
        visitDate: patient.visitDate,
        followUpStatus: patient.followUpStatus || "pending",
        reviewStatus: patient.reviewStatus || "pending",
        prescriptionCount: patient.prescriptionCount || 0,
        followUpCount: patient.followUpCount || 0,
        notes: patient.notes || "",
      }));
      
      setPatients(transformedPatients);
      
    } catch (error) {
      console.error("Error fetching patients:", error);
    } finally {
      setLoading(false);
    }
  };

  // Utility functions with branding colors
  const getStatusBadge = (status: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      scheduled: { bg: `${clinicColors.primaryColor}20`, text: clinicColors.primaryColor },
      completed: { bg: `${clinicColors.secondaryColor}20`, text: clinicColors.secondaryColor },
      pending: { bg: "#fef3c7", text: "#d97706" },
      sent: { bg: `${clinicColors.accentColor}20`, text: clinicColors.accentColor },
      received: { bg: `${clinicColors.secondaryColor}20`, text: clinicColors.secondaryColor },
      skipped: { bg: "#f3f4f6", text: "#6b7280" },
    };
    
    const color = colors[status] || { bg: "#f3f4f6", text: "#6b7280" };
    return { backgroundColor: color.bg, color: color.text };
  };

  const getInitialsColor = () => {
    return {
      bg: `${clinicColors.primaryColor}20`,
      text: clinicColors.primaryColor
    };
  };

  // Calculate stats
  const totalPatients = patients.length;
  
  const todaysVisits = patients.filter(p => {
    const visitDate = new Date(p.visitDate);
    const today = new Date();
    return visitDate.toDateString() === today.toDateString();
  }).length;
  
  const pendingFollowUps = patients.filter(p => 
    p.followUpStatus === "pending"
  ).length;
  
  const reviewsReceived = patients.filter(p => 
    p.reviewStatus === "received"
  ).length;

  // Safe initials generation
  const getSafeInitials = (name: string) => {
    if (!name) return "??";
    return name.split(' ')
      .filter(word => word.length > 0)
      .slice(0, 2)
      .map(word => word.charAt(0).toUpperCase())
      .join('');
  };

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 
            className="text-2xl font-semibold"
            style={{ color: clinicColors.primaryColor }}
          >
            Patients
          </h1>
          <p className="text-gray-600">Manage your clinic&apos;s patients</p>
        </div>
        <Link
          href="/dashboard/patients/new"
          className="px-4 py-2 text-white rounded-lg hover:opacity-90 transition-all duration-200 flex items-center shadow-sm"
          style={{ 
            background: `linear-gradient(135deg, ${clinicColors.primaryColor} 0%, ${clinicColors.secondaryColor} 100%)`,
          }}
        >
          <span className="mr-2">+</span> Add Patient
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Patients", value: totalPatients, color: clinicColors.primaryColor },
          { label: "Today's Visits", value: todaysVisits, color: clinicColors.secondaryColor },
          { label: "Pending Follow-ups", value: pendingFollowUps, color: "#d97706" },
          { label: "Reviews Received", value: reviewsReceived, color: clinicColors.secondaryColor },
        ].map((stat, index) => (
          <div key={index} className="bg-white p-4 rounded-lg shadow border border-gray-200 hover:border-gray-300 transition-colors">
            <div className="text-sm text-gray-500">{stat.label}</div>
            <div 
              className="text-2xl font-bold"
              style={{ color: stat.color }}
            >
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6 border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search Patients
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name or mobile..."
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-offset-1 transition-all"
                style={{
                  borderColor: `${clinicColors.primaryColor}40`,
                  backgroundColor: `${clinicColors.primaryColor}05`,
                } as React.CSSProperties}
              />
              <div 
                className="absolute right-3 top-2.5"
                style={{ color: clinicColors.primaryColor }}
              >
                🔍
              </div>
            </div>
          </div>

          {/* Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter
            </label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full md:w-auto px-4 py-2 border rounded-lg focus:ring-2 focus:ring-offset-1 transition-all"
              style={{
                borderColor: `${clinicColors.primaryColor}40`,
                backgroundColor: `${clinicColors.primaryColor}05`,
              } as React.CSSProperties}
            >
              <option value="all">All Patients</option>
              <option value="today">Today's Visits</option>
              <option value="pending">Pending Follow-ups</option>
            </select>
          </div>
          
          {/* Refresh button */}
          <div className="flex items-end">
            <button
              onClick={fetchPatients}
              className="px-4 py-2 rounded-lg hover:opacity-90 transition-all duration-200 font-medium"
              style={{ 
                backgroundColor: `${clinicColors.primaryColor}10`,
                color: clinicColors.primaryColor,
              }}
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Patients Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
        {loading ? (
          <div className="p-8 text-center">
            <div 
              className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto"
              style={{ borderColor: clinicColors.primaryColor }}
            ></div>
            <p className="mt-4 text-gray-600">Loading patients...</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Patient
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Mobile
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Visit Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Follow-up Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Review Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {patients.map((patient) => {
                    const initialsColor = getInitialsColor();
                    const statusStyle = getStatusBadge(patient.followUpStatus);
                    
                    return (
                      <tr key={patient.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div 
                              className="h-10 w-10 rounded-full flex items-center justify-center mr-3"
                              style={{ backgroundColor: initialsColor.bg }}
                            >
                              <span 
                                className="text-sm font-medium"
                                style={{ color: initialsColor.text }}
                              >
                                {getSafeInitials(patient.name)}
                              </span>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {patient.name}
                              </div>
                              <div className="text-xs text-gray-500">
                                Prescriptions: {patient.prescriptionCount} | Follow-ups: {patient.followUpCount}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">+91 {patient.mobile}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {new Date(patient.visitDate).toLocaleDateString('en-IN')}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(patient.visitDate).toLocaleTimeString('en-IN', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span 
                            className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                            style={statusStyle}
                          >
                            {patient.followUpStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 capitalize">
                            {patient.reviewStatus}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <Link
                            href={`/dashboard/patients/${patient.id}`}
                            className="hover:underline mr-4 font-medium"
                            style={{ color: clinicColors.primaryColor }}
                          >
                            View
                          </Link>
                          <button 
                            className="hover:underline font-medium"
                            style={{ color: clinicColors.secondaryColor }}
                          >
                            Message
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Empty State */}
            {patients.length === 0 && (
              <div className="p-8 text-center">
                <div className="text-gray-400 text-4xl mb-4">👥</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No patients found
                </h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm || filter !== "all" 
                    ? "Try a different search term or filter" 
                    : "Get started by adding your first patient"}
                </p>
                {!searchTerm && filter === "all" && (
                  <Link
                    href="/dashboard/patients/new"
                    className="inline-flex items-center px-4 py-2 text-white rounded-lg hover:opacity-90 transition-all duration-200 shadow-sm"
                    style={{ 
                      background: `linear-gradient(135deg, ${clinicColors.primaryColor} 0%, ${clinicColors.secondaryColor} 100%)`,
                    }}
                  >
                    + Add First Patient
                  </Link>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Debug info (optional - remove in production) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg text-sm border border-gray-200">
          <div className="font-medium mb-2 flex items-center">
            <span className="mr-2">🔧</span> Debug Info
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>Search: "{searchTerm}" | Filter: "{filter}"</div>
            <div>Patients: {patients.length} loaded</div>
            <div>Primary Color: {clinicColors.primaryColor}</div>
            <div>Secondary Color: {clinicColors.secondaryColor}</div>
            <div>Accent Color: {clinicColors.accentColor}</div>
            <div>API Endpoint: /api/clinic/default</div>
          </div>
        </div>
      )}
    </div>
  );
}