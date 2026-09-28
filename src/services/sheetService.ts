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

// In-memory cache and promise deduplication on client
const clientCsvCache: Record<string, { text: string; timestamp: number }> = {};
const clientInFlight = new Map<string, Promise<string>>();
const CLIENT_CACHE_TTL = 30000; // 30 seconds memory cache

/**
 * Robust CSV fetcher with multi-layer fallback, deduplication, and caching:
 * 1. Client memory cache & in-flight request sharing
 * 2. Internal server proxy /api/sheets-csv (avoids CORS, browser timeout, carrier throttling)
 * 3. Google Sheets gviz API (direct)
 * 4. Google Sheets export CSV endpoint (direct fallback)
 * 5. LocalStorage offline cache fallback
 */
export async function fetchSheetCsvText(
  sheetName: string, 
  timeoutMs: number = 20000,
  forceRefresh: boolean = false
): Promise<string> {
  const encSheet = encodeURIComponent(sheetName);
  const now = Date.now();

  // 1. Serve from client memory cache if valid and not force refresh
  if (!forceRefresh && clientCsvCache[sheetName] && (now - clientCsvCache[sheetName].timestamp < CLIENT_CACHE_TTL)) {
    return clientCsvCache[sheetName].text;
  }

  // 2. Share existing in-flight promise if another request for the same sheet is pending
  if (!forceRefresh && clientInFlight.has(sheetName)) {
    return clientInFlight.get(sheetName)!;
  }

  const fetchPromise = (async () => {
    const refreshQuery = forceRefresh ? "&refresh=1" : "";
    const candidateUrls = [
      // 1. Same-origin backend proxy
      `/api/sheets-csv?sheet=${encSheet}${refreshQuery}&_t=${Date.now()}`,
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

        // Cache in memory
        clientCsvCache[sheetName] = { text: csvText, timestamp: Date.now() };

        // Save to localStorage as offline fallback if reasonably sized (< 2MB)
        try {
          if (csvText.length < 2000000) {
            localStorage.setItem(`rendemen_csv_cache_${sheetName}`, csvText);
          }
        } catch (_) {}

        return csvText;
      } catch (err: any) {
        clearTimeout(timeoutId);
        lastError = err;
      }
    }

    // Fallback: load last cached CSV from localStorage if available
    try {
      const savedOfflineCsv = localStorage.getItem(`rendemen_csv_cache_${sheetName}`);
      if (savedOfflineCsv && savedOfflineCsv.trim().length > 0) {
        console.warn(`Menggunakan cache lokal tersimpan untuk sheet [${sheetName}]`);
        return savedOfflineCsv;
      }
    } catch (_) {}

    if (lastError?.name === 'AbortError' || lastError?.message?.includes('aborted')) {
      throw new Error(`Koneksi ke Google Sheets timeout (${sheetName}).`);
    }

    throw lastError || new Error(`Gagal mengambil data dari Google Sheets (${sheetName}).`);
  })();

  clientInFlight.set(sheetName, fetchPromise);
  try {
    return await fetchPromise;
  } finally {
    clientInFlight.delete(sheetName);
  }
}

export async function fetchSheetData(forceRefresh: boolean = false): Promise<SheetData[]> {
  try {
    const csvText = await fetchSheetCsvText("DATABASE APPSCRIPT", 25000, forceRefresh);
    
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

          const headerRow = rawData[0];
          const headers = headerRow.map((h: any) => String(h || "").trim().toLowerCase());

          // Dynamic column index finder by header name pattern
          const findCol = (predicate: (h: string) => boolean, fallback: number) => {
            const idx = headers.findIndex(predicate);
            return idx !== -1 ? idx : fallback;
          };

          const colTanggal = findCol(h => h.includes("tanggal"), 0);
          const colMesin = findCol(h => h.includes("mesin"), 1);
          const colLine = findCol(h => h === "line", 2);
          const colInput = findCol(h => h === "input", 3);
          const colUtama = findCol(h => h === "utama", 4);
          const colYieldPrimary = findCol(h => h === "yield_primary", 5);
          const colTurunan = findCol(h => h === "turunan", 6);
          const colYieldSecondary = findCol(h => h === "yield_secondary", 7);
          const colLokal = findCol(h => h === "lokal" || h.startsWith("lokal"), 8);
          // Note: col 9 in updated sheet is "yield_lokal"
          const colTotal = findCol(h => h === "total", 10);
          const colYieldTotal = findCol(h => h === "yield_total", 11);
          const colTarget = findCol(h => h === "target total" || h.includes("target"), 12);
          const colAchievement = findCol(h => h === "achievement", 13);
          const colWeek = findCol(h => h === "week", 14);
          const colMonth = findCol(h => h === "month", 15);
          const colQuartal = findCol(h => h === "quartal", 16);
          const colPoint = findCol(h => h === "point", 17);
          const colUtamaNonPilot = findCol(h => h.includes("utama non pilot"), 20);

          const parseNum = (val: any): number => {
            if (val === null || val === undefined || val === "") return 0;
            if (typeof val === "number") return isNaN(val) ? 0 : val;
            const cleaned = String(val).trim().replace(/\s/g, "").replace(/,/g, ".");
            const num = parseFloat(cleaned);
            return isNaN(num) ? 0 : num;
          };

          const dataRows = rawData.slice(1); // Skip header row
          
          const mappedData: SheetData[] = dataRows.map((row) => {
            if (!row || row.length < 5) return null;

            const input = parseNum(row[colInput]);
            const utama = parseNum(row[colUtama]);
            const yield_primary = parseNum(row[colYieldPrimary]);
            const turunan = parseNum(row[colTurunan]);
            const yield_secondary = parseNum(row[colYieldSecondary]);
            const lokal = parseNum(row[colLokal]);
            const output = parseNum(row[colTotal]); // Kolom "total" produksi
            const yield_total = parseNum(row[colYieldTotal]);
            const target = parseNum(row[colTarget]);
            const achievement = parseNum(row[colAchievement]);
            let week = Math.round(parseNum(row[colWeek]));
            let month = Math.round(parseNum(row[colMonth]));
            let quartal = Math.round(parseNum(row[colQuartal]));
            const point = parseNum(row[colPoint]);
            const utama_non_pilot_ladder = parseNum(row[colUtamaNonPilot]);
            
            let rawDate = row[colTanggal];
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
                      dateStr = String(rawDate).trim(); 
                    }
                  }
                }
              } catch (e) {
                dateStr = String(rawDate).trim();
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

            // Standardize machine naming (e.g. "Bs1" -> "BS 1", "Poni A" -> "PONI A")
            let rawMesin = row[colMesin] ? String(row[colMesin]).trim() : "UNKNOWN";
            let normalizedMesin = rawMesin.toUpperCase();
            const bsMatch = rawMesin.replace(/\s+/g, "").match(/^BS([1-8])$/i);
            if (bsMatch) {
              normalizedMesin = `BS ${bsMatch[1]}`;
            }

            return {
              tanggal: dateStr,
              mesin: normalizedMesin,
              line: row[colLine] ? String(row[colLine]).trim() : "-",
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

export async function fetchDowntimeData(forceRefresh: boolean = false): Promise<DowntimeData[]> {
  try {
    // Downtime data is embedded in the primary DATABASE APPSCRIPT sheet
    let csvText = "";
    try {
      csvText = await fetchSheetCsvText("DATABASE APPSCRIPT", 25000, forceRefresh);
    } catch {
      // Fallback in case a dedicated Downtime sheet is ever created
      csvText = await fetchSheetCsvText("Downtime", 25000, forceRefresh);
    }

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

          const headerRow = rawData[0];
          const headers = headerRow.map((h: any) => String(h || "").trim().toLowerCase());

          const colTanggal = headers.findIndex(h => h.includes("tanggal"));
          const colMesin = headers.findIndex(h => h.includes("mesin"));
          const colDowntime = headers.findIndex(h => h === "downtime");

          // Identify individual reason category columns for fallback
          const reasonCols: { idx: number; label: string }[] = [];
          for (let i = 0; i < headers.length; i++) {
            const h = headers[i];
            if (["pln", "istirahat", "shift off", "preventif", "project", "briefing", "meeting", "training", "repro", "gergaji", "setting", "bersih", "ppm", "cukup", "gudang", "mesin lain"].some(k => h.includes(k))) {
              let label = String(rawData[0][i] || "").trim();
              label = label.charAt(0).toUpperCase() + label.slice(1);
              reasonCols.push({ idx: i, label });
            }
          }

          const mappedData: DowntimeData[] = [];
          const dataRows = rawData.slice(1);

          dataRows.forEach((row, rowIndex) => {
            if (!row || row.length < 5) return;

            let rawDate = row[colTanggal !== -1 ? colTanggal : 0];
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
                    dateStr = String(rawDate).trim();
                  }
                }
              } catch {
                dateStr = String(rawDate).trim();
              }
            }

            if (!dateStr) return;

            let rawMesin = row[colMesin !== -1 ? colMesin : 1] ? String(row[colMesin !== -1 ? colMesin : 1]).trim() : "UNKNOWN";
            let mesin = rawMesin;
            const bsMatch = rawMesin.replace(/\s+/g, "").match(/^BS([1-8])$/i);
            if (bsMatch) {
              mesin = `BS ${bsMatch[1]}`;
            } else if (/^PONI\s*A$/i.test(rawMesin)) {
              mesin = "PONI A";
            } else if (/^PONI\s*B$/i.test(rawMesin)) {
              mesin = "PONI B";
            } else if (/^BREAK(DOWN)?$/i.test(rawMesin)) {
              mesin = "BREAKDOWN";
            }

            // 1. Check formatted downtime summary column
            const rawDowntime = colDowntime !== -1 && row[colDowntime] ? String(row[colDowntime]).trim() : "";
            const events = rawDowntime.split(',').map(e => e.trim()).filter(e => e && e.includes("="));

            if (events.length > 0) {
              events.forEach((evt, evtIndex) => {
                const parts = evt.split("=");
                const ket = parts[0].trim();
                const dur = parts[1].trim();
                mappedData.push({
                  id: `downtime-${dateStr}-${mesin.replace(/\s+/g, "")}-${rowIndex}-${evtIndex}`,
                  tanggal: dateStr,
                  mesin,
                  keterangan: ket,
                  durasi: dur.endsWith("mnt") || dur.endsWith("jam") ? dur : `${dur}mnt`,
                  jenis: "maintenance",
                  waktu: "00:00"
                });
              });
            } else if (reasonCols.length > 0) {
              // 2. Fallback to individual reason columns
              reasonCols.forEach((rc, rcIndex) => {
                const val = row[rc.idx];
                if (val && parseFloat(String(val).replace(/,/g, ".")) > 0) {
                  const durNum = parseFloat(String(val).replace(/,/g, "."));
                  mappedData.push({
                    id: `downtime-${dateStr}-${mesin.replace(/\s+/g, "")}-${rowIndex}-${rcIndex}`,
                    tanggal: dateStr,
                    mesin,
                    keterangan: rc.label,
                    durasi: `${durNum}mnt`,
                    jenis: "maintenance",
                    waktu: "00:00"
                  });
                }
              });
            }
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

export async function fetchOrderUrgentData(selectedDateStr: string, forceRefresh: boolean = false): Promise<OrderUrgentData[]> {
  try {
    const csvText = await fetchSheetCsvText("ORDER URGENT", 25000, forceRefresh);
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

          // Dynamically detect Total, Kekurangan, and Satuan columns
          let totalColIdx = -1;
          let kekuranganColIdx = -1;
          let satuanColIdx = headers.findIndex(h => typeof h === "string" && h.trim().toLowerCase() === "satuan");

          const explicitTotalIdx = headers.findIndex(h => typeof h === "string" && h.trim().toLowerCase() === "total");
          const explicitKurangIdx = headers.findIndex(h => typeof h === "string" && (h.trim().toLowerCase().includes("kurang") || h.trim().toLowerCase().includes("sisa")));

          const lastDateIdx = dateCols.length > 0 ? dateCols[dateCols.length - 1].idx : -1;

          if (explicitTotalIdx !== -1) {
            totalColIdx = explicitTotalIdx;
          } else if (satuanColIdx !== -1 && satuanColIdx >= 2) {
            totalColIdx = satuanColIdx - 2;
          } else if (lastDateIdx !== -1) {
            totalColIdx = lastDateIdx + 1;
          } else {
            totalColIdx = 67;
          }

          if (explicitKurangIdx !== -1) {
            kekuranganColIdx = explicitKurangIdx;
          } else if (satuanColIdx !== -1 && satuanColIdx >= 1) {
            kekuranganColIdx = satuanColIdx - 1;
          } else if (lastDateIdx !== -1) {
            kekuranganColIdx = lastDateIdx + 2;
          } else {
            kekuranganColIdx = 68;
          }

          if (satuanColIdx === -1) {
            satuanColIdx = lastDateIdx !== -1 ? lastDateIdx + 3 : 69;
          }

          const mappedData: OrderUrgentData[] = [];

          dataRows.forEach((row) => {
            if (!row || row.length < 5) return;
            const ukuran = String(row[1] || "").trim();
            if (!ukuran) return; // Must have size (ukuran)

            const panjang = String(row[2] !== undefined && row[2] !== null ? row[2] : "").trim();
            const jo = String(row[3] || "").trim();

            const targetKebutuhan = parseNumber(row[4]);
            
            // Total column from spreadsheet (Kolom Total)
            const totalRealisasi = totalColIdx !== -1 && row[totalColIdx] !== undefined && row[totalColIdx] !== null && String(row[totalColIdx]).trim() !== ""
              ? parseNumber(row[totalColIdx])
              : 0;
            
            // Kekurangan column from spreadsheet (Kolom Kekurangan / Selisih)
            const rawKekurangan = kekuranganColIdx !== -1 && row[kekuranganColIdx] !== undefined && row[kekuranganColIdx] !== null && String(row[kekuranganColIdx]).trim() !== ""
              ? parseNumber(row[kekuranganColIdx])
              : (totalRealisasi - targetKebutuhan);

            // Dynamic days
            const todayVal = todayIdx !== -1 ? parseNumber(row[todayIdx]) : 0;
            const yesterdayVal = yesterdayIdx !== -1 ? parseNumber(row[yesterdayIdx]) : 0;

            // Unit from spreadsheet
            let unit = "Pcs";
            const rawUnit = satuanColIdx !== -1 && row[satuanColIdx] !== undefined
              ? String(row[satuanColIdx] || "").trim().toUpperCase()
              : "";
            if (rawUnit === "M3" || rawUnit === "M³") {
              unit = "M³";
            } else if (rawUnit) {
              unit = rawUnit;
            }

            const progress = targetKebutuhan > 0 
              ? (totalRealisasi / targetKebutuhan) * 100 
              : (totalRealisasi > 0 ? 100 : 0);

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

export async function fetchOperatorData(forceRefresh: boolean = false): Promise<OperatorData[]> {
  try {
    const csvText = await fetchSheetCsvText("Operator bs", 25000, forceRefresh);

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

export interface RealtimeTodayData {
  tanggal: string;
  mesin: string;
  inputAktual: number;
  utama: number;
  persenUtama: string;
  turunan: number;
  persenTurunan: string;
  lokal: number;
  persenLokal: string;
  total: number;
  persenTotal: string;
  m3PerJam: number;
}

export async function fetchRealtimeTodayData(forceRefresh: boolean = false): Promise<RealtimeTodayData[]> {
  try {
    let csvText = "";
    const sheetCandidates = ["realtime today", "Realtime Today"];
    
    for (const sheetName of sheetCandidates) {
      try {
        csvText = await fetchSheetCsvText(sheetName, 20000, forceRefresh);
        if (csvText && csvText.trim().length > 0 && !csvText.includes("<!DOCTYPE")) {
          break;
        }
      } catch (_) {
        // try next
      }
    }

    if (!csvText || csvText.trim().length === 0) {
      // Fallback to cached realtime data from localStorage
      const cached = localStorage.getItem("rendemen_last_realtime_data");
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch (_) {}
      }
      return [];
    }

    return new Promise((resolve, reject) => {
      Papa.parse(csvText, {
        header: false,
        dynamicTyping: false,
        skipEmptyLines: true,
        complete: (results) => {
          const rawData = results.data as any[][];
          if (rawData.length < 2) {
            resolve([]);
            return;
          }

          const headerRow = rawData[0];
          const headers = headerRow.map((h: any) => String(h || "").trim().toLowerCase());

          // Find column indices by header name
          const colTanggal = headers.findIndex(h => h.includes("tanggal"));
          const colMesin = headers.findIndex(h => h.includes("mesin"));
          const colInput = headers.findIndex(h => h.includes("input"));
          const colUtama = headers.findIndex(h => h.includes("utama"));
          const colTurunan = headers.findIndex(h => h.includes("turunan"));
          const colLokal = headers.findIndex(h => h.includes("lokal"));
          const colTotal = headers.findIndex(h => h.includes("total"));
          const colM3H = headers.findIndex(h => h.includes("m3/h") || h.includes("m3") || h.includes("/h"));

          // Helper to parse float safely
          const parseNum = (val: any): number => {
            if (val === undefined || val === null) return 0;
            const s = String(val).replace(/,/g, ".").replace(/[^0-9.-]/g, "").trim();
            const n = parseFloat(s);
            return isNaN(n) ? 0 : n;
          };

          // Helper to parse percentage
          const parsePct = (val: any, fallbackCalc = "0.00%"): string => {
            if (val === undefined || val === null) return fallbackCalc;
            const s = String(val).trim();
            if (s.includes("%")) return s;
            const n = parseFloat(s.replace(/,/g, "."));
            if (!isNaN(n)) {
              return (n <= 1 && n > 0 ? (n * 100).toFixed(2) : n.toFixed(2)) + "%";
            }
            return fallbackCalc;
          };

          const dataRows = rawData.slice(1);
          const mappedData: RealtimeTodayData[] = [];

          dataRows.forEach(row => {
            if (!row || row.length < 3) return;

            const rawMesin = String(row[colMesin !== -1 ? colMesin : 1] || "").trim();
            if (!rawMesin) return;

            // Normalize machine name (BS.1, BS 1 -> BS 1)
            let mesin = rawMesin;
            const bsMatch = rawMesin.replace(/\s+/g, "").match(/^BS\.?([1-8])$/i);
            if (bsMatch) {
              mesin = `BS ${bsMatch[1]}`;
            }

            const rawTanggal = String(row[colTanggal !== -1 ? colTanggal : 0] || "").trim();
            const inputAktual = parseNum(row[colInput !== -1 ? colInput : 2]);
            const utama = parseNum(row[colUtama !== -1 ? colUtama : 3]);
            
            // % Utama is adjacent
            const pUtamaIdx = colUtama !== -1 ? colUtama + 1 : 4;
            const persenUtama = parsePct(row[pUtamaIdx]);

            const turunan = parseNum(row[colTurunan !== -1 ? colTurunan : 5]);
            const pTurunanIdx = colTurunan !== -1 ? colTurunan + 1 : 6;
            const persenTurunan = parsePct(row[pTurunanIdx]);

            const lokal = parseNum(row[colLokal !== -1 ? colLokal : 7]);
            const pLokalIdx = colLokal !== -1 ? colLokal + 1 : 8;
            const persenLokal = parsePct(row[pLokalIdx]);

            const total = parseNum(row[colTotal !== -1 ? colTotal : 9]);
            const pTotalIdx = colTotal !== -1 ? colTotal + 1 : 10;
            const persenTotal = parsePct(row[pTotalIdx]);

            const m3PerJam = parseNum(row[colM3H !== -1 ? colM3H : 11]);

            mappedData.push({
              tanggal: rawTanggal,
              mesin,
              inputAktual,
              utama,
              persenUtama,
              turunan,
              persenTurunan,
              lokal,
              persenLokal,
              total,
              persenTotal,
              m3PerJam
            });
          });

          resolve(mappedData);
        },
        error: (error: any) => reject(new Error(`Gagal proses CSV realtime: ${error.message}`))
      });
    });
  } catch (error: any) {
    console.warn("Realtime Fetch Note:", error?.message || error);
    return [];
  }
}


