// src/screens/HomeScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, ImageBackground
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useFavorites } from '../contexts/FavoritesContext';
import { db } from '../services/firebase';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Location from 'expo-location';

// Optional weather API key – no crash if .env is missing
let WEATHER_API_KEY;
try {
  WEATHER_API_KEY = require('@env').WEATHER_API_KEY;
} catch (e) {
  WEATHER_API_KEY = null;
}

const getDaysUntilWater = (lastWatered, interval) => {
  if (!lastWatered) return { label: 'Water soon', urgent: true };
  const next = new Date(new Date(lastWatered).getTime() + interval * 86400000);
  const diff = Math.ceil((next - new Date()) / 86400000);
  if (diff <= 0) return { label: 'Water today!', urgent: true };
  if (diff === 1) return { label: 'Tomorrow', urgent: false };
  return { label: `In ${diff} days`, urgent: false };
};

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

export default function HomeScreen() {
  const navigation                     = useNavigation();
  const { user }                       = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [plants,     setPlants]        = useState([]);
  const [loading,    setLoading]       = useState(true);
  const [refreshing, setRefreshing]    = useState(false);
  const [weather,    setWeather]       = useState(null);
  const [location,   setLocation]      = useState(null);

  const fetchWeatherWithLocation = async () => {
    if (!WEATHER_API_KEY) return;
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        // Fallback to Manila if permission denied
        fetchWeatherForCity('Manila');
        return;
      }
      let loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);
      const { latitude, longitude } = loc.coords;
      const url = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${WEATHER_API_KEY}&units=metric`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.main) setWeather(data);
    } catch (error) {
      console.warn('Weather fetch error:', error);
    }
  };

  const fetchWeatherForCity = (city) => {
    if (!WEATHER_API_KEY) return;
    fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${WEATHER_API_KEY}&units=metric`)
      .then(r => r.json())
      .then(d => { if (d.main) setWeather(d); })
      .catch(() => {});
  };

  useEffect(() => {
    fetchWeatherWithLocation();
    const userId = user?.uid;
    if (!userId) { 
      setLoading(false); 
      return; 
    }
    
    const unsub = db.collection('plants')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .onSnapshot(
        snap => {
          setPlants(snap.docs.map(d => ({ id: d.id, ...d.data() })));
          setLoading(false);
          setRefreshing(false);
        },
        error => {
          console.error('Firestore error (orderBy):', error);
          // Fallback: try without orderBy
          const fallbackUnsub = db.collection('plants')
            .where('userId', '==', userId)
            .onSnapshot(
              fallbackSnap => {
                setPlants(fallbackSnap.docs.map(d => ({ id: d.id, ...d.data() })));
                setLoading(false);
                setRefreshing(false);
              },
              fallbackError => {
                console.error('Fallback also failed:', fallbackError);
                setLoading(false);
                setRefreshing(false);
              }
            );
          return () => fallbackUnsub();
        }
      );
    return () => unsub();
  }, [user]);

  const onRefresh = () => { setRefreshing(true); fetchWeatherWithLocation(); };

  const needsWater    = plants.filter(p => getDaysUntilWater(p.lastWatered, p.wateringInterval).urgent);
  const healthyCount  = plants.length - needsWater.length;

  const getWeatherInfo = () => {
    if (!weather) return { icon: 'partly-sunny-outline', advice: "Don't forget to check on your plants today!", color: '#f59e0b' };
    const c = weather.weather[0].main.toLowerCase();
    if (c.includes('rain'))  return { icon: 'rainy-outline',        advice: 'Rain expected — skip watering today!',      color: '#3b82f6' };
    if (c.includes('cloud')) return { icon: 'cloudy-outline',       advice: 'Cloudy — check soil before watering.',      color: '#6b7280' };
    if (c.includes('clear')) return { icon: 'sunny-outline',        advice: 'Sunny — water plants as scheduled.',        color: '#f59e0b' };
    return                          { icon: 'partly-sunny-outline', advice: 'Check your plants today!',                  color: '#10b981' };
  };

  if (loading) {
    return (
      <LinearGradient colors={['#f0faf4', '#e8f5e9']} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2e7d32" />
      </LinearGradient>
    );
  }

  const wInfo = getWeatherInfo();

  const Header = () => (
    <View>
      <LinearGradient colors={['#1b5e20', '#2e7d32']} style={styles.headerGrad}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>{getGreeting()},</Text>
            <Text style={styles.userName}>{user?.name || 'Plant Parent'} 🌱</Text>
          </View>
          <TouchableOpacity style={styles.notifBtn} onPress={() => navigation.navigate('Reminders')}>
            <Ionicons name="notifications-outline" size={22} color="#fff" />
            {needsWater.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{needsWater.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
        <Text style={styles.dateText}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </Text>
      </LinearGradient>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{plants.length}</Text>
          <Text style={styles.statLabel}>Total Plants</Text>
        </View>
        <View style={[styles.statCard, needsWater.length > 0 && styles.statCardUrgent]}>
          <Text style={[styles.statNum, needsWater.length > 0 && { color: '#dc2626' }]}>{needsWater.length}</Text>
          <Text style={styles.statLabel}>Need Water</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNum, { color: '#16a34a' }]}>{healthyCount}</Text>
          <Text style={styles.statLabel}>Healthy</Text>
        </View>
      </View>

      <View style={styles.weatherCard}>
        <View style={styles.weatherLeft}>
          <Ionicons name={wInfo.icon} size={30} color={wInfo.color} />
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={styles.weatherAdvice}>{wInfo.advice}</Text>
            {weather && (
              <Text style={styles.weatherDetail}>
                {Math.round(weather.main.temp)}°C · {weather.weather[0].description}
              </Text>
            )}
          </View>
        </View>
      </View>

      {needsWater.length > 0 && (
        <View style={styles.urgentSection}>
          <Text style={styles.sectionTitle}>Needs Water Now</Text>
          <FlatList
            data={needsWater}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={i => i.id}
            contentContainerStyle={{ gap: 10, paddingRight: 16 }}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.urgentCard} onPress={() => navigation.navigate('PlantDetail', { id: item.id })}>
                <Text style={styles.urgentEmoji}>{item.emoji || '🌿'}</Text>
                <Text style={styles.urgentName} numberOfLines={1}>{item.name}</Text>
                <View style={styles.urgentBadge}><Text style={styles.urgentBadgeText}>Water!</Text></View>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>All Plants</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Plants')}>
          <Text style={styles.seeAll}>See all</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <LinearGradient colors={['#f0faf4', '#f9fafb']} style={styles.root}>
      <FlatList
        data={plants}
        keyExtractor={i => i.id}
        ListHeaderComponent={Header}
        numColumns={2}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2e7d32" />}
        renderItem={({ item }) => {
          const water = getDaysUntilWater(item.lastWatered, item.wateringInterval);
          const fav   = isFavorite(item.id);
          const content = (
            <>
              <TouchableOpacity
                style={styles.heartBtn}
                onPress={() => toggleFavorite(item.id)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name={fav ? 'heart' : 'heart-outline'} size={16} color={fav ? '#ef4444' : '#d1d5db'} />
              </TouchableOpacity>

              {!item.photoUrl && <Text style={styles.plantEmoji}>{item.emoji || '🌿'}</Text>}
              <Text style={[styles.plantName, item.photoUrl && {color: '#fff'}]} numberOfLines={1}>{item.name}</Text>
              {item.species ? <Text style={[styles.plantSpecies, item.photoUrl && {color: '#e5e7eb'}]} numberOfLines={1}>{item.species}</Text> : null}
              <View style={[styles.waterBadge, water.urgent && styles.waterBadgeUrgent]}>
                <Ionicons name="water-outline" size={11} color={water.urgent ? '#dc2626' : '#2e7d32'} />
                <Text style={[styles.waterText, water.urgent && { color: '#dc2626' }]}>{water.label}</Text>
              </View>
            </>
          );

          if (item.photoUrl) {
            return (
              <TouchableOpacity style={[styles.plantCard, {padding: 0, overflow: 'hidden'}]} onPress={() => navigation.navigate('PlantDetail', { id: item.id })} activeOpacity={0.8}>
                <ImageBackground source={{ uri: item.photoUrl }} style={styles.cardImageBg} imageStyle={{ opacity: 0.9 }}>
                  <LinearGradient colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.7)']} style={styles.cardGradientOverlay}>
                    {content}
                  </LinearGradient>
                </ImageBackground>
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity
              style={styles.plantCard}
              onPress={() => navigation.navigate('PlantDetail', { id: item.id })}
              activeOpacity={0.8}
            >
              {content}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🌱</Text>
            <Text style={styles.emptyTitle}>No plants yet</Text>
            <Text style={styles.emptySubtitle}>Add your first plant to get started!</Text>
            <TouchableOpacity style={styles.emptyButton} onPress={() => navigation.navigate('AddPlant')}>
              <Text style={styles.emptyButtonText}>Add a Plant</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('AddPlant')} activeOpacity={0.85}>
        <LinearGradient colors={['#2e7d32', '#1b5e20']} style={styles.fabGrad}>
          <Ionicons name="add" size={28} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root:             { flex: 1 },
  headerGrad:       { paddingTop: 54, paddingBottom: 24, paddingHorizontal: 20 },
  headerTop:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  greeting:         { fontSize: 15, color: 'rgba(255,255,255,0.75)', fontWeight: '400' },
  userName:         { fontSize: 24, color: '#fff', fontWeight: '800' },
  dateText:         { fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  notifBtn:         { padding: 8, position: 'relative' },
  badge:            { position: 'absolute', top: 4, right: 4, width: 16, height: 16, borderRadius: 8, backgroundColor: '#ef4444', justifyContent: 'center', alignItems: 'center' },
  badgeText:        { fontSize: 10, color: '#fff', fontWeight: '700' },
  statsRow:         { flexDirection: 'row', gap: 10, marginHorizontal: 16, marginTop: -16, marginBottom: 14 },
  statCard:         { flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 14, alignItems: 'center', elevation: 3, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  statCardUrgent:   { borderWidth: 1, borderColor: '#fecaca' },
  statNum:          { fontSize: 26, fontWeight: '800', color: '#2e7d32' },
  statLabel:        { fontSize: 11, color: '#6b7280', marginTop: 2 },
  weatherCard:      { marginHorizontal: 16, marginBottom: 16, backgroundColor: '#fff', borderRadius: 16, padding: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  weatherLeft:      { flexDirection: 'row', alignItems: 'center' },
  weatherAdvice:    { fontSize: 14, color: '#1f2937', fontWeight: '600', lineHeight: 20 },
  weatherDetail:    { fontSize: 12, color: '#6b7280', marginTop: 3 },
  urgentSection:    { marginHorizontal: 16, marginBottom: 14 },
  urgentCard:       { width: 100, backgroundColor: '#fff', borderRadius: 16, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#fecaca', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  urgentEmoji:      { fontSize: 32, marginBottom: 6 },
  urgentName:       { fontSize: 12, color: '#1f2937', fontWeight: '600', textAlign: 'center' },
  urgentBadge:      { backgroundColor: '#fee2e2', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, marginTop: 6 },
  urgentBadgeText:  { fontSize: 11, color: '#dc2626', fontWeight: '600' },
  sectionHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 16, marginBottom: 10 },
  sectionTitle:     { fontSize: 17, fontWeight: '700', color: '#1f2937', marginBottom: 10 },
  seeAll:           { fontSize: 13, color: '#2e7d32', fontWeight: '600' },
  list:             { paddingHorizontal: 10, paddingBottom: 100 },
  plantCard:        { flex: 1, backgroundColor: '#fff', margin: 6, borderRadius: 20, padding: 16, alignItems: 'center', elevation: 3, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  heartBtn:         { position: 'absolute', top: 10, right: 10 },
  plantEmoji:       { fontSize: 40, marginBottom: 8 },
  plantName:        { fontSize: 15, fontWeight: '700', color: '#1f2937', textAlign: 'center' },
  plantSpecies:     { fontSize: 12, color: '#6b7280', textAlign: 'center', marginTop: 2 },
  waterBadge:       { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f0fdf4', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, marginTop: 8 },
  waterBadgeUrgent: { backgroundColor: '#fee2e2' },
  waterText:        { fontSize: 11, color: '#2e7d32', fontWeight: '600' },
  emptyContainer:   { alignItems: 'center', marginTop: 60, paddingHorizontal: 32 },
  emptyIcon:        { fontSize: 64, marginBottom: 16 },
  emptyTitle:       { fontSize: 20, fontWeight: '700', color: '#1f2937', marginBottom: 8 },
  emptySubtitle:    { fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 24 },
  emptyButton:      { backgroundColor: '#2e7d32', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 14 },
  emptyButtonText:  { color: '#fff', fontWeight: '700', fontSize: 15 },
  fab:              { position: 'absolute', bottom: 28, right: 20, width: 58, height: 58, borderRadius: 29, overflow: 'hidden', elevation: 8, shadowColor: '#2e7d32', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  fabGrad:          { flex: 1, justifyContent: 'center', alignItems: 'center' },
  cardImageBg:     { width: '100%', height: '100%', justifyContent: 'flex-end', minHeight: 180 },
  cardGradientOverlay: { flex: 1, padding: 16, alignItems: 'center', justifyContent: 'flex-end' },
});