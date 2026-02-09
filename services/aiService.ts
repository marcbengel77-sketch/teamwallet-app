
import { GoogleGenAI, Type } from "@google/genai";

/**
 * Analysiert die Team-Finanzen und gibt eine kurze KI-Einschätzung.
 */
export async function analyzeTeamFinances(cashBalance: number, openPenalties: number, teamName: string) {
  // Guideline: Always initialize a new GoogleGenAI instance right before making an API call.
  // Guideline: Use process.env.API_KEY directly as it is assumed to be pre-configured.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const prompt = `
      Du bist ein humorvoller, aber fairer Kassenwart des Teams "${teamName}".
      Aktueller Kassenstand: ${cashBalance.toFixed(2)} €
      Noch offene Strafen (Schulden der Mitglieder): ${openPenalties.toFixed(2)} €
      
      Analysiere diese Situation kurz und prägnant in 2-3 Sätzen. 
      Sei motivierend und nutze allgemeine Team-Metaphern. 
      Verzichte auf Sport-Jargon.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    // Guideline: response.text is a property, not a method.
    return response.text || "Die KI macht gerade eine Pause.";
  } catch (error) {
    console.error("Gemini AI Error:", error);
    return "KI-Analyse aktuell nicht verfügbar.";
  }
}

/**
 * Analysiert ein Belegbild und extrahiert Daten.
 */
export async function analyzeReceipt(base64Image: string) {
  // Guideline: Always initialize a new GoogleGenAI instance right before making an API call.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const imagePart = {
      inlineData: {
        mimeType: 'image/jpeg',
        data: base64Image.split(',')[1], // Entferne Prefix falls vorhanden
      },
    };

    const prompt = "Analysiere diesen Beleg. Extrahiere den Gesamtbetrag (nur Zahl), den Händler/Laden und eine passende Kategorie (z.B. Verpflegung, Material, Event). Antworte im JSON Format.";

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [imagePart, { text: prompt }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            amount: { type: Type.NUMBER, description: "Der Gesamtbetrag" },
            merchant: { type: Type.STRING, description: "Der Name des Händlers" },
            category: { type: Type.STRING, description: "Kategorie" },
            description: { type: Type.STRING, description: "Kurze Beschreibung was gekauft wurde" }
          },
          required: ["amount", "merchant", "category"]
        }
      }
    });

    // Guideline: response.text is a property.
    const text = response.text || "{}";
    return JSON.parse(text);
  } catch (error) {
    console.error("Receipt AI Error:", error);
    throw new Error("Beleg konnte nicht analysiert werden.");
  }
}
