import { GoogleGenAI, Type } from "@google/genai";

// We extract basic text from the PDF first, then send to Gemini for metadata
export const analyzeDocumentContent = async (textSample: string): Promise<{ title: string; summary: string; tags: string[] }> => {
  if (!process.env.API_KEY) {
    return {
      title: "Untitled Document",
      summary: "No API Key provided for analysis.",
      tags: ["Pending"]
    };
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analyze the following text extracted from the first page of a document. 
      Generate a concise title, a one-sentence summary, and 3 relevant tags.
      
      Text:
      ${textSample.substring(0, 2000)}`, // Limit context window usage
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            summary: { type: Type.STRING },
            tags: { 
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["title", "summary", "tags"]
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    return {
      title: result.title || "Untitled Document",
      summary: result.summary || "No description available.",
      tags: result.tags || ["Document"]
    };

  } catch (error) {
    console.error("Gemini analysis failed:", error);
    return {
      title: "Scanned Document",
      summary: "Automatic analysis failed.",
      tags: ["Uncategorized"]
    };
  }
};