# Axion Project Documentation

This document provides a high-level overview of the Axion Expo project, intended to help new developers understand the structure, navigation, and key features of the application.

## Project Structure

The project follows a standard React Native structure, with all source code located in the `src/` directory.

### Root Directory

-   `App.js`: The main entry point of the application. It initializes context providers and the root navigator.
-   `package.json`: Defines project dependencies, scripts, and metadata.
-   `index.js`: The entry point for React Native.
-   `app.json`: Expo configuration file.

### `src/` Directory

-   **`src/agents/`**: Contains specialized AI agents that use the core AI service to perform specific tasks, such as generating image prompts or chat titles.
-   **`src/components/`**: A collection of reusable UI components used throughout the application, such as custom buttons, modals, and input fields.
-   **`src/constants/`**: Holds application-wide constants, including AI character definitions, image categories, supported languages, and AI model configurations.
-   **`src/contexts/`**: Defines React Contexts for global state management, including settings, chat threads, characters, and finance.
-   **`src/hooks/`**: Contains custom React hooks that encapsulate the business logic for managing application state, including data persistence with AsyncStorage.
-   **`src/navigation/`**: Handles the application's navigation structure. It primarily contains the custom drawer content.
-   **`src/prompts/`**: Stores the system prompts used to guide the behavior of the AI models, including dynamic prompt generation for agents.
-   **`src/screens/`**: Contains the main screens of the application, each representing a major feature like the chat interface, settings, or image gallery.
-   **`src/services/`**: The core of the application's business logic, responsible for interacting with external APIs (like Google Generative AI and Tavily), and managing the AI agent's behavior.
-   **`src/styles/`**: Contains styling-related files, primarily for styling markdown content.
-   **`src/utils/`**: A set of shared utility functions for tasks like error handling, logging, JSON parsing, and theme management.

## Navigation Flow

The application uses a drawer navigator as its primary navigation structure.

```
Drawer
 ├── Dashboard (ThreadsList)
 │    └── AllThreadsScreen
 ├── Characters (CharacterSelectScreen)
 │    └── CharacterEditorScreen
 ├── Finance (FinanceScreen)
 ├── Language Tutor (LanguageTutorScreen)
 ├── Generate Image (ImageGenerationScreen)
 ├── Gallery (GalleryScreen)
 └── Settings (SettingsScreen)
```
- The `Chat` screen is also in the drawer but is navigated to from `ThreadsList` or `CharacterSelectScreen`, so it's not a primary drawer item.

## LLM Integration via LangChain

The application's AI capabilities are powered by a flexible LLM integration built with LangChain.js. This allows the app to be provider-agnostic, supporting LLMs from Google (Gemini), local instances via Ollama, and other providers as needed.

-   **Purpose:** Powers all AI features, including chat, agent functionality, and text generation.
-   **Core Logic:** The main integration is handled by a LangChain agent in `src/services/aiService.js`.
-   **Adapter:** `src/lib/llm/llmAdapter.js` contains a factory function that creates the appropriate LLM client based on environment variables.
-   **Tools:** `src/lib/llm/langchainTools.js` wraps the project's custom tool implementations (from `src/services/tools.js`) into a LangChain-compatible format.

### Switching LLM Provider

You can easily switch between LLM providers by setting environment variables in a `.env` file at the project root. See `.env.example` for a full template.

1.  **Create a `.env` file** in the root of the project.
2.  **Set the `LLM_PROVIDER`** variable to your desired provider.
    -   Supported values: `"gemini"`, `"ollama"`.
3.  **Configure the provider:**
    -   **For Gemini:**
        ```
        LLM_PROVIDER="gemini"
        LLM_MODEL="gemini-pro"
        GOOGLE_API_KEY="YOUR_GOOGLE_API_KEY"
        ```
    -   **For Ollama (local):**
        ```
        LLM_PROVIDER="ollama"
        LLM_MODEL="llama3" # Or any other model you have pulled
        # Optional: Specify a custom host if not running on the default port
        # LLM_API_BASE_URL="http://192.168.1.100:11434"
        ```
4.  **Restart the application** for the changes to take effect.

## Other Key Integrations

-   **Tavily API:**
    -   **Purpose:** Provides real-time web search capabilities for the AI agent.
    -   **Location:** The `search_web` tool in `src/services/tools.js` calls this API. Set the `TAVILY_API_KEY` in your `.env` file.
-   **React Navigation:**
    -   **Purpose:** Manages all navigation within the app.
    -   **Location:** Setup is in `App.js` and `src/navigation/CustomDrawerContent.js`.
-   **AsyncStorage:**
    -   **Purpose:** Persists data locally on the device, including settings, threads, characters, and financial data.
    -   **Location:** Used by all custom hooks in `src/hooks/`.
-   **Expo SDK:**
    -   **Purpose:** Provides access to native device features.
    -   **Location:**
        -   `expo-file-system`: Used for saving generated images (`src/services/tools.js`, `screens/GalleryScreen.js`).
        -   `expo-media-library`: Used to save images to the device's gallery (`screens/GalleryScreen.js`).
        -   `expo-sharing`: Used for sharing generated images (`screens/GalleryScreen.js`).
-   **Axios:**
    -   **Purpose:** A promise-based HTTP client for making requests to external APIs.
    -   **Location:** Used in `src/services/tools.js` for the Tavily API.
