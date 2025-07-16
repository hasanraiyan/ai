// src/services/__tests__/toolCompatibilityAdapter.test.js

import {
  mapLegacyToolCallToNewFormat,
  mapNewResultsToLegacyFormat,
  compatibleToolDispatcher,
  getCompatibleToolMetadata,
  validateCharacterToolSupport,
  createCompatibilityContext,
  migrateLegacyToolConfig,
  getCompatibilityReport
} from '../toolCompatibilityAdapter';

// Mock dependencies
jest.mock('../tools', () => ({
  toolDispatcher: jest.fn(),
  toolImplementations: {
    search_web: jest.fn(),
    calculator: jest.fn()
  },
  toolMetadata: [
    {
      agent_id: 'search_web',
      description: 'Search the web',
      input_format: { query: 'string' }
    },
    {
      agent_id: 'calculator',
      description: 'Calculate expressions',
      input_format: { expression: 'string' }
    }
  ]
}));

jest.mock('../enhancedTools', () => ({
  enhancedToolImplementations: {
    clarify: jest.fn(),
    answerUser: jest.fn(),
    search_web: jest.fn(),
    calculator: jest.fn()
  },
  getEnhancedTools: jest.fn(() => [
    {
      agent_id: 'clarify',
      description: 'Ask for clarification',
      input_format: { question: 'string' }
    },
    {
      agent_id: 'answerUser',
      description: 'Provide final answer',
      input_format: { answer: 'string' }
    },
    {
      agent_id: 'search_web',
      description: 'Search the web',
      input_format: { query: 'string' }
    },
    {
      agent_id: 'calculator',
      description: 'Calculate expressions',
      input_format: { expression: 'string' }
    }
  ])
}));

const { toolDispatcher: mockLegacyDispatcher, toolImplementations } = require('../tools');
const { enhancedToolImplementations } = require('../enhancedTools');

describe('Tool Compatibility Adapter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('mapLegacyToolCallToNewFormat', () => {
    test('should map legacy tools-required format to new format', () => {
      const legacyToolCall = {
        'tools-required': [
          { tool_name: 'search_web', parameters: { query: 'test' } },
          { tool_name: 'calculator', parameters: { expression: '2+2' } }
        ]
      };

      const result = mapLegacyToolCallToNewFormat(legacyToolCall);

      expect(result).toEqual([
        { tool_name: 'search_web', parameters: { query: 'test' } },
        { tool_name: 'calculator', parameters: { expression: '2+2' } }
      ]);
    });

    test('should map direct tool call format to new format', () => {
      const legacyToolCall = {
        search_web: { query: 'test' },
        calculator: { expression: '2+2' }
      };

      const result = mapLegacyToolCallToNewFormat(legacyToolCall);

      expect(result).toEqual([
        { tool_name: 'search_web', parameters: { query: 'test' } },
        { tool_name: 'calculator', parameters: { expression: '2+2' } }
      ]);
    });

    test('should handle empty or invalid input', () => {
      expect(mapLegacyToolCallToNewFormat(null)).toEqual([]);
      expect(mapLegacyToolCallToNewFormat(undefined)).toEqual([]);
      expect(mapLegacyToolCallToNewFormat({})).toEqual([]);
    });

    test('should handle missing parameters', () => {
      const legacyToolCall = {
        'tools-required': [
          { tool_name: 'search_web' }
        ]
      };

      const result = mapLegacyToolCallToNewFormat(legacyToolCall);

      expect(result).toEqual([
        { tool_name: 'search_web', parameters: {} }
      ]);
    });
  });

  describe('mapNewResultsToLegacyFormat', () => {
    test('should map new format results to legacy format', () => {
      const newResults = [
        {
          success: true,
          message: 'Search completed',
          data: { summary: 'test results' },
          tool_name: 'search_web'
        },
        {
          success: true,
          message: 'Calculation completed',
          data: { result: 4 },
          tool_name: 'calculator'
        }
      ];

      const result = mapNewResultsToLegacyFormat(newResults);

      expect(result).toEqual({
        search_web: {
          success: true,
          message: 'Search completed',
          data: { summary: 'test results' }
        },
        calculator: {
          success: true,
          message: 'Calculation completed',
          data: { result: 4 }
        }
      });
    });

    test('should handle results without tool_name', () => {
      const newResults = [
        {
          success: true,
          message: 'Success',
          data: null
        }
      ];

      const result = mapNewResultsToLegacyFormat(newResults);

      expect(result).toEqual({});
    });
  });

  describe('compatibleToolDispatcher', () => {
    test('should use legacy dispatcher for legacy format', async () => {
      const legacyToolCall = {
        'tools-required': [
          { tool_name: 'search_web', parameters: { query: 'test' } }
        ]
      };

      const mockLegacyResult = {
        search_web: { success: true, message: 'Success', data: null }
      };

      mockLegacyDispatcher.mockResolvedValue(mockLegacyResult);

      const result = await compatibleToolDispatcher({
        toolCall: legacyToolCall,
        context: { allowedTools: ['search_web'] }
      });

      expect(mockLegacyDispatcher).toHaveBeenCalledWith({
        toolCall: legacyToolCall,
        context: { allowedTools: ['search_web'] }
      });
      expect(result).toEqual(mockLegacyResult);
    });

    test('should use enhanced tools for new format', async () => {
      const newToolCall = {
        tool_name: 'clarify',
        parameters: { question: 'What do you mean?' }
      };

      const mockEnhancedResult = {
        success: true,
        message: 'Clarification sent',
        data: { type: 'clarification', question: 'What do you mean?' }
      };

      enhancedToolImplementations.clarify.mockResolvedValue(mockEnhancedResult);

      const result = await compatibleToolDispatcher({
        toolCall: newToolCall,
        context: {}
      });

      expect(enhancedToolImplementations.clarify).toHaveBeenCalledWith(
        { question: 'What do you mean?' },
        {}
      );
      expect(result).toEqual({
        clarify: {
          success: true,
          message: 'Clarification sent',
          data: { type: 'clarification', question: 'What do you mean?' }
        }
      });
    });

    test('should handle tool execution errors gracefully', async () => {
      const newToolCall = {
        tool_name: 'clarify',
        parameters: { question: 'What do you mean?' }
      };

      enhancedToolImplementations.clarify.mockRejectedValue(new Error('Tool failed'));

      const result = await compatibleToolDispatcher({
        toolCall: newToolCall,
        context: {}
      });

      expect(result).toEqual({
        clarify: {
          success: false,
          message: 'Enhanced tool execution failed: Tool failed',
          data: null
        }
      });
    });

    test('should handle unknown tools', async () => {
      const newToolCall = {
        tool_name: 'unknown_tool',
        parameters: {}
      };

      const result = await compatibleToolDispatcher({
        toolCall: newToolCall,
        context: {}
      });

      expect(result).toEqual({
        unknown_tool: {
          success: false,
          message: "Tool 'unknown_tool' not found in either enhanced or legacy implementations",
          data: null
        }
      });
    });
  });

  describe('validateCharacterToolSupport', () => {
    test('should validate supported character tools', () => {
      const supportedTools = ['search_web', 'calculator'];

      const result = validateCharacterToolSupport(supportedTools);

      expect(result.isValid).toBe(true);
      expect(result.supportedTools).toHaveLength(2);
      expect(result.unsupportedTools).toHaveLength(0);
      expect(result.supportedTools[0]).toEqual({
        name: 'search_web',
        description: 'Search the web',
        isEnhanced: false
      });
    });

    test('should identify unsupported tools', () => {
      const supportedTools = ['search_web', 'nonexistent_tool'];

      const result = validateCharacterToolSupport(supportedTools);

      expect(result.isValid).toBe(false);
      expect(result.supportedTools).toHaveLength(1);
      expect(result.unsupportedTools).toEqual(['nonexistent_tool']);
      expect(result.message).toContain('nonexistent_tool');
    });

    test('should handle empty tool list', () => {
      const result = validateCharacterToolSupport([]);

      expect(result.isValid).toBe(true);
      expect(result.supportedTools).toHaveLength(0);
      expect(result.unsupportedTools).toHaveLength(0);
    });

    test('should identify enhanced tools', () => {
      const supportedTools = ['clarify', 'answerUser'];

      const result = validateCharacterToolSupport(supportedTools);

      expect(result.isValid).toBe(true);
      expect(result.supportedTools[0].isEnhanced).toBe(true);
      expect(result.supportedTools[1].isEnhanced).toBe(true);
    });
  });

  describe('createCompatibilityContext', () => {
    test('should create enhanced context from original context', () => {
      const originalContext = {
        allowedTools: ['search_web'],
        tavilyApiKey: 'test-key'
      };

      const result = createCompatibilityContext(originalContext);

      expect(result).toEqual({
        allowedTools: ['search_web'],
        tavilyApiKey: 'test-key',
        availableTools: expect.any(Array),
        compatibility: {
          legacyMode: true,
          enhancedMode: true,
          adapterVersion: '1.0.0'
        }
      });
      expect(result.availableTools).toHaveLength(4); // clarify, answerUser, search_web, calculator
    });

    test('should handle missing allowedTools', () => {
      const originalContext = {
        tavilyApiKey: 'test-key'
      };

      const result = createCompatibilityContext(originalContext);

      expect(result.allowedTools).toEqual([]);
    });

    test('should handle invalid allowedTools', () => {
      const originalContext = {
        allowedTools: 'not-an-array'
      };

      const result = createCompatibilityContext(originalContext);

      expect(result.allowedTools).toEqual([]);
    });
  });

  describe('migrateLegacyToolConfig', () => {
    test('should migrate standard supportedTools array', () => {
      const legacyConfig = {
        supportedTools: ['search_web', 'calculator']
      };

      const result = migrateLegacyToolConfig(legacyConfig);

      expect(result.migrated).toBe(true);
      expect(result.supportedTools).toEqual(['search_web', 'calculator']);
      expect(result.errors).toHaveLength(0);
    });

    test('should migrate alternative tools array format', () => {
      const legacyConfig = {
        tools: ['search_web', 'calculator']
      };

      const result = migrateLegacyToolConfig(legacyConfig);

      expect(result.migrated).toBe(true);
      expect(result.supportedTools).toEqual(['search_web', 'calculator']);
    });

    test('should migrate single tool string format', () => {
      const legacyConfig = {
        supportedTools: 'search_web'
      };

      const result = migrateLegacyToolConfig(legacyConfig);

      expect(result.migrated).toBe(true);
      expect(result.supportedTools).toEqual(['search_web']);
    });

    test('should handle invalid tools', () => {
      const legacyConfig = {
        supportedTools: ['search_web', 'invalid_tool']
      };

      const result = migrateLegacyToolConfig(legacyConfig);

      expect(result.migrated).toBe(true);
      expect(result.supportedTools).toEqual(['search_web']);
      expect(result.errors).toContain("Tool 'invalid_tool' is not available");
    });

    test('should handle invalid config', () => {
      const result = migrateLegacyToolConfig(null);

      expect(result.migrated).toBe(false);
      expect(result.errors).toContain('Invalid legacy configuration');
    });
  });

  describe('getCompatibilityReport', () => {
    test('should generate compatibility report', () => {
      const report = getCompatibilityReport();

      expect(report).toHaveProperty('legacyTools');
      expect(report).toHaveProperty('enhancedTools');
      expect(report).toHaveProperty('compatibility');
      expect(report).toHaveProperty('recommendations');

      expect(report.legacyTools.count).toBe(2);
      expect(report.enhancedTools.count).toBe(4);
      expect(report.enhancedTools.newTools).toEqual(['clarify', 'answerUser']);
      expect(report.compatibility.allLegacyToolsSupported).toBe(true);
    });
  });
});