
import { GoogleGenAI } from "@google/genai";
import { PenaltyRecord, Transaction } from "../types";

export const generateAIWeeklyReport = async (records: PenaltyRecord[], transactions: Transaction[]): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const recentRecords = records.slice(0, 10);
  const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const prompt = `
    Handle als "Der Kassenwart", ein legendärer Charakter eines Amateur-Fußballvereins (Typ: streng aber herzlich, liebt die Mannschaftskasse mehr als seine eigene Frau). 
    Erstelle den "Bericht der Sünden" für die letzte Woche.
    
    Daten-Input:
    - Einnahmen (meist Strafzahlungen): ${income}€
    - Ausgaben (Kasten Bier, Grillzeug, etc.): ${expenses}€
    - Sündenregister (Namen und Vergehen): ${recentRecords.map(r => `${r.userName} hat "${r.categoryName}" verbrochen (${r.amount}€, Status: ${r.status})`).join(', ')}
    
    Anweisungen:
    1. Sprache: Deutsch (Vokabular: Amateurfußball, Kabinengeflüster, "Bolzplatz-Slang").
    2. Sei humorvoll und leicht bissig. 
    3. Nenne die größten "Finanz-Terroristen" (Leute mit vielen offenen Strafen) beim Namen.
    4. Wenn jemand schon bezahlt hat, lob ihn kurz (aber nicht zu viel).
    5. Beende mit einem Spruch zur Disziplin beim nächsten Training.
    6. Max. 120 Wörter. Keine Listen, fließender Text.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 },
        temperature: 0.8
      }
    });

    return response.text || "Der Kassenwart hat gerade Sendepause (wahrscheinlich zählt er Kleingeld).";
  } catch (error) {
    console.error("AI Error:", error);
    throw error;
  }
};
