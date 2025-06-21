// src/services/aiService.js

import { GoogleGenerativeAI } from '@google/generative-ai';
import { safetySettings } from '../constants/safetySettings';
import { toolDispatcher } from './tools';
import { extractJson } from '../utils/extractJson';
import { IS_DEBUG } from '../constants';
export const sendMessageToAI = async (apiKey, modelName, historyMessages, newMessageText, isAgentMode, onToolCall) => {
  if (!apiKey) {
    throw new Error("API Key Missing. Please set your API Key in Settings.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName, safetySettings });

  { IS_DEBUG && console.log("Using model:", modelName); }


  { IS_DEBUG && console.log("History Messages:", historyMessages); }
  // The chat history needs to potentially include the system prompt,
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
      // It's a tool call, execute it

      // Callback to display agent's intended action in the UI
      if (onToolCall) {
        onToolCall(toolCall);
      }

      // Execute the tool call(s)
      const toolResults = await toolDispatcher(toolCall);

      // Format the results back to the AI
      const toolResultText = `Context from tool calls:\n${JSON.stringify(toolResults, null, 2)}`;

      // Send the tool result back to the AI for a final response
      const finalResult = await chat.sendMessage(toolResultText);
      responseText = await finalResult.response.text();
    }
  }

  return responseText;
};
