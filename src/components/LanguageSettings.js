// src/components/LanguageSettings.js
import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LanguageSelector from './LanguageSelector';
import { useTheme, spacing, typography } from '../utils/theme';

export default function LanguageSettings({
  sourceLangCode,
  targetLangCode,
  onSwap,
  onSelectSource,
  onSelectTarget,
  disabled,
}) {
  const { colors } = useTheme();
  const styles = useStyles({ colors });

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.col}>
        <Text style={[styles.label, { color: colors.subtext }]}>From</Text>
        <LanguageSelector langCode={sourceLangCode} onSelect={onSelectSource} disabled={disabled} />
      </View>
      <TouchableOpacity style={styles.swapButton} onPress={onSwap} disabled={disabled}>
        <Ionicons name="swap-horizontal" size={24} color={colors.accent} />
      </TouchableOpacity>
      <View style={styles.col}>
        <Text style={[styles.label, { color: colors.subtext }]}>To</Text>
        <LanguageSelector langCode={targetLangCode} onSelect={onSelectTarget} disabled={disabled} />
      </View>
    </View>
  );
}

const useStyles = ({ colors }) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    gap: spacing.sm,
  },
  col: {
    flex: 1,
    gap: spacing.xs,
  },
  label: {
    ...typography.small,
    fontWeight: '600',
    paddingHorizontal: spacing.xs,
  },
  swapButton: {
    padding: spacing.sm,
    marginBottom: spacing.xs, // Aligns button with the bottom of the selector
  },
});