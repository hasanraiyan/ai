import { useState, useEffect, useMemo, useCallback } from "react";
import { useChatHistory } from "../hooks/use-chat-history";
import { getDefaultModel, getModelById } from "../config/ai-models";
import { createOpenAIClient } from "../config/openai-config";
import { ModelSelector } from "./chat/ModelSelector";
import { RecentChats } from "./chat/RecentChats";
import { ChatHeader } from "./chat/ChatHeader";
import { ChatMessages } from "./chat/ChatMessages";
import { ChatInput } from "./chat/ChatInput";
import { SearchCommand } from "./chat/SearchCommand";
import { ChatSidebarHeader } from "./chat/ChatSidebarHeader";
import { NewChatButton } from "./chat/NewChatButton";
import { useTheme } from "./theme-provider";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarProvider,
} from "./ui/sidebar";

export function ChatLayout() {
  const [selectedModel, setSelectedModel] = useState(getDefaultModel().name);
  const [inputMessage, setInputMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [commandOpen, setCommandOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const { theme, setTheme } = useTheme();
  
  const {
    chats,
    currentChatId,
    setCurrentChatId,
    createNewChat,
    updateChat,
    deleteChat,
    archiveChat,
    renameChat,
    getCurrentChat
  } = useChatHistory();

  const currentModel = getModelById(selectedModel);
  const openAIClient = useMemo(() => createOpenAIClient(), []);

  useEffect(() => {
    const down = (e) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandOpen((open) => !open);
      }
      if (e.key === "n" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleNewChat();
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isGenerating) return;

    let chatId = currentChatId;
    const messageContent = inputMessage.trim();
      // Generate title and create new chat if there isn't one
      if (!currentChatId) {
        const chatId = createNewChat(currentModel.name, {
          content: inputMessage,
          type: 'user',
          timestamp: new Date(),
          modelId: currentModel.name
        });

        // Generate and update title
        const title = await openAIClient.generateTitle(inputMessage, currentModel.name);
        if (title) {
          renameChat(chatId, title);
        }
      }

    const newMessages = [
      ...messages,
      {
        content: inputMessage,
        type: 'user',
        timestamp: new Date(),
        modelId: currentModel.name
      }
    ];

    setMessages(newMessages);
    setInputMessage("");

    setIsGenerating(true);
    try {
      const response = await openAIClient.generateResponse(newMessages, currentModel.name);
      
      setMessages(prev => [
        ...prev,
        {
          content: response,
          type: 'assistant',
          timestamp: new Date(),
          modelId: currentModel.name
        }
      ]);
    } catch (error) {
      console.error('Error generating response:', error);
      // Show error in chat
      setMessages(prev => [
        ...prev,
        {
          content: `Error: ${error.message}. Please try again.`,
          type: 'assistant',
          timestamp: new Date(),
          modelId: currentModel.name,
          error: true
        }
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  const formatChatText = useCallback((msgs) => {
    return msgs
      .map(msg => `${msg.type === 'user' ? 'You' : 'Assistant'}: ${msg.content}`)
      .join('\n\n');
  }, []);

  const handleExportChat = useCallback((defaultName) => {
    if (messages.length > 0) {
      const chatText = formatChatText(messages);
      const blob = new Blob([chatText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${getCurrentChat()?.title || defaultName}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }, [messages, getCurrentChat, formatChatText]);

  const handleStopGeneration = () => {
    setIsGenerating(false);
  };

  const handleNewChat = useCallback(() => {
    setMessages([]);
    setInputMessage("");
    setIsGenerating(false);
    setCurrentChatId(null);
  }, []);

  const handleChatSelect = useCallback((chatId) => {
    setCurrentChatId(chatId);
    const chat = chats.find(c => c.id === chatId);
    if (chat) {
      setMessages(chat.messages);
      setSelectedModel(chat.modelId);
    }
  }, [chats, setCurrentChatId]);

  // Update chat history when messages change
  useEffect(() => {
    if (currentChatId && messages.length > 0) {
      updateChat(currentChatId, messages);
    }
  }, [currentChatId, messages, updateChat]);

  return (
    <>
      <SearchCommand
        open={commandOpen}
        onOpenChange={setCommandOpen}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onNewChat={handleNewChat}
        chats={chats}
        onChatSelect={handleChatSelect}
      />

      <SidebarProvider defaultOpen={true}>
        <div className="flex h-full w-full">
          <Sidebar className="border-r border-border shrink-0">
            <SidebarHeader>
              <ChatSidebarHeader
                onSearchOpen={() => setCommandOpen(true)}
                theme={theme}
                onThemeToggle={() => setTheme(theme === "light" ? "dark" : "light")}
              />
            </SidebarHeader>

            <SidebarContent className="px-2">
              <ModelSelector
                selectedModel={selectedModel}
                onModelChange={setSelectedModel}
              />
              <RecentChats 
                chats={chats}
                currentChatId={currentChatId}
                onChatSelect={handleChatSelect}
                onDelete={deleteChat}
                onArchive={archiveChat}
                onRename={renameChat}
              />
            </SidebarContent>

            <SidebarFooter className="p-2">
              <NewChatButton onClick={handleNewChat} />
            </SidebarFooter>
          </Sidebar>

          {/* Main Chat Area */}
          <div className="flex flex-col h-screen w-full">
            {/* Header */}
            <div className="bg-background dark:bg-slate-950 border-b border-border dark:border-slate-800">
              <ChatHeader 
                selectedModel={selectedModel}
                currentChat={getCurrentChat()}
                onShare={() => handleExportChat('shared-chat')}
                onCopy={() => {
                  const chatText = formatChatText(messages);
                  navigator.clipboard.writeText(chatText);
                }}
                onDownload={() => handleExportChat('chat')}
                onDelete={() => {
                  if (currentChatId) {
                    deleteChat(currentChatId);
                    handleNewChat();
                  }
                }}
              />
            </div>

            {/* Scrollable Messages Area */}
            <div className="flex-1 overflow-hidden">
              <div className="overflow-y-auto h-full mb-2">
                <ChatMessages
                  messages={messages}
                  isGenerating={isGenerating}
                />
              </div>
            </div>

            {/* Input Area */}
            <div className="bg-background dark:bg-slate-950">
              <ChatInput
                inputMessage={inputMessage}
                onInputChange={setInputMessage}
                onSend={handleSendMessage}
                modelName={currentModel.displayName}
                modelDescription={currentModel.description}
                isGenerating={isGenerating}
                onStopGeneration={handleStopGeneration}
              />
            </div>
          </div>
        </div>
      </SidebarProvider>
    </>
  );
}
