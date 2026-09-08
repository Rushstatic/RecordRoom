import fs from 'fs';

function processMalariaReportsPage() {
  let content = fs.readFileSync('src/pages/MalariaReportsPage.tsx', 'utf8');

  // LoadData effects that reset filters
  content = content.replace(/setFilterSubcentreId\(''\);\n/g, '');
  content = content.replace(/setFilterPhcId\(''\);\n/g, '');
  
  // availableSubcentres in dependency arrays or lists
  content = content.replace(/availableSubcentres/g, '[]');
  
  // filterSubcentreId in dependency arrays or logs
  content = content.replace(/filterSubcentreId/g, '""');

  // print header variables
  content = content.replace(/activePhc\?\.phc_name/g, '""');
  content = content.replace(/activeSub\?\.subcentre_name/g, '""');

  fs.writeFileSync('src/pages/MalariaReportsPage.tsx', content, 'utf8');
}

processMalariaReportsPage();
