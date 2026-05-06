import axios from "axios";
import { Calculation } from "../App";

export async function sendWhatsAppNotification(data: Calculation[]) {
  if (data.length === 0) return;

  // Summarize newest calculations
  // Get top 3 latest by timestamp
  const latest = [...data].sort((a, b) => b.timestamp - a.timestamp).slice(0, 3);
  
  let msg = "🚀 *RENDEMENKU UPDATE* 🚀\n";
  msg += `📅 Tanggal: ${new Date().toLocaleDateString("id-ID")}\n\n`;
  
  latest.forEach(item => {
    msg += `📍 *Mesin ${item.machine}*\n`;
    msg += `• In: ${item.input.toLocaleString("id-ID")} M3\n`;
    msg += `• Out: ${item.output.toLocaleString("id-ID")} M3\n`;
    msg += `• Yield: ${(item.yield_primary * 100).toFixed(2)}%\n`;
    msg += `• Point: ${Math.min(10, item.achievement * 10).toFixed(2)}\n\n`;
  });

  msg += "--- Klik dashboard untuk detail ---\n";
  msg += "http://localhost:3000"; // Generic link, AI Studio handles preview

  try {
    const response = await axios.post("/api/notify-wa", {
      message: msg
    });
    console.log("WA Notification sent:", response.data);
    return response.data;
  } catch (error) {
    console.error("Failed to send WA notification:", error);
    throw error;
  }
}

export async function sendCustomWhatsAppNotification(message: string) {
  try {
    const response = await axios.post("/api/notify-wa", {
      message: message
    });
    console.log("Custom WA Notification sent:", response.data);
    return response.data;
  } catch (error) {
    console.error("Failed to send Custom WA notification:", error);
    throw error;
  }
}
