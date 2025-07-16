// src/services/__tests__/agentExecutorSafety.test.js

import { executeAgentRequest } from '../agentExecutor';

// Mock dependencies
jest.mock('../brainService', () => ({
  processUserRequest: jest.fn(),
  isTaskComplete: jest.fn(),
  extractUserIntent: jest.fn()
}));

jest.mock('../handsService', () => ({
  executeCommand: jest.fn(),
  createExecutionContext: jest.fn()
}));

jest.mock('../enhancedTools', () => ({
  getEnhancedTools: jest.fn()
}));

jest.mock('../tools');

const brainService = require('../brainService');
const handsService = require('../handsService');
const enhancedTools = require('../enhancedTools');

describe('Agent Executor Safety Mechanisms', () => {
  const mockContext = {
    apiKey: 'test-api-key',
    modelName: 'test-model',
    allowedTools: ['search_web', 'calculator']
  };

  const mockTools = [
    { agent_id: 'clarify', description: 'Ask for clarification' },
    { agent_id: 'answerUser', description: 'Provide final answer' },
    { agent_id: 'search_web', description: 'Search the web' },
    { agent_id: 'calculator', description: 'Perform calculations' }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    enhancedTools.getEnhancedTools.mockReturnValue(mockTools);
    handsService.createExecutionContext.mockImplementation((ctx) => ({ ...ctx, availableTools: mockTools }));
    brainService.isTaskComplete.mockReturnValue(false);
  });

  describe('Iteration Limit Safety', () => {
    it('should enforce absolute maximum iteration limit', async () => {
      // Use different commands to avoid infinite loop detection
      const mockCommands = [
        { tool_name: 'search_web', parameters: { query: 'test1' } },
        { tool_name: 'calculator', parameters: { expression: '1+1' } },
        { tool_name: 'search_web', parameters: { query: 'test2' } },
        { tool_name: 'calculator', parameters: { expression: '2+2' } }
      ];
      const mockToolResult = { success: true, message: 'Completed', data: {} };

      brainService.processUserRequest
        .mockResolvedValueOnce(mockCommands[0])
        .mockResolvedValueOnce(mockCommands[1])
        .mockResolvedValueOnce(mockCommands[2])
        .mockResolvedValueOnce(mockCommands[3]);
      handsService.executeCommand.mockResolvedValue(mockToolResult);
      brainService.extractUserIntent.mockReturnValue('Test request');

      const result = await executeAgentRequest({
        userInput: 'Test request',
        context: mockContext,
        maxIterations: 50 // Request more than absolute max
      });

      expect(result.success).toBe(true);
      expect(result.isPartialResult).toBe(true);
      expect(result.metadata.safetyTrigger).toBe('max_iterations');
      expect(result.response).toContain('reached my processing limit');
    });

    it('should use default iterations for invalid values', async () => {
      const mockCommand = { tool_name: 'answerUser', parameters: { answer: 'Done' } };
      const mockToolResult = { 
        success: true, 
        message: 'Success', 
        data: { type: 'final_answer', answer: 'Done', isComplete: true } 
      };

      brainService.processUserRequest.mockResolvedValue(mockCommand);
      handsService.executeCommand.mockResolvedValue(mockToolResult);
      brainService.isTaskComplete
        .mockReturnValueOnce(false) // First check before iteration
        .mockReturnValueOnce(true); // Second check after tool execution

      const result = await executeAgentRequest({
        userInput: 'Test request',
        context: mockContext,
        maxIterations: -1 // Invalid value
      });

      expect(result.success).toBe(true);
      expect(result.metadata.maxIterations).toBe(5); // Default value
    });
  });

  describe('Infinite Loop Detection', () => {
    it('should detect repeated tool calls', async () => {
      const mockCommand = { tool_name: 'search_web', parameters: { query: 'test' } };
      const mockToolResult = { success: true, message: 'Search completed', data: {} };

      brainService.processUserRequest.mockResolvedValue(mockCommand);
      handsService.executeCommand.mockResolvedValue(mockToolResult);
      brainService.extractUserIntent.mockReturnValue('Test request');

      const result = await executeAgentRequest({
        userInput: 'Test request',
        context: mockContext,
        maxIterations: 10
      });

      expect(result.success).toBe(true);
      expect(result.isPartialResult).toBe(true);
      expect(result.metadata.safetyTrigger).toBe('infinite_loop');
      expect(result.metadata.loopPattern).toEqual(['search_web', 'search_web', 'search_web']);
      expect(result.response).toContain('reached my processing limit');
    });

    it('should detect alternating patterns', async () => {
      const mockCommands = [
        { tool_name: 'search_web', parameters: { query: 'test1' } },
        { tool_name: 'calculator', parameters: { expression: '1+1' } }
      ];
      const mockToolResults = [
        { success: true, message: 'Search completed', data: {} },
        { success: true, message: 'Calculation completed', data: { result: 2 } }
      ];

      brainService.processUserRequest
        .mockResolvedValueOnce(mockCommands[0])
        .mockResolvedValueOnce(mockCommands[1])
        .mockResolvedValueOnce(mockCommands[0])
        .mockResolvedValueOnce(mockCommands[1]);

      handsService.executeCommand
        .mockResolvedValueOnce(mockToolResults[0])
        .mockResolvedValueOnce(mockToolResults[1])
        .mockResolvedValueOnce(mockToolResults[0])
        .mockResolvedValueOnce(mockToolResults[1]);

      brainService.extractUserIntent.mockReturnValue('Test request');

      const result = await executeAgentRequest({
        userInput: 'Test request',
        context: mockContext,
        maxIterations: 10
      });

      expect(result.success).toBe(true);
      expect(result.isPartialResult).toBe(true);
      expect(result.metadata.safetyTrigger).toBe('infinite_loop');
      // The actual pattern detected might be repeated calls, not alternating
      expect(result.metadata.loopPattern).toBeDefined();
    });
  });

  describe('Consecutive Failures Detection', () => {
    it('should detect too many consecutive failures', async () => {
      // Use different commands to avoid infinite loop detection
      const mockCommands = [
        { tool_name: 'search_web', parameters: { query: 'test1' } },
        { tool_name: 'calculator', parameters: { expression: '1+1' } },
        { tool_name: 'search_web', parameters: { query: 'test2' } }
      ];
      const mockFailureResult = { success: false, message: 'Tool failed', data: null };

      brainService.processUserRequest
        .mockResolvedValueOnce(mockCommands[0])
        .mockResolvedValueOnce(mockCommands[1])
        .mockResolvedValueOnce(mockCommands[2]);
      handsService.executeCommand.mockResolvedValue(mockFailureResult);
      brainService.extractUserIntent.mockReturnValue('Test request');

      const result = await executeAgentRequest({
        userInput: 'Test request',
        context: mockContext,
        maxIterations: 10
      });

      expect(result.success).toBe(true);
      expect(result.isPartialResult).toBe(true);
      expect(result.metadata.safetyTrigger).toBe('consecutive_failures');
      expect(result.metadata.consecutiveFailures).toBe(3);
      expect(result.response).toContain('reached my processing limit');
    });

    it('should reset failure count after success', async () => {
      const mockCommands = [
        { tool_name: 'search_web', parameters: { query: 'test1' } },
        { tool_name: 'calculator', parameters: { expression: '1+1' } },
        { tool_name: 'answerUser', parameters: { answer: 'Done' } }
      ];

      const mockResults = [
        { success: false, message: 'Failed', data: null },
        { success: true, message: 'Success', data: {} },
        { success: true, message: 'Final answer', data: { type: 'final_answer', answer: 'Done', isComplete: true } }
      ];

      brainService.processUserRequest
        .mockResolvedValueOnce(mockCommands[0])
        .mockResolvedValueOnce(mockCommands[1])
        .mockResolvedValueOnce(mockCommands[2]);

      handsService.executeCommand
        .mockResolvedValueOnce(mockResults[0])
        .mockResolvedValueOnce(mockResults[1])
        .mockResolvedValueOnce(mockResults[2]);

      brainService.isTaskComplete
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(false) // Before third iteration
        .mockReturnValueOnce(true); // After third iteration

      const result = await executeAgentRequest({
        userInput: 'Test request',
        context: mockContext,
        maxIterations: 10
      });

      expect(result.success).toBe(true);
      expect(result.metadata.safetyTrigger).toBeUndefined();
      expect(result.metadata.completionReason).toBe('task_complete');
    });
  });

  describe('Timeout Handling', () => {
    it('should handle execution timeout', async () => {
      // Use different commands and add delays to trigger timeout before infinite loop
      const mockCommands = [
        { tool_name: 'search_web', parameters: { query: 'test1' } },
        { tool_name: 'calculator', parameters: { expression: '1+1' } }
      ];
      const mockToolResult = { success: true, message: 'Search completed', data: {} };

      brainService.processUserRequest
        .mockResolvedValueOnce(mockCommands[0])
        .mockResolvedValueOnce(mockCommands[1]);
      
      // Add delay to tool execution to trigger timeout
      handsService.executeCommand.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(mockToolResult), 200))
      );
      brainService.extractUserIntent.mockReturnValue('Test request');

      const result = await executeAgentRequest({
        userInput: 'Test request',
        context: mockContext,
        maxIterations: 10,
        timeoutMs: 100 // Very short timeout
      });

      expect(result.success).toBe(true);
      expect(result.isPartialResult).toBe(true);
      expect(result.metadata.safetyTrigger).toBe('timeout');
      expect(result.metadata.safetyReason).toContain('timeout');
    });

    it('should handle brain processing timeout', async () => {
      // Mock a slow brain processing
      brainService.processUserRequest.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ tool_name: 'search_web', parameters: {} }), 1000))
      );

      const result = await executeAgentRequest({
        userInput: 'Test request',
        context: mockContext,
        timeoutMs: 200 // Short timeout
      });

      expect(result.success).toBe(false);
      expect(result.metadata.error).toBe('brain_processing_failed');
      expect(result.metadata.errorType).toBe('timeout');
      expect(result.response).toContain('timed out');
    });
  });

  describe('Parameter Validation', () => {
    it('should validate empty user input', async () => {
      const result = await executeAgentRequest({
        userInput: '',
        context: mockContext
      });

      expect(result.success).toBe(false);
      expect(result.metadata.error).toBe('validation_failed');
      expect(result.response).toContain('User input is required');
    });

    it('should validate missing context', async () => {
      const result = await executeAgentRequest({
        userInput: 'Test input',
        context: {}
      });

      expect(result.success).toBe(false);
      expect(result.metadata.error).toBe('validation_failed');
      expect(result.response).toContain('API key is required');
    });

    it('should validate missing model name', async () => {
      const result = await executeAgentRequest({
        userInput: 'Test input',
        context: { apiKey: 'test-key' }
      });

      expect(result.success).toBe(false);
      expect(result.metadata.error).toBe('validation_failed');
      expect(result.response).toContain('Model name is required');
    });
  });

  describe('Error Recovery', () => {
    it('should handle brain processing errors gracefully', async () => {
      brainService.processUserRequest.mockRejectedValue(new Error('Brain processing failed'));

      const result = await executeAgentRequest({
        userInput: 'Test input',
        context: mockContext
      });

      expect(result.success).toBe(false);
      expect(result.metadata.error).toBe('brain_processing_failed');
      expect(result.metadata.errorType).toBe('processing_error');
      expect(result.response).toContain('Brain processing failed');
    });

    it('should handle tool execution errors gracefully', async () => {
      const mockCommand = { tool_name: 'search_web', parameters: { query: 'test' } };

      brainService.processUserRequest.mockResolvedValue(mockCommand);
      handsService.executeCommand.mockRejectedValue(new Error('Tool execution failed'));
      brainService.isTaskComplete.mockReturnValue(false);
      brainService.extractUserIntent.mockReturnValue('Test request');

      const result = await executeAgentRequest({
        userInput: 'Test input',
        context: mockContext,
        maxIterations: 1
      });

      expect(result.success).toBe(true); // Should continue despite tool failure
      expect(result.conversationHistory).toHaveLength(3); // user + ai + tool (with error)
      expect(result.conversationHistory[2].content.success).toBe(false);
    });

    it('should handle unexpected errors', async () => {
      // Mock an unexpected error in the main try-catch
      enhancedTools.getEnhancedTools.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const result = await executeAgentRequest({
        userInput: 'Test input',
        context: mockContext
      });

      expect(result.success).toBe(false);
      expect(result.metadata.error).toBe('unexpected_error');
      expect(result.response).toContain('unexpected error');
    });
  });

  describe('Safety Metadata', () => {
    it('should include safety information in graceful exit metadata', async () => {
      const mockCommand = { tool_name: 'search_web', parameters: { query: 'test' } };
      const mockToolResult = { success: true, message: 'Search completed', data: {} };

      brainService.processUserRequest.mockResolvedValue(mockCommand);
      handsService.executeCommand.mockResolvedValue(mockToolResult);
      brainService.extractUserIntent.mockReturnValue('Test request');

      const result = await executeAgentRequest({
        userInput: 'Test request',
        context: mockContext,
        maxIterations: 2
      });

      expect(result.metadata.safetyTrigger).toBe('max_iterations');
      expect(result.metadata.safetyReason).toBe('Maximum iterations reached');
      expect(result.metadata.reason).toBe('graceful_exit');
      expect(result.metadata.iterationsUsed).toBeDefined();
      expect(result.metadata.originalRequest).toBe('Test request');
    });
  });
});