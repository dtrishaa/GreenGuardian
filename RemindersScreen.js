// src/screens/RemindersScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl, Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { db, auth } from '../services/firebase';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { getDueTasksForPlant } from '../services/NotificationService';

const FILTERS = ['All', 'Today', 'Upcoming'];

const SNOOZE_OPTIONS = [
  { label: '3 hours',  hours: 3 },
  { label: '1 day',    hours: 24 },
  { label: '2 days',   hours: 48 },
  { label: '3 days',   hours: 72 },
];

export default function RemindersScreen() {
  const navigation = useNavigation();
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('All');
  const [snoozeModal, setSnoozeModal] = useState(null);
  const [actionLoading, setActionLoading] = useState({});

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

  const handleWater = async (plant) => {
    setActionLoading(prev => ({ ...prev, [plant.id]: true }));
    try {
      await db.collection('plants').doc(plant.id).update({ lastWatered: new Date().toISOString() });
    } catch (e) { Alert.alert('Error', e.message); }
    finally { setActionLoading(prev => ({ ...prev, [plant.id]: false })); }
  };

  const handleSnooze = async (plant, hours) => {
    setSnoozeModal(null);
    try {
      const base = plant.lastWatered ? new Date(plant.lastWatered) : new Date();
      base.setTime(base.getTime() + hours * 3600000);
      await db.collection('plants').doc(plant.id).update({ lastWatered: base.toISOString() });
      const label = SNOOZE_OPTIONS.find(o => o.hours === hours)?.label || `${hours}h`;
      Alert.alert('Snoozed', `${plant.name}'s reminder pushed back by ${label}.`);
    } catch (e) { Alert.alert('Error', e.message); }
  };

  // Build flat list of due tasks (each plant can have multiple tasks)
  const buildReminders = () => {
    const items = [];
    for (const plant of plants) {
      const tasks = getDueTasksForPlant(plant);
      for (const task of tasks) {
        let priority = 'low';
        let dueLabel = 'Soon';
        if (task.type === 'water') {
          const diff = plant.lastWatered
            ? Math.ceil((new Date(plant.lastWatered).getTime() + plant.wateringInterval * 86400000 - Date.now()) / 86400000)
            : 0;
          if (diff <= 0) { priority = 'high'; dueLabel = 'Today'; }
          else if (diff === 1) { priority = 'medium'; dueLabel = 'Tomorrow'; }
          else dueLabel = `In ${diff} days`;
        } else {
          // For other tasks, we only show if due today (diff <= 0)
          priority = 'high';
          dueLabel = 'Today';
        }
        items.push({
          key: `${plant.id}_${task.type}`,
          plantId: plant.id,
          plantName: plant.name,
          emoji: plant.emoji || '🌿',
          taskLabel: task.label,
          priority,
          dueLabel,
          type: task.type,
        });
      }
    }
    return items;
  };

  const reminders = buildReminders();
  const todayCount = reminders.filter(r => r.priority === 'high').length;
  const upcomingCount = reminders.filter(r => r.priority !== 'high').length;

  const filtered = reminders.filter(r => {
    if (filter === 'Today') return r.priority === 'high';
    if (filter === 'Upcoming') return r.priority !== 'high';
    return true;
  });

  const priorityColors = { high: '#dc2626', medium: '#f59e0b', low: '#16a34a' };
  const priorityBg = { high: '#fee2e2', medium: '#fef3c7', low: '#f0fdf4' };

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
        <Text style={styles.headerTitle}>Care Schedule</Text>
        <Text style={styles.headerSub}>Stay on top of your plant care</Text>
      </LinearGradient>

      <View style={styles.statsRow}>
        {[
          { label: 'Total', value: reminders.length, key: 'All', urgent: false },
          { label: 'Due Today', value: todayCount, key: 'Today', urgent: todayCount > 0 },
          { label: 'Upcoming', value: upcomingCount, key: 'Upcoming', urgent: false },
        ].map(s => (
          <TouchableOpacity
            key={s.key}
            style={[styles.statCard, s.urgent && styles.statCardUrgent, filter === s.key && styles.statCardActive]}
            onPress={() => setFilter(s.key)}
          >
            <Text style={[styles.statNum, s.urgent && { color: '#dc2626' }, filter === s.key && styles.statNumActive]}>
              {s.value}
            </Text>
            <Text style={[styles.statLabel, filter === s.key && styles.statLabelActive]}>{s.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.tabs}>
        {FILTERS.map(f => (
          <TouchableOpacity key={f} style={[styles.tab, filter === f && styles.tabActive]} onPress={() => setFilter(f)}>
            <Text style={[styles.tabText, filter === f && styles.tabTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.key}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => setRefreshing(true)} tintColor="#2e7d32" />}
        renderItem={({ item }) => (
          <View style={[styles.reminderCard, { borderLeftColor: priorityColors[item.priority] }]}>
            <View style={[styles.emojiCircle, { backgroundColor: priorityBg[item.priority] }]}>
              <Text style={styles.reminderEmoji}>{item.emoji}</Text>
            </View>
            <View style={styles.reminderInfo}>
              <Text style={styles.reminderName}>{item.plantName}</Text>
              <Text style={styles.reminderTask}>{item.taskLabel}</Text>
              <View style={[styles.dueBadge, { backgroundColor: priorityBg[item.priority] }]}>
                <Text style={[styles.dueText, { color: priorityColors[item.priority] }]}>{item.dueLabel}</Text>
              </View>
            </View>
            <View style={styles.actionBtns}>
              {item.priority === 'high' && item.type === 'water' && (
                <TouchableOpacity
                  style={styles.snoozeBtn}
                  onPress={() => setSnoozeModal({ plant: plants.find(p => p.id === item.plantId), type: item.type })}
                >
                  <Ionicons name="alarm-outline" size={18} color="#f59e0b" />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.waterBtn, actionLoading[item.plantId] && styles.btnLoading]}
                onPress={() => handleWater(plants.find(p => p.id === item.plantId))}
                disabled={actionLoading[item.plantId]}
              >
                {actionLoading[item.plantId] ? (
                  <ActivityIndicator size="small" color="#2e7d32" />
                ) : (
                  <Ionicons name="water-outline" size={20} color="#2e7d32" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🌿</Text>
            <Text style={styles.emptyTitle}>{filter === 'Today' ? 'All caught up!' : 'No reminders'}</Text>
            <Text style={styles.emptyText}>{filter === 'Today' ? 'No plants need watering today.' : 'Add plants to see care reminders.'}</Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('AddPlant')} activeOpacity={0.85}>
        <LinearGradient colors={['#2e7d32', '#1b5e20']} style={styles.fabGrad}>
          <Ionicons name="add" size={28} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Snooze picker modal */}
      <Modal visible={!!snoozeModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Snooze Reminder</Text>
              <TouchableOpacity onPress={() => setSnoozeModal(null)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            {snoozeModal && (
              <Text style={styles.modalSub}>
                How long do you want to snooze <Text style={{ fontWeight: '700' }}>{snoozeModal.plant.name}</Text>?
              </Text>
            )}
            {SNOOZE_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.hours}
                style={styles.snoozeOption}
                onPress={() => snoozeModal && handleSnooze(snoozeModal.plant, opt.hours)}
                activeOpacity={0.75}
              >
                <Ionicons name="time-outline" size={20} color="#f59e0b" />
                <Text style={styles.snoozeOptionText}>{opt.label}</Text>
                <Ionicons name="chevron-forward" size={16} color="#d1d5db" />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingTop: 54, paddingBottom: 20, paddingHorizontal: 20 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 10, marginHorizontal: 16, marginTop: -16, marginBottom: 14 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 14, alignItems: 'center', elevation: 3, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  statCardUrgent: { borderWidth: 1, borderColor: '#fecaca' },
  statCardActive: { backgroundColor: '#2e7d32' },
  statNum: { fontSize: 24, fontWeight: '800', color: '#2e7d32' },
  statNumActive: { color: '#fff' },
  statLabel: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  statLabelActive: { color: 'rgba(255,255,255,0.8)' },
  tabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 12 },
  tab: { flex: 1, paddingVertical: 9, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb' },
  tabActive: { backgroundColor: '#2e7d32', borderColor: '#2e7d32' },
  tabText: { fontSize: 13, color: '#6b7280', fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  list: { paddingHorizontal: 16, paddingBottom: 100 },
  reminderCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, borderLeftWidth: 4, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  emojiCircle: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  reminderEmoji: { fontSize: 26 },
  reminderInfo: { flex: 1 },
  reminderName: { fontSize: 16, fontWeight: '700', color: '#1f2937' },
  reminderTask: { fontSize: 13, color: '#2e7d32', fontWeight: '500', marginTop: 2 },
  dueBadge: { alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, marginTop: 6 },
  dueText: { fontSize: 12, fontWeight: '600' },
  actionBtns: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  waterBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#f0fdf4', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#bbf7d0' },
  snoozeBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#fef9c3', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#fde68a' },
  btnLoading: { opacity: 0.6 },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1f2937', marginBottom: 6 },
  emptyText: { fontSize: 14, color: '#6b7280', textAlign: 'center' },
  fab: { position: 'absolute', bottom: 28, right: 20, width: 58, height: 58, borderRadius: 29, overflow: 'hidden', elevation: 8, shadowColor: '#2e7d32', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  fabGrad: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28, paddingBottom: 48 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#1f2937' },
  modalSub: { fontSize: 14, color: '#6b7280', marginBottom: 18, lineHeight: 20 },
  snoozeOption: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  snoozeOptionText: { flex: 1, fontSize: 16, color: '#1f2937', fontWeight: '500' },
});