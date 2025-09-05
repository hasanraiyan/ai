# LLM Refactor TODO

This file tracks the tasks related to the LangChain integration refactor.

## Completed Tasks

-   [x] Replace Google Gen AI integration with a LangChain-based adapter.
-   [x] Remove both "Legacy" and "New Brain-Hands" agent systems.
-   [x] Implement a single, unified agent using `langchain/agents`.
-   [x] Create an LLM adapter (`llmAdapter.js`) to support multiple providers (Gemini, Ollama).
-   [x] Create a tool adapter (`langchainTools.js`) to wrap existing tools for LangChain compatibility.
-   [x] Refactor `aiService.js` to be the single entry point for the new agent.
-   [x] Preserve UI feedback by using a custom callback handler for tool calls.
-   [x] Add `.env.example` with new environment variables for configuration.
-   [x] Update `Agent.md` with documentation for the new architecture.
-   [x] Add `notes.md` to document design decisions.
-   [x] Update this `todo.md` file.
-   [ ] Implement unit and integration tests for the new `aiService.js` and its components.
-   [ ] Manually verify the end-to-end functionality.

## Future Work & Potential Improvements

-   [ ] **Enhance History Management:** The current history formatting in `aiService.js` is basic. It doesn't handle `ToolMessage` from past conversations. A more robust solution would be to serialize and deserialize the LangChain `BaseMessage` objects directly.
-   [ ] **UI for Configuration:** The LLM provider is configured via environment variables. A future feature could be to build a settings screen UI to manage these configurations.
-   [ ] **Streaming Support:** The current implementation waits for the final response. Implementing streaming would significantly improve the user experience. This would involve using the `agentExecutor.stream()` method and updating the UI to handle the streamed chunks.
-   [ ] **Expand Provider Support:** Add more providers to `llmAdapter.js` (e.g., Anthropic, OpenAI) as needed.
-   [ ] **Error Handling:** Improve error handling to give more specific feedback to the user if an API key is missing or invalid for the selected provider.
