// components/ToggleSwitch.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  Animated,
  Platform,
  UIManager,
  StyleSheet,
  Text,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, spacing, typography } from '../utils/theme';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function ToggleSwitch({
  options,
  selected,
  onSelect,
  disabled = false,
  containerStyle,
  indicatorColors, // Will default to theme.colors.accent if not provided
  size = 'medium', // 'small', 'medium', 'large'
  variant = 'solid', // 'gradient', 'solid', 'minimal'
}) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const animX = useRef(new Animated.Value(0)).current;
  const animW = useRef(new Animated.Value(0)).current;
  const scaleAnims = useRef(options.map(() => new Animated.Value(1))).current;
  const isInit = useRef(true);

  // Use theme accent color as default for the indicator
  const finalIndicatorColors = indicatorColors || [colors.accent, colors.accent20];

  const sizeConfig = {
    small: {
      containerPadding: spacing.xs,
      indicatorInset: 2,
      height: 36,
      fontSize: typography.small,
      iconSize: 14,
    },
    medium: {
      containerPadding: spacing.xs,
      indicatorInset: 2,
      height: 44,
      fontSize: typography.body,
      iconSize: 16,
    },
    large: {
      containerPadding: spacing.sm - 2,
      indicatorInset: 3,
      height: 52,
      fontSize: 16, // A step above body
      iconSize: 18,
    },
  };

  const config = sizeConfig[size];
  const totalInset = config.containerPadding + config.indicatorInset;

  useEffect(() => {
    if (width > 0) {
      const availableWidth = width - (totalInset * 2);
      const w = availableWidth / options.length;
      animW.setValue(w);
      const selectedIndex = options.findIndex(o => o.key === selected);
      animX.setValue(totalInset + (selectedIndex * w));
      isInit.current = false;
    }
  }, [width, options.length, totalInset]);

  useEffect(() => {
    if (width === 0) return;
    const availableWidth = width - (totalInset * 2);
    const w = availableWidth / options.length;
    const idx = options.findIndex(o => o.key === selected);
    const toX = totalInset + (idx * w);

    if (isInit.current) {
      animX.setValue(toX);
      animW.setValue(w);
    } else {
      Animated.parallel([
        Animated.spring(animX, { toValue: toX, tension: 120, friction: 8, useNativeDriver: false }),
        Animated.spring(animW, { toValue: w, tension: 120, friction: 8, useNativeDriver: false }),
      ]).start();
    }
  }, [selected, width, options, totalInset]);

  const handlePress = (key, index) => {
    if (disabled || key === selected) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.timing(scaleAnims[index], { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnims[index], { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
    onSelect(key);
  };

  const getIndicatorStyle = () => {
    const indicatorHeight = config.height - (totalInset * 2);
    const indicatorBorderRadius = indicatorHeight / 2;
    const baseStyle = [
      styles.indicator,
      {
        transform: [{ translateX: animX }],
        width: animW,
        height: indicatorHeight,
        top: totalInset,
        borderRadius: indicatorBorderRadius,
        shadowColor: '#000',
      },
    ];

    switch (variant) {
      case 'solid':
        return [...baseStyle, { backgroundColor: finalIndicatorColors[0] }];
      case 'minimal':
        return [...baseStyle, styles.minimalIndicator, { backgroundColor: colors.card, borderColor: colors.border }];
      default:
        return baseStyle;
    }
  };

  const renderIndicator = () => {
    const indicatorHeight = config.height - (totalInset * 2);
    const indicatorBorderRadius = indicatorHeight / 2;
    if (variant === 'minimal') {
      return <Animated.View style={getIndicatorStyle()} />;
    }
    return (
      <Animated.View style={getIndicatorStyle()}>
        {variant === 'gradient' && (
          <LinearGradient
            colors={finalIndicatorColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.gradient, { borderRadius: indicatorBorderRadius }]}
          />
        )}
      </Animated.View>
    );
  };

  return (
    <View
      style={[
        styles.container,
        {
          height: config.height,
          padding: config.containerPadding,
          borderRadius: config.height / 2,
          backgroundColor: disabled ? colors.emptyBg : colors.background,
          borderColor: colors.border,
          shadowColor: '#000',
        },
        containerStyle,
        disabled && styles.disabled,
      ]}
      onLayout={e => setWidth(e.nativeEvent.layout.width)}
      accessible
      accessibilityRole="tablist"
      accessibilityLabel="Toggle switch"
    >
      {renderIndicator()}

      {options.map((opt, index) => {
        const isActive = opt.key === selected;
        return (
          <Animated.View
            key={opt.key}
            style={[styles.buttonWrapper, { transform: [{ scale: scaleAnims[index] }] }]}
          >
            <TouchableOpacity
              style={[
                styles.button,
                {
                  paddingVertical: (config.height - config.containerPadding * 2) / 4,
                  marginHorizontal: config.indicatorInset,
                },
              ]}
              onPress={() => handlePress(opt.key, index)}
              disabled={disabled}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={`${opt.label} option`}
              activeOpacity={0.8}
            >
              {opt.icon && (
                <Ionicons
                  name={opt.icon}
                  size={config.iconSize}
                  color={isActive ? colors.fabText : colors.subtext}
                  style={[styles.icon, { marginRight: opt.label ? 6 : 0 }]}
                />
              )}
              {opt.label && (
                <Text
                  style={[
                    styles.label,
                    {
                      fontSize: config.fontSize,
                      color: isActive ? colors.fabText : colors.subtext,
                    },
                    isActive && styles.labelActive,
                  ]}
                  numberOfLines={1}
                >
                  {opt.label}
                </Text>
              )}
            </TouchableOpacity>
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderWidth: 1,
    overflow: 'hidden',

  },
  disabled: {
    opacity: 0.6,
  },
  indicator: {
    position: 'absolute',
    zIndex: 1,
    ...Platform.select({
      ios: { shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6 },
      android: { elevation: 4 },
    }),
  },
  minimalIndicator: {
    borderWidth: 1,
  },
  gradient: {
    flex: 1,
  },
  buttonWrapper: {
    flex: 1,
    zIndex: 2,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  icon: {},
  label: {
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'center',
  },
  labelActive: {
    fontWeight: '700',
  },
});