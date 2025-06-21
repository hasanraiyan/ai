// src/services/aiService.js

import { GoogleGenerativeAI } from '@google/generative-ai';
import { safetySettings } from '../constants/safetySettings';
import { toolDispatcher } from './tools';
import { extractJson } from '../utils/extractJson';
import { IS_DEBUG } from '../constants';

// --- MODIFICATION START: Update function signature to be an object for scalability ---
export const sendMessageToAI = async ({
  apiKey,
  modelName,
  historyMessages,
  newMessageText,
  isAgentMode,
  onToolCall,
  tavilyApiKey, // <-- new parameter
}) => {
// --- MODIFICATION END ---
  if (!apiKey) {
    throw new Error("API Key Missing. Please set your Google AI API Key in Settings.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName, safetySettings });

  { IS_DEBUG && console.log("Using model:", modelName); }


  { IS_DEBUG && console.log("History Messages:", historyMessages); }
  const chatHistory = historyMessages
    .filter(m => !m.error && m.role !== 'tool-result' && m.role !== 'agent-thinking')
    .map(m => ({
      role: m.role,
      parts: [{ text: m.text }],
    }));
  { IS_DEBUG && console.log("Chat History:", JSON.stringify(chatHistory)); }

  const chat = model.startChat({ history: chatHistory });

  { IS_DEBUG && console.log("New Message Text:", newMessageText); }
  const result = await chat.sendMessage(newMessageText);
  let responseText = await result.response.text();
  { IS_DEBUG && console.log("AI Response Text:", responseText); }
  if (isAgentMode) {
    const toolCall = extractJson(responseText);
    if (toolCall && toolCall['tools-required']) {
      if (onToolCall) {
        onToolCall(toolCall);
      }

      // --- MODIFICATION START: Pass tavilyApiKey to dispatcher ---
      const toolResults = await toolDispatcher({
        toolCall,
        tavilyApiKey,
      });
      // --- MODIFICATION END ---

      const toolResultText = `Context from tool calls:\n${JSON.stringify(toolResults, null, 2)}`;
      
      const finalResult = await chat.sendMessage(toolResultText);
      responseText = await finalResult.response.text();
    }
  }

  return responseText;
};