// src/services/__tests__/brainHandsIntegration.test.js

import { executeAgentRequest } from '../agentExecutor';
import { processUserRequest } from '../brainService';
import { executeCommand } from '../handsService';
import { getEnhancedTools } from '../enhancedTools';

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

describe('Brain and Hands Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock createExecutionContext to return a proper context
    const { createExecutionContext } = require('../handsService');
    createExecutionContext.mockReturnValue({
      allowedTools: [],
      availableTools: [],
      executionId: 'test-execution-id',
      timestamp: Date.now()
    });
    
    // Mock isTaskComplete to return false by default (task not complete)
    const { isTaskComplete } = require('../brainService');
    isTaskComplete.mockReturnValue(false); // Default mock
  });

  describe('Brain-Hands Communication Flow', () => {
    test('should successfully execute complete reasoning-action cycle', async () => {
      // Mock enhanced tools metadata (should return array)
      const mockToolsMetadata = [
        { agent_id: 'clarify', description: 'Ask for clarification' },
        { agent_id: 'answerUser', description: 'Provide final answer' },
        { agent_id: 'existingTool', description: 'Existing tool' }
      ];
      getEnhancedTools.mockReturnValue(mockToolsMetadata);

      // Mock brain service to return a tool command
      processUserRequest.mockResolvedValueOnce({
        tool_name: 'existingTool',
        parameters: { query: 'test query' }
      });

      // Mock hands service to execute the command
      executeCommand.mockResolvedValueOnce({
        success: true,
        message: 'Tool executed successfully',
        data: { result: 'test result' }
      });

      // Mock brain service to complete the task
      processUserRequest.mockResolvedValueOnce({
        tool_name: 'answerUser',
        parameters: { answer: 'Task completed successfully' }
      });

      // Mock final answer execution
      executeCommand.mockResolvedValueOnce({
        success: true,
        message: 'Answer provided to user',
        data: { type: 'final_answer', answer: 'Task completed successfully' }
      });

      // Mock isTaskComplete to return true after the answerUser tool is processed
      brainService.isTaskComplete
        .mockReturnValueOnce(false) // Initial check
        .mockReturnValueOnce(false) // After first tool execution
        .mockReturnValueOnce(true); // After answerUser tool is executed

      const result = await executeAgentRequest({
        userInput: 'Test user request',
        conversationHistory: [],
        context: { apiKey: 'test-key', modelName: 'test-model' },
        maxIterations: 5
      });

      expect(result.success).toBe(true);
      expect(result.response).toBe('Task completed successfully');
      expect(processUserRequest).toHaveBeenCalledTimes(2);
      expect(executeCommand).toHaveBeenCalledTimes(2);
    });

    test('should handle brain service errors gracefully', async () => {
      // Mock enhanced tools metadata (should return array)
      const mockToolsMetadata = [
        { agent_id: 'clarify', description: 'Ask for clarification' },
        { agent_id: 'answerUser', description: 'Provide final answer' }
      ];
      getEnhancedTools.mockReturnValue(mockToolsMetadata);

      // Mock brain service to return an error
      processUserRequest.mockRejectedValueOnce(new Error('Brain processing failed'));

      const result = await executeAgentRequest({
        userInput: 'Test user request',
        conversationHistory: [],
        context: { apiKey: 'test-key', modelName: 'test-model' },
        maxIterations: 5
      });

      expect(result.success).toBe(false);
      expect(result.response).toContain('Brain processing failed');
    });

    test('should handle hands service errors and feed back to brain', async () => {
      // Mock enhanced tools metadata (should return array)
      const mockToolsMetadata = [
        { agent_id: 'clarify', description: 'Ask for clarification' },
        { agent_id: 'answerUser', description: 'Provide final answer' },
        { agent_id: 'existingTool', description: 'Existing tool' }
      ];
      getEnhancedTools.mockReturnValue(mockToolsMetadata);

      // Mock brain service to return a tool command
      processUserRequest.mockResolvedValueOnce({
        tool_name: 'existingTool',
        parameters: { query: 'test query' }
      });

      // Mock hands service to fail
      executeCommand.mockResolvedValueOnce({
        success: false,
        error: 'Tool execution failed',
        message: 'Failed to execute tool'
      });

      // Mock brain service to handle the error and provide answer
      processUserRequest.mockResolvedValueOnce({
        tool_name: 'answerUser',
        parameters: { answer: 'I encountered an error but handled it gracefully' }
      });

      // Mock final answer execution
      executeCommand.mockResolvedValueOnce({
        success: true,
        message: 'Answer provided to user',
        data: { type: 'final_answer', answer: 'I encountered an error but handled it gracefully' }
      });

      brainService.isTaskComplete
        .mockReturnValueOnce(false) // Initial check
        .mockReturnValueOnce(false) // After first tool execution (which failed)
        .mockReturnValueOnce(true);  // After brain processes error and decides to answerUser

      const result = await executeAgentRequest({
        userInput: 'Test user request',
        conversationHistory: [],
        context: { apiKey: 'test-key', modelName: 'test-model' },
        maxIterations: 5
      });

      expect(result.success).toBe(true);
      expect(result.response).toBe('I encountered an error but handled it gracefully');
      expect(processUserRequest).toHaveBeenCalledTimes(2);
      expect(executeCommand).toHaveBeenCalledTimes(2);
    });

    test('should properly pass conversation history between brain and hands', async () => {
      // Mock enhanced tools metadata (should return array)
      const mockToolsMetadata = [
        { agent_id: 'clarify', description: 'Ask for clarification' },
        { agent_id: 'answerUser', description: 'Provide final answer' }
      ];
      getEnhancedTools.mockReturnValue(mockToolsMetadata);

      const initialHistory = [
        { role: 'user', content: 'Previous message' },
        { role: 'assistant', content: 'Previous response' }
      ];

      // Mock brain service to return clarification request
      processUserRequest.mockResolvedValueOnce({
        tool_name: 'clarify',
        parameters: { question: 'Can you provide more details?' }
      });

      // Mock hands service to execute clarification
      executeCommand.mockResolvedValueOnce({
        success: true,
        message: 'Clarification requested',
        data: { type: 'clarification', question: 'Can you provide more details?', requiresUserResponse: true }
      });

      const result = await executeAgentRequest({
        userInput: 'Ambiguous request',
        conversationHistory: initialHistory,
        context: { apiKey: 'test-key', modelName: 'test-model' },
        maxIterations: 5
      });

      // Verify that brain service was called with updated history
      const brainCall = processUserRequest.mock.calls[0];
      expect(brainCall[0].conversationHistory).toEqual(expect.arrayContaining([
        ...initialHistory,
        expect.objectContaining({ role: 'user', content: 'Ambiguous request' }) // Use objectContaining for robustness with timestamp
      ]));
    });

    test('should enforce maximum iteration limits', async () => {
      // Mock enhanced tools metadata (should return array)
      const mockToolsMetadata = [
        { agent_id: 'clarify', description: 'Ask for clarification' },
        { agent_id: 'answerUser', description: 'Provide final answer' },
        { agent_id: 'existingTool', description: 'Existing tool' }
      ];
      getEnhancedTools.mockReturnValue(mockToolsMetadata);

      // Mock brain service to always return a tool command (never complete)
      processUserRequest.mockResolvedValue({
        tool_name: 'existingTool',
        parameters: { query: 'test' }
      });

      // Mock hands service to always succeed
      executeCommand.mockResolvedValue({
        success: true,
        message: 'Tool executed',
        data: { result: 'partial result' }
      });

      // isTaskComplete will remain mocked to false from beforeEach default

      const result = await executeAgentRequest({
        userInput: 'Complex request',
        conversationHistory: [],
        context: { apiKey: 'test-key', modelName: 'test-model' },
        maxIterations: 3
      });

      expect(result.success).toBe(true); // Graceful exit is a successful *handling*
      expect(result.isPartialResult).toBe(true); // But it's a partial result
      expect(result.response).toContain('reached my processing limit'); // Still contains the message from graceful exit
      expect(processUserRequest).toHaveBeenCalledTimes(3); // Should execute brain 3 times
      expect(executeCommand).toHaveBeenCalledTimes(3); // Should execute hand 3 times
    });

    test('should handle multi-step reasoning with tool chaining', async () => {
      // Mock enhanced tools metadata (should return array)
      const mockToolsMetadata = [
        { agent_id: 'clarify', description: 'Ask for clarification' },
        { agent_id: 'answerUser', description: 'Provide final answer' },
        { agent_id: 'tool1', description: 'First tool' },
        { agent_id: 'tool2', description: 'Second tool' }
      ];
      getEnhancedTools.mockReturnValue(mockToolsMetadata);

      // Step 1: Brain decides to use tool1
      processUserRequest.mockResolvedValueOnce({
        tool_name: 'tool1',
        parameters: { input: 'step1' }
      });

      // Step 1: Hands execute tool1
      executeCommand.mockResolvedValueOnce({
        success: true,
        message: 'Tool1 executed',
        data: { result: 'step1_result' }
      });

      // Step 2: Brain decides to use tool2 based on tool1 result
      processUserRequest.mockResolvedValueOnce({
        tool_name: 'tool2',
        parameters: { input: 'step1_result' }
      });

      // Step 2: Hands execute tool2
      executeCommand.mockResolvedValueOnce({
        success: true,
        message: 'Tool2 executed',
        data: { result: 'final_result' }
      });

      // Step 3: Brain provides final answer
      processUserRequest.mockResolvedValueOnce({
        tool_name: 'answerUser',
        parameters: { answer: 'Multi-step task completed with final_result' }
      });

      // Step 3: Hands provide answer
      executeCommand.mockResolvedValueOnce({
        success: true,
        message: 'Answer provided',
        data: { type: 'final_answer', answer: 'Multi-step task completed with final_result' }
      });

      // Mock isTaskComplete to return true after the answerUser tool is processed
      brainService.isTaskComplete
        .mockReturnValueOnce(false) // Initial check
        .mockReturnValueOnce(false) // After tool1 execution
        .mockReturnValueOnce(false) // After tool2 execution
        .mockReturnValueOnce(true); // After answerUser tool is executed

      const result = await executeAgentRequest({
        userInput: 'Multi-step request',
        conversationHistory: [],
        context: { apiKey: 'test-key', modelName: 'test-model' },
        maxIterations: 5
      });

      expect(result.success).toBe(true);
      expect(result.response).toBe('Multi-step task completed with final_result');
      expect(processUserRequest).toHaveBeenCalledTimes(3);
      expect(executeCommand).toHaveBeenCalledTimes(3);
    });
  });

  describe('Enhanced Brain-Hands Communication', () => {
    test('should pass enhanced execution context from Agent Executor to Brain', async () => {
      // Mock enhanced tools metadata
      const mockToolsMetadata = [
        { agent_id: 'clarify', description: 'Ask for clarification' },
        { agent_id: 'answerUser', description: 'Provide final answer' },
        { agent_id: 'testTool', description: 'Test tool' }
      ];
      getEnhancedTools.mockReturnValue(mockToolsMetadata);

      // Mock brain service to return a command
      processUserRequest.mockResolvedValueOnce({
        tool_name: 'answerUser',
        parameters: { answer: 'Task completed with enhanced context' }
      });

      // Mock hands service execution
      executeCommand.mockResolvedValueOnce({
        success: true,
        message: 'Answer provided',
        data: { type: 'final_answer', answer: 'Task completed with enhanced context' },
        tool_name: 'answerUser',
        metadata: {
          brainToHandsFlow: {
            commandReceived: true,
            parametersValid: true,
            executionSuccessful: true,
            feedbackQuality: 'high'
          }
        }
      });

      brainService.isTaskComplete
        .mockReturnValueOnce(false) // Initial check
        .mockReturnValueOnce(true); // After answerUser tool execution

      const result = await executeAgentRequest({
        userInput: 'Test enhanced context',
        conversationHistory: [],
        context: { apiKey: 'test-key', modelName: 'test-model' },
        maxIterations: 3
      });

      expect(result.success).toBe(true);
      
      // Verify that Brain received enhanced execution context
      const brainCallArgs = processUserRequest.mock.calls[0][0];
      expect(brainCallArgs.executionContext).toBeDefined();
      expect(brainCallArgs.executionContext.currentIteration).toBe(1);
      expect(brainCallArgs.executionContext.maxIterations).toBe(3);
      expect(brainCallArgs.executionContext.userInput).toBe('Test enhanced context');
    });

    test('should provide enhanced feedback from Hands to Brain with performance metrics', async () => {
      // Mock enhanced tools metadata
      const mockToolsMetadata = [
        { agent_id: 'clarify', description: 'Ask for clarification' },
        { agent_id: 'answerUser', description: 'Provide final answer' },
        { agent_id: 'performanceTool', description: 'Tool with performance metrics' }
      ];
      getEnhancedTools.mockReturnValue(mockToolsMetadata);

      // Step 1: Brain requests performance tool
      processUserRequest.mockResolvedValueOnce({
        tool_name: 'performanceTool',
        parameters: { input: 'test' }
      });

      // Step 1: Hands execute with enhanced feedback
      executeCommand.mockResolvedValueOnce({
        success: true,
        message: 'Performance tool executed',
        data: { result: 'performance_data' },
        tool_name: 'performanceTool',
        metadata: {
          executionTime: 150,
          brainToHandsFlow: {
            commandReceived: true,
            parametersValid: true,
            executionSuccessful: true,
            feedbackQuality: 'high'
          },
          performance: {
            executionTimeMs: 150,
            memoryUsage: 1024000,
            parametersCount: 1
          }
        }
      });

      // Step 2: Brain provides final answer based on enhanced feedback
      processUserRequest.mockResolvedValueOnce({
        tool_name: 'answerUser',
        parameters: { answer: 'Performance analysis completed' }
      });

      // Step 2: Final answer execution
      executeCommand.mockResolvedValueOnce({
        success: true,
        message: 'Answer provided',
        data: { type: 'final_answer', answer: 'Performance analysis completed' },
        tool_name: 'answerUser'
      });

      brainService.isTaskComplete
        .mockReturnValueOnce(false) // Initial check
        .mockReturnValueOnce(false) // After performance tool
        .mockReturnValueOnce(true); // After answerUser

      const result = await executeAgentRequest({
        userInput: 'Run performance analysis',
        conversationHistory: [],
        context: { apiKey: 'test-key', modelName: 'test-model' },
        maxIterations: 5
      });

      expect(result.success).toBe(true);
      
      // Verify enhanced feedback was recorded in conversation history
      const toolResultEntry = result.conversationHistory.find(entry => 
        entry.role === 'tool' && entry.content.tool_name === 'performanceTool'
      );
      
      expect(toolResultEntry).toBeDefined();
      expect(toolResultEntry.content.metadata.brainToHandsFlow).toBeDefined();
      expect(toolResultEntry.content.metadata.performance).toBeDefined();
      expect(toolResultEntry.content.metadata.performance.executionTimeMs).toBe(150);
    });

    test('should handle enhanced error propagation with detailed error context', async () => {
      // Mock enhanced tools metadata
      const mockToolsMetadata = [
        { agent_id: 'clarify', description: 'Ask for clarification' },
        { agent_id: 'answerUser', description: 'Provide final answer' },
        { agent_id: 'failingTool', description: 'Tool that fails with enhanced error info' }
      ];
      getEnhancedTools.mockReturnValue(mockToolsMetadata);

      // Step 1: Brain requests failing tool
      processUserRequest.mockResolvedValueOnce({
        tool_name: 'failingTool',
        parameters: { input: 'test' }
      });

      // Step 1: Hands fail with enhanced error information
      executeCommand.mockResolvedValueOnce({
        success: false,
        message: 'Enhanced error: Tool execution failed with detailed context',
        data: null,
        tool_name: 'failingTool',
        metadata: {
          errorType: 'execution_exception',
          executionTime: 75,
          brainToHandsFlow: {
            commandReceived: true,
            parametersValid: true,
            executionSuccessful: false,
            feedbackQuality: 'high',
            errorCategory: 'execution_exception'
          },
          errorName: 'CustomError',
          parameters: ['input']
        }
      });

      // Step 2: Brain handles enhanced error and provides answer
      processUserRequest.mockResolvedValueOnce({
        tool_name: 'answerUser',
        parameters: { answer: 'I encountered a detailed error and handled it appropriately' }
      });

      // Step 2: Final answer execution
      executeCommand.mockResolvedValueOnce({
        success: true,
        message: 'Answer provided',
        data: { type: 'final_answer', answer: 'I encountered a detailed error and handled it appropriately' },
        tool_name: 'answerUser'
      });

      brainService.isTaskComplete
        .mockReturnValueOnce(false) // Initial check
        .mockReturnValueOnce(false) // After failing tool
        .mockReturnValueOnce(true); // After answerUser

      const result = await executeAgentRequest({
        userInput: 'Test enhanced error handling',
        conversationHistory: [],
        context: { apiKey: 'test-key', modelName: 'test-model' },
        maxIterations: 5
      });

      expect(result.success).toBe(true);
      
      // Verify enhanced error information was passed to Brain
      const errorEntry = result.conversationHistory.find(entry => 
        entry.role === 'tool' && entry.content.tool_name === 'failingTool'
      );
      
      expect(errorEntry).toBeDefined();
      expect(errorEntry.content.success).toBe(false);
      expect(errorEntry.content.metadata.brainToHandsFlow).toBeDefined();
      expect(errorEntry.content.metadata.brainToHandsFlow.errorCategory).toBe('execution_exception');
      expect(errorEntry.content.metadata.errorType).toBe('execution_exception');
      
      // Verify Brain received the enhanced error context in second call
      const secondBrainCall = processUserRequest.mock.calls[1][0];
      expect(secondBrainCall.executionContext.previousErrors).toBeDefined();
      expect(secondBrainCall.executionContext.previousErrors.length).toBeGreaterThan(0);
    });

    test('should maintain comprehensive conversation history with enhanced metadata', async () => {
      // Mock enhanced tools metadata
      const mockToolsMetadata = [
        { agent_id: 'clarify', description: 'Ask for clarification' },
        { agent_id: 'answerUser', description: 'Provide final answer' },
        { agent_id: 'tool1', description: 'First tool' },
        { agent_id: 'tool2', description: 'Second tool' }
      ];
      getEnhancedTools.mockReturnValue(mockToolsMetadata);

      // Multi-step execution with enhanced metadata
      processUserRequest
        .mockResolvedValueOnce({
          tool_name: 'tool1',
          parameters: { step: 1 }
        })
        .mockResolvedValueOnce({
          tool_name: 'tool2',
          parameters: { step: 2 }
        })
        .mockResolvedValueOnce({
          tool_name: 'answerUser',
          parameters: { answer: 'Multi-step task completed with enhanced tracking' }
        });

      executeCommand
        .mockResolvedValueOnce({
          success: true,
          message: 'Tool1 executed',
          data: { step1_result: 'data1' },
          tool_name: 'tool1',
          metadata: {
            executionTime: 100,
            brainToHandsFlow: {
              commandReceived: true,
              parametersValid: true,
              executionSuccessful: true,
              feedbackQuality: 'high'
            }
          }
        })
        .mockResolvedValueOnce({
          success: true,
          message: 'Tool2 executed',
          data: { step2_result: 'data2' },
          tool_name: 'tool2',
          metadata: {
            executionTime: 200,
            brainToHandsFlow: {
              commandReceived: true,
              parametersValid: true,
              executionSuccessful: true,
              feedbackQuality: 'high'
            }
          }
        })
        .mockResolvedValueOnce({
          success: true,
          message: 'Answer provided',
          data: { type: 'final_answer', answer: 'Multi-step task completed with enhanced tracking' },
          tool_name: 'answerUser'
        });

      brainService.isTaskComplete
        .mockReturnValueOnce(false) // Initial
        .mockReturnValueOnce(false) // After tool1
        .mockReturnValueOnce(false) // After tool2
        .mockReturnValueOnce(true); // After answerUser

      const result = await executeAgentRequest({
        userInput: 'Multi-step enhanced tracking test',
        conversationHistory: [],
        context: { apiKey: 'test-key', modelName: 'test-model' },
        maxIterations: 5
      });

      expect(result.success).toBe(true);
      
      // Verify comprehensive conversation history with enhanced metadata
      expect(result.conversationHistory).toHaveLength(7); // user + (ai + tool) * 3
      
      // Check that each tool result has enhanced metadata
      const toolResults = result.conversationHistory.filter(entry => entry.role === 'tool');
      expect(toolResults).toHaveLength(3);
      
      toolResults.forEach((toolResult, index) => {
        expect(toolResult.content.tool_name).toBeDefined();
        expect(toolResult.content.metadata).toBeDefined();
        expect(toolResult.metadata.brainToHandsFlow).toBeDefined();
        expect(toolResult.metadata.brainToHandsFlow.brainCommand).toBeDefined();
        expect(toolResult.metadata.brainToHandsFlow.handsResult).toBeDefined();
        expect(toolResult.metadata.brainToHandsFlow.feedbackComplete).toBe(true);
        expect(toolResult.metadata.iteration).toBe(index + 1);
      });
    });
  });

  describe('Error Propagation', () => {
    test('should propagate tool execution errors back to brain', async () => {
      // Mock enhanced tools metadata (should return array)
      const mockToolsMetadata = [
        { agent_id: 'clarify', description: 'Ask for clarification' },
        { agent_id: 'answerUser', description: 'Provide final answer' },
        { agent_id: 'failingTool', description: 'Tool that fails' }
      ];
      getEnhancedTools.mockReturnValue(mockToolsMetadata);

      // Mock brain service to request failing tool
      processUserRequest.mockResolvedValueOnce({
        tool_name: 'failingTool',
        parameters: { input: 'test' }
      });

      // Mock hands service to fail
      executeCommand.mockResolvedValueOnce({
        success: false,
        error: 'Tool execution failed',
        message: 'Specific error details'
      });

      // Mock brain service to handle the error and provide answer
      processUserRequest.mockResolvedValueOnce({
        tool_name: 'answerUser',
        parameters: { answer: 'I encountered an error: Specific error details' }
      });

      // Mock final answer
      executeCommand.mockResolvedValueOnce({
        success: true,
        message: 'Answer provided',
        data: { type: 'final_answer', answer: 'I encountered an error: Specific error details' }
      });

      // Mock isTaskComplete to return true after the answerUser tool is processed
      brainService.isTaskComplete
        .mockReturnValueOnce(false) // Initial check
        .mockReturnValueOnce(false) // After failing tool execution
        .mockReturnValueOnce(true); // After brain processes error and calls answerUser

      const result = await executeAgentRequest({
        userInput: 'Request that will fail',
        conversationHistory: [],
        context: { apiKey: 'test-key', modelName: 'test-model' },
        maxIterations: 5
      });

      expect(result.success).toBe(true);
      expect(result.response).toContain('I encountered an error: Specific error details');
      
      // Verify error was passed to brain in second call (by checking the history passed)
      const secondBrainCallArgs = processUserRequest.mock.calls[1][0]; // Get the first arg (context object) of the second call
      const toolResultEntryInHistory = secondBrainCallArgs.conversationHistory.find(entry =>
          entry.role === 'tool' && entry.content.tool_name === 'failingTool'
      );
      expect(toolResultEntryInHistory).toBeDefined();
      expect(toolResultEntryInHistory.content.success).toBe(false);
      expect(toolResultEntryInHistory.content.message).toBe('Specific error details');
    });

    test('should handle invalid tool commands gracefully', async () => {
      // Mock enhanced tools metadata (should return array)
      const mockToolsMetadata = [
        { agent_id: 'clarify', description: 'Ask for clarification' },
        { agent_id: 'answerUser', description: 'Provide final answer' }
      ];
      getEnhancedTools.mockReturnValue(mockToolsMetadata);

      // Mock brain service to return invalid tool command
      processUserRequest.mockResolvedValueOnce({
        tool_name: 'nonexistentTool',
        parameters: { input: 'test' }
      });

      // Mock hands service to reject invalid tool
      executeCommand.mockResolvedValueOnce({
        success: false,
        error: 'Tool not found: nonexistentTool',
        message: 'Invalid tool requested'
      });

      // Mock brain service to handle error
      processUserRequest.mockResolvedValueOnce({
        tool_name: 'answerUser',
        parameters: { answer: 'I apologize, I tried to use an invalid tool' }
      });

      // Mock final answer
      executeCommand.mockResolvedValueOnce({
        success: true,
        message: 'Answer provided',
        data: { type: 'final_answer', answer: 'I apologize, I tried to use an invalid tool' }
      });

      // Mock isTaskComplete to return true after the answerUser tool is processed
      brainService.isTaskComplete
        .mockReturnValueOnce(false) // Initial check
        .mockReturnValueOnce(false) // After invalid tool execution
        .mockReturnValueOnce(true); // After brain processes invalid command and calls answerUser

      const result = await executeAgentRequest({
        userInput: 'Test request',
        conversationHistory: [],
        context: { apiKey: 'test-key', modelName: 'test-model' },
        maxIterations: 5
      });

      expect(result.success).toBe(true);
      expect(result.response).toContain('I apologize, I tried to use an invalid tool');
    });
  });
});