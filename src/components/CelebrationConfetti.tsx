import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { colors, radius } from '../design/tokens';

type ConfettiShape = 'circle' | 'square' | 'strip';

type ConfettiParticle = {
  color: string;
  delay: number;
  drift: number;
  duration: number;
  left: `${number}%`;
  pause: number;
  rotation: number;
  shape: ConfettiShape;
  size: number;
  sway: number;
  travel: number;
};

const particleColors = [colors.amber, colors.mint, colors.coral, colors.lavender, colors.sky] as const;
const particleShapes: ConfettiShape[] = ['square', 'circle', 'strip'];

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function randomSign() {
  return Math.random() > 0.5 ? 1 : -1;
}

function randomPercent() {
  return `${Math.round(randomBetween(4, 94))}%` as `${number}%`;
}

function createParticles(count = 24): ConfettiParticle[] {
  return Array.from({ length: count }, (_, index) => {
    const direction = randomSign();
    const shape = particleShapes[Math.floor(randomBetween(0, particleShapes.length))] ?? 'square';
    const color = particleColors[Math.floor(randomBetween(0, particleColors.length))] ?? colors.amber;

    return {
      color,
      delay: Math.round(randomBetween(0, index < 14 ? 360 : 920)),
      drift: Math.round(randomBetween(18, 58) * direction),
      duration: Math.round(randomBetween(1650, 3550)),
      left: randomPercent(),
      pause: 0,
      rotation: Math.round(randomBetween(520, 1220) * direction),
      shape,
      size: Math.round(randomBetween(7, 12)),
      sway: Math.round(randomBetween(12, 36) * -direction),
      travel: Math.round(randomBetween(235, 352)),
    };
  });
}

export function CelebrationConfetti() {
  const particles = useRef(createParticles()).current;
  const particleProgress = useRef(particles.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const animations = particleProgress.map((progress, index) => {
      const particle = particles[index]!;

      progress.setValue(0);

      return Animated.sequence([
        Animated.delay(particle.delay),
        Animated.timing(progress, {
          duration: particle.duration,
          easing: Easing.bezier(0.18, 0.72, 0.28, 1),
          toValue: 1,
          useNativeDriver: true,
        }),
      ]);
    });

    animations.forEach((animation) => animation.start());

    return () => {
      animations.forEach((animation) => animation.stop());
    };
  }, [particleProgress, particles]);

  return (
    <View pointerEvents="none" style={styles.container}>
      {particles.map((particle, index) => {
        const progress = particleProgress[index]!;
        const translateY = progress.interpolate({
          inputRange: [0, 0.18, 0.56, 1],
          outputRange: [-50, 18, particle.travel * 0.62, particle.travel],
        });
        const translateX = progress.interpolate({
          inputRange: [0, 0.24, 0.48, 0.76, 1],
          outputRange: [0, particle.sway, particle.drift * 0.52, particle.sway * -0.45, particle.drift],
        });
        const rotate = progress.interpolate({
          inputRange: [0, 1],
          outputRange: [`${particle.rotation > 0 ? -28 : 24}deg`, `${particle.rotation}deg`],
        });
        const scaleX = progress.interpolate({
          inputRange: [0, 0.18, 0.34, 0.52, 0.72, 1],
          outputRange: [0.72, 1, 0.34, 0.92, 0.28, 0.78],
        });
        const opacity = progress.interpolate({
          inputRange: [0, 0.08, 0.78, 1],
          outputRange: [0, 1, 0.88, 0],
        });
        const isCircle = particle.shape === 'circle';
        const isStrip = particle.shape === 'strip';

        return (
          <Animated.View
            key={`${particle.left}-${particle.color}-${index}`}
            style={[
              styles.particle,
              {
                backgroundColor: particle.color,
                borderRadius: isCircle ? radius.pill : radius.md,
                height: isStrip ? particle.size * 2.7 : particle.size + 4,
                left: particle.left,
                opacity,
                transform: [{ translateY }, { translateX }, { rotate }, { scaleX }],
                width: isStrip ? Math.max(4, particle.size - 4) : particle.size,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 310,
    left: 0,
    overflow: 'hidden',
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 1,
  },
  particle: {
    position: 'absolute',
    top: 0,
  },
});
