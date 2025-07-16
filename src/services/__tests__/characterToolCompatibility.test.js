// src/services/__tests__/characterToolCompatibility.test.js

import { validateCharacterToolCompatibility } from '../enhancedTools';
import { validateCharacterToolSupport, getCompatibilityReport } from '../toolCompatibilityAdapter';

// Mock the existing character configurations
const mockCharacterConfigs = [
  {
    id: 'ai-assistant',
    name: 'AI Assistant',
    supportedTools: ['calculator', 'search_web', 'image_generator']
  },
  {
    id: 'finance-manager',
    name: 'Finance Manager',
    supportedTools: ['add_transaction', 'get_financial_report', 'set_budget', 'get_budget_status']
  },
  {
    id: 'sarcastic-dev',
    name: 'Sarcastic Developer',
    supportedTools: ['calculator', 'search_web']
  }
];

// Mock dependencies
jest.mock('../tools', () => ({
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
    },
    {
      agent_id: 'image_generator',
      description: 'Generate images',
      input_format: { prompt: 'string' }
    },
    {
      agent_id: 'add_transaction',
      description: 'Add financial transaction',
      input_format: { type: 'string', amount: 'number', category: 'string' }
    },
    {
      agent_id: 'get_financial_report',
      description: 'Get financial report',
      input_format: { period: 'string' }
    },
    {
      agent_id: 'set_budget',
      description: 'Set budget',
      input_format: { category: 'string', amount: 'number' }
    },
    {
      agent_id: 'get_budget_status',
      description: 'Get budget status',
      input_format: {}
    }
  ],
  toolImplementations: {}
}));

describe('Character Tool Compatibility', () => {
  describe('validateCharacterToolCompatibility', () => {
    test('should validate AI Assistant character tools', () => {
      const aiAssistant = mockCharacterConfigs[0];
      const result = validateCharacterToolCompatibility(aiAssistant.supportedTools);

      expect(result.isCompatible).toBe(true);
      expect(result.supportedTools).toEqual(['calculator', 'search_web', 'image_generator']);
      expect(result.unsupportedTools).toHaveLength(0);
      expect(result.message).toBe('All character tools are supported');
    });

    test('should validate Finance Manager character tools', () => {
      const financeManager = mockCharacterConfigs[1];
      const result = validateCharacterToolCompatibility(financeManager.supportedTools);

      expect(result.isCompatible).toBe(true);
      expect(result.supportedTools).toEqual([
        'add_transaction', 
        'get_financial_report', 
        'set_budget', 
        'get_budget_status'
      ]);
      expect(result.unsupportedTools).toHaveLength(0);
    });

    test('should validate Sarcastic Developer character tools', () => {
      const sarcasticDev = mockCharacterConfigs[2];
      const result = validateCharacterToolCompatibility(sarcasticDev.supportedTools);

      expect(result.isCompatible).toBe(true);
      expect(result.supportedTools).toEqual(['calculator', 'search_web']);
      expect(result.unsupportedTools).toHaveLength(0);
    });

    test('should handle character with unsupported tools', () => {
      const characterWithUnsupportedTools = ['calculator', 'nonexistent_tool', 'another_fake_tool'];
      const result = validateCharacterToolCompatibility(characterWithUnsupportedTools);

      expect(result.isCompatible).toBe(false);
      expect(result.supportedTools).toEqual(['calculator']);
      expect(result.unsupportedTools).toEqual(['nonexistent_tool', 'another_fake_tool']);
      expect(result.message).toContain('Character uses unsupported tools');
    });

    test('should handle empty character tool list', () => {
      const result = validateCharacterToolCompatibility([]);

      expect(result.isCompatible).toBe(true);
      expect(result.supportedTools).toHaveLength(0);
      expect(result.unsupportedTools).toHaveLength(0);
    });
  });

  describe('validateCharacterToolSupport (Adapter)', () => {
    test('should provide detailed validation for AI Assistant', () => {
      const aiAssistant = mockCharacterConfigs[0];
      const result = validateCharacterToolSupport(aiAssistant.supportedTools);

      expect(result.isValid).toBe(true);
      expect(result.supportedTools).toHaveLength(3);
      expect(result.totalSupported).toBe(3);
      
      // Check that tool descriptions are included
      const searchTool = result.supportedTools.find(tool => tool.name === 'search_web');
      expect(searchTool).toBeDefined();
      expect(searchTool.description).toBe('Search the web');
      expect(searchTool.isEnhanced).toBe(false);
    });

    test('should identify enhanced tools when used by characters', () => {
      const characterWithEnhancedTools = ['clarify', 'answerUser', 'calculator'];
      const result = validateCharacterToolSupport(characterWithEnhancedTools);

      expect(result.isValid).toBe(true);
      
      const clarifyTool = result.supportedTools.find(tool => tool.name === 'clarify');
      const answerTool = result.supportedTools.find(tool => tool.name === 'answerUser');
      
      expect(clarifyTool.isEnhanced).toBe(true);
      expect(answerTool.isEnhanced).toBe(true);
    });
  });

  describe('Full Character Configuration Compatibility', () => {
    test('should verify all existing characters are fully compatible', () => {
      const compatibilityResults = mockCharacterConfigs.map(character => ({
        character: character.name,
        compatibility: validateCharacterToolCompatibility(character.supportedTools),
        validation: validateCharacterToolSupport(character.supportedTools)
      }));

      // All characters should be compatible
      compatibilityResults.forEach(result => {
        expect(result.compatibility.isCompatible).toBe(true);
        expect(result.validation.isValid).toBe(true);
      });

      // Generate summary report
      const totalTools = compatibilityResults.reduce((sum, result) => 
        sum + result.compatibility.supportedTools.length, 0
      );

      expect(totalTools).toBeGreaterThan(0);
      
      console.log('Character Compatibility Summary:', {
        totalCharacters: compatibilityResults.length,
        totalToolsSupported: totalTools,
        allCompatible: compatibilityResults.every(r => r.compatibility.isCompatible)
      });
    });

    test('should generate comprehensive compatibility report', () => {
      const report = getCompatibilityReport();

      expect(report.legacyTools.count).toBeGreaterThan(0);
      expect(report.enhancedTools.count).toBeGreaterThan(report.legacyTools.count);
      expect(report.compatibility.allLegacyToolsSupported).toBe(true);
      expect(report.enhancedTools.newTools).toContain('clarify');
      expect(report.enhancedTools.newTools).toContain('answerUser');
      expect(report.recommendations).toContain(
        'All existing character configurations should continue to work'
      );
    });
  });

  describe('Tool Interface Preservation', () => {
    test('should preserve existing tool function signatures', () => {
      // This test verifies that existing tools maintain their interfaces
      const existingToolNames = [
        'search_web',
        'calculator', 
        'image_generator',
        'add_transaction',
        'get_financial_report',
        'set_budget',
        'get_budget_status'
      ];

      existingToolNames.forEach(toolName => {
        const compatibility = validateCharacterToolCompatibility([toolName]);
        expect(compatibility.isCompatible).toBe(true);
        expect(compatibility.supportedTools).toContain(toolName);
      });
    });

    test('should maintain tool metadata structure', () => {
      const validation = validateCharacterToolSupport(['search_web']);
      const searchTool = validation.supportedTools[0];

      // Verify the tool metadata structure is preserved
      expect(searchTool).toHaveProperty('name');
      expect(searchTool).toHaveProperty('description');
      expect(searchTool).toHaveProperty('isEnhanced');
      expect(typeof searchTool.name).toBe('string');
      expect(typeof searchTool.description).toBe('string');
      expect(typeof searchTool.isEnhanced).toBe('boolean');
    });
  });

  describe('Backward Compatibility Edge Cases', () => {
    test('should handle undefined supportedTools', () => {
      const result = validateCharacterToolCompatibility(undefined);
      
      expect(result.isCompatible).toBe(true);
      expect(result.supportedTools).toHaveLength(0);
      expect(result.unsupportedTools).toHaveLength(0);
    });

    test('should handle null supportedTools', () => {
      const result = validateCharacterToolCompatibility(null);
      
      expect(result.isCompatible).toBe(true);
      expect(result.supportedTools).toHaveLength(0);
      expect(result.unsupportedTools).toHaveLength(0);
    });

    test('should handle mixed case tool names', () => {
      const mixedCaseTools = ['Search_Web', 'CALCULATOR'];
      const result = validateCharacterToolCompatibility(mixedCaseTools);
      
      // Should not match due to case sensitivity (preserving existing behavior)
      expect(result.isCompatible).toBe(false);
      expect(result.unsupportedTools).toEqual(['Search_Web', 'CALCULATOR']);
    });

    test('should handle duplicate tool names', () => {
      const duplicateTools = ['calculator', 'search_web', 'calculator'];
      const result = validateCharacterToolCompatibility(duplicateTools);
      
      expect(result.isCompatible).toBe(true);
      // Should include duplicates as they appear in the original array
      expect(result.supportedTools).toEqual(['calculator', 'search_web', 'calculator']);
    });
  });
});