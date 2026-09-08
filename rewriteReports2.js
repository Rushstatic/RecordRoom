import fs from 'fs';

function processMalariaReportsPage() {
  let content = fs.readFileSync('src/pages/MalariaReportsPage.tsx', 'utf8');

  content = content.replace(/setFilterSubcentreId\(''\);\n/g, '');
  content = content.replace(/setFilterPhcId\(''\);\n/g, '');
  content = content.replace(/if \(phcList\.length > 0 && !filterPhcId\) {\n\s*setFilterPhcId\(phcList\[0\]\.id\);\n\s*}/g, '');
  
  content = content.replace(/if \(filterPhcId && s\.phc_id !== filterPhcId\) return false;\n/g, '');
  content = content.replace(/if \(filterSubcentreId && s\.subcentre_id !== filterSubcentreId\) return false;\n/g, '');

  content = content.replace(/const activePhc = phcs.find\(\(p\) => p\.id === filterPhcId\);\n/g, '');
  content = content.replace(/const activeSub = subcentres.find\(\(s\) => s\.id === filterSubcentreId\);\n/g, '');
  
  content = content.replace(/availableSubcentres,/g, '');
  content = content.replace(/filterPhcId,/g, '');
  content = content.replace(/filterSubcentreId,/g, '');

  fs.writeFileSync('src/pages/MalariaReportsPage.tsx', content, 'utf8');
}

processMalariaReportsPage();
