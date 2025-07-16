// src/services/agentExecutor.js

import { processUserRequest, isTaskComplete, extractUserIntent } from './brainService';
import { executeCommand, createExecutionContext } from './handsService';
import { getEnhancedTools } from './enhancedTools';
import { IS_DEBUG } from '../constants';
import { 
  ExecutorError, 
  ErrorTypes, 
  ErrorSeverity, 
  validateRequired, 
  withTimeout,
  globalErrorHandler
} from '../utils/errorHandling';
import { executorLogger, LogCategory, conversationLogger } from '../utils/logging';

/**
 * Agent Executor - Main orchestration service for the Brain and Hands architecture
 * Manages the iterative Reason-Act-Observe loop with conversation history
 * Includes comprehensive safety mechanisms and loop control
 */

// Safety constants
const DEFAULT_MAX_ITERATIONS = 5;
const ABSOLUTE_MAX_ITERATIONS = 10;
const DEFAULT_TIMEOUT_MS = 30000; // 30 seconds
const MAX_CONSECUTIVE_FAILURES = 3;

/**
 * Creates a conversation history entry
 * @param {string} role - Role of the entry ('user', 'ai', 'tool')
 * @param {string|Object} content - Content of the entry
 * @param {Object} metadata - Additional metadata
 * @returns {Object} Conversation history entry
 */
const createHistoryEntry = (role, content, metadata = {}) => {
  return {
    role,
    content,
    timestamp: Date.now(),
    metadata
  };
};

/**
 * Adds an entry to conversation history
 * @param {Array} history - Current conversation history
 * @param {string} role - Role of the entry
 * @param {string|Object} content - Content of the entry
 * @param {Object} metadata - Additional metadata
 * @returns {Array} Updated conversation history
 */
const addToHistory = (history, role, content, metadata = {}) => {
  const newEntry = createHistoryEntry(role, content, metadata);
  return [...history, newEntry];
};

/**
 * Validates the agent request parameters using error handling framework
 * @param {Object} params - Request parameters
 * @returns {Object} Validation result
 */
const validateAgentRequest = (params) => {
  try {
    const { userInput, context } = params;
    
    // Validate user input
    if (!userInput || typeof userInput !== 'string' || userInput.trim().length === 0) {
      throw new ExecutorError(
        'User input is required and must be a non-empty string',
        ErrorTypes.USER_INPUT_ERROR,
        { providedInput: typeof userInput, inputLength: userInput?.length }
      );
    }
    
    // Validate context object
    if (!context || typeof context !== 'object') {
      throw new ExecutorError(
        'Context is required and must be an object',
        ErrorTypes.PARAMETER_VALIDATION_ERROR,
        { providedContext: typeof context }
      );
    }
    
    // Validate required context fields
    validateRequired(context, ['apiKey', 'modelName'], 'Agent Executor context');
    
    return {
      valid: true,
      message: 'Request parameters are valid'
    };
    
  } catch (error) {
    return {
      valid: false,
      message: error.message,
      error: error instanceof ExecutorError ? error : new ExecutorError(error.message, ErrorTypes.VALIDATION_ERROR)
    };
  }
};

/**
 * Detects infinite loops by analyzing conversation patterns
 * @param {Array} conversationHistory - Current conversation history
 * @param {number} lookbackWindow - Number of recent entries to analyze
 * @returns {Object} Loop detection result
 */
const detectInfiniteLoop = (conversationHistory, lookbackWindow = 6) => {
  if (conversationHistory.length < lookbackWindow) {
    return { detected: false, reason: 'Insufficient history' };
  }
  
  const recentEntries = conversationHistory.slice(-lookbackWindow);
  const aiCommands = recentEntries
    .filter(entry => entry.role === 'ai')
    .map(entry => entry.content?.tool_name)
    .filter(Boolean);
  
  // Check for repeated tool calls
  if (aiCommands.length >= 3) {
    const lastThreeCommands = aiCommands.slice(-3);
    if (lastThreeCommands.every(cmd => cmd === lastThreeCommands[0])) {
      return {
        detected: true,
        reason: `Repeated tool calls detected: ${lastThreeCommands[0]}`,
        pattern: lastThreeCommands
      };
    }
  }
  
  // Check for alternating patterns
  if (aiCommands.length >= 4) {
    const pattern1 = [aiCommands[0], aiCommands[1]];
    const pattern2 = [aiCommands[2], aiCommands[3]];
    if (JSON.stringify(pattern1) === JSON.stringify(pattern2)) {
      return {
        detected: true,
        reason: 'Alternating pattern detected',
        pattern: pattern1
      };
    }
  }
  
  return { detected: false, reason: 'No loop detected' };
};

/**
 * Counts consecutive failures in recent history
 * @param {Array} conversationHistory - Current conversation history
 * @param {number} maxFailures - Maximum allowed consecutive failures
 * @returns {Object} Failure analysis result
 */
const analyzeConsecutiveFailures = (conversationHistory, maxFailures = MAX_CONSECUTIVE_FAILURES) => {
  const recentToolResults = conversationHistory
    .filter(entry => entry.role === 'tool')
    .slice(-maxFailures);
  
  if (recentToolResults.length === 0) {
    return { exceedsLimit: false, count: 0 };
  }
  
  let consecutiveFailures = 0;
  for (let i = recentToolResults.length - 1; i >= 0; i--) {
    const result = recentToolResults[i];
    if (result.content && result.content.success === false) {
      consecutiveFailures++;
    } else {
      break;
    }
  }
  
  return {
    exceedsLimit: consecutiveFailures >= maxFailures,
    count: consecutiveFailures,
    maxAllowed: maxFailures
  };
};

/**
 * Validates iteration limits with safety bounds
 * @param {number} requestedMaxIterations - Requested max iterations
 * @returns {number} Safe max iterations value
 */
const validateIterationLimit = (requestedMaxIterations) => {
  if (!requestedMaxIterations || requestedMaxIterations < 1) {
    return DEFAULT_MAX_ITERATIONS;
  }
  
  if (requestedMaxIterations > ABSOLUTE_MAX_ITERATIONS) {
    if (IS_DEBUG) {
      console.warn(`Agent Executor: Requested max iterations (${requestedMaxIterations}) exceeds absolute limit (${ABSOLUTE_MAX_ITERATIONS}). Using absolute limit.`);
    }
    return ABSOLUTE_MAX_ITERATIONS;
  }
  
  return requestedMaxIterations;
};

/**
 * Creates a timeout promise for long-running operations
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Promise} Timeout promise
 */
const createTimeoutPromise = (timeoutMs) => {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
};

/**
 * Determines if the agent should continue iterating with enhanced safety checks
 * @param {Array} conversationHistory - Current conversation history
 * @param {number} currentIteration - Current iteration number
 * @param {number} maxIterations - Maximum allowed iterations
 * @param {number} startTime - Start time of the execution
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Object} Decision result
 */
const shouldContinueIteration = (conversationHistory, currentIteration, maxIterations, startTime = Date.now(), timeoutMs = DEFAULT_TIMEOUT_MS) => {
  // Check timeout
  const elapsed = Date.now() - startTime;
  if (elapsed > timeoutMs) {
    return {
      shouldContinue: false,
      reason: `Execution timeout after ${elapsed}ms`,
      gracefulExit: true,
      safetyTrigger: 'timeout'
    };
  }
  
  // Check iteration limit
  if (currentIteration >= maxIterations) {
    return {
      shouldContinue: false,
      reason: 'Maximum iterations reached',
      gracefulExit: true,
      safetyTrigger: 'max_iterations'
    };
  }
  
  // Check for infinite loops
  const loopDetection = detectInfiniteLoop(conversationHistory);
  if (loopDetection.detected) {
    return {
      shouldContinue: false,
      reason: `Infinite loop detected: ${loopDetection.reason}`,
      gracefulExit: true,
      safetyTrigger: 'infinite_loop',
      loopPattern: loopDetection.pattern
    };
  }
  
  // Check for consecutive failures
  const failureAnalysis = analyzeConsecutiveFailures(conversationHistory);
  if (failureAnalysis.exceedsLimit) {
    return {
      shouldContinue: false,
      reason: `Too many consecutive failures (${failureAnalysis.count}/${failureAnalysis.maxAllowed})`,
      gracefulExit: true,
      safetyTrigger: 'consecutive_failures',
      failureCount: failureAnalysis.count
    };
  }
  
  // Check if task is complete (answerUser tool was used)
  if (isTaskComplete(conversationHistory)) {
    return {
      shouldContinue: false,
      reason: 'Task completed successfully',
      gracefulExit: false
    };
  }
  
  // Check for clarification requests that need user response
  const lastEntry = conversationHistory[conversationHistory.length - 1];
  if (lastEntry && 
      lastEntry.role === 'tool' && 
      lastEntry.content && 
      typeof lastEntry.content === 'object' &&
      lastEntry.content.data &&
      lastEntry.content.data.requiresUserResponse) {
    return {
      shouldContinue: false,
      reason: 'Waiting for user response to clarification',
      gracefulExit: false
    };
  }
  
  return {
    shouldContinue: true,
    reason: 'Continue processing'
  };
};

/**
 * Handles graceful exit when iteration limits are reached
 * @param {Array} conversationHistory - Current conversation history
 * @param {string} userInput - Original user input
 * @returns {Object} Graceful exit response
 */
const handleGracefulExit = (conversationHistory, userInput) => {
  const userIntent = extractUserIntent(conversationHistory);
  
  return {
    success: true,
    response: `I've been working on your request: "${userIntent || userInput}". I've reached my processing limit, but I've made progress. Would you like me to continue with a specific aspect, or would you like to see what I've accomplished so far?`,
    isPartialResult: true,
    conversationHistory,
    metadata: {
      reason: 'graceful_exit',
      iterationsUsed: conversationHistory.filter(entry => entry.role === 'ai').length,
      originalRequest: userInput
    }
  };
};

/**
 * Extracts the final response from conversation history
 * @param {Array} conversationHistory - Conversation history
 * @returns {string} Final response
 */
const extractFinalResponse = (conversationHistory) => {
  // Look for answerUser tool result
  const answerEntry = conversationHistory
    .slice()
    .reverse()
    .find(entry =>
      entry.role === 'tool' &&
      entry.content &&
      typeof entry.content === 'object' &&
      entry.content.data &&
      entry.content.data.type === 'final_answer'
    );

  if (answerEntry) {
    return answerEntry.content.data.answer;
  }

  // Look for clarification request
  const clarifyEntry = conversationHistory
    .slice()
    .reverse()
    .find(entry =>
      entry.role === 'tool' &&
      entry.content &&
      typeof entry.content === 'object' &&
      entry.content.data &&
      entry.content.data.type === 'clarification'
    );

  if (clarifyEntry) {
    return clarifyEntry.content.data.question;
  }

  // Fallback to last AI message (if it's a natural language response)
  const lastAiEntry = conversationHistory
    .slice()
    .reverse()
    .find(entry => entry.role === 'ai');

  // If the last AI entry is a command (object), and no answerUser or clarify tool was explicitly used,
  // it means the agent stopped before providing a final natural language response or hit a limit.
  // In this scenario, return a more informative default.
  if (lastAiEntry && typeof lastAiEntry.content === 'object' && lastAiEntry.content.tool_name) {
      // This case indicates that the loop stopped right after the AI decided on a tool,
      // but before the tool result could lead to a final answer.
      return "I've processed your request and performed some actions, but I need further instructions or I've reached a processing limit. Please review the conversation history for details.";
  }

  // Otherwise, return the text of the last AI message, or a generic fallback.
  return lastAiEntry ? lastAiEntry.content : 'I apologize, but I was unable to complete your request.';
};

/**
 * Main agent executor function that orchestrates the Reason-Act-Observe loop
 * @param {Object} params - Execution parameters
 * @param {string} params.userInput - User's input/request
 * @param {Array} params.conversationHistory - Previous conversation history
 * @param {Object} params.context - Execution context with API keys, tools, etc.
 * @param {number} params.maxIterations - Maximum number of iterations (default: 5)
 * @returns {Promise<Object>} Execution result
 */
export const executeAgentRequest = async ({
  userInput,
  conversationHistory = [],
  context = {},
  maxIterations = DEFAULT_MAX_ITERATIONS,
  timeoutMs = DEFAULT_TIMEOUT_MS
}) => {
  const startTime = Date.now();
  const executionId = `executor_${Date.now()}`;
  
  // Start comprehensive performance monitoring
  executorLogger.startPerformanceTimer(executionId, {
    operation: 'agent_request_execution',
    userInputLength: userInput?.length,
    conversationLength: conversationHistory.length,
    maxIterations,
    timeoutMs
  });
  
  // Initialize conversation logger middleware
  const convLogger = conversationLogger(executorLogger);
  
  executorLogger.info(LogCategory.EXECUTOR, 'Starting agent request execution', {
    userInputLength: userInput?.length,
    conversationLength: conversationHistory.length,
    maxIterations,
    timeoutMs,
    contextKeys: Object.keys(context)
  });
  
  // Log conversation start
  convLogger.logStart(userInput, context);
  
  // Validate and sanitize iteration limit
  const safeMaxIterations = validateIterationLimit(maxIterations);
  if (safeMaxIterations !== maxIterations) {
    executorLogger.warn(LogCategory.EXECUTOR, 'Iteration limit adjusted for safety', {
      requested: maxIterations,
      adjusted: safeMaxIterations,
      absoluteLimit: ABSOLUTE_MAX_ITERATIONS
    });
  }
  
  // Validate request parameters
  executorLogger.debug(LogCategory.VALIDATION, 'Validating agent request parameters');
  const validation = validateAgentRequest({ userInput, context });
  if (!validation.valid) {
    executorLogger.error(LogCategory.VALIDATION, 'Agent request validation failed', {
      validationMessage: validation.message,
      errorType: validation.error?.type
    });
    
    executorLogger.endPerformanceTimer(executionId, { success: false, error: 'validation_failed' });
    
    return {
      success: false,
      response: validation.message,
      conversationHistory,
      metadata: { error: 'validation_failed' }
    };
  }
  
  executorLogger.debug(LogCategory.VALIDATION, 'Agent request validation successful');
  
  try {
    // Initialize working conversation history
    let workingHistory = [...conversationHistory];
    
    executorLogger.debug(LogCategory.EXECUTOR, 'Initializing conversation history', {
      existingHistoryLength: conversationHistory.length,
      workingHistoryLength: workingHistory.length
    });
    
    // Add user input to history if it's not already there
    const lastEntry = workingHistory[workingHistory.length - 1];
    if (!lastEntry || lastEntry.role !== 'user' || lastEntry.content !== userInput) {
      workingHistory = addToHistory(workingHistory, 'user', userInput);
      executorLogger.debug(LogCategory.CONVERSATION, 'Added user input to history', {
        userInputLength: userInput.length,
        newHistoryLength: workingHistory.length
      });
    }
    
    // Get available tools
    const availableTools = getEnhancedTools();
    const filteredTools = availableTools.filter(tool => 
      tool.agent_id === 'clarify' || 
      tool.agent_id === 'answerUser' || 
      (context.allowedTools && context.allowedTools.includes(tool.agent_id))
    );
    
    executorLogger.info(LogCategory.EXECUTOR, 'Tools configuration', {
      totalAvailableTools: availableTools.length,
      filteredToolsCount: filteredTools.length,
      allowedToolsCount: context.allowedTools?.length || 0,
      filteredTools: filteredTools.map(t => t.agent_id)
    });
    
    // Create execution context for tools
    const executionContext = createExecutionContext({
      ...context,
      availableTools: filteredTools
    });
    
    let currentIteration = 0;
    
    executorLogger.info(LogCategory.EXECUTOR, 'Starting main iteration loop', {
      maxIterations: safeMaxIterations,
      timeoutMs,
      startTime
    });
    
    // Main iteration loop with enhanced safety checks
    while (true) {
      const iterationId = `iteration_${currentIteration + 1}_${Date.now()}`;
      
      // Start iteration performance monitoring
      executorLogger.startPerformanceTimer(iterationId, {
        operation: 'single_iteration',
        iterationNumber: currentIteration + 1,
        conversationLength: workingHistory.length
      });
      
      executorLogger.info(LogCategory.ITERATION, `Starting iteration ${currentIteration + 1}/${safeMaxIterations}`, {
        iterationNumber: currentIteration + 1,
        maxIterations: safeMaxIterations,
        conversationLength: workingHistory.length,
        elapsedTime: Date.now() - startTime
      });
      
      // Log iteration details using conversation logger
      convLogger.logIteration(currentIteration + 1, safeMaxIterations);
      
      // Check if we should continue with enhanced safety mechanisms
      const continueDecision = shouldContinueIteration(
        workingHistory, 
        currentIteration, 
        safeMaxIterations, 
        startTime, 
        timeoutMs
      );
      
      if (!continueDecision.shouldContinue) {
        executorLogger.info(LogCategory.EXECUTOR, 'Stopping iteration loop', {
          reason: continueDecision.reason,
          safetyTrigger: continueDecision.safetyTrigger,
          gracefulExit: continueDecision.gracefulExit,
          iterationNumber: currentIteration + 1
        });
        
        // End iteration performance monitoring
        executorLogger.endPerformanceTimer(iterationId, {
          success: false,
          reason: continueDecision.reason,
          safetyTrigger: continueDecision.safetyTrigger
        });
        
        if (continueDecision.gracefulExit) {
          executorLogger.warn(LogCategory.EXECUTOR, 'Graceful exit triggered', {
            safetyTrigger: continueDecision.safetyTrigger,
            reason: continueDecision.reason,
            iterationsCompleted: currentIteration
          });
          
          const gracefulResponse = handleGracefulExit(workingHistory, userInput);
          // Add safety information to metadata
          gracefulResponse.metadata.safetyTrigger = continueDecision.safetyTrigger;
          gracefulResponse.metadata.safetyReason = continueDecision.reason;
          if (continueDecision.loopPattern) {
            gracefulResponse.metadata.loopPattern = continueDecision.loopPattern;
          }
          if (continueDecision.failureCount) {
            gracefulResponse.metadata.consecutiveFailures = continueDecision.failureCount;
          }
          
          // Log conversation end
          convLogger.logEnd(gracefulResponse, context);
          executorLogger.endPerformanceTimer(executionId, { 
            success: true, 
            gracefulExit: true,
            iterationsCompleted: currentIteration
          });
          
          return gracefulResponse;
        }
        break;
      }
      
      // REASON: Brain processes the current state and decides next action
      executorLogger.debug(LogCategory.BRAIN, 'Starting Brain reasoning phase', {
        iterationNumber: currentIteration + 1,
        conversationLength: workingHistory.length,
        availableToolsCount: filteredTools.length
      });
      
      let command;
      const brainTimer = `brain_${currentIteration + 1}_${Date.now()}`;
      
      try {
        // Start Brain performance monitoring
        executorLogger.startPerformanceTimer(brainTimer, {
          operation: 'brain_reasoning',
          iteration: currentIteration + 1,
          conversationLength: workingHistory.length
        });
        
        // Enhanced Brain processing with comprehensive context
        const brainPromise = processUserRequest({
          conversationHistory: workingHistory,
          availableTools: filteredTools,
          apiKey: context.apiKey,
          modelName: context.modelName,
          // Enhanced context for better Brain-Hands communication
          executionContext: {
            currentIteration: currentIteration + 1,
            maxIterations: safeMaxIterations,
            startTime,
            userInput,
            previousErrors: workingHistory
              .filter(entry => entry.role === 'tool' && entry.content && !entry.content.success)
              .slice(-3) // Last 3 errors for context
          }
        });
        
        const timeoutPromise = createTimeoutPromise(timeoutMs / 2); // Use half timeout for individual operations
        command = await Promise.race([brainPromise, timeoutPromise]);
        
        // End Brain performance monitoring
        const brainMetric = executorLogger.endPerformanceTimer(brainTimer, {
          success: !!command,
          hasCommand: !!command,
          commandTool: command?.tool_name
        });
        
        executorLogger.info(LogCategory.BRAIN, 'Brain reasoning completed', {
          iterationNumber: currentIteration + 1,
          hasCommand: !!command,
          commandTool: command?.tool_name,
          reasoningTime: brainMetric?.duration
        });
        
      } catch (error) {
        // End Brain performance monitoring on error
        executorLogger.endPerformanceTimer(brainTimer, {
          success: false,
          error: error.message
        });
        
        // Log Brain processing error
        executorLogger.logError(error, {
          operation: 'brain_processing',
          iteration: currentIteration + 1,
          conversationLength: workingHistory.length
        });
        
        // Enhanced error context for better debugging and recovery
        const errorContext = {
          iteration: currentIteration + 1,
          conversationLength: workingHistory.length,
          lastToolResult: workingHistory
            .filter(entry => entry.role === 'tool')
            .pop()?.content,
          errorType: error.message.includes('timed out') ? 'timeout' : 
                    error.message.includes('API') ? 'api_error' : 'processing_error',
          brainToHandsFeedback: {
            lastHandsResult: workingHistory
              .filter(entry => entry.role === 'tool')
              .pop()?.content,
            feedbackReceived: workingHistory.length > 0
          }
        };
        
        executorLogger.error(LogCategory.ERROR, 'Brain processing failed', {
          errorType: errorContext.errorType,
          iteration: currentIteration + 1,
          recoverable: error.recoverable
        });
        
        // End iteration and main performance monitoring
        executorLogger.endPerformanceTimer(iterationId, { success: false, error: 'brain_failed' });
        executorLogger.endPerformanceTimer(executionId, { success: false, error: 'brain_failed' });
        
        return {
          success: false,
          response: `I encountered an error while processing your request: ${error.message}`,
          conversationHistory: workingHistory,
          metadata: { 
            error: 'brain_processing_failed',
            ...errorContext
          }
        };
      }
      
      // If Brain returns null, it means no action is needed
      if (!command) {
        executorLogger.info(LogCategory.BRAIN, 'Brain returned no command - ending iteration', {
          iterationNumber: currentIteration + 1,
          reason: 'no_command_needed'
        });
        
        // End iteration performance monitoring
        executorLogger.endPerformanceTimer(iterationId, {
          success: true,
          reason: 'no_command_needed'
        });
        
        break;
      }
      
      // Log Brain decision using conversation logger
      convLogger.logIteration(currentIteration + 1, safeMaxIterations, command);
      
      // Add AI decision to history
      workingHistory = addToHistory(workingHistory, 'ai', command, {
        iteration: currentIteration + 1,
        reasoning: 'brain_decision'
      });
      
      executorLogger.debug(LogCategory.CONVERSATION, 'Added Brain decision to history', {
        iterationNumber: currentIteration + 1,
        commandTool: command.tool_name,
        historyLength: workingHistory.length
      });
      
      // ACT: Hands execute the command
      executorLogger.debug(LogCategory.HANDS, 'Starting Hands execution phase', {
        iterationNumber: currentIteration + 1,
        commandTool: command.tool_name,
        parameterCount: Object.keys(command.parameters).length
      });
      
      let toolResult;
      const handsTimer = `hands_${currentIteration + 1}_${Date.now()}`;
      
      try {
        // Start Hands performance monitoring
        executorLogger.startPerformanceTimer(handsTimer, {
          operation: 'hands_execution',
          iteration: currentIteration + 1,
          toolName: command.tool_name
        });
        
        executorLogger.info(LogCategory.HANDS, 'Executing command via Hands', {
          iterationNumber: currentIteration + 1,
          toolName: command.tool_name,
          parameters: Object.keys(command.parameters)
        });
        
        toolResult = await executeCommand(command, executionContext);
        
        // End Hands performance monitoring
        const handsMetric = executorLogger.endPerformanceTimer(handsTimer, {
          success: toolResult?.success !== false,
          toolName: command.tool_name,
          hasData: !!toolResult?.data
        });
        
        // Enhanced error propagation - ensure result has proper structure
        if (!toolResult || typeof toolResult !== 'object') {
          throw new Error('Tool execution returned invalid result format');
        }
        
        executorLogger.info(LogCategory.HANDS, 'Hands execution completed', {
          iterationNumber: currentIteration + 1,
          toolName: command.tool_name,
          success: toolResult.success,
          executionTime: handsMetric?.duration,
          hasData: !!toolResult.data,
          resultType: toolResult.data?.type
        });
        
        // Log Hands execution using conversation logger
        convLogger.logIteration(currentIteration + 1, safeMaxIterations, command, toolResult);
        
      } catch (error) {
        // End Hands performance monitoring on error
        executorLogger.endPerformanceTimer(handsTimer, {
          success: false,
          error: error.message,
          toolName: command.tool_name
        });
        
        // Log Hands execution error
        executorLogger.logError(error, {
          operation: 'hands_execution',
          iteration: currentIteration + 1,
          toolName: command.tool_name
        });
        
        // Enhanced error result with detailed error information
        toolResult = {
          success: false,
          message: `Tool execution failed: ${error.message}`,
          data: null,
          metadata: {
            errorType: 'execution_failure',
            originalError: error.message,
            toolName: command.tool_name,
            timestamp: Date.now()
          }
        };
        
        executorLogger.error(LogCategory.ERROR, 'Hands execution failed', {
          iterationNumber: currentIteration + 1,
          toolName: command.tool_name,
          errorType: 'execution_failure'
        });
      }
      
      // OBSERVE: Enhanced result feedback loop - Add comprehensive tool result to history
      const toolHistoryEntry = {
        tool_name: command.tool_name,
        success: toolResult.success,
        message: toolResult.message,
        data: toolResult.data,
        metadata: {
          ...toolResult.metadata,
          executionTime: Date.now(),
          iteration: currentIteration + 1
        }
      };
      
      workingHistory = addToHistory(workingHistory, 'tool', toolHistoryEntry, {
        iteration: currentIteration + 1,
        command: command,
        brainToHandsFlow: {
          brainCommand: command,
          handsResult: toolResult,
          feedbackComplete: true
        }
      });
      
      if (IS_DEBUG) {
        console.log(`Agent Executor: Iteration ${currentIteration + 1} completed`);
        console.log('Tool Result:', toolResult);
      }
      
      currentIteration++;
    }
    
    // Extract final response
    const finalResponse = extractFinalResponse(workingHistory);
    
    // End main performance monitoring
    const executionMetric = executorLogger.endPerformanceTimer(executionId, {
      success: true,
      iterationsCompleted: currentIteration,
      finalResponseLength: finalResponse.length
    });
    
    // Log conversation end
    const result = {
      success: true,
      response: finalResponse,
      conversationHistory: workingHistory,
      metadata: {
        iterationsUsed: currentIteration,
        maxIterations,
        completionReason: isTaskComplete(workingHistory) ? 'task_complete' : 'iteration_limit',
        totalExecutionTime: executionMetric?.duration
      }
    };
    
    convLogger.logEnd(result, context);
    
    executorLogger.info(LogCategory.EXECUTOR, 'Agent request execution completed successfully', {
      iterationsUsed: currentIteration,
      maxIterations,
      totalExecutionTime: executionMetric?.duration,
      finalResponseLength: finalResponse.length,
      completionReason: result.metadata.completionReason
    });
    
    return result;
    
  } catch (error) {
    // Use error handling framework for unexpected errors
    const handledError = await globalErrorHandler.handleError(error, {
      operation: { name: 'executeAgentRequest' },
      logContext: {
        userInputLength: userInput?.length,
        conversationLength: conversationHistory?.length,
        maxIterations: safeMaxIterations
      }
    });
    
    return {
      success: false,
      response: handledError.message || `I encountered an unexpected error: ${error.message}`,
      conversationHistory,
      metadata: { 
        error: 'unexpected_error',
        errorType: handledError.error?.type || 'unknown',
        recoverable: handledError.error?.recoverable || false,
        ...handledError.metadata
      }
    };
  }
};

/**
 * Creates a new conversation session
 * @param {string} initialUserInput - Initial user input
 * @param {Object} context - Execution context
 * @returns {Promise<Object>} New session result
 */
export const createNewSession = async (initialUserInput, context = {}) => {
  return await executeAgentRequest({
    userInput: initialUserInput,
    conversationHistory: [],
    context,
    maxIterations: 5
  });
};

/**
 * Continues an existing conversation session
 * @param {string} userInput - New user input
 * @param {Array} conversationHistory - Existing conversation history
 * @param {Object} context - Execution context
 * @returns {Promise<Object>} Continued session result
 */
export const continueSession = async (userInput, conversationHistory, context = {}) => {
  return await executeAgentRequest({
    userInput,
    conversationHistory,
    context,
    maxIterations: 5
  });
};

/**
 * Gets session statistics from conversation history
 * @param {Array} conversationHistory - Conversation history
 * @returns {Object} Session statistics
 */
export const getSessionStats = (conversationHistory = []) => {
  const userMessages = conversationHistory.filter(entry => entry.role === 'user').length;
  const aiDecisions = conversationHistory.filter(entry => entry.role === 'ai').length;
  const toolExecutions = conversationHistory.filter(entry => entry.role === 'tool').length;
  
  const toolsUsed = conversationHistory
    .filter(entry => entry.role === 'tool')
    .map(entry => entry.content?.tool_name)
    .filter(Boolean);
  
  const uniqueTools = [...new Set(toolsUsed)];
  
  return {
    userMessages,
    aiDecisions,
    toolExecutions,
    toolsUsed: toolsUsed.length,
    uniqueTools,
    isComplete: isTaskComplete(conversationHistory),
    totalEntries: conversationHistory.length
  };
};