// src/services/aiAgents.js

import { GoogleGenerativeAI } from '@google/generative-ai';
import { safetySettings } from '../constants/safetySettings';
import { extractJson } from '../utils/extractJson'; // Use the single source of truth
import { brainLogger } from '../utils/logging';
import { LogCategory } from '../utils/logging';

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

  // Use the static method to call the centralized utility
  static extractJson(text) {
    return extractJson(text);
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
        // Use the imported utility function here
        const parsed = extractJson(responseText);
        return parsed ?? { raw: responseText };
      }

      return responseText;
    } catch (error) {
      brainLogger.error(LogCategory.BRAIN, "AIAgent prompt execution failed", {
        error: error.message
      });
      return null;
    }
  }
}