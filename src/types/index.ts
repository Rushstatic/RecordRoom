export type UserRole = 'phc_controller' | 'subcentre_employee';

export enum AppUserRole {
  PHC_CONTROLLER = 'PHC_CONTROLLER',
  SUBCENTRE_EMPLOYEE = 'SUBCENTRE_EMPLOYEE',
}

export interface UserProfileEntity {
  id: string; // UUID primary key
  auth_user_id: string; // UUID unique not null
  employee_id?: string | null; // UUID foreign key to employee_master
  role: 'PHC_CONTROLLER' | 'SUBCENTRE_EMPLOYEE' | string;
  phc_id?: string | null; // UUID foreign key to phc_master
  subcentre_id?: string | null; // UUID foreign key to subcentre_master
  is_active: boolean;
  email?: string;
  mobile?: string;
  display_name?: string;
  last_login_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  authUserId?: string;
  name: string;
  marathiName: string;
  role: UserRole;
  roleTitleMarathi: string;
  email: string;
  phone?: string;
  assignedPhc?: string;
  assignedSubcentre?: string;
  employeeId?: string;
  phcId?: string;
  subcentreId?: string;
  smearCode?: string;
  isActive?: boolean;
  requirePasswordChange?: boolean;
  district?: string;
  taluka?: string;
}

export type PageId =
  | 'login'
  | 'dashboard'
  | 'daily-work'
  | 'phc-master'
  | 'subcentre-master'
  | 'village-master'
  | 'employee-master'
  | 'malaria-register'
  | 'offline-drafts'
  | 'send-samples'
  | 'template-builder'
  | 'template-fields'
  | 'dynamic-register'
  | 'reports'
  | 'malaria-reports'
  | 'malaria-coverage'
  | 'malaria-targets'
  | 'data-validation'
  | 'backup-audit'
  | 'user-management'
  | 'user-manual'
  | 'tb-register'
  | 'tb-reports'
  | 'dynamic-report';

export interface NavItem {
  id: PageId;
  labelMarathi: string;
  labelEnglish: string;
  iconName: string;
  badge?: string;
  allowedRoles?: UserRole[];
}

// ==========================================
// CODE 2: MASTER DATABASE TYPES
// ==========================================

export interface PhcMaster {
  id: string;
  phc_name: string;
  phc_code?: string | null;
  taluka?: string | null;
  district?: string | null;
  created_at?: string;
}

export interface SubcentreMaster {
  id: string;
  phc_id: string;
  subcentre_name: string;
  subcentre_code?: string | null;
  created_at?: string;
  // UI joins:
  phc_name?: string;
}

export interface VillageMaster {
  id: string;
  subcentre_id: string;
  village_name: string;
  population: number;
  total_houses: number;
  created_at?: string;
  // UI joins:
  subcentre_name?: string;
  phc_name?: string;
}

export interface EmployeeMaster {
  id: string;
  subcentre_id: string;
  employee_name: string;
  designation?: string | null;
  mobile_number?: string | null;
  email?: string | null;
  malaria_smear_code: string;
  is_active: boolean;
  created_at?: string;
  // UI joins:
  subcentre_name?: string;
  phc_name?: string;
}

export interface DashboardMetrics {
  totalPhcs: number;
  totalSubcentres: number;
  totalVillages: number;
  totalEmployees: number;
  activeEmployees: number;
  inactiveEmployees: number;
  totalPopulation: number;
}

// ==========================================
// CODE 4: MALARIA BLOOD SAMPLE REGISTER
// ==========================================

export type GenderType = 'पुरुष' | 'स्त्री' | 'इतर';




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

export interface MalariaBloodSample {
  id: string;
  employee_id: string;
  village_id: string;
  house_number: string;
  patient_name: string;
  age: number;
  gender: GenderType;
  sample_collection_date: string; // YYYY-MM-DD
  sample_number: number;
  sample_year: number;
  malaria_smear_code: string;
  sent_date?: string | null; // YYYY-MM-DD or null
  client_record_id?: string | null; // UUID idempotency key for safe offline sync
  created_at?: string;
  updated_at?: string;

  // Joined presentation fields:
  village_name?: string;
  subcentre_name?: string;
  subcentre_id?: string;
  phc_name?: string;
  phc_id?: string;
  employee_name?: string;
}

// ==========================================
// CODE 8: MALARIA TARGET & PROGRESS TYPES
// ==========================================

export type TargetType = 'Monthly' | 'Yearly';
export type TargetScopeLevel = 'phc' | 'subcentre' | 'village' | 'employee';

export interface MalariaTarget {
  id: string;
  phc_id?: string | null;
  subcentre_id?: string | null;
  village_id?: string | null;
  employee_id?: string | null;
  target_year: number;
  target_month?: number | null; // 1-12 or null
  target_type: TargetType;
  target_value: number; // > 0
  remarks?: string | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;

  // Joined display fields:
  phc_name?: string;
  subcentre_name?: string;
  village_name?: string;
  employee_name?: string;
  designation?: string;
  malaria_smear_code?: string;
}

export type ProgressStatus = 'कमी प्रगती' | 'मध्यम प्रगती' | 'चांगली प्रगती' | 'लक्ष्य पूर्ण';

export interface TargetProgressItem {
  id: string;
  targetId?: string;
  scopeLevel: TargetScopeLevel;
  entityId: string;
  entityName: string;
  code?: string;
  population?: number;
  totalHouses?: number;
  coveredHouses?: number;
  houseCoveragePercent?: number;
  targetValue: number;
  actualSamples: number;
  remainingTarget: number;
  progressPercent: number;
  sentSamples: number;
  pendingSamples: number;
  status: ProgressStatus;
  remarks?: string;
  phc_name?: string;
  subcentre_name?: string;
  village_name?: string;
  employee_name?: string;
  designation?: string;
  villageCount?: number;
  subcentreCount?: number;
}

// ==========================================
// CODE 9: DATA QUALITY & VALIDATION TYPES
// ==========================================

export type ValidationSeverity = 'त्रुटी' | 'सूचना' | 'माहिती'; // Error, Warning, Info
export type ValidationSeverityEn = 'error' | 'warning' | 'info';

export type ValidationModule =
  | 'PHC'
  | 'Subcentre'
  | 'Village'
  | 'Employee'
  | 'Blood Samples'
  | 'Sample Number'
  | 'Smear Code'
  | 'Relations'
  | 'Orphan Records';

export interface ValidationIssue {
  id: string;
  module: ValidationModule;
  categoryMarathi: string;
  recordId: string;
  recordIdentifier: string; // e.g. village name, patient name, etc.
  issueText: string;
  severity: ValidationSeverity;
  severityEn: ValidationSeverityEn;
  date: string;
  targetPage: PageId;
  tableName: 'phc_master' | 'subcentre_master' | 'village_master' | 'employee_master' | 'malaria_blood_samples';
  fieldName?: string;
  fieldLabelMarathi?: string;
  currentValue?: any;
  suggestedFix?: string;
  canCorrect?: boolean;
  correctionType?: 'text' | 'number' | 'select';
  allowedOptions?: { label: string; value: any }[];

  // Hierarchical scope for filtering
  phcId?: string;
  phcName?: string;
  subcentreId?: string;
  subcentreName?: string;
  villageId?: string;
  villageName?: string;
  employeeId?: string;
  employeeName?: string;
  smearCode?: string;
  sampleNumber?: number;
  patientName?: string;
  houseNumber?: string;
}

export interface CategoryValidationSummary {
  category: ValidationModule;
  labelMarathi: string;
  errors: number;
  warnings: number;
  info: number;
  totalIssues: number;
}

export interface PhcQualitySummary {
  phcId: string;
  phcName: string;
  totalRecords: number;
  errorCount: number;
  warningCount: number;
  validRecords: number;
  qualityScore: number;
  statusText: string;
}

// ==========================================
// CODE 10: BACKUP, AUDIT TRAIL & SYSTEM ACTIVITY
// ==========================================

export type AuditAction =
  | 'LOGIN'
  | 'LOGOUT'
  | 'LOGIN_FAILED'
  | 'PASSWORD_RESET_REQUEST'
  | 'PASSWORD_RESET'
  | 'USER_CREATED'
  | 'USER_ACTIVATED'
  | 'USER_DEACTIVATED'
  | 'ROLE_ASSIGNMENT_CHANGED'
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'ACTIVATE'
  | 'DEACTIVATE'
  | 'SEND_SAMPLES'
  | 'PRINT'
  | 'EXPORT'
  | 'BACKUP'
  | 'RESTORE'
  | 'QUICK_ACTION'
  | 'DYNAMIC_RECORD_CREATE'
  | 'DYNAMIC_RECORD_UPDATE'
  | 'DYNAMIC_RECORD_DELETE'
  | 'DYNAMIC_RECORD_EXPORT'
  | 'DYNAMIC_RECORD_PRINT';

export type AuditModule =
  | 'PHC Master'
  | 'Subcentre Master'
  | 'Village Master'
  | 'Employee Master'
  | 'Malaria Sample Register'
  | 'Send Samples'
  | 'Malaria Reports'
  | 'Coverage'
  | 'Target Management'
  | 'Data Quality'
  | 'System Backup'
  | 'Authentication'
  | 'User Management'
  | 'Daily Work'
  | 'TB Register'
  | 'TB Reports';

export interface SystemAuditLog {
  id: string;
  user_id?: string | null;
  user_name?: string | null;
  role?: UserRole | string | null;
  action: AuditAction;
  module: AuditModule;
  record_id?: string | null;
  record_description?: string | null;
  old_values?: Record<string, any> | null;
  new_values?: Record<string, any> | null;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at: string;
  subcentre_id?: string | null;
  phc_id?: string | null;
}

export interface BackupMetadata {
  application_name: string;
  backup_date: string;
  backup_time: string;
  database_schema_version: string;
  created_by: string;
  created_by_role: string;
  tables_included: string[];
  record_counts: Record<string, number>;
  total_records: number;
  environment?: string;
  checksum?: string;
}

export interface BackupPayload {
  metadata: BackupMetadata;
  data: {
    phc_master: PhcMaster[];
    subcentre_master: SubcentreMaster[];
    village_master: VillageMaster[];
    employee_master: EmployeeMaster[];
    malaria_blood_samples: MalariaBloodSample[];
    malaria_targets: MalariaTarget[];
    system_audit_logs: SystemAuditLog[];
  };
}

export interface BackupHistoryItem {
  id: string;
  backup_date: string;
  backup_time: string;
  filename: string;
  created_by: string;
  created_by_role: string;
  tables: string[];
  records_count: number;
  status: 'यशस्वी' | 'अयशस्वी';
  size_bytes?: number;
  is_safety_backup?: boolean;
  created_at: string;
  payload_json?: string;
}

export interface AuditActivityMetrics {
  todayCount: number;
  thisWeekCount: number;
  thisMonthCount: number;
  sampleCreatedCount: number;
  sampleUpdatedCount: number;
  sampleDeletedCount: number;
  masterDataChangesCount: number;
  loginLogoutCount: number;
}

// ==========================================
// CODE 12: PWA, OFFLINE DRAFT & SYNC TYPES
// ==========================================

export type OfflineSyncStatus = 'DRAFT' | 'SYNCING' | 'SYNCED' | 'FAILED';

export interface OfflineMalariaDraft {
  local_id: string; // client UUID v4 / idempotency key
  employee_id: string;
  village_id: string;
  house_number: string;
  patient_name: string;
  age: number;
  gender: GenderType;
  sample_collection_date: string; // YYYY-MM-DD
  sample_year: number;
  malaria_smear_code: string;

  // Joined / Display helper fields
  village_name?: string;
  subcentre_name?: string;
  employee_name?: string;
  phc_name?: string;

  // Sync tracking
  sync_status: OfflineSyncStatus;
  retry_count: number;
  last_error?: string | null;
  synced_sample_id?: string | null;
  synced_sample_number?: number | null;
  synced_smear_code?: string | null;
  synced_at?: string | null;

  created_at: string;
  updated_at: string;
  created_by_user_id?: string;
}

export interface SyncStats {
  total: number;
  pending: number; // DRAFT or FAILED
  syncing: number;
  synced: number;
  failed: number;
  lastSyncTime: string | null;
}




// --- CODE 18: Dynamic Record Templates ---

export interface RecordRegisterTemplate {
  id: string;
  register_code: string;
  register_name: string;
  program_name: string | null;
  description: string | null;
  icon: string | null;
  is_active: boolean;
  display_order: number;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export type FieldType = 
  | 'text' | 'textarea' | 'number' | 'date' | 'datetime' 
  | 'mobile' | 'dropdown' | 'radio' | 'checkbox' 
  | 'boolean' | 'auto_number' | 'auto_date' 
  | 'calculated' | 'hidden';

export interface RecordTemplateField {
  id: string;
  template_id: string;
  field_key: string;
  field_label: string;
  field_type: FieldType;
  field_order: number;
  is_required: boolean;
  is_searchable: boolean;
  show_in_list: boolean;
  show_in_report: boolean;
  show_in_print: boolean;
  default_value: string | null;
  placeholder: string | null;
  help_text: string | null;
  options_json: any | null;
  validation_json: any | null;
  automation_json: any | null;
  conditional_json: any | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface DynamicRecordEntry {
  id: string;
  template_id: string;
  employee_id?: string;
  phc_id?: string;
  subcentre_id?: string;
  village_id?: string;
  record_data: any;
  record_date: string;
  created_by?: string;
  updated_by?: string;
  created_at?: string;
  updated_at?: string;
}
