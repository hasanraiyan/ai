import React, { useState, useEffect, useContext } from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  StatusBar,
  Linking,
  ActivityIndicator,
  Modal,
  StyleSheet,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';

import { SettingsContext } from './src/contexts/SettingsContext';
import { ThreadsContext } from './src/contexts/ThreadsContext';
import ChatThread from './src/screens/ChatThread';
import ThreadsList from './src/screens/ThreadsList';
import SettingsScreen from './src/screens/SettingsScreen';
import CustomDrawerContent from './src/navigation/CustomDrawerContent';
import { getAvailableTools } from './src/services/tools';

const Drawer = createDrawerNavigator();
const { width } = Dimensions.get('window');

const generateAgentPrompt = () => {
  const tools = getAvailableTools();
  const toolDescriptions = tools.map(t => `- ${t.agent_id}: ${t.description} Input: ${JSON.stringify(t.input_format)}`).join('\n');

  return `You are a helpful and intelligent agent. Your primary goal is to assist users by breaking down their requests into tasks that can be executed by available tools.

You have access to the following tools:
${toolDescriptions}

Here is how you must operate:
1.  Analyze the user's request.
2.  Determine if one or more of the available tools can fulfill the request.
3.  If they can, you MUST respond ONLY with a single, valid JSON object that specifies the tools to be called. The JSON format is: { "tools-required": true, "tool_name": { "parameter": "value" }, ... }.
4.  For example, if the user asks "What is 25 * 8 and what are the latest AI trends?", your response should be:
    {
      "tools-required": true,
      "calculator": {
        "expression": "25 * 8"
      },
      "search_web": {
        "query": "latest AI trends"
      }
    }
5.  If the user's request cannot be handled by the available tools (e.g., a simple greeting or a question you can answer from your own knowledge), respond as a standard conversational AI. Do NOT attempt to use tools.
6.  After you provide the JSON, you will receive the results from the tools in a subsequent message. You must then use these results to construct a final, user-friendly, natural language response.
7.  IMPORTANT: If the 'image_generator' tool was used, you MUST embed the resulting 'image_url' in your final response using Markdown format. For example: 'Here is the image you requested: ![A description of the image](the_image_url_here)'.`;
};


export default function App() {
  const [modelName, setModelName] = useState('gemma-3-27b-it');
  const [titleModelName, setTitleModelName] = useState('gemma-3-1b-it'); // Added for specific title generation model
  const [systemPrompt, setSystemPrompt] = useState('You are Arya, a friendly and insightful AI assistant with a touch of wit and warmth. You speak in a conversational, relatable tone—like a clever Gen Z friend who’s also secretly a professor. You’re respectful, humble when needed, but never afraid to speak the truth. You\'re helpful, curious, and love explaining things in a clear, creative way. Keep your answers accurate, helpful, and full of personality. Never act robotic—be real, be Arya.');
  const [agentSystemPrompt, setAgentSystemPrompt] = useState(generateAgentPrompt());
  const [threads, setThreads] = useState([]);
  const [apiKey, setApiKey] = useState('');
  const [ready, setReady] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        const [m, tm, s, t, ak, seen] = await Promise.all([
          AsyncStorage.getItem('@modelName'),
          AsyncStorage.getItem('@titleModelName'),
          AsyncStorage.getItem('@systemPrompt'),
          AsyncStorage.getItem('@threads'),
          AsyncStorage.getItem('@apiKey'),
          AsyncStorage.getItem('@seenWelcome'),
        ]);
        if (m) setModelName(m);
        if (tm) setTitleModelName(tm);
        if (s) setSystemPrompt(s);
        // Agent prompt is now generated dynamically, so we don't load/save it.
        // if (asp) setAgentSystemPrompt(asp);
        if (t) setThreads(JSON.parse(t));
        if (ak) setApiKey(ak);
        if (!seen) setShowWelcome(true);
      } catch { }
      setReady(true);
    })();
  }, []);
  useEffect(() => { AsyncStorage.setItem('@modelName', modelName); }, [modelName]);
  useEffect(() => { AsyncStorage.setItem('@titleModelName', titleModelName); }, [titleModelName]);
  useEffect(() => { AsyncStorage.setItem('@systemPrompt', systemPrompt); }, [systemPrompt]);
  // We no longer save agentSystemPrompt as it's generated
  // useEffect(() => { AsyncStorage.setItem('@agentSystemPrompt', agentSystemPrompt); }, [agentSystemPrompt]);
  useEffect(() => { AsyncStorage.setItem('@threads', JSON.stringify(threads)); }, [threads]);
  useEffect(() => { AsyncStorage.setItem('@apiKey', apiKey); }, [apiKey]);
  const createThread = () => {
    const id = Date.now().toString();
    const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const initialMessages = [
      {
        id: `u-system-${id}`,
        text: systemPrompt,
        role: 'user',
        ts,
      },
      {
        id: `a-system-${id}`,
        text: "Understood. I'm ready to assist you as Arya. How can I help you today?",
        role: 'model',
        ts,
      },
    ];
    const newThread = { id, name: 'New Chat', messages: initialMessages };
    // Add new thread to the beginning
    setThreads(prev => [newThread, ...prev]);
    return id;
  };
  const updateThreadMessages = (threadId, messages) =>
    setThreads(prev => {
      const updatedThread = { ...prev.find(t => t.id === threadId), messages };
      const otherThreads = prev.filter(t => t.id !== threadId);
      // Move updated thread to the beginning
      return [updatedThread, ...otherThreads];
    });
  const renameThread = (threadId, name) =>
    setThreads(prev => prev.map(t => t.id === threadId ? { ...t, name } : t));
  const deleteThread = threadId =>
    setThreads(prev => prev.filter(t => t.id !== threadId));

  const clearAllThreads = () => {
    setThreads([]);
    // AsyncStorage will be updated by the useEffect hook for `threads`
  };
  const closeWelcome = () => {
    setShowWelcome(false);
    AsyncStorage.setItem('@seenWelcome', '1').catch(() => { });
  };
  if (!ready) {
    return (
      <SafeAreaView style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#6366F1" />
      </SafeAreaView>
    );
  }
  return (
    <SettingsContext.Provider value={{ modelName, setModelName, titleModelName, setTitleModelName, systemPrompt, setSystemPrompt, agentSystemPrompt, setAgentSystemPrompt, apiKey, setApiKey }}>
      <ThreadsContext.Provider value={{ threads, createThread, updateThreadMessages, renameThread, deleteThread }}>
        <ThreadsContext.Provider value={{ threads, createThread, updateThreadMessages, renameThread, deleteThread, clearAllThreads }}>
          <NavigationContainer>
            <Drawer.Navigator drawerContent={props => <CustomDrawerContent {...props} />} screenOptions={{ headerShown: false, drawerType: 'slide' }}>
              <Drawer.Screen name="Threads" component={ThreadsList} />
              <Drawer.Screen name="Chat" component={ChatThread} />
              <Drawer.Screen name="Settings" component={SettingsScreen} />
            </Drawer.Navigator>
          </NavigationContainer>
          <Modal transparent visible={showWelcome} animationType="fade">
            <View style={styles.modalOverlay}>
              <View style={styles.welcomeModal}>
                <Ionicons name="sparkles-sharp" size={36} color="#6366F1" style={{ alignSelf: 'center', marginBottom: 12 }} />
                <Text style={styles.welcomeTitle}>Welcome to AI Assistant</Text>
                <Text style={styles.welcomeText}>
                  To get started, you'll need a Google AI API Key. This key lets the app communicate with the Gemma language model.
                </Text>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonPrimary, { alignSelf: 'stretch', marginTop: 16 }]}
                  onPress={() => Linking.openURL('https://aistudio.google.com/app/apikey').catch(() => { })}
                >
                  <Text style={styles.modalButtonText}>Get API Key</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonSecondary, { alignSelf: 'stretch', marginTop: 12 }]}
                  onPress={closeWelcome}
                >
                  <Text style={[styles.modalButtonText, styles.modalButtonTextSecondary]}>Maybe Later</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </ThreadsContext.Provider>
      </ThreadsContext.Provider>
    </SettingsContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  // Styles for WelcomeModal and loading indicator
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  welcomeModal: { width: width * 0.9, backgroundColor: '#fff', borderRadius: 12, padding: 24 },
  welcomeTitle: { fontSize: 20, fontWeight: '700', color: '#1E293B', textAlign: 'center', marginBottom: 12 },
  welcomeText: { fontSize: 15, color: '#475569', textAlign: 'center', lineHeight: 22 },
  modalButton: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 6, marginLeft: 10, minWidth: 80, alignItems: 'center' },
  modalButtonPrimary: { backgroundColor: '#6366F1' },
  modalButtonSecondary: { backgroundColor: '#E2E8F0' },
  modalButtonText: { fontSize: 16, color: '#fff', fontWeight: '500' },
  modalButtonTextSecondary: { color: '#334155' },
  // For loading screen
  loadingContainer: { justifyContent: 'center', alignItems: 'center' },
});