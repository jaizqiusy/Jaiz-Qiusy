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
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-indigo-100 p-2.5 rounded-2xl text-indigo-900">
            <BarChart3 size={24} />
          </div>
          <div>
            <h3 className="text-lg font-black text-gray-800 leading-none">Review Harian</h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
              {new Date(selectedDate).toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        {bsData.length === 0 ? (
          <div className="py-10 text-center">
            <AlertCircle className="mx-auto text-gray-300 mb-2" size={32} />
            <p className="text-xs font-bold text-gray-400 uppercase">Tidak ada data untuk direview</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Detailed Machine Status Grid */}
            <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto -mx-5 px-3">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 text-[8px] font-black text-gray-400 uppercase tracking-wider border-y border-gray-100">
                      <th className="px-1 py-4 first:rounded-l-2xl">Mesin</th>
                      <th className="px-1 py-4 text-center">Input</th>
                      <th className="px-1 py-4 text-center">Utama</th>
                      <th className="px-1 py-4 text-center">Output</th>
                      <th className="px-1 py-4 text-center last:rounded-r-2xl">Point</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
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
                      <tr key={item.id} className="hover:bg-indigo-50/30 transition-colors">
                        <td className="px-1 py-4">
                          <span className="text-[10px] font-black text-slate-800 uppercase tracking-tighter leading-none">{item.machine}</span>
                        </td>
                        <td className="px-1 py-4 text-center">
                          <span className="text-[11px] font-black text-blue-600 tracking-tighter">{item.input.toFixed(1)}</span>
                        </td>
                        <td className="px-1 py-4 text-center">
                          <span className="text-[11px] font-black text-indigo-700 tracking-tighter">{(item.yield_primary * 100).toFixed(1)}%</span>
                        </td>
                        <td className="px-1 py-4 text-center">
                          <span className="text-[11px] font-black text-green-700 tracking-tighter">{item.output.toFixed(1)}</span>
                        </td>
                        <td className="px-1 py-4 text-center">
                          <span className="text-[11px] font-black text-orange-600">{(item.achievement * 100).toFixed(0)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Insight Cards */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">Highlights</h4>
              
              <div className="grid grid-cols-2 gap-3">
                {/* Rendemen Highlights */}
                <div className="space-y-3">
                  {topMachine && (
                    <div className="bg-green-50 border border-green-100 p-3 rounded-2xl flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <div className="bg-green-500 p-1.5 rounded-lg text-white">
                          <TrendingUp size={14} />
                        </div>
                        <p className="text-[8px] font-black text-green-600 uppercase tracking-wider">UTAMA ↑</p>
                      </div>
                      <div className="flex flex-col">
                        <p className="text-3xl font-black text-gray-900 tracking-tighter">{topMachine.machine}</p>
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-bold text-gray-500">{(topMachine.yield_primary * 100).toFixed(2)}%</p>
                          <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest">Yield</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {lowMachine && (
                    <div className="bg-orange-50 border border-orange-100 p-3 rounded-2xl flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <div className="bg-orange-500 p-1.5 rounded-lg text-white">
                          <TrendingDown size={14} />
                        </div>
                        <p className="text-[8px] font-black text-orange-600 uppercase tracking-wider">UTAMA ↓</p>
                      </div>
                      <div className="flex flex-col">
                        <p className="text-3xl font-black text-gray-900 tracking-tighter">{lowMachine.machine}</p>
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-bold text-gray-500">{(lowMachine.yield_primary * 100).toFixed(2)}%</p>
                          <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest">Yield</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Output Highlights */}
                <div className="space-y-3">
                  {topOutputMachine && (
                    <div className="bg-blue-50 border border-blue-100 p-3 rounded-2xl flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <div className="bg-blue-500 p-1.5 rounded-lg text-white">
                          <TrendingUp size={14} />
                        </div>
                        <p className="text-[8px] font-black text-blue-600 uppercase tracking-wider">Output Tertinggi</p>
                      </div>
                      <div className="flex flex-col">
                        <p className="text-3xl font-black text-gray-900 tracking-tighter">{topOutputMachine.machine}</p>
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-bold text-gray-500">{topOutputMachine.output.toLocaleString()}</p>
                          <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest">M3 Output</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {lowOutputMachine && (
                    <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <div className="bg-slate-500 p-1.5 rounded-lg text-white">
                          <TrendingDown size={14} />
                        </div>
                        <p className="text-[8px] font-black text-slate-600 uppercase tracking-wider">Output Terendah</p>
                      </div>
                      <div className="flex flex-col">
                        <p className="text-3xl font-black text-gray-900 tracking-tighter">{lowOutputMachine.machine}</p>
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-bold text-gray-500">{lowOutputMachine.output.toLocaleString()}</p>
                          <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest">M3 Output</span>
                        </div>
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
