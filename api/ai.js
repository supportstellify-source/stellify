// api/ai.js – Sicherer Groq API-Proxy für Stellify
// Der Key liegt NUR hier auf dem Server – niemals im Frontend-Code!

const GROQ_KEY_FALLBACK = process.env.GROQ_KEY_BACKUP || "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";

export default async function handler(req, res) {
  // CORS preflight
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Nur POST erlaubt" });

  // Key: zuerst Vercel-Env, dann eingebetteter Fallback
  const GROQ_KEY = process.env.GROQ_KEY || GROQ_KEY_FALLBACK;

  try {
    const { model, max_tokens, messages, stream } = req.body || {};

    if (!messages || !Array.isArray(messages) || messages.length === 0)
      return res.status(400).json({ error: "Ungültige Anfrage – messages fehlen." });

    const payload = {
      model: model || "llama-3.1-8b-instant",
      max_tokens: Math.min(Number(max_tokens) || 1000, 2000),
      messages,
      stream: !!stream,
    };

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (stream) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      const reader = groqRes.body.getReader();
      const dec = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(dec.decode(value, { stream: true }));
      }
      return res.end();
    }

    const data = await groqRes.json();
    if (!groqRes.ok) {
      return res.status(groqRes.status).json({
        error: data?.error?.message || `Groq Fehler ${groqRes.status}`,
      });
    }
    return res.status(200).json(data);

  } catch (err) {
    console.error("[api/ai] Fehler:", err.message);
    return res.status(500).json({ error: "Serverfehler – bitte nochmals versuchen." });
  }
}
