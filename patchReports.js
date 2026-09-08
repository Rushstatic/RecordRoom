import fs from 'fs';

function patchFile(filepath) {
  let content = fs.readFileSync(filepath, 'utf8');
  
  // Remove states
  content = content.replace(/const \[filterPhcId, setFilterPhcId\] = useState<string>\(''\);\n/, '');
  content = content.replace(/const \[filterSubcentreId, setFilterSubcentreId\] = useState<string>\(''\);\n/, '');
  
  // Remove change handlers for PHC / Subcentre
  content = content.replace(/const handlePhcChange = \([\s\S]*?};\n\n  const handleSubcentreChange = \([\s\S]*?};\n\n/g, '');
  
  // Change useMemos
  const useMemoRegex = /const availableSubcentres = useMemo\(\(\) => \{[\s\S]*?\}, \[employees, filterSubcentreId, filterPhcId, availableSubcentres, role, filterEmployeeId\]\);/m;
  
  const newUseMemos = `const availableEmployees = useMemo(() => {
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
  }, [filterEmployeeId, villages, employees, allSamples, role, user]);`;
  
  if (content.match(useMemoRegex)) {
    content = content.replace(useMemoRegex, newUseMemos);
  } else {
    console.log("Could not find useMemo block in " + filepath);
  }
  
  // Filter logic
  const filterLogicRegex = /const filteredSamples = useMemo\(\(\) => \{[\s\S]*?\}, \[allSamples, filterPhcId, filterSubcentreId, filterVillageId, filterEmployeeId\]\);/;
  const newFilterLogic = `const filteredSamples = useMemo(() => {
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
  }, [allSamples, filterVillageId, filterEmployeeId, role, user]);`;
  
  if (content.match(filterLogicRegex)) {
    content = content.replace(filterLogicRegex, newFilterLogic);
  } else {
    console.log("Could not find filter logic in " + filepath);
  }

  // UI - Remove PHC and Subcentre dropdowns
  const uiRegex = /<div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">[\s\S]*?<label className="text-xs font-bold text-slate-700 w-full sm:w-24 shrink-0">[\s\S]*?प्राथमिक आरोग्य केंद्र \(PHC\)[\s\S]*?<\/label>[\s\S]*?<select[\s\S]*?id="report-filter-phc"[\s\S]*?<\/select>[\s\S]*?<\/div>\s*<div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">[\s\S]*?<label className="text-xs font-bold text-slate-700 w-full sm:w-24 shrink-0">[\s\S]*?आरोग्य उपकेंद्र \(Subcentre\)[\s\S]*?<\/label>[\s\S]*?<select[\s\S]*?id="report-filter-subcentre"[\s\S]*?<\/select>[\s\S]*?<\/div>/;
  
  if (content.match(uiRegex)) {
    content = content.replace(uiRegex, '');
  } else {
    console.log("Could not find UI elements for PHC/Subcentre in " + filepath);
  }
  
  // Hide Employee filter for subcentre employee if it exists
  const empRegex = /<div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">([\s\S]*?)<label className="text-xs font-bold text-slate-700 w-full sm:w-24 shrink-0">([\s\S]*?)कर्मचारी \(Employee\)([\s\S]*?)<\/label>([\s\S]*?)<select([\s\S]*?)id="report-filter-employee"([\s\S]*?)<\/select>([\s\S]*?)<\/div>/;
  if (content.match(empRegex)) {
    content = content.replace(empRegex, `{role === 'phc_controller' && (
      <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
        <label className="text-xs font-bold text-slate-700 w-full sm:w-24 shrink-0">
          कर्मचारी (Employee)
        </label>
        <select
          id="report-filter-employee"
          value={filterEmployeeId}
          onChange={(e) => {
             setFilterEmployeeId(e.target.value);
             setFilterVillageId(''); // Reset village when employee changes
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
    )}`);
  } else {
    console.log("Could not find Employee dropdown in " + filepath);
  }

  // Also remove variables from print
  content = content.replace(/const activePhc = phcs.find\(\(p\) => p.id === filterPhcId\);\n    const activeSub = subcentres.find\(\(s\) => s.id === filterSubcentreId\);\n/g, '');
  content = content.replace(/activePhc\?\.phc_name \|\| 'सर्व'/g, "'सर्व'");
  content = content.replace(/activeSub\?\.subcentre_name \|\| 'सर्व'/g, "'सर्व'");
  // Also from print CSV export
  content = content.replace(/filterPhcId,/g, '');
  content = content.replace(/filterSubcentreId,/g, '');
  
  fs.writeFileSync(filepath, content, 'utf8');
}

patchFile('src/pages/MalariaReportsPage.tsx');

