// src/navigation/CustomDrawerContent.js
import React from 'react';
import {
  Text,
  View,
  Pressable,
  StyleSheet,
} from 'react-native';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../utils/theme';

const DrawerItem = ({ label, icon, activeIcon, isActive, onPress }) => {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [ styles.drawerItem, isActive && styles.drawerItemActive, pressed && styles.drawerItemPressed ]}
      android_ripple={{ color: colors.accent20 }}
    >
      <View style={[styles.activeIndicator, isActive && styles.activeIndicatorVisible]} />
      <Ionicons
        name={isActive ? activeIcon : icon}
        size={22}
        color={isActive ? styles.drawerTextActive.color : styles.drawerIcon.color}
        style={styles.drawerIcon}
      />
      <Text style={[styles.drawerText, isActive && styles.drawerTextActive]}>{label}</Text>
    </Pressable>
  );
};

function CustomDrawerContent(props) {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const activeRouteName = props.state.routes[props.state.index].name;

  const navigateToScreen = screenName => {
    props.navigation.closeDrawer();
    props.navigation.navigate(screenName);
  };

  const menuItems = [
    { name: 'Threads', label: 'Dashboard', icon: 'grid-outline', activeIcon: 'grid' },
    { name: 'Characters', label: 'Characters', icon: 'people-outline', activeIcon: 'people' },
    { name: 'Finance', label: 'Finance', icon: 'wallet-outline', activeIcon: 'wallet' },
    { name: 'LanguageTutor', label: 'Language Tutor', icon: 'chatbubble-ellipses-outline', activeIcon: 'chatbubble-ellipses' },
    { name: 'ImageGeneration', label: 'Generate Image', icon: 'image-outline', activeIcon: 'image' },
    { name: 'Gallery', label: 'Gallery', icon: 'images-outline', activeIcon: 'images' },
    { name: 'Settings', label: 'Settings', icon: 'settings-outline', activeIcon: 'settings' },
  ];

  return (
    <View style={styles.drawerContainer}>
      <View style={styles.headerContainer}>
        <Ionicons name="sparkles-sharp" size={32} color={colors.accent} style={styles.headerLogo} />
        <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>AI Assistant</Text>
        </View>
      </View>
      <DrawerContentScrollView {...props} style={styles.scrollContainer}>
        <View style={styles.menuSection}>
          {menuItems.map(item => (
            <DrawerItem
              key={item.name}
              label={item.label}
              icon={item.icon}
              activeIcon={item.activeIcon}
              isActive={activeRouteName === item.name}
              onPress={() => navigateToScreen(item.name)}
            />
          ))}
        </View>
      </DrawerContentScrollView>
      <View style={styles.footerContainer}>
         <DrawerItem
            label="Help & Feedback"
            icon="help-circle-outline"
            activeIcon="help-circle"
            isActive={false}
            onPress={() => { props.navigation.closeDrawer(); /* Implement help action */ }}
        />
        <Text style={styles.appVersionText}>Version 1.0.0</Text>
      </View>
    </View>
  );
}

const useStyles = (colors) => StyleSheet.create({
  drawerContainer: { flex: 1, backgroundColor: colors.background },
  scrollContainer: { flex: 1 },
  headerContainer: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 24,
    borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.background,
  },
  headerLogo: { marginRight: 15 },
  headerTextContainer: { flexDirection: 'column' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text },
  menuSection: { paddingTop: 10 },
  drawerItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20,
    marginHorizontal: 12, borderRadius: 8, marginBottom: 4, overflow: 'hidden',
  },
  drawerItemActive: { backgroundColor: colors.accent20 },
  drawerItemPressed: { backgroundColor: colors.accent20 },
  drawerIcon: { marginRight: 20, width: 24, textAlign: 'center', color: colors.subtext },
  drawerText: { fontSize: 15, color: colors.subtext, fontWeight: '500' },
  drawerTextActive: { color: colors.accent, fontWeight: '700' },
  activeIndicator: {
    position: 'absolute', left: 0, top: '20%', bottom: '20%', width: 4,
    backgroundColor: colors.accent, borderTopRightRadius: 4, borderBottomRightRadius: 4, opacity: 0,
  },
  activeIndicatorVisible: { opacity: 1 },
  footerContainer: {
    paddingBottom: 20, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border,
  },
  appVersionText: { textAlign: 'center', color: colors.subtext, fontSize: 12, marginTop: 10, },
});

export default CustomDrawerContent;