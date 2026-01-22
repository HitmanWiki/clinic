"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

interface BrandingColors {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  logoUrl?: string;
}

interface Patient {
  id: string;
  name: string;
  mobile: string;
  age: number;
  gender: string;
}

interface Medicine {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

interface UploadedPrescription {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
  patientId: string;
  clinicId: string;
  uploadedBy: string;
}

export default function NewPrescriptionPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [branding, setBranding] = useState<BrandingColors>({
    primaryColor: '#3b82f6',
    secondaryColor: '#10b981',
    accentColor: '#8b5cf6'
  });
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Form state
  const [patientId, setPatientId] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [diagnosis, setDiagnosis] = useState("");
  const [medicines, setMedicines] = useState<Medicine[]>([
    { name: "", dosage: "", frequency: "", duration: "", instructions: "" }
  ]);
  const [nextVisitDate, setNextVisitDate] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Upload state
  const [uploadedPrescriptions, setUploadedPrescriptions] = useState<UploadedPrescription[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchBranding();
    fetchPatients();
  }, [session]);

  useEffect(() => {
    if (patientId) {
      const patient = patients.find(p => p.id === patientId);
      setSelectedPatient(patient || null);
      loadUploadedPrescriptions(patientId);
    } else {
      setSelectedPatient(null);
      setUploadedPrescriptions([]);
    }
  }, [patientId, patients]);

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

  // Helper function to apply branding colors
  const getBrandingStyle = (type: 'primary' | 'secondary' | 'accent' = 'primary') => {
    const colorMap = {
      primary: branding.primaryColor,
      secondary: branding.secondaryColor,
      accent: branding.accentColor
    };
    
    return {
      backgroundColor: `${colorMap[type]}15`,
      color: colorMap[type],
      borderColor: `${colorMap[type]}30`
    };
  };

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/patients`);
      
      if (response.ok) {
        const data = await response.json();
        setPatients(data.patients || []);
      } else {
        setError("Failed to load patients");
      }
    } catch (error) {
      console.error("Error fetching patients:", error);
      setError("Failed to load patients. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const loadUploadedPrescriptions = async (patientId: string) => {
    if (!session?.user?.clinicId || !patientId) return;
    
    try {
      const response = await fetch(`/api/prescriptions/upload?patientId=${patientId}`, {
        headers: {
          'clinicId': session.user.clinicId,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setUploadedPrescriptions(data.uploads || []);
      } else {
        console.error('Failed to load uploaded prescriptions');
        setUploadedPrescriptions([]);
      }
    } catch (error) {
      console.error("Error loading uploaded prescriptions:", error);
      setUploadedPrescriptions([]);
    }
  };

  const addMedicine = () => {
    setMedicines([
      ...medicines,
      { name: "", dosage: "", frequency: "", duration: "", instructions: "" }
    ]);
  };

  const removeMedicine = (index: number) => {
    if (medicines.length > 1) {
      const newMedicines = [...medicines];
      newMedicines.splice(index, 1);
      setMedicines(newMedicines);
    }
  };

  const updateMedicine = (index: number, field: keyof Medicine, value: string) => {
    const newMedicines = [...medicines];
    newMedicines[index] = { ...newMedicines[index], [field]: value };
    setMedicines(newMedicines);
  };

  const isValidMedicine = (medicine: Medicine): boolean => {
    return (
      medicine.name.trim().length > 0 &&
      medicine.dosage.trim().length > 0 &&
      medicine.duration.trim().length > 0
    );
  };

  const canSubmitForm = (): boolean => {
    // Only require patientId and diagnosis
    if (!patientId || !diagnosis.trim()) return false;
    
    // Medicines are optional, so we don't check them here
    return true;
  };

  // File upload handlers
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!patientId) {
      setUploadError("Please select a patient first");
      return;
    }
    
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    if (file.size > maxSize) {
      setUploadError("File size exceeds 10MB limit");
      return;
    }
    
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      setUploadError("Please upload only images (JPEG, PNG, GIF) or documents (PDF, DOC, DOCX)");
      return;
    }
    
    setUploading(true);
    setUploadError(null);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('patientId', patientId);
      
      const response = await fetch('/api/prescriptions/upload', {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json();
      
      if (response.ok) {
        setUploadSuccess(`Successfully uploaded ${file.name}`);
        await loadUploadedPrescriptions(patientId);
        e.target.value = '';
        setTimeout(() => {
          setUploadSuccess(null);
          setShowUploadModal(false);
        }, 2000);
      } else {
        setUploadError(result.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError('An error occurred during upload');
    } finally {
      setUploading(false);
    }
  };

  const deleteUploadedPrescription = async (id: string) => {
    if (!confirm("Are you sure you want to delete this uploaded prescription?")) {
      return;
    }
    
    try {
      const response = await fetch(`/api/prescriptions/upload?uploadId=${id}`, {
        method: 'DELETE',
        headers: {
          'clinicId': session?.user?.clinicId || '',
        },
      });
      
      if (response.ok) {
        setUploadedPrescriptions(uploadedPrescriptions.filter(upload => upload.id !== id));
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete prescription');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('An error occurred while deleting');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!patientId) {
      setError("Please select a patient");
      return;
    }
    
    if (!diagnosis.trim()) {
      setError("Please enter diagnosis");
      return;
    }
    
    // Filter only valid medicines (if any are entered)
    const validMedicines = medicines.filter(isValidMedicine);
    
    // If there are partially filled medicine entries but not valid ones, show warning
    const hasPartiallyFilled = medicines.some(med => 
      (med.name.trim() || med.dosage.trim() || med.duration.trim()) && 
      !isValidMedicine(med)
    );
    
    if (hasPartiallyFilled) {
      if (!confirm("Some medicine entries are incomplete. They will be ignored. Continue anyway?")) {
        return;
      }
    }

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch(`/api/patients/${patientId}/prescriptions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          diagnosis,
          medicines: validMedicines.length > 0 ? validMedicines : [], // Send empty array if no valid medicines
          nextVisitDate: nextVisitDate || undefined,
          notes: notes || undefined,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        alert('Prescription created successfully!');
        router.push("/dashboard/prescriptions");
      } else {
        setError(result.error || "Failed to create prescription");
      }
    } catch (error) {
      console.error("Error creating prescription:", error);
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Helper functions
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string): string => {
    if (fileType.startsWith('image/')) return '🖼️';
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('word') || fileType.includes('document')) return '📝';
    return '📎';
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div 
          className="animate-spin rounded-full h-12 w-12 border-b-2"
          style={{ borderColor: branding.primaryColor }}
        ></div>
        <span className="ml-4 text-gray-600">Loading patients...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/dashboard/prescriptions"
          className="mb-4 inline-flex items-center transition-colors hover:opacity-80"
          style={{ color: branding.primaryColor }}
        >
          ← Back to Prescriptions
        </Link>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Create New Prescription</h1>
            <p className="text-gray-600">Fill prescription details for a patient</p>
            <p className="text-sm text-gray-500 mt-1">
              <span style={{ color: branding.secondaryColor }}>Note:</span> Medicines are optional
            </p>
          </div>
          
          {/* Upload Button */}
          <button
            type="button"
            onClick={() => setShowUploadModal(true)}
            disabled={!patientId || uploading}
            className={`px-4 py-3 rounded-lg flex items-center gap-2 justify-center transition-colors ${
              patientId && !uploading
                ? "text-white hover:opacity-90" 
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
            style={patientId && !uploading ? {
              backgroundColor: branding.secondaryColor
            } : {}}
          >
            <span>📎</span>
            {uploading ? 'Uploading...' : 'Upload File'}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 border rounded-lg"
          style={{
            backgroundColor: `${branding.accentColor}15`,
            borderColor: `${branding.accentColor}30`
          }}
        >
          <p style={{ color: branding.accentColor }}>{error}</p>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-gray-900">
                  {selectedPatient ? `Upload for ${selectedPatient.name}` : 'Upload Prescription'}
                </h3>
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setUploadError(null);
                    setUploadSuccess(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 text-xl"
                  disabled={uploading}
                >
                  ✕
                </button>
              </div>
              
              {!patientId ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">👤</div>
                  <p className="text-gray-600 mb-4">Please select a patient first</p>
                  <button
                    onClick={() => setShowUploadModal(false)}
                    className="px-4 py-2 text-white rounded-lg hover:opacity-90 transition-colors"
                    style={{
                      backgroundColor: branding.primaryColor
                    }}
                  >
                    Close
                  </button>
                </div>
              ) : (
                <>
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-4">
                      Upload prescription file (images or documents)
                    </label>
                    
                    <div className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                      uploading 
                        ? 'border-gray-300 bg-gray-50' 
                        : 'border-gray-300 hover:border-blue-400 cursor-pointer'
                    }`}>
                      <input
                        type="file"
                        id="prescription-upload"
                        onChange={handleFileUpload}
                        className="hidden"
                        accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        disabled={uploading}
                      />
                      <label htmlFor="prescription-upload" className={`block ${uploading ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                        <div className="text-4xl mb-3">📎</div>
                        <div className="font-medium text-gray-700 mb-1">
                          {uploading ? 'Uploading...' : 'Click to select file'}
                        </div>
                        <div className="text-sm text-gray-500">
                          Supports JPG, PNG, GIF, PDF, DOC, DOCX (Max 10MB)
                        </div>
                      </label>
                    </div>
                    
                    {uploadError && (
                      <div className="mt-4 p-3 rounded-lg"
                        style={{
                          backgroundColor: `${branding.accentColor}15`,
                          border: `1px solid ${branding.accentColor}30`
                        }}
                      >
                        <p style={{ color: branding.accentColor }}>{uploadError}</p>
                      </div>
                    )}
                    
                    {uploadSuccess && (
                      <div className="mt-4 p-3 rounded-lg"
                        style={{
                          backgroundColor: `${branding.secondaryColor}15`,
                          border: `1px solid ${branding.secondaryColor}30`
                        }}
                      >
                        <p style={{ color: branding.secondaryColor }}>{uploadSuccess}</p>
                      </div>
                    )}
                  </div>
                  
                  {uploadedPrescriptions.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Previously Uploaded</h4>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {uploadedPrescriptions.map((upload) => (
                          <div key={upload.id} className="flex items-center justify-between p-2 border border-gray-200 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <span className="text-lg">{getFileIcon(upload.fileType)}</span>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {upload.fileName || 'Unknown file'}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {formatFileSize(upload.fileSize)} • {formatDate(upload.uploadedAt)}
                                </p>
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <a
                                href={upload.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm transition-colors hover:opacity-80"
                                style={{ color: branding.primaryColor }}
                              >
                                View
                              </a>
                              <button
                                type="button"
                                onClick={() => deleteUploadedPrescription(upload.id)}
                                className="text-sm transition-colors hover:opacity-80"
                                style={{ color: branding.accentColor }}
                                disabled={uploading}
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowUploadModal(false);
                        setUploadError(null);
                        setUploadSuccess(null);
                      }}
                      className="px-4 py-2 border rounded-lg hover:opacity-80 transition-colors"
                      style={{
                        borderColor: branding.primaryColor,
                        color: branding.primaryColor
                      }}
                      disabled={uploading}
                    >
                      Close
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Uploaded Files Preview */}
      {selectedPatient && uploadedPrescriptions.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-medium text-gray-900">Uploaded Prescription Files</h3>
            <button
              type="button"
              onClick={() => setShowUploadModal(true)}
              className="text-sm transition-colors hover:opacity-80"
              style={{ color: branding.primaryColor }}
            >
              + Upload More
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {uploadedPrescriptions.slice(0, 2).map((upload) => (
              <div 
                key={upload.id} 
                className="bg-white border border-gray-200 rounded-lg p-3 hover:border-gray-300 transition-colors"
                style={{
                  borderLeft: `3px solid ${branding.primaryColor}`
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-xl">{getFileIcon(upload.fileType)}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-900 truncate max-w-[150px]">
                        {upload.fileName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(upload.fileSize)}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <a
                      href={upload.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm transition-colors hover:opacity-80"
                      style={{ color: branding.primaryColor }}
                    >
                      View
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Patient Selection */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium text-gray-900 mb-4">1. Select Patient *</h2>
          {patients.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {patients.map((patient) => (
                <div
                  key={patient.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    patientId === patient.id
                      ? "bg-blue-50"
                      : "border-gray-200 hover:border-blue-300 hover:bg-blue-50/50"
                  }`}
                  style={patientId === patient.id ? {
                    borderColor: branding.primaryColor,
                    borderWidth: '2px'
                  } : {}}
                  onClick={() => setPatientId(patient.id)}
                >
                  <div className="flex items-center">
                    <div 
                      className="h-10 w-10 rounded-full flex items-center justify-center mr-3"
                      style={{
                        backgroundColor: `${branding.primaryColor}15`,
                        color: branding.primaryColor
                      }}
                    >
                      <span className="font-medium">
                        {patient.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{patient.name}</div>
                      <div className="text-sm text-gray-500">
                        {patient.gender}, {patient.age} years • +91 {patient.mobile}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
              <div className="text-4xl mb-4">👥</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No patients found</h3>
              <p className="text-gray-600 mb-4">You need to add patients first before creating prescriptions</p>
              <Link
                href="/dashboard/patients/new"
                className="inline-flex items-center px-4 py-2 text-white rounded-lg hover:opacity-90 transition-colors"
                style={{
                  backgroundColor: branding.primaryColor
                }}
              >
                + Add New Patient
              </Link>
            </div>
          )}
        </div>

        {/* Selected Patient Info */}
        {selectedPatient && (
          <div className="rounded-lg p-4 transition-colors"
            style={getBrandingStyle('primary')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div 
                  className="h-12 w-12 rounded-full flex items-center justify-center"
                  style={{
                    backgroundColor: `${branding.primaryColor}20`,
                    color: branding.primaryColor
                  }}
                >
                  <span className="font-medium">
                    {selectedPatient.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div>
                  <div className="font-medium">{selectedPatient.name}</div>
                  <div className="text-sm opacity-80">
                    {selectedPatient.gender}, {selectedPatient.age} years • +91 {selectedPatient.mobile}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPatientId("");
                  setUploadedPrescriptions([]);
                }}
                className="text-sm transition-colors hover:opacity-80"
                style={{ color: branding.accentColor }}
              >
                Change Patient
              </button>
            </div>
          </div>
        )}

        {/* Diagnosis */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium text-gray-900 mb-4">2. Diagnosis *</h2>
          <textarea
            value={diagnosis}
            onChange={(e) => setDiagnosis(e.target.value)}
            placeholder="Enter diagnosis, symptoms, and observations..."
            className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-colors"
            style={{
              borderColor: `${branding.primaryColor}50`,
              outlineColor: branding.primaryColor
            }}
            required
          />
        </div>

        {/* Medicines - Now Optional */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-lg font-medium text-gray-900">3. Medicines (Optional)</h2>
              <p className="text-sm text-gray-500">You can create a prescription without medicines</p>
            </div>
            <button
              type="button"
              onClick={addMedicine}
              className="px-4 py-2 rounded-lg hover:opacity-90 transition-colors"
              style={{
                backgroundColor: `${branding.secondaryColor}15`,
                color: branding.secondaryColor
              }}
            >
              + Add Medicine
            </button>
          </div>

          {medicines.map((medicine, index) => (
            <div 
              key={index} 
              className="border border-gray-200 rounded-lg p-4 mb-4 transition-all hover:border-opacity-100"
              style={{
                borderColor: `${branding.primaryColor}30`,
                borderWidth: '2px'
              }}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium text-gray-900">Medicine #{index + 1} (Optional)</h3>
                {medicines.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeMedicine(index)}
                    className="transition-colors hover:opacity-80"
                    style={{ color: branding.accentColor }}
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Medicine Name
                  </label>
                  <input
                    type="text"
                    value={medicine.name}
                    onChange={(e) => updateMedicine(index, "name", e.target.value)}
                    placeholder="Medicine Name (e.g., Paracetamol)"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-colors"
                    style={{
                      borderColor: `${branding.primaryColor}50`,
                      outlineColor: branding.primaryColor
                    }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dosage
                  </label>
                  <input
                    type="text"
                    value={medicine.dosage}
                    onChange={(e) => updateMedicine(index, "dosage", e.target.value)}
                    placeholder="Dosage (e.g., 500mg)"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-colors"
                    style={{
                      borderColor: `${branding.primaryColor}50`,
                      outlineColor: branding.primaryColor
                    }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Frequency
                  </label>
                  <select
                    value={medicine.frequency}
                    onChange={(e) => updateMedicine(index, "frequency", e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-colors"
                    style={{
                      borderColor: `${branding.primaryColor}50`,
                      outlineColor: branding.primaryColor
                    }}
                  >
                    <option value="">Select frequency (optional)</option>
                    <option value="Once daily">Once daily</option>
                    <option value="Twice daily">Twice daily</option>
                    <option value="Thrice daily">Thrice daily</option>
                    <option value="Every 4 hours">Every 4 hours</option>
                    <option value="Every 6 hours">Every 6 hours</option>
                    <option value="Every 8 hours">Every 8 hours</option>
                    <option value="Before meals">Before meals</option>
                    <option value="After meals">After meals</option>
                    <option value="SOS">SOS (When required)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duration
                  </label>
                  <input
                    type="text"
                    value={medicine.duration}
                    onChange={(e) => updateMedicine(index, "duration", e.target.value)}
                    placeholder="Duration (e.g., 5 days, 1 week)"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-colors"
                    style={{
                      borderColor: `${branding.primaryColor}50`,
                      outlineColor: branding.primaryColor
                    }}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Special Instructions
                  </label>
                  <input
                    type="text"
                    value={medicine.instructions}
                    onChange={(e) => updateMedicine(index, "instructions", e.target.value)}
                    placeholder="Special Instructions (e.g., Take with milk, Avoid alcohol)"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-colors"
                    style={{
                      borderColor: `${branding.primaryColor}50`,
                      outlineColor: branding.primaryColor
                    }}
                  />
                </div>
              </div>
              
              <div className="mt-2 text-xs"
                style={isValidMedicine(medicine) ? {
                  color: branding.secondaryColor
                } : {
                  color: medicines.length === 1 && index === 0 ? branding.secondaryColor : branding.accentColor
                }}
              >
                {isValidMedicine(medicine) 
                  ? '✅ Medicine complete' 
                  : medicines.length === 1 && index === 0 
                    ? 'Optional: Fill medicine details if needed' 
                    : '❌ Fill all fields to include this medicine'}
              </div>
            </div>
          ))}
          
          {/* Empty medicine state message */}
          {medicines.length === 1 && !isValidMedicine(medicines[0]) && (
            <div className="mt-4 p-4 border rounded-lg text-center"
              style={getBrandingStyle('secondary')}
            >
              <div className="text-lg mb-2">💊</div>
              <p className="font-medium mb-1">No medicines added</p>
              <p className="text-sm opacity-80">This prescription will be saved with only diagnosis</p>
            </div>
          )}
        </div>

        {/* Additional Information */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium text-gray-900 mb-4">4. Additional Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Next Visit Date
              </label>
              <input
                type="date"
                value={nextVisitDate}
                onChange={(e) => setNextVisitDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-colors"
                style={{
                  borderColor: `${branding.primaryColor}50`,
                  outlineColor: branding.primaryColor
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes / Advice
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes, advice for patient..."
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent transition-colors"
                style={{
                  borderColor: `${branding.primaryColor}50`,
                  outlineColor: branding.primaryColor
                }}
              />
            </div>
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end space-x-4">
          <Link
            href="/dashboard/prescriptions"
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting || !canSubmitForm()}
            className="px-6 py-3 text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
            style={{
              backgroundColor: branding.primaryColor
            }}
            onMouseEnter={(e) => {
              if (!e.currentTarget.disabled) {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = '';
              e.currentTarget.style.boxShadow = '';
            }}
          >
            {submitting ? (
              <>
                <div 
                  className="animate-spin rounded-full h-4 w-4 border-b-2 mr-2"
                  style={{ borderColor: 'white' }}
                ></div>
                Creating...
              </>
            ) : (
              "Create Prescription"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}