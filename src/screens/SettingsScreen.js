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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { gemmaModels } from '../constants/models';
import { SettingsContext } from '../contexts/SettingsContext';
import { ThreadsContext } from '../contexts/ThreadsContext';

function SettingsScreen({ navigation }) {
  const { modelName, setModelName, titleModelName, setTitleModelName, systemPrompt, setSystemPrompt, agentSystemPrompt, setAgentSystemPrompt, apiKey, setApiKey } = useContext(SettingsContext);
  const { clearAllThreads } = useContext(ThreadsContext);
  const models = gemmaModels;
  const [showApiKey, setShowApiKey] = useState(false);

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.settingsHeader}>
        <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.headerIconButton}>
          <Ionicons name="menu-outline" size={26} color="#475569" />
        </TouchableOpacity>
        <Text style={styles.settingsTitle}>Settings</Text>
      </View>
      <ScrollView contentContainerStyle={styles.settingsScrollView}>
        <View style={styles.settingsCard}>
          <View style={styles.settingsCardHeader}>
            <Ionicons name="chatbubble-ellipses-outline" size={22} color="#6366F1" style={styles.settingsCardIcon} />
            <Text style={styles.settingsCardTitle}>Chat Instruction</Text>
          </View>
          <TextInput
            style={styles.systemInstructionInput}
            value={systemPrompt}
            onChangeText={setSystemPrompt}
            placeholder="Define the AI's persona and behavior..."
            placeholderTextColor="#9CA3AF"
            multiline
            textAlignVertical="top"
          />
          <Text style={styles.settingsCharCount}>{systemPrompt.length} characters</Text>
        </View>
        <View style={styles.settingsCard}>
          <View style={styles.settingsCardHeader}>
            <Ionicons name="construct-outline" size={22} color="#6366F1" style={styles.settingsCardIcon} />
            <Text style={styles.settingsCardTitle}>Agent Instruction</Text>
          </View>
          <TextInput
            style={styles.systemInstructionInput}
            value={agentSystemPrompt}
            onChangeText={setAgentSystemPrompt}
            placeholder="Define the Agent's persona and behavior..."
            placeholderTextColor="#9CA3AF"
            multiline
            textAlignVertical="top"
          />
          <Text style={styles.settingsCharCount}>{agentSystemPrompt.length} characters</Text>
        </View>
        <View style={styles.settingsCard}>
          <View style={styles.settingsCardHeader}>
            <Ionicons name="hardware-chip-outline" size={22} color="#6366F1" style={styles.settingsCardIcon} />
            <Text style={styles.settingsCardTitle}>Language Model</Text>
          </View>
          {models.map(m => {
            const isSelected = modelName === m;
            return (
              <Pressable
                key={m}
                style={({ pressed }) => [
                  styles.modelOptionItem,
                  isSelected && styles.modelOptionItemSelected,
                  pressed && styles.modelOptionItemPressed,
                ]}
                onPress={() => setModelName(m)}
                android_ripple={{ color: styles.modelOptionItemSelected.backgroundColor || '#E0E0E0' }}
              >
                <Text style={[styles.modelOptionText, isSelected && styles.modelOptionTextSelected]}>{m}</Text>
                {isSelected && <Ionicons name="checkmark-circle" size={22} color="#6366F1" />}
              </Pressable>
            );
          })}
        </View>
        <View style={styles.settingsCard}>
          <View style={styles.settingsCardHeader}>
            <Ionicons name="document-text-outline" size={22} color="#6366F1" style={styles.settingsCardIcon} />
            <Text style={styles.settingsCardTitle}>Title Generation Model</Text>
          </View>
          {gemmaModels.map(m => {
            const isSelected = titleModelName === m;
            return (
              <Pressable
                key={m}
                style={({ pressed }) => [
                  styles.modelOptionItem,
                  isSelected && styles.modelOptionItemSelected,
                  pressed && styles.modelOptionItemPressed,
                ]}
                onPress={() => setTitleModelName(m)}
                android_ripple={{ color: styles.modelOptionItemSelected.backgroundColor || '#E0E0E0' }}
              >
                <Text style={[styles.modelOptionText, isSelected && styles.modelOptionTextSelected]}>{m}</Text>
                {isSelected && <Ionicons name="checkmark-circle" size={22} color="#6366F1" />}
              </Pressable>
            );
          })}
        </View>
        <View style={styles.settingsCard}>
          <View style={styles.settingsCardHeader}>
            <Ionicons name="key-outline" size={22} color="#6366F1" style={styles.settingsCardIcon} />
            <Text style={styles.settingsCardTitle}>API Key</Text>
          </View>
          <View style={styles.apiKeyInputContainer}>
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
            <TouchableOpacity onPress={() => setShowApiKey(!showApiKey)} style={styles.showHideButton}>
              <Ionicons name={showApiKey ? "eye-off-outline" : "eye-outline"} size={24} color="#64748B" />
            </TouchableOpacity>
          </View>
          <Text style={styles.settingsInfoTextSmall}>Your API key is stored locally and never shared.</Text>
        </View>
        <View style={styles.settingsCard}>
          <View style={styles.settingsCardHeader}>
            <Ionicons name="trash-outline" size={22} color="#DC2626" style={styles.settingsCardIcon} />
            <Text style={[styles.settingsCardTitle, { color: '#DC2626' }]}>Danger Zone</Text>
          </View>
          <TouchableOpacity
            style={styles.dangerButton}
            onPress={() => {
              Alert.alert(
                "Clear All Chat History?",
                "This will permanently delete all your conversations. This action cannot be undone.",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Clear History",
                    style: "destructive",
                    onPress: () => clearAllThreads(),
                  },
                ]
              );
            }}>
            <Text style={styles.dangerButtonText}>Clear All Chat History</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  headerIconButton: { padding: 8 },
  settingsHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderColor: '#F1F5F9', backgroundColor: '#fff' },
  settingsTitle: { fontSize: 20, fontWeight: 'bold', color: '#1E293B', marginLeft: 16 },
  settingsScrollView: { paddingVertical: 16, paddingHorizontal: 16 },
  settingsCard: { backgroundColor: '#fff', borderRadius: 8, padding: 16, marginBottom: 16, ...Platform.select({ android: { elevation: 2 }, ios: { shadowColor: '#000', shadowOpacity: 0.1, shadowOffset: { width: 0, height: 1 }, shadowRadius: 2 } }) },
  settingsCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  settingsCardIcon: { marginRight: 10 },
  settingsCardTitle: { fontSize: 17, fontWeight: '600', color: '#1E293B' },
  systemInstructionInput: { backgroundColor: '#F1F5F9', borderRadius: 6, padding: 12, minHeight: 100, textAlignVertical: 'top', color: '#1E293B', fontSize: 15, lineHeight: 20 },
  settingsCharCount: { textAlign: 'right', fontSize: 12, color: '#64748B', marginTop: 8 },
  modelOptionItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 12, backgroundColor: '#F8FAFC', borderRadius: 6, marginBottom: 8 },
  modelOptionItemSelected: { backgroundColor: '#EEF2FF' },
  modelOptionItemPressed: { backgroundColor: '#E0E7FF' },
  modelOptionText: { fontSize: 15, color: '#334155' },
  modelOptionTextSelected: { fontWeight: '600', color: '#1E293B' },
  apiKeyInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 6, paddingHorizontal: 12 },
  apiKeyInput: { flex: 1, paddingVertical: 12, color: '#1E293B', fontSize: 15 },
  showHideButton: { padding: 8, marginLeft: 8 },
  settingsInfoTextSmall: { fontSize: 12, color: '#64748B', marginTop: 8 },
  dangerButton: { backgroundColor: '#FEE2E2', borderRadius: 6, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center' },
  dangerButtonText: { color: '#DC2626', fontSize: 15, fontWeight: '600' },
});

export default SettingsScreen;