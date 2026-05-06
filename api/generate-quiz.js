export default async function handler(req, res) {
  // Alleen POST toestaan
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // CORS headers zodat de browser de aanroep mag doen
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  try {
    const { imageBase64 } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "Geen afbeelding meegestuurd" });
    }

    const prompt = `Analyseer dit nieuwsartikel screenshot en maak 4 meerkeuzevragen voor middelbare scholieren.

Geef ALLEEN dit JSON (geen markdown, geen uitleg):
{"title":"Korte titel (max 8 woorden)","summary":"Één zin samenvatting","questions":[{"question":"Vraag?","options":["A) ...","B) ...","C) ...","D) ..."],"correct":0}]}

Regels: "correct" = 0-gebaseerde index, varieer het juiste antwoord, test begrip, schrijf Nederlands.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-opus-4-5",
        max_tokens: 1000,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: "image/jpeg",
                  data: imageBase64,
                },
              },
              {
                type: "text",
                text: prompt,
              },
            ],
          },
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Anthropic fout:", data);
      return res.status(500).json({ error: "AI aanroep mislukt", details: data });
    }

    const text = data.content?.map((b) => b.text || "").join("") || "";
    const clean = text.replace(/```json|```/g, "").trim();
    const quiz = JSON.parse(clean);

    return res.status(200).json({ quiz });
  } catch (err) {
    console.error("Server fout:", err);
    return res.status(500).json({ error: err.message });
  }
}
