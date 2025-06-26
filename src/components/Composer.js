// src/components/Composer.js
import React from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, spacing, typography } from '../utils/theme';

export default function Composer({
  value,
  onValueChange,
  onSend,
  placeholder = "Type something...",
  loading = false,
}) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { colors } = theme;

  const canSend = value.trim().length > 0 && !loading;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardAvoidingView}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 60} 
    >
      <View style={styles.composerContainer}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.promptInput}
          placeholder={placeholder}
          placeholderTextColor={colors.subtext}
          multiline
          value={value}
          onChangeText={onValueChange}
          editable={!loading}
        />
        <TouchableOpacity
          style={[styles.generateBtn, !canSend && styles.generateBtnDisabled]}
          onPress={onSend}
          disabled={!canSend}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Ionicons name="arrow-up" size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </View>
    </KeyboardAvoidingView>
  );
}

const getStyles = (theme) =>
  StyleSheet.create({
    keyboardAvoidingView: {
      // Styles for KeyboardAvoidingView itself, if needed
      // For example, if it needs to flex or have specific layout properties
      // By default, it might not need specific styles if it's just a wrapper
    },
    composerContainer: {
      padding: spacing.md,
      backgroundColor: theme.colors.background,
      borderTopWidth: 1,
      borderColor: theme.colors.border,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      backgroundColor: theme.colors.card,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingLeft: spacing.md,
      paddingRight: spacing.xs,
      paddingVertical: spacing.xs,
    },
    promptInput: {
      flex: 1,
      fontSize: typography.body,
      color: theme.colors.text,
      minHeight: 40,
      maxHeight: 120,
      paddingVertical: Platform.OS === 'ios' ? spacing.sm : 0,
    },
    generateBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.accent,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: spacing.sm,
    },
    generateBtnDisabled: {
      backgroundColor: theme.colors.subtext,
      opacity: 0.6,
    },
  });