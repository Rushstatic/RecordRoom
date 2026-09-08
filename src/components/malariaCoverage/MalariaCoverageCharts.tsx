import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export interface VillageChartItem {
  name: string;
  subcentreName: string;
  samples: number;
  coveredHouses: number;
  totalHouses: number;
  coveragePct: number;
  sent: number;
  pending: number;
}

export interface EmployeeChartItem {
  name: string;
  smearCode: string;
  samples: number;
  coveredHouses: number;
  sent: number;
  pending: number;
}

export interface SubcentreChartItem {
  name: string;
  samples: number;
  coveredHouses: number;
  totalHouses: number;
  coveragePct: number;
  sent: number;
  pending: number;
}

export interface MonthlyChartItem {
  month: string;
  samples: number;
  sent: number;
  pending: number;
}

export interface DailyChartItem {
  date: string;
  samples: number;
}

interface MalariaCoverageChartsProps {
  villages: VillageChartItem[];
  employees: EmployeeChartItem[];
  subcentres: SubcentreChartItem[];
  monthlyData: MonthlyChartItem[];
  dailyData: DailyChartItem[];
}

const COLORS = ['#059669', '#0284c7', '#d97706', '#dc2626', '#7c3aed'];

export const MalariaCoverageCharts: React.FC<MalariaCoverageChartsProps> = ({
  villages,
  employees,
  subcentres,
  monthlyData,
  dailyData,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Monthly Trends */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 mb-4">मासिक सांख्यिकी (Monthly Trends)</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                cursor={{ fill: '#f8fafc' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Bar dataKey="samples" name="एकूण नमुने" fill="#059669" radius={[4, 4, 0, 0]} />
              <Bar dataKey="sent" name="पाठवलेले" fill="#0284c7" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Subcentre Performance */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 mb-4">उपकेंद्रनिहाय नमुने (Subcentre Performance)</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={subcentres} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={100} />
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                cursor={{ fill: '#f8fafc' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Bar dataKey="samples" name="एकूण नमुने" fill="#d97706" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Daily Trends (Line Chart) */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm lg:col-span-2">
        <h3 className="text-sm font-bold text-slate-800 mb-4">दैनिक नमुने संकलन (Daily Collection)</h3>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Line type="monotone" dataKey="samples" name="नमुने" stroke="#059669" strokeWidth={3} dot={{ r: 4, fill: '#059669', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
