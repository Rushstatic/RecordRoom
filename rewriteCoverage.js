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

function processMalariaCoveragePage() {
  let content = fs.readFileSync('src/pages/MalariaCoveragePage.tsx', 'utf8');

  // States
  content = content.replace(/const \[selectedPhcId, setSelectedPhcId\] = useState<string>\(''\);\n/, '');
  content = content.replace(/const \[selectedSubcentreId, setSelectedSubcentreId\] = useState<string>\(''\);\n/, '');

  // useMemos
  content = replaceBlock(
    content,
    /const availableSubcentres = useMemo\(\(\) => \{/,
    /\}, \[subcentres, selectedPhcId\]\);/,
    `const availableEmployees = useMemo(() => {
    return employees;
  }, [employees]);`
  );
  
  content = replaceBlock(
    content,
    /const availableVillages = useMemo\(\(\) => \{/,
    /\}, \[villages, subcentres, selectedPhcId, selectedSubcentreId\]\);/,
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

  // Stats calculation
  content = replaceBlock(
    content,
    /const filteredSamples = useMemo\(\(\) => \{/,
    /\}, \[samples, selectedPhcId, selectedSubcentreId, selectedVillageId, selectedEmployeeId\]\);/,
    `const filteredSamples = useMemo(() => {
    return samples.filter((samp) => {
      let targetEmployeeId = selectedEmployeeId;
      if (isSubcentreStaff) {
        if (user?.employeeId && samp.employee_id !== user.employeeId) return false;
        targetEmployeeId = user?.employeeId || selectedEmployeeId;
      }
      if (targetEmployeeId && samp.employee_id !== targetEmployeeId) return false;
      if (selectedVillageId && samp.village_id !== selectedVillageId) return false;
      return true;
    });
  }, [samples, selectedVillageId, selectedEmployeeId, isSubcentreStaff, user]);`
  );

  // Remove dependencies
  content = content.replace(/selectedPhcId,/g, '');
  content = content.replace(/selectedSubcentreId,/g, '');

  // UI
  content = replaceBlock(
    content,
    /{\/\* Filters \*\//,
    /<\/select>\s*<\/div>\s*<\/div>/,
    `{/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {!isSubcentreStaff && (
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">कर्मचारी</label>
              <select
                value={selectedEmployeeId}
                onChange={(e) => {
                  setSelectedEmployeeId(e.target.value);
                  setSelectedVillageId('');
                }}
                className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600"
              >
                <option value="">सर्व कर्मचारी</option>
                {availableEmployees.map((e) => (
                  <option key={e.id} value={e.id}>{e.employee_name}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">गाव</label>
            <select
              value={selectedVillageId}
              onChange={(e) => setSelectedVillageId(e.target.value)}
              className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600"
            >
              <option value="">सर्व गावे</option>
              {availableVillages.map((v) => (
                <option key={v.id} value={v.id}>{v.village_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">वर्ष</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600"
            >
              {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>`
  );
  
  // Also fix filteredVillages
  content = replaceBlock(
    content,
    /const filteredVillages = useMemo\(\(\) => \{/,
    /\}, \[villages, subcentres, selectedVillageId, selectedSubcentreId, selectedPhcId, isSubcentreStaff\]\);/,
    `const filteredVillages = useMemo(() => {
    return availableVillages;
  }, [availableVillages]);`
  );
  
  content = replaceBlock(
    content,
    /const filteredSubcentres = useMemo\(\(\) => \{/,
    /\}, \[subcentres, selectedSubcentreId, selectedPhcId, isSubcentreStaff\]\);/,
    ``
  );
  
  content = replaceBlock(
    content,
    /const filteredEmployees = useMemo\(\(\) => \{/,
    /\}, \[employees, subcentres, selectedEmployeeId, selectedSubcentreId, selectedPhcId\]\);/,
    `const filteredEmployees = useMemo(() => {
    if (selectedEmployeeId) {
      return employees.filter(e => e.id === selectedEmployeeId);
    }
    if (isSubcentreStaff && user?.employeeId) {
      return employees.filter(e => e.id === user.employeeId);
    }
    return employees;
  }, [employees, selectedEmployeeId, isSubcentreStaff, user]);`
  );
  
  // subtitle
  content = content.replace(
    /phcs\.find\(\(p\) => p\.id === selectedPhcId\)\?\.phc_name \|\|/,
    ''
  );
  content = content.replace(
    /subcentres\.find\(\(s\) => s\.id === selectedSubcentreId\)\?\.subcentre_name \|\|/,
    ''
  );

  // The subtitle is wrapped in a paragraph
  content = replaceBlock(
    content,
    /<p className="text-xs text-slate-500 mt-1">[\s\S]*?<\/p>/,
    /<\/p>/,
    `<p className="text-xs text-slate-500 mt-1">
      {selectedEmployeeId ? employees.find(e => e.id === selectedEmployeeId)?.employee_name : 'सर्व कर्मचारी'} 
      {' | '}
      {selectedVillageId ? villages.find(v => v.id === selectedVillageId)?.village_name : 'सर्व गावे'}
    </p>`
  );

  fs.writeFileSync('src/pages/MalariaCoveragePage.tsx', content, 'utf8');
}

processMalariaCoveragePage();
