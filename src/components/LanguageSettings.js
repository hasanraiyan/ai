import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LanguageSelector from '../components/LanguageSelector';

export default function LanguageSettings({
  sourceLangCode,
  targetLangCode,
  onSwap,
  onSelectSource,
  onSelectTarget,
  disabled,
}) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.col}>
          <Text style={styles.label}>From</Text>
          <LanguageSelector selected={sourceLangCode} onSelect={onSelectSource} disabled={disabled} />
        </View>

        <TouchableOpacity
          style={[styles.swapButton, disabled && styles.disabled]}
          onPress={onSwap}
          disabled={disabled}
        >
          <Ionicons name="swap-horizontal" size={24} color="#1D4ED8" />
        </TouchableOpacity>

        <View style={styles.col}>
          <Text style={styles.label}>To</Text>
          <LanguageSelector selected={targetLangCode} onSelect={onSelectTarget} disabled={disabled} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  col: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  swapButton: {
    marginHorizontal: 8,
    backgroundColor: '#EFF6FF',
    padding: 8,
    borderRadius: 20,
  },
  disabled: {
    opacity: 0.5,
  },
});
