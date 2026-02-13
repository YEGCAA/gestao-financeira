
import { GoogleGenAI } from "@google/genai";
import { Transaction, Investment, Bill } from "../types";

export const analyzeFinancials = async (
  transactions: Transaction[],
  investments: Investment[],
  bills: Bill[]
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const totalIncome = transactions.filter(t => t.type === 'INCOME').reduce((acc, t) => acc + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + t.amount, 0);
  const pendingBills = bills.filter(b => b.status === 'PENDING').length;
  const investmentTotal = investments.reduce((acc, i) => acc + i.currentValue, 0);

  const prompt = `
    Como um consultor financeiro sênior para a empresa Even Digital, analise os seguintes dados financeiros e forneça insights rápidos (em português):
    - Receitas Totais: R$ ${totalIncome.toLocaleString('pt-BR')}
    - Despesas Totais: R$ ${totalExpense.toLocaleString('pt-BR')}
    - Saldo: R$ ${(totalIncome - totalExpense).toLocaleString('pt-BR')}
    - Investimentos: R$ ${investmentTotal.toLocaleString('pt-BR')}
    - Contas Pendentes: ${pendingBills} lançamentos.

    Por favor, dê 3 dicas práticas baseadas nesses números para melhorar a saúde financeira da empresa. Seja conciso e profissional.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "Análise indisponível no momento.";
  } catch (error) {
    console.error("AI Analysis Error:", error);
    throw error;
  }
};
