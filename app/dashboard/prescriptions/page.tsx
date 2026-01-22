"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

interface BrandingColors {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  logoUrl?: string;
}

interface Prescription {
  id: string;
  patientId: string;
  patientName: string;
  patientMobile: string;
  date: string;
  diagnosis: string;
  medicinesCount: number;
  nextVisitDate?: string;
  status: "active" | "completed" | "cancelled";
  hasMedicines?: boolean;
}

interface PrescriptionTemplate {
  id: string;
  name: string;
  diagnosis: string;
  medicines: string[];
  usageCount: number;
}

interface PrescriptionStats {
  total: number;
  active: number;
  today: number;
  templates: number;
  withoutMedicines: number; // Add this
}

export default function PrescriptionsPage() {
  const { data: session } = useSession();
  const [branding, setBranding] = useState<BrandingColors>({
    primaryColor: '#3b82f6', // Default blue
    secondaryColor: '#10b981', // Default green
    accentColor: '#8b5cf6' // Default purple
  });
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [templates, setTemplates] = useState<PrescriptionTemplate[]>([]);
  const [stats, setStats] = useState<PrescriptionStats>({
    total: 0,
    active: 0,
    today: 0,
    templates: 0,
    withoutMedicines: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("all");
  const [showTemplates, setShowTemplates] = useState(false);

  useEffect(() => {
    fetchBranding();
    fetchPrescriptionsData();
  }, [session]);

  // Fetch branding colors from API
  const fetchBranding = async () => {
    try {
      const response = await fetch('/api/clinic/default');
      const data = await response.json();
      
      if (data) {
        setBranding({
          primaryColor: data.primaryColor || '#3b82f6',
          secondaryColor: data.secondaryColor || '#10b981',
          accentColor: data.accentColor || '#8b5cf6',
          logoUrl: data.logoUrl
        });
      }
    } catch (error) {
      console.error('Error fetching branding:', error);
      // Keep default colors if API fails
    }
  };

  const fetchPrescriptionsData = async () => {
    if (!session?.user?.clinicId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch prescriptions
      const prescriptionsResponse = await fetch(`/api/prescriptions`, {
        headers: {
          'clinicId': session.user.clinicId,
        },
      });

      if (!prescriptionsResponse.ok) {
        throw new Error('Failed to fetch prescriptions');
      }

      const prescriptionsData = await prescriptionsResponse.json();
      setPrescriptions(prescriptionsData.prescriptions || []);
      
      // Calculate stats from prescriptions
      const today = new Date().toISOString().split('T')[0];
      const todayCount = prescriptionsData.prescriptions?.filter((p: Prescription) => 
        p.date === today
      ).length || 0;
      
      const activeCount = prescriptionsData.prescriptions?.filter((p: Prescription) => 
        p.status === "active"
      ).length || 0;

      const withoutMedicinesCount = prescriptionsData.prescriptions?.filter((p: Prescription) => 
        p.medicinesCount === 0
      ).length || 0;

      // Fetch templates
      try {
        const templatesResponse = await fetch(`/api/prescriptions/templates`, {
          headers: {
            'clinicId': session.user.clinicId,
          },
        });

        if (templatesResponse.ok) {
          const templatesData = await templatesResponse.json();
          setTemplates(templatesData.templates || []);
          
          setStats({
            total: prescriptionsData.prescriptions?.length || 0,
            active: activeCount,
            today: todayCount,
            templates: templatesData.templates?.length || 0,
            withoutMedicines: withoutMedicinesCount,
          });
        }
      } catch (templateError) {
        console.log("Templates not available, using empty array");
        setTemplates([]);
        
        setStats({
          total: prescriptionsData.prescriptions?.length || 0,
          active: activeCount,
          today: todayCount,
          templates: 0,
          withoutMedicines: withoutMedicinesCount,
        });
      }

    } catch (error) {
      console.error("Error fetching prescriptions:", error);
      setError("Failed to load prescriptions. Please try again.");
      setPrescriptions([]);
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to apply branding colors
  const getBrandingStyle = (type: 'primary' | 'secondary' | 'accent' = 'primary') => {
    const colorMap = {
      primary: branding.primaryColor,
      secondary: branding.secondaryColor,
      accent: branding.accentColor
    };
    
    return {
      backgroundColor: `${colorMap[type]}15`, // 15% opacity
      color: colorMap[type],
      borderColor: `${colorMap[type]}30` // 30% opacity
    };
  };

  // Filter prescriptions based on search and filter
  const filteredPrescriptions = prescriptions.filter(prescription => {
    const matchesSearch = 
      prescription.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prescription.diagnosis.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prescription.patientMobile.includes(searchTerm);
    
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const matchesFilter = filter === "all" || 
      (filter === "today" && prescription.date === today) ||
      (filter === "week" && prescription.date >= weekAgo) ||
      (filter === "active" && prescription.status === "active") ||
      (filter === "no-medicines" && prescription.medicinesCount === 0);

    return matchesSearch && matchesFilter;
  });

  const getStatusBadge = (status: string) => {
    const colors: Record<string, { bg: string, text: string }> = {
      active: {
        bg: `${branding.primaryColor}15`,
        text: branding.primaryColor
      },
      completed: {
        bg: `${branding.secondaryColor}15`,
        text: branding.secondaryColor
      },
      cancelled: {
        bg: `${branding.accentColor}15`,
        text: branding.accentColor
      },
    };
    
    const color = colors[status] || { bg: '#f3f4f6', text: '#6b7280' };
    
    return {
      backgroundColor: color.bg,
      color: color.text
    };
  };

  const getMedicineCountBadge = (count: number) => {
    if (count === 0) {
      return {
        backgroundColor: `${branding.accentColor}15`,
        color: branding.accentColor
      };
    } else if (count <= 2) {
      return {
        backgroundColor: `${branding.secondaryColor}15`,
        color: branding.secondaryColor
      };
    } else {
      return {
        backgroundColor: `${branding.primaryColor}15`,
        color: branding.primaryColor
      };
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const handleRefresh = () => {
    fetchPrescriptionsData();
  };

  if (error && prescriptions.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="text-red-600 text-4xl mb-4">⚠️</div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Error Loading Prescriptions</h1>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 text-white rounded-lg hover:opacity-90 transition-colors"
          style={{
            backgroundColor: branding.primaryColor,
            borderColor: branding.primaryColor
          }}
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Prescriptions</h1>
          <p className="text-gray-600">Manage all patient prescriptions</p>
          <p className="text-sm text-gray-500 mt-1">
            <span style={{ color: branding.secondaryColor }}>Note:</span> Medicines are optional
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className={`px-4 py-2 border rounded-lg transition-colors ${
              showTemplates 
                ? "text-white" 
                : "bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200"
            }`}
            style={
              showTemplates ? {
                backgroundColor: branding.accentColor,
                borderColor: branding.accentColor
              } : {}
            }
          >
            {showTemplates ? "Hide Templates" : `Templates (${stats.templates})`}
          </button>
          <Link
            href="/dashboard/prescriptions/new"
            className="px-4 py-2 text-white rounded-lg hover:opacity-90 transition-colors"
            style={{
              backgroundColor: branding.primaryColor,
              borderColor: branding.primaryColor
            }}
          >
            + New Prescription
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {/* Total Prescriptions Card */}
        <div 
          className="bg-white p-4 rounded-lg shadow border transition-colors"
          style={getBrandingStyle('primary')}
        >
          <div className="text-sm">Total Prescriptions</div>
          <div className="text-2xl font-bold">
            {loading ? "..." : stats.total}
          </div>
          <div className="text-xs mt-1">All time</div>
        </div>
        
        {/* Active Card */}
        <div 
          className="bg-white p-4 rounded-lg shadow border transition-colors"
          style={getBrandingStyle('secondary')}
        >
          <div className="text-sm">Active</div>
          <div className="text-2xl font-bold">
            {loading ? "..." : stats.active}
          </div>
          <div className="text-xs mt-1">Needs follow-up</div>
        </div>
        
        {/* Without Medicines Card */}
        <div 
          className="bg-white p-4 rounded-lg shadow border transition-colors"
          style={getBrandingStyle('accent')}
        >
          <div className="text-sm">Without Medicines</div>
          <div className="text-2xl font-bold">
            {loading ? "..." : stats.withoutMedicines}
          </div>
          <div className="text-xs mt-1">Optional medicines</div>
        </div>
        
        {/* Templates Card */}
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="text-sm text-gray-500">Templates</div>
          <div className="text-2xl font-bold text-gray-900">
            {loading ? "..." : stats.templates}
          </div>
          <div className="text-xs text-gray-500 mt-1">Saved combinations</div>
        </div>
      </div>

      {/* Templates Section */}
      {showTemplates && (
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-gray-900">Prescription Templates</h2>
            <Link
              href="/dashboard/prescriptions/templates/new"
              className="px-3 py-1 text-sm rounded-lg hover:opacity-90 transition-colors"
              style={{
                backgroundColor: branding.accentColor,
                color: 'white'
              }}
            >
              + Create Template
            </Link>
          </div>
          
          {templates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((template) => (
                <div 
                  key={template.id} 
                  className="bg-white border rounded-lg p-4 hover:border-opacity-100 transition-all hover:shadow-md"
                  style={{
                    borderColor: `${branding.accentColor}30`,
                    borderWidth: '2px'
                  }}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-medium text-gray-900">{template.name}</h3>
                      <p className="text-sm text-gray-600">{template.diagnosis}</p>
                    </div>
                    <span 
                      className="text-xs px-2 py-1 rounded"
                      style={{
                        backgroundColor: `${branding.accentColor}15`,
                        color: branding.accentColor
                      }}
                    >
                      Used {template.usageCount} times
                    </span>
                  </div>
                  
                  <div className="mb-3">
                    <div className="text-xs text-gray-500 mb-1">Medicines:</div>
                    {template.medicines && template.medicines.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {template.medicines.map((medicine, idx) => (
                          <span 
                            key={idx} 
                            className="text-xs px-2 py-1 rounded"
                            style={{
                              backgroundColor: `${branding.primaryColor}10`,
                              color: branding.primaryColor
                            }}
                          >
                            {medicine}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-gray-400">No medicines in template</div>
                    )}
                  </div>
                  
                  <div className="flex space-x-2">
                    <Link
                      href={`/dashboard/prescriptions/templates/${template.id}/use`}
                      className="flex-1 px-3 py-1 text-sm text-white rounded hover:opacity-90 text-center transition-colors"
                      style={{
                        backgroundColor: branding.accentColor
                      }}
                    >
                      Use Template
                    </Link>
                    <Link
                      href={`/dashboard/prescriptions/templates/${template.id}/edit`}
                      className="px-3 py-1 text-sm border rounded hover:bg-gray-50 transition-colors"
                      style={{
                        borderColor: branding.primaryColor,
                        color: branding.primaryColor
                      }}
                    >
                      Edit
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div 
              className="border border-dashed rounded-lg p-8 text-center"
              style={{
                borderColor: `${branding.accentColor}50`,
                backgroundColor: `${branding.accentColor}05`
              }}
            >
              <div className="text-4xl mb-4">📋</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No templates yet</h3>
              <p className="text-gray-600 mb-4">Create templates for common prescriptions to save time</p>
              <Link
                href="/dashboard/prescriptions/templates/new"
                className="px-4 py-2 text-white rounded-lg hover:opacity-90 transition-colors"
                style={{
                  backgroundColor: branding.accentColor
                }}
              >
                Create First Template
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search Prescriptions
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by patient name, diagnosis, or mobile..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-colors"
                style={{
                  borderColor: `${branding.primaryColor}50`,
                  outlineColor: branding.primaryColor
                }}
                disabled={loading}
              />
              <div className="absolute right-3 top-2.5">
                🔍
              </div>
            </div>
          </div>

          {/* Filter */}
          <div className="flex flex-col md:flex-row gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filter
              </label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-colors"
                style={{
                  borderColor: `${branding.primaryColor}50`,
                  outlineColor: branding.primaryColor
                }}
                disabled={loading}
              >
                <option value="all">All Prescriptions</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="active">Active Only</option>
                <option value="completed">Completed</option>
                <option value="no-medicines">No Medicines</option>
              </select>
            </div>
            
            {/* Refresh button */}
            <div className="flex items-end">
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="px-4 py-2 border rounded-lg hover:opacity-90 disabled:opacity-50 transition-colors"
                style={{
                  borderColor: branding.primaryColor,
                  color: branding.primaryColor
                }}
              >
                {loading ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Prescriptions Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div 
              className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto"
              style={{ borderColor: branding.primaryColor }}
            ></div>
            <p className="mt-4 text-gray-600">Loading prescriptions...</p>
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
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Diagnosis
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <div className="flex items-center">
                        Medicines
                        <span 
                          className="ml-1 text-xs px-1 py-0.5 rounded"
                          style={{
                            backgroundColor: `${branding.secondaryColor}15`,
                            color: branding.secondaryColor
                          }}
                        >
                          Optional
                        </span>
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Next Visit
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredPrescriptions.map((prescription) => (
                    <tr key={prescription.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div 
                            className="h-10 w-10 rounded-full flex items-center justify-center mr-3"
                            style={{
                              backgroundColor: `${branding.primaryColor}15`,
                              color: branding.primaryColor
                            }}
                          >
                            <span className="font-medium">
                              {prescription.patientName.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {prescription.patientName}
                            </div>
                            <div className="text-xs text-gray-500">
                              +91 {prescription.patientMobile}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatDate(prescription.date)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(prescription.date).toLocaleDateString('en-IN', { weekday: 'short' })}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {prescription.diagnosis}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {prescription.medicinesCount > 0 ? (
                            <span>{prescription.medicinesCount} medicines</span>
                          ) : (
                            <span className="text-gray-400">No medicines</span>
                          )}
                        </div>
                        {prescription.medicinesCount === 0 && (
                          <div className="text-xs text-gray-400">
                            (Optional field)
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {prescription.nextVisitDate ? formatDate(prescription.nextVisitDate) : "—"}
                        </div>
                        {prescription.nextVisitDate && (
                          <div className="text-xs text-gray-500">
                            {Math.ceil((new Date(prescription.nextVisitDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span 
                          className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                          style={getStatusBadge(prescription.status)}
                        >
                          {prescription.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Link
                          href={`/dashboard/prescriptions/${prescription.id}`}
                          className="mr-4 transition-colors hover:opacity-80"
                          style={{ color: branding.primaryColor }}
                        >
                          View
                        </Link>
                        <Link
                          href={`/dashboard/prescriptions/${prescription.id}/print`}
                          className="transition-colors hover:opacity-80"
                          style={{ color: branding.secondaryColor }}
                        >
                          Print
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Empty State */}
            {filteredPrescriptions.length === 0 && (
              <div className="p-8 text-center">
                <div className="text-gray-400 text-4xl mb-4">💊</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchTerm ? "No prescriptions found" : "No prescriptions yet"}
                </h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm ? "Try a different search term" : "Get started by creating your first prescription"}
                </p>
                {!searchTerm && (
                  <Link
                    href="/dashboard/prescriptions/new"
                    className="inline-flex items-center px-4 py-2 text-white rounded-lg hover:opacity-90 transition-colors"
                    style={{
                      backgroundColor: branding.primaryColor
                    }}
                  >
                    + Create First Prescription
                  </Link>
                )}
              </div>
            )}

            {/* Pagination */}
            {filteredPrescriptions.length > 0 && filteredPrescriptions.length < 50 && (
              <div className="px-6 py-4 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-700">
                    Showing <span className="font-medium">1</span> to{" "}
                    <span className="font-medium">{filteredPrescriptions.length}</span> of{" "}
                    <span className="font-medium">{prescriptions.length}</span> prescriptions
                  </div>
                  <div className="text-sm text-gray-500">
                    {stats.withoutMedicines} prescriptions without medicines
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Quick Tips */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div 
          className="border rounded-lg p-4 transition-colors"
          style={getBrandingStyle('primary')}
        >
          <h3 className="text-sm font-medium mb-2">💡 Prescription Management Tips</h3>
          <ul className="text-sm space-y-1">
            <li>• <strong>Medicines are optional</strong> - you can create prescriptions with just diagnosis</li>
            <li>• <strong>Use templates</strong> for common conditions to save time</li>
            <li>• <strong>Filter by status</strong> to track active vs completed prescriptions</li>
            <li>• <strong>Set next visit dates</strong> for automatic patient reminders</li>
          </ul>
        </div>
        
        <div 
          className="border rounded-lg p-4 transition-colors"
          style={getBrandingStyle('secondary')}
        >
          <h3 className="text-sm font-medium mb-2">📱 Patient Benefits</h3>
          <ul className="text-sm space-y-1">
            <li>• <strong>Digital prescriptions</strong> ensure records are never lost</li>
            <li>• <strong>Medicine reminders</strong> via WhatsApp/SMS (if medicines added)</li>
            <li>• <strong>Follow-up reminders</strong> improve treatment compliance</li>
            <li>• <strong>Easy prescription sharing</strong> with other doctors</li>
          </ul>
        </div>
      </div>
    </div>
  );
}