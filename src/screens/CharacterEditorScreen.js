// src/screens/CharacterEditorScreen.js
import React, { useState, useContext, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CharactersContext } from '../contexts/CharactersContext';
import { useTheme, spacing, typography } from '../utils/theme';

// Enhanced InputField with focus state and helper text for better UX
const InputField = ({ label, value, onChangeText, placeholder, multiline = false, lines = 1, isRequired = false, helperText }) => {
  const theme = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const styles = getStyles(theme);

  const inputStyle = [
    styles.input,
    multiline && { height: 24 * lines, textAlignVertical: 'top', paddingTop: spacing.md },
    isFocused && styles.inputFocused,
  ];

  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>
        {label} {isRequired && <Text style={{ color: theme.colors.accent }}>*</Text>}
      </Text>
      <TextInput
        style={inputStyle}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.subtext}
        multiline={multiline}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />
      {helperText && <Text style={styles.helperText}>{helperText}</Text>}
    </View>
  );
};

// A new component to visually represent the avatar
const AvatarPicker = ({ avatarUrl }) => {
    const theme = useTheme();
    const styles = getStyles(theme);

    return (
        <View style={styles.avatarContainer}>
            {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
            ) : (
                <View style={styles.avatarPlaceholder}>
                    <Ionicons name="camera-outline" size={32} color={theme.colors.emptyIcon} />
                </View>
            )}
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

  const handleSave = useCallback(() => {
    if (!name.trim() || !systemPrompt.trim() || !greeting.trim()) {
      Alert.alert('Missing Required Fields', 'Please fill in Name, System Prompt, and Greeting.');
      return;
    }

    const characterData = {
      id: character?.id,
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
  }, [name, description, avatarUrl, systemPrompt, greeting, navigation]);


  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
        {/* Consolidated Header */}
        <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
                <Ionicons name="close-outline" size={28} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{isEditMode ? 'Edit Character' : 'Create Character'}</Text>
            <TouchableOpacity onPress={handleSave} style={[styles.headerButton, styles.saveButton]}>
                <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
            <AvatarPicker avatarUrl={avatarUrl} />

            <InputField
                label="Avatar URL"
                value={avatarUrl}
                onChangeText={setAvatarUrl}
                placeholder="https://example.com/avatar.png"
                helperText="Paste a URL to an image for your character."
            />
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
                helperText="Appears under the character's name in lists."
            />

            <View style={styles.divider} />

            <InputField
                label="System Prompt"
                value={systemPrompt}
                onChangeText={setSystemPrompt}
                placeholder="Define the character's personality and rules..."
                multiline
                lines={8}
                isRequired
                helperText="The core instructions that define the character's personality, backstory, and rules of engagement."
            />
            <InputField
                label="Greeting"
                value={greeting}
                onChangeText={setGreeting}
                placeholder="The first message this character will send."
                multiline
                lines={3}
                isRequired
                helperText="The very first message the character will send in a new conversation."
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.headerBorder,
    backgroundColor: theme.colors.headerBg
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  headerButton: {
    padding: spacing.sm,
  },
  saveButton: {
    backgroundColor: theme.colors.accent,
    borderRadius: 8, // Hardcoded radius
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF', // Always white for contrast
  },
  scrollContainer: {
    padding: spacing.lg,
    paddingBottom: 48, // Extra padding at the bottom
  },
  // --- Avatar Styles ---
  avatarContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50, // Hardcoded for a circle
    backgroundColor: theme.colors.imagePlaceholder,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50, // Hardcoded for a circle
    backgroundColor: theme.colors.emptyBg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  // --- Form Styles ---
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
    borderRadius: 8, // Hardcoded radius
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.body,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  inputFocused: {
    borderColor: theme.colors.accent, // Use existing accent color for focus
    shadowColor: theme.colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  helperText: {
    fontSize: typography.small,
    color: theme.colors.subtext,
    marginTop: spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: spacing.lg,
  }
});