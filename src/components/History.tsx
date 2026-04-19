import React, { useState } from "react";
import { Calendar, TrendingUp, ChevronRight, BarChart3, Clock, Filter, Table, ChevronDown, ChevronUp } from "lucide-react";
import { Calculation } from "../App";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";

interface HistoryProps {
  history: Calculation[];
  selectedDate: string;
  onDelete: (id: string) => void;
}

type Period = "daily" | "weekly" | "monthly" | "quarterly";

const TARGET_MACHINES = [
  "BS 1", "BS 2", "BS 3", "BS 4", "BS 5", "BS 6", "BS 7", "BS 8",
  "PONI A", "PONI B",
  "BREAK"
];

interface MachineCardProps {
  key?: string | number;
  summary: any;
  index: number;
}

function DetailTable({ data }: { data: Calculation[] }) {
  return (
    <div className="overflow-x-auto bg-slate-950/40 rounded-2xl border border-slate-800 shadow-sm no-scrollbar">
      <table className="w-full text-[10px] text-left border-collapse">
        <thead className="bg-slate-900 text-slate-500 uppercase font-black tracking-tighter sticky top-0 z-10">
          <tr>
            <th className="px-3 py-3 border-b border-slate-800 whitespace-nowrap">Tgl</th>
            <th className="px-3 py-3 border-b border-slate-800 whitespace-nowrap">Mesin</th>
            <th className="px-3 py-3 border-b border-slate-800 whitespace-nowrap">In (M3)</th>
            <th className="px-3 py-3 border-b border-slate-800 whitespace-nowrap">Utm</th>
            <th className="px-3 py-3 border-b border-slate-800 whitespace-nowrap">Y-P</th>
            <th className="px-3 py-3 border-b border-slate-800 whitespace-nowrap">Trn</th>
            <th className="px-3 py-3 border-b border-slate-800 whitespace-nowrap">Y-S</th>
            <th className="px-3 py-3 border-b border-slate-800 whitespace-nowrap">Lkl</th>
            <th className="px-3 py-3 border-b border-slate-800 whitespace-nowrap">Tot</th>
            <th className="px-3 py-3 border-b border-slate-800 whitespace-nowrap">Y-T</th>
            <th className="px-3 py-3 border-b border-slate-800 whitespace-nowrap">Point</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/50">
          {data.map((item) => (
            <tr key={item.id} className="hover:bg-emerald-900/10 transition-colors">
              <td className="px-3 py-2.5 font-bold whitespace-nowrap text-slate-300">
                {new Date(item.date).toLocaleDateString("id-ID", { day: '2-digit', month: '2-digit' })}
              </td>
              <td className="px-3 py-2.5 font-black text-emerald-400 whitespace-nowrap">{item.machine}</td>
              <td className="px-3 py-2.5 text-slate-400">{item.input.toFixed(2)}</td>
              <td className="px-3 py-2.5 text-slate-400">{item.utama.toFixed(2)}</td>
              <td className="px-3 py-2.5 font-bold text-slate-200">{(item.yield_primary * 100).toFixed(1)}%</td>
              <td className="px-3 py-2.5 text-slate-400">{item.turunan.toFixed(2)}</td>
              <td className="px-3 py-2.5 text-slate-400">{(item.yield_secondary * 100).toFixed(1)}%</td>
              <td className="px-3 py-2.5 text-slate-400">{item.lokal.toFixed(2)}</td>
              <td className="px-3 py-2.5 font-bold text-slate-200">{item.output.toFixed(2)}</td>
              <td className="px-3 py-2.5 font-black text-emerald-500">{(item.yield_total * 100).toFixed(1)}%</td>
              <td className="px-3 py-2.5 text-slate-200 font-mono">{(item.achievement * 100).toFixed(0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MachineCard({ summary, index }: MachineCardProps) {
  const avgYield = summary.totalInput > 0 ? (summary.totalUtama / summary.totalInput) * 100 : 0;
  const hasData = summary.count > 0;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className={cn(
        "bg-slate-900 p-5 rounded-3xl shadow-sm border transition-all relative overflow-hidden",
        hasData ? "border-slate-800 hover:border-emerald-500/30" : "border-slate-900 opacity-60"
      )}
    >
      {!hasData && (
        <div className="absolute top-3 right-4 bg-slate-800 px-2 py-0.5 rounded text-[8px] font-bold text-slate-600 uppercase border border-slate-700">
          No Data
        </div>
      )}
      
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-3 rounded-2xl font-black text-sm w-12 h-12 flex items-center justify-center border",
            hasData ? "bg-slate-800 text-emerald-400 border-slate-700" : "bg-slate-950 text-slate-700 border-slate-900"
          )}>
            {summary.machine.split(" ").pop()}
          </div>
          <div>
            <p className="text-sm font-black text-slate-100">{summary.machine}</p>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{summary.line}</p>
          </div>
        </div>
        {hasData && summary.latestDate && (
          <div className="text-right">
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Terakhir</p>
            <p className="text-[10px] font-black text-slate-400">
              {new Date(summary.latestDate).toLocaleDateString("id-ID", { day: 'numeric', month: 'short' })}
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col">
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Total Input</p>
          <p className="text-sm font-black text-slate-100">{summary.totalInput.toLocaleString("id-ID")} <span className="text-[10px] font-normal opacity-50">M3</span></p>
        </div>
        <div className="flex flex-col">
          <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Avg Yield</p>
          <p className="text-sm font-black text-emerald-400">{avgYield.toFixed(2)}%</p>
        </div>
        <div className="flex flex-col">
          <p className="text-[9px] font-bold text-amber-600 uppercase tracking-wider mb-1">Total Output</p>
          <p className="text-sm font-black text-amber-500">{summary.totalOutput.toLocaleString("id-ID")} <span className="text-[10px] font-normal opacity-50">M3</span></p>
        </div>
      </div>

      {hasData && (
        <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <TrendingUp size={12} className="text-emerald-500" />
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              {summary.count} Kali Produksi
            </p>
          </div>
          <ChevronRight size={16} className="text-slate-700" />
        </div>
      )}
    </motion.div>
  );
}

export default function History({ history, selectedDate }: HistoryProps) {
  const [period, setPeriod] = useState<Period>("weekly");
  const [showDetailTable, setShowDetailTable] = useState(false);

  const { machineGroups, filteredHistory } = React.useMemo(() => {
    // Use selectedDate as the reference point
    const refDate = new Date(selectedDate);
    refDate.setHours(23, 59, 59, 999);
    
    let startDate = new Date(selectedDate);
    startDate.setHours(0, 0, 0, 0);

    if (period === "daily") {
      // For daily, we only want the selected date
    } else if (period === "weekly") {
      startDate.setDate(startDate.getDate() - 6);
    } else if (period === "monthly") {
      startDate.setMonth(startDate.getMonth() - 1);
    } else if (period === "quarterly") {
      startDate.setMonth(startDate.getMonth() - 3);
    }

    // Filter data that is within the period leading up to selectedDate
    const filtered = history.filter(calc => {
      const calcDate = new Date(calc.date);
      return calcDate >= startDate && calcDate <= refDate;
    });

    const summaryMap = new Map<string, {
      machine: string;
      line: string;
      totalInput: number;
      totalUtama: number;
      totalOutput: number;
      count: number;
      latestDate: string | null;
    }>();

    // Initialize with target machines
    TARGET_MACHINES.forEach(m => {
      summaryMap.set(m, {
        machine: m,
        line: m.startsWith("BS") ? "BS LINE" : (m === "BREAKDOWN" || m === "BREAK" ? "SYSTEM" : "PONI LINE"),
        totalInput: 0,
        totalUtama: 0,
        totalOutput: 0,
        count: 0,
        latestDate: null
      });
    });

    filtered.forEach(calc => {
      const machineKey = calc.machine.toUpperCase().replace(/\s/g, "");
      // Map variations like "BS 1" to "BS1" for lookup
      const targetKey = TARGET_MACHINES.find(tm => tm.replace(/\s/g, "") === machineKey);
      
      if (targetKey) {
        const existing = summaryMap.get(targetKey);
        if (existing) {
          existing.totalInput += calc.input;
          existing.totalUtama += calc.utama;
          existing.totalOutput += calc.output;
          existing.count += 1;
          if (!existing.latestDate || new Date(calc.date) > new Date(existing.latestDate)) {
            existing.latestDate = calc.date;
          }
        }
      }
    });

    const allSummaries = Array.from(summaryMap.values());
    
    return {
      machineGroups: {
        poni: allSummaries.filter(s => s.machine.startsWith("PONI")),
        bs: allSummaries.filter(s => s.machine.startsWith("BS")),
        breakdown: allSummaries.filter(s => s.machine === "BREAKDOWN" || s.machine === "BREAK")
      },
      filteredHistory: filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    };
  }, [history, period]);

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-600 space-y-6">
        <div className="bg-slate-900 p-8 rounded-full shadow-inner border border-slate-800">
          <Calendar size={64} className="text-slate-800" />
        </div>
        <div className="text-center space-y-2">
          <p className="font-black text-slate-100 text-lg">Data Rekap Kosong</p>
          <p className="text-xs max-w-[200px] mx-auto leading-relaxed">
            Tekan tombol <span className="text-emerald-500 font-bold">Sinkronisasi</span> di pojok kanan atas untuk mengambil data dari Google Sheets.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="bg-slate-900 p-2 rounded-2xl shadow-sm border border-slate-800 flex gap-1">
        {(["daily", "weekly", "monthly", "quarterly"] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={cn(
              "flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              period === p 
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/20" 
                : "text-slate-500 hover:bg-slate-800"
            )}
          >
            {p === "daily" ? "Harian" : p === "weekly" ? "Mingguan" : p === "monthly" ? "Bulanan" : "Quarterly"}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="bg-emerald-900/30 p-2 rounded-lg text-emerald-400 border border-emerald-900/30">
            <BarChart3 size={18} />
          </div>
          <div>
            <h2 className="text-lg font-black tracking-tight leading-none text-slate-100">Rekap Performa</h2>
            <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">
              Ref: {new Date(selectedDate).toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-600 uppercase tracking-widest">
          <Clock size={12} />
          <span>{period === "daily" ? "1 Hari" : period === "weekly" ? "7 Hari" : period === "monthly" ? "30 Hari" : "90 Hari"}</span>
        </div>
      </div>

      {/* Detail Table Toggle */}
      <div className="px-1">
        <button
          onClick={() => setShowDetailTable(!showDetailTable)}
          className={cn(
            "w-full flex items-center justify-between p-4 rounded-2xl border transition-all",
            showDetailTable 
              ? "bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-950/40" 
              : "bg-slate-900 text-slate-300 border-slate-800 hover:border-emerald-500/30"
          )}
        >
          <div className="flex items-center gap-3">
            <Table size={18} className={showDetailTable ? "text-white" : "text-emerald-400"} />
            <span className="text-xs font-black uppercase tracking-widest">Tampilkan Rekap Detail</span>
          </div>
          {showDetailTable ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>

        <AnimatePresence>
          {showDetailTable && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden mt-3"
            >
              <DetailTable data={filteredHistory} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="space-y-8">
        {/* BS Section */}
        <section className="space-y-3">
          <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] px-1">BS Line 1 - 8</h3>
          <div className="grid grid-cols-1 gap-3">
            {machineGroups.bs.map((summary, index) => (
              <MachineCard key={summary.machine} summary={summary} index={index} />
            ))}
          </div>
        </section>

        {/* Poni Section */}
        <section className="space-y-3">
          <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] px-1">Main Stations</h3>
          <div className="grid grid-cols-1 gap-3">
            {machineGroups.poni.map((summary, index) => (
              <MachineCard key={summary.machine} summary={summary} index={index + 8} />
            ))}
          </div>
        </section>

        {/* Breakdown Section */}
        <section className="space-y-3">
          <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] px-1">System Status</h3>
          <div className="grid grid-cols-1 gap-3">
            {machineGroups.breakdown.map((summary, index) => (
              <MachineCard key={summary.machine} summary={summary} index={index + 10} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
