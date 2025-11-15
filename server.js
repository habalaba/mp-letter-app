import express from "express";
import dotenv from "dotenv";
import fetch from "node-fetch";
import OpenAI from "openai";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const openaiKey = process.env.OPENAI_API_KEY;
const openaiClient = openaiKey ? new OpenAI({ apiKey: openaiKey }) : null;

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Lookup representative by postal code and level
app.post("/api/representative", async (req, res) => {
  const { postalCode, level } = req.body || {};

  if (!postalCode || !level) {
    return res
      .status(400)
      .json({ error: "postalCode and level (federal|provincial) are required" });
  }

  const cleaned = postalCode.toUpperCase().replace(/\s+/g, "");

  try {
    const url = `https://represent.opennorth.ca/postcodes/${cleaned}/`;
    const resp = await fetch(url);

    if (!resp.ok) {
      return res.status(502).json({ error: "Failed to look up postal code" });
    }

    const data = await resp.json();
    const reps = [
      ...(data.representatives_centroid || []),
      ...(data.representatives_concordance || [])
    ];

    // Deduplicate by name
    const uniqueByName = Object.values(
      reps.reduce((acc, rep) => {
        acc[rep.name] = acc[rep.name] || rep;
        return acc;
      }, {})
    );

    const targetOfficeType = level === "federal" ? "MP" : "MPP";
    const candidates = uniqueByName.filter(
      (r) => r.elected_office === targetOfficeType
    );

    if (candidates.length === 0) {
      return res.status(404).json({
        error: "No representative found for this level. Check your postal code and level."
      });
    }

    const rep = candidates[0];

    const office =
      (rep.offices || []).find(
        (o) => o.type === "constituency" && o.postal
      ) || (rep.offices || []).find((o) => o.postal) || null;

    res.json({
      name: rep.name,
      elected_office: rep.elected_office,
      district_name: rep.district_name,
      party_name: rep.party_name || null,
      email: rep.email || null,
      office_postal: office?.postal || null,
      office_tel: office?.tel || null
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Unexpected error looking up representative" });
  }
});

// Enhance message using OpenAI
app.post("/api/enhance", async (req, res) => {
  const { rawMessage, repName, repRole, districtName, topic } = req.body || {};

  if (!rawMessage || !repName || !repRole) {
    return res.status(400).json({
      error: "rawMessage, repName, and repRole are required"
    });
  }

  if (!openaiClient) {
    return res.status(500).json({
      error: "OpenAI API key not configured on the server"
    });
  }

  try {
    const prompt = `
You are drafting a formal Canadian business letter to an elected representative.

Recipient: ${repName}, ${repRole}${districtName ? ` for ${districtName}` : ""}.
Topic: ${topic || "Constituent concern"}.

Input message from constituent:
"${rawMessage}"

Task:
- Keep the constituent's core points and requested action.
- Use clear, respectful language suited to an MP / MPP.
- Avoid partisan attacks or insults.
- Write in first person ("I").
- 3–6 short paragraphs.
- Return ONLY the letter body text (no addresses, date, greeting, or closing).
    `.trim();

    const completion = await openaiClient.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3
    });

    const enhancedBody = completion.choices?.[0]?.message?.content?.trim();
    if (!enhancedBody) {
      return res.status(500).json({ error: "No content returned from AI" });
    }

    res.json({ enhancedBody });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "AI enhancement failed" });
  }
});

// Fallback to index.html for root
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
