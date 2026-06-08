/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Calculator as CalcIcon, 
  LayoutDashboard, 
  History as HistoryIcon, 
  Settings,
  Leaf,
  TrendingUp,
  DollarSign,
  Scale,
  RefreshCw,
  BarChart3,
  Package,
  Layers,
  Clock
} from "lucide-react";
import { cn } from "./lib/utils";
import { fetchSheetData, fetchDowntimeData, DowntimeData } from "./services/sheetService";

// Components
import Calculator from "./components/Calculator";
import Dashboard from "./components/Dashboard";
import History from "./components/History";
import Performance from "./components/Performance";
import Analysis from "./components/Analysis";
import Downtime from "./components/Downtime";
import { sendWhatsAppNotification, sendDowntimeNotification } from "./services/notificationService";

export type Calculation = {
  id: string;
  date: string;
  machine: string;
  line: string;
  input: number;
  utama: number;
  yield_primary: number;
  turunan: number;
  yield_secondary: number;
  lokal: number;
  output: number; // total
  yield_total: number;
  yield: number; // alias for yield_total
  target: number;
  achievement: number;
  week: number;
  month: number;
  quartal: number;
  timestamp: number;
};

const TABS = ["calculator", "dashboard", "analysis", "performance", "history", "downtime"] as const;
type TabType = typeof TABS[number];

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [history, setHistory] = useState<Calculation[]>([]);
  const [downtime, setDowntime] = useState<DowntimeData[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncSuccess, setSyncSuccess] = useState<boolean>(false);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
  };

  const handleSwipe = (direction: number) => {
    const currentIndex = TABS.indexOf(activeTab);
    const nextIndex = currentIndex + direction;
    if (nextIndex >= 0 && nextIndex < TABS.length) {
      setActiveTab(TABS[nextIndex]);
    }
  };

  const filteredHistory = history.filter(calc => {
    // Ensure both are in YYYY-MM-DD format for comparison
    const calcDate = calc.date.includes('T') ? calc.date.split('T')[0] : calc.date;
    return calcDate === selectedDate;
  });

  const selectedDateRef = useRef(selectedDate);
  useEffect(() => {
    selectedDateRef.current = selectedDate;
  }, [selectedDate]);

  const isSyncingRef = useRef(false);

  const handleSync = useCallback(async (isAutoRefresh = false) => {
    if (isSyncingRef.current) return;
    
    isSyncingRef.current = true;
    setIsSyncing(true);
    if (!isAutoRefresh) setSyncError(null);
    if (!isAutoRefresh) setSyncSuccess(false);

    try {
      const [data, downtimeDataRes] = await Promise.all([
         fetchSheetData(),
         fetchDowntimeData()
      ]);
      setDowntime(downtimeDataRes);
      
      if (data.length === 0) {
        if (!isAutoRefresh) setSyncError("Tidak ada data ditemukan di Google Sheet.");
        setIsSyncing(false);
        isSyncingRef.current = false;
        return;
      }

      const currentDataStr = JSON.stringify(data);
      const prevDataStr = localStorage.getItem("rendemen_last_raw_data");
      
      const currentDowntimeStr = JSON.stringify(downtimeDataRes);
      const prevDowntimeStr = localStorage.getItem("rendemen_last_downtime_data");
      
      const todayDateStr = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD
      const lastDailyNotifDate = localStorage.getItem("rendemen_last_daily_notif_date");
      const currentHour = new Date().getHours();
      
      // Kirim notif harian otomatis jika auto refresh, waktu >= 19:00, dan belum dikirim hari ini
      const isDailyNotifDue = isAutoRefresh && currentHour >= 19 && lastDailyNotifDate !== todayDateStr;

      if (isAutoRefresh && !isDailyNotifDue && prevDataStr === currentDataStr && prevDowntimeStr === currentDowntimeStr) {
        setIsSyncing(false);
        isSyncingRef.current = false;
        return; // No changes detected
      }
      
      localStorage.setItem("rendemen_last_raw_data", currentDataStr);
      localStorage.setItem("rendemen_last_downtime_data", currentDowntimeStr);

      const mappedHistory: Calculation[] = data.map(item => ({
        id: `sheet-${item.tanggal}-${item.mesin}-${item.input}-${item.output}`,
        date: item.tanggal || new Date().toISOString(),
        machine: item.mesin,
        line: item.line,
        input: item.input,
        utama: item.utama,
        yield_primary: item.yield_primary,
        turunan: item.turunan,
        yield_secondary: item.yield_secondary,
        lokal: item.lokal,
        output: item.output,
        yield_total: item.yield_total,
        yield: item.yield_total,
        target: item.target,
        achievement: item.achievement,
        week: item.week,
        month: item.month,
        quartal: item.quartal,
        timestamp: new Date(item.tanggal).getTime() || Date.now()
      }));
      
      setHistory(prev => {
        const manualEntries = prev.filter(p => !p.id.startsWith('sheet-'));
        const merged = [...mappedHistory, ...manualEntries].sort((a, b) => b.timestamp - a.timestamp);
        
        if (merged.length > 0) {
          const latestDate = merged[0].date.includes('T') ? merged[0].date.split('T')[0] : merged[0].date;
          const currentHasData = merged.some(item => (item.date.includes('T') ? item.date.split('T')[0] : item.date) === selectedDateRef.current);
          if (!currentHasData) {
            setSelectedDate(latestDate);
          }
        }
        
        return merged;
      });

      if (!isAutoRefresh) setSyncSuccess(true);
      
      if (isAutoRefresh) {
        if (isDailyNotifDue) {
          sendWhatsAppNotification(mappedHistory).catch(e => console.error("WA Notify Error:", e));
          sendDowntimeNotification(downtimeDataRes).catch(e => console.error("WA Downtime Notify Error:", e));
          localStorage.setItem("rendemen_last_daily_notif_date", todayDateStr);
        } else if (currentHour >= 19) {
          // Jika ada perubahan data dan waktu sudah >= 19:00, kirim notifikasi otomatis
          if (prevDataStr !== currentDataStr && prevDataStr !== null) {
            sendWhatsAppNotification(mappedHistory).catch(e => console.error("WA Notify Error:", e));
          }
          if (prevDowntimeStr !== currentDowntimeStr && prevDowntimeStr !== null) {
            sendDowntimeNotification(downtimeDataRes).catch(e => console.error("WA Downtime Notify Error:", e));
          }
        }
      } else {
        // Manual Sync (selalu kirim notifikasi)
        sendWhatsAppNotification(mappedHistory).catch(e => console.error("WA Notify Error:", e));
        sendDowntimeNotification(downtimeDataRes).catch(e => console.error("WA Downtime Notify Error:", e));
        
        if (currentHour >= 19) {
          localStorage.setItem("rendemen_last_daily_notif_date", todayDateStr);
        }
      }
      
      setLastSync(new Date().toLocaleString("id-ID", { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      }));
      
      if (!isAutoRefresh) {
        setTimeout(() => setSyncSuccess(false), 3000);
      }
    } catch (err: any) {
      console.error("Sync Error:", err);
      if (!isAutoRefresh) {
        let message = err.message || "Gagal sinkronisasi data.";
        if (message === "Failed to fetch") {
          message = "Gagal terhubung ke Google Sheets. Pastikan Sheet sudah di-share (Anyone with the link can view) dan koneksi internet stabil.";
        }
        setSyncError(message);
      }
    } finally {
      setIsSyncing(false);
      isSyncingRef.current = false;
    }
  }, []);

  // Auto Refresh Polling (every 60 seconds)
  useEffect(() => {
    // Initial fetch on mount
    handleSync(true);
    
    const interval = setInterval(() => {
      handleSync(true);
    }, 60000);
    return () => clearInterval(interval);
  }, [handleSync]);

  const [lastSync, setLastSync] = useState<string | null>(null);

  // Load history from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("rendemen_history");
    const savedSync = localStorage.getItem("rendemen_last_sync");
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
    if (savedSync) setLastSync(savedSync);
  }, []);

  // Save history to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("rendemen_history", JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    if (lastSync) localStorage.setItem("rendemen_last_sync", lastSync);
  }, [lastSync]);

  const addCalculation = (calc: Omit<Calculation, "id" | "date" | "timestamp">) => {
    const newCalc: Calculation = {
      ...calc,
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString(),
      timestamp: Date.now(),
    };
    const updatedHistory = [newCalc, ...history];
    setHistory(updatedHistory);
    // WhatsApp Notification for manual entry
    sendWhatsAppNotification([newCalc]).catch(e => console.error("WA Notify Error:", e));
  };

  const deleteCalculation = (id: string) => {
    setHistory(history.filter(c => c.id !== id));
  };

  return (
    <div className="h-[100dvh] w-full bg-[#F4F7FE] text-[#1a1a1a] font-sans flex flex-col max-w-md mx-auto shadow-2xl relative overflow-hidden">
      {/* Header - Purple Gradient */}
      <header className={cn(
        "bg-gradient-to-b from-[#311B92] to-[#512DA8] text-white relative shrink-0 shadow-md",
        activeTab === "analysis" 
          ? "px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3 rounded-b-2xl" 
          : "px-4 pt-[max(2rem,env(safe-area-inset-top))] pb-12"
      )}>
        {activeTab === "analysis" ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-white/10 p-1 rounded-lg backdrop-blur-sm border border-white/20">
                <BarChart3 size={16} className="text-white" />
              </div>
              <div>
                <h1 className="text-xs font-black tracking-tight uppercase leading-none">RENDEMENKU</h1>
                <p className="text-[9px] font-bold text-indigo-300 uppercase tracking-widest mt-0.5 whitespace-nowrap">Review Harian</p>
              </div>
            </div>
            
            <div className="bg-white/10 px-2.5 py-1 rounded-lg border border-white/10 flex items-center justify-center backdrop-blur-sm">
              <span className="text-[10px] font-black text-white uppercase tracking-wider">
                {new Date(selectedDate).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()}
              </span>
            </div>

            <button 
              onClick={() => handleSync(false)}
              disabled={isSyncing}
              className={cn(
                "p-1.5 text-white/70 hover:text-white transition-all rounded-full hover:bg-white/10 flex items-center justify-center",
                isSyncing && "animate-spin text-white"
              )}
            >
              <RefreshCw size={14} />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="flex items-center gap-3">
              <div className="bg-white p-1.5 rounded-lg shadow-lg">
                <div className="w-8 h-8 bg-white flex items-center justify-center">
                  <div className="flex items-end gap-0.5 h-full w-full p-1">
                    <div className="w-1/3 bg-green-500 h-[40%]" />
                    <div className="w-1/3 bg-blue-500 h-[80%]" />
                    <div className="w-1/3 bg-yellow-500 h-[60%]" />
                  </div>
                </div>
              </div>
              <h1 className="text-2xl font-black tracking-tight uppercase">RENDEMENKU</h1>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Container Icon - Left of Slogan */}
              <div className="flex flex-col items-center">
                <div className="bg-white/20 p-0.5 rounded-lg backdrop-blur-sm border border-white/10 overflow-hidden">
                  <img 
                    src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=100&auto=format&fit=crop" 
                    alt="Container"
                    className="w-6 h-6 object-cover rounded-md"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <span className="text-[7px] font-black mt-0.5">20 CONT</span>
              </div>

              <p className="text-[10px] font-bold leading-tight opacity-90 max-w-[200px] uppercase tracking-wider">
                TARGET JELAS • UKURAN PASTI • HASIL NYATA
              </p>

              {/* Wood Pile Icon - Right of Slogan */}
              <div className="flex flex-col items-center">
                <div className="bg-white/20 p-0.5 rounded-lg backdrop-blur-sm border border-white/10 overflow-hidden">
                  <img 
                    src="https://images.unsplash.com/photo-1516467508483-a7212febe31a?q=80&w=100&auto=format&fit=crop" 
                    alt="Wood"
                    className="w-6 h-6 object-cover rounded-md"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <span className="text-[7px] font-black mt-0.5">765 M3</span>
              </div>
            </div>

            <div className="absolute top-6 right-4 flex items-center gap-3">
              {lastSync && (
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-[8px] font-bold opacity-60 uppercase tracking-tighter">Terakhir Sinkron</span>
                  <span className="text-[9px] font-black">{lastSync}</span>
                </div>
              )}
              <button 
                onClick={() => handleSync(false)}
                disabled={isSyncing}
                className={cn(
                  "p-2 text-white/70 hover:text-white transition-all rounded-full hover:bg-white/10 flex items-center gap-2",
                  isSyncing && "animate-spin text-white"
                )}
              >
                <RefreshCw size={20} />
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className={cn(
        "flex-1 relative z-10 flex flex-col min-h-0",
        activeTab === "analysis" 
          ? "pt-2 pb-[max(5rem,calc(env(safe-area-inset-bottom)+4.2rem))] px-2 mt-0 h-full overflow-hidden" 
          : "overflow-y-auto pb-32 px-4 -mt-6"
      )}>
        {syncError && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-medium flex items-center justify-between"
          >
            <span>⚠️ {syncError}</span>
            <button onClick={() => setSyncError(null)} className="font-bold">X</button>
          </motion.div>
        )}

        {syncSuccess && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-4 p-3 bg-green-50 border border-green-100 rounded-xl text-green-600 text-xs font-medium flex items-center justify-between"
          >
            <span>✅ Sinkronisasi berhasil! Data diperbarui.</span>
            <button onClick={() => setSyncSuccess(false)} className="font-bold">X</button>
          </motion.div>
        )}
        
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={(_, info) => {
            if (info.offset.x > 100) handleSwipe(-1);
            else if (info.offset.x < -100) handleSwipe(1);
          }}
          className="min-h-full"
        >
          {activeTab === "calculator" && <Calculator onCalculate={addCalculation} />}
          {activeTab === "dashboard" && (
            <Dashboard 
              history={history} 
              filteredHistory={filteredHistory}
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
            />
          )}
          {activeTab === "history" && <History history={history} selectedDate={selectedDate} onDelete={deleteCalculation} />}
          {activeTab === "performance" && <Performance history={history} selectedDate={selectedDate} />}
          {activeTab === "analysis" && <Analysis history={history} selectedDate={selectedDate} />}
          {activeTab === "downtime" && <Downtime downtimeList={downtime} selectedDate={selectedDate} />}
        </motion.div>
      </main>

      {/* Bottom Navigation */}
      <nav className="absolute bottom-0 left-0 right-0 w-full bg-white/90 backdrop-blur-md border-t border-gray-100 grid grid-cols-6 items-center z-20 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1 px-1">
        <NavButton 
          active={activeTab === "calculator"} 
          onClick={() => handleTabChange("calculator")}
          icon={<CalcIcon size={18} className="sm:w-5 sm:h-5" />}
          label="Hitung"
        />
        <NavButton 
          active={activeTab === "dashboard"} 
          onClick={() => handleTabChange("dashboard")}
          icon={<LayoutDashboard size={18} className="sm:w-5 sm:h-5" />}
          label="Beranda"
        />
        <NavButton 
          active={activeTab === "analysis"} 
          onClick={() => handleTabChange("analysis")}
          icon={<BarChart3 size={18} className="sm:w-5 sm:h-5" />}
          label="Review"
        />
        <NavButton 
          active={activeTab === "performance"} 
          onClick={() => handleTabChange("performance")}
          icon={<TrendingUp size={18} className="sm:w-5 sm:h-5" />}
          label="Performa"
        />
        <NavButton 
          active={activeTab === "history"} 
          onClick={() => handleTabChange("history")}
          icon={<HistoryIcon size={18} className="sm:w-5 sm:h-5" />}
          label="Rekap"
        />
        <NavButton 
          active={activeTab === "downtime"} 
          onClick={() => handleTabChange("downtime")}
          icon={<Clock size={18} className="sm:w-5 sm:h-5" />}
          label="Downtime"
        />
      </nav>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center justify-center gap-1 pb-1.5 pt-2 w-full min-w-0 transition-all duration-300 z-10",
        active ? "text-green-600" : "text-gray-400 hover:text-gray-600"
      )}
    >
      {active && (
        <motion.div 
          layoutId="nav-pill"
          className="absolute inset-x-1 inset-y-0.5 bg-green-50 rounded-xl -z-10"
          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
        />
      )}
      <div className="p-0.5">
        {icon}
      </div>
      <span className="text-[7.5px] sm:text-[9px] font-black uppercase tracking-wider truncate max-w-full px-0.5 text-center">{label}</span>
    </button>
  );
}
