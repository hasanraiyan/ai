// src/utils/logging.js

/**
 * Comprehensive Logging System for AI Agent Architecture
 * Provides structured logging, performance monitoring, and debugging capabilities
 */

import { IS_DEBUG } from '../constants';

/**
 * Log levels for different types of messages
 */
export const LogLevel = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  CRITICAL: 'critical'
};

/**
 * Log categories for organizing different types of logs
 */
export const LogCategory = {
  // Core components
  BRAIN: 'brain',
  HANDS: 'hands',
  EXECUTOR: 'executor',
  TOOLS: 'tools',
  
  // Operations
  CONVERSATION: 'conversation',
  ITERATION: 'iteration',
  COMMAND: 'command',
  RESPONSE: 'response',
  
  // Performance
  PERFORMANCE: 'performance',
  METRICS: 'metrics',
  TIMING: 'timing',
  
  // Errors and debugging
  ERROR: 'error',
  DEBUG: 'debug',
  VALIDATION: 'validation',
  
  // System
  SYSTEM: 'system',
  API: 'api',
  NETWORK: 'network'
};

/**
 * Performance metrics collector
 */
class PerformanceMetrics {
  constructor() {
    this.metrics = new Map();
    this.timers = new Map();
  }

  /**
   * Starts a performance timer
   */
  startTimer(name, metadata = {}) {
    this.timers.set(name, {
      startTime: Date.now(),
      startMemory: this.getMemoryUsage(),
      metadata
    });
  }

  /**
   * Ends a performance timer and records the metric
   */
  endTimer(name, additionalMetadata = {}) {
    const timer = this.timers.get(name);
    if (!timer) {
      console.warn(`Performance timer '${name}' not found`);
      return null;
    }

    const endTime = Date.now();
    const endMemory = this.getMemoryUsage();
    
    const metric = {
      name,
      duration: endTime - timer.startTime,
      memoryDelta: endMemory - timer.startMemory,
      timestamp: endTime,
      metadata: { ...timer.metadata, ...additionalMetadata }
    };

    this.metrics.set(`${name}_${endTime}`, metric);
    this.timers.delete(name);

    return metric;
  }

  /**
   * Records a custom metric
   */
  recordMetric(name, value, unit = 'count', metadata = {}) {
    const metric = {
      name,
      value,
      unit,
      timestamp: Date.now(),
      metadata
    };

    this.metrics.set(`${name}_${Date.now()}`, metric);
    return metric;
  }

  /**
   * Gets memory usage if available
   */
  getMemoryUsage() {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed;
    }
    return 0;
  }

  /**
   * Gets all metrics
   */
  getMetrics() {
    return Array.from(this.metrics.values());
  }

  /**
   * Gets metrics by name pattern
   */
  getMetricsByName(namePattern) {
    return this.getMetrics().filter(metric => 
      metric.name.includes(namePattern)
    );
  }

  /**
   * Clears old metrics (keeps last 1000)
   */
  cleanup() {
    const metrics = this.getMetrics();
    if (metrics.length > 1000) {
      const sorted = metrics.sort((a, b) => b.timestamp - a.timestamp);
      const toKeep = sorted.slice(0, 1000);
      
      this.metrics.clear();
      toKeep.forEach(metric => {
        this.metrics.set(`${metric.name}_${metric.timestamp}`, metric);
      });
    }
  }
}

/**
 * Main logger class with structured logging capabilities
 */
class Logger {
  constructor(options = {}) {
    this.component = options.component || 'unknown';
    this.enableConsole = options.enableConsole !== false;
    this.enableMetrics = options.enableMetrics !== false;
    this.minLevel = options.minLevel || (IS_DEBUG ? LogLevel.DEBUG : LogLevel.INFO);
    this.metrics = new PerformanceMetrics();
    this.sessionId = this.generateSessionId();
    this.logBuffer = [];
    this.maxBufferSize = options.maxBufferSize || 1000;
  }

  /**
   * Generates a unique session ID
   */
  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Determines if a log level should be output
   */
  shouldLog(level) {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR, LogLevel.CRITICAL];
    const currentIndex = levels.indexOf(this.minLevel);
    const messageIndex = levels.indexOf(level);
    return messageIndex >= currentIndex;
  }

  /**
   * Creates a structured log entry
   */
  createLogEntry(level, category, message, data = {}, metadata = {}) {
    return {
      timestamp: Date.now(),
      sessionId: this.sessionId,
      level,
      category,
      component: this.component,
      message,
      data,
      metadata: {
        ...metadata,
        memoryUsage: this.metrics.getMemoryUsage()
      }
    };
  }

  /**
   * Adds log entry to buffer and optionally outputs to console
   */
  log(level, category, message, data = {}, metadata = {}) {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry = this.createLogEntry(level, category, message, data, metadata);
    
    // Add to buffer
    this.logBuffer.push(entry);
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer.shift(); // Remove oldest entry
    }

    // Output to console if enabled
    if (this.enableConsole) {
      this.outputToConsole(entry);
    }

    return entry;
  }

  /**
   * Outputs log entry to console with appropriate formatting
   */
  outputToConsole(entry) {
    const timestamp = new Date(entry.timestamp).toISOString();
    const prefix = `[${timestamp}] [${entry.level.toUpperCase()}] [${entry.component}:${entry.category}]`;
    
    const hasData = Object.keys(entry.data).length > 0;
    const hasMetadata = Object.keys(entry.metadata).length > 1; // More than just memoryUsage

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(prefix, entry.message);
        if (hasData) console.debug('  Data:', entry.data);
        if (hasMetadata) console.debug('  Metadata:', entry.metadata);
        break;
      
      case LogLevel.INFO:
        console.info(prefix, entry.message);
        if (hasData) console.info('  Data:', entry.data);
        break;
      
      case LogLevel.WARN:
        console.warn(prefix, entry.message);
        if (hasData) console.warn('  Data:', entry.data);
        if (hasMetadata) console.warn('  Metadata:', entry.metadata);
        break;
      
      case LogLevel.ERROR:
      case LogLevel.CRITICAL:
        console.error(prefix, entry.message);
        if (hasData) console.error('  Data:', entry.data);
        if (hasMetadata) console.error('  Metadata:', entry.metadata);
        break;
    }
  }

  /**
   * Convenience methods for different log levels
   */
  debug(category, message, data, metadata) {
    return this.log(LogLevel.DEBUG, category, message, data, metadata);
  }

  info(category, message, data, metadata) {
    return this.log(LogLevel.INFO, category, message, data, metadata);
  }

  warn(category, message, data, metadata) {
    return this.log(LogLevel.WARN, category, message, data, metadata);
  }

  error(category, message, data, metadata) {
    return this.log(LogLevel.ERROR, category, message, data, metadata);
  }

  critical(category, message, data, metadata) {
    return this.log(LogLevel.CRITICAL, category, message, data, metadata);
  }

  /**
   * Performance logging methods
   */
  startPerformanceTimer(name, metadata = {}) {
    if (this.enableMetrics) {
      this.metrics.startTimer(name, metadata);
      this.debug(LogCategory.PERFORMANCE, `Started timer: ${name}`, { name }, metadata);
    }
  }

  endPerformanceTimer(name, additionalMetadata = {}) {
    if (this.enableMetrics) {
      const metric = this.metrics.endTimer(name, additionalMetadata);
      if (metric) {
        this.info(LogCategory.PERFORMANCE, `Timer completed: ${name}`, {
          duration: metric.duration,
          memoryDelta: metric.memoryDelta
        }, metric.metadata);
      }
      return metric;
    }
    return null;
  }

  recordMetric(name, value, unit = 'count', metadata = {}) {
    if (this.enableMetrics) {
      const metric = this.metrics.recordMetric(name, value, unit, metadata);
      this.debug(LogCategory.METRICS, `Metric recorded: ${name}`, {
        value,
        unit
      }, metadata);
      return metric;
    }
    return null;
  }

  /**
   * Conversation flow logging
   */
  logConversationStart(userInput, metadata = {}) {
    return this.info(LogCategory.CONVERSATION, 'Conversation started', {
      userInputLength: userInput?.length,
      hasInput: !!userInput
    }, metadata);
  }

  logConversationEnd(result, metadata = {}) {
    return this.info(LogCategory.CONVERSATION, 'Conversation ended', {
      success: result?.success,
      responseLength: result?.response?.length,
      iterationsUsed: result?.metadata?.iterationsUsed
    }, metadata);
  }

  logIterationStart(iteration, maxIterations, metadata = {}) {
    return this.debug(LogCategory.ITERATION, `Iteration ${iteration}/${maxIterations} started`, {
      iteration,
      maxIterations,
      progress: iteration / maxIterations
    }, metadata);
  }

  logIterationEnd(iteration, result, metadata = {}) {
    return this.debug(LogCategory.ITERATION, `Iteration ${iteration} completed`, {
      iteration,
      success: result?.success,
      hasCommand: !!result?.command
    }, metadata);
  }

  /**
   * Brain and Hands communication logging
   */
  logBrainDecision(command, metadata = {}) {
    return this.info(LogCategory.BRAIN, 'Brain made decision', {
      toolName: command?.tool_name,
      hasParameters: !!command?.parameters,
      parameterCount: command?.parameters ? Object.keys(command.parameters).length : 0
    }, metadata);
  }

  logHandsExecution(command, result, metadata = {}) {
    return this.info(LogCategory.HANDS, 'Hands executed command', {
      toolName: command?.tool_name,
      success: result?.success,
      executionTime: result?.metadata?.executionTime,
      hasData: !!result?.data
    }, metadata);
  }

  /**
   * Error logging with context
   */
  logError(error, context = {}) {
    const errorData = {
      errorType: error.type || 'unknown',
      errorName: error.name || 'Error',
      recoverable: error.recoverable,
      severity: error.severity
    };

    return this.error(LogCategory.ERROR, error.message, errorData, {
      context,
      stack: IS_DEBUG ? error.stack : undefined
    });
  }

  /**
   * API call logging
   */
  logApiCall(endpoint, method, metadata = {}) {
    return this.debug(LogCategory.API, `API call: ${method} ${endpoint}`, {
      endpoint,
      method
    }, metadata);
  }

  logApiResponse(endpoint, status, responseTime, metadata = {}) {
    const level = status >= 400 ? LogLevel.WARN : LogLevel.DEBUG;
    return this.log(level, LogCategory.API, `API response: ${endpoint}`, {
      status,
      responseTime,
      success: status < 400
    }, metadata);
  }

  /**
   * Gets recent logs
   */
  getRecentLogs(count = 100) {
    return this.logBuffer.slice(-count);
  }

  /**
   * Gets logs by category
   */
  getLogsByCategory(category, count = 100) {
    return this.logBuffer
      .filter(entry => entry.category === category)
      .slice(-count);
  }

  /**
   * Gets logs by level
   */
  getLogsByLevel(level, count = 100) {
    return this.logBuffer
      .filter(entry => entry.level === level)
      .slice(-count);
  }

  /**
   * Gets performance metrics
   */
  getPerformanceMetrics() {
    return this.metrics.getMetrics();
  }

  /**
   * Exports logs for analysis
   */
  exportLogs(options = {}) {
    const logs = options.category 
      ? this.getLogsByCategory(options.category, options.count)
      : this.getRecentLogs(options.count);

    return {
      sessionId: this.sessionId,
      component: this.component,
      exportTime: Date.now(),
      logCount: logs.length,
      logs,
      metrics: options.includeMetrics ? this.getPerformanceMetrics() : undefined
    };
  }

  /**
   * Cleanup old logs and metrics
   */
  cleanup() {
    // Keep only recent logs
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer = this.logBuffer.slice(-this.maxBufferSize);
    }
    
    // Cleanup metrics
    if (this.enableMetrics) {
      this.metrics.cleanup();
    }
  }
}

/**
 * Component-specific logger factory
 */
export const createLogger = (component, options = {}) => {
  return new Logger({
    component,
    ...options
  });
};

/**
 * Global loggers for different components
 */
export const brainLogger = createLogger('brain');
export const handsLogger = createLogger('hands');
export const executorLogger = createLogger('executor');
export const toolsLogger = createLogger('tools');
export const systemLogger = createLogger('system');

/**
 * Utility function to log function execution with performance metrics
 */
export const loggedExecution = (logger, category, operationName) => {
  return (target, propertyKey, descriptor) => {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function(...args) {
      const timerName = `${operationName}_${Date.now()}`;
      logger.startPerformanceTimer(timerName, {
        operation: operationName,
        component: logger.component
      });
      
      try {
        logger.debug(category, `Starting ${operationName}`, {
          argumentCount: args.length
        });
        
        const result = await originalMethod.apply(this, args);
        
        logger.debug(category, `Completed ${operationName}`, {
          success: true,
          hasResult: !!result
        });
        
        return result;
      } catch (error) {
        logger.error(category, `Failed ${operationName}`, {
          error: error.message,
          errorType: error.constructor.name
        });
        throw error;
      } finally {
        logger.endPerformanceTimer(timerName);
      }
    };
    
    return descriptor;
  };
};

/**
 * Middleware for logging conversation flow
 */
export const conversationLogger = (logger) => {
  return {
    logStart: (userInput, context) => {
      logger.logConversationStart(userInput, {
        contextKeys: Object.keys(context),
        timestamp: Date.now()
      });
    },
    
    logEnd: (result, context) => {
      logger.logConversationEnd(result, {
        contextKeys: Object.keys(context),
        timestamp: Date.now()
      });
    },
    
    logIteration: (iteration, maxIterations, command, result) => {
      logger.logIterationStart(iteration, maxIterations);
      if (command) {
        logger.logBrainDecision(command);
      }
      if (result) {
        logger.logHandsExecution(command, result);
        logger.logIterationEnd(iteration, result);
      }
    }
  };
};

/**
 * Debug helper for logging object structures
 */
export const logObjectStructure = (logger, obj, name = 'object') => {
  if (!IS_DEBUG) return;
  
  const structure = {
    type: typeof obj,
    isArray: Array.isArray(obj),
    keys: obj && typeof obj === 'object' ? Object.keys(obj) : [],
    length: obj?.length,
    hasData: !!obj
  };
  
  logger.debug(LogCategory.DEBUG, `Object structure: ${name}`, structure);
};

export { Logger, PerformanceMetrics };