import React, { useState } from "react";
import { motion } from "motion/react";
import { Clock, AlertCircle, Wrench, AlertTriangle, Zap, Search } from "lucide-react";
import { cn } from "../lib/utils";
import { DowntimeData } from "../services/sheetService";

interface DowntimeProps {
  downtimeList: DowntimeData[];
  selectedDate: string;
}

export default function Downtime({ downtimeList, selectedDate }: DowntimeProps) {
  const [selectedMachine, setSelectedMachine] = useState("ALL");
  
  const machines = ["ALL", "BS 1", "BS 2", "BS 3", "BS 4", "BS 5", "BS 6", "BS 7", "BS 8"];
  
  // Filter by selected date
  const todaysData = downtimeList.filter(d => d.tanggal === selectedDate);

  const filteredData = selectedMachine === "ALL" 
    ? todaysData 
    : todaysData.filter(d => d.mesin === selectedMachine);

  // Stats
  const totalDowntimeEvents = filteredData.length;
  
  // Try to parse duration string to minutes to calculate total hours. Default fallback.
  const calculateTotalHours = (data: DowntimeData[]) => {
    let totalMinutes = 0;
    data.forEach(d => {
      totalMinutes += calculateMinutes(d.durasi);
    });
    return (totalMinutes / 60).toFixed(1);
  };

  const calculateMinutes = (durasi: string) => {
    let totalMinutes = 0;
    const durationStr = durasi.toLowerCase();
    const match = durationStr.match(/(\d+)\s*(m|j|h|menit|jam|hour)/);
    if (match) {
      const val = parseInt(match[1]);
      if (durationStr.includes("jam") || durationStr.includes("h")) {
        totalMinutes += val * 60;
      } else {
        totalMinutes += val;
      }
    }
    return totalMinutes;
  };

  const groupedByMachine = Object.entries(
    filteredData.reduce((acc, curr) => {
      const m = curr.mesin;
      if (!acc[m]) acc[m] = [];
      acc[m].push(curr);
      return acc;
    }, {} as Record<string, DowntimeData[]>)
  ).sort((a, b) => a[0].localeCompare(b[0]));


  const getIconForType = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes("electrical") || t.includes("listrik")) return <Zap size={16} className="text-yellow-500" />;
    if (t.includes("setup") || t.includes("setel")) return <Clock size={16} className="text-blue-500" />;
    if (t.includes("maintenance") || t.includes("mekanik") || t.includes("rusak") || t.includes("putus")) return <Wrench size={16} className="text-orange-500" />;
    return <AlertTriangle size={16} className="text-red-500" />;
  };

  const getBgForType = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes("electrical") || t.includes("listrik")) return "bg-yellow-50";
    if (t.includes("setup") || t.includes("setel")) return "bg-blue-50";
    if (t.includes("maintenance") || t.includes("mekanik") || t.includes("rusak") || t.includes("putus")) return "bg-orange-50";
    return "bg-red-50";
  };

  return (
    <div className="space-y-4 pb-6">
      {/* Header Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl p-4 text-white shadow-lg shadow-orange-200">
          <div className="flex justify-between items-start mb-2">
            <div className="bg-white/20 p-2 rounded-xl">
              <Clock size={20} />
            </div>
          </div>
          <p className="text-[10px] uppercase tracking-wider font-semibold opacity-80">Total Kejadian</p>
          <div className="flex items-end gap-1">
            <h3 className="text-3xl font-black">{totalDowntimeEvents}</h3>
            <span className="text-xs mb-1 opacity-80 font-medium">Kali</span>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <div className="bg-red-50 p-2 rounded-xl text-red-500">
              <AlertTriangle size={20} />
            </div>
          </div>
          <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-500">Estimasi Waktu</p>
          <div className="flex items-end gap-1">
            <h3 className="text-2xl font-black text-gray-800">
              {calculateTotalHours(filteredData)}
            </h3>
            <span className="text-xs mb-1 text-gray-500 font-medium">Jam</span>
          </div>
        </div>
      </div>

      {/* Machine Filter */}
      <div className="bg-white rounded-xl shadow-sm p-3 border border-gray-100">
        <h3 className="text-[10px] uppercase tracking-wider font-bold text-gray-500 mb-2">Filter Mesin</h3>
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {machines.map(m => (
            <button
              key={m}
              onClick={() => setSelectedMachine(m)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all",
                selectedMachine === m 
                  ? "bg-gray-800 text-white shadow-md shadow-gray-300"
                  : "bg-gray-50 text-gray-500 hover:bg-gray-100"
              )}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Grouped List */}
      <div className="space-y-6 mt-4">
        {filteredData.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex flex-col items-center justify-center text-gray-400">
            <AlertCircle size={32} className="mb-2 text-gray-200" />
            <p className="text-xs font-medium">Tidak ada downtime terdeteksi</p>
          </div>
        ) : (
          groupedByMachine.map(([machineName, events], index) => {
            const totalMinutes = events.reduce((sum, item) => sum + calculateMinutes(item.durasi), 0);
            const formattedName = machineName.charAt(0).toUpperCase() + machineName.slice(1).toLowerCase().replace(' ', '');
            
            return (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                key={machineName} 
              >
                <div className="flex items-center justify-between mb-3 px-1">
                  <h2 className="text-2xl font-black text-[#1a1f36]">
                    {formattedName}
                  </h2>
                  <div className="px-3 py-1.5 bg-pink-100 text-pink-600 font-bold text-xs rounded-md uppercase tracking-wider">
                    {events.length} EVENT
                  </div>
                </div>

                <div className="bg-[#f8f9fc] rounded-2xl p-4 border border-blue-50/50 shadow-sm">
                  <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
                     <span className="text-base font-bold text-[#5c6b8a] tracking-wider">{selectedDate}</span>
                     <div className="px-3 py-1.5 bg-pink-100 text-pink-500 font-bold text-sm rounded-md tracking-wide">
                       {totalMinutes} mnt
                     </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                     {events.map((evt) => (
                        <div key={evt.id} className="inline-flex items-center gap-1.5 border border-gray-200 rounded-md px-3 py-1.5 bg-transparent text-[#4f5e7b] text-sm font-medium transition-all">
                          <Clock size={14} className="text-pink-400 shrink-0" />
                          <span>{evt.keterangan}: {evt.durasi}</span>
                        </div>
                     ))}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
