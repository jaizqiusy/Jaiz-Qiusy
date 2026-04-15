/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
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
  RefreshCw
} from "lucide-react";
import { cn } from "./lib/utils";
import { fetchSheetData } from "./services/sheetService";

// Components
import Calculator from "./components/Calculator";
import Dashboard from "./components/Dashboard";
import History from "./components/History";
import Performance from "./components/Performance";

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

const TABS = ["calculator", "dashboard", "history", "performance"] as const;
type TabType = typeof TABS[number];

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [history, setHistory] = useState<Calculation[]>([]);
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

  const handleSync = async () => {
    if (isSyncing) return;
    
    setIsSyncing(true);
    setSyncError(null);
    setSyncSuccess(false);
    
    try {
      const data = await fetchSheetData();
      
      if (data.length === 0) {
        setSyncError("Tidak ada data ditemukan di Google Sheet.");
        return;
      }

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
      
      // Refresh logic: Replace all existing sheet entries with the new ones from the sheet
      // while preserving manual entries (those not starting with 'sheet-')
      setHistory(prev => {
        const manualEntries = prev.filter(p => !p.id.startsWith('sheet-'));
        const merged = [...mappedHistory, ...manualEntries].sort((a, b) => b.timestamp - a.timestamp);
        
        // If current selected date has no data, try to select the latest date from merged data
        if (merged.length > 0) {
          const latestDate = merged[0].date.includes('T') ? merged[0].date.split('T')[0] : merged[0].date;
          const currentHasData = merged.some(item => (item.date.includes('T') ? item.date.split('T')[0] : item.date) === selectedDate);
          if (!currentHasData) {
            setSelectedDate(latestDate);
          }
        }
        
        return merged;
      });

      setSyncSuccess(true);
      setLastSync(new Date().toLocaleString("id-ID", { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      }));
      setTimeout(() => setSyncSuccess(false), 3000);
    } catch (err: any) {
      console.error("Sync Error:", err);
      let message = err.message || "Gagal sinkronisasi data.";
      
      if (message === "Failed to fetch") {
        message = "Gagal terhubung ke Google Sheets. Pastikan Sheet sudah di-share (Anyone with the link can view) dan koneksi internet stabil.";
      }
      
      setSyncError(message);
    } finally {
      setIsSyncing(false);
    }
  };

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
    setHistory([newCalc, ...history]);
  };

  const deleteCalculation = (id: string) => {
    setHistory(history.filter(c => c.id !== id));
  };

  return (
    <div className="min-h-screen bg-[#F4F7FE] text-[#1a1a1a] font-sans flex flex-col max-w-md mx-auto shadow-2xl relative overflow-hidden">
      {/* Header - Purple Gradient */}
      <header className="bg-gradient-to-b from-[#5E35B1] to-[#7E57C2] px-6 pt-10 pb-12 text-white relative">
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
          
          <p className="text-[10px] font-bold leading-tight opacity-90 max-w-[300px] uppercase tracking-wider">
            TARGET JELAS • UKURAN PASTI • HASIL NYATA
          </p>

          <div className="absolute top-6 right-4 flex items-center gap-3">
            {lastSync && (
              <div className="hidden xs:flex flex-col items-end">
                <span className="text-[8px] font-bold opacity-60 uppercase tracking-tighter">Terakhir Sinkron</span>
                <span className="text-[9px] font-black">{lastSync}</span>
              </div>
            )}
            <button 
              onClick={handleSync}
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
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-24 px-4 -mt-6 relative z-10">
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
        </motion.div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/90 backdrop-blur-md border-t border-gray-100 px-4 py-3 flex justify-around items-center z-20">
        <NavButton 
          active={activeTab === "calculator"} 
          onClick={() => handleTabChange("calculator")}
          icon={<CalcIcon size={20} />}
          label="Hitung"
        />
        <NavButton 
          active={activeTab === "dashboard"} 
          onClick={() => handleTabChange("dashboard")}
          icon={<LayoutDashboard size={20} />}
          label="Beranda"
        />
        <NavButton 
          active={activeTab === "history"} 
          onClick={() => handleTabChange("history")}
          icon={<HistoryIcon size={20} />}
          label="Rekap"
        />
        <NavButton 
          active={activeTab === "performance"} 
          onClick={() => handleTabChange("performance")}
          icon={<TrendingUp size={20} />}
          label="Performa"
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
        "relative flex flex-col items-center gap-1 py-1 px-3 transition-all duration-300 z-10",
        active ? "text-green-600" : "text-gray-400 hover:text-gray-600"
      )}
    >
      {active && (
        <motion.div 
          layoutId="nav-pill"
          className="absolute inset-0 bg-green-50 rounded-2xl -z-10"
          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
        />
      )}
      <div className="p-0.5">
        {icon}
      </div>
      <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
    </button>
  );
}
