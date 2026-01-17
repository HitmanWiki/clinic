"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

interface Prescription {
  id: string;
  date: string;
  diagnosis: string;
  medicines: Medicine[];
  patientName: string;
  patientMobile: string;
  patientAge?: number;
  patientGender?: string;
  doctorName: string;
  clinicName: string;
  clinicAddress?: string;
  clinicPhone?: string;
  clinicLogoUrl?: string;
  nextVisitDate?: string;
  notes?: string;
  clinicBranding?: {
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
  };
}

interface Medicine {
  name: string;
  dosage: string;
  duration: string;
  instructions: string;
  timing?: string;
}

export default function PrintPrescriptionPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.id) return;
    fetchPrescription();
  }, [params.id]);

  const fetchPrescription = async () => {
    try {
      setLoading(true);
      setError(null);

      const prescriptionId = params.id;
      const response = await fetch(`/api/prescriptions/${prescriptionId}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch prescription: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.prescription) {
        throw new Error('Prescription not found');
      }

      setPrescription(data.prescription);
    } catch (error) {
      console.error('Error fetching prescription:', error);
      setError(error instanceof Error ? error.message : 'Failed to load prescription');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const handleGoBack = () => {
    router.back();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-4 text-gray-600">Loading prescription...</span>
      </div>
    );
  }

  if (error || !prescription) {
    return (
      <div className="p-8 text-center">
        <div className="text-red-600 text-4xl mb-4">⚠️</div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Error Loading Prescription</h1>
        <p className="text-gray-600 mb-4">{error || 'Prescription not found'}</p>
        <div className="flex justify-center gap-4">
          <button
            onClick={fetchPrescription}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
          <button
            onClick={handleGoBack}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Print styles
  const printStyles = `
    @media print {
      body * {
        visibility: hidden;
      }
      #print-prescription, #print-prescription * {
        visibility: visible;
      }
      #print-prescription {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        padding: 20px;
        font-size: 14px;
      }
      .no-print {
        display: none !important;
      }
      .medicine-table {
        border-collapse: collapse;
        width: 100%;
      }
      .medicine-table th, .medicine-table td {
        border: 1px solid #ddd;
        padding: 8px;
        text-align: left;
      }
      .medicine-table th {
        background-color: #f5f5f5;
        font-weight: bold;
      }
    }
  `;

  const primaryColor = prescription.clinicBranding?.primaryColor || '#2563eb';

  return (
    <>
      <style>{printStyles}</style>
      
      <div className="max-w-4xl mx-auto">
        {/* Print Controls */}
        <div className="no-print mb-6 p-4 bg-white rounded-lg shadow">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Print Prescription</h1>
              <p className="text-gray-600">Preview and print prescription for {prescription.patientName}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleGoBack}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                ← Back
              </button>
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                🖨️ Print
              </button>
              <Link
                href={`/dashboard/patients/${prescription.id.split('-')[0]}`} // Assuming prescription id format
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                View Patient
              </Link>
            </div>
          </div>
        </div>

        {/* Prescription Content */}
        <div id="print-prescription" className="bg-white p-8 shadow-lg">
          {/* Clinic Header */}
          <div className="mb-8 pb-6 border-b-2 border-gray-800">
            <div className="flex justify-between items-start">
              <div className="flex items-start gap-4">
                {prescription.clinicLogoUrl && (
                  <img 
                    src={prescription.clinicLogoUrl} 
                    alt="Clinic Logo" 
                    className="h-16 w-16 object-contain"
                  />
                )}
                <div>
                  <h1 
                    className="text-3xl font-bold text-gray-900"
                    style={{ color: primaryColor }}
                  >
                    {prescription.clinicName}
                  </h1>
                  {prescription.clinicAddress && (
                    <p className="text-gray-700">{prescription.clinicAddress}</p>
                  )}
                  {prescription.clinicPhone && (
                    <p className="text-gray-700">Phone: {prescription.clinicPhone}</p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold">PRESCRIPTION</div>
                <div className="text-gray-600">Date: {formatDate(prescription.date)}</div>
                {prescription.nextVisitDate && (
                  <div className="text-gray-600 mt-2">
                    Next Visit: {formatDate(prescription.nextVisitDate)}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Patient Information */}
          <div className="mb-8">
            <h2 
              className="text-xl font-semibold mb-4"
              style={{ color: primaryColor }}
            >
              Patient Information
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="font-medium">Name:</label>
                <p className="font-semibold">{prescription.patientName}</p>
              </div>
              <div>
                <label className="font-medium">Mobile:</label>
                <p>+91 {prescription.patientMobile}</p>
              </div>
              {prescription.patientAge && (
                <div>
                  <label className="font-medium">Age:</label>
                  <p>{prescription.patientAge} years</p>
                </div>
              )}
              {prescription.patientGender && (
                <div>
                  <label className="font-medium">Gender:</label>
                  <p>{prescription.patientGender}</p>
                </div>
              )}
            </div>
          </div>

          {/* Diagnosis */}
          <div className="mb-8">
            <h2 
              className="text-xl font-semibold mb-2"
              style={{ color: primaryColor }}
            >
              Diagnosis
            </h2>
            <p className="text-lg border-b pb-2">{prescription.diagnosis}</p>
          </div>

          {/* Medicines */}
          <div className="mb-8">
            <h2 
              className="text-xl font-semibold mb-4"
              style={{ color: primaryColor }}
            >
              Medicines
            </h2>
            <table className="medicine-table">
              <thead>
                <tr>
                  <th>S.No.</th>
                  <th>Medicine Name</th>
                  <th>Dosage</th>
                  <th>Duration</th>
                  <th>Instructions</th>
                  {prescription.medicines.some(m => m.timing) && <th>Timing</th>}
                </tr>
              </thead>
              <tbody>
                {prescription.medicines.map((medicine, index) => (
                  <tr key={index}>
                    <td className="text-center">{index + 1}</td>
                    <td className="font-medium">{medicine.name}</td>
                    <td>{medicine.dosage}</td>
                    <td>{medicine.duration}</td>
                    <td>{medicine.instructions || 'As directed'}</td>
                    {medicine.timing && <td>{medicine.timing}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Additional Notes */}
          {prescription.notes && (
            <div className="mb-8">
              <h2 
                className="text-xl font-semibold mb-2"
                style={{ color: primaryColor }}
              >
                Additional Instructions
              </h2>
              <div className="border rounded-lg p-4">
                <p className="whitespace-pre-line">{prescription.notes}</p>
              </div>
            </div>
          )}

          {/* Doctor Information */}
          <div className="mt-12">
            <div className="border-t pt-8">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-xl font-bold mb-2">{prescription.doctorName}</div>
                  <div>Consulting Physician</div>
                  <div className="mt-4">Registration No.: _________________</div>
                </div>
                
                <div className="text-right">
                  <div className="mb-4">Signature:</div>
                  <div className="border-t border-gray-400 w-48 inline-block"></div>
                  <div className="mt-2">{prescription.doctorName}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-8 border-t border-gray-300 text-center text-sm text-gray-600">
            <p>This is a digitally generated prescription. Original signature may be required at the clinic.</p>
            <p className="mt-1">Clinic Contact: {prescription.clinicPhone} | {prescription.clinicName}</p>
            <p className="mt-1">For medical emergencies, visit nearest hospital</p>
          </div>
        </div>

        {/* Print Instructions */}
        <div className="no-print mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="font-medium text-yellow-800 mb-2">📋 Print Instructions</h3>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• Click the <strong>Print</strong> button above to print this prescription</li>
            <li>• Make sure your printer is connected and has paper</li>
            <li>• Select <strong>"Save as PDF"</strong> to create a digital copy</li>
            <li>• Use A4 or Letter size paper for best results</li>
          </ul>
        </div>
      </div>
    </>
  );
}