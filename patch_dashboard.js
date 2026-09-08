import fs from 'fs';

let content = fs.readFileSync('src/pages/DashboardPage.tsx', 'utf8');

// Add template types and service import
if (!content.includes('templateService')) {
  content = content.replace("import { masterDataService } from '../services/masterDataService';", "import { masterDataService } from '../services/masterDataService';\nimport { templateService } from '../services/templateService';\nimport { RecordRegisterTemplate } from '../types';");
}

// Add state
if (!content.includes('dynamicTemplates')) {
  content = content.replace("  const [showSqlModal, setShowSqlModal] = useState(false);", "  const [showSqlModal, setShowSqlModal] = useState(false);\n  const [dynamicTemplates, setDynamicTemplates] = useState<RecordRegisterTemplate[]>([]);");
}

// Load dynamic templates
if (!content.includes('setDynamicTemplates')) {
  content = content.replace("      setSyncStats(offlineDraftService.getSyncStats(user));", "      setSyncStats(offlineDraftService.getSyncStats(user));\n      const tpls = await templateService.getActiveTemplates();\n      setDynamicTemplates(tpls.filter(t => t.register_code !== 'MALARIA' && t.register_code !== 'TB'));");
}

// Render templates
const templateRender = `
        {dynamicTemplates.length > 0 && (
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-6">
              <Database className="w-5 h-5 text-indigo-500" /> डायनॅमिक रेजिस्टर्स
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {dynamicTemplates.map(t => (
                <button
                  key={t.id}
                  onClick={() => {
                    // Quick hack for this hacky patch: App.tsx will need a way to receive templateId
                    // For now, since App.tsx is modified to support templateId via global state
                    // I will just navigate to 'dynamic-register' and let the user select it, or use standard routing.
                    // Actually wait, how do I pass templateId in Dashboard? Dashboard doesn't have onSelectTemplate.
                    // Let's modify the nav payload if it's an object, or just set it in localStorage for now.
                    localStorage.setItem('selectedTemplateId', t.id);
                    onNavigate('dynamic-register');
                  }}
                  className="group relative overflow-hidden bg-gradient-to-br from-indigo-50 to-indigo-100/50 p-5 rounded-2xl border border-indigo-100 text-left hover:shadow-md transition-all duration-300"
                >
                  <div className="flex items-start justify-between relative z-10">
                    <div>
                      <h4 className="font-bold text-slate-800 text-lg mb-1">{t.register_name}</h4>
                      <p className="text-sm font-medium text-indigo-600">{t.program_name}</p>
                    </div>
                    <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
`;

content = content.replace("        {/* 2. Secondary Quick Actions */}", templateRender + "\n        {/* 2. Secondary Quick Actions */}");

fs.writeFileSync('src/pages/DashboardPage.tsx', content, 'utf8');
