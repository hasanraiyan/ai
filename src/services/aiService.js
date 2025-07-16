// src/services/aiService.js

import { GoogleGenerativeAI } from '@google/generative-ai';
import { safetySettings } from '../constants/safetySettings';
import { toolDispatcher } from './tools';
import { extractJson } from '../utils/extractJson';
import { IS_DEBUG, FEATURE_FLAGS } from '../constants';
import { executeAgentRequest } from './agentExecutor';

/**
 * Legacy AI service implementation (original single-shot approach)
 * Used when FEATURE_FLAGS.USE_NEW_AGENT_SYSTEM is false
 */
const sendMessageToAI_Legacy = async ({
  apiKey,
  modelName,
  historyMessages,
  newMessageText,
  isAgentMode,
  onToolCall,
  tavilyApiKey,
  financeContext,
  allowedTools = [],
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

      const toolResults = await toolDispatcher({
        toolCall,
        context: {
          tavilyApiKey,
          ...financeContext,
          allowedTools,
        },
      });

      const toolResultText = `Tool results:\n${JSON.stringify(toolResults, null, 2)}`;
      if (IS_DEBUG) console.log("Sending Tool Results to AI:", toolResultText);

      const finalResult = await chat.sendMessage(toolResultText);
      responseText = await finalResult.response.text();
      if (IS_DEBUG) console.log("Final AI Response Text:", responseText);
    }
  }

  return responseText;
};

/**
 * New Brain-Hands agent system implementation
 * Used when FEATURE_FLAGS.USE_NEW_AGENT_SYSTEM is true
 */
const sendMessageToAI_NewSystem = async ({
  apiKey,
  modelName,
  historyMessages,
  newMessageText,
  isAgentMode,
  onToolCall,
  tavilyApiKey,
  financeContext,
  allowedTools = [],
}) => {
  if (FEATURE_FLAGS.DEBUG_AGENT_COMPATIBILITY) {
    console.log('AI Service: Using new Brain-Hands agent system');
  }

  // Convert legacy message format to new conversation history format
  const conversationHistory = historyMessages
    .filter(m => !m.error && m.role !== 'tool-result' && m.role !== 'agent-thinking')
    .map(m => ({
      role: m.role === 'model' ? 'ai' : m.role, // Convert 'model' to 'ai' for new system
      content: m.text,
      timestamp: m.ts || Date.now(),
      metadata: {
        characterId: m.characterId,
        originalFormat: 'legacy'
      }
    }));

  // Create context for new agent system
  const agentContext = {
    apiKey,
    modelName,
    tavilyApiKey,
    allowedTools,
    // Map finance context functions
    ...(financeContext || {}),
  };

  // Execute agent request using new system
  const result = await executeAgentRequest({
    userInput: newMessageText,
    conversationHistory,
    context: agentContext,
    maxIterations: 5
  });

  if (!result.success) {
    throw new Error(result.response || 'Agent execution failed');
  }

  // Handle tool call notifications for UI compatibility
  if (isAgentMode && onToolCall && result.conversationHistory) {
    // Extract tool calls from conversation history for UI notification
    const toolCalls = result.conversationHistory
      .filter(entry => entry.role === 'ai' && entry.content && typeof entry.content === 'object')
      .map(entry => entry.content);

    if (toolCalls.length > 0) {
      // Simulate the legacy tool call format for UI compatibility
      const legacyToolCall = {
        'tools-required': toolCalls.map(call => ({
          tool_name: call.tool_name,
          parameters: call.parameters
        }))
      };
      onToolCall(legacyToolCall);
    }
  }

  return result.response;
};

/**
 * Parameter mapping and validation for compatibility
 */
const validateAndMapParameters = (params) => {
  const {
    apiKey,
    modelName,
    historyMessages = [],
    newMessageText,
    isAgentMode = false,
    onToolCall,
    tavilyApiKey,
    financeContext,
    allowedTools = []
  } = params;

  // Validate required parameters
  if (!apiKey || typeof apiKey !== 'string') {
    throw new Error('API Key is required and must be a string');
  }

  if (!modelName || typeof modelName !== 'string') {
    throw new Error('Model name is required and must be a string');
  }

  if (!newMessageText || typeof newMessageText !== 'string') {
    throw new Error('New message text is required and must be a string');
  }

  if (!Array.isArray(historyMessages)) {
    throw new Error('History messages must be an array');
  }

  if (!Array.isArray(allowedTools)) {
    throw new Error('Allowed tools must be an array');
  }

  // Return validated and normalized parameters
  return {
    apiKey: apiKey.trim(),
    modelName: modelName.trim(),
    historyMessages,
    newMessageText: newMessageText.trim(),
    isAgentMode: Boolean(isAgentMode),
    onToolCall,
    tavilyApiKey,
    financeContext: financeContext || {},
    allowedTools
  };
};

/**
 * Main AI service function - Compatibility wrapper that maintains existing interface
 * while providing the ability to switch between old and new agent systems
 */
export const sendMessageToAI = async (params) => {
  try {
    // Validate and normalize parameters
    const validatedParams = validateAndMapParameters(params);

    if (FEATURE_FLAGS.DEBUG_AGENT_COMPATIBILITY) {
      console.log('AI Service: Processing request with parameters:', {
        modelName: validatedParams.modelName,
        isAgentMode: validatedParams.isAgentMode,
        useNewSystem: FEATURE_FLAGS.USE_NEW_AGENT_SYSTEM,
        historyLength: validatedParams.historyMessages.length,
        allowedToolsCount: validatedParams.allowedTools.length
      });
    }

    // Route to appropriate implementation based on feature flag
    if (FEATURE_FLAGS.USE_NEW_AGENT_SYSTEM && validatedParams.isAgentMode) {
      try {
        return await sendMessageToAI_NewSystem(validatedParams);
      } catch (error) {
        console.error('AI Service: New system failed:', error);
        
        // Fallback to legacy system if enabled
        if (FEATURE_FLAGS.FALLBACK_ON_ERROR) {
          if (FEATURE_FLAGS.DEBUG_AGENT_COMPATIBILITY) {
            console.log('AI Service: Falling back to legacy system due to error');
          }
          return await sendMessageToAI_Legacy(validatedParams);
        } else {
          throw error;
        }
      }
    } else {
      // Use legacy system
      if (FEATURE_FLAGS.DEBUG_AGENT_COMPATIBILITY && validatedParams.isAgentMode) {
        console.log('AI Service: Using legacy system (new system disabled or non-agent mode)');
      }
      return await sendMessageToAI_Legacy(validatedParams);
    }

  } catch (error) {
    console.error('AI Service: Request failed:', error);
    throw error;
  }
};