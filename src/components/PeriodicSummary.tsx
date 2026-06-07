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
    <div className="bg-gradient-to-br from-blue-100 via-indigo-100 to-purple-200 rounded-3xl shadow-xl border border-white/60 p-5">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="bg-white/50 p-2 rounded-xl border border-white/40 shadow-sm">
            <BarChart3 className="text-indigo-700" size={24} />
          </div>
          <h3 className="font-black text-indigo-950 tracking-tight uppercase text-xl">Ringkasan Berkala</h3>
        </div>
        <div className="flex items-center gap-1 text-sm font-bold text-indigo-700 uppercase tracking-widest">
          <Clock size={16} className="text-indigo-500" />
          <span>BS 1 - 8 Only</span>
        </div>
      </div>

      <div className="space-y-6">
        <SummaryBlock 
          title={`Mingguan (Week ${currentWeek || "-"})`} 
          stats={weeklyStats} 
          color="cyan" 
        />
        <div className="h-px bg-indigo-200/60" />
        <SummaryBlock 
          title={`Bulanan (Month ${currentMonth || "-"})`} 
          stats={monthlyStats} 
          color="blue" 
        />
        <div className="h-px bg-indigo-200/60" />
        <SummaryBlock 
          title={`Quarterly (Q${currentQuartal || "-"})`} 
          stats={quarterlyStats} 
          color="indigo" 
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
    cyan: "text-blue-700",
    blue: "text-indigo-800",
    indigo: "text-purple-800"
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-[15px] font-black text-indigo-950 uppercase tracking-widest">{title}</p>
        <span className="text-[13.5px] font-bold text-indigo-700 uppercase tracking-tighter">{stats.count} Data</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white/60 backdrop-blur-sm p-3 rounded-xl text-center border border-white/50 shadow-sm">
          <p className="text-[12px] font-bold text-indigo-800 uppercase mb-1">Input</p>
          <p className="text-[18px] font-black text-indigo-950">{stats.input.toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} <span className="text-[12px] font-bold text-indigo-700">M3</span></p>
        </div>
        <div className="bg-white/60 backdrop-blur-sm p-3 rounded-xl text-center border border-white/50 shadow-sm">
          <p className="text-[12px] font-bold text-indigo-800 uppercase mb-1">Output</p>
          <p className="text-[18px] font-black text-indigo-950">{stats.output.toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} <span className="text-[12px] font-bold text-indigo-700">M3</span></p>
        </div>
        <div className="bg-white/60 backdrop-blur-sm p-3 rounded-xl text-center border border-white/50 shadow-sm">
          <p className="text-[12px] font-bold text-indigo-800 uppercase mb-1">Yield</p>
          <p className={cn("text-[18px] font-black", colorMap[color] || "text-indigo-950")}>{stats.rendemen.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%</p>
        </div>
      </div>
    </div>
  );
}
