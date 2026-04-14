import React from "react";
import { BarChart3, Clock, TrendingUp } from "lucide-react";
import { Calculation } from "../App";
import { cn } from "../lib/utils";

interface PeriodicSummaryProps {
  history: Calculation[];
  selectedDate: string;
}

export default function PeriodicSummary({ history, selectedDate }: PeriodicSummaryProps) {
  // Find reference values from the selected date
  const referenceEntry = history.find(calc => {
    const calcDate = calc.date.includes('T') ? calc.date.split('T')[0] : calc.date;
    return calcDate === selectedDate;
  });

  const currentWeek = referenceEntry?.week;
  const currentMonth = referenceEntry?.month;
  const currentQuartal = referenceEntry?.quartal;
  const currentYear = referenceEntry ? new Date(referenceEntry.date).getFullYear() : new Date(selectedDate).getFullYear();

  const getStats = (data: Calculation[]) => {
    // GAS logic: totalInput, totalOutput, totalUtama are from BS machines only
    const bsData = data.filter(item => /^BS\s*[1-8]$/i.test(item.machine) || /^BS[1-8]$/i.test(item.machine));
    
    const input = bsData.reduce((acc, curr) => acc + curr.input, 0);
    const output = bsData.reduce((acc, curr) => acc + curr.output, 0);
    const utama = bsData.reduce((acc, curr) => acc + curr.utama, 0);
    const rendemen = input > 0 ? (utama / input) * 100 : 0;
    
    return { input, output, rendemen, count: bsData.length };
  };

  const weeklyStats = getStats(history.filter(calc => 
    currentWeek !== undefined && 
    calc.week === currentWeek && 
    new Date(calc.date).getFullYear() === currentYear
  ));
  const monthlyStats = getStats(history.filter(calc => 
    currentMonth !== undefined && 
    calc.month === currentMonth && 
    new Date(calc.date).getFullYear() === currentYear
  ));
  const quarterlyStats = getStats(history.filter(calc => 
    currentQuartal !== undefined && 
    calc.quartal === currentQuartal && 
    new Date(calc.date).getFullYear() === currentYear
  ));

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-50 p-2 rounded-xl">
            <BarChart3 className="text-indigo-500" size={20} />
          </div>
          <h3 className="font-bold text-gray-800">Ringkasan Berkala</h3>
        </div>
        <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
          <Clock size={14} />
          <span>BS 1 - 8 Only</span>
        </div>
      </div>

      <div className="space-y-6">
        <SummaryBlock 
          title={`Mingguan (Week ${currentWeek || "-"})`} 
          stats={weeklyStats} 
          color="indigo" 
        />
        <div className="h-px bg-gray-50" />
        <SummaryBlock 
          title={`Bulanan (Month ${currentMonth || "-"})`} 
          stats={monthlyStats} 
          color="blue" 
        />
        <div className="h-px bg-gray-50" />
        <SummaryBlock 
          title={`Quarterly (Q${currentQuartal || "-"})`} 
          stats={quarterlyStats} 
          color="purple" 
        />
      </div>
    </div>
  );
}

function SummaryBlock({ title, stats, color }: { 
  title: string, 
  stats: { input: number, output: number, rendemen: number, count: number },
  color: string
}) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{title}</p>
        <span className="text-[9px] font-bold text-gray-300">{stats.count} Data</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-gray-50/50 p-2 rounded-xl text-center">
          <p className="text-[8px] font-bold text-gray-400 uppercase mb-1">Input</p>
          <p className="text-xs font-black text-gray-800">{stats.input.toLocaleString("id-ID")} <span className="text-[8px] font-normal">M3</span></p>
        </div>
        <div className="bg-gray-50/50 p-2 rounded-xl text-center">
          <p className="text-[8px] font-bold text-gray-400 uppercase mb-1">Output</p>
          <p className="text-xs font-black text-gray-800">{stats.output.toLocaleString("id-ID")} <span className="text-[8px] font-normal">M3</span></p>
        </div>
        <div className="bg-gray-50/50 p-2 rounded-xl text-center">
          <p className="text-[8px] font-bold text-gray-400 uppercase mb-1">Yield</p>
          <p className={cn("text-xs font-black", `text-${color}-600`)}>{stats.rendemen.toFixed(2)}%</p>
        </div>
      </div>
    </div>
  );
}
