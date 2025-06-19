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

const TOGGLE_WIDTH = 140;

export default function ModeToggle({ mode, onToggle, isAgentModeSupported }) {
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
    <View style={[styles.container, { width: TOGGLE_WIDTH }]}>
      <Animated.View
        style={[
          styles.selectorIndicator,
          {
            width: TOGGLE_WIDTH / 2,
            transform: [{ translateX }],
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
          mode === 'agent' && styles.activeButtonText,
          !isAgentModeSupported && styles.disabledButtonText,
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
    backgroundColor: '#F3F4F6',
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
    top: 0,
    bottom: 0,
    backgroundColor: '#6366F1',
    borderRadius: 30,
    zIndex: -1,
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontWeight: '600',
    color: '#374151',
    fontSize: 14,
  },
  activeButtonText: {
    color: '#FFFFFF',
  },
  disabledButton: {
    opacity: 0.4,
  },
  disabledButtonText: {
    color: '#9CA3AF',
  },
});
