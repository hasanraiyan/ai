// src/hooks/useThreads.js

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function useThreads(systemPrompt) {
  const [threads, setThreads] = useState([]);
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [threadsReady, setThreadsReady] = useState(false);

  // Effect to load threads and pins from storage on mount
  useEffect(() => {
    (async () => {
      try {
        const [
          loadedThreads,
          loadedPinnedMessages,
        ] = await Promise.all([
          AsyncStorage.getItem('@threads'),
          AsyncStorage.getItem('@pinnedMessages'),
        ]);

        if (loadedThreads !== null) setThreads(JSON.parse(loadedThreads));
        if (loadedPinnedMessages !== null) setPinnedMessages(JSON.parse(loadedPinnedMessages));
      } catch (e) {
        console.warn('Error loading threads from AsyncStorage:', e);
      }
      setThreadsReady(true);
    })();
  }, []);

  // --- Start: Effects to save state ---
  useEffect(() => { if (threadsReady) AsyncStorage.setItem('@threads', JSON.stringify(threads)) }, [threads, threadsReady]);
  useEffect(() => { if (threadsReady) AsyncStorage.setItem('@pinnedMessages', JSON.stringify(pinnedMessages)) }, [pinnedMessages, threadsReady]);
  // --- End: Effects to save state ---


  // --- Start: Memoized Context Functions ---
  const createThread = useCallback(() => {
    const id = Date.now().toString();
    const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const initialMessages = [
      { id: `u-system-${id}`, text: systemPrompt, role: 'user', ts },
      { id: `a-system-${id}`, text: "Understood. I'm ready to assist. How can I help you today?", role: 'model', ts },
    ];
    const newThread = { id, name: 'New Chat', messages: initialMessages };
    setThreads(prev => [newThread, ...prev]);
    return id;
  }, [systemPrompt]);

  const updateThreadMessages = useCallback((threadId, messages) =>
    setThreads(prev => {
      const threadToUpdate = prev.find(t => t.id === threadId);
      if (!threadToUpdate) return prev;
      const updatedThread = { ...threadToUpdate, messages };
      const otherThreads = prev.filter(t => t.id !== threadId);
      return [updatedThread, ...otherThreads];
    }), []);

  const renameThread = useCallback((threadId, name) =>
    setThreads(prev => prev.map(t => (t.id === threadId ? { ...t, name } : t))), []);

  const deleteThread = useCallback(threadId =>
    setThreads(prev => prev.filter(t => t.id !== threadId)), []);

  const clearAllThreads = useCallback(() => {
    setThreads([]);
    setPinnedMessages([]);
  }, []);

  const pinMessage = useCallback((threadId, message) => {
    setPinnedMessages(prev => {
      if (prev.some(p => p.message.id === message.id)) return prev;
      const threadName = threads.find(t => t.id === threadId)?.name || 'Chat';
      return [{ threadId, threadName, message }, ...prev];
    });
  }, [threads]);

  const unpinMessage = useCallback((messageId) => {
    setPinnedMessages(prev => prev.filter(p => p.message.id !== messageId));
  }, []);
  // --- End: Memoized Context Functions ---

  return {
    threads, createThread, updateThreadMessages, renameThread,
    deleteThread, clearAllThreads,
    pinnedMessages, pinMessage, unpinMessage,
    threadsReady
  };
}