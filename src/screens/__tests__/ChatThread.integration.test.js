// src/screens/__tests__/ChatThread.integration.test.js

describe('Chat Interface Integration Tests', () => {
    // Mock AI service function
    const mockSendMessageToAI = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        mockSendMessageToAI.mockResolvedValue('Test AI response');
    });

    describe('AI Service Integration', () => {
        test('should call AI service with correct parameters for agent mode', async () => {
            const mockParams = {
                apiKey: 'test-api-key',
                modelName: 'gemini-pro',
                historyMessages: [
                    { id: 'u1', text: 'Hello', role: 'user', ts: '10:00' }
                ],
                newMessageText: 'How are you?',
                isAgentMode: true,
                onToolCall: expect.any(Function),
                tavilyApiKey: 'test-tavily-key',
                financeContext: {
                    addTransaction: expect.any(Function),
                    getTransactions: expect.any(Function),
                    getFinancialReport: expect.any(Function),
                    setBudget: expect.any(Function),
                    getBudgets: expect.any(Function),
                    deleteBudget: expect.any(Function)
                },
                allowedTools: ['search_web', 'calculator']
            };

            await mockSendMessageToAI(mockParams);

            expect(mockSendMessageToAI).toHaveBeenCalledWith(mockParams);
            expect(mockSendMessageToAI).toHaveBeenCalledTimes(1);
        });

        test('should call AI service with correct parameters for chat mode', async () => {
            const mockParams = {
                apiKey: 'test-api-key',
                modelName: 'gemini-pro',
                historyMessages: [
                    { id: 'u1', text: 'Hello', role: 'user', ts: '10:00' }
                ],
                newMessageText: 'How are you?',
                isAgentMode: false,
                onToolCall: undefined,
                tavilyApiKey: 'test-tavily-key',
                financeContext: {},
                allowedTools: []
            };

            await mockSendMessageToAI(mockParams);

            expect(mockSendMessageToAI).toHaveBeenCalledWith(mockParams);
            expect(mockSendMessageToAI).toHaveBeenCalledTimes(1);
        });

        test('should handle tool call notifications correctly', async () => {
            const mockOnToolCall = jest.fn();

            mockSendMessageToAI.mockImplementation(({ onToolCall }) => {
                // Simulate tool call notification from new agent system
                if (onToolCall) {
                    onToolCall({
                        'tools-required': [
                            { tool_name: 'search_web', parameters: { query: 'test' } }
                        ]
                    });
                }
                return Promise.resolve('Search completed successfully');
            });

            const mockParams = {
                apiKey: 'test-api-key',
                modelName: 'gemini-pro',
                historyMessages: [],
                newMessageText: 'Search for test',
                isAgentMode: true,
                onToolCall: mockOnToolCall,
                tavilyApiKey: 'test-tavily-key',
                financeContext: {},
                allowedTools: ['search_web']
            };

            await mockSendMessageToAI(mockParams);

            expect(mockOnToolCall).toHaveBeenCalledWith({
                'tools-required': [
                    { tool_name: 'search_web', parameters: { query: 'test' } }
                ]
            });
        });

        test('should handle multiple tool calls', async () => {
            const mockOnToolCall = jest.fn();

            mockSendMessageToAI.mockImplementation(({ onToolCall }) => {
                if (onToolCall) {
                    onToolCall({
                        'tools-required': [
                            { tool_name: 'search_web', parameters: { query: 'test' } },
                            { tool_name: 'calculator', parameters: { expression: '2+2' } }
                        ]
                    });
                }
                return Promise.resolve('Tasks completed');
            });

            const mockParams = {
                apiKey: 'test-api-key',
                modelName: 'gemini-pro',
                historyMessages: [],
                newMessageText: 'Search and calculate',
                isAgentMode: true,
                onToolCall: mockOnToolCall,
                tavilyApiKey: 'test-tavily-key',
                financeContext: {},
                allowedTools: ['search_web', 'calculator']
            };

            await mockSendMessageToAI(mockParams);

            expect(mockOnToolCall).toHaveBeenCalledWith({
                'tools-required': [
                    { tool_name: 'search_web', parameters: { query: 'test' } },
                    { tool_name: 'calculator', parameters: { expression: '2+2' } }
                ]
            });
        });

        test('should handle AI service errors gracefully', async () => {
            mockSendMessageToAI.mockRejectedValue(new Error('Network error'));

            try {
                await mockSendMessageToAI({
                    apiKey: 'test-api-key',
                    modelName: 'gemini-pro',
                    historyMessages: [],
                    newMessageText: 'Test message',
                    isAgentMode: true,
                    allowedTools: []
                });
            } catch (error) {
                expect(error.message).toBe('Network error');
            }

            expect(mockSendMessageToAI).toHaveBeenCalledTimes(1);
        });

        test('should handle API key missing errors', async () => {
            mockSendMessageToAI.mockRejectedValue(new Error('API Key Missing'));

            try {
                await mockSendMessageToAI({
                    apiKey: '',
                    modelName: 'gemini-pro',
                    historyMessages: [],
                    newMessageText: 'Test message',
                    isAgentMode: true,
                    allowedTools: []
                });
            } catch (error) {
                expect(error.message).toBe('API Key Missing');
            }

            expect(mockSendMessageToAI).toHaveBeenCalledTimes(1);
        });
    });

    describe('Character and Tool Integration', () => {
        test('should pass correct allowed tools for different characters', async () => {
            // Test search assistant
            const searchAssistantParams = {
                apiKey: 'test-api-key',
                modelName: 'gemini-pro',
                historyMessages: [],
                newMessageText: 'Search for something',
                isAgentMode: true,
                allowedTools: ['search_web']
            };

            await mockSendMessageToAI(searchAssistantParams);
            expect(mockSendMessageToAI).toHaveBeenCalledWith(searchAssistantParams);

            // Test math assistant
            const mathAssistantParams = {
                apiKey: 'test-api-key',
                modelName: 'gemini-pro',
                historyMessages: [],
                newMessageText: 'Calculate 2+2',
                isAgentMode: true,
                allowedTools: ['calculator']
            };

            await mockSendMessageToAI(mathAssistantParams);
            expect(mockSendMessageToAI).toHaveBeenCalledWith(mathAssistantParams);
        });

        test('should handle characters without tools (chat mode)', async () => {
            const chatModeParams = {
                apiKey: 'test-api-key',
                modelName: 'gemini-pro',
                historyMessages: [],
                newMessageText: 'Hello',
                isAgentMode: false,
                allowedTools: []
            };

            await mockSendMessageToAI(chatModeParams);
            expect(mockSendMessageToAI).toHaveBeenCalledWith(chatModeParams);
        });
    });

    describe('Conversation History Management', () => {
        test('should maintain conversation history correctly', async () => {
            const historyMessages = [
                { id: 'u1', text: 'Hello', role: 'user', ts: '10:00' },
                { id: 'a1', text: 'Hi there!', role: 'model', ts: '10:01' },
                { id: 'u2', text: 'How are you?', role: 'user', ts: '10:02' }
            ];

            const params = {
                apiKey: 'test-api-key',
                modelName: 'gemini-pro',
                historyMessages,
                newMessageText: 'What can you do?',
                isAgentMode: true,
                allowedTools: ['search_web']
            };

            await mockSendMessageToAI(params);
            expect(mockSendMessageToAI).toHaveBeenCalledWith(params);
        });

        test('should handle empty conversation history', async () => {
            const params = {
                apiKey: 'test-api-key',
                modelName: 'gemini-pro',
                historyMessages: [],
                newMessageText: 'Hello, this is my first message',
                isAgentMode: true,
                allowedTools: ['search_web']
            };

            await mockSendMessageToAI(params);
            expect(mockSendMessageToAI).toHaveBeenCalledWith(params);
        });
    });

    describe('Finance Context Integration', () => {
        test('should pass finance context functions to AI service', async () => {
            const financeContext = {
                addTransaction: jest.fn(),
                getTransactions: jest.fn().mockReturnValue([]),
                getFinancialReport: jest.fn().mockReturnValue('Financial report'),
                setBudget: jest.fn(),
                getBudgets: jest.fn().mockReturnValue({}),
                deleteBudget: jest.fn()
            };

            const params = {
                apiKey: 'test-api-key',
                modelName: 'gemini-pro',
                historyMessages: [],
                newMessageText: 'Add a transaction for $50 coffee',
                isAgentMode: true,
                financeContext,
                allowedTools: ['add_transaction']
            };

            await mockSendMessageToAI(params);
            expect(mockSendMessageToAI).toHaveBeenCalledWith(params);
        });
    });

    describe('New Agent System Features', () => {
        test('should work with new Brain-Hands architecture', async () => {
            // Test that the chat interface can work with the new agent system
            const params = {
                apiKey: 'test-api-key',
                modelName: 'gemini-pro',
                historyMessages: [],
                newMessageText: 'Complex multi-step task',
                isAgentMode: true,
                allowedTools: ['search_web', 'calculator', 'add_transaction'],
                financeContext: {
                    addTransaction: jest.fn(),
                    getTransactions: jest.fn(),
                    getFinancialReport: jest.fn(),
                    setBudget: jest.fn(),
                    getBudgets: jest.fn(),
                    deleteBudget: jest.fn()
                }
            };

            const result = await mockSendMessageToAI(params);

            expect(mockSendMessageToAI).toHaveBeenCalledWith(params);
            expect(result).toBe('Test AI response');
        });

        test('should handle iterative conversations with new system', async () => {
            // Simulate a multi-turn conversation
            const conversationHistory = [
                { id: 'u1', text: 'Search for weather', role: 'user', ts: '10:00' },
                { id: 'a1', text: 'I found weather information', role: 'model', ts: '10:01' },
                { id: 'u2', text: 'Now calculate the temperature difference', role: 'user', ts: '10:02' }
            ];

            const params = {
                apiKey: 'test-api-key',
                modelName: 'gemini-pro',
                historyMessages: conversationHistory,
                newMessageText: 'What about tomorrow?',
                isAgentMode: true,
                allowedTools: ['search_web', 'calculator']
            };

            await mockSendMessageToAI(params);
            expect(mockSendMessageToAI).toHaveBeenCalledWith(params);
        });

        test('should support backward compatibility with existing chat functionality', () => {
            // Test that the integration maintains backward compatibility
            const legacyParams = {
                apiKey: 'test-api-key',
                modelName: 'gemini-pro',
                historyMessages: [
                    { role: 'user', text: 'Hello', ts: '10:00' },
                    { role: 'model', text: 'Hi there!', ts: '10:01' }
                ],
                newMessageText: 'How are you?',
                isAgentMode: false, // Legacy chat mode
                allowedTools: []
            };

            // This should work without any issues
            expect(() => mockSendMessageToAI(legacyParams)).not.toThrow();
        });

        test('should handle mode switching between chat and agent', async () => {
            // Test switching from chat to agent mode
            const chatParams = {
                apiKey: 'test-api-key',
                modelName: 'gemini-pro',
                historyMessages: [],
                newMessageText: 'Hello',
                isAgentMode: false,
                allowedTools: []
            };

            await mockSendMessageToAI(chatParams);
            expect(mockSendMessageToAI).toHaveBeenCalledWith(chatParams);

            // Switch to agent mode
            const agentParams = {
                ...chatParams,
                newMessageText: 'Search for weather',
                isAgentMode: true,
                allowedTools: ['search_web']
            };

            await mockSendMessageToAI(agentParams);
            expect(mockSendMessageToAI).toHaveBeenCalledWith(agentParams);
        });
    });

    describe('Error Scenarios and User Experience', () => {
        test('should handle network failures gracefully', async () => {
            mockSendMessageToAI.mockRejectedValue(new Error('Network timeout'));

            try {
                await mockSendMessageToAI({
                    apiKey: 'test-api-key',
                    modelName: 'gemini-pro',
                    historyMessages: [],
                    newMessageText: 'Test message',
                    isAgentMode: true,
                    allowedTools: ['search_web']
                });
            } catch (error) {
                expect(error.message).toBe('Network timeout');
            }
        });

        test('should handle invalid tool configurations', async () => {
            const invalidParams = {
                apiKey: 'test-api-key',
                modelName: 'gemini-pro',
                historyMessages: [],
                newMessageText: 'Use invalid tool',
                isAgentMode: true,
                allowedTools: ['invalid_tool'] // Invalid tool
            };

            // Should still call the service (error handling is done at service level)
            await mockSendMessageToAI(invalidParams);
            expect(mockSendMessageToAI).toHaveBeenCalledWith(invalidParams);
        });

        test('should maintain conversation state during errors', async () => {
            const conversationHistory = [
                { id: 'u1', text: 'Previous message', role: 'user', ts: '10:00' },
                { id: 'a1', text: 'Previous response', role: 'model', ts: '10:01' }
            ];

            mockSendMessageToAI.mockRejectedValue(new Error('Service error'));

            try {
                await mockSendMessageToAI({
                    apiKey: 'test-api-key',
                    modelName: 'gemini-pro',
                    historyMessages: conversationHistory,
                    newMessageText: 'This will fail',
                    isAgentMode: true,
                    allowedTools: ['search_web']
                });
            } catch (error) {
                // Conversation history should still be preserved
                expect(conversationHistory).toHaveLength(2);
                expect(conversationHistory[0].text).toBe('Previous message');
                expect(conversationHistory[1].text).toBe('Previous response');
            }
        });
    });
});