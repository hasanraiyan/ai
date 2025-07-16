// src/services/__tests__/aiServiceCompatibility.test.js

// Mock dependencies first before any imports
jest.mock('../agentExecutor');
jest.mock('@google/generative-ai');
jest.mock('../tools');
jest.mock('../../utils/extractJson');
jest.mock('../../constants/safetySettings');
jest.mock('../enhancedTools');
jest.mock('../brainService');
jest.mock('../handsService');

import { sendMessageToAI } from '../aiService';
import { executeAgentRequest } from '../agentExecutor';
import { FEATURE_FLAGS } from '../../constants';
import { extractJson } from '../../utils/extractJson';

// Mock Google Generative AI
const mockSendMessage = jest.fn();
const mockStartChat = jest.fn(() => ({
  sendMessage: mockSendMessage
}));
const mockGetGenerativeModel = jest.fn(() => ({
  startChat: mockStartChat
}));

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn(() => ({
    getGenerativeModel: mockGetGenerativeModel
  }))
}));

// Mock tool dispatcher
const mockToolDispatcher = jest.fn();
jest.mock('../tools', () => ({
  toolDispatcher: mockToolDispatcher,
  toolImplementations: {},
  toolMetadata: [],
  getAvailableTools: () => []
}));

// Mock safety settings
jest.mock('../../constants/safetySettings', () => ({
  safetySettings: []
}));

describe('AI Service Compatibility Wrapper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset feature flags to default state
    FEATURE_FLAGS.USE_NEW_AGENT_SYSTEM = false;
    FEATURE_FLAGS.DEBUG_AGENT_COMPATIBILITY = false;
    FEATURE_FLAGS.FALLBACK_ON_ERROR = true;
    
    // Setup default mock responses
    mockSendMessage.mockResolvedValue({
      response: {
        text: () => Promise.resolve('Mock AI response')
      }
    });
    
    executeAgentRequest.mockResolvedValue({
      success: true,
      response: 'Mock new system response',
      conversationHistory: []
    });
  });

  describe('Parameter Validation', () => {
    test('should throw error for missing API key', async () => {
      await expect(sendMessageToAI({
        modelName: 'gemini-pro',
        historyMessages: [],
        newMessageText: 'Hello'
      })).rejects.toThrow('API Key is required and must be a string');
    });

    test('should throw error for missing model name', async () => {
      await expect(sendMessageToAI({
        apiKey: 'test-key',
        historyMessages: [],
        newMessageText: 'Hello'
      })).rejects.toThrow('Model name is required and must be a string');
    });

    test('should throw error for missing message text', async () => {
      await expect(sendMessageToAI({
        apiKey: 'test-key',
        modelName: 'gemini-pro',
        historyMessages: []
      })).rejects.toThrow('New message text is required and must be a string');
    });

    test('should throw error for invalid history messages', async () => {
      await expect(sendMessageToAI({
        apiKey: 'test-key',
        modelName: 'gemini-pro',
        historyMessages: 'invalid',
        newMessageText: 'Hello'
      })).rejects.toThrow('History messages must be an array');
    });

    test('should throw error for invalid allowed tools', async () => {
      await expect(sendMessageToAI({
        apiKey: 'test-key',
        modelName: 'gemini-pro',
        historyMessages: [],
        newMessageText: 'Hello',
        allowedTools: 'invalid'
      })).rejects.toThrow('Allowed tools must be an array');
    });

    test('should normalize and validate parameters correctly', async () => {
      const result = await sendMessageToAI({
        apiKey: '  test-key  ',
        modelName: '  gemini-pro  ',
        historyMessages: [],
        newMessageText: '  Hello  ',
        isAgentMode: 'true', // Should be converted to boolean
        allowedTools: []
      });

      expect(result).toBe('Mock AI response');
      expect(mockGetGenerativeModel).toHaveBeenCalledWith({
        model: 'gemini-pro',
        safetySettings: expect.any(Object)
      });
    });
  });

  describe('Legacy System (Feature Flag Disabled)', () => {
    beforeEach(() => {
      FEATURE_FLAGS.USE_NEW_AGENT_SYSTEM = false;
    });

    test('should use legacy system for non-agent mode', async () => {
      const result = await sendMessageToAI({
        apiKey: 'test-key',
        modelName: 'gemini-pro',
        historyMessages: [],
        newMessageText: 'Hello',
        isAgentMode: false
      });

      expect(result).toBe('Mock AI response');
      expect(mockGetGenerativeModel).toHaveBeenCalled();
      expect(executeAgentRequest).not.toHaveBeenCalled();
    });

    test('should use legacy system for agent mode when feature flag is disabled', async () => {
      const result = await sendMessageToAI({
        apiKey: 'test-key',
        modelName: 'gemini-pro',
        historyMessages: [],
        newMessageText: 'Hello',
        isAgentMode: true
      });

      expect(result).toBe('Mock AI response');
      expect(mockGetGenerativeModel).toHaveBeenCalled();
      expect(executeAgentRequest).not.toHaveBeenCalled();
    });

    test('should handle tool calls in legacy agent mode', async () => {
      const mockToolCall = {
        'tools-required': [
          { tool_name: 'search_web', parameters: { query: 'test' } }
        ]
      };
      
      const mockToolResults = {
        search_web: { success: true, message: 'Search completed', data: 'results' }
      };

      extractJson.mockReturnValue(mockToolCall);
      mockToolDispatcher.mockResolvedValue(mockToolResults);
      
      // Mock second AI response after tool execution
      mockSendMessage
        .mockResolvedValueOnce({
          response: { text: () => Promise.resolve('Initial response') }
        })
        .mockResolvedValueOnce({
          response: { text: () => Promise.resolve('Final response with tool results') }
        });

      const onToolCall = jest.fn();
      const result = await sendMessageToAI({
        apiKey: 'test-key',
        modelName: 'gemini-pro',
        historyMessages: [],
        newMessageText: 'Search for something',
        isAgentMode: true,
        onToolCall,
        allowedTools: ['search_web']
      });

      expect(onToolCall).toHaveBeenCalledWith(mockToolCall);
      expect(mockToolDispatcher).toHaveBeenCalledWith({
        toolCall: mockToolCall,
        context: {
          tavilyApiKey: undefined,
          allowedTools: ['search_web']
        }
      });
      expect(result).toBe('Final response with tool results');
    });

    test('should filter history messages correctly', async () => {
      const historyMessages = [
        { role: 'user', text: 'Hello', ts: 1000 },
        { role: 'model', text: 'Hi there', ts: 1001 },
        { role: 'tool-result', text: 'Tool result', ts: 1002, error: false },
        { role: 'agent-thinking', text: 'Thinking...', ts: 1003 },
        { role: 'user', text: 'How are you?', ts: 1004, error: true }
      ];

      await sendMessageToAI({
        apiKey: 'test-key',
        modelName: 'gemini-pro',
        historyMessages,
        newMessageText: 'New message'
      });

      expect(mockStartChat).toHaveBeenCalledWith({
        history: [
          { role: 'user', parts: [{ text: 'Hello' }] },
          { role: 'model', parts: [{ text: 'Hi there' }] }
        ]
      });
    });
  });

  describe('New System (Feature Flag Enabled)', () => {
    beforeEach(() => {
      FEATURE_FLAGS.USE_NEW_AGENT_SYSTEM = true;
    });

    test('should use new system for agent mode when feature flag is enabled', async () => {
      const result = await sendMessageToAI({
        apiKey: 'test-key',
        modelName: 'gemini-pro',
        historyMessages: [],
        newMessageText: 'Hello',
        isAgentMode: true
      });

      expect(result).toBe('Mock new system response');
      expect(executeAgentRequest).toHaveBeenCalled();
      expect(mockGetGenerativeModel).not.toHaveBeenCalled();
    });

    test('should still use legacy system for non-agent mode', async () => {
      const result = await sendMessageToAI({
        apiKey: 'test-key',
        modelName: 'gemini-pro',
        historyMessages: [],
        newMessageText: 'Hello',
        isAgentMode: false
      });

      expect(result).toBe('Mock AI response');
      expect(mockGetGenerativeModel).toHaveBeenCalled();
      expect(executeAgentRequest).not.toHaveBeenCalled();
    });

    test('should convert legacy message format to new system format', async () => {
      const historyMessages = [
        { role: 'user', text: 'Hello', ts: 1000 },
        { role: 'model', text: 'Hi there', ts: 1001, characterId: 'char1' },
        { role: 'tool-result', text: 'Tool result', ts: 1002 },
        { role: 'agent-thinking', text: 'Thinking...', ts: 1003 }
      ];

      await sendMessageToAI({
        apiKey: 'test-key',
        modelName: 'gemini-pro',
        historyMessages,
        newMessageText: 'New message',
        isAgentMode: true
      });

      expect(executeAgentRequest).toHaveBeenCalledWith({
        userInput: 'New message',
        conversationHistory: [
          {
            role: 'user',
            content: 'Hello',
            timestamp: 1000,
            metadata: { characterId: undefined, originalFormat: 'legacy' }
          },
          {
            role: 'ai',
            content: 'Hi there',
            timestamp: 1001,
            metadata: { characterId: 'char1', originalFormat: 'legacy' }
          }
        ],
        context: {
          apiKey: 'test-key',
          modelName: 'gemini-pro',
          tavilyApiKey: undefined,
          allowedTools: []
        },
        maxIterations: 5
      });
    });

    test('should map finance context correctly', async () => {
      const financeContext = {
        addTransaction: jest.fn(),
        getTransactions: jest.fn(),
        getFinancialReport: jest.fn()
      };

      await sendMessageToAI({
        apiKey: 'test-key',
        modelName: 'gemini-pro',
        historyMessages: [],
        newMessageText: 'Hello',
        isAgentMode: true,
        financeContext,
        tavilyApiKey: 'tavily-key',
        allowedTools: ['calculator', 'search_web']
      });

      expect(executeAgentRequest).toHaveBeenCalledWith({
        userInput: 'Hello',
        conversationHistory: [],
        context: {
          apiKey: 'test-key',
          modelName: 'gemini-pro',
          tavilyApiKey: 'tavily-key',
          allowedTools: ['calculator', 'search_web'],
          addTransaction: financeContext.addTransaction,
          getTransactions: financeContext.getTransactions,
          getFinancialReport: financeContext.getFinancialReport
        },
        maxIterations: 5
      });
    });

    test('should handle tool call notifications for UI compatibility', async () => {
      const mockConversationHistory = [
        {
          role: 'ai',
          content: {
            tool_name: 'search_web',
            parameters: { query: 'test' }
          },
          timestamp: 1000
        },
        {
          role: 'ai',
          content: {
            tool_name: 'calculator',
            parameters: { expression: '2+2' }
          },
          timestamp: 1001
        }
      ];

      executeAgentRequest.mockResolvedValue({
        success: true,
        response: 'Mock response',
        conversationHistory: mockConversationHistory
      });

      const onToolCall = jest.fn();
      await sendMessageToAI({
        apiKey: 'test-key',
        modelName: 'gemini-pro',
        historyMessages: [],
        newMessageText: 'Hello',
        isAgentMode: true,
        onToolCall
      });

      expect(onToolCall).toHaveBeenCalledWith({
        'tools-required': [
          { tool_name: 'search_web', parameters: { query: 'test' } },
          { tool_name: 'calculator', parameters: { expression: '2+2' } }
        ]
      });
    });

    test('should handle new system failures and throw error when fallback disabled', async () => {
      FEATURE_FLAGS.FALLBACK_ON_ERROR = false;
      executeAgentRequest.mockRejectedValue(new Error('New system error'));

      await expect(sendMessageToAI({
        apiKey: 'test-key',
        modelName: 'gemini-pro',
        historyMessages: [],
        newMessageText: 'Hello',
        isAgentMode: true
      })).rejects.toThrow('New system error');

      expect(mockGetGenerativeModel).not.toHaveBeenCalled();
    });
  });

  describe('Fallback Mechanism', () => {
    beforeEach(() => {
      FEATURE_FLAGS.USE_NEW_AGENT_SYSTEM = true;
      FEATURE_FLAGS.FALLBACK_ON_ERROR = true;
    });

    test('should fallback to legacy system when new system fails', async () => {
      executeAgentRequest.mockRejectedValue(new Error('New system error'));

      const result = await sendMessageToAI({
        apiKey: 'test-key',
        modelName: 'gemini-pro',
        historyMessages: [],
        newMessageText: 'Hello',
        isAgentMode: true
      });

      expect(result).toBe('Mock AI response');
      expect(executeAgentRequest).toHaveBeenCalled();
      expect(mockGetGenerativeModel).toHaveBeenCalled();
    });

    test('should not fallback when new system succeeds', async () => {
      const result = await sendMessageToAI({
        apiKey: 'test-key',
        modelName: 'gemini-pro',
        historyMessages: [],
        newMessageText: 'Hello',
        isAgentMode: true
      });

      expect(result).toBe('Mock new system response');
      expect(executeAgentRequest).toHaveBeenCalled();
      expect(mockGetGenerativeModel).not.toHaveBeenCalled();
    });

    test('should handle new system returning unsuccessful result', async () => {
      executeAgentRequest.mockResolvedValue({
        success: false,
        response: 'Agent execution failed'
      });

      await expect(sendMessageToAI({
        apiKey: 'test-key',
        modelName: 'gemini-pro',
        historyMessages: [],
        newMessageText: 'Hello',
        isAgentMode: true
      })).rejects.toThrow('Agent execution failed');
    });
  });

  describe('Debug Logging', () => {
    beforeEach(() => {
      FEATURE_FLAGS.DEBUG_AGENT_COMPATIBILITY = true;
      console.log = jest.fn();
    });

    test('should log debug information when debug flag is enabled', async () => {
      FEATURE_FLAGS.USE_NEW_AGENT_SYSTEM = true;

      await sendMessageToAI({
        apiKey: 'test-key',
        modelName: 'gemini-pro',
        historyMessages: [{ role: 'user', text: 'Hi' }],
        newMessageText: 'Hello',
        isAgentMode: true,
        allowedTools: ['calculator']
      });

      expect(console.log).toHaveBeenCalledWith('AI Service: Processing request with parameters:', {
        modelName: 'gemini-pro',
        isAgentMode: true,
        useNewSystem: true,
        historyLength: 1,
        allowedToolsCount: 1
      });

      expect(console.log).toHaveBeenCalledWith('AI Service: Using new Brain-Hands agent system');
    });

    test('should log fallback information when fallback occurs', async () => {
      FEATURE_FLAGS.USE_NEW_AGENT_SYSTEM = true;
      FEATURE_FLAGS.FALLBACK_ON_ERROR = true;
      executeAgentRequest.mockRejectedValue(new Error('New system error'));

      await sendMessageToAI({
        apiKey: 'test-key',
        modelName: 'gemini-pro',
        historyMessages: [],
        newMessageText: 'Hello',
        isAgentMode: true
      });

      expect(console.log).toHaveBeenCalledWith('AI Service: Falling back to legacy system due to error');
    });

    test('should log legacy system usage when new system is disabled', async () => {
      FEATURE_FLAGS.USE_NEW_AGENT_SYSTEM = false;

      await sendMessageToAI({
        apiKey: 'test-key',
        modelName: 'gemini-pro',
        historyMessages: [],
        newMessageText: 'Hello',
        isAgentMode: true
      });

      expect(console.log).toHaveBeenCalledWith('AI Service: Using legacy system (new system disabled or non-agent mode)');
    });
  });

  describe('Backward Compatibility', () => {
    test('should maintain exact same interface as original sendMessageToAI', async () => {
      // Test that all original parameters are supported
      const originalParams = {
        apiKey: 'test-key',
        modelName: 'gemini-pro',
        historyMessages: [
          { role: 'user', text: 'Hello', ts: 1000 },
          { role: 'model', text: 'Hi', ts: 1001 }
        ],
        newMessageText: 'How are you?',
        isAgentMode: true,
        onToolCall: jest.fn(),
        tavilyApiKey: 'tavily-key',
        financeContext: {
          addTransaction: jest.fn(),
          getTransactions: jest.fn()
        },
        allowedTools: ['calculator', 'search_web']
      };

      const result = await sendMessageToAI(originalParams);
      expect(typeof result).toBe('string');
    });

    test('should work with minimal parameters (backward compatibility)', async () => {
      const result = await sendMessageToAI({
        apiKey: 'test-key',
        modelName: 'gemini-pro',
        historyMessages: [],
        newMessageText: 'Hello'
      });

      expect(result).toBe('Mock AI response');
    });

    test('should handle undefined optional parameters gracefully', async () => {
      const result = await sendMessageToAI({
        apiKey: 'test-key',
        modelName: 'gemini-pro',
        historyMessages: [],
        newMessageText: 'Hello',
        isAgentMode: undefined,
        onToolCall: undefined,
        tavilyApiKey: undefined,
        financeContext: undefined,
        allowedTools: undefined
      });

      expect(result).toBe('Mock AI response');
    });
  });
});
