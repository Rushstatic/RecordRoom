import fs from 'fs';

let tbReg = fs.readFileSync('src/pages/TBRegisterPage.tsx', 'utf8');

tbReg = tbReg.replace(
  "const [phcs, setPhcs] = useState<{id: string, nameMarathi: string}[]>([]);", 
  "const [phcs, setPhcs] = useState<any[]>([]);"
);
tbReg = tbReg.replace(
  "const [subcentres, setSubcentres] = useState<{id: string, nameMarathi: string, phcId: string}[]>([]);",
  "const [subcentres, setSubcentres] = useState<any[]>([]);"
);
tbReg = tbReg.replace(/e\.phcId/g, "e.phc_id");
tbReg = tbReg.replace(/s\.phcId/g, "s.phc_id");
tbReg = tbReg.replace(/v\.subcentreId/g, "v.subcentre_id");

fs.writeFileSync('src/pages/TBRegisterPage.tsx', tbReg, 'utf8');

let tbRep = fs.readFileSync('src/pages/TBReportsPage.tsx', 'utf8');
tbRep = tbRep.replace(/v\.subcentreId/g, "v.subcentre_id");
fs.writeFileSync('src/pages/TBReportsPage.tsx', tbRep, 'utf8');

