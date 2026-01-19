
import { GoogleGenAI } from "@google/genai";
import { PenaltyRecord, Transaction } from "../types";

export const generateAIWeeklyReport = async (records: PenaltyRecord[], transactions: Transaction[]): Promise<string> => {
  const env = (window as any).process?.env || {};
  const apiKey = env.API_KEY || "";
  
  if (!apiKey) {
    return "Hinweis: Kein API-Key für Gemini hinterlegt. Der Kassenwart kann momentan keine Berichte schreiben.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    const recentRecords = records.slice(0, 10);
    const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    const prompt = `
      Handle als "Der Kassenwart", ein legendärer Charakter eines Amateur-Fußballvereins.
      Erstelle einen kurzen humorvollen Bericht (Max 100 Wörter) über diese Daten:
      Einnahmen: ${income}€, Ausgaben: ${expenses}€, Sünden: ${recentRecords.map(r => r.userName + ": " + r.categoryName).join(', ')}.
      Nutze Fußball-Slang.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 },
        temperature: 0.8
      }
    });

    return response.text || "Der Kassenwart hat gerade Sendepause.";
  } catch (error) {
    console.error("AI Error:", error);
    return "Der Kassenwart hat ein technisches Problem (wahrscheinlich die Brille verlegt).";
  }
};
