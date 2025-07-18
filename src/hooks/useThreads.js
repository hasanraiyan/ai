// src/hooks/useThreads.js

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function useThreads() {
  const [threads, setThreads] = useState([]);
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [threadsReady, setThreadsReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [loadedThreads, loadedPinnedMessages] = await Promise.all([
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

  useEffect(() => { if (threadsReady) AsyncStorage.setItem('@threads', JSON.stringify(threads)) }, [threads, threadsReady]);
  useEffect(() => { if (threadsReady) AsyncStorage.setItem('@pinnedMessages', JSON.stringify(pinnedMessages)) }, [pinnedMessages, threadsReady]);
  
  const createThread = useCallback((name, initialMessages, characterId = null) => {
    const id = Date.now().toString();
    const newThread = { id, name, messages: initialMessages, characterId };
    setThreads(prev => [newThread, ...prev]);
    return id;
  }, []);

  const updateThreadMessages = useCallback((threadId, messages, preserveOrder = false, updatedThreadData = null) =>
    setThreads(prev => {
      const threadIndex = prev.findIndex(t => t.id === threadId);
      if (threadIndex === -1) return prev;

      const threadToUpdate = prev[threadIndex];
      // Merge with updatedThreadData if provided, otherwise just update messages
      const updatedThread = {
        ...threadToUpdate,
        messages,
        ...(updatedThreadData || {}) // Spread updatedThreadData to override properties like modeOverride
      };
      
      if (preserveOrder) {
        const newThreads = [...prev];
        newThreads[threadIndex] = updatedThread;
        return newThreads;
      }

      // Default behavior: move updated thread to the top
      const newThreads = [...prev];
      newThreads.splice(threadIndex, 1); // Remove from current position
      return [updatedThread, ...newThreads]; // Add to the beginning
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

  return {
    threads, createThread, updateThreadMessages, renameThread,
    deleteThread, clearAllThreads,
    pinnedMessages, pinMessage, unpinMessage,
    threadsReady
  };
}