// src/services/handsService.js

import { toolImplementations } from './tools';
import { enhancedToolImplementations } from './enhancedTools';
import { IS_DEBUG } from '../constants';
import { 
  HandsError, 
  ToolError, 
  ErrorTypes, 
  ErrorSeverity, 
  validateRequired, 
  withTimeout,
  globalErrorHandler
} from '../utils/errorHandling';
import { handsLogger, LogCategory } from '../utils/logging';

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
 * Creates a standardized error result using the error handling framework
 * @param {string} message - Error message
 * @param {string} errorType - Type of error for categorization
 * @param {Object} additionalMetadata - Additional context for the error
 * @returns {Object} Standardized error result
 */
const createErrorResult = (message, errorType, additionalMetadata = {}) => {
  const handsError = new HandsError(message, errorType, {
    ...additionalMetadata,
    brainToHandsFlow: {
      commandReceived: true,
      parametersValid: errorType !== ErrorTypes.PARAMETER_VALIDATION_ERROR,
      executionSuccessful: false,
      feedbackQuality: 'high',
      errorCategory: errorType
    }
  });

  return {
    success: false,
    message: handsError.getUserFriendlyMessage(),
    data: null,
    tool_name: additionalMetadata.toolName || 'unknown',
    metadata: {
      errorType,
      timestamp: handsError.timestamp,
      recoverable: handsError.recoverable,
      recoveryStrategy: handsError.recoveryStrategy,
      ...handsError.metadata
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
  const executionId = `hands_execute_${Date.now()}`;
  const executionStartTime = Date.now();
  
  // Start performance monitoring
  handsLogger.startPerformanceTimer(executionId, {
    operation: 'tool_execution',
    commandType: typeof command,
    hasContext: !!context
  });
  
  handsLogger.info(LogCategory.HANDS, 'Starting tool command execution', {
    commandType: typeof command,
    contextKeys: Object.keys(context)
  });
  
  // Enhanced command validation with detailed error feedback
  if (!command || typeof command !== 'object') {
    handsLogger.error(LogCategory.VALIDATION, 'Invalid command structure', {
      receivedType: typeof command,
      expected: 'object'
    });
    
    handsLogger.endPerformanceTimer(executionId, { success: false, error: 'invalid_command' });
    
    return createErrorResult('Invalid command: must be an object', ErrorTypes.VALIDATION_ERROR, {
      receivedType: typeof command,
      executionTime: Date.now() - executionStartTime
    });
  }
  
  const { tool_name: toolName, parameters } = command;
  
  handsLogger.debug(LogCategory.HANDS, 'Command structure validated', {
    toolName,
    hasParameters: !!parameters,
    parameterCount: parameters ? Object.keys(parameters).length : 0
  });
  
  if (!toolName || typeof toolName !== 'string') {
    handsLogger.error(LogCategory.VALIDATION, 'Invalid tool name', {
      receivedToolName: toolName,
      expectedType: 'string'
    });
    
    handsLogger.endPerformanceTimer(executionId, { success: false, error: 'invalid_tool_name' });
    
    return createErrorResult(
      'Invalid command: tool_name is required and must be a string',
      ErrorTypes.VALIDATION_ERROR,
      { receivedToolName: toolName, executionTime: Date.now() - executionStartTime }
    );
  }
  
  if (!parameters || typeof parameters !== 'object') {
    handsLogger.error(LogCategory.VALIDATION, 'Invalid parameters', {
      receivedType: typeof parameters,
      expectedType: 'object',
      toolName
    });
    
    handsLogger.endPerformanceTimer(executionId, { success: false, error: 'invalid_parameters' });
    
    return createErrorResult(
      'Invalid command: parameters is required and must be an object',
      ErrorTypes.VALIDATION_ERROR,
      { receivedParameters: parameters, toolName, executionTime: Date.now() - executionStartTime }
    );
  }
  
  const { allowedTools = [], availableTools = [] } = context;
  
  // Enhanced authorization check with detailed feedback
  handsLogger.debug(LogCategory.HANDS, 'Checking tool authorization', {
    toolName,
    allowedToolsCount: allowedTools.length,
    isSpecialTool: toolName === 'clarify' || toolName === 'answerUser'
  });
  
  if (!isToolAllowed(toolName, allowedTools)) {
    handsLogger.error(LogCategory.HANDS, 'Tool not authorized', {
      toolName,
      allowedToolsCount: allowedTools.length
    });
    
    handsLogger.endPerformanceTimer(executionId, { success: false, error: 'unauthorized_tool' });
    
    return createErrorResult(
      `Tool '${toolName}' is not authorized for execution`,
      ErrorTypes.AUTHORIZATION_ERROR,
      { 
        toolName, 
        allowedTools: allowedTools.slice(0, 5), // Limit for security
        executionTime: Date.now() - executionStartTime
      }
    );
  }
  
  // Enhanced parameter validation for regular tools
  if (toolName !== 'clarify' && toolName !== 'answerUser') {
    handsLogger.debug(LogCategory.VALIDATION, 'Validating tool parameters', {
      toolName,
      parameterCount: Object.keys(parameters).length,
      availableToolsCount: availableTools.length
    });
    
    const validation = validateToolParameters(toolName, parameters, availableTools);
    if (!validation.success) {
      handsLogger.error(LogCategory.VALIDATION, 'Parameter validation failed', {
        toolName,
        validationMessage: validation.message,
        providedParameters: Object.keys(parameters)
      });
      
      handsLogger.endPerformanceTimer(executionId, { success: false, error: 'parameter_validation_failed' });
      
      return createErrorResult(
        validation.message,
        ErrorTypes.PARAMETER_VALIDATION_ERROR,
        { 
          toolName, 
          parameters: Object.keys(parameters),
          executionTime: Date.now() - executionStartTime
        }
      );
    }
  }
  
  handsLogger.info(LogCategory.HANDS, 'Executing tool', {
    toolName,
    parameterCount: Object.keys(parameters).length,
    parameters: Object.keys(parameters)
  });
  
  try {
    let result;
    const toolExecutionTimer = `tool_${toolName}_${Date.now()}`;
    
    // Start tool-specific performance monitoring
    handsLogger.startPerformanceTimer(toolExecutionTimer, {
      operation: 'individual_tool_execution',
      toolName,
      parameterCount: Object.keys(parameters).length
    });
    
    // Handle special tools with enhanced feedback
    if (toolName === 'clarify') {
      handsLogger.debug(LogCategory.TOOLS, 'Executing clarify tool', {
        questionLength: parameters.question?.length
      });
      result = await handleClarifyTool(parameters);
    } else if (toolName === 'answerUser') {
      handsLogger.debug(LogCategory.TOOLS, 'Executing answerUser tool', {
        answerLength: parameters.answer?.length
      });
      result = await handleAnswerUserTool(parameters);
    } else {
      // Execute regular tool with enhanced error handling
      // Try enhanced tools first, then fall back to legacy tools for backward compatibility
      let toolFunction = enhancedToolImplementations[toolName] || toolImplementations[toolName];
      
      if (!toolFunction) {
        handsLogger.error(LogCategory.TOOLS, 'Tool implementation not found', {
          toolName,
          availableEnhancedTools: Object.keys(enhancedToolImplementations).length,
          availableLegacyTools: Object.keys(toolImplementations).length
        });
        
        handsLogger.endPerformanceTimer(executionId, { success: false, error: 'tool_not_found' });
        
        return createErrorResult(
          `Tool implementation not found for '${toolName}'`,
          ErrorTypes.TOOL_NOT_FOUND,
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
      
      handsLogger.debug(LogCategory.TOOLS, 'Executing regular tool', {
        toolName,
        isEnhancedTool: !!enhancedToolImplementations[toolName],
        isLegacyTool: !!toolImplementations[toolName]
      });
      
      result = await toolFunction(parameters, context);
    }
    
    // End tool-specific performance monitoring
    const toolMetric = handsLogger.endPerformanceTimer(toolExecutionTimer, {
      success: result?.success !== false,
      toolName,
      hasData: !!result?.data
    });
    
    handsLogger.debug(LogCategory.TOOLS, 'Tool execution completed', {
      toolName,
      success: result?.success !== false,
      executionTime: toolMetric?.duration,
      hasData: !!result?.data
    });
    
    // Enhanced result validation and feedback
    if (!result || typeof result !== 'object') {
      handsLogger.error(LogCategory.TOOLS, 'Tool returned invalid result format', {
        toolName,
        resultType: typeof result,
        expected: 'object'
      });
      
      handsLogger.endPerformanceTimer(executionId, { success: false, error: 'invalid_result_format' });
      
      return createErrorResult(
        `Tool '${toolName}' returned invalid result format`,
        ErrorTypes.TOOL_EXECUTION_ERROR,
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
    
    // End main performance monitoring
    const executionMetric = handsLogger.endPerformanceTimer(executionId, {
      success: enhancedResult.success,
      toolName,
      hasData: !!enhancedResult.data
    });
    
    handsLogger.info(LogCategory.HANDS, 'Tool command execution completed', {
      toolName,
      success: enhancedResult.success,
      totalExecutionTime: executionMetric?.duration,
      hasData: !!enhancedResult.data,
      resultType: enhancedResult.data?.type
    });
    
    return enhancedResult;
    
  } catch (error) {
    // Log the error with comprehensive context
    handsLogger.logError(error, {
      operation: 'executeCommand',
      toolName,
      parameters: Object.keys(parameters),
      executionTime: Date.now() - executionStartTime
    });
    
    // End performance monitoring on error
    handsLogger.endPerformanceTimer(executionId, {
      success: false,
      error: error.message,
      toolName
    });
    
    // Enhanced error result with comprehensive context for Brain feedback
    const errorResult = createErrorResult(
      `Tool execution failed: ${error.message}`,
      ErrorTypes.TOOL_EXECUTION_ERROR,
      {
        toolName,
        parameters: Object.keys(parameters),
        errorName: error.name,
        errorStack: IS_DEBUG ? error.stack : undefined,
        executionTime: Date.now() - executionStartTime
      }
    );
    
    handsLogger.error(LogCategory.ERROR, 'Tool execution failed', {
      toolName,
      errorType: error.name,
      recoverable: errorResult.metadata?.recoverable,
      executionTime: Date.now() - executionStartTime
    });
    
    return errorResult;
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