// src/utils/errorHandling.js

/**
 * Comprehensive Error Handling Framework for AI Agent Architecture
 * Provides standardized error types, handling patterns, and recovery mechanisms
 */

/**
 * Standard error types for the AI agent system
 */
export const ErrorTypes = {
  // Validation errors
  VALIDATION_ERROR: 'validation_error',
  PARAMETER_VALIDATION_ERROR: 'parameter_validation_error',
  
  // Authentication and authorization errors
  AUTHORIZATION_ERROR: 'authorization_error',
  API_KEY_ERROR: 'api_key_error',
  
  // API and network errors
  API_ERROR: 'api_error',
  NETWORK_ERROR: 'network_error',
  TIMEOUT_ERROR: 'timeout_error',
  RATE_LIMIT_ERROR: 'rate_limit_error',
  
  // Processing errors
  PROCESSING_ERROR: 'processing_error',
  JSON_PARSE_ERROR: 'json_parse_error',
  COMMAND_PARSE_ERROR: 'command_parse_error',
  
  // Tool execution errors
  TOOL_NOT_FOUND: 'tool_not_found',
  TOOL_EXECUTION_ERROR: 'tool_execution_error',
  TOOL_TIMEOUT_ERROR: 'tool_timeout_error',
  
  // Brain service errors
  BRAIN_PROCESSING_ERROR: 'brain_processing_error',
  PROMPT_GENERATION_ERROR: 'prompt_generation_error',
  LLM_RESPONSE_ERROR: 'llm_response_error',
  
  // Hands service errors
  HANDS_EXECUTION_ERROR: 'hands_execution_error',
  COMMAND_VALIDATION_ERROR: 'command_validation_error',
  
  // Agent executor errors
  ITERATION_LIMIT_ERROR: 'iteration_limit_error',
  INFINITE_LOOP_ERROR: 'infinite_loop_error',
  CONSECUTIVE_FAILURES_ERROR: 'consecutive_failures_error',
  
  // System errors
  SYSTEM_ERROR: 'system_error',
  MEMORY_ERROR: 'memory_error',
  CONFIGURATION_ERROR: 'configuration_error',
  
  // User interaction errors
  USER_INPUT_ERROR: 'user_input_error',
  CLARIFICATION_ERROR: 'clarification_error'
};

/**
 * Error severity levels
 */
export const ErrorSeverity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

/**
 * Recovery strategies for different error types
 */
export const RecoveryStrategy = {
  RETRY: 'retry',
  FALLBACK: 'fallback',
  GRACEFUL_DEGRADATION: 'graceful_degradation',
  USER_INTERVENTION: 'user_intervention',
  ABORT: 'abort'
};

/**
 * Base error class for AI agent system
 */
export class AgentError extends Error {
  constructor(message, type = ErrorTypes.SYSTEM_ERROR, severity = ErrorSeverity.MEDIUM, metadata = {}) {
    super(message);
    this.name = 'AgentError';
    this.type = type;
    this.severity = severity;
    this.metadata = metadata;
    this.timestamp = Date.now();
    this.recoverable = this.determineRecoverability();
    this.recoveryStrategy = this.determineRecoveryStrategy();
  }

  /**
   * Determines if the error is recoverable based on type and severity
   */
  determineRecoverability() {
    const nonRecoverableTypes = [
      ErrorTypes.API_KEY_ERROR,
      ErrorTypes.CONFIGURATION_ERROR,
      ErrorTypes.SYSTEM_ERROR
    ];
    
    const criticalSeverity = this.severity === ErrorSeverity.CRITICAL;
    const nonRecoverableType = nonRecoverableTypes.includes(this.type);
    
    return !criticalSeverity && !nonRecoverableType;
  }

  /**
   * Determines the appropriate recovery strategy
   */
  determineRecoveryStrategy() {
    const retryableTypes = [
      ErrorTypes.API_ERROR,
      ErrorTypes.NETWORK_ERROR,
      ErrorTypes.TIMEOUT_ERROR,
      ErrorTypes.RATE_LIMIT_ERROR
    ];
    
    const fallbackTypes = [
      ErrorTypes.TOOL_NOT_FOUND,
      ErrorTypes.JSON_PARSE_ERROR,
      ErrorTypes.LLM_RESPONSE_ERROR
    ];
    
    const userInterventionTypes = [
      ErrorTypes.USER_INPUT_ERROR,
      ErrorTypes.CLARIFICATION_ERROR,
      ErrorTypes.PARAMETER_VALIDATION_ERROR
    ];
    
    if (retryableTypes.includes(this.type)) {
      return RecoveryStrategy.RETRY;
    } else if (fallbackTypes.includes(this.type)) {
      return RecoveryStrategy.FALLBACK;
    } else if (userInterventionTypes.includes(this.type)) {
      return RecoveryStrategy.USER_INTERVENTION;
    } else if (this.severity === ErrorSeverity.CRITICAL) {
      return RecoveryStrategy.ABORT;
    } else {
      return RecoveryStrategy.GRACEFUL_DEGRADATION;
    }
  }

  /**
   * Converts error to a standardized result object
   */
  toResult() {
    return {
      success: false,
      message: this.message,
      data: null,
      error: {
        type: this.type,
        severity: this.severity,
        recoverable: this.recoverable,
        recoveryStrategy: this.recoveryStrategy,
        timestamp: this.timestamp,
        metadata: this.metadata
      }
    };
  }

  /**
   * Gets user-friendly error message
   */
  getUserFriendlyMessage() {
    const userFriendlyMessages = {
      [ErrorTypes.API_KEY_ERROR]: "I'm having trouble connecting to the AI service. Please check your API configuration.",
      [ErrorTypes.NETWORK_ERROR]: "I'm experiencing network connectivity issues. Please try again in a moment.",
      [ErrorTypes.TIMEOUT_ERROR]: "The request is taking longer than expected. Please try again.",
      [ErrorTypes.RATE_LIMIT_ERROR]: "I'm being rate limited by the AI service. Please wait a moment before trying again.",
      [ErrorTypes.TOOL_NOT_FOUND]: "I tried to use a tool that isn't available. Let me try a different approach.",
      [ErrorTypes.PARAMETER_VALIDATION_ERROR]: "I need more specific information to help you. Could you provide more details?",
      [ErrorTypes.ITERATION_LIMIT_ERROR]: "I've reached my processing limit for this request. Let me provide what I've accomplished so far.",
      [ErrorTypes.INFINITE_LOOP_ERROR]: "I detected I was repeating the same actions. Let me try a different approach.",
      [ErrorTypes.USER_INPUT_ERROR]: "I need clarification on your request to help you better."
    };

    return userFriendlyMessages[this.type] || this.message;
  }
}

/**
 * Specific error classes for different components
 */
export class BrainError extends AgentError {
  constructor(message, type = ErrorTypes.BRAIN_PROCESSING_ERROR, metadata = {}) {
    super(message, type, ErrorSeverity.HIGH, { component: 'brain', ...metadata });
    this.name = 'BrainError';
  }
}

export class HandsError extends AgentError {
  constructor(message, type = ErrorTypes.HANDS_EXECUTION_ERROR, metadata = {}) {
    super(message, type, ErrorSeverity.MEDIUM, { component: 'hands', ...metadata });
    this.name = 'HandsError';
  }
}

export class ToolError extends AgentError {
  constructor(message, toolName, type = ErrorTypes.TOOL_EXECUTION_ERROR, metadata = {}) {
    super(message, type, ErrorSeverity.MEDIUM, { component: 'tool', toolName, ...metadata });
    this.name = 'ToolError';
  }
}

export class ExecutorError extends AgentError {
  constructor(message, type = ErrorTypes.PROCESSING_ERROR, metadata = {}) {
    super(message, type, ErrorSeverity.HIGH, { component: 'executor', ...metadata });
    this.name = 'ExecutorError';
  }
}

/**
 * Error handler with retry logic and recovery mechanisms
 */
export class ErrorHandler {
  constructor(options = {}) {
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 1000;
    this.backoffMultiplier = options.backoffMultiplier || 2;
    this.enableLogging = options.enableLogging !== false;
  }

  /**
   * Handles an error with appropriate recovery strategy
   */
  async handleError(error, context = {}) {
    const agentError = this.normalizeError(error);
    
    if (this.enableLogging) {
      this.logError(agentError, context);
    }

    switch (agentError.recoveryStrategy) {
      case RecoveryStrategy.RETRY:
        return await this.handleRetry(agentError, context);
      
      case RecoveryStrategy.FALLBACK:
        return await this.handleFallback(agentError, context);
      
      case RecoveryStrategy.GRACEFUL_DEGRADATION:
        return this.handleGracefulDegradation(agentError, context);
      
      case RecoveryStrategy.USER_INTERVENTION:
        return this.handleUserIntervention(agentError, context);
      
      case RecoveryStrategy.ABORT:
        return this.handleAbort(agentError, context);
      
      default:
        return agentError.toResult();
    }
  }

  /**
   * Normalizes any error to AgentError
   */
  normalizeError(error) {
    if (error instanceof AgentError) {
      return error;
    }

    // Detect error type from message patterns
    let errorType = ErrorTypes.SYSTEM_ERROR;
    let severity = ErrorSeverity.MEDIUM;

    if (error.message.includes('API') || error.message.includes('api')) {
      errorType = ErrorTypes.API_ERROR;
    } else if (error.message.includes('timeout') || error.message.includes('timed out')) {
      errorType = ErrorTypes.TIMEOUT_ERROR;
    } else if (error.message.includes('network') || error.message.includes('ENOTFOUND')) {
      errorType = ErrorTypes.NETWORK_ERROR;
    } else if (error.message.includes('JSON') || error.message.includes('parse')) {
      errorType = ErrorTypes.JSON_PARSE_ERROR;
    } else if (error.message.includes('validation')) {
      errorType = ErrorTypes.VALIDATION_ERROR;
    }

    return new AgentError(error.message, errorType, severity, {
      originalError: error.name,
      stack: error.stack
    });
  }

  /**
   * Handles retry strategy with exponential backoff
   */
  async handleRetry(error, context) {
    const { operation, attempt = 0 } = context;
    
    if (!operation || attempt >= this.maxRetries) {
      return error.toResult();
    }

    const delay = this.retryDelay * Math.pow(this.backoffMultiplier, attempt);
    
    if (this.enableLogging) {
      console.log(`Retrying operation after ${delay}ms (attempt ${attempt + 1}/${this.maxRetries})`);
    }

    await this.sleep(delay);

    try {
      return await operation({ ...context, attempt: attempt + 1 });
    } catch (retryError) {
      return await this.handleError(retryError, { ...context, attempt: attempt + 1 });
    }
  }

  /**
   * Handles fallback strategy
   */
  async handleFallback(error, context) {
    const { fallbackOperation } = context;
    
    if (!fallbackOperation) {
      return this.handleGracefulDegradation(error, context);
    }

    try {
      if (this.enableLogging) {
        console.log('Attempting fallback operation due to error:', error.type);
      }
      
      return await fallbackOperation(context);
    } catch (fallbackError) {
      return this.handleGracefulDegradation(error, context);
    }
  }

  /**
   * Handles graceful degradation
   */
  handleGracefulDegradation(error, context) {
    const degradedResult = {
      success: false,
      message: error.getUserFriendlyMessage(),
      data: null,
      metadata: {
        degraded: true,
        originalError: error.type,
        partialResult: context.partialResult || null
      }
    };

    if (this.enableLogging) {
      console.log('Graceful degradation applied for error:', error.type);
    }

    return degradedResult;
  }

  /**
   * Handles user intervention requirement
   */
  handleUserIntervention(error, context) {
    return {
      success: false,
      message: error.getUserFriendlyMessage(),
      data: {
        type: 'user_intervention_required',
        errorType: error.type,
        suggestions: this.getUserInterventionSuggestions(error),
        context: context.userContext || {}
      },
      requiresUserResponse: true
    };
  }

  /**
   * Handles abort strategy
   */
  handleAbort(error, context) {
    if (this.enableLogging) {
      console.error('Critical error - aborting operation:', error.message);
    }

    return {
      success: false,
      message: error.getUserFriendlyMessage(),
      data: null,
      metadata: {
        aborted: true,
        criticalError: true,
        errorType: error.type
      }
    };
  }

  /**
   * Gets user intervention suggestions based on error type
   */
  getUserInterventionSuggestions(error) {
    const suggestions = {
      [ErrorTypes.PARAMETER_VALIDATION_ERROR]: [
        "Please provide more specific details about what you need",
        "Try rephrasing your request with additional context"
      ],
      [ErrorTypes.USER_INPUT_ERROR]: [
        "Please clarify your request",
        "Provide more specific information about what you're looking for"
      ],
      [ErrorTypes.CLARIFICATION_ERROR]: [
        "Please answer the clarification question",
        "Provide the requested additional information"
      ]
    };

    return suggestions[error.type] || ["Please try rephrasing your request"];
  }

  /**
   * Logs error with appropriate level
   */
  logError(error, context) {
    const logData = {
      type: error.type,
      severity: error.severity,
      message: error.message,
      timestamp: error.timestamp,
      context: {
        component: error.metadata.component,
        operation: context.operation?.name,
        ...context.logContext
      }
    };

    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        console.error('CRITICAL ERROR:', logData);
        break;
      case ErrorSeverity.HIGH:
        console.error('HIGH SEVERITY ERROR:', logData);
        break;
      case ErrorSeverity.MEDIUM:
        console.warn('MEDIUM SEVERITY ERROR:', logData);
        break;
      case ErrorSeverity.LOW:
        console.log('LOW SEVERITY ERROR:', logData);
        break;
    }
  }

  /**
   * Sleep utility for retry delays
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Global error handler instance
 */
export const globalErrorHandler = new ErrorHandler({
  maxRetries: 3,
  retryDelay: 1000,
  backoffMultiplier: 2,
  enableLogging: true
});

/**
 * Utility functions for common error handling patterns
 */

/**
 * Wraps an async function with error handling
 */
export const withErrorHandling = (fn, errorHandler = globalErrorHandler) => {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      return await errorHandler.handleError(error, { operation: fn });
    }
  };
};

/**
 * Creates a safe version of a function that won't throw
 */
export const makeSafe = (fn, defaultValue = null) => {
  return (...args) => {
    try {
      return fn(...args);
    } catch (error) {
      console.warn('Safe function caught error:', error.message);
      return defaultValue;
    }
  };
};

/**
 * Validates required parameters and throws appropriate error
 */
export const validateRequired = (params, requiredFields, context = '') => {
  const missing = requiredFields.filter(field => 
    params[field] === undefined || params[field] === null || params[field] === ''
  );

  if (missing.length > 0) {
    throw new AgentError(
      `Missing required parameters: ${missing.join(', ')}${context ? ` in ${context}` : ''}`,
      ErrorTypes.PARAMETER_VALIDATION_ERROR,
      ErrorSeverity.MEDIUM,
      { missingFields: missing, context }
    );
  }
};

/**
 * Creates a timeout wrapper for promises
 */
export const withTimeout = (promise, timeoutMs, errorMessage = 'Operation timed out') => {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      reject(new AgentError(errorMessage, ErrorTypes.TIMEOUT_ERROR, ErrorSeverity.MEDIUM, {
        timeoutMs
      }));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]);
};

/**
 * Formats error for user display
 */
export const formatErrorForUser = (error) => {
  const agentError = error instanceof AgentError ? error : new AgentError(error.message);
  
  return {
    message: agentError.getUserFriendlyMessage(),
    canRetry: agentError.recoverable && agentError.recoveryStrategy === RecoveryStrategy.RETRY,
    requiresInput: agentError.recoveryStrategy === RecoveryStrategy.USER_INTERVENTION,
    severity: agentError.severity
  };
};