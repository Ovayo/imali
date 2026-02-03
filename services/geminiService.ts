
import { GoogleGenAI } from "@google/genai";
import { Loan } from "../types";

export const getCreditRiskInsights = async (loans: Loan[]) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = 'gemini-3-pro-preview';
  
  const loanContext = loans.map(l => ({
    name: l.borrowerName,
    amount: l.amountLoaned,
    status: l.status,
    daysOverdue: l.status === 'Overdue' ? 'Active' : 'N/A'
  }));

  const prompt = `
    Analyze this list of micro-loans for a lender in Eastern Cape, South Africa. 
    Identify:
    1. Overall risk patterns.
    2. Recommendations for improving repayment rates.
    3. Cultural tips for better customer engagement (Ubuntu-focused).
    
    Data: ${JSON.stringify(loanContext)}
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction: "You are a specialized Fintech consultant for the South African micro-lending market. Focus on the Eastern Cape region. Speak with a professional yet culturally aware tone, using Xhosa terms appropriately.",
      }
    });
    return response.text;
  } catch (error) {
    console.error("AI Insight Error:", error);
    return "Molo! Unable to fetch AI insights at the moment.";
  }
};
