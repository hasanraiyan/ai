// src/services/__tests__/brainService.test.js

import { 
  processUserRequest, 
  createReasoningContext, 
  isTaskComplete, 
  extractUserIntent 
} from '../brainService';

// Mock Google Generative AI
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: jest.fn()
    })
  }))
}));

// Mock master prompt
jest.mock('../../prompts/masterPrompt', () => ({
  createMasterPrompt: jest.fn().mockReturnValue('Mock master prompt')
}));

// Mock constants
jest.mock('../../constants/safetySettings', () => ({
  safetySettings: []
}));

jest.mock('../../constants', () => ({
  IS_DEBUG: false
}));

describe('Brain Service', () => {
  const mockApiKey = 'test-api-key';
  const mockModelName = 'gemini-pro';
  const mockTools = [
    {
      agent_id: 'calculator',
      description: 'Performs calculations',
      input_format: { expression: 'string' },
      output_format: { result: 'number' }
    }
  ];
  const mockHistory = [
    { role: 'user', content: 'Calculate 2+2', timestamp: Date.now() }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('processUserRequest', () => {
    test('should throw error when API key is missing', async () => {
      await expect(processUserRequest({
        conversationHistory: mockHistory,
        availableTools: mockTools,
        apiKey: '',
        modelName: mockModelName
      })).rejects.toThrow('API Key is required');
    });

    test('should throw error when model name is missing', async () => {
      await expect(processUserRequest({
        conversationHistory: mockHistory,
        availableTools: mockTools,
        apiKey: mockApiKey,
        modelName: ''
      })).rejects.toThrow('Model name is required');
    });

    test('should process valid request and return command', async () => {
      const mockResponse = {
        response: {
          text: jest.fn().mockResolvedValue(JSON.stringify({
            tool_name: 'calculator',
            parameters: { expression: '2+2' }
          }))
        }
      };

      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const mockModel = {
        generateContent: jest.fn().mockResolvedValue(mockResponse)
      };
      GoogleGenerativeAI.mockImplementation(() => ({
        getGenerativeModel: jest.fn().mockReturnValue(mockModel)
      }));

      const result = await processUserRequest({
        conversationHistory: mockHistory,
        availableTools: mockTools,
        apiKey: mockApiKey,
        modelName: mockModelName
      });

      expect(result).toEqual({
        tool_name: 'calculator',
        parameters: { expression: '2+2' }
      });
      expect(mockModel.generateContent).toHaveBeenCalledWith('Mock master prompt');
    });

    test('should handle JSON parsing errors gracefully', async () => {
      const mockResponse = {
        response: {
          text: jest.fn().mockResolvedValue('Invalid JSON response')
        }
      };

      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const mockModel = {
        generateContent: jest.fn().mockResolvedValue(mockResponse)
      };
      GoogleGenerativeAI.mockImplementation(() => ({
        getGenerativeModel: jest.fn().mockReturnValue(mockModel)
      }));

      const result = await processUserRequest({
        conversationHistory: mockHistory,
        availableTools: mockTools,
        apiKey: mockApiKey,
        modelName: mockModelName
      });

      expect(result).toBeNull();
    });

    test('should clean markdown from JSON response', async () => {
      const mockResponse = {
        response: {
          text: jest.fn().mockResolvedValue(`\`\`\`json
{
  "tool_name": "calculator",
  "parameters": { "expression": "2+2" }
}
\`\`\``)
        }
      };

      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const mockModel = {
        generateContent: jest.fn().mockResolvedValue(mockResponse)
      };
      GoogleGenerativeAI.mockImplementation(() => ({
        getGenerativeModel: jest.fn().mockReturnValue(mockModel)
      }));

      const result = await processUserRequest({
        conversationHistory: mockHistory,
        availableTools: mockTools,
        apiKey: mockApiKey,
        modelName: mockModelName
      });

      expect(result).toEqual({
        tool_name: 'calculator',
        parameters: { expression: '2+2' }
      });
    });

    test('should validate command structure', async () => {
      const mockResponse = {
        response: {
          text: jest.fn().mockResolvedValue(JSON.stringify({
            invalid_structure: true
          }))
        }
      };

      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const mockModel = {
        generateContent: jest.fn().mockResolvedValue(mockResponse)
      };
      GoogleGenerativeAI.mockImplementation(() => ({
        getGenerativeModel: jest.fn().mockReturnValue(mockModel)
      }));

      const result = await processUserRequest({
        conversationHistory: mockHistory,
        availableTools: mockTools,
        apiKey: mockApiKey,
        modelName: mockModelName
      });

      expect(result).toBeNull();
    });
  });

  describe('createReasoningContext', () => {
    test('should create reasoning context with all parameters', () => {
      const context = createReasoningContext({
        conversationHistory: mockHistory,
        userInput: 'New user input',
        metadata: { test: 'data' }
      });

      expect(context).toEqual({
        conversationHistory: mockHistory,
        currentUserInput: 'New user input',
        conversationLength: 1,
        lastUserMessage: 'Calculate 2+2',
        lastAiMessage: undefined,
        lastToolResult: undefined,
        metadata: { test: 'data' }
      });
    });

    test('should handle empty conversation history', () => {
      const context = createReasoningContext({
        conversationHistory: [],
        userInput: 'First message'
      });

      expect(context.conversationLength).toBe(0);
      expect(context.lastUserMessage).toBe('First message');
      expect(context.lastAiMessage).toBeUndefined();
    });

    test('should extract last messages of different roles', () => {
      const complexHistory = [
        { role: 'user', content: 'First user message' },
        { role: 'ai', content: 'First AI response' },
        { role: 'tool', content: { result: 'tool result' } },
        { role: 'user', content: 'Second user message' },
        { role: 'ai', content: 'Second AI response' }
      ];

      const context = createReasoningContext({
        conversationHistory: complexHistory,
        userInput: 'Current input'
      });

      expect(context.lastUserMessage).toBe('Second user message');
      expect(context.lastAiMessage).toBe('Second AI response');
      expect(context.lastToolResult).toEqual({ result: 'tool result' });
    });
  });

  describe('isTaskComplete', () => {
    test('should return false for empty history', () => {
      expect(isTaskComplete([])).toBe(false);
    });

    test('should return true when answerUser tool was used recently', () => {
      const historyWithAnswer = [
        { role: 'user', content: 'Question' },
        { role: 'tool', content: { tool_name: 'answerUser', result: 'Answer' } }
      ];

      expect(isTaskComplete(historyWithAnswer)).toBe(true);
    });

    test('should return false when answerUser tool was not used', () => {
      const historyWithoutAnswer = [
        { role: 'user', content: 'Question' },
        { role: 'tool', content: { tool_name: 'calculator', result: 4 } }
      ];

      expect(isTaskComplete(historyWithoutAnswer)).toBe(false);
    });

    test('should only check recent entries (last 5)', () => {
      const longHistory = [
        { role: 'tool', content: { tool_name: 'answerUser', result: 'Old answer' } },
        { role: 'user', content: 'Message 1' },
        { role: 'user', content: 'Message 2' },
        { role: 'user', content: 'Message 3' },
        { role: 'user', content: 'Message 4' },
        { role: 'user', content: 'Message 5' },
        { role: 'user', content: 'Message 6' }
      ];

      expect(isTaskComplete(longHistory)).toBe(false);
    });
  });

  describe('extractUserIntent', () => {
    test('should return empty string for empty history', () => {
      expect(extractUserIntent([])).toBe('');
    });

    test('should extract most recent user message', () => {
      const history = [
        { role: 'user', content: 'First message' },
        { role: 'ai', content: 'AI response' },
        { role: 'user', content: 'Second message' }
      ];

      expect(extractUserIntent(history)).toBe('Second message');
    });

    test('should handle history with no user messages', () => {
      const history = [
        { role: 'ai', content: 'AI message' },
        { role: 'tool', content: 'Tool result' }
      ];

      expect(extractUserIntent(history)).toBe('');
    });

    test('should handle user message with empty content', () => {
      const history = [
        { role: 'user', content: '' }
      ];

      expect(extractUserIntent(history)).toBe('');
    });
  });
});