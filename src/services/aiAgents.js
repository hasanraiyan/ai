import { GoogleGenerativeAI } from '@google/generative-ai';
import { safetySettings } from '../constants/safetySettings';

export class AIAgent {
  constructor(apiKey, modelName = 'gemma-3-27b-it') {
    if (!apiKey) throw new Error('API Key is required');
    this.apiKey = apiKey;
    this.modelName = modelName;
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: this.modelName,
      safetySettings,
    });
  }

  static extractJson(text) {
    const match = text.match(/```json\n([\s\S]*?)\n```|({[\s\S]*})/);
    if (!match) return null;
    const jsonString = match[1] || match[2];
    try {
      return JSON.parse(jsonString);
    } catch (err) {
      console.error("Failed to parse JSON:", err);
      return null;
    }
  }

  async runPrompt({
    prompt,
    systemInstruction = '',
    expectJson = false,
  }) {
    if (!prompt) throw new Error("Prompt is required");

    const chat = this.model.startChat({
      history: systemInstruction
        ? [{ role: "user", parts: [{ text: systemInstruction }] }]
        : [],
    });

    try {
      const result = await chat.sendMessage(prompt);
      const responseText = await result.response.text();

      if (expectJson) {
        const parsed = AIAgent.extractJson(responseText);
        return parsed ?? { raw: responseText };
      }

      return responseText;
    } catch (error) {
      console.error("AIAgent prompt execution failed:", error);
      return null;
    }
  }
}
