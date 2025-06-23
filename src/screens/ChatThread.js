// src/screens/ChatThread.js

import React, { useState, useRef, useEffect, useContext, useCallback, useMemo } from 'react';
import {
  StyleSheet, Text, View, FlatList, KeyboardAvoidingView,
  Platform, StatusBar, Keyboard, Linking, Pressable, Clipboard, Alert, ToastAndroid,
  ActivityIndicator, Image, TouchableOpacity, LayoutAnimation, UIManager
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Markdown from 'react-native-markdown-display';
import { Ionicons } from '@expo/vector-icons';
import { debounce } from 'lodash';
import { SettingsContext } from '../contexts/SettingsContext';
import { ThreadsContext } from '../contexts/ThreadsContext';
import { CharactersContext } from '../contexts/CharactersContext';
import { sendMessageToAI } from '../services/aiService';
import { getSearchSuggestions } from '../services/tools';
import { generateFollowUpSuggestions } from '../agents/followUpAgent';
import { generateChatTitle } from '../agents/chatTitleAgent';
import { generateAgentPrompt } from '../prompts/agentPrompt';
import TypingIndicator from '../components/TypingIndicator';
import ModeToggle from '../components/ModeToggle';
import { markdownStyles } from '../styles/markdownStyles';
import { models } from '../constants/models';
import { ImageWithLoader } from '../components/imageSkeleton';
import Composer from '../components/Composer';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const CHAT_HEADER_HEIGHT = 70;

const AiAvatar = ({ characterId }) => {
  const { characters } = useContext(CharactersContext);
  const character = characters.find(c => c.id === characterId);
  if (character && character.avatarUrl) {
    return <Image source={{ uri: character.avatarUrl }} style={styles.avatarImage} />;
  }
  return <Ionicons name="sparkles" size={20} color="#6366F1" />;
};

const AgentActionIndicator = ({ text }) => {
  const [toolNames, setToolNames] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const toolNameRegex = /`([^`]+)`/g;
    const matches = text.matchAll(toolNameRegex);
    const names = Array.from(matches, match => match[1]);
    setToolNames(names.length > 0 ? names : ['Thinking...']);
    setCurrentIndex(0);
  }, [text]);

  useEffect(() => {
    if (toolNames.length > 1) {
      const intervalId = setInterval(() => {
        setCurrentIndex(prevIndex => (prevIndex + 1) % toolNames.length);
      }, 2500);
      return () => clearInterval(intervalId);
    }
  }, [toolNames]);

  const displayedText = toolNames[currentIndex] || '';

  return (
    <View style={styles.agentPillContainer}>
      <ActivityIndicator size="small" color="#6366F1" style={styles.agentPillSpinner} />
      <Ionicons name="build-outline" size={16} color="#6B7280" style={styles.agentPillIcon} />
      <Text style={styles.agentPillText} numberOfLines={1}>{displayedText}</Text>
    </View>
  );
};

export default function ChatThread({ navigation, route }) {
  const { threadId, name } = route.params || {};
  const {
    modelName, titleModelName, agentModelName, systemPrompt,
    agentSystemPrompt, apiKey, tavilyApiKey
  } = useContext(SettingsContext);
  const { threads, updateThreadMessages, renameThread, pinnedMessages, pinMessage, unpinMessage } = useContext(ThreadsContext);
  const { characters } = useContext(CharactersContext);

  const thread = threads.find(t => t.id === threadId) || { id: threadId, name: name || 'Chat', messages: [] };
  const currentCharacter = useMemo(() => characters.find(c => c.id === thread.characterId), [characters, thread.characterId]);
  const pinnedMessageIds = new Set(pinnedMessages.map(p => p.message.id));

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('chat'); // This will be automatically set for characters
  const [suggestions, setSuggestions] = useState([]);
  const [followUpSuggestions, setFollowUpSuggestions] = useState([]);
  const [showFollowUps, setShowFollowUps] = useState(false);
  const [activeSuggestionTrigger, setActiveSuggestionTrigger] = useState(null);
  const listRef = useRef(null);
  const titled = useRef(false);
  const inputRef = useRef(null);

  const globalAgentModel = models.find(m => m.id === agentModelName);
  const isGlobalAgentModeSupported = globalAgentModel?.isAgentModel ?? false;

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 300) }, []);

  useEffect(() => {
    setInput('');
    setSuggestions([]);
    setFollowUpSuggestions([]);
    setShowFollowUps(false);
    setActiveSuggestionTrigger(null);
    const isAlreadyTitled = thread?.name && thread.name !== 'Chat';
    titled.current = isAlreadyTitled;

    // When thread changes, reset mode to default chat before logic runs
    if (!currentCharacter) {
        setMode('chat');
    }
  }, [threadId, currentCharacter]);

  // Central logic to determine mode and system prompt for the entire session
  useEffect(() => {
    if (!thread || !thread.messages || thread.messages.length === 0) return;

    let finalSystemPrompt = systemPrompt;
    let finalMode = 'chat'; 

    if (currentCharacter) {
      // --- Character is active, logic is automatic ---
      const hasTools = currentCharacter.supportedTools && currentCharacter.supportedTools.length > 0;
      finalMode = hasTools ? 'agent' : 'chat';

      if (finalMode === 'agent') {
        const characterEnabledTools = currentCharacter.supportedTools.reduce((acc, toolId) => {
          acc[toolId] = true;
          return acc;
        }, {});
        const toolInstructions = generateAgentPrompt(characterEnabledTools, agentModelName);
        
        // Create the powerful hybrid prompt combining persona and tool instructions
        finalSystemPrompt = `
You are a character with a specific persona. Adhere to it strictly.
--- START PERSONA ---
${currentCharacter.systemPrompt}
--- END PERSONA ---

In addition to your persona, you have access to tools to perform tasks.
--- START TOOL INSTRUCTIONS ---
${toolInstructions}
--- END TOOL INSTRUCTIONS ---
        `.trim();
      } else {
        finalSystemPrompt = currentCharacter.systemPrompt;
      }
    } else {
      // --- Generic chat, respect user-toggled mode ---
      finalMode = mode; // Keep the user-selected mode
      if (mode === 'agent') {
        finalSystemPrompt = agentSystemPrompt;
      }
    }

    setMode(finalMode); // Set the determined mode for the session's logic

    // Update the hidden system message in the thread to ensure persistence and correctness
    const systemMessageIndex = thread.messages.findIndex(m => m.id.startsWith('u-system-'));
    if (systemMessageIndex !== -1 && thread.messages[systemMessageIndex].text !== finalSystemPrompt) {
      const updatedMessages = [...thread.messages];
      updatedMessages[systemMessageIndex] = { ...updatedMessages[systemMessageIndex], text: finalSystemPrompt };
      updateThreadMessages(thread.id, updatedMessages, true); // `true` prevents reordering
    }
  }, [threadId, currentCharacter, mode, systemPrompt, agentSystemPrompt, agentModelName, thread.messages, updateThreadMessages]);

  const debouncedFetchSuggestions = useCallback(
    debounce(async (text) => {
      const triggers = ["search for ", "what is ", "who is ", "search "];
      let query = '', triggerFound = null;
      for (const t of triggers) {
        if (text.toLowerCase().startsWith(t)) { query = text.substring(t.length); triggerFound = t; break; }
      }
      setActiveSuggestionTrigger(triggerFound);
      if (triggerFound && query.length > 2) {
        const results = await getSearchSuggestions(query);
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setSuggestions(results);
      } else {
        if (suggestions.length > 0) LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setSuggestions([]);
      }
    }, 300), [suggestions.length]
  );

  useEffect(() => {
    if (mode === 'agent') debouncedFetchSuggestions(input);
    else if (suggestions.length > 0) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setSuggestions([]);
    }
    return () => debouncedFetchSuggestions.cancel();
  }, [input, mode, debouncedFetchSuggestions, suggestions.length]);

  const onToggleMode = newMode => {
    if (newMode === 'agent' && !isGlobalAgentModeSupported) {
      Alert.alert('Agent Mode Not Supported', `The current agent model (${globalAgentModel?.name || agentModelName}) does not support tools.`);
      return;
    }
    setMode(newMode);
  };

  const scrollToBottom = () => listRef.current?.scrollToEnd({ animated: true });

  const handleGenerateTitle = async (firstUserText) => {
    if (thread.characterId) return;
    try {
      const title = await generateChatTitle(apiKey, titleModelName || 'gemma-3-1b-it', firstUserText);
      if (title) renameThread(threadId, title);
    } catch (e) { console.error('Title generation failed:', e) }
  };

  const sendAI = async (text) => {
    if (!apiKey) {
      Alert.alert('API Key Missing', 'Please set your Google AI API Key in Settings.');
      return;
    }
    setLoading(true);
    const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg = { id: `u${Date.now()}`, text, role: 'user', ts };
    const isFirstRealMessage = thread.messages.filter(m => !m.isHidden).length === 0;
    
    // The history already contains the correct, up-to-date system prompt
    const historyForAPI = [...thread.messages];
    let newMessages = [...historyForAPI, userMsg];
    updateThreadMessages(threadId, newMessages);

    // The 'mode' state is now the single source of truth for the session's logic
    const modelForRequest = mode === 'agent' ? agentModelName : modelName;

    let thinkingMessageId = null;
    const handleToolCall = (toolCall) => {
      const toolNames = Object.keys(toolCall).filter(k => k !== 'tools-required');
      if (!toolNames.length) return;
      thinkingMessageId = `thinking-${Date.now()}`;
      const agentActionMsg = { id: thinkingMessageId, role: 'agent-thinking', text: `Using tool(s): ${toolNames.map(n => `\`${n}\``).join(', ')}`, ts };
      newMessages = [...newMessages, agentActionMsg];
      updateThreadMessages(threadId, newMessages);
      scrollToBottom();
    };

    try {
      const reply = await sendMessageToAI({
        apiKey,
        modelName: modelForRequest,
        historyMessages: historyForAPI,
        newMessageText: text,
        isAgentMode: mode === 'agent', // The mode determines the service's logic
        onToolCall: handleToolCall,
        tavilyApiKey: tavilyApiKey
      });
      const aiMsg = { id: `a${Date.now()}`, text: reply, role: 'model', ts, characterId: thread.characterId };
      if (thinkingMessageId) newMessages = newMessages.filter(m => m.id !== thinkingMessageId);
      newMessages.push(aiMsg);
      updateThreadMessages(threadId, newMessages);
      setLoading(false);
      setTimeout(scrollToBottom, 100);

      (async () => {
        if (isFirstRealMessage && !titled.current && !currentCharacter) {
          await handleGenerateTitle(text);
          titled.current = true;
        } else if (!isFirstRealMessage && mode === 'chat') {
          const followUps = await generateFollowUpSuggestions(apiKey, titleModelName, newMessages);
          if (followUps.length > 0) {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setFollowUpSuggestions(followUps);
            setShowFollowUps(true);
          }
        }
      })();
    } catch (e) {
      const errorText = e.message.includes('API Key Missing') ? e.message : 'An error occurred while fetching the response.';
      if (thinkingMessageId) newMessages = newMessages.filter(m => m.id !== thinkingMessageId);
      newMessages.push({ id: `e${Date.now()}`, text: errorText, role: 'model', error: true, ts });
      updateThreadMessages(threadId, newMessages);
      setLoading(false);
      setTimeout(scrollToBottom, 100);
    }
  };

  const handleInputChange = (text) => {
    if (text.length > 0 && showFollowUps) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setShowFollowUps(false);
    } else if (text.length === 0 && !showFollowUps && followUpSuggestions.length > 0) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setShowFollowUps(true);
    }
    setInput(text);
  };

  const onSend = () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;
    setInput('');
    if (followUpSuggestions.length > 0) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setFollowUpSuggestions([]); setShowFollowUps(false);
    }
    if (suggestions.length > 0) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setSuggestions([]);
    }
    Keyboard.dismiss();
    sendAI(trimmed);
  };

  const handleSuggestionTap = (suggestion) => {
    if (!activeSuggestionTrigger) return;
    const fullQuery = `${activeSuggestionTrigger}${suggestion}`;
    Keyboard.dismiss();
    setInput('');
    if (followUpSuggestions.length > 0) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setFollowUpSuggestions([]); setShowFollowUps(false);
    }
    if (suggestions.length > 0) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setSuggestions([]);
    }
    sendAI(fullQuery);
  };

  const handleFollowUpTap = (suggestionText) => {
    Keyboard.dismiss();
    if (followUpSuggestions.length > 0) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setFollowUpSuggestions([]); setShowFollowUps(false);
    }
    sendAI(suggestionText);
  };

  const onLinkPress = (url) => { Linking.openURL(url).catch(() => {}); return false; };

  const markdownImageRules = {
    image: node => {
      const src = node.attributes.src || node.attributes.href;
      if (!src) return null;
      return <ImageWithLoader key={node.key} uri={src} alt={node.attributes.alt || ''} style={{ width: '100%', height: 200, resizeMode: 'contain', marginVertical: 8 }} />;
    },
  };

  const handleLongPress = (message) => {
    const isPinned = pinnedMessageIds.has(message.id);
    const pinActionText = isPinned ? 'Unpin Message' : 'Pin Message';
    Alert.alert('Message Options', '',
      [
        { text: 'Copy Text', onPress: () => { Clipboard.setString(message.text); if (Platform.OS === 'android') ToastAndroid.show('Copied to clipboard', ToastAndroid.SHORT); }},
        { text: pinActionText, onPress: () => isPinned ? unpinMessage(message.id) : pinMessage(threadId, message) },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const renderMessageItem = ({ item }) => {
    const isPinned = pinnedMessageIds.has(item.id);
    if (item.role === 'user') {
      return (
        <View style={styles.userRow}>
          <Pressable onLongPress={() => handleLongPress(item)} style={styles.userBubble}>
            <Text style={styles.userText}>{item.text}</Text>
            <View style={styles.bubbleFooter}>
              {isPinned && <Ionicons name="pin" size={12} color="#A5B4FC" style={{ marginRight: 6 }} />}
              <Text style={styles.time}>{item.ts}</Text>
            </View>
          </Pressable>
        </View>
      );
    }
    if (item.role === 'agent-thinking') {
      return (
        <View style={styles.aiRow}>
          <View style={styles.avatar}>
            <AiAvatar characterId={item.characterId} />
          </View>
          <AgentActionIndicator text={item.text} />
        </View>
      );
    }
    return (
      <View style={styles.aiRow}>
        <View style={styles.avatar}>
          <AiAvatar characterId={item.characterId} />
        </View>
        <Pressable onLongPress={() => handleLongPress(item)} style={[styles.aiBubble, item.error && styles.errorBubble]}>
          {item.error ? <Text style={styles.errorText}>{item.text}</Text> : (() => {
            const processedText = item.text.replace(/\[(.*?)]\((file:\/\/.+?\.(?:png|jpg|jpeg|gif|webp))\)/gi, '![$1]($2)');
            return <Markdown style={markdownStyles} onLinkPress={onLinkPress} rules={markdownImageRules}>{processedText}</Markdown>;
          })()}
          <View style={styles.bubbleFooter}>
            {isPinned && <Ionicons name="pin" size={12} color="#9CA3AF" style={{ marginRight: 6 }} />}
            <Text style={[styles.time, item.error && styles.errorTime]}>{item.ts}</Text>
          </View>
        </Pressable>
      </View>
    );
  };

  const displayMessages = thread.messages.filter(m => !m.isHidden);
  const lastMessage = displayMessages[displayMessages.length - 1];
  const showTypingIndicator = loading && lastMessage?.role !== 'agent-thinking';
  
  const renderSuggestions = () => {
    if (suggestions.length === 0) return null;
    return (
        <View style={styles.suggestionsContainer}>
            <FlatList data={suggestions} horizontal showsHorizontalScrollIndicator={false} keyExtractor={(item, index) => `${item}-${index}`} renderItem={({ item }) => (
                <TouchableOpacity style={styles.suggestionPill} onPress={() => handleSuggestionTap(item)}>
                    <Ionicons name="search-outline" size={14} color="#6366F1" /><Text style={styles.suggestionText}>{item}</Text>
                </TouchableOpacity>
            )} contentContainerStyle={{ paddingHorizontal: 12 }} />
        </View>
    );
  };

  const renderFollowUpSuggestions = () => {
    if (loading || !showFollowUps || followUpSuggestions.length === 0) return null;
    return (
        <View style={styles.suggestionsContainer}>
            <FlatList data={followUpSuggestions} horizontal showsHorizontalScrollIndicator={false} keyExtractor={(item, index) => `followup-${index}`} renderItem={({ item }) => (
                <TouchableOpacity style={styles.followUpPill} onPress={() => handleFollowUpTap(item)}>
                    <Ionicons name="sparkles-outline" size={14} color="#059669" /><Text style={styles.followUpText}>{item}</Text>
                </TouchableOpacity>
            )} contentContainerStyle={{ paddingHorizontal: 12 }} />
        </View>
    );
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.chatHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIconButton}><Ionicons name="arrow-back" size={24} color="#475569" /></TouchableOpacity>
        {currentCharacter && <Image source={{ uri: currentCharacter.avatarUrl }} style={styles.headerAvatar} />}
        <Text style={styles.chatTitle} numberOfLines={1}>{thread.name}</Text>
        
        {/* Only show the toggle if it's a generic chat, not a character chat */}
        {!currentCharacter && (
          <ModeToggle
            mode={mode}
            onToggle={onToggleMode}
            isAgentModeSupported={isGlobalAgentModeSupported}
          />
        )}
      </View>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={CHAT_HEADER_HEIGHT}
      >
        <FlatList
          style={{ flex: 1 }}
          ref={listRef}
          data={displayMessages}
          keyExtractor={i => i.id}
          contentContainerStyle={styles.chatContent}
          renderItem={renderMessageItem}
          ListFooterComponent={showTypingIndicator && <TypingIndicator />}
          keyboardShouldPersistTaps="handled"
        />
        {renderSuggestions()}
        {renderFollowUpSuggestions()}
        <Composer
          value={input}
          onValueChange={handleInputChange}
          onSend={onSend}
          loading={loading}
          placeholder={mode === 'agent' ? "Ask the agent..." : "Type a message..."}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F9FAFB' },
  chatHeader: { 
    height: CHAT_HEADER_HEIGHT,
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 8, 
    paddingHorizontal: 12, 
    borderBottomWidth: 1, 
    borderColor: '#E5E7EB', 
    backgroundColor: '#FFF' 
  },
  headerIconButton: { padding: 8 },
  headerAvatar: { width: 32, height: 32, borderRadius: 16, marginLeft: 8 },
  chatTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', marginHorizontal: 12, flex: 1 },
  chatContent: { flexGrow: 1, padding: 12, paddingTop: 8 },
  userRow: { flexDirection: 'row', justifyContent: 'flex-end', marginVertical: 4 },
  userBubble: { backgroundColor: '#4F46E5', padding: 12, borderRadius: 20, maxWidth: '80%' },
  userText: { color: '#FFF', fontSize: 16 },
  aiRow: { flexDirection: 'row', marginVertical: 4, alignItems: 'flex-end' },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  avatarImage: { width: '100%', height: '100%', borderRadius: 16 },
  aiBubble: { backgroundColor: '#FFF', padding: 12, borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB', maxWidth: '80%' },
  errorBubble: { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5' },
  errorText: { color: '#B91C1C', fontSize: 16 },
  bubbleFooter: { flexDirection: 'row', alignSelf: 'flex-end', alignItems: 'center', marginTop: 4 },
  time: { fontSize: 10, color: '#9CA3AF' },
  errorTime: { color: '#FCA5A5' },
  agentPillContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 12, alignSelf: 'flex-start', maxWidth: '80%' },
  agentPillSpinner: { marginRight: 8 },
  agentPillIcon: { marginRight: 6 },
  agentPillText: { color: '#4B5563', fontSize: 14, fontWeight: '500', flexShrink: 1 },
  suggestionsContainer: { height: 50, justifyContent: 'center', borderTopWidth: 1, borderTopColor: '#E5E7EB', backgroundColor: '#F9FAFB', paddingVertical: 4 },
  suggestionPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14, marginRight: 10, borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  suggestionText: { color: '#4F46E5', fontSize: 14, fontWeight: '600', marginLeft: 6 },
  followUpPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0FDF4', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14, marginRight: 10, borderWidth: 1, borderColor: '#A7F3D0' },
  followUpText: { color: '#065F46', fontSize: 14, fontWeight: '600', marginLeft: 6 },
});