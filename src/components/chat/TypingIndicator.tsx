import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

const DOT_SIZE = 8;
const ANIMATION_DURATION = 400;
const DELAYS = [0, 150, 300];

function Dot({ delay }: { delay: number }) {
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(translateY, {
          toValue: -6,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }),
        // hold so all three dots don't overlap on the way back
        Animated.delay(DELAYS[DELAYS.length - 1]),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [delay, translateY]);

  return (
    <Animated.View style={[styles.dot, { transform: [{ translateY }] }]} />
  );
}

export function TypingIndicator() {
  return (
    <View style={styles.container}>
      <View style={styles.bubble}>
        {DELAYS.map((d, i) => (
          <Dot key={i} delay={d} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingBottom: 6 },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: '#888',
  },
});
