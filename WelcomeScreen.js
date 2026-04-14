// src/screens/WelcomeScreen.js
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';

export default function WelcomeScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 40, friction: 7, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => navigation.replace('Main'), 2000);
    return () => clearTimeout(timer);
  }, []);

  const firstName = (user?.name || 'Plant Parent').split(' ')[0];

  return (
    <LinearGradient colors={['#1b5e20', '#2e7d32', '#43a047']} style={styles.root}>
      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        <Text style={styles.emoji}>🌱</Text>
        <Text style={styles.welcome}>Welcome back,</Text>
        <Text style={styles.name}>{firstName}!</Text>
        <Text style={styles.sub}>Your plants are waiting for you.</Text>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { alignItems: 'center', paddingHorizontal: 32 },
  emoji:   { fontSize: 72, marginBottom: 24 },
  welcome: { fontSize: 22, color: 'rgba(255,255,255,0.8)', fontWeight: '400' },
  name:    { fontSize: 42, color: '#fff', fontWeight: '900', marginTop: 4, marginBottom: 12 },
  sub:     { fontSize: 16, color: 'rgba(255,255,255,0.65)', textAlign: 'center' },
});