import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, spacing, typography } from '../utils/theme';
import { LinearGradient } from 'expo-linear-gradient';

export default function ScreenHeader({ navigation, title, subtitle, rightAction }) {
  const theme = useTheme();

  return (
    <LinearGradient
      colors={[theme.colors.headerBg, `${theme.colors.headerBg}00`]}
      style={[styles.header, { borderBottomColor: theme.colors.border }]}
    >
      <TouchableOpacity
        onPress={() => navigation.openDrawer()}
        style={styles.menuButton}
      >
        <Ionicons name="menu-outline" size={28} color={theme.colors.subtext} />
      </TouchableOpacity>
      <View style={styles.titleContainer}>
        <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
        {subtitle && (
          <Text style={[styles.subtitle, { color: theme.colors.subtext }]}>
            {subtitle}
          </Text>
        )}
      </View>
      <View style={styles.headerRight}>
        {rightAction ? rightAction : <View style={{width: 28}} />}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    paddingTop: Platform.OS === 'android' ? spacing.md + spacing.xs : spacing.sm,
    borderBottomWidth: 1,
  },
  menuButton: {
    padding: spacing.xs,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  title: {
    fontSize: typography.h1,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: typography.small,
    fontWeight: '500',
    marginTop: 2,
  },
  headerRight: {
    minWidth: 28 + spacing.xs * 2,
    alignItems: 'flex-end',
  },
});