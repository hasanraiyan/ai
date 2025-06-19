import React, { useState, useRef, useEffect, useContext } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Keyboard,
  Linking,
  ActivityIndicator,
  Pressable,
  Clipboard,
  Alert,
  Animated,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Markdown from 'react-native-markdown-display';
import { SettingsContext } from '../contexts/SettingsContext';
import { ThreadsContext } from '../contexts/ThreadsContext';
import { generateChatTitle, sendMessageToAI } from '../services/aiService';
import TypingIndicator from '../components/TypingIndicator';
import { safetySettings } from '../constants/safetySettings';
import { markdownStyles } from '../styles/markdownStyles';
import { models } from '../constants/models';

export default function ChatThread({ navigation, route }) {
  const { threadId, name } = route.params || {};
  const {
    modelName,
    titleModelName,
    agentModelName,
    systemPrompt,
    agentSystemPrompt,
    apiKey
  } = useContext(SettingsContext);
  const { threads, updateThreadMessages, renameThread } = useContext(ThreadsContext);
  const thread =
    threads.find(t => t.id === threadId) ||
    { id: threadId, name: name || 'Chat', messages: [] };

  // state & refs
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('chat');
  const listRef = useRef(null);
  const titled = useRef(false);
  const inputRef = useRef(null);

  // Check if selected agent model supports agent mode
  const selectedAgentModel = models.find(m => m.id === agentModelName);
  const isAgentModeSupported = selectedAgentModel?.isAgentModel ?? false;

  // Animated mode selector
  const animatedValue = useRef(new Animated.Value(mode === 'chat' ? 0 : 1)).current;
  const [selectorWidth, setSelectorWidth] = useState(0);
  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: mode === 'chat' ? 0 : 1,
      duration: 200,
      useNativeDriver: true
    }).start();
  }, [mode]);
  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, selectorWidth / 2]
  });

  // Focus the input after mount
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  const onToggleMode = (newMode) => {
    if (newMode === 'agent' && !isAgentModeSupported) {
      Alert.alert(
        'Agent Mode Not Supported',
        `The current agent model (${selectedAgentModel?.name || agentModelName}) does not support tools. Please select a different model in Settings.`
      );
      return;
    }
    setMode(newMode);
  };
  
  const scrollToBottom = () => listRef.current?.scrollToEnd({ animated: true });

  // Generate thread title on first real message
  const handleGenerateTitle = async firstUserText => {
    try {
      const title = await generateChatTitle(
        apiKey,
        titleModelName || 'gemma-3-1b-it',
        firstUserText
      );
      if (title) renameThread(threadId, title);
    } catch (e) {
      console.error('Title generation failed:', e);
    }
  };

  const sendAI = async text => {
    if (!apiKey) {
      Alert.alert(
        'API Key Missing',
        'Please set your API Key in Settings to use the AI features.'
      );
      return;
    }

    const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg = { id: `u${Date.now()}`, text, role: 'user', ts };
    const isFirstRealMessage = thread.messages.length === 2;

    let newMessages = [...thread.messages, userMsg];
    updateThreadMessages(threadId, newMessages);
    setLoading(true);

    const modelForRequest = mode === 'agent' ? agentModelName : modelName;
    const currentSystemPrompt = mode === 'agent' ? agentSystemPrompt : systemPrompt;

    let historyForAPI = newMessages.map(m => ({ ...m }));
    const sysIdx = historyForAPI.findIndex(m => m.id.startsWith('u-system-'));
    if (sysIdx > -1) historyForAPI[sysIdx].text = currentSystemPrompt;

    // --- FIX: Keep track of the temporary thinking message ID ---
    let thinkingMessageId = null;

    const handleToolCall = (toolCall) => {
      const toolNames = Object.keys(toolCall).filter(key => key !== 'tools-required');
      if (toolNames.length === 0) return;

      const friendlyText = `Using tool(s): ${toolNames.map(name => `\`${name}\``).join(', ')}`;
      const actionTs = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      thinkingMessageId = `thinking-${Date.now()}`; // Store the ID
      const agentActionMsg = {
        id: thinkingMessageId,
        role: 'agent-thinking',
        text: friendlyText,
        ts: actionTs,
      };

      newMessages = [...newMessages, agentActionMsg];
      updateThreadMessages(threadId, newMessages);
    };

    try {
      const reply = await sendMessageToAI(
        apiKey,
        modelForRequest,
        historyForAPI,
        text,
        mode === 'agent',
        handleToolCall // Pass the new callback here
      );
      const aiMsg = { id: `a${Date.now()}`, text: reply, role: 'model', ts };

      // --- FIX: Remove the 'thinking' message before adding the final AI response ---
      if (thinkingMessageId) {
        newMessages = newMessages.filter(m => m.id !== thinkingMessageId);
      }
      
      newMessages = [...newMessages, aiMsg];
      updateThreadMessages(threadId, newMessages);

      if (isFirstRealMessage && !titled.current) {
        handleGenerateTitle(text);
        titled.current = true;
      }
    } catch (e) {
      const errMsgText = e.message.includes('API Key Missing')
        ? e.message
        : 'An error occurred while fetching the response.';
      const errMsg = {
        id: `e${Date.now()}`,
        text: errMsgText,
        role: 'model',
        error: true,
        ts
      };
      
      // --- FIX: Ensure 'thinking' message is removed even on error ---
      if (thinkingMessageId) {
        newMessages = newMessages.filter(m => m.id !== thinkingMessageId);
      }
      newMessages = [...newMessages, errMsg];
      updateThreadMessages(threadId, newMessages);
    } finally {
      setLoading(false);
      setTimeout(scrollToBottom, 100);
    }
  };

  const onSend = () => {
    const t = input.trim();
    if (!t || loading) return;
    setInput('');
    Keyboard.dismiss();
    sendAI(t);
  };

  const onLinkPress = url => {
    Linking.openURL(url).catch(() => {});
    return false;
  };

  const imageRule = {
    image: (node, children, parent, styles) => {
      const { src, alt, title } = node.attributes;
      return (
        <Image
          key={node.key}
          source={{ uri: src }}
          style={{
            width: '100%',
            height: 200,
            resizeMode: 'contain',
            marginVertical: 8
          }}
          accessibilityLabel={alt || title}
        />
      );
    }
  };

  const renderMessageItem = ({ item }) => {
    if (item.role === 'user') {
      return (
        <View style={styles.userRow}>
          <View style={styles.userBubble}>
            <Text style={styles.userText}>{item.text}</Text>
            <Text style={styles.time}>{item.ts}</Text>
          </View>
        </View>
      );
    }

    if (item.role === 'agent-thinking') {
      return (
        <View style={styles.aiRow}>
          <View style={styles.avatar}>
            <Ionicons name="build-outline" size={20} color="#6366F1" />
          </View>
          <View style={styles.agentThinkingBubble}>
            <ActivityIndicator size="small" color="#475569" style={{ marginRight: 10 }}/>
            <Markdown style={{ body: styles.agentThinkingText }}>{item.text}</Markdown>
          </View>
        </View>
      );
    }

    // This handles both 'model' and 'error' roles
    return (
      <View style={styles.aiRow}>
        <View style={styles.avatar}>
          <Ionicons name="sparkles-outline" size={20} color="#6366F1" />
        </View>
        <View style={[styles.aiBubble, item.error && styles.errorBubble]}>
          {item.error ? (
            <Text style={styles.errorText}>{item.text}</Text>
          ) : (
            <Markdown
              style={markdownStyles}
              onLinkPress={onLinkPress}
              rules={imageRule}
            >
              {item.text}
            </Markdown>
          )}
          <Text style={[styles.time, item.error && styles.errorTime]}>
            {item.ts}
          </Text>
        </View>
      </View>
    );
  };

  const displayMessages = thread.messages.filter((m, idx) => idx > 1 && !m.isHidden);
  
  const lastMessage = displayMessages[displayMessages.length - 1];
  const showTypingIndicator = loading && lastMessage?.role !== 'agent-thinking';


  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      {/* â€” Header */}
      <View style={styles.chatHeader}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerIconButton}
        >
          <Ionicons name="arrow-back" size={24} color="#475569" />
        </TouchableOpacity>
        <Text style={styles.chatTitle} numberOfLines={1}>
          {thread.name}
        </Text>
      </View>

      {/* â€” Mode Selector */}
      <View
        style={styles.modeSelectorContainer}
        onLayout={e => setSelectorWidth(e.nativeEvent.layout.width)}
      >
        <Animated.View
          style={[
            styles.selectorIndicator,
            { width: selectorWidth / 2, transform: [{ translateX }] }
          ]}
        />
        <TouchableOpacity style={styles.modeButton} onPress={() => onToggleMode('chat')}>
          <Text style={[styles.modeButtonText, mode === 'chat' && styles.modeButtonTextActive]}>
            Chat
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.modeButton, !isAgentModeSupported && styles.modeButtonDisabled]} onPress={() => onToggleMode('agent')}>
          <Text style={[styles.modeButtonText, mode === 'agent' && styles.modeButtonTextActive, !isAgentModeSupported && styles.modeButtonTextDisabled]}>
            Agent
          </Text>
        </TouchableOpacity>
      </View>

      {/* â€” Messages */}
      <FlatList
        ref={listRef}
        data={displayMessages}
        keyExtractor={i => i.id}
        contentContainerStyle={styles.chatContent}
        renderItem={({ item }) => (
          <Pressable onLongPress={() => Clipboard.setString(item.text)}>
            {renderMessageItem({ item })}
          </Pressable>
        )}
        ListFooterComponent={showTypingIndicator && <TypingIndicator />}
        keyboardShouldPersistTaps="handled"
      />

      {/* â€” Input */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.inputRow}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Type a message..."
            multiline
            editable={!loading}
          />
          <TouchableOpacity
            onPress={onSend}
            style={[styles.sendBtn, (!input.trim() || loading) && styles.sendDisabled]}
            disabled={!input.trim() || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Ionicons name="send" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9'
  },
  headerIconButton: { padding: 8 },
  chatTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginHorizontal: 12,
    flex: 1
  },
  modeSelectorContainer: {
    position: 'absolute',
    top: 60,
    flexDirection: 'row',
    alignSelf: 'center',
    backgroundColor: '#E2E8F0',
    borderRadius: 20,
    padding: 4,
    width: '40%',
    marginVertical: 10,
    zIndex: 10,
    overflow: 'hidden'
  },
  selectorIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: '#6366F1',
    borderRadius: 16
  },
  modeButton: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center'

  },
  modeButtonDisabled: {
    opacity: 0.6
  },
  modeButtonText: {
    fontWeight: '600',
    color: '#334155',
    fontSize: 15
  },
  modeButtonTextActive: {
    color: '#FFFFFF'
  },
  modeButtonTextDisabled: {
    color: '#475569'
  },
  chatContent: {
    padding: 12,
    paddingBottom: 60,
    marginTop: 25,
    marginBottom: 10
  },
  userRow: { flexDirection: 'row', justifyContent: 'flex-end', margin: 8 },
  userBubble: { backgroundColor: '#6366F1', padding: 12, borderRadius: 16, maxWidth: '80%' },
  userText: { color: '#fff', fontSize: 16 },
  aiRow: { flexDirection: 'row', margin: 8, alignItems: 'flex-end' },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8
  },
  aiBubble: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    maxWidth: '80%'
  },
  agentThinkingBubble: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    maxWidth: '80%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  agentThinkingText: {
    color: '#475569',
    fontStyle: 'italic',
    fontSize: 15,
  },
  errorBubble: { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5' },
  errorText: { color: '#B91C1C', fontSize: 16 },
  time: { fontSize: 10, color: '#94A3B8', marginTop: 4, alignSelf: 'flex-end' },
  errorTime: { color: '#FCA5A5' },
  inputRow: {
    flexDirection: 'row',
    padding: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderColor: '#E2E8F0'
  },
  input: {
    flex: 1,
    padding: 12,
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    marginRight: 8,
    maxHeight: 100
  },
  sendBtn: {
    backgroundColor: '#6366F1',
    padding: 12,
    borderRadius: 20,
    justifyContent: 'center'
  },
  sendDisabled: { backgroundColor: '#A5B4FC' }
});