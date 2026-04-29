/**
 * Supermemory API Client
 * Used for Agentic State Re-hydration and Context Engineering
 */

export class SupermemoryClient {
  constructor(apiKey) {
    this.apiKey = apiKey || process.env.SUPERMEMORY_API_KEY || process.env.DATAFAST_API_KEY;
    this.baseUrl = 'https://api.supermemory.ai/v1';
  }

  async addMemory(userId, content, metadata = {}) {
    if (!this.apiKey) return null;
    
    try {
      const response = await fetch(`${this.baseUrl}/memory`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: content,
          metadata: { userId, ...metadata }
        })
      });
      
      if (!response.ok) throw new Error(`Supermemory API error: ${response.statusText}`);
      return await response.json();
    } catch (e) {
      console.error('[Supermemory] Failed to add memory:', e);
      return null;
    }
  }

  async getMemories(userId, query, limit = 5) {
    if (!this.apiKey) return [];
    
    try {
      const response = await fetch(`${this.baseUrl}/memory/search`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query,
          filter: { userId },
          topK: limit
        })
      });
      
      if (!response.ok) throw new Error(`Supermemory API error: ${response.statusText}`);
      const data = await response.json();
      return data.results || [];
    } catch (e) {
      console.error('[Supermemory] Failed to fetch memories:', e);
      return [];
    }
  }
}

export const supermemory = new SupermemoryClient();
