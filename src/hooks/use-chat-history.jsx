import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'chat_history';

export function useChatHistory() {
  const [chats, setChats] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const parsedChats = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsedChats) ? parsedChats : [];
    } catch (error) {
      console.error('Failed to parse chat history:', error);
      return [];
    }
  });
  const [currentChatId, setCurrentChatId] = useState(null);

  // Persist chats to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
  }, [chats]);

  const createNewChat = useCallback((modelId, firstMessage = null) => {
    const newChat = {
      id: Date.now(),
      title: firstMessage?.content?.slice(0, 50) || "New Chat",
      date: new Date().toISOString(),
      modelId,
      messages: firstMessage ? [firstMessage] : []
    };

    setChats(prevChats => [newChat, ...prevChats]);
    setCurrentChatId(newChat.id);
    return newChat.id;
  }, []);

  const updateChat = useCallback((chatId, messages) => {
    setChats(prevChats => 
      prevChats.map(chat => {
        if (chat.id === chatId) {
          // Update title if this is the first message
          const title = chat.title === "New Chat" && messages[0]
            ? messages[0].content.slice(0, 50)
            : chat.title;

          return {
            ...chat,
            title,
            messages,
            date: new Date().toISOString() // Update timestamp
          };
        }
        return chat;
      })
    );
  }, []);

  const deleteChat = useCallback((chatId) => {
    setChats(prevChats => prevChats.filter(chat => chat.id !== chatId));
    if (currentChatId === chatId) {
      setCurrentChatId(null);
    }
  }, [currentChatId]);

  const archiveChat = useCallback((chatId) => {
    setChats(prevChats => 
      prevChats.map(chat => 
        chat.id === chatId 
          ? { ...chat, archived: true }
          : chat
      )
    );
  }, []);

  const renameChat = useCallback((chatId, newTitle) => {
    if (!newTitle?.trim()) return;
    
    setChats(prevChats => 
      prevChats.map(chat => 
        chat.id === chatId 
          ? { ...chat, title: newTitle.trim() }
          : chat
      )
    );
  }, []);

  const getCurrentChat = useCallback(() => {
    if (!Array.isArray(chats)) return null;
    return chats.find(chat => chat.id === currentChatId);
  }, [chats, currentChatId]);

  const clearAllChats = useCallback(() => {
    setChats([]);
    setCurrentChatId(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    chats,
    currentChatId,
    setCurrentChatId,
    createNewChat,
    updateChat,
    deleteChat,
    archiveChat,
    renameChat,
    getCurrentChat,
    clearAllChats
  };
}
