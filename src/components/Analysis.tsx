import React from "react";
import { motion } from "motion/react";
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Activity, 
  AlertCircle,
  CheckCircle2,
  BarChart3
} from "lucide-react";
import { Calculation } from "../App";
import { cn } from "../lib/utils";

interface AnalysisProps {
  history: Calculation[];
  selectedDate: string;
}

export default function Analysis({ history, selectedDate }: AnalysisProps) {
  const filteredData = history.filter(calc => {
    const calcDate = calc.date.includes('T') ? calc.date.split('T')[0] : calc.date;
    return calcDate === selectedDate;
  });

  // BS Machines Data
  const bsData = filteredData.filter(item => /^BS\s*[1-8]$/i.test(item.machine) || /^BS[1-8]$/i.test(item.machine));
  
  // Main Machines (Poni A, Poni B, Breakdown)
  const mainStations = [
    { search: "PONIA", label: "PONI A", short: "PA" },
    { search: "PONIB", label: "PONI B", short: "PB" },
    { search: "BREAKDOWN", label: "BREAK", short: "BD" }
  ].map(m => {
    const entry = filteredData.find(item => item.machine.replace(/\s/g, "").toUpperCase() === m.search);
    return entry ? { ...entry, machine: m.label, short: m.short } : null;
  }).filter(Boolean) as Calculation[];

  const allDisplayData = [...bsData, ...mainStations];
  
  const totalInput = bsData.reduce((acc, curr) => acc + curr.input, 0);
  const totalOutput = bsData.reduce((acc, curr) => acc + curr.output, 0);
  const totalUtama = bsData.reduce((acc, curr) => acc + curr.utama, 0);
  const avgYield = totalInput > 0 ? (totalUtama / totalInput) * 100 : 0;
  const avgAchievement = bsData.length > 0 ? (bsData.reduce((acc, curr) => acc + curr.achievement, 0) / bsData.length) * 100 : 0;

  // Analysis Logic
  const topMachine = [...bsData].sort((a, b) => b.yield_primary - a.yield_primary)[0];
  const lowMachine = [...bsData].sort((a, b) => a.yield_primary - b.yield_primary)[0];
  const topOutputMachine = [...bsData].sort((a, b) => b.output - a.output)[0];
  const lowOutputMachine = [...bsData].sort((a, b) => a.output - b.output)[0];

  return (
    <div className="space-y-4 pb-6">
      {/* Header Analysis */}
      <div className="bg-slate-900 rounded-3xl shadow-sm border border-slate-800 p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-emerald-900/30 p-2.5 rounded-2xl text-emerald-400">
            <BarChart3 size={24} />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-100 leading-none">Review Harian</h3>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
              {new Date(selectedDate).toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        {bsData.length === 0 ? (
          <div className="py-10 text-center">
            <AlertCircle className="mx-auto text-slate-700 mb-2" size={32} />
            <p className="text-xs font-bold text-slate-500 uppercase">Tidak ada data untuk direview</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Detailed Machine Status Grid */}
            <div className="bg-slate-950/20 rounded-3xl p-5 border border-slate-800/50 shadow-sm overflow-hidden">
              <div className="overflow-x-auto -mx-5 px-3">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-950/40 text-[9px] font-black text-slate-500 uppercase tracking-[0.1em] border-y border-slate-800/50">
                      <th className="px-1 py-4 first:rounded-l-2xl">Mesin</th>
                      <th className="px-1 py-4 text-center">Input</th>
                      <th className="px-1 py-4 text-center">Utama</th>
                      <th className="px-1 py-4 text-center">Output</th>
                      <th className="px-1 py-4 text-center last:rounded-r-2xl">Point</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {allDisplayData.sort((a, b) => {
                      const isBSA = a.machine.startsWith("BS");
                      const isBSB = b.machine.startsWith("BS");
                      
                      if (isBSA && !isBSB) return -1;
                      if (!isBSA && isBSB) return 1;
                      
                      if (isBSA && isBSB) {
                        const numA = parseInt(a.machine.replace(/\D/g, "")) || 0;
                        const numB = parseInt(b.machine.replace(/\D/g, "")) || 0;
                        return numA - numB;
                      }
                      
                      return a.machine.localeCompare(b.machine);
                    }).map((item) => (
                      <tr key={item.id} className="hover:bg-emerald-900/10 transition-colors">
                        <td className="px-1 py-4">
                          <span className="text-[11px] font-black text-slate-300 uppercase tracking-tighter leading-none">{item.machine}</span>
                        </td>
                        <td className="px-1 py-4 text-center">
                          <span className="text-[12px] font-black text-blue-400 tracking-tighter">{item.input.toFixed(1)}</span>
                        </td>
                        <td className="px-1 py-4 text-center">
                          <span className="text-[12px] font-black text-indigo-400 tracking-tighter">{(item.yield_primary * 100).toFixed(1)}%</span>
                        </td>
                        <td className="px-1 py-4 text-center">
                          <span className="text-[12px] font-black text-emerald-400 tracking-tighter">{item.output.toFixed(1)}</span>
                        </td>
                        <td className="px-1 py-4 text-center">
                          <span className="text-[12px] font-black text-amber-500 font-mono">{(item.achievement * 100).toFixed(0)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Insight Cards */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-1">Highlights</h4>
              
              <div className="grid grid-cols-2 gap-3">
                {/* Rendemen Highlights */}
                <div className="space-y-3">
                  {topMachine && (
                    <div className="bg-slate-800 border border-emerald-900/30 p-3 rounded-xl flex flex-col gap-2 shadow-sm relative overflow-hidden">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                           <div className="bg-emerald-600 p-1 rounded text-white">
                             <TrendingUp size={10} />
                           </div>
                           <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">UTAMA ↑</p>
                        </div>
                        <p className="text-lg font-black text-emerald-400 font-mono tracking-tighter">{(topMachine.yield_primary * 100).toFixed(1)}%</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-xl font-black text-slate-100 leading-none">{topMachine.machine}</p>
                        <p className="text-[8px] font-bold text-slate-600 uppercase tracking-tighter">Yield Utama</p>
                      </div>
                    </div>
                  )}

                  {lowMachine && (
                    <div className="bg-slate-800 border border-amber-900/30 p-3 rounded-xl flex flex-col gap-2 shadow-sm relative overflow-hidden">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                           <div className="bg-amber-600 p-1 rounded text-white">
                             <TrendingDown size={10} />
                           </div>
                           <p className="text-[8px] font-black text-amber-500 uppercase tracking-widest">UTAMA ↓</p>
                        </div>
                        <p className="text-lg font-black text-amber-400 font-mono tracking-tighter">{(lowMachine.yield_primary * 100).toFixed(1)}%</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-xl font-black text-slate-100 leading-none">{lowMachine.machine}</p>
                        <p className="text-[8px] font-bold text-slate-600 uppercase tracking-tighter">Yield Utama</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Output Highlights */}
                <div className="space-y-3">
                  {topOutputMachine && (
                    <div className="bg-slate-800 border border-blue-900/30 p-3 rounded-xl flex flex-col gap-2 shadow-sm relative overflow-hidden">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                           <div className="bg-blue-600 p-1 rounded text-white">
                             <TrendingUp size={10} />
                           </div>
                           <p className="text-[8px] font-black text-blue-500 uppercase tracking-widest">OUTPUT ↑</p>
                        </div>
                        <p className="text-lg font-black text-blue-400 font-mono tracking-tighter">{Math.round(topOutputMachine.output).toLocaleString()}</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-xl font-black text-slate-100 leading-none">{topOutputMachine.machine}</p>
                        <p className="text-[8px] font-bold text-slate-600 uppercase tracking-tighter">M3 Output</p>
                      </div>
                    </div>
                  )}

                  {lowOutputMachine && (
                    <div className="bg-slate-800 border border-slate-700/50 p-3 rounded-xl flex flex-col gap-2 shadow-sm relative overflow-hidden">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                           <div className="bg-slate-600 p-1 rounded text-white">
                             <TrendingDown size={10} />
                           </div>
                           <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">OUTPUT ↓</p>
                        </div>
                        <p className="text-lg font-black text-slate-300 font-mono tracking-tighter">{Math.round(lowOutputMachine.output).toLocaleString()}</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-xl font-black text-slate-100 leading-none">{lowOutputMachine.machine}</p>
                        <p className="text-[8px] font-bold text-slate-600 uppercase tracking-tighter">M3 Output</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
