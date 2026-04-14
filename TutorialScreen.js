// src/screens/TutorialScreen.js
import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TUTORIAL_KEY = 'gg_tutorial_seen';

const slides = [
  {
    icon: '🌿',
    title: 'Welcome to GreenGuardian',
    description: 'Your personal plant care assistant. Keep your plants healthy, happy, and thriving.',
    bg: ['#1b5e20', '#2e7d32'],
  },
  {
    icon: '🪴',
    title: 'Track Your Plants',
    description: 'Add all your plants to your digital garden. Set watering schedules and care notes.',
    bg: ['#1b5e20', '#388e3c'],
  },
  {
    icon: '💧',
    title: 'Smart Reminders',
    description: 'Never forget to water again. Get notified exactly when your plants need attention.',
    bg: ['#0d47a1', '#1565c0'],
  },
  {
    icon: '🌤️',
    title: 'Weather Aware',
    description: 'Reminders adjust based on local weather. Skip watering when rain is on the way!',
    bg: ['#e65100', '#f57c00'],
  },
];

export default function TutorialScreen() {
  const [index, setIndex] = useState(0);
  const navigation = useNavigation();
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  // TUTORIAL ALWAYS SHOWS – removed the AsyncStorage check

  const markSeen = () => AsyncStorage.setItem(TUTORIAL_KEY, 'true');

  const goTo = (next) => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 0,   duration: 180, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -30, duration: 180, useNativeDriver: true }),
    ]).start(() => {
      setIndex(next);
      slideAnim.setValue(30);
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 260, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 260, useNativeDriver: true }),
      ]).start();
    });
  };

  const handleNext = () => {
    if (index === slides.length - 1) {
      markSeen();
      navigation.replace('Login');
    } else {
      goTo(index + 1);
    }
  };

  const handleSkip = () => {
    markSeen();
    navigation.replace('Login');
  };

  const slide = slides[index];

  return (
    <LinearGradient colors={slide.bg} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.root}>
      <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.iconCircle}>
          <Text style={styles.icon}>{slide.icon}</Text>
        </View>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.description}>{slide.description}</Text>
      </Animated.View>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {slides.map((_, i) => (
            <TouchableOpacity key={i} onPress={() => goTo(i)}>
              <View style={[styles.dot, i === index && styles.activeDot]} />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.nextButton} onPress={handleNext} activeOpacity={0.85}>
          <Text style={styles.nextText}>
            {index === slides.length - 1 ? 'Get Started' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root:       { flex: 1 },
  skipButton: { position: 'absolute', top: 52, right: 24, zIndex: 10 },
  skipText:   { color: 'rgba(255,255,255,0.7)', fontSize: 15, fontWeight: '500' },
  content:    { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 36 },
  iconCircle: {
    width: 130, height: 130, borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 40,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)',
  },
  icon:       { fontSize: 68 },
  title:      { fontSize: 28, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 16, lineHeight: 36 },
  description:{ fontSize: 16, color: 'rgba(255,255,255,0.82)', textAlign: 'center', lineHeight: 24 },
  footer:     { paddingHorizontal: 28, paddingBottom: 52 },
  dots:       { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 28 },
  dot:        { width: 8,  height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.35)' },
  activeDot:  { width: 28, backgroundColor: '#fff' },
  nextButton: {
    backgroundColor: '#fff', borderRadius: 16, paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 6,
  },
  nextText:   { fontSize: 17, fontWeight: '700', color: '#2e7d32' },
});