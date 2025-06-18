import React, { useRef, useEffect } from 'react';
import {
  View,
  Animated,
  Easing,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const TypingIndicator = () => {
  const dots = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];
  useEffect(() => {
    const anims = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(dot, { toValue: -5, duration: 400, delay: i * 150, useNativeDriver: true, easing: Easing.ease }),
          Animated.timing(dot, { toValue: 0, duration: 400, useNativeDriver: true, easing: Easing.ease }),
        ])
      )
    );
    anims.forEach(a => a.start());
    return () => anims.forEach(a => a.stop());
  }, []);
  return (
    <View style={styles.aiRow}>
      <View style={styles.avatar}>
        <Ionicons name="sparkles" size={20} color="#6366F1" />
      </View>
      <View style={[styles.aiBubble, styles.typingBubble]}>
        {dots.map((dot, idx) => (
          <Animated.View key={idx} style={[styles.typingDot, { transform: [{ translateY: dot }] }]} />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  aiRow: { flexDirection: 'row', margin: 8, alignItems: 'flex-end' },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  aiBubble: { backgroundColor: '#fff', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', maxWidth: '80%' },
  typingBubble: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', width: 60, height: 40 },
  typingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#94A3B8', margin: 3 },
});

export default TypingIndicator;