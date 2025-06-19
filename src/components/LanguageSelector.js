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
  Dimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supportedLanguages } from '../constants/languages';

const { width, height } = Dimensions.get('window');

export default function LanguageSelector({ selected, onSelect, disabled = false }) {
  const [modalVisible, setModalVisible] = useState(false);
  const selectedLanguage = supportedLanguages.find(lang => lang.code === selected) || supportedLanguages[0];

  const handleLanguageSelect = (languageCode) => {
    onSelect(languageCode);
    setModalVisible(false);
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.selectorButton, disabled && styles.disabled]}
        onPress={() => setModalVisible(true)}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <View style={styles.selectorContent}>
          <View style={styles.languageInfo}>
            {/* <Ionicons name="globe-outline" size={20} color="#64748B" style={styles.globeIcon} /> */}
            <Text style={styles.selectorButtonText}>{selectedLanguage.name}</Text>
          </View>
          <Ionicons 
            name="chevron-down-outline" 
            size={18} 
            color="#64748B" 
            style={[styles.chevronIcon, modalVisible && styles.chevronRotated]} 
          />
        </View>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="fade"
        transparent={true}
        statusBarTranslucent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <StatusBar backgroundColor="rgba(0,0,0,0.5)" barStyle="light-content" />
          <Pressable 
            style={styles.modalBackdrop} 
            onPress={() => setModalVisible(false)}
          />
          
          <View style={styles.modalContainer}>
            <View style={styles.modalHandle} />
            
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Language</Text>
              <Text style={styles.modalSubtitle}>
                Choose your preferred language
              </Text>
            </View>

            <FlatList
              data={supportedLanguages}
              keyExtractor={item => item.code}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContainer}
              renderItem={({ item, index }) => {
                const isSelected = item.code === selected;
                const isLast = index === supportedLanguages.length - 1;
                
                return (
                  <Pressable
                    onPress={() => handleLanguageSelect(item.code)}
                    style={({ pressed }) => [
                      styles.modalItem,
                      isSelected && styles.modalItemSelected,
                      pressed && styles.modalItemPressed,
                      isLast && styles.lastItem
                    ]}
                    android_ripple={{ color: '#F1F5F9' }}
                  >
                    <View style={styles.modalItemContent}>
                      <View style={styles.languageItemInfo}>
                        <Text style={[
                          styles.modalItemText, 
                          isSelected && styles.modalItemTextSelected
                        ]}>
                          {item.name}
                        </Text>
                        {item.nativeName && item.nativeName !== item.name && (
                          <Text style={styles.nativeNameText}>
                            {item.nativeName}
                          </Text>
                        )}
                      </View>
                      
                      {isSelected && (
                        <View style={styles.checkmarkContainer}>
                          <Ionicons 
                            name="checkmark-circle" 
                            size={24} 
                            color="#3B82F6" 
                          />
                        </View>
                      )}
                    </View>
                  </Pressable>
                );
              }}
            />

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.closeButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  selectorButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  selectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  languageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  globeIcon: {
    marginRight: 10,
  },
  selectorButtonText: {
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '600',
    flex: 1,
  },
  chevronIcon: {
    marginLeft: 8,
    transform: [{ rotate: '0deg' }],
  },
  chevronRotated: {
    transform: [{ rotate: '180deg' }],
  },
  disabled: {
    opacity: 0.5,
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.8,
    paddingBottom: 20,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#CBD5E1',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  modalHeader: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '400',
  },
  
  listContainer: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  modalItem: {
    borderRadius: 12,
    marginVertical: 2,
    overflow: 'hidden',
  },
  modalItemSelected: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  modalItemPressed: {
    backgroundColor: '#F8FAFC',
  },
  modalItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  languageItemInfo: {
    flex: 1,
  },
  modalItemText: {
    fontSize: 16,
    color: '#334155',
    fontWeight: '500',
    marginBottom: 2,
  },
  modalItemTextSelected: {
    color: '#1D4ED8',
    fontWeight: '600',
  },
  nativeNameText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '400',
  },
  checkmarkContainer: {
    marginLeft: 12,
  },
  lastItem: {
    marginBottom: 8,
  },
  
  modalFooter: {
    paddingHorizontal: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  closeButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});