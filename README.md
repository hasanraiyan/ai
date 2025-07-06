# 🤖 AI Assistant: A Multi-Persona, Multi-Utility Platform

Welcome to the AI Assistant, a powerful and highly configurable showcase application built with React Native and powered by Google's latest Generative AI models. Evolved far beyond a simple chatbot, this is a feature-rich platform demonstrating a modern, tool-augmented, multi-persona AI experience on mobile.

![Made with React Native](https://img.shields.io/badge/Made%20with-React%20Native-61DAFB?logo=react&logoColor=white)
![Powered by Google AI](https://img.shields.io/badge/Powered%20by-Google%20AI-4285F4?logo=google&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

## ✨ Core Features

This application is packed with features that showcase a sophisticated, multi-faceted AI integration:

*   🎭 **Dynamic Character System**: Don't just chat with one AI.
    *   Choose from a diverse roster of pre-built AI characters, each with a unique personality, voice, and backstory.
    *   Use the **Character Editor** to create, edit, and manage your own custom AI personas.
    *   Characters can be equipped with specific tools, allowing for specialized agents like a `Finance Manager` or a `Code Wizard`.
*   🛠️ **Tool-Augmented Agents**: In `Agent` mode, characters can leverage a set of tools to perform complex tasks beyond simple text responses:
    *   `search_web`: Performs real-time web searches for up-to-date information via the Tavily API.
    *   `calculator`: Evaluates mathematical expressions.
    *   `image_generator`: Creates images from text prompts and saves them locally.
    *   `add_transaction`, `get_financial_report`, `set_budget`: A suite of tools for the Finance Manager character.
*   🧠 **AI-Powered Utilities**: The app includes several standalone, AI-driven screens:
    *   💰 **Finance Manager**: A dedicated screen for personal finance tracking with a beautiful UI, charts, and AI-powered description enhancement.
    *   🌐 **Language Lab**: A powerful learning tool with a "Translate" mode for detailed grammatical analysis and a "Tutor" mode for conversational practice.
    *   🎨 **Image Studio**: A specialized screen for generating images with fine-tuned control over styles, models, aspect ratios, and batch size.
*   🖼️ **Image Gallery**: A dedicated screen to browse, share, download, and delete all images created by the AI. Each image stores its original prompt and generation settings as metadata.
*   💾 **Persistent State**: All conversations, characters, settings, financial data, and generated images are saved locally on your device using `AsyncStorage` and `expo-file-system`.
*   🚀 **Modern UI/UX**: Built with React Navigation, the app features a clean, intuitive interface with:
    *   A new **Dashboard** home screen for quick access to all features.
    *   A slide-out drawer for navigation.
    *   Real-time typing indicators and AI "thinking" states.
    *   Smooth animations and haptic feedback.
    *   Full Markdown rendering for rich-text AI responses, including tables and images.

## 📱 Interactive App Tour

Take a visual stroll through the app's main screens.

| Dashboard                                                                                                          | Character Selection                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| ![Dashboard Screen](https://user-images.githubusercontent.com/assets/placeholder-thread-list.png)                  | ![Character Select Screen](https://user-images.githubusercontent.com/assets/placeholder-character-select.png)                  |
| The new home screen. Access quick actions, start chats with characters, and see recent activity at a glance.        | Browse, search, and select from a rich list of AI characters. Long-press for options or tap "Chat" to begin.               |
| **Chat Interface**                                                                                                 | **Finance Manager**                                                                                                          |
| ![Chat Screen](https://user-images.githubusercontent.com/assets/placeholder-chat.png)                              | ![Finance Screen](https://user-images.githubusercontent.com/assets/placeholder-finance.png)                                  |
| Engage with the AI. For tool-enabled characters, you can toggle between a simple `Chat` and a powerful `Agent` mode. | Track income and expenses with AI-powered description enhancement, visual charts, and budget management.                     |
| **Image Studio**                                                                                                   | **Language Lab**                                                                                                             |
| ![Image Studio Screen](https://user-images.githubusercontent.com/assets/placeholder-image-gen.png)                 | ![Language Lab Screen](https://user-images.githubusercontent.com/assets/placeholder-language.png)                              |
| Craft the perfect image with detailed controls for style, aspect ratio, and generation model.                      | Translate text with detailed grammatical analysis or engage in conversational practice with an AI language tutor.              |
| **Settings**                                                                                                       | **Image Gallery**                                                                                                            |
| ![Settings Screen](https://user-images.githubusercontent.com/assets/placeholder-settings.png)                      | ![Gallery Screen](https://user-images.githubusercontent.com/assets/placeholder-gallery.png)                                  |
| The control center. Manage your API Keys, set the default AI persona, and configure the models for different tasks. | Browse all your AI-generated images. Tap an image to view its prompt, share, download, or delete it.                          |

*(Note: The images above are placeholders. Run the app to experience it live!)*

## 🛠️ Tech Stack & Architecture

This project leverages a modern React Native stack to deliver a robust and maintainable application.

*   **Framework**: React Native (with Expo)
*   **AI**: `@google/generative-ai` SDK
*   **Navigation**: React Navigation (Drawer)
*   **State Management**: React Context API (`SettingsContext`, `ThreadsContext`, `CharactersContext`, `FinanceContext`)
*   **Local Storage**: `@react-native-async-storage/async-storage`
*   **File System**: `expo-file-system` for saving images
*   **UI Components**: `react-native-markdown-display`, `react-native-gifted-charts`, `expo-vector-icons`

### Project Structure

The codebase is organized for clarity and scalability:

```
└── src/
    ├── agents/        # Self-contained AI agents for specific tasks (e.g., title generation)
    ├── components/    # Reusable UI elements (Composer, ToggleSwitch, ScreenHeader)
    ├── constants/     # App-wide constants (character lists, models, languages)
    ├── contexts/      # Global state management (SettingsContext, CharactersContext, etc.)
    ├── hooks/         # Custom hooks for managing state and side effects (useCharacters)
    ├── navigation/    # Navigation configuration (CustomDrawerContent)
    ├── prompts/       # Logic for generating dynamic prompts (agentPrompt)
    ├── screens/       # Top-level screen components (Dashboard, Chat, Finance, etc.)
    ├── services/      # Core business logic (aiService, tools, fileService)
    └── utils/         # Shared utilities (theme, extractJson)
```

## 🚀 Getting Started

Follow these steps to get the AI Assistant running on your local machine.

### 1. Prerequisites

*   Node.js (LTS version)
*   Git
*   [Expo Go](https://expo.dev/go) app on your iOS or Android device.

### 2. Get Your API Keys

This app uses two external services and requires API keys for both to be fully functional.

1.  **Google AI API Key (Required)**
    *   This is essential for all core AI functionality.
    *   Visit the **[Google AI Studio](https://aistudio.google.com/app/apikey)**.
    *   Click **"Create API key"** and copy the generated key.

2.  **Tavily AI API Key (Optional)**
    *   This is required for the `search_web` tool used by some characters.
    *   Visit the **[Tavily AI Dashboard](https://app.tavily.com/)**.
    *   Sign up and copy your API key.

### 3. Clone & Install

```bash
# Clone the repository
git clone https://github.com/hasanraiyan/ai
cd ai

# Install dependencies
npm install
```

### 4. Run the App

```bash
# Start the Expo development server
npx expo start
```

*   Scan the QR code displayed in the terminal with the **Expo Go** app on your phone.

### 5. Configure the App

1.  When the app first launches, a welcome modal may appear.
2.  Open the drawer menu (swipe from the left edge) and navigate to the **Settings** screen.
3.  In the "API Keys" section, paste the **Google AI Key** you obtained.
4.  Optionally, paste your **Tavily AI Key** to enable the web search tool.
5.  That's it! Navigate back to the "Dashboard", select a character, and explore the app's capabilities.

## ⚙️ Configuration Deep Dive

The **Settings** screen is your control center.

*   **API Keys**: Manage your keys for Google AI and Tavily. The app will gracefully handle missing keys by disabling the relevant features.
*   **Default AI Persona**: Modify the `System Prompt` to change the personality of the generic AI used for new chats started from the Dashboard's floating action button.
*   **Model Configuration**:
    *   **Main Chat Model**: The primary model for non-agent conversations.
    *   **Title Generation Model**: A typically smaller, faster model used to automatically name your chats.
    *   **Character Agent Model**: The model used by Characters for tool-based tasks. The app will indicate which tools are supported by your selected model.
*   **Danger Zone**: Be careful! Here you can permanently delete all your chat history, financial records, or generated images.