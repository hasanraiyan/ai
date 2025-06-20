// src/screens/CharacterSelectScreen.js
import React, { useContext, useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  Dimensions,
  Image,
  Modal,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ThreadsContext } from '../contexts/ThreadsContext';
import { CharactersContext } from '../contexts/CharactersContext';
import { useTheme, spacing, typography } from '../utils/theme';
import ScreenHeader from '../components/ScreenHeader';

const { width } = Dimensions.get('window');
const NUM_COLUMNS = 2;
const CARD_MARGIN = spacing.md;
const CARD_WIDTH = (width - spacing.md * 3) / NUM_COLUMNS;

// Enhanced Empty State with better visual hierarchy
const EmptyState = ({ onCreateCharacter }) => {
  const theme = useTheme();
  const styles = getStyles(theme);
  
  return (
    <ScrollView contentContainerStyle={styles.emptyScrollContainer}>
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIllustration}>
          <View style={styles.emptyIconBg}>
            <Ionicons name="people-outline" size={56} color={theme.colors.accent} />
          </View>
          <View style={[styles.emptyIconBg, styles.emptyIconSecondary]}>
            <Ionicons name="add-circle-outline" size={32} color={theme.colors.accent} />
          </View>
        </View>
        
        <View style={styles.emptyContent}>
          <Text style={styles.emptyTitle}>No Characters Yet</Text>
          <Text style={styles.emptySubtitle}>
            Create your first AI character to start having personalized conversations. 
            Each character has their own personality and knowledge.
          </Text>
          
          <TouchableOpacity style={styles.emptyButton} onPress={onCreateCharacter}>
            <Ionicons name="add" size={20} color="#fff" style={styles.emptyButtonIcon} />
            <Text style={styles.emptyButtonText}>Create Your First Character</Text>
          </TouchableOpacity>
          
          <View style={styles.emptyFeatures}>
            <View style={styles.emptyFeature}>
              <Ionicons name="sparkles-outline" size={16} color={theme.colors.accent} />
              <Text style={styles.emptyFeatureText}>Custom personalities</Text>
            </View>
            <View style={styles.emptyFeature}>
              <Ionicons name="chatbubbles-outline" size={16} color={theme.colors.accent} />
              <Text style={styles.emptyFeatureText}>Unique conversations</Text>
            </View>
            <View style={styles.emptyFeature}>
              <Ionicons name="infinite-outline" size={16} color={theme.colors.accent} />
              <Text style={styles.emptyFeatureText}>Unlimited characters</Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

// Enhanced Character Card with better visual design
const CharacterCard = ({ item, onPress, onLongPress }) => {
  const theme = useTheme();
  const styles = getStyles(theme);
  const [imageError, setImageError] = useState(false);

  const hasAvatar = item.avatarUrl && !imageError;
  const initials = item.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.avatarContainer, !hasAvatar && styles.avatarPlaceholder]}>
          {hasAvatar ? (
            <Image
              source={{ uri: item.avatarUrl }}
              style={styles.avatar}
              onError={() => setImageError(true)}
            />
          ) : (
            <Text style={styles.avatarInitials}>{initials}</Text>
          )}
        </View>
        {item.isDefault && (
          <View style={styles.defaultBadge}>
            <Ionicons name="star" size={12} color="#fff" />
          </View>
        )}
      </View>
      
      <View style={styles.cardContent}>
        <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.description} numberOfLines={3}>{item.description}</Text>
      </View>
      
      <View style={styles.cardFooter}>
        <View style={styles.cardAction}>
          <Ionicons name="chatbubble-outline" size={14} color={theme.colors.accent} />
          <Text style={styles.cardActionText}>Chat</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// Enhanced Action Sheet with better animations and design
const ActionSheetModal = ({ visible, onClose, character, onEdit, onDelete }) => {
  const theme = useTheme();
  const styles = getStyles(theme);

  if (!character) return null;
  const isDefault = character.isDefault;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={styles.actionSheet} activeOpacity={1}>
          <View style={styles.actionSheetHandle} />
          
          <View style={styles.modalHeader}>
            <View style={styles.modalCharacterInfo}>
              <Text style={styles.modalTitle}>{character.name}</Text>
              {isDefault && (
                <View style={styles.defaultTag}>
                  <Ionicons name="star" size={12} color={theme.colors.accent} />
                  <Text style={styles.defaultTagText}>Default</Text>
                </View>
              )}
            </View>
          </View>
          
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionBtn, isDefault && styles.actionBtnDisabled]}
              onPress={onEdit}
              disabled={isDefault}
            >
              <View style={styles.actionBtnContent}>
                <View style={[styles.actionIconContainer, { backgroundColor: theme.colors.accent + '20' }]}>
                  <Ionicons name="pencil-outline" size={20} color={isDefault ? theme.colors.subtext : theme.colors.accent} />
                </View>
                <View style={styles.actionTextContainer}>
                  <Text style={[styles.actionText, isDefault && styles.disabledText]}>Edit Character</Text>
                  <Text style={[styles.actionSubtext, isDefault && styles.disabledText]}>
                    {isDefault ? 'Default characters cannot be edited' : 'Modify personality and appearance'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionBtn, isDefault && styles.actionBtnDisabled]}
              onPress={onDelete}
              disabled={isDefault}
            >
              <View style={styles.actionBtnContent}>
                <View style={[styles.actionIconContainer, { backgroundColor: '#EF444420' }]}>
                  <Ionicons name="trash-outline" size={20} color={isDefault ? theme.colors.subtext : '#EF4444'} />
                </View>
                <View style={styles.actionTextContainer}>
                  <Text style={[styles.actionText, styles.destructiveText, isDefault && styles.disabledText]}>Delete Character</Text>
                  <Text style={[styles.actionSubtext, isDefault && styles.disabledText]}>
                    {isDefault ? 'Default characters cannot be deleted' : 'This action cannot be undone'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

export default function CharacterSelectScreen({ navigation }) {
  const { createThread } = useContext(ThreadsContext);
  const { characters, deleteCharacter } = useContext(CharactersContext);
  const theme = useTheme();
  const styles = getStyles(theme);

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState(null);

  const handleSelectCharacter = (character) => {
    const initialMessages = [
        { id: `u-system-${Date.now()}`, text: character.systemPrompt, role: 'user', isHidden: true },
        { id: `a-system-${Date.now()}`, text: character.greeting, role: 'model', characterId: character.id },
    ];
    const newThreadId = createThread(character.name, initialMessages, character.id);
    navigation.navigate('Chat', { threadId: newThreadId, name: character.name });
  };

  const handleLongPress = (character) => {
    setSelectedCharacter(character);
    setModalVisible(true);
  };

  const handleEdit = () => {
    if (!selectedCharacter) return;
    setModalVisible(false);
    navigation.navigate('CharacterEditor', { character: selectedCharacter });
  };

  const handleDelete = () => {
    if (!selectedCharacter) return;
    setModalVisible(false);
    Alert.alert(
      "Delete Character",
      `Are you sure you want to delete "${selectedCharacter.name}"? This action cannot be undone and all conversations with this character will be lost.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => deleteCharacter(selectedCharacter.id) },
      ]
    );
  };

  const renderCharacter = useCallback(({ item }) => (
    <CharacterCard
      item={item}
      onPress={() => handleSelectCharacter(item)}
      onLongPress={() => handleLongPress(item)}
    />
  ), [handleSelectCharacter, handleLongPress]);

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        navigation={navigation}
        title="Characters"
        subtitle={`${characters.length} ${characters.length === 1 ? 'character' : 'characters'} available`}
      />
      
      {characters.length === 0 ? (
        <EmptyState onCreateCharacter={() => navigation.navigate('CharacterEditor')} />
      ) : (
        <FlatList
          data={characters}
          numColumns={NUM_COLUMNS}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.grid}
          renderItem={renderCharacter}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CharacterEditor')}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <ActionSheetModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        character={selectedCharacter}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </SafeAreaView>
  );
}

const getStyles = (theme) => StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: theme.colors.background 
  },
  
  // Grid Layout
  grid: { 
    paddingHorizontal: spacing.md, 
    paddingTop: spacing.sm, 
    paddingBottom: 120 
  },
  row: { 
    justifyContent: 'space-between',
    marginBottom: spacing.md 
  },
  
  // FAB
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.xl,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: theme.colors.accent,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  
  // Character Card Styles
  card: {
    width: CARD_WIDTH,
    backgroundColor: theme.colors.card,
    borderRadius: 20,
    padding: spacing.md,
    shadowColor: theme.colors.text,
    shadowOpacity: theme.isDark ? 0.3 : 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
    borderWidth: theme.isDark ? 1 : 0,
    borderColor: theme.colors.border,
  },
  cardHeader: {
    position: 'relative',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40, // More rounded
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: theme.colors.accent20,
    borderWidth: 2,
    borderColor: theme.colors.card,
  },
  avatarPlaceholder: {
    backgroundColor: theme.colors.emptyBg,
    borderColor: theme.colors.border,
  },
  avatar: { 
    width: '100%', 
    height: '100%' 
  },
  avatarInitials: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.accent,
  },
  defaultBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.card,
  },
  cardContent: {
    flex: 1,
    marginBottom: spacing.sm,
    minHeight: 80, // Ensure cards have a minimum height
  },
  name: { 
    fontSize: typography.h2, 
    fontWeight: '700', 
    color: theme.colors.text, 
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  description: { 
    fontSize: typography.body - 1, 
    color: theme.colors.subtext, 
    lineHeight: 20,
    textAlign: 'center',
  },
  cardFooter: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  cardAction: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.accent,
    marginLeft: spacing.xs,
  },
  
  // Empty State Styles
  emptyScrollContainer: {
    flexGrow: 1,
  },
  emptyContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: spacing.xl 
  },
  emptyIllustration: {
    position: 'relative',
    marginBottom: spacing.xl,
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyIconBg: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.accent20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyIconSecondary: {
    position: 'absolute',
    bottom: -10,
    right: -10,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.card,
    borderWidth: 4,
    borderColor: theme.colors.background,
  },
  emptyContent: {
    alignItems: 'center',
  },
  emptyTitle: { 
    fontSize: typography.h1 + 2, 
    fontWeight: '800', 
    color: theme.colors.text, 
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptySubtitle: { 
    fontSize: typography.body, 
    color: theme.colors.subtext, 
    textAlign: 'center', 
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  emptyButton: {
    flexDirection: 'row',
    backgroundColor: theme.colors.accent,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 30,
    elevation: 4,
    shadowColor: theme.colors.accent,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    marginBottom: spacing.xl,
  },
  emptyButtonIcon: {
    marginRight: spacing.sm,
  },
  emptyButtonText: { 
    color: '#fff', 
    fontSize: typography.body, 
    fontWeight: '700' 
  },
  emptyFeatures: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  emptyFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.emptyBg,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: 12,
    margin: spacing.xs,
  },
  emptyFeatureText: {
    marginLeft: spacing.xs,
    fontSize: typography.small,
    color: theme.colors.subtext,
    fontWeight: '500',
  },

  // Action Sheet Modal Styles
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.4)', 
    justifyContent: 'flex-end' 
  },
  actionSheet: {
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  actionSheetHandle: {
    width: 40,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: theme.colors.border,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalCharacterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitle: { 
    fontSize: 20, 
    fontWeight: '700', 
    color: theme.colors.text,
  },
  defaultTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.accent + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    marginLeft: spacing.sm,
  },
  defaultTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.accent,
    marginLeft: spacing.xs,
  },
  actionButtons: {
    marginBottom: spacing.md,
  },
  actionBtn: {
    backgroundColor: theme.colors.emptyBg,
    borderRadius: 16,
    marginBottom: spacing.sm,
  },
  actionBtnDisabled: {
    opacity: 0.6,
  },
  actionBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  actionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionText: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: theme.colors.text 
  },
  actionSubtext: {
    fontSize: 13,
    color: theme.colors.subtext,
    marginTop: 2,
  },
  disabledText: { 
    color: theme.colors.subtext 
  },
  destructiveText: { 
    color: '#EF4444' 
  },
  cancelBtn: {
    backgroundColor: theme.colors.emptyBg,
    borderRadius: 16,
    padding: spacing.md,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
});