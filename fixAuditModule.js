import fs from 'fs';

let types = fs.readFileSync('src/types/index.ts', 'utf8');
types = types.replace(
  "| 'System' | 'TB Register' | 'TB Reports' | 'TB Register' | 'TB Reports';",
  "| 'System' | 'TB Register' | 'TB Reports';"
);
// just hardcode replace it
const target = "export type AuditModule =\n  | 'PHC Master'\n  | 'Subcentre Master'\n  | 'Village Master'\n  | 'Employee Master'\n  | 'Malaria Sample Register'\n  | 'Send Samples'\n  | 'Malaria Reports'\n  | 'Coverage'\n  | 'Target Management'\n  | 'Data Quality'\n  | 'System';";

const target2 = `export type AuditModule =
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
  | 'System' | 'TB Register' | 'TB Reports'`;

types = types.replace(
    /export type AuditModule =[\s\S]*?\| 'System'[^;]*;/g,
    `export type AuditModule =
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
  | 'TB Register'
  | 'TB Reports'
  | 'System';`
);

fs.writeFileSync('src/types/index.ts', types, 'utf8');

