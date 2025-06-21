// src/components/LanguageSelector.js
import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  FlatList,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supportedLanguages } from '../constants/languages';
import { useTheme, spacing, typography } from '../utils/theme';

const LanguageSelectorModal = ({ isVisible, onClose, onSelect, currentLang }) => {
  const { colors } = useTheme();
  const styles = useStyles({ colors });

  return (
    <Modal visible={isVisible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={[styles.modalContainer, { backgroundColor: colors.card }]}>
          <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
          <Text style={[styles.modalTitle, { color: colors.text }]}>Select Language</Text>
          <FlatList
            data={supportedLanguages}
            keyExtractor={(item) => item.code}
            renderItem={({ item }) => {
              const isSelected = item.code === currentLang;
              return (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    { borderBottomColor: colors.border },
                    isSelected && { backgroundColor: colors.accent20 },
                  ]}
                  onPress={() => onSelect(item.code)}
                >
                  <Text style={[styles.modalItemText, { color: isSelected ? colors.accent : colors.text }]}>
                    {item.name}
                  </Text>
                  {isSelected && <Ionicons name="checkmark-circle" size={24} color={colors.accent} />}
                </TouchableOpacity>
              );
            }}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default function LanguageSelector({ langCode, onSelect, disabled }) {
  const { colors } = useTheme();
  const styles = useStyles({ colors });
  const [modalVisible, setModalVisible] = useState(false);
  const lang = supportedLanguages.find((l) => l.code === langCode);

  const handleSelect = (code) => {
    onSelect(code);
    setModalVisible(false);
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.langSelectorBtn, { backgroundColor: colors.input, borderColor: colors.border }, disabled && styles.disabled]}
        onPress={() => setModalVisible(true)}
        disabled={disabled}
      >
        <Text style={[styles.langSelectorText, { color: colors.text }]} numberOfLines={1}>{lang?.name || 'Select'}</Text>
        <Ionicons name="chevron-down" size={16} color={colors.subtext} />
      </TouchableOpacity>
      <LanguageSelectorModal
        isVisible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSelect={handleSelect}
        currentLang={langCode}
      />
    </>
  );
}

const useStyles = ({ colors }) => StyleSheet.create({
  disabled: { opacity: 0.5 },
  langSelectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: 12,
    borderWidth: 1,
  },
  langSelectorText: {
    ...typography.body,
    fontWeight: '600',
    flex: 1,
    marginRight: spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    maxHeight: '80%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: spacing.xl,
  },
  modalHandle: {
    width: 40,
    height: 5,
    borderRadius: 2.5,
    alignSelf: 'center',
    marginVertical: spacing.md,
  },
  modalTitle: {
    ...typography.h2,
    fontWeight: '700',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  modalItemText: {
    ...typography.h4,
  },
});