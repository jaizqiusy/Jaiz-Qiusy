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
    "PONI A", "PONI B", "BREAKDOWN"
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
    const aYield = tInput > 0 ? (tUtama / tInput) * 100 : 0;

    return {
      name,
      active: tOutput > 0,
      yield: aYield,
      input: tInput,
      output: tOutput,
      utama: tUtama,
      turunan: tTurunan,
      lokal: tLokal
    };
  });

  const machinesRunning = runningGridData.filter(r => r.active).length;

  // Main Machines (Poni A, Poni B, Breakdown)
  const mainMachines = [
    { id: "PA", name: "Poni A", line: "Line 1", color: "text-blue-600", bg: "bg-blue-100", search: "PONIA" },
    { id: "PB", name: "Poni B", line: "Line 2", color: "text-green-600", bg: "bg-green-100", search: "PONIB" },
    { id: "BD", name: "Breakdown", line: "System", color: "text-red-600", bg: "bg-red-100", search: "BREAKDOWN" }
  ].map(m => {
    const machineEntries = filteredHistory.filter(item => item.machine.replace(/\s/g, "").toUpperCase() === m.search);
    
    const tInput = machineEntries.reduce((acc, curr) => acc + curr.input, 0);
    const tUtama = machineEntries.reduce((acc, curr) => acc + curr.utama, 0);
    const tTurunan = machineEntries.reduce((acc, curr) => acc + curr.turunan, 0);
    const tLokal = machineEntries.reduce((acc, curr) => acc + curr.lokal, 0);
    const tOutput = machineEntries.reduce((acc, curr) => acc + curr.output, 0);
    const aYield = tInput > 0 ? (tUtama / tInput) * 100 : 0;

    return {
      ...m,
      input: tInput,
      utama: tUtama,
      turunan: tTurunan,
      lokal: tLokal,
      output: tOutput,
      yield: aYield,
      active: tOutput > 0
    };
  });

  return (
    <div className="space-y-4 pb-6">
      {/* Date & Machine Filter */}
      <div className="space-y-3">
        <div className="bg-white rounded-2xl shadow-sm p-3 flex items-center justify-between border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 p-2 rounded-lg text-purple-900">
              <CalendarIcon size={20} />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Filter Tanggal</span>
              <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => onDateChange(e.target.value)}
                className="text-sm font-black text-gray-800 bg-transparent border-none focus:ring-0 p-0"
              />
            </div>
          </div>
          <div className="bg-gray-50 p-2 rounded-lg">
            <ChevronDown size={16} className="text-gray-400" />
          </div>
        </div>

        {/* Machine Filter Chips */}
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {machines.map(m => (
            <button
              key={m}
              onClick={() => setSelectedMachine(m)}
              className={cn(
                "px-4 py-2 rounded-xl text-[10px] font-black whitespace-nowrap transition-all border",
                selectedMachine === m 
                  ? "bg-purple-900 text-white border-purple-900 shadow-md shadow-purple-100" 
                  : "bg-white text-gray-400 border-gray-100 hover:border-gray-200"
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
          label="Rendemen Utama"
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
      <div className="bg-white rounded-[32px] shadow-md border border-gray-100 overflow-hidden mb-6">
        {/* Unified Header */}
        <div className="p-6 pb-2 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="bg-slate-900 p-2.5 rounded-2xl text-white shadow-lg shadow-slate-200">
              <Activity size={22} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-xl font-black text-gray-800 leading-none">Status Produksi</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                Monitoring Real-time
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total Unit</span>
            <span className="text-lg font-black text-slate-800 leading-none">{machinesRunning + mainMachines.filter(m => m.active).length}</span>
          </div>
        </div>

        {/* Section 1: BS Machines Grid */}
        <div className="p-6 border-b border-gray-50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="bg-yellow-50 p-1.5 rounded-lg">
                <Zap id="zap-icon-new" className="text-yellow-600 fill-yellow-600" size={14} />
              </div>
              <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest">BS Line 1 - 8</h4>
            </div>
            <div className="text-[9px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-md uppercase">
              {machinesRunning}/8 Active
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2.5">
            {runningGridData.map((item) => (
              <motion.div 
                key={item.name} 
                whileHover={item.active ? { scale: 1.05 } : {}}
                whileTap={item.active ? { scale: 0.95 } : {}}
                onClick={() => item.active && setDetailMachine(item)}
                className={cn(
                  "flex flex-col items-center justify-center p-3.5 rounded-[22px] border transition-all relative group",
                  item.active 
                    ? "bg-white border-green-100 shadow-sm cursor-pointer hover:border-green-300 hover:shadow-md" 
                    : "bg-gray-50 border-gray-50 opacity-40 grayscale"
                )}
              >
                {item.active && (
                  <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-green-500 rounded-full" />
                )}
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mb-1.5 group-hover:text-slate-600 transition-colors">{item.name}</p>
                <div className="flex flex-col items-center">
                  <p className={cn(
                      "text-[16px] font-black leading-none tracking-tight",
                      item.active ? "text-slate-800" : "text-slate-300"
                    )}
                  >
                    {item.yield.toFixed(1)}
                    <span className="text-[9px] font-bold ml-0.5">%</span>
                  </p>
                  {item.active && (
                    <div className="flex items-center gap-0.5 mt-1.5 text-[8px] font-black text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded-full">
                      <span>{item.output.toFixed(1)}</span>
                      <span className="font-bold opacity-60 ml-0.5">M3</span>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Section 2: Main Units List */}
        <div className="p-6 bg-slate-50/20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="bg-blue-50 p-1.5 rounded-lg">
                <LayoutGrid id="grid-icon-new" className="text-blue-600" size={14} />
              </div>
              <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Main Station Status</h4>
            </div>
            <div className="bg-blue-100 text-blue-600 text-[9px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              High Capacity
            </div>
          </div>
          
          <div className="space-y-3">
            {mainMachines.map((item) => (
              <motion.div 
                key={item.id} 
                whileHover={item.active ? { x: 4, backgroundColor: "#fff" } : {}}
                whileTap={item.active ? { scale: 0.98 } : {}}
                onClick={() => item.active && setDetailMachine(item)}
                className={cn(
                  "flex items-center justify-between p-4 rounded-[24px] border transition-all",
                  item.active 
                    ? "bg-white border-gray-100 shadow-sm cursor-pointer hover:border-gray-200" 
                    : "bg-gray-50 border-gray-50 opacity-40 grayscale"
                )}
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    item.bg, 
                    item.color, 
                    "p-3 rounded-2xl font-black text-sm w-12 h-12 flex items-center justify-center shadow-inner border border-white/50"
                  )}>
                    {item.id}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-black text-slate-800 uppercase tracking-tight">{item.name}</p>
                      {item.active && <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />}
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                      {item.line}
                      <span className="w-1 h-1 bg-slate-200 rounded-full" />
                      Status: {item.active ? "Active" : "Down"}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex flex-col items-end">
                    <span className="text-[9px] font-black text-slate-400 uppercase mb-1">Total Output</span>
                    <p className="text-xl font-black text-slate-900 leading-none tracking-tighter">
                      {item.output.toLocaleString("id-ID")}
                      <span className="text-[10px] font-bold ml-1 opacity-40">M3</span>
                    </p>
                  </div>
                  <div className={cn(
                    "mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black",
                    item.active ? "bg-green-50 text-green-600 ring-1 ring-green-500/10" : "bg-gray-100 text-gray-400"
                  )}>
                    {item.yield.toFixed(2)}% YIELD
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
              className="bg-white w-full max-w-[320px] rounded-[28px] overflow-hidden shadow-2xl cursor-default"
            >
              <div className="p-5">
                <div className="flex justify-between items-center mb-5">
                  <div className="flex items-center gap-2.5">
                    <div className="bg-purple-200 p-2.5 rounded-2xl text-purple-900">
                      <Activity size={20} />
                    </div>
                    <div>
                      <h4 className="text-lg font-black text-gray-800 leading-none">{detailMachine.name}</h4>
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Detail Performa Mesin</p>
                    </div>
                  </div>
                  <motion.button 
                    whileTap={{ scale: 0.8, backgroundColor: "#f3f4f6" }}
                    onClick={() => setDetailMachine(null)}
                    className="p-2.5 bg-gray-100 hover:bg-gray-200 rounded-2xl transition-all"
                  >
                    <X size={20} className="text-gray-600" />
                  </motion.button>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div className="bg-blue-50 p-2 rounded-2xl border border-blue-100">
                    <p className="text-[8px] font-bold text-blue-400 uppercase tracking-widest mb-0.5">Total Input</p>
                    <p className="text-lg font-black text-blue-700">{detailMachine.input.toFixed(2)} <span className="text-[8px] font-normal">M3</span></p>
                  </div>
                  <div className="bg-green-50 p-2 rounded-2xl border border-green-100">
                    <p className="text-[8px] font-bold text-green-400 uppercase tracking-widest mb-0.5">Total Output</p>
                    <p className="text-lg font-black text-green-700">{detailMachine.output.toFixed(2)} <span className="text-[8px] font-normal">M3</span></p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-2">
                  <div className="bg-gray-50 p-1.5 rounded-xl border border-gray-100 text-center">
                    <p className="text-[7px] font-bold text-gray-400 uppercase tracking-tighter mb-0.5">Utama</p>
                    <p className="text-[10px] font-black text-gray-800">{detailMachine.utama.toFixed(2)}</p>
                  </div>
                  <div className="bg-gray-50 p-1.5 rounded-xl border border-gray-100 text-center">
                    <p className="text-[7px] font-bold text-gray-400 uppercase tracking-tighter mb-0.5">Turunan</p>
                    <p className="text-[10px] font-black text-gray-800">{detailMachine.turunan.toFixed(2)}</p>
                  </div>
                  <div className="bg-gray-50 p-1.5 rounded-xl border border-gray-100 text-center">
                    <p className="text-[7px] font-bold text-gray-400 uppercase tracking-tighter mb-0.5">Lokal</p>
                    <p className="text-[10px] font-black text-gray-800">{detailMachine.lokal.toFixed(2)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="bg-purple-900 p-3 rounded-[20px] text-white shadow-lg shadow-purple-200">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-[8px] font-bold text-purple-200 uppercase tracking-widest">Utama</p>
                      <TrendingUp size={10} className="text-purple-300" />
                    </div>
                    <div className="flex items-baseline gap-0.5">
                      <p className="text-xl font-black tracking-tighter">
                        {detailMachine.yield.toFixed(2)}
                        <span className="text-[10px] font-bold ml-0.5">%</span>
                      </p>
                    </div>
                    <p className="text-[7px] font-medium text-purple-300 mt-1 leading-tight">Utama / Input</p>
                  </div>

                  <div className="bg-indigo-900 p-3 rounded-[20px] text-white shadow-lg shadow-indigo-200">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-[8px] font-bold text-indigo-200 uppercase tracking-widest">Total</p>
                      <Scale size={10} className="text-indigo-300" />
                    </div>
                    <div className="flex items-baseline gap-0.5">
                      <p className="text-xl font-black tracking-tighter">
                        {(detailMachine.input > 0 ? (detailMachine.output / detailMachine.input) * 100 : 0).toFixed(2)}
                        <span className="text-[10px] font-bold ml-0.5">%</span>
                      </p>
                    </div>
                    <p className="text-[7px] font-medium text-indigo-300 mt-1 leading-tight">Total / Input</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-1 bg-green-500 rounded-full" />
                      <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Status Mesin</span>
                    </div>
                    <span className="text-[9px] font-black text-green-600 uppercase tracking-widest">Running</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-1 bg-purple-500 rounded-full" />
                      <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Tanggal Data</span>
                    </div>
                    <span className="text-[9px] font-black text-gray-800 uppercase tracking-widest">
                      {new Date(selectedDate).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>

                <motion.button 
                  whileTap={{ scale: 0.96, y: 2 }}
                  onClick={() => setDetailMachine(null)}
                  className="w-full mt-3 py-2.5 bg-gray-900 text-white rounded-xl font-black uppercase tracking-widest text-[9px] hover:bg-gray-800 transition-all shadow-lg shadow-gray-200 active:shadow-none"
                >
                  Tutup Detail
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>



      {/* Reset Data Section */}
      <div className="mt-8 pt-8 border-t border-gray-100">
        <button 
          onClick={() => {
            if (window.confirm("Hapus semua data lokal dan sinkronisasi ulang dari awal?")) {
              localStorage.removeItem("rendemen_history");
              localStorage.removeItem("rendemen_last_sync");
              window.location.reload();
            }
          }}
          className="w-full py-3 px-4 bg-red-50 text-red-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-100 transition-all flex items-center justify-center gap-2"
        >
          <RefreshCw size={14} />
          Reset Data Lokal & Refresh
        </button>
        <p className="text-[8px] text-gray-400 text-center mt-2 uppercase font-bold tracking-tighter">
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
    <div className={cn("p-4 rounded-3xl shadow-lg relative overflow-hidden bg-gradient-to-br", gradient)}>
      <div className="flex justify-between items-start mb-2">
        <p className="text-[10px] font-bold text-white/80 uppercase tracking-wider">{label}</p>
        <div className={cn("p-2 rounded-xl backdrop-blur-md", iconBg)}>
          {icon}
        </div>
      </div>
      <div className="mt-1">
        <p className="text-3xl font-black text-white tracking-tight">{value}</p>
        <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest">{unit}</p>
      </div>
      {subLabel && (
        <p className="text-[10px] font-bold text-white/60 mt-2 uppercase">{subLabel}</p>
      )}
    </div>
  );
}
