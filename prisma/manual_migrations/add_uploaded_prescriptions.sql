-- Create uploaded_prescriptions table
CREATE TABLE IF NOT EXISTS uploaded_prescriptions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  uploaded_by TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  patient_id TEXT NOT NULL,
  clinic_id TEXT NOT NULL,
  
  -- Create foreign key constraints
  CONSTRAINT uploaded_prescriptions_patient_id_fkey 
    FOREIGN KEY (patient_id) 
    REFERENCES patients(id) 
    ON DELETE CASCADE,
  
  CONSTRAINT uploaded_prescriptions_clinic_id_fkey 
    FOREIGN KEY (clinic_id) 
    REFERENCES clinics(id) 
    ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS uploaded_prescriptions_patient_id_idx 
  ON uploaded_prescriptions(patient_id);

CREATE INDEX IF NOT EXISTS uploaded_prescriptions_clinic_id_idx 
  ON uploaded_prescriptions(clinic_id);

CREATE INDEX IF NOT EXISTS uploaded_prescriptions_uploaded_at_idx 
  ON uploaded_prescriptions(uploaded_at);