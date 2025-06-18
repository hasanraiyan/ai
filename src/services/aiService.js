import { GoogleGenerativeAI } from '@google/generative-ai';
import { safetySettings } from '../constants/safetySettings';
import { toolDispatcher } from './tools';


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

const extractJson = (text) => {
  const match = text.match(/```json\n([\s\S]*?)\n```|({[\s\S]*})/);
  if (!match) return null;
  const jsonString = match[1] || match[2];
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    console.error("Failed to parse JSON:", e);
    return null;
  }
};

export const sendMessageToAI = async (apiKey, modelName, historyMessages, newMessageText, isAgentMode, onToolResult) => {
  if (!apiKey) {
    throw new Error("API Key Missing. Please set your API Key in Settings.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName, safetySettings });

  const chatHistory = historyMessages
    .filter(m => !m.error && m.role !== 'tool-result') // Exclude errors and previous tool results from history
    .map(m => ({
      role: m.role,
      parts: [{ text: m.text }],
    }));

  const chat = model.startChat({ history: chatHistory });
  const result = await chat.sendMessage(newMessageText);
  let responseText = await result.response.text();

  if (isAgentMode) {
    const toolCall = extractJson(responseText);
    if (toolCall && toolCall['tools-required']) {
      // It's a tool call, execute it
      const toolResults = await toolDispatcher(toolCall);
      const toolResultText = `Context from tool calls:\n${JSON.stringify(toolResults, null, 2)}`;
      
      // Callback to display intermediate tool results in the UI
      if (onToolResult) {
        onToolResult(toolResultText);
      }
      
      // Add the tool result to the history and send it back to the AI for a final response
      const finalResult = await chat.sendMessage(toolResultText);
      responseText = await finalResult.response.text();
    }
  }

  return responseText;
};