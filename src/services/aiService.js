// src/services/aiService.js

import { GoogleGenerativeAI } from '@google/generative-ai';
import { safetySettings } from '../constants/safetySettings';
import { toolDispatcher } from './tools';
import { extractJson } from '../utils/extractJson';
import { IS_DEBUG } from '../constants';

// --- MODIFIED: The context object now holds all "extra" functions ---
export const sendMessageToAI = async ({
  apiKey,
  modelName,
  historyMessages,
  newMessageText,
  isAgentMode,
  onToolCall,
  tavilyApiKey,
  financeContext, // <-- NEW: Pass an object with finance functions
}) => {
  if (!apiKey) {
    throw new Error("API Key Missing. Please set your Google AI API Key in Settings.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName, safetySettings });

  if (IS_DEBUG) console.log("Using model:", modelName);

  const chatHistory = historyMessages
    .filter(m => !m.error && m.role !== 'tool-result' && m.role !== 'agent-thinking')
    .map(m => ({
      role: m.role,
      parts: [{ text: m.text }],
    }));

  if (IS_DEBUG) console.log("Chat History:", JSON.stringify(chatHistory, null, 2));

  const chat = model.startChat({ history: chatHistory });

  if (IS_DEBUG) console.log("New Message Text:", newMessageText);
  const result = await chat.sendMessage(newMessageText);
  let responseText = await result.response.text();
  if (IS_DEBUG) console.log("Initial AI Response Text:", responseText);

  if (isAgentMode) {
    const toolCall = extractJson(responseText);
    if (toolCall && toolCall['tools-required']) {
      if (onToolCall) {
        onToolCall(toolCall);
      }

      // --- MODIFIED: Pass context to dispatcher ---
      const toolResults = await toolDispatcher({
        toolCall,
        context: {
          tavilyApiKey,
          ...financeContext // Spread the finance functions (addTransaction, etc.)
        },
      });

      // For reports, we want the AI to see the full report. For other tools, just the message.
      const toolResultMessages = Object.entries(toolResults).map(([toolName, result]) => {
          let resultData = result.message;
          if (toolName === 'get_financial_report' && result.success) {
            resultData = result.data.report;
          }
          return `Tool: ${toolName}\nResult: ${resultData}`;
      }).join('\n\n');

      const toolResultText = `Context from tool calls:\n${toolResultMessages}`;
      if (IS_DEBUG) console.log("Sending Tool Results to AI:", toolResultText);

      const finalResult = await chat.sendMessage(toolResultText);
      responseText = await finalResult.response.text();
      if (IS_DEBUG) console.log("Final AI Response Text:", responseText);
    }
  }

  return responseText;
};