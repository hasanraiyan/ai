// src/services/__tests__/aiService.integration.test.js

import { sendMessageToAI } from '../aiService';
import { FEATURE_FLAGS } from '../../constants';
import { executeAgentRequest } from '../agentExecutor';

// Mock the agentExecutor
jest.mock('../agentExecutor');

// Mock Google Generative AI
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      startChat: jest.fn().mockReturnValue({
        sendMessage: jest.fn().mockResolvedValue({
          response: {
            text: jest.fn().mockResolvedValue('Mocked AI response')
          }
        })
      })
    })
  })),
  HarmCategory: {
    HARM_CATEGORY_HARASSMENT: 'HARM_CATEGORY_HARASSMENT',
    HARM_CATEGORY_HATE_SPEECH: 'HARM_CATEGORY_HATE_SPEECH',
    HARM_CATEGORY_SEXUALLY_EXPLICIT: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
    HARM_CATEGORY_DANGEROUS_CONTENT: 'HARM_CATEGORY_DANGEROUS_CONTENT'
  },
  HarmBlockThreshold: {
    BLOCK_NONE: 'BLOCK_NONE'
  }
}));

// Mock tool dispatcher and tools
jest.mock('../tools', () => ({
  toolDispatcher: jest.fn().mockResolvedValue({
    success: true,
    message: 'Tool executed successfully',
    data: { result: 'test' }
  }),
  toolImplementations: {
    search_web: jest.fn(),
    calculator: jest.fn(),
    add_transaction: jest.fn()
  },
  toolMetadata: [
    {
      agent_id: "search_web",
      description: "Performs a web search",
      capabilities: ["query"],
      input_format: { query: "string" },
      output_format: { success: "boolean", message: "string", data: { summary: "string" } }
    },
    {
      agent_id: "calculator", 
      description: "Evaluates mathematical expressions",
      capabilities: ["expression"],
      input_format: { expression: "string" },
      output_format: { success: "boolean", message: "string", data: { result: "number" } }
    }
  ]
}));

// Mock extractJson utility
jest.mock('../../utils/extractJson', () => ({
  extractJson: jest.fn().mockReturnValue(null)
}));

describe('AI Service Integration Tests', () => {
  const mockParams = {
    apiKey: 'test-api-key',
    modelName: 'gemini-pro',
    historyMessages: [
      { role: 'user', text: 'Hello', ts: Date.now() }
    ],
    newMessageText: 'How are you?',
    isAgentMode: true,
    onToolCall: jest.fn(),
    tavilyApiKey: 'test-tavily-key',
    financeContext: { budget: 1000 },
    allowedTools: ['search_web', 'calculator']
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset feature flags to default
    FEATURE_FLAGS.USE_NEW_AGENT_SYSTEM = false;
    FEATURE_FLAGS.DEBUG_AGENT_COMPATIBILITY = false;
    FEATURE_FLAGS.FALLBACK_ON_ERROR = true;
  });

  describe('Parameter Validation', () => {
    test('should throw error for missing API key', async () => {
      const invalidParams = { ...mockParams, apiKey: '' };
      
      await expect(sendMessageToAI(invalidParams)).rejects.toThrow('API Key is required');
    });

    test('should throw error for missing model name', async () => {
      const invalidParams = { ...mockParams, modelName: '' };
      
      await expect(sendMessageToAI(invalidParams)).rejects.toThrow('Model name is required');
    });

    test('should throw error for missing message text', async () => {
      const invalidParams = { ...mockParams, newMessageText: '' };
      
      await expect(sendMessageToAI(invalidParams)).rejects.toThrow('New message text is required');
    });

    test('should throw error for invalid history messages', async () => {
      const invalidParams = { ...mockParams, historyMessages: 'not-an-array' };
      
      await expect(sendMessageToAI(invalidParams)).rejects.toThrow('History messages must be an array');
    });

    test('should throw error for invalid allowed tools', async () => {
      const invalidParams = { ...mockParams, allowedTools: 'not-an-array' };
      
      await expect(sendMessageToAI(invalidParams)).rejects.toThrow('Allowed tools must be an array');
    });
  });

  describe('Legacy System Routing', () => {
    test('should use legacy system when new system is disabled', async () => {
      FEATURE_FLAGS.USE_NEW_AGENT_SYSTEM = false;
      
      const result = await sendMessageToAI(mockParams);
      
      expect(result).toBe('Mocked AI response');
      expect(executeAgentRequest).not.toHaveBeenCalled();
    });

    test('should use legacy system for non-agent mode even when new system is enabled', async () => {
      FEATURE_FLAGS.USE_NEW_AGENT_SYSTEM = true;
      const nonAgentParams = { ...mockParams, isAgentMode: false };
      
      const result = await sendMessageToAI(nonAgentParams);
      
      expect(result).toBe('Mocked AI response');
      expect(executeAgentRequest).not.toHaveBeenCalled();
    });
  });

  describe('New System Integration', () => {
    beforeEach(() => {
      FEATURE_FLAGS.USE_NEW_AGENT_SYSTEM = true;
      executeAgentRequest.mockResolvedValue({
        success: true,
        response: 'New system response',
        conversationHistory: [
          { role: 'user', content: 'How are you?', timestamp: Date.now() },
          { role: 'ai', content: { tool_name: 'answerUser', parameters: { answer: 'I am fine' } }, timestamp: Date.now() },
          { role: 'tool', content: { success: true, message: 'Response sent', data: { type: 'final_answer', answer: 'I am fine' } }, timestamp: Date.now() }
        ]
      });
    });

    test('should use new system when enabled and in agent mode', async () => {
      const result = await sendMessageToAI(mockParams);
      
      expect(result).toBe('New system response');
      expect(executeAgentRequest).toHaveBeenCalledWith({
        userInput: 'How are you?',
        conversationHistory: [
          {
            role: 'user',
            content: 'Hello',
            timestamp: expect.any(Number),
            metadata: {
              characterId: undefined,
              originalFormat: 'legacy'
            }
          }
        ],
        context: {
          apiKey: 'test-api-key',
          modelName: 'gemini-pro',
          tavilyApiKey: 'test-tavily-key',
          allowedTools: ['search_web', 'calculator'],
          budget: 1000
        },
        maxIterations: 5
      });
    });

    test('should convert legacy message format to new format', async () => {
      const legacyMessages = [
        { role: 'user', text: 'Hello', ts: 12345, characterId: 'char1' },
        { role: 'model', text: 'Hi there', ts: 12346 },
        { role: 'tool-result', text: 'Tool result', ts: 12347 }, // Should be filtered out
        { role: 'agent-thinking', text: 'Thinking...', ts: 12348 }, // Should be filtered out
        { error: true, text: 'Error message', ts: 12349 } // Should be filtered out
      ];
      
      const paramsWithLegacy = { ...mockParams, historyMessages: legacyMessages };
      
      await sendMessageToAI(paramsWithLegacy);
      
      expect(executeAgentRequest).toHaveBeenCalledWith({
        userInput: 'How are you?',
        conversationHistory: [
          {
            role: 'user',
            content: 'Hello',
            timestamp: expect.any(Number),
            metadata: {
              characterId: 'char1',
              originalFormat: 'legacy'
            }
          },
          {
            role: 'ai',
            content: 'Hi there',
            timestamp: expect.any(Number),
            metadata: {
              characterId: undefined,
              originalFormat: 'legacy'
            }
          }
        ],
        context: expect.any(Object),
        maxIterations: 5
      });
    });

    test('should handle tool call notifications for UI compatibility', async () => {
      const mockOnToolCall = jest.fn();
      const paramsWithCallback = { ...mockParams, onToolCall: mockOnToolCall };
      
      // Mock agent response with tool calls in history
      executeAgentRequest.mockResolvedValue({
        success: true,
        response: 'Response with tool calls',
        conversationHistory: [
          { role: 'user', content: 'Search for something', timestamp: Date.now() },
          { role: 'ai', content: { tool_name: 'search_web', parameters: { query: 'test' } }, timestamp: Date.now() },
          { role: 'tool', content: { success: true, message: 'Search completed' }, timestamp: Date.now() },
          { role: 'ai', content: { tool_name: 'answerUser', parameters: { answer: 'Found results' } }, timestamp: Date.now() }
        ]
      });
      
      await sendMessageToAI(paramsWithCallback);
      
      expect(mockOnToolCall).toHaveBeenCalledWith({
        'tools-required': [
          { tool_name: 'search_web', parameters: { query: 'test' } },
          { tool_name: 'answerUser', parameters: { answer: 'Found results' } }
        ]
      });
    });

    test('should not call onToolCall when no tool calls are present', async () => {
      const mockOnToolCall = jest.fn();
      const paramsWithCallback = { ...mockParams, onToolCall: mockOnToolCall };
      
      // Mock agent response without tool calls
      executeAgentRequest.mockResolvedValue({
        success: true,
        response: 'Simple response',
        conversationHistory: [
          { role: 'user', content: 'Hello', timestamp: Date.now() },
          { role: 'ai', content: 'Hello back', timestamp: Date.now() }
        ]
      });
      
      await sendMessageToAI(paramsWithCallback);
      
      expect(mockOnToolCall).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling and Fallback', () => {
    beforeEach(() => {
      FEATURE_FLAGS.USE_NEW_AGENT_SYSTEM = true;
      FEATURE_FLAGS.FALLBACK_ON_ERROR = true;
    });

    test('should fallback to legacy system when new system fails', async () => {
      executeAgentRequest.mockRejectedValue(new Error('New system failed'));
      
      const result = await sendMessageToAI(mockParams);
      
      expect(result).toBe('Mocked AI response');
      expect(executeAgentRequest).toHaveBeenCalled();
    });

    test('should throw error when new system fails and fallback is disabled', async () => {
      FEATURE_FLAGS.FALLBACK_ON_ERROR = false;
      executeAgentRequest.mockRejectedValue(new Error('New system failed'));
      
      await expect(sendMessageToAI(mockParams)).rejects.toThrow('New system failed');
    });

    test('should throw error when new system returns unsuccessful result', async () => {
      FEATURE_FLAGS.FALLBACK_ON_ERROR = false; // Disable fallback for this test
      executeAgentRequest.mockResolvedValue({
        success: false,
        response: 'Agent execution failed'
      });
      
      await expect(sendMessageToAI(mockParams)).rejects.toThrow('Agent execution failed');
    });

    test('should throw error when new system returns unsuccessful result with no message', async () => {
      FEATURE_FLAGS.FALLBACK_ON_ERROR = false; // Disable fallback for this test
      executeAgentRequest.mockResolvedValue({
        success: false,
        response: null
      });
      
      await expect(sendMessageToAI(mockParams)).rejects.toThrow('Agent execution failed');
    });
  });

  describe('Context Mapping', () => {
    test('should properly map finance context to agent context', async () => {
      FEATURE_FLAGS.USE_NEW_AGENT_SYSTEM = true;
      
      const financeParams = {
        ...mockParams,
        financeContext: {
          budget: 1000,
          currency: 'USD',
          calculateTax: jest.fn()
        }
      };
      
      executeAgentRequest.mockResolvedValue({
        success: true,
        response: 'Success',
        conversationHistory: []
      });
      
      await sendMessageToAI(financeParams);
      
      expect(executeAgentRequest).toHaveBeenCalledWith({
        userInput: 'How are you?',
        conversationHistory: expect.any(Array),
        context: {
          apiKey: 'test-api-key',
          modelName: 'gemini-pro',
          tavilyApiKey: 'test-tavily-key',
          allowedTools: ['search_web', 'calculator'],
          budget: 1000,
          currency: 'USD',
          calculateTax: expect.any(Function)
        },
        maxIterations: 5
      });
    });

    test('should handle missing finance context gracefully', async () => {
      FEATURE_FLAGS.USE_NEW_AGENT_SYSTEM = true;
      
      const paramsWithoutFinance = { ...mockParams };
      delete paramsWithoutFinance.financeContext;
      
      executeAgentRequest.mockResolvedValue({
        success: true,
        response: 'Success',
        conversationHistory: []
      });
      
      await sendMessageToAI(paramsWithoutFinance);
      
      expect(executeAgentRequest).toHaveBeenCalledWith({
        userInput: 'How are you?',
        conversationHistory: expect.any(Array),
        context: {
          apiKey: 'test-api-key',
          modelName: 'gemini-pro',
          tavilyApiKey: 'test-tavily-key',
          allowedTools: ['search_web', 'calculator']
        },
        maxIterations: 5
      });
    });
  });

  describe('Debug Logging', () => {
    test('should log debug information when debug flag is enabled', async () => {
      FEATURE_FLAGS.USE_NEW_AGENT_SYSTEM = true;
      FEATURE_FLAGS.DEBUG_AGENT_COMPATIBILITY = true;
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      executeAgentRequest.mockResolvedValue({
        success: true,
        response: 'Success',
        conversationHistory: []
      });
      
      await sendMessageToAI(mockParams);
      
      expect(consoleSpy).toHaveBeenCalledWith('AI Service: Using new Brain-Hands agent system');
      expect(consoleSpy).toHaveBeenCalledWith('AI Service: Processing request with parameters:', expect.any(Object));
      
      consoleSpy.mockRestore();
    });

    test('should log fallback information when fallback occurs', async () => {
      FEATURE_FLAGS.USE_NEW_AGENT_SYSTEM = true;
      FEATURE_FLAGS.DEBUG_AGENT_COMPATIBILITY = true;
      FEATURE_FLAGS.FALLBACK_ON_ERROR = true;
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      executeAgentRequest.mockRejectedValue(new Error('New system failed'));
      
      await sendMessageToAI(mockParams);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('AI Service: New system failed:', expect.any(Error));
      expect(consoleSpy).toHaveBeenCalledWith('AI Service: Falling back to legacy system due to error');
      
      consoleSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });
});