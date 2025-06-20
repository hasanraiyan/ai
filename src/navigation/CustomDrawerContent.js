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

const DrawerItem = ({ label, icon, activeIcon, isActive, onPress }) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [ styles.drawerItem, isActive && styles.drawerItemActive, pressed && styles.drawerItemPressed ]}
    android_ripple={{ color: '#E0E7FF' }}
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

function CustomDrawerContent(props) {
  const activeRouteName = props.state.routes[props.state.index].name;

  const navigateToScreen = screenName => {
    props.navigation.closeDrawer();
    props.navigation.navigate(screenName);
  };

  const menuItems = [
    { name: 'Threads', label: 'Dashboard', icon: 'grid-outline', activeIcon: 'grid' },
    { name: 'Characters', label: 'Characters', icon: 'people-outline', activeIcon: 'people' },
    { name: 'ImageGeneration', label: 'Generate Image', icon: 'image-outline', activeIcon: 'image' },
    { name: 'Gallery', label: 'Gallery', icon: 'images-outline', activeIcon: 'images' },
    { name: 'Settings', label: 'Settings', icon: 'settings-outline', activeIcon: 'settings' },
  ];

  return (
    <View style={styles.drawerContainer}>
      <View style={styles.headerContainer}>
        <Ionicons name="sparkles-sharp" size={32} color="#6366F1" style={styles.headerLogo} />
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

const styles = StyleSheet.create({
  drawerContainer: { flex: 1, backgroundColor: '#fff' },
  scrollContainer: { flex: 1 },
  headerContainer: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 24,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9', backgroundColor: '#fff',
  },
  headerLogo: { marginRight: 15 },
  headerTextContainer: { flexDirection: 'column' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
  menuSection: { paddingTop: 10 },
  drawerItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20,
    marginHorizontal: 12, borderRadius: 8, marginBottom: 4, overflow: 'hidden',
  },
  drawerItemActive: { backgroundColor: '#EEF2FF' },
  drawerItemPressed: { backgroundColor: '#E0E7FF' },
  drawerIcon: { marginRight: 20, width: 24, textAlign: 'center', color: '#475569' },
  drawerText: { fontSize: 15, color: '#334155', fontWeight: '500' },
  drawerTextActive: { color: '#6366F1', fontWeight: '700' },
  activeIndicator: {
    position: 'absolute', left: 0, top: '20%', bottom: '20%', width: 4,
    backgroundColor: '#6366F1', borderTopRightRadius: 4, borderBottomRightRadius: 4, opacity: 0,
  },
  activeIndicatorVisible: { opacity: 1 },
  footerContainer: {
    paddingBottom: 20, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9',
  },
  appVersionText: { textAlign: 'center', color: '#94A3B8', fontSize: 12, marginTop: 10, },
});

export default CustomDrawerContent;