import fs from 'fs';

function replaceBlock(content, startRegex, endRegex, replacement) {
  const matchStart = content.match(startRegex);
  if (!matchStart) return content;
  
  const startIndex = matchStart.index;
  const matchEnd = content.substring(startIndex).match(endRegex);
  if (!matchEnd) return content;
  
  const endIndex = startIndex + matchEnd.index + matchEnd[0].length;
  
  return content.substring(0, startIndex) + replacement + content.substring(endIndex);
}

function processDataValidationPage() {
  let content = fs.readFileSync('src/pages/DataValidationPage.tsx', 'utf8');

  // States
  content = content.replace(/const \[selectedPhcId, setSelectedPhcId\] = useState<string>\(''\);\n/, '');
  content = content.replace(/const \[selectedSubcentreId, setSelectedSubcentreId\] = useState<string>\(''\);\n/, '');

  // useMemos
  content = replaceBlock(
    content,
    /const availableSubcentres = useMemo\(\(\) => \{/,
    /\}, \[subcentres, selectedPhcId, isSubcentreStaff\]\);/,
    `const availableEmployees = useMemo(() => {
    return employees;
  }, [employees]);`
  );
  
  content = replaceBlock(
    content,
    /const availableVillages = useMemo\(\(\) => \{/,
    /\}, \[villages, subcentres, selectedPhcId, selectedSubcentreId, isSubcentreStaff\]\);/,
    `const availableVillages = useMemo(() => {
    let targetEmployeeId = selectedEmployeeId;
    if (isSubcentreStaff && user?.employeeId) {
      targetEmployeeId = user.employeeId;
    }
    
    if (!targetEmployeeId) {
      return villages;
    }
    
    const employee = employees.find(e => e.id === targetEmployeeId);
    const employeeSubcentreId = employee?.subcentre_id;
    
    const primaryVillages = villages.filter(v => v.subcentre_id === employeeSubcentreId);
    const historicalVillageIds = new Set(samples.filter(s => s.employee_id === targetEmployeeId).map(s => s.village_id));
    
    const result = [...primaryVillages];
    const primaryIds = new Set(primaryVillages.map(v => v.id));
    
    for (const vid of historicalVillageIds) {
      if (vid && !primaryIds.has(vid)) {
        const v = villages.find(v => v.id === vid);
        if (v) result.push(v);
      }
    }
    return result;
  }, [selectedEmployeeId, villages, employees, samples, isSubcentreStaff, user]);`
  );

  content = replaceBlock(
    content,
    /const availableEmployees = useMemo\(\(\) => \{/,
    /\}, \[employees, subcentres, selectedPhcId, selectedSubcentreId\]\);/,
    ``
  );

  // Remove handlers
  content = content.replace(/const handlePhcChange = \([\s\S]*?};\n\n  const handleSubcentreChange = \([\s\S]*?};\n\n/g, '');
  
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
  content = content.replace(/selectedPhcId/g, '""');
  content = content.replace(/selectedSubcentreId/g, '""');
  content = content.replace(/availableSubcentres/g, '[]');
  content = content.replace(/setSelectedPhcId/g, '((_: any) => {})');
  content = content.replace(/setSelectedSubcentreId/g, '((_: any) => {})');
  content = content.replace(/if \("" &&.*?\)/g, '');
  content = content.replace(/if \(""\)/g, 'if (false)');
  content = content.replace(/else if \(""\)/g, 'else if (false)');

  // Filter Logic in filteredVillages
  const filteredVillagesRegex = /const filteredVillages = useMemo\(\(\) => \{[\s\S]*?\}, \[villages, subcentres, selectedVillageId, selectedSubcentreId, selectedPhcId, isSubcentreStaff, searchQuery\]\);/;
  const newFilteredVillages = `const filteredVillages = useMemo(() => {
    return availableVillages.filter((v) => {
      if (selectedVillageId && v.id !== selectedVillageId) return false;
      if (searchQuery && !v.village_name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [availableVillages, selectedVillageId, searchQuery]);`;
  content = content.replace(filteredVillagesRegex, newFilteredVillages);

  // UI - Remove PHC and Subcentre dropdowns
  const uiRegex = /<div className="flex flex-col gap-1">[\s\S]*?<label className="text-xs font-bold text-slate-700">PHC<\/label>[\s\S]*?<select[\s\S]*?<\/select>[\s\S]*?<\/div>\s*<div className="flex flex-col gap-1">[\s\S]*?<label className="text-xs font-bold text-slate-700">Subcentre<\/label>[\s\S]*?<select[\s\S]*?<\/select>[\s\S]*?<\/div>/;
  if (content.match(uiRegex)) {
    content = content.replace(uiRegex, '');
  }

  // Rewrite entire top filters block for certainty
  content = replaceBlock(
    content,
    /{?\/\* Context Filters \*\//,
    /<\/select>\s*<\/div>\s*<\/div>\s*<\/div>/,
    `{/* Context Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {!isSubcentreStaff && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-700">कर्मचारी</label>
                  <select
                    value={selectedEmployeeId}
                    onChange={(e) => {
                      setSelectedEmployeeId(e.target.value);
                      setSelectedVillageId('');
                    }}
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600"
                  >
                    <option value="">सर्व कर्मचारी</option>
                    {availableEmployees.map((e) => (
                      <option key={e.id} value={e.id}>{e.employee_name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-slate-700">गाव</label>
                <select
                  value={selectedVillageId}
                  onChange={(e) => setSelectedVillageId(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600"
                >
                  <option value="">सर्व गावे</option>
                  {availableVillages.map((v) => (
                    <option key={v.id} value={v.id}>{v.village_name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>`
  );
  
  // also filtered validation issues need correct employee filtering logic
  content = replaceBlock(
    content,
    /const filteredIssues = useMemo\(\(\) => \{[\s\S]*?return issues\.filter\(\(issue\) => \{/,
    /return issues\.filter\(\(issue\) => \{/,
    `const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      // Apply correct employee scoping
      let targetEmployeeId = selectedEmployeeId;
      if (isSubcentreStaff) {
        if (user?.employeeId && issue.entityId && issue.module === 'Malaria Sample Register') {
           // We'll trust the underlying issues list is already filtered if it's from allSamples
           // But actually we just apply the filter:
        }
        targetEmployeeId = user?.employeeId || selectedEmployeeId;
      }
      
      if (targetEmployeeId) {
         if (issue.module === 'Malaria Sample Register') {
            const samp = samples.find(s => s.id === issue.entityId);
            if (samp && samp.employee_id !== targetEmployeeId) return false;
         }
      }
      
      if (selectedVillageId) {
         if (issue.module === 'Malaria Sample Register') {
            const samp = samples.find(s => s.id === issue.entityId);
            if (samp && samp.village_id !== selectedVillageId) return false;
         }
      }
      `
  );
  
  content = content.replace(/if \(!""\) return subcentres;/g, 'if (true) return subcentres;');

  fs.writeFileSync('src/pages/DataValidationPage.tsx', content, 'utf8');
}

processDataValidationPage();
