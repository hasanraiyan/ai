import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  TouchableOpacity, 
  Animated, 
  Platform, 
  UIManager, 
  StyleSheet,
  Text,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width: screenWidth } = Dimensions.get('window');

export default function ToggleSwitch({
  options,
  selected,
  onSelect,
  disabled = false,
  containerStyle,
  indicatorColors = ['#667EEA', '#764BA2'],
  size = 'medium', // 'small', 'medium', 'large'
  variant = 'gradient', // 'gradient', 'solid', 'minimal'
}) {
  const [width, setWidth] = useState(0);
  const animX = useRef(new Animated.Value(0)).current;
  const animW = useRef(new Animated.Value(0)).current;
  const scaleAnims = useRef(options.map(() => new Animated.Value(1))).current;
  const isInit = useRef(true);

  const sizeConfig = {
    small: { 
      containerPadding: 3, 
      indicatorInset: 2, // Additional inset for indicator
      height: 36, 
      fontSize: 12, 
      iconSize: 14 
    },
    medium: { 
      containerPadding: 4, 
      indicatorInset: 2,
      height: 44, 
      fontSize: 14, 
      iconSize: 16 
    },
    large: { 
      containerPadding: 5, 
      indicatorInset: 3,
      height: 52, 
      fontSize: 16, 
      iconSize: 18 
    }
  };

  const config = sizeConfig[size];
  const totalInset = config.containerPadding + config.indicatorInset;

  // Initialize sizes
  useEffect(() => {
    if (width > 0) {
      const availableWidth = width - (totalInset * 2); // Account for both sides
      const w = availableWidth / options.length;
      animW.setValue(w);
      const selectedIndex = options.findIndex(o => o.key === selected);
      animX.setValue(totalInset + (selectedIndex * w)); // Start from inset position
      isInit.current = false;
    }
  }, [width, options.length, totalInset]);

  // Animate on selection change
  useEffect(() => {
    if (width === 0) return;
    const availableWidth = width - (totalInset * 2);
    const w = availableWidth / options.length;
    const idx = options.findIndex(o => o.key === selected);
    const toX = totalInset + (idx * w);

    if (isInit.current) {
      animX.setValue(toX);
      animW.setValue(w);
      isInit.current = false;
    } else {
      // Smoother spring animation
      Animated.parallel([
        Animated.spring(animX, {
          toValue: toX,
          tension: 120,
          friction: 8,
          useNativeDriver: false,
        }),
        Animated.spring(animW, {
          toValue: w,
          tension: 120,
          friction: 8,
          useNativeDriver: false,
        })
      ]).start();
    }
  }, [selected, width, options, totalInset]);

  const handlePress = (key, index) => {
    if (disabled || key === selected) return;

    // Enhanced haptic feedback
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    // Button press animation
    Animated.sequence([
      Animated.timing(scaleAnims[index], {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnims[index], {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      })
    ]).start();

    onSelect(key);
  };

  const getIndicatorStyle = () => {
    // Calculate proper indicator height and border radius
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
      }
    ];

    switch (variant) {
      case 'solid':
        return [...baseStyle, { backgroundColor: indicatorColors[0] }];
      case 'minimal':
        return [...baseStyle, styles.minimalIndicator];
      default:
        return baseStyle;
    }
  };

  const renderIndicator = () => {
    const indicatorHeight = config.height - (totalInset * 2);
    const indicatorBorderRadius = indicatorHeight / 2;

    if (variant === 'minimal') {
      return (
        <Animated.View style={getIndicatorStyle()} />
      );
    }

    return (
      <Animated.View style={getIndicatorStyle()}>
        {variant === 'gradient' ? (
          <LinearGradient
            colors={indicatorColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.gradient, { borderRadius: indicatorBorderRadius }]}
          />
        ) : null}
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
        },
        containerStyle,
        disabled && styles.disabled
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
            style={[
              styles.buttonWrapper,
              { transform: [{ scale: scaleAnims[index] }] }
            ]}
          >
            <TouchableOpacity
              style={[
                styles.button, 
                { 
                  paddingVertical: (config.height - config.containerPadding * 2) / 4,
                  marginHorizontal: config.indicatorInset, // Add margin to match indicator inset
                }
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
                  color={isActive ? '#FFFFFF' : '#64748B'}
                  style={[styles.icon, { marginRight: opt.label ? 6 : 0 }]}
                />
              )}
              {opt.label && (
                <Text
                  style={[
                    styles.label,
                    { fontSize: config.fontSize },
                    isActive && styles.labelActive
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

ToggleSwitch.defaultProps = {
  options: [],
  selected: null,
  onSelect: () => {},
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    // Add subtle shadow
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  disabled: { 
    opacity: 0.5,
    backgroundColor: '#F1F5F9',
  },
  indicator: {
    position: 'absolute',
    zIndex: 1,
    // Enhanced shadow for the indicator
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  minimalIndicator: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    paddingHorizontal: 8,
  },
  icon: {
    // Icon styling
  },
  label: {
    fontWeight: '600',
    color: '#64748B',
    flexShrink: 1,
    textAlign: 'center',
  },
  labelActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});