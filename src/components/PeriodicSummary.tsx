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
    <div className="bg-slate-900 rounded-3xl shadow-sm border border-slate-800 p-5">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="bg-emerald-900/10 p-2 rounded-xl border border-emerald-900/20">
            <BarChart3 className="text-emerald-400" size={20} />
          </div>
          <h3 className="font-bold text-slate-100">Ringkasan Berkala</h3>
        </div>
        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          <Clock size={14} />
          <span>BS 1 - 8 Only</span>
        </div>
      </div>

      <div className="space-y-6">
        <SummaryBlock 
          title={`Mingguan (Week ${currentWeek || "-"})`} 
          stats={weeklyStats} 
          color="emerald" 
        />
        <div className="h-px bg-slate-800" />
        <SummaryBlock 
          title={`Bulanan (Month ${currentMonth || "-"})`} 
          stats={monthlyStats} 
          color="blue" 
        />
        <div className="h-px bg-slate-800" />
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
  const colorMap: Record<string, string> = {
    emerald: "text-emerald-400",
    blue: "text-blue-400",
    purple: "text-purple-400"
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{title}</p>
        <span className="text-[9px] font-bold text-slate-600">{stats.count} Data</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-slate-800/50 p-2 rounded-xl text-center border border-slate-800/30">
          <p className="text-[8px] font-bold text-slate-500 uppercase mb-1">Input</p>
          <p className="text-xs font-black text-slate-100">{stats.input.toLocaleString("id-ID")} <span className="text-[8px] font-normal opacity-50">M3</span></p>
        </div>
        <div className="bg-slate-800/50 p-2 rounded-xl text-center border border-slate-800/30">
          <p className="text-[8px] font-bold text-slate-500 uppercase mb-1">Output</p>
          <p className="text-xs font-black text-slate-100">{stats.output.toLocaleString("id-ID")} <span className="text-[8px] font-normal opacity-50">M3</span></p>
        </div>
        <div className="bg-slate-800/50 p-2 rounded-xl text-center border border-slate-800/30">
          <p className="text-[8px] font-bold text-slate-500 uppercase mb-1">Yield</p>
          <p className={cn("text-xs font-black", colorMap[color])}>{stats.rendemen.toFixed(2)}%</p>
        </div>
      </div>
    </div>
  );
}
