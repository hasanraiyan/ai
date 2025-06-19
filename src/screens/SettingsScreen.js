import React, { useState, useContext, useMemo } from 'react';
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
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { models } from '../constants/models';
import { SettingsContext } from '../contexts/SettingsContext';
import { ThreadsContext } from '../contexts/ThreadsContext';
import { getAvailableTools } from '../services/tools';

// A reusable selector component with search and modal for large lists
function ModelSelector({
  label,
  items,
  selectedId,
  onSelect,
  placeholder = 'Search...',
}) {
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
        <Ionicons name="chevron-down-outline" size={20} color="#475569" />
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
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalCloseButton}>
              <Ionicons name="close-outline" size={28} color="#475569" />
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
  const {
    modelName, setModelName,
    titleModelName, setTitleModelName,
    agentModelName, setAgentModelName,
    systemPrompt, setSystemPrompt,
    agentSystemPrompt,
    apiKey, setApiKey,
    enabledTools, setEnabledTools
  } = useContext(SettingsContext);
  const { clearAllThreads } = useContext(ThreadsContext);
  const availableTools = getAvailableTools();
  const [showApiKey, setShowApiKey] = useState(false);

  const selectedAgentModel = models.find(m => m.id === agentModelName);

  const toggleTool = (toolId) => {
    setEnabledTools(prev => ({ ...prev, [toolId]: !prev[toolId] }));
  };

  // Prepare filtered lists
  const chatModels = useMemo(() => models.filter(m => m.isChatModel), []);
  const titleModels = useMemo(() => models.filter(m => m.isTitleModel), []);
  const agentModels = useMemo(() => models.filter(m => m.isAgentModel), []);

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.headerButton}>
          <Ionicons name="menu-outline" size={28} color="#475569" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">

        {/* API Key Card */}
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

        {/* Persona Card */}
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

        {/* Model Configuration Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="hardware-chip-outline" size={20} color="#475569" style={styles.cardIcon} />
            <Text style={styles.cardTitle}>Model Configuration</Text>
          </View>

          {/* Main Chat Model Selector */}
          <ModelSelector
            label="Main Chat Model"
            items={chatModels}
            selectedId={modelName}
            onSelect={setModelName}
          />

          <View style={styles.separator} />

          {/* Title Generation Model Selector */}
          <Text style={styles.infoText}>A smaller model can generate titles faster.</Text>
          <ModelSelector
            label="Title Generation Model"
            items={titleModels}
            selectedId={titleModelName}
            onSelect={setTitleModelName}
          />

          <View style={styles.separator} />

          {/* Agent Model Selector */}
          <Text style={styles.infoText}>Select a model capable of using tools.</Text>
          <ModelSelector
            label="Agent Model"
            items={agentModels}
            selectedId={agentModelName}
            onSelect={setAgentModelName}
          />
        </View>

        {/* Agent Tools Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="build-outline" size={20} color="#475569" style={styles.cardIcon} />
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

                return (
                  <React.Fragment key={tool.agent_id}>
                    {index > 0 && <View style={styles.separator} />}
                    <View style={[styles.toolRow, !isModelSupported && styles.toolRowDisabled]}>
                      <View style={styles.toolInfo}>
                        <Text style={styles.toolName}>{tool.agent_id}</Text>
                        <Text style={styles.toolDescription}>{tool.description}</Text>
                        {!isModelSupported && <Text style={styles.toolSupportText}>Not supported by {selectedAgentModel.name}</Text>}
                      </View>
                      <Switch
                        trackColor={{ false: '#D1D5DB', true: '#A5B4FC' }}
                        thumbColor={isUserEnabled && isModelSupported ? '#6366F1' : '#f4f3f4'}
                        ios_backgroundColor="#D1D5DB"
                        onValueChange={() => toggleTool(tool.agent_id)}
                        value={isUserEnabled}
                        disabled={!isModelSupported}
                      />
                    </View>
                  </React.Fragment>
                );
              })}
            </>
          )}
        </View>

        {/* Agent Prompt Card */}
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

        {/* Danger Zone Card */}
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
  selectorContainer: {
    marginTop: 8,
  },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  selectorButtonText: {
    flex: 1,
    fontSize: 14,
    color: '#334155',
    marginRight: 8,
  },
  modalRoot: { flex: 1, backgroundColor: '#fff' },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalSearchInput: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    paddingHorizontal: 12,
    fontSize: 15,
    color: '#1E293B',
  },
  modalCloseButton: { marginLeft: 8 },
  modalItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  modalItemSelected: {
    backgroundColor: '#EEF2FF',
  },
  modalItemText: {
    fontSize: 15,
    color: '#334155',
  },
  modalItemTextSelected: {
    fontWeight: '600',
    color: '#4338CA',
  },
  toolRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  toolRowDisabled: {
    opacity: 0.5,
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
  toolSupportText: {
    fontSize: 12,
    color: '#DC2626',
    fontStyle: 'italic',
    marginTop: 4,
  },
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
