
import { GoogleGenAI } from "@google/genai";

export async function analyzeTeamFinances(cashBalance: number, openPenalties: number, teamName: string) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `
      Du bist ein humorvoller, aber fairer Kassenwart eines Sportvereins namens "${teamName}".
      Aktueller Kassenstand: ${cashBalance.toFixed(2)} €
      Noch offene Strafen (Schulden der Spieler): ${openPenalties.toFixed(2)} €
      
      Analysiere diese Situation kurz und knackig in 2-3 Sätzen. 
      Gib eine Empfehlung ab, ob die Mannschaft bald eine Party (Mannschaftsabend) feiern kann oder ob sie "eher mal die Laufschuhe schnüren" sollte, um die Disziplin zu erhöhen.
      Sei motivierend und nutze Fußball-Metaphern.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "Die KI macht gerade eine Trinkpause. Versuch es später nochmal!";
  } catch (error) {
    console.error("Gemini AI Error:", error);
    return "Fehler bei der KI-Analyse. Wahrscheinlich hat der Kassenwart den Schlüssel verloren.";
  }
}
