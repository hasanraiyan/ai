// src/components/ModeToggle.js

import React, { useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../utils/theme';

const TOGGLE_WIDTH = 140;

export default function ModeToggle({ mode, onToggle, isAgentModeSupported }) {
  const { colors } = useTheme();
  const animatedValue = useRef(new Animated.Value(mode === 'chat' ? 0 : 1)).current;

  useEffect(() => {
    Animated.spring(animatedValue, {
      toValue: mode === 'chat' ? 0 : 1,
      speed: 12,
      bounciness: 8,
      useNativeDriver: true,
    }).start();
  }, [mode]);

  const handleToggle = newMode => {
    if (newMode === mode) return;

    if (newMode === 'agent' && !isAgentModeSupported) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle(newMode);
  };

  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, TOGGLE_WIDTH / 2],
  });

  return (
    <View style={[styles.container, { width: TOGGLE_WIDTH, backgroundColor: colors.toggleBg }]}>
      <Animated.View
        style={[
          styles.selectorIndicator,
          {
            width: TOGGLE_WIDTH / 2,
            transform: [{ translateX }],
            backgroundColor: colors.accent,
          },
        ]}
      />
      <TouchableOpacity
        style={styles.button}
        onPress={() => handleToggle('chat')}
        activeOpacity={0.8}
      >
        <Text style={[
          styles.buttonText,
          { color: colors.subtext },
          mode === 'chat' && styles.activeButtonText,
        ]}>
          Chat
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.button,
          !isAgentModeSupported && styles.disabledButton,
        ]}
        onPress={() => handleToggle('agent')}
        activeOpacity={isAgentModeSupported ? 0.8 : 1}
        disabled={!isAgentModeSupported}
      >
        <Text style={[
          styles.buttonText,
          { color: colors.subtext },
          mode === 'agent' && styles.activeButtonText,
          !isAgentModeSupported && { color: colors.subtext },
        ]}>
          Agent
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 30,
    padding: 3,
    overflow: 'hidden',
    ...Platform.select({
      android: { elevation: 3 },
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 1 },
        shadowRadius: 2,
      },
    }),
  },
  selectorIndicator: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    borderRadius: 30,
    zIndex: 1,
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  buttonText: {
    fontWeight: '600',
    fontSize: 14,
  },
  activeButtonText: {
    color: '#FFFFFF', // Active text is almost always white
  },
  disabledButton: {
    opacity: 0.5,
  },
});