// src/utils/__tests__/errorHandling.test.js

import {
  AgentError,
  BrainError,
  HandsError,
  ToolError,
  ExecutorError,
  ErrorHandler,
  ErrorTypes,
  ErrorSeverity,
  RecoveryStrategy,
  globalErrorHandler,
  withErrorHandling,
  makeSafe,
  validateRequired,
  withTimeout,
  formatErrorForUser
} from '../errorHandling';

describe('Error Handling Framework', () => {
  describe('AgentError', () => {
    test('should create basic AgentError with defaults', () => {
      const error = new AgentError('Test error');
      
      expect(error.message).toBe('Test error');
      expect(error.type).toBe(ErrorTypes.SYSTEM_ERROR);
      expect(error.severity).toBe(ErrorSeverity.MEDIUM);
      expect(error.timestamp).toBeGreaterThan(0);
      expect(error.recoverable).toBe(true);
    });

    test('should create AgentError with custom properties', () => {
      const metadata = { component: 'test' };
      const error = new AgentError(
        'Custom error',
        ErrorTypes.API_ERROR,
        ErrorSeverity.HIGH,
        metadata
      );
      
      expect(error.type).toBe(ErrorTypes.API_ERROR);
      expect(error.severity).toBe(ErrorSeverity.HIGH);
      expect(error.metadata).toEqual(metadata);
    });

    test('should determine recoverability correctly', () => {
      const recoverableError = new AgentError('Test', ErrorTypes.API_ERROR, ErrorSeverity.MEDIUM);
      const nonRecoverableError = new AgentError('Test', ErrorTypes.API_KEY_ERROR, ErrorSeverity.CRITICAL);
      
      expect(recoverableError.recoverable).toBe(true);
      expect(nonRecoverableError.recoverable).toBe(false);
    });

    test('should determine recovery strategy correctly', () => {
      const retryError = new AgentError('Test', ErrorTypes.API_ERROR);
      const fallbackError = new AgentError('Test', ErrorTypes.TOOL_NOT_FOUND);
      const userError = new AgentError('Test', ErrorTypes.USER_INPUT_ERROR);
      const criticalError = new AgentError('Test', ErrorTypes.SYSTEM_ERROR, ErrorSeverity.CRITICAL);
      
      expect(retryError.recoveryStrategy).toBe(RecoveryStrategy.RETRY);
      expect(fallbackError.recoveryStrategy).toBe(RecoveryStrategy.FALLBACK);
      expect(userError.recoveryStrategy).toBe(RecoveryStrategy.USER_INTERVENTION);
      expect(criticalError.recoveryStrategy).toBe(RecoveryStrategy.ABORT);
    });

    test('should convert to result object', () => {
      const error = new AgentError('Test error', ErrorTypes.API_ERROR);
      const result = error.toResult();
      
      expect(result.success).toBe(false);
      expect(result.message).toBe('Test error');
      expect(result.data).toBe(null);
      expect(result.error.type).toBe(ErrorTypes.API_ERROR);
      expect(result.error.recoverable).toBe(true);
    });

    test('should provide user-friendly messages', () => {
      const apiError = new AgentError('API failed', ErrorTypes.API_KEY_ERROR);
      const networkError = new AgentError('Network failed', ErrorTypes.NETWORK_ERROR);
      const unknownError = new AgentError('Unknown error', ErrorTypes.SYSTEM_ERROR);
      
      expect(apiError.getUserFriendlyMessage()).toContain('API configuration');
      expect(networkError.getUserFriendlyMessage()).toContain('network connectivity');
      expect(unknownError.getUserFriendlyMessage()).toBe('Unknown error');
    });
  });

  describe('Specific Error Classes', () => {
    test('should create BrainError with correct properties', () => {
      const error = new BrainError('Brain failed');
      
      expect(error.name).toBe('BrainError');
      expect(error.type).toBe(ErrorTypes.BRAIN_PROCESSING_ERROR);
      expect(error.severity).toBe(ErrorSeverity.HIGH);
      expect(error.metadata.component).toBe('brain');
    });

    test('should create HandsError with correct properties', () => {
      const error = new HandsError('Hands failed');
      
      expect(error.name).toBe('HandsError');
      expect(error.type).toBe(ErrorTypes.HANDS_EXECUTION_ERROR);
      expect(error.severity).toBe(ErrorSeverity.MEDIUM);
      expect(error.metadata.component).toBe('hands');
    });

    test('should create ToolError with tool name', () => {
      const error = new ToolError('Tool failed', 'testTool');
      
      expect(error.name).toBe('ToolError');
      expect(error.metadata.toolName).toBe('testTool');
      expect(error.metadata.component).toBe('tool');
    });

    test('should create ExecutorError with correct properties', () => {
      const error = new ExecutorError('Executor failed');
      
      expect(error.name).toBe('ExecutorError');
      expect(error.severity).toBe(ErrorSeverity.HIGH);
      expect(error.metadata.component).toBe('executor');
    });
  });

  describe('ErrorHandler', () => {
    let errorHandler;

    beforeEach(() => {
      errorHandler = new ErrorHandler({
        maxRetries: 2,
        retryDelay: 100,
        enableLogging: false
      });
    });

    test('should normalize regular Error to AgentError', async () => {
      const regularError = new Error('Regular error');
      const result = await errorHandler.handleError(regularError);
      
      expect(result.success).toBe(false);
      expect(result.error.type).toBe(ErrorTypes.SYSTEM_ERROR);
    });

    test('should detect API errors from message', async () => {
      const apiError = new Error('API request failed');
      const result = await errorHandler.handleError(apiError);
      
      expect(result.error.type).toBe(ErrorTypes.API_ERROR);
    });

    test('should detect timeout errors from message', async () => {
      const timeoutError = new Error('Request timed out');
      const result = await errorHandler.handleError(timeoutError);
      
      expect(result.error.type).toBe(ErrorTypes.TIMEOUT_ERROR);
    });

    test('should handle graceful degradation', async () => {
      const error = new AgentError('Test error', ErrorTypes.PROCESSING_ERROR);
      const context = { partialResult: { data: 'partial' } };
      
      const result = await errorHandler.handleError(error, context);
      
      expect(result.success).toBe(false);
      expect(result.metadata.degraded).toBe(true);
      expect(result.metadata.partialResult).toEqual({ data: 'partial' });
    });

    test('should handle user intervention', async () => {
      const error = new AgentError('Need input', ErrorTypes.USER_INPUT_ERROR);
      const result = await errorHandler.handleError(error);
      
      expect(result.success).toBe(false);
      expect(result.requiresUserResponse).toBe(true);
      expect(result.data.type).toBe('user_intervention_required');
      expect(result.data.suggestions).toBeInstanceOf(Array);
    });

    test('should handle abort for critical errors', async () => {
      const error = new AgentError('Critical error', ErrorTypes.SYSTEM_ERROR, ErrorSeverity.CRITICAL);
      const result = await errorHandler.handleError(error);
      
      expect(result.success).toBe(false);
      expect(result.metadata.aborted).toBe(true);
      expect(result.metadata.criticalError).toBe(true);
    });

    test('should handle retry with operation', async () => {
      let attempts = 0;
      const operation = jest.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 2) {
          throw new AgentError('Retry error', ErrorTypes.API_ERROR);
        }
        return { success: true, data: 'success' };
      });

      const context = { operation };
      const error = new AgentError('Initial error', ErrorTypes.API_ERROR);
      
      const result = await errorHandler.handleError(error, context);
      
      expect(operation).toHaveBeenCalledTimes(1);
      expect(result.success).toBe(true);
      expect(result.data).toBe('success');
    });

    test('should handle fallback operation', async () => {
      const fallbackOperation = jest.fn().mockResolvedValue({ success: true, data: 'fallback' });
      const context = { fallbackOperation };
      const error = new AgentError('Fallback error', ErrorTypes.TOOL_NOT_FOUND);
      
      const result = await errorHandler.handleError(error, context);
      
      expect(fallbackOperation).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.data).toBe('fallback');
    });
  });

  describe('Utility Functions', () => {
    test('withErrorHandling should wrap function with error handling', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Test error'));
      const wrappedFn = withErrorHandling(mockFn);
      
      const result = await wrappedFn('arg1', 'arg2');
      
      expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('makeSafe should return default value on error', () => {
      const throwingFn = () => {
        throw new Error('Test error');
      };
      const safeFn = makeSafe(throwingFn, 'default');
      
      const result = safeFn();
      
      expect(result).toBe('default');
    });

    test('validateRequired should throw for missing parameters', () => {
      const params = { a: 1, b: null, c: '' };
      const required = ['a', 'b', 'c', 'd'];
      
      expect(() => {
        validateRequired(params, required, 'test context');
      }).toThrow(AgentError);
      
      try {
        validateRequired(params, required);
      } catch (error) {
        expect(error.type).toBe(ErrorTypes.PARAMETER_VALIDATION_ERROR);
        expect(error.metadata.missingFields).toEqual(['b', 'c', 'd']);
      }
    });

    test('validateRequired should pass for valid parameters', () => {
      const params = { a: 1, b: 'test', c: true };
      const required = ['a', 'b', 'c'];
      
      expect(() => {
        validateRequired(params, required);
      }).not.toThrow();
    });

    test('withTimeout should resolve if promise completes in time', async () => {
      const promise = Promise.resolve('success');
      const result = await withTimeout(promise, 1000);
      
      expect(result).toBe('success');
    });

    test('withTimeout should reject if promise times out', async () => {
      const promise = new Promise(resolve => setTimeout(() => resolve('late'), 200));
      
      await expect(withTimeout(promise, 100)).rejects.toThrow(AgentError);
      
      try {
        await withTimeout(promise, 100);
      } catch (error) {
        expect(error.type).toBe(ErrorTypes.TIMEOUT_ERROR);
      }
    });

    test('formatErrorForUser should format error for display', () => {
      const error = new AgentError('Test error', ErrorTypes.API_ERROR);
      const formatted = formatErrorForUser(error);
      
      expect(formatted.message).toContain('AI service');
      expect(formatted.canRetry).toBe(true);
      expect(formatted.requiresInput).toBe(false);
      expect(formatted.severity).toBe(ErrorSeverity.MEDIUM);
    });

    test('formatErrorForUser should handle regular errors', () => {
      const error = new Error('Regular error');
      const formatted = formatErrorForUser(error);
      
      expect(formatted.message).toBe('Regular error');
      expect(formatted.severity).toBe(ErrorSeverity.MEDIUM);
    });
  });

  describe('Global Error Handler', () => {
    test('should have default configuration', () => {
      expect(globalErrorHandler.maxRetries).toBe(3);
      expect(globalErrorHandler.retryDelay).toBe(1000);
      expect(globalErrorHandler.enableLogging).toBe(true);
    });
  });

  describe('Error Type Detection', () => {
    test('should detect JSON parse errors', async () => {
      const error = new Error('JSON parse failed');
      const result = await globalErrorHandler.handleError(error);
      
      expect(result.error.type).toBe(ErrorTypes.JSON_PARSE_ERROR);
    });

    test('should detect network errors', async () => {
      const error = new Error('ENOTFOUND hostname');
      const result = await globalErrorHandler.handleError(error);
      
      expect(result.error.type).toBe(ErrorTypes.NETWORK_ERROR);
    });

    test('should detect validation errors', async () => {
      const error = new Error('validation failed');
      const result = await globalErrorHandler.handleError(error);
      
      expect(result.error.type).toBe(ErrorTypes.VALIDATION_ERROR);
    });
  });
});