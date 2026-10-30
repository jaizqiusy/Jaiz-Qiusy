import React, { useState, useMemo, useRef } from "react";
import { RealtimeTodayData } from "../services/sheetService";
import { 
  RefreshCw, 
  Download, 
  TrendingUp, 
  Gauge, 
  Calendar, 
  Zap, 
  CheckCircle2, 
  Award, 
  Search, 
  BarChart2, 
  Table as TableIcon,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from "lucide-react";
import { cn } from "../lib/utils";
import { toJpeg } from "html-to-image";

interface RealtimeTodayProps {
  data: RealtimeTodayData[];
  onRefresh?: () => void;
  isSyncing?: boolean;
  lastSync?: string | null;
}

type SortField = "mesin" | "total" | "input" | "utama" | "rendUtama" | "turunan" | "rendTurunan" | "lokal" | "rendLokal" | "speed";

export default function RealtimeToday({
  data,
  onRefresh,
  isSyncing = false,
  lastSync
}: RealtimeTodayProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>("total");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  const exportRef = useRef<HTMLDivElement>(null);

  // Tanggal from data or fallback
  const displayDate = useMemo(() => {
    if (data.length > 0 && data[0].tanggal) {
      return data[0].tanggal;
    }
    return new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  }, [data]);

  // Helper to compute metrics with 62% assumed input log
  const getMetrics = (item: RealtimeTodayData) => {
    // Asumsi perhitungan input log = Output / 62% (0.62)
    const inputLog = item.inputAktual > 0 
      ? item.inputAktual 
      : (item.total > 0 ? item.total / 0.62 : 0);

    const rendUtama = inputLog > 0 ? (item.utama / inputLog) * 100 : 0;
    const rendTurunan = inputLog > 0 ? (item.turunan / inputLog) * 100 : 0;
    const rendLokal = inputLog > 0 ? (item.lokal / inputLog) * 100 : 0;
    const rendTotal = inputLog > 0 ? (item.total / inputLog) * 100 : 0;

    const utamaShare = item.total > 0 ? (item.utama / item.total) * 100 : 0;
    const turunanShare = item.total > 0 ? (item.turunan / item.total) * 100 : 0;
    const lokalShare = item.total > 0 ? (item.lokal / item.total) * 100 : 0;

    return {
      inputLog,
      rendUtama,
      rendTurunan,
      rendLokal,
      rendTotal,
      utamaShare,
      turunanShare,
      lokalShare
    };
  };

  // Aggregate summary metrics
  const summary = useMemo(() => {
    if (data.length === 0) {
      return {
        totalOutput: 0,
        totalUtama: 0,
        totalTurunan: 0,
        totalLokal: 0,
        totalInput: 0,
        rendUtama: 0,
        rendTurunan: 0,
        rendLokal: 0,
        rendTotal: 0,
        avgSpeed: 0,
        topMachine: null as RealtimeTodayData | null,
        machineCount: 0
      };
    }

    let totalOutput = 0;
    let totalUtama = 0;
    let totalTurunan = 0;
    let totalLokal = 0;
    let totalInput = 0;
    let sumSpeed = 0;
    let validSpeedCount = 0;
    let topMachine: RealtimeTodayData | null = null;

    data.forEach(item => {
      totalOutput += item.total;
      totalUtama += item.utama;
      totalTurunan += item.turunan;
      totalLokal += item.lokal;

      // Input log asumsi: Output / 62%
      const itemInput = item.inputAktual > 0 
        ? item.inputAktual 
        : (item.total > 0 ? item.total / 0.62 : 0);
      totalInput += itemInput;

      if (item.m3PerJam > 0) {
        sumSpeed += item.m3PerJam;
        validSpeedCount++;
      }
      if (!topMachine || item.total > topMachine.total) {
        topMachine = item;
      }
    });

    const rendUtama = totalInput > 0 ? (totalUtama / totalInput) * 100 : 0;
    const rendTurunan = totalInput > 0 ? (totalTurunan / totalInput) * 100 : 0;
    const rendLokal = totalInput > 0 ? (totalLokal / totalInput) * 100 : 0;
    const rendTotal = totalInput > 0 ? (totalOutput / totalInput) * 100 : 0;
    const avgSpeed = validSpeedCount > 0 ? sumSpeed / validSpeedCount : 0;

    return {
      totalOutput,
      totalUtama,
      totalTurunan,
      totalLokal,
      totalInput,
      rendUtama,
      rendTurunan,
      rendLokal,
      rendTotal,
      avgSpeed,
      topMachine,
      machineCount: data.length
    };
  }, [data]);

  // Filter and sort items
  const processedData = useMemo(() => {
    let result = [...data];

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(item => 
        item.mesin.toLowerCase().includes(q) ||
        item.total.toString().includes(q)
      );
    }

    result.sort((a, b) => {
      let valA = 0;
      let valB = 0;

      const mA = getMetrics(a);
      const mB = getMetrics(b);

      if (sortField === "total") {
        valA = a.total;
        valB = b.total;
      } else if (sortField === "input") {
        valA = mA.inputLog;
        valB = mB.inputLog;
      } else if (sortField === "speed") {
        valA = a.m3PerJam;
        valB = b.m3PerJam;
      } else if (sortField === "utama") {
        valA = a.utama;
        valB = b.utama;
      } else if (sortField === "rendUtama") {
        valA = mA.rendUtama;
        valB = mB.rendUtama;
      } else if (sortField === "turunan") {
        valA = a.turunan;
        valB = b.turunan;
      } else if (sortField === "rendTurunan") {
        valA = mA.rendTurunan;
        valB = mB.rendTurunan;
      } else if (sortField === "lokal") {
        valA = a.lokal;
        valB = b.lokal;
      } else if (sortField === "rendLokal") {
        valA = mA.rendLokal;
        valB = mB.rendLokal;
      } else if (sortField === "mesin") {
        return sortDirection === "asc"
          ? a.mesin.localeCompare(b.mesin, undefined, { numeric: true })
          : b.mesin.localeCompare(a.mesin, undefined, { numeric: true });
      }

      return sortDirection === "desc" ? valB - valA : valA - valB;
    });

    return result;
  }, [data, searchTerm, sortField, sortDirection]);

  // Max total for relative progress bar scaling
  const maxOutput = useMemo(() => {
    return Math.max(...data.map(d => d.total), 1);
  }, [data]);

  // Export to image
  const handleExportJPG = async () => {
    if (!exportRef.current || isExporting) return;
    try {
      setIsExporting(true);
      const dataUrl = await toJpeg(exportRef.current, {
        quality: 0.95,
        backgroundColor: "#0B132B"
      });
      const link = document.createElement("a");
      link.download = `Realtime-Setengah-Hari-${displayDate.replace(/\s+/g, "_")}.jpg`;
      link.href = dataUrl;
      link.click();
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    } catch (err) {
      console.error("Export JPG Error:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleHeaderSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === "desc" ? "asc" : "desc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown size={12} className="opacity-40 inline-block ml-1" />;
    }
    return sortDirection === "desc" 
      ? <ArrowDown size={12} className="text-emerald-400 inline-block ml-1" />
      : <ArrowUp size={12} className="text-emerald-400 inline-block ml-1" />;
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 py-3 space-y-3 pb-28">
      {/* Top Banner Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gradient-to-r from-[#0d1f38] via-[#11274c] to-[#0d1f38] text-white p-4 rounded-2xl border border-white/10 shadow-lg">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
              REALTIME SETENGAH HARI
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/10 text-white/90">
              <Calendar size={13} className="text-emerald-400" />
              {displayDate}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">
              Format Tabel Data
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <Zap className="text-amber-400 w-5 h-5 fill-amber-400" />
            Monitoring Output Setengah Hari
          </h1>
          <p className="text-xs text-white/60">
            Tabel rekapan data terhubung langsung dari Google Sheets lembar <code className="text-emerald-300 font-mono">realtime today</code>
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isSyncing}
              className={cn(
                "px-3 py-2 text-xs font-semibold rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all flex items-center gap-1.5 border border-white/10 shadow-sm",
                isSyncing && "opacity-75 cursor-not-allowed"
              )}
              title="Perbarui Data Realtime"
            >
              <RefreshCw size={14} className={cn(isSyncing && "animate-spin text-emerald-400")} />
              <span>{isSyncing ? "Menyinkronkan..." : "Perbarui"}</span>
            </button>
          )}

          <button
            onClick={handleExportJPG}
            disabled={isExporting}
            className="px-3 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white transition-all flex items-center gap-1.5 shadow-md border border-emerald-400/30"
            title="Download Laporan Format JPG"
          >
            {exportSuccess ? (
              <>
                <CheckCircle2 size={14} className="text-white" />
                <span>Tersimpan!</span>
              </>
            ) : (
              <>
                <Download size={14} className={cn(isExporting && "animate-bounce")} />
                <span>{isExporting ? "Ekspor..." : "Unduh JPG"}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Exportable Container */}
      <div ref={exportRef} className="space-y-3">
        {/* Assumption Notice Strip */}
        <div className="bg-gradient-to-r from-emerald-950/70 via-slate-900/70 to-emerald-950/70 border border-emerald-500/30 rounded-xl p-2.5 sm:px-3 text-xs shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="text-white/90 text-[11px] sm:text-xs">
              <strong className="text-emerald-300">Asumsi Log Input:</strong> Dihitung dari <strong>Output ÷ 62%</strong> (Output / 0.62) untuk setiap mesin. Rendemen Utama, Turunan, dan Lokal disesuaikan terhadap asumsi input tersebut.
            </span>
          </div>
          <span className="inline-flex items-center gap-1 font-mono text-[11px] font-black text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-lg shrink-0">
            Target Standar Total: 62.00%
          </span>
        </div>

        {/* Executive Summary Stats Bar (Integrated Tabular Summary, Not Card Grid) */}
        <div className="bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-md p-3 sm:p-4">
          <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <TableIcon size={15} className="text-emerald-400" />
              <span className="text-xs font-black uppercase tracking-wider text-slate-300">
                Ringkasan Rekapitulasi Output & Input Setengah Hari
              </span>
            </div>
            <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-800">
              {summary.machineCount} Mesin Terdata
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-center">
            {/* Metric 1: Total Output */}
            <div className="bg-slate-800/80 rounded-xl p-2.5 border border-slate-700/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">Total Output</span>
              <div className="font-mono font-black text-xl text-emerald-400 mt-0.5">
                {summary.totalOutput.toFixed(2)} <span className="text-xs font-semibold text-emerald-200">M³</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {summary.machineCount} Mesin Operasi
              </div>
            </div>

            {/* Metric 2: Asumsi Input Log */}
            <div className="bg-slate-800/80 rounded-xl p-2.5 border border-slate-700/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Asumsi Input Log</span>
              <div className="font-mono font-black text-xl text-white mt-0.5">
                {summary.totalInput.toFixed(2)} <span className="text-xs font-semibold text-slate-400">M³</span>
              </div>
              <div className="text-[10px] text-amber-300 font-bold mt-0.5">
                Rendemen: {summary.rendTotal.toFixed(2)}%
              </div>
            </div>

            {/* Metric 3: Utama */}
            <div className="bg-slate-800/80 rounded-xl p-2.5 border border-slate-700/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-300">Utama</span>
              <div className="font-mono font-black text-xl text-blue-400 mt-0.5">
                {summary.totalUtama.toFixed(2)} <span className="text-xs font-semibold text-blue-200">M³</span>
              </div>
              <div className="text-[10px] text-blue-300 font-bold mt-0.5">
                Rend: {summary.rendUtama.toFixed(2)}%
              </div>
            </div>

            {/* Metric 4: Turunan */}
            <div className="bg-slate-800/80 rounded-xl p-2.5 border border-slate-700/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300">Turunan</span>
              <div className="font-mono font-black text-xl text-purple-400 mt-0.5">
                {summary.totalTurunan.toFixed(2)} <span className="text-xs font-semibold text-purple-200">M³</span>
              </div>
              <div className="text-[10px] text-purple-300 font-bold mt-0.5">
                Rend: {summary.rendTurunan.toFixed(2)}%
              </div>
            </div>

            {/* Metric 5: Lokal */}
            <div className="bg-slate-800/80 rounded-xl p-2.5 border border-slate-700/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300">Lokal</span>
              <div className="font-mono font-black text-xl text-amber-400 mt-0.5">
                {summary.totalLokal.toFixed(2)} <span className="text-xs font-semibold text-amber-200">M³</span>
              </div>
              <div className="text-[10px] text-amber-300 font-bold mt-0.5">
                Rend: {summary.rendLokal.toFixed(2)}%
              </div>
            </div>

            {/* Metric 6: Speed Avg & Top */}
            <div className="bg-slate-800/80 rounded-xl p-2.5 border border-slate-700/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300">Rata Speed</span>
              <div className="font-mono font-black text-xl text-cyan-400 mt-0.5">
                {summary.avgSpeed.toFixed(2)} <span className="text-xs font-semibold text-cyan-200">M³/H</span>
              </div>
              <div className="text-[10px] text-slate-300 truncate mt-0.5">
                Top: {summary.topMachine ? `${summary.topMachine.mesin} (${summary.topMachine.total.toFixed(2)}m³)` : "-"}
              </div>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-2.5">
          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari mesin (cth: BS 1, BS 4)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-bold"
              >
                ×
              </button>
            )}
          </div>

          {/* Quick Sort Shortcuts */}
          <div className="flex items-center gap-1.5 text-xs w-full sm:w-auto justify-between sm:justify-end overflow-x-auto pb-1 sm:pb-0">
            <span className="text-slate-400 font-semibold text-[11px] whitespace-nowrap">Urutkan Cepat:</span>
            <div className="flex items-center bg-slate-100 border border-slate-200 rounded-xl p-0.5">
              <button
                onClick={() => handleHeaderSort("total")}
                className={cn(
                  "px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all whitespace-nowrap",
                  sortField === "total" ? "bg-emerald-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                )}
              >
                Output {sortField === "total" && (sortDirection === "desc" ? "↓" : "↑")}
              </button>
              <button
                onClick={() => handleHeaderSort("input")}
                className={cn(
                  "px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all whitespace-nowrap",
                  sortField === "input" ? "bg-emerald-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                )}
              >
                Input Log {sortField === "input" && (sortDirection === "desc" ? "↓" : "↑")}
              </button>
              <button
                onClick={() => handleHeaderSort("speed")}
                className={cn(
                  "px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all whitespace-nowrap",
                  sortField === "speed" ? "bg-emerald-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                )}
              >
                Speed {sortField === "speed" && (sortDirection === "desc" ? "↓" : "↑")}
              </button>
              <button
                onClick={() => handleHeaderSort("mesin")}
                className={cn(
                  "px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all whitespace-nowrap",
                  sortField === "mesin" ? "bg-emerald-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                )}
              >
                Mesin {sortField === "mesin" && (sortDirection === "desc" ? "↓" : "↑")}
              </button>
            </div>
          </div>
        </div>

        {/* PRIMARY DATA PRESENTATION: Full Table View */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white font-bold tracking-wider text-[11px] uppercase select-none border-b border-slate-800">
                  <th 
                    onClick={() => handleHeaderSort("mesin")}
                    className="py-3 px-3 cursor-pointer hover:bg-slate-800 transition-colors whitespace-nowrap"
                  >
                    Mesin {renderSortIcon("mesin")}
                  </th>
                  <th 
                    onClick={() => handleHeaderSort("total")}
                    className="py-3 px-2.5 text-right text-emerald-300 cursor-pointer hover:bg-slate-800 transition-colors whitespace-nowrap"
                  >
                    Output (M³) {renderSortIcon("total")}
                  </th>
                  <th 
                    onClick={() => handleHeaderSort("input")}
                    className="py-3 px-2.5 text-right text-slate-200 cursor-pointer hover:bg-slate-800 transition-colors whitespace-nowrap"
                    title="Asumsi Input Log = Output ÷ 62%"
                  >
                    Input Log (M³)* {renderSortIcon("input")}
                  </th>
                  <th 
                    onClick={() => handleHeaderSort("utama")}
                    className="py-3 px-2 text-right text-blue-300 cursor-pointer hover:bg-slate-800 transition-colors whitespace-nowrap"
                  >
                    Utama (M³) {renderSortIcon("utama")}
                  </th>
                  <th 
                    onClick={() => handleHeaderSort("rendUtama")}
                    className="py-3 px-2 text-right text-blue-300 cursor-pointer hover:bg-slate-800 transition-colors whitespace-nowrap"
                  >
                    Rend Utama {renderSortIcon("rendUtama")}
                  </th>
                  <th 
                    onClick={() => handleHeaderSort("turunan")}
                    className="py-3 px-2 text-right text-purple-300 cursor-pointer hover:bg-slate-800 transition-colors whitespace-nowrap"
                  >
                    Turunan (M³) {renderSortIcon("turunan")}
                  </th>
                  <th 
                    onClick={() => handleHeaderSort("rendTurunan")}
                    className="py-3 px-2 text-right text-purple-300 cursor-pointer hover:bg-slate-800 transition-colors whitespace-nowrap"
                  >
                    Rend Turunan {renderSortIcon("rendTurunan")}
                  </th>
                  <th 
                    onClick={() => handleHeaderSort("lokal")}
                    className="py-3 px-2 text-right text-amber-300 cursor-pointer hover:bg-slate-800 transition-colors whitespace-nowrap"
                  >
                    Lokal (M³) {renderSortIcon("lokal")}
                  </th>
                  <th 
                    onClick={() => handleHeaderSort("rendLokal")}
                    className="py-3 px-2 text-right text-amber-300 cursor-pointer hover:bg-slate-800 transition-colors whitespace-nowrap"
                  >
                    Rend Lokal {renderSortIcon("rendLokal")}
                  </th>
                  <th className="py-3 px-2.5 text-right text-emerald-300 whitespace-nowrap">
                    Rend Total
                  </th>
                  <th 
                    onClick={() => handleHeaderSort("speed")}
                    className="py-3 px-3 text-right text-cyan-300 cursor-pointer hover:bg-slate-800 transition-colors whitespace-nowrap"
                  >
                    Speed (M³/H) {renderSortIcon("speed")}
                  </th>
                  <th className="py-3 px-3 text-center text-slate-300 whitespace-nowrap min-w-[120px]">
                    Komposisi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {processedData.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-8 text-center text-slate-400 font-medium">
                      Tidak ada data realtime ditemukan.
                    </td>
                  </tr>
                ) : (
                  processedData.map((row, idx) => {
                    const m = getMetrics(row);
                    const isTop = row.total === summary.topMachine?.total && summary.totalOutput > 0;

                    return (
                      <tr 
                        key={row.mesin + idx}
                        className={cn(
                          "hover:bg-emerald-50/40 transition-colors font-medium",
                          idx % 2 === 1 ? "bg-slate-50/60" : "bg-white",
                          isTop && "bg-amber-50/30"
                        )}
                      >
                        {/* Mesin & Badge */}
                        <td className="py-2.5 px-3 font-black text-slate-800 flex items-center gap-1.5 whitespace-nowrap">
                          <span className={cn(
                            "w-6 h-6 rounded-lg text-white font-bold text-[11px] flex items-center justify-center shrink-0",
                            isTop ? "bg-amber-500 shadow-xs" : "bg-slate-800"
                          )}>
                            {row.mesin.replace("BS", "").replace(".", "").trim()}
                          </span>
                          <span className="font-bold">{row.mesin}</span>
                          {isTop && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 text-[9px] font-black uppercase tracking-wider text-amber-700 bg-amber-100 rounded border border-amber-300">
                              <Award size={10} className="fill-amber-600" />
                              #1
                            </span>
                          )}
                        </td>

                        {/* Output */}
                        <td className="py-2.5 px-2.5 text-right font-mono font-black text-emerald-700 bg-emerald-50/50 text-sm whitespace-nowrap">
                          {row.total.toFixed(2)}
                        </td>

                        {/* Input Log Asumsi */}
                        <td className="py-2.5 px-2.5 text-right font-mono font-bold text-slate-700 bg-slate-50/70 whitespace-nowrap">
                          {m.inputLog.toFixed(2)}
                        </td>

                        {/* Utama M3 */}
                        <td className="py-2.5 px-2 text-right font-mono font-bold text-blue-700 bg-blue-50/20 whitespace-nowrap">
                          {row.utama.toFixed(2)}
                        </td>

                        {/* Rend Utama % */}
                        <td className="py-2.5 px-2 text-right font-mono font-bold text-blue-600 bg-blue-50/20 whitespace-nowrap">
                          {m.rendUtama.toFixed(2)}%
                        </td>

                        {/* Turunan M3 */}
                        <td className="py-2.5 px-2 text-right font-mono font-bold text-purple-700 bg-purple-50/20 whitespace-nowrap">
                          {row.turunan.toFixed(2)}
                        </td>

                        {/* Rend Turunan % */}
                        <td className="py-2.5 px-2 text-right font-mono font-bold text-purple-600 bg-purple-50/20 whitespace-nowrap">
                          {m.rendTurunan.toFixed(2)}%
                        </td>

                        {/* Lokal M3 */}
                        <td className="py-2.5 px-2 text-right font-mono font-bold text-amber-700 bg-amber-50/20 whitespace-nowrap">
                          {row.lokal.toFixed(2)}
                        </td>

                        {/* Rend Lokal % */}
                        <td className="py-2.5 px-2 text-right font-mono font-bold text-amber-600 bg-amber-50/20 whitespace-nowrap">
                          {m.rendLokal.toFixed(2)}%
                        </td>

                        {/* Rend Total % */}
                        <td className="py-2.5 px-2.5 text-right font-mono font-black text-emerald-700 bg-emerald-50/50 whitespace-nowrap">
                          {m.rendTotal.toFixed(2)}%
                        </td>

                        {/* Speed M3/H */}
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-cyan-800 bg-cyan-50/30 whitespace-nowrap">
                          {row.m3PerJam.toFixed(2)}
                        </td>

                        {/* Composition Mini Bar */}
                        <td className="py-2.5 px-3 align-middle">
                          <div className="space-y-1 min-w-[100px]">
                            <div className="w-full h-2 bg-slate-200/80 rounded-full overflow-hidden flex">
                              <div 
                                className="bg-blue-500 h-full transition-all" 
                                style={{ width: `${m.utamaShare}%` }} 
                                title={`Utama: ${row.utama.toFixed(2)} m³ (${m.utamaShare.toFixed(1)}%)`}
                              />
                              <div 
                                className="bg-purple-500 h-full transition-all" 
                                style={{ width: `${m.turunanShare}%` }} 
                                title={`Turunan: ${row.turunan.toFixed(2)} m³ (${m.turunanShare.toFixed(1)}%)`}
                              />
                              <div 
                                className="bg-amber-500 h-full transition-all" 
                                style={{ width: `${m.lokalShare}%` }} 
                                title={`Lokal: ${row.lokal.toFixed(2)} m³ (${m.lokalShare.toFixed(1)}%)`}
                              />
                            </div>
                            <div className="flex items-center justify-between text-[9px] font-mono text-slate-400">
                              <span className="text-blue-600 font-bold">{m.utamaShare.toFixed(0)}%</span>
                              <span className="text-purple-600 font-bold">{m.turunanShare.toFixed(0)}%</span>
                              <span className="text-amber-600 font-bold">{m.lokalShare.toFixed(0)}%</span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot>
                <tr className="bg-slate-900 text-white font-black text-xs border-t-2 border-slate-700">
                  <td className="py-3 px-3 uppercase tracking-wider text-emerald-400">
                    TOTAL KESELURUHAN
                  </td>
                  <td className="py-3 px-2.5 text-right font-mono text-emerald-300 text-sm font-black whitespace-nowrap">
                    {summary.totalOutput.toFixed(2)}
                  </td>
                  <td className="py-3 px-2.5 text-right font-mono text-slate-200 whitespace-nowrap">
                    {summary.totalInput.toFixed(2)}
                  </td>
                  <td className="py-3 px-2 text-right font-mono text-blue-300 whitespace-nowrap">
                    {summary.totalUtama.toFixed(2)}
                  </td>
                  <td className="py-3 px-2 text-right font-mono text-blue-300 font-bold whitespace-nowrap">
                    {summary.rendUtama.toFixed(2)}%
                  </td>
                  <td className="py-3 px-2 text-right font-mono text-purple-300 whitespace-nowrap">
                    {summary.totalTurunan.toFixed(2)}
                  </td>
                  <td className="py-3 px-2 text-right font-mono text-purple-300 font-bold whitespace-nowrap">
                    {summary.rendTurunan.toFixed(2)}%
                  </td>
                  <td className="py-3 px-2 text-right font-mono text-amber-300 whitespace-nowrap">
                    {summary.totalLokal.toFixed(2)}
                  </td>
                  <td className="py-3 px-2 text-right font-mono text-amber-300 font-bold whitespace-nowrap">
                    {summary.rendLokal.toFixed(2)}%
                  </td>
                  <td className="py-3 px-2.5 text-right font-mono text-emerald-300 font-black whitespace-nowrap">
                    {summary.rendTotal.toFixed(2)}%
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-cyan-300 whitespace-nowrap">
                    {summary.avgSpeed.toFixed(2)} <span className="text-[10px] font-normal">(Avg)</span>
                  </td>
                  <td className="py-3 px-3 text-center text-[10px] text-slate-400 uppercase tracking-widest font-mono">
                    100%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Table Legend and Notes */}
          <div className="p-3 bg-slate-50 border-t border-slate-200/80 text-[11px] text-slate-600 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-semibold text-slate-700">Keterangan Komposisi:</span>
              <span className="inline-flex items-center gap-1 text-blue-700 font-medium">
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-500" /> Utama
              </span>
              <span className="inline-flex items-center gap-1 text-purple-700 font-medium">
                <span className="w-2.5 h-2.5 rounded-sm bg-purple-500" /> Turunan
              </span>
              <span className="inline-flex items-center gap-1 text-amber-700 font-medium">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" /> Lokal
              </span>
            </div>
            <div className="text-slate-500">
              * Input Log dihitung dengan rumus: <code>Output ÷ 62%</code>
            </div>
          </div>
        </div>

        {/* Visual Comparison Bar Chart for BS Machines */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs sm:text-sm font-black text-slate-800 flex items-center gap-1.5">
              <BarChart2 size={16} className="text-emerald-600" />
              Grafik Komparasi Output Mesin (Setengah Hari)
            </h3>
            <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
              Rendemen Total 62%
            </span>
          </div>

          <div className="space-y-2">
            {processedData.map((item) => {
              const pct = (item.total / maxOutput) * 100;
              const isTop = item.total === summary.topMachine?.total && summary.totalOutput > 0;
              const m = getMetrics(item);

              return (
                <div key={"chart-" + item.mesin} className="space-y-0.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 flex items-center gap-1">
                      {item.mesin}
                      {isTop && <span className="text-[10px] text-amber-600 font-black">★ #1</span>}
                    </span>
                    <div className="flex items-center gap-2 font-mono text-[11px]">
                      <span className="text-slate-400">{item.m3PerJam.toFixed(2)} m³/h</span>
                      <span className="text-slate-500">Log: {m.inputLog.toFixed(2)} m³</span>
                      <span className="font-black text-slate-900">{item.total.toFixed(2)} m³</span>
                    </div>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-700",
                        isTop ? "bg-gradient-to-r from-amber-500 to-emerald-500" : "bg-gradient-to-r from-teal-500 to-emerald-600"
                      )}
                      style={{ width: `${Math.max(pct, 3)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
