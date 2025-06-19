import React, { useState, useContext } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Pressable,
  StatusBar,
  Platform,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { gemmaModels, titleModels } from '../constants/models';
import { SettingsContext } from '../contexts/SettingsContext';
import { ThreadsContext } from '../contexts/ThreadsContext';
import { getAvailableTools } from '../services/tools';

function SettingsScreen({ navigation }) {
  const {
    modelName, setModelName,
    titleModelName, setTitleModelName,
    agentModelName, setAgentModelName,
    systemPrompt, setSystemPrompt,
    agentSystemPrompt, // <-- Get the agent prompt from context
    apiKey, setApiKey,
    enabledTools, setEnabledTools
  } = useContext(SettingsContext);
  const { clearAllThreads } = useContext(ThreadsContext);
  const availableTools = getAvailableTools();
  const [showApiKey, setShowApiKey] = useState(false);

  const toggleTool = (toolId) => {
    setEnabledTools(prev => ({ ...prev, [toolId]: !prev[toolId] }));
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.headerButton}>
          <Ionicons name="menu-outline" size={28} color="#475569" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContainer}>

        {/* --- API Key Card --- */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="key-outline" size={20} color="#475569" style={styles.cardIcon} />
            <Text style={styles.cardTitle}>API Key</Text>
          </View>
          <View style={styles.apiKeyContainer}>
            <TextInput
              style={styles.apiKeyInput}
              value={apiKey}
              onChangeText={setApiKey}
              placeholder="Enter your Google AI API Key"
              placeholderTextColor="#9CA3AF"
              secureTextEntry={!showApiKey}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity onPress={() => setShowApiKey(!showApiKey)} style={styles.eyeIcon}>
              <Ionicons name={showApiKey ? "eye-off-outline" : "eye-outline"} size={24} color="#64748B" />
            </TouchableOpacity>
          </View>
          <Text style={styles.infoText}>Your API key is stored securely on your device.</Text>
        </View>

        {/* --- Persona Card --- */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="person-outline" size={20} color="#475569" style={styles.cardIcon} />
            <Text style={styles.cardTitle}>AI Persona</Text>
          </View>
          <TextInput
            style={styles.personaInput}
            value={systemPrompt}
            onChangeText={setSystemPrompt}
            placeholder="Define the AI's persona, e.g., 'You are a helpful pirate assistant.'"
            placeholderTextColor="#9CA3AF"
            multiline
          />
        </View>
        
        {/* --- Model Configuration Card --- */}
        <View style={styles.card}>
           <View style={styles.cardHeader}>
            <Ionicons name="hardware-chip-outline" size={20} color="#475569" style={styles.cardIcon} />
            <Text style={styles.cardTitle}>Model Configuration</Text>
          </View>
          
          <Text style={styles.cardSubTitle}>Main Chat Model</Text>
          <View style={styles.optionGroup}>
            {gemmaModels.map(m => (
              <Pressable key={m} onPress={() => setModelName(m)} style={[styles.optionButton, modelName === m && styles.optionButtonSelected]}>
                <Text style={[styles.optionButtonText, modelName === m && styles.optionButtonTextSelected]}>{m}</Text>
              </Pressable>
            ))}
          </View>
          
          <View style={styles.separator} />
          
          <Text style={styles.cardSubTitle}>Title Generation Model</Text>
          <Text style={styles.infoText}>A smaller model can generate titles faster.</Text>
          <View style={styles.optionGroup}>
            {titleModels.map(m => (
              <Pressable key={`title-${m}`} onPress={() => setTitleModelName(m)} style={[styles.optionButton, titleModelName === m && styles.optionButtonSelected]}>
                <Text style={[styles.optionButtonText, titleModelName === m && styles.optionButtonTextSelected]}>{m}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.separator} />
          
          <Text style={styles.cardSubTitle}>Agent Model</Text>
          <Text style={styles.infoText}>A more powerful model can be better at reasoning and using tools correctly.</Text>
          <View style={styles.optionGroup}>
            {gemmaModels.map(m => (
              <Pressable key={`agent-${m}`} onPress={() => setAgentModelName(m)} style={[styles.optionButton, agentModelName === m && styles.optionButtonSelected]}>
                <Text style={[styles.optionButtonText, agentModelName === m && styles.optionButtonTextSelected]}>{m}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* --- Agent Tools Card --- */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="build-outline" size={20} color="#475569" style={styles.cardIcon} />
            <Text style={styles.cardTitle}>Agent Tools</Text>
          </View>
          <Text style={styles.infoText}>Enable or disable tools for the agent to use. This updates the agent's instructions automatically.</Text>
          {availableTools.map((tool, index) => {
            const isEnabled = !!enabledTools[tool.agent_id];
            return (
              <React.Fragment key={tool.agent_id}>
                {index > 0 && <View style={styles.separator} />}
                <View style={styles.toolRow}>
                  <View style={styles.toolInfo}>
                    <Text style={styles.toolName}>{tool.agent_id}</Text>
                    <Text style={styles.toolDescription}>{tool.description}</Text>
                  </View>
                  <Switch
                    trackColor={{ false: '#D1D5DB', true: '#A5B4FC' }}
                    thumbColor={isEnabled ? '#6366F1' : '#f4f3f4'}
                    ios_backgroundColor="#D1D5DB"
                    onValueChange={() => toggleTool(tool.agent_id)}
                    value={isEnabled}
                  />
                </View>
              </React.Fragment>
            );
          })}
        </View>

        {/* --- NEW: Agent Prompt Card --- */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="document-text-outline" size={20} color="#475569" style={styles.cardIcon} />
            <Text style={styles.cardTitle}>Agent System Prompt</Text>
          </View>
          <Text style={styles.infoText}>This is the instruction the agent receives based on the tools you've enabled. It is not editable.</Text>
          <View style={styles.promptDisplayContainer}>
              <ScrollView nestedScrollEnabled>
                <Text selectable style={styles.promptDisplayText}>{agentSystemPrompt}</Text>
              </ScrollView>
          </View>
        </View>

        {/* --- Danger Zone Card --- */}
        <View style={[styles.card, styles.dangerCard]}>
          <View style={styles.cardHeader}>
            <Ionicons name="warning-outline" size={20} color="#DC2626" style={styles.cardIcon} />
            <Text style={[styles.cardTitle, { color: '#DC2626' }]}>Danger Zone</Text>
          </View>
          <TouchableOpacity
            style={styles.dangerButton}
            onPress={() => {
              Alert.alert(
                "Clear All Chat History?",
                "This action is permanent and will delete all conversations. It cannot be undone.",
                [
                  { text: "Cancel", style: "cancel" },
                  { text: "Clear History", style: "destructive", onPress: clearAllThreads },
                ]
              );
            }}>
            <Ionicons name="trash-outline" size={18} color="#991B1B" style={{marginRight: 8}} />
            <Text style={styles.dangerButtonText}>Clear All Chat History</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  headerButton: { padding: 4 },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
    marginLeft: 16,
  },
  scrollContainer: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardIcon: {
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1E293B',
  },
  cardSubTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
    marginTop: 8,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginTop: 4,
    marginBottom: 8,
  },
  separator: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 16,
  },
  
  // API Key Styles
  apiKeyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  apiKeyInput: {
    flex: 1,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    color: '#1E293B',
    fontSize: 15,
  },
  eyeIcon: {
    padding: 8,
  },
  
  // Persona Styles
  personaInput: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 12,
    minHeight: 120,
    textAlignVertical: 'top',
    color: '#1E293B',
    fontSize: 15,
    lineHeight: 22,
  },
  
  // Model Selection Styles
  optionGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8
  },
  optionButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  optionButtonSelected: {
    backgroundColor: '#EEF2FF',
    borderColor: '#6366F1'
  },
  optionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#334155'
  },
  optionButtonTextSelected: {
    color: '#4338CA',
    fontWeight: '600'
  },
  
  // Tool Styles
  toolRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  toolInfo: {
    flex: 1,
    marginRight: 16,
  },
  toolName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
  },
  toolDescription: {
    fontSize: 13,
    color: '#475569',
    marginTop: 2,
    lineHeight: 18,
  },
  
  // NEW: Prompt Display Styles
  promptDisplayContainer: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 12,
    marginTop: 4,
    maxHeight: 250,
  },
  promptDisplayText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    color: '#475569',
    lineHeight: 20,
  },

  // Danger Zone
  dangerCard: {
    borderColor: '#FCA5A5'
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  dangerButtonText: {
    color: '#B91C1C',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default SettingsScreen;