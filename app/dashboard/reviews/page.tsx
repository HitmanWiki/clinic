"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

interface Review {
  id: string;
  patientId: string;
  patientName: string;
  patientMobile: string;
  requestDate: string;
  sentDate?: string;
  receivedDate?: string;
  status: "pending" | "scheduled" | "sent" | "received" | "skipped" | "failed";
  rating?: number;
  reviewText?: string;
  platform: "google" | "justdial" | "practo" | "other";
  appInstalled: boolean;
}

interface ReviewStats {
  totalRequests: number;
  receivedReviews: number;
  averageRating: number;
  responseRate: number;
  thisMonth: number;
  lastMonth: number;
  appPatients: number;
  pushDeliveryRate: number;
}

export default function ReviewsPage() {
  const { data: session } = useSession();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats>({
    totalRequests: 0,
    receivedReviews: 0,
    averageRating: 0,
    responseRate: 0,
    thisMonth: 0,
    lastMonth: 0,
    appPatients: 0,
    pushDeliveryRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [automationEnabled, setAutomationEnabled] = useState(true);
  const [reviewLink, setReviewLink] = useState("");

  // Fetch reviews from database
  useEffect(() => {
    const fetchReviews = async () => {
      if (!session?.user?.clinicId) {
        console.log("No clinicId in session");
        return;
      }

      setLoading(true);
      try {
        // Fetch reviews data
        const reviewsResponse = await fetch(`/api/reviews`, {
          headers: {
            'clinicId': session.user.clinicId,
          },
        });

        if (!reviewsResponse.ok) {
          throw new Error('Failed to fetch reviews');
        }

        const reviewsData = await reviewsResponse.json();
        setReviews(reviewsData.reviews || []);

        // Fetch stats data
        const statsResponse = await fetch(`/api/reviews/stats`, {
          headers: {
            'clinicId': session.user.clinicId,
          },
        });

        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setStats(statsData);
        }

        // Fetch clinic settings for review link
        const settingsResponse = await fetch(`/api/clinic/default`, {
          headers: {
            'clinicId': session.user.clinicId,
          },
        });

        if (settingsResponse.ok) {
          const settingsData = await settingsResponse.json();
          setReviewLink(settingsData.reviewLink || "");
          setAutomationEnabled(settingsData.autoReviewEnabled || false);
        }

      } catch (error) {
        console.error('Error fetching reviews:', error);
        setReviews([]);
        setStats({
          totalRequests: 0,
          receivedReviews: 0,
          averageRating: 0,
          responseRate: 0,
          thisMonth: 0,
          lastMonth: 0,
          appPatients: 0,
          pushDeliveryRate: 0,
        });
      } finally {
        setLoading(false);
      }
    };

    if (session?.user?.clinicId) {
      fetchReviews();
    }
  }, [session]);

  // Filter reviews
  const filteredReviews = reviews.filter(review => {
    const thisMonth = new Date().getMonth();
    const reviewMonth = new Date(review.requestDate).getMonth();
    
    if (filter === "pending") return review.status === "pending";
    if (filter === "scheduled") return review.status === "scheduled";
    if (filter === "received") return review.status === "received";
    if (filter === "app-only") return review.appInstalled === true;
    if (filter === "this-month") return reviewMonth === thisMonth;
    return true; // all
  });

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      scheduled: "bg-blue-100 text-blue-800",
      sent: "bg-purple-100 text-purple-800",
      received: "bg-green-100 text-green-800",
      skipped: "bg-gray-100 text-gray-800",
      failed: "bg-red-100 text-red-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: "Pending",
      scheduled: "Scheduled",
      sent: "Sent",
      received: "Received",
      skipped: "Skipped",
      failed: "Failed",
    };
    return statusMap[status] || status;
  };

  const getRatingStars = (rating?: number) => {
    if (!rating) return null;
    
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <span key={star} className={star <= rating ? "text-yellow-400" : "text-gray-300"}>
            ★
          </span>
        ))}
        <span className="ml-1 text-sm font-medium">{rating.toFixed(1)}</span>
      </div>
    );
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
    });
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const sendReviewRequest = async (reviewId: string) => {
    if (!session?.user?.clinicId) return;
    
    try {
      const response = await fetch(`/api/reviews/${reviewId}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'clinicId': session.user.clinicId,
        },
      });

      if (response.ok) {
        // Refresh reviews list
        const reviewsResponse = await fetch(`/api/reviews`, {
          headers: {
            'clinicId': session.user.clinicId,
          },
        });
        const reviewsData = await reviewsResponse.json();
        setReviews(reviewsData.reviews || []);
      }
    } catch (error) {
      console.error('Error sending review request:', error);
    }
  };

  const sendBulkRequests = async () => {
    if (!session?.user?.clinicId) return;
    
    const pendingReviews = reviews.filter(r => r.status === "pending");
    if (pendingReviews.length === 0) {
      alert("No pending review requests to send.");
      return;
    }

    try {
      const response = await fetch(`/api/reviews/bulk-send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'clinicId': session.user.clinicId,
        },
      });

      if (response.ok) {
        alert(`Review requests sent to ${pendingReviews.length} patients via push notification.`);
        // Refresh reviews list
        const reviewsResponse = await fetch(`/api/reviews`, {
          headers: {
            'clinicId': session.user.clinicId,
          },
        });
        const reviewsData = await reviewsResponse.json();
        setReviews(reviewsData.reviews || []);
      }
    } catch (error) {
      console.error('Error sending bulk requests:', error);
    }
  };

  const updateReviewLink = async () => {
    if (!session?.user?.clinicId) return;
    
    const newLink = prompt("Enter your Google review link:", reviewLink);
    if (newLink) {
      try {
        const response = await fetch(`/api/clinic/default`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'clinicId': session.user.clinicId,
          },
          body: JSON.stringify({ reviewLink: newLink }),
        });

        if (response.ok) {
          setReviewLink(newLink);
          alert("Review link updated!");
        }
      } catch (error) {
        console.error('Error updating review link:', error);
      }
    }
  };

  const updateAutomationSettings = async (enabled: boolean, settings?: any) => {
    if (!session?.user?.clinicId) return;
    
    try {
      const response = await fetch(`/api/clinic/default`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'clinicId': session.user.clinicId,
        },
        body: JSON.stringify({ 
          autoReviewEnabled: enabled,
          ...settings 
        }),
      });

      if (response.ok) {
        setAutomationEnabled(enabled);
      }
    } catch (error) {
      console.error('Error updating automation settings:', error);
    }
  };

  const scheduleBulkReviews = async () => {
    if (!session?.user?.clinicId) return;
    
    try {
      const response = await fetch(`/api/reviews/schedule-bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'clinicId': session.user.clinicId,
        },
        body: JSON.stringify({
          daysAfterVisit: 3, // Default: 3 days after visit
        }),
      });

      if (response.ok) {
        alert("Review requests scheduled for all eligible patients!");
        // Refresh reviews list
        const reviewsResponse = await fetch(`/api/reviews`, {
          headers: {
            'clinicId': session.user.clinicId,
          },
        });
        const reviewsData = await reviewsResponse.json();
        setReviews(reviewsData.reviews || []);
      }
    } catch (error) {
      console.error('Error scheduling bulk reviews:', error);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Review Management</h1>
          <p className="text-gray-600">Request and manage reviews via push notifications</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={scheduleBulkReviews}
            className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 flex items-center"
          >
            <span className="mr-2">⏰</span>
            Schedule All
          </button>
          <button
            onClick={sendBulkRequests}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
          >
            <span className="mr-2">📢</span>
            Send Pending
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-8 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">Total Requests</div>
          <div className="text-2xl font-bold">{stats.totalRequests}</div>
          <div className="text-xs text-gray-500 mt-1">All time</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">Received</div>
          <div className="text-2xl font-bold text-green-600">{stats.receivedReviews}</div>
          <div className="text-xs text-gray-500 mt-1">Reviews</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">Avg. Rating</div>
          <div className="text-2xl font-bold text-yellow-600">{stats.averageRating.toFixed(1)}</div>
          <div className="flex items-center justify-center">
            {[1, 2, 3, 4, 5].map((star) => (
              <span key={star} className={star <= Math.round(stats.averageRating) ? "text-yellow-400" : "text-gray-300"}>
                ★
              </span>
            ))}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">Response Rate</div>
          <div className="text-2xl font-bold">{stats.responseRate}%</div>
          <div className="text-xs text-gray-500 mt-1">Of requests</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">This Month</div>
          <div className="text-2xl font-bold">{stats.thisMonth}</div>
          <div className="text-xs text-gray-500 mt-1">Requests</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">Last Month</div>
          <div className="text-2xl font-bold">{stats.lastMonth}</div>
          <div className="text-xs text-gray-500 mt-1">Requests</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">App Users</div>
          <div className="text-2xl font-bold text-purple-600">{stats.appPatients}</div>
          <div className="text-xs text-gray-500 mt-1">Can receive push</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">Delivery Rate</div>
          <div className="text-2xl font-bold text-green-600">{stats.pushDeliveryRate}%</div>
          <div className="text-xs text-gray-500 mt-1">Push notifications</div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Reviews List */}
        <div className="lg:col-span-2">
          {/* Filters and Google Link */}
          <div className="bg-white p-4 rounded-lg shadow mb-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-wrap gap-2">
                {["all", "pending", "scheduled", "received", "app-only", "this-month"].map((filterType) => (
                  <button
                    key={filterType}
                    onClick={() => setFilter(filterType)}
                    className={`px-3 py-1.5 rounded-lg text-sm ${
                      filter === filterType
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {filterType === "app-only" ? "App Users" : 
                     filterType.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                  </button>
                ))}
              </div>
              
              <div className="flex items-center">
                <div className="text-sm text-gray-600 mr-2">Google Review Link:</div>
                <div className="flex items-center">
                  <div className="px-3 py-1.5 border border-gray-300 rounded-l-lg text-sm bg-gray-50 truncate max-w-[200px]">
                    {reviewLink || "No link set"}
                  </div>
                  <button
                    onClick={updateReviewLink}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-r-lg hover:bg-blue-700 text-sm"
                  >
                    Edit
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Reviews List */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading reviews...</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Patient
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Request Date
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          App Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Rating
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredReviews.map((review) => (
                        <tr key={review.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center mr-2">
                                <span className="text-blue-600 text-xs font-medium">
                                  {review.patientName.split(' ').map(n => n[0]).join('')}
                                </span>
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {review.patientName}
                                </div>
                                <div className="text-xs text-gray-500">
                                  +91 {review.patientMobile}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {formatDate(review.requestDate)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {review.sentDate && `Sent: ${formatDateTime(review.sentDate)}`}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(review.status)}`}>
                              {getStatusText(review.status)}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {review.appInstalled ? (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                App Installed
                              </span>
                            ) : (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                No App
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {review.rating ? getRatingStars(review.rating) : "—"}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              {(review.status === "pending" || review.status === "scheduled") && (
                                <button
                                  onClick={() => sendReviewRequest(review.id)}
                                  className="text-blue-600 hover:text-blue-900"
                                >
                                  Send Now
                                </button>
                              )}
                              {review.status === "received" && review.reviewText && (
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    alert(`Review: ${review.reviewText}\nRating: ${review.rating}/5`);
                                  }}
                                  className="text-green-600 hover:text-green-900"
                                >
                                  View
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Empty State */}
                {filteredReviews.length === 0 && (
                  <div className="p-8 text-center">
                    <div className="text-gray-400 text-4xl mb-4">⭐</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {loading ? "Loading..." : "No review requests found"}
                    </h3>
                    <p className="text-gray-600 mb-4">
                      {filter !== "all" ? "Try viewing all review requests" : "Review requests will appear here when scheduled"}
                    </p>
                    {filter !== "all" && (
                      <button
                        onClick={() => setFilter("all")}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        View All Reviews
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right Column - Analytics & Settings */}
        <div className="space-y-6">
          {/* Review Performance */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Review Performance</h2>
            
            <div className="space-y-4">
              {/* Rating Distribution */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Rating Distribution</span>
                  <span className="text-xs text-gray-500">Last 30 days</span>
                </div>
                <div className="space-y-2">
                  {[5, 4, 3, 2, 1].map((rating) => {
                    const count = reviews.filter(r => r.rating === rating).length;
                    const receivedReviews = reviews.filter(r => r.rating).length;
                    const percentage = receivedReviews > 0 
                      ? (count / receivedReviews) * 100 
                      : 0;
                    
                    return (
                      <div key={rating} className="flex items-center">
                        <div className="w-6 text-xs">{rating}★</div>
                        <div className="flex-1 mx-2">
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div 
                              className="bg-yellow-400 h-1.5 rounded-full" 
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                        <div className="w-6 text-xs text-right">{count}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Platform Stats */}
              <div className="pt-4 border-t border-gray-200">
                <div className="text-sm font-medium text-gray-900 mb-2">Platform Statistics</div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-2 bg-blue-50 rounded-lg">
                    <div className="text-lg font-bold text-blue-600">{stats.responseRate}%</div>
                    <div className="text-xs text-gray-600">Response Rate</div>
                  </div>
                  <div className="text-center p-2 bg-green-50 rounded-lg">
                    <div className="text-lg font-bold text-green-600">{stats.pushDeliveryRate}%</div>
                    <div className="text-xs text-gray-600">Delivery Rate</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Automation Settings */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Review Automation</h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900">Auto-send Reviews</div>
                  <div className="text-sm text-gray-600">Send review requests via push notification</div>
                </div>
                <button
                  onClick={() => updateAutomationSettings(!automationEnabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                    automationEnabled ? 'bg-green-600' : 'bg-gray-300'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                    automationEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              {automationEnabled && (
                <div className="pt-3 border-t border-gray-200">
                  <div className="text-sm font-medium text-gray-900 mb-2">Settings</div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-700">Send after visit</span>
                      <span className="text-sm font-medium">3 days</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-700">Time of day</span>
                      <span className="text-sm font-medium">7:00 PM</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-700">App users only</span>
                      <span className="text-sm font-medium text-green-600">Yes</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Platform Links */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Review Platforms</h2>
            
            <div className="space-y-3">
              <a
                href={reviewLink || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center p-3 rounded-lg border ${
                  reviewLink 
                    ? "bg-blue-50 border-blue-200 hover:bg-blue-100" 
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                <span className="mr-3 text-blue-500 text-xl">🔍</span>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">Google Reviews</div>
                  <div className="text-xs text-gray-600 truncate">
                    {reviewLink || "Add your Google review link"}
                  </div>
                </div>
                <span className="text-blue-600">→</span>
              </a>
              
              <div className="p-3 rounded-lg border border-gray-200 bg-gray-50">
                <div className="flex items-center">
                  <span className="mr-3 text-gray-500 text-xl">📱</span>
                  <div>
                    <div className="font-medium text-gray-900">In-App Reviews</div>
                    <div className="text-xs text-gray-600">
                      Patients review directly in the app
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-700 mb-2">Push Notification Message:</div>
              <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700">
                "Hope you're feeling better! If you had a good experience, please leave us a review in the app."
              </div>
            </div>
          </div>

          {/* Quick Tips */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-yellow-800 mb-2 flex items-center">
              <span className="mr-2">💡</span> Review Tips
            </h3>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Request reviews 2-3 days after treatment</li>
              <li>• Push notifications have 85% open rate</li>
              <li>• Personalized requests get better responses</li>
              <li>• App users are 3x more likely to review</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}