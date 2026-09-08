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

function processMalariaReportsPage() {
  let content = fs.readFileSync('src/pages/MalariaReportsPage.tsx', 'utf8');

  // Remove states
  content = content.replace(/const \[filterPhcId, setFilterPhcId\] = useState<string>\(''\);\n/, '');
  content = content.replace(/const \[filterSubcentreId, setFilterSubcentreId\] = useState<string>\(''\);\n/, '');

  // Remove handlers
  content = replaceBlock(
    content,
    /const handlePhcChange = \(/,
    /setFilterSubcentreId\(''\);\n  };\n\n/,
    ''
  );

  // Update useMemos
  content = replaceBlock(
    content,
    /const availableSubcentres = useMemo\(\(\) => \{/,
    /\}, \[employees, filterSubcentreId, filterPhcId, availableSubcentres, role, filterEmployeeId\]\);/,
    `const availableEmployees = useMemo(() => {
    return employees;
  }, [employees]);

  const availableVillages = useMemo(() => {
    let targetEmployeeId = filterEmployeeId;
    if (role === 'subcentre_employee' && user?.employeeId) {
      targetEmployeeId = user.employeeId;
    }
    
    if (!targetEmployeeId) {
      return villages;
    }
    
    const employee = employees.find(e => e.id === targetEmployeeId);
    const employeeSubcentreId = employee?.subcentre_id;
    
    const primaryVillages = villages.filter(v => v.subcentre_id === employeeSubcentreId);
    const historicalVillageIds = new Set(allSamples.filter(s => s.employee_id === targetEmployeeId).map(s => s.village_id));
    
    const result = [...primaryVillages];
    const primaryIds = new Set(primaryVillages.map(v => v.id));
    
    for (const vid of historicalVillageIds) {
      if (vid && !primaryIds.has(vid)) {
        const v = villages.find(v => v.id === vid);
        if (v) result.push(v);
      }
    }
    return result;
  }, [filterEmployeeId, villages, employees, allSamples, role, user]);`
  );

  // Filter Logic
  content = replaceBlock(
    content,
    /const filteredSamples = useMemo\(\(\) => \{/,
    /\}, \[allSamples, filterPhcId, filterSubcentreId, filterVillageId, filterEmployeeId\]\);/,
    `const filteredSamples = useMemo(() => {
    return allSamples.filter((s) => {
      // 1. Employee Scope Security
      let targetEmployeeId = filterEmployeeId;
      if (role === 'subcentre_employee') {
        if (user?.employeeId && s.employee_id !== user.employeeId) return false;
        targetEmployeeId = user?.employeeId || filterEmployeeId;
      }
      
      // 2. Filters
      if (targetEmployeeId && s.employee_id !== targetEmployeeId) return false;
      if (filterVillageId && s.village_id !== filterVillageId) return false;

      return true;
    });
  }, [allSamples, filterVillageId, filterEmployeeId, role, user]);`
  );

  // UI Filters
  content = replaceBlock(
    content,
    /{?\/\* PHC Filter \*\/}?/,
    /<\/select>\s*<\/div>/,
    '' // Remove PHC Filter completely
  );
  
  // Notice that we have two blocks of filter divs, we will run it again to remove Subcentre Filter
  content = replaceBlock(
    content,
    /{?\/\* Subcentre Filter \*\/}?/,
    /<\/select>\s*<\/div>/,
    '' // Remove Subcentre Filter completely
  );

  // Make Employee filter conditional
  content = replaceBlock(
    content,
    /{?\/\* Employee Filter \*\/}?[\s\S]*?<div>[\s\S]*?<label[\s\S]*?कर्मचारी \(Employee\)[\s\S]*?<\/label>[\s\S]*?<select[\s\S]*?<\/select>[\s\S]*?<\/div>/,
    /<\/select>\s*<\/div>/,
    `{role === 'phc_controller' && (
      <div>
        <label className="block text-[11px] font-bold text-slate-700 mb-1">
          कर्मचारी (Employee)
        </label>
        <select
          id="report-filter-employee"
          value={filterEmployeeId}
          onChange={(e) => {
            setFilterEmployeeId(e.target.value);
            setFilterVillageId('');
          }}
          className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600"
        >
          <option value="">सर्व कर्मचारी</option>
          {availableEmployees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.employee_name} {e.designation ? \`(\${e.designation})\` : ''}
            </option>
          ))}
        </select>
      </div>
    )}`
  );

  // Fix print output logic (remove activePhc, activeSub, and undefined references)
  content = replaceBlock(
    content,
    /const activePhc = phcs.find\(\(p\) => p.id === filterPhcId\);/,
    /const activeSub = subcentres.find\(\(s\) => s.id === filterSubcentreId\);\n/,
    ''
  );
  content = content.replace(/activePhc\?\.phc_name \|\| 'सर्व'/g, "'सर्व'");
  content = content.replace(/activeSub\?\.subcentre_name \|\| 'सर्व'/g, "'सर्व'");
  
  // CSV output logic
  content = content.replace(/filterPhcId,/g, '');
  content = content.replace(/filterSubcentreId,/g, '');

  fs.writeFileSync('src/pages/MalariaReportsPage.tsx', content, 'utf8');
}

processMalariaReportsPage();
