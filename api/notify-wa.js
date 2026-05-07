export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { message, target } = req.body;
    const FONNTE_TOKEN = process.env.FONNTE_TOKEN || "ZMmGJ6dN3ZB8qCNKUMMn";
    const DEFAULT_TARGET = process.env.FONNTE_TARGET_PHONE || target || "6285725766343,6282165053509,62895323091432,6281276267423";

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const response = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: {
        "Authorization": FONNTE_TOKEN,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        target: DEFAULT_TARGET,
        message: message,
        delay: "2",
        countryCode: "62"
      })
    });
    
    const data = await response.json();
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
