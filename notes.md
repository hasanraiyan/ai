# LLM Refactoring Notes

This document outlines the key design decisions and implementation details for the refactoring of the LLM integration from a direct Google GenAI implementation to a provider-agnostic LangChain-based architecture.

## Architecture Change

The initial plan was to create a minimal adapter. However, based on user feedback ("delete all other i want now lang chain only"), the scope was changed to a full replacement of the existing AI systems.

-   **Removed Systems:** Both the "Legacy" single-shot agent and the more complex "Brain-Hands" agent system (`agentExecutor.js`, `brainService.js`, etc.) were removed entirely.
-   **New System:** A single, unified agent was implemented in `src/services/aiService.js` using the standard `langchain/agents` package (`createToolCallingAgent` and `AgentExecutor`). This simplifies the architecture, reduces code complexity, and makes the system more maintainable.

## Core Components

1.  **LLM Adapter (`src/lib/llm/llmAdapter.js`)**
    -   A factory function `createLLMClient` was created to instantiate LLM clients.
    -   It is configured via environment variables (`.env` file).
    -   `LLM_PROVIDER` determines the client (`gemini`, `ollama`).
    -   `LLM_MODEL` specifies the model name.
    -   Provider-specific keys (`GOOGLE_API_KEY`) and settings (`LLM_API_BASE_URL` for Ollama) are also read from the environment.

2.  **Tool Adapter (`src/lib/llm/langchainTools.js`)**
    -   To maintain the "minimal changes" principle for existing tool logic, a tool adapter was created.
    -   The `getLangChainTools` function takes the request-specific `context` (containing API keys and functions) as an argument.
    -   It wraps the original tool implementations from `src/services/tools.js` into LangChain `DynamicStructuredTool` objects.
    -   This is achieved using a closure, so the context is available to the tool function when the agent executes it.
    -   The structured object returned by the original tools is converted to a JSON string, as LangChain tools must return a string.

3.  **Refactored `aiService.js`**
    -   This file is now the single entry point for all AI calls.
    -   It uses the `llmAdapter` and `langchainTools` to construct a LangChain `AgentExecutor` on each request.
    -   It handles the translation of the app's message history format to the `BaseMessage` array format required by LangChain.
    -   A custom `BaseCallbackHandler` is used to intercept the `handleToolStart` event. This allows the service to call the `onToolCall` callback provided by the UI, preserving the user-facing "thinking" indicators.

## Environment Variables

A `.env.example` file was created to document the new environment variables required for configuration:
-   `LLM_PROVIDER`
-   `LLM_MODEL`
-   `GOOGLE_API_KEY`
-   `LLM_API_BASE_URL`
-   `TAVILY_API_KEY`
