import fs from 'fs';

function processMalariaCoveragePage() {
  let content = fs.readFileSync('src/pages/MalariaCoveragePage.tsx', 'utf8');

  // Remove variables that cause errors
  content = content.replace(/setSelectedPhcId\(''\);\n/g, '');
  content = content.replace(/setSelectedSubcentreId\(''\);\n/g, '');
  content = content.replace(/if \(selectedSubcentreId\) \{/g, 'if (false) {');
  content = content.replace(/if \(selectedPhcId\) \{/g, 'if (false) {');
  content = content.replace(/else if \(selectedSubcentreId\) \{/g, 'else if (false) {');
  content = content.replace(/else if \(selectedPhcId\) \{/g, 'else if (false) {');
  content = content.replace(/if \(samp\.subcentre_id && samp\.subcentre_id !== selectedSubcentreId\) return false;/g, '');
  content = content.replace(/if \(selectedPhcId && samp\.phc_id && samp\.phc_id !== selectedPhcId\) return false;/g, '');
  content = content.replace(/if \(selectedSubcentreId && samp\.subcentre_id && samp\.subcentre_id !== selectedSubcentreId\) return false;/g, '');
  content = content.replace(/selectedSubcentreId,/g, '');
  content = content.replace(/selectedPhcId,/g, '');
  content = content.replace(/availableSubcentres,/g, '');
  
  // Clean up any remaining conditional checks that are now syntax errors or dead code
  // The error list specifically mentioned:
  // error TS2304: Cannot find name 'selectedPhcId'
  content = content.replace(/selectedPhcId/g, '""');
  content = content.replace(/selectedSubcentreId/g, '""');
  content = content.replace(/availableSubcentres/g, '[]');
  content = content.replace(/setSelectedPhcId/g, '(() => {})');
  content = content.replace(/setSelectedSubcentreId/g, '(() => {})');

  fs.writeFileSync('src/pages/MalariaCoveragePage.tsx', content, 'utf8');
}

processMalariaCoveragePage();
