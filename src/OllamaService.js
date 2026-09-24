export const DEFAULT_OLLAMA_URL = 'http://localhost:11434';
export const DEFAULT_MODEL = 'qwen3:1.7b';

export class OllamaService {
  constructor(baseUrl = DEFAULT_OLLAMA_URL) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  async checkConnection() {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      return response.ok;
    } catch (error) {
      console.error("Connection check failed:", error);
      return false;
    }
  }

  async getModels() {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) throw new Error('Failed to fetch models');
      const data = await response.json();
      return data.models || [];
    } catch (error) {
      console.error("Failed to fetch models:", error);
      return [];
    }
  }

  async generateSuggestion(model, prompt, systemPrompt = "You are an expert copy editor. Fix grammar and improve style.") {
    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model,
          prompt: prompt,
          system: systemPrompt,
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.response;
    } catch (error) {
      console.error("Generation failed:", error);
      throw error;
    }
  }
}
