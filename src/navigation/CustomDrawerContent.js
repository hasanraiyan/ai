import React from 'react';
import {
  Text,
  View,
  Pressable,
  StyleSheet,
} from 'react-native';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';

// --- Reusable DrawerItem Component ---
// This encapsulates the logic and styling for a single item, cleaning up the main component.
const DrawerItem = ({ label, icon, activeIcon, isActive, onPress }) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [
      styles.drawerItem,
      isActive && styles.drawerItemActive,
      pressed && styles.drawerItemPressed, // For visual feedback on press
    ]}
    android_ripple={{ color: '#E0E7FF' }}
  >
    {/* The active indicator bar - a modern UI touch */}
    <View style={[styles.activeIndicator, isActive && styles.activeIndicatorVisible]} />
    <Ionicons
      name={isActive ? activeIcon : icon}
      size={22}
      color={isActive ? styles.drawerTextActive.color : styles.drawerIcon.color}
      style={styles.drawerIcon}
    />
    <Text style={[styles.drawerText, isActive && styles.drawerTextActive]}>
      {label}
    </Text>
  </Pressable>
);


// --- Main CustomDrawerContent Component ---
function CustomDrawerContent(props) {
  const activeRouteName = props.state.routes[props.state.index].name;

  const navigateToScreen = screenName => {
    // Closing the drawer first provides a smoother transition
    props.navigation.closeDrawer();
    props.navigation.navigate(screenName);
  };

  const menuItems = [
    { name: 'Threads', label: 'Threads', icon: 'chatbubbles-outline', activeIcon: 'chatbubbles' },
    { name: 'ImageGeneration', label: 'Generate Image', icon: 'image-outline', activeIcon: 'image' },
    { name: 'LanguageTutor', label: 'Language Tutor', icon: 'language-outline', activeIcon: 'language' },
    { name: 'Gallery', label: 'Gallery', icon: 'images-outline', activeIcon: 'images' },
    { name: 'Settings', label: 'Settings', icon: 'settings-outline', activeIcon: 'settings' },
  ];

  return (
    <View style={styles.drawerContainer}>
      {/* --- Header Section --- */}
      <View style={styles.headerContainer}>
        <Ionicons name="sparkles-sharp" size={32} color="#6366F1" style={styles.headerLogo} />
        <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>AI Assistant</Text>
            {/* For now until the backend is add the next line is commented: Do not remove this */}
            {/* <Text style={styles.headerSubtitle}>user@example.com</Text> */}
        </View>
      </View>

      {/* --- Scrollable Menu Items --- */}
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

      {/* --- Sticky Footer Section --- */}
      <View style={styles.footerContainer}>
         <DrawerItem
            label="Help & Feedback"
            icon="help-circle-outline"
            activeIcon="help-circle" // Provide active icon even if it's not used here
            isActive={false} // Footer items are never "active" in this design
            onPress={() => { props.navigation.closeDrawer(); /* Implement help action */ }}
        />
        <Text style={styles.appVersionText}>Version 1.0.0</Text>
      </View>
    </View>
  );
}


// --- Stylesheet ---
// Refined for better spacing, hierarchy, and to support the new features.
const styles = StyleSheet.create({
  // Main Layout
  drawerContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    flex: 1, // Allows the scroll view to take up available space
  },
  
  // Header
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#fff', // Ensures header is not transparent
  },
  headerLogo: {
    marginRight: 15,
  },
  headerTextContainer: {
    flexDirection: 'column',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  
  // Menu
  menuSection: {
    paddingTop: 10, // Add some space between header and first item
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
    overflow: 'hidden', // Important for the active indicator's rounded corners
  },
  drawerItemActive: {
    backgroundColor: '#EEF2FF',
  },
  drawerItemPressed: {
    backgroundColor: '#E0E7FF', // A slightly deeper color for press feedback
  },
  drawerIcon: {
    marginRight: 20,
    width: 24, // Ensures consistent alignment
    textAlign: 'center',
    color: '#475569',
  },
  drawerText: {
    fontSize: 15,
    color: '#334155',
    fontWeight: '500',
  },
  drawerTextActive: {
    color: '#6366F1',
    fontWeight: '700', // Bolder font for active state
  },
  
  // Active Item Indicator
  activeIndicator: {
    position: 'absolute',
    left: 0,
    top: '20%',
    bottom: '20%',
    width: 4,
    backgroundColor: '#6366F1',
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
    opacity: 0, // Hidden by default
  },
  activeIndicatorVisible: {
    opacity: 1, // Visible when active
  },
  
  // Footer
  footerContainer: {
    paddingBottom: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  appVersionText: {
    textAlign: 'center',
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 10,
  },
});

export default CustomDrawerContent;