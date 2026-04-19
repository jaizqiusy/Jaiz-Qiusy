import React from "react";
import { Calculation } from "../App";
import PerformanceCharts from "./PerformanceCharts";
import PeriodicSummary from "./PeriodicSummary";
import { TrendingUp, Activity } from "lucide-react";

interface PerformanceProps {
  history: Calculation[];
  selectedDate: string;
}

export default function Performance({ history, selectedDate }: PerformanceProps) {
  return (
    <div className="space-y-4 pb-6">
      <div className="bg-slate-900 rounded-3xl shadow-sm p-5 border border-slate-800">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-emerald-900/10 p-2 rounded-xl text-emerald-400 border border-emerald-900/20">
            <Activity size={20} />
          </div>
          <h2 className="text-xl font-black text-slate-100 uppercase tracking-tight">Review Performa</h2>
        </div>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
          Pantau tren dan ringkasan efisiensi produksi secara berkala untuk pengambilan keputusan yang lebih tepat.
        </p>
      </div>

      <PerformanceCharts history={history} selectedDate={selectedDate} />
      
      <PeriodicSummary history={history} selectedDate={selectedDate} />
      
      <div className="bg-gradient-to-br from-emerald-600 to-emerald-900 rounded-[32px] p-6 text-white shadow-xl shadow-black/20 border border-emerald-500/20">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={20} className="text-emerald-100" />
          <h3 className="font-bold uppercase tracking-wider text-xs">Insight Produksi</h3>
        </div>
        <p className="text-sm font-medium leading-relaxed opacity-90">
          Gunakan data tren di atas untuk melihat konsistensi rendemen. Penurunan yang tajam pada grafik mungkin mengindikasikan perlunya pengecekan pada mesin atau kualitas bahan baku.
        </p>
        <div className="mt-6 pt-6 border-t border-white/10 flex justify-between items-center">
          <div className="text-center">
            <p className="text-[10px] font-bold text-white/60 uppercase mb-1">Total Data</p>
            <p className="text-xl font-black">{history.length}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] font-bold text-white/60 uppercase mb-1">Periode</p>
            <p className="text-xl font-black">{new Date().getFullYear()}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] font-bold text-white/60 uppercase mb-1">Status</p>
            <p className="text-xl font-black">Aktif</p>
          </div>
        </div>
      </div>
    </div>
  );
}
