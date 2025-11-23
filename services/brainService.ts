export interface Memory {
  content: string;
  metadata: {
    title: string;
    url: string;
    time: string;
  };
  score?: number;
}

export interface BrainResponse {
  memories: Memory[];
}

// Default to localhost, but allow override via environment variable or config
// Default to the deployed Hugging Face Space, but allow override via environment variable
const API_URL = import.meta.env.VITE_API_URL || "https://sa-d-bo-sentinel-brain.hf.space";

export const brainService = {
  async recall(query: string): Promise<Memory[]> {
    try {
      const response = await fetch(`${API_URL}/recall`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: query }),
      });

      if (!response.ok) {
        throw new Error('Failed to recall memories');
      }

      const data: BrainResponse = await response.json();
      return data.memories;
    } catch (error) {
      console.error("Brain Service Error:", error);
      return [];
    }
  },

  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${API_URL}/`);
      return response.ok;
    } catch (error) {
      return false;
    }
  },

  async fetchAll(): Promise<Memory[]> {
    try {
      const response = await fetch(`${API_URL}/memories`);
      if (!response.ok) return [];
      const data = await response.json();
      return data.memories;
    } catch (error) {
      console.error("Failed to fetch all memories:", error);
      return [];
    }
  },

  async deleteMemories(ids: string[], deleteAll: boolean = false): Promise<boolean> {
    try {
      const response = await fetch(`${API_URL}/memories`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids, delete_all: deleteAll }),
      });
      return response.ok;
    } catch (error) {
      console.error("Failed to delete memories:", error);
      return false;
    }
  }
};