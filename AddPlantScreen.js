// src/screens/AddPlantScreen.js
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ScrollView, ActivityIndicator, Image
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { uploadPlantImageAsync } from '../services/StorageService';
import { useNavigation } from '@react-navigation/native';
import { db, auth } from '../services/firebase';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';

const EMOJI_OPTIONS = ['🌿', '🌱', '🪴', '🌵', '🌴', '🌸', '🌺', '🌻', '🍀', '🎍', '🎋', '🌾', '🍃', '🌳', '🌲'];

const TAGS = ['Indoor', 'Outdoor', 'Succulent', 'Tropical', 'Flowering', 'Herb', 'Tree', 'Vine', 'Aquatic'];

export default function AddPlantScreen() {
  const navigation = useNavigation();
  const [form, setForm] = useState({
    name: '',
    species: '',
    wateringInterval: '',
    fertilizeInterval: '',
    mistInterval: '',
    repotInterval: '',
    emoji: '🌿',
    notes: '',
    tags: [],
    photoUri: null,
  });
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState('');

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleTag = (tag) => {
    setForm(f => ({
      ...f,
      tags: f.tags.includes(tag)
        ? f.tags.filter(t => t !== tag)
        : [...f.tags, tag],
    }));
  };

  const pickImage = async (useCamera = false) => {
    let result;
    const options = {
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    };
    try {
      if (useCamera) {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (perm.status !== 'granted') {
          Alert.alert('Permission Denied', 'Camera access is required to take photos.');
          return;
        }
        result = await ImagePicker.launchCameraAsync(options);
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (perm.status !== 'granted') {
          Alert.alert('Permission Denied', 'Gallery access is required to pick photos.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync(options);
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        update('photoUri', result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image.');
    }
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) { Alert.alert('Required', 'Plant name is required'); return; }
    const waterInt = parseInt(form.wateringInterval);
    if (!waterInt || waterInt <= 0) { Alert.alert('Required', 'Enter a valid watering interval (days)'); return; }
    setLoading(true);
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) throw new Error('You must be logged in');

      let photoUrl = null;
      if (form.photoUri) {
        photoUrl = await uploadPlantImageAsync(form.photoUri, userId);
      }

      await db.collection('plants').add({
        name: form.name.trim(),
        species: form.species.trim(),
        wateringInterval: waterInt,
        emoji: form.emoji || '🌿',
        photoUrl: photoUrl,
        notes: form.notes.trim(),
        tags: form.tags,
        userId,
        createdAt: new Date().toISOString(),
        lastWatered: new Date().toISOString(),
        lastFertilized: null,
        lastMisted: null,
        lastRepotted: null,
        reminders: {
          water: waterInt,
          fertilize: parseInt(form.fertilizeInterval) || null,
          mist: parseInt(form.mistInterval) || null,
          repot: parseInt(form.repotInterval) || null,
        },
      });
      Alert.alert('Added!', `${form.name} has been added to your garden!`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) { Alert.alert('Error', e.message); }
    finally { setLoading(false); }
  };

  const inputStyle = (field) => [styles.input, focused === field && styles.inputFocused];

  return (
    <LinearGradient colors={['#f0faf4', '#f9fafb']} style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <LinearGradient colors={['#1b5e20', '#2e7d32']} style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add New Plant</Text>
          <Text style={styles.headerSub}>Fill in the details for your plant</Text>
        </LinearGradient>

        <View style={styles.body}>
          {/* Photo picker */}
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Plant Photo</Text>
            {form.photoUri ? (
              <View style={styles.photoContainer}>
                <Image source={{ uri: form.photoUri }} style={styles.photoPreview} />
                <TouchableOpacity style={styles.removePhotoBtn} onPress={() => update('photoUri', null)}>
                  <Ionicons name="close-circle" size={24} color="#dc2626" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.photoActionRow}>
                <TouchableOpacity style={styles.photoActionBtn} onPress={() => pickImage(true)}>
                  <Ionicons name="camera-outline" size={24} color="#2e7d32" />
                  <Text style={styles.photoActionText}>Take Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.photoActionBtn} onPress={() => pickImage(false)}>
                  <Ionicons name="image-outline" size={24} color="#2e7d32" />
                  <Text style={styles.photoActionText}>Gallery</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Emoji picker - Fallback */}
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Or Choose an Emoji</Text>
            <View style={styles.emojiGrid}>
              {EMOJI_OPTIONS.map(e => (
                <TouchableOpacity
                  key={e}
                  style={[styles.emojiOption, form.emoji === e && styles.emojiSelected]}
                  onPress={() => update('emoji', e)}
                >
                  <Text style={styles.emojiText}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.selectedPreview}>
              <Text style={styles.selectedEmoji}>{form.emoji}</Text>
              <Text style={styles.selectedLabel}>Selected</Text>
            </View>
          </View>

          {/* Basic Info */}
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Plant Details</Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Plant Name <Text style={{ color: '#dc2626' }}>*</Text></Text>
              <TextInput
                style={inputStyle('name')}
                placeholder="e.g. My Monstera"
                value={form.name}
                onChangeText={v => update('name', v)}
                onFocus={() => setFocused('name')}
                onBlur={() => setFocused('')}
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Species <Text style={styles.optionalLabel}>(optional)</Text></Text>
              <TextInput
                style={inputStyle('species')}
                placeholder="e.g. Monstera deliciosa"
                value={form.species}
                onChangeText={v => update('species', v)}
                onFocus={() => setFocused('species')}
                onBlur={() => setFocused('')}
                placeholderTextColor="#9ca3af"
              />
            </View>
          </View>

          {/* Reminders Section */}
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Reminders (days between tasks)</Text>
            
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Water every <Text style={{ color: '#dc2626' }}>*</Text></Text>
              <View style={styles.intervalRow}>
                <TextInput
                  style={[inputStyle('wateringInterval'), styles.intervalInput]}
                  placeholder="7"
                  value={form.wateringInterval}
                  onChangeText={v => update('wateringInterval', v)}
                  keyboardType="numeric"
                  onFocus={() => setFocused('wateringInterval')}
                  onBlur={() => setFocused('')}
                  placeholderTextColor="#9ca3af"
                />
                <View style={styles.intervalSuffix}>
                  <Text style={styles.intervalSuffixText}>days</Text>
                </View>
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Fertilise every <Text style={styles.optionalLabel}>(optional)</Text></Text>
              <View style={styles.intervalRow}>
                <TextInput
                  style={[inputStyle('fertilizeInterval'), styles.intervalInput]}
                  placeholder="14"
                  value={form.fertilizeInterval}
                  onChangeText={v => update('fertilizeInterval', v)}
                  keyboardType="numeric"
                  onFocus={() => setFocused('fertilizeInterval')}
                  onBlur={() => setFocused('')}
                  placeholderTextColor="#9ca3af"
                />
                <View style={styles.intervalSuffix}>
                  <Text style={styles.intervalSuffixText}>days</Text>
                </View>
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Mist every <Text style={styles.optionalLabel}>(optional)</Text></Text>
              <View style={styles.intervalRow}>
                <TextInput
                  style={[inputStyle('mistInterval'), styles.intervalInput]}
                  placeholder="3"
                  value={form.mistInterval}
                  onChangeText={v => update('mistInterval', v)}
                  keyboardType="numeric"
                  onFocus={() => setFocused('mistInterval')}
                  onBlur={() => setFocused('')}
                  placeholderTextColor="#9ca3af"
                />
                <View style={styles.intervalSuffix}>
                  <Text style={styles.intervalSuffixText}>days</Text>
                </View>
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Repot every <Text style={styles.optionalLabel}>(optional)</Text></Text>
              <View style={styles.intervalRow}>
                <TextInput
                  style={[inputStyle('repotInterval'), styles.intervalInput]}
                  placeholder="365"
                  value={form.repotInterval}
                  onChangeText={v => update('repotInterval', v)}
                  keyboardType="numeric"
                  onFocus={() => setFocused('repotInterval')}
                  onBlur={() => setFocused('')}
                  placeholderTextColor="#9ca3af"
                />
                <View style={styles.intervalSuffix}>
                  <Text style={styles.intervalSuffixText}>days</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Tags */}
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Tags <Text style={styles.optionalLabel}>(optional)</Text></Text>
            <View style={styles.tagsWrap}>
              {TAGS.map(tag => (
                <TouchableOpacity
                  key={tag}
                  style={[styles.tagChip, form.tags.includes(tag) && styles.tagChipActive]}
                  onPress={() => toggleTag(tag)}
                >
                  <Text style={[styles.tagText, form.tags.includes(tag) && styles.tagTextActive]}>
                    {tag}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Care Notes */}
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Care Notes <Text style={styles.optionalLabel}>(optional)</Text></Text>
            <TextInput
              style={[inputStyle('notes'), styles.notesInput]}
              placeholder="e.g. Fertilise monthly, likes bright indirect light, prune in spring..."
              value={form.notes}
              onChangeText={v => update('notes', v)}
              onFocus={() => setFocused('notes')}
              onBlur={() => setFocused('')}
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading} activeOpacity={0.85}>
            <LinearGradient colors={['#2e7d32', '#1b5e20']} style={styles.submitGrad}>
              {loading
                ? <ActivityIndicator color="#fff" />
                : <><Ionicons name="add-circle-outline" size={20} color="#fff" /><Text style={styles.submitText}>Add to My Garden</Text></>
              }
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root:               { flex: 1 },
  header:             { paddingTop: 54, paddingBottom: 28, paddingHorizontal: 20 },
  backBtn:            { marginBottom: 12 },
  headerTitle:        { fontSize: 26, fontWeight: '800', color: '#fff' },
  headerSub:          { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  body:               { padding: 16, gap: 14 },
  card:               { backgroundColor: '#fff', borderRadius: 20, padding: 18, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  sectionLabel:       { fontSize: 15, fontWeight: '700', color: '#1f2937', marginBottom: 14 },
  photoActionRow:     { flexDirection: 'row', gap: 10 },
  photoActionBtn:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#f0fdf4', paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#bbf7d0' },
  photoActionText:    { color: '#2e7d32', fontWeight: '600', fontSize: 14 },
  photoContainer:     { position: 'relative', alignItems: 'center', marginVertical: 10 },
  photoPreview:       { width: '100%', height: 200, borderRadius: 16, backgroundColor: '#f3f4f6' },
  removePhotoBtn:     { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: 12 },
  emojiGrid:          { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  emojiOption:        { width: 48, height: 48, borderRadius: 12, backgroundColor: '#f9fafb', justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#e5e7eb' },
  emojiSelected:      { backgroundColor: '#f0fdf4', borderColor: '#2e7d32' },
  emojiText:          { fontSize: 24 },
  selectedPreview:    { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: '#f9fafb', borderRadius: 12 },
  selectedEmoji:      { fontSize: 36 },
  selectedLabel:      { fontSize: 14, color: '#6b7280' },
  fieldGroup:         { marginBottom: 16 },
  fieldLabel:         { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  optionalLabel:      { fontSize: 12, color: '#9ca3af', fontWeight: '400' },
  input:              { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingVertical: 13, paddingHorizontal: 14, fontSize: 15, color: '#111827', backgroundColor: '#fafafa' },
  inputFocused:       { borderColor: '#2e7d32', backgroundColor: '#fff' },
  intervalRow:        { flexDirection: 'row', gap: 10 },
  intervalInput:      { flex: 1 },
  intervalSuffix:     { justifyContent: 'center', paddingHorizontal: 16, backgroundColor: '#f3f4f6', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  intervalSuffixText: { fontSize: 14, color: '#374151', fontWeight: '600' },
  tagsWrap:           { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagChip:            { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f3f4f6', borderWidth: 1.5, borderColor: '#e5e7eb' },
  tagChipActive:      { backgroundColor: '#f0fdf4', borderColor: '#2e7d32' },
  tagText:            { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  tagTextActive:      { color: '#2e7d32', fontWeight: '700' },
  notesInput:         { minHeight: 100, paddingTop: 12 },
  submitBtn:          { borderRadius: 16, overflow: 'hidden', marginBottom: 32, elevation: 6, shadowColor: '#2e7d32', shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  submitGrad:         { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 17 },
  submitText:         { color: '#fff', fontSize: 17, fontWeight: '700' },
});