import fs from 'fs';

let content = fs.readFileSync('src/pages/DailyWorkPage.tsx', 'utf8');

const dailyWorkReplacement = `              <div key={t.id} className="group relative overflow-hidden bg-gradient-to-br from-indigo-50 to-indigo-100/50 p-4 rounded-2xl border border-indigo-100 text-left hover:shadow-md transition-all duration-300">
                <div className="flex items-start justify-between relative z-10 mb-3">
                  <div>
                    <h4 className="font-bold text-slate-800 text-base mb-1">{t.register_name}</h4>
                    <p className="text-xs font-medium text-indigo-600">{t.program_name}</p>
                  </div>
                  <div className="w-8 h-8 bg-white rounded-lg shadow-sm flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => { localStorage.setItem('selectedTemplateId', t.id); onNavigate('dynamic-register'); }}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 rounded-lg text-center transition-colors"
                  >
                    नवीन नोंद
                  </button>
                  <button 
                    onClick={() => { localStorage.setItem('selectedTemplateId', t.id); onNavigate('dynamic-report'); }}
                    className="flex-1 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-bold py-2 rounded-lg text-center transition-colors"
                  >
                    अहवाल
                  </button>
                </div>
              </div>`;

content = content.replace(/<button\n                key=\{t\.id\}[\s\S]*?<\/button>/g, dailyWorkReplacement);

fs.writeFileSync('src/pages/DailyWorkPage.tsx', content, 'utf8');
