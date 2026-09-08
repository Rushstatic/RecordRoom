import fs from 'fs';

let content = fs.readFileSync('src/pages/BackupAuditPage.tsx', 'utf8');

const replacement = `  DYNAMIC_RECORD_CREATE: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  DYNAMIC_RECORD_UPDATE: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  DYNAMIC_RECORD_DELETE: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  DYNAMIC_RECORD_EXPORT: { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
  DYNAMIC_RECORD_PRINT: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
};`;

content = content.replace(/  DYNAMIC_RECORD_CREATE: \{ bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' \},\n  DYNAMIC_RECORD_UPDATE: \{ bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' \},\n  DYNAMIC_RECORD_DELETE: \{ bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' \},\n\};\n/, replacement + '\n');

fs.writeFileSync('src/pages/BackupAuditPage.tsx', content, 'utf8');
