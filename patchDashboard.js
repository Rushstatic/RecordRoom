import fs from 'fs';

const filePath = 'src/pages/DashboardPage.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. imports
content = content.replace(
  `import { malariaService } from '../services/malariaService';`,
  `import { malariaService } from '../services/malariaService';\nimport { tbService, getTodayDateString } from '../services/tbService';\nimport { Activity, Stethoscope } from 'lucide-react';`
);

// 2. add TB state
content = content.replace(
  `const [totalTests, setTotalTests] = useState(0);`,
  `const [totalTests, setTotalTests] = useState(0);
  const [tbStats, setTbStats] = useState({ total: 0, today: 0, month: 0, sputum: 0, xray: 0, lpa: 0, followup: 0, foodBasket: 0, phc: 0, rh: 0 });`
);

// 3. fetch data
const fetchTarget = `const samples = await malariaService.getSamples();
      setTotalTests(samples.length);`;
const fetchReplace = `const samples = await malariaService.getSamples();
      setTotalTests(samples.length);

      // TB Stats
      const tbSamples = await tbService.getSamples();
      const today = getTodayDateString();
      const currentMonth = today.substring(0, 7); // YYYY-MM
      
      const tbStatsAgg = { total: 0, today: 0, month: 0, sputum: 0, xray: 0, lpa: 0, followup: 0, foodBasket: 0, phc: 0, rh: 0 };
      tbStatsAgg.total = tbSamples.length;
      tbSamples.forEach(s => {
        if (s.sample_collection_date === today) tbStatsAgg.today++;
        if (s.sample_collection_date.startsWith(currentMonth)) tbStatsAgg.month++;
        
        if (s.sample_type === 'Sputum') tbStatsAgg.sputum++;
        if (s.sample_type === 'X-Ray') tbStatsAgg.xray++;
        if (s.sample_type === 'LPA') tbStatsAgg.lpa++;
        if (s.sample_type === 'Followup Sputum') tbStatsAgg.followup++;
        if (s.sample_type === 'FoodBasket') tbStatsAgg.foodBasket++;

        if (s.sample_given_at === 'PHC_BHADA') tbStatsAgg.phc++;
        if (s.sample_given_at === 'RURAL_HOSPITAL_AUSA') tbStatsAgg.rh++;
      });
      setTbStats(tbStatsAgg);`;
content = content.replace(fetchTarget, fetchReplace);

// 4. Render UI
// We need to inject the TB Program Summary section right before the Activity log section, or just after Quick Links.
// Let's find "Quick Actions" or similar.
const uiTarget = `{/* Right Column - Secondary Actions & Stats */}`;
const uiReplace = `{/* TB Program Summary */}
        <div className="md:col-span-3 mb-6 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-emerald-900 px-5 py-4 border-b border-emerald-800 flex items-center gap-3">
            <div className="p-2 bg-emerald-800/50 rounded-lg">
              <Activity className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg leading-tight">क्षयरोग (TB) नियंत्रण कार्यक्रम</h2>
              <p className="text-emerald-100 text-xs">संशयित रुग्ण व नमुना सद्यस्थिती</p>
            </div>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="text-slate-500 text-xs font-bold mb-1">एकूण संशयित रुग्ण</div>
                <div className="text-2xl font-black text-slate-800">{tbStats.total}</div>
              </div>
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                <div className="text-amber-700 text-xs font-bold mb-1">आजच्या नोंदी</div>
                <div className="text-2xl font-black text-amber-900">{tbStats.today}</div>
              </div>
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                <div className="text-emerald-700 text-xs font-bold mb-1">या महिन्यातील नोंदी</div>
                <div className="text-2xl font-black text-emerald-900">{tbStats.month}</div>
              </div>
              <div className="p-4 bg-sky-50 rounded-xl border border-sky-100">
                <div className="text-sky-700 text-xs font-bold mb-1">FoodBasket</div>
                <div className="text-2xl font-black text-sky-900">{tbStats.foodBasket}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
              <div className="bg-slate-50 py-2 rounded-lg border border-slate-200"><div className="text-[10px] text-slate-500 font-bold uppercase">Sputum</div><div className="text-lg font-bold text-slate-700">{tbStats.sputum}</div></div>
              <div className="bg-slate-50 py-2 rounded-lg border border-slate-200"><div className="text-[10px] text-slate-500 font-bold uppercase">X-Ray</div><div className="text-lg font-bold text-slate-700">{tbStats.xray}</div></div>
              <div className="bg-slate-50 py-2 rounded-lg border border-slate-200"><div className="text-[10px] text-slate-500 font-bold uppercase">LPA</div><div className="text-lg font-bold text-slate-700">{tbStats.lpa}</div></div>
              <div className="bg-slate-50 py-2 rounded-lg border border-slate-200"><div className="text-[10px] text-slate-500 font-bold uppercase">Followup</div><div className="text-lg font-bold text-slate-700">{tbStats.followup}</div></div>
              <div className="col-span-2 md:col-span-1 bg-slate-800 text-white py-2 rounded-lg flex flex-col justify-center">
                <div className="text-[10px] text-slate-300 font-bold uppercase">Locations</div>
                <div className="text-xs font-medium">भादा: {tbStats.phc} | औसा: {tbStats.rh}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Secondary Actions & Stats */}`;
content = content.replace(uiTarget, uiReplace);

fs.writeFileSync(filePath, content, 'utf8');
