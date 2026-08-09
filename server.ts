import express from "express";
import path from "path";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

const BANK_STATEMENT_PROMPT = `You are an expert financial data extractor. I am providing you with a bank statement (PDF or image).
Extract the tabular transaction data from this document.

You must strictly output ONLY a JSON array of objects, with no markdown formatting, no code blocks, and no extra text.

Rules for extraction:
1. Ignore non-transaction rows like headers, page numbers, opening balances, or closing balances.
2. Ensure the math is mathematically sound (balance should reflect the previous balance plus/minus the debit/credit).
3. Extract each transaction into an object with these exact keys:
   - "date": string (format: YYYY-MM-DD)
   - "description": string (the narrative/particulars of the transaction)
   - "debit": number or null (amount withdrawn/debited. Use null if it's a credit)
   - "credit": number or null (amount deposited/credited. Use null if it's a debit)
   - "balance": number (the resulting balance after the transaction)
4. Do not include a root object, just the JSON array. Example: [{"date": "2023-10-01", "description": "Amazon", "debit": 15.00, "credit": null, "balance": 150.00}]`;

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // API route to proxy RapidAPI requests to bypass CORS
  app.post("/api/verify-gstin", async (req, res) => {
    const { gstin } = req.body;
    
    // In production/deployment, use environment variables.
    // Fallback to request body for testing/flexibility, but prefer env.
    const key = process.env.RAPIDAPI_KEY || req.body.key;
    const host = process.env.RAPIDAPI_HOST || req.body.host || 'gst-verification.p.rapidapi.com';

    if (!key) {
      return res.status(500).json({ error: "RAPIDAPI_KEY environment variable is not configured in Settings > Secrets." });
    }

    if (!host) {
      return res.status(500).json({ error: "RAPIDAPI_HOST environment variable is not configured in Settings > Secrets." });
    }

    if (!gstin) {
      return res.status(400).json({ error: "Missing gstin in request body" });
    }

    try {
      // Common path pattern for GSTIN APIs, adjust if the specific API differs
      // e.g., gst-return-status.p.rapidapi.com uses /gstin/{gstin}
      // Indian GST API might use /v1/gstin/{gstin}
      
      const endpointPath = '/v3/tasks/sync/verify_with_source/ind_gst_certificate';
      
      // We generate random UUIDs for the task_id and group_id
      const taskId = crypto.randomUUID();
      const groupId = crypto.randomUUID();

      const response = await fetch(`https://${host}${endpointPath}`, {
        method: 'POST',
        headers: {
          'x-rapidapi-key': key,
          'x-rapidapi-host': host,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          task_id: taskId,
          group_id: groupId,
          data: {
            gstin: gstin
          }
        })
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        return res.status(response.status || 500).json({ 
          error: `API returned an invalid or non-JSON response (Status: ${response.status})`,
          details: text.substring(0, 200) 
        });
      }

      if (!response.ok) {
        return res.status(response.status).json({ error: data.message || data.error || "RapidAPI request failed", details: data });
      }

      res.json(data);
    } catch (err: any) {
      console.error("Proxy error:", err);
      res.status(500).json({ error: "Failed to connect to RapidAPI: " + err.message });
    }
  });

  app.post("/api/process-bank-statement", async (req, res) => {
    try {
      const { fileData, mimeType } = req.body;
      
      if (!fileData || !mimeType) {
        return res.status(400).json({ error: "Missing fileData or mimeType" });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY environment variable is not configured." });
      }

      const ai = new GoogleGenAI({ apiKey });
      
      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: [
          {
            role: 'user',
            parts: [
              { text: BANK_STATEMENT_PROMPT },
              {
                inlineData: {
                  data: fileData,
                  mimeType: mimeType
                }
              }
            ]
          }
        ],
        config: {
          temperature: 0.1,
          responseMimeType: "application/json",
        }
      });

      const text = response.text;
      
      if (!text) {
        throw new Error("No text returned from Gemini API");
      }

      const parsedData = JSON.parse(text);
      res.json(parsedData);
      
    } catch (err: any) {
      console.error("Gemini API error:", err);
      res.status(500).json({ error: "Failed to process statement: " + err.message });
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
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
