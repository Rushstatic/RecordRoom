import fs from 'fs';

const filePath = 'src/types/index.ts';
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  "| 'user-manual';",
  "| 'user-manual'\n  | 'tb-register'\n  | 'tb-reports';"
);

const tbTypes = `
export type TBSampleType = 'Sputum' | 'X-Ray' | 'LPA' | 'Followup Sputum' | 'FoodBasket';
export type TBSampleGivenAt = 'PHC_BHADA' | 'RURAL_HOSPITAL_AUSA' | null;

export interface TBPatientRecord {
  id: string;
  employee_id: string;
  phc_id: string;
  subcentre_id: string;
  village_id?: string | null;
  patient_name: string;
  age: number;
  gender: GenderType;
  mobile_number?: string | null;
  nikshay_id?: string | null;
  sample_collection_date: string; // YYYY-MM-DD
  sample_sent_date: string; // YYYY-MM-DD
  risk_type: string;
  sample_type: TBSampleType;
  sample_given_at?: TBSampleGivenAt;
  
  client_record_id?: string | null;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;

  // Joined fields
  village_name?: string;
  subcentre_name?: string;
  phc_name?: string;
  employee_name?: string;
}

export interface OfflineTBDraft {
  draftId: string;
  clientRecordId: string;
  employeeId: string;
  timestamp: number;
  payload: Partial<TBPatientRecord>;
}
`;

content = content.replace(
  "export interface MalariaBloodSample {",
  tbTypes + "\nexport interface MalariaBloodSample {"
);

content = content.replace(
  "export interface ArogyaState {",
  "export interface ArogyaState {\n  tb_suspected_patient_register: TBPatientRecord[];"
);

fs.writeFileSync(filePath, content, 'utf8');
