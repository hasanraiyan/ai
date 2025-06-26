// src/hooks/useSettings.js

import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { models } from '../constants/models';

export function useSettings() {
  const [modelName, setModelName] = useState('gemma-3-27b-it');
  const [titleModelName, setTitleModelName] = useState('gemma-3-1b-it');
  const [agentModelName, setAgentModelName] = useState('gemma-3-27b-it');
  const [systemPrompt, setSystemPrompt] = useState(
    "You are a helpful AI assistant." // Simple generic fallback prompt
  );
  const [apiKey, setApiKey] = useState('');
  const [tavilyApiKey, setTavilyApiKey] = useState('');
  const [settingsReady, setSettingsReady] = useState(false);

  // Effect to load settings from storage on mount
  useEffect(() => {
    (async () => {
      try {
        const [
          loadedModel,
          loadedTitleModel,
          loadedAgentModel,
          loadedSystemPrompt,
          loadedApiKey,
          loadedTavilyApiKey,
        ] = await Promise.all([
          AsyncStorage.getItem('@modelName'),
          AsyncStorage.getItem('@titleModelName'),
          AsyncStorage.getItem('@agentModelName'),
          AsyncStorage.getItem('@systemPrompt'),
          AsyncStorage.getItem('@apiKey'),
          AsyncStorage.getItem('@tavilyApiKey'),
        ]);

        let validAgentModelId = loadedAgentModel || 'gemma-3-27b-it';
        const agentModelData = models.find(model => model.id === validAgentModelId);
        if (!agentModelData || !agentModelData.isAgentModel) {
          validAgentModelId = 'gemma-3-27b-it';
        }
        setAgentModelName(validAgentModelId);

        let validChatModelId = loadedModel || 'gemma-3-27b-it';
        if (!models.some(m => m.id === validChatModelId && m.isChatModel)) {
          validChatModelId = 'gemma-3-27b-it';
        }
        setModelName(validChatModelId);

        let validTitleModelId = loadedTitleModel || 'gemma-3-1b-it';
        if (!models.some(m => m.id === validTitleModelId && m.isTitleModel)) {
          validTitleModelId = 'gemma-3-1b-it';
        }
        setTitleModelName(validTitleModelId);

        if (loadedSystemPrompt !== null) setSystemPrompt(loadedSystemPrompt);
        if (loadedApiKey !== null) setApiKey(loadedApiKey);
        if (loadedTavilyApiKey !== null) setTavilyApiKey(loadedTavilyApiKey);

      } catch (e) {
        console.warn('Error loading settings from AsyncStorage:', e);
      }
      setSettingsReady(true);
    })();
  }, []);

  // --- Start: Effects to save state ---
  useEffect(() => { if (settingsReady) AsyncStorage.setItem('@modelName', modelName) }, [modelName, settingsReady]);
  useEffect(() => { if (settingsReady) AsyncStorage.setItem('@titleModelName', titleModelName) }, [titleModelName, settingsReady]);
  useEffect(() => { if (settingsReady) AsyncStorage.setItem('@agentModelName', agentModelName) }, [agentModelName, settingsReady]);
  useEffect(() => { if (settingsReady) AsyncStorage.setItem('@systemPrompt', systemPrompt) }, [systemPrompt, settingsReady]);
  useEffect(() => { if (settingsReady) AsyncStorage.setItem('@apiKey', apiKey) }, [apiKey, settingsReady]);
  useEffect(() => { if (settingsReady) AsyncStorage.setItem('@tavilyApiKey', tavilyApiKey) }, [tavilyApiKey, settingsReady]);
  // --- End: Effects to save state ---

  return {
    modelName, setModelName,
    titleModelName, setTitleModelName,
    agentModelName, setAgentModelName,
    systemPrompt, setSystemPrompt,
    apiKey, setApiKey,
    tavilyApiKey, setTavilyApiKey,
    settingsReady,
  };
}