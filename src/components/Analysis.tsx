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
  
  const totalInput = bsData.reduce((acc, curr) => acc + curr.input, 0);
  const totalOutput = bsData.reduce((acc, curr) => acc + curr.output, 0);
  const totalUtama = bsData.reduce((acc, curr) => acc + curr.utama, 0);
  const avgYield = totalInput > 0 ? (totalUtama / totalInput) * 100 : 0;
  const avgAchievement = bsData.length > 0 ? (bsData.reduce((acc, curr) => acc + curr.achievement, 0) / bsData.length) * 100 : 0;

  // Analysis Logic
  const topMachine = [...bsData].sort((a, b) => b.yield_total - a.yield_total)[0];
  const lowMachine = [...bsData].sort((a, b) => a.yield_total - b.yield_total)[0];

  return (
    <div className="space-y-4 pb-6">
      {/* Header Analysis */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-indigo-50 p-2.5 rounded-2xl text-indigo-600">
            <BarChart3 size={24} />
          </div>
          <div>
            <h3 className="text-lg font-black text-gray-800 leading-none">Analisa Harian</h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
              {new Date(selectedDate).toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        {bsData.length === 0 ? (
          <div className="py-10 text-center">
            <AlertCircle className="mx-auto text-gray-300 mb-2" size={32} />
            <p className="text-xs font-bold text-gray-400 uppercase">Tidak ada data untuk dianalisa</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                  <Target size={14} className="text-purple-500" />
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Avg Achievement</span>
                </div>
                <p className="text-2xl font-black text-gray-800">{avgAchievement.toFixed(2)}%</p>
                <div className="mt-2 w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-full rounded-full transition-all duration-1000",
                      avgAchievement >= 100 ? "bg-green-500" : avgAchievement >= 85 ? "bg-blue-500" : "bg-orange-500"
                    )}
                    style={{ width: `${Math.min(avgAchievement, 100)}%` }}
                  />
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                  <Activity size={14} className="text-blue-500" />
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Avg Rendemen</span>
                </div>
                <p className="text-2xl font-black text-gray-800">{avgYield.toFixed(2)}%</p>
                <p className="text-[8px] font-bold text-gray-400 mt-1 uppercase">Total Utama / Total Input</p>
              </div>
            </div>

            {/* Insight Cards */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">Highlights</h4>
              
              {topMachine && (
                <div className="bg-green-50 border border-green-100 p-4 rounded-2xl flex items-center gap-4">
                  <div className="bg-green-500 p-2.5 rounded-xl text-white shadow-lg shadow-green-100">
                    <TrendingUp size={20} />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-green-600 uppercase tracking-wider mb-0.5">Performa Tertinggi</p>
                    <p className="text-sm font-black text-gray-800">
                      {topMachine.machine} <span className="text-gray-400 font-bold mx-1">•</span> {topMachine.yield_total.toFixed(2)}% Yield
                    </p>
                  </div>
                </div>
              )}

              {lowMachine && lowMachine !== topMachine && (
                <div className="bg-orange-50 border border-orange-100 p-4 rounded-2xl flex items-center gap-4">
                  <div className="bg-orange-500 p-2.5 rounded-xl text-white shadow-lg shadow-orange-100">
                    <TrendingDown size={20} />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-orange-600 uppercase tracking-wider mb-0.5">Perlu Perhatian</p>
                    <p className="text-sm font-black text-gray-800">
                      {lowMachine.machine} <span className="text-gray-400 font-bold mx-1">•</span> {lowMachine.yield_total.toFixed(2)}% Yield
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Detailed Breakdown */}
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Breakdown Mesin</h4>
              <div className="space-y-3">
                {bsData.sort((a, b) => b.yield_total - a.yield_total).map((item) => (
                  <div key={item.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-[10px] font-black text-gray-800 border border-gray-100">
                        {item.machine.replace("BS", "")}
                      </div>
                      <div>
                        <p className="text-xs font-black text-gray-800">{item.machine}</p>
                        <p className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">
                          Out: {item.output.toLocaleString()} M3
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn(
                        "text-xs font-black",
                        item.yield_total >= 50 ? "text-green-600" : "text-orange-600"
                      )}>
                        {item.yield_total.toFixed(2)}%
                      </p>
                      <div className="flex items-center justify-end gap-1">
                        {item.achievement >= 100 ? (
                          <CheckCircle2 size={8} className="text-green-500" />
                        ) : (
                          <div className="w-1 h-1 bg-gray-300 rounded-full" />
                        )}
                        <span className="text-[8px] font-bold text-gray-400">{(item.achievement * 100).toFixed(0)}% Target</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
