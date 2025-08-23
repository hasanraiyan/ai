// src/services/brainService.js

import { GoogleGenerativeAI } from '@google/generative-ai';
import { createMasterPrompt } from '../prompts/masterPrompt';
import { safetySettings } from '../constants/safetySettings';
import { IS_DEBUG } from '../constants';
import { 
  BrainError, 
  ErrorTypes, 
  ErrorSeverity, 
  validateRequired, 
  withTimeout,
  globalErrorHandler
} from '../utils/errorHandling';
import { brainLogger, LogCategory } from '../utils/logging';

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
      brainLogger.debug(LogCategory.BRAIN, 'Initial JSON parse failed, attempting cleanup', {
        error: error.message
      });
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
  const operationId = `brain_process_${Date.now()}`;
  
  // Start performance monitoring
  brainLogger.startPerformanceTimer(operationId, {
    conversationLength: conversationHistory.length,
    availableToolsCount: availableTools.length,
    iteration: executionContext.currentIteration || 0
  });
  
  brainLogger.info(LogCategory.BRAIN, 'Starting user request processing', {
    conversationLength: conversationHistory.length,
    availableToolsCount: availableTools.length,
    modelName,
    iteration: executionContext.currentIteration || 0
  });

  // Enhanced parameter validation using error handling framework
  try {
    validateRequired({ apiKey, modelName }, ['apiKey', 'modelName'], 'Brain processing');
    brainLogger.debug(LogCategory.VALIDATION, 'Parameter validation successful');
  } catch (error) {
    brainLogger.error(LogCategory.VALIDATION, 'Parameter validation failed', {
      missingFields: error.metadata?.missingFields
    });
    throw new BrainError(error.message, ErrorTypes.PARAMETER_VALIDATION_ERROR, {
      missingParameters: error.metadata?.missingFields,
      context: 'processUserRequest'
    });
  }
  
  try {
    // Enhanced analysis of conversation history with execution context
    brainLogger.debug(LogCategory.BRAIN, 'Analyzing conversation context');
    const reasoningContext = analyzeConversationContext(conversationHistory, executionContext);
    
    brainLogger.debug(LogCategory.BRAIN, 'Reasoning context analysis complete', {
      hasRecentFailures: reasoningContext.hasRecentFailures,
      consecutiveFailures: reasoningContext.consecutiveFailures,
      totalToolExecutions: reasoningContext.totalToolExecutions,
      uniqueToolsUsed: reasoningContext.uniqueToolsUsed.length,
      iterationProgress: reasoningContext.executionProgress?.iterationRatio
    });
    
    // Enhanced feedback analysis from Hands
    brainLogger.debug(LogCategory.BRAIN, 'Analyzing Hands feedback');
    const handsTobrainFeedback = analyzeHandsFeedback(conversationHistory, executionContext);
    
    if (handsTobrainFeedback.hasSignificantFeedback) {
      brainLogger.info(LogCategory.BRAIN, 'Significant feedback from Hands received', {
        successRate: handsTobrainFeedback.successRate,
        errorPatternsCount: handsTobrainFeedback.errorPatterns.length,
        recommendedActions: handsTobrainFeedback.recommendedActions,
        feedbackQuality: handsTobrainFeedback.feedbackQuality
      });
    }
    
    // Generate the master prompt with enhanced context
    brainLogger.debug(LogCategory.BRAIN, 'Generating master prompt');
    const masterPrompt = createMasterPrompt(conversationHistory, availableTools, {
      reasoningContext,
      handsTobrainFeedback,
      executionContext
    });
    
    brainLogger.debug(LogCategory.BRAIN, 'Master prompt generated', {
      promptLength: masterPrompt.length,
      availableToolsCount: availableTools.length,
      availableTools: availableTools.map(t => t.agent_id)
    });
    
    // Initialize Google Generative AI
    brainLogger.debug(LogCategory.API, 'Initializing Google Generative AI', {
      modelName,
      hasSafetySettings: !!safetySettings
    });
    
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: modelName, 
      safetySettings 
    });
    
    // Send the master prompt to the AI with timeout protection
    brainLogger.info(LogCategory.API, 'Sending request to AI model', {
      modelName,
      promptLength: masterPrompt.length,
      timeoutMs: 30000
    });
    
    const aiCallTimer = `ai_call_${Date.now()}`;
    brainLogger.startPerformanceTimer(aiCallTimer, {
      operation: 'ai_model_call',
      modelName,
      promptLength: masterPrompt.length
    });
    
    const aiOperation = async () => {
      const result = await model.generateContent(masterPrompt);
      return await result.response.text();
    };
    
    const responseText = await withTimeout(
      aiOperation(), 
      30000, // 30 second timeout
      'AI response timed out'
    );
    
    const aiMetric = brainLogger.endPerformanceTimer(aiCallTimer, {
      responseLength: responseText.length,
      success: true
    });
    
    brainLogger.info(LogCategory.API, 'AI model response received', {
      responseLength: responseText.length,
      executionTime: aiMetric?.duration,
      success: true
    });
    
    brainLogger.debug(LogCategory.BRAIN, 'Raw AI response received', {
      responseLength: responseText.length,
      responsePreview: responseText.substring(0, 100) + (responseText.length > 100 ? '...' : '')
    });
    
    // Parse the response as JSON command with enhanced error handling
    brainLogger.debug(LogCategory.BRAIN, 'Parsing AI response as JSON command');
    const command = safeJsonParse(responseText);
    
    if (!command) {
      brainLogger.error(LogCategory.BRAIN, 'Failed to parse AI response as JSON', {
        responseLength: responseText.length,
        responsePreview: responseText.substring(0, 100)
      });
      throw new BrainError(
        'Failed to parse AI response as valid JSON command',
        ErrorTypes.JSON_PARSE_ERROR,
        {
          rawResponse: responseText.substring(0, 200), // First 200 chars for debugging
          responseLength: responseText.length,
          context: 'AI response parsing'
        }
      );
    }
    
    // Validate the command structure with enhanced error details
    brainLogger.debug(LogCategory.VALIDATION, 'Validating command structure', {
      hasToolName: !!command.tool_name,
      hasParameters: !!command.parameters,
      toolName: command.tool_name
    });
    
    if (!validateCommand(command)) {
      brainLogger.error(LogCategory.VALIDATION, 'Invalid command structure', {
        command: JSON.stringify(command),
        expectedStructure: { tool_name: 'string', parameters: 'object' }
      });
      throw new BrainError(
        'AI generated invalid command structure',
        ErrorTypes.COMMAND_PARSE_ERROR,
        {
          command: JSON.stringify(command),
          expectedStructure: { tool_name: 'string', parameters: 'object' },
          context: 'command validation'
        }
      );
    }
    
    // Enhanced command validation - check if tool is available
    const isToolAvailable = availableTools.some(tool => tool.agent_id === command.tool_name);
    if (!isToolAvailable) {
      brainLogger.error(LogCategory.VALIDATION, 'Requested tool not available', {
        requestedTool: command.tool_name,
        availableToolsCount: availableTools.length
      });
      throw new BrainError(
        `Requested tool '${command.tool_name}' is not available`,
        ErrorTypes.TOOL_NOT_FOUND,
        {
          requestedTool: command.tool_name,
          availableTools: availableTools.map(t => t.agent_id),
          context: 'tool availability check'
        }
      );
    }
    
    // Log successful command generation
    brainLogger.info(LogCategory.BRAIN, 'Successfully generated command', {
      toolName: command.tool_name,
      parameterCount: Object.keys(command.parameters).length,
      parameters: Object.keys(command.parameters)
    });
    
    // End performance monitoring
    const operationMetric = brainLogger.endPerformanceTimer(operationId, {
      success: true,
      commandGenerated: true,
      toolName: command.tool_name
    });
    
    brainLogger.info(LogCategory.PERFORMANCE, 'Brain processing completed', {
      totalDuration: operationMetric?.duration,
      success: true
    });
    
    return command;
    
  } catch (error) {
    // End performance monitoring on error
    brainLogger.endPerformanceTimer(operationId, {
      success: false,
      error: error.message
    });
    
    // Log the error with context
    brainLogger.logError(error, {
      operation: 'processUserRequest',
      conversationLength: conversationHistory.length,
      availableToolsCount: availableTools.length,
      executionIteration: executionContext.currentIteration
    });
    
    // If it's already a BrainError, re-throw it
    if (error instanceof BrainError) {
      throw error;
    }
    
    // Handle other errors with enhanced context
    const errorContext = {
      conversationLength: conversationHistory.length,
      availableToolsCount: availableTools.length,
      executionIteration: executionContext.currentIteration,
      originalError: error.message
    };
    
    // Determine error type based on error characteristics
    let errorType = ErrorTypes.BRAIN_PROCESSING_ERROR;
    if (error.message.includes('API') || error.message.includes('generateContent')) {
      errorType = ErrorTypes.API_ERROR;
    } else if (error.message.includes('timeout') || error.message.includes('timed out')) {
      errorType = ErrorTypes.TIMEOUT_ERROR;
    } else if (error.message.includes('network') || error.message.includes('ENOTFOUND')) {
      errorType = ErrorTypes.NETWORK_ERROR;
    }
    
    const brainError = new BrainError(
      `Brain processing failed: ${error.message}`,
      errorType,
      errorContext
    );
    
    brainLogger.error(LogCategory.ERROR, 'Brain processing failed', {
      errorType: brainError.type,
      recoverable: brainError.recoverable,
      severity: brainError.severity
    });
    
    throw brainError;
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