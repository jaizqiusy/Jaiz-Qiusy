import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // API Route for Fonnte WhatsApp Notification
  app.post("/api/notify-wa", async (req, res) => {
    try {
      const { message, target } = req.body;
      const FONNTE_TOKEN = "ZMmGJ6dN3ZB8qCNKUMMn";
      const DEFAULT_TARGET = "6285725766343,6282165053509,62895323091432,6281276267423";

      if (!FONNTE_TOKEN) {
        console.error("FONNTE_TOKEN is not set");
        return res.status(500).json({ success: false, error: "Configuration error: FONNTE_TOKEN is missing" });
      }

      if (!DEFAULT_TARGET) {
        return res.status(400).json({ success: false, error: "Target phone number is missing" });
      }

      const response = await axios.post(
        "https://api.fonnte.com/send",
        {
          target: DEFAULT_TARGET,
          message: message,
          delay: "2",
          countryCode: "62", // Default to Indonesia
        },
        {
          headers: {
            Authorization: FONNTE_TOKEN,
          },
        }
      );

      res.status(200).json({ success: true, data: response.data });
    } catch (error: any) {
      console.error("WhatsApp Notification Error:", error.response?.data || error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // In-memory cache and in-flight promise deduplication
  const sheetsCache: Record<string, { data: string, timestamp: number }> = {};
  const inFlightRequests = new Map<string, Promise<string>>();
  const CACHE_TTL = 30000; // 30 seconds fresh cache

  // Clear cache endpoint
  app.post("/api/clear-cache", (req, res) => {
    const sheetCount = Object.keys(sheetsCache).length;
    for (const key in sheetsCache) {
      delete sheetsCache[key];
    }
    inFlightRequests.clear();
    console.log(`Cache cleared (${sheetCount} entries)`);
    res.json({ success: true, message: "Cache successfully cleared" });
  });

  // API Proxy Route for Google Sheets CSV (ultra-fast cloud-to-cloud connection with deduplication & stale fallback)
  app.get("/api/sheets-csv", async (req, res) => {
    const sheet = String(req.query.sheet || "DATABASE APPSCRIPT").trim();
    const forceRefresh = req.query.refresh === "1" || req.query.refresh === "true";
    const now = Date.now();

    // 1. Serve from memory cache if fresh and not force-refreshing
    if (!forceRefresh && sheetsCache[sheet] && (now - sheetsCache[sheet].timestamp < CACHE_TTL)) {
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("X-Cache", "HIT");
      return res.status(200).send(sheetsCache[sheet].data);
    }

    // 2. Helper to fetch raw CSV from Google Sheets with fallbacks
    const fetchFromGoogle = async (): Promise<string> => {
      const SHEET_ID = "1G7x3dtE2KFF338w6qdd4jrMkz-yrbThlzx5Vi0I8AqQ";
      const encSheet = encodeURIComponent(sheet);
      const urls = [
        `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encSheet}&_t=${Date.now()}`,
        `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&sheet=${encSheet}&_t=${Date.now()}`
      ];

      let lastErr: any = null;

      for (const url of urls) {
        try {
          const response = await axios.get(url, {
            timeout: 12000, // 12 seconds per attempt
            responseType: "text",
            headers: {
              Accept: "text/csv, text/plain, */*",
              "Cache-Control": "no-cache",
              Pragma: "no-cache",
            },
          });
          if (
            response.status === 200 &&
            response.data &&
            typeof response.data === "string" &&
            !response.data.includes("<!DOCTYPE html>") &&
            !response.data.includes("<html")
          ) {
            return response.data;
          }
        } catch (e) {
          lastErr = e;
        }
      }

      throw lastErr || new Error(`Gagal mengambil data dari Google Sheets untuk sheet: ${sheet}`);
    };

    try {
      let csvPromise: Promise<string>;

      // Deduplicate concurrent in-flight requests for the same sheet
      if (!forceRefresh && inFlightRequests.has(sheet)) {
        csvPromise = inFlightRequests.get(sheet)!;
      } else {
        csvPromise = fetchFromGoogle();
        inFlightRequests.set(sheet, csvPromise);
      }

      try {
        const csvText = await csvPromise;
        // Update cache
        sheetsCache[sheet] = { data: csvText, timestamp: Date.now() };

        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.setHeader("X-Cache", forceRefresh ? "REFRESH" : "MISS");
        return res.status(200).send(csvText);
      } finally {
        inFlightRequests.delete(sheet);
      }
    } catch (err: any) {
      console.warn(`Sheets fetch warning for [${sheet}]:`, err?.message || err);

      // Stale cache fallback: if previous data exists, serve it seamlessly!
      if (sheetsCache[sheet]?.data) {
        console.log(`Serving stale cached data for [${sheet}]`);
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("X-Cache", "STALE-FALLBACK");
        return res.status(200).send(sheetsCache[sheet].data);
      }

      res.status(502).json({ 
        error: "Gagal mengambil data dari Google Sheets", 
        sheet, 
        details: err?.message || "Timeout / connection error" 
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Fonnte target (hardcoded updated version v2)`);
  });
}

startServer();
