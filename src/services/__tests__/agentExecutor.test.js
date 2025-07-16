// src/services/__tests__/agentExecutor.test.js

import { 
  executeAgentRequest, 
  createNewSession, 
  continueSession, 
  getSessionStats 
} from '../agentExecutor';

// Mock all dependencies to avoid Expo module issues
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

describe('Agent Executor', () => {
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
  });

  describe('executeAgentRequest', () => {
    it('should validate required parameters', async () => {
      const result = await executeAgentRequest({
        userInput: '',
        context: mockContext
      });

      expect(result.success).toBe(false);
      expect(result.response).toContain('User input is required');
    });

    it('should validate context parameters', async () => {
      const result = await executeAgentRequest({
        userInput: 'test input',
        context: {}
      });

      expect(result.success).toBe(false);
      expect(result.response).toContain('API key is required');
    });

    it('should add user input to conversation history', async () => {
      brainService.processUserRequest.mockResolvedValue({
        tool_name: 'answerUser',
        parameters: { answer: 'Test response' }
      });

      handsService.executeCommand.mockResolvedValue({
        success: true,
        message: 'Success',
        data: { type: 'final_answer', answer: 'Test response', isComplete: true }
      });

      // Mock isTaskComplete to return false initially, then true after tool execution
      brainService.isTaskComplete
        .mockReturnValueOnce(false) // First check before iteration
        .mockReturnValueOnce(true); // Second check after tool execution

      const result = await executeAgentRequest({
        userInput: 'Hello',
        context: mockContext
      });

      expect(result.success).toBe(true);
      expect(result.conversationHistory).toHaveLength(3); // user + ai + tool
      expect(result.conversationHistory[0].role).toBe('user');
      expect(result.conversationHistory[0].content).toBe('Hello');
    });

    it('should handle single iteration with answerUser tool', async () => {
      const mockCommand = {
        tool_name: 'answerUser',
        parameters: { answer: 'Hello there!' }
      };

      const mockToolResult = {
        success: true,
        message: 'Final answer provided',
        data: { type: 'final_answer', answer: 'Hello there!', isComplete: true }
      };

      brainService.processUserRequest.mockResolvedValue(mockCommand);
      handsService.executeCommand.mockResolvedValue(mockToolResult);
      brainService.isTaskComplete
        .mockReturnValueOnce(false) // First check before iteration
        .mockReturnValueOnce(true)  // Second check after tool execution (for shouldContinue)
        .mockReturnValueOnce(true); // Third check for final completion reason

      const result = await executeAgentRequest({
        userInput: 'Say hello',
        context: mockContext
      });

      expect(result.success).toBe(true);
      expect(result.response).toBe('Hello there!');
      expect(result.metadata.iterationsUsed).toBe(1);
      expect(result.metadata.completionReason).toBe('task_complete');
    });

    it('should handle multiple iterations', async () => {
      const mockCommands = [
        { tool_name: 'search_web', parameters: { query: 'test' } },
        { tool_name: 'answerUser', parameters: { answer: 'Found results' } }
      ];

      const mockToolResults = [
        { success: true, message: 'Search completed', data: { results: [] } },
        { success: true, message: 'Final answer', data: { type: 'final_answer', answer: 'Found results', isComplete: true } }
      ];

      brainService.processUserRequest
        .mockResolvedValueOnce(mockCommands[0])
        .mockResolvedValueOnce(mockCommands[1]);

      handsService.executeCommand
        .mockResolvedValueOnce(mockToolResults[0])
        .mockResolvedValueOnce(mockToolResults[1]);

      brainService.isTaskComplete
        .mockReturnValueOnce(false) // Initial check
        .mockReturnValueOnce(false) // After first iteration
        .mockReturnValueOnce(true); // After second iteration

      const result = await executeAgentRequest({
        userInput: 'Search for something',
        context: mockContext
      });

      expect(result.success).toBe(true);
      expect(result.response).toBe('Found results');
      expect(result.metadata.iterationsUsed).toBe(2);
      expect(brainService.processUserRequest).toHaveBeenCalledTimes(2);
      expect(handsService.executeCommand).toHaveBeenCalledTimes(2);
    });

    it('should handle maximum iterations limit', async () => {
      const mockCommand = { tool_name: 'search_web', parameters: { query: 'test' } };
      const mockToolResult = { success: true, message: 'Search completed', data: {} };

      brainService.processUserRequest.mockResolvedValue(mockCommand);
      handsService.executeCommand.mockResolvedValue(mockToolResult);
      brainService.isTaskComplete.mockReturnValue(false); // Never complete to trigger max iterations
      brainService.extractUserIntent.mockReturnValue('Search for something');

      const result = await executeAgentRequest({
        userInput: 'Search for something',
        context: mockContext,
        maxIterations: 2
      });

      expect(result.success).toBe(true);
      expect(result.isPartialResult).toBe(true);
      expect(result.response).toContain('reached my processing limit');
      expect(result.metadata.reason).toBe('graceful_exit');
    });

    it('should handle clarification requests', async () => {
      const mockCommand = {
        tool_name: 'clarify',
        parameters: { question: 'What do you mean?' }
      };

      const mockToolResult = {
        success: true,
        message: 'Clarification requested',
        data: { type: 'clarification', question: 'What do you mean?', requiresUserResponse: true }
      };

      brainService.processUserRequest.mockResolvedValue(mockCommand);
      handsService.executeCommand.mockResolvedValue(mockToolResult);
      brainService.isTaskComplete.mockReturnValue(false);

      const result = await executeAgentRequest({
        userInput: 'Do something',
        context: mockContext
      });

      expect(result.success).toBe(true);
      expect(result.response).toBe('What do you mean?');
      expect(result.metadata.iterationsUsed).toBe(1);
    });

    it('should handle brain processing errors', async () => {
      brainService.processUserRequest.mockRejectedValue(new Error('Brain error'));

      const result = await executeAgentRequest({
        userInput: 'Test input',
        context: mockContext
      });

      expect(result.success).toBe(false);
      expect(result.response).toContain('Brain error');
      expect(result.metadata.error).toBe('brain_processing_failed');
    });

    it('should handle tool execution errors', async () => {
      const mockCommand = { tool_name: 'search_web', parameters: { query: 'test' } };

      brainService.processUserRequest.mockResolvedValue(mockCommand);
      handsService.executeCommand.mockResolvedValue({
        success: false,
        message: 'Tool failed',
        data: null
      });
      brainService.isTaskComplete.mockReturnValue(false);

      const result = await executeAgentRequest({
        userInput: 'Search something',
        context: mockContext,
        maxIterations: 1
      });

      expect(result.success).toBe(true); // Should continue despite tool failure
      expect(result.conversationHistory).toHaveLength(3); // user + ai + tool (with error)
      expect(result.conversationHistory[2].content.success).toBe(false);
    });

    it('should handle brain returning null command', async () => {
      brainService.processUserRequest.mockResolvedValue(null);
      brainService.isTaskComplete.mockReturnValue(false);

      const result = await executeAgentRequest({
        userInput: 'Test input',
        context: mockContext
      });

      expect(result.success).toBe(true);
      expect(result.metadata.iterationsUsed).toBe(0);
    });

    it('should preserve existing conversation history', async () => {
      const existingHistory = [
        { role: 'user', content: 'Previous message', timestamp: Date.now() - 1000 }
      ];

      brainService.processUserRequest.mockResolvedValue({
        tool_name: 'answerUser',
        parameters: { answer: 'Response' }
      });

      handsService.executeCommand.mockResolvedValue({
        success: true,
        message: 'Success',
        data: { type: 'final_answer', answer: 'Response', isComplete: true }
      });

      brainService.isTaskComplete
        .mockReturnValueOnce(false) // First check before iteration
        .mockReturnValueOnce(true); // Second check after tool execution

      const result = await executeAgentRequest({
        userInput: 'New message',
        conversationHistory: existingHistory,
        context: mockContext
      });

      expect(result.success).toBe(true);
      expect(result.conversationHistory).toHaveLength(4); // existing + user + ai + tool
      expect(result.conversationHistory[0]).toEqual(existingHistory[0]);
    });
  });

  describe('createNewSession', () => {
    it('should create a new session with empty history', async () => {
      brainService.processUserRequest.mockResolvedValue({
        tool_name: 'answerUser',
        parameters: { answer: 'New session started' }
      });

      handsService.executeCommand.mockResolvedValue({
        success: true,
        message: 'Success',
        data: { type: 'final_answer', answer: 'New session started', isComplete: true }
      });

      brainService.isTaskComplete
        .mockReturnValueOnce(false) // First check before iteration
        .mockReturnValueOnce(true); // Second check after tool execution

      const result = await createNewSession('Start new session', mockContext);

      expect(result.success).toBe(true);
      expect(result.response).toBe('New session started');
      expect(result.conversationHistory[0].content).toBe('Start new session');
    });
  });

  describe('continueSession', () => {
    it('should continue existing session with history', async () => {
      const existingHistory = [
        { role: 'user', content: 'First message', timestamp: Date.now() - 2000 },
        { role: 'ai', content: { tool_name: 'clarify', parameters: { question: 'What?' } }, timestamp: Date.now() - 1000 }
      ];

      brainService.processUserRequest.mockResolvedValue({
        tool_name: 'answerUser',
        parameters: { answer: 'Continued response' }
      });

      handsService.executeCommand.mockResolvedValue({
        success: true,
        message: 'Success',
        data: { type: 'final_answer', answer: 'Continued response', isComplete: true }
      });

      brainService.isTaskComplete
        .mockReturnValueOnce(false) // First check before iteration
        .mockReturnValueOnce(true); // Second check after tool execution

      const result = await continueSession('Continue here', existingHistory, mockContext);

      expect(result.success).toBe(true);
      expect(result.response).toBe('Continued response');
      expect(result.conversationHistory).toHaveLength(5); // existing(2) + user + ai + tool
    });
  });

  describe('getSessionStats', () => {
    it('should calculate session statistics correctly', () => {
      const conversationHistory = [
        { role: 'user', content: 'Hello', timestamp: Date.now() },
        { role: 'ai', content: { tool_name: 'search_web' }, timestamp: Date.now() },
        { role: 'tool', content: { tool_name: 'search_web', success: true }, timestamp: Date.now() },
        { role: 'user', content: 'Thanks', timestamp: Date.now() },
        { role: 'ai', content: { tool_name: 'answerUser' }, timestamp: Date.now() },
        { role: 'tool', content: { tool_name: 'answerUser', success: true }, timestamp: Date.now() }
      ];

      brainService.isTaskComplete.mockReturnValue(true);

      const stats = getSessionStats(conversationHistory);

      expect(stats.userMessages).toBe(2);
      expect(stats.aiDecisions).toBe(2);
      expect(stats.toolExecutions).toBe(2);
      expect(stats.toolsUsed).toBe(2);
      expect(stats.uniqueTools).toEqual(['search_web', 'answerUser']);
      expect(stats.isComplete).toBe(true);
      expect(stats.totalEntries).toBe(6);
    });

    it('should handle empty conversation history', () => {
      brainService.isTaskComplete.mockReturnValue(false);

      const stats = getSessionStats([]);

      expect(stats.userMessages).toBe(0);
      expect(stats.aiDecisions).toBe(0);
      expect(stats.toolExecutions).toBe(0);
      expect(stats.toolsUsed).toBe(0);
      expect(stats.uniqueTools).toEqual([]);
      expect(stats.isComplete).toBe(false);
      expect(stats.totalEntries).toBe(0);
    });
  });
});