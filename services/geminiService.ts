
import { GoogleGenAI, Type } from "@google/genai";
import { Subject } from "../types";

export const getStudyAdvice = async (subjects: Subject[]) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const subjectsData = subjects.map(s => 
    `${s.name}: ${s.totalHours}h totais, divididas em ${s.frequency}x (${(s.totalHours/s.frequency).toFixed(1)}h/sessão), Domínio ${s.masteryPercentage}%`
  ).join('\n');

  const prompt = `Analise o seguinte ciclo de estudos e forneça 3 dicas práticas para melhorar a eficiência baseando-se no domínio de cada matéria e carga horária:\n${subjectsData}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: "Você é um mentor especialista em concursos e alta performance nos estudos. Seja conciso e motivador.",
      }
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Não foi possível carregar as dicas da IA no momento.";
  }
};
