import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatOllama } from "@langchain/community/chat_models/ollama";
import { brainLogger, LogCategory } from '../../utils/logging';

/**
 * Creates and configures a LangChain LLM client based on environment variables.
 * This factory function allows the application to dynamically switch between
 * different LLM providers like Google Gemini and local Ollama instances.
 *
 * @param {object} [options={}] - Optional configuration to override environment variables.
 * @param {string} [options.provider] - The LLM provider to use (e.g., 'gemini', 'ollama').
 * @param {string} [options.modelName] - The specific model name to use.
 * @param {string} [options.apiKey] - The API key for the provider.
 * @param {string} [options.baseURL] - A custom base URL for the API (especially for Ollama).
 * @returns {ChatGoogleGenerativeAI | ChatOllama} An instance of a LangChain chat model.
 */
export const createLLMClient = (options = {}) => {
  const provider = options.provider || process.env.LLM_PROVIDER || 'gemini';
  const modelName = options.modelName || process.env.LLM_MODEL;
  const apiKey = options.apiKey || process.env.GOOGLE_API_KEY; // Assuming GOOGLE_API_KEY for Gemini
  const baseURL = options.baseURL || process.env.LLM_API_BASE_URL;

  if (process.env.NODE_ENV === 'development') {
    brainLogger.debug(LogCategory.BRAIN, `Creating LLM client for provider: ${provider}`, {
      modelName,
      provider,
    });
  }

  switch (provider.toLowerCase()) {
    case 'gemini':
      if (!apiKey) {
        throw new Error("GOOGLE_API_KEY environment variable is not set for Gemini provider.");
      }
      return new ChatGoogleGenerativeAI({
        apiKey,
        modelName,
        temperature: 0.7, // A sensible default
      });

    case 'ollama':
      return new ChatOllama({
        baseUrl: baseURL || "http://localhost:11434", // Default for Ollama
        model: modelName,
        temperature: 0.7,
      });

    // Future providers can be added here, e.g., 'openai', 'anthropic'

    default:
      throw new Error(`Unsupported LLM provider: ${provider}. Please check the LLM_PROVIDER environment variable.`);
  }
};
