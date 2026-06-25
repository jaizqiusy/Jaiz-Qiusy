import React from "react";
import { motion } from "motion/react";
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Activity, 
  AlertCircle,
  CheckCircle2,
  BarChart3,
  ZoomIn,
  ZoomOut,
  RotateCcw
} from "lucide-react";
import { Calculation } from "../App";
import { cn } from "../lib/utils";

interface AnalysisProps {
  history: Calculation[];
  selectedDate: string;
}

export default function Analysis({ history, selectedDate }: AnalysisProps) {
  const [zoomLevel, setZoomLevel] = React.useState(1);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const lastTouchDistance = React.useRef<number | null>(null);

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.1, 2));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.1, 0.5));
  const handleResetZoom = () => setZoomLevel(1);

  // Multi-touch gestures for Android/Mobile
  React.useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const handleTouchStart = (e: TouchEvent) => {
      // Five-finger touch to reset zoom
      if (e.touches.length === 5) {
        handleResetZoom();
        return;
      }

      if (e.touches.length === 2) {
        const distance = Math.hypot(
          e.touches[0].pageX - e.touches[1].pageX,
          e.touches[0].pageY - e.touches[1].pageY
        );
        lastTouchDistance.current = distance;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && lastTouchDistance.current !== null) {
        // Prevent default browser zoom to use our custom zoom system
        if (e.cancelable) e.preventDefault();
        
        const distance = Math.hypot(
          e.touches[0].pageX - e.touches[1].pageX,
          e.touches[0].pageY - e.touches[1].pageY
        );
        
        const delta = distance - lastTouchDistance.current;
        if (Math.abs(delta) > 10) { // Threshold to prevent jitter
          setZoomLevel(prev => {
            const nextZoom = prev + (delta > 0 ? 0.05 : -0.05);
            return Math.min(Math.max(nextZoom, 0.5), 2);
          });
          lastTouchDistance.current = distance;
        }
      }
    };

    const handleTouchEnd = () => {
      lastTouchDistance.current = null;
    };

    element.addEventListener("touchstart", handleTouchStart, { passive: false });
    element.addEventListener("touchmove", handleTouchMove, { passive: false });
    element.addEventListener("touchend", handleTouchEnd);

    return () => {
      element.removeEventListener("touchstart", handleTouchStart);
      element.removeEventListener("touchmove", handleTouchMove);
      element.removeEventListener("touchend", handleTouchEnd);
    };
  }, []);

  const filteredData = history.filter(calc => {
    const calcDate = calc.date.includes('T') ? calc.date.split('T')[0] : calc.date;
    return calcDate === selectedDate;
  });

  // BS Machines Data
  const bsData = filteredData.filter(item => /^BS\s*[1-8]$/i.test(item.machine) || /^BS[1-8]$/i.test(item.machine));
  
  // Main Machines (Poni A, Poni B, Breakdown)
  const mainStations = [
    { search: ["PONIA", "PONI A", "PONI_A"], label: "PONI A", short: "PA" },
    { search: ["PONIB", "PONI B", "PONI_B"], label: "PONI B", short: "PB" },
    { search: ["BREAKDOWN", "BREAK", "BD", "SYSTEM", "DOWNTIME"], label: "BREAK", short: "BD" }
  ].map(m => {
    // Collect all entries for this machine category (in case multiple rows exist)
    const entries = filteredData.filter(item => {
      const mName = item.machine.toUpperCase();
      return m.search.some(s => 
        mName === s.toUpperCase() || 
        mName === s.replace(/\s/g, "").toUpperCase() ||
        mName.includes(s.toUpperCase())
      );
    });

    if (entries.length === 0) return null;

    // If multiple entries exist, sum them up for the summary row
    // (We use the first entry as base and sum numeric values)
    const baseEntry = { ...entries[0] };
    if (entries.length > 1) {
      baseEntry.input = entries.reduce((s, e) => s + e.input, 0);
      baseEntry.utama = entries.reduce((s, e) => s + e.utama, 0);
      baseEntry.turunan = entries.reduce((s, e) => s + e.turunan, 0);
      baseEntry.lokal = entries.reduce((s, e) => s + e.lokal, 0);
      baseEntry.output = entries.reduce((s, e) => s + e.output, 0);
      baseEntry.utama_non_pilot_ladder = entries.reduce((s, e) => s + (e.utama_non_pilot_ladder || 0), 0);
      baseEntry.yield_primary = baseEntry.input > 0 ? baseEntry.utama / baseEntry.input : 0;
      baseEntry.achievement = entries.reduce((s, e) => s + e.achievement, 0) / entries.length;
    }

    return { ...baseEntry, machine: m.label, short: m.short } as Calculation;
  }).filter(Boolean) as Calculation[];

  const allDisplayData = [...bsData, ...mainStations];
  
  const totalInput = bsData.reduce((acc, curr) => acc + curr.input, 0);
  const totalOutput = bsData.reduce((acc, curr) => acc + curr.output, 0);
  const totalUtama = bsData.reduce((acc, curr) => acc + curr.utama, 0);
  const avgYield = totalInput > 0 ? (totalUtama / totalInput) * 100 : 0;
  const avgAchievement = bsData.length > 0 ? (bsData.reduce((acc, curr) => acc + curr.achievement, 0) / bsData.length) * 100 : 0;

  // Analysis Logic
  const getCalcYield = (m: any) => m.input > 0 ? (m.utama / m.input) * 100 : 0;
  
  const activeBsData = bsData.filter(m => m.input > 0 || m.output > 0);

  const topMachine = activeBsData.length > 0 ? [...activeBsData].sort((a, b) => getCalcYield(b) - getCalcYield(a))[0] : null;
  const lowMachine = activeBsData.length > 0 ? [...activeBsData].sort((a, b) => getCalcYield(a) - getCalcYield(b))[0] : null;
  const topOutputMachine = activeBsData.length > 0 ? [...activeBsData].sort((a, b) => b.output - a.output)[0] : null;
  const lowOutputMachine = activeBsData.length > 0 ? [...activeBsData].sort((a, b) => a.output - b.output)[0] : null;



  return (
    <div className="flex-1 flex flex-col min-h-0 h-full space-y-2 pb-1" ref={containerRef}>
      {/* Slim Zoom Controls */}
      <div className="flex items-center justify-between px-1.5 py-1 shrink-0 bg-white/40 rounded-xl border border-white/50 shadow-sm">
        <span className="text-[10px] font-black text-indigo-800 uppercase tracking-wider">
          Skala Tampilan / Zoom
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex bg-white/60 backdrop-blur-md rounded-lg p-0.5 border border-indigo-200/50 overflow-hidden shadow-sm items-center">
            <button 
              onClick={handleZoomOut}
              className="p-1 hover:bg-indigo-100/50 text-indigo-950 transition-all active:scale-95 rounded"
              title="Zoom Out"
            >
              <ZoomOut size={12} />
            </button>
            <div className="w-px bg-indigo-200/40 self-stretch my-1" />
            <div className="px-1.5 flex items-center justify-center min-w-[28px]">
              <span className="text-[9px] font-black text-indigo-950 font-mono text-center">
                {Math.round(zoomLevel * 100)}%
              </span>
            </div>
            <div className="w-px bg-indigo-200/40 self-stretch my-1" />
            <button 
              onClick={handleZoomIn}
              className="p-1 hover:bg-indigo-100/50 text-indigo-950 transition-all active:scale-95 rounded"
              title="Zoom In"
            >
              <ZoomIn size={12} />
            </button>
          </div>
          <button 
            onClick={handleResetZoom}
            className="p-1.5 bg-white/60 backdrop-blur-md rounded-lg border border-indigo-200/50 text-indigo-950 hover:bg-white/80 transition-all shadow-sm"
            title="Reset Zoom"
          >
            <RotateCcw size={10} />
          </button>
        </div>
      </div>

      <div 
        style={{ zoom: zoomLevel }}
        className="transition-all duration-300 origin-top flex-1 flex flex-col min-h-0 justify-between gap-2"
      >
        {bsData.length === 0 ? (
          <div className="py-20 text-center bg-gradient-to-br from-blue-100 via-indigo-100 to-purple-200 rounded-3xl border border-white/60 shadow-lg">
            <AlertCircle className="mx-auto text-indigo-400 mb-3" size={48} />
            <p className="text-sm font-black text-indigo-800 uppercase tracking-widest">Tidak ada data untuk direview</p>
            <p className="text-[10px] font-bold text-indigo-600 mt-2">Pilih tanggal lain atau sinkronisasi ulang data Anda</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0 justify-between gap-2">
            {/* Detailed Machine Status Grid */}
            <div className="bg-gradient-to-br from-blue-100 via-indigo-100 to-purple-200 rounded-2xl border border-white/60 overflow-hidden shadow-md flex-1 flex flex-col min-h-0">
              <div className="overflow-auto flex-1">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-[#e0e7ff] z-10">
                    <tr className="bg-white/40 text-[10px] font-black text-indigo-800 uppercase tracking-wider border-b border-indigo-200">
                      <th className="px-2 py-2 border-r border-indigo-200/60">Mesin</th>
                      <th className="px-2 py-2 text-center border-r border-indigo-200/60">Input</th>
                      <th className="px-2 py-2 text-center border-r border-indigo-200/60">Rend %</th>
                      <th className="px-2 py-2 text-center border-r border-indigo-200/60">Rend % No PL</th>
                      <th className="px-2 py-2 text-center border-r border-indigo-200/60">Output</th>
                      <th className="px-2 py-2 text-center">Point</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-indigo-200/60">
                    {allDisplayData.sort((a, b) => {
                      const isBSA = a.machine.startsWith("BS");
                      const isBSB = b.machine.startsWith("BS");
                      
                      if (isBSA && !isBSB) return -1;
                      if (!isBSA && isBSB) return 1;
                      
                      if (isBSA && isBSB) {
                        const numA = parseInt(a.machine.replace(/\D/g, "")) || 0;
                        const numB = parseInt(b.machine.replace(/\D/g, "")) || 0;
                        return numA - numB;
                      }
                      
                      const order = ["PONI A", "PONI B", "BREAK"];
                      const posA = order.indexOf(a.machine);
                      const posB = order.indexOf(b.machine);
                      
                      if (posA !== -1 && posB !== -1) return posA - posB;
                      if (posA !== -1) return -1;
                      if (posB !== -1) return 1;
                      
                      return a.machine.localeCompare(b.machine);
                    }).map((item) => {
                      const yieldVal = getCalcYield(item);
                      const achievementVal = Math.min(10, item.achievement * 10);
                      
                      return (
                        <tr key={item.id} className="hover:bg-white/40 transition-colors">
                          <td className="px-2 py-1.5 border-r border-indigo-200/60">
                            <span className="text-[12.5px] font-black text-indigo-950 uppercase tracking-tighter leading-none">{item.machine}</span>
                          </td>
                          <td className="px-2 py-1.5 text-center border-r border-indigo-200/60">
                            <span className="text-[14px] font-black text-blue-700 tracking-tighter">
                              {item.input.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </td>
                          <td className="px-2 py-1.5 text-center border-r border-indigo-200/60">
                            <span className="text-[14px] font-black text-indigo-900 tracking-tighter">
                              {yieldVal.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
                            </span>
                          </td>
                          <td className="px-2 py-1.5 text-center border-r border-indigo-200/60">
                            <span className="text-[14px] font-black text-teal-700 tracking-tighter">
                              {item.input > 0 ? ((item.utama_non_pilot_ladder || 0) / item.input * 100).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0,00"}%
                            </span>
                          </td>
                          <td className="px-2 py-1.5 text-center border-r border-indigo-200/60">
                            <span className="text-[14px] font-black text-emerald-700 tracking-tighter">
                              {item.output.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            <span className="text-[14px] font-black text-indigo-900">
                              {achievementVal.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Insight Cards */}
            <div className="space-y-1.5 shrink-0">
              <h4 className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em] px-1">Performance Highlights</h4>
              
              <div className="grid grid-cols-2 gap-1.5">
                {/* Rendemen Highlights */}
                <div className="space-y-1">
                  {topMachine && (
                    <div className="bg-gradient-to-br from-blue-100 via-indigo-100 to-purple-200 border border-white/60 p-1.5 rounded-xl flex flex-col gap-0.5 shadow-md relative overflow-hidden">
                      <div className="flex items-center justify-between gap-1 overflow-hidden">
                        <div className="flex items-center gap-0.5">
                           <div className="bg-emerald-500 p-0.5 rounded text-white shadow-sm">
                             <TrendingUp size={8} />
                           </div>
                           <p className="text-[7px] font-black text-emerald-700 uppercase tracking-tight">UTAMA ↑</p>
                        </div>
                        <p className="text-[11px] font-black text-emerald-700 font-mono tracking-tighter drop-shadow-sm whitespace-nowrap">
                          {getCalcYield(topMachine).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
                        </p>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] font-black text-indigo-950 leading-none truncate max-w-[48px]">{topMachine.machine}</p>
                        <p className="text-[7.5px] font-bold text-indigo-700 uppercase tracking-tighter">Yield</p>
                      </div>
                    </div>
                  )}

                  {lowMachine && (
                    <div className="bg-gradient-to-br from-blue-100 via-indigo-100 to-purple-200 border border-white/60 p-1.5 rounded-xl flex flex-col gap-0.5 shadow-md relative overflow-hidden">
                      <div className="flex items-center justify-between gap-1 overflow-hidden">
                        <div className="flex items-center gap-0.5">
                           <div className="bg-rose-500 p-0.5 rounded text-white shadow-sm">
                             <TrendingDown size={8} />
                           </div>
                           <p className="text-[7px] font-black text-rose-700 uppercase tracking-tight">UTAMA ↓</p>
                        </div>
                        <p className="text-[11px] font-black text-rose-700 font-mono tracking-tighter drop-shadow-sm whitespace-nowrap">
                          {getCalcYield(lowMachine).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
                        </p>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] font-black text-indigo-950 leading-none truncate max-w-[48px]">{lowMachine.machine}</p>
                        <p className="text-[7.5px] font-bold text-indigo-700 uppercase tracking-tighter">Yield</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Output Highlights */}
                <div className="space-y-1">
                  {topOutputMachine && (
                    <div className="bg-gradient-to-br from-blue-100 via-indigo-100 to-purple-200 border border-white/60 p-1.5 rounded-xl flex flex-col gap-0.5 shadow-md relative overflow-hidden">
                      <div className="flex items-center justify-between gap-1 overflow-hidden">
                        <div className="flex items-center gap-0.5">
                           <div className="bg-blue-600 p-0.5 rounded text-white shadow-sm">
                             <TrendingUp size={8} />
                           </div>
                           <p className="text-[7px] font-black text-blue-700 uppercase tracking-tight">OUT ↑</p>
                        </div>
                        <p className="text-[11px] font-black text-blue-700 font-mono tracking-tighter drop-shadow-sm whitespace-nowrap">
                          {topOutputMachine.output.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                        </p>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] font-black text-indigo-950 leading-none truncate max-w-[48px]">{topOutputMachine.machine}</p>
                        <p className="text-[7.5px] font-bold text-indigo-700 uppercase tracking-tighter">M3</p>
                      </div>
                    </div>
                  )}

                  {lowOutputMachine && (
                    <div className="bg-gradient-to-br from-blue-100 via-indigo-100 to-purple-200 border border-white/60 p-1.5 rounded-xl flex flex-col gap-0.5 shadow-md relative overflow-hidden">
                      <div className="flex items-center justify-between gap-1 overflow-hidden">
                        <div className="flex items-center gap-0.5">
                           <div className="bg-indigo-600 p-0.5 rounded text-white shadow-sm">
                             <TrendingDown size={8} />
                           </div>
                           <p className="text-[7px] font-black text-indigo-800 uppercase tracking-tight">OUT ↓</p>
                        </div>
                        <p className="text-[11px] font-black text-indigo-800 font-mono tracking-tighter drop-shadow-sm whitespace-nowrap">
                          {lowOutputMachine.output.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                        </p>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] font-black text-indigo-950 leading-none truncate max-w-[48px]">{lowOutputMachine.machine}</p>
                        <p className="text-[7.5px] font-bold text-indigo-700 uppercase tracking-tighter">M3</p>
                      </div>
                    </div>
                  )}
                </div>


              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
