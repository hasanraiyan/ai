

# 🤖 AI Assistant: A React Native Showcase

Welcome to the AI Assistant, a powerful and highly configurable chat application built with React Native and powered by Google's latest Generative AI models. This isn't just a simple chatbot; it's a feature-rich platform demonstrating how to build a modern, tool-augmented AI experience on mobile.

![Made with React Native](https://img.shields.io/badge/Made%20with-React%20Native-61DAFB?logo=react&logoColor=white)
![Powered by Google AI](https://img.shields.io/badge/Powered%20by-Google%20AI-4285F4?logo=google&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

## ✨ Core Features

This application is packed with features that showcase a sophisticated AI integration:

*   🧠 **Dual AI Modes**: Seamlessly switch between a standard conversational `Chat` mode and a powerful `Agent` mode that can use tools to perform tasks.
*   🛠️ **Tool-Augmented Agent**: The agent can leverage a set of tools to go beyond simple text responses:
    *   `search_web`: Simulates web searches for real-time information.
    *   `calculator`: Evaluates mathematical expressions.
    *   `image_generator`: Creates images from text prompts and saves them locally.
*   🖼️ **Image Gallery**: A dedicated screen to browse, share, download, and delete all images created by the `image_generator` tool. Each image stores its original prompt as metadata.
*   🔧 **Deep Customization**: A comprehensive settings screen allows you to:
    *   Enter and manage your Google AI API key.
    *   Define a custom AI persona with a system prompt.
    *   Select different AI models for chat, title generation, and agent tasks.
    *   Enable or disable specific agent tools based on model compatibility.
*   💾 **Persistent State**: All conversations, settings, and generated images are saved locally on your device using `AsyncStorage` and `expo-file-system`.
*   🚀 **Modern UI/UX**: Built with React Navigation, the app features a clean, intuitive interface with:
    *   A slide-out drawer for navigation.
    *   A real-time typing indicator.
    *   Smooth animations and haptic feedback.
    *   Markdown rendering for rich-text AI responses.

## 📱 Interactive App Tour

Take a visual stroll through the app's main screens.

| Threads List                                                                                                       | Chat Interface                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| ![Threads List Screen](https://user-images.githubusercontent.com/assets/placeholder-thread-list.png)                | ![Chat Screen](https://user-images.githubusercontent.com/assets/placeholder-chat.png)                                     |
| View, search, and manage all your past conversations. Long-press a thread for options to rename or delete it.        | Engage with the AI. At the top, toggle between `Chat` and `Agent` modes. The AI's responses are rendered in Markdown. |
| **Settings**                                                                                                       | **Image Gallery**                                                                                                       |
| ![Settings Screen](https://user-images.githubusercontent.com/assets/placeholder-settings.png)                      | ![Gallery Screen](https://user-images.githubusercontent.com/assets/placeholder-gallery.png)                               |
| The heart of customization. Set your API Key, define the AI's persona, choose models, and manage the agent's tools. | Browse your AI-generated images. Tap an image to view its prompt, share, download, or delete it.                       |

*(Note: The images above are placeholders. Run the app to experience it live!)*

## 🛠️ Tech Stack & Architecture

This project leverages a modern React Native stack to deliver a robust and maintainable application.

*   **Framework**: React Native (with Expo)
*   **AI**: `@google/generative-ai` SDK
*   **Navigation**: React Navigation (Drawer)
*   **State Management**: React Context API (`SettingsContext`, `ThreadsContext`)
*   **Local Storage**: `@react-native-async-storage/async-storage`
*   **File System**: `expo-file-system` for saving images
*   **UI Components**: `react-native-markdown-display`, `expo-vector-icons`

### Project Structure

The codebase is organized for clarity and scalability:

```
└── src/
    ├── components/    # Reusable UI elements (ModeToggle, TypingIndicator)
    ├── constants/     # App-wide constants (model lists, safety settings)
    ├── contexts/      # Global state management (SettingsContext, ThreadsContext)
    ├── navigation/    # Navigation configuration (CustomDrawerContent)
    ├── prompts/       # Logic for generating dynamic prompts (agentPrompt)
    ├── screens/       # Top-level screen components (Chat, Settings, etc.)
    ├── services/      # Business logic (aiService, tools)
    └── styles/        # Shared styles (markdownStyles)
```

## 🚀 Getting Started

Follow these steps to get the AI Assistant running on your local machine.

### 1. Prerequisites

*   Node.js (LTS version)
*   Git
*   [Expo Go](https://expo.dev/go) app on your iOS or Android device.

### 2. Get Your API Key

This app requires a **Google AI API Key** to function.

1.  Visit the **[Google AI Studio](https://aistudio.google.com/app/apikey)**.
2.  Click **"Create API key"** and copy the generated key.

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

1.  When the app first launches, a welcome modal will appear. You can either close it or click the button to get your API key.
2.  Open the drawer menu (swipe from the left edge) and navigate to the **Settings** screen.
3.  In the "API Key" section, paste the key you obtained from the Google AI Studio.
4.  That's it! Navigate back to the "Threads" screen, start a new chat, and explore the app's capabilities.

## ⚙️ Configuration Deep Dive

The **Settings** screen is your control center.

*   **AI Persona**: Modify the `System Prompt` to change the AI's personality. Make it a pirate, a formal professor, or anything in between!
*   **Model Configuration**:
    *   **Main Chat Model**: The primary model for conversations.
    *   **Title Generation Model**: A typically smaller, faster model used to automatically name your chats.
    *   **Agent Model**: The model used for tool-based tasks. Note that only certain models support tool use.
*   **Agent Tools**: Enable or disable tools for the `Agent` mode. The app will automatically show you which tools are supported by your selected Agent Model.
*   **Danger Zone**: Be careful! Here you can permanently delete all your chat history.

