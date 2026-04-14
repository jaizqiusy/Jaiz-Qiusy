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
}

const SHEET_ID = "1G7x3dtE2KFF338w6qdd4jrMkz-yrbThlzx5Vi0I8AqQ";
// Using the gviz API which is often more reliable for CORS and public sheets
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv`;

export async function fetchSheetData(): Promise<SheetData[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

  try {
    console.log("Fetching from:", CSV_URL);
    const response = await fetch(CSV_URL, { 
      signal: controller.signal,
      headers: {
        'Accept': 'text/csv'
      }
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error("Akses ditolak. Pastikan Google Sheet disetel ke 'Siapa saja yang memiliki link dapat melihat'.");
      }
      throw new Error(`Gagal mengambil data (Status: ${response.status}).`);
    }
    
    const csvText = await response.text();
    
    // Check if we got an HTML login page instead of CSV
    if (csvText.includes("<!DOCTYPE html>") || csvText.includes("<html")) {
      throw new Error("Google Sheet tidak dapat diakses secara publik. Pastikan pengaturan berbagi adalah 'Siapa saja yang memiliki link dapat melihat'.");
    }

    if (!csvText || csvText.trim().length === 0) {
      throw new Error("Data Google Sheet kosong.");
    }
    
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
            const week = Number(row[13]) || 0;
            const month = Number(row[14]) || 0;
            const quartal = Number(row[15]) || 0;
            
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
              quartal
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
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error("Koneksi ke Google Sheets timeout (10 detik).");
    }
    console.error("Sheet Fetch Error:", error);
    throw error;
  }
}
