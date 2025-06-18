import React, { useRef, useEffect } from 'react';
import {
  View,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../styles/globalStyles';

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

export default TypingIndicator;