import React, { useState } from "react";
import { Calendar, TrendingUp, ChevronRight, BarChart3, Clock, Filter, Table, ChevronDown, ChevronUp } from "lucide-react";
import { Calculation } from "../App";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";

interface HistoryProps {
  history: Calculation[];
  onDelete: (id: string) => void;
}

type Period = "weekly" | "monthly" | "quarterly";

const TARGET_MACHINES = [
  "PONI A", "PONI B",
  "BS 1", "BS 2", "BS 3", "BS 4", "BS 5", "BS 6", "BS 7", "BS 8",
  "BREAKDOWN"
];

interface MachineCardProps {
  key?: string | number;
  summary: any;
  index: number;
}

function DetailTable({ data }: { data: Calculation[] }) {
  return (
    <div className="overflow-x-auto bg-white rounded-2xl border border-gray-100 shadow-sm no-scrollbar">
      <table className="w-full text-[10px] text-left border-collapse">
        <thead className="bg-gray-50 text-gray-400 uppercase font-black tracking-tighter sticky top-0 z-10">
          <tr>
            <th className="px-3 py-3 border-b border-gray-100 whitespace-nowrap">Tgl</th>
            <th className="px-3 py-3 border-b border-gray-100 whitespace-nowrap">Mesin</th>
            <th className="px-3 py-3 border-b border-gray-100 whitespace-nowrap">In (T)</th>
            <th className="px-3 py-3 border-b border-gray-100 whitespace-nowrap">Utm</th>
            <th className="px-3 py-3 border-b border-gray-100 whitespace-nowrap">Y-P</th>
            <th className="px-3 py-3 border-b border-gray-100 whitespace-nowrap">Trn</th>
            <th className="px-3 py-3 border-b border-gray-100 whitespace-nowrap">Y-S</th>
            <th className="px-3 py-3 border-b border-gray-100 whitespace-nowrap">Lkl</th>
            <th className="px-3 py-3 border-b border-gray-100 whitespace-nowrap">Tot</th>
            <th className="px-3 py-3 border-b border-gray-100 whitespace-nowrap">Y-T</th>
            <th className="px-3 py-3 border-b border-gray-100 whitespace-nowrap">Ach</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {data.map((item) => (
            <tr key={item.id} className="hover:bg-indigo-50/30 transition-colors">
              <td className="px-3 py-2.5 font-bold whitespace-nowrap">
                {new Date(item.date).toLocaleDateString("id-ID", { day: '2-digit', month: '2-digit' })}
              </td>
              <td className="px-3 py-2.5 font-black text-indigo-600 whitespace-nowrap">{item.machine}</td>
              <td className="px-3 py-2.5">{item.input.toFixed(2)}</td>
              <td className="px-3 py-2.5">{item.utama.toFixed(2)}</td>
              <td className="px-3 py-2.5 font-bold">{(item.yield_primary * 100).toFixed(1)}%</td>
              <td className="px-3 py-2.5">{item.turunan.toFixed(2)}</td>
              <td className="px-3 py-2.5">{(item.yield_secondary * 100).toFixed(1)}%</td>
              <td className="px-3 py-2.5">{item.lokal.toFixed(2)}</td>
              <td className="px-3 py-2.5 font-bold">{item.output.toFixed(2)}</td>
              <td className="px-3 py-2.5 font-black text-green-600">{(item.yield_total * 100).toFixed(1)}%</td>
              <td className="px-3 py-2.5">{(item.achievement * 100).toFixed(1)}%</td>
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
        "bg-white p-5 rounded-3xl shadow-sm border transition-all relative overflow-hidden",
        hasData ? "border-gray-100 hover:border-indigo-200" : "border-gray-50 opacity-60"
      )}
    >
      {!hasData && (
        <div className="absolute top-3 right-4 bg-gray-100 px-2 py-0.5 rounded text-[8px] font-bold text-gray-400 uppercase">
          No Data
        </div>
      )}
      
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-3 rounded-2xl font-black text-sm w-12 h-12 flex items-center justify-center",
            hasData ? "bg-indigo-50 text-indigo-600" : "bg-gray-50 text-gray-300"
          )}>
            {summary.machine.split(" ").pop()}
          </div>
          <div>
            <p className="text-sm font-black text-gray-800">{summary.machine}</p>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{summary.line}</p>
          </div>
        </div>
        {hasData && summary.latestDate && (
          <div className="text-right">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Terakhir</p>
            <p className="text-[10px] font-black text-gray-600">
              {new Date(summary.latestDate).toLocaleDateString("id-ID", { day: 'numeric', month: 'short' })}
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col">
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Total Input</p>
          <p className="text-sm font-black">{summary.totalInput.toLocaleString("id-ID")} <span className="text-[10px] font-normal">T</span></p>
        </div>
        <div className="flex flex-col">
          <p className="text-[9px] font-bold text-indigo-600 uppercase tracking-wider mb-1">Avg Yield</p>
          <p className="text-sm font-black text-indigo-700">{avgYield.toFixed(2)}%</p>
        </div>
        <div className="flex flex-col">
          <p className="text-[9px] font-bold text-orange-600 uppercase tracking-wider mb-1">Total Output</p>
          <p className="text-sm font-black text-orange-700">{summary.totalOutput.toLocaleString("id-ID")} <span className="text-[10px] font-normal">T</span></p>
        </div>
      </div>

      {hasData && (
        <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <TrendingUp size={12} className="text-green-500" />
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              {summary.count} Kali Produksi
            </p>
          </div>
          <ChevronRight size={16} className="text-gray-300 group-hover:text-indigo-500 transition-colors" />
        </div>
      )}
    </motion.div>
  );
}

export default function History({ history }: HistoryProps) {
  const [period, setPeriod] = useState<Period>("weekly");
  const [showDetailTable, setShowDetailTable] = useState(false);

  const { machineGroups, filteredHistory } = React.useMemo(() => {
    const now = new Date();
    let startDate = new Date();

    if (period === "weekly") {
      startDate.setDate(now.getDate() - 7);
    } else if (period === "monthly") {
      startDate.setMonth(now.getMonth() - 1);
    } else if (period === "quarterly") {
      startDate.setMonth(now.getMonth() - 3);
    }

    const filtered = history.filter(calc => new Date(calc.date) >= startDate);

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
        line: m.startsWith("BS") ? "BS LINE" : (m === "BREAKDOWN" ? "SYSTEM" : "PONI LINE"),
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
        breakdown: allSummaries.filter(s => s.machine === "BREAKDOWN")
      },
      filteredHistory: filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    };
  }, [history, period]);

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400 space-y-6">
        <div className="bg-white p-8 rounded-full shadow-inner border border-gray-50">
          <Calendar size={64} className="text-gray-200" />
        </div>
        <div className="text-center space-y-2">
          <p className="font-black text-gray-900 text-lg">Data Rekap Kosong</p>
          <p className="text-xs max-w-[200px] mx-auto leading-relaxed">
            Tekan tombol <span className="text-indigo-600 font-bold">Sinkronisasi</span> di pojok kanan atas untuk mengambil data dari Google Sheets.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100 flex gap-1">
        {(["weekly", "monthly", "quarterly"] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={cn(
              "flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              period === p 
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" 
                : "text-gray-400 hover:bg-gray-50"
            )}
          >
            {p === "weekly" ? "Mingguan" : p === "monthly" ? "Bulanan" : "Quarterly"}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600">
            <BarChart3 size={18} />
          </div>
          <h2 className="text-lg font-black tracking-tight">Rekap Performa</h2>
        </div>
        <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
          <Clock size={12} />
          <span>{period === "weekly" ? "7 Hari" : period === "monthly" ? "30 Hari" : "90 Hari"}</span>
        </div>
      </div>

      {/* Detail Table Toggle */}
      <div className="px-1">
        <button
          onClick={() => setShowDetailTable(!showDetailTable)}
          className={cn(
            "w-full flex items-center justify-between p-4 rounded-2xl border transition-all",
            showDetailTable 
              ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100" 
              : "bg-white text-gray-700 border-gray-100 hover:border-indigo-200"
          )}
        >
          <div className="flex items-center gap-3">
            <Table size={18} className={showDetailTable ? "text-white" : "text-indigo-600"} />
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
        {/* Poni Section */}
        <section className="space-y-3">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">Main Stations</h3>
          <div className="grid grid-cols-1 gap-3">
            {machineGroups.poni.map((summary, index) => (
              <MachineCard key={summary.machine} summary={summary} index={index} />
            ))}
          </div>
        </section>

        {/* BS Section */}
        <section className="space-y-3">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">BS Line 1 - 8</h3>
          <div className="grid grid-cols-1 gap-3">
            {machineGroups.bs.map((summary, index) => (
              <MachineCard key={summary.machine} summary={summary} index={index} />
            ))}
          </div>
        </section>

        {/* Breakdown Section */}
        <section className="space-y-3">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">System Status</h3>
          <div className="grid grid-cols-1 gap-3">
            {machineGroups.breakdown.map((summary, index) => (
              <MachineCard key={summary.machine} summary={summary} index={index} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
