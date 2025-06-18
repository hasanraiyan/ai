import React from 'react';
import {
  Text,
  View,
  Pressable,
} from 'react-native';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../styles/globalStyles';

function CustomDrawerContent(props) {
  const activeRouteName = props.state.routes[props.state.index].name;
  const navigateToScreen = screenName => {
    props.navigation.closeDrawer();
    props.navigation.navigate(screenName);
  };
  const menuItems = [
    { name: 'Threads', label: 'Threads', icon: 'chatbubbles-outline', activeIcon: 'chatbubbles', action: () => navigateToScreen('Threads') },
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

export default CustomDrawerContent;