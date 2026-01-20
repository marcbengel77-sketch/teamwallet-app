
export enum UserRole {
  MEMBER = 'member',
  VICE_ADMIN = 'vice-admin',
  ADMIN = 'admin',
}

export const APP_NAME = "TeamWallet";

export const GENKIT_API_URL = "http://localhost:3400/generateWeeklyReport"; // Placeholder for your Genkit flow endpoint

export const PREMIUM_FEATURES = {
  GENKIT_REPORT: {
    name: "AI Wochenbericht",
    description: "Generiert einen humorvollen Wochenbericht über die Finanzaktivitäten deines Teams.",
    isPremium: true,
  }
}
