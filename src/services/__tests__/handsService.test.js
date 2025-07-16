// src/services/__tests__/handsService.test.js

import {
    executeCommand,
    executeMultipleCommands,
    getAvailableToolNames,
    createExecutionContext
} from '../handsService';

// Mock tool implementations
jest.mock('../tools', () => ({
    toolImplementations: {
        calculator: jest.fn(),
        search_web: jest.fn()
    }
}));

// Mock constants
jest.mock('../../constants', () => ({
    IS_DEBUG: false
}));

describe('Hands Service', () => {
    const mockTools = [
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
    ];

    const mockContext = {
        allowedTools: ['calculator', 'search_web'],
        availableTools: mockTools,
        tavilyApiKey: 'test-key'
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('executeCommand', () => {
        test('should reject invalid command object', async () => {
            const result = await executeCommand(null, mockContext);

            expect(result.success).toBe(false);
            expect(result.message).toContain('Invalid command: must be an object');
        });

        test('should reject command without tool_name', async () => {
            const command = { parameters: {} };
            const result = await executeCommand(command, mockContext);

            expect(result.success).toBe(false);
            expect(result.message).toContain('tool_name is required');
        });

        test('should reject command without parameters', async () => {
            const command = { tool_name: 'calculator' };
            const result = await executeCommand(command, mockContext);

            expect(result.success).toBe(false);
            expect(result.message).toContain('parameters is required');
        });

        test('should reject unauthorized tool', async () => {
            const command = {
                tool_name: 'unauthorized_tool',
                parameters: { test: 'value' }
            };

            const result = await executeCommand(command, mockContext);

            expect(result.success).toBe(false);
            expect(result.message).toContain('not authorized');
        });

        test('should validate tool parameters', async () => {
            const command = {
                tool_name: 'calculator',
                parameters: {} // Missing required 'expression' parameter
            };

            const result = await executeCommand(command, mockContext);

            expect(result.success).toBe(false);
            expect(result.message).toContain('Missing required parameters');
            expect(result.message).toContain('expression');
        });

        test('should execute valid tool command', async () => {
            const { toolImplementations } = require('../tools');
            toolImplementations.calculator.mockResolvedValue({
                success: true,
                message: 'Calculation completed',
                data: { result: 4 }
            });

            const command = {
                tool_name: 'calculator',
                parameters: { expression: '2+2' }
            };

            const result = await executeCommand(command, mockContext);

            expect(result.success).toBe(true);
            expect(result.message).toBe('Calculation completed');
            expect(result.data).toEqual({ result: 4 });
            expect(result.metadata.toolName).toBe('calculator');
            expect(toolImplementations.calculator).toHaveBeenCalledWith(
                { expression: '2+2' },
                mockContext
            );
        });

        test('should handle tool execution errors', async () => {
            const { toolImplementations } = require('../tools');
            toolImplementations.calculator.mockRejectedValue(new Error('Calculation failed'));

            const command = {
                tool_name: 'calculator',
                parameters: { expression: '2+2' }
            };

            const result = await executeCommand(command, mockContext);

            expect(result.success).toBe(false);
            expect(result.message).toContain('Tool execution failed');
            expect(result.message).toContain('Calculation failed');
        });

        test('should handle clarify tool', async () => {
            const command = {
                tool_name: 'clarify',
                parameters: { question: 'What do you mean?' }
            };

            const result = await executeCommand(command, mockContext);

            expect(result.success).toBe(true);
            expect(result.message).toContain('Clarification request sent');
            expect(result.data.type).toBe('clarification');
            expect(result.data.question).toBe('What do you mean?');
            expect(result.data.requiresUserResponse).toBe(true);
        });

        test('should handle answerUser tool', async () => {
            const command = {
                tool_name: 'answerUser',
                parameters: { answer: 'Here is your answer' }
            };

            const result = await executeCommand(command, mockContext);

            expect(result.success).toBe(true);
            expect(result.message).toContain('Final answer provided');
            expect(result.data.type).toBe('final_answer');
            expect(result.data.answer).toBe('Here is your answer');
            expect(result.data.isComplete).toBe(true);
        });

        test('should validate clarify tool parameters', async () => {
            const command = {
                tool_name: 'clarify',
                parameters: {} // Missing question parameter
            };

            const result = await executeCommand(command, mockContext);

            expect(result.success).toBe(false);
            expect(result.message).toContain('requires a question parameter');
        });

        test('should validate answerUser tool parameters', async () => {
            const command = {
                tool_name: 'answerUser',
                parameters: {} // Missing answer parameter
            };

            const result = await executeCommand(command, mockContext);

            expect(result.success).toBe(false);
            expect(result.message).toContain('requires an answer parameter');
        });

        test('should handle tool not found', async () => {
            const command = {
                tool_name: 'nonexistent_tool',
                parameters: { test: 'value' }
            };

            const contextWithMissingTool = {
                ...mockContext,
                allowedTools: ['nonexistent_tool']
            };

            const result = await executeCommand(command, contextWithMissingTool);

            expect(result.success).toBe(false);
            expect(result.message).toContain('not found in available tools');
        });
    });

    describe('executeMultipleCommands', () => {
        test('should execute multiple commands in sequence', async () => {
            const { toolImplementations } = require('../tools');
            toolImplementations.calculator.mockResolvedValue({
                success: true,
                message: 'Calculation completed',
                data: { result: 4 }
            });

            const commands = [
                {
                    tool_name: 'calculator',
                    parameters: { expression: '2+2' }
                },
                {
                    tool_name: 'clarify',
                    parameters: { question: 'Is this correct?' }
                }
            ];

            const results = await executeMultipleCommands(commands, mockContext);

            expect(results).toHaveLength(2);
            expect(results[0].success).toBe(true);
            expect(results[1].success).toBe(true);
        });

        test('should stop on failure when stopOnFailure is true', async () => {
            const commands = [
                {
                    tool_name: 'invalid_tool',
                    parameters: {}
                },
                {
                    tool_name: 'clarify',
                    parameters: { question: 'This should not execute' }
                }
            ];

            const contextWithStopOnFailure = {
                ...mockContext,
                stopOnFailure: true
            };

            const results = await executeMultipleCommands(commands, contextWithStopOnFailure);

            expect(results).toHaveLength(1);
            expect(results[0].success).toBe(false);
        });

        test('should throw error for non-array input', async () => {
            await expect(executeMultipleCommands('not an array', mockContext))
                .rejects.toThrow('Commands must be an array');
        });
    });

    describe('getAvailableToolNames', () => {
        test('should return special tools and allowed regular tools', () => {
            const toolNames = getAvailableToolNames(mockContext);

            expect(toolNames).toContain('clarify');
            expect(toolNames).toContain('answerUser');
            expect(toolNames).toContain('calculator');
            expect(toolNames).toContain('search_web');
        });

        test('should only return special tools when no regular tools allowed', () => {
            const contextWithNoTools = {
                allowedTools: [],
                availableTools: mockTools
            };

            const toolNames = getAvailableToolNames(contextWithNoTools);

            expect(toolNames).toEqual(['clarify', 'answerUser']);
        });

        test('should handle empty context', () => {
            const toolNames = getAvailableToolNames({});

            expect(toolNames).toEqual(['clarify', 'answerUser']);
        });
    });

    describe('createExecutionContext', () => {
        test('should create context with all parameters', () => {
            const params = {
                allowedTools: ['calculator'],
                availableTools: mockTools,
                tavilyApiKey: 'test-key',
                apiKey: 'ai-key',
                modelName: 'test-model',
                addTransaction: jest.fn(),
                additionalContext: { custom: 'value' }
            };

            const context = createExecutionContext(params);

            expect(context.allowedTools).toEqual(['calculator']);
            expect(context.availableTools).toBe(mockTools);
            expect(context.tavilyApiKey).toBe('test-key');
            expect(context.apiKey).toBe('ai-key');
            expect(context.modelName).toBe('test-model');
            expect(context.addTransaction).toBe(params.addTransaction);
            expect(context.custom).toBe('value');
        });

        test('should create context with default values', () => {
            const context = createExecutionContext();

            expect(context.allowedTools).toEqual([]);
            expect(context.availableTools).toEqual([]);
            expect(context.tavilyApiKey).toBeUndefined();
        });
    });
});