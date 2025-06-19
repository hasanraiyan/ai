import React, { useEffect, useRef, useState } from 'react';
import { View, Image, Animated, ActivityIndicator } from 'react-native';
function SkeletonPlaceholder({ width, height }) {
  const opacityAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={{
        width,
        height,
        backgroundColor: '#E5E7EB',
        borderRadius: 8,
        opacity: opacityAnim,
      }}
    />
  );
}

function ImageWithLoader({ uri, alt, style }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <View>
      {!loaded && <SkeletonPlaceholder width="100%" height={style?.height || 200} />}
      <Image
        source={{ uri }}
        onLoad={() => setLoaded(true)}
        style={[style, { display: loaded ? 'flex' : 'none' }]}
        accessibilityLabel={alt}
      />
    </View>
  );
}
export { SkeletonPlaceholder, ImageWithLoader };