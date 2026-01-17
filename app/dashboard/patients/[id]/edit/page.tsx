"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

interface Patient {
  id: string;
  name: string;
  mobile: string;
  age?: number;
  gender?: string;
  visitDate: string;
  notes?: string;
}

export default function EditPatientPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
  const patientId = params.id as string;
  
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  
  // Form state
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [age, setAge] = useState<number | "">("");
  const [gender, setGender] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (patientId) {
      fetchPatient();
    }
  }, [patientId]);

  const fetchPatient = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/patients/${patientId}`);
      
      if (response.ok) {
        const data = await response.json();
        setPatient(data);
        setName(data.name || "");
        setMobile(data.mobile || "");
        setAge(data.age || "");
        setGender(data.gender || "");
        setNotes(data.notes || "");
      } else {
        setError("Failed to load patient");
      }
    } catch (error) {
      console.error("Error fetching patient:", error);
      setError("Failed to load patient");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    
    if (!mobile.trim() || mobile.length !== 10) {
      setError("Valid 10-digit mobile number is required");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const response = await fetch(`/api/patients/${patientId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          mobile,
          age: age ? Number(age) : undefined,
          gender: gender || undefined,
          notes: notes || undefined,
        }),
      });

      if (response.ok) {
        router.push(`/dashboard/patients/${patientId}`);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to update patient");
      }
    } catch (error) {
      console.error("Error updating patient:", error);
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-4 text-gray-600">Loading patient...</span>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/dashboard/patients/${patientId}`}
          className="text-blue-600 hover:text-blue-800 mb-4 inline-flex items-center"
        >
          ← Back to Patient
        </Link>
        <h1 className="text-2xl font-semibold text-gray-900">Edit Patient</h1>
        <p className="text-gray-600">Update patient information</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Patient Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter patient name"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                Try: "John", "John Doe", "" (empty), "A B C D"
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mobile Number *
              </label>
              <input
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="10-digit mobile number"
                maxLength={10}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Age
              </label>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value ? parseInt(e.target.value) : "")}
                min="0"
                max="120"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Age in years"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Gender
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer-not-to-say">Prefer not to say</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Additional notes about the patient"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-4">
          <Link
            href={`/dashboard/patients/${patientId}`}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving || !name.trim() || mobile.length !== 10}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>

      {/* Test initials section */}
      <div className="mt-8 p-6 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Test Initials Display</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-white rounded-lg border">
            <h4 className="font-medium mb-2">Current Name:</h4>
            <p className="text-gray-900">{name || "(empty)"}</p>
            <div className="mt-4">
              <h4 className="font-medium mb-2">Initials:</h4>
              <div className="flex items-center">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                  <span className="text-blue-600 font-medium">
                    {!name ? "??" : name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-sm">Preview in dashboard table</p>
                  <p className="text-xs text-gray-500">Shows: {!name ? "??" : name.split(' ').map(n => n[0]).join('').toUpperCase()}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-white rounded-lg border">
            <h4 className="font-medium mb-2">Test Cases:</h4>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setName("")}
                className="w-full text-left p-2 text-sm hover:bg-gray-100 rounded"
              >
                Empty name → "??"
              </button>
              <button
                type="button"
                onClick={() => setName("John")}
                className="w-full text-left p-2 text-sm hover:bg-gray-100 rounded"
              >
                Single name → "J"
              </button>
              <button
                type="button"
                onClick={() => setName("John Doe")}
                className="w-full text-left p-2 text-sm hover:bg-gray-100 rounded"
              >
                Two names → "JD"
              </button>
              <button
                type="button"
                onClick={() => setName("John William Smith")}
                className="w-full text-left p-2 text-sm hover:bg-gray-100 rounded"
              >
                Three names → "JWS"
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}