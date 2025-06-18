import { GoogleGenerativeAI } from '@google/generative-ai';
import { safetySettings } from '../constants/safetySettings';

export const generateChatTitle = async (apiKey, modelName, firstUserText) => {
  if (!apiKey) return null;
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const prompt = `Generate a short chat title summarizing: "${firstUserText}". Respond only in JSON with a "title" field.`;
    // Using a lightweight model for title generation
    const model = genAI.getGenerativeModel({ model:modelName , safetySettings });
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const match = responseText.match(/\{[^]*\}/);
    if (match) {
      const obj = JSON.parse(match[0]);
      if (obj.title) {
        return obj.title.trim().slice(0, 30);
      }
    }
  } catch (error) {
    console.error("Error generating title:", error);
    // Silently fail or handle error as needed
  }
  return null;
};

export const shouldPerformSearch = async (apiKey, modelName, query) => {
  console.log("Checking if search is needed for query:", query);
  if (!apiKey) return { web_search: false, query: '' };
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const prompt = `You are a triage agent. Analyze the following query and decide if it requires real-time information from the web to answer accurately. For example, queries about recent events, news, stock prices, or current affairs need a web search. Queries about general knowledge, creative writing, or personal history do not.

    Query: "${query}"
    
    Respond ONLY with a JSON object with two keys: "web_search" (boolean) and "query" (a search-engine-optimized string if web_search is true, otherwise an empty string).`;

    const model = genAI.getGenerativeModel({ model: modelName, safetySettings });
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    console.log("Triage response:", responseText);
    const match = responseText.match(/\{[^]*\}/);

    if (match) {

      return JSON.parse(match[0]);
    }
  } catch (error) {
    console.error("Error in search triage:", error);
  }
  return { web_search: false, query: '' };
};

export const performWebSearch = async (query) => {
  // This is a dummy function. In a real app, you would use a search API.
  console.log(`Simulating web search for: "${query}"`);
  await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate network delay
  return `
    - Result 1: The latest AI models show significant advancements in reasoning and tool use.
    - Result 2: Tech analysts predict major breakthroughs in AI-driven automation for 2024.
    - Result 3: A recent study highlights the performance of 'gemma-3-27b-it' on complex problem-solving tasks.
  `;
};

export const sendMessageToAI = async (apiKey, modelName, historyMessages, newMessageText) => {
  if (!apiKey) {
    throw new Error("API Key Missing. Please set your API Key in Settings.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName, safetySettings });

  const chatHistory = historyMessages
    .filter(m => !m.error) // Exclude previous error messages from history
    .map(m => ({
      role: m.role,
      parts: [{ text: m.text }],
    }));

  const chat = model.startChat({ history: chatHistory });
  const result = await chat.sendMessage(newMessageText);
  const responseText = await result.response.text();
  return responseText;
};