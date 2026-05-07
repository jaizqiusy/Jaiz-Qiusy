import axios from "axios";
import { Calculation } from "../App";

export async function sendWhatsAppNotification(data: Calculation[]) {
  if (data.length === 0) return;

  // Mengambil 3 data terakhir yang valid (ada input atau output)
  const latest = [...data]
    .filter(item => item.input > 0 || item.output > 0)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 3);
  
  if (latest.length === 0) return; // Jangan kirim notifikasi jika tidak ada data valid

  let msg = "🚀 RENDEMENKU SUDAH UPDATE 🚀\n";
  msg += `📅 Tanggal: ${new Date().toLocaleDateString("id-ID")}\n`;
  msg += "** SILAHKAN CEK ,REVIEW DAN ANALISA **\n";
  msg += "** RENDEMEN TINGGI BUKAN SEKEDAR ANGKA TAPI BUKTI DARI KERJA KERAS KITA DALAM MENGOPTIMALKAN SETIAP SERPIHAN KAYU **\n";
  msg += "BERSAMA KITA BISA\n\n";
  msg += typeof window !== "undefined" ? window.location.origin : "https://jaiz-qiusy.vercel.app";

  const FONNTE_TOKEN = "ZMmGJ6dN3ZB8qCNKUMMn";
  const DEFAULT_TARGET = "6285725766343,6282165053509,62895323091432,6281276267423";

  try {
    // Try calling Fonnte directly (bypasses backend, works perfectly if no CORS restriction)
    const response = await axios.post(
      "https://api.fonnte.com/send",
      { target: DEFAULT_TARGET, message: msg, delay: "2", countryCode: "62" },
      { headers: { Authorization: FONNTE_TOKEN } }
    );
    console.log("Direct WA Notification response:", response.data);
    if (response.data && response.data.status === false) {
       throw new Error(response.data.reason || "Fonnte API returned status false");
    }
    return response.data;
  } catch (error) {
    console.info("Direct call failed, trying local API as fallback...", error);
    // Fallback to our existing /api/notify-wa route (works in AI Studio and via Vercel functions)
    try {
      const response = await axios.post("/api/notify-wa", {
        message: msg
      });
      console.log("Fallback WA Notification response:", response.data);
      if (response.data && response.data.data && response.data.data.status === false) {
         throw new Error(response.data.data.reason || "Fonnte API returned status false");
      }
      return response.data;
    } catch (fallbackError) {
      console.error("Failed to send WA notification via fallback:", fallbackError);
      throw fallbackError;
    }
  }
}

export async function sendCustomWhatsAppNotification(message: string) {
  const FONNTE_TOKEN = "ZMmGJ6dN3ZB8qCNKUMMn";
  const DEFAULT_TARGET = "6285725766343,6282165053509,62895323091432,6281276267423";

  try {
    const response = await axios.post(
      "https://api.fonnte.com/send",
      { target: DEFAULT_TARGET, message: message, delay: "2", countryCode: "62" },
      { headers: { Authorization: FONNTE_TOKEN } }
    );
    console.log("Direct Custom WA request:", response.data);
    if (response.data && response.data.status === false) {
       throw new Error(response.data.reason || "Fonnte API returned status false");
    }
    return response.data;
  } catch (error) {
    console.info("Direct custom call failed, trying fallback...", error);
    try {
      const response = await axios.post("/api/notify-wa", {
        message: message
      });
      console.log("Fallback Custom WA Notification response:", response.data);
      if (response.data && response.data.data && response.data.data.status === false) {
         throw new Error(response.data.data.reason || "Fonnte API returned status false");
      }
      return response.data;
    } catch (fallbackError) {
      console.error("Failed to send Custom WA notification:", fallbackError);
      throw fallbackError;
    }
  }
}
