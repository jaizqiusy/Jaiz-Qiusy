import React, { useState, useMemo, useRef } from "react";
import { RealtimeTodayData } from "../services/sheetService";
import { 
  Activity, 
  RefreshCw, 
  Download, 
  TrendingUp, 
  Gauge, 
  Layers, 
  Calendar, 
  Zap, 
  CheckCircle2, 
  Award, 
  Clock, 
  Search, 
  BarChart2, 
  Table as TableIcon,
  ChevronUp,
  ChevronDown
} from "lucide-react";
import { cn } from "../lib/utils";
import { toJpeg } from "html-to-image";

interface RealtimeTodayProps {
  data: RealtimeTodayData[];
  onRefresh?: () => void;
  isSyncing?: boolean;
  lastSync?: string | null;
}

export default function RealtimeToday({
  data,
  onRefresh,
  isSyncing = false,
  lastSync
}: RealtimeTodayProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"mesin" | "total" | "speed" | "utama">("total");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [activeView, setActiveView] = useState<"cards" | "table" | "chart">("cards");
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

  // Aggregate metrics
  const summary = useMemo(() => {
    if (data.length === 0) {
      return {
        totalOutput: 0,
        totalUtama: 0,
        totalTurunan: 0,
        totalLokal: 0,
        totalInput: 0,
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
      totalInput += item.inputAktual;
      if (item.m3PerJam > 0) {
        sumSpeed += item.m3PerJam;
        validSpeedCount++;
      }
      if (!topMachine || item.total > topMachine.total) {
        topMachine = item;
      }
    });

    const avgSpeed = validSpeedCount > 0 ? sumSpeed / validSpeedCount : 0;

    return {
      totalOutput,
      totalUtama,
      totalTurunan,
      totalLokal,
      totalInput,
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

      if (sortBy === "total") {
        valA = a.total;
        valB = b.total;
      } else if (sortBy === "speed") {
        valA = a.m3PerJam;
        valB = b.m3PerJam;
      } else if (sortBy === "utama") {
        valA = a.utama;
        valB = b.utama;
      } else if (sortBy === "mesin") {
        return sortDirection === "asc"
          ? a.mesin.localeCompare(b.mesin, undefined, { numeric: true })
          : b.mesin.localeCompare(a.mesin, undefined, { numeric: true });
      }

      return sortDirection === "desc" ? valB - valA : valA - valB;
    });

    return result;
  }, [data, searchTerm, sortBy, sortDirection]);

  // Max total for relative progress bar scaling
  const maxOutput = useMemo(() => {
    return Math.max(...data.map(d => d.total), 1);
  }, [data]);

  const maxSpeed = useMemo(() => {
    return Math.max(...data.map(d => d.m3PerJam), 1);
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

  const toggleSort = (type: "mesin" | "total" | "speed" | "utama") => {
    if (sortBy === type) {
      setSortDirection(prev => prev === "desc" ? "asc" : "desc");
    } else {
      setSortBy(type);
      setSortDirection("desc");
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 py-4 space-y-4 pb-28">
      {/* Top Banner / Actions */}
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
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <Zap className="text-amber-400 w-5 h-5 fill-amber-400" />
            Monitoring Output Setengah Hari
          </h1>
          <p className="text-xs text-white/60">
            Data aktual terhubung langsung dari Google Sheets lembar <code className="text-emerald-300 font-mono">realtime today</code>
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
              title="Refresh Data"
            >
              <RefreshCw size={14} className={cn(isSyncing && "animate-spin text-emerald-400")} />
              <span>{isSyncing ? "Menyinkronkan..." : "Perbarui"}</span>
            </button>
          )}

          <button
            onClick={handleExportJPG}
            disabled={isExporting}
            className="px-3 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white transition-all flex items-center gap-1.5 shadow-md border border-emerald-400/30"
            title="Download Laporan JPG"
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
      <div ref={exportRef} className="space-y-4">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
          {/* Card 1: Total Setengah Hari */}
          <div className="col-span-2 sm:col-span-1 lg:col-span-2 bg-gradient-to-br from-emerald-600 to-teal-800 text-white p-4 rounded-2xl shadow-md border border-emerald-400/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 opacity-15 pointer-events-none">
              <Zap size={64} />
            </div>
            <div className="flex items-center justify-between text-emerald-100 text-xs font-bold tracking-wider uppercase mb-1">
              <span>Total Hasil Setengah Hari</span>
              <span className="bg-emerald-400/30 text-white px-2 py-0.5 rounded-full text-[10px] font-bold">
                {summary.machineCount} Mesin
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl sm:text-4xl font-black tracking-tight">
                {summary.totalOutput.toFixed(2)}
              </span>
              <span className="text-sm font-bold text-emerald-200">M³</span>
            </div>
            <div className="mt-2 text-[11px] text-emerald-100/80 flex items-center gap-1.5">
              <TrendingUp size={13} className="text-emerald-300" />
              <span>
                Top: <strong className="text-white">{summary.topMachine?.mesin || "-"}</strong> ({summary.topMachine?.total.toFixed(2)} m³)
              </span>
            </div>
          </div>

          {/* Card 2: Utama */}
          <div className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-sm border border-slate-200/80 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">Utama</span>
              <span className="w-2 h-2 rounded-full bg-blue-500" />
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-2xl font-black text-slate-800">{summary.totalUtama.toFixed(2)}</span>
              <span className="text-xs font-semibold text-slate-400">m³</span>
            </div>
            <div className="mt-1 text-[11px] font-medium text-slate-500">
              Porsi: <strong className="text-blue-600 font-bold">
                {summary.totalOutput > 0 ? ((summary.totalUtama / summary.totalOutput) * 100).toFixed(1) : 0}%
              </strong>
            </div>
          </div>

          {/* Card 3: Turunan */}
          <div className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-sm border border-slate-200/80 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700">Turunan</span>
              <span className="w-2 h-2 rounded-full bg-purple-500" />
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-2xl font-black text-slate-800">{summary.totalTurunan.toFixed(2)}</span>
              <span className="text-xs font-semibold text-slate-400">m³</span>
            </div>
            <div className="mt-1 text-[11px] font-medium text-slate-500">
              Porsi: <strong className="text-purple-600 font-bold">
                {summary.totalOutput > 0 ? ((summary.totalTurunan / summary.totalOutput) * 100).toFixed(1) : 0}%
              </strong>
            </div>
          </div>

          {/* Card 4: Lokal */}
          <div className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-sm border border-slate-200/80 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Lokal</span>
              <span className="w-2 h-2 rounded-full bg-amber-500" />
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-2xl font-black text-slate-800">{summary.totalLokal.toFixed(2)}</span>
              <span className="text-xs font-semibold text-slate-400">m³</span>
            </div>
            <div className="mt-1 text-[11px] font-medium text-slate-500">
              Porsi: <strong className="text-amber-600 font-bold">
                {summary.totalOutput > 0 ? ((summary.totalLokal / summary.totalOutput) * 100).toFixed(1) : 0}%
              </strong>
            </div>
          </div>

          {/* Card 5: Speed Avg */}
          <div className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-sm border border-slate-200/80 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-700">Rata Speed</span>
              <Gauge size={14} className="text-cyan-600" />
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-2xl font-black text-slate-800">{summary.avgSpeed.toFixed(2)}</span>
              <span className="text-xs font-semibold text-slate-400">m³/h</span>
            </div>
            <div className="mt-1 text-[11px] font-medium text-slate-500 truncate">
              Max: <strong className="text-cyan-700 font-bold">{summary.topMachine ? summary.topMachine.m3PerJam.toFixed(2) : 0}</strong>
            </div>
          </div>
        </div>

        {/* Controls: Search, View Mode, Sorting */}
        <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nomor mesin..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
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

          {/* View Toggles & Sort Options */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            {/* View Mode Buttons */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
              <button
                onClick={() => setActiveView("cards")}
                className={cn(
                  "px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1",
                  activeView === "cards" 
                    ? "bg-white text-emerald-700 shadow-xs" 
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                <Layers size={13} />
                <span>Kartu</span>
              </button>
              <button
                onClick={() => setActiveView("table")}
                className={cn(
                  "px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1",
                  activeView === "table" 
                    ? "bg-white text-emerald-700 shadow-xs" 
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                <TableIcon size={13} />
                <span>Tabel</span>
              </button>
            </div>

            {/* Quick Sort Dropdown */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-400 hidden sm:inline">Urutkan:</span>
              <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-0.5">
                <button
                  onClick={() => toggleSort("total")}
                  className={cn(
                    "px-2 py-1 rounded-lg font-bold transition-all",
                    sortBy === "total" ? "bg-emerald-600 text-white" : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  Total {sortBy === "total" && (sortDirection === "desc" ? "↓" : "↑")}
                </button>
                <button
                  onClick={() => toggleSort("speed")}
                  className={cn(
                    "px-2 py-1 rounded-lg font-bold transition-all",
                    sortBy === "speed" ? "bg-emerald-600 text-white" : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  Speed {sortBy === "speed" && (sortDirection === "desc" ? "↓" : "↑")}
                </button>
                <button
                  onClick={() => toggleSort("mesin")}
                  className={cn(
                    "px-2 py-1 rounded-lg font-bold transition-all",
                    sortBy === "mesin" ? "bg-emerald-600 text-white" : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  Mesin {sortBy === "mesin" && (sortDirection === "desc" ? "↓" : "↑")}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content View: Cards Mode */}
        {activeView === "cards" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {processedData.map((item, idx) => {
              const isTop = item.total === summary.topMachine?.total;
              const utamaShare = item.total > 0 ? (item.utama / item.total) * 100 : 0;
              const turunanShare = item.total > 0 ? (item.turunan / item.total) * 100 : 0;
              const lokalShare = item.total > 0 ? (item.lokal / item.total) * 100 : 0;

              return (
                <div
                  key={item.mesin + idx}
                  className={cn(
                    "bg-white rounded-2xl p-4 shadow-xs border transition-all hover:shadow-md relative overflow-hidden flex flex-col justify-between",
                    isTop ? "border-amber-400/80 ring-2 ring-amber-400/20 bg-amber-50/10" : "border-slate-200/80"
                  )}
                >
                  {/* Top Badge */}
                  {isTop && (
                    <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-500 to-amber-600 text-white text-[10px] font-black px-3 py-0.5 rounded-bl-xl shadow-xs flex items-center gap-1">
                      <Award size={11} className="fill-white" />
                      TERINGGI
                    </div>
                  )}

                  <div>
                    {/* Header: Machine Name & Speed */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-9 h-9 rounded-xl bg-slate-900 text-white font-black text-sm flex items-center justify-center shadow-xs">
                          {item.mesin.replace("BS", "").replace(".", "").trim()}
                        </span>
                        <div>
                          <div className="font-black text-slate-800 text-base leading-tight">
                            {item.mesin}
                          </div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Shift Setengah Hari
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs font-black text-cyan-700 flex items-center gap-1 justify-end">
                          <Gauge size={12} />
                          <span>{item.m3PerJam.toFixed(2)}</span>
                        </div>
                        <span className="text-[9px] font-bold text-slate-400">m³/jam</span>
                      </div>
                    </div>

                    {/* Total Volume */}
                    <div className="bg-slate-50 rounded-xl p-2.5 my-2.5 border border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Total Hasil</span>
                      <div className="text-right">
                        <span className="text-xl font-black text-emerald-600">{item.total.toFixed(2)}</span>
                        <span className="text-[11px] font-bold text-slate-400 ml-1">m³</span>
                      </div>
                    </div>

                    {/* Multi-segment breakdown progress bar */}
                    <div className="space-y-1 mb-3">
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                        <span>Komposisi Hasil</span>
                        <span>{item.total > 0 ? "100%" : "0%"}</span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
                        <div 
                          className="bg-blue-500 h-full transition-all duration-500" 
                          style={{ width: `${utamaShare}%` }} 
                          title={`Utama: ${item.utama.toFixed(2)} m³ (${utamaShare.toFixed(1)}%)`}
                        />
                        <div 
                          className="bg-purple-500 h-full transition-all duration-500" 
                          style={{ width: `${turunanShare}%` }} 
                          title={`Turunan: ${item.turunan.toFixed(2)} m³ (${turunanShare.toFixed(1)}%)`}
                        />
                        <div 
                          className="bg-amber-500 h-full transition-all duration-500" 
                          style={{ width: `${lokalShare}%` }} 
                          title={`Lokal: ${item.lokal.toFixed(2)} m³ (${lokalShare.toFixed(1)}%)`}
                        />
                      </div>
                    </div>

                    {/* Detail Pills */}
                    <div className="grid grid-cols-3 gap-1.5 text-center text-xs">
                      {/* Utama */}
                      <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-1.5">
                        <div className="text-[9px] font-black uppercase text-blue-700">Utama</div>
                        <div className="font-black text-slate-800 text-[13px]">{item.utama.toFixed(2)}</div>
                        <div className="text-[9px] font-bold text-blue-600">{utamaShare.toFixed(0)}%</div>
                      </div>

                      {/* Turunan */}
                      <div className="bg-purple-50/70 border border-purple-100 rounded-xl p-1.5">
                        <div className="text-[9px] font-black uppercase text-purple-700">Turunan</div>
                        <div className="font-black text-slate-800 text-[13px]">{item.turunan.toFixed(2)}</div>
                        <div className="text-[9px] font-bold text-purple-600">{turunanShare.toFixed(0)}%</div>
                      </div>

                      {/* Lokal */}
                      <div className="bg-amber-50/70 border border-amber-100 rounded-xl p-1.5">
                        <div className="text-[9px] font-black uppercase text-amber-700">Lokal</div>
                        <div className="font-black text-slate-800 text-[13px]">{item.lokal.toFixed(2)}</div>
                        <div className="text-[9px] font-bold text-amber-600">{lokalShare.toFixed(0)}%</div>
                      </div>
                    </div>
                  </div>

                  {/* Footer note: Input aktual if available */}
                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-medium">
                    <span>Input Aktual</span>
                    <span className="font-bold text-slate-600">{item.inputAktual.toFixed(2)} m³</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Content View: Table Mode */}
        {activeView === "table" && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold tracking-wider text-[11px] uppercase">
                    <th className="py-3 px-3">Mesin</th>
                    <th className="py-3 px-2 text-right">Input (M³)</th>
                    <th className="py-3 px-2 text-right text-blue-300">Utama (M³)</th>
                    <th className="py-3 px-2 text-right text-blue-300">% Utama</th>
                    <th className="py-3 px-2 text-right text-purple-300">Turunan (M³)</th>
                    <th className="py-3 px-2 text-right text-purple-300">% Turunan</th>
                    <th className="py-3 px-2 text-right text-amber-300">Lokal (M³)</th>
                    <th className="py-3 px-2 text-right text-amber-300">% Lokal</th>
                    <th className="py-3 px-2 text-right text-emerald-300">Total (M³)</th>
                    <th className="py-3 px-2 text-right text-emerald-300">% Total</th>
                    <th className="py-3 px-3 text-right text-cyan-300">Speed (M³/H)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {processedData.map((row, idx) => (
                    <tr 
                      key={row.mesin + idx}
                      className={cn(
                        "hover:bg-slate-50 transition-colors font-medium",
                        idx % 2 === 1 ? "bg-slate-50/50" : "bg-white"
                      )}
                    >
                      <td className="py-2.5 px-3 font-black text-slate-800 flex items-center gap-1.5">
                        <span className="w-6 h-6 rounded-lg bg-slate-800 text-white font-bold text-[11px] flex items-center justify-center">
                          {row.mesin.replace("BS", "").replace(".", "").trim()}
                        </span>
                        <span>{row.mesin}</span>
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono text-slate-600">{row.inputAktual.toFixed(2)}</td>
                      <td className="py-2.5 px-2 text-right font-mono font-bold text-blue-700 bg-blue-50/30">{row.utama.toFixed(2)}</td>
                      <td className="py-2.5 px-2 text-right font-mono text-blue-600 bg-blue-50/30">{row.persenUtama}</td>
                      <td className="py-2.5 px-2 text-right font-mono font-bold text-purple-700 bg-purple-50/30">{row.turunan.toFixed(2)}</td>
                      <td className="py-2.5 px-2 text-right font-mono text-purple-600 bg-purple-50/30">{row.persenTurunan}</td>
                      <td className="py-2.5 px-2 text-right font-mono font-bold text-amber-700 bg-amber-50/30">{row.lokal.toFixed(2)}</td>
                      <td className="py-2.5 px-2 text-right font-mono text-amber-600 bg-amber-50/30">{row.persenLokal}</td>
                      <td className="py-2.5 px-2 text-right font-mono font-black text-emerald-700 bg-emerald-50/40 text-sm">{row.total.toFixed(2)}</td>
                      <td className="py-2.5 px-2 text-right font-mono text-emerald-600 bg-emerald-50/40">{row.persenTotal}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-cyan-800 bg-cyan-50/30">{row.m3PerJam.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-900 text-white font-black text-xs border-t-2 border-slate-800">
                    <td className="py-3 px-3 uppercase tracking-wider text-emerald-400">TOTAL</td>
                    <td className="py-3 px-2 text-right font-mono">{summary.totalInput.toFixed(2)}</td>
                    <td className="py-3 px-2 text-right font-mono text-blue-300">{summary.totalUtama.toFixed(2)}</td>
                    <td className="py-3 px-2 text-right font-mono text-blue-300">
                      {summary.totalOutput > 0 ? ((summary.totalUtama / summary.totalOutput) * 100).toFixed(1) : 0}%
                    </td>
                    <td className="py-3 px-2 text-right font-mono text-purple-300">{summary.totalTurunan.toFixed(2)}</td>
                    <td className="py-3 px-2 text-right font-mono text-purple-300">
                      {summary.totalOutput > 0 ? ((summary.totalTurunan / summary.totalOutput) * 100).toFixed(1) : 0}%
                    </td>
                    <td className="py-3 px-2 text-right font-mono text-amber-300">{summary.totalLokal.toFixed(2)}</td>
                    <td className="py-3 px-2 text-right font-mono text-amber-300">
                      {summary.totalOutput > 0 ? ((summary.totalLokal / summary.totalOutput) * 100).toFixed(1) : 0}%
                    </td>
                    <td className="py-3 px-2 text-right font-mono text-emerald-300 text-sm font-black">{summary.totalOutput.toFixed(2)}</td>
                    <td className="py-3 px-2 text-right font-mono text-emerald-300">100%</td>
                    <td className="py-3 px-3 text-right font-mono text-cyan-300">{summary.avgSpeed.toFixed(2)} (Avg)</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Visual Comparison Bar Chart */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
              <BarChart2 size={16} className="text-emerald-600" />
              Perbandingan Output per Mesin (BS 1 - BS 8)
            </h3>
            <span className="text-xs text-slate-400 font-medium">Satuan: M³</span>
          </div>

          <div className="space-y-2.5">
            {processedData.map((item) => {
              const pct = (item.total / maxOutput) * 100;
              const isTop = item.total === summary.topMachine?.total;

              return (
                <div key={"chart-" + item.mesin} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 flex items-center gap-1">
                      {item.mesin}
                      {isTop && <span className="text-[10px] text-amber-500 font-black">★ #1</span>}
                    </span>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="text-slate-400 text-[11px]">{item.m3PerJam.toFixed(2)} m³/h</span>
                      <span className="font-black text-slate-900">{item.total.toFixed(2)} m³</span>
                    </div>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-700",
                        isTop ? "bg-gradient-to-r from-amber-500 to-emerald-500" : "bg-gradient-to-r from-teal-500 to-emerald-600"
                      )}
                      style={{ width: `${Math.max(pct, 4)}%` }}
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
