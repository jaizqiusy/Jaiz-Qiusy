import React, { useState } from "react";
import { 
  TrendingUp, 
  Scale, 
  Droplets, 
  ArrowUpRight, 
  ArrowDownRight,
  Calendar as CalendarIcon,
  ChevronDown,
  Download,
  Upload,
  Zap,
  LayoutGrid,
  X,
  Info,
  Activity,
  RefreshCw
} from "lucide-react";
import { Calculation } from "../App";
import { cn } from "../lib/utils";
import PeriodicSummary from "./PeriodicSummary";
import PerformanceCharts from "./PerformanceCharts";
import { motion, AnimatePresence } from "motion/react";

interface DashboardProps {
  history: Calculation[];
  filteredHistory: Calculation[];
  selectedDate: string;
  onDateChange: (date: string) => void;
}

export default function Dashboard({ history, filteredHistory, selectedDate, onDateChange }: DashboardProps) {
  const [selectedMachine, setSelectedMachine] = useState("ALL");
  const [detailMachine, setDetailMachine] = useState<any | null>(null);

  const machines = [
    "ALL",
    "BS 1", "BS 2", "BS 3", "BS 4", "BS 5", "BS 6", "BS 7", "BS 8",
    "PONI A", "PONI B", "BREAK"
  ];

  // Calculate stats for the selected date based on GAS logic
  // If ALL: totalInput, totalOutput, totalUtama are from BS machines only
  // If Specific: only from that machine
  const bsData = filteredHistory.filter(item => /^BS\s*[1-8]$/i.test(item.machine) || /^BS[1-8]$/i.test(item.machine));
  
  const displayData = selectedMachine === "ALL" 
    ? bsData 
    : filteredHistory.filter(item => item.machine.replace(/\s/g, "").toUpperCase() === selectedMachine.replace(/\s/g, "").toUpperCase());

  const totalInput = displayData.reduce((acc, curr) => acc + curr.input, 0);
  const totalOutput = displayData.reduce((acc, curr) => acc + curr.output, 0);
  const totalUtama = displayData.reduce((acc, curr) => acc + curr.utama, 0);
  
  const avgRendemen = totalInput > 0 ? (totalUtama / totalInput) * 100 : 0;
  
  // Running Grid Data for BS 1-8
  const runningGridData = Array.from({ length: 8 }, (_, i) => {
    const name = `BS${i + 1}`;
    const machineEntries = bsData.filter(item => item.machine.replace(/\s/g, "").toUpperCase() === name);
    
    const tInput = machineEntries.reduce((acc, curr) => acc + curr.input, 0);
    const tUtama = machineEntries.reduce((acc, curr) => acc + curr.utama, 0);
    const tTurunan = machineEntries.reduce((acc, curr) => acc + curr.turunan, 0);
    const tLokal = machineEntries.reduce((acc, curr) => acc + curr.lokal, 0);
    const tOutput = machineEntries.reduce((acc, curr) => acc + curr.output, 0);
    const tAchievement = machineEntries.length > 0 ? (machineEntries.reduce((acc, curr) => acc + curr.achievement, 0) / machineEntries.length) * 100 : 0;
    const aYield = tInput > 0 ? (tUtama / tInput) * 100 : 0;

    return {
      name,
      active: tOutput > 0,
      yield: aYield,
      input: tInput,
      output: tOutput,
      utama: tUtama,
      turunan: tTurunan,
      lokal: tLokal,
      achievement: tAchievement
    };
  });

  const machinesRunning = runningGridData.filter(r => r.active).length;

  // Main Machines (Poni A, Poni B, Breakdown)
  const mainMachines = [
    { id: "PA", name: "Poni A", line: "Line 1", color: "text-blue-600", bg: "bg-blue-100", search: "PONIA" },
    { id: "PB", name: "Poni B", line: "Line 2", color: "text-green-600", bg: "bg-green-100", search: "PONIB" },
    { id: "BD", name: "Break", line: "System", color: "text-red-600", bg: "bg-red-100", search: "BREAKDOWN" }
  ].map(m => {
    const machineEntries = filteredHistory.filter(item => item.machine.replace(/\s/g, "").toUpperCase() === m.search);
    
    const tInput = machineEntries.reduce((acc, curr) => acc + curr.input, 0);
    const tUtama = machineEntries.reduce((acc, curr) => acc + curr.utama, 0);
    const tTurunan = machineEntries.reduce((acc, curr) => acc + curr.turunan, 0);
    const tLokal = machineEntries.reduce((acc, curr) => acc + curr.lokal, 0);
    const tOutput = machineEntries.reduce((acc, curr) => acc + curr.output, 0);
    const tAchievement = machineEntries.length > 0 ? (machineEntries.reduce((acc, curr) => acc + curr.achievement, 0) / machineEntries.length) * 100 : 0;
    const aYield = tInput > 0 ? (tUtama / tInput) * 100 : 0;

    return {
      ...m,
      input: tInput,
      utama: tUtama,
      turunan: tTurunan,
      lokal: tLokal,
      output: tOutput,
      yield: aYield,
      active: tOutput > 0,
      achievement: tAchievement
    };
  });

  return (
    <div className="space-y-4 pb-6">
      {/* Date & Machine Filter */}
      <div className="space-y-2">
        <div className="bg-slate-900 rounded-xl shadow-sm px-3 py-2 flex items-center justify-between border border-slate-800">
          <div className="flex items-center gap-2">
            <div className="bg-slate-800 p-1.5 rounded-lg text-emerald-400">
              <CalendarIcon size={16} />
            </div>
            <div className="flex flex-col">
              <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => onDateChange(e.target.value)}
                className="text-xs font-black text-slate-100 bg-transparent border-none focus:ring-0 p-0"
              />
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="bg-emerald-950/30 px-2 py-0.5 rounded text-[8px] font-black text-emerald-400 uppercase border border-emerald-900/30">Live</div>
            <ChevronDown size={14} className="text-slate-600" />
          </div>
        </div>

        {/* Machine Filter Chips */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {machines.map(m => (
            <button
              key={m}
              onClick={() => setSelectedMachine(m)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[9px] font-black whitespace-nowrap transition-all border",
                selectedMachine === m 
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-sm" 
                  : "bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700"
              )}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard 
          label="Total Input"
          value={totalInput.toLocaleString("id-ID")}
          unit="M3"
          icon={<Download className="text-white" size={24} />}
          gradient="from-blue-600 to-blue-800"
          iconBg="bg-blue-400/50"
        />
        <StatCard 
          label="Total Output"
          value={totalOutput.toLocaleString("id-ID")}
          unit="M3"
          icon={<Upload className="text-white" size={24} />}
          gradient="from-green-600 to-green-800"
          iconBg="bg-green-400/50"
        />
        <StatCard 
          label="UTAMA"
          value={avgRendemen.toFixed(2)}
          unit="%"
          subLabel={selectedMachine === "ALL" ? "BS 1 - 8" : selectedMachine}
          icon={<TrendingUp className="text-white" size={24} />}
          gradient="from-purple-800 to-purple-950"
          iconBg="bg-purple-400/50"
        />
        <StatCard 
          label={selectedMachine === "ALL" ? "Mesin Berjalan" : "Status Mesin"}
          value={selectedMachine === "ALL" ? machinesRunning.toString() : (totalOutput > 0 ? "1" : "0")}
          unit={selectedMachine === "ALL" ? "Unit" : "Active"}
          icon={<Zap className="text-white" size={24} />}
          gradient="from-orange-600 to-orange-800"
          iconBg="bg-orange-400/50"
        />
      </div>

      {/* Unified Production Monitor Frame */}
      <div className="bg-slate-900 rounded-[32px] shadow-md border border-slate-800 overflow-hidden mb-6">
        {/* Unified Header */}
        <div className="p-6 pb-2 flex items-center justify-between bg-slate-950/20">
          <div className="flex items-center gap-3">
            <div className="bg-slate-800 p-2.5 rounded-2xl text-emerald-400 shadow-lg shadow-black/20 border border-slate-700">
              <Activity size={22} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-100 leading-none">Status Produksi</h3>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                Monitoring Real-time
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Total Unit</span>
            <span className="text-lg font-black text-slate-100 leading-none">{machinesRunning + mainMachines.filter(m => m.active).length}</span>
          </div>
        </div>

        {/* Section 1: BS Machines Grid */}
        <div className="p-6 border-b border-slate-800/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="bg-amber-900/20 p-1.5 rounded-lg border border-amber-900/30">
                <Zap id="zap-icon-new" className="text-amber-500 fill-amber-500/10" size={14} />
              </div>
              <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">BS Line 1 - 8</h4>
            </div>
            <div className="text-[9px] font-bold text-emerald-400 bg-emerald-950/30 px-2 py-0.5 rounded-md uppercase border border-emerald-900/30">
              {machinesRunning}/8 Active
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {runningGridData.map((item) => (
              <motion.div 
                key={item.name} 
                whileHover={item.active ? { scale: 1.05, backgroundColor: "#065f4633" } : {}}
                whileTap={item.active ? { scale: 0.95 } : {}}
                onClick={() => item.active && setDetailMachine(item)}
                className={cn(
                  "flex flex-col items-center justify-center p-3 rounded-[20px] border transition-all relative group",
                  item.active 
                    ? "bg-slate-800/50 border-slate-700 shadow-sm cursor-pointer hover:border-emerald-500/50" 
                    : "bg-slate-900 border-slate-800 opacity-20 grayscale"
                )}
              >
                {item.active && (
                  <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                )}
                <div className="w-full bg-slate-900 py-1 border-b border-slate-700/50 rounded-t-xl mb-1.5 group-hover:bg-emerald-900/20 transition-colors text-center">
                  <p className="text-[11px] font-black text-slate-300 uppercase tracking-widest leading-none">{item.name}</p>
                </div>
                <div className="pb-1.5">
                  <p className={cn(
                      "text-[18px] font-black leading-none tracking-tighter",
                      item.active ? "text-emerald-400" : "text-slate-700"
                    )}
                  >
                    {item.yield.toFixed(1)}
                    <span className="text-[9px] font-bold ml-0.5 text-slate-500">%</span>
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Section 2: Main Units List */}
        <div className="p-6 bg-slate-950/20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="bg-blue-900/20 p-1.5 rounded-lg border border-blue-900/30">
                <LayoutGrid id="grid-icon-new" className="text-blue-400" size={14} />
              </div>
              <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Main Station Status</h4>
            </div>
            <div className="bg-blue-950/30 text-blue-400 text-[9px] font-bold px-3 py-1 rounded-full uppercase tracking-wider border border-blue-900/30">
              High Capacity
            </div>
          </div>
          
          <div className="space-y-2">
            {mainMachines.map((item) => (
              <motion.div 
                key={item.id} 
                whileHover={item.active ? { x: 4, backgroundColor: "#1e293b" } : {}}
                whileTap={item.active ? { scale: 0.98 } : {}}
                onClick={() => item.active && setDetailMachine(item)}
                className={cn(
                  "flex items-center justify-between p-3 rounded-[20px] border transition-all",
                  item.active 
                    ? "bg-slate-800/40 border-slate-700 shadow-sm cursor-pointer hover:border-emerald-500/30" 
                    : "bg-slate-900 border-slate-900 opacity-20 grayscale"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "bg-slate-900 text-slate-100", 
                    "p-2 rounded-xl font-black text-xs w-10 h-10 flex items-center justify-center shadow-inner border border-white/5 shadow-black"
                  )}>
                    {item.id}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-base font-black text-slate-100 leading-none tracking-tight">{item.name}</p>
                      {item.active && <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />}
                    </div>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                      {item.line}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-black text-slate-100 leading-none tracking-tighter">
                      {item.output.toLocaleString("id-ID")}
                    </p>
                    <p className="text-[8px] font-black text-slate-500 uppercase mt-0.5">OUTPUT</p>
                  </div>
                  <div className={cn(
                    "min-w-[50px] text-center px-2 py-1.5 rounded-xl text-[10px] font-black",
                    item.active ? "bg-indigo-900/30 text-indigo-300 border border-indigo-500/20" : "bg-slate-900 text-slate-500"
                  )}>
                    {item.yield.toFixed(1)}%
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Machine Detail Modal */}
      <AnimatePresence>
        {detailMachine && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setDetailMachine(null)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm cursor-pointer"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.85, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 10 }}
              transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 w-full max-w-[320px] rounded-[28px] overflow-hidden shadow-2xl border border-slate-800 cursor-default"
            >
              <div className="p-5">
                <div className="flex justify-between items-center mb-5">
                  <div className="flex items-center gap-2.5">
                    <div className="bg-emerald-900/30 p-2.5 rounded-2xl text-emerald-400">
                      <Activity size={20} />
                    </div>
                    <div>
                      <h4 className="text-lg font-black text-slate-100 leading-none">{detailMachine.name}</h4>
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Detail Performa Mesin</p>
                    </div>
                  </div>
                  <motion.button 
                    whileTap={{ scale: 0.8, backgroundColor: "#1e293b" }}
                    onClick={() => setDetailMachine(null)}
                    className="p-2.5 bg-slate-800 border border-slate-700 rounded-2xl transition-all"
                  >
                    <X size={20} className="text-slate-400" />
                  </motion.button>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div className="bg-blue-900/20 p-2 rounded-2xl border border-blue-900/30">
                    <p className="text-[8px] font-bold text-blue-500 uppercase tracking-widest mb-0.5">Total Input</p>
                    <p className="text-lg font-black text-blue-300">{detailMachine.input.toFixed(2)} <span className="text-[8px] font-normal opacity-50">M3</span></p>
                  </div>
                  <div className="bg-emerald-900/20 p-2 rounded-2xl border border-emerald-900/30">
                    <p className="text-[8px] font-bold text-emerald-500 uppercase tracking-widest mb-0.5">Total Output</p>
                    <p className="text-lg font-black text-emerald-300">{detailMachine.output.toFixed(2)} <span className="text-[8px] font-normal opacity-50">M3</span></p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-2">
                  <div className="bg-slate-800/50 p-1.5 rounded-xl border border-slate-700/50 text-center">
                    <p className="text-[7px] font-bold text-slate-500 uppercase tracking-tighter mb-0.5 whitespace-nowrap">Utama</p>
                    <p className="text-[10px] font-black text-slate-100">{detailMachine.utama.toFixed(2)}</p>
                  </div>
                  <div className="bg-slate-800/50 p-1.5 rounded-xl border border-slate-700/50 text-center">
                    <p className="text-[7px] font-bold text-slate-500 uppercase tracking-tighter mb-0.5 whitespace-nowrap">Turunan</p>
                    <p className="text-[10px] font-black text-slate-100">{detailMachine.turunan.toFixed(2)}</p>
                  </div>
                  <div className="bg-slate-800/50 p-1.5 rounded-xl border border-slate-700/50 text-center">
                    <p className="text-[7px] font-bold text-slate-500 uppercase tracking-tighter mb-0.5 whitespace-nowrap">Lokal</p>
                    <p className="text-[10px] font-black text-slate-100">{detailMachine.lokal.toFixed(2)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="bg-emerald-600 p-3 rounded-[20px] text-white shadow-lg shadow-emerald-900/20 border border-emerald-500/20">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-[8px] font-bold text-emerald-100 uppercase tracking-widest">Utama</p>
                      <TrendingUp size={10} className="text-white/70" />
                    </div>
                    <div className="flex items-baseline gap-0.5">
                      <p className="text-xl font-black tracking-tighter">
                        {detailMachine.yield.toFixed(2)}
                        <span className="text-[10px] font-bold ml-0.5 text-white/70">%</span>
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-800 p-3 rounded-[20px] text-white shadow-lg border border-slate-700">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Total</p>
                      <Scale size={10} className="text-slate-500" />
                    </div>
                    <div className="flex items-baseline gap-0.5">
                      <p className="text-xl font-black tracking-tighter">
                        {(detailMachine.input > 0 ? (detailMachine.output / detailMachine.input) * 100 : 0).toFixed(2)}
                        <span className="text-[10px] font-bold ml-0.5 text-slate-500">%</span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between p-2.5 bg-slate-800/30 border border-slate-800 rounded-xl">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-1 bg-emerald-500 rounded-full" />
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Status Mesin</span>
                    </div>
                    <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Running</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-slate-800/30 border border-slate-800 rounded-xl">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-1 bg-amber-500 rounded-full" />
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Tanggal Data</span>
                    </div>
                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">
                      {new Date(selectedDate).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>

                <motion.button 
                  whileTap={{ scale: 0.96, y: 2 }}
                  onClick={() => setDetailMachine(null)}
                  className="w-full mt-3 py-2.5 bg-emerald-600 text-white rounded-xl font-black uppercase tracking-widest text-[9px] hover:bg-emerald-500 transition-all shadow-lg shadow-black/20"
                >
                  Tutup Detail
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>



      {/* Reset Data Section */}
      <div className="mt-8 pt-8 border-t border-slate-900">
        <button 
          onClick={() => {
            if (window.confirm("Hapus semua data lokal dan sinkronisasi ulang dari awal?")) {
              localStorage.removeItem("rendemen_history");
              localStorage.removeItem("rendemen_last_sync");
              window.location.reload();
            }
          }}
          className="w-full py-3 px-4 bg-red-900/10 text-red-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-900/20 transition-all flex items-center justify-center gap-2 border border-red-900/20"
        >
          <RefreshCw size={14} />
          Reset Data Lokal & Refresh
        </button>
        <p className="text-[8px] text-slate-600 text-center mt-2 uppercase font-bold tracking-tighter">
          Gunakan jika data terasa tidak sinkron atau ingin membersihkan cache
        </p>
      </div>
    </div>
  );
}

function StatCard({ label, value, unit, icon, gradient, iconBg, subLabel }: { 
  label: string, 
  value: string, 
  unit: string, 
  icon: React.ReactNode, 
  gradient: string,
  iconBg: string,
  subLabel?: string
}) {
  return (
    <div className={cn("p-3 rounded-2xl shadow-sm relative overflow-hidden bg-gradient-to-br", gradient)}>
      <div className="flex justify-between items-center mb-1">
        <p className="text-[9px] font-bold text-white/70 uppercase tracking-widest">{label}</p>
        <div className={cn("p-1.5 rounded-lg backdrop-blur-md", iconBg)}>
          {React.cloneElement(icon as React.ReactElement, { size: 16 })}
        </div>
      </div>
      <div className="flex items-baseline gap-1">
        <p className="text-xl font-black text-white tracking-tighter">{value}</p>
        <span className="text-[9px] font-bold text-white/60 uppercase">{unit}</span>
      </div>
      {subLabel && (
        <p className="text-[8px] font-bold text-white/50 mt-1 uppercase truncate">{subLabel}</p>
      )}
    </div>
  );
}
