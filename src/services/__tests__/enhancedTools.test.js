// src/services/__tests__/enhancedTools.test.js

import {
  enhancedToolMetadata,
  enhancedToolImplementations,
  getEnhancedTools,
  getEnhancedToolImplementations,
  isEnhancedTool,
  getToolMetadata,
  validateToolParameters,
  executeEnhancedTool,
  getFilteredTools,
  createEnhancedContext,
  formatToolResult
} from '../enhancedTools';

// Mock existing tools
jest.mock('../tools', () => ({
  toolImplementations: {
    calculator: jest.fn(),
    search_web: jest.fn()
  },
  toolMetadata: [
    {
      agent_id: 'calculator',
      description: 'Performs calculations',
      input_format: { expression: 'string' },
      output_format: { result: 'number' }
    },
    {
      agent_id: 'search_web',
      description: 'Searches the web',
      input_format: { query: 'string' },
      output_format: { summary: 'string' }
    }
  ]
}));

// Mock constants
jest.mock('../../constants', () => ({
  IS_DEBUG: false
}));

describe('Enhanced Tools System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('enhancedToolMetadata', () => {
    test('should include clarify and answerUser tools', () => {
      const clarifyTool = enhancedToolMetadata.find(tool => tool.agent_id === 'clarify');
      const answerUserTool = enhancedToolMetadata.find(tool => tool.agent_id === 'answerUser');
      
      expect(clarifyTool).toBeDefined();
      expect(clarifyTool.description).toContain('clarification');
      expect(clarifyTool.input_format).toEqual({ question: 'string' });
      
      expect(answerUserTool).toBeDefined();
      expect(answerUserTool.description).toContain('final response');
      expect(answerUserTool.input_format).toEqual({ answer: 'string' });
    });

    test('should include existing tools', () => {
      const calculatorTool = enhancedToolMetadata.find(tool => tool.agent_id === 'calculator');
      const searchTool = enhancedToolMetadata.find(tool => tool.agent_id === 'search_web');
      
      expect(calculatorTool).toBeDefined();
      expect(searchTool).toBeDefined();
    });
  });

  describe('enhancedToolImplementations', () => {
    test('should include clarify and answerUser implementations', () => {
      expect(enhancedToolImplementations.clarify).toBeDefined();
      expect(enhancedToolImplementations.answerUser).toBeDefined();
      expect(typeof enhancedToolImplementations.clarify).toBe('function');
      expect(typeof enhancedToolImplementations.answerUser).toBe('function');
    });

    test('should include existing tool implementations', () => {
      expect(enhancedToolImplementations.calculator).toBeDefined();
      expect(enhancedToolImplementations.search_web).toBeDefined();
    });
  });

  describe('clarify tool', () => {
    test('should execute successfully with valid question', async () => {
      const result = await enhancedToolImplementations.clarify({
        question: 'What do you mean by that?'
      });
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('Clarification request prepared');
      expect(result.data.type).toBe('clarification');
      expect(result.data.question).toBe('What do you mean by that?');
      expect(result.data.requiresUserResponse).toBe(true);
      expect(result.data.timestamp).toBeDefined();
    });

    test('should fail with empty question', async () => {
      const result = await enhancedToolImplementations.clarify({
        question: ''
      });
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('non-empty question parameter');
    });

    test('should fail with missing question', async () => {
      const result = await enhancedToolImplementations.clarify({});
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('non-empty question parameter');
    });

    test('should trim whitespace from question', async () => {
      const result = await enhancedToolImplementations.clarify({
        question: '  What do you mean?  '
      });
      
      expect(result.success).toBe(true);
      expect(result.data.question).toBe('What do you mean?');
    });
  });

  describe('answerUser tool', () => {
    test('should execute successfully with valid answer', async () => {
      const result = await enhancedToolImplementations.answerUser({
        answer: 'Here is your answer'
      });
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('Final answer prepared');
      expect(result.data.type).toBe('final_answer');
      expect(result.data.answer).toBe('Here is your answer');
      expect(result.data.isComplete).toBe(true);
      expect(result.data.timestamp).toBeDefined();
    });

    test('should fail with empty answer', async () => {
      const result = await enhancedToolImplementations.answerUser({
        answer: ''
      });
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('non-empty answer parameter');
    });

    test('should fail with missing answer', async () => {
      const result = await enhancedToolImplementations.answerUser({});
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('non-empty answer parameter');
    });

    test('should trim whitespace from answer', async () => {
      const result = await enhancedToolImplementations.answerUser({
        answer: '  Here is your answer  '
      });
      
      expect(result.success).toBe(true);
      expect(result.data.answer).toBe('Here is your answer');
    });
  });

  describe('getEnhancedTools', () => {
    test('should return all enhanced tool metadata', () => {
      const tools = getEnhancedTools();
      
      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(2); // At least clarify, answerUser, and existing tools
      expect(tools.some(tool => tool.agent_id === 'clarify')).toBe(true);
      expect(tools.some(tool => tool.agent_id === 'answerUser')).toBe(true);
    });
  });

  describe('getEnhancedToolImplementations', () => {
    test('should return all tool implementations', () => {
      const implementations = getEnhancedToolImplementations();
      
      expect(typeof implementations).toBe('object');
      expect(implementations.clarify).toBeDefined();
      expect(implementations.answerUser).toBeDefined();
      expect(implementations.calculator).toBeDefined();
    });
  });

  describe('isEnhancedTool', () => {
    test('should return true for enhanced tools', () => {
      expect(isEnhancedTool('clarify')).toBe(true);
      expect(isEnhancedTool('answerUser')).toBe(true);
    });

    test('should return false for regular tools', () => {
      expect(isEnhancedTool('calculator')).toBe(false);
      expect(isEnhancedTool('search_web')).toBe(false);
      expect(isEnhancedTool('nonexistent')).toBe(false);
    });
  });

  describe('getToolMetadata', () => {
    test('should return metadata for existing tool', () => {
      const metadata = getToolMetadata('clarify');
      
      expect(metadata).toBeDefined();
      expect(metadata.agent_id).toBe('clarify');
      expect(metadata.description).toContain('clarification');
    });

    test('should return null for non-existent tool', () => {
      const metadata = getToolMetadata('nonexistent');
      
      expect(metadata).toBeNull();
    });
  });

  describe('validateToolParameters', () => {
    test('should validate correct parameters', () => {
      const validation = validateToolParameters('clarify', { question: 'Test?' });
      
      expect(validation.valid).toBe(true);
      expect(validation.message).toBe('Parameters are valid');
    });

    test('should reject missing parameters', () => {
      const validation = validateToolParameters('clarify', {});
      
      expect(validation.valid).toBe(false);
      expect(validation.message).toContain('Missing required parameters');
      expect(validation.message).toContain('question');
    });

    test('should reject non-object parameters', () => {
      const validation = validateToolParameters('clarify', 'not an object');
      
      expect(validation.valid).toBe(false);
      expect(validation.message).toContain('must be an object');
    });

    test('should reject unknown tool', () => {
      const validation = validateToolParameters('unknown', {});
      
      expect(validation.valid).toBe(false);
      expect(validation.message).toContain('not found');
    });
  });

  describe('executeEnhancedTool', () => {
    test('should execute tool successfully', async () => {
      const result = await executeEnhancedTool('clarify', { question: 'Test?' });
      
      expect(result.success).toBe(true);
      expect(result.data.question).toBe('Test?');
    });

    test('should handle parameter validation errors', async () => {
      const result = await executeEnhancedTool('clarify', {});
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Missing required parameters');
    });

    test('should handle unknown tool', async () => {
      const result = await executeEnhancedTool('unknown', {});
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });

    test('should handle tool execution errors', async () => {
      // Mock a tool that throws an error
      const originalClarify = enhancedToolImplementations.clarify;
      enhancedToolImplementations.clarify = jest.fn().mockRejectedValue(new Error('Test error'));
      
      const result = await executeEnhancedTool('clarify', { question: 'Test?' });
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Tool execution failed');
      expect(result.message).toContain('Test error');
      
      // Restore original implementation
      enhancedToolImplementations.clarify = originalClarify;
    });
  });

  describe('getFilteredTools', () => {
    test('should always include enhanced tools', () => {
      const tools = getFilteredTools([]);
      
      expect(tools.some(tool => tool.agent_id === 'clarify')).toBe(true);
      expect(tools.some(tool => tool.agent_id === 'answerUser')).toBe(true);
    });

    test('should include allowed regular tools', () => {
      const tools = getFilteredTools(['calculator']);
      
      expect(tools.some(tool => tool.agent_id === 'clarify')).toBe(true);
      expect(tools.some(tool => tool.agent_id === 'answerUser')).toBe(true);
      expect(tools.some(tool => tool.agent_id === 'calculator')).toBe(true);
      expect(tools.some(tool => tool.agent_id === 'search_web')).toBe(false);
    });
  });

  describe('createEnhancedContext', () => {
    test('should create enhanced context', () => {
      const baseContext = {
        allowedTools: ['calculator'],
        apiKey: 'test-key'
      };
      
      const context = createEnhancedContext(baseContext);
      
      expect(context.enhancedTools).toBe(true);
      expect(context.toolMetadata).toBeDefined();
      expect(context.availableTools).toBeDefined();
      expect(context.apiKey).toBe('test-key');
    });

    test('should handle empty base context', () => {
      const context = createEnhancedContext();
      
      expect(context.enhancedTools).toBe(true);
      expect(context.toolMetadata).toBeDefined();
      expect(context.availableTools).toBeDefined();
    });
  });

  describe('formatToolResult', () => {
    test('should format clarify tool result', () => {
      const result = {
        success: true,
        message: 'Clarification prepared',
        data: { question: 'What do you mean?', timestamp: 123456 }
      };
      
      const formatted = formatToolResult(result, 'clarify');
      
      expect(formatted.toolName).toBe('clarify');
      expect(formatted.formatted).toBe('Question: What do you mean?');
      expect(formatted.requiresResponse).toBe(true);
      expect(formatted.executionTime).toBe(123456);
    });

    test('should format answerUser tool result', () => {
      const result = {
        success: true,
        message: 'Answer prepared',
        data: { answer: 'Here is the answer', timestamp: 123456 }
      };
      
      const formatted = formatToolResult(result, 'answerUser');
      
      expect(formatted.toolName).toBe('answerUser');
      expect(formatted.formatted).toBe('Here is the answer');
      expect(formatted.isComplete).toBe(true);
    });

    test('should format regular tool result', () => {
      const result = {
        success: true,
        message: 'Tool executed successfully',
        data: { result: 42 }
      };
      
      const formatted = formatToolResult(result, 'calculator');
      
      expect(formatted.toolName).toBe('calculator');
      expect(formatted.formatted).toBe('Tool executed successfully');
    });

    test('should handle failed tool result', () => {
      const result = {
        success: false,
        message: 'Tool failed',
        data: null
      };
      
      const formatted = formatToolResult(result, 'calculator');
      
      expect(formatted.formatted).toBe('Tool failed');
    });

    test('should handle invalid result', () => {
      const formatted = formatToolResult(null, 'test');
      
      expect(formatted.success).toBe(false);
      expect(formatted.formatted).toBe('Tool execution failed');
    });
  });
});