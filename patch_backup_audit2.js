import fs from 'fs';

let content = fs.readFileSync('src/pages/BackupAuditPage.tsx', 'utf8');

const replacement = `const ACTION_BADGES: Record<AuditAction, { bg: string; text: string; border: string }> = {
  LOGIN: { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200' },
  LOGOUT: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' },
  LOGIN_FAILED: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  PASSWORD_RESET_REQUEST: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  PASSWORD_RESET: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  USER_CREATED: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  USER_ACTIVATED: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
  USER_DEACTIVATED: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  ROLE_ASSIGNMENT_CHANGED: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  CREATE: { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200' },
  UPDATE: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
  DELETE: { bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-200' },
  ACTIVATE: { bg: 'bg-green-50', text: 'text-green-800', border: 'border-green-200' },
  DEACTIVATE: { bg: 'bg-zinc-100', text: 'text-zinc-700', border: 'border-zinc-300' },
  SEND_SAMPLES: { bg: 'bg-teal-50', text: 'text-teal-800', border: 'border-teal-200' },
  PRINT: { bg: 'bg-indigo-50', text: 'text-indigo-800', border: 'border-indigo-200' },
  EXPORT: { bg: 'bg-cyan-50', text: 'text-cyan-800', border: 'border-cyan-200' },
  BACKUP: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  RESTORE: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  QUICK_ACTION: { bg: 'bg-fuchsia-50', text: 'text-fuchsia-700', border: 'border-fuchsia-200' },
  DYNAMIC_RECORD_CREATE: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  DYNAMIC_RECORD_UPDATE: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  DYNAMIC_RECORD_DELETE: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
};`;

content = content.replace(/const ACTION_BADGES: Record<AuditAction, \{ bg: string; text: string; border: string \}> = \{[\s\S]*?\};\n/, replacement + '\n');

fs.writeFileSync('src/pages/BackupAuditPage.tsx', content, 'utf8');
