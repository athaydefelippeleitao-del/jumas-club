import { GoogleGenAI, Type } from "@google/genai";

export interface ExtractedSong {
  title: string;
  category: string;
  number: number;
  content: string;
}

let aiInstance: any = null;

const getAiInstance = () => {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Chave da API Gemini não encontrada. Certifique-se de que a variável GEMINI_API_KEY está configurada.');
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
};

export const extractSongsFromText = async (text: string): Promise<ExtractedSong[]> => {
  try {
    const ai = getAiInstance();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `
        Analise o seguinte texto extraído de um cancioneiro e extraia todas as músicas.
        Para cada música, identifique:
        1. Título (em letras maiúsculas)
        2. Categoria (ex: Entrada, Perdão, Glória, Aclamação, Ofertório, Santo, Paz, Cordeiro, Comunhão, Maria, Schoenstatt, etc.)
        3. Número da música (se houver)
        4. Conteúdo (letra com acordes/cifras se presentes)

        Retorne um array JSON de objetos com as propriedades: title, category, number, content.
        
        Texto do cancioneiro:
        ${text.substring(0, 30000)} // Limiting to avoid token overflow
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              category: { type: Type.STRING },
              number: { type: Type.NUMBER },
              content: { type: Type.STRING },
            },
            required: ["title", "category", "number", "content"],
          },
        },
      },
    });

    const result = JSON.parse(response.text || "[]");
    return result;
  } catch (error) {
    console.error('Error extracting songs with Gemini:', error);
    throw new Error('Falha ao processar as músicas com IA. Tente um PDF com menos páginas ou texto mais claro.');
  }
};
