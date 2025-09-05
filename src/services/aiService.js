// src/services/aiService.js

import { AgentExecutor, createToolCallingAgent } from "langchain/agents";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { BaseCallbackHandler } from "@langchain/core/callbacks/base";
import { createLLMClient } from '../lib/llm/llmAdapter.js';
import { getLangChainTools } from '../lib/llm/langchainTools.js';
import { brainLogger, LogCategory } from '../utils/logging.js';

/**
 * A custom callback handler to bridge LangChain's tool events with the app's UI.
 * This handler calls the `onToolCall` function passed from the UI, allowing the
 * app to display feedback when the agent decides to use a tool.
 */
class CustomToolCallbackHandler extends BaseCallbackHandler {
  name = "CustomToolCallbackHandler";

  constructor(onToolCallCallback) {
    super();
    this.onToolCallCallback = onToolCallCallback;
  }

  /**
   * Called when a tool is about to start executing.
   * @param {import("@langchain/core/tools").Tool} tool - The tool being called.
   * @param {string} input - The string input to the tool.
   */
  handleToolStart(tool, input) {
    if (this.onToolCallCallback) {
      try {
        // The input for structured tools is a JSON string.
        const parameters = JSON.parse(input);
        // Recreate the legacy tool call format for UI compatibility.
        const legacyToolCall = {
          'tools-required': [{
            tool_name: tool.name,
            parameters: parameters,
          }],
        };
        this.onToolCallCallback(legacyToolCall);
      } catch (error) {
        brainLogger.error(LogCategory.BRAIN, "Failed to parse tool input in callback handler", { error, input });
      }
    }
  }
}

/**
 * Transforms the application's message history into a format LangChain can understand.
 * @param {Array<object>} historyMessages - The application's message history.
 * @returns {Array<import("@langchain/core/messages").BaseMessage>} The history formatted for LangChain.
 */
const formatHistoryForLangChain = (historyMessages) => {
  return historyMessages.map(msg => {
    switch (msg.role) {
      case 'user':
        return new HumanMessage(msg.text);
      case 'model':
        return new AIMessage(msg.text);
      default:
        return null;
    }
  }).filter(Boolean);
};

/**
 * Main AI service function, now powered by LangChain.
 * This function orchestrates the entire process of receiving a user message,
 * running it through a LangChain agent, and returning the response.
 */
export const sendMessageToAI = async (params) => {
  const {
    apiKey,
    modelName,
    historyMessages = [],
    newMessageText,
    onToolCall,
    tavilyApiKey,
    financeContext,
    allowedTools = [],
  } = params;

  brainLogger.info(LogCategory.BRAIN, "Processing request with LangChain agent", {
    modelName,
    historyLength: historyMessages.length,
    allowedToolsCount: allowedTools.length,
  });

  try {
    // 1. Create the LLM client using the adapter
    const llm = createLLMClient({ modelName, apiKey });

    // 2. Create the context for the tools
    const toolContext = { tavilyApiKey, ...financeContext, allowedTools };
    const tools = getLangChainTools(toolContext);

    // 3. Define the agent prompt
    const prompt = ChatPromptTemplate.fromMessages([
      ["system", "You are a helpful assistant. You have access to a set of tools to help you answer questions. When you use a tool, the result will be provided to you. Use the tools as needed to answer the user's request."],
      new MessagesPlaceholder("chat_history"),
      ["human", "{input}"],
      new MessagesPlaceholder("agent_scratchpad"),
    ]);

    // 4. Create the agent
    const agent = await createToolCallingAgent({
      llm,
      tools,
      prompt,
    });

    // 5. Create the Agent Executor
    const agentExecutor = new AgentExecutor({
      agent,
      tools,
      verbose: process.env.NODE_ENV === 'development',
    });

    // 6. Format the conversation history
    const chatHistory = formatHistoryForLangChain(historyMessages);

    // 7. Set up callbacks
    const callbacks = [];
    if (onToolCall) {
      callbacks.push(new CustomToolCallbackHandler(onToolCall));
    }

    // 8. Invoke the agent
    const result = await agentExecutor.invoke(
      {
        input: newMessageText,
        chat_history: chatHistory,
      },
      { callbacks }
    );

    brainLogger.info(LogCategory.BRAIN, "LangChain agent finished processing.", { output: result.output });

    // 9. Return the final response
    return result.output;

  } catch (error) {
    brainLogger.error(LogCategory.BRAIN, 'LangChain agent execution failed', {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};