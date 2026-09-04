import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { OrderUrgentData } from "../services/sheetService";
import { 
  Search, 
  AlertCircle, 
  CheckCircle2, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw,
  Download,
  Check,
  RefreshCw
} from "lucide-react";
import { cn } from "../lib/utils";
import { toJpeg } from "html-to-image";

interface OrderUrgentProps {
  orderList: OrderUrgentData[];
  selectedDate: string;
  lastSync: string | null;
}

export default function OrderUrgent({ orderList, selectedDate, lastSync }: OrderUrgentProps) {
  const [zoomLevel, setZoomLevel] = useState(0.93);
  const containerRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const lastTouchDistance = useRef<number | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<"Terkini" | "Kurang" | "Selesai" | "Semua">("Terkini");
  
  // Export status
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.1, 2));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.1, 0.5));
  const handleResetZoom = () => setZoomLevel(0.93);

  // Multi-touch gestures (identical to Analysis component)
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const handleTouchStart = (e: TouchEvent) => {
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
        if (e.cancelable) e.preventDefault();
        const distance = Math.hypot(
          e.touches[0].pageX - e.touches[1].pageX,
          e.touches[0].pageY - e.touches[1].pageY
        );
        const delta = distance - lastTouchDistance.current;
        if (Math.abs(delta) > 10) {
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

  // Format dates for column labels
  const yesterdayLabel = useMemo(() => {
    if (orderList.length > 0 && orderList[0].yesterdayLabel) {
      return orderList[0].yesterdayLabel.toUpperCase();
    }
    try {
      const parts = selectedDate.split("-").map(Number);
      const d = parts.length === 3 ? new Date(parts[0], parts[1] - 1, parts[2]) : new Date();
      d.setDate(d.getDate() - 1);
      const months = ["JAN", "FEB", "MAR", "APR", "MEI", "JUN", "JUL", "AGU", "SEP", "OKT", "NOV", "DES"];
      return `${String(d.getDate()).padStart(2, "0")} ${months[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`;
    } catch {
      return "H-1";
    }
  }, [orderList, selectedDate]);

  const todayLabel = useMemo(() => {
    if (orderList.length > 0 && orderList[0].todayLabel) {
      return orderList[0].todayLabel.toUpperCase();
    }
    try {
      const parts = selectedDate.split("-").map(Number);
      const d = parts.length === 3 ? new Date(parts[0], parts[1] - 1, parts[2]) : new Date();
      const months = ["JAN", "FEB", "MAR", "APR", "MEI", "JUN", "JUL", "AGU", "SEP", "OKT", "NOV", "DES"];
      return `${String(d.getDate()).padStart(2, "0")} ${months[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`;
    } catch {
      return "HARI INI";
    }
  }, [orderList, selectedDate]);

  // Format numbers cleanly with Indonesian locale
  const formatNum = (val: number, decimals: number = 2) => {
    if (!val || isNaN(val)) return "0";
    if (Number.isInteger(val)) {
      return val.toLocaleString("id-ID");
    }
    return val.toLocaleString("id-ID", {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals
    });
  };

  // Filtered lists
  const searchedOrders = useMemo(() => {
    if (!searchTerm.trim()) return orderList;
    const term = searchTerm.toLowerCase();
    return orderList.filter(o =>
      o.ukuran.toLowerCase().includes(term) ||
      o.jo.toLowerCase().includes(term) ||
      o.panjang.toLowerCase().includes(term)
    );
  }, [orderList, searchTerm]);

  const countTerkini = useMemo(() => {
    return searchedOrders.filter(o => o.hariIni > 0 || o.hariSebelumnya > 0).length;
  }, [searchedOrders]);

  const countKurang = useMemo(() => {
    return searchedOrders.filter(o => o.statusKekurangan < 0 || (o.targetKebutuhan > o.totalRealisasi)).length;
  }, [searchedOrders]);

  const countSelesai = useMemo(() => {
    return searchedOrders.filter(o => o.statusKekurangan >= 0 && o.totalRealisasi >= o.targetKebutuhan).length;
  }, [searchedOrders]);

  const displayOrders = useMemo(() => {
    let list = searchedOrders;
    if (activeFilter === "Terkini") {
      list = searchedOrders.filter(o => o.hariIni > 0 || o.hariSebelumnya > 0);
    } else if (activeFilter === "Kurang") {
      list = searchedOrders.filter(o => o.statusKekurangan < 0 || (o.targetKebutuhan > o.totalRealisasi));
    } else if (activeFilter === "Selesai") {
      list = searchedOrders.filter(o => o.statusKekurangan >= 0 && o.totalRealisasi >= o.targetKebutuhan);
    }
    return list;
  }, [searchedOrders, activeFilter]);

  // Orders specifically for export (Data Terkini priority)
  const exportOrders = useMemo(() => {
    // If the user filtered by Terkini or display has items, use displayOrders
    if (displayOrders.length > 0) return displayOrders;
    // Otherwise fallback to orders with production
    const terkini = orderList.filter(o => o.hariIni > 0 || o.hariSebelumnya > 0);
    return terkini.length > 0 ? terkini : orderList;
  }, [displayOrders, orderList]);

  // Aggregate totals for export footer
  const exportTotals = useMemo(() => {
    const target = exportOrders.reduce((s, o) => s + o.targetKebutuhan, 0);
    const realisasi = exportOrders.reduce((s, o) => s + o.totalRealisasi, 0);
    const kurang = exportOrders.reduce((s, o) => {
      if (o.statusKekurangan < 0) return s + Math.abs(o.statusKekurangan);
      if (o.targetKebutuhan > o.totalRealisasi) return s + (o.targetKebutuhan - o.totalRealisasi);
      return s;
    }, 0);
    const progress = target > 0 ? (realisasi / target) * 100 : 0;
    return { target, realisasi, kurang, progress };
  }, [exportOrders]);

  // Fallback Canvas Export
  const exportViaCanvas = useCallback(() => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rowHeight = 28;
    const headerHeight = 110;
    const footerHeight = 45;
    const totalHeight = headerHeight + (exportOrders.length * rowHeight) + footerHeight + 40;
    const totalWidth = 980;

    canvas.width = totalWidth * 2;
    canvas.height = totalHeight * 2;
    ctx.scale(2, 2);

    // Background
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, totalWidth, totalHeight);

    // Top Header Banner
    const grad = ctx.createLinearGradient(0, 0, totalWidth, 0);
    grad.addColorStop(0, "#311B92");
    grad.addColorStop(1, "#512DA8");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, totalWidth, 75);

    // Header Text
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 18px sans-serif";
    ctx.fillText("RENDEMENKU - LAPORAN ORDER URGENT", 24, 34);

    ctx.fillStyle = "#c7d2fe";
    ctx.font = "600 11px sans-serif";
    ctx.fillText(`DATA PRODUKSI TERKINI (${exportOrders.length} ITEM)  |  PERIODE: ${yesterdayLabel} - ${todayLabel}`, 24, 55);

    ctx.textAlign = "right";
    ctx.fillText(`Diekspor: ${new Date().toLocaleString("id-ID")}`, totalWidth - 24, 45);
    ctx.textAlign = "left";

    // Table Header
    const colX = [20, 60, 190, 270, 400, 500, 600, 700, 810, 910];
    const theadY = 95;
    ctx.fillStyle = "#e0e7ff";
    ctx.fillRect(20, theadY, totalWidth - 40, 30);

    ctx.fillStyle = "#311B92";
    ctx.font = "bold 9.5px sans-serif";
    ctx.fillText("NO", 30, theadY + 19);
    ctx.fillText("UKURAN", colX[1], theadY + 19);
    ctx.fillText("PANJANG", colX[2], theadY + 19);
    ctx.fillText("JO", colX[3], theadY + 19);
    ctx.fillText("TARGET", colX[4], theadY + 19);
    ctx.fillText(`H-1 (${yesterdayLabel})`, colX[5], theadY + 19);
    ctx.fillText(`HARI INI (${todayLabel})`, colX[6], theadY + 19);
    ctx.fillText("REALISASI", colX[7], theadY + 19);
    ctx.fillText("STATUS", colX[8], theadY + 19);
    ctx.fillText("PROGRESS", colX[9], theadY + 19);

    // Rows
    let currentY = theadY + 30;
    exportOrders.forEach((o, index) => {
      ctx.fillStyle = index % 2 === 0 ? "#ffffff" : "#f1f5f9";
      ctx.fillRect(20, currentY, totalWidth - 40, rowHeight);

      // Border line
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 0.5;
      ctx.strokeRect(20, currentY, totalWidth - 40, rowHeight);

      ctx.font = "bold 10px sans-serif";
      ctx.fillStyle = "#1e1b4b";
      ctx.fillText(String(index + 1), 30, currentY + 18);
      ctx.fillText(o.ukuran, colX[1], currentY + 18);

      ctx.font = "normal 10px monospace";
      ctx.fillStyle = "#334155";
      ctx.fillText(o.panjang || "-", colX[2], currentY + 18);
      ctx.fillText(o.jo || "-", colX[3], currentY + 18);

      ctx.font = "bold 10.5px sans-serif";
      ctx.fillStyle = "#1d4ed8";
      ctx.fillText(`${formatNum(o.targetKebutuhan)} ${o.satuan}`, colX[4], currentY + 18);

      ctx.fillStyle = o.hariSebelumnya > 0 ? "#0e7490" : "#94a3b8";
      ctx.fillText(o.hariSebelumnya > 0 ? formatNum(o.hariSebelumnya) : "-", colX[5], currentY + 18);

      ctx.fillStyle = o.hariIni > 0 ? "#047857" : "#94a3b8";
      ctx.fillText(o.hariIni > 0 ? formatNum(o.hariIni) : "-", colX[6], currentY + 18);

      ctx.fillStyle = "#047857";
      ctx.fillText(`${formatNum(o.totalRealisasi)} ${o.satuan}`, colX[7], currentY + 18);

      const isDeficit = o.statusKekurangan < 0 || (o.targetKebutuhan > o.totalRealisasi);
      const defQty = o.statusKekurangan < 0 ? Math.abs(o.statusKekurangan) : Math.max(0, o.targetKebutuhan - o.totalRealisasi);
      
      if (isDeficit) {
        ctx.fillStyle = "#dc2626";
        ctx.fillText(`Kurang ${formatNum(defQty)}`, colX[8], currentY + 18);
      } else {
        ctx.fillStyle = "#059669";
        ctx.fillText("Selesai", colX[8], currentY + 18);
      }

      ctx.fillStyle = "#1e1b4b";
      ctx.fillText(`${Math.round(o.progress)}%`, colX[9], currentY + 18);

      currentY += rowHeight;
    });

    // Summary footer
    ctx.fillStyle = "#e2e8f0";
    ctx.fillRect(20, currentY, totalWidth - 40, footerHeight);

    ctx.fillStyle = "#1e1b4b";
    ctx.font = "bold 11px sans-serif";
    ctx.fillText("TOTAL KESELURUHAN", 30, currentY + 27);
    ctx.fillText(`Target: ${formatNum(exportTotals.target)}`, colX[4], currentY + 27);
    ctx.fillText(`Hasil: ${formatNum(exportTotals.realisasi)}`, colX[7], currentY + 27);
    ctx.fillText(`Kurang: ${formatNum(exportTotals.kurang)}`, colX[8], currentY + 27);
    ctx.fillText(`Capaian: ${formatNum(exportTotals.progress, 1)}%`, colX[9] - 15, currentY + 27);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
    const link = document.createElement("a");
    const cleanDate = todayLabel.replace(/\s+/g, "-");
    link.download = `Order-Urgent-Terkini-${cleanDate}.jpg`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [exportOrders, exportTotals, todayLabel, yesterdayLabel]);

  // Main Download Trigger
  const downloadJpg = useCallback(async () => {
    if (isExporting) return;
    setIsExporting(true);
    setExportSuccess(false);

    try {
      if (exportRef.current) {
        const dataUrl = await toJpeg(exportRef.current, {
          quality: 0.95,
          pixelRatio: 2,
          backgroundColor: "#ffffff",
          cacheBust: true
        });

        const link = document.createElement("a");
        const cleanDate = todayLabel.replace(/\s+/g, "-");
        link.download = `Order-Urgent-Terkini-${cleanDate}.jpg`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        exportViaCanvas();
      }

      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 2500);
    } catch (err) {
      console.warn("toJpeg export error, falling back to Canvas:", err);
      exportViaCanvas();
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 2500);
    } finally {
      setIsExporting(false);
    }
  }, [isExporting, todayLabel, exportViaCanvas]);

  // Listen to custom event dispatched from the header top-right button
  useEffect(() => {
    const handleCustomDownload = () => {
      downloadJpg();
    };
    window.addEventListener("download-order-jpg", handleCustomDownload);
    return () => window.removeEventListener("download-order-jpg", handleCustomDownload);
  }, [downloadJpg]);

  return (
    <div className="flex-1 flex flex-col min-h-0 h-full space-y-2 pb-1" ref={containerRef}>
      {/* Skala Tampilan / Zoom Card with Download JPG button in top-right corner */}
      <div className="flex items-center justify-between px-2 py-1 shrink-0 bg-white/40 rounded-xl border border-white/50 shadow-sm">
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
            className="p-1.5 bg-white/60 backdrop-blur-md rounded-lg border border-indigo-200/50 text-indigo-950 hover:bg-white/80 transition-all shadow-sm active:scale-95"
            title="Reset Zoom"
          >
            <RotateCcw size={10} />
          </button>

          {/* Download JPG Symbol Button (Proportional symbol in top-right corner) */}
          <button 
            onClick={downloadJpg}
            disabled={isExporting}
            className={cn(
              "p-1.5 bg-white/60 backdrop-blur-md rounded-lg border border-indigo-200/50 text-indigo-950 hover:bg-white/80 transition-all shadow-sm flex items-center justify-center active:scale-95 disabled:opacity-50",
              exportSuccess && "bg-emerald-100/80 text-emerald-800 border-emerald-300"
            )}
            title="Download JPG (Data Terkini)"
          >
            {isExporting ? (
              <RefreshCw size={11} className="animate-spin text-indigo-700" />
            ) : exportSuccess ? (
              <Check size={11} className="text-emerald-700 stroke-[3]" />
            ) : (
              <Download size={11} className="text-indigo-950" />
            )}
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-1.5 px-0.5 shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-indigo-400" size={13} />
          <input 
            type="text"
            placeholder="Cari Ukuran, Panjang, atau JO..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-7 pr-3 py-1 bg-white/60 backdrop-blur-sm border border-indigo-200/60 rounded-xl text-[11px] font-medium text-indigo-950 placeholder:text-indigo-400/80 focus:outline-none focus:bg-white focus:border-indigo-400 shadow-sm transition-all"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto py-0.5 no-scrollbar">
          <button
            onClick={() => setActiveFilter("Terkini")}
            className={cn(
              "px-2.5 py-1 rounded-lg text-[9.5px] font-black uppercase tracking-wider transition-all whitespace-nowrap shadow-sm border",
              activeFilter === "Terkini"
                ? "bg-indigo-900 text-white border-indigo-900 shadow-indigo-900/20"
                : "bg-white/50 text-indigo-900 border-white/60 hover:bg-white/80"
            )}
          >
            Terkini ({countTerkini})
          </button>
          <button
            onClick={() => setActiveFilter("Kurang")}
            className={cn(
              "px-2.5 py-1 rounded-lg text-[9.5px] font-black uppercase tracking-wider transition-all whitespace-nowrap shadow-sm border",
              activeFilter === "Kurang"
                ? "bg-rose-700 text-white border-rose-700 shadow-rose-700/20"
                : "bg-white/50 text-rose-700 border-white/60 hover:bg-white/80"
            )}
          >
            Kurang ({countKurang})
          </button>
          <button
            onClick={() => setActiveFilter("Selesai")}
            className={cn(
              "px-2.5 py-1 rounded-lg text-[9.5px] font-black uppercase tracking-wider transition-all whitespace-nowrap shadow-sm border",
              activeFilter === "Selesai"
                ? "bg-emerald-700 text-white border-emerald-700 shadow-emerald-700/20"
                : "bg-white/50 text-emerald-700 border-white/60 hover:bg-white/80"
            )}
          >
            Selesai ({countSelesai})
          </button>
          <button
            onClick={() => setActiveFilter("Semua")}
            className={cn(
              "px-2.5 py-1 rounded-lg text-[9.5px] font-black uppercase tracking-wider transition-all whitespace-nowrap shadow-sm border",
              activeFilter === "Semua"
                ? "bg-indigo-900 text-white border-indigo-900 shadow-indigo-900/20"
                : "bg-white/50 text-indigo-900 border-white/60 hover:bg-white/80"
            )}
          >
            Semua ({searchedOrders.length})
          </button>
        </div>
      </div>

      {/* Main Table Container with Custom Zoom */}
      <div 
        style={{ zoom: zoomLevel }}
        className="transition-all duration-300 origin-top flex-1 flex flex-col min-h-0 justify-between gap-2"
      >
        {displayOrders.length === 0 ? (
          <div className="py-16 text-center bg-gradient-to-br from-blue-100 via-indigo-100 to-purple-200 rounded-2xl border border-white/60 shadow-md">
            <AlertCircle className="mx-auto text-indigo-400 mb-2" size={40} />
            <p className="text-xs font-black text-indigo-900 uppercase tracking-wider">Tidak ada data order ditemukan</p>
            <p className="text-[10px] font-bold text-indigo-600 mt-1">Coba sesuaikan filter atau kata kunci pencarian Anda</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0 justify-between gap-2">
            {/* Detailed Order Status Table */}
            <div className="bg-gradient-to-br from-blue-100 via-indigo-100 to-purple-200 rounded-2xl border border-white/60 overflow-hidden shadow-md flex-1 flex flex-col min-h-0">
              <div className="overflow-auto flex-1">
                <table className="w-full text-left border-collapse whitespace-nowrap">
                  <thead className="sticky top-0 bg-[#e0e7ff] z-10">
                    <tr className="bg-white/40 text-[9.5px] font-black text-indigo-800 uppercase tracking-wider border-b border-indigo-200">
                      <th className="px-2.5 py-2 border-r border-indigo-200/60">Ukuran</th>
                      <th className="px-2 py-2 text-center border-r border-indigo-200/60">Panjang</th>
                      <th className="px-2 py-2 text-center border-r border-indigo-200/60">JO</th>
                      <th className="px-2.5 py-2 text-center border-r border-indigo-200/60">Target</th>
                      <th className="px-2 py-2 text-center border-r border-indigo-200/60">
                        <div className="leading-tight">H-1</div>
                        <div className="text-[7.5px] text-cyan-800 font-bold opacity-80">{yesterdayLabel}</div>
                      </th>
                      <th className="px-2 py-2 text-center border-r border-indigo-200/60">
                        <div className="leading-tight">Hari Ini</div>
                        <div className="text-[7.5px] text-indigo-800 font-bold opacity-80">{todayLabel}</div>
                      </th>
                      <th className="px-2.5 py-2 text-center border-r border-indigo-200/60">Realisasi</th>
                      <th className="px-2.5 py-2 text-center border-r border-indigo-200/60">Status</th>
                      <th className="px-2.5 py-2 text-center">Progress</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-indigo-200/60">
                    {displayOrders.map((order, idx) => {
                      const isDeficit = order.statusKekurangan < 0 || (order.targetKebutuhan > order.totalRealisasi);
                      const deficitQty = order.statusKekurangan < 0 
                        ? Math.abs(order.statusKekurangan) 
                        : Math.max(0, order.targetKebutuhan - order.totalRealisasi);

                      return (
                        <tr key={idx} className="hover:bg-white/40 transition-colors">
                          {/* Ukuran */}
                          <td className="px-2.5 py-1.5 border-r border-indigo-200/60">
                            <div className="flex items-center gap-1.5">
                              <span 
                                className={cn(
                                  "w-1.5 h-1.5 rounded-full shrink-0 shadow-xs",
                                  isDeficit ? "bg-rose-500 ring-2 ring-rose-300/50" : "bg-emerald-500 ring-2 ring-emerald-300/50"
                                )} 
                              />
                              <span className="text-[12.5px] font-black text-indigo-950 uppercase tracking-tight leading-none">
                                {order.ukuran}
                              </span>
                            </div>
                          </td>

                          {/* Panjang */}
                          <td className="px-2 py-1.5 text-center border-r border-indigo-200/60">
                            <span className="text-[11.5px] font-bold text-indigo-950/80 font-mono">
                              {order.panjang}
                            </span>
                          </td>

                          {/* JO */}
                          <td className="px-2 py-1.5 text-center border-r border-indigo-200/60">
                            <span className="bg-white/60 text-indigo-950 font-bold px-1.5 py-0.5 rounded text-[10px] border border-indigo-200/60 font-mono tracking-tight">
                              {order.jo || "-"}
                            </span>
                          </td>

                          {/* Target */}
                          <td className="px-2.5 py-1.5 text-center border-r border-indigo-200/60">
                            <span className="text-[13.5px] font-black text-blue-700 tracking-tighter">
                              {formatNum(order.targetKebutuhan)}
                            </span>
                            <span className="text-[8px] font-bold text-indigo-500/80 ml-0.5 uppercase">
                              {order.satuan}
                            </span>
                          </td>

                          {/* 1 Hari Sebelumnya */}
                          <td className="px-2 py-1.5 text-center border-r border-indigo-200/60">
                            {order.hariSebelumnya > 0 ? (
                              <span className="text-[12.5px] font-black text-cyan-800 tracking-tighter">
                                {formatNum(order.hariSebelumnya)}
                              </span>
                            ) : (
                              <span className="text-[11px] font-bold text-indigo-300">-</span>
                            )}
                          </td>

                          {/* Hari Ini */}
                          <td className="px-2 py-1.5 text-center border-r border-indigo-200/60">
                            {order.hariIni > 0 ? (
                              <span className="text-[12.5px] font-black text-emerald-700 tracking-tighter">
                                {formatNum(order.hariIni)}
                              </span>
                            ) : (
                              <span className="text-[11px] font-bold text-indigo-300">-</span>
                            )}
                          </td>

                          {/* Total Realisasi */}
                          <td className="px-2.5 py-1.5 text-center border-r border-indigo-200/60">
                            <span className="text-[13.5px] font-black text-emerald-700 tracking-tighter">
                              {formatNum(order.totalRealisasi)}
                            </span>
                            <span className="text-[8px] font-bold text-emerald-600/80 ml-0.5 uppercase">
                              {order.satuan}
                            </span>
                          </td>

                          {/* Status & Kekurangan */}
                          <td className="px-2.5 py-1.5 text-center border-r border-indigo-200/60">
                            {isDeficit ? (
                              <span className="inline-flex items-center gap-1 bg-rose-500/10 text-rose-700 border border-rose-200/70 px-2 py-0.5 rounded-md text-[10.5px] font-black tracking-tight whitespace-nowrap shadow-xs">
                                <AlertCircle size={10.5} className="text-rose-500 shrink-0" />
                                Kurang {formatNum(deficitQty)}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-700 border border-emerald-200/70 px-2 py-0.5 rounded-md text-[10.5px] font-black tracking-tight whitespace-nowrap shadow-xs">
                                <CheckCircle2 size={10.5} className="text-emerald-600 shrink-0" />
                                Selesai
                              </span>
                            )}
                          </td>

                          {/* Progress */}
                          <td className="px-2.5 py-1.5 text-center">
                            <div className="inline-flex flex-col items-center justify-center min-w-[48px]">
                              <span className="text-[12px] font-black text-indigo-950 font-mono leading-none mb-1">
                                {Math.round(order.progress)}%
                              </span>
                              <div className="w-12 h-1.5 bg-indigo-200/60 rounded-full overflow-hidden">
                                <div 
                                  className={cn(
                                    "h-full rounded-full transition-all duration-300",
                                    order.progress >= 100 
                                      ? "bg-emerald-600" 
                                      : order.progress >= 50 
                                      ? "bg-blue-600" 
                                      : "bg-rose-500"
                                  )}
                                  style={{ width: `${Math.min(100, Math.max(0, order.progress))}%` }}
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Hidden Off-Screen Report Layout for High-Resolution JPG Generation */}
      <div 
        ref={exportRef}
        style={{ position: "fixed", left: "-9999px", top: 0, width: "1020px" }}
        className="bg-slate-50 text-slate-900 p-6 font-sans"
      >
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-[#311B92] to-[#512DA8] text-white p-5 rounded-xl shadow-sm mb-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-white/20 px-2 py-0.5 rounded text-[10px] font-black tracking-widest uppercase">
                RENDEMENKU
              </span>
              <h1 className="text-lg font-black tracking-tight uppercase">
                Laporan Order Urgent (Produksi Terkini)
              </h1>
            </div>
            <p className="text-xs text-indigo-200 font-semibold">
              Periode Data: <span className="text-white font-bold">{yesterdayLabel} s/d {todayLabel}</span> &bull; Total Item: <span className="text-white font-bold">{exportOrders.length} Order</span>
            </p>
          </div>
          <div className="text-right text-[11px] text-indigo-200">
            <p className="font-bold text-white uppercase tracking-wider">{new Date(selectedDate).toLocaleDateString("id-ID", { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
            <p className="text-[10px] opacity-80 mt-0.5">Dicetak: {new Date().toLocaleTimeString("id-ID")}</p>
          </div>
        </div>

        {/* Full Data Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-indigo-50/80 text-[10.5px] font-black text-indigo-900 uppercase tracking-wider border-b border-indigo-100">
                <th className="py-2.5 px-3 border-r border-indigo-100 text-center w-10">No</th>
                <th className="py-2.5 px-3 border-r border-indigo-100">Ukuran (T x L)</th>
                <th className="py-2.5 px-3 border-r border-indigo-100 text-center">Panjang</th>
                <th className="py-2.5 px-3 border-r border-indigo-100 text-center">JO</th>
                <th className="py-2.5 px-3 border-r border-indigo-100 text-right">Target</th>
                <th className="py-2.5 px-3 border-r border-indigo-100 text-right">H-1 ({yesterdayLabel})</th>
                <th className="py-2.5 px-3 border-r border-indigo-100 text-right">Hari Ini ({todayLabel})</th>
                <th className="py-2.5 px-3 border-r border-indigo-100 text-right">Realisasi</th>
                <th className="py-2.5 px-3 border-r border-indigo-100 text-center">Status / Kekurangan</th>
                <th className="py-2.5 px-3 text-center w-28">Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[11px]">
              {exportOrders.map((o, idx) => {
                const isDeficit = o.statusKekurangan < 0 || (o.targetKebutuhan > o.totalRealisasi);
                const deficitQty = o.statusKekurangan < 0 
                  ? Math.abs(o.statusKekurangan) 
                  : Math.max(0, o.targetKebutuhan - o.totalRealisasi);

                return (
                  <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                    <td className="py-2 px-3 text-center font-bold text-slate-400 border-r border-slate-100">
                      {idx + 1}
                    </td>
                    <td className="py-2 px-3 font-black text-indigo-950 uppercase border-r border-slate-100">
                      {o.ukuran}
                    </td>
                    <td className="py-2 px-3 text-center font-mono font-bold text-slate-700 border-r border-slate-100">
                      {o.panjang}
                    </td>
                    <td className="py-2 px-3 text-center font-mono font-bold text-slate-600 border-r border-slate-100">
                      {o.jo || "-"}
                    </td>
                    <td className="py-2 px-3 text-right font-black text-blue-700 border-r border-slate-100">
                      {formatNum(o.targetKebutuhan)} <span className="text-[9px] font-normal text-slate-500">{o.satuan}</span>
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-cyan-800 border-r border-slate-100">
                      {o.hariSebelumnya > 0 ? formatNum(o.hariSebelumnya) : "-"}
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-emerald-700 border-r border-slate-100">
                      {o.hariIni > 0 ? formatNum(o.hariIni) : "-"}
                    </td>
                    <td className="py-2 px-3 text-right font-black text-emerald-800 border-r border-slate-100">
                      {formatNum(o.totalRealisasi)} <span className="text-[9px] font-normal text-slate-500">{o.satuan}</span>
                    </td>
                    <td className="py-2 px-3 text-center border-r border-slate-100">
                      {isDeficit ? (
                        <span className="inline-block bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded font-black text-[10px]">
                          Kurang {formatNum(deficitQty)}
                        </span>
                      ) : (
                        <span className="inline-block bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-black text-[10px]">
                          Selesai
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-center font-bold font-mono text-indigo-950">
                      {Math.round(o.progress)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* Total Footer */}
            <tfoot>
              <tr className="bg-slate-100/90 font-black text-[11px] text-indigo-950 border-t-2 border-slate-300">
                <td colSpan={4} className="py-2.5 px-3 text-right uppercase tracking-wider">
                  TOTAL KESELURUHAN ({exportOrders.length} ITEM):
                </td>
                <td className="py-2.5 px-3 text-right text-blue-800">
                  {formatNum(exportTotals.target, 1)}
                </td>
                <td colSpan={2} className="py-2.5 px-3 text-center text-slate-500 text-[10px]">
                  -
                </td>
                <td className="py-2.5 px-3 text-right text-emerald-800">
                  {formatNum(exportTotals.realisasi, 1)}
                </td>
                <td className="py-2.5 px-3 text-center text-rose-700">
                  Kurang {formatNum(exportTotals.kurang, 1)}
                </td>
                <td className="py-2.5 px-3 text-center text-indigo-900">
                  {formatNum(exportTotals.progress, 1)}%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Footer info */}
        <div className="mt-3 flex items-center justify-between text-[10px] text-slate-400 font-medium">
          <p>Sistem Pemantauan Produksi Kayu & Rendemen - Google Sheets Live Sync</p>
          <p>Dihasilkan secara otomatis oleh RENDEMENKU</p>
        </div>
      </div>
    </div>
  );
}
