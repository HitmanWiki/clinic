
// app/dashboard/patients/[id]/prescriptions/new/page.tsx
"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface Medicine {
  id: number;
  name: string;
  potency?: string;
  dosage: string;
  duration: string;
  instructions: string;
}

export default function NewPrescriptionPage() {
  const params = useParams();
  const router = useRouter();
  const patientId = params.id as string;
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    diagnosis: "",
    notes: "",
    nextVisitDate: "",
  });
  
  const [medicines, setMedicines] = useState<Medicine[]>([
    { id: 1, name: "", dosage: "", duration: "", instructions: "" }
  ]);
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleMedicineChange = (id: number, field: keyof Medicine, value: string) => {
    setMedicines(prev =>
      prev.map(med =>
        med.id === id ? { ...med, [field]: value } : med
      )
    );
  };

  const addMedicine = () => {
    const newId = medicines.length > 0 ? Math.max(...medicines.map(m => m.id)) + 1 : 1;
    setMedicines([...medicines, { 
      id: newId, 
      name: "", 
      dosage: "", 
      duration: "", 
      instructions: "" 
    }]);
  };

  const removeMedicine = (id: number) => {
    if (medicines.length > 1) {
      setMedicines(medicines.filter(med => med.id !== id));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.diagnosis.trim()) {
      newErrors.diagnosis = "Diagnosis is required";
    }

    // Validate each medicine
    medicines.forEach((medicine, index) => {
      if (!medicine.name.trim()) {
        newErrors[`medicine_${medicine.id}_name`] = `Medicine #${index + 1} name is required`;
      }
      if (!medicine.dosage.trim()) {
        newErrors[`medicine_${medicine.id}_dosage`] = `Medicine #${index + 1} dosage is required`;
      }
      if (!medicine.duration.trim()) {
        newErrors[`medicine_${medicine.id}_duration`] = `Medicine #${index + 1} duration is required`;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    
    try {
      // In development, simulate API call
      console.log("Creating prescription:", { patientId, formData, medicines });
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Show success message
      alert("Prescription created successfully!");
      
      // Redirect to patient detail page
      router.push(`/dashboard/patients/${patientId}`);
      
    } catch (error) {
      console.error("Error creating prescription:", error);
      alert("Failed to create prescription. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center">
          <Link
            href={`/dashboard/patients/${patientId}`}
            className="text-gray-600 hover:text-gray-900 mr-4"
          >
            ← Back to Patient
          </Link>
        </div>
        <h1 className="text-2xl font-semibold text-gray-900 mt-2">New Prescription</h1>
        <p className="text-gray-600">Create a new prescription for the patient</p>
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg shadow p-6">
        <form onSubmit={handleSubmit}>
          <div className="space-y-8">
            {/* Diagnosis Section */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Diagnosis & Notes</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Diagnosis *
                  </label>
                  <input
                    type="text"
                    name="diagnosis"
                    value={formData.diagnosis}
                    onChange={handleFormChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.diagnosis ? "border-red-300" : "border-gray-300"
                    }`}
                    placeholder="e.g., Viral Fever, Common Cold, etc."
                    disabled={loading}
                  />
                  {errors.diagnosis && (
                    <p className="mt-1 text-sm text-red-600">{errors.diagnosis}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Additional Notes (Optional)
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleFormChange}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Any additional notes or instructions..."
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Next Visit Date (Optional)
                  </label>
                  <input
                    type="date"
                    name="nextVisitDate"
                    value={formData.nextVisitDate}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={loading}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    If specified, patient will get a reminder 1 day before
                  </p>
                </div>
              </div>
            </div>

            {/* Medicines Section */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Medicines</h3>
                <button
                  type="button"
                  onClick={addMedicine}
                  className="px-4 py-2 text-sm bg-green-100 text-green-800 rounded-lg hover:bg-green-200"
                >
                  + Add Medicine
                </button>
              </div>

              <div className="space-y-6">
                {medicines.map((medicine, index) => (
                  <div key={medicine.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-medium text-gray-900">Medicine #{index + 1}</h4>
                      {medicines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeMedicine(medicine.id)}
                          className="text-sm text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Medicine Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Medicine Name *
                        </label>
                        <input
                          type="text"
                          value={medicine.name}
                          onChange={(e) => handleMedicineChange(medicine.id, "name", e.target.value)}
                          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                            errors[`medicine_${medicine.id}_name`] ? "border-red-300" : "border-gray-300"
                          }`}
                          placeholder="e.g., Paracetamol, Azithromycin"
                          disabled={loading}
                        />
                        {errors[`medicine_${medicine.id}_name`] && (
                          <p className="mt-1 text-sm text-red-600">{errors[`medicine_${medicine.id}_name`]}</p>
                        )}
                      </div>

                      {/* Potency (Optional - for Homeopathy) */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Potency (Optional)
                        </label>
                        <input
                          type="text"
                          value={medicine.potency || ""}
                          onChange={(e) => handleMedicineChange(medicine.id, "potency", e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="e.g., 30C, 200C (for homeopathy)"
                          disabled={loading}
                        />
                      </div>

                      {/* Dosage */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Dosage *
                        </label>
                        <input
                          type="text"
                          value={medicine.dosage}
                          onChange={(e) => handleMedicineChange(medicine.id, "dosage", e.target.value)}
                          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                            errors[`medicine_${medicine.id}_dosage`] ? "border-red-300" : "border-gray-300"
                          }`}
                          placeholder="e.g., 1-0-1, 0-0-1, Twice daily"
                          disabled={loading}
                        />
                        {errors[`medicine_${medicine.id}_dosage`] && (
                          <p className="mt-1 text-sm text-red-600">{errors[`medicine_${medicine.id}_dosage`]}</p>
                        )}
                        <p className="mt-1 text-xs text-gray-500">
                          Format: Morning-Afternoon-Night (e.g., 1-0-1 = Morning and Night)
                        </p>
                      </div>

                      {/* Duration */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Duration *
                        </label>
                        <input
                          type="text"
                          value={medicine.duration}
                          onChange={(e) => handleMedicineChange(medicine.id, "duration", e.target.value)}
                          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                            errors[`medicine_${medicine.id}_duration`] ? "border-red-300" : "border-gray-300"
                          }`}
                          placeholder="e.g., 3 days, 1 week, 10 days"
                          disabled={loading}
                        />
                        {errors[`medicine_${medicine.id}_duration`] && (
                          <p className="mt-1 text-sm text-red-600">{errors[`medicine_${medicine.id}_duration`]}</p>
                        )}
                      </div>

                      {/* Instructions */}
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Instructions (Optional)
                        </label>
                        <input
                          type="text"
                          value={medicine.instructions}
                          onChange={(e) => handleMedicineChange(medicine.id, "instructions", e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="e.g., After food, Empty stomach, With milk"
                          disabled={loading}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Prescription Templates */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-800 mb-2">💡 Quick Templates</h3>
              <p className="text-sm text-blue-700 mb-3">
                Save time with common prescription combinations:
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setFormData({ ...formData, diagnosis: "Viral Fever" });
                    setMedicines([
                      { id: 1, name: "Paracetamol", dosage: "1-0-1", duration: "3 days", instructions: "After food" },
                      { id: 2, name: "Vitamin C", dosage: "0-0-1", duration: "5 days", instructions: "Morning" },
                    ]);
                  }}
                  className="px-3 py-1 text-xs bg-white border border-blue-300 text-blue-700 rounded hover:bg-blue-50"
                >
                  Viral Fever
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFormData({ ...formData, diagnosis: "Common Cold" });
                    setMedicines([
                      { id: 1, name: "Cetirizine", dosage: "0-0-1", duration: "5 days", instructions: "Night" },
                      { id: 2, name: "Vitamin C", dosage: "0-0-1", duration: "5 days", instructions: "Morning" },
                    ]);
                  }}
                  className="px-3 py-1 text-xs bg-white border border-blue-300 text-blue-700 rounded hover:bg-blue-50"
                >
                  Common Cold
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFormData({ ...formData, diagnosis: "Cough" });
                    setMedicines([
                      { id: 1, name: "Cough Syrup", dosage: "1-0-1", duration: "5 days", instructions: "After food" },
                    ]);
                  }}
                  className="px-3 py-1 text-xs bg-white border border-blue-300 text-blue-700 rounded hover:bg-blue-50"
                >
                  Cough
                </button>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => router.push(`/dashboard/patients/${patientId}`)}
                className={`px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 ${
                  loading ? "opacity-50 cursor-not-allowed" : ""
                }`}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating Prescription...
                  </>
                ) : (
                  "Create Prescription"
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Quick Tips */}
      <div className="mt-8 bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-800 mb-2">💡 Prescription Tips</h3>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>• <strong>Be specific</strong> with dosage instructions (e.g., &quot;1-0-1&quot; for Morning-Night)</li>
          <li>• <strong>Include duration</strong> to help patients know when to stop medication</li>
          <li>• <strong>Use instructions</strong> like &quot;After food&quot; for better compliance</li>
          <li>• <strong>Save common combinations</strong> as templates for future use</li>
          <li>• Patients will get <strong>medicine reminders</strong> based on the dosage schedule</li>
        </ul>
      </div>
    </div>
  );
}
