// src/screens/CharacterEditorScreen.js
import React, { useState, useContext, useLayoutEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CharactersContext } from '../contexts/CharactersContext';
import { useTheme, spacing, typography } from '../utils/theme';

const InputField = ({ label, value, onChangeText, placeholder, multiline = false, lines = 1, isRequired = false }) => {
  const theme = useTheme();
  const styles = getStyles(theme);

  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>
        {label} {isRequired && <Text style={{ color: theme.colors.accent }}>*</Text>}
      </Text>
      <TextInput
        style={[styles.input, multiline && { height: 40 * lines, textAlignVertical: 'top' }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.subtext}
        multiline={multiline}
      />
    </View>
  );
};

export default function CharacterEditorScreen({ navigation, route }) {
  const { character } = route.params || {};
  const isEditMode = !!character;

  const { createCharacter, updateCharacter } = useContext(CharactersContext);
  const theme = useTheme();
  const styles = getStyles(theme);

  const [name, setName] = useState(character?.name || '');
  const [description, setDescription] = useState(character?.description || '');
  const [avatarUrl, setAvatarUrl] = useState(character?.avatarUrl || '');
  const [systemPrompt, setSystemPrompt] = useState(character?.systemPrompt || '');
  const [greeting, setGreeting] = useState(character?.greeting || '');

  const handleSave = () => {
    if (!name.trim() || !systemPrompt.trim() || !greeting.trim()) {
      Alert.alert('Missing Required Fields', 'Please fill in Name, System Prompt, and Greeting.');
      return;
    }

    const characterData = {
      id: character?.id, // Will be undefined in create mode
      name: name.trim(),
      description: description.trim(),
      avatarUrl: avatarUrl.trim(),
      systemPrompt: systemPrompt.trim(),
      greeting: greeting.trim(),
    };

    if (isEditMode) {
      updateCharacter(characterData);
    } else {
      createCharacter(characterData);
    }
    navigation.goBack();
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={handleSave} style={{ marginRight: spacing.md }}>
          <Text style={{ color: theme.colors.accent, fontSize: 16, fontWeight: '600' }}>Save</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, handleSave]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={styles.title}>{isEditMode ? 'Edit Character' : 'Create Character'}</Text>
        </View>

        <InputField
          label="Character Name"
          value={name}
          onChangeText={setName}
          placeholder="e.g., Captain Eva"
          isRequired
        />
        <InputField
          label="Description"
          value={description}
          onChangeText={setDescription}
          placeholder="A short, one-line description"
          multiline
          lines={2}
        />
        <InputField
          label="Avatar URL"
          value={avatarUrl}
          onChangeText={setAvatarUrl}
          placeholder="https://example.com/avatar.png"
        />
        <InputField
          label="System Prompt"
          value={systemPrompt}
          onChangeText={setSystemPrompt}
          placeholder="Define the character's personality and rules..."
          multiline
          lines={8}
          isRequired
        />
        <InputField
          label="Greeting"
          value={greeting}
          onChangeText={setGreeting}
          placeholder="The first message this character will send."
          multiline
          lines={3}
          isRequired
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContainer: {
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  backButton: {
    padding: spacing.xs,
  },
  title: {
    fontSize: typography.h1,
    fontWeight: '700',
    color: theme.colors.text,
    marginLeft: spacing.md,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: typography.h2,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: theme.colors.card,
    borderRadius: 8,
    padding: spacing.sm + spacing.xs,
    fontSize: typography.body,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
});