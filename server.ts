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

  // API Proxy Route for Google Sheets CSV (ultra-fast cloud-to-cloud connection)
  app.get("/api/sheets-csv", async (req, res) => {
    try {
      const sheet = String(req.query.sheet || "DATABASE APPSCRIPT");
      const SHEET_ID = "1G7x3dtE2KFF338w6qdd4jrMkz-yrbThlzx5Vi0I8AqQ";
      const encSheet = encodeURIComponent(sheet);
      const urls = [
        `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encSheet}&_t=${Date.now()}`,
        `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&sheet=${encSheet}&_t=${Date.now()}`
      ];

      let csvText = "";
      let lastErr: any = null;

      for (const url of urls) {
        try {
          const response = await axios.get(url, {
            timeout: 25000,
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
            !response.data.includes("<!DOCTYPE html>")
          ) {
            csvText = response.data;
            break;
          }
        } catch (e) {
          lastErr = e;
        }
      }

      if (!csvText) {
        return res.status(502).json({ error: "Gagal mengambil data dari Google Sheets", details: lastErr?.message });
      }

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      return res.status(200).send(csvText);
    } catch (err: any) {
      console.error("Sheets proxy error:", err.message);
      res.status(500).json({ error: err.message });
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
