import React, { useState } from "react";
import { Scale, Percent, TrendingUp, DollarSign, Plus, Zap } from "lucide-react";
import { Calculation } from "../App";
import { cn } from "../lib/utils";
import { motion } from "motion/react";

interface CalculatorProps {
  onCalculate: (calc: Omit<Calculation, "id" | "date" | "timestamp">) => void;
}

const SUGAR_PRICE_PER_KG = 16000; // Example price in IDR

export default function Calculator({ onCalculate }: CalculatorProps) {
  const [input, setInput] = useState<string>("");
  const [utama, setUtama] = useState<string>("");
  const [machine, setMachine] = useState<string>("BS1");
  const [result, setResult] = useState<{ yield: number; output: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCalculate = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    const i = parseFloat(input);
    const u = parseFloat(utama);

    if (isNaN(i) || isNaN(u)) {
      setError("Mohon masukkan angka yang valid.");
      return;
    }

    if (i <= 0 || u <= 0) {
      setError("Nilai Input dan Utama harus lebih besar dari 0.");
      return;
    }

    if (u > i) {
      setError("Nilai Utama tidak boleh melebihi nilai Input.");
      return;
    }

    // Yield = (utama / input) * 100
    const yieldVal = (u / i) * 100;
    // Output = total (for now we'll assume output is utama or a factor of it, 
    // but in the GAS script 'total' is a separate column. 
    // Let's just use utama as output for the manual calculator or assume output = utama)
    const output = u; 

    setResult({ yield: yieldVal, output });
  };

  const handleSave = () => {
    if (!result) return;
    const yieldDecimal = result.yield / 100;
    onCalculate({
      machine: machine,
      line: "Manual",
      input: parseFloat(input),
      utama: parseFloat(utama),
      yield_primary: yieldDecimal,
      turunan: 0,
      yield_secondary: 0,
      lokal: 0,
      output: result.output,
      yield_total: yieldDecimal,
      yield: result.yield,
      target: 9,
      achievement: result.yield / 9,
      week: Math.ceil(new Date().getDate() / 7),
      month: new Date().getMonth() + 1,
      quartal: Math.ceil((new Date().getMonth() + 1) / 3)
    });
    // Reset
    setInput("");
    setUtama("");
    setResult(null);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Scale className="text-green-600" size={20} />
          Input Data UTAMA
        </h2>
        
        <form onSubmit={handleCalculate} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pilih Mesin</label>
            <select
              value={machine}
              onChange={(e) => setMachine(e.target.value)}
              className="w-full bg-gray-50 border-none rounded-2xl py-4 px-5 focus:ring-2 focus:ring-green-500 transition-all text-lg font-medium appearance-none"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                <option key={i} value={`BS${i}`}>BS {i}</option>
              ))}
              <option value="PONIA">PONI A</option>
              <option value="PONIB">PONI B</option>
              <option value="BREAKDOWN">BREAK</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Input (M3)</label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  setError(null);
                }}
                placeholder="0.00"
                className="w-full bg-gray-50 border-none rounded-2xl py-4 px-5 focus:ring-2 focus:ring-green-500 transition-all text-lg font-medium"
                required
              />
              <div className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 font-bold">M3</div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Utama (M3)</label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                value={utama}
                onChange={(e) => {
                  setUtama(e.target.value);
                  setError(null);
                }}
                placeholder="0.00"
                className="w-full bg-gray-50 border-none rounded-2xl py-4 px-5 focus:ring-2 focus:ring-green-500 transition-all text-lg font-medium"
                required
              />
              <div className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 font-bold">M3</div>
            </div>
          </div>

          {error && (
            <motion.p 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs font-bold text-red-500 bg-red-50 p-3 rounded-xl border border-red-100"
            >
              ⚠️ {error}
            </motion.p>
          )}

          <button
            type="submit"
            className="w-full bg-green-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-green-200 hover:bg-green-700 active:scale-95 transition-all"
          >
            Hitung UTAMA
          </button>
        </form>
      </div>

      {result && (
        <div className="bg-green-600 text-white p-6 rounded-3xl shadow-xl space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex justify-between items-start">
            <h3 className="font-bold text-lg">Hasil Perhitungan</h3>
            <div className="bg-white/20 p-2 rounded-lg">
              <TrendingUp size={20} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm">
              <p className="text-xs font-medium text-green-100 uppercase tracking-wider mb-1">UTAMA</p>
              <p className="text-2xl font-bold">{result.yield.toFixed(2)} <span className="text-sm font-normal">%</span></p>
            </div>
            <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm">
              <p className="text-xs font-medium text-green-100 uppercase tracking-wider mb-1">Output</p>
              <p className="text-2xl font-bold">{result.output.toLocaleString("id-ID")} <span className="text-sm font-normal">M3</span></p>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={handleSave}
              className="w-full bg-white text-green-600 font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-green-50 transition-colors"
            >
              <Plus size={18} />
              Simpan ke Riwayat
            </button>
          </div>
        </div>
      )}

      <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex gap-3">
        <div className="bg-amber-100 p-2 rounded-lg h-fit">
          <Zap className="text-amber-600" size={18} />
        </div>
        <div>
          <p className="text-sm font-bold text-amber-900">Motivasi Hari Ini</p>
          <p className="text-xs text-amber-700 leading-relaxed">"Rendemen tinggi bukan sekadar angka, tapi bukti ketelitian dan kerja keras kita dalam mengoptimalkan setiap serpihan kayu."</p>
          <p className="text-[10px] font-black text-amber-600 mt-1 uppercase tracking-widest">BERSAMA KITA BISA</p>
        </div>
      </div>
    </div>
  );
}
