
import { GoogleGenAI, Type } from "@google/genai";
import { Loan, ChatMessage } from "../types";

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

export const getChatResponse = async (history: ChatMessage[], message: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = 'gemini-3-pro-preview';

  try {
    // Format history for Gemini API
    const contents = history.map(m => ({
      role: m.role,
      parts: [{ text: m.text }]
    }));
    
    // Add the current message
    contents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    const response = await ai.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction: "You are Imali, an AI assistant for a micro-lending app in South Africa. You help users understand loan terms, interest rates, and app features. You are professional, friendly, and culturally aware of the Eastern Cape context. You can speak both English and isiXhosa. Keep responses helpful and concise.",
      }
    });

    return response.text || "I'm sorry, I couldn't process that.";
  } catch (error) {
    console.error("Chat Error:", error);
    return "Molo! I'm having trouble connecting right now. Please try again soon.";
  }
};
