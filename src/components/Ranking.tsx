import React, { useState, useMemo, useEffect } from "react";
import { Trophy, ChevronDown, Award, TrendingUp, Sparkles, Volume2, X } from "lucide-react";
import { Calculation } from "../App";
import { cn } from "../lib/utils";
import { fetchOperatorData, OperatorData } from "../services/sheetService";

interface RankingProps {
  history: Calculation[];
}

// 8 Operators metadata paired with their BS machines as shown in the mockup
export const DEFAULT_OPERATOR_MAPPING: Record<string, { name: string; avatar: string }> = {
  "BS 1": { 
    name: "Ahmad Khudlori", 
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150&auto=format&fit=crop" // Smiling middle-aged Asian man
  },
  "BS 2": { 
    name: "Marjono", 
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=150&auto=format&fit=crop" 
  },
  "BS 3": { 
    name: "Hartono", 
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=150&auto=format&fit=crop" 
  },
  "BS 4": { 
    name: "Saenurrodin", 
    avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=150&auto=format&fit=crop" 
  },
  "BS 5": { 
    name: "Subur", 
    avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=150&auto=format&fit=crop" 
  },
  "BS 6": { 
    name: "Supardi", 
    avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=150&auto=format&fit=crop" 
  },
  "BS 7": { 
    name: "Supariyo", 
    avatar: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?q=80&w=150&auto=format&fit=crop" 
  },
  "BS 8": { 
    name: "Sukono", 
    avatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?q=80&w=150&auto=format&fit=crop" 
  }
};

export function getNormalizedMachineKey(rawMachine: string): string {
  const clean = rawMachine.replace(/\s+/g, "").toUpperCase();
  if (clean.startsWith("BS") && clean.length > 2) {
    const num = clean.substring(2);
    return `BS ${num}`;
  }
  return rawMachine.trim().toUpperCase();
}

export default function Ranking({ history }: RankingProps) {
  const [periodType, setPeriodType] = useState<"bulanan" | "mingguan">("bulanan");
  const [operatorMapping, setOperatorMapping] = useState<Record<string, { name: string; avatar: string }>>(DEFAULT_OPERATOR_MAPPING);
  const [selectedDetailOperator, setSelectedDetailOperator] = useState<{
    machine: string;
    name: string;
    avatar: string;
    input: number;
    utama: number;
    output: number;
    yield: number;
    achievement: number;
    rank: number;
  } | null>(null);

  useEffect(() => {
    fetchOperatorData().then(data => {
      if (data && data.length > 0) {
        const newMapping = { ...DEFAULT_OPERATOR_MAPPING };
        data.forEach(op => {
          if (op.status_aktif && op.kode_bs) {
            newMapping[op.kode_bs] = {
              name: op.nama_lengkap || newMapping[op.kode_bs]?.name || "Unknown Operator",
              avatar: op.url_foto || newMapping[op.kode_bs]?.avatar || ""
            };
          }
        });
        setOperatorMapping(newMapping);
      }
    }).catch(console.error);
  }, []);
  
  // Filter history to BS lines only containing sheet records
  const bsRecords = useMemo(() => {
    return history.filter(item => {
      if (!item.id.startsWith("sheet-")) return false;
      const norm = getNormalizedMachineKey(item.machine);
      return /^BS\s*[1-8]$/i.test(norm);
    });
  }, [history]);

  const { currentMonth, currentWeek } = useMemo(() => {
    const d = new Date();
    const currentMonth = d.getMonth() + 1;
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(),0,1));
    const currentWeek = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1)/7);
    return { currentMonth, currentWeek };
  }, []);

  // Extract unique periods
  const uniqueMonths = useMemo(() => {
    const months = new Set(bsRecords.map(item => item.month));
    months.add(currentMonth); // Guarantee current month is an option
    return Array.from(months)
      .filter((m): m is number => typeof m === "number" && !isNaN(m) && m > 0)
      .sort((a, b) => b - a); // descending order (latest month first)
  }, [bsRecords, currentMonth]);

  const uniqueWeeks = useMemo(() => {
    const weeks = new Set(bsRecords.map(item => item.week));
    weeks.add(currentWeek); // Guarantee current week is an option
    return Array.from(weeks)
      .filter((w): w is number => typeof w === "number" && !isNaN(w) && w > 0)
      .sort((a, b) => b - a); // descending order (latest week first)
  }, [bsRecords, currentWeek]);

  // Selected period state (defaulting to the actual current month or week)
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [selectedWeek, setSelectedWeek] = useState<number>(currentWeek);

  const activePeriodValue = periodType === "bulanan" ? selectedMonth : selectedWeek;

  // Filter records by selected period type and value
  const periodFilteredRecords = useMemo(() => {
    if (periodType === "bulanan") {
      return bsRecords.filter(item => item.month === selectedMonth);
    } else {
      return bsRecords.filter(item => item.week === selectedWeek);
    }
  }, [bsRecords, periodType, selectedMonth, selectedWeek]);

  // Compute stats for each of the 8 operators/machines
  const leaderBoardData = useMemo(() => {
    const list = Object.keys(operatorMapping).map(machineKey => {
      const operator = operatorMapping[machineKey];
      const machRecords = periodFilteredRecords.filter(
        item => getNormalizedMachineKey(item.machine) === machineKey
      );

      const totalInput = machRecords.reduce((sum, item) => sum + item.input, 0);
      const totalUtama = machRecords.reduce((sum, item) => sum + item.utama, 0);
      const totalOutput = machRecords.reduce((sum, item) => sum + item.output, 0);
      
      // Calculate Yield % (Rendemen utama)
      const avgYield = totalInput > 0 ? (totalUtama / totalInput) * 100 : 0;
      
      return {
        machine: machineKey,
        name: operator.name,
        avatar: operator.avatar,
        input: totalInput,
        utama: totalUtama,
        output: totalOutput,
        yield: avgYield,
        achievement: 0 // Will compute below
      };
    });

    const maxYield = Math.max(...list.map(m => m.yield));
    const maxOutput = Math.max(...list.map(m => m.output));

    list.forEach(m => {
      // Logic ranking: 55% dari rendemen utama dan 45% dari output total (normalized)
      const yieldScore = maxYield > 0 ? (m.yield / maxYield) * 100 : 0;
      const outputScore = maxOutput > 0 ? (m.output / maxOutput) * 100 : 0;
      m.achievement = (yieldScore * 0.55) + (outputScore * 0.45);
    });

    // Sort list based on the new combined score
    return list.sort((a, b) => b.achievement - a.achievement);
  }, [periodFilteredRecords, operatorMapping]);

  // Extract Podium (Top 3) & List (Ranks 4-8)
  const podium = useMemo(() => {
    return {
      rank1: leaderBoardData[0] || null,
      rank2: leaderBoardData[1] || null,
      rank3: leaderBoardData[2] || null
    };
  }, [leaderBoardData]);

  const remainingRanks = useMemo(() => {
    return leaderBoardData.slice(3);
  }, [leaderBoardData]);

  return (
    <div id="leaderboard_container" className="flex-1 flex flex-col h-full bg-[#0C1524] text-white pb-1 overflow-hidden">
      {/* Header Operator */}
      <div className="flex flex-col items-center justify-center mt-2 mb-2 shrink-0 px-2">
        {/* Tabs Filter Row */}
        <div className="flex items-center justify-center gap-2 w-full relative z-20">
          <div className="flex bg-[#1E2538] rounded-xl p-0.5 border border-indigo-950/40 shadow-inner">
            <button
              onClick={() => setPeriodType("mingguan")}
              className={cn(
                "relative text-[9px] font-black px-3 py-1 rounded-lg uppercase tracking-wider transition-all duration-300",
                periodType === "mingguan" 
                  ? "bg-[#FFB800] text-[#4A2D00] shadow-md z-10" 
                  : "text-slate-400 hover:text-white z-0"
              )}
            >
              MINGGUAN
              {periodType === "mingguan" && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#FFB800] rotate-45 rounded-[2px] z-[-1]" />
              )}
            </button>
            <button
              onClick={() => setPeriodType("bulanan")}
              className={cn(
                "relative text-[9px] font-black px-3 py-1 rounded-lg uppercase tracking-wider transition-all duration-300",
                periodType === "bulanan" 
                  ? "bg-[#FFB800] text-[#4A2D00] shadow-md z-10" 
                  : "text-slate-400 hover:text-white z-0"
              )}
            >
              BULANAN
              {periodType === "bulanan" && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#FFB800] rotate-45 rounded-[2px] z-[-1]" />
              )}
            </button>
          </div>

          {/* Dynamic Period Dropdown Selector */}
          <div className="relative">
            <select
              value={periodType === "bulanan" ? selectedMonth : selectedWeek}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (periodType === "bulanan") {
                  setSelectedMonth(val);
                } else {
                  setSelectedWeek(val);
                }
              }}
              className="appearance-none bg-transparent border border-white/50 hover:border-white rounded-full text-[10px] font-bold text-white pl-3 pr-6 py-1 cursor-pointer outline-none focus:bg-[#1E293B] transition-colors"
            >
              {periodType === "bulanan" ? (
                uniqueMonths.map(m => (
                  <option key={m} value={m} className="text-black">Bulan {m}</option>
                ))
              ) : (
                uniqueWeeks.map(w => (
                  <option key={w} value={w} className="text-black">Minggu {w}</option>
                ))
              )}
            </select>
            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-white">
              <ChevronDown size={11} strokeWidth={3} />
            </div>
          </div>
        </div>
      </div>

      {/* 3D-Like Operator Podium */}
      <div className="relative flex items-end justify-center gap-1.5 px-1 py-1 mb-1 shrink-0 bg-gradient-to-t from-indigo-950/20 to-transparent min-h-[140px]">
        
        {/* RANK 2 - Left */}
        {podium.rank2 && (
          <div className="flex-1 flex flex-col items-center text-center mt-2">
            <div className="relative">
              <div 
                onClick={() => setSelectedDetailOperator({ ...podium.rank2!, rank: 2 })}
                className="w-[70px] h-[70px] rounded-full p-[2.5px] bg-gradient-to-tr from-cyan-400 via-sky-300 to-indigo-500 shadow-[0_0_10px_rgba(6,182,212,0.3)] cursor-pointer hover:scale-105 active:scale-95 transition-transform duration-200"
              >
                <div className="w-full h-full rounded-full overflow-hidden border-2 border-slate-950">
                  <img 
                    src={podium.rank2.avatar} 
                    alt={podium.rank2.name} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-[22px] h-[22px] min-w-[22px] min-h-[22px] bg-cyan-500 rounded-full flex items-center justify-center border-2 border-[#0C1524] shadow-sm pointer-events-none">
                <span className="text-[11px] font-black text-slate-950">2</span>
              </div>
            </div>
            
            <div className="mt-2.5">
              <p className="text-[12px] font-black text-white leading-tight truncate max-w-[75px]" title={podium.rank2.name}>
                {podium.rank2.name.split(" ")[0]}
              </p>
              <p className="text-[9px] font-extrabold text-cyan-400 uppercase tracking-widest">{podium.rank2.machine}</p>
              
              <div className="mt-1 space-y-0.5">
                <div className="text-[13px] font-black text-cyan-400 font-mono">
                  {podium.rank2.yield.toFixed(1)}%
                </div>
                <div className="text-[9px] font-bold text-gray-300">
                  {podium.rank2.output.toLocaleString("id-ID", { maximumFractionDigits: 1 })} m³
                </div>
              </div>
            </div>
          </div>
        )}

        {/* RANK 1 - Center Peak */}
        {podium.rank1 && (
          <div className="flex-[1.2] flex flex-col items-center text-center -translate-y-2 relative z-10 mx-1">
            <div className="relative">
              {/* Crown Emblem or Sparkles */}
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-amber-400 animate-bounce">
                <Award size={14} className="fill-amber-400/20" />
              </div>
              <div 
                onClick={() => setSelectedDetailOperator({ ...podium.rank1!, rank: 1 })}
                className="w-[90px] h-[90px] rounded-full p-[3.5px] bg-gradient-to-tr from-yellow-400 via-amber-300 to-orange-500 shadow-[0_0_15px_rgba(251,191,36,0.3)] cursor-pointer hover:scale-105 active:scale-95 transition-transform duration-200"
              >
                <div className="w-full h-full rounded-full overflow-hidden border-[2.5px] border-slate-950">
                  <img 
                    src={podium.rank1.avatar} 
                    alt={podium.rank1.name} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-7 h-7 bg-yellow-400 rounded-full flex items-center justify-center border-[2.5px] border-[#0C1524] shadow-md pointer-events-none">
                <span className="text-[13px] font-black text-slate-950">1</span>
              </div>
            </div>
            
            <div className="mt-3">
              <p className="text-[14px] font-black text-white leading-tight truncate max-w-[90px]" title={podium.rank1.name}>
                {podium.rank1.name.split(" ")[0]}
              </p>
              <p className="text-[10px] font-extrabold text-amber-400 uppercase tracking-widest">{podium.rank1.machine}</p>
              
              <div className="mt-1 space-y-0.5">
                <div className="text-[16px] font-black text-yellow-400 font-mono tracking-tight">
                  {podium.rank1.yield.toFixed(1)}%
                </div>
                <div className="text-[10px] font-extrabold text-slate-100">
                  {podium.rank1.output.toLocaleString("id-ID", { maximumFractionDigits: 1 })} m³
                </div>
              </div>
            </div>
          </div>
        )}

        {/* RANK 3 - Right */}
        {podium.rank3 && (
          <div className="flex-1 flex flex-col items-center text-center mt-3">
            <div className="relative">
              <div 
                onClick={() => setSelectedDetailOperator({ ...podium.rank3!, rank: 3 })}
                className="w-[66px] h-[66px] rounded-full p-[2.5px] bg-gradient-to-tr from-emerald-500 via-teal-400 to-indigo-500 shadow-[0_0_10px_rgba(16,185,129,0.3)] cursor-pointer hover:scale-105 active:scale-95 transition-transform duration-200"
              >
                <div className="w-full h-full rounded-full overflow-hidden border-2 border-slate-950">
                  <img 
                    src={podium.rank3.avatar} 
                    alt={podium.rank3.name} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-[22px] h-[22px] min-w-[22px] min-h-[22px] bg-emerald-500 rounded-full flex items-center justify-center border-2 border-[#0C1524] shadow-sm pointer-events-none">
                <span className="text-[11px] font-black text-slate-950">3</span>
              </div>
            </div>
            
            <div className="mt-2.5">
              <p className="text-[12px] font-black text-white leading-tight truncate max-w-[75px]" title={podium.rank3.name}>
                {podium.rank3.name.split(" ")[0]}
              </p>
              <p className="text-[9px] font-extrabold text-emerald-400 uppercase tracking-widest">{podium.rank3.machine}</p>
              
              <div className="mt-1 space-y-0.5">
                <div className="text-[13px] font-extrabold text-emerald-400 font-mono">
                  {podium.rank3.yield.toFixed(1)}%
                </div>
                <div className="text-[9px] font-bold text-gray-300">
                  {podium.rank3.output.toLocaleString("id-ID", { maximumFractionDigits: 1 })} m³
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Leaderboard List (Rank 4-8) */}
      <div id="leaderboard_list" className="flex-1 flex flex-col justify-between space-y-1 px-2 min-h-0 pb-1">
        {remainingRanks.length > 0 ? (
          remainingRanks.map((op, idx) => {
            const rankNum = idx + 4;
            return (
              <div
                key={op.machine}
                className="flex items-center justify-between bg-indigo-950/20 border border-indigo-900/50 hover:border-indigo-800/80 p-1.5 rounded-xl transition-all hover:bg-indigo-950/40 gap-2 flex-1"
              >
                {/* Left side: Rank + Avatar + Name/BS info */}
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-4 text-center text-[13px] font-black text-indigo-400">
                    {rankNum}
                  </span>
                  <div 
                    onClick={() => setSelectedDetailOperator({ ...op, rank: rankNum })}
                    className="w-9 h-9 rounded-full overflow-hidden border-[1.5px] border-indigo-900 bg-slate-900 shrink-0 shadow-md cursor-pointer hover:scale-105 active:scale-95 transition-transform duration-200"
                  >
                    <img 
                      src={op.avatar} 
                      alt={op.name} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="truncate">
                    <h4 className="text-[12px] font-black text-white leading-tight truncate">
                      {op.name}
                    </h4>
                    <p className="text-[9px] font-extrabold text-indigo-300 uppercase shrink-0 mt-0.5">
                      {op.machine}
                    </p>
                  </div>
                </div>

                {/* Right side: Stats (Yield % & Output volume/Achievement points) */}
                <div className="flex items-center gap-3 text-right shrink-0">
                  <div className="flex flex-col items-end">
                    <span className="text-[14px] font-black text-white font-mono tracking-tight leading-none">
                      {op.yield.toFixed(1)}%
                    </span>
                    <span className="text-[10px] font-semibold text-gray-400 mt-1.5 leading-none">
                      {op.output.toLocaleString("id-ID", { maximumFractionDigits: 1 })} m³
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-2 text-center text-[10px] font-medium text-indigo-400 bg-indigo-950/10 rounded-xl border border-indigo-950/30">
            Tidak ada data peringkat untuk periode ini.
          </div>
        )}
      </div>

      {/* Detail View Full Screen Overlay/Card */}
      {selectedDetailOperator && (
        <div id="operator_detail_card" className="absolute inset-0 z-50 bg-[#0C1524] flex flex-col text-white overflow-y-auto pb-4 transition-all duration-300">
          {/* Detailed Card View Header */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-indigo-950/40 bg-[#0e192c] shrink-0 sticky top-0 z-10">
            <div className="flex items-center gap-1.5">
              <Trophy size={16} className="text-amber-500" />
              <span className="text-[12px] font-black uppercase tracking-wider text-indigo-300">Detail Operator</span>
            </div>
            <button
              id="close_detail_button"
              onClick={() => setSelectedDetailOperator(null)}
              className="p-1.5 px-2.5 rounded-lg bg-indigo-950 hover:bg-indigo-900 text-white flex items-center gap-1.5 transition-all outline-none border border-indigo-900/40 active:scale-95 cursor-pointer"
            >
              <X size={15} className="text-red-400" />
              <span className="text-[10px] font-black text-indigo-300 uppercase">Kembali</span>
            </button>
          </div>

          <div className="flex-1 flex flex-col items-center justify-start py-5 px-4 space-y-4">
            
            {/* Operator Avatar and Medal/Crown */}
            <div className="relative mt-2">
              {/* Rank Tag Badge */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 whitespace-nowrap bg-[#121c30] border border-indigo-500/30 rounded-full px-3 py-1 shadow-lg flex items-center gap-1">
                <Award size={12} className={
                  selectedDetailOperator.rank === 1 ? "text-yellow-400" :
                  selectedDetailOperator.rank === 2 ? "text-cyan-400" :
                  selectedDetailOperator.rank === 3 ? "text-emerald-400" : "text-indigo-400"
                } />
                <span className="text-[10px] font-black uppercase tracking-widest text-[#FFB800]">
                  Peringkat {selectedDetailOperator.rank}
                </span>
              </div>
              
              {/* Main Circular Profile Photo */}
              <div className={`w-[124px] h-[124px] rounded-full p-[3px] shadow-[0_0_20px_rgba(30,41,59,0.5)] ${
                selectedDetailOperator.rank === 1 ? "bg-gradient-to-tr from-yellow-400 via-amber-300 to-orange-500" :
                selectedDetailOperator.rank === 2 ? "bg-gradient-to-tr from-cyan-400 via-sky-300 to-indigo-500" :
                selectedDetailOperator.rank === 3 ? "bg-gradient-to-tr from-emerald-500 via-teal-400 to-indigo-500" :
                "bg-indigo-950 border border-indigo-800"
              }`}>
                <div className="w-full h-full rounded-full overflow-hidden border-2 border-slate-950">
                  <img 
                    src={selectedDetailOperator.avatar} 
                    alt={selectedDetailOperator.name} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>
            </div>

            {/* Operator Name and Machine info */}
            <div className="text-center">
              <h2 className="text-[18px] font-extrabold text-white leading-tight mt-1">{selectedDetailOperator.name}</h2>
              <div className="mt-1.5 inline-flex items-center gap-2 bg-[#1E2538] border border-indigo-950 px-3 py-1 rounded-full">
                <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest leading-none">
                  Mesin: {selectedDetailOperator.machine}
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-0.5"></span>
              </div>
            </div>

            {/* Stats Section */}
            <div className="w-full space-y-3">
              <h3 className="text-[10px] font-extrabold uppercase text-indigo-400 tracking-wider">
                Kinerja Periode {periodType === "bulanan" ? `Bulan ${selectedMonth}` : `Minggu ${selectedWeek}`}
              </h3>

              {/* Grid of details cards */}
              <div className="grid grid-cols-2 gap-2.5">
                {/* 1. Rendemen Utama (Yield %) Card */}
                <div className="bg-indigo-950/30 border border-indigo-900/40 p-3 rounded-xl flex flex-col justify-between">
                  <span className="text-[9px] font-extrabold text-indigo-200 uppercase">Rendemen Utama</span>
                  <div className="mt-1">
                    <span className="text-[20px] font-black text-cyan-400 font-mono">{selectedDetailOperator.yield.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden mt-2">
                    <div 
                      className="h-full bg-cyan-400 rounded-full"
                      style={{ width: `${Math.min(100, selectedDetailOperator.yield * 1.5)}%` }}
                    />
                  </div>
                </div>

                {/* 2. Skor Performa (Achievement) Card */}
                <div className="bg-indigo-950/30 border border-indigo-900/40 p-3 rounded-xl flex flex-col justify-between">
                  <span className="text-[9px] font-extrabold text-indigo-200 uppercase">Skor Performa</span>
                  <div className="mt-1">
                    <span className="text-[20px] font-black text-yellow-400 font-mono">{selectedDetailOperator.achievement.toFixed(1)}</span>
                    <span className="text-[10px] text-gray-400 ml-1">/ 100</span>
                  </div>
                  <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden mt-2">
                    <div 
                      className="h-full bg-yellow-400 rounded-full"
                      style={{ width: `${selectedDetailOperator.achievement}%` }}
                    />
                  </div>
                </div>

                {/* 3. Output Total Card */}
                <div className="bg-indigo-950/30 border border-indigo-900/40 p-3 rounded-xl">
                  <span className="text-[9px] font-extrabold text-indigo-200 uppercase">Output Total</span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-[18px] font-black text-white font-mono">
                      {selectedDetailOperator.output.toLocaleString("id-ID", { maximumFractionDigits: 1 })}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">m³</span>
                  </div>
                </div>

                {/* 4. Bahan Utama Card */}
                <div className="bg-indigo-950/30 border border-indigo-900/40 p-3 rounded-xl">
                  <span className="text-[9px] font-extrabold text-indigo-200 uppercase">Output Utama</span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-[18px] font-black text-white font-mono">
                      {selectedDetailOperator.utama.toLocaleString("id-ID", { maximumFractionDigits: 1 })}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 font-sans">m³</span>
                  </div>
                </div>
              </div>

              {/* Full Input Total */}
              <div className="bg-indigo-950/25 border border-indigo-900/30 p-3 rounded-xl flex justify-between items-center bg-[#0e172a]">
                <div className="flex flex-col">
                  <span className="text-[9px] font-extrabold text-indigo-200 uppercase">Total Input Piringan</span>
                  <span className="text-[10px] text-slate-400 font-medium mt-0.5">Bahan baku kayu masuk</span>
                </div>
                <div className="text-right flex items-baseline gap-1">
                  <span className="text-[18px] font-black text-emerald-400 font-mono">
                    {selectedDetailOperator.input.toLocaleString("id-ID", { maximumFractionDigits: 1 })}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">m³</span>
                </div>
              </div>
            </div>

            {/* Motivation Badge or Summary */}
            <div className="w-full bg-[#111A2E] border border-indigo-950 p-3.5 rounded-xl flex items-start gap-3 mt-1 shadow-inner">
              <Sparkles size={16} className="text-amber-400 shrink-0 mt-0.5 animate-pulse" />
              <div>
                <h4 className="text-[11px] font-black text-slate-200 uppercase tracking-wider">
                  {selectedDetailOperator.rank <= 3 ? "Kinerja Luar Biasa!" : "Semangat Peningkatan!"}
                </h4>
                <p className="text-[10px] text-[#A5B4FC] mt-1 leading-relaxed">
                  {selectedDetailOperator.rank === 1 ? (
                    "Selamat atas peringkat 1! Pertahankan koordinasi piringan kayu yang optimal untuk menjaga efisiensi tertinggi di pabrik."
                  ) : selectedDetailOperator.rank === 2 || selectedDetailOperator.rank === 3 ? (
                    "Kinerja luar biasa di jajaran podium teratas. Sedikit peningkatan efisiensi input piringan dapat mengantarkan Anda ke posisi juara pertama!"
                  ) : (
                    "Kinerja stabil dan kontributif. Dengan fokus lebih pada penekanan rendemen piringan utama (maksimal hasil kayu), Anda berpeluang besar untuk masuk 3 besar!"
                  )}
                </p>
              </div>
            </div>

          </div>
        </div>
      )}
      
    </div>
  );
}
