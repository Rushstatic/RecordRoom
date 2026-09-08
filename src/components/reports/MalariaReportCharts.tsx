import React from 'react';
import { BarChart3, TrendingUp, Users, MapPin } from 'lucide-react';

interface MonthlyDataPoint {
  monthNameMarathi: string;
  monthIndex: number;
  totalCollected: number;
  totalSent: number;
  totalPending: number;
}

interface EmployeeDataPoint {
  employeeName: string;
  smearCode: string;
  totalCollected: number;
  totalSent: number;
  totalPending: number;
}

interface VillageDataPoint {
  villageName: string;
  totalCollected: number;
  totalSent: number;
  totalPending: number;
}

interface MalariaReportChartsProps {
  monthlyData: MonthlyDataPoint[];
  employeeData: EmployeeDataPoint[];
  villageData: VillageDataPoint[];
}

export const MalariaReportCharts: React.FC<MalariaReportChartsProps> = ({
  monthlyData,
  employeeData,
  villageData,
}) => {
  // Compute maximum values for proportional heights/widths
  const maxMonthly = Math.max(...monthlyData.map((d) => Math.max(d.totalCollected, d.totalSent)), 1);
  const maxEmployee = Math.max(...employeeData.map((d) => d.totalCollected), 1);
  const maxVillage = Math.max(...villageData.map((d) => d.totalCollected), 1);

  return (
    <div className="space-y-6">
      {/* 1. Monthly Sample Count Chart */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                मासिक रक्त नमुना आलेख (Monthly Sample Trend)
              </h3>
              <p className="text-xs text-slate-500">
                महिनानिहाय संकलित व पाठविलेल्या नमुन्यांची तुलना
              </p>
            </div>
          </div>
          {/* Legend */}
          <div className="flex items-center gap-4 text-xs font-semibold">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-emerald-600 inline-block" />
              <span className="text-slate-700">संकलित नमुने</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-blue-600 inline-block" />
              <span className="text-slate-700">पाठविलेले नमुने</span>
            </div>
          </div>
        </div>

        {/* Responsive Bar Chart Canvas */}
        <div className="mt-6 pt-4 overflow-x-auto">
          <div className="min-w-[550px] h-52 flex items-end justify-between gap-3 px-2 border-b border-slate-200 pb-2">
            {monthlyData.map((item) => {
              const collectedHeightPercent = Math.round((item.totalCollected / maxMonthly) * 85);
              const sentHeightPercent = Math.round((item.totalSent / maxMonthly) * 85);

              return (
                <div key={item.monthNameMarathi} className="flex-1 flex flex-col items-center group h-full justify-end">
                  {/* Tooltip on hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] bg-slate-900 text-white rounded px-2 py-1 absolute -translate-y-24 pointer-events-none z-10 whitespace-nowrap shadow-md">
                    <div className="font-bold">{item.monthNameMarathi}</div>
                    <div>संकलित: {item.totalCollected}</div>
                    <div>पाठविलेले: {item.totalSent}</div>
                    <div>प्रलंबित: {item.totalPending}</div>
                  </div>

                  {/* Dual Bar Pair */}
                  <div className="w-full flex items-end justify-center gap-1 sm:gap-1.5 h-full">
                    {/* Collected Bar */}
                    <div className="w-3 sm:w-4 flex flex-col items-center justify-end h-full">
                      {item.totalCollected > 0 && (
                        <span className="text-[10px] font-bold text-emerald-800 mb-1">
                          {item.totalCollected}
                        </span>
                      )}
                      <div
                        style={{ height: `${Math.max(collectedHeightPercent, item.totalCollected > 0 ? 8 : 2)}%` }}
                        className={`w-full rounded-t-sm transition-all duration-300 ${
                          item.totalCollected > 0
                            ? 'bg-emerald-600 group-hover:bg-emerald-500'
                            : 'bg-slate-100'
                        }`}
                      />
                    </div>

                    {/* Sent Bar */}
                    <div className="w-3 sm:w-4 flex flex-col items-center justify-end h-full">
                      {item.totalSent > 0 && (
                        <span className="text-[10px] font-bold text-blue-800 mb-1">
                          {item.totalSent}
                        </span>
                      )}
                      <div
                        style={{ height: `${Math.max(sentHeightPercent, item.totalSent > 0 ? 8 : 2)}%` }}
                        className={`w-full rounded-t-sm transition-all duration-300 ${
                          item.totalSent > 0
                            ? 'bg-blue-600 group-hover:bg-blue-500'
                            : 'bg-slate-100'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Month Label */}
                  <span className="text-[11px] font-medium text-slate-600 mt-2 truncate w-full text-center">
                    {item.monthNameMarathi}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Grid for Employee-wise & Village-wise Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 2. Employee-wise Sample Count Chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="p-2 bg-purple-50 text-purple-700 rounded-lg">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  कर्मचारीनिहाय नमुना आलेख (Employee-wise Distribution)
                </h3>
                <p className="text-xs text-slate-500">
                  प्रत्येक आरोग्य कर्मचाऱ्याचे नमुना संकलन व प्रलंबित प्रमाण
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3.5">
              {employeeData.length === 0 ? (
                <div className="text-xs text-slate-400 text-center py-6">
                  कर्मचारी डेटा उपलब्ध नाही.
                </div>
              ) : (
                employeeData.map((emp) => {
                  const sentPercent = emp.totalCollected > 0 ? Math.round((emp.totalSent / emp.totalCollected) * 100) : 0;
                  const totalWidthPercent = Math.round((emp.totalCollected / maxEmployee) * 100);

                  return (
                    <div key={emp.employeeName} className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-slate-800 flex items-center gap-1.5 truncate max-w-[200px]">
                          {emp.employeeName}
                          <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded">
                            {emp.smearCode}
                          </span>
                        </span>
                        <div className="text-slate-600 font-medium">
                          <span className="font-bold text-slate-900">{emp.totalCollected}</span> नमुने
                          <span className="text-slate-400 mx-1">|</span>
                          <span className="text-emerald-700 font-semibold">{emp.totalSent} पाठविले</span>
                          {emp.totalPending > 0 && (
                            <>
                              <span className="text-slate-400 mx-1">|</span>
                              <span className="text-amber-700 font-semibold">{emp.totalPending} प्रलंबित</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Stacked Progress Bar */}
                      <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
                        <div
                          style={{ width: `${totalWidthPercent}%` }}
                          className="h-full flex rounded-full overflow-hidden"
                        >
                          <div
                            style={{ width: `${sentPercent}%` }}
                            className="h-full bg-emerald-600 transition-all duration-300"
                            title={`पाठविलेले: ${emp.totalSent}`}
                          />
                          <div
                            style={{ width: `${100 - sentPercent}%` }}
                            className="h-full bg-amber-500 transition-all duration-300"
                            title={`प्रलंबित: ${emp.totalPending}`}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
              पाठविलेले (Sent)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
              प्रलंबित (Pending)
            </span>
          </div>
        </div>

        {/* 3. Village-wise Sample Count Chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="p-2 bg-teal-50 text-teal-700 rounded-lg">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  गावनिहाय नमुना आलेख (Village-wise Distribution)
                </h3>
                <p className="text-xs text-slate-500">
                  उपकेंद्रनिहाय गावांमधील रक्त नमुने संकलन स्थिती
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3.5">
              {villageData.length === 0 ? (
                <div className="text-xs text-slate-400 text-center py-6">
                  गाव डेटा उपलब्ध नाही.
                </div>
              ) : (
                villageData.map((vil) => {
                  const sentPercent = vil.totalCollected > 0 ? Math.round((vil.totalSent / vil.totalCollected) * 100) : 0;
                  const totalWidthPercent = Math.round((vil.totalCollected / maxVillage) * 100);

                  return (
                    <div key={vil.villageName} className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-slate-800 truncate max-w-[180px]">
                          {vil.villageName}
                        </span>
                        <div className="text-slate-600 font-medium">
                          <span className="font-bold text-slate-900">{vil.totalCollected}</span> नमुने
                          <span className="text-slate-400 mx-1">|</span>
                          <span className="text-teal-700 font-semibold">{vil.totalSent} पाठविले</span>
                          {vil.totalPending > 0 && (
                            <>
                              <span className="text-slate-400 mx-1">|</span>
                              <span className="text-amber-700 font-semibold">{vil.totalPending} प्रलंबित</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Stacked Progress Bar */}
                      <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
                        <div
                          style={{ width: `${totalWidthPercent}%` }}
                          className="h-full flex rounded-full overflow-hidden"
                        >
                          <div
                            style={{ width: `${sentPercent}%` }}
                            className="h-full bg-teal-600 transition-all duration-300"
                            title={`पाठविलेले: ${vil.totalSent}`}
                          />
                          <div
                            style={{ width: `${100 - sentPercent}%` }}
                            className="h-full bg-amber-500 transition-all duration-300"
                            title={`प्रलंबित: ${vil.totalPending}`}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-600 inline-block" />
              पाठविलेले (Sent)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
              प्रलंबित (Pending)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
