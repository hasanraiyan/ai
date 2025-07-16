// src/services/handsService.js

import { toolImplementations } from './tools';
import { enhancedToolImplementations } from './enhancedTools';
import { IS_DEBUG } from '../constants';

/**
 * Hands Service - The tool execution engine for the AI agent
 * Handles tool execution, parameter validation, and error management
 */

/**
 * Validates tool parameters against expected format
 * @param {string} toolName - Name of the tool to validate
 * @param {Object} parameters - Parameters to validate
 * @param {Array} availableTools - Array of available tool metadata
 * @returns {Object} Validation result with success flag and message
 */
const validateToolParameters = (toolName, parameters, availableTools = []) => {
  // Find tool metadata
  const toolMetadata = availableTools.find(tool => tool.agent_id === toolName);
  
  if (!toolMetadata) {
    return {
      success: false,
      message: `Tool '${toolName}' not found in available tools`
    };
  }
  
  // Check if parameters is an object
  if (!parameters || typeof parameters !== 'object') {
    return {
      success: false,
      message: `Parameters must be an object for tool '${toolName}'`
    };
  }
  
  // Validate required parameters based on input format
  const inputFormat = toolMetadata.input_format || {};
  const missingParams = [];
  
  for (const [paramName, paramType] of Object.entries(inputFormat)) {
    if (!(paramName in parameters)) {
      missingParams.push(paramName);
    }
  }
  
  if (missingParams.length > 0) {
    return {
      success: false,
      message: `Missing required parameters for tool '${toolName}': ${missingParams.join(', ')}`
    };
  }
  
  return {
    success: true,
    message: 'Parameters are valid'
  };
};

/**
 * Checks if a tool is allowed to be executed
 * @param {string} toolName - Name of the tool
 * @param {Array} allowedTools - Array of allowed tool names
 * @returns {boolean} True if tool is allowed
 */
const isToolAllowed = (toolName, allowedTools = []) => {
  // Special tools are always allowed
  if (toolName === 'clarify' || toolName === 'answerUser') {
    return true;
  }
  
  // Check if tool is in allowed list
  return allowedTools.includes(toolName);
};

/**
 * Creates a standardized error result for enhanced feedback to Brain
 * @param {string} message - Error message
 * @param {string} errorType - Type of error for categorization
 * @param {Object} additionalMetadata - Additional context for the error
 * @returns {Object} Standardized error result
 */
const createErrorResult = (message, errorType, additionalMetadata = {}) => {
  return {
    success: false,
    message,
    data: null,
    tool_name: additionalMetadata.toolName || 'unknown', // Include tool name for Brain feedback
    metadata: {
      errorType,
      timestamp: Date.now(),
      // Enhanced feedback for Brain-Hands communication
      brainToHandsFlow: {
        commandReceived: true,
        parametersValid: errorType !== 'parameter_validation_error',
        executionSuccessful: false,
        feedbackQuality: 'high',
        errorCategory: errorType
      },
      ...additionalMetadata
    }
  };
};

/**
 * Executes a tool command with proper error handling and enhanced feedback
 * @param {Object} command - Command object with tool_name and parameters
 * @param {Object} context - Execution context with API keys, functions, etc.
 * @returns {Promise<Object>} Tool execution result
 */
export const executeCommand = async (command, context = {}) => {
  const executionStartTime = Date.now();
  
  // Enhanced command validation with detailed error feedback
  if (!command || typeof command !== 'object') {
    return createErrorResult('Invalid command: must be an object', 'validation_error', {
      receivedType: typeof command,
      executionTime: Date.now() - executionStartTime
    });
  }
  
  const { tool_name: toolName, parameters } = command;
  
  if (!toolName || typeof toolName !== 'string') {
    return createErrorResult(
      'Invalid command: tool_name is required and must be a string',
      'validation_error',
      { receivedToolName: toolName, executionTime: Date.now() - executionStartTime }
    );
  }
  
  if (!parameters || typeof parameters !== 'object') {
    return createErrorResult(
      'Invalid command: parameters is required and must be an object',
      'validation_error',
      { receivedParameters: parameters, toolName, executionTime: Date.now() - executionStartTime }
    );
  }
  
  const { allowedTools = [], availableTools = [] } = context;
  
  // Enhanced authorization check with detailed feedback
  if (!isToolAllowed(toolName, allowedTools)) {
    return createErrorResult(
      `Tool '${toolName}' is not authorized for execution`,
      'authorization_error',
      { 
        toolName, 
        allowedTools: allowedTools.slice(0, 5), // Limit for security
        executionTime: Date.now() - executionStartTime
      }
    );
  }
  
  // Enhanced parameter validation for regular tools
  if (toolName !== 'clarify' && toolName !== 'answerUser') {
    const validation = validateToolParameters(toolName, parameters, availableTools);
    if (!validation.success) {
      return createErrorResult(
        validation.message,
        'parameter_validation_error',
        { 
          toolName, 
          parameters: Object.keys(parameters),
          executionTime: Date.now() - executionStartTime
        }
      );
    }
  }
  
  if (IS_DEBUG) {
    console.log(`Hands: Executing tool '${toolName}' with parameters:`, parameters);
  }
  
  try {
    let result;
    
    // Handle special tools with enhanced feedback
    if (toolName === 'clarify') {
      result = await handleClarifyTool(parameters);
    } else if (toolName === 'answerUser') {
      result = await handleAnswerUserTool(parameters);
    } else {
      // Execute regular tool with enhanced error handling
      // Try enhanced tools first, then fall back to legacy tools for backward compatibility
      let toolFunction = enhancedToolImplementations[toolName] || toolImplementations[toolName];
      
      if (!toolFunction) {
        return createErrorResult(
          `Tool implementation not found for '${toolName}'`,
          'implementation_not_found',
          { 
            toolName, 
            availableTools: [
              ...Object.keys(enhancedToolImplementations).slice(0, 5),
              ...Object.keys(toolImplementations).slice(0, 5)
            ],
            executionTime: Date.now() - executionStartTime
          }
        );
      }
      
      result = await toolFunction(parameters, context);
    }
    
    // Enhanced result validation and feedback
    if (!result || typeof result !== 'object') {
      return createErrorResult(
        `Tool '${toolName}' returned invalid result format`,
        'invalid_result_format',
        { 
          toolName, 
          resultType: typeof result,
          executionTime: Date.now() - executionStartTime
        }
      );
    }
    
    // Create enhanced success result with comprehensive feedback for Brain
    const enhancedResult = {
      success: result.success !== false,
      message: result.message || 'Tool executed successfully',
      data: result.data || null,
      tool_name: toolName, // Include tool name for Brain feedback analysis
      metadata: {
        toolName,
        executionTime: Date.now() - executionStartTime,
        parametersProvided: Object.keys(parameters),
        resultType: result.data ? typeof result.data : 'null',
        // Enhanced feedback for Brain-Hands communication
        brainToHandsFlow: {
          commandReceived: true,
          parametersValid: true,
          executionSuccessful: result.success !== false,
          feedbackQuality: 'high'
        },
        // Performance metrics for Brain analysis
        performance: {
          executionTimeMs: Date.now() - executionStartTime,
          memoryUsage: process.memoryUsage ? process.memoryUsage().heapUsed : null,
          parametersCount: Object.keys(parameters).length
        },
        ...result.metadata
      }
    };
    
    if (IS_DEBUG) {
      console.log(`Hands: Tool '${toolName}' execution completed:`, {
        success: enhancedResult.success,
        executionTime: enhancedResult.metadata.executionTime,
        hasData: !!enhancedResult.data
      });
    }
    
    return enhancedResult;
    
  } catch (error) {
    console.error(`Hands: Error executing tool '${toolName}':`, error);
    
    // Enhanced error result with comprehensive context for Brain feedback
    return createErrorResult(
      `Tool execution failed: ${error.message}`,
      'execution_exception',
      {
        toolName,
        parameters: Object.keys(parameters),
        errorName: error.name,
        errorStack: IS_DEBUG ? error.stack : undefined,
        executionTime: Date.now() - executionStartTime
      }
    );
  }
};

/**
 * Handles the clarify tool for asking user questions
 * @param {Object} parameters - Tool parameters
 * @returns {Promise<Object>} Tool result
 */
const handleClarifyTool = async (parameters) => {
  const { question } = parameters;
  
  if (!question || typeof question !== 'string') {
    return {
      success: false,
      message: 'Clarify tool requires a question parameter (string)',
      data: null
    };
  }
  
  return {
    success: true,
    message: 'Clarification request sent to user',
    data: {
      type: 'clarification',
      question: question.trim(),
      requiresUserResponse: true
    }
  };
};

/**
 * Handles the answerUser tool for providing final responses
 * @param {Object} parameters - Tool parameters
 * @returns {Promise<Object>} Tool result
 */
const handleAnswerUserTool = async (parameters) => {
  const { answer } = parameters;
  
  if (!answer || typeof answer !== 'string') {
    return {
      success: false,
      message: 'AnswerUser tool requires an answer parameter (string)',
      data: null
    };
  }
  
  return {
    success: true,
    message: 'Final answer provided to user',
    data: {
      type: 'final_answer',
      answer: answer.trim(),
      isComplete: true
    }
  };
};

/**
 * Executes multiple commands in sequence
 * @param {Array} commands - Array of command objects
 * @param {Object} context - Execution context
 * @returns {Promise<Array>} Array of execution results
 */
export const executeMultipleCommands = async (commands, context = {}) => {
  if (!Array.isArray(commands)) {
    throw new Error('Commands must be an array');
  }
  
  const results = [];
  
  for (const command of commands) {
    const result = await executeCommand(command, context);
    results.push(result);
    
    // Stop execution if a command fails and it's critical
    if (!result.success && context.stopOnFailure) {
      break;
    }
  }
  
  return results;
};

/**
 * Gets available tool names from context
 * @param {Object} context - Execution context
 * @returns {Array} Array of available tool names
 */
export const getAvailableToolNames = (context = {}) => {
  const { allowedTools = [], availableTools = [] } = context;
  
  // Always include special tools
  const specialTools = ['clarify', 'answerUser'];
  
  // Add allowed regular tools
  const regularTools = availableTools
    .filter(tool => allowedTools.includes(tool.agent_id))
    .map(tool => tool.agent_id);
  
  return [...specialTools, ...regularTools];
};

/**
 * Creates execution context for tools
 * @param {Object} params - Context parameters
 * @returns {Object} Execution context
 */
export const createExecutionContext = (params = {}) => {
  return {
    allowedTools: params.allowedTools || [],
    availableTools: params.availableTools || [],
    tavilyApiKey: params.tavilyApiKey,
    apiKey: params.apiKey,
    modelName: params.modelName,
    // Finance context functions
    addTransaction: params.addTransaction,
    getFinancialReport: params.getFinancialReport,
    setBudget: params.setBudget,
    getBudgets: params.getBudgets,
    getTransactions: params.getTransactions,
    // Additional context
    ...params.additionalContext
  };
};