import fs from 'fs';

function processMalariaCoveragePage() {
  let content = fs.readFileSync('src/pages/MalariaCoveragePage.tsx', 'utf8');

  // Remove the functions completely or fix them
  content = content.replace(/\(\(\) => \{\}\)\('.*?'\);/g, '');
  content = content.replace(/if \("" &&.*?\)/g, '');
  
  content = content.replace(/availableVillages/g, 'villages');
  content = content.replace(/availableEmployees/g, 'employees');
  
  // also get rid of expressions always falsy
  content = content.replace(/if \(""\)/g, 'if (false)');

  fs.writeFileSync('src/pages/MalariaCoveragePage.tsx', content, 'utf8');
}

processMalariaCoveragePage();
