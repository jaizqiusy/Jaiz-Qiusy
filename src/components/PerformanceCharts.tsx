import React, { useState } from "react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  Legend
} from "recharts";
import { Calculation } from "../App";
import { cn } from "../lib/utils";
import { BarChart3, Calendar } from "lucide-react";

interface PerformanceChartsProps {
  history: Calculation[];
  selectedDate: string;
}

export default function PerformanceCharts({ history, selectedDate }: PerformanceChartsProps) {
  const [timeframe, setTimeframe] = useState<"daily" | "weekly" | "monthly" | "quarterly">("weekly");
  const [metric, setMetric] = useState<"input" | "output" | "yield">("yield");

  const refDate = new Date(selectedDate);
  refDate.setHours(23, 59, 59, 999);
  
  const days = timeframe === "daily" ? 0 : timeframe === "weekly" ? 6 : timeframe === "monthly" ? 29 : 89;
  const startDate = new Date(selectedDate);
  startDate.setHours(0, 0, 0, 0);
  startDate.setDate(startDate.getDate() - days);

  // Filter and sort history relative to selectedDate
  const chartData = history
    .filter(calc => {
      const calcDate = new Date(calc.date);
      return calcDate >= startDate && calcDate <= refDate;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(calc => {
      // Calculate yield as Utama / Input as requested
      const yieldVal = calc.input > 0 ? (calc.utama / calc.input) * 100 : 0;
      
      return {
        date: new Date(calc.date).toLocaleDateString("id-ID", { day: 'numeric', month: 'short' }),
        input: calc.input,
        output: calc.output,
        yield: yieldVal,
        fullDate: new Date(calc.date).toLocaleDateString("id-ID")
      };
    });

  const metricConfig = {
    input: { label: "Input (M3)", color: "#3b82f6", unit: "M3" },
    output: { label: "Output (M3)", color: "#10b981", unit: "M3" },
    yield: { label: "Utama / Input (%)", color: "#8b5cf6", unit: "%" }
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="bg-green-50 p-2 rounded-xl">
            <BarChart3 className="text-green-500" size={20} />
          </div>
          <h3 className="font-bold text-gray-800">Tren Performa</h3>
        </div>
        <div className="flex bg-gray-100 p-1 rounded-xl">
          <button 
            onClick={() => setTimeframe("daily")}
            className={cn(
              "px-3 py-1 text-[10px] font-bold rounded-lg transition-all",
              timeframe === "daily" ? "bg-white text-gray-900 shadow-sm" : "text-gray-400"
            )}
          >
            1D
          </button>
          <button 
            onClick={() => setTimeframe("weekly")}
            className={cn(
              "px-3 py-1 text-[10px] font-bold rounded-lg transition-all",
              timeframe === "weekly" ? "bg-white text-gray-900 shadow-sm" : "text-gray-400"
            )}
          >
            7D
          </button>
          <button 
            onClick={() => setTimeframe("monthly")}
            className={cn(
              "px-3 py-1 text-[10px] font-bold rounded-lg transition-all",
              timeframe === "monthly" ? "bg-white text-gray-900 shadow-sm" : "text-gray-400"
            )}
          >
            30D
          </button>
          <button 
            onClick={() => setTimeframe("quarterly")}
            className={cn(
              "px-3 py-1 text-[10px] font-bold rounded-lg transition-all",
              timeframe === "quarterly" ? "bg-white text-gray-900 shadow-sm" : "text-gray-400"
            )}
          >
            90D
          </button>
        </div>
      </div>

      {/* Metric Selector */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 no-scrollbar">
        {(Object.keys(metricConfig) as Array<keyof typeof metricConfig>).map((m) => (
          <button
            key={m}
            onClick={() => setMetric(m)}
            className={cn(
              "px-3 py-2 rounded-xl text-[10px] font-bold whitespace-nowrap border transition-all",
              metric === m 
                ? "bg-gray-900 text-white border-gray-900" 
                : "bg-white text-gray-500 border-gray-100 hover:border-gray-200"
            )}
          >
            {metricConfig[m].label}
          </button>
        ))}
      </div>

      <div className="h-56 w-full">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={metricConfig[metric].color} stopOpacity={0.2}/>
                  <stop offset="95%" stopColor={metricConfig[metric].color} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                minTickGap={20}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                tickFormatter={(value) => metric === 'yield' ? `${value}%` : value.toString()}
                width={40}
              />
              <Tooltip 
                contentStyle={{ 
                  borderRadius: '12px', 
                  border: 'none', 
                  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                  fontSize: '10px',
                  padding: '8px 12px'
                }}
                formatter={(value: number) => [`${value.toLocaleString("id-ID")} ${metricConfig[metric].unit}`, metricConfig[metric].label]}
              />
              <Area 
                type="monotone" 
                dataKey={metric} 
                stroke={metricConfig[metric].color} 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorMetric)" 
                animationDuration={1000}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-2 border-2 border-dashed border-gray-100 rounded-3xl">
            <Calendar size={32} opacity={0.3} />
            <p className="text-xs font-medium">Belum ada data periode ini</p>
          </div>
        )}
      </div>
      
      <div className="mt-4 flex items-center justify-between text-[10px] text-gray-400 font-medium">
        <p>Menampilkan {chartData.length} titik data</p>
        <p className="uppercase tracking-widest">
          {timeframe === "daily" ? "Harian" : timeframe === "weekly" ? "Mingguan" : timeframe === "monthly" ? "Bulanan" : "Quarterly"}
        </p>
      </div>
    </div>
  );
}
