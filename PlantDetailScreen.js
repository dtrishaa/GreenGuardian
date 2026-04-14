// src/screens/PlantDetailScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ScrollView, ActivityIndicator, ImageBackground, Image
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { uploadPlantImageAsync } from '../services/StorageService';
import { useNavigation, useRoute } from '@react-navigation/native';
import { db, auth } from '../services/firebase';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';

const TAGS = ['Indoor', 'Outdoor', 'Succulent', 'Tropical', 'Flowering', 'Herb', 'Tree', 'Vine', 'Aquatic'];

const getDaysUntil = (lastDate, interval) => {
  if (!lastDate) return { label: 'Soon', urgent: true, days: 0 };
  const diff = Math.ceil((new Date(lastDate).getTime() + interval * 86400000 - Date.now()) / 86400000);
  if (diff <= 0) return { label: 'Today!', urgent: true, days: diff };
  if (diff === 1) return { label: 'Tomorrow', urgent: false, days: 1 };
  return { label: `In ${diff} days`, urgent: false, days: diff };
};

export default function PlantDetailScreen() {
  const navigation = useNavigation();
  const { id } = useRoute().params;
  const [plant, setPlant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState({});
  const [form, setForm] = useState({
    name: '', species: '', wateringInterval: '',
    fertilizeInterval: '', mistInterval: '', repotInterval: '',
    emoji: '', notes: '', tags: [], photoUri: null, photoUrl: null,
  });

  useEffect(() => { loadPlant(); }, []);

  const loadPlant = async () => {
    try {
      const doc = await db.collection('plants').doc(id).get();
      if (!doc.exists) { Alert.alert('Error', 'Plant not found'); navigation.goBack(); return; }
      const data = doc.data();
      if (data.userId !== auth.currentUser?.uid) { Alert.alert('Error', 'Access denied'); navigation.goBack(); return; }
      setPlant({ id: doc.id, ...data });
      setForm({
        name: data.name,
        species: data.species || '',
        wateringInterval: String(data.wateringInterval),
        fertilizeInterval: data.reminders?.fertilize ? String(data.reminders.fertilize) : '',
        mistInterval: data.reminders?.mist ? String(data.reminders.mist) : '',
        repotInterval: data.reminders?.repot ? String(data.reminders.repot) : '',
        emoji: data.emoji || '🌿',
        notes: data.notes || '',
        tags: data.tags || [],
        photoUri: null,
        photoUrl: data.photoUrl || null,
      });
    } catch (e) { Alert.alert('Error', e.message); }
    finally { setLoading(false); }
  };

  const handleAction = async (type, field) => {
    const now = new Date().toISOString();
    setActionLoading(prev => ({ ...prev, [type]: true }));
    try {
      await db.collection('plants').doc(id).update({ [field]: now });
      setPlant(p => ({ ...p, [field]: now }));
      Alert.alert('Done!', `${plant.name} ${type} recorded.`);
    } catch (e) { Alert.alert('Error', e.message); }
    finally { setActionLoading(prev => ({ ...prev, [type]: false })); }
  };

  const handleSave = async () => {
    if (!form.name.trim()) { Alert.alert('Error', 'Plant name is required'); return; }
    const waterInt = parseInt(form.wateringInterval);
    if (!waterInt || waterInt <= 0) { Alert.alert('Error', 'Enter a valid watering interval'); return; }
    setSaving(true);
    try {
      let finalPhotoUrl = plant.photoUrl;
      if (form.photoUri) {
        finalPhotoUrl = await uploadPlantImageAsync(form.photoUri, auth.currentUser?.uid);
      }

      const updates = {
        name: form.name.trim(),
        species: form.species.trim(),
        wateringInterval: waterInt,
        emoji: form.emoji.trim() || '🌿',
        photoUrl: finalPhotoUrl || null,
        notes: form.notes.trim(),
        tags: form.tags,
        updatedAt: new Date().toISOString(),
        reminders: {
          water: waterInt,
          fertilize: parseInt(form.fertilizeInterval) || null,
          mist: parseInt(form.mistInterval) || null,
          repot: parseInt(form.repotInterval) || null,
        },
      };
      await db.collection('plants').doc(id).update(updates);
      setEditing(false);
      loadPlant();
    } catch (e) { Alert.alert('Error', e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = () => {
    Alert.alert('Delete Plant', `Delete "${plant.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await db.collection('plants').doc(id).delete(); navigation.goBack(); }
        catch (e) { Alert.alert('Error', e.message); }
      }},
    ]);
  };

  const toggleTag = (tag) => {
    setForm(f => ({
      ...f,
      tags: f.tags.includes(tag) ? f.tags.filter(t => t !== tag) : [...f.tags, tag],
    }));
  };

  const pickImage = async (useCamera = false) => {
    let result;
    const options = { mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [4, 3], quality: 0.7 };
    try {
      if (useCamera) {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (perm.status !== 'granted') { Alert.alert('Permission Denied', 'Camera access is required.'); return; }
        result = await ImagePicker.launchCameraAsync(options);
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (perm.status !== 'granted') { Alert.alert('Permission Denied', 'Gallery access is required.'); return; }
        result = await ImagePicker.launchImageLibraryAsync(options);
      }
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setForm(f => ({ ...f, photoUri: result.assets[0].uri }));
      }
    } catch (error) { Alert.alert('Error', 'Failed to pick image.'); }
  };

  if (loading) {
    return (
      <LinearGradient colors={['#f0faf4', '#f9fafb']} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2e7d32" />
      </LinearGradient>
    );
  }

  const waterStatus = getDaysUntil(plant.lastWatered, plant.wateringInterval);
  const fertStatus = plant.reminders?.fertilize ? getDaysUntil(plant.lastFertilized, plant.reminders.fertilize) : null;
  const mistStatus = plant.reminders?.mist ? getDaysUntil(plant.lastMisted, plant.reminders.mist) : null;
  const repotStatus = plant.reminders?.repot ? getDaysUntil(plant.lastRepotted, plant.reminders.repot) : null;

  const lastWateredStr = plant.lastWatered ? new Date(plant.lastWatered).toLocaleDateString() : 'Never';
  const lastFertStr = plant.lastFertilized ? new Date(plant.lastFertilized).toLocaleDateString() : 'Never';
  const lastMistStr = plant.lastMisted ? new Date(plant.lastMisted).toLocaleDateString() : 'Never';
  const lastRepotStr = plant.lastRepotted ? new Date(plant.lastRepotted).toLocaleDateString() : 'Never';

  return (
    <LinearGradient colors={['#f0faf4', '#f9fafb']} style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero */}
        {plant.photoUrl ? (
          <ImageBackground source={{ uri: plant.photoUrl }} style={[styles.hero, styles.heroImage]} imageStyle={{ opacity: 0.8, backgroundColor: '#000' }}>
            <LinearGradient colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)']} style={StyleSheet.absoluteFillObject} />
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>
            <View style={{ marginTop: 24, alignItems: 'center' }}>
              <Text style={styles.heroName}>{plant.name}</Text>
              {plant.species && <Text style={styles.heroSpecies}>{plant.species}</Text>}
              {(plant.tags?.length > 0) && (
                <View style={styles.heroTagsRow}>
                  {plant.tags.map(tag => (
                    <View key={tag} style={styles.heroTag}><Text style={styles.heroTagText}>{tag}</Text></View>
                  ))}
                </View>
              )}
              <View style={[styles.waterStatusBadge, waterStatus.urgent && styles.waterStatusUrgent]}>
                <Ionicons name="water-outline" size={14} color={waterStatus.urgent ? '#dc2626' : '#2e7d32'} />
                <Text style={[styles.waterStatusText, waterStatus.urgent && { color: '#dc2626' }]}>{waterStatus.label}</Text>
              </View>
            </View>
          </ImageBackground>
        ) : (
          <LinearGradient colors={['#1b5e20', '#2e7d32']} style={styles.hero}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.heroEmoji}>{plant.emoji || '🌿'}</Text>
            <Text style={styles.heroName}>{plant.name}</Text>
            {plant.species && <Text style={styles.heroSpecies}>{plant.species}</Text>}
            {(plant.tags?.length > 0) && (
              <View style={styles.heroTagsRow}>
                {plant.tags.map(tag => (
                  <View key={tag} style={styles.heroTag}>
                    <Text style={styles.heroTagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            )}
            <View style={[styles.waterStatusBadge, waterStatus.urgent && styles.waterStatusUrgent]}>
              <Ionicons name="water-outline" size={14} color={waterStatus.urgent ? '#dc2626' : '#2e7d32'} />
              <Text style={[styles.waterStatusText, waterStatus.urgent && { color: '#dc2626' }]}>{waterStatus.label}</Text>
            </View>
          </LinearGradient>
        )}

        <View style={styles.body}>
          {!editing ? (
            <>
              {/* Info cards */}
              <View style={styles.infoGrid}>
                <View style={styles.infoCard}>
                  <Ionicons name="water-outline" size={22} color="#3b82f6" />
                  <Text style={styles.infoValue}>Every {plant.wateringInterval}d</Text>
                  <Text style={styles.infoLabel}>Water</Text>
                </View>
                {plant.reminders?.fertilize && (
                  <View style={styles.infoCard}>
                    <Ionicons name="leaf-outline" size={22} color="#10b981" />
                    <Text style={styles.infoValue}>Every {plant.reminders.fertilize}d</Text>
                    <Text style={styles.infoLabel}>Fertilise</Text>
                  </View>
                )}
                {plant.reminders?.mist && (
                  <View style={styles.infoCard}>
                    <Ionicons name="water-outline" size={22} color="#8b5cf6" />
                    <Text style={styles.infoValue}>Every {plant.reminders.mist}d</Text>
                    <Text style={styles.infoLabel}>Mist</Text>
                  </View>
                )}
                {plant.reminders?.repot && (
                  <View style={styles.infoCard}>
                    <Ionicons name="archive-outline" size={22} color="#f59e0b" />
                    <Text style={styles.infoValue}>Every {plant.reminders.repot}d</Text>
                    <Text style={styles.infoLabel}>Repot</Text>
                  </View>
                )}
              </View>

              {/* Action buttons */}
              <View style={styles.actionGrid}>
                <TouchableOpacity style={styles.actionCard} onPress={() => handleAction('watered', 'lastWatered')} disabled={actionLoading.watered}>
                  {actionLoading.watered ? <ActivityIndicator size="small" color="#2e7d32" /> : <><Ionicons name="water" size={24} color="#2e7d32" /><Text style={styles.actionText}>Watered</Text></>}
                </TouchableOpacity>
                {plant.reminders?.fertilize && (
                  <TouchableOpacity style={styles.actionCard} onPress={() => handleAction('fertilised', 'lastFertilized')} disabled={actionLoading.fertilised}>
                    {actionLoading.fertilised ? <ActivityIndicator size="small" color="#2e7d32" /> : <><Ionicons name="leaf" size={24} color="#2e7d32" /><Text style={styles.actionText}>Fertilised</Text></>}
                  </TouchableOpacity>
                )}
                {plant.reminders?.mist && (
                  <TouchableOpacity style={styles.actionCard} onPress={() => handleAction('misted', 'lastMisted')} disabled={actionLoading.misted}>
                    {actionLoading.misted ? <ActivityIndicator size="small" color="#2e7d32" /> : <><Ionicons name="water-outline" size={24} color="#2e7d32" /><Text style={styles.actionText}>Misted</Text></>}
                  </TouchableOpacity>
                )}
                {plant.reminders?.repot && (
                  <TouchableOpacity style={styles.actionCard} onPress={() => handleAction('repotted', 'lastRepotted')} disabled={actionLoading.repotted}>
                    {actionLoading.repotted ? <ActivityIndicator size="small" color="#2e7d32" /> : <><Ionicons name="archive-outline" size={24} color="#2e7d32" /><Text style={styles.actionText}>Repotted</Text></>}
                  </TouchableOpacity>
                )}
              </View>

              {/* Last done dates */}
              <View style={styles.lastDatesCard}>
                <Text style={styles.lastDatesTitle}>Last done</Text>
                <Text>💧 Water: {lastWateredStr}</Text>
                {plant.reminders?.fertilize && <Text>🌿 Fertilise: {lastFertStr}</Text>}
                {plant.reminders?.mist && <Text>💨 Mist: {lastMistStr}</Text>}
                {plant.reminders?.repot && <Text>🪴 Repot: {lastRepotStr}</Text>}
              </View>

              {plant.notes && (
                <View style={styles.notesCard}>
                  <View style={styles.notesHeader}>
                    <Ionicons name="document-text-outline" size={18} color="#2e7d32" />
                    <Text style={styles.notesTitle}>Care Notes</Text>
                  </View>
                  <Text style={styles.notesText}>{plant.notes}</Text>
                </View>
              )}

              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(true)}>
                  <Ionicons name="pencil-outline" size={18} color="#2e7d32" />
                  <Text style={styles.editBtnText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
                  <Ionicons name="trash-outline" size={18} color="#dc2626" />
                  <Text style={styles.deleteBtnText}>Delete</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.createdText}>Added {new Date(plant.createdAt).toLocaleDateString()}</Text>
            </>
          ) : (
            // Edit form
            <View style={styles.editForm}>
              <Text style={styles.editTitle}>Edit Plant</Text>

              <Text style={styles.sectionLabel}>Update Photo</Text>
              {(form.photoUri || form.photoUrl) ? (
                <View style={styles.photoContainer}>
                  <Image source={{ uri: form.photoUri || form.photoUrl }} style={styles.photoPreview} />
                  <TouchableOpacity style={styles.removePhotoBtn} onPress={() => setForm(f=>({...f,photoUri:null,photoUrl:null}))}>
                    <Ionicons name="close-circle" size={24} color="#dc2626" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.photoActionRow}>
                  <TouchableOpacity style={styles.photoActionBtn} onPress={() => pickImage(true)}>
                    <Ionicons name="camera-outline" size={24} color="#2e7d32" />
                    <Text style={styles.photoActionText}>Camera</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.photoActionBtn} onPress={() => pickImage(false)}>
                    <Ionicons name="image-outline" size={24} color="#2e7d32" />
                    <Text style={styles.photoActionText}>Gallery</Text>
                  </TouchableOpacity>
                </View>
              )}

              <TextInput style={[styles.input, {marginTop: 16}]} placeholder="Name *" value={form.name} onChangeText={v => setForm(f=>({...f,name:v}))} />
              <TextInput style={styles.input} placeholder="Species" value={form.species} onChangeText={v => setForm(f=>({...f,species:v}))} />
              <TextInput style={styles.input} placeholder="Water every (days) *" value={form.wateringInterval} onChangeText={v => setForm(f=>({...f,wateringInterval:v}))} keyboardType="numeric" />
              <TextInput style={styles.input} placeholder="Fertilise every (days, optional)" value={form.fertilizeInterval} onChangeText={v => setForm(f=>({...f,fertilizeInterval:v}))} keyboardType="numeric" />
              <TextInput style={styles.input} placeholder="Mist every (days, optional)" value={form.mistInterval} onChangeText={v => setForm(f=>({...f,mistInterval:v}))} keyboardType="numeric" />
              <TextInput style={styles.input} placeholder="Repot every (days, optional)" value={form.repotInterval} onChangeText={v => setForm(f=>({...f,repotInterval:v}))} keyboardType="numeric" />
              <TextInput style={styles.input} placeholder="Emoji" value={form.emoji} onChangeText={v => setForm(f=>({...f,emoji:v}))} maxLength={2} />
              <View style={styles.tagsWrap}>
                {TAGS.map(tag => (
                  <TouchableOpacity key={tag} style={[styles.tagChip, form.tags.includes(tag) && styles.tagChipActive]} onPress={() => toggleTag(tag)}>
                    <Text style={[styles.tagText, form.tags.includes(tag) && styles.tagTextActive]}>{tag}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput style={[styles.input, styles.notesInput]} placeholder="Care notes" value={form.notes} onChangeText={v => setForm(f=>({...f,notes:v}))} multiline numberOfLines={4} />
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                <LinearGradient colors={['#2e7d32', '#1b5e20']} style={styles.saveBtnGrad}>
                  {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditing(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: { paddingTop: 54, paddingBottom: 32, alignItems: 'center', minHeight: 220, justifyContent: 'center' },
  heroImage: { width: '100%', resizeMode: 'cover' },
  backBtn: { position: 'absolute', top: 54, left: 16, padding: 8, zIndex: 10 },
  heroEmoji: { fontSize: 72, marginBottom: 10 },
  heroName: { fontSize: 28, fontWeight: '800', color: '#fff' },
  heroSpecies: { fontSize: 15, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  heroTagsRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginTop: 10 },
  heroTag: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  heroTagText: { fontSize: 12, color: '#fff', fontWeight: '600' },
  waterStatusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, marginTop: 14 },
  waterStatusUrgent: { backgroundColor: '#fee2e2' },
  waterStatusText: { fontSize: 14, color: '#2e7d32', fontWeight: '600' },
  body: { padding: 20 },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  infoCard: { flex: 1, minWidth: 90, backgroundColor: '#fff', borderRadius: 16, padding: 12, alignItems: 'center', gap: 4, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  infoValue: { fontSize: 13, fontWeight: '700', color: '#1f2937', textAlign: 'center' },
  infoLabel: { fontSize: 11, color: '#6b7280', textAlign: 'center' },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  actionCard: { flex: 1, minWidth: 80, backgroundColor: '#fff', borderRadius: 16, padding: 12, alignItems: 'center', elevation: 2, gap: 6 },
  actionText: { fontSize: 12, fontWeight: '600', color: '#2e7d32' },
  lastDatesCard: { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 16, gap: 4 },
  lastDatesTitle: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 8 },
  notesCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14, elevation: 2 },
  notesHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  notesTitle: { fontSize: 14, fontWeight: '700', color: '#2e7d32' },
  notesText: { fontSize: 14, color: '#374151', lineHeight: 20 },
  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  editBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#f0fdf4', borderRadius: 14, paddingVertical: 14, borderWidth: 1, borderColor: '#bbf7d0' },
  editBtnText: { color: '#2e7d32', fontWeight: '600', fontSize: 15 },
  deleteBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#fef2f2', borderRadius: 14, paddingVertical: 14, borderWidth: 1, borderColor: '#fecaca' },
  deleteBtnText: { color: '#dc2626', fontWeight: '600', fontSize: 15 },
  createdText: { textAlign: 'center', fontSize: 12, color: '#9ca3af' },
  // Edit form
  editForm: { gap: 4 },
  editTitle: { fontSize: 22, fontWeight: '800', color: '#1f2937', marginBottom: 16 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingVertical: 13, paddingHorizontal: 14, fontSize: 15, color: '#111827', backgroundColor: '#fafafa', marginBottom: 10 },
  notesInput: { minHeight: 100, paddingTop: 12 },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  tagChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f3f4f6', borderWidth: 1.5, borderColor: '#e5e7eb' },
  tagChipActive: { backgroundColor: '#f0fdf4', borderColor: '#2e7d32' },
  tagText: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  tagTextActive: { color: '#2e7d32', fontWeight: '700' },
  saveBtn: { borderRadius: 14, overflow: 'hidden', marginTop: 8, elevation: 4, shadowColor: '#2e7d32', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  saveBtnGrad: { paddingVertical: 16, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelBtn: { alignItems: 'center', paddingVertical: 14 },
  cancelText: { color: '#6b7280', fontSize: 15 },
  sectionLabel:       { fontSize: 14, fontWeight: '700', color: '#1f2937', marginBottom: 10, marginTop: 10 },
  photoActionRow:     { flexDirection: 'row', gap: 10, marginBottom: 10 },
  photoActionBtn:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#f0fdf4', paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#bbf7d0' },
  photoActionText:    { color: '#2e7d32', fontWeight: '600', fontSize: 14 },
  photoContainer:     { position: 'relative', alignItems: 'center', marginVertical: 10 },
  photoPreview:       { width: '100%', height: 200, borderRadius: 16, backgroundColor: '#f3f4f6' },
  removePhotoBtn:     { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: 12 },
});