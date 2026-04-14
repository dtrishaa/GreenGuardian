// src/screens/PlantsScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, RefreshControl, ScrollView, ImageBackground
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { db, auth } from '../services/firebase';
import { useFavorites } from '../contexts/FavoritesContext';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';

const getDaysUntilWater = (lastWatered, interval) => {
  if (!lastWatered) return { label: 'Soon', urgent: true };
  const diff = Math.ceil((new Date(lastWatered).getTime() + interval * 86400000 - Date.now()) / 86400000);
  if (diff <= 0) return { label: 'Today!', urgent: true };
  if (diff === 1) return { label: 'Tomorrow', urgent: false };
  return { label: `${diff}d`, urgent: false };
};

const SORT_OPTIONS = ['Name', 'Newest', 'Water Soon', 'Favorites'];

export default function PlantsScreen() {
  const navigation                     = useNavigation();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [plants,     setPlants]        = useState([]);
  const [search,     setSearch]        = useState('');
  const [sort,       setSort]          = useState('Newest');
  const [activeTag,  setActiveTag]     = useState(null);
  const [loading,    setLoading]       = useState(true);
  const [refreshing, setRefreshing]    = useState(false);

  useEffect(() => {
    const userId = auth.currentUser?.uid;
    if (!userId) { setLoading(false); return; }
    const unsub = db.collection('plants')
      .where('userId', '==', userId)
      .onSnapshot(snap => {
        setPlants(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
        setRefreshing(false);
      }, () => { setLoading(false); setRefreshing(false); });
    return () => unsub();
  }, []);

  // Collect all unique tags across plants
  const allTags = [...new Set(plants.flatMap(p => p.tags || []))].sort();

  const filtered = plants
    .filter(p => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return p.name.toLowerCase().includes(q) || (p.species || '').toLowerCase().includes(q);
    })
    .filter(p => {
      if (!activeTag) return true;
      return (p.tags || []).includes(activeTag);
    })
    .sort((a, b) => {
      if (sort === 'Name')       return a.name.localeCompare(b.name);
      if (sort === 'Newest')     return new Date(b.createdAt) - new Date(a.createdAt);
      if (sort === 'Favorites')  return (isFavorite(b.id) ? 1 : 0) - (isFavorite(a.id) ? 1 : 0);
      if (sort === 'Water Soon') {
        const dA = getDaysUntilWater(a.lastWatered, a.wateringInterval);
        const dB = getDaysUntilWater(b.lastWatered, b.wateringInterval);
        return (dA.urgent ? -1 : 1) - (dB.urgent ? -1 : 1);
      }
      return 0;
    });

  if (loading) {
    return (
      <LinearGradient colors={['#f0faf4', '#f9fafb']} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2e7d32" />
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#f0faf4', '#f9fafb']} style={styles.root}>
      <LinearGradient colors={['#1b5e20', '#2e7d32']} style={styles.header}>
        <Text style={styles.headerTitle}>My Plants</Text>
        <Text style={styles.headerSub}>{plants.length} plant{plants.length !== 1 ? 's' : ''} in your garden</Text>
      </LinearGradient>

      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color="#9ca3af" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search plants..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor="#9ca3af"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Sort chips */}
       <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortRow}>
        {SORT_OPTIONS.map(opt => (
          <TouchableOpacity
            key={opt}
            style={[styles.sortChip, sort === opt && styles.sortChipActive]}
            onPress={() => setSort(opt)}
          >
            <Text style={[styles.sortText, sort === opt && styles.sortTextActive]}>{opt}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Tag filter chips */}
      {allTags.length > 0 && (
         <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tagRow}>
          <TouchableOpacity
            style={[styles.tagChip, !activeTag && styles.tagChipActive]}
            onPress={() => setActiveTag(null)}
          >
            <Text style={[styles.tagText, !activeTag && styles.tagTextActive]}>All</Text>
          </TouchableOpacity>
          {allTags.map(tag => (
            <TouchableOpacity
              key={tag}
              style={[styles.tagChip, activeTag === tag && styles.tagChipActive]}
              onPress={() => setActiveTag(activeTag === tag ? null : tag)}
            >
              <Text style={[styles.tagText, activeTag === tag && styles.tagTextActive]}>{tag}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <FlatList
        data={filtered}
        keyExtractor={i => i.id}
        numColumns={2}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => setRefreshing(true)} tintColor="#2e7d32" />}
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
                <Ionicons name={fav ? 'heart' : 'heart-outline'} size={18} color={fav ? '#ef4444' : '#d1d5db'} />
              </TouchableOpacity>

              {!item.photoUrl && <Text style={styles.cardEmoji}>{item.emoji || '🌿'}</Text>}
              <Text style={[styles.cardName, item.photoUrl && {color: '#fff'}]} numberOfLines={1}>{item.name}</Text>
              {item.species ? <Text style={[styles.cardSpecies, item.photoUrl && {color: '#e5e7eb'}]} numberOfLines={1}>{item.species}</Text> : null}

              {item.tags?.length > 0 && (
                <View style={styles.cardTagPill}>
                  <Text style={styles.cardTagText}>{item.tags[0]}{item.tags.length > 1 ? ` +${item.tags.length - 1}` : ''}</Text>
                </View>
              )}

              <View style={[styles.waterBadge, water.urgent && styles.waterBadgeUrgent]}>
                <Ionicons name="water-outline" size={11} color={water.urgent ? '#dc2626' : '#2e7d32'} />
                <Text style={[styles.waterText, water.urgent && { color: '#dc2626' }]}>{water.label}</Text>
              </View>
            </>
          );

          if (item.photoUrl) {
            return (
              <TouchableOpacity style={[styles.card, {padding: 0, overflow: 'hidden'}]} onPress={() => navigation.navigate('PlantDetail', { id: item.id })} activeOpacity={0.8}>
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
              style={styles.card}
              onPress={() => navigation.navigate('PlantDetail', { id: item.id })}
              activeOpacity={0.8}
            >
              {content}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyTitle}>{search || activeTag ? 'No results found' : 'No plants yet'}</Text>
            <Text style={styles.emptyText}>{search || activeTag ? 'Try a different search or tag' : 'Tap + to add your first plant'}</Text>
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

// Styles – adjust sortRow, tagRow, and card for better spacing
const styles = StyleSheet.create({
  root:            { flex: 1 },
  header:          { paddingTop: 54, paddingBottom: 20, paddingHorizontal: 20 },
  headerTitle:     { fontSize: 28, fontWeight: '800', color: '#fff' },
  headerSub:       { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  searchRow:       { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 },
  searchBar:       { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, gap: 8, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  searchInput:     { flex: 1, fontSize: 15, color: '#1f2937' },
  sortRow:         { paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  tagRow:          { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  sortChip:        { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb' },
  sortChipActive:  { backgroundColor: '#2e7d32', borderColor: '#2e7d32' },
  sortText:        { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  sortTextActive:  { color: '#fff' },
  tagChip:         { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1fae5' },
  tagChipActive:   { backgroundColor: '#d1fae5', borderColor: '#2e7d32' },
  tagText:         { fontSize: 12, color: '#6b7280', fontWeight: '500' },
  tagTextActive:   { color: '#2e7d32', fontWeight: '700' },
  grid:            { paddingHorizontal: 10, paddingBottom: 100 },
  card:            { flex: 1, backgroundColor: '#fff', margin: 6, borderRadius: 20, padding: 16, alignItems: 'center', elevation: 3, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  heartBtn:        { position: 'absolute', top: 10, right: 10 },
  cardEmoji:       { fontSize: 44, marginBottom: 8 },
  cardName:        { fontSize: 15, fontWeight: '700', color: '#1f2937', textAlign: 'center' },
  cardSpecies:     { fontSize: 12, color: '#6b7280', textAlign: 'center', marginTop: 2 },
  cardTagPill:     { backgroundColor: '#f0fdf4', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, marginTop: 5 },
  cardTagText:     { fontSize: 10, color: '#2e7d32', fontWeight: '600' },
  waterBadge:      { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f0fdf4', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, marginTop: 8 },
  waterBadgeUrgent:{ backgroundColor: '#fee2e2' },
  waterText:       { fontSize: 11, color: '#2e7d32', fontWeight: '600' },
  empty:           { alignItems: 'center', marginTop: 60 },
  emptyIcon:       { fontSize: 48, marginBottom: 12 },
  emptyTitle:      { fontSize: 18, fontWeight: '700', color: '#1f2937', marginBottom: 6 },
  emptyText:       { fontSize: 14, color: '#6b7280' },
  fab:             { position: 'absolute', bottom: 28, right: 20, width: 56, height: 56, borderRadius: 28, overflow: 'hidden', elevation: 8, shadowColor: '#2e7d32', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  fabGrad:         { flex: 1, justifyContent: 'center', alignItems: 'center' },
  cardImageBg:     { width: '100%', height: '100%', justifyContent: 'flex-end', minHeight: 180 },
  cardGradientOverlay: { flex: 1, padding: 16, alignItems: 'center', justifyContent: 'flex-end' },
});