import fs from 'fs';

let content = fs.readFileSync('src/pages/DailyWorkPage.tsx', 'utf8');

// Add template types and service import
if (!content.includes('templateService')) {
  content = content.replace("import { masterDataService } from '../services/masterDataService';", "import { masterDataService } from '../services/masterDataService';\nimport { templateService } from '../services/templateService';\nimport { RecordRegisterTemplate } from '../types';");
}

if (!content.includes('dynamicTemplates')) {
  content = content.replace("  const [targets, setTargets] = useState<MalariaTarget[]>([]);", "  const [targets, setTargets] = useState<MalariaTarget[]>([]);\n  const [dynamicTemplates, setDynamicTemplates] = useState<RecordRegisterTemplate[]>([]);");
}

// Load dynamic templates
if (!content.includes('setDynamicTemplates')) {
  content = content.replace("      setDrafts(offlineDrafts);", "      setDrafts(offlineDrafts);\n      const tpls = await templateService.getActiveTemplates();\n      setDynamicTemplates(tpls.filter(t => t.register_code !== 'MALARIA' && t.register_code !== 'TB'));");
}

// Render templates section
const dynamicRegistersRender = `
      {/* 2.5 DYNAMIC REGISTERS (CODE 19) */}
      {dynamicTemplates.length > 0 && (
        <section className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-sm font-black text-slate-800 tracking-wide">इतर नवीन नोंदी (डायनॅमिक)</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {dynamicTemplates.map(t => (
              <button
                key={t.id}
                onClick={() => {
                  localStorage.setItem('selectedTemplateId', t.id);
                  onNavigate('dynamic-register');
                }}
                className="group relative overflow-hidden bg-gradient-to-br from-indigo-50 to-indigo-100/50 p-4 rounded-2xl border border-indigo-100 text-left hover:shadow-md transition-all duration-300"
              >
                <div className="flex items-start justify-between relative z-10">
                  <div>
                    <h4 className="font-bold text-slate-800 text-base mb-1">{t.register_name}</h4>
                    <p className="text-xs font-medium text-indigo-600">{t.program_name}</p>
                  </div>
                  <div className="w-8 h-8 bg-white rounded-lg shadow-sm flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}
`;

content = content.replace("      {/* 3. TODAY'S RECENT SAMPLES LIST */}", dynamicRegistersRender + "\n      {/* 3. TODAY'S RECENT SAMPLES LIST */}");

fs.writeFileSync('src/pages/DailyWorkPage.tsx', content, 'utf8');
