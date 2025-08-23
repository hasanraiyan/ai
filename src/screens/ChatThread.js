// src/screens/ChatThread.js

import React, { useState, useRef, useEffect, useContext, useCallback, useMemo } from 'react';
import {
  StyleSheet, Text, View, FlatList,
  Platform, Keyboard, Linking, Pressable, Clipboard, Alert, ToastAndroid,
  ActivityIndicator, Image, TouchableOpacity, LayoutAnimation, UIManager, KeyboardAvoidingView // Added
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Markdown from 'react-native-markdown-display';
import { Ionicons } from '@expo/vector-icons';
import { debounce } from 'lodash';
import { SettingsContext } from '../contexts/SettingsContext';
import { ThreadsContext } from '../contexts/ThreadsContext';
import { CharactersContext } from '../contexts/CharactersContext';
import { FinanceContext } from '../contexts/FinanceContext';
import { sendMessageToAI } from '../services/aiService';
import { getSearchSuggestions } from '../services/tools';
import { generateFollowUpSuggestions } from '../agents/followUpAgent';
import { generateChatTitle } from '../agents/chatTitleAgent';
import { generateAgentPrompt } from '../prompts/agentPrompt';
import TypingIndicator from '../components/TypingIndicator';
import { getMarkdownStyles } from '../styles/markdownStyles';
import { ImageWithLoader } from '../components/imageSkeleton';
import Composer from '../components/Composer';
import ScreenHeader from '../components/ScreenHeader'; // Added
import ModeToggle from '../components/ModeToggle'; // Added
import { useTheme } from '../utils/theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// const CHAT_HEADER_HEIGHT = 70; // No longer needed, use consistent HEADER_HEIGHT
const HEADER_HEIGHT = Platform.OS === 'ios' ? 60 : 0; // Use a consistent offset value

const AiAvatar = ({ characterId }) => {
  const { characters } = useContext(CharactersContext);
  const { colors } = useTheme();
  const character = characters.find(c => c.id === characterId);
  
  const styles = StyleSheet.create({
    avatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.accent20,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 8,
    },
    avatarImage: { width: '100%', height: '100%', borderRadius: 16 },
  });

  if (character && character.avatarUrl) {
    return (
      <View style={styles.avatar}>
        <Image source={{ uri: character.avatarUrl }} style={styles.avatarImage} />
      </View>
    );
  }
  return (
    <View style={styles.avatar}>
      <Ionicons name="sparkles" size={20} color={colors.accent} />
    </View>
  );
};

const AgentActionIndicator = ({ text }) => {
  const { colors } = useTheme();
  const [toolNames, setToolNames] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const styles = StyleSheet.create({
    agentPillContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 20, paddingVertical: 8, paddingHorizontal: 12, alignSelf: 'flex-start', maxWidth: '80%' },
    agentPillSpinner: { marginRight: 8 },
    agentPillIcon: { marginRight: 6 },
    agentPillText: { color: colors.subtext, fontSize: 14, fontWeight: '500', flexShrink: 1 },
  });

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
      <ActivityIndicator size="small" color={colors.accent} style={styles.agentPillSpinner} />
      <Ionicons name="build-outline" size={16} color={colors.subtext} style={styles.agentPillIcon} />
      <Text style={styles.agentPillText} numberOfLines={1}>{displayedText}</Text>
    </View>
  );
};

export default function ChatThread({ navigation, route }) {
  const { threadId, name } = route.params || {};
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const markdownStyles = getMarkdownStyles(colors);
  
  const {
    modelName, titleModelName, agentModelName, systemPrompt,
    apiKey, tavilyApiKey, availableModels // Added availableModels
  } = useContext(SettingsContext);
  const { threads, updateThreadMessages, renameThread, pinnedMessages, pinMessage, unpinMessage } = useContext(ThreadsContext);
  const { characters } = useContext(CharactersContext);
  const { addTransaction, getTransactions, getFinancialReport, setBudget, getBudgets, deleteBudget } = useContext(FinanceContext);

  const thread = threads.find(t => t.id === threadId) || { id: threadId, name: name || 'Chat', messages: [] };
  const currentCharacter = useMemo(() => characters.find(c => c.id === thread.characterId), [characters, thread.characterId]);
  const pinnedMessageIds = new Set(pinnedMessages.map(p => p.message.id));

  // For ScreenHeader
  const threadName = thread.name || 'Chat';
  const characterName = currentCharacter ? currentCharacter.name : null;
  const headerSubtitle = characterName && threadName !== characterName ? characterName : `Model: ${modelName}`;

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentMode, setCurrentMode] = useState('chat'); // Renamed from mode to currentMode
  const [suggestions, setSuggestions] = useState([]);
  const [followUpSuggestions, setFollowUpSuggestions] = useState([]);
  const [showFollowUps, setShowFollowUps] = useState(false);
  const [activeSuggestionTrigger, setActiveSuggestionTrigger] = useState(null);
  const listRef = useRef(null);
  const titled = useRef(false);
  const inputRef = useRef(null);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 300) }, []);

  useEffect(() => {
    // Reset state when navigating between chats
    setLoading(false); 
    setInput('');
    setSuggestions([]);
    setFollowUpSuggestions([]);
    setShowFollowUps(false);
    setActiveSuggestionTrigger(null);
    const isAlreadyTitled = thread?.name && thread.name !== 'Chat';
    titled.current = isAlreadyTitled;
  }, [threadId]);

  useEffect(() => {
    if (!thread || !thread.messages || thread.messages.length === 0) return;

    let finalSystemPrompt = systemPrompt;
    let finalMode = 'chat';

    if (currentCharacter) {
      const hasTools = currentCharacter.supportedTools && currentCharacter.supportedTools.length > 0;
      // Default to 'agent' if tools are supported, otherwise 'chat'. User can override.
      const initialMode = hasTools ? 'agent' : 'chat';
      setCurrentMode(thread.modeOverride || initialMode); // Use override if available

      // Determine the system prompt based on the current mode (which might be an override)
      if (thread.modeOverride === 'agent' || (initialMode === 'agent' && !thread.modeOverride)) {
        const agentInstructions = generateAgentPrompt(currentCharacter.supportedTools, agentModelName);
        finalSystemPrompt = `
You are a character with a specific persona. Adhere to it strictly.
--- START PERSONA ---
${currentCharacter.systemPrompt}
--- END PERSONA ---

In addition to your persona, you have access to tools to perform tasks.
--- START TOOL INSTRUCTIONS ---
${agentInstructions}
--- END TOOL INSTRUCTIONS ---
        `.trim();
      } else { // chat mode (either by default or by override)
        finalSystemPrompt = currentCharacter.systemPrompt;
      }
    } else {
      // For default chat, mode is always 'chat', no override possible.
      finalMode = 'chat'; // This local finalMode is still used for system message update
      setCurrentMode('chat');
      finalSystemPrompt = systemPrompt;
    }
    // setMode(finalMode); // setCurrentMode is now handling this based on override or default

    const systemMessageIndex = thread.messages.findIndex(m => m.id.startsWith('u-system-'));
    if (systemMessageIndex !== -1 && thread.messages[systemMessageIndex].text !== finalSystemPrompt) {
      const updatedMessages = [...thread.messages];
      updatedMessages[systemMessageIndex] = { ...updatedMessages[systemMessageIndex], text: finalSystemPrompt };
      updateThreadMessages(thread.id, updatedMessages, true);
    }
  }, [threadId, currentCharacter, systemPrompt, agentModelName, thread.messages, updateThreadMessages]);

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
    // Only fetch suggestions in agent mode for characters that support search
    if (currentMode === 'agent' && currentCharacter?.supportedTools?.includes('search_web')) {
      debouncedFetchSuggestions(input);
    } else if (suggestions.length > 0) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setSuggestions([]);
    }
    return () => debouncedFetchSuggestions.cancel();
  }, [input, currentMode, debouncedFetchSuggestions, suggestions.length, currentCharacter]);
  
  const scrollToBottom = () => listRef.current?.scrollToEnd({ animated: true });

  const handleGenerateTitle = async (firstUserText) => {
    if (thread.characterId) return;
    try {
      const title = await generateChatTitle(apiKey, titleModelName || 'gemma-3-1b-it', firstUserText);
      if (title) renameThread(threadId, title);
    } catch (e) { 
      brainLogger.error(LogCategory.BRAIN, 'Title generation failed', {
        error: e.message
      });
    }
  };

  const sendAI = async (text) => {
    if (!apiKey) {
      Alert.alert(
        'API Key Missing',
        'Please set your Google AI API Key in Settings to continue.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Go to Settings', onPress: () => navigation.navigate('Settings') },
        ]
      );
      return;
    }
    setLoading(true);
    const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg = { id: `u${Date.now()}`, text, role: 'user', ts };
    const isFirstRealMessage = thread.messages.filter(m => !m.isHidden).length === 0;

    const historyForAPI = [...thread.messages];
    let newMessages = [...historyForAPI, userMsg];
    updateThreadMessages(threadId, newMessages);

    const modelForRequest = currentMode === 'agent' ? agentModelName : modelName;

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
        isAgentMode: currentMode === 'agent',
        onToolCall: handleToolCall,
        tavilyApiKey: tavilyApiKey,
        financeContext: {
          addTransaction,
          getTransactions,
          getFinancialReport,
          setBudget,
          getBudgets,
          deleteBudget,
        },
        allowedTools: currentCharacter?.supportedTools || [], // <-- BUG FIX
      });
      const aiMsg = { id: `a${Date.now()}`, text: reply, role: 'model', ts, characterId: thread.characterId };
      if (thinkingMessageId) newMessages = newMessages.filter(m => m.id !== thinkingMessageId);
      newMessages.push(aiMsg);
      updateThreadMessages(threadId, newMessages);
      setLoading(false);
      setTimeout(scrollToBottom, 100);

      (async () => {
        // Check if it's the first message AND we haven't titled it yet AND it's the default assistant.
        if (isFirstRealMessage && !titled.current && currentCharacter?.id === 'axion-default-assistant') {
          await handleGenerateTitle(text);
          titled.current = true;
        } else if (!isFirstRealMessage) {
          // Follow-up suggestions logic (remains the same)
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

  const onLinkPress = (url) => { Linking.openURL(url).catch(() => { }); return null; };

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
        { text: 'Copy Text', onPress: () => { Clipboard.setString(message.text); if (Platform.OS === 'android') ToastAndroid.show('Copied to clipboard', ToastAndroid.SHORT); } },
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
          <AiAvatar characterId={item.characterId} />
          <AgentActionIndicator text={item.text} />
        </View>
      );
    }
    return (
      <View style={styles.aiRow}>
        <AiAvatar characterId={item.characterId} />
        <Pressable onLongPress={() => handleLongPress(item)} style={[styles.aiBubble, item.error && styles.errorBubble]}>
          {item.error ? <Text style={styles.errorText}>{item.text}</Text> : (() => {
            let messageText = item.text;
            let actionButton = null;
            const actionRegex = /\[action:(.*?)\]/g;
            const match = actionRegex.exec(messageText);

            if (match) {
              messageText = messageText.replace(actionRegex, '').trim(); // Remove action string from text
              const actionType = match[1];

              if (actionType === 'view_finance_dashboard') {
                actionButton = (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => navigation.navigate('Finance')}
                  >
                    <Ionicons name="stats-chart-outline" size={16} color={colors.accentContrast} style={{marginRight: 8}} />
                    <Text style={styles.actionButtonText}>View Full Report</Text>
                  </TouchableOpacity>
                );
              }
            }

            const processedText = messageText.replace(/\[(.*?)]\((file:\/\/.+?\.(?:png|jpg|jpeg|gif|webp))\)/gi, '![$1]($2)');
            return (
              <>
                <Markdown style={markdownStyles} onLinkPress={onLinkPress} rules={markdownImageRules}>{processedText}</Markdown>
                {actionButton}
              </>
            );
          })()}
          <View style={styles.bubbleFooter}>
            {isPinned && <Ionicons name="pin" size={12} color={colors.subtext} style={{ marginRight: 6 }} />}
            <Text style={[styles.time, item.error && styles.errorTime]}>{item.ts}</Text>
          </View>
        </Pressable>
      </View>
    );
  };

  const displayMessages = thread.messages.filter(m => !m.isHidden);
  const lastMessage = displayMessages[displayMessages.length - 1];
  const showTypingIndicator = loading && lastMessage?.role !== 'agent-thinking';

  const handleModeToggle = (newMode) => {
    if (newMode === currentMode) return;
    // Persist the override
    const updatedThread = { ...thread, modeOverride: newMode };
    // This will trigger the useEffect that recalculates system prompt and updates messages
    updateThreadMessages(threadId, thread.messages, false, updatedThread);
    setCurrentMode(newMode);
    // Potentially clear suggestions if mode changes from agent to chat
    if (newMode === 'chat' && suggestions.length > 0) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setSuggestions([]);
    }
  };

  const isAgentModelToolCapable = useMemo(() => {
    const model = availableModels.find(m => m.name === agentModelName);
    return model?.supportsToolUse || false;
  }, [agentModelName, availableModels]);

  const renderSuggestions = () => {
    if (suggestions.length === 0) return null;
    return (
      <View style={styles.suggestionsContainer}>
        <FlatList data={suggestions} horizontal showsHorizontalScrollIndicator={false} keyExtractor={(item, index) => `${item}-${index}`} renderItem={({ item }) => (
          <TouchableOpacity style={styles.suggestionPill} onPress={() => handleSuggestionTap(item)}>
            <Ionicons name="search-outline" size={14} color={colors.accent} /><Text style={styles.suggestionText}>{item}</Text>
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
            <Ionicons name="sparkles-outline" size={14} color={colors.success} /><Text style={styles.followUpText}>{item}</Text>
          </TouchableOpacity>
        )} contentContainerStyle={{ paddingHorizontal: 12 }} />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
      <ScreenHeader
        navigation={navigation}
        title={threadName}
        subtitle={headerSubtitle}
        rightAction={
          isAgentModelToolCapable && currentCharacter ? ( // Only show if model is tool capable AND a character is selected
            <ModeToggle
              mode={currentMode}
              onToggle={handleModeToggle}
              isAgentModeSupported={currentCharacter?.supportedTools && currentCharacter.supportedTools.length > 0}
            />
          ) : null
        }
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={HEADER_HEIGHT} // Use the correct, consistent offset
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
          placeholder={currentCharacter ? `Chat with ${currentCharacter.name}...` : "Type a message..."}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const useStyles = (colors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  // chatHeader, headerIconButton, headerAvatar, headerIconContainer, chatTitle styles are no longer needed
  chatContent: { flexGrow: 1, padding: 12, paddingTop: 8 },
  userRow: { flexDirection: 'row', justifyContent: 'flex-end', marginVertical: 4 },
  userBubble: { backgroundColor: colors.accent, padding: 12, borderRadius: 20, maxWidth: '80%' },
  userText: { color: '#FFF', fontSize: 16 }, // Keep user text white for contrast
  aiRow: { flexDirection: 'row', marginVertical: 4, alignItems: 'flex-end' },
  aiBubble: { backgroundColor: colors.card, padding: 12, borderRadius: 20, borderWidth: 1, borderColor: colors.border, maxWidth: '80%' },
  errorBubble: { backgroundColor: colors.danger + '20', borderColor: colors.danger },
  errorText: { color: colors.danger, fontSize: 16 },
  bubbleFooter: { flexDirection: 'row', alignSelf: 'flex-end', alignItems: 'center', marginTop: 4 },
  time: { fontSize: 10, color: colors.subtext },
  errorTime: { color: colors.danger },
  suggestionsContainer: {
    height: 50,
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
    paddingVertical: 4
  },
  suggestionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginRight: 10,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2
  },
  suggestionText: { color: colors.accent, fontSize: 14, fontWeight: '600', marginLeft: 6 },
  followUpPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success + '20',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginRight: 10,
    borderWidth: 1,
    borderColor: colors.success + '40'
  },
  followUpText: { color: colors.success, fontSize: 14, fontWeight: '600', marginLeft: 6 },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  actionButtonText: {
    color: colors.accentContrast, // Assuming you have a contrasting color for accent
    fontSize: 14,
    fontWeight: '600',
  },
});
