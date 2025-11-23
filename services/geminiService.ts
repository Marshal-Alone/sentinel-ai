import { GoogleGenAI, Chat, Content } from "@google/genai";
import { MemoryItem, SentinelMode, ChatMessage } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const MODEL_NAME = "gemini-2.5-flash";

/**
 * Constructs the system instruction based on the active mode and available memories.
 */
const getSystemInstruction = (mode: SentinelMode, memories: MemoryItem[]): string => {
  const baseInstruction = `You are Sentinel AI, a highly advanced, context-aware assistant. 
  Your goal is to assist the user by recalling information from the data they have provided.`;

  if (mode === 'STUDY') {
    return `${baseInstruction}
    CURRENT MODE: STUDY SENTINEL.
    You have access to the user's study materials (PDFs, notes, lectures).
    Your role:
    1. Answer questions based strictly on the provided context if available.
    2. Explain complex topics found in the documents.
    3. Help solve Previous Year Questions (PYQs) if present.
    4. Be academic, precise, and encouraging.
    
    If the answer is not in the context, use your general knowledge but mention that it wasn't found in the specific documents.`;
  } else {
    // LIFE SENTINEL
    // Ingest logs including URLs
    // Note: If using Python Backend, 'memories' will contain the vector search results specifically relevant to the query.
    
    const activityLog = memories
      .filter(m => m.type !== 'PDF') 
      .map(m => `MATCHING MEMORY FOUND:
      - Date: ${new Date(m.timestamp).toLocaleDateString()}
      - Title: ${m.title}
      - Platform: ${m.metadata?.platform || 'Web/Unknown'}
      - URL: ${m.metadata?.url || 'N/A'}
      - Content Snippet: ${m.metadata?.description || m.content}`)
      .join('\n\n');

    return `${baseInstruction}
    CURRENT MODE: LIFE SENTINEL.
    You track the user's digital footprint (videos, reels, anime, browsing history) to help them recall things later.
    
    RELEVANT MEMORIES FROM DATABASE:
    ${activityLog ? activityLog : "No specific history matches found for this query."}

    Your role:
    1. Answer questions like "Where did I see...?" or "What was that anime scene?".
    2. STRICTLY USE THE MEMORIES provided above to find matches.
    3. If the user asks about a specific scene (e.g., "guy holding a sword saying ya de gozaru"), look at the Content Snippets for transcript matches.
    4. WHEN PROVIDING AN ANSWER, ALWAYS PROVIDE THE LINK in Markdown format: [Title](URL).
    5. If the user asks "Where did I watch...", respond with "You watched [Title](URL) on [Date]. The transcript mentions: [Quote]."
    6. Be casual, helpful, and observant.`;
  }
};

/**
 * Prepares the history for the Gemini Chat object.
 */
const prepareHistory = (messages: ChatMessage[]): Content[] => {
  return messages.map(msg => ({
    role: msg.role,
    parts: [{ text: msg.text }]
  }));
};

/**
 * Generates a response from Gemini.
 * It intelligently attaches PDF context if in Study mode and files are present.
 */
export const generateSentinelResponse = async (
  currentMessage: string,
  history: ChatMessage[],
  mode: SentinelMode,
  memories: MemoryItem[]
): Promise<string> => {
  try {
    const systemInstruction = getSystemInstruction(mode, memories);
    
    // Create new chat session to inject fresh system instructions with latest memories
    const chat = ai.chats.create({
      model: MODEL_NAME,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      },
      history: prepareHistory(history),
    });

    let contentParts: any[] = [{ text: currentMessage }];

    if (mode === 'STUDY') {
      const pdfMemories = memories.filter(m => m.type === 'PDF');
      // Limit PDFs to context window size - usually last 5 is safe for Flash model
      const recentPDFs = pdfMemories.slice(0, 5);
      
      recentPDFs.forEach(pdf => {
        contentParts.push({
          inlineData: {
            mimeType: 'application/pdf',
            data: pdf.content 
          }
        });
      });
    }

    // Call sendMessage
    const result = await chat.sendMessage({ 
      message: contentParts.length === 1 ? currentMessage : contentParts 
    });
    
    return result.text || "I processed that, but couldn't generate a text response.";

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return `Error: ${error.message || "Something went wrong with the Sentinel connection."}`;
  }
};