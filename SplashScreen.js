// src/screens/SplashScreen.js
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

function FloatingLeaf({ style, size, delay }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -14] });
  const opacity    = anim.interpolate({ inputRange: [0, 1], outputRange: [0.08, 0.22] });
  return (
    <Animated.Text style={[styles.leaf, style, { fontSize: size, transform: [{ translateY }], opacity }]}>
      🌿
    </Animated.Text>
  );
}

function LoadingDots() {
  const dots = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];
  useEffect(() => {
    const anims = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 160),
          Animated.timing(dot, { toValue: -9, duration: 380, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0,  duration: 380, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.delay((2 - i) * 160),
        ])
      )
    );
    Animated.parallel(anims).start();
  }, []);
  return (
    <View style={styles.dotsRow}>
      {dots.map((dot, i) => (
        <Animated.View key={i} style={[styles.dot, { transform: [{ translateY: dot }] }]} />
      ))}
    </View>
  );
}

export default function SplashScreen() {
  const logoScale   = useRef(new Animated.Value(0.4)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textY       = useRef(new Animated.Value(30)).current;
  const textOp      = useRef(new Animated.Value(0)).current;
  const underW      = useRef(new Animated.Value(0)).current;
  const tagOp       = useRef(new Animated.Value(0)).current;
  const loaderOp    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoScale,   { toValue: 1, tension: 38, friction: 5, useNativeDriver: true }),
      Animated.timing(logoOpacity, { toValue: 1, duration: 450, useNativeDriver: true }),
    ]).start(() => {
      Animated.parallel([
        Animated.timing(textY,  { toValue: 0,   duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(textOp, { toValue: 1,   duration: 600, useNativeDriver: true }),
        Animated.timing(underW, { toValue: 160, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
      ]).start(() => {
        Animated.parallel([
          Animated.timing(tagOp,    { toValue: 1, duration: 500, useNativeDriver: true }),
          Animated.timing(loaderOp, { toValue: 1, duration: 500, useNativeDriver: true }),
        ]).start();
      });
    });
    // No timer – navigation is handled by AppNavigator based on auth state
  }, []);

  return (
    <LinearGradient colors={['#1b5e20', '#2e7d32', '#43a047']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.root}>
      <View style={[styles.bgCircle, { top: -80,    right: -80,  width: 220, height: 220, opacity: 0.1 }]} />
      <View style={[styles.bgCircle, { top: 100,    left: -60,   width: 160, height: 160, opacity: 0.07 }]} />
      <View style={[styles.bgCircle, { bottom: -100,right: -40,  width: 280, height: 280, opacity: 0.08 }]} />
      <View style={[styles.bgCircle, { bottom: 60,  left: -30,   width: 130, height: 130, opacity: 0.06 }]} />

      <FloatingLeaf style={{ top: 90,    left: 50   }} size={18} delay={0}   />
      <FloatingLeaf style={{ top: 200,   right: 70  }} size={13} delay={300} />
      <FloatingLeaf style={{ top: 340,   left: 110  }} size={22} delay={600} />
      <FloatingLeaf style={{ bottom: 230,right: 65  }} size={15} delay={200} />
      <FloatingLeaf style={{ bottom: 130,left: 75   }} size={11} delay={500} />

      <View style={styles.content}>
        <Animated.View style={[styles.logoCircle, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
          <Text style={styles.logoEmoji}>🌱</Text>
        </Animated.View>

        <View style={{ height: 32 }} />

        <Animated.View style={{ opacity: textOp, transform: [{ translateY: textY }], alignItems: 'center' }}>
          <Text style={styles.title}>GreenGuardian</Text>
          <View style={{ height: 10 }} />
          <Animated.View style={[styles.underline, { width: underW }]} />
        </Animated.View>

        <View style={{ height: 16 }} />

        <Animated.Text style={[styles.tagline, { opacity: tagOp }]}>
          Your Plant Care Assistant
        </Animated.Text>

        <View style={{ height: 60 }} />

        <Animated.View style={{ opacity: loaderOp, alignItems: 'center' }}>
          <LoadingDots />
          <Text style={styles.loadingText}>Loading...</Text>
        </Animated.View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root:       { flex: 1 },
  bgCircle:   { position: 'absolute', borderRadius: 999, backgroundColor: '#fff' },
  leaf:       { position: 'absolute' },
  content:    { flex: 1, justifyContent: 'center', alignItems: 'center' },
  logoCircle: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3, shadowRadius: 24, elevation: 16,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)',
  },
  logoEmoji:  { fontSize: 64 },
  title: {
    fontSize: 40, fontWeight: '900', color: '#ffffff',
    letterSpacing: 0.5, textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  underline:   { height: 3, backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: 2 },
  tagline:     { fontSize: 15, color: 'rgba(255,255,255,0.88)', fontWeight: '500', letterSpacing: 0.4, textAlign: 'center' },
  dotsRow:     { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 10 },
  dot:         { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.6)' },
  loadingText: { fontSize: 12, color: 'rgba(255,255,255,0.45)', letterSpacing: 1.5 },
});