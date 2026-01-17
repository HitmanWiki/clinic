// app/dashboard/reports/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { format, subDays } from "date-fns";
import Link from "next/link";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// Define TypeScript interfaces for the report data
interface NotificationStats {
  total: number;
  delivered: number;
  read: number;
  failed: number;
  deliveryRate: number;
  engagementRate: number;
  byType: Array<{ type: string; count: number }>;
  byCategory: Array<{ category: string; count: number }>;
  daily: Array<{ date: string; count: number }>;
  hourlyTrend: Array<{ hour: number; count: number }>;
}

interface PatientStats {
  total: number;
  newByDay: Array<{ date: string; count: number }>;
  byGender: Array<{ gender: string; count: number; percentage: number }>;
  byAgeGroup: Array<{ ageGroup: string; count: number; percentage: number }>;
  appInstallationRate: number;
  optOutRate: number;
  retentionRate: number;
  sourceAnalysis: Array<{ source: string; count: number }>;
}

interface PrescriptionStats {
  total: number;
  withReminders: number;
  reminderRate: number;
  byDay: Array<{ date: string; count: number }>;
  topMedicines: Array<{ medicine: string; count: number; percentage: number }>;
  commonDiagnosis: Array<{ diagnosis: string; count: number }>;
  averageMedicinesPerPrescription: number;
}

interface ReviewStats {
  total: number;
  averageRating: number;
  ratingDistribution: Array<{ rating: number; count: number }>;
  byStatus: Array<{ status: string; count: number; percentage: number }>;
  byPlatform: Array<{ platform: string; count: number; percentage: number }>;
  responseRate: number;
  conversionRate: number;
  sentimentAnalysis: {
    positive: number;
    neutral: number;
    negative: number;
  };
}

interface AnalyticsStats {
  peakHours: Array<{ hour: string; patients: number }>;
  weeklyTrend: Array<{ day: string; count: number }>;
  monthlyGrowth: {
    patients: number;
    prescriptions: number;
    notifications: number;
  };
  patientEngagement: {
    activePatients: number;
    returningPatients: number;
    engagementScore: number;
  };
}

interface SummaryStats {
  totalPatients: number;
  totalNotifications: number;
  totalPrescriptions: number;
  totalReviews: number;
  newPatients: number;
  patientsWithApp: number;
  growthRate?: number;
}

interface ReportResponse {
  summary: SummaryStats;
  notifications: NotificationStats;
  patients: PatientStats;
  prescriptions: PrescriptionStats;
  reviews: ReviewStats;
  analytics: AnalyticsStats;
}

// Define interface for individual report responses
interface NotificationReport {
  notifications: NotificationStats;
}

interface PatientReport {
  patients: PatientStats;
}

interface PrescriptionReport {
  prescriptions: PrescriptionStats;
}

interface ReviewReport {
  reviews: ReviewStats;
}

// Color palette for charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FF6B6B', '#4ECDC4'];

// Custom label component for pie charts
const PieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, payload }: any) => {
  if (!payload) return null;
  
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  
  // Get the data from payload
  const data = payload.payload || payload;
  const name = data.ageGroup || data.type || data.gender || data.platform || 'Unknown';
  const value = data.count || 0;
  const percentage = data.percentage || (percent * 100).toFixed(0);
  
  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      fontSize={12}
    >
      {`${name}: ${value}`}
    </text>
  );
};

export default function ReportsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const reportType = searchParams.get("type") || "overview";
  
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<ReportResponse | null>(null);
  const [individualReport, setIndividualReport] = useState<NotificationReport | PatientReport | PrescriptionReport | ReviewReport | null>(null);
  const [dateRange, setDateRange] = useState({
    startDate: format(subDays(new Date(), 30), "yyyy-MM-dd"),
    endDate: format(new Date(), "yyyy-MM-dd"),
  });
  
  const fetchReportData = useCallback(async () => {
    if (!session?.user?.clinicId) return;
    
    try {
      setLoading(true);
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        type: reportType,
      });
      
      const response = await fetch(`/api/reports?${params}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch report data");
      }
      
      const data = await response.json();
      
      // Handle different response structures
      if (reportType === "overview") {
        setReportData(data as ReportResponse);
        setIndividualReport(null);
      } else {
        setIndividualReport(data);
        setReportData(null);
      }
    } catch (error) {
      console.error("Error fetching report:", error);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.clinicId, dateRange, reportType]);
  
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
      return;
    }
    
    if (status === "authenticated") {
      fetchReportData();
    }
  }, [status, router, fetchReportData]);
  
  // Format number with commas
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-IN').format(num);
  };
  
  // Format percentage
  const formatPercentage = (value: number) => {
    return `${value}%`;
  };
  
  // Helper function to get data safely
  const getPatientsData = (): PatientStats | null => {
    if (reportType === "overview" && reportData?.patients) {
      return reportData.patients;
    } else if (reportType === "patients" && individualReport && 'patients' in individualReport) {
      return (individualReport as PatientReport).patients;
    }
    return null;
  };
  
  const getNotificationsData = (): NotificationStats | null => {
    if (reportType === "overview" && reportData?.notifications) {
      return reportData.notifications;
    } else if (reportType === "notifications" && individualReport && 'notifications' in individualReport) {
      return (individualReport as NotificationReport).notifications;
    }
    return null;
  };
  
  const getPrescriptionsData = (): PrescriptionStats | null => {
    if (reportType === "overview" && reportData?.prescriptions) {
      return reportData.prescriptions;
    } else if (reportType === "prescriptions" && individualReport && 'prescriptions' in individualReport) {
      return (individualReport as PrescriptionReport).prescriptions;
    }
    return null;
  };
  
  const getReviewsData = (): ReviewStats | null => {
    if (reportType === "overview" && reportData?.reviews) {
      return reportData.reviews;
    } else if (reportType === "reviews" && individualReport && 'reviews' in individualReport) {
      return (individualReport as ReviewReport).reviews;
    }
    return null;
  };
  
  const getSummaryData = (): SummaryStats | null => {
    return reportData?.summary || null;
  };
  
  const getAnalyticsData = (): AnalyticsStats | null => {
    return reportData?.analytics || null;
  };
  
  // Render loading state
  if (status === "loading" || loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-600">Loading report data...</span>
      </div>
    );
  }
  
  // Render based on report type
  const renderReportContent = () => {
    switch (reportType) {
      case "overview":
        return renderOverviewReport();
      case "notifications":
        return renderNotificationsReport();
      case "patients":
        return renderPatientsReport();
      case "prescriptions":
        return renderPrescriptionsReport();
      case "reviews":
        return renderReviewsReport();
      default:
        return renderOverviewReport();
    }
  };
  
  // Overview Report
  const renderOverviewReport = () => {
    const summary = getSummaryData();
    const notifications = getNotificationsData();
    const patients = getPatientsData();
    const prescriptions = getPrescriptionsData();
    const reviews = getReviewsData();
    const analytics = getAnalyticsData();
    
    if (!summary || !notifications || !patients || !prescriptions || !reviews || !analytics) {
      return (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">📊</div>
          <h3 className="text-xl font-medium text-gray-900 mb-2">
            No Overview Data Available
          </h3>
          <p className="text-gray-600">
            Please generate a report with the selected date range
          </p>
        </div>
      );
    }
    
    return (
      <div className="space-y-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Patients</h3>
            <p className="text-3xl font-bold text-blue-600">{formatNumber(summary.totalPatients)}</p>
            <p className="text-sm text-gray-600 mt-2">New: {formatNumber(summary.newPatients)}</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Notifications</h3>
            <p className="text-3xl font-bold text-green-600">{formatNumber(summary.totalNotifications)}</p>
            <p className="text-sm text-gray-600 mt-2">Delivery Rate: {formatPercentage(notifications.deliveryRate)}</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Prescriptions</h3>
            <p className="text-3xl font-bold text-purple-600">{formatNumber(summary.totalPrescriptions)}</p>
            <p className="text-sm text-gray-600 mt-2">With Reminders: {formatNumber(prescriptions.withReminders)}</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Reviews</h3>
            <p className="text-3xl font-bold text-orange-600">{formatNumber(summary.totalReviews)}</p>
            <p className="text-sm text-gray-600 mt-2">Avg Rating: {reviews.averageRating.toFixed(1)}/5</p>
          </div>
        </div>
        
        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Notifications Daily Trend */}
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Notifications Daily Trend</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={notifications.daily}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="count" stroke="#8884d8" activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* Patient Age Distribution */}
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Patient Age Distribution</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={patients.byAgeGroup}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={PieLabel}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {patients.byAgeGroup.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name, props) => {
                    const data = props.payload;
                    return [
                      `${value} patients (${data.percentage || 0}%)`,
                      data.ageGroup || 'Age Group'
                    ];
                  }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* Notification Types */}
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Notification Types</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={notifications.byType}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* Top Medicines */}
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 10 Medicines</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={prescriptions.topMedicines.slice(0, 10)}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="medicine" width={100} />
                  <Tooltip formatter={(value, name, props) => {
                    const data = props.payload;
                    return [
                      `${value} prescriptions (${data.percentage || 0}%)`,
                      data.medicine || 'Medicine'
                    ];
                  }} />
                  <Bar dataKey="count" fill="#ffc658" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        
        {/* Detailed Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Notification Performance */}
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Notification Performance</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Sent</span>
                <span className="font-semibold">{formatNumber(notifications.total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Delivered</span>
                <span className="font-semibold text-green-600">{formatNumber(notifications.delivered)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Read</span>
                <span className="font-semibold text-blue-600">{formatNumber(notifications.read)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Failed</span>
                <span className="font-semibold text-red-600">{formatNumber(notifications.failed)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Delivery Rate</span>
                <span className="font-semibold">{formatPercentage(notifications.deliveryRate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Engagement Rate</span>
                <span className="font-semibold">{formatPercentage(notifications.engagementRate)}</span>
              </div>
            </div>
          </div>
          
          {/* Patient Statistics */}
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Patient Statistics</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Patients</span>
                <span className="font-semibold">{formatNumber(patients.total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">New Patients</span>
                <span className="font-semibold">{formatNumber(summary.newPatients)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">App Installation Rate</span>
                <span className="font-semibold">{formatPercentage(patients.appInstallationRate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Retention Rate</span>
                <span className="font-semibold">{formatPercentage(patients.retentionRate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Opt-out Rate</span>
                <span className="font-semibold">{formatPercentage(patients.optOutRate)}</span>
              </div>
            </div>
          </div>
          
          {/* Growth Analytics */}
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Growth Analytics</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Patient Growth</span>
                <span className="font-semibold text-green-600">
                  {analytics.monthlyGrowth.patients > 0 ? '+' : ''}{analytics.monthlyGrowth.patients}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Prescription Growth</span>
                <span className="font-semibold text-blue-600">
                  {analytics.monthlyGrowth.prescriptions > 0 ? '+' : ''}{analytics.monthlyGrowth.prescriptions}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Notification Growth</span>
                <span className="font-semibold text-purple-600">
                  {analytics.monthlyGrowth.notifications > 0 ? '+' : ''}{analytics.monthlyGrowth.notifications}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Active Patients</span>
                <span className="font-semibold">{formatNumber(analytics.patientEngagement.activePatients)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Engagement Score</span>
                <span className="font-semibold">{formatPercentage(analytics.patientEngagement.engagementScore)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  // Notifications Report
  const renderNotificationsReport = () => {
    const notifications = getNotificationsData();
    
    if (!notifications) {
      return (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">📢</div>
          <h3 className="text-xl font-medium text-gray-900 mb-2">
            No Notifications Data Available
          </h3>
          <p className="text-gray-600">
            Please generate a report with the selected date range
          </p>
        </div>
      );
    }
    
    return (
      <div className="space-y-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Notifications</h3>
            <p className="text-3xl font-bold text-blue-600">{formatNumber(notifications.total)}</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delivery Rate</h3>
            <p className="text-3xl font-bold text-green-600">{formatPercentage(notifications.deliveryRate)}</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Engagement Rate</h3>
            <p className="text-3xl font-bold text-purple-600">{formatPercentage(notifications.engagementRate)}</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed Notifications</h3>
            <p className="text-3xl font-bold text-red-600">{formatNumber(notifications.failed)}</p>
          </div>
        </div>
        
        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Daily Trend */}
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Notification Trend</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={notifications.daily}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* Notification Types */}
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Notification Types Distribution</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={notifications.byType}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={PieLabel}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {notifications.byType.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name, props) => {
                    const data = props.payload;
                    return [`${value} notifications`, data.type || 'Type'];
                  }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        
        {/* Hourly Trend */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Hourly Notification Trend</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={notifications.hourlyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="hour" 
                  label={{ value: 'Hour of Day', position: 'insideBottom', offset: -5 }}
                />
                <YAxis label={{ value: 'Number of Notifications', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#82ca9d" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  };
  
  // Patients Report
  const renderPatientsReport = () => {
    const patients = getPatientsData();
    
    if (!patients) {
      return (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">👥</div>
          <h3 className="text-xl font-medium text-gray-900 mb-2">
            No Patients Data Available
          </h3>
          <p className="text-gray-600">
            Please generate a report with the selected date range
          </p>
        </div>
      );
    }
    
    return (
      <div className="space-y-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Patients</h3>
            <p className="text-3xl font-bold text-blue-600">{formatNumber(patients.total)}</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">App Installation</h3>
            <p className="text-3xl font-bold text-green-600">{formatPercentage(patients.appInstallationRate)}</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Retention Rate</h3>
            <p className="text-3xl font-bold text-purple-600">{formatPercentage(patients.retentionRate)}</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Opt-out Rate</h3>
            <p className="text-3xl font-bold text-red-600">{formatPercentage(patients.optOutRate)}</p>
          </div>
        </div>
        
        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* New Patients Daily */}
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">New Patients Daily Trend</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={patients.newByDay}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* Gender Distribution */}
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Gender Distribution</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={patients.byGender}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={PieLabel}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {patients.byGender.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name, props) => {
                    const data = props.payload;
                    return [
                      `${value} patients (${data.percentage || 0}%)`,
                      data.gender || 'Gender'
                    ];
                  }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        
        {/* Age Group Distribution */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Age Group Distribution</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={patients.byAgeGroup}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="ageGroup" />
                <YAxis />
                <Tooltip formatter={(value, name, props) => {
                  const data = props.payload;
                  return [
                    `${value} patients (${data.percentage || 0}%)`,
                    data.ageGroup || 'Age Group'
                  ];
                }} />
                <Bar dataKey="count" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  };
  
  // Prescriptions Report
  const renderPrescriptionsReport = () => {
    const prescriptions = getPrescriptionsData();
    
    if (!prescriptions) {
      return (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">💊</div>
          <h3 className="text-xl font-medium text-gray-900 mb-2">
            No Prescriptions Data Available
          </h3>
          <p className="text-gray-600">
            Please generate a report with the selected date range
          </p>
        </div>
      );
    }
    
    return (
      <div className="space-y-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Prescriptions</h3>
            <p className="text-3xl font-bold text-blue-600">{formatNumber(prescriptions.total)}</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">With Reminders</h3>
            <p className="text-3xl font-bold text-green-600">{formatNumber(prescriptions.withReminders)}</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Reminder Rate</h3>
            <p className="text-3xl font-bold text-purple-600">{formatPercentage(prescriptions.reminderRate)}</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Avg Medicines</h3>
            <p className="text-3xl font-bold text-orange-600">{prescriptions.averageMedicinesPerPrescription.toFixed(1)}</p>
          </div>
        </div>
        
        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Daily Prescriptions */}
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Prescriptions Trend</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={prescriptions.byDay}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#8884d8" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* Top Medicines */}
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 10 Medicines</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={prescriptions.topMedicines.slice(0, 10)}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="medicine" width={120} />
                  <Tooltip formatter={(value, name, props) => {
                    const data = props.payload;
                    return [
                      `${value} prescriptions (${data.percentage || 0}%)`,
                      data.medicine || 'Medicine'
                    ];
                  }} />
                  <Bar dataKey="count" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        
        {/* Common Diagnosis */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Common Diagnoses</h3>
          <div className="space-y-3">
            {prescriptions.commonDiagnosis.slice(0, 10).map((diagnosis, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-700">{diagnosis.diagnosis}</span>
                <span className="font-semibold text-gray-900">{formatNumber(diagnosis.count)} prescriptions</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };
  
  // Reviews Report
  const renderReviewsReport = () => {
    const reviews = getReviewsData();
    
    if (!reviews) {
      return (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">⭐</div>
          <h3 className="text-xl font-medium text-gray-900 mb-2">
            No Reviews Data Available
          </h3>
          <p className="text-gray-600">
            Please generate a report with the selected date range
          </p>
        </div>
      );
    }
    
    return (
      <div className="space-y-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Reviews</h3>
            <p className="text-3xl font-bold text-blue-600">{formatNumber(reviews.total)}</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Average Rating</h3>
            <p className="text-3xl font-bold text-green-600">{reviews.averageRating.toFixed(1)}/5</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Response Rate</h3>
            <p className="text-3xl font-bold text-purple-600">{formatPercentage(reviews.responseRate)}</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Conversion Rate</h3>
            <p className="text-3xl font-bold text-orange-600">{formatPercentage(reviews.conversionRate)}</p>
          </div>
        </div>
        
        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Rating Distribution */}
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Rating Distribution</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reviews.ratingDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="rating" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* Platform Distribution */}
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Platform Distribution</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={reviews.byPlatform}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={PieLabel}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {reviews.byPlatform.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name, props) => {
                    const data = props.payload;
                    return [
                      `${value} reviews (${data.percentage || 0}%)`,
                      data.platform || 'Platform'
                    ];
                  }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        
        {/* Sentiment Analysis */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Sentiment Analysis</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-green-50 p-6 rounded-lg border border-green-200 text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">{formatNumber(reviews.sentimentAnalysis.positive)}</div>
              <div className="text-lg font-semibold text-green-700">Positive</div>
              <div className="text-sm text-green-600 mt-2">(4-5 stars)</div>
            </div>
            
            <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200 text-center">
              <div className="text-3xl font-bold text-yellow-600 mb-2">{formatNumber(reviews.sentimentAnalysis.neutral)}</div>
              <div className="text-lg font-semibold text-yellow-700">Neutral</div>
              <div className="text-sm text-yellow-600 mt-2">(3 stars)</div>
            </div>
            
            <div className="bg-red-50 p-6 rounded-lg border border-red-200 text-center">
              <div className="text-3xl font-bold text-red-600 mb-2">{formatNumber(reviews.sentimentAnalysis.negative)}</div>
              <div className="text-lg font-semibold text-red-700">Negative</div>
              <div className="text-sm text-red-600 mt-2">(1-2 stars)</div>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
        <p className="text-gray-600 mt-2">
          Detailed insights into your clinic's performance
        </p>
      </div>
      
      {/* Report Type Tabs */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2 border-b border-gray-200">
          <Link
            href="/dashboard/reports?type=overview"
            className={`px-4 py-2 text-sm font-medium rounded-t-lg ${
              reportType === "overview"
                ? "bg-blue-50 text-blue-600 border-b-2 border-blue-500"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            📊 Overview
          </Link>
          <Link
            href="/dashboard/reports?type=notifications"
            className={`px-4 py-2 text-sm font-medium rounded-t-lg ${
              reportType === "notifications"
                ? "bg-blue-50 text-blue-600 border-b-2 border-blue-500"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            📢 Notifications
          </Link>
          <Link
            href="/dashboard/reports?type=patients"
            className={`px-4 py-2 text-sm font-medium rounded-t-lg ${
              reportType === "patients"
                ? "bg-blue-50 text-blue-600 border-b-2 border-blue-500"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            👥 Patients
          </Link>
          <Link
            href="/dashboard/reports?type=prescriptions"
            className={`px-4 py-2 text-sm font-medium rounded-t-lg ${
              reportType === "prescriptions"
                ? "bg-blue-50 text-blue-600 border-b-2 border-blue-500"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            💊 Prescriptions
          </Link>
          <Link
            href="/dashboard/reports?type=reviews"
            className={`px-4 py-2 text-sm font-medium rounded-t-lg ${
              reportType === "reviews"
                ? "bg-blue-50 text-blue-600 border-b-2 border-blue-500"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            ⭐ Reviews
          </Link>
        </div>
      </div>
      
      {/* Date Range Picker */}
      <div className="mb-6 p-4 bg-white rounded-lg shadow border border-gray-200">
        <h2 className="text-lg font-semibold mb-4">Select Date Range</h2>
        <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) =>
                setDateRange({ ...dateRange, startDate: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) =>
                setDateRange({ ...dateRange, endDate: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={fetchReportData}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 font-medium"
            >
              Generate Report
            </button>
          </div>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          Selected period: {format(new Date(dateRange.startDate), 'MMM dd, yyyy')} - {format(new Date(dateRange.endDate), 'MMM dd, yyyy')}
        </p>
      </div>
      
      {/* Report Content */}
      <div className="mt-8">
        {renderReportContent()}
      </div>
      
      {/* Export Options */}
      {(reportData || individualReport) && (
        <div className="mt-8 p-4 bg-white rounded-lg shadow border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Export Options</h3>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => {
                const data = reportData || individualReport;
                const dataStr = JSON.stringify(data, null, 2);
                const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
                const exportFileDefaultName = `clinic-report-${reportType}-${dateRange.startDate}-to-${dateRange.endDate}.json`;
                
                const linkElement = document.createElement('a');
                linkElement.setAttribute('href', dataUri);
                linkElement.setAttribute('download', exportFileDefaultName);
                linkElement.click();
              }}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
            >
              Export as JSON
            </button>
            <button
              onClick={() => {
                // Simple CSV export
                let csvContent = "data:text/csv;charset=utf-8,";
                
                if (reportType === 'overview' && reportData?.summary) {
                  csvContent += "Metric,Value\n";
                  csvContent += `Total Patients,${reportData.summary.totalPatients}\n`;
                  csvContent += `Total Notifications,${reportData.summary.totalNotifications}\n`;
                  csvContent += `Total Prescriptions,${reportData.summary.totalPrescriptions}\n`;
                  csvContent += `Total Reviews,${reportData.summary.totalReviews}\n`;
                }
                
                const encodedUri = encodeURI(csvContent);
                const link = document.createElement("a");
                link.setAttribute("href", encodedUri);
                link.setAttribute("download", `report-${reportType}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
            >
              Export as CSV
            </button>
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
            >
              Print Report
            </button>
          </div>
        </div>
      )}
    </div>
  );
}