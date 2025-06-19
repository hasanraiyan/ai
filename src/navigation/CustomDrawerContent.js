import React from 'react';
import {
  Text,
  View,
  Pressable,
  StyleSheet,
} from 'react-native';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';

function CustomDrawerContent(props) {
  const activeRouteName = props.state.routes[props.state.index].name;
  const navigateToScreen = screenName => {
    props.navigation.closeDrawer();
    props.navigation.navigate(screenName);
  };
  const menuItems = [
    { name: 'Threads', label: 'Threads', icon: 'chatbubbles-outline', activeIcon: 'chatbubbles', action: () => navigateToScreen('Threads') },
    { name: 'Gallery', label: 'Gallery', icon: 'images-outline', activeIcon: 'images', action: () => navigateToScreen('Gallery') },
    { name: 'Settings', label: 'Settings', icon: 'settings-outline', activeIcon: 'settings', action: () => navigateToScreen('Settings') },

  ];
  const footerItems = [{ name: 'Help', label: 'Help & Feedback', icon: 'help-circle-outline', action: () => { props.navigation.closeDrawer(); } }];
  const renderDrawerItem = (item, index, isFooter = false) => {
    const isActive = !isFooter && activeRouteName === item.name;
    return (
      <Pressable
        key={item.name || index}
        style={({ pressed }) => [styles.drawerItem, isActive && styles.drawerItemActive, pressed && styles.drawerItemPressed]}
        onPress={item.action}
        android_ripple={{ color: styles.drawerItemActive.backgroundColor || '#E0E0E0' }}
      >
        <Ionicons
          name={isActive ? item.activeIcon : item.icon}
          size={22}
          color={isActive ? styles.drawerTextActive.color : (isFooter ? styles.drawerFooterIcon.color : styles.drawerIcon.color)}
          style={isFooter ? styles.drawerFooterIcon : styles.drawerIcon}
        />
        <Text style={[styles.drawerText, isActive && styles.drawerTextActive, isFooter && styles.drawerFooterText]}>
          {item.label}
        </Text>
      </Pressable>
    );
  };
  return (
    <DrawerContentScrollView {...props} contentContainerStyle={styles.drawerContentContainer}>
      <View style={styles.drawerHeaderContainer}>
        <Ionicons name="sparkles-sharp" size={32} color="#6366F1" style={styles.drawerLogo} />
        <Text style={styles.drawerHeaderText}>AI Assistant</Text>
      </View>
      <View style={styles.drawerSection}>
        {menuItems.map((item, i) => renderDrawerItem(item, i))}
      </View>
      <View style={styles.drawerSeparator} />
      <View style={styles.drawerSection}>
        {footerItems.map((item, i) => renderDrawerItem(item, i, true))}
      </View>
      <Text style={styles.appVersionText}>Version 1.0.0</Text>
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  drawerContentContainer: { flex: 1, backgroundColor: '#fff' },
  drawerHeaderContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  drawerLogo: { marginRight: 15 },
  drawerHeaderText: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
  drawerSection: { marginTop: 10, marginBottom: 5 },
  drawerItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 20, marginHorizontal: 12, borderRadius: 8, marginBottom: 2 },
  drawerItemActive: { backgroundColor: '#EEF2FF' },
  drawerItemPressed: { backgroundColor: '#E0E7FF' },
  drawerIcon: { marginRight: 18, color: '#475569' },
  drawerText: { fontSize: 15, color: '#334155', fontWeight: '500' },
  drawerTextActive: { color: '#6366F1', fontWeight: '600' },
  drawerSeparator: { height: 1, backgroundColor: '#F1F5F9', marginHorizontal: 20, marginVertical: 10 },
  drawerFooterIcon: { marginRight: 18, color: '#64748B' },
  drawerFooterText: { fontSize: 14, color: '#475569', fontWeight: 'normal' },
  appVersionText: { textAlign: 'center', color: '#94A3B8', fontSize: 12, paddingVertical: 15, marginTop: 'auto' },
});

export default CustomDrawerContent;