"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";

interface Medicine {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

interface Patient {
  id: string;
  name: string;
  age: number;
  gender: string;
  mobile: string;
  hasAppInstalled?: boolean;
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

export default function PatientNewPrescriptionPage() {
  const router = useRouter();
  const params = useParams();
  const patientId = params.id as string;
  const { data: session } = useSession();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [diagnosis, setDiagnosis] = useState("");
  const [medicines, setMedicines] = useState<Medicine[]>([
    { name: "", dosage: "", frequency: "", duration: "", instructions: "" }
  ]);
  const [nextVisitDate, setNextVisitDate] = useState("");
  const [notes, setNotes] = useState("");

  // Upload state
  const [uploadedPrescriptions, setUploadedPrescriptions] = useState<UploadedPrescription[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Load patient data
        const patientResponse = await fetch(`/api/patients/${patientId}`);
        if (!patientResponse.ok) {
          throw new Error('Failed to load patient data');
        }
        const patientData = await patientResponse.json();
        setPatient(patientData.patient || patientData);
        
        // Load uploaded prescriptions
        await loadUploadedPrescriptions();
        
        // Set default date to tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        setNextVisitDate(tomorrow.toISOString().split('T')[0]);
        
      } catch (error) {
        console.error("Error loading data:", error);
        setError("Failed to load patient data. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    
    if (patientId && patientId !== "undefined") {
      loadData();
    } else {
      setLoading(false);
    }
  }, [patientId]);

  const loadUploadedPrescriptions = async () => {
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

  if (!patientId || patientId === "undefined") {
    return (
      <div className="p-8 text-center">
        <div className="text-red-600 text-4xl mb-4">⚠️</div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Patient Not Found</h1>
        <p className="text-gray-600 mb-6">The patient ID is invalid or missing.</p>
        <Link 
          href="/dashboard/patients"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Back to Patients List
        </Link>
      </div>
    );
  }

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
    if (!diagnosis.trim()) return false;
    return medicines.some(isValidMedicine);
  };

  // File upload handlers
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
      formData.append('clinicId', session?.user?.clinicId || '');
      
      const response = await fetch('/api/prescriptions/upload', {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json();
      
      if (response.ok) {
        setUploadSuccess(`Successfully uploaded ${file.name}`);
        await loadUploadedPrescriptions();
        // Clear file input
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
    
    if (!diagnosis.trim()) {
      setError("Please enter diagnosis");
      return;
    }
    
    const validMedicines = medicines.filter(isValidMedicine);
    if (validMedicines.length === 0) {
      setError("Please add at least one medicine with name, dosage, and duration");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      console.log('📤 Sending prescription data:', {
        diagnosis,
        medicines: validMedicines,
        nextVisitDate: nextVisitDate || undefined,
        notes: notes || undefined,
      });
      
      const response = await fetch(`/api/patients/${patientId}/prescriptions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          diagnosis,
          medicines: validMedicines,
          nextVisitDate: nextVisitDate || undefined,
          notes: notes || undefined,
        }),
      });

      console.log('📥 Response status:', response.status);
      const result = await response.json();
      console.log('📥 Response data:', result);

      if (response.ok) {
        alert('Prescription created successfully!');
        router.push(`/dashboard/patients/${patientId}`);
      } else {
        setError(result.error || "Failed to create prescription");
      }
    } catch (error) {
      console.error("Error creating prescription:", error);
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-4 text-gray-600">Loading patient data...</span>
      </div>
    );
  }

  if (error && !patient) {
    return (
      <div className="p-8 text-center">
        <div className="text-red-600 text-4xl mb-4">⚠️</div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Error Loading Data</h1>
        <p className="text-gray-600 mb-6">{error}</p>
        <Link 
          href="/dashboard/patients"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Back to Patients List
        </Link>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="p-8 text-center">
        <div className="text-gray-400 text-4xl mb-4">👤</div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Patient Not Found</h1>
        <p className="text-gray-600 mb-6">The patient you're looking for doesn't exist.</p>
        <Link 
          href="/dashboard/patients"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Back to Patients List
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center space-x-2 mb-4">
          <Link 
            href={`/dashboard/patients/${patientId}`}
            className="text-blue-600 hover:text-blue-800"
          >
            ← Back to Patient
          </Link>
          <span className="text-gray-400">/</span>
          <span className="text-gray-600">New Prescription</span>
        </div>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">New Prescription</h1>
            <p className="text-gray-600">Create prescription for {patient.name}</p>
          </div>
          
          {/* Patient Info & Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Patient Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-blue-600 font-medium">
                    {patient.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div>
                  <div className="font-medium text-gray-900">{patient.name}</div>
                  <div className="text-sm text-gray-600">
                    {patient.gender}, {patient.age} years • +91 {patient.mobile}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Upload Button */}
            <button
              type="button"
              onClick={() => setShowUploadModal(true)}
              className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 justify-center"
            >
              <span>📎</span>
              Upload File
            </button>
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-gray-900">Upload Prescription</h3>
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setUploadError(null);
                    setUploadSuccess(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-4">
                  Upload prescription file (images or documents)
                </label>
                
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                  <input
                    type="file"
                    id="prescription-upload"
                    onChange={handleFileUpload}
                    className="hidden"
                    accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    disabled={uploading}
                  />
                  <label htmlFor="prescription-upload" className="cursor-pointer block">
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
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700">{uploadError}</p>
                  </div>
                )}
                
                {uploadSuccess && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-700">{uploadSuccess}</p>
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
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            View
                          </a>
                          <button
                            type="button"
                            onClick={() => deleteUploadedPrescription(upload.id)}
                            className="text-red-600 hover:text-red-800 text-sm"
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
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Uploaded Files Preview */}
      {uploadedPrescriptions.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-medium text-gray-900">Uploaded Prescription Files</h3>
            <button
              type="button"
              onClick={() => setShowUploadModal(true)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              + Upload More
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {uploadedPrescriptions.slice(0, 2).map((upload) => (
              <div key={upload.id} className="bg-white border border-gray-200 rounded-lg p-3 hover:border-gray-300 transition-colors">
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
                      className="text-blue-600 hover:text-blue-800 text-sm"
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
        {/* Diagnosis */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Diagnosis *</h2>
          <textarea
            value={diagnosis}
            onChange={(e) => setDiagnosis(e.target.value)}
            placeholder="Enter diagnosis, symptoms, and observations..."
            className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        {/* Medicines */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-gray-900">Medicines *</h2>
            <button
              type="button"
              onClick={addMedicine}
              className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
            >
              + Add Medicine
            </button>
          </div>

          {medicines.map((medicine, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4 mb-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium text-gray-900">Medicine #{index + 1}</h3>
                {medicines.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeMedicine(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Medicine Name *
                  </label>
                  <input
                    type="text"
                    value={medicine.name}
                    onChange={(e) => updateMedicine(index, "name", e.target.value)}
                    placeholder="Medicine Name (e.g., Paracetamol)"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dosage *
                  </label>
                  <input
                    type="text"
                    value={medicine.dosage}
                    onChange={(e) => updateMedicine(index, "dosage", e.target.value)}
                    placeholder="Dosage (e.g., 500mg)"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Frequency
                  </label>
                  <select
                    value={medicine.frequency}
                    onChange={(e) => updateMedicine(index, "frequency", e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select frequency</option>
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
                    Duration *
                  </label>
                  <input
                    type="text"
                    value={medicine.duration}
                    onChange={(e) => updateMedicine(index, "duration", e.target.value)}
                    placeholder="Duration (e.g., 5 days, 1 week)"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              <div className="mt-2 text-xs text-gray-500">
                {isValidMedicine(medicine) ? '✅ Medicine complete' : '❌ Fill required fields (name, dosage, duration)'}
              </div>
            </div>
          ))}
        </div>

        {/* Additional Information */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Additional Information</h2>
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end space-x-4">
          <Link
            href={`/dashboard/patients/${patientId}`}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving || !canSubmitForm()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <span className="animate-spin inline-block w-4 h-4 border-t-2 border-white border-solid rounded-full mr-2"></span>
                Creating...
              </>
            ) : (
              "Create Prescription"
            )}
          </button>
        </div>
        
        {/* Form Status */}
        <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
          <div className="font-medium mb-1">Form Status:</div>
          <div className="flex flex-wrap gap-4">
            <span>Diagnosis: {diagnosis.trim() ? '✅' : '❌'}</span>
            <span>Valid medicines: {medicines.filter(isValidMedicine).length}</span>
            <span>Can submit: {canSubmitForm() ? '✅ Yes' : '❌ No'}</span>
          </div>
        </div>
      </form>
    </div>
  );
}