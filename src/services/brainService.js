// src/services/brainService.js

import { GoogleGenerativeAI } from '@google/generative-ai';
import { createMasterPrompt } from '../prompts/masterPrompt';
import { safetySettings } from '../constants/safetySettings';
import { IS_DEBUG } from '../constants';

/**
 * Brain Service - The reasoning engine for the AI agent
 * Handles AI reasoning, decision making, and command generation
 */

/**
 * Cleans markdown formatting from JSON strings to improve parsing
 * @param {string} text - Text that may contain markdown-wrapped JSON
 * @returns {string} Cleaned text
 */
const cleanMarkdownFromJson = (text) => {
  // Remove markdown code blocks
  let cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '');
  
  // Remove any leading/trailing whitespace
  cleaned = cleaned.trim();
  
  // Try to find JSON-like content if it's embedded in other text
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    cleaned = jsonMatch[0];
  }
  
  return cleaned;
};

/**
 * Attempts to parse JSON with error handling and cleanup
 * @param {string} jsonString - String to parse as JSON
 * @returns {Object|null} Parsed JSON object or null if parsing fails
 */
const safeJsonParse = (jsonString) => {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    if (IS_DEBUG) {
      console.log('Initial JSON parse failed, attempting cleanup:', error.message);
    }
    
    try {
      const cleaned = cleanMarkdownFromJson(jsonString);
      return JSON.parse(cleaned);
    } catch (cleanupError) {
      if (IS_DEBUG) {
        console.error('JSON parsing failed even after cleanup:', cleanupError.message);
        console.error('Original text:', jsonString);
        console.error('Cleaned text:', cleanMarkdownFromJson(jsonString));
      }
      return null;
    }
  }
};

/**
 * Validates that a parsed command has the required structure
 * @param {Object} command - Parsed command object
 * @returns {boolean} True if command is valid
 */
const validateCommand = (command) => {
  if (!command || typeof command !== 'object') {
    return false;
  }
  
  // Must have tool_name and parameters
  if (!command.tool_name || typeof command.tool_name !== 'string') {
    return false;
  }
  
  if (!command.parameters || typeof command.parameters !== 'object') {
    return false;
  }
  
  return true;
};

/**
 * Processes a user request through the Brain's reasoning engine
 * @param {Object} params - Parameters for processing
 * @param {Array} params.conversationHistory - Array of conversation history entries
 * @param {Array} params.availableTools - Array of available tool metadata
 * @param {string} params.apiKey - Google AI API key
 * @param {string} params.modelName - Name of the AI model to use
 * @param {Object} params.executionContext - Enhanced execution context from Agent Executor
 * @returns {Promise<Object|null>} Command object or null if no action needed
 */
export const processUserRequest = async ({
  conversationHistory = [],
  availableTools = [],
  apiKey,
  modelName,
  executionContext = {}
}) => {
  if (!apiKey) {
    throw new Error('API Key is required for Brain processing');
  }
  
  if (!modelName) {
    throw new Error('Model name is required for Brain processing');
  }
  
  try {
    // Enhanced analysis of conversation history with execution context
    const reasoningContext = analyzeConversationContext(conversationHistory, executionContext);
    
    if (IS_DEBUG) {
      console.log('Brain: Enhanced reasoning context:', {
        hasRecentFailures: reasoningContext.hasRecentFailures,
        lastToolResult: reasoningContext.lastToolResult?.success,
        conversationLength: conversationHistory.length,
        currentIteration: executionContext.currentIteration,
        previousErrors: executionContext.previousErrors?.length || 0
      });
    }
    
    // Enhanced feedback analysis from Hands
    const handsTobrainFeedback = analyzeHandsFeedback(conversationHistory, executionContext);
    
    if (IS_DEBUG && handsTobrainFeedback.hasSignificantFeedback) {
      console.log('Brain: Significant feedback from Hands:', {
        errorPatterns: handsTobrainFeedback.errorPatterns,
        successPatterns: handsTobrainFeedback.successPatterns,
        recommendedActions: handsTobrainFeedback.recommendedActions
      });
    }
    
    // Generate the master prompt with enhanced context
    const masterPrompt = createMasterPrompt(conversationHistory, availableTools, {
      reasoningContext,
      handsTobrainFeedback,
      executionContext
    });
    
    if (IS_DEBUG) {
      console.log('Brain: Generated master prompt length:', masterPrompt.length);
      console.log('Brain: Available tools:', availableTools.map(t => t.agent_id));
    }
    
    // Initialize Google Generative AI
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: modelName, 
      safetySettings 
    });
    
    // Send the master prompt to the AI
    const result = await model.generateContent(masterPrompt);
    const responseText = await result.response.text();
    
    if (IS_DEBUG) {
      console.log('Brain: Raw AI response:', responseText);
    }
    
    // Parse the response as JSON command
    const command = safeJsonParse(responseText);
    
    if (!command) {
      console.error('Brain: Failed to parse AI response as JSON');
      
      // Enhanced error handling - provide context about parsing failure
      throw new Error('Brain failed to generate valid command from AI response');
    }
    
    // Validate the command structure
    if (!validateCommand(command)) {
      console.error('Brain: Invalid command structure:', command);
      
      // Enhanced error handling - provide details about validation failure
      throw new Error(`Brain generated invalid command structure: ${JSON.stringify(command)}`);
    }
    
    // Enhanced command validation - check if tool is available
    const isToolAvailable = availableTools.some(tool => tool.agent_id === command.tool_name);
    if (!isToolAvailable) {
      console.error('Brain: Requested unavailable tool:', command.tool_name);
      throw new Error(`Brain requested unavailable tool: ${command.tool_name}`);
    }
    
    if (IS_DEBUG) {
      console.log('Brain: Generated command:', command);
    }
    
    return command;
    
  } catch (error) {
    console.error('Brain: Error processing user request:', error);
    
    // Enhanced error propagation with more context
    const errorContext = {
      conversationLength: conversationHistory.length,
      availableToolsCount: availableTools.length,
      errorType: error.message.includes('API') ? 'api_error' : 'processing_error'
    };
    
    throw new Error(`Brain processing failed: ${error.message}`, { cause: errorContext });
  }
};

/**
 * Analyzes conversation history to understand feedback from Hands and context
 * @param {Array} conversationHistory - Conversation history array
 * @param {Object} executionContext - Enhanced execution context from Agent Executor
 * @returns {Object} Analysis of conversation context for reasoning
 */
const analyzeConversationContext = (conversationHistory = [], executionContext = {}) => {
  const toolResults = conversationHistory.filter(entry => entry.role === 'tool');
  const recentToolResults = toolResults.slice(-3); // Last 3 tool results
  
  // Analyze recent failures
  const recentFailures = recentToolResults.filter(result => 
    result.content && result.content.success === false
  );
  
  // Get last tool result for immediate feedback
  const lastToolResult = toolResults.length > 0 ? toolResults[toolResults.length - 1] : null;
  
  // Analyze tool usage patterns
  const toolUsagePattern = toolResults.map(result => result.content?.tool_name).filter(Boolean);
  const uniqueToolsUsed = [...new Set(toolUsagePattern)];
  
  // Check for error patterns
  const errorPatterns = recentToolResults
    .filter(result => result.content && !result.content.success)
    .map(result => result.content.metadata?.errorType)
    .filter(Boolean);
  
  // Enhanced context with execution information
  const enhancedContext = {
    hasRecentFailures: recentFailures.length > 0,
    consecutiveFailures: recentFailures.length,
    lastToolResult: lastToolResult?.content || null,
    toolUsagePattern,
    uniqueToolsUsed,
    errorPatterns,
    totalToolExecutions: toolResults.length,
    conversationTurns: conversationHistory.filter(entry => entry.role === 'user').length,
    needsUserResponse: lastToolResult?.content?.data?.requiresUserResponse || false,
    isTaskComplete: lastToolResult?.content?.data?.isComplete || false,
    // Enhanced execution context integration
    currentIteration: executionContext.currentIteration || 0,
    maxIterations: executionContext.maxIterations || 5,
    previousErrors: executionContext.previousErrors || [],
    executionProgress: {
      iterationRatio: (executionContext.currentIteration || 0) / (executionContext.maxIterations || 5),
      hasTimeConstraints: !!executionContext.startTime,
      userInput: executionContext.userInput
    }
  };
  
  return enhancedContext;
};

/**
 * Analyzes feedback from Hands (tool execution results) to guide Brain reasoning
 * @param {Array} conversationHistory - Conversation history array
 * @param {Object} executionContext - Enhanced execution context from Agent Executor
 * @returns {Object} Analysis of Hands feedback for Brain reasoning
 */
const analyzeHandsFeedback = (conversationHistory = [], executionContext = {}) => {
  const toolResults = conversationHistory.filter(entry => entry.role === 'tool');
  const recentResults = toolResults.slice(-5); // Last 5 tool results for pattern analysis
  
  // Analyze success/failure patterns
  const successfulResults = recentResults.filter(result => result.content?.success === true);
  const failedResults = recentResults.filter(result => result.content?.success === false);
  
  // Extract error patterns from failed results
  const errorPatterns = failedResults.map(result => ({
    toolName: result.content?.tool_name,
    errorType: result.content?.metadata?.errorType,
    errorMessage: result.content?.message,
    timestamp: result.timestamp
  }));
  
  // Extract success patterns from successful results
  const successPatterns = successfulResults.map(result => ({
    toolName: result.content?.tool_name,
    executionTime: result.content?.metadata?.executionTime,
    dataType: result.content?.metadata?.resultType,
    timestamp: result.timestamp
  }));
  
  // Analyze tool effectiveness
  const toolEffectiveness = {};
  recentResults.forEach(result => {
    const toolName = result.content?.tool_name;
    if (toolName) {
      if (!toolEffectiveness[toolName]) {
        toolEffectiveness[toolName] = { successes: 0, failures: 0, totalTime: 0 };
      }
      
      if (result.content?.success) {
        toolEffectiveness[toolName].successes++;
      } else {
        toolEffectiveness[toolName].failures++;
      }
      
      if (result.content?.metadata?.executionTime) {
        toolEffectiveness[toolName].totalTime += result.content.metadata.executionTime;
      }
    }
  });
  
  // Generate recommended actions based on feedback
  const recommendedActions = [];
  
  // If there are consecutive failures, recommend different approach
  if (failedResults.length >= 2) {
    recommendedActions.push('consider_alternative_approach');
  }
  
  // If same tool keeps failing, recommend different tool
  const repeatedFailures = errorPatterns.filter(error => 
    errorPatterns.filter(e => e.toolName === error.toolName).length > 1
  );
  if (repeatedFailures.length > 0) {
    recommendedActions.push('avoid_failing_tools');
  }
  
  // If execution is near iteration limit, recommend efficiency
  const iterationRatio = (executionContext.currentIteration || 0) / (executionContext.maxIterations || 5);
  if (iterationRatio > 0.6) {
    recommendedActions.push('prioritize_efficiency');
  }
  
  // If user response is needed, recommend clarification
  const lastResult = recentResults[recentResults.length - 1];
  if (lastResult?.content?.data?.requiresUserResponse) {
    recommendedActions.push('await_user_response');
  }
  
  return {
    hasSignificantFeedback: recentResults.length > 0,
    errorPatterns,
    successPatterns,
    toolEffectiveness,
    recommendedActions,
    recentResultsCount: recentResults.length,
    successRate: recentResults.length > 0 ? successfulResults.length / recentResults.length : 0,
    lastHandsResult: lastResult?.content || null,
    feedbackQuality: {
      hasDetailedErrors: errorPatterns.some(e => e.errorType && e.errorMessage),
      hasPerformanceMetrics: successPatterns.some(s => s.executionTime),
      hasStructuredData: recentResults.some(r => r.content?.data)
    }
  };
};

/**
 * Creates a reasoning context for the Brain based on current state
 * @param {Object} params - Context parameters
 * @param {Array} params.conversationHistory - Current conversation history
 * @param {string} params.userInput - Latest user input
 * @param {Object} params.metadata - Additional metadata
 * @returns {Object} Reasoning context
 */
export const createReasoningContext = ({
  conversationHistory = [],
  userInput,
  metadata = {}
}) => {
  return {
    conversationHistory,
    currentUserInput: userInput,
    conversationLength: conversationHistory.length,
    lastUserMessage: conversationHistory
      .filter(entry => entry.role === 'user')
      .pop()?.content || userInput,
    lastAiMessage: conversationHistory
      .filter(entry => entry.role === 'ai')
      .pop()?.content,
    lastToolResult: conversationHistory
      .filter(entry => entry.role === 'tool')
      .pop()?.content,
    metadata
  };
};

/**
 * Analyzes conversation history to determine if the task is complete
 * @param {Array} conversationHistory - Conversation history array
 * @returns {boolean} True if task appears to be complete
 */
export const isTaskComplete = (conversationHistory = []) => {
  // Look for recent answerUser tool usage
  const recentEntries = conversationHistory.slice(-5);
  return recentEntries.some(entry => 
    entry.role === 'tool' && 
    entry.content && 
    typeof entry.content === 'object' &&
    entry.content.tool_name === 'answerUser'
  );
};

/**
 * Extracts the current user's intent from conversation history
 * @param {Array} conversationHistory - Conversation history array
 * @returns {string} User's current intent or request
 */
export const extractUserIntent = (conversationHistory = []) => {
  // Find the most recent user message
  const userMessages = conversationHistory.filter(entry => entry.role === 'user');
  if (userMessages.length === 0) {
    return '';
  }
  
  return userMessages[userMessages.length - 1].content || '';
};