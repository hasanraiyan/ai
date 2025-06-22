// src/screens/ChatThread.js

import React, { useState, useRef, useEffect, useContext } from 'react';
import {
  StyleSheet, Text, View, FlatList, KeyboardAvoidingView,
  Platform, StatusBar, Keyboard, Linking, Pressable, Clipboard, Alert, ToastAndroid,
  ActivityIndicator, Image, TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Markdown from 'react-native-markdown-display';
import { Ionicons } from '@expo/vector-icons';
import { SettingsContext } from '../contexts/SettingsContext';
import { ThreadsContext } from '../contexts/ThreadsContext';
import { CharactersContext } from '../contexts/CharactersContext';
import { sendMessageToAI } from '../services/aiService';
import { generateChatTitle } from '../agents/chatTitleAgent';
import TypingIndicator from '../components/TypingIndicator';
import ModeToggle from '../components/ModeToggle';
import { markdownStyles } from '../styles/markdownStyles';
import { models } from '../constants/models';
import { ImageWithLoader } from '../components/imageSkeleton';
import Composer from '../components/Composer';

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
      <Text style={styles.agentPillText} numberOfLines={1}>
        {displayedText}
      </Text>
    </View>
  );
};

export default function ChatThread({ navigation, route }) {
  const { threadId, name } = route.params || {};
  const { 
    modelName, 
    titleModelName, 
    agentModelName, 
    systemPrompt, 
    agentSystemPrompt, 
    apiKey,
    tavilyApiKey
  } = useContext(SettingsContext);
  const { threads, updateThreadMessages, renameThread, pinnedMessages, pinMessage, unpinMessage } = useContext(ThreadsContext);
  const { characters } = useContext(CharactersContext);

  const thread = threads.find(t => t.id === threadId) || { id: threadId, name: name || 'Chat', messages: [] };
  const currentCharacter = characters.find(c => c.id === thread.characterId);
  const pinnedMessageIds = new Set(pinnedMessages.map(p => p.message.id));

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('chat');
  const listRef = useRef(null);
  const titled = useRef(false);
  const inputRef = useRef(null);

  const selectedAgentModel = models.find(m => m.id === agentModelName);
  const isAgentModeSupported = selectedAgentModel?.isAgentModel ?? false;

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 300) }, []);
  
  useEffect(() => {
    if (!thread || !thread.messages) return;

    const getSystemPromptForRequest = () => {
      if (mode === 'agent') return agentSystemPrompt;
      if (currentCharacter) return currentCharacter.systemPrompt;
      return systemPrompt;
    };
    
    const correctSystemPrompt = getSystemPromptForRequest();
    const systemMessageIndex = thread.messages.findIndex(m => m.id.startsWith('u-system-'));

    if (systemMessageIndex !== -1 && thread.messages[systemMessageIndex].text !== correctSystemPrompt) {
      const updatedMessages = [...thread.messages];
      updatedMessages[systemMessageIndex] = {
        ...updatedMessages[systemMessageIndex],
        text: correctSystemPrompt,
      };
      updateThreadMessages(threadId, updatedMessages, true);
    }
  }, [mode, threadId, currentCharacter, systemPrompt, agentSystemPrompt, thread.messages, updateThreadMessages]);

  const onToggleMode = newMode => {
    if (newMode === 'agent' && !isAgentModeSupported) {
      Alert.alert('Agent Mode Not Supported', `The current agent model (${selectedAgentModel?.name || agentModelName}) does not support tools.`);
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
    const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg = { id: `u${Date.now()}`, text, role: 'user', ts };
    const isFirstRealMessage = thread.messages.filter(m => !m.isHidden).length === 0;

    const historyForAPI = [...thread.messages];
    let newMessages = [...historyForAPI, userMsg];
    updateThreadMessages(threadId, newMessages);
    
    setLoading(true);
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
        isAgentMode: mode === 'agent',
        onToolCall: handleToolCall,
        tavilyApiKey: tavilyApiKey
      });
      const aiMsg = { id: `a${Date.now()}`, text: reply, role: 'model', ts, characterId: thread.characterId };
      if (thinkingMessageId) newMessages = newMessages.filter(m => m.id !== thinkingMessageId);
      newMessages.push(aiMsg);
      updateThreadMessages(threadId, newMessages);
      if (isFirstRealMessage && !titled.current) {
        handleGenerateTitle(text);
        titled.current = true;
      }
    } catch (e) {
      const errorText = e.message.includes('API Key Missing') ? e.message : 'An error occurred while fetching the response.';
      if (thinkingMessageId) newMessages = newMessages.filter(m => m.id !== thinkingMessageId);
      newMessages.push({ id: `e${Date.now()}`, text: errorText, role: 'model', error: true, ts });
      updateThreadMessages(threadId, newMessages);
    } finally {
      setLoading(false);
      setTimeout(scrollToBottom, 100);
    }
  };

  const onSend = () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;
    setInput('');
    Keyboard.dismiss();
    sendAI(trimmed);
  };

  const onLinkPress = (url) => {
    Linking.openURL(url).catch(() => { });
    return false;
  };

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
        { text: 'Copy Text', onPress: () => {
            Clipboard.setString(message.text);
            if (Platform.OS === 'android') ToastAndroid.show('Copied to clipboard', ToastAndroid.SHORT);
          }},
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

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.chatHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIconButton}><Ionicons name="arrow-back" size={24} color="#475569" /></TouchableOpacity>
        {currentCharacter && <Image source={{ uri: currentCharacter.avatarUrl }} style={styles.headerAvatar} />}
        <Text style={styles.chatTitle} numberOfLines={1}>{thread.name}</Text>
        {!currentCharacter && <ModeToggle mode={mode} onToggle={onToggleMode} isAgentModeSupported={isAgentModeSupported} />}
      </View>
      {/* --- MODIFICATION START --- */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <FlatList
          ref={listRef}
          data={displayMessages}
          keyExtractor={i => i.id}
          contentContainerStyle={styles.chatContent}
          renderItem={renderMessageItem}
          ListFooterComponent={showTypingIndicator && <TypingIndicator />}
          keyboardShouldPersistTaps="handled"
        />
        <Composer
          value={input}
          onValueChange={setInput}
          onSend={onSend}
          loading={loading}
          placeholder="Type a message..."
        />
      </KeyboardAvoidingView>
      {/* --- MODIFICATION END --- */}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F9FAFB' },
  chatHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderBottomWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#FFF' },
  headerIconButton: { padding: 8 },
  headerAvatar: { width: 32, height: 32, borderRadius: 16, marginLeft: 8 },
  chatTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', marginHorizontal: 12, flex: 1 },
  chatContent: { padding: 12, paddingBottom: 20, paddingTop: 8 },
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
  agentPillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
    maxWidth: '80%',
  },
  agentPillSpinner: {
    marginRight: 8,
  },
  agentPillIcon: {
    marginRight: 6,
  },
  agentPillText: {
    color: '#4B5563',
    fontSize: 14,
    fontWeight: '500',
    flexShrink: 1,
  },
});