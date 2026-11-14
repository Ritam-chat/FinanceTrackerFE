import React, { useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useTheme } from '../../hooks/useTheme';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export const SkeletonRow = () => {
  const { colors } = useTheme();
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={[styles.skeletonContainer, animatedStyle]}>
      <View style={[styles.circle, { backgroundColor: colors.surfaceAlt }]} />
      <View style={styles.flex}>
        <View style={[styles.lineLarge, { backgroundColor: colors.surfaceAlt }]} />
        <View style={[styles.lineSmall, { backgroundColor: colors.surfaceAlt }]} />
      </View>
      <View style={[styles.lineMedium, { backgroundColor: colors.surfaceAlt }]} />
    </Animated.View>
  );
}

export const EmptyState = ({ message, icon = 'inbox-outline' }: { message: string; icon?: any }) => {
  const { colors } = useTheme();
  return (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons name={icon} size={64} color={colors.surfaceAlt} />
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  skeletonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  circle: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  flex: { flex: 1, gap: 8 },
  lineLarge: { width: '60%', height: 16, borderRadius: 8 },
  lineSmall: { width: '40%', height: 12, borderRadius: 6 },
  lineMedium: { width: '20%', height: 16, borderRadius: 8 },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 64,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  }
});
