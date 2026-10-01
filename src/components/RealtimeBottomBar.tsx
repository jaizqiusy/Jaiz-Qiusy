import React, { useState, useMemo } from "react";
import { RealtimeTodayData } from "../services/sheetService";
import { Zap, ChevronUp, ChevronDown, ArrowUpRight, Gauge, Layers, X, Eye } from "lucide-react";
import { cn } from "../lib/utils";

interface RealtimeBottomBarProps {
  data: RealtimeTodayData[];
  onOpenRealtime: () => void;
  isVisible?: boolean;
}

export default function RealtimeBottomBar({
  data,
  onOpenRealtime,
  isVisible = true
}: RealtimeBottomBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Compute metrics
  const summary = useMemo(() => {
    if (data.length === 0) {
      return { total: 0, topMachine: null as RealtimeTodayData | null, avgSpeed: 0, count: 0 };
    }
    let total = 0;
    let sumSpeed = 0;
    let speedCount = 0;
    let topMachine: RealtimeTodayData | null = null;

    data.forEach(item => {
      total += item.total;
      if (item.m3PerJam > 0) {
        sumSpeed += item.m3PerJam;
        speedCount++;
      }
      if (!topMachine || item.total > topMachine.total) {
        topMachine = item;
      }
    });

    return {
      total,
      topMachine,
      avgSpeed: speedCount > 0 ? sumSpeed / speedCount : 0,
      count: data.length
    };
  }, [data]);

  if (!isVisible || data.length === 0) return null;

  // Minimized pill state
  if (isMinimized) {
    return (
      <div className="absolute bottom-[3.9rem] right-2.5 z-30 pointer-events-auto">
        <button
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/95 text-white border border-emerald-500/40 shadow-xl backdrop-blur-md text-xs font-bold hover:bg-slate-800 transition-all hover:scale-105 active:scale-95"
          title="Tampilkan Bar Realtime"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <Zap size={13} className="text-amber-400 fill-amber-400" />
          <span className="text-emerald-300 font-mono font-black">{summary.total.toFixed(2)} m³</span>
          <ChevronUp size={13} className="text-slate-400" />
        </button>
      </div>
    );
  }

  return (
    <div className="absolute bottom-[3.8rem] left-2 right-2 z-30 pointer-events-auto transition-all duration-300">
      <div className="bg-[#0C1524]/95 text-white backdrop-blur-lg border border-emerald-500/30 rounded-2xl shadow-2xl p-2.5 sm:px-3 sm:py-2.5 overflow-hidden">
        
        {/* Main Bar Row */}
        <div className="flex items-center justify-between gap-2">
          {/* Left: Indicator & Total Output */}
          <div 
            onClick={onOpenRealtime}
            className="flex items-center gap-2.5 cursor-pointer hover:opacity-90 transition-opacity min-w-0"
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
              <Zap size={16} className="text-emerald-400 fill-emerald-400" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                  Realtime Setengah Hari
                </span>
                <span className="text-[10px] text-white/40 hidden sm:inline">•</span>
                <span className="text-[10px] text-white/60 hidden sm:inline">
                  {summary.count} Mesin Aktif
                </span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-base sm:text-lg font-black text-white tracking-tight">
                  {summary.total.toFixed(2)} <span className="text-xs font-bold text-emerald-400">m³</span>
                </span>
                {summary.topMachine && (
                  <span className="text-[11px] text-white/70 truncate hidden xs:inline">
                    (Top: <strong className="text-amber-300">{summary.topMachine.mesin}</strong> {summary.topMachine.total.toFixed(2)} m³)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Quick Preview Toggle */}
            <button
              onClick={() => setIsExpanded(prev => !prev)}
              className={cn(
                "p-1.5 rounded-xl border transition-all text-xs font-semibold flex items-center gap-1",
                isExpanded 
                  ? "bg-emerald-500/20 border-emerald-400/50 text-emerald-300" 
                  : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
              )}
              title={isExpanded ? "Tutup Preview" : "Lihat Semua Mesin"}
            >
              <Layers size={14} />
              <span className="hidden sm:inline">{isExpanded ? "Tutup" : "Preview"}</span>
              {isExpanded ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
            </button>

            {/* Buka Layar Penuh Tab Realtime */}
            <button
              onClick={onOpenRealtime}
              className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center gap-1 shadow-md active:scale-95 transition-all"
            >
              <span>Detail</span>
              <ArrowUpRight size={14} />
            </button>

            {/* Minimize button */}
            <button
              onClick={() => setIsMinimized(true)}
              className="p-1.5 rounded-xl text-white/40 hover:text-white/80 hover:bg-white/10 transition-colors"
              title="Kecilkan bar"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Expandable Quick Drawer: Shows all machines compactly */}
        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-white/10 space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-center justify-between text-[11px] font-bold text-white/60 px-1">
              <span>RINGKASAN OUTPUT PER MESIN</span>
              <span>Rata Speed: <strong className="text-cyan-400">{summary.avgSpeed.toFixed(2)} m³/h</strong></span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 max-h-48 overflow-y-auto pr-1">
              {data.map((item) => (
                <div 
                  key={"bottom-bar-" + item.mesin}
                  className="bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl p-2 flex items-center justify-between text-xs transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-md bg-emerald-500/20 text-emerald-300 font-bold text-[10px] flex items-center justify-center">
                      {item.mesin.replace("BS", "").replace(".", "").trim()}
                    </span>
                    <span className="font-bold text-white/90 text-[11px]">{item.mesin}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-emerald-400 text-xs">{item.total.toFixed(2)} m³</div>
                    <div className="text-[9px] text-white/50">Log: {(item.total > 0 ? (item.total / 0.62).toFixed(2) : "0.00")} m³</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-1 flex items-center justify-end">
              <button
                onClick={onOpenRealtime}
                className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 underline underline-offset-2"
              >
                Buka Halaman Lengkap Realtime →
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
