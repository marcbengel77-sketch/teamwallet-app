
import { GENKIT_API_URL } from '../constants';
import { Fine, Payout } from '../types';

interface GenerateWeeklyReportPayload {
  teamName: string;
  fines: Fine[];
  payouts: Payout[];
}

export const generateWeeklyReport = async (payload: GenerateWeeklyReportPayload): Promise<string> => {
  try {
    const response = await fetch(GENKIT_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to generate weekly report');
    }

    const data = await response.json();
    return data.report;
  } catch (error) {
    console.error('Error generating weekly report:', error);
    throw error;
  }
};
