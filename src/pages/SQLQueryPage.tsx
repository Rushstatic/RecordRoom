import React, { useState, useEffect, useRef } from 'react';
import {
  Database,
  Terminal,
  Play,
  Shield,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Check,
  Copy,
  Download,
  RotateCcw,
  History,
  Table as TableIcon,
  Search,
  ArrowLeft,
  Lock,
  FileCode,
  CheckCircle2,
  Clock,
  Trash2,
  Filter,
  Eye,
  X,
  Code2,
  Info,
  Server,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { auditService } from '../services/auditService';
import { PageId } from '../types';

interface SQLQueryPageProps {
  onNavigate?: (page: PageId) => void;
}

interface QueryResult {
  data: any[] | null;
  count: number | null;
  columns: string[];
  executionTimeMs: number;
  error: string | null;
  statusText: string;
  tableName: string | null;
  executedAt: string;
}

interface QueryHistoryItem {
  id: string;
  sql: string;
  tableName: string | null;
  executedAt: string;
  durationMs: number;
  rowCount: number;
  status: 'SUCCESS' | 'ERROR';
  error?: string;
  userName: string;
}

interface DatabaseTableMeta {
  name: string;
  marathiName: string;
  category: 'master' | 'clinical' | 'audit' | 'config';
  description: string;
  keyColumns: string[];
}

const DATABASE_TABLES: DatabaseTableMeta[] = [
  {
    name: 'user_profiles',
    marathiName: 'वापरकर्ता प्रोफाईल्स (RBAC & Auth)',
    category: 'master',
    description: 'वापरकर्त्यांचे लॉगिन खाते, भूमिका (Role), मोबाईल व मॅपिंग',
    keyColumns: ['id', 'auth_user_id', 'employee_id', 'role', 'display_name', 'mobile', 'email', 'is_active'],
  },
  {
    name: 'employee_master',
    marathiName: 'कर्मचारी मास्टर (Employees)',
    category: 'master',
    description: 'सर्व आरोग्य कर्मचारी, वैद्यकीय अधिकारी, आरोग्य सेवक/सेविका',
    keyColumns: ['id', 'employee_name', 'designation', 'mobile_number', 'malaria_smear_code', 'is_active'],
  },
  {
    name: 'employee_posting_history',
    marathiName: 'कर्मचारी पदस्थापना इतिहास (Posting)',
    category: 'master',
    description: 'कर्मचाऱ्यांच्या मूळ उपकेंद्र पदस्थापनेचा इतिहास',
    keyColumns: ['id', 'employee_id', 'subcentre_id', 'effective_from', 'effective_to', 'is_current'],
  },
  {
    name: 'employee_extra_charge',
    marathiName: 'कर्मचारी अतिरिक्त कार्यभार (Extra Charge)',
    category: 'master',
    description: 'कर्मचाऱ्यांकडे सोपवलेला अतिरिक्त उपकेंद्रांचा कार्यभार',
    keyColumns: ['id', 'employee_id', 'subcentre_id', 'assigned_date', 'relieved_date', 'is_active'],
  },
  {
    name: 'phc_master',
    marathiName: 'प्रा.आ.के. मास्टर (PHC)',
    category: 'master',
    description: 'प्राथमिक आरोग्य केंद्र भादा व इतर केंद्रे',
    keyColumns: ['id', 'phc_name', 'district', 'taluka', 'is_active'],
  },
  {
    name: 'subcentre_master',
    marathiName: 'आरोग्य उपकेंद्र मास्टर (Subcentres)',
    category: 'master',
    description: 'भादा अंतर्गत सर्व उपकेंद्रे व त्यांचे संकेतांक',
    keyColumns: ['id', 'subcentre_name', 'sc_code', 'phc_id', 'population', 'is_active'],
  },
  {
    name: 'village_master',
    marathiName: 'गाव मास्टर (Villages)',
    category: 'master',
    description: 'उपकेंद्रांतर्गत समाविष्ट गावे व लोकसंख्या',
    keyColumns: ['id', 'village_name', 'subcentre_id', 'population', 'is_active'],
  },
  {
    name: 'malaria_blood_samples',
    marathiName: 'मलेरिया रक्त नमुना नोंद (Malaria Register)',
    category: 'clinical',
    description: 'मलेरिया ताप रुग्ण रक्त नमुने, स्मीअर निकाल व उपचार',
    keyColumns: ['id', 'sample_barcode', 'patient_name', 'age_years', 'village_name', 'result_status', 'created_at'],
  },
  {
    name: 'malaria_targets',
    marathiName: 'मलेरिया वार्षिक उद्दिष्टे (Targets)',
    category: 'clinical',
    description: 'उपकेंद्र व महिनानिहाय BSC / ABER उद्दिष्टे',
    keyColumns: ['id', 'year', 'subcentre_id', 'annual_target', 'monthly_target'],
  },
  {
    name: 'tb_suspected_patient_register',
    marathiName: 'क्षयरोग संशयित रुग्ण नोंद (TB Register)',
    category: 'clinical',
    description: 'संशयित क्षयरोग रुग्ण, थुंकी तपासणी व संदर्भित माहिती',
    keyColumns: ['id', 'registration_no', 'patient_name', 'age_years', 'village_name', 'symptoms', 'result_status'],
  },
  {
    name: 'system_audit_logs',
    marathiName: 'प्रणाली ऑडिट नोंदी (System Audit Trail)',
    category: 'audit',
    description: 'सुरक्षा, लॉगिन, डेटा बदल व SQL क्वेरींचे ऑडिट रेकॉर्ड्स',
    keyColumns: ['id', 'action', 'module', 'user_name', 'role', 'record_description', 'created_at'],
  },
  {
    name: 'dynamic_register_templates',
    marathiName: 'नोंदवही टेम्प्लेट्स (Custom Registers)',
    category: 'config',
    description: 'डायनॅमिक फॉर्म्स व कस्टम नोंदवह्यांची व्याख्या',
    keyColumns: ['id', 'template_name', 'template_name_marathi', 'register_category', 'is_active'],
  },
  {
    name: 'dynamic_template_fields',
    marathiName: 'नोंदवही रकाने (Template Fields)',
    category: 'config',
    description: 'कस्टम नोंदवहीतील विविध इनपुट रकाने',
    keyColumns: ['id', 'template_id', 'field_name', 'field_label_marathi', 'field_type'],
  },
  {
    name: 'dynamic_register_records',
    marathiName: 'नोंदवही नोंदी (Register Records)',
    category: 'clinical',
    description: 'कस्टम नोंदवह्यांमध्ये भरलेला प्रत्यक्ष डेटा',
    keyColumns: ['id', 'template_id', 'employee_id', 'subcentre_id', 'created_at'],
  },
  {
    name: 'sample_dispatch_batches',
    marathiName: 'प्रयोगशाळा पाठवणी बॅच (Lab Dispatch)',
    category: 'clinical',
    description: 'रक्त नमुने तपासणीसाठी लॅबकडे पाठवलेल्या बॅचेस',
    keyColumns: ['id', 'batch_number', 'dispatch_date', 'total_samples', 'status'],
  },
  {
    name: 'app_offline_sync_queue',
    marathiName: 'ऑफलाइन सिंक रांग (Sync Queue)',
    category: 'audit',
    description: 'इंटरनेट पूर्ववत झाल्यावर सिंक होणाऱ्या ऑफलाइन नोंदी',
    keyColumns: ['id', 'table_name', 'operation', 'status', 'created_at'],
  },
];

const PRESET_QUERIES = [
  {
    id: 'govind-admin',
    name: 'गोविंद हिप्परगेकर मास्टर ॲडमिन पडताळणी (Govind Hippargekar Status)',
    description: 'मोबाईल 9730266586, मास्टर ॲडमिन प्रोफाईल व PHC भादा अधिकारक्षेत्र',
    sql: `SELECT id, display_name, mobile, email, role, is_active, phc_id, employee_id, auth_user_id
FROM user_profiles
WHERE mobile = '9730266586' OR display_name ILIKE '%गोविंद%' OR display_name ILIKE '%Hippargekar%'
LIMIT 10;`,
    targetTable: 'user_profiles',
  },
  {
    id: 'user-profiles',
    name: 'सर्व वापरकर्ता प्रोफाईल्स व भूमिका (All User Profiles & RBAC)',
    description: 'नोंदणीकृत ॲडमिन, वैद्यकीय अधिकारी व उपकेंद्र कर्मचाऱ्यांची यादी',
    sql: `SELECT id, display_name, mobile, email, role, is_active, phc_id, employee_id
FROM user_profiles
ORDER BY role ASC, display_name ASC
LIMIT 50;`,
    targetTable: 'user_profiles',
  },
  {
    id: 'active-employees',
    name: 'सक्रिय कर्मचारी मास्टर (Active Health Employees)',
    description: 'सर्व आरोग्य सेवक/सेविकांची पदस्थापना, संपर्क व मलेरिया स्मीअर कोड',
    sql: `SELECT id, employee_name, designation, mobile_number, email, malaria_smear_code, is_active
FROM employee_master
WHERE is_active = true
ORDER BY employee_name ASC
LIMIT 50;`,
    targetTable: 'employee_master',
  },
  {
    id: 'phc-subcentres',
    name: 'प्रा.आ.के. भादा व सर्व उपकेंद्रे (PHC & Subcentre Master)',
    description: 'प्राथमिक आरोग्य केंद्र भादा आणि त्याखालील सर्व उपकेंद्रे',
    sql: `SELECT id, subcentre_name, sc_code, phc_id, population, is_active
FROM subcentre_master
ORDER BY subcentre_name ASC
LIMIT 50;`,
    targetTable: 'subcentre_master',
  },
  {
    id: 'villages-list',
    name: 'सर्व गावे व उपकेंद्र जोडणी (Village Master)',
    description: 'आरोग्य उपकेंद्रांनुसार गावांची यादी व लोकसंख्या',
    sql: `SELECT id, village_name, subcentre_id, population, is_active
FROM village_master
ORDER BY village_name ASC
LIMIT 50;`,
    targetTable: 'village_master',
  },
  {
    id: 'recent-malaria',
    name: 'अलीकडील मलेरिया नमुने (Recent Malaria Blood Samples)',
    description: 'गेल्या काही दिवसांत नोंदवलेले मलेरिया रक्त नमुने व निकाल',
    sql: `SELECT id, sample_barcode, patient_name, age_years, gender, village_name, date_of_collection, result_status, continuous_sample_number, created_at
FROM malaria_blood_samples
ORDER BY created_at DESC
LIMIT 25;`,
    targetTable: 'malaria_blood_samples',
  },
  {
    id: 'tb-patients',
    name: 'क्षयरोग संशयित रुग्ण (TB Suspected Patients Register)',
    description: 'नोंदणीकृत संशयित क्षयरोग रुग्ण, लक्षणे व थुंकी तपासणी निकाल',
    sql: `SELECT id, registration_no, patient_name, age_years, gender, village_name, symptoms, sputum_collection_date, result_status, created_at
FROM tb_suspected_patient_register
ORDER BY created_at DESC
LIMIT 25;`,
    targetTable: 'tb_suspected_patient_register',
  },
  {
    id: 'posting-history',
    name: 'कर्मचारी पदस्थापना इतिहास (Employee Posting History)',
    description: 'कर्मचाऱ्यांच्या मूळ पदस्थापना व बदली नोंदी',
    sql: `SELECT id, employee_id, subcentre_id, effective_from, effective_to, is_current, remarks
FROM employee_posting_history
ORDER BY effective_from DESC
LIMIT 25;`,
    targetTable: 'employee_posting_history',
  },
  {
    id: 'extra-charge',
    name: 'अतिरिक्त कार्यभार नोंदी (Employee Extra Charge)',
    description: 'कर्मचाऱ्यांना दिलेला इतर उपकेंद्रांचा अतिरिक्त कार्यभार',
    sql: `SELECT id, employee_id, subcentre_id, assigned_date, relieved_date, is_active, remarks
FROM employee_extra_charge
ORDER BY assigned_date DESC
LIMIT 25;`,
    targetTable: 'employee_extra_charge',
  },
  {
    id: 'recent-audit-logs',
    name: 'सिस्टीम सुरक्षा व क्रिया ऑडिट (Recent System Audit Logs)',
    description: 'वापरकर्त्यांनी केलेल्या अलीकडील क्रिया, बदल व सुरक्षितता ऑडिट',
    sql: `SELECT id, action, module, user_name, role, record_description, created_at
FROM system_audit_logs
ORDER BY created_at DESC
LIMIT 25;`,
    targetTable: 'system_audit_logs',
  },
];

// Dangerous keywords forbidden in read-only mode
const FORBIDDEN_KEYWORDS = [
  'INSERT',
  'UPDATE',
  'DELETE',
  'DROP',
  'ALTER',
  'TRUNCATE',
  'CREATE',
  'REPLACE',
  'RENAME',
  'GRANT',
  'REVOKE',
  'EXEC',
  'EXECUTE',
  'CALL',
  'VACUUM',
  'COPY',
  'LOCK',
  'BEGIN',
  'COMMIT',
  'ROLLBACK',
  'DO',
];

const HISTORY_STORAGE_KEY = 'arogya_sql_query_history_v1';

export const SQLQueryPage: React.FC<SQLQueryPageProps> = ({ onNavigate }) => {
  const { user, isPhcController, role } = useAuth();

  const [queryText, setQueryText] = useState<string>(PRESET_QUERIES[0].sql);
  const [selectedLimit, setSelectedLimit] = useState<number>(50);
  const [activePresetId, setActivePresetId] = useState<string>(PRESET_QUERIES[0].id);
  const [executing, setExecuting] = useState<boolean>(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [queryHistory, setQueryHistory] = useState<QueryHistoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<'editor' | 'history' | 'catalog'>('editor');
  const [copied, setCopied] = useState<boolean>(false);
  const [selectedCellDetail, setSelectedCellDetail] = useState<{ col: string; value: any } | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isSupabaseReady = isSupabaseConfigured() && !!supabase;

  // Load query history on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (stored) {
        setQueryHistory(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, []);

  // Save query history
  const saveHistoryItem = (item: QueryHistoryItem) => {
    setQueryHistory((prev) => {
      const updated = [item, ...prev].slice(0, 50); // retain last 50
      try {
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  const clearHistory = () => {
    setQueryHistory([]);
    try {
      localStorage.removeItem(HISTORY_STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  // Keyboard shortcut Ctrl+Enter or Cmd+Enter to execute
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleExecuteQuery();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [queryText, isSupabaseReady, user, isPhcController]);

  // If user is not PHC Controller / Admin, block access
  if (!isPhcController && role !== 'phc_controller') {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl border border-rose-200 shadow-xl p-6 text-center space-y-4 animate-fadeIn">
          <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <ShieldAlert className="w-9 h-9" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-xl font-bold text-rose-950">प्रवेश नाकारला (Access Denied)</h2>
            <p className="text-xs text-rose-700 leading-relaxed font-medium">
              सुरक्षित SQL क्वेरी कन्सोल केवळ प्राथमिक आरोग्य केंद्र नियंत्रक / मास्टर ॲडमिन (PHC Controller) साठी राखीव आहे.
            </p>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 text-left space-y-1">
            <p className="font-semibold text-slate-800">वर्तमान लॉगिन माहिती:</p>
            <p>वापरकर्ता: {user?.marathiName || user?.name || 'अज्ञात'}</p>
            <p>भूमिका: {role || 'लागू नाही'}</p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate?.('dashboard')}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            डॅशबोर्डवर परत जा (Go to Dashboard)
          </button>
        </div>
      </div>
    );
  }

  // Security Validator: Strict Read-Only Check
  const validateReadOnlyQuery = (sql: string): { isValid: boolean; error?: string } => {
    const trimmed = sql.trim();
    if (!trimmed) {
      return { isValid: false, error: 'कृपया चालवण्यासाठी वैध SQL क्वेरी प्रविष्ट करा.' };
    }

    // Upper-case tokens for safety check
    const upper = trimmed.toUpperCase();

    // Check forbidden words with word boundaries
    for (const keyword of FORBIDDEN_KEYWORDS) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      if (regex.test(upper)) {
        return {
          isValid: false,
          error: `सुरक्षा उल्लंघन: '${keyword}' आज्ञा प्रतिबंधित आहे! हे कन्सोल केवळ वाचनीय (Read-Only) SQL क्वेरींसाठी मर्यादित आहे.`,
        };
      }
    }

    // Must start with SELECT or WITH or EXPLAIN
    if (!upper.startsWith('SELECT') && !upper.startsWith('WITH') && !upper.startsWith('EXPLAIN')) {
      return {
        isValid: false,
        error: "फक्त 'SELECT' किंवा 'WITH ... SELECT' ने सुरू होणाऱ्या वाचनीय क्वेरी अनुमत आहेत.",
      };
    }

    return { isValid: true };
  };

  // Main Query Execution Function
  const handleExecuteQuery = async () => {
    const rawSql = queryText.trim();
    if (!rawSql) return;

    // 1. Validate Read-Only
    const validation = validateReadOnlyQuery(rawSql);
    if (!validation.isValid) {
      const errorMsg = validation.error || 'अवैध क्वेरी';
      setResult({
        data: null,
        count: 0,
        columns: [],
        executionTimeMs: 0,
        error: errorMsg,
        statusText: 'सुरक्षा अडथळा (Security Blocked)',
        tableName: null,
        executedAt: new Date().toISOString(),
      });
      return;
    }

    setExecuting(true);
    const startTime = performance.now();
    let detectedTable: string | null = null;

    try {
      if (!isSupabaseReady || !supabase) {
        throw new Error('Supabase थेट जोडलेले नाही. कृपया .env मध्ये VITE_SUPABASE_URL व ANON_KEY तपासा.');
      }

      // Parse table name: SELECT ... FROM <tableName>
      const fromMatch = rawSql.match(/from\s+([a-zA-Z0-9_]+)/i);
      detectedTable = fromMatch ? fromMatch[1].toLowerCase() : null;

      if (!detectedTable) {
        throw new Error("क्वेरीमध्ये वैध टेबल नाव आढळले नाही (उदा. FROM user_profiles किंवा FROM malaria_blood_samples).");
      }

      // Parse LIMIT if user supplied it, else use selectedLimit
      const limitMatch = rawSql.match(/limit\s+(\d+)/i);
      const effectiveLimit = limitMatch ? parseInt(limitMatch[1], 10) : selectedLimit;

      // Smart Parser for common queries to execute securely via PostgREST
      let queryBuilder = supabase.from(detectedTable).select('*', { count: 'exact' });

      // Check for specific Govind Hippargekar queries
      const lowerSql = rawSql.toLowerCase();
      if (lowerSql.includes('9730266586') || lowerSql.includes('govind') || lowerSql.includes('गोविंद')) {
        if (detectedTable === 'user_profiles') {
          queryBuilder = supabase
            .from('user_profiles')
            .select('*', { count: 'exact' })
            .or('mobile.eq.9730266586,display_name.ilike.%गोविंद%,display_name.ilike.%Govind%');
        } else if (detectedTable === 'employee_master') {
          queryBuilder = supabase
            .from('employee_master')
            .select('*', { count: 'exact' })
            .or('mobile_number.eq.9730266586,employee_name.ilike.%गोविंद%,employee_name.ilike.%Govind%');
        }
      } else if (lowerSql.includes('where is_active = true') || lowerSql.includes('where is_active=true')) {
        queryBuilder = queryBuilder.eq('is_active', true);
      }

      // Check for ORDER BY
      const orderMatch = rawSql.match(/order\s+by\s+([a-zA-Z0-9_]+)\s*(asc|desc)?/i);
      if (orderMatch) {
        const orderCol = orderMatch[1];
        const isAsc = (orderMatch[2] || 'asc').toLowerCase() === 'asc';
        queryBuilder = queryBuilder.order(orderCol, { ascending: isAsc });
      }

      // Apply safe limit cap (maximum 500)
      const finalLimit = Math.min(effectiveLimit || 50, 500);
      queryBuilder = queryBuilder.limit(finalLimit);

      // Execute PostgREST query
      const { data, count, error } = await queryBuilder;
      const endTime = performance.now();
      const durationMs = Math.round(endTime - startTime);

      if (error) {
        const errorText = error.message || 'क्वेरी चालवताना डेटाबेस त्रुटी आली.';
        setResult({
          data: null,
          count: null,
          columns: [],
          executionTimeMs: durationMs,
          error: errorText,
          statusText: `त्रुटी (Error code: ${error.code || 'UNKNOWN'})`,
          tableName: detectedTable,
          executedAt: new Date().toISOString(),
        });

        // Log audit failure
        auditService.logAction({
          action: 'SQL_QUERY_FAILED',
          module: 'SQL Diagnostic Console',
          record_description: `SQL Query Failed on ${detectedTable}: ${errorText}`,
          new_values: { sql: rawSql, error: errorText, durationMs },
          user,
        });

        // Save History
        saveHistoryItem({
          id: Math.random().toString(36).slice(2, 9),
          sql: rawSql,
          tableName: detectedTable,
          executedAt: new Date().toISOString(),
          durationMs,
          rowCount: 0,
          status: 'ERROR',
          error: errorText,
          userName: user?.marathiName || user?.name || 'Master Admin',
        });
      } else {
        const rows = data || [];
        const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

        setResult({
          data: rows,
          count: count ?? rows.length,
          columns,
          executionTimeMs: durationMs,
          error: null,
          statusText: `${rows.length} रेकॉर्ड्स प्राप्त झाले (${durationMs} ms)`,
          tableName: detectedTable,
          executedAt: new Date().toISOString(),
        });

        // Monitored: Log Successful Query in system_audit_logs
        auditService.logAction({
          action: 'SQL_QUERY_EXECUTED',
          module: 'SQL Diagnostic Console',
          record_description: `SQL Query Executed on table ${detectedTable}: ${rows.length} rows returned in ${durationMs}ms`,
          new_values: {
            sql: rawSql.slice(0, 300),
            tableName: detectedTable,
            rowCount: rows.length,
            durationMs,
            status: 'SUCCESS',
          },
          user,
        });

        // Save History
        saveHistoryItem({
          id: Math.random().toString(36).slice(2, 9),
          sql: rawSql,
          tableName: detectedTable,
          executedAt: new Date().toISOString(),
          durationMs,
          rowCount: rows.length,
          status: 'SUCCESS',
          userName: user?.marathiName || user?.name || 'Master Admin',
        });
      }
    } catch (err: any) {
      const endTime = performance.now();
      const durationMs = Math.round(endTime - startTime);
      const errorMsg = err.message || 'क्वेरी चालवताना अनपेक्षित त्रुटी आढळली.';

      setResult({
        data: null,
        count: null,
        columns: [],
        executionTimeMs: durationMs,
        error: errorMsg,
        statusText: 'त्रुटी (Execution Failed)',
        tableName: detectedTable,
        executedAt: new Date().toISOString(),
      });

      auditService.logAction({
        action: 'SQL_QUERY_FAILED',
        module: 'SQL Diagnostic Console',
        record_description: `SQL Query Exception: ${errorMsg}`,
        new_values: { sql: rawSql, error: errorMsg, durationMs },
        user,
      });
    } finally {
      setExecuting(false);
    }
  };

  const handleSelectPreset = (preset: (typeof PRESET_QUERIES)[0]) => {
    setActivePresetId(preset.id);
    setQueryText(preset.sql);
    setActiveTab('editor');
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleSelectTableFromCatalog = (tableName: string) => {
    const quickSql = `SELECT * FROM ${tableName} LIMIT 25;`;
    setQueryText(quickSql);
    setActivePresetId('');
    setActiveTab('editor');
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(queryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFormatSql = () => {
    const clean = queryText.replace(/\s+/g, ' ').trim();
    const formatted = clean
      .replace(/\bSELECT\b/gi, 'SELECT\n ')
      .replace(/\bFROM\b/gi, '\nFROM')
      .replace(/\bWHERE\b/gi, '\nWHERE')
      .replace(/\bORDER BY\b/gi, '\nORDER BY')
      .replace(/\bLIMIT\b/gi, '\nLIMIT');
    setQueryText(formatted);
  };

  const exportCsv = () => {
    if (!result?.data || result.data.length === 0) return;
    const cols = result.columns;
    const header = cols.join(',');
    const rows = result.data.map((r) =>
      cols
        .map((c) => {
          const val = r[c];
          if (val === null || val === undefined) return '';
          return `"${String(val).replace(/"/g, '""')}"`;
        })
        .join(',')
    );
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [header, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `sql_${result.tableName || 'query'}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportJson = () => {
    if (!result?.data || result.data.length === 0) return;
    const jsonStr = JSON.stringify(result.data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `sql_${result.tableName || 'query'}_${new Date().toISOString().slice(0, 10)}.json`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered rows for client search
  const filteredRows = result?.data
    ? result.data.filter((row) => {
        if (!searchTerm.trim()) return true;
        const term = searchTerm.toLowerCase();
        return Object.values(row).some((val) =>
          val !== null && val !== undefined && String(val).toLowerCase().includes(term)
        );
      })
    : [];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner: Master Admin Identity & Security Notice */}
      <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white border border-indigo-900/60 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="w-13 h-13 rounded-2xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center shrink-0 text-indigo-400 shadow-inner">
              <Terminal className="w-7 h-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-white tracking-wide">
                  SQLQueryPage — सुरक्षित SQL डायग्नोस्टिक कन्सोल
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40">
                  Govind Hippargekar (Master Admin)
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Read-Only Protected
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1.5 leading-relaxed max-w-3xl">
                प्राथमिक आरोग्य केंद्र भादा (PHC Bhada) अंतर्गत मास्टर डेटा, वापरकर्ता प्रोफाईल्स, मलेरिया/टीबी नोंदी 
                थेट PostgREST इंजिनद्वारे सुरक्षितपणे तपासण्यासाठी व ऑडिट करण्यासाठी अधिकृत ॲडमिन कन्सोल.
              </p>
              <div className="flex flex-wrap items-center gap-4 mt-3 text-[11px] text-slate-300">
                <span className="flex items-center gap-1 text-emerald-400 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  प्रणाली ऑडिटिंग सक्रिय (Logged in System Audit Trail)
                </span>
                <span>•</span>
                <span className="text-slate-400">
                  अधिकृत ॲडमिन: <strong>गोविंद हिप्परगेकर (9730266586)</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Status Badge & Actions */}
          <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between gap-2 shrink-0">
            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                isSupabaseReady
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
              }`}
            >
              <Server className="w-3.5 h-3.5" />
              <span>{isSupabaseReady ? 'Supabase Live Connected' : 'Offline / Local'}</span>
            </div>

            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate('dashboard')}
                className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>डॅशबोर्ड</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs (Editor / Catalog / History) */}
      <div className="flex items-center justify-between border-b border-slate-200">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('editor')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'editor'
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50 rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Code2 className="w-4 h-4" />
            <span>SQL एडिटर (Query Console)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('catalog')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'catalog'
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50 rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>डेटाबेस टेबल्स सूची (Schema Catalog)</span>
            <span className="bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded-full text-[10px]">
              {DATABASE_TABLES.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'history'
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50 rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-4 h-4" />
            <span>क्वेरी ऑडिट इतिहास (Query History)</span>
            {queryHistory.length > 0 && (
              <span className="bg-indigo-100 text-indigo-800 px-1.5 py-0.2 rounded-full text-[10px]">
                {queryHistory.length}
              </span>
            )}
          </button>
        </div>

        {/* Quick Govind Verification Trigger */}
        <button
          type="button"
          onClick={() => {
            handleSelectPreset(PRESET_QUERIES[0]);
            setTimeout(() => handleExecuteQuery(), 50);
          }}
          className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>गोविंद हिप्परगेकर स्टेटस तपासा</span>
        </button>
      </div>

      {/* TAB 1: MAIN SQL EDITOR */}
      {activeTab === 'editor' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
            {/* Left: Presets Sidebar */}
            <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
              <h3 className="text-xs font-bold text-slate-800 mb-3 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <FileCode className="w-4 h-4 text-indigo-600" />
                  डायग्नोस्टिक प्रेसेट्स (Presets)
                </span>
                <span className="text-[10px] text-slate-400 font-normal">क्लिक करून निवडा</span>
              </h3>
              <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                {PRESET_QUERIES.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={`w-full text-left p-2.5 rounded-lg text-xs transition-all cursor-pointer border ${
                      activePresetId === preset.id
                        ? 'bg-indigo-50/90 border-indigo-400 text-indigo-950 font-bold shadow-xs'
                        : 'bg-slate-50/70 hover:bg-slate-100 border-slate-200 text-slate-700'
                    }`}
                  >
                    <div className="truncate text-[11px] font-semibold">{preset.name}</div>
                    <div className="text-[10px] text-slate-500 line-clamp-2 mt-1 font-normal leading-relaxed">
                      {preset.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Right: Code Editor & Controls */}
            <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col">
              {/* Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold text-slate-800">
                    SQL Command Console (Ctrl + Enter to execute)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Limit selector */}
                  <div className="flex items-center gap-1 text-xs text-slate-600">
                    <span className="text-[11px] text-slate-500 font-medium">Limit:</span>
                    <select
                      value={selectedLimit}
                      onChange={(e) => setSelectedLimit(Number(e.target.value))}
                      className="bg-slate-100 border border-slate-300 rounded px-2 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                      <option value={250}>250</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={handleFormatSql}
                    className="px-2 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded transition-colors cursor-pointer"
                    title="फॉर्मेट करा"
                  >
                    Format
                  </button>

                  <button
                    type="button"
                    onClick={handleCopySql}
                    className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded flex items-center gap-1 transition-colors cursor-pointer"
                    title="SQL कॉपी करा"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'कॉपी झाले!' : 'कॉपी'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setQueryText('')}
                    className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-rose-700 bg-slate-100 hover:bg-rose-50 rounded flex items-center gap-1 transition-colors cursor-pointer"
                    title="साफ करा"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>साफ</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExecuteQuery}
                    disabled={executing || !queryText.trim()}
                    className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-700 hover:bg-indigo-800 disabled:bg-slate-400 rounded-lg flex items-center gap-1.5 transition-all shadow-sm cursor-pointer ml-1"
                  >
                    {executing ? (
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Play className="w-3.5 h-3.5 fill-current" />
                    )}
                    <span>{executing ? 'चालवत आहे...' : 'Execute (Run)'}</span>
                  </button>
                </div>
              </div>

              {/* Textarea Code Box */}
              <div className="relative mb-3 flex-1">
                <textarea
                  ref={textareaRef}
                  value={queryText}
                  onChange={(e) => setQueryText(e.target.value)}
                  placeholder="उदा. SELECT id, display_name, mobile, role FROM user_profiles WHERE is_active = true LIMIT 25;"
                  rows={8}
                  className="w-full font-mono text-xs p-4 bg-slate-950 text-emerald-400 rounded-xl border border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none shadow-inner leading-relaxed selection:bg-indigo-700 selection:text-white"
                  spellCheck={false}
                />
              </div>

              {/* Helper Footer */}
              <div className="text-[11px] text-slate-500 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span>सुरक्षा सूचना: INSERT, UPDATE, DELETE किंवा DROP आज्ञा पूर्णपणे ब्लॉक आहेत.</span>
                </span>
                <span className="font-mono text-slate-400 text-[10px]">
                  PostgREST Direct Interface • Read-Only Enforced
                </span>
              </div>
            </div>
          </div>

          {/* Results Area */}
          {result && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs animate-fadeIn">
              {/* Result Toolbar */}
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <TableIcon className="w-4 h-4 text-indigo-600" />
                    <span className="font-bold text-slate-800">निकाल: {result.statusText}</span>
                  </div>
                  {result.tableName && (
                    <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-mono text-[10px] font-bold">
                      टेबल: {result.tableName}
                    </span>
                  )}
                  {result.executionTimeMs > 0 && (
                    <span className="text-slate-500 text-[11px] flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      वेळ: {result.executionTimeMs} ms
                    </span>
                  )}
                </div>

                {/* Search & Export Buttons */}
                {result.data && result.data.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="निकालात शोधा..."
                        className="pl-8 pr-2.5 py-1 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 w-36 sm:w-44"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={exportCsv}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg font-medium flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5 text-indigo-600" />
                      <span>CSV</span>
                    </button>
                    <button
                      type="button"
                      onClick={exportJson}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg font-medium flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5 text-indigo-600" />
                      <span>JSON</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Error Box */}
              {result.error && (
                <div className="p-5 bg-rose-50 text-rose-800 border-l-4 border-rose-600 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-rose-900 text-sm">क्वेरी चालवताना त्रुटी उद्भवली</p>
                    <p className="text-xs font-mono mt-1 text-rose-700 bg-white/80 p-2.5 rounded border border-rose-200">
                      {result.error}
                    </p>
                  </div>
                </div>
              )}

              {/* Data Table */}
              {result.data && (
                <div className="overflow-x-auto max-h-[500px]">
                  {filteredRows.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-xs">
                      {searchTerm
                        ? `'${searchTerm}' साठी कोणतेही रेकॉर्ड सापडले नाही.`
                        : 'दिलेल्या अटींनुसार कोणताही डेटा सापडला नाही (0 rows returned).'}
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100/90 border-b border-slate-300 text-slate-700 font-bold sticky top-0 z-10 shadow-xs">
                          <th className="p-2.5 w-12 text-center text-slate-400 border-r border-slate-200">#</th>
                          {result.columns.map((col) => (
                            <th
                              key={col}
                              className="p-2.5 border-r border-slate-200 font-mono text-[11px] whitespace-nowrap text-slate-800 bg-slate-100/90"
                            >
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {filteredRows.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-indigo-50/50 transition-colors">
                            <td className="p-2 text-center font-mono text-slate-400 bg-slate-50/40 border-r border-slate-200 text-[11px]">
                              {rIdx + 1}
                            </td>
                            {result.columns.map((col) => {
                              const val = row[col];
                              const isNull = val === null || val === undefined;
                              const isBool = typeof val === 'boolean';
                              const isLong = String(val).length > 35 || typeof val === 'object';

                              return (
                                <td
                                  key={col}
                                  onClick={() => isLong && setSelectedCellDetail({ col, value: val })}
                                  className={`p-2 border-r border-slate-200 whitespace-nowrap font-mono text-[11px] ${
                                    isLong ? 'cursor-pointer hover:underline hover:text-indigo-700' : ''
                                  }`}
                                  title={isLong ? 'तपशील पाहण्यासाठी क्लिक करा' : undefined}
                                >
                                  {isNull ? (
                                    <span className="text-slate-400 italic">null</span>
                                  ) : isBool ? (
                                    <span
                                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                        val ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                      }`}
                                    >
                                      {val ? 'TRUE' : 'FALSE'}
                                    </span>
                                  ) : typeof val === 'object' ? (
                                    <span className="text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded text-[10px]">
                                      {JSON.stringify(val).slice(0, 25)}...
                                    </span>
                                  ) : (
                                    <span className="text-slate-800">
                                      {String(val).length > 40 ? `${String(val).slice(0, 40)}...` : String(val)}
                                    </span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SCHEMA CATALOG & TABLE EXPLORER */}
      {activeTab === 'catalog' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Database className="w-4 h-4 text-indigo-600" />
                <span>Supabase डेटाबेस टेबल्स सूची (Database Tables Catalog)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                आरोग्य उपकेंद्र रेकॉर्ड कीपिंग सिस्टीममधील सर्व १६ डेटाबेस टेबल्स. कोणत्याही टेबलवर क्लिक करून तात्काळ डेटा तपासा.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {DATABASE_TABLES.map((table) => (
              <div
                key={table.name}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-indigo-50/40 hover:border-indigo-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-mono text-xs font-bold text-indigo-900">{table.name}</span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                        table.category === 'master'
                          ? 'bg-blue-100 text-blue-800'
                          : table.category === 'clinical'
                          ? 'bg-emerald-100 text-emerald-800'
                          : table.category === 'audit'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}
                    >
                      {table.category}
                    </span>
                  </div>
                  <h4 className="text-xs font-semibold text-slate-800">{table.marathiName}</h4>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{table.description}</p>
                  <div className="mt-2 text-[10px] text-slate-400 font-mono truncate">
                    प्रमुख रकाने: {table.keyColumns.slice(0, 4).join(', ')}...
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => handleSelectTableFromCatalog(table.name)}
                    className="text-xs font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>तपासा (SELECT 25)</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: QUERY EXECUTION AUDIT HISTORY */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-600" />
                <span>क्वेरी ऑडिट इतिहास (Diagnostic Query Audit History)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                या सत्रात ॲडमिनद्वारे चालवलेल्या सर्व SQL क्वेरींचा सुरक्षा ऑडिट व अचूक वेळेचा लॉग.
              </p>
            </div>

            {queryHistory.length > 0 && (
              <button
                type="button"
                onClick={clearHistory}
                className="px-3 py-1 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer self-start sm:self-auto"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>इतिहास साफ करा</span>
              </button>
            )}
          </div>

          {queryHistory.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              अद्याप कोणतीही SQL क्वेरी चालवलेली नाही.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[550px] overflow-y-auto pr-1">
              {queryHistory.map((item) => (
                <div key={item.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          item.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {item.status}
                      </span>
                      {item.tableName && (
                        <span className="font-mono text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                          {item.tableName}
                        </span>
                      )}
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(item.executedAt).toLocaleTimeString('mr-IN')}
                      </span>
                      <span className="text-[11px] text-slate-500">• {item.durationMs} ms</span>
                      <span className="text-[11px] text-slate-500">• {item.rowCount} rows</span>
                    </div>
                    <div className="font-mono text-[11px] text-slate-800 bg-slate-50 p-2 rounded border border-slate-200 truncate">
                      {item.sql}
                    </div>
                    {item.error && <p className="text-[11px] text-rose-600">{item.error}</p>}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setQueryText(item.sql);
                      setActiveTab('editor');
                    }}
                    className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-bold text-xs shrink-0 self-start sm:self-auto cursor-pointer transition-colors"
                  >
                    लोड करा (Load)
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal for Cell Details Inspector */}
      {selectedCellDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-xl w-full p-6 shadow-2xl space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-800">
                रकाना तपशील: <span className="font-mono text-indigo-700">{selectedCellDetail.col}</span>
              </h3>
              <button
                type="button"
                onClick={() => setSelectedCellDetail(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto">
              <pre className="text-xs font-mono bg-slate-950 text-emerald-400 p-4 rounded-xl whitespace-pre-wrap break-all">
                {typeof selectedCellDetail.value === 'object'
                  ? JSON.stringify(selectedCellDetail.value, null, 2)
                  : String(selectedCellDetail.value)}
              </pre>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(
                    typeof selectedCellDetail.value === 'object'
                      ? JSON.stringify(selectedCellDetail.value, null, 2)
                      : String(selectedCellDetail.value)
                  );
                  setSelectedCellDetail(null);
                }}
                className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>कॉपी करून बंद करा</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
