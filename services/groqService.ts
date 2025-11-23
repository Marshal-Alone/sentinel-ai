import { MemoryItem, SentinelMode, ChatMessage } from "../types";

// Use environment variable for API key
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || "";

// Debug logging (remove after fixing)
console.log("Groq API Key loaded:", GROQ_API_KEY ? `${GROQ_API_KEY.substring(0, 10)}...` : "NOT FOUND");
const MODEL_NAME = "llama-3.3-70b-versatile";

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
 * Generates a response from Groq.
 */
export const generateSentinelResponse = async (
    currentMessage: string,
    history: ChatMessage[],
    mode: SentinelMode,
    memories: MemoryItem[]
): Promise<string> => {
    try {
        const systemInstruction = getSystemInstruction(mode, memories);

        // Build messages array for Groq
        const messages = [
            {
                role: "system",
                content: systemInstruction
            },
            // Add conversation history
            ...history.map(msg => ({
                role: msg.role === 'user' ? 'user' : 'assistant',
                content: msg.text
            })),
            // Add current message
            {
                role: "user",
                content: currentMessage
            }
        ];

        const response = await fetch(
            "https://api.groq.com/openai/v1/chat/completions",
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${GROQ_API_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model: MODEL_NAME,
                    messages: messages,
                    temperature: 0.7,
                    max_tokens: 2048
                }),
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error?.message || "API request failed");
        }

        const text = data.choices?.[0]?.message?.content;

        if (!text) {
            return "I processed that, but couldn't generate a text response.";
        }

        return text;

    } catch (error: any) {
        console.error("Groq API Error:", error);
        return `Error: ${error.message || "Something went wrong with the Sentinel connection."}`;
    }
};
