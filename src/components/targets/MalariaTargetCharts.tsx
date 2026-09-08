import React from 'react';
import { Target, Users, Calendar, Award } from 'lucide-react';
import { TargetProgressItem } from '../../types';

interface MonthlyTrendData {
  monthNumber: number;
  monthNameMarathi: string;
  target: number;
  actual: number;
  progressPercent: number;
}

interface MalariaTargetChartsProps {
  monthlyTrends: MonthlyTrendData[];
  employeeProgressList: TargetProgressItem[];
  villageProgressList: TargetProgressItem[];
  selectedYear: number;
}

export const MalariaTargetCharts: React.FC<MalariaTargetChartsProps> = ({
  monthlyTrends,
  employeeProgressList,
  villageProgressList,
  selectedYear,
}) => {
  // Find max value for scaling monthly chart
  const maxMonthlyVal = Math.max(
    ...monthlyTrends.map((m) => Math.max(m.target, m.actual)),
    10
  );

  // Find max value for employee chart
  const maxEmployeeVal = Math.max(
    ...employeeProgressList.map((e) => Math.max(e.targetValue, e.actualSamples)),
    10
  );

  return (
    <div className="space-y-6">
      {/* 1. Monthly Trend: Target vs Actual (Requirement 13) */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                मासिक तुलनात्मक आलेख — लक्ष्य vs प्रत्यक्ष संकलन (सन {selectedYear})
              </h3>
              <p className="text-xs text-slate-500">
                जानेवारी ते डिसेंबर दरम्यान निश्चित केलेले उद्दिष्ट व प्रत्यक्षात घेतलेले रक्त नमुने
              </p>
            </div>
          </div>
          {/* Legend */}
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-xs bg-slate-300 border border-slate-400 inline-block"></span>
              <span className="font-semibold text-slate-700">लक्ष्य (Target)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-xs bg-emerald-700 border border-emerald-800 inline-block"></span>
              <span className="font-semibold text-emerald-900">प्रत्यक्ष संकलन (Actual)</span>
            </div>
          </div>
        </div>

        {/* Visual Bar Chart for 12 Months */}
        <div className="pt-6 overflow-x-auto">
          <div className="min-w-[640px] flex items-end justify-between gap-3 h-52 px-2 pb-6 border-b border-slate-200">
            {monthlyTrends.map((item) => {
              const targetHeightPercent = Math.round((item.target / maxMonthlyVal) * 100);
              const actualHeightPercent = Math.round((item.actual / maxMonthlyVal) * 100);

              const isAchieved = item.target > 0 && item.actual >= item.target;

              return (
                <div
                  key={item.monthNumber}
                  className="flex-1 flex flex-col items-center justify-end h-full group relative"
                >
                  {/* Tooltip on hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-12 z-20 pointer-events-none bg-slate-900 text-white text-[11px] rounded-md py-1 px-2 shadow-lg whitespace-nowrap">
                    <div>{item.monthNameMarathi} {selectedYear}</div>
                    <div className="text-slate-300">लक्ष्य: {item.target} | प्रत्यक्ष: {item.actual}</div>
                    <div className="font-bold text-emerald-400">प्रगती: {item.progressPercent}%</div>
                  </div>

                  {/* Two comparative bars */}
                  <div className="flex items-end justify-center gap-1.5 w-full h-full pb-1">
                    {/* Target Bar */}
                    <div className="w-3.5 sm:w-4 flex flex-col items-center justify-end h-full">
                      <span className="text-[10px] text-slate-400 mb-0.5 font-medium">
                        {item.target > 0 ? item.target : ''}
                      </span>
                      <div
                        style={{ height: `${Math.max(targetHeightPercent, 4)}%` }}
                        className="w-full bg-slate-300 hover:bg-slate-400 rounded-t-xs transition-all border-t border-x border-slate-400"
                      />
                    </div>

                    {/* Actual Bar */}
                    <div className="w-3.5 sm:w-4 flex flex-col items-center justify-end h-full">
                      <span
                        className={`text-[10px] mb-0.5 font-bold ${
                          isAchieved ? 'text-emerald-700' : 'text-slate-700'
                        }`}
                      >
                        {item.actual > 0 ? item.actual : ''}
                      </span>
                      <div
                        style={{ height: `${Math.max(actualHeightPercent, 4)}%` }}
                        className={`w-full rounded-t-xs transition-all border-t border-x ${
                          isAchieved
                            ? 'bg-emerald-700 hover:bg-emerald-800 border-emerald-800'
                            : 'bg-teal-600 hover:bg-teal-700 border-teal-700'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Month Label */}
                  <div className="text-[11px] font-semibold text-slate-700 mt-2 text-center truncate max-w-full">
                    {item.monthNameMarathi.slice(0, 3)}
                  </div>
                  {/* Progress tag */}
                  <div
                    className={`text-[10px] font-bold px-1 rounded-xs mt-0.5 ${
                      item.target === 0
                        ? 'text-slate-400'
                        : item.progressPercent >= 100
                        ? 'bg-emerald-100 text-emerald-800'
                        : item.progressPercent >= 50
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {item.target > 0 ? `${item.progressPercent}%` : '-'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Employee Progress Chart: Target vs Actual (Requirement 14) */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-100 text-indigo-800">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                कर्मचारीनिहाय उद्दिष्ट व कामगिरी आलेख (Employee Target vs Actual)
              </h3>
              <p className="text-xs text-slate-500">
                प्रत्येक कर्मचाऱ्याचे ठरवलेले लक्ष्य, प्रत्यक्षात घेतलेले नमुने व प्रगती टक्केवारी
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-slate-300 inline-block"></span>
              <span className="text-slate-600">लक्ष्य</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-emerald-700 inline-block"></span>
              <span className="text-emerald-900 font-semibold">प्रत्यक्ष</span>
            </div>
          </div>
        </div>

        <div className="pt-4 space-y-4">
          {employeeProgressList.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              कर्मचारीनिहाय लक्ष्य माहिती उपलब्ध नाही.
            </div>
          ) : (
            employeeProgressList.map((emp) => {
              const progressPct = emp.progressPercent;
              const isAchieved = emp.targetValue > 0 && emp.actualSamples >= emp.targetValue;

              return (
                <div key={emp.id} className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="font-bold text-xs text-slate-900">
                        {emp.entityName}
                      </div>
                      {emp.code && (
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-sm bg-slate-200 text-slate-800">
                          {emp.code}
                        </span>
                      )}
                      {emp.designation && (
                        <span className="text-[11px] text-slate-500">
                          ({emp.designation})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-600">
                        लक्ष्य: <strong className="text-slate-900">{emp.targetValue}</strong> | प्रत्यक्ष: <strong className="text-emerald-900">{emp.actualSamples}</strong> | बाकी: <strong>{emp.remainingTarget}</strong>
                      </span>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                          emp.targetValue === 0
                            ? 'bg-slate-200 text-slate-700'
                            : progressPct >= 100
                            ? 'bg-emerald-100 text-emerald-800'
                            : progressPct >= 50
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {progressPct}% {progressPct >= 100 ? '✓ पूर्ण' : ''}
                      </span>
                    </div>
                  </div>

                  {/* Horizontal progress bar */}
                  <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden flex relative">
                    <div
                      style={{ width: `${Math.min(progressPct, 100)}%` }}
                      className={`h-full transition-all duration-500 rounded-full ${
                        progressPct >= 100
                          ? 'bg-emerald-700'
                          : progressPct >= 80
                          ? 'bg-sky-600'
                          : progressPct >= 50
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 3. Top Villages by Target & Progress */}
      {villageProgressList.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
            <div className="p-2 rounded-lg bg-amber-100 text-amber-800">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                गावनिहाय उद्दिष्ट तुलना (Village Target vs Actual Highlights)
              </h3>
              <p className="text-xs text-slate-500">
                कार्यक्षेत्रातील प्रमुख गावांची लक्ष्यपूर्ती व नमुना संकलन स्थिती
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-4">
            {villageProgressList.slice(0, 6).map((v) => (
              <div
                key={v.id}
                className="p-3 rounded-lg border border-slate-200 bg-white hover:shadow-xs transition-shadow"
              >
                <div className="flex items-start justify-between gap-1 mb-2">
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">{v.entityName}</h4>
                    <div className="text-[11px] text-slate-500">
                      लोकसंख्या: {v.population?.toLocaleString('mr-IN')} | घरे: {v.totalHouses}
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm ${
                      v.status === 'लक्ष्य पूर्ण'
                        ? 'bg-emerald-100 text-emerald-800'
                        : v.status === 'चांगली प्रगती'
                        ? 'bg-sky-100 text-sky-800'
                        : v.status === 'मध्यम प्रगती'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {v.status}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1 py-1.5 bg-slate-50 rounded-md text-center text-[11px] mb-2">
                  <div>
                    <div className="text-slate-500 text-[10px]">लक्ष्य</div>
                    <div className="font-bold text-slate-900">{v.targetValue}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 text-[10px]">प्रत्यक्ष</div>
                    <div className="font-bold text-emerald-800">{v.actualSamples}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 text-[10px]">प्रगती</div>
                    <div className="font-bold text-slate-900">{v.progressPercent}%</div>
                  </div>
                </div>

                {v.houseCoveragePercent !== undefined && (
                  <div className="text-[10px] text-slate-600 flex items-center justify-between">
                    <span>House Coverage:</span>
                    <strong className="text-slate-900">{v.houseCoveragePercent}%</strong>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
