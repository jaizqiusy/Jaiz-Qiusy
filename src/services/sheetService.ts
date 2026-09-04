import Papa from "papaparse";

export interface SheetData {
  tanggal: string;
  mesin: string;
  line: string;
  input: number;
  utama: number;
  yield_primary: number;
  turunan: number;
  yield_secondary: number;
  lokal: number;
  output: number; // total
  yield_total: number;
  target: number;
  achievement: number;
  week: number;
  month: number;
  quartal: number;
  point: number;
  utama_non_pilot_ladder: number;
}

export interface DowntimeData {
  id: string;
  tanggal: string;
  mesin: string;
  keterangan: string; // issue
  durasi: string; // duration
  jenis: string; // type
  waktu: string; // time
}

export interface OrderUrgentData {
  ukuran: string;
  panjang: string;
  jo: string;
  targetKebutuhan: number;
  hariSebelumnya: number;
  hariIni: number;
  totalRealisasi: number;
  statusKekurangan: number;
  satuan: string;
  progress: number;
  todayLabel?: string;
  yesterdayLabel?: string;
}

export interface OperatorData {
  id: string;
  nama_lengkap: string;
  inisial: string;
  kode_bs: string;
  status_aktif: boolean;
  url_foto: string;
}

const SHEET_ID = "1G7x3dtE2KFF338w6qdd4jrMkz-yrbThlzx5Vi0I8AqQ";

/**
 * Robust CSV fetcher with multi-layer fallback:
 * 1. Internal server proxy /api/sheets-csv (avoids CORS, browser timeout, carrier throttling)
 * 2. Google Sheets gviz API (direct)
 * 3. Google Sheets export CSV endpoint (direct fallback)
 */
async function fetchSheetCsvText(sheetName: string, timeoutMs: number = 30000): Promise<string> {
  const encSheet = encodeURIComponent(sheetName);
  const candidateUrls = [
    // 1. Same-origin backend proxy (runs directly on cloud server, bypassing local network issues)
    `/api/sheets-csv?sheet=${encSheet}&_t=${Date.now()}`,
    // 2. Direct gviz/tq endpoint
    `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encSheet}&_t=${Date.now()}`,
    // 3. Direct export format endpoint
    `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&sheet=${encSheet}&_t=${Date.now()}`
  ];

  let lastError: any = null;

  for (let i = 0; i < candidateUrls.length; i++) {
    const url = candidateUrls[i];
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      try {
        controller.abort();
      } catch (_) {}
    }, timeoutMs);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        cache: 'no-store',
        headers: {
          'Accept': 'text/csv, text/plain, */*',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error("Akses Google Sheet ditolak. Pastikan sheet disetel ke 'Siapa saja yang memiliki link dapat melihat'.");
        }
        continue;
      }

      const csvText = await response.text();
      if (!csvText || csvText.trim().length === 0) continue;
      if (csvText.includes("<!DOCTYPE html>") || csvText.includes("<html")) continue;

      return csvText;
    } catch (err: any) {
      clearTimeout(timeoutId);
      lastError = err;
      // Continue to next fallback
    }
  }

  if (lastError?.name === 'AbortError' || lastError?.message?.includes('aborted')) {
    throw new Error("Koneksi ke Google Sheets lambat atau timeout (30 detik). Silakan periksa koneksi internet Anda.");
  }

  throw lastError || new Error("Gagal mengambil data dari Google Sheets.");
}

export async function fetchSheetData(): Promise<SheetData[]> {
  try {
    const csvText = await fetchSheetCsvText("DATABASE APPSCRIPT", 30000);
    
    return new Promise((resolve, reject) => {
      Papa.parse(csvText, {
        header: false,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            console.warn("CSV Parsing Warnings:", results.errors);
          }

          const rawData = results.data as any[][];
          if (rawData.length < 2) {
            resolve([]);
            return;
          }

          const dataRows = rawData.slice(1); // Skip header row
          
          const mappedData: SheetData[] = dataRows.map((row) => {
            // Ensure we have enough columns (at least up to index 15 for quartal)
            if (!row || row.length < 10) return null;

            const input = Number(row[3]) || 0;
            const utama = Number(row[4]) || 0;
            const yield_primary = Number(row[5]) || 0;
            const turunan = Number(row[6]) || 0;
            const yield_secondary = Number(row[7]) || 0;
            const lokal = Number(row[8]) || 0;
            const output = Number(row[9]) || 0;
            const yield_total = Number(row[10]) || 0;
            const target = Number(row[11]) || 0;
            const achievement = Number(row[12]) || 0;
            let week = Number(row[13]) || 0;
            let month = Number(row[14]) || 0;
            let quartal = Number(row[15]) || 0;
            const point = Number(row[16]) || 0;
            const utama_non_pilot_ladder = Number(row[19]) || 0;
            
            let rawDate = row[0];
            let dateStr = "";
            
            if (rawDate) {
              try {
                if (typeof rawDate === 'number') {
                  const dateObj = new Date((rawDate - 25569) * 86400 * 1000);
                  dateStr = dateObj.toISOString().split('T')[0];
                } else {
                  const dateObj = new Date(String(rawDate));
                  if (!isNaN(dateObj.getTime())) {
                    dateStr = dateObj.toISOString().split('T')[0];
                  } else {
                    const parts = String(rawDate).split(/[/.-]/);
                    if (parts.length === 3) {
                      dateStr = String(rawDate); 
                    }
                  }
                }
              } catch (e) {
                dateStr = String(rawDate);
              }
            }

            if ((!week || !month) && dateStr) {
              const d = new Date(dateStr);
              if (!isNaN(d.getTime())) {
                if (!month) month = d.getMonth() + 1;
                if (!quartal) quartal = Math.ceil(month / 3);
                if (!week) {
                  const targetDate = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
                  const dayNr = targetDate.getUTCDay() || 7;
                  targetDate.setUTCDate(targetDate.getUTCDate() + 4 - dayNr);
                  const janFirst = new Date(Date.UTC(targetDate.getUTCFullYear(), 0, 1));
                  week = Math.ceil((((targetDate.getTime() - janFirst.getTime()) / 86400000) + 1) / 7);
                }
              }
            }

            return {
              tanggal: dateStr,
              mesin: row[1] ? String(row[1]).trim().toUpperCase() : "UNKNOWN",
              line: row[2] ? String(row[2]) : "-",
              input,
              utama,
              yield_primary,
              turunan,
              yield_secondary,
              lokal,
              output,
              yield_total,
              target,
              achievement,
              week,
              month,
              quartal,
              point,
              utama_non_pilot_ladder
            };
          }).filter((item): item is SheetData => item !== null && !!item.tanggal && !!item.mesin);
          
          resolve(mappedData);
        },
        error: (error: any) => {
          reject(new Error(`Gagal memproses data CSV: ${error.message}`));
        }
      });
    });
  } catch (error: any) {
    if (error?.name === 'AbortError' || error?.message?.includes('aborted')) {
      throw new Error("Koneksi ke Google Sheets timeout (30 detik).");
    }
    console.error("Sheet Fetch Error:", error);
    throw error;
  }
}

export async function fetchDowntimeData(): Promise<DowntimeData[]> {
  try {
    const csvText = await fetchSheetCsvText("Downtime", 30000);

    if (!csvText || csvText.trim().length === 0) {
      return [];
    }
    
    return new Promise((resolve, reject) => {
      Papa.parse(csvText, {
        header: false,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          const rawData = results.data as any[][];
          if (rawData.length < 2) {
            resolve([]);
            return;
          }

          const dataRows = rawData.slice(1);
          
          const mappedData: DowntimeData[] = [];
          
          dataRows.forEach((row, rowIndex) => {
            if (!row || row.length < 20) return;

            let rawDate = row[0];
            let dateStr = "";
            if (rawDate) {
              try {
                if (typeof rawDate === 'number') {
                  const dateObj = new Date((rawDate - 25569) * 86400 * 1000);
                  dateStr = dateObj.toISOString().split('T')[0];
                } else {
                  const dateObj = new Date(String(rawDate));
                  if (!isNaN(dateObj.getTime())) {
                    dateStr = dateObj.toISOString().split('T')[0];
                  } else {
                     dateStr = String(rawDate);
                  }
                }
              } catch {
                dateStr = String(rawDate);
              }
            }

            const rawDowntime = row[19] ? String(row[19]) : "";
            const events = rawDowntime.split(',').map(e => e.trim()).filter(e => e !== "");
            
            events.forEach((evt, evtIndex) => {
              // format is typically "Keterangan=XXmnt"
              let keterangan = evt;
              let durasi = "0mnt";
              
              if (evt.includes("=")) {
                const parts = evt.split("=");
                keterangan = parts[0].trim();
                durasi = parts[1].trim();
              }
              
              mappedData.push({
                id: `downtime-${dateStr}-${rowIndex}-${evtIndex}`,
                tanggal: dateStr,
                mesin: row[1] ? String(row[1]).trim().toUpperCase() : "-",
                keterangan: keterangan,
                durasi: durasi,
                jenis: "maintenance", // simple default
                waktu: "00:00", // not provided directly, maybe not needed
              });
            });
          });
          
          resolve(mappedData);
        },
        error: (error: any) => reject(new Error(`Gagal proses CSV downtime: ${error.message}`))
      });
    });
  } catch (error: any) {
    if (error?.name === 'AbortError' || error?.message?.includes('aborted')) {
      console.warn("Downtime Fetch: Permintaan timeout atau dibatalkan, menggunakan data lokal.");
    } else {
      console.warn("Downtime Fetch Note:", error?.message || error);
    }
    return [];
  }
}

export async function fetchOrderUrgentData(selectedDateStr: string): Promise<OrderUrgentData[]> {
  try {
    const csvText = await fetchSheetCsvText("order urgent", 30000);
    if (!csvText || csvText.trim().length === 0) {
      return [];
    }

    return new Promise((resolve, reject) => {
      Papa.parse(csvText, {
        header: false,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          const rawData = results.data as any[][];
          if (rawData.length < 3) {
            resolve([]);
            return;
          }

          const headers = rawData[1];
          const dataRows = rawData.slice(2);

          const parseNumber = (val: any): number => {
            if (val === null || val === undefined || val === "") return 0;
            if (typeof val === "number") return isNaN(val) ? 0 : val;
            const cleaned = String(val).trim().replace(/\s/g, "").replace(/,/g, ".");
            const num = parseFloat(cleaned);
            return isNaN(num) ? 0 : num;
          };

          // Find all available date columns in headers
          const dateCols: { idx: number; label: string }[] = [];
          headers.forEach((h, idx) => {
            if (typeof h === "string") {
              const trimmed = h.trim();
              if (/^\d{2}\s+[A-Za-z]{3}\s+\d{2}$/.test(trimmed)) {
                dateCols.push({ idx, label: trimmed });
              }
            }
          });

          // Format selectedDate (e.g. 2026-09-04) to DD MMM YY (e.g. 04 Sep 26)
          let todayStr = "";
          let yesterdayStr = "";
          try {
            const parts = selectedDateStr.split("-").map(Number);
            const dateObj = parts.length === 3 ? new Date(parts[0], parts[1] - 1, parts[2]) : new Date();
            const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const formatToSheet = (d: Date) => {
              const day = String(d.getDate()).padStart(2, "0");
              const month = months[d.getMonth()];
              const year = String(d.getFullYear()).slice(-2);
              return `${day} ${month} ${year}`;
            };
            todayStr = formatToSheet(dateObj);
            const yest = new Date(dateObj);
            yest.setDate(yest.getDate() - 1);
            yesterdayStr = formatToSheet(yest);
          } catch (_) {}

          let todayIdx = -1;
          let yesterdayIdx = -1;
          let activeTodayLabel = todayStr;
          let activeYesterdayLabel = yesterdayStr;

          if (todayStr) {
            todayIdx = headers.findIndex(h => typeof h === "string" && h.trim().toLowerCase() === todayStr.toLowerCase());
          }
          if (yesterdayStr) {
            yesterdayIdx = headers.findIndex(h => typeof h === "string" && h.trim().toLowerCase() === yesterdayStr.toLowerCase());
          }

          // Fallback to latest date column if not matched
          if (todayIdx === -1 && dateCols.length > 0) {
            // Pick the column for today or latest active column
            const latest = dateCols[dateCols.length - 1];
            todayIdx = latest.idx;
            activeTodayLabel = latest.label;
            if (dateCols.length > 1) {
              const prev = dateCols[dateCols.length - 2];
              yesterdayIdx = prev.idx;
              activeYesterdayLabel = prev.label;
            }
          } else if (todayIdx !== -1 && yesterdayIdx === -1 && todayIdx > 0) {
            yesterdayIdx = todayIdx - 1;
            activeYesterdayLabel = String(headers[yesterdayIdx] || "");
          }

          const mappedData: OrderUrgentData[] = [];

          dataRows.forEach((row) => {
            if (!row || row.length < 5) return;
            const ukuran = String(row[1] || "").trim();
            if (!ukuran) return; // Must have size (ukuran)

            const panjang = String(row[2] !== undefined && row[2] !== null ? row[2] : "").trim();
            const jo = String(row[3] || "").trim();

            const targetKebutuhan = parseNumber(row[4]);
            const totalRealisasi = parseNumber(row[64]);
            
            // Col 65 is Status & Kekurangan from sheet (negative = deficit, e.g. -592)
            const rawKekurangan = row[65] !== undefined && row[65] !== null && String(row[65]).trim() !== ""
              ? parseNumber(row[65])
              : (totalRealisasi - targetKebutuhan);

            // Dynamic days
            const todayVal = todayIdx !== -1 ? parseNumber(row[todayIdx]) : 0;
            const yesterdayVal = yesterdayIdx !== -1 ? parseNumber(row[yesterdayIdx]) : 0;

            // Unit
            let unit = "Pcs";
            const rawUnit = String(row[66] || "").trim().toUpperCase();
            if (rawUnit === "M3" || rawUnit === "M³") {
              unit = "M³";
            } else if (rawUnit === "BTG") {
              unit = "Pcs";
            } else if (rawUnit) {
              unit = rawUnit;
            }

            const progress = targetKebutuhan > 0 ? (totalRealisasi / targetKebutuhan) * 100 : 0;

            mappedData.push({
              ukuran,
              panjang: panjang !== "" ? panjang : "-",
              jo,
              targetKebutuhan,
              hariSebelumnya: yesterdayVal,
              hariIni: todayVal,
              totalRealisasi,
              statusKekurangan: rawKekurangan,
              satuan: unit,
              progress,
              todayLabel: activeTodayLabel,
              yesterdayLabel: activeYesterdayLabel
            });
          });

          resolve(mappedData);
        },
        error: (error: any) => reject(new Error(`Gagal proses CSV order: ${error.message}`))
      });
    });
  } catch (error: any) {
    if (error?.name === 'AbortError' || error?.message?.includes('aborted')) {
      console.warn("Order Fetch: Permintaan timeout atau dibatalkan.");
    } else {
      console.warn("Order Fetch Note:", error?.message || error);
    }
    return [];
  }
}

export async function fetchOperatorData(): Promise<OperatorData[]> {
  try {
    const csvText = await fetchSheetCsvText("Operator bs", 30000);

    if (!csvText || csvText.trim().length === 0) {
      return [];
    }
    
    return new Promise((resolve, reject) => {
      Papa.parse(csvText, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          const rawData = results.data as any[];
          const mappedData: OperatorData[] = rawData.map(row => {
              let photoUrl = String(row.url_foto || "");
              if (photoUrl.includes("drive.google.com/uc") || photoUrl.includes("drive.google.com/file/d/")) {
                const idMatch = photoUrl.match(/id=([a-zA-Z0-9_-]+)/) || photoUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
                if (idMatch && idMatch[1]) {
                  photoUrl = `https://drive.google.com/thumbnail?id=${idMatch[1]}&sz=w500`;
                }
              }
              
            return {
              id: String(row.id_operator || ""),
              nama_lengkap: String(row.nama_lengkap || ""),
              inisial: String(row.inisial || ""),
              kode_bs: String(row.kode_bs || ""),
              status_aktif: String(row.status_aktif).toUpperCase() === "TRUE",
              url_foto: photoUrl,
            };
          }).filter(item => item.id && item.kode_bs);
          
          resolve(mappedData);
        },
        error: (error: any) => reject(new Error(`Gagal proses CSV operator: ${error.message}`))
      });
    });
  } catch (error: any) {
    if (error?.name === 'AbortError' || error?.message?.includes('aborted')) {
      console.warn("Operator Fetch: Permintaan timeout atau dibatalkan, menggunakan data lokal.");
    } else {
      console.warn("Operator Fetch Note:", error?.message || error);
    }
    return [];
  }
}

