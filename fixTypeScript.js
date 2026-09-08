import fs from 'fs';

let tbReg = fs.readFileSync('src/pages/TBRegisterPage.tsx', 'utf8');

tbReg = tbReg.replace(/p\.name_marathi/g, "p.phc_name");
tbReg = tbReg.replace(/s\.name_marathi/g, "s.subcentre_name");
tbReg = tbReg.replace(/v\.name_marathi/g, "v.village_name");
tbReg = tbReg.replace(/e\.name_marathi/g, "e.employee_name");

tbReg = tbReg.replace(/x => x\.is_active/g, "x => true");
tbReg = tbReg.replace(/e => e\.is_active/g, "e => e.is_active !== false");
tbReg = tbReg.replace(/x => x\.is_active/g, "x => true");

tbReg = tbReg.replace(/action: 'TB_CREATE'/g, "action: 'CREATE'");
tbReg = tbReg.replace(/module: 'NTEP Data Entry'/g, "module: 'TB Register'");

fs.writeFileSync('src/pages/TBRegisterPage.tsx', tbReg, 'utf8');

let offDraft = fs.readFileSync('src/services/offlineDraftService.ts', 'utf8');
offDraft = offDraft.replace(/action: 'TB_CREATE'/g, "action: 'CREATE'");
offDraft = offDraft.replace(/module: 'NTEP Data Entry'/g, "module: 'TB Register'");
fs.writeFileSync('src/services/offlineDraftService.ts', offDraft, 'utf8');

let tbServ = fs.readFileSync('src/services/tbService.ts', 'utf8');
tbServ = tbServ.replace(/village\?\.name_marathi/g, "village?.village_name");
tbServ = tbServ.replace(/employee\?\.name_marathi/g, "employee?.employee_name");
fs.writeFileSync('src/services/tbService.ts', tbServ, 'utf8');

let types = fs.readFileSync('src/types/index.ts', 'utf8');
types = types.replace(/\| 'System'/g, "| 'System' | 'TB Register' | 'TB Reports'");
fs.writeFileSync('src/types/index.ts', types, 'utf8');

