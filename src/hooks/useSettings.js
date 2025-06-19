// src/hooks/useSettings.js

import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateAgentPrompt } from '../prompts/agentPrompt';
import { toolMetadata } from '../services/tools';
import { models } from '../constants/models';

export function useSettings() {
  const [modelName, setModelName] = useState('gemma-3-27b-it');
  const [titleModelName, setTitleModelName] = useState('gemma-3-1b-it');
  const [agentModelName, setAgentModelName] = useState('gemma-3-27b-it');
  const [systemPrompt, setSystemPrompt] = useState(
    "You are Arya, a friendly and insightful AI assistant with a touch of wit and warmth. You speak in a conversational, relatable tone like a clever Gen Z friend who's also secretly a professor. You're respectful, humble when needed, but never afraid to speak the truth. You're helpful, curious, and love explaining things in a clear, creative way. Keep your answers accurate, helpful, and full of personality. Never act robotic—be real, be Arya."
  );

  const initialEnabledTools = toolMetadata.reduce((acc, tool) => ({ ...acc, [tool.agent_id]: true }), {});
  const [enabledTools, setEnabledTools] = useState(initialEnabledTools);
  const [agentSystemPrompt, setAgentSystemPrompt] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [settingsReady, setSettingsReady] = useState(false);

  // Effect to generate agent prompt when dependencies change
  useEffect(() => {
    setAgentSystemPrompt(generateAgentPrompt(enabledTools, agentModelName));
  }, [enabledTools, agentModelName]);

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
          loadedEnabledTools,
        ] = await Promise.all([
          AsyncStorage.getItem('@modelName'),
          AsyncStorage.getItem('@titleModelName'),
          AsyncStorage.getItem('@agentModelName'),
          AsyncStorage.getItem('@systemPrompt'),
          AsyncStorage.getItem('@apiKey'),
          AsyncStorage.getItem('@enabledTools'),
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

        if (loadedEnabledTools !== null) {
          const savedTools = JSON.parse(loadedEnabledTools);
          const finalAgentModel = models.find(model => model.id === validAgentModelId);
          const supportedTools = finalAgentModel?.supported_tools || [];
          const validEnabledTools = Object.keys(savedTools).reduce((acc, toolId) => {
            if (supportedTools.includes(toolId) && savedTools[toolId]) {
              acc[toolId] = true;
            }
            return acc;
          }, {});
          setEnabledTools(prev => ({ ...prev, ...validEnabledTools }));
        }

        if (loadedSystemPrompt !== null) setSystemPrompt(loadedSystemPrompt);
        if (loadedApiKey !== null) setApiKey(loadedApiKey);

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
  useEffect(() => { if (settingsReady) AsyncStorage.setItem('@enabledTools', JSON.stringify(enabledTools)) }, [enabledTools, settingsReady]);
  useEffect(() => { if (settingsReady) AsyncStorage.setItem('@apiKey', apiKey) }, [apiKey, settingsReady]);
  // --- End: Effects to save state ---

  return {
    modelName, setModelName,
    titleModelName, setTitleModelName,
    agentModelName, setAgentModelName,
    systemPrompt, setSystemPrompt,
    agentSystemPrompt,
    enabledTools, setEnabledTools,
    apiKey, setApiKey,
    settingsReady,
  };
}