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
  Info,
  Activity
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

  // Handle back button to close modal
  React.useEffect(() => {
    if (detailMachine) {
      const handlePopState = () => {
        setDetailMachine(null);
      };
      
      // Push a dummy state so the back button can be intercepted
      window.history.pushState({ modalOpen: true }, "");
      window.addEventListener("popstate", handlePopState);
      
      return () => {
        window.removeEventListener("popstate", handlePopState);
      };
    }
  }, [detailMachine]);

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
    const tOutput = machineEntries.reduce((acc, curr) => acc + curr.output, 0);
    const aYield = tInput > 0 ? (tUtama / tInput) * 100 : 0;

    return {
      ...m,
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
            <div className="bg-purple-50 p-2 rounded-lg text-purple-500">
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
                  ? "bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-100" 
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
          gradient="from-blue-500 to-blue-600"
          iconBg="bg-blue-400/50"
        />
        <StatCard 
          label="Total Output"
          value={totalOutput.toLocaleString("id-ID")}
          unit="M3"
          icon={<Upload className="text-white" size={24} />}
          gradient="from-green-500 to-green-600"
          iconBg="bg-green-400/50"
        />
        <StatCard 
          label="Rendemen Utama"
          value={avgRendemen.toFixed(2)}
          unit="%"
          subLabel={selectedMachine === "ALL" ? "BS 1 - 8" : selectedMachine}
          icon={<TrendingUp className="text-white" size={24} />}
          gradient="from-purple-500 to-purple-600"
          iconBg="bg-purple-400/50"
        />
        <StatCard 
          label={selectedMachine === "ALL" ? "Mesin Berjalan" : "Status Mesin"}
          value={selectedMachine === "ALL" ? machinesRunning.toString() : (totalOutput > 0 ? "1" : "0")}
          unit={selectedMachine === "ALL" ? "Unit" : "Active"}
          icon={<Zap className="text-white" size={24} />}
          gradient="from-orange-500 to-orange-600"
          iconBg="bg-orange-400/50"
        />
      </div>

      {/* Mesin Berjalan Section */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="bg-yellow-50 p-2 rounded-xl">
              <Zap className="text-yellow-500 fill-yellow-500" size={20} />
            </div>
            <h3 className="font-bold text-gray-800">Mesin Berjalan</h3>
          </div>
          <div className="flex items-center gap-1.5 bg-green-50 px-3 py-1 rounded-full">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-black text-green-600 uppercase tracking-wider">{machinesRunning} Active</span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {runningGridData.map((item) => (
            <motion.div 
              key={item.name} 
              whileHover={item.active ? { scale: 1.02 } : {}}
              whileTap={item.active ? { scale: 0.98 } : {}}
              onClick={() => item.active && setDetailMachine(item)}
              className={cn(
                "flex flex-col items-center justify-center p-3 rounded-2xl border transition-all relative overflow-hidden",
                item.active 
                  ? "bg-white border-green-100 shadow-sm cursor-pointer hover:shadow-md" 
                  : "bg-gray-50 border-gray-50 opacity-50"
              )}
            >
              {item.active && (
                <div className="absolute top-0 right-0 w-6 h-6 bg-green-500/10 rounded-bl-full flex items-center justify-center">
                  <div className="w-1 h-1 bg-green-500 rounded-full" />
                </div>
              )}
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter mb-1">{item.name}</p>
              <div className="flex flex-col items-center">
                <motion.p 
                  initial={{ scale: 1 }}
                  animate={item.active ? { scale: [1, 1.05, 1] } : { scale: 1 }}
                  transition={{ 
                    duration: 3, 
                    repeat: Infinity, 
                    ease: "easeInOut" 
                  }}
                  className={cn(
                    "text-[14px] font-black leading-none",
                    item.active ? "text-gray-800" : "text-gray-300"
                  )}
                >
                  {item.yield.toFixed(1)}
                  <span className="text-[8px] font-bold ml-0.5">%</span>
                </motion.p>
                {item.active && (
                  <p className="text-[8px] font-bold text-gray-400 mt-1">
                    {item.output.toFixed(1)} <span className="font-normal">M3</span>
                  </p>
                )}
              </div>
            </motion.div>
          ))}
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
              initial={{ opacity: 0, scale: 0.8, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 40 }}
              transition={{ 
                type: "spring",
                stiffness: 300,
                damping: 25
              }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl cursor-default"
            >
              <div className="p-6">
                <div className="flex items-center mb-6">
                  <div className="flex items-center gap-3">
                    <div className="bg-purple-100 p-3 rounded-2xl text-purple-600">
                      <Activity size={24} />
                    </div>
                    <div>
                      <h4 className="text-xl font-black text-gray-800 leading-none">{detailMachine.name}</h4>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Detail Performa Mesin</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-blue-50 p-4 rounded-3xl border border-blue-100">
                    <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">Total Input</p>
                    <p className="text-2xl font-black text-blue-700">{detailMachine.input.toFixed(2)} <span className="text-xs font-normal">M3</span></p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-3xl border border-green-100">
                    <p className="text-[10px] font-bold text-green-400 uppercase tracking-widest mb-1">Total Output</p>
                    <p className="text-2xl font-black text-green-700">{detailMachine.output.toFixed(2)} <span className="text-xs font-normal">M3</span></p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100 text-center">
                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter mb-1">Utama</p>
                    <p className="text-sm font-black text-gray-800">{detailMachine.utama.toFixed(2)}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100 text-center">
                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter mb-1">Turunan</p>
                    <p className="text-sm font-black text-gray-800">{detailMachine.turunan.toFixed(2)}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100 text-center">
                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter mb-1">Lokal</p>
                    <p className="text-sm font-black text-gray-800">{detailMachine.lokal.toFixed(2)}</p>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="bg-purple-600 p-5 rounded-[28px] text-white shadow-lg shadow-purple-200">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-[10px] font-bold text-purple-100 uppercase tracking-widest">Rendemen Utama</p>
                      <TrendingUp size={14} className="text-purple-200" />
                    </div>
                    <div className="flex items-baseline gap-1">
                      <p className="text-4xl font-black tracking-tighter">
                        {detailMachine.yield.toFixed(2)}
                        <span className="text-lg font-bold ml-0.5">%</span>
                      </p>
                    </div>
                    <p className="text-[9px] font-medium text-purple-200 mt-1">Berdasarkan Utama / Input</p>
                  </div>

                  <div className="bg-indigo-600 p-5 rounded-[28px] text-white shadow-lg shadow-indigo-200">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-[10px] font-bold text-indigo-100 uppercase tracking-widest">Rendemen Total</p>
                      <Scale size={14} className="text-indigo-200" />
                    </div>
                    <div className="flex items-baseline gap-1">
                      <p className="text-4xl font-black tracking-tighter">
                        {(detailMachine.input > 0 ? (detailMachine.output / detailMachine.input) * 100 : 0).toFixed(2)}
                        <span className="text-lg font-bold ml-0.5">%</span>
                      </p>
                    </div>
                    <p className="text-[9px] font-medium text-indigo-200 mt-1">Berdasarkan Total Output / Input</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Status Mesin</span>
                    </div>
                    <span className="text-xs font-black text-green-600 uppercase tracking-widest">Running</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-purple-500 rounded-full" />
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Tanggal Data</span>
                    </div>
                    <span className="text-xs font-black text-gray-800 uppercase tracking-widest">
                      {new Date(selectedDate).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>

                <motion.button 
                  whileTap={{ scale: 0.96, y: 2 }}
                  onClick={() => setDetailMachine(null)}
                  className="w-full mt-6 py-4 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-gray-800 transition-all shadow-lg shadow-gray-200 active:shadow-none"
                >
                  Tutup Detail
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Production Stations Section */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="bg-blue-50 p-2 rounded-xl">
              <LayoutGrid className="text-blue-500" size={20} />
            </div>
            <h3 className="font-bold text-gray-800">Status Produksi</h3>
          </div>
          <div className="bg-blue-100 text-blue-600 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
            Main Units
          </div>
        </div>
        
        <div className="grid grid-cols-1 gap-3">
          {mainMachines.map((item) => (
            <div key={item.id} className={cn(
              "flex items-center justify-between p-4 rounded-2xl border transition-all",
              item.active ? "bg-white border-gray-100 shadow-sm" : "bg-gray-50 border-gray-50 opacity-60"
            )}>
              <div className="flex items-center gap-4">
                <div className={cn(
                  item.bg, 
                  item.color, 
                  "p-3 rounded-xl font-black text-xs w-12 h-12 flex items-center justify-center shadow-sm"
                )}>
                  {item.id}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-black text-gray-800">{item.name}</p>
                    {item.active && <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />}
                  </div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{item.line}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-bold text-gray-400 uppercase mb-0.5">Output</span>
                  <p className="text-lg font-black text-gray-900 leading-none">
                    {item.output.toLocaleString("id-ID")}
                    <span className="text-[10px] font-normal ml-1">M3</span>
                  </p>
                </div>
                <div className={cn(
                  "mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black",
                  item.active ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-400"
                )}>
                  {item.yield.toFixed(2)}% YIELD
                </div>
              </div>
            </div>
          ))}
        </div>
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
