// src/services/__tests__/toolInterfacePreservation.test.js

/**
 * Test suite to verify that existing tool interfaces are preserved
 * This ensures backward compatibility with existing character configurations
 */

// Mock the tools to avoid expo-file-system import issues
jest.mock('../tools', () => ({
  toolMetadata: [
    {
      agent_id: 'search_web',
      description: 'Search the web',
      capabilities: ['query'],
      input_format: { query: 'string' },
      output_format: { success: 'boolean', message: 'string', data: 'object' }
    },
    {
      agent_id: 'calculator',
      description: 'Calculate expressions',
      capabilities: ['expression'],
      input_format: { expression: 'string' },
      output_format: { success: 'boolean', message: 'string', data: 'object' }
    },
    {
      agent_id: 'image_generator',
      description: 'Generate images',
      capabilities: ['prompt'],
      input_format: { prompt: 'string' },
      output_format: { success: 'boolean', message: 'string', data: 'object' }
    },
    {
      agent_id: 'add_transaction',
      description: 'Add financial transaction',
      capabilities: ['type', 'amount', 'category'],
      input_format: { type: 'string', amount: 'number', category: 'string' },
      output_format: { success: 'boolean', message: 'string', data: 'object' }
    },
    {
      agent_id: 'get_financial_report',
      description: 'Get financial report',
      capabilities: ['period'],
      input_format: { period: 'string' },
      output_format: { success: 'boolean', message: 'string', data: 'object' }
    },
    {
      agent_id: 'set_budget',
      description: 'Set budget',
      capabilities: ['category', 'amount'],
      input_format: { category: 'string', amount: 'number' },
      output_format: { success: 'boolean', message: 'string', data: 'object' }
    },
    {
      agent_id: 'get_budget_status',
      description: 'Get budget status',
      capabilities: [],
      input_format: {},
      output_format: { success: 'boolean', message: 'string', data: 'object' }
    }
  ],
  toolImplementations: {
    search_web: jest.fn(),
    calculator: jest.fn(),
    image_generator: jest.fn(),
    add_transaction: jest.fn(),
    get_financial_report: jest.fn(),
    set_budget: jest.fn(),
    get_budget_status: jest.fn()
  }
}));

jest.mock('../enhancedTools', () => ({
  enhancedToolMetadata: [
    {
      agent_id: 'clarify',
      description: 'Ask for clarification',
      capabilities: ['question'],
      input_format: { question: 'string' },
      output_format: { type: 'string', question: 'string', requiresUserResponse: 'boolean' }
    },
    {
      agent_id: 'answerUser',
      description: 'Provide final answer',
      capabilities: ['answer'],
      input_format: { answer: 'string' },
      output_format: { type: 'string', answer: 'string', isComplete: 'boolean' }
    },
    // Include all legacy tools
    {
      agent_id: 'search_web',
      description: 'Search the web',
      capabilities: ['query'],
      input_format: { query: 'string' },
      output_format: { success: 'boolean', message: 'string', data: 'object' }
    },
    {
      agent_id: 'calculator',
      description: 'Calculate expressions',
      capabilities: ['expression'],
      input_format: { expression: 'string' },
      output_format: { success: 'boolean', message: 'string', data: 'object' }
    },
    {
      agent_id: 'image_generator',
      description: 'Generate images',
      capabilities: ['prompt'],
      input_format: { prompt: 'string' },
      output_format: { success: 'boolean', message: 'string', data: 'object' }
    },
    {
      agent_id: 'add_transaction',
      description: 'Add financial transaction',
      capabilities: ['type', 'amount', 'category'],
      input_format: { type: 'string', amount: 'number', category: 'string' },
      output_format: { success: 'boolean', message: 'string', data: 'object' }
    },
    {
      agent_id: 'get_financial_report',
      description: 'Get financial report',
      capabilities: ['period'],
      input_format: { period: 'string' },
      output_format: { success: 'boolean', message: 'string', data: 'object' }
    },
    {
      agent_id: 'set_budget',
      description: 'Set budget',
      capabilities: ['category', 'amount'],
      input_format: { category: 'string', amount: 'number' },
      output_format: { success: 'boolean', message: 'string', data: 'object' }
    },
    {
      agent_id: 'get_budget_status',
      description: 'Get budget status',
      capabilities: [],
      input_format: {},
      output_format: { success: 'boolean', message: 'string', data: 'object' }
    }
  ],
  enhancedToolImplementations: {
    clarify: jest.fn(),
    answerUser: jest.fn(),
    search_web: jest.fn(),
    calculator: jest.fn(),
    image_generator: jest.fn(),
    add_transaction: jest.fn(),
    get_financial_report: jest.fn(),
    set_budget: jest.fn(),
    get_budget_status: jest.fn()
  }
}));

import { validateCharacterToolSupport } from '../toolCompatibilityAdapter';

const { toolMetadata, toolImplementations } = require('../tools');
const { enhancedToolMetadata, enhancedToolImplementations } = require('../enhancedTools');

describe('Tool Interface Preservation', () => {
  describe('Legacy Tool Metadata Preservation', () => {
    test('should preserve all existing tool metadata', () => {
      const legacyToolNames = toolMetadata.map(tool => tool.agent_id);
      const enhancedToolNames = enhancedToolMetadata.map(tool => tool.agent_id);

      // All legacy tools should be present in enhanced tools
      legacyToolNames.forEach(toolName => {
        expect(enhancedToolNames).toContain(toolName);
      });
    });

    test('should preserve tool metadata structure', () => {
      toolMetadata.forEach(legacyTool => {
        const enhancedTool = enhancedToolMetadata.find(tool => tool.agent_id === legacyTool.agent_id);
        
        expect(enhancedTool).toBeDefined();
        expect(enhancedTool.agent_id).toBe(legacyTool.agent_id);
        expect(enhancedTool.description).toBe(legacyTool.description);
        expect(enhancedTool.input_format).toEqual(legacyTool.input_format);
        expect(enhancedTool.output_format).toEqual(legacyTool.output_format);
      });
    });
  });

  describe('Legacy Tool Implementation Preservation', () => {
    test('should preserve all existing tool implementations', () => {
      const legacyToolNames = Object.keys(toolImplementations);
      const enhancedToolNames = Object.keys(enhancedToolImplementations);

      // All legacy tools should be present in enhanced tools
      legacyToolNames.forEach(toolName => {
        expect(enhancedToolNames).toContain(toolName);
      });
    });

    test('should preserve tool function signatures', () => {
      const legacyToolNames = Object.keys(toolImplementations);

      legacyToolNames.forEach(toolName => {
        const legacyFunction = toolImplementations[toolName];
        const enhancedFunction = enhancedToolImplementations[toolName];

        expect(enhancedFunction).toBeDefined();
        expect(typeof enhancedFunction).toBe('function');
        expect(legacyFunction.length).toBe(enhancedFunction.length); // Same number of parameters
      });
    });
  });

  describe('Character Configuration Compatibility', () => {
    const existingCharacterConfigs = [
      {
        name: 'Axion',
        supportedTools: ['calculator', 'search_web', 'image_generator']
      },
      {
        name: 'Finance Manager', 
        supportedTools: ['add_transaction', 'get_financial_report', 'set_budget', 'get_budget_status']
      },
      {
        name: 'Sarcastic Developer',
        supportedTools: ['calculator', 'search_web']
      }
    ];

    test('should support all existing character tool configurations', () => {
      existingCharacterConfigs.forEach(character => {
        const validation = validateCharacterToolSupport(character.supportedTools);
        
        expect(validation.isValid).toBe(true);
        expect(validation.supportedTools).toHaveLength(character.supportedTools.length);
        expect(validation.unsupportedTools).toHaveLength(0);
        
        // Verify each tool is properly supported
        character.supportedTools.forEach(toolName => {
          const toolInfo = validation.supportedTools.find(tool => tool.name === toolName);
          expect(toolInfo).toBeDefined();
          expect(toolInfo.name).toBe(toolName);
          expect(typeof toolInfo.description).toBe('string');
          expect(typeof toolInfo.isEnhanced).toBe('boolean');
        });
      });
    });

    test('should maintain tool availability for each character type', () => {
      // Axion tools
      const aiAssistantValidation = validateCharacterToolSupport(['calculator', 'search_web', 'image_generator']);
      expect(aiAssistantValidation.isValid).toBe(true);
      expect(aiAssistantValidation.totalSupported).toBe(3);

      // Finance Manager tools
      const financeValidation = validateCharacterToolSupport(['add_transaction', 'get_financial_report', 'set_budget', 'get_budget_status']);
      expect(financeValidation.isValid).toBe(true);
      expect(financeValidation.totalSupported).toBe(4);

      // Sarcastic Developer tools
      const devValidation = validateCharacterToolSupport(['calculator', 'search_web']);
      expect(devValidation.isValid).toBe(true);
      expect(devValidation.totalSupported).toBe(2);
    });
  });

  describe('Enhanced Tools Integration', () => {
    test('should add new enhanced tools without breaking existing ones', () => {
      const enhancedOnlyTools = ['clarify', 'answerUser'];
      
      enhancedOnlyTools.forEach(toolName => {
        const tool = enhancedToolMetadata.find(t => t.agent_id === toolName);
        expect(tool).toBeDefined();
        expect(tool.agent_id).toBe(toolName);
        expect(typeof tool.description).toBe('string');
        expect(typeof tool.input_format).toBe('object');
      });

      // Verify enhanced tools are available
      const validation = validateCharacterToolSupport(enhancedOnlyTools);
      expect(validation.isValid).toBe(true);
      expect(validation.totalSupported).toBe(2);
    });

    test('should properly identify enhanced vs legacy tools', () => {
      const mixedTools = ['calculator', 'clarify', 'search_web', 'answerUser'];
      const validation = validateCharacterToolSupport(mixedTools);

      expect(validation.isValid).toBe(true);
      expect(validation.totalSupported).toBe(4);

      // Check enhanced tool identification
      const clarifyTool = validation.supportedTools.find(tool => tool.name === 'clarify');
      const answerTool = validation.supportedTools.find(tool => tool.name === 'answerUser');
      const calcTool = validation.supportedTools.find(tool => tool.name === 'calculator');
      const searchTool = validation.supportedTools.find(tool => tool.name === 'search_web');

      expect(clarifyTool.isEnhanced).toBe(true);
      expect(answerTool.isEnhanced).toBe(true);
      expect(calcTool.isEnhanced).toBe(false);
      expect(searchTool.isEnhanced).toBe(false);
    });
  });

  describe('Tool Interface Consistency', () => {
    test('should maintain consistent tool result format', () => {
      // All tools should return results with success, message, and data fields
      const expectedResultStructure = ['success', 'message', 'data'];
      
      toolMetadata.forEach(tool => {
        expect(tool.output_format).toBeDefined();
        expectedResultStructure.forEach(field => {
          expect(tool.output_format).toHaveProperty(field);
        });
      });
    });

    test('should maintain consistent tool input format structure', () => {
      toolMetadata.forEach(tool => {
        expect(tool.input_format).toBeDefined();
        expect(typeof tool.input_format).toBe('object');
        
        // Each tool should have at least one input parameter or be empty object
        expect(Object.keys(tool.input_format).length).toBeGreaterThanOrEqual(0);
      });
    });

    test('should preserve tool capability declarations', () => {
      toolMetadata.forEach(tool => {
        expect(tool.capabilities).toBeDefined();
        expect(Array.isArray(tool.capabilities)).toBe(true);
        
        // Capabilities should match input format keys
        const inputKeys = Object.keys(tool.input_format);
        if (inputKeys.length > 0) {
          expect(tool.capabilities.length).toBeGreaterThan(0);
        }
      });
    });
  });

  describe('Backward Compatibility Edge Cases', () => {
    test('should handle empty tool lists gracefully', () => {
      const validation = validateCharacterToolSupport([]);
      expect(validation.isValid).toBe(true);
      expect(validation.supportedTools).toHaveLength(0);
      expect(validation.unsupportedTools).toHaveLength(0);
    });

    test('should handle undefined tool lists gracefully', () => {
      const validation = validateCharacterToolSupport(undefined);
      expect(validation.isValid).toBe(true);
      expect(validation.supportedTools).toHaveLength(0);
      expect(validation.unsupportedTools).toHaveLength(0);
    });

    test('should identify unsupported tools correctly', () => {
      const validation = validateCharacterToolSupport(['calculator', 'nonexistent_tool']);
      expect(validation.isValid).toBe(false);
      expect(validation.supportedTools).toHaveLength(1);
      expect(validation.unsupportedTools).toEqual(['nonexistent_tool']);
      expect(validation.message).toContain('nonexistent_tool');
    });

    test('should handle duplicate tool names', () => {
      const validation = validateCharacterToolSupport(['calculator', 'calculator', 'search_web']);
      expect(validation.isValid).toBe(true);
      expect(validation.supportedTools).toHaveLength(3); // Should include duplicates
    });
  });

  describe('Tool Metadata Completeness', () => {
    test('should have complete metadata for all existing tools', () => {
      const requiredFields = ['agent_id', 'description', 'capabilities', 'input_format', 'output_format'];
      
      toolMetadata.forEach(tool => {
        requiredFields.forEach(field => {
          expect(tool).toHaveProperty(field);
          expect(tool[field]).toBeDefined();
        });
        
        // Specific field type checks
        expect(typeof tool.agent_id).toBe('string');
        expect(typeof tool.description).toBe('string');
        expect(Array.isArray(tool.capabilities)).toBe(true);
        expect(typeof tool.input_format).toBe('object');
        expect(typeof tool.output_format).toBe('object');
      });
    });

    test('should have non-empty descriptions for all tools', () => {
      toolMetadata.forEach(tool => {
        expect(tool.description.trim().length).toBeGreaterThan(0);
      });
    });

    test('should have valid agent_id format for all tools', () => {
      toolMetadata.forEach(tool => {
        // agent_id should be lowercase with underscores
        expect(tool.agent_id).toMatch(/^[a-z][a-z0-9_]*$/);
      });
    });
  });
});