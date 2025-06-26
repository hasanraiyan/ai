// src/screens/SettingsScreen.js

import React, { useState, useContext, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Pressable,
  Platform,
  Alert,
  Switch,
  Modal,
  FlatList,
  Linking,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { models } from '../constants/models';
import { SettingsContext } from '../contexts/SettingsContext';
import { ThreadsContext } from '../contexts/ThreadsContext';
import { FinanceContext } from '../contexts/FinanceContext';
import { getAvailableTools } from '../services/tools';
import { deleteAllImageData } from '../services/fileService';
import ScreenHeader from '../components/ScreenHeader';
import { useTheme } from '../utils/theme';

function ApiKeyLink({ text, url }) {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  
  const handlePress = () => {
    Linking.openURL(url).catch(err => Alert.alert("Couldn't open page.", err.message));
  };

  return (
    <TouchableOpacity onPress={handlePress} style={styles.linkContainer}>
      <Ionicons name="open-outline" size={16} color={colors.accent} style={styles.linkIcon} />
      <Text style={styles.linkText}>{text}</Text>
    </TouchableOpacity>
  );
}

function ModelSelector({
  label,
  items,
  selectedId,
  onSelect,
  placeholder = 'Search...',
}) {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');

  const filtered = useMemo(() => {
    if (!searchText) return items;
    const lower = searchText.toLowerCase();
    return items.filter(i => i.name.toLowerCase().includes(lower) || i.id.toLowerCase().includes(lower));
  }, [searchText, items]);

  const selectedItem = useMemo(() => items.find(i => i.id === selectedId), [items, selectedId]);

  return (
    <View style={styles.selectorContainer}>
      <Text style={styles.cardSubTitle}>{label}</Text>
      <TouchableOpacity
        style={styles.selectorButton}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.selectorButtonText} numberOfLines={1}>
          {selectedItem ? selectedItem.name : `Select ${label}`}
        </Text>
        <Ionicons name="chevron-down-outline" size={20} color={colors.subtext} />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalRoot}>
          <View style={styles.modalHeader}>
            <TextInput
              style={styles.modalSearchInput}
              value={searchText}
              onChangeText={setSearchText}
              placeholder={placeholder}
              placeholderTextColor={colors.subtext}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalCloseButton}>
              <Ionicons name="close-outline" size={28} color={colors.subtext} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={filtered}
            keyExtractor={item => item.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const selected = item.id === selectedId;
              return (
                <Pressable
                  onPress={() => {
                    onSelect(item.id);
                    setModalVisible(false);
                    setSearchText('');
                  }}
                  style={[styles.modalItem, selected && styles.modalItemSelected]}
                >
                  <Text style={[styles.modalItemText, selected && styles.modalItemTextSelected]} numberOfLines={1}>
                    {item.name}
                  </Text>
                </Pressable>
              );
            }}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}


function SettingsScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  
  const {
    modelName, setModelName,
    titleModelName, setTitleModelName,
    agentModelName, setAgentModelName,
    systemPrompt, setSystemPrompt,
    agentSystemPrompt,
    apiKey, setApiKey,
    tavilyApiKey, setTavilyApiKey,
    enabledTools, setEnabledTools
  } = useContext(SettingsContext);
  const { clearAllThreads } = useContext(ThreadsContext);
  const { clearAllFinanceData } = useContext(FinanceContext);
  const availableTools = getAvailableTools();
  const [showApiKey, setShowApiKey] = useState(false);
  const [showTavilyApiKey, setShowTavilyApiKey] = useState(false);

  const selectedAgentModel = models.find(m => m.id === agentModelName);

  const toggleTool = (toolId) => {
    setEnabledTools(prev => ({ ...prev, [toolId]: !prev[toolId] }));
  };

  const chatModels = useMemo(() => models.filter(m => m.isChatModel), []);
  const titleModels = useMemo(() => models.filter(m => m.isTitleModel), []);
  const agentModels = useMemo(() => models.filter(m => m.isAgentModel), []);

  return (
    <SafeAreaView style={styles.root}>
      <ScreenHeader
        navigation={navigation}
        title="Settings"
        subtitle="Configure your AI assistant"
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0} // Adjust as needed
      >
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">

          <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="key-outline" size={20} color={colors.subtext} style={styles.cardIcon} />
            <Text style={styles.cardTitle}>API Keys</Text>
          </View>
          
          <Text style={styles.cardSubTitle}>Google AI API Key</Text>
          <View style={styles.apiKeyContainer}>
            <TextInput
              style={styles.apiKeyInput}
              value={apiKey}
              onChangeText={setApiKey}
              placeholder="Enter your Google AI API Key"
              placeholderTextColor={colors.subtext}
              secureTextEntry={!showApiKey}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity onPress={() => setShowApiKey(!showApiKey)} style={styles.eyeIcon}>
              <Ionicons name={showApiKey ? "eye-off-outline" : "eye-outline"} size={24} color={colors.subtext} />
            </TouchableOpacity>
          </View>
          <Text style={styles.infoText}>Your Google key is used for chat, agents, and image generation.</Text>
          <ApiKeyLink 
            text="Get your key from Google AI Studio"
            url="https://aistudio.google.com/app/apikey"
          />

          <View style={styles.separator} />
          <Text style={styles.cardSubTitle}>Tavily AI API Key</Text>
          <View style={styles.apiKeyContainer}>
            <TextInput
              style={styles.apiKeyInput}
              value={tavilyApiKey}
              onChangeText={setTavilyApiKey}
              placeholder="Enter your Tavily AI API Key"
              placeholderTextColor={colors.subtext}
              secureTextEntry={!showTavilyApiKey}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity onPress={() => setShowTavilyApiKey(!showTavilyApiKey)} style={styles.eyeIcon}>
              <Ionicons name={showTavilyApiKey ? "eye-off-outline" : "eye-outline"} size={24} color={colors.subtext} />
            </TouchableOpacity>
          </View>
          <Text style={styles.infoText}>Your Tavily key is required for the `search_web` tool.</Text>
          <ApiKeyLink
            text="Get your key from the Tavily dashboard"
            url="https://app.tavily.com/"
          />
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="person-outline" size={20} color={colors.subtext} style={styles.cardIcon} />
            <Text style={styles.cardTitle}>AI Persona</Text>
          </View>
          <TextInput
            style={styles.personaInput}
            value={systemPrompt}
            onChangeText={setSystemPrompt}
            placeholder="Define the AI's persona, e.g., 'You are a helpful pirate assistant.'"
            placeholderTextColor={colors.subtext}
            multiline
          />
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="hardware-chip-outline" size={20} color={colors.subtext} style={styles.cardIcon} />
            <Text style={styles.cardTitle}>Model Configuration</Text>
          </View>
          <ModelSelector label="Main Chat Model" items={chatModels} selectedId={modelName} onSelect={setModelName} />
          <View style={styles.separator} />
          <Text style={styles.infoText}>A smaller model can generate titles faster.</Text>
          <ModelSelector label="MiniAgent Model" items={titleModels} selectedId={titleModelName} onSelect={setTitleModelName} />
          <View style={styles.separator} />
          <Text style={styles.infoText}>Select a model capable of using tools.</Text>
          <ModelSelector label="Agent Model" items={agentModels} selectedId={agentModelName} onSelect={setAgentModelName} />
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="build-outline" size={20} color={colors.subtext} style={styles.cardIcon} />
            <Text style={styles.cardTitle}>Agent Tools</Text>
          </View>
          {!selectedAgentModel?.isAgentModel ? (
            <Text style={styles.infoText}>
              The selected agent model ({selectedAgentModel?.name || agentModelName}) does not support tools. Select a different agent model to enable tools.
            </Text>
          ) : (
            <>
              <Text style={styles.infoText}>Enable tools for the agent. Availability depends on the selected Agent Model.</Text>
              {availableTools.map((tool, index) => {
                const isUserEnabled = !!enabledTools[tool.agent_id];
                const isModelSupported = selectedAgentModel?.supported_tools.includes(tool.agent_id);
                
                let isToolDisabled = !isModelSupported;
                if (tool.agent_id === 'search_web' && !tavilyApiKey) {
                  isToolDisabled = true;
                }
                
                return (
                  <React.Fragment key={tool.agent_id}>
                    {index > 0 && <View style={styles.separator} />}
                    <View style={[styles.toolRow, isToolDisabled && styles.toolRowDisabled]}>
                      <View style={styles.toolInfo}>
                        <Text style={styles.toolName}>{tool.agent_id}</Text>
                        <Text style={styles.toolDescription}>{tool.description}</Text>
                        {!isModelSupported && <Text style={styles.toolSupportText}>Not supported by {selectedAgentModel.name}</Text>}
                        {tool.agent_id === 'search_web' && !tavilyApiKey && isModelSupported && (
                          <Text style={styles.toolSupportText}>Tavily API Key required</Text>
                        )}
                      </View>
                      <Switch
                        trackColor={{ false: '#D1D5DB', true: colors.accent + '80' }}
                        thumbColor={isUserEnabled && !isToolDisabled ? colors.accent : colors.border}
                        ios_backgroundColor="#D1D5DB"
                        onValueChange={() => toggleTool(tool.agent_id)}
                        value={isUserEnabled}
                        disabled={isToolDisabled}
                      />
                    </View>
                  </React.Fragment>
                );
              })}
            </>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="document-text-outline" size={20} color={colors.subtext} style={styles.cardIcon} />
            <Text style={styles.cardTitle}>Agent System Prompt</Text>
          </View>
          <Text style={styles.infoText}>This is the instruction the agent receives based on the tools you've enabled. It is not editable.</Text>
          <View style={styles.promptDisplayContainer}>
            <ScrollView nestedScrollEnabled>
              <Text selectable style={styles.promptDisplayText}>{agentSystemPrompt}</Text>
            </ScrollView>
          </View>
        </View>

        <View style={[styles.card, styles.dangerCard]}>
          <View style={styles.cardHeader}>
            <Ionicons name="warning-outline" size={20} color={colors.danger} style={styles.cardIcon} />
            <Text style={[styles.cardTitle, { color: colors.danger }]}>Danger Zone</Text>
          </View>

          <TouchableOpacity
            style={styles.dangerButton}
            onPress={() => {
              Alert.alert("Clear All Chat History?", "This action is permanent and will delete all conversations. It cannot be undone.",
                [ { text: "Cancel", style: "cancel" }, { text: "Clear History", style: "destructive", onPress: clearAllThreads } ]
              );
            }}>
            <Ionicons name="trash-outline" size={18} color={colors.danger} style={{ marginRight: 8 }} />
            <Text style={styles.dangerButtonText}>Clear All Chat History</Text>
          </TouchableOpacity>
          
          <View style={styles.dangerSeparator} />

          <TouchableOpacity
            style={styles.dangerButton}
            onPress={() => {
              Alert.alert("Clear All Financial Data?", "This will permanently delete all your income and expense records. This action cannot be undone.",
                [ { text: "Cancel", style: "cancel" }, { text: "Delete Data", style: "destructive", onPress: clearAllFinanceData }]
              );
            }}>
            <Ionicons name="wallet-outline" size={18} color={colors.danger} style={{ marginRight: 8 }} />
            <Text style={styles.dangerButtonText}>Clear All Financial Data</Text>
          </TouchableOpacity>

          <View style={styles.dangerSeparator} />

          <TouchableOpacity
            style={styles.dangerButton}
            onPress={() => {
              Alert.alert("Clear All Image Data?", "This will permanently delete all generated images and their metadata from your device. This action cannot be undone.",
                [ { text: "Cancel", style: "cancel" }, { text: "Delete Images", style: "destructive", onPress: deleteAllImageData }]
              );
            }}>
            <Ionicons name="images-outline" size={18} color={colors.danger} style={{ marginRight: 8 }} />
            <Text style={styles.dangerButtonText}>Clear All Image Data</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const useStyles = (colors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scrollContainer: { padding: 16 },
  card: { backgroundColor: colors.card, borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.border },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  cardIcon: { marginRight: 12 },
  cardTitle: { fontSize: 17, fontWeight: '600', color: colors.text },
  cardSubTitle: { fontSize: 15, fontWeight: '600', color: colors.text, marginTop: 8, marginBottom: 4 },
  infoText: { fontSize: 13, color: colors.subtext, lineHeight: 18, marginTop: 4, marginBottom: 8 },
  separator: { height: 1, backgroundColor: colors.border, marginVertical: 16 },
  apiKeyContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.input, borderRadius: 8, paddingHorizontal: 12 },
  apiKeyInput: { flex: 1, paddingVertical: Platform.OS === 'ios' ? 14 : 12, color: colors.text, fontSize: 15 },
  eyeIcon: { padding: 8 },
  personaInput: { backgroundColor: colors.input, borderRadius: 8, padding: 12, minHeight: 120, textAlignVertical: 'top', color: colors.text, fontSize: 15, lineHeight: 22 },
  selectorContainer: { marginTop: 8 },
  selectorButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.input, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.border },
  selectorButtonText: { flex: 1, fontSize: 14, color: colors.text, marginRight: 8 },
  modalRoot: { flex: 1, backgroundColor: colors.background },
  modalHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  modalSearchInput: { flex: 1, backgroundColor: colors.input, borderRadius: 8, paddingVertical: Platform.OS === 'ios' ? 12 : 10, paddingHorizontal: 12, fontSize: 15, color: colors.text },
  modalCloseButton: { marginLeft: 8 },
  modalItem: { paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderColor: colors.border },
  modalItemSelected: { backgroundColor: colors.accent20 },
  modalItemText: { fontSize: 15, color: colors.text },
  modalItemTextSelected: { fontWeight: '600', color: colors.accent },
  toolRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  toolRowDisabled: { opacity: 0.5 },
  toolInfo: { flex: 1, marginRight: 16 },
  toolName: { fontSize: 15, fontWeight: '600', color: colors.text },
  toolDescription: { fontSize: 13, color: colors.subtext, marginTop: 2, lineHeight: 18 },
  toolSupportText: { fontSize: 12, color: colors.danger, fontStyle: 'italic', marginTop: 4 },
  promptDisplayContainer: { backgroundColor: colors.input, borderRadius: 8, padding: 12, marginTop: 4, maxHeight: 250 },
  promptDisplayText: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 13, color: colors.subtext, lineHeight: 20 },
  dangerCard: { borderColor: colors.danger + '80' },
  dangerButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.danger + '20', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 16 },
  dangerButtonText: { color: colors.danger, fontSize: 15, fontWeight: '600' },
  dangerSeparator: { height: 12 },
  linkContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 4, alignSelf: 'flex-start' },
  linkIcon: { marginRight: 6 },
  linkText: { color: colors.accent, fontSize: 14, fontWeight: '600' },
});

export default SettingsScreen;