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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { SettingsContext } from '../contexts/SettingsContext';
import { styles } from '../styles/globalStyles';

function SettingsScreen({ navigation }) {
  const { modelName, setModelName, systemPrompt, setSystemPrompt, apiKey, setApiKey } = useContext(SettingsContext);
  const models = ['gemma-3-1b-it', 'gemma-3n-e4b-it', 'gemma-3-4b-it', 'gemma-3-12b-it', 'gemma-3-27b-it'];
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
            <Ionicons name="options-outline" size={22} color="#6366F1" style={styles.settingsCardIcon} />
            <Text style={styles.settingsCardTitle}>System Instruction</Text>
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
      </ScrollView>
    </SafeAreaView>
  );
}

export default SettingsScreen;