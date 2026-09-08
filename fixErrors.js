import fs from 'fs';

// 1. DashboardPage.tsx - fix duplicate Activity
let dash = fs.readFileSync('src/pages/DashboardPage.tsx', 'utf8');
dash = dash.replace("import { Activity, Stethoscope } from 'lucide-react';", "import { Stethoscope } from 'lucide-react';"); // Assuming Activity was already imported
fs.writeFileSync('src/pages/DashboardPage.tsx', dash, 'utf8');

// 2. TBRegisterPage.tsx - imports, is_active, name_marathi
let tbReg = fs.readFileSync('src/pages/TBRegisterPage.tsx', 'utf8');
tbReg = tbReg.replace(", Lungs } from 'lucide-react';", ", Activity } from 'lucide-react';");
tbReg = tbReg.replace(/\.isActive/g, ".is_active");
tbReg = tbReg.replace(/\.nameMarathi/g, ".name_marathi");
tbReg = tbReg.replace(/\.subcentreId/g, ".subcentre_id");
tbReg = tbReg.replace(/\.phcId/g, ".phc_id");
tbReg = tbReg.replace(/\.designation/g, ".designation"); // Check if designation exists
fs.writeFileSync('src/pages/TBRegisterPage.tsx', tbReg, 'utf8');

// 3. tbService.ts - name_marathi etc
let tbServ = fs.readFileSync('src/services/tbService.ts', 'utf8');
tbServ = tbServ.replace("village?.nameMarathi", "village?.name_marathi");
tbServ = tbServ.replace("village?.subcentreName", "village?.subcentre_name");
tbServ = tbServ.replace("village?.phcName", "village?.phc_name");
tbServ = tbServ.replace("employee?.nameMarathi", "employee?.name_marathi");
fs.writeFileSync('src/services/tbService.ts', tbServ, 'utf8');

// 4. types/index.ts - fix duplicates and Audit
let types = fs.readFileSync('src/types/index.ts', 'utf8');
const tbTypesDef = `export type TBSampleType = 'Sputum' | 'X-Ray' | 'LPA' | 'Followup Sputum' | 'FoodBasket';
export type TBSampleGivenAt = 'PHC_BHADA' | 'RURAL_HOSPITAL_AUSA' | null;`;
// Removing the first occurrence if duplicate
if (types.split(tbTypesDef).length > 2) {
    types = types.replace(tbTypesDef, ""); // remove first occurrence
}

types = types.replace(
    "| 'SYNC' | 'LOGIN_FAILED' | 'PASSWORD_RESET' | 'PASSWORD_RESET_REQUEST';\n\nexport type AuditModule =",
    "| 'SYNC' | 'LOGIN_FAILED' | 'PASSWORD_RESET' | 'PASSWORD_RESET_REQUEST' | 'TB_CREATE' | 'TB_UPDATE' | 'TB_DELETE' | 'TB_PRINT' | 'TB_EXPORT';\n\nexport type AuditModule ="
);
types = types.replace(
    "| 'System';\n\nexport interface AuditLog {",
    "| 'System' | 'NTEP Data Entry';\n\nexport interface AuditLog {"
);
fs.writeFileSync('src/types/index.ts', types, 'utf8');

