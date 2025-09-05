// src/services/__tests__/aiService.integration.test.js

import { sendMessageToAI } from '../aiService';
import { createLLMClient } from '../../lib/llm/llmAdapter';
import { getLangChainTools } from '../../lib/llm/langchainTools';
import { AgentExecutor, createToolCallingAgent } from 'langchain/agents';
import { AIMessage, HumanMessage } from '@langchain/core/messages';

// Mock the modules we created
jest.mock('../../lib/llm/llmAdapter');
jest.mock('../../lib/llm/langchainTools');

// Mock the LangChain modules
jest.mock('langchain/agents', () => ({
  createToolCallingAgent: jest.fn(),
  AgentExecutor: jest.fn(),
}));

describe('sendMessageToAI', () => {
  const mockParams = {
    apiKey: 'test-api-key',
    modelName: 'gemini-pro',
    historyMessages: [{ role: 'user', text: 'Hello' }],
    newMessageText: 'How are you?',
    onToolCall: jest.fn(),
    tavilyApiKey: 'test-tavily-key',
    financeContext: { budget: 1000 },
    allowedTools: ['search_web', 'calculator'],
  };

  let mockLLM, mockTools, mockAgent, mockExecutor;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Setup default mock implementations
    mockLLM = { name: 'mock-llm' };
    mockTools = [{ name: 'mock-tool' }];
    mockAgent = { name: 'mock-agent' };
    mockExecutor = {
      invoke: jest.fn().mockResolvedValue({ output: 'Mocked AI response' }),
    };

    createLLMClient.mockReturnValue(mockLLM);
    getLangChainTools.mockReturnValue(mockTools);
    createToolCallingAgent.mockResolvedValue(mockAgent);
    AgentExecutor.mockImplementation(() => mockExecutor);
  });

  it('should call createLLMClient with correct parameters', async () => {
    await sendMessageToAI(mockParams);
    expect(createLLMClient).toHaveBeenCalledWith({
      modelName: mockParams.modelName,
      apiKey: mockParams.apiKey,
    });
  });

  it('should call getLangChainTools with the correct context', async () => {
    await sendMessageToAI(mockParams);
    expect(getLangChainTools).toHaveBeenCalledWith({
      tavilyApiKey: mockParams.tavilyApiKey,
      ...mockParams.financeContext,
      allowedTools: mockParams.allowedTools,
    });
  });

  it('should create a ToolCallingAgent with the LLM, tools, and a prompt', async () => {
    await sendMessageToAI(mockParams);
    expect(createToolCallingAgent).toHaveBeenCalledWith({
      llm: mockLLM,
      tools: mockTools,
      prompt: expect.any(Object), // Verifying it's a prompt object
    });
  });

  it('should create an AgentExecutor with the agent and tools', async () => {
    await sendMessageToAI(mockParams);
    expect(AgentExecutor).toHaveBeenCalledWith({
      agent: mockAgent,
      tools: mockTools,
      verbose: process.env.NODE_ENV === 'development',
    });
  });

  it('should correctly format the chat history for LangChain', async () => {
    const history = [
      { role: 'user', text: 'First message' },
      { role: 'model', text: 'First response' },
      { role: 'user', text: 'Second message' },
    ];
    await sendMessageToAI({ ...mockParams, historyMessages: history });

    const expectedHistory = [
      new HumanMessage('First message'),
      new AIMessage('First response'),
      new HumanMessage('Second message'),
    ];

    expect(mockExecutor.invoke).toHaveBeenCalledWith(
      expect.objectContaining({
        chat_history: expectedHistory,
      }),
      expect.any(Object)
    );
  });

  it('should invoke the agent with the user input and formatted history', async () => {
    await sendMessageToAI(mockParams);
    expect(mockExecutor.invoke).toHaveBeenCalledWith(
      {
        input: mockParams.newMessageText,
        chat_history: [new HumanMessage('Hello')],
      },
      { callbacks: expect.any(Array) }
    );
  });

  it('should return the output from the agent executor', async () => {
    const response = await sendMessageToAI(mockParams);
    expect(response).toBe('Mocked AI response');
  });

  describe('CustomToolCallbackHandler', () => {
    it('should trigger onToolCall when a tool is started', async () => {
      // To test the callback, we need to simulate the callback handler being called
      // by the agent executor. We can do this by grabbing the handler from the
      // callbacks array passed to invoke.
      
      await sendMessageToAI(mockParams);

      const callbacks = mockExecutor.invoke.mock.calls[0][1].callbacks;
      const customHandler = callbacks.find(cb => cb.name === 'CustomToolCallbackHandler');
      
      expect(customHandler).toBeDefined();

      // Simulate a tool start event
      const tool = { name: 'search_web' };
      const input = JSON.stringify({ query: 'testing' });
      customHandler.handleToolStart(tool, input);

      expect(mockParams.onToolCall).toHaveBeenCalledWith({
        'tools-required': [{
          tool_name: 'search_web',
          parameters: { query: 'testing' },
        }],
      });
    });

    it('should not create a callback handler if onToolCall is not provided', async () => {
      await sendMessageToAI({ ...mockParams, onToolCall: undefined });
      const callbacks = mockExecutor.invoke.mock.calls[0][1].callbacks;
      expect(callbacks).toHaveLength(0);
    });
  });

  it('should throw an error if the agent executor fails', async () => {
    const testError = new Error('Agent failed');
    mockExecutor.invoke.mockRejectedValue(testError);

    await expect(sendMessageToAI(mockParams)).rejects.toThrow(testError);
  });
});