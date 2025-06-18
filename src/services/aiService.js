import { GoogleGenerativeAI } from '@google/generative-ai';
import { safetySettings } from '../constants/safetySettings';

export const generateChatTitle = async (apiKey, firstUserText) => {
  if (!apiKey) return null;
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const prompt = `Generate a short chat title summarizing: "${firstUserText}". Respond only in JSON with a "title" field.`;
    // Using a lightweight model for title generation
    const model = genAI.getGenerativeModel({ model: 'gemma-3-1b-it', safetySettings });    
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